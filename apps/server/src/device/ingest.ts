// 기기(audiostackd)가 보내는 세션 통지와 결과를 SessionManager에 잇는다 (T20, 방식 A).
// 세션 주체는 기기다(T19). 서버는 기기 세션마다 자기 세션(정수 번호)을 하나 만들어 따라간다.
import type { Pool } from 'pg';
import { upsertSegment } from '../segments/repository';
import type { SessionManager } from '../sessions/manager';
import { DeviceSttAdapter } from '../stt/device';
import { TranscriptConverter } from './convert';

// 다음 세션이 시작된 뒤에도 앞 세션의 늦은 final을 받는 시간. 데몬은 엔진의 session_done을 최대 5초 기다린 뒤 /end를 보낸다.
const LATE_RESULT_MS = 30_000;

interface DeviceSession {
  deviceId: string;
  sessionId: number;
  adapter: DeviceSttAdapter;
  converter: TranscriptConverter;
}

export type IngestReply = { status: 200 | 201 | 202; body: Record<string, unknown> };

const accepted = (body: Record<string, unknown>, status: 200 | 201 | 202 = 202): IngestReply => ({ status, body });

export class DeviceIngest {
  private readonly pool: Pool;
  private readonly sessions: SessionManager;
  // 지금 녹음 중인 기기 세션
  private current: DeviceSession | undefined;
  // 이미 닫았지만 늦은 final을 아직 받는 기기 세션
  private readonly closing = new Map<string, { session: DeviceSession; timer: NodeJS.Timeout }>();

  constructor(pool: Pool, sessions: SessionManager) {
    this.pool = pool;
    this.sessions = sessions;
  }

  // POST /api/device/sessions { session_id, started_at, device }
  async begin(body: unknown): Promise<IngestReply> {
    const deviceId = (body as { session_id?: unknown } | null)?.session_id;
    if (typeof deviceId !== 'string' || deviceId === '') return this.ignore('session_id가 없는 세션 통지');
    // 같은 통지가 다시 옴(재전송)
    if (this.current?.deviceId === deviceId || this.closing.has(deviceId)) {
      return accepted({ sessionId: this.current?.sessionId ?? null, ignored: 'already known' }, 201);
    }

    const active = this.sessions.getActive();
    if (active && this.current && active.id === this.current.sessionId) {
      // 기기가 세션을 바꿈(session rotate). 앞 세션은 정상 종료하고, 늦게 오는 final은 잠시 더 받는다.
      await this.sessions.stop(active.id);
      this.keepForLateResults(this.current);
    } else if (active) {
      // 웹 버튼으로 시작한 세션이 진행 중이었다. 기기가 주체이므로 그 세션을 중단으로 닫는다(T19).
      await this.sessions.interruptActive(`기기 세션 ${deviceId} 시작`);
    }
    this.current = undefined;

    const adapter = new DeviceSttAdapter();
    const session = await this.sessions.start({ adapter, deviceSessionId: deviceId });
    this.current = { deviceId, sessionId: session.id, adapter, converter: new TranscriptConverter(Date.now()) };
    console.log(`[device] 세션 ${deviceId} → #${session.id}`);
    return accepted({ sessionId: session.id }, 201);
  }

  // POST /api/device/sessions/:deviceId/transcripts { session_id, seq, received_at, audio_t_us, transcript }
  async transcript(deviceId: string, body: unknown): Promise<IngestReply> {
    if (this.current?.deviceId === deviceId) {
      const { converter, adapter, sessionId } = this.current;
      const result = converter.accept(body, Date.now());
      if ('drop' in result) return this.ignore(`#${sessionId} ${result.drop}`);
      if (!adapter.push(result.event)) return this.ignore(`#${sessionId} 이미 끝난 세션`);
      return accepted({ sessionId, segmentId: result.event.segmentId });
    }

    const late = this.closing.get(deviceId)?.session;
    if (!late) return this.ignore(`모르는 기기 세션 ${deviceId}`);
    const before = late.converter.snapshot();
    const result = late.converter.accept(body, Date.now());
    if ('drop' in result) return this.ignore(`#${late.sessionId} ${result.drop}`);
    // 닫힌 세션이라 실시간으로는 보내지 않고 저장만 한다. partial은 버린다.
    if (result.event.type !== 'final') return this.ignore(`#${late.sessionId} 닫힌 세션의 partial`);
    try {
      await upsertSegment(this.pool, late.sessionId, result.event);
    } catch (error) {
      late.converter.restore(before); // 데몬이 다시 보내면 같은 번호로 받는다
      throw error;
    }
    console.log(`[device] #${late.sessionId} 늦게 온 final 저장 (세그먼트 ${result.event.segmentId})`);
    return accepted({ sessionId: late.sessionId, segmentId: result.event.segmentId });
  }

  // POST /api/device/sessions/:deviceId/end { session_id, ended_at }
  async end(deviceId: string): Promise<IngestReply> {
    const late = this.closing.get(deviceId);
    if (late) {
      clearTimeout(late.timer);
      this.closing.delete(deviceId);
      return accepted({ sessionId: late.session.sessionId }, 200);
    }
    if (this.current?.deviceId !== deviceId) return { status: 200, body: { ignored: `모르는 기기 세션 ${deviceId}` } };

    const { sessionId } = this.current;
    this.current = undefined;
    if (this.sessions.getActive()?.id === sessionId) await this.sessions.stop(sessionId);
    return accepted({ sessionId }, 200);
  }

  private keepForLateResults(session: DeviceSession): void {
    const timer = setTimeout(() => this.closing.delete(session.deviceId), LATE_RESULT_MS);
    timer.unref();
    this.closing.set(session.deviceId, { session, timer });
  }

  private ignore(reason: string): IngestReply {
    console.log(`[device] 버림: ${reason}`);
    return accepted({ ignored: reason });
  }
}
