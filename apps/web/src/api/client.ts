// 서버 API를 부르는 fetch 래퍼. 주소는 /api/…, /health처럼 같은 출처의 경로로 쓴다.
// 개발 중에는 Vite 개발 서버가 이 경로를 Express로 넘긴다(vite.config.ts의 proxy).

// 서버의 에러 응답 모양. 서버 http/errors.ts의 { error: { code, message } }와 같다.
interface ErrorBody {
  error: { code: string; message: string };
}

// API 호출이 실패하면 던진다. code NETWORK_ERROR는 서버에 닿지 못한 경우다(status 0, 또는 개발 중 프록시의 502).
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

function isErrorBody(value: unknown): value is ErrorBody {
  const error = (value as { error?: unknown } | null)?.error as
    | { code?: unknown; message?: unknown }
    | undefined;
  return typeof error?.code === 'string' && typeof error.message === 'string';
}

// JSON 응답을 T로 돌려준다. 실패는 모두 ApiError로 던지고, 취소(signal)만 원래 에러 그대로 던진다.
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch (error) {
    if (init.signal?.aborted) throw error;
    throw new ApiError(0, 'NETWORK_ERROR', '서버에 연결하지 못했습니다');
  }

  // 서버는 성공과 에러 모두 JSON으로 답한다. JSON이 아니면 서버가 아닌 곳(프록시 등)의 응답이다.
  const body: unknown = await response.json().catch(() => undefined);
  if (response.ok && body !== undefined) return body as T;
  if (isErrorBody(body)) {
    throw new ApiError(response.status, body.error.code, body.error.message);
  }
  // 개발 중 Express가 꺼져 있으면 Vite 프록시가 JSON 없이 502로 답한다. 서버에 닿지 못한 것과 같게 다룬다.
  if (response.status === 502) {
    throw new ApiError(502, 'NETWORK_ERROR', '서버에 연결하지 못했습니다');
  }
  throw new ApiError(
    response.status,
    'UNEXPECTED_RESPONSE',
    `서버 응답을 읽지 못했습니다 (HTTP ${response.status})`,
  );
}
