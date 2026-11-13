// 서버 진입점. 환경변수를 읽고 DB 풀과 HTTP 서버를 띄운다.
import { APP_NAME } from '@app/shared';
import { createApp } from './app';
import { loadEnv, maskDbUrl } from './config/env';
import { createPool } from './db/pool';
import { createWebRouter, WEB_DIST_DIR } from './http/web';
import { SessionManager } from './sessions/manager';
import type { SttAdapter } from './stt/adapter';
import { LocalSttAdapter } from './stt/local';
import { MockSttAdapter } from './stt/mock';

const env = loadEnv();
const pool = createPool(env.dbUrl);
// 실제 STT로 바꿀 때는 이 함수가 만드는 어댑터만 바뀐다. (T20)
// STT_MODE=local이면 노트북에서 실제 모델 엔진을 띄운다. (T28 실험)
const { localStt } = env;
const createAdapter: () => SttAdapter = localStt
  ? () => new LocalSttAdapter(localStt)
  : () => new MockSttAdapter();
const sessions = new SessionManager(pool, createAdapter);
// 웹앱 빌드는 켤 때 한 번만 찾는다. 새로 빌드했으면 서버를 다시 켠다. (T31)
const web = createWebRouter(WEB_DIST_DIR);
const app = createApp(pool, sessions, web);

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
    `[server] config - PORT=${env.port} DB_URL=${maskDbUrl(env.dbUrl)} STT_URL=${env.sttUrl} STT_MODE=${env.sttMode}`,
  );
  if (localStt) console.log(`[server] local STT - ${localStt.script} (WAV ${localStt.wav})`);
  if (web) {
    console.log(`[server] web - 웹앱 빌드를 내보냅니다 (${WEB_DIST_DIR})`);
  } else {
    console.log(
      `[server] web - 빌드가 없어 API만 엽니다 (${WEB_DIST_DIR}). npm run build:web 뒤 서버를 다시 켜면 웹앱도 열립니다`,
    );
  }
});

// 브라우저가 keep-alive 연결을 놓지 않아도 이 시간(ms)이 지나면 남은 연결을 끊는다.
// systemd 기본 대기 시간(90초)보다 훨씬 짧게 둔다. (T32)
const FORCE_CLOSE_MS = 5_000;

// 진행 중인 세션을 중단으로 닫는다. 실패해도 종료는 이어 간다.
function closeSessions(): Promise<void> {
  return sessions.shutdown().catch((error: unknown) => {
    console.error('[session] 진행 중인 세션을 닫지 못했습니다:', error);
  });
}

// 세션을 먼저 중단하고 새 연결을 받지 않는다. 연결이 모두 닫히면 DB 풀을 닫고 끝낸다.
// 세션 정리를 server.close 콜백 뒤로 미루면, 끊긴 SSE가 같은 keep-alive 연결로 다시 붙어
// 서로를 기다리며 멈춘다(T21 찾은 문제 1). 그래서 둘을 함께 시작한다. (T32)
let shuttingDown = false;
function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[server] ${signal} 받음, 종료합니다`);
  // 첫 await 전에 진행 중인 세션을 비우고 SSE 응답을 끝낸다. 그 뒤에 server.close를 불러야
  // SSE가 쓰던 연결이 쉬는 연결로 보여 바로 닫힌다. 순서를 바꾸지 않는다.
  const sessionsClosed = closeSessions();
  // 이미 닫힌 서버면 콜백에 에러가 오지만, 그때도 종료를 이어 간다.
  const serverClosed = new Promise<void>((resolve) => server.close(() => resolve()));
  const forceTimer = setTimeout(() => {
    console.log(`[server] ${FORCE_CLOSE_MS / 1000}초 안에 닫히지 않은 연결을 끊습니다`);
    server.closeAllConnections();
  }, FORCE_CLOSE_MS);
  void Promise.all([sessionsClosed, serverClosed])
    // 종료 중에 남은 연결로 새 세션이 시작됐을 수 있어(웹 버튼, 기기 통지) 한 번 더 닫는다. DB가 필요해 풀보다 먼저.
    .then(() => closeSessions())
    .then(() => {
      clearTimeout(forceTimer);
      return pool.end();
    })
    .then(() => {
      console.log('[server] 종료 완료');
      process.exit(0);
    });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
