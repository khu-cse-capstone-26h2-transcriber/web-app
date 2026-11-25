// 웹의 녹음 시작·종료 버튼을 기기(audiostackd)에 전한다 (HW-2).
// DEVICE_CTRL_SOCKET이 있으면 버튼이 mock 대신 데몬의 ctrl.sock에 session start / session stop을 보낸다.
// 시작: `OK sess-…` 응답 번호로 서버 세션을 먼저 만든다(T19 '시작과 종료'). 뒤에 오는 데몬 통지는 같은 번호라 무시된다.
// 종료: 데몬의 `/end`로 세션이 닫히기를 기다린다. 기기에 닿지 못하거나 시간이 지나면 서버에서 닫는다.
import net from 'node:net';
import type { Session } from '@app/shared';
import type { Pool } from 'pg';
import { HttpError } from '../http/errors';
import { findSession } from '../sessions/repository';
import type { SessionManager } from '../sessions/manager';
import type { DeviceIngest } from './ingest';

// 데몬은 엔진의 session_done을 최대 5초 기다린 뒤 /end를 보낸다.
const END_WAIT_MS = 10_000;

// ctrl.sock에 명령 한 줄을 보내고 답 한 줄을 받는다.
export function sendDeviceCommand(socketPath: string, command: string, timeoutMs = 3_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(socketPath);
    let reply = '';
    const timer = setTimeout(() => socket.destroy(new Error('응답 시간 초과')), timeoutMs);
    socket.on('connect', () => socket.write(`${command}\n`));
    socket.on('data', (chunk) => {
      reply += chunk.toString('utf8');
    });
    socket.on('end', () => {
      clearTimeout(timer);
      resolve(reply.trim());
    });
    socket.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function waitUntil<T>(check: () => T | undefined, timeoutMs: number): Promise<T | undefined> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = check();
    if (value !== undefined) return value;
    if (Date.now() >= deadline) return undefined;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

export class DeviceControl {
  constructor(
    private readonly socketPath: string,
    private readonly pool: Pool,
    private readonly sessions: SessionManager,
    private readonly ingest: DeviceIngest,
  ) {}

  // 실패는 서버 기록에 남긴다. 연결 실패의 이유(소켓 경로가 든 connect ENOENT 등)는 화면에 보이지 않고 기록에만 둔다 (T43).
  private async command(command: string): Promise<string> {
    let reply: string;
    try {
      reply = await sendDeviceCommand(this.socketPath, command);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.error(`[device] ${command} → 연결 실패: ${reason}`);
      throw new HttpError(
        503,
        'DEVICE_UNAVAILABLE',
        '기기에 연결하지 못했습니다. 기기의 녹음 프로그램이 켜져 있는지 확인해 주세요',
      );
    }
    if (!reply.startsWith('OK')) {
      console.error(`[device] ${command} → 거절: ${reply}`);
      throw new HttpError(502, 'DEVICE_ERROR', `기기가 거절했습니다: ${reply}`);
    }
    console.log(`[device] ${command} → ${reply}`);
    return reply.slice(2).trim();
  }

  // 녹음 시작. 데몬이 정한 세션 번호로 서버 세션을 만들어 돌려준다.
  async start(): Promise<Session> {
    let deviceId = await this.command('session start');
    let session = await this.follow(deviceId);
    if (!session) {
      // 데몬이 이미 녹음 중인데 그 세션을 서버가 따라가지 못한다(예: 앞서 기기에 닿지 못해 서버에서만 닫은 세션).
      // 기기 세션을 닫고 새로 연다. 앞 세션의 늦은 결과와 /end는 DeviceIngest가 처리한다.
      console.log(`[device] 기기 세션 ${deviceId}를 따라갈 수 없어 새로 시작합니다`);
      await this.command('session stop');
      deviceId = await this.command('session start');
      session = await this.follow(deviceId);
    }
    if (!session) throw new HttpError(502, 'DEVICE_ERROR', `기기 세션 ${deviceId}를 시작하지 못했습니다`);
    return session;
  }

  // 기기 세션 번호로 서버 세션을 만들거나(이미 있으면 그대로) 찾는다. 녹음 중인 서버 세션이 아니면 undefined.
  private async follow(deviceId: string): Promise<Session | undefined> {
    if (!deviceId.startsWith('sess-')) throw new HttpError(502, 'DEVICE_ERROR', `기기 응답에 세션 번호가 없습니다: ${deviceId}`);
    await this.ingest.begin({ session_id: deviceId });
    const sessionId = this.ingest.sessionIdOf(deviceId);
    const active = this.sessions.getActive();
    return sessionId !== undefined && active?.id === sessionId ? active : undefined;
  }

  // 녹음 종료. 기기 세션이 아니면(예: mock) 지금처럼 바로 닫는다.
  async stop(id: number): Promise<Session> {
    if (!this.ingest.isCurrent(id)) return this.sessions.stop(id);
    try {
      await this.command('session stop');
    } catch (error) {
      // 기기에 닿지 못하거나(503) 거절되면(502) 서버 세션이 녹음 중으로 남지 않게 서버에서 닫는다.
      const reason = error instanceof Error ? error.message : String(error);
      console.log(`[device] #${id} 기기에 종료를 보내지 못해 서버에서 닫습니다: ${reason}`);
      return this.sessions.stop(id);
    }
    // 데몬이 마지막 final과 /end를 보내면 DeviceIngest가 세션을 닫는다.
    const ended = await waitUntil(() => (this.sessions.getActive()?.id === id ? undefined : true), END_WAIT_MS);
    if (!ended) {
      console.log(`[device] #${id} 종료 통지가 오지 않아 서버에서 닫습니다`);
      return this.sessions.stop(id);
    }
    const session = await findSession(this.pool, id);
    if (!session) throw new HttpError(404, 'SESSION_NOT_FOUND', `세션을 찾을 수 없습니다: ${id}`);
    return session;
  }
}
