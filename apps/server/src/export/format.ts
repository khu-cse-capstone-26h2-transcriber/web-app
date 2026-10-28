// 히스토리 내보내기 포매터. 세션 하나와 저장된 세그먼트를 txt나 md 파일 하나로 만든다.
// DB와 Express를 모르는 순수 함수로 둔다(T17에서 그대로 테스트한다).
// 시각·길이·상태 표시는 웹의 히스토리 화면과 같이 쓰도록 @app/shared에 있다(T16).
import {
  SESSION_STATUS_LABELS,
  formatDuration,
  formatOffset,
  formatStartedAt,
  recordingLengthMs,
  type ExportFormat,
  type Segment,
  type Session,
} from '@app/shared';

export interface ExportFile {
  filename: string;
  contentType: string;
  body: string;
}

const EMPTY_BODY = '(저장된 문장이 없습니다)';

// 문장 안의 줄바꿈을 공백으로 바꿔 한 문장이 한 줄에 들어가게 한다.
function oneLine(text: string): string {
  return text.replace(/\s*[\r\n]+\s*/g, ' ').trim();
}

// 머리말 항목. txt와 md가 같은 내용을 모양만 바꿔 쓴다.
function headerFields(session: Session, segments: Segment[]): [string, string][] {
  return [
    ['시작', formatStartedAt(session.startedAt)],
    ['길이', formatDuration(recordingLengthMs(segments))],
    ['상태', SESSION_STATUS_LABELS[session.status]],
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
