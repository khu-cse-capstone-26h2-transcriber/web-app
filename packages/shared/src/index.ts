// 서버와 웹이 함께 쓰는 상수와 타입.
export const APP_NAME = 'speech-transcriber';

export { EXPORT_FORMATS } from './export';
export type { ExportFormat } from './export';
export {
  SESSION_STATUS_LABELS,
  formatDuration,
  formatOffset,
  formatStartedAt,
  recordingLengthMs,
} from './format';
export type { Segment } from './segment';
export type { Session, SessionStatus, SessionSummary } from './session';
export { STREAM_HEARTBEAT_MS } from './stream';
export type { SessionStreamMessage } from './stream';
export type { SttEvent, SttEventType } from './stt';
