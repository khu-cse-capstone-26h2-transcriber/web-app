// 세션 API. app.ts에서 /api/sessions 아래에 붙인다.
import { STREAM_HEARTBEAT_MS, type SessionStreamMessage } from '@app/shared';
import express, { type Router } from 'express';
import type { Pool } from 'pg';
import { HttpError } from '../http/errors';
import { SseStream } from '../http/sse';
import { listSegments } from '../segments/repository';
import type { SessionManager } from './manager';
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

// 히스토리(목록, 상세)는 DB만 읽으므로 pool로 직접 읽는다. 시작·종료·스트림은 SessionManager가 맡는다.
export function createSessionRouter(pool: Pool, sessions: SessionManager): Router {
  const router = express.Router();

  // 히스토리 목록. 끝난 세션 중 세그먼트가 있는 것만, 최근에 시작한 것부터.
  router.get('/', async (_req, res) => {
    res.json({ sessions: await listFinishedSessions(pool) });
  });

  // 세션을 시작한다. 진행 중인 세션이 있으면 409.
  router.post('/', async (_req, res) => {
    res.status(201).json({ session: await sessions.start() });
  });

  // 진행 중인 세션. 없으면 session이 null이다. '/:id'보다 앞에 있어야 active가 번호로 읽히지 않는다.
  router.get('/active', (_req, res) => {
    res.json({ session: sessions.getActive() });
  });

  // 히스토리 상세. 세션과 저장된 세그먼트. 녹음 중이거나 세그먼트가 없는 세션도 볼 수 있다.
  router.get('/:id', async (req, res) => {
    const id = parseSessionId(req.params.id);
    const session = await findSession(pool, id);
    if (!session) {
      throw new HttpError(404, 'SESSION_NOT_FOUND', `세션을 찾을 수 없습니다: ${id}`);
    }
    res.json({ session, segments: await listSegments(pool, id) });
  });

  // 세션을 종료한다. 없는 번호면 404, 진행 중이 아니면 409.
  router.post('/:id/stop', async (req, res) => {
    const id = parseSessionId(req.params.id);
    res.json({ session: await sessions.stop(id) });
  });

  // 진행 중인 세션의 partial/final을 SSE로 보낸다. 세션이 끝나면 ended를 보내고 닫는다.
  router.get('/:id/events', async (req, res) => {
    const id = parseSessionId(req.params.id);
    const stream = new SseStream(res, { intervalMs: STREAM_HEARTBEAT_MS, message: HEARTBEAT });
    // 진행 중인 세션이 아니면 404나 409를 던진다. 아직 헤더를 보내지 않아 에러 JSON으로 응답된다.
    const unsubscribe = await sessions.subscribe(id, stream);
    res.on('close', unsubscribe);
    stream.start();
  });

  return router;
}
