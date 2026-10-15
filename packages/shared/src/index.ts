// 서버와 웹이 함께 쓰는 상수와 타입.
export const APP_NAME = 'speech-transcriber';

export type { Segment } from './segment';
export type { Session, SessionStatus, SessionSummary } from './session';
export { STREAM_HEARTBEAT_MS } from './stream';
export type { SessionStreamMessage } from './stream';
export type { SttEvent, SttEventType } from './stt';
