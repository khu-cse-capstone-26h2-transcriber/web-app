// 기기 결과 → SttEvent 변환 규칙의 테스트 (T20). 규칙은 docs/guides/T19.md '결과를 SttEvent로 바꾸는 규칙'.
import { describe, expect, it } from 'vitest';
import { TranscriptConverter } from './convert';

const T0 = 1_000_000;
const body = (seq: number, transcript: Record<string, unknown>) => ({ seq, transcript });

describe('TranscriptConverter', () => {
  it('엔진 시각을 쓰고, partial과 final은 같은 번호, final 뒤에 번호가 오른다', () => {
    const c = new TranscriptConverter(T0);
    expect(c.accept(body(1, { type: 'partial', text: '안녕', t_start_ms: 100, t_end_ms: 2100 }), T0 + 2500)).toEqual({
      event: { type: 'partial', segmentId: 0, text: '안녕', startMs: 100, endMs: 2100 },
    });
    expect(c.accept(body(2, { type: 'final', text: '안녕하세요.', t_start_ms: 100, t_end_ms: 2900 }), T0 + 3500)).toEqual({
      event: { type: 'final', segmentId: 0, text: '안녕하세요.', startMs: 100, endMs: 2900 },
    });
    expect(c.accept(body(3, { type: 'final', text: '다음', t_start_ms: 3000, t_end_ms: 4000 }), T0 + 5000)).toMatchObject({
      event: { segmentId: 1, startMs: 3000, endMs: 4000 },
    });
  });

  it('엔진 시각이 없으면 받은 시각으로 채우고, 구간 시작은 처음 정한 값을 유지한다', () => {
    const c = new TranscriptConverter(T0);
    expect(c.accept(body(1, { type: 'partial', text: '가' }), T0 + 1000)).toMatchObject({ event: { startMs: 1000, endMs: 1000 } });
    expect(c.accept(body(2, { type: 'partial', text: '가나' }), T0 + 2000)).toMatchObject({ event: { startMs: 1000, endMs: 2000 } });
    expect(c.accept(body(3, { type: 'final', text: '가나다' }), T0 + 2500)).toMatchObject({ event: { startMs: 1000, endMs: 2500 } });
    // partial 없이 온 final은 직전 구간의 끝에서 시작한다
    expect(c.accept(body(4, { text: '라' }), T0 + 4000)).toMatchObject({
      event: { type: 'final', segmentId: 1, startMs: 2500, endMs: 4000 },
    });
  });

  it('이미 받은 seq, 빈 text, 모르는 type, transcript 없음은 버린다', () => {
    const c = new TranscriptConverter(T0);
    expect(c.accept(body(5, { type: 'final', text: '하나' }), T0)).toHaveProperty('event');
    expect(c.accept(body(5, { type: 'final', text: '하나' }), T0)).toHaveProperty('drop');
    expect(c.accept(body(4, { type: 'final', text: '예전' }), T0)).toHaveProperty('drop');
    expect(c.accept(body(6, { type: 'final', text: '  ', empty: true }), T0)).toHaveProperty('drop');
    expect(c.accept(body(7, { type: 'status', text: 'x' }), T0)).toHaveProperty('drop');
    expect(c.accept({ seq: 8 }, T0)).toHaveProperty('drop');
    // 버린 것은 번호를 쓰지 않는다
    expect(c.accept(body(9, { type: 'final', text: '둘' }), T0)).toMatchObject({ event: { segmentId: 1 } });
  });

  it('빈 final은 구간을 끝내 다음 구간이 새 시작 시각을 받는다', () => {
    const c = new TranscriptConverter(T0);
    c.accept(body(1, { type: 'partial', text: '어', t_start_ms: 500, t_end_ms: 900 }), T0);
    c.accept(body(2, { type: 'final', text: '', empty: true, t_start_ms: 500, t_end_ms: 1200 }), T0);
    expect(c.accept(body(3, { type: 'partial', text: '네', t_start_ms: 2000, t_end_ms: 2600 }), T0)).toMatchObject({
      event: { segmentId: 0, startMs: 2000 },
    });
  });

  it('되돌리면 다시 보낸 같은 seq를 같은 번호로 받는다', () => {
    const c = new TranscriptConverter(T0);
    const before = c.snapshot();
    expect(c.accept(body(1, { type: 'final', text: '저장 실패' }), T0)).toMatchObject({ event: { segmentId: 0 } });
    c.restore(before);
    expect(c.accept(body(1, { type: 'final', text: '저장 실패' }), T0)).toMatchObject({ event: { segmentId: 0 } });
  });
});
