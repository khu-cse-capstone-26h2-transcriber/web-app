// 서버 API 함수. 타입은 @app/shared를 쓴다. 녹음 시작·종료(T13)와 스트림(T14)은 그 작업에서 더한다.
import type { Segment, Session, SessionSummary } from '@app/shared';
import { request } from './client';

// GET /health의 성공 응답. DB가 꺼져 있으면 503 DB_UNAVAILABLE로 실패한다.
export interface Health {
  status: 'ok';
}

// GET /api/sessions/:id의 응답.
export interface SessionDetail {
  session: Session;
  segments: Segment[];
}

export function getHealth(signal?: AbortSignal): Promise<Health> {
  return request<Health>('/health', { signal });
}

// 히스토리 목록. 끝난 세션 중 세그먼트가 있는 것만, 최근 것부터.
export async function listSessions(signal?: AbortSignal): Promise<SessionSummary[]> {
  const body = await request<{ sessions: SessionSummary[] }>('/api/sessions', { signal });
  return body.sessions;
}

// 히스토리 상세. id는 주소에서 읽은 그대로 보내고, 형식 검사는 서버가 한다(400 INVALID_SESSION_ID).
export function getSession(id: string, signal?: AbortSignal): Promise<SessionDetail> {
  return request<SessionDetail>(`/api/sessions/${encodeURIComponent(id)}`, { signal });
}
