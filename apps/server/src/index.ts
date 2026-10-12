// 임시 진입점. 환경변수를 읽어 설정을 확인한다. (HTTP 서버는 T04에서 만든다)
import { APP_NAME } from '@app/shared';
import { loadEnv, maskDbUrl } from './config/env';

const env = loadEnv();

console.log(`[server] ready - ${APP_NAME}`);
// 비밀번호는 가리고 찍는다.
console.log(
  `[server] config - PORT=${env.port} DB_URL=${maskDbUrl(env.dbUrl)} STT_URL=${env.sttUrl}`,
);
