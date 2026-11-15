// 웹의 녹음 시작·종료 버튼을 기기(audiostackd)에 전한다 (HW-2).
// DEVICE_CTRL_SOCKET이 있으면 버튼이 mock 대신 데몬의 ctrl.sock에 session start / session stop을 보낸다.
// 서버 세션은 지금처럼 데몬의 세션 통지(DeviceIngest)가 만들고 닫는다. 여기서는 그것을 기다려 돌려줄 뿐이다.
import net from 'node:net';
import type { Session } from '@app/shared';
import type { Pool } from 'pg';
import { HttpError } from '../http/errors';
import { findSession } from '../sessions/repository';
import type { SessionManager } from '../sessions/manager';
import type { DeviceIngest } from './ingest';

// 데몬의 세션 통지가 서버에 닿기까지 기다리는 시간
const BEGIN_WAIT_MS = 5_000;
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

  private async command(command: string): Promise<string> {
    let reply: string;
    try {
      reply = await sendDeviceCommand(this.socketPath, command);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new HttpError(503, 'DEVICE_UNAVAILABLE', `기기에 연결하지 못했습니다: ${reason}`);
    }
    if (!reply.startsWith('OK')) throw new HttpError(502, 'DEVICE_ERROR', `기기가 거절했습니다: ${reply}`);
    console.log(`[device] ${command} → ${reply}`);
    return reply.slice(2).trim();
  }

  // 녹음 시작. 데몬이 세션 번호를 정하고, 그 세션 통지로 서버 세션이 생기면 돌려준다.
  async start(): Promise<Session> {
    const deviceId = await this.command('session start');
    const sessionId = await waitUntil(() => this.ingest.sessionIdOf(deviceId), BEGIN_WAIT_MS);
    const active = this.sessions.getActive();
    if (sessionId === undefined || active?.id !== sessionId) {
      throw new HttpError(504, 'DEVICE_TIMEOUT', `기기 세션 ${deviceId}의 시작 통지가 오지 않았습니다`);
    }
    return active;
  }

  // 녹음 종료. 기기 세션이 아니면(예: mock) 지금처럼 바로 닫는다.
  async stop(id: number): Promise<Session> {
    if (!this.ingest.isCurrent(id)) return this.sessions.stop(id);
    await this.command('session stop');
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
