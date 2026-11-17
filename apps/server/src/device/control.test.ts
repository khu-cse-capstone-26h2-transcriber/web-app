// DeviceControl(웹 버튼 → 기기 ctrl.sock) 테스트. 가짜 데몬은 유닉스 소켓으로 session start / session stop에 답한다.
// DB 함수는 가짜로 바꾼다.
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import type { Session } from '@app/shared';
import type { Pool } from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { closeSession, findSession, insertSession } from '../sessions/repository';
import { SessionManager } from '../sessions/manager';
import type { SttAdapter } from '../stt/adapter';
import { DeviceControl } from './control';
import { DeviceIngest } from './ingest';

vi.mock('../sessions/repository', () => ({
  insertSession: vi.fn(),
  findSession: vi.fn(),
  closeSession: vi.fn(),
  interruptOpenSessions: vi.fn(async () => []),
}));
vi.mock('../segments/repository', () => ({
  upsertSegment: vi.fn(async () => {}),
}));
vi.spyOn(console, 'log').mockImplementation(() => {});

const idleAdapter = (): SttAdapter => ({ start: async () => {}, stop: async () => {} });

// session start / session stop만 아는 가짜 데몬. 같은 번호를 다시 쓰지 않는다.
class FakeDaemon {
  readonly socketPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ctl-')), 'ctrl.sock');
  open: string | null = null;
  commands: string[] = [];
  onStart: ((id: string) => void) | undefined;
  private next = 1;
  private readonly server = net.createServer((socket) => {
    socket.on('data', (chunk) => {
      const command = chunk.toString('utf8').trim();
      this.commands.push(command);
      if (command === 'session start') {
        if (!this.open) {
          this.open = `sess-test-${this.next++}`;
          this.onStart?.(this.open);
        }
        socket.end(`OK ${this.open}\n`);
      } else if (command === 'session stop') {
        const id = this.open ?? 'idle';
        this.open = null;
        socket.end(`OK ${id}\n`);
      } else socket.end('ERR unknown\n');
    });
  });

  listen(): Promise<void> {
    return new Promise((resolve) => this.server.listen(this.socketPath, resolve));
  }

  close(): Promise<void> {
    return new Promise((resolve) => this.server.close(() => resolve()));
  }
}

let daemon: FakeDaemon;
let manager: SessionManager;
let ingest: DeviceIngest;
let control: DeviceControl;

beforeEach(async () => {
  let id = 0;
  vi.mocked(insertSession).mockImplementation(async () => ({
    id: ++id,
    status: 'recording',
    startedAt: '2026-11-17T01:00:00.000Z',
    endedAt: null,
  }));
  vi.mocked(closeSession).mockImplementation(async (_pool, sid, status) => ({
    id: sid,
    status,
    startedAt: '2026-11-17T01:00:00.000Z',
    endedAt: '2026-11-17T01:05:00.000Z',
  }));
  vi.mocked(findSession).mockImplementation(async (_pool, sid) => ({
    id: sid,
    status: 'ended',
    startedAt: '2026-11-17T01:00:00.000Z',
    endedAt: '2026-11-17T01:05:00.000Z',
  }) as Session);
  daemon = new FakeDaemon();
  await daemon.listen();
  manager = new SessionManager({} as Pool, idleAdapter);
  ingest = new DeviceIngest({} as Pool, manager);
  control = new DeviceControl(daemon.socketPath, {} as Pool, manager, ingest);
});

afterEach(async () => {
  await daemon.close();
  vi.mocked(insertSession).mockReset();
});

describe('DeviceControl.start', () => {
  it('session start의 응답 번호로 서버 세션을 만든다(데몬 통지가 오지 않아도)', async () => {
    const session = await control.start();
    expect(session.status).toBe('recording');
    expect(ingest.sessionIdOf('sess-test-1')).toBe(session.id);
    // 뒤에 오는 데몬 통지는 같은 번호라 무시된다
    const reply = await ingest.begin({ session_id: 'sess-test-1' });
    expect(reply.body.ignored).toBe('already known');
    expect(insertSession).toHaveBeenCalledTimes(1);
  });

  it('응답과 데몬 통지가 동시에 와도 세션은 하나만 만든다', async () => {
    let notified: Promise<unknown> | undefined;
    daemon.onStart = (id) => {
      notified = ingest.begin({ session_id: id });
    };
    const session = await control.start();
    await notified;
    expect(insertSession).toHaveBeenCalledTimes(1);
    expect(manager.getActive()?.id).toBe(session.id);
  });

  it('서버가 다시 켜졌을 때 데몬이 이미 녹음 중이어도 시작된다', async () => {
    daemon.open = 'sess-before-restart';
    const session = await control.start();
    expect(ingest.sessionIdOf('sess-before-restart')).toBe(session.id);
  });

  it('서버에서만 닫힌 기기 세션이 아직 열려 있으면 닫고 새로 연다', async () => {
    const first = await control.start();
    await manager.stop(first.id); // 예: 기기에 닿지 못해 서버에서만 닫음
    const second = await control.start();
    expect(second.id).not.toBe(first.id);
    expect(daemon.commands).toEqual(['session start', 'session start', 'session stop', 'session start']);
    expect(ingest.sessionIdOf('sess-test-2')).toBe(second.id);
  });
});

describe('DeviceControl.stop', () => {
  it('기기에 닿지 못하면 서버에서 닫는다', async () => {
    const session = await control.start();
    await daemon.close();
    const stopped = await control.stop(session.id);
    expect(stopped.status).toBe('ended');
    expect(manager.getActive()).toBeNull();
    daemon = new FakeDaemon(); // afterEach가 닫을 서버
    await daemon.listen();
  });

  it('데몬의 /end가 오면 그 세션을 돌려준다', async () => {
    const session = await control.start();
    const stopping = control.stop(session.id);
    await new Promise((resolve) => setTimeout(resolve, 100));
    await ingest.end('sess-test-1');
    const stopped = await stopping;
    expect(stopped.id).toBe(session.id);
    expect(manager.getActive()).toBeNull();
  });
});
