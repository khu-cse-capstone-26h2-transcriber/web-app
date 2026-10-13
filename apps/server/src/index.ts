// 서버 진입점. 환경변수를 읽고 DB 풀과 HTTP 서버를 띄운다.
import { APP_NAME } from '@app/shared';
import { createApp } from './app';
import { loadEnv, maskDbUrl } from './config/env';
import { createPool } from './db/pool';
import { SessionManager } from './sessions/manager';
import { MockSttAdapter } from './stt/mock';

const env = loadEnv();
const pool = createPool(env.dbUrl);
// 실제 STT로 바꿀 때는 이 함수가 만드는 어댑터만 바뀐다. (T20)
const sessions = new SessionManager(pool, () => new MockSttAdapter());
const app = createApp(pool, sessions);

// 서버가 꺼질 때 닫지 못한 세션을 정리한다. DB가 꺼져 있어도 서버는 띄운다.
try {
  await sessions.recover();
} catch {
  console.error(
    '[session] DB에 연결하지 못해 남은 세션을 확인하지 못했습니다. 다음 녹음을 시작할 때 다시 확인합니다',
  );
}

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

// 새 요청을 받지 않고, 처리 중인 요청이 끝나면 진행 중인 세션과 DB 풀을 닫고 끝낸다.
let shuttingDown = false;
function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[server] ${signal} 받음, 종료합니다`);
  server.close(() => {
    void sessions
      .shutdown()
      .catch((error: unknown) => {
        console.error('[session] 진행 중인 세션을 닫지 못했습니다:', error);
      })
      .then(() => pool.end())
      .then(() => {
        console.log('[server] 종료 완료');
        process.exit(0);
      });
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
