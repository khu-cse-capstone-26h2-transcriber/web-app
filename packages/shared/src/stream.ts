// 녹음 중인 세션의 스트림(SSE)으로 웹앱에 보내는 메시지. 종류는 type으로 구분한다.
// 나중에 WebSocket으로 바꿔도 같은 JSON을 그대로 보낸다.
import type { Session } from './session';
import type { SttEvent } from './stt';

// 서버가 heartbeat 메시지를 보내는 간격(ms). 웹앱은 이보다 오래 메시지가 없으면 끊긴 것으로 볼 수 있다.
export const STREAM_HEARTBEAT_MS = 15_000;

export type SessionStreamMessage =
  // STT 결과. 필드는 SttEvent 그대로다. (type: 'partial' | 'final')
  | SttEvent
  // 세션이 끝났다. 이 메시지 뒤에 서버가 스트림을 닫는다.
  | { type: 'ended'; session: Session }
  // 연결이 살아 있음을 알린다. 다른 내용은 없다.
  | { type: 'heartbeat' };
