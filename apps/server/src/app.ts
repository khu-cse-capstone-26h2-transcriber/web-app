// Express 앱을 조립한다. listen은 index.ts에서 한다.
import type { Health } from '@app/shared';
import express, { type Express, type Router } from 'express';
import type { Pool } from 'pg';
import { DeviceControl } from './device/control';
import { DeviceIngest } from './device/ingest';
import { createDeviceRouter } from './device/routes';
import { errorHandler, HttpError, notFoundHandler } from './http/errors';
import type { SessionManager } from './sessions/manager';
import { createSessionRouter } from './sessions/routes';

// web은 웹앱 빌드를 내보내는 라우터다. 빌드가 없으면 null이고, 그때는 API만 연다. (T31)
// deviceCtrlSocket이 있으면 웹의 녹음 시작·종료 버튼이 기기에 명령을 보낸다 (HW-2).
// deviceButton은 기기에 물리 녹음 버튼이 있는지다. /health로 웹에 알려, 웹이 버튼 모양과 안내 문구를 고른다 (T43).
export function createApp(
  pool: Pool,
  sessions: SessionManager,
  web: Router | null,
  deviceCtrlSocket: string | null = null,
  deviceButton = false,
): Express {
  const app = express();
  app.use(express.json());

  // 서버와 DB가 모두 살아 있는지 확인한다. 기기 버튼이 있는지도 함께 알린다.
  app.get('/health', async (_req, res) => {
    try {
      await pool.query('select 1');
    } catch {
      throw new HttpError(503, 'DB_UNAVAILABLE', 'DB에 연결하지 못했습니다');
    }
    const health: Health = { status: 'ok', deviceButton };
    res.json(health);
  });

  // API는 모두 /api 아래에 둔다.
  const ingest = new DeviceIngest(pool, sessions);
  const control = deviceCtrlSocket ? new DeviceControl(deviceCtrlSocket, pool, sessions, ingest) : null;
  app.use('/api/sessions', createSessionRouter(pool, sessions, control));
  // 기기(audiostackd)가 세션 통지와 인식 결과를 보내는 경로 (T20). 데몬 설정 [backend]의 경로 세 줄을 여기로 맞춘다.
  app.use('/api/device/sessions', createDeviceRouter(ingest));

  // 웹앱은 API 뒤에 둔다. API 경로는 웹 라우터가 건드리지 않고 아래 404로 넘긴다.
  if (web) app.use(web);

  // 라우트 뒤에 둔다. 순서가 바뀌면 모든 요청이 404가 된다.
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
