// 진행 중인 세션의 스트림(SSE)을 구독해 자막 상태로 쓰는 훅. 메시지 형식은 @app/shared의 SessionStreamMessage다.
// 접속하면 서버가 지금까지의 final을 먼저 보낸다(T09). 같은 segmentId가 다시 오면 덮어쓴다.
//
// 끊김 처리(T15): 다시 연결은 EventSource 기본 동작에 맡기지 않고 이 훅이 직접 한다.
// EventSource는 200이 아닌 응답(끝난 세션의 409, 개발 중 서버가 꺼졌을 때 프록시의 502)을 받으면 멈추고,
// 그 응답 코드도 알려 주지 않는다. 그래서 끊기면 스트림을 닫고, 잠시 뒤 진행 중인 세션을 물어본 다음
// 같은 세션이 아직 녹음 중일 때만 새로 연다. 새 EventSource는 Last-Event-ID를 보내지 않아 final을 처음부터
// 다시 받지만, 같은 segmentId는 덮어쓰므로 줄이 늘지 않는다.
import { STREAM_HEARTBEAT_MS, type SessionStreamMessage, type SttEvent } from '@app/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getActiveSession } from './endpoints';

// 이만큼(ms) 아무 메시지도 없으면 끊긴 것으로 본다. 서버는 heartbeat를 15초마다 보낸다.
const SILENCE_TIMEOUT_MS = STREAM_HEARTBEAT_MS * 2;
// 진행 중인 세션을 물어볼 때 이만큼(ms) 답이 없으면 실패로 본다. 서버가 멈춰 답하지 않을 때 기다리지 않도록.
const CHECK_TIMEOUT_MS = 5_000;

// n번째 시도 전에 기다리는 시간(ms). 1, 2, 4, 8초, 그 뒤로는 10초.
function retryDelayMs(attempt: number): number {
  return Math.min(1000 * 2 ** (attempt - 1), 10_000);
}

export interface TranscriptState {
  // 확정된 문장. segmentId 순서다.
  finals: SttEvent[];
  // 지금 말하는 중인 문장. 같은 segmentId의 final이 오면 비운다.
  partial: SttEvent | null;
}

export type StreamConnection =
  // 처음 접속하는 중
  | { status: 'connecting' }
  // 연결됨. 끊겼다가 다시 연결된 것이면 reconnected가 true다.
  | { status: 'open'; reconnected: boolean }
  // 끊겨서 다시 연결하는 중. attempt는 이번 끊김에서 몇 번째 시도인지다.
  | { status: 'reconnecting'; attempt: number };

export interface SessionStream {
  transcript: TranscriptState;
  connection: StreamConnection;
  // 다음 시도를 기다리는 중이면 바로 시도한다. 시도하는 중이거나 연결돼 있으면 아무것도 하지 않는다.
  reconnectNow: () => void;
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

// sessionId가 null이면 구독하지 않는다.
// 세션이 끝나면(ended를 받았거나, 끊긴 사이에 끝났으면) 스트림을 닫고 onEnded(sessionId)를 부른다.
export function useSessionStream(
  sessionId: number | null,
  onEnded: (sessionId: number) => void,
): SessionStream {
  const [transcript, setTranscript] = useState<TranscriptState>(EMPTY);
  const [connection, setConnection] = useState<StreamConnection>({ status: 'connecting' });
  // onEnded가 바뀌어도 다시 접속하지 않도록 최신 함수만 ref에 둔다.
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  // 지금 구독에서 다음 시도를 앞당기는 함수. 구독이 없으면 null이다.
  const reconnectNowRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setTranscript(EMPTY);
    setConnection({ status: 'connecting' });
    if (sessionId === null) return;
    const id = sessionId;

    let source: EventSource | null = null;
    // 무소식 타이머 또는 다음 시도 타이머. 둘이 함께 돌지는 않는다.
    let timer: ReturnType<typeof setTimeout> | undefined;
    // 진행 중인 세션을 물어보는 요청. 멈출 때 취소한다.
    let check: AbortController | null = null;
    // 이번 끊김에서 몇 번째 시도인지. 연결되면 0이다.
    let attempt = 0;

    // 스트림, 타이머, 요청을 모두 멈춘다.
    function halt() {
      source?.close();
      source = null;
      clearTimeout(timer);
      check?.abort();
      check = null;
    }

    // 세션이 끝났다. 더 다시 연결하지 않는다.
    function finish() {
      halt();
      reconnectNowRef.current = null;
      onEndedRef.current(id);
    }

    // 무소식 타이머를 다시 건다. 스트림을 열 때와 무언가 받을 때마다 부른다.
    function watchSilence() {
      clearTimeout(timer);
      timer = setTimeout(disconnect, SILENCE_TIMEOUT_MS);
    }

    function open() {
      const next = new EventSource(`/api/sessions/${id}/events`);
      source = next;
      watchSilence();
      next.onopen = () => {
        setConnection({ status: 'open', reconnected: attempt > 0 });
        attempt = 0;
        watchSilence();
      };
      next.onmessage = (event: MessageEvent<string>) => {
        watchSilence();
        const message = JSON.parse(event.data) as SessionStreamMessage;
        if (message.type === 'heartbeat') return;
        if (message.type === 'ended') {
          // 서버가 곧 스트림을 닫는다. 그 전에 닫아야 끊긴 것으로 보지 않는다.
          finish();
          return;
        }
        setTranscript((prev) => applyMessage(prev, message));
      };
      // 끊겼거나 접속하지 못했다. EventSource가 스스로 다시 접속하지 않게 닫고 직접 다시 연결한다.
      next.onerror = disconnect;
    }

    // 스트림을 닫고 다음 시도를 예약한다. 시도가 실패했을 때도 부른다.
    function disconnect() {
      halt();
      attempt += 1;
      setConnection({ status: 'reconnecting', attempt });
      timer = setTimeout(retry, retryDelayMs(attempt));
    }

    // 진행 중인 세션을 물어보고, 같은 세션이 아직 녹음 중이면 스트림을 새로 연다.
    function retry() {
      clearTimeout(timer);
      const controller = new AbortController();
      check = controller;
      const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
      getActiveSession(controller.signal)
        .then(
          (active) => {
            // halt()로 취소된 요청이다.
            if (check !== controller) return;
            check = null;
            if (active?.id === id) open();
            else finish();
          },
          () => {
            // 서버에 닿지 못했거나 답이 늦었다. 취소된 요청이면 아무것도 하지 않는다.
            if (check !== controller) return;
            check = null;
            disconnect();
          },
        )
        .finally(() => clearTimeout(timeout));
    }

    reconnectNowRef.current = () => {
      // 다음 시도를 기다리는 중일 때만 앞당긴다.
      if (attempt > 0 && source === null && check === null) retry();
    };
    open();

    return () => {
      halt();
      reconnectNowRef.current = null;
    };
  }, [sessionId]);

  const reconnectNow = useCallback(() => reconnectNowRef.current?.(), []);

  return { transcript, connection, reconnectNow };
}
