// 진행 중인 세션의 스트림(SSE)을 구독해 자막 상태로 쓰는 훅. 메시지 형식은 @app/shared의 SessionStreamMessage다.
// 접속하면 서버가 지금까지의 final을 먼저 보낸다(T09). 같은 segmentId가 다시 오면 덮어쓴다.
// 끊겼을 때의 재연결은 EventSource 기본 동작에 맡긴다. 배너와 끊김 감지는 T15에서 만든다.
import type { Session, SessionStreamMessage, SttEvent } from '@app/shared';
import { useEffect, useRef, useState } from 'react';

export interface TranscriptState {
  // 확정된 문장. segmentId 순서다.
  finals: SttEvent[];
  // 지금 말하는 중인 문장. 같은 segmentId의 final이 오면 비운다.
  partial: SttEvent | null;
}

const EMPTY: TranscriptState = { finals: [], partial: null };

// final을 segmentId 자리에 넣는다. 이미 있으면 덮어쓰고, 없으면 순서를 지켜 끼운다.
function upsertFinal(finals: SttEvent[], event: SttEvent): SttEvent[] {
  const index = finals.findIndex((f) => f.segmentId >= event.segmentId);
  if (index === -1) return [...finals, event];
  const next = [...finals];
  next.splice(index, finals[index].segmentId === event.segmentId ? 1 : 0, event);
  return next;
}

function applyMessage(state: TranscriptState, message: SttEvent): TranscriptState {
  if (message.type === 'partial') {
    // 이미 확정된 세그먼트의 partial이 늦게 오면 무시한다.
    if (state.finals.some((f) => f.segmentId === message.segmentId)) return state;
    return { ...state, partial: message };
  }
  const partial =
    state.partial && state.partial.segmentId <= message.segmentId ? null : state.partial;
  return { finals: upsertFinal(state.finals, message), partial };
}

// sessionId가 null이면 구독하지 않는다. 세션이 끝나면(ended) onEnded를 부르고 스트림을 닫는다.
export function useSessionStream(
  sessionId: number | null,
  onEnded: (session: Session) => void,
): TranscriptState {
  const [state, setState] = useState<TranscriptState>(EMPTY);
  // onEnded가 바뀌어도 다시 접속하지 않도록 최신 함수만 ref에 둔다.
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  useEffect(() => {
    setState(EMPTY);
    if (sessionId === null) return;

    const source = new EventSource(`/api/sessions/${sessionId}/events`);
    source.onmessage = (event: MessageEvent<string>) => {
      const message = JSON.parse(event.data) as SessionStreamMessage;
      if (message.type === 'heartbeat') return;
      if (message.type === 'ended') {
        // 서버가 곧 스트림을 닫는다. 그 전에 닫아야 EventSource가 다시 접속하지 않는다.
        source.close();
        onEndedRef.current(message.session);
        return;
      }
      setState((prev) => applyMessage(prev, message));
    };
    return () => source.close();
  }, [sessionId]);

  return state;
}
