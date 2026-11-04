// 시각, 길이 표시 함수의 테스트(T17). 히스토리 화면과 내보내기 파일이 같이 쓰는 함수다.
import { describe, expect, it } from 'vitest';
import { formatDuration, formatOffset, formatStartedAt, recordingLengthMs } from './format';

describe('formatOffset', () => {
  it('분:초로 쓰고 초 아래는 버린다', () => {
    expect(formatOffset(0)).toBe('00:00');
    expect(formatOffset(8_999)).toBe('00:08');
    expect(formatOffset(3_599_999)).toBe('59:59');
  });

  it('1시간부터 시:분:초로 쓴다', () => {
    expect(formatOffset(3_600_000)).toBe('1:00:00');
    expect(formatOffset(3_723_000)).toBe('1:02:03');
  });
});

describe('formatDuration', () => {
  it('앞쪽의 0인 단위는 빼고, 뒤쪽은 0이어도 쓴다', () => {
    expect(formatDuration(0)).toBe('0초');
    expect(formatDuration(192_000)).toBe('3분 12초');
    expect(formatDuration(3_600_000)).toBe('1시간 0분 0초');
  });
});

describe('formatStartedAt', () => {
  it('실행 환경의 시간대와 상관없이 한국 시간으로 쓴다', () => {
    expect(formatStartedAt('2026-10-23T05:05:00.000Z')).toBe('2026-10-23 14:05');
  });

  it('한국 시간으로 날짜가 넘어가면 다음 날 00시로 쓴다', () => {
    expect(formatStartedAt('2026-10-23T15:00:00.000Z')).toBe('2026-10-24 00:00');
  });
});

describe('recordingLengthMs', () => {
  it('문장이 없으면 0이다', () => {
    expect(recordingLengthMs([])).toBe(0);
  });

  it('마지막 문장이 아니라 가장 늦게 끝난 문장의 끝 시각이다', () => {
    const segments = [
      { segmentId: 0, text: '하나', startMs: 0, endMs: 9_000 },
      { segmentId: 1, text: '둘', startMs: 4_000, endMs: 6_000 },
    ];
    expect(recordingLengthMs(segments)).toBe(9_000);
  });
});
