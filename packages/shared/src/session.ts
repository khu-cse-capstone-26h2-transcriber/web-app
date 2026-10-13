// 녹음 세션 타입. 서버의 응답과 웹앱이 같은 타입을 쓴다.

// recording: 녹음 중, ended: 사용자가 종료함, interrupted: 서버가 꺼져서 끊김
export type SessionStatus = 'recording' | 'ended' | 'interrupted';

export interface Session {
  // 서버가 붙이는 번호. 1부터 증가한다.
  id: number;
  status: SessionStatus;
  // ISO 8601 형식의 시각
  startedAt: string;
  // 녹음 중이면 null
  endedAt: string | null;
}
