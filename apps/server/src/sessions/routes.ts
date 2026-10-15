// 세션 API. app.ts에서 /api/sessions 아래에 붙인다.
import { STREAM_HEARTBEAT_MS, type SessionStreamMessage } from '@app/shared';
import express, { type Router } from 'express';
import { HttpError } from '../http/errors';
import { SseStream } from '../http/sse';
import type { SessionManager } from './manager';

const HEARTBEAT: SessionStreamMessage = { type: 'heartbeat' };

// 경로의 세션 번호를 양의 정수로 읽는다.
function parseSessionId(value: string): number {
  const id = Number(value);
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(id)) {
    throw new HttpError(400, 'INVALID_SESSION_ID', `세션 번호는 양의 정수여야 합니다: ${value}`);
  }
  return id;
}

export function createSessionRouter(sessions: SessionManager): Router {
  const router = express.Router();

  // 세션을 시작한다. 진행 중인 세션이 있으면 409.
  router.post('/', async (_req, res) => {
    res.status(201).json({ session: await sessions.start() });
  });

  // 진행 중인 세션. 없으면 session이 null이다. 나중에 '/:id'를 더할 때 이 라우트를 앞에 둔다.
  router.get('/active', (_req, res) => {
    res.json({ session: sessions.getActive() });
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
