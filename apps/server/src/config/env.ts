// 환경변수를 읽어 서버 설정으로 만든다. 주소 같은 값은 코드에 쓰지 않고 여기서만 받는다.
const REQUIRED_KEYS = ['PORT', 'DB_URL', 'STT_URL'] as const;
type EnvKey = (typeof REQUIRED_KEYS)[number];

// mock: 정해진 문장을 흘리는 가짜 STT, local: 노트북에서 실제 모델 엔진을 띄움(T28 실험)
const STT_MODES = ['mock', 'local'] as const;
export type SttMode = (typeof STT_MODES)[number];
// STT_MODE=local일 때만 읽는다. 모두 절대 경로다.
const LOCAL_STT_KEYS = ['LOCAL_STT_PYTHON', 'LOCAL_STT_SCRIPT', 'LOCAL_STT_WAV'] as const;

export interface LocalSttEnv {
  python: string;
  script: string;
  wav: string;
}

export interface Env {
  port: number;
  dbUrl: string;
  sttUrl: string;
  sttMode: SttMode;
  // sttMode가 local일 때만 있다.
  localStt: LocalSttEnv | null;
  // 있으면 웹의 녹음 시작·종료가 기기(audiostackd) ctrl.sock으로 간다 (HW-2).
  deviceCtrlSocket: string | null;
  // 기기에 물리 녹음 버튼이 있는지(DEVICE_BUTTON=1). 없으면 웹 버튼이 녹음의 주 제어다 (T43).
  deviceButton: boolean;
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

  // 비어 있으면 지금까지처럼 mock이다.
  const rawMode = process.env.STT_MODE || 'mock';
  const sttMode = STT_MODES.find((mode) => mode === rawMode);
  if (!sttMode) {
    fail(`STT_MODE는 ${STT_MODES.join(' 또는 ')}여야 합니다: ${rawMode}`);
  }

  let localStt: LocalSttEnv | null = null;
  if (sttMode === 'local') {
    const missingLocal = LOCAL_STT_KEYS.filter((key) => !process.env[key]);
    if (missingLocal.length > 0) {
      fail(`STT_MODE=local에 필요한 환경변수가 없습니다: ${missingLocal.join(', ')}`);
    }
    const env = process.env as Record<(typeof LOCAL_STT_KEYS)[number], string>;
    localStt = { python: env.LOCAL_STT_PYTHON, script: env.LOCAL_STT_SCRIPT, wav: env.LOCAL_STT_WAV };
  }

  // 비우거나 0이면 버튼 없음(기본), 1이면 있음. 잘못 쓴 값을 켤 때 알아채도록 다른 값은 받지 않는다.
  const rawButton = process.env.DEVICE_BUTTON || '0';
  if (rawButton !== '0' && rawButton !== '1') {
    fail(`DEVICE_BUTTON은 비우거나 0(버튼 없음) 또는 1(버튼 있음)이어야 합니다: ${rawButton}`);
  }

  return {
    port,
    dbUrl: DB_URL,
    sttUrl: STT_URL,
    sttMode,
    localStt,
    deviceCtrlSocket: process.env.DEVICE_CTRL_SOCKET || null,
    deviceButton: rawButton === '1',
  };
}

// 로그에 찍을 DB 주소. 비밀번호 자리를 가린다.
export function maskDbUrl(dbUrl: string): string {
  return dbUrl.replace(/(:\/\/[^:@/]*):[^/]*@/, '$1:***@');
}
