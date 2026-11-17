// 세션 API. app.ts에서 /api/sessions 아래에 붙인다.
import {
  EXPORT_FORMATS,
  STREAM_HEARTBEAT_MS,
  type ExportFormat,
  type Session,
  type SessionStreamMessage,
} from '@app/shared';
import express, { type Router } from 'express';
import type { Pool } from 'pg';
import { exportSession } from '../export/format';
import { HttpError } from '../http/errors';
import { SseStream } from '../http/sse';
import { listSegments } from '../segments/repository';
import type { DeviceControl } from '../device/control';
import type { SessionManager, SessionSubscriber } from './manager';
import { findSession, listFinishedSessions } from './repository';

const HEARTBEAT: SessionStreamMessage = { type: 'heartbeat' };

// 경로의 세션 번호를 양의 정수로 읽는다.
function parseSessionId(value: string): number {
  const id = Number(value);
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(id)) {
    throw new HttpError(400, 'INVALID_SESSION_ID', `세션 번호는 양의 정수여야 합니다: ${value}`);
  }
  return id;
}

// Last-Event-ID 헤더를 마지막으로 받은 final의 segmentId로 읽는다. 없거나 비어 있으면 undefined(처음부터)다.
export function parseLastEventId(value: string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;
  const id = Number(value);
  if (!/^(0|[1-9]\d*)$/.test(value) || !Number.isSafeInteger(id)) {
    throw new HttpError(
      400,
      'INVALID_LAST_EVENT_ID',
      `Last-Event-ID는 0 이상의 정수여야 합니다: ${value}`,
    );
  }
  return id;
}

// 쿼리의 format을 내보내기 형식으로 읽는다. 없거나, 여러 번 주었거나, 모르는 값이면 400이다.
function parseExportFormat(value: unknown): ExportFormat {
  const format = EXPORT_FORMATS.find((candidate) => candidate === value);
  if (!format) {
    throw new HttpError(
      400,
      'INVALID_EXPORT_FORMAT',
      `format은 ${EXPORT_FORMATS.join(' 또는 ')}여야 합니다`,
    );
  }
  return format;
}

// 세션을 찾는다. 없으면 404.
async function requireSession(pool: Pool, id: number): Promise<Session> {
  const session = await findSession(pool, id);
  if (!session) {
    throw new HttpError(404, 'SESSION_NOT_FOUND', `세션을 찾을 수 없습니다: ${id}`);
  }
  return session;
}

// SSE id는 final에만 segmentId로 붙인다. partial, heartbeat, ended는 브라우저가 기억하는 id를 바꾸지 않는다.
function sseEventId(message: SessionStreamMessage): string | undefined {
  return message.type === 'final' ? String(message.segmentId) : undefined;
}

// 히스토리(목록, 상세)는 DB만 읽으므로 pool로 직접 읽는다. 시작·종료·스트림은 SessionManager가 맡는다.
// control이 있으면 시작·종료를 기기에 맡긴다 (HW-2).
export function createSessionRouter(
  pool: Pool,
  sessions: SessionManager,
  control: DeviceControl | null = null,
): Router {
  const router = express.Router();

  // 히스토리 목록. 끝난 세션 중 세그먼트가 있는 것만, 최근에 시작한 것부터.
  router.get('/', async (_req, res) => {
    res.json({ sessions: await listFinishedSessions(pool) });
  });

  // 세션을 시작한다. 진행 중인 세션이 있으면 409.
  router.post('/', async (_req, res) => {
    if (sessions.getActive()) {
      throw new HttpError(409, 'SESSION_ALREADY_ACTIVE', '이미 진행 중인 세션이 있습니다');
    }
    res.status(201).json({ session: control ? await control.start() : await sessions.start() });
  });

  // 진행 중인 세션. 없으면 session이 null이다. '/:id'보다 앞에 있어야 active가 번호로 읽히지 않는다.
  router.get('/active', (_req, res) => {
    res.json({ session: sessions.getActive() });
  });

  // 히스토리 상세. 세션과 저장된 세그먼트. 녹음 중이거나 세그먼트가 없는 세션도 볼 수 있다.
  router.get('/:id', async (req, res) => {
    const id = parseSessionId(req.params.id);
    const session = await requireSession(pool, id);
    res.json({ session, segments: await listSegments(pool, id) });
  });

  // 히스토리 내보내기. 끝난 세션을 txt나 md 파일 하나로 내려준다. 녹음 중인 세션은 409.
  // 서버는 밀린 세그먼트를 모두 쓴 뒤에 세션을 닫으므로, 끝난 세션의 문장은 모두 DB에 있다.
  router.get('/:id/export', async (req, res) => {
    const id = parseSessionId(req.params.id);
    const format = parseExportFormat(req.query.format);
    const session = await requireSession(pool, id);
    if (session.status === 'recording') {
      throw new HttpError(409, 'SESSION_RECORDING', `녹음 중인 세션은 내보낼 수 없습니다: ${id}`);
    }
    const file = exportSession(format, session, await listSegments(pool, id));
    res.attachment(file.filename);
    res.type(file.contentType);
    res.send(file.body);
  });

  // 세션을 종료한다. 없는 번호면 404, 진행 중이 아니면 409.
  router.post('/:id/stop', async (req, res) => {
    const id = parseSessionId(req.params.id);
    res.json({ session: control ? await control.stop(id) : await sessions.stop(id) });
  });

  // 진행 중인 세션의 partial/final을 SSE로 보낸다. 세션이 끝나면 ended를 보내고 닫는다.
  // 접속하면 지금까지의 final을 먼저 보낸다. Last-Event-ID가 있으면 그 번호 뒤의 final만 보낸다.
  router.get('/:id/events', async (req, res) => {
    const id = parseSessionId(req.params.id);
    const afterSegmentId = parseLastEventId(req.get('Last-Event-ID'));
    const stream = new SseStream(res, { intervalMs: STREAM_HEARTBEAT_MS, message: HEARTBEAT });
    const subscriber: SessionSubscriber = {
      send: (message) => stream.send(message, sseEventId(message)),
      close: () => stream.close(),
    };
    // 진행 중인 세션이 아니면 404나 409를 던진다. 아직 헤더를 보내지 않아 에러 JSON으로 응답된다.
    const unsubscribe = await sessions.subscribe(id, subscriber, afterSegmentId);
    res.on('close', unsubscribe);
    stream.start();
  });

  return router;
}
