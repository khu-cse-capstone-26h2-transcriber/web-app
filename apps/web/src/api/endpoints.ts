// 서버 API 함수. 타입은 @app/shared를 쓴다. 세션 스트림(SSE)은 useSessionStream.ts에 있다.
import type { ExportFormat, Segment, Session, SessionSummary } from '@app/shared';
import { type DownloadedFile, request, requestFile } from './client';

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

// 진행 중인 세션. 없으면 null. 서버 메모리만 읽으므로 DB가 꺼져 있어도 답한다.
export async function getActiveSession(signal?: AbortSignal): Promise<Session | null> {
  const body = await request<{ session: Session | null }>('/api/sessions/active', { signal });
  return body.session;
}

// 녹음을 시작한다. 이미 진행 중인 세션이 있으면 409 SESSION_ALREADY_ACTIVE.
export async function startSession(): Promise<Session> {
  const body = await request<{ session: Session }>('/api/sessions', { method: 'POST' });
  return body.session;
}

// 녹음을 종료한다. 진행 중이 아니면 409 SESSION_NOT_ACTIVE, DB에 닿지 못하면 503 DB_UNAVAILABLE.
// 서버는 종료에 실패하면 세션을 녹음 중으로 남기므로, 같은 번호로 다시 부르면 된다.
export async function stopSession(id: number): Promise<Session> {
  const body = await request<{ session: Session }>(`/api/sessions/${id}/stop`, { method: 'POST' });
  return body.session;
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

// 히스토리 내보내기. 끝난 세션을 txt나 md 파일로 받는다. 녹음 중이면 409 SESSION_RECORDING.
export function exportSession(id: number, format: ExportFormat): Promise<DownloadedFile> {
  return requestFile(`/api/sessions/${id}/export?format=${format}`, `session-${id}.${format}`);
}
