// 녹음의 시각, 길이, 상태를 글로 쓰는 함수. 서버의 내보내기 파일(T11)과 웹의 히스토리 화면(T16)이 같이 써서
// 화면과 내려받은 파일의 표시가 항상 같다.
import type { Segment } from './segment';
import type { SessionStatus } from './session';

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  recording: '녹음 중',
  ended: '종료됨',
  interrupted: '중단됨 (서버가 꺼져 끊김)',
};

// 시작 시각은 기기와 브라우저의 시간대 설정과 상관없이 한국 시간으로 쓴다.
const startedAtFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

// ISO 시각을 한국 시간 2026-10-23 14:05 모양으로 쓴다.
export function formatStartedAt(iso: string): string {
  const parts = Object.fromEntries(
    startedAtFormat.formatToParts(new Date(iso)).map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

// ms를 시, 분, 초로 나눈다. 초 아래는 버린다.
function splitTime(ms: number): { hours: number; minutes: number; seconds: number } {
  const total = Math.floor(ms / 1000);
  return {
    hours: Math.floor(total / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

// 세션 시작 기준 시각을 00:08 모양으로 쓴다. 1시간이 넘으면 1:02:03이다.
export function formatOffset(ms: number): string {
  const { hours, minutes, seconds } = splitTime(ms);
  const minutesAndSeconds = `${pad2(minutes)}:${pad2(seconds)}`;
  return hours > 0 ? `${hours}:${minutesAndSeconds}` : minutesAndSeconds;
}

// 녹음 길이를 3분 12초 모양으로 쓴다. 앞쪽의 0인 단위는 뺀다.
export function formatDuration(ms: number): string {
  const { hours, minutes, seconds } = splitTime(ms);
  if (hours > 0) return `${hours}시간 ${minutes}분 ${seconds}초`;
  if (minutes > 0) return `${minutes}분 ${seconds}초`;
  return `${seconds}초`;
}

// 녹음 길이는 마지막 문장의 끝 시각이다. 서버가 꺼져 끊긴 세션은 ended_at이 서버를 다시 켠 시각이라 쓰지 않는다.
export function recordingLengthMs(segments: Segment[]): number {
  return segments.reduce((max, segment) => Math.max(max, segment.endMs), 0);
}
