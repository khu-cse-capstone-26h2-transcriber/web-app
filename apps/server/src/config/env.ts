// 환경변수를 읽어 서버 설정으로 만든다. 주소 같은 값은 코드에 쓰지 않고 여기서만 받는다.
const REQUIRED_KEYS = ['PORT', 'DB_URL', 'STT_URL'] as const;
type EnvKey = (typeof REQUIRED_KEYS)[number];

export interface Env {
  port: number;
  dbUrl: string;
  sttUrl: string;
}

function fail(message: string): never {
  console.error(`[env] ${message}`);
  process.exit(1);
}

// 빠진 값이 있으면 이름을 모두 알리고 종료 코드 1로 끝낸다. 빈 문자열도 빠진 값으로 본다.
export function loadEnv(): Env {
  const missing = REQUIRED_KEYS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    fail(`환경변수가 없습니다: ${missing.join(', ')} (.env.example을 .env로 복사했는지 확인하세요)`);
  }

  const { PORT, DB_URL, STT_URL } = process.env as Record<EnvKey, string>;
  const port = Number(PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    fail(`PORT는 1~65535 사이의 정수여야 합니다: ${PORT}`);
  }

  return { port, dbUrl: DB_URL, sttUrl: STT_URL };
}

// 로그에 찍을 DB 주소. 비밀번호 자리를 가린다.
export function maskDbUrl(dbUrl: string): string {
  return dbUrl.replace(/(:\/\/[^:@/]*):[^/]*@/, '$1:***@');
}
