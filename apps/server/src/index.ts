// 서버 진입점. 환경변수를 읽고 DB 풀과 HTTP 서버를 띄운다.
import { APP_NAME } from '@app/shared';
import { createApp } from './app';
import { loadEnv, maskDbUrl } from './config/env';
import { createPool } from './db/pool';

const env = loadEnv();
const pool = createPool(env.dbUrl);
const app = createApp(pool);

// Express 5는 listen에 실패해도 이 콜백을 부르고, 그때 첫 인자로 에러를 준다.
const server = app.listen(env.port, (error?: Error) => {
  if (error) {
    if ((error as NodeJS.ErrnoException).code === 'EADDRINUSE') {
      console.error(`[server] 포트가 이미 사용 중입니다: ${env.port}`);
    } else {
      console.error(`[server] 시작 실패: ${error.message}`);
    }
    process.exit(1);
  }
  console.log(`[server] ready - ${APP_NAME} http://localhost:${env.port}`);
  // 비밀번호는 가리고 찍는다.
  console.log(
    `[server] config - PORT=${env.port} DB_URL=${maskDbUrl(env.dbUrl)} STT_URL=${env.sttUrl}`,
  );
});

// 새 요청을 받지 않고, 처리 중인 요청이 끝나면 DB 풀을 닫고 끝낸다.
let shuttingDown = false;
function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[server] ${signal} 받음, 종료합니다`);
  server.close(() => {
    void pool.end().then(() => {
      console.log('[server] 종료 완료');
      process.exit(0);
    });
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
