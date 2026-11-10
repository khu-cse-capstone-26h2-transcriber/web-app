// 진행 중인 세션 하나와 그 세션의 STT 어댑터를 들고, 시작과 종료의 상태 전이를 맡는다.
import type { Session, SessionStreamMessage, SttEvent } from '@app/shared';
import type { Pool } from 'pg';
import { HttpError } from '../http/errors';
import { SegmentWriter } from '../segments/writer';
import type { SttAdapter } from '../stt/adapter';
import { closeSession, findSession, insertSession, interruptOpenSessions } from './repository';

// idle → starting → recording → stopping → idle. 단일 사용자라 진행 중인 세션은 하나뿐이다.
type ManagerState = 'idle' | 'starting' | 'recording' | 'stopping';

// 진행 중인 세션의 메시지를 받는 쪽. 지금은 SSE 연결 하나가 하나다. WebSocket으로 바꿔도 이 모양은 그대로다.
export interface SessionSubscriber {
  send(message: SessionStreamMessage): void;
  // 더 보낼 메시지가 없을 때 부른다. 연결을 닫는다.
  close(): void;
}

interface ActiveSession {
  session: Session;
  adapter: SttAdapter;
  adapterStopped: boolean;
  // 이 세션의 final 세그먼트를 DB에 쓴다.
  writer: SegmentWriter;
  // 이 세션의 이벤트를 실시간으로 받는 쪽
  subscribers: Set<SessionSubscriber>;
  // 이 세션에서 나온 final을 온 순서대로 모은다. 새로 접속한 쪽에 먼저 보낸다. DB가 꺼져 있어도 보낼 수 있게 메모리에 둔다.
  finals: SttEvent[];
  partialCount: number;
  finalCount: number;
}

export class SessionManager {
  private readonly pool: Pool;
  // 세션마다 어댑터를 새로 만든다. mock과 실제 STT는 이 함수만 바꿔 끼운다.
  private readonly createAdapter: () => SttAdapter;
  private state: ManagerState = 'idle';
  private active: ActiveSession | undefined;

  constructor(pool: Pool, createAdapter: () => SttAdapter) {
    this.pool = pool;
    this.createAdapter = createAdapter;
  }

  // DB에 녹음 중으로 남아 있는 세션을 중단으로 닫는다. 서버가 꺼질 때 닫지 못한 세션이다.
  async recover(): Promise<void> {
    const ids = await interruptOpenSessions(this.pool);
    if (ids.length > 0) {
      const list = ids.map((id) => `#${id}`).join(', ');
      console.log(`[session] 녹음 중으로 남아 있던 세션을 중단 처리했습니다: ${list}`);
    }
  }

  // 진행 중인 세션. 없으면 null.
  getActive(): Session | null {
    return this.active?.session ?? null;
  }

  // 기기 세션(T20)은 adapter와 기기 세션 번호를 준다. 웹 버튼은 아무것도 주지 않는다.
  async start(options: { adapter?: SttAdapter; deviceSessionId?: string } = {}): Promise<Session> {
    if (this.state !== 'idle') {
      throw new HttpError(409, 'SESSION_ALREADY_ACTIVE', '이미 진행 중인 세션이 있습니다');
    }

    this.state = 'starting';
    try {
      // 메모리에 진행 중인 세션이 없으므로, DB에 녹음 중으로 남은 행은 닫지 못한 세션이다.
      await this.recover();
      const session = await insertSession(this.pool, options.deviceSessionId);
      const active: ActiveSession = {
        session,
        adapter: options.adapter ?? this.createAdapter(),
        adapterStopped: false,
        writer: new SegmentWriter(this.pool, session.id),
        subscribers: new Set(),
        finals: [],
        partialCount: 0,
        finalCount: 0,
      };

      try {
        await active.adapter.start((event) => this.handleEvent(active, event));
      } catch (error) {
        // STT를 켜지 못하면 방금 만든 세션을 중단으로 닫는다.
        await closeSession(this.pool, session.id, 'interrupted');
        throw error;
      }

      this.active = active;
      this.state = 'recording';
      console.log(`[session] #${session.id} 시작`);
      return session;
    } catch (error) {
      this.state = 'idle';
      throw error;
    }
  }

  async stop(id: number): Promise<Session> {
    const active = this.active;
    if (this.state !== 'recording' || !active || active.session.id !== id) {
      throw await this.notActiveError(id);
    }

    this.state = 'stopping';
    let closed: Session | undefined;
    try {
      // STT를 먼저 멈춰, 세션을 닫은 뒤에 이벤트가 오지 않게 한다.
      if (!active.adapterStopped) {
        await active.adapter.stop();
        active.adapterStopped = true;
      }
      // 밀린 세그먼트를 모두 쓴 뒤에 세션을 닫는다. 쓰지 못하면 세션은 녹음 중으로 남는다.
      await active.writer.flush();
      closed = await closeSession(this.pool, id, 'ended');
    } catch (error) {
      // 종료에 실패하면 녹음 중으로 되돌려, 종료를 다시 요청할 수 있게 한다.
      this.state = 'recording';
      throw error;
    }

    this.active = undefined;
    this.state = 'idle';
    // 서버 밖에서 행이 이미 닫힌 경우.
    if (!closed) {
      this.closeSubscribers(active);
      throw new HttpError(409, 'SESSION_NOT_ACTIVE', `진행 중인 세션이 아닙니다: ${id}`);
    }
    // 종료를 알리고 스트림을 닫는다. 종료에 실패했을 때는 스트림을 그대로 둔다.
    this.broadcast(active, { type: 'ended', session: closed });
    this.closeSubscribers(active);
    console.log(
      `[session] #${id} 종료 - partial ${active.partialCount}개, final ${active.finalCount}개, 저장 ${active.writer.savedCount}개`,
    );
    return closed;
  }

  // 서버를 끌 때 부른다. 진행 중인 세션이 있으면 STT를 멈추고 중단으로 닫는다.
  async shutdown(): Promise<void> {
    await this.interruptActive('서버 종료');
  }

  // 진행 중인 세션을 중단으로 닫는다. 서버 종료, 또는 기기가 새 세션을 시작했을 때(T20) 부른다.
  async interruptActive(reason: string): Promise<void> {
    const active = this.active;
    if (!active) return;

    this.active = undefined;
    this.state = 'idle';
    // 보통은 disconnectSubscribers로 이미 닫혀 있다.
    this.closeSubscribers(active);
    if (!active.adapterStopped) await active.adapter.stop();
    // 밀린 세그먼트를 마지막으로 써 본다. 서버가 꺼지는 중이라 실패하면 더 기다리지 않는다.
    try {
      await active.writer.flush();
    } catch {
      console.error(
        `[segment] #${active.session.id} 저장하지 못한 세그먼트 ${active.writer.pendingCount}개를 잃었습니다`,
      );
    }
    await closeSession(this.pool, active.session.id, 'interrupted');
    console.log(
      `[session] #${active.session.id} 중단 (${reason}) - partial ${active.partialCount}개, final ${active.finalCount}개, 저장 ${active.writer.savedCount}개`,
    );
  }

  // 진행 중인 세션의 이벤트를 받기 시작한다. 그 세션이 진행 중이 아니면 404나 409를 던진다.
  // 먼저 지금까지의 final을 보내고, 그 뒤로 실시간 이벤트를 보낸다. afterSegmentId를 주면 그 번호 뒤의 final만 먼저 보낸다.
  // 접속하기 전의 partial은 보내지 않는다. 다음 partial이 그 문장의 전체 텍스트를 다시 보낸다.
  // 돌려준 함수를 부르면 그만 받는다.
  async subscribe(
    id: number,
    subscriber: SessionSubscriber,
    afterSegmentId?: number,
  ): Promise<() => void> {
    const active = this.active;
    if (this.state !== 'recording' || !active || active.session.id !== id) {
      throw await this.notActiveError(id);
    }

    // 여기서부터 등록까지 await가 없어, 그 사이에 새 이벤트가 끼어들지 않는다.
    const missed =
      afterSegmentId === undefined
        ? active.finals
        : active.finals.filter((event) => event.segmentId > afterSegmentId);
    for (const event of missed) subscriber.send(event);

    active.subscribers.add(subscriber);
    const from = afterSegmentId === undefined ? '' : `Last-Event-ID ${afterSegmentId} 뒤 `;
    console.log(
      `[stream] #${id} 연결 (지금 ${active.subscribers.size}개, ${from}final ${missed.length}개 먼저 보냄)`,
    );
    return () => {
      // 세션이 끝나며 이미 비운 경우에는 찍지 않는다.
      if (active.subscribers.delete(subscriber)) {
        console.log(`[stream] #${id} 연결 끊김 (지금 ${active.subscribers.size}개)`);
      }
    };
  }

  // 서버를 끌 때 HTTP 서버를 닫으면서 부른다. 스트림은 스스로 끝나지 않아 닫아야 서버가 닫힌다.
  // 세션은 그대로 두고, shutdown에서 닫는다.
  disconnectSubscribers(): void {
    if (this.active) this.closeSubscribers(this.active);
  }

  // 진행 중인 세션이 아닐 때의 에러. 없는 번호인지, 이미 끝난 세션인지 구분해 알린다.
  private async notActiveError(id: number): Promise<HttpError> {
    const found = await findSession(this.pool, id);
    if (!found) {
      return new HttpError(404, 'SESSION_NOT_FOUND', `세션을 찾을 수 없습니다: ${id}`);
    }
    return new HttpError(409, 'SESSION_NOT_ACTIVE', `진행 중인 세션이 아닙니다: ${id}`);
  }

  // 받는 쪽 모두에게 보낸다. 한 곳에서 실패해도 나머지와 STT 처리는 계속한다.
  private broadcast(active: ActiveSession, message: SessionStreamMessage): void {
    for (const subscriber of active.subscribers) {
      try {
        subscriber.send(message);
      } catch (error) {
        console.error(`[stream] #${active.session.id} 메시지를 보내지 못했습니다:`, error);
      }
    }
  }

  private closeSubscribers(active: ActiveSession): void {
    for (const subscriber of active.subscribers) subscriber.close();
    active.subscribers.clear();
  }

  // 어댑터가 준 이벤트는 이 세션의 것이다. 이벤트에는 세션 번호가 없고, 서버가 여기서 묶는다.
  private handleEvent(active: ActiveSession, event: SttEvent): void {
    if (event.type === 'final') {
      active.finalCount += 1;
      active.finals.push(event);
      // final만 DB에 저장한다. partial은 저장하지 않는다.
      active.writer.enqueue(event);
    } else {
      active.partialCount += 1;
    }
    // partial과 final 모두 실시간으로 보낸다.
    this.broadcast(active, event);
  }
}
