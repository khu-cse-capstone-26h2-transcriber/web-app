// DB 에러를 가려낸다. API가 DB에 닿지 못했을 때 500 대신 503으로 답하는 데 쓴다.

// 소켓 연결이 실패했을 때 Node가 붙이는 코드.
const NETWORK_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EPIPE',
]);

// pg가 코드 없이 메시지로만 알리는 연결 실패. 풀의 연결 대기 시간 초과와 연결 중 끊김이다.
const CONNECTION_FAILURE_MESSAGE =
  /timeout exceeded when trying to connect|Connection terminated/;

// DB에 닿지 못해 생긴 에러인지. 값이나 제약 오류처럼 DB가 거절한 경우는 해당하지 않는다.
export function isDbUnavailable(error: unknown): boolean {
  const { code, message } = (error ?? {}) as { code?: unknown; message?: unknown };
  if (typeof code === 'string') {
    if (NETWORK_ERROR_CODES.has(code)) return true;
    // SQLSTATE 08은 연결 예외, 57P01~57P03은 DB가 꺼지는 중이거나 아직 켜지는 중이다.
    if (/^08/.test(code) || /^57P0[1-3]$/.test(code)) return true;
  }
  return typeof message === 'string' && CONNECTION_FAILURE_MESSAGE.test(message);
}
