// 히스토리 내보내기 포매터. 세션 하나와 저장된 세그먼트를 txt나 md 파일 하나로 만든다.
// DB와 Express를 모르는 순수 함수로 둔다(T17에서 그대로 테스트한다).
import type { ExportFormat, Segment, Session, SessionStatus } from '@app/shared';

export interface ExportFile {
  filename: string;
  contentType: string;
  body: string;
}

const STATUS_LABELS: Record<SessionStatus, string> = {
  recording: '녹음 중',
  ended: '종료됨',
  interrupted: '중단됨 (서버가 꺼져 끊김)',
};

const EMPTY_BODY = '(저장된 문장이 없습니다)';

// 시작 시각은 기기 시간대 설정과 상관없이 한국 시간으로 쓴다.
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
function formatStartedAt(iso: string): string {
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
function recordingLengthMs(segments: Segment[]): number {
  return segments.reduce((max, segment) => Math.max(max, segment.endMs), 0);
}

// 문장 안의 줄바꿈을 공백으로 바꿔 한 문장이 한 줄에 들어가게 한다.
function oneLine(text: string): string {
  return text.replace(/\s*[\r\n]+\s*/g, ' ').trim();
}

// 머리말 항목. txt와 md가 같은 내용을 모양만 바꿔 쓴다.
function headerFields(session: Session, segments: Segment[]): [string, string][] {
  return [
    ['시작', formatStartedAt(session.startedAt)],
    ['길이', formatDuration(recordingLengthMs(segments))],
    ['상태', STATUS_LABELS[session.status]],
  ];
}

export function formatTxt(session: Session, segments: Segment[]): string {
  const lines = [`녹음 #${session.id}`];
  for (const [label, value] of headerFields(session, segments)) lines.push(`${label}: ${value}`);
  lines.push('');
  if (segments.length === 0) lines.push(EMPTY_BODY);
  for (const segment of segments) {
    lines.push(`[${formatOffset(segment.startMs)}] ${oneLine(segment.text)}`);
  }
  return `${lines.join('\n')}\n`;
}

export function formatMd(session: Session, segments: Segment[]): string {
  const lines = [`# 녹음 #${session.id}`, ''];
  for (const [label, value] of headerFields(session, segments)) lines.push(`- ${label}: ${value}`);
  lines.push('', '## 내용', '');
  if (segments.length === 0) lines.push(EMPTY_BODY);
  for (const segment of segments) {
    lines.push(`- \`${formatOffset(segment.startMs)}\` ${oneLine(segment.text)}`);
  }
  return `${lines.join('\n')}\n`;
}

const FORMATTERS: Record<ExportFormat, (session: Session, segments: Segment[]) => string> = {
  txt: formatTxt,
  md: formatMd,
};

const CONTENT_TYPES: Record<ExportFormat, string> = {
  txt: 'text/plain',
  md: 'text/markdown',
};

// 응답으로 보낼 파일 하나. charset은 Express가 utf-8로 붙인다.
export function exportSession(
  format: ExportFormat,
  session: Session,
  segments: Segment[],
): ExportFile {
  return {
    filename: `session-${session.id}.${format}`,
    contentType: CONTENT_TYPES[format],
    body: FORMATTERS[format](session, segments),
  };
}
