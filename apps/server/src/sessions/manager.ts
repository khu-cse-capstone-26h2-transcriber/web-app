// 진행 중인 세션 하나와 그 세션의 STT 어댑터를 들고, 시작과 종료의 상태 전이를 맡는다.
import type { Session, SttEvent } from '@app/shared';
import type { Pool } from 'pg';
import { HttpError } from '../http/errors';
import { SegmentWriter } from '../segments/writer';
import type { SttAdapter } from '../stt/adapter';
import { closeSession, findSession, insertSession, interruptOpenSessions } from './repository';

// idle → starting → recording → stopping → idle. 단일 사용자라 진행 중인 세션은 하나뿐이다.
type ManagerState = 'idle' | 'starting' | 'recording' | 'stopping';

interface ActiveSession {
  session: Session;
  adapter: SttAdapter;
  adapterStopped: boolean;
  // 이 세션의 final 세그먼트를 DB에 쓴다.
  writer: SegmentWriter;
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

  async start(): Promise<Session> {
    if (this.state !== 'idle') {
      throw new HttpError(409, 'SESSION_ALREADY_ACTIVE', '이미 진행 중인 세션이 있습니다');
    }

    this.state = 'starting';
    try {
      // 메모리에 진행 중인 세션이 없으므로, DB에 녹음 중으로 남은 행은 닫지 못한 세션이다.
      await this.recover();
      const session = await insertSession(this.pool);
      const active: ActiveSession = {
        session,
        adapter: this.createAdapter(),
        adapterStopped: false,
        writer: new SegmentWriter(this.pool, session.id),
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
      // 진행 중인 세션이 아니다. 없는 번호인지, 이미 끝난 세션인지 구분해 알린다.
      const found = await findSession(this.pool, id);
      if (!found) {
        throw new HttpError(404, 'SESSION_NOT_FOUND', `세션을 찾을 수 없습니다: ${id}`);
      }
      throw new HttpError(409, 'SESSION_NOT_ACTIVE', `진행 중인 세션이 아닙니다: ${id}`);
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
      throw new HttpError(409, 'SESSION_NOT_ACTIVE', `진행 중인 세션이 아닙니다: ${id}`);
    }
    console.log(
      `[session] #${id} 종료 - partial ${active.partialCount}개, final ${active.finalCount}개, 저장 ${active.writer.savedCount}개`,
    );
    return closed;
  }

  // 서버를 끌 때 부른다. 진행 중인 세션이 있으면 STT를 멈추고 중단으로 닫는다.
  async shutdown(): Promise<void> {
    const active = this.active;
    if (!active) return;

    this.active = undefined;
    this.state = 'idle';
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
      `[session] #${active.session.id} 중단 (서버 종료) - partial ${active.partialCount}개, final ${active.finalCount}개, 저장 ${active.writer.savedCount}개`,
    );
  }

  // 어댑터가 준 이벤트는 이 세션의 것이다. 이벤트에는 세션 번호가 없고, 서버가 여기서 묶는다.
  // T07(SSE)이 이 자리에서 이벤트를 받아 간다.
  private handleEvent(active: ActiveSession, event: SttEvent): void {
    if (event.type === 'final') {
      active.finalCount += 1;
      // final만 DB에 저장한다. partial은 저장하지 않는다.
      active.writer.enqueue(event);
    } else {
      active.partialCount += 1;
    }
  }
}
