// API 에러 응답 형식과 공통 에러 처리. 모든 에러 응답은 { error: { code, message } } 모양이다.
import type { ErrorRequestHandler, RequestHandler } from 'express';

// 핸들러에서 던지면 errorHandler가 status와 code를 그대로 응답으로 바꾼다.
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// 어느 라우트에도 걸리지 않은 요청.
export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `경로를 찾을 수 없습니다: ${req.method} ${req.path}` },
  });
};

// 인자가 넷이어야 Express가 에러 처리 미들웨어로 알아본다.
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }

  // express.json()이 본문을 읽지 못했을 때.
  if ((error as { type?: unknown }).type === 'entity.parse.failed') {
    res.status(400).json({
      error: { code: 'INVALID_JSON', message: '요청 본문이 올바른 JSON이 아닙니다' },
    });
    return;
  }

  // 예상하지 못한 에러. 내용은 서버 로그에만 남기고 응답에는 넣지 않는다.
  console.error('[server] 처리하지 못한 에러:', error);
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: '서버에서 오류가 발생했습니다' },
  });
};
