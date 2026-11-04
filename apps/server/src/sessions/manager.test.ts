// SessionManager의 이어받기(T09) 테스트(T17). DB 함수는 가짜로 바꾸고, 가짜 STT 어댑터로 이벤트를 넣는다.
import type { Session, SessionStreamMessage, SttEvent } from '@app/shared';
import type { Pool } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SttAdapter, SttEventHandler } from '../stt/adapter';
import { SessionManager, type SessionSubscriber } from './manager';
import { closeSession, findSession, insertSession } from './repository';

vi.mock('./repository', () => ({
  insertSession: vi.fn(),
  findSession: vi.fn(),
  closeSession: vi.fn(),
  interruptOpenSessions: vi.fn(async () => []),
}));
vi.mock('../segments/repository', () => ({
  upsertSegment: vi.fn(async () => {}),
}));

// 테스트 출력에 [session], [stream] 로그가 섞이지 않게 한다.
vi.spyOn(console, 'log').mockImplementation(() => {});

const SESSION: Session = {
  id: 3,
  status: 'recording',
  startedAt: '2026-11-04T01:00:00.000Z',
  endedAt: null,
};
const ENDED_AT = '2026-11-04T01:05:00.000Z';

beforeEach(() => {
  vi.mocked(insertSession).mockResolvedValue(SESSION);
  vi.mocked(findSession).mockResolvedValue(undefined);
  vi.mocked(closeSession).mockImplementation(async (_pool, id, status) => ({
    ...SESSION,
    id,
    status,
    endedAt: ENDED_AT,
  }));
});

// 테스트가 부를 때 이벤트를 넣는 STT 어댑터.
class FakeAdapter implements SttAdapter {
  private onEvent: SttEventHandler | undefined;

  async start(onEvent: SttEventHandler): Promise<void> {
    this.onEvent = onEvent;
  }

  async stop(): Promise<void> {
    this.onEvent = undefined;
  }

  emit(event: SttEvent): void {
    this.onEvent?.(event);
  }
}

function event(type: SttEvent['type'], segmentId: number): SttEvent {
  return {
    type,
    segmentId,
    text: `${type} ${segmentId}`,
    startMs: segmentId * 1_000,
    endMs: segmentId * 1_000 + 900,
  };
}

// 받은 메시지를 모으는 구독자.
function recorder() {
  const received: SessionStreamMessage[] = [];
  const state = { closed: false };
  const subscriber: SessionSubscriber = {
    send: (message) => {
      received.push(message);
    },
    close: () => {
      state.closed = true;
    },
  };
  return { subscriber, received, state };
}

// 메시지를 'final:2'처럼 종류와 segmentId로 줄인다.
function labels(messages: SessionStreamMessage[]): string[] {
  return messages.map((message) =>
    message.type === 'partial' || message.type === 'final'
      ? `${message.type}:${message.segmentId}`
      : message.type,
  );
}

// 녹음을 시작하고 구간 0부터 count개를 partial, final 순서로 넣는다.
async function startWithFinals(count: number) {
  const adapter = new FakeAdapter();
  const manager = new SessionManager({} as Pool, () => adapter);
  await manager.start();
  for (let segmentId = 0; segmentId < count; segmentId += 1) {
    adapter.emit(event('partial', segmentId));
    adapter.emit(event('final', segmentId));
  }
  return { manager, adapter };
}

describe('SessionManager.subscribe', () => {
  it('Last-Event-ID가 없으면 지금까지의 final을 모두 먼저 보내고, 지난 partial은 보내지 않는다', async () => {
    const { manager, adapter } = await startWithFinals(3);
    adapter.emit(event('partial', 3));
    const { subscriber, received } = recorder();
    await manager.subscribe(SESSION.id, subscriber);
    expect(labels(received)).toEqual(['final:0', 'final:1', 'final:2']);
  });

  it('마지막으로 받은 번호 뒤의 final만 먼저 보낸다', async () => {
    const { manager } = await startWithFinals(4);
    const { subscriber, received } = recorder();
    await manager.subscribe(SESSION.id, subscriber, 1);
    expect(labels(received)).toEqual(['final:2', 'final:3']);
  });

  it('0도 마지막으로 받은 번호로 본다', async () => {
    const { manager } = await startWithFinals(3);
    const { subscriber, received } = recorder();
    await manager.subscribe(SESSION.id, subscriber, 0);
    expect(labels(received)).toEqual(['final:1', 'final:2']);
  });

  it('이미 다 받았으면 먼저 보내는 것이 없다', async () => {
    const { manager } = await startWithFinals(2);
    const { subscriber, received } = recorder();
    await manager.subscribe(SESSION.id, subscriber, 5);
    expect(received).toEqual([]);
  });

  it('먼저 보낸 final에 이어 실시간 이벤트를 온 순서대로 보낸다', async () => {
    const { manager, adapter } = await startWithFinals(2);
    const { subscriber, received } = recorder();
    await manager.subscribe(SESSION.id, subscriber, 0);
    adapter.emit(event('partial', 2));
    adapter.emit(event('final', 2));
    adapter.emit(event('partial', 3));
    expect(labels(received)).toEqual(['final:1', 'partial:2', 'final:2', 'partial:3']);
  });

  it('연결을 끊은 쪽에는 더 보내지 않고, 다른 쪽에는 계속 보낸다', async () => {
    const { manager, adapter } = await startWithFinals(1);
    const left = recorder();
    const stayed = recorder();
    const unsubscribe = await manager.subscribe(SESSION.id, left.subscriber);
    await manager.subscribe(SESSION.id, stayed.subscriber);
    unsubscribe();
    adapter.emit(event('final', 1));
    expect(labels(left.received)).toEqual(['final:0']);
    expect(labels(stayed.received)).toEqual(['final:0', 'final:1']);
  });

  it('세션이 끝나면 ended를 보내고 닫으며, 그 뒤 다시 접속하면 409로 거절한다', async () => {
    const { manager } = await startWithFinals(1);
    const { subscriber, received, state } = recorder();
    await manager.subscribe(SESSION.id, subscriber);
    await manager.stop(SESSION.id);
    expect(labels(received)).toEqual(['final:0', 'ended']);
    expect(state.closed).toBe(true);

    vi.mocked(findSession).mockResolvedValue({ ...SESSION, status: 'ended', endedAt: ENDED_AT });
    await expect(manager.subscribe(SESSION.id, recorder().subscriber, 0)).rejects.toMatchObject({
      status: 409,
      code: 'SESSION_NOT_ACTIVE',
    });
  });
});
