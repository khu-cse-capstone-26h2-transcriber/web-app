// 기기(audiostackd)가 부르는 수신 경로. app.ts에서 /api/device/sessions 아래에 붙인다 (T19 '수신 경로').
// 데몬은 2xx가 아니면 같은 요청을 맨 앞에 두고 계속 다시 보내므로, 항상 2xx나 503으로 답한다.
import express, { type Request, type Response, type Router } from 'express';
import { isDbUnavailable } from '../db/errors';
import type { DeviceIngest, IngestReply } from './ingest';

async function reply(res: Response, work: () => Promise<IngestReply>): Promise<void> {
  try {
    const { status, body } = await work();
    res.status(status).json(body);
  } catch (error) {
    if (isDbUnavailable(error)) {
      // 데몬이 순서를 지켜 다시 보낸다.
      res.status(503).json({ error: { code: 'DB_UNAVAILABLE', message: 'DB에 연결하지 못했습니다' } });
      return;
    }
    console.error('[device] 처리하지 못해 버립니다:', error);
    res.status(202).json({ ignored: error instanceof Error ? error.message : String(error) });
  }
}

export function createDeviceRouter(ingest: DeviceIngest): Router {
  const router = express.Router();
  router.post('/', (req: Request, res: Response) => reply(res, () => ingest.begin(req.body)));
  router.post('/:deviceId/transcripts', (req: Request<{ deviceId: string }>, res: Response) =>
    reply(res, () => ingest.transcript(req.params.deviceId, req.body)),
  );
  router.post('/:deviceId/end', (req: Request<{ deviceId: string }>, res: Response) =>
    reply(res, () => ingest.end(req.params.deviceId)),
  );
  return router;
}
