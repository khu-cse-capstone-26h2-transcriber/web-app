// 스트림 메시지를 자막 상태에 합치는 규칙의 테스트(T17). 같은 segmentId의 final은 덮어쓴다(T14, T15).
import type { SttEvent } from '@app/shared';
import { describe, expect, it } from 'vitest';
import { applyMessage, type TranscriptState } from './useSessionStream';

const EMPTY: TranscriptState = { finals: [], partial: null };

// 구간 n은 n초에 시작한다. 병합은 시각을 보지 않아 값은 아무래도 된다.
function event(type: SttEvent['type'], segmentId: number, text: string): SttEvent {
  return { type, segmentId, text, startMs: segmentId * 1_000, endMs: segmentId * 1_000 + 900 };
}

function partial(segmentId: number, text = `말하는 중 ${segmentId}`): SttEvent {
  return event('partial', segmentId, text);
}

function final(segmentId: number, text = `문장 ${segmentId}`): SttEvent {
  return event('final', segmentId, text);
}

// 메시지를 차례로 합친다.
function apply(state: TranscriptState, ...messages: SttEvent[]): TranscriptState {
  return messages.reduce(applyMessage, state);
}

function finalIds(state: TranscriptState): number[] {
  return state.finals.map((f) => f.segmentId);
}

describe('applyMessage', () => {
  it('빈 상태에 partial이 오면 말하는 중인 문장이 된다', () => {
    expect(apply(EMPTY, partial(0))).toEqual({ finals: [], partial: partial(0) });
  });

  it('같은 구간의 final이 오면 확정하고 partial을 비운다', () => {
    expect(apply(EMPTY, partial(0), final(0))).toEqual({ finals: [final(0)], partial: null });
  });

  it('같은 segmentId의 final이 다시 오면 덮어쓰고 줄이 늘지 않는다', () => {
    const state = apply(EMPTY, final(0), final(1), final(1, '고친 문장'));
    expect(state.finals).toEqual([final(0), final(1, '고친 문장')]);
  });

  it('순서가 바뀐 final은 segmentId 자리에 끼운다', () => {
    expect(finalIds(apply(EMPTY, final(0), final(2), final(1)))).toEqual([0, 1, 2]);
    expect(finalIds(apply(EMPTY, final(1), final(2), final(0)))).toEqual([0, 1, 2]);
  });

  it('이미 확정된 구간의 partial이 늦게 오면 무시한다', () => {
    const state = apply(EMPTY, final(0));
    expect(applyMessage(state, partial(0))).toBe(state);
  });

  it('앞 구간의 final이 다시 와도 뒤 구간의 partial은 남는다', () => {
    const state = apply(EMPTY, final(0), partial(1), final(0));
    expect(state.partial).toEqual(partial(1));
  });

  it('뒤 구간의 final이 오면 앞 구간의 partial을 비운다', () => {
    expect(apply(EMPTY, partial(0), final(1)).partial).toBeNull();
  });

  it('다시 연결해 final을 처음부터 다시 받아도 자막이 그대로다', () => {
    const before = apply(EMPTY, final(0), final(1), final(2), partial(3));
    expect(apply(before, final(0), final(1), final(2))).toEqual(before);
  });

  it('원래 상태는 바꾸지 않는다', () => {
    const state = apply(EMPTY, final(0), final(2), partial(3));
    const snapshot = structuredClone(state);
    applyMessage(state, final(1));
    applyMessage(state, final(2, '고친 문장'));
    expect(state).toEqual(snapshot);
  });
});
