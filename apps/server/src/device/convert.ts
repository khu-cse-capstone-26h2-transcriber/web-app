// 기기가 보낸 결과 한 건을 SttEvent로 바꾼다. 규칙은 docs/guides/T19.md '결과를 SttEvent로 바꾸는 규칙'.
// 세션마다 하나씩 만든다. 값은 믿지 않고 쓰기 전에 확인한다.
import type { SttEvent, SttEventType } from '@app/shared';

export type ConvertResult = { event: SttEvent } | { drop: string };

interface State {
  nextSegmentId: number;
  segmentStartMs: number | null;
  previousEndMs: number;
  lastSeq: number;
}

// 0 이상의 유한한 수면 반올림한 정수, 아니면 undefined.
function msValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.round(value) : undefined;
}

export class TranscriptConverter {
  // 세션 통지를 받은 서버 시각(ms). 엔진 시각이 없을 때 이 시각을 0으로 센다.
  private readonly startedAtMs: number;
  private state: State = { nextSegmentId: 0, segmentStartMs: null, previousEndMs: 0, lastSeq: 0 };

  constructor(startedAtMs: number) {
    this.startedAtMs = startedAtMs;
  }

  // 저장에 실패해 데몬이 다시 보낼 때를 위해 되돌릴 수 있게 한다.
  snapshot(): State {
    return { ...this.state };
  }

  restore(state: State): void {
    this.state = { ...state };
  }

  // body: 데몬이 보낸 본문 { seq, transcript: { type, text, t_start_ms, t_end_ms, ... } }
  accept(body: unknown, nowMs: number): ConvertResult {
    const { seq, transcript } = (body ?? {}) as { seq?: unknown; transcript?: unknown };
    if (typeof seq === 'number' && Number.isSafeInteger(seq)) {
      // 데몬은 2xx를 못 받으면 같은 seq로 다시 보낸다.
      if (seq <= this.state.lastSeq) return { drop: `이미 받은 seq ${seq}` };
      this.state.lastSeq = seq;
    }
    if (typeof transcript !== 'object' || transcript === null) return { drop: 'transcript가 없음' };
    const t = transcript as { type?: unknown; text?: unknown; t_start_ms?: unknown; t_end_ms?: unknown };

    // type이 없으면 final (데몬 문서의 규칙)
    const rawType = t.type ?? 'final';
    if (rawType !== 'partial' && rawType !== 'final') return { drop: `모르는 type ${String(rawType)}` };
    const type: SttEventType = rawType;

    const text = typeof t.text === 'string' ? t.text.trim() : '';
    if (text === '') {
      // 빈 final(엔진의 empty: true)은 그 구간이 끝났다는 뜻이다. 번호는 쓰지 않고 시작 시각만 비운다.
      if (type === 'final') this.state.segmentStartMs = null;
      return { drop: `빈 ${type}` };
    }

    const elapsed = Math.max(0, Math.round(nowMs - this.startedAtMs));
    // 구간 시작은 그 구간에서 처음 정한 값을 끝까지 쓴다.
    if (this.state.segmentStartMs === null) {
      this.state.segmentStartMs =
        msValue(t.t_start_ms) ?? (type === 'partial' ? elapsed : this.state.previousEndMs);
    }
    const startMs = this.state.segmentStartMs;
    const endMs = Math.max(startMs, msValue(t.t_end_ms) ?? elapsed);
    const event: SttEvent = { type, segmentId: this.state.nextSegmentId, text, startMs, endMs };

    if (type === 'final') {
      this.state.nextSegmentId += 1;
      this.state.segmentStartMs = null;
      this.state.previousEndMs = endMs;
    }
    return { event };
  }
}
