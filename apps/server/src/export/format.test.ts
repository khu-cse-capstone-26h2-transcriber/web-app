// 히스토리 내보내기 포매터의 테스트(T17). 파일 전체를 문자열로 비교한다.
import type { Segment, Session } from '@app/shared';
import { describe, expect, it } from 'vitest';
import { exportSession, formatMd, formatTxt } from './format';

const SESSION: Session = {
  id: 7,
  status: 'ended',
  startedAt: '2026-10-23T05:05:00.000Z',
  endedAt: '2026-10-23T05:08:30.000Z',
};

const SEGMENTS: Segment[] = [
  { segmentId: 0, text: '안녕하세요', startMs: 0, endMs: 2_400 },
  // 문장 안의 줄바꿈은 앞뒤 공백과 함께 공백 한 칸이 된다.
  { segmentId: 1, text: '오늘 회의를 \r\n  시작하겠습니다', startMs: 8_500, endMs: 12_000 },
  { segmentId: 2, text: '첫 안건입니다', startMs: 185_000, endMs: 192_300 },
];

// 줄을 이어 붙이고 파일 끝에 줄바꿈 하나를 단다.
function file(lines: string[]): string {
  return `${lines.join('\n')}\n`;
}

describe('formatTxt', () => {
  it('머리말, 빈 줄, 문장별 시작 시각과 문장을 쓴다', () => {
    expect(formatTxt(SESSION, SEGMENTS)).toBe(
      file([
        '녹음 #7',
        '시작: 2026-10-23 14:05',
        '길이: 3분 12초',
        '상태: 종료됨',
        '',
        '[00:00] 안녕하세요',
        '[00:08] 오늘 회의를 시작하겠습니다',
        '[03:05] 첫 안건입니다',
      ]),
    );
  });

  it('문장이 없으면 길이 0초와 안내 문구를 쓴다', () => {
    expect(formatTxt(SESSION, [])).toBe(
      file([
        '녹음 #7',
        '시작: 2026-10-23 14:05',
        '길이: 0초',
        '상태: 종료됨',
        '',
        '(저장된 문장이 없습니다)',
      ]),
    );
  });

  it('서버가 꺼져 끊긴 세션은 상태를 중단됨으로 쓴다', () => {
    const body = formatTxt({ ...SESSION, status: 'interrupted' }, SEGMENTS);
    expect(body).toContain('\n상태: 중단됨 (서버가 꺼져 끊김)\n');
  });
});

describe('formatMd', () => {
  it('머리말 목록, 내용 제목, 문장 목록을 쓴다', () => {
    expect(formatMd(SESSION, SEGMENTS)).toBe(
      file([
        '# 녹음 #7',
        '',
        '- 시작: 2026-10-23 14:05',
        '- 길이: 3분 12초',
        '- 상태: 종료됨',
        '',
        '## 내용',
        '',
        '- `00:00` 안녕하세요',
        '- `00:08` 오늘 회의를 시작하겠습니다',
        '- `03:05` 첫 안건입니다',
      ]),
    );
  });

  it('문장이 없으면 내용 아래에 안내 문구를 쓴다', () => {
    const body = formatMd(SESSION, []);
    expect(body).toContain('\n- 길이: 0초\n');
    expect(body.endsWith('\n## 내용\n\n(저장된 문장이 없습니다)\n')).toBe(true);
  });
});

describe('exportSession', () => {
  it('형식에 맞는 파일 이름, 콘텐츠 타입, 본문을 돌려준다', () => {
    expect(exportSession('txt', SESSION, SEGMENTS)).toEqual({
      filename: 'session-7.txt',
      contentType: 'text/plain',
      body: formatTxt(SESSION, SEGMENTS),
    });
    expect(exportSession('md', SESSION, SEGMENTS)).toEqual({
      filename: 'session-7.md',
      contentType: 'text/markdown',
      body: formatMd(SESSION, SEGMENTS),
    });
  });
});
