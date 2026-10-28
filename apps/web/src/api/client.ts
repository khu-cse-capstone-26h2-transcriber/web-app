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

// 잡은 에러를 ApiError로 맞춘다. request는 ApiError만 던지므로, 그 밖의 에러는 화면 코드의 버그다.
export function toApiError(error: unknown): ApiError {
  return error instanceof ApiError ? error : new ApiError(0, 'CLIENT_ERROR', String(error));
}

function isErrorBody(value: unknown): value is ErrorBody {
  const error = (value as { error?: unknown } | null)?.error as
    | { code?: unknown; message?: unknown }
    | undefined;
  return typeof error?.code === 'string' && typeof error.message === 'string';
}

function networkError(): ApiError {
  return new ApiError(0, 'NETWORK_ERROR', '서버에 연결하지 못했습니다');
}

// fetch를 부른다. 서버에 닿지 못하면 ApiError로 던지고, 취소(signal)는 원래 에러 그대로 던진다.
async function send(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(path, init);
  } catch (error) {
    if (init.signal?.aborted) throw error;
    throw networkError();
  }
}

// 실패한 응답을 ApiError로 바꾼다. body는 JSON으로 읽은 본문이고, JSON이 아니면 undefined다.
function responseError(status: number, body: unknown): ApiError {
  if (isErrorBody(body)) return new ApiError(status, body.error.code, body.error.message);
  // 개발 중 Express가 꺼져 있으면 Vite 프록시가 JSON 없이 502로 답한다. 서버에 닿지 못한 것과 같게 다룬다.
  if (status === 502) return new ApiError(502, 'NETWORK_ERROR', '서버에 연결하지 못했습니다');
  return new ApiError(status, 'UNEXPECTED_RESPONSE', `서버 응답을 읽지 못했습니다 (HTTP ${status})`);
}

// JSON 응답을 T로 돌려준다. 실패는 모두 ApiError로 던지고, 취소(signal)만 원래 에러 그대로 던진다.
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await send(path, init);
  // 서버는 성공과 에러 모두 JSON으로 답한다. JSON이 아니면 서버가 아닌 곳(프록시 등)의 응답이다.
  const body: unknown = await response.json().catch(() => undefined);
  if (response.ok && body !== undefined) return body as T;
  throw responseError(response.status, body);
}

// 내려받은 파일 하나.
export interface DownloadedFile {
  filename: string;
  blob: Blob;
}

// Content-Disposition의 filename을 읽는다. 서버는 영문 이름에 따옴표를 붙이지 않지만, 붙여도 읽는다.
function filenameFrom(disposition: string | null): string | undefined {
  return disposition?.match(/filename="?([^";]+)"?/i)?.[1];
}

// 파일 응답(Content-Disposition: attachment)을 받는다. 실패는 request와 같은 ApiError로 던진다.
// 파일 이름은 서버가 정하고, 헤더가 없을 때만 fallbackName을 쓴다.
export async function requestFile(
  path: string,
  fallbackName: string,
  init: RequestInit = {},
): Promise<DownloadedFile> {
  const response = await send(path, init);
  if (!response.ok) {
    throw responseError(response.status, await response.json().catch(() => undefined));
  }
  let blob: Blob;
  try {
    blob = await response.blob();
  } catch (error) {
    if (init.signal?.aborted) throw error;
    // 본문을 받는 중에 연결이 끊겼다.
    throw networkError();
  }
  return { filename: filenameFrom(response.headers.get('Content-Disposition')) ?? fallbackName, blob };
}
