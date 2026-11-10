// 녹음 화면 ('/'). 진행 중인 녹음의 상태를 보여 주고, 웹에서도 녹음을 시작·종료할 수 있게 한다.
// 녹음의 주 제어는 기기의 물리 버튼이고, 이 화면의 버튼은 개발·시연·원격 종료용 보조 수단이다.
// 화면을 연 뒤 물리 버튼으로 시작한 녹음은 새로고침해야 보인다. 알아채는 방법은 D4 협의 뒤에 정한다.
// 녹음 중에는 버튼 아래에 실시간 자막(T14)을 보인다. 어디서 끝냈든 녹음이 끝나면 히스토리 상세로 간다.
// 자막 스트림이 끊기면 맨 위에 배너를 띄우고 다시 연결한다(T15). 끊긴 사이에 끝났어도 히스토리 상세로 간다.
import type { Session } from '@app/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router';
import { type ApiError, toApiError } from '../api/client';
import { getActiveSession, startSession, stopSession } from '../api/endpoints';
import { useSessionStream } from '../api/useSessionStream';
import { ConnectionBanner } from '../components/ConnectionBanner';
import type { LayoutContext } from '../components/Layout';
import { Transcript } from '../components/Transcript';

// 화면의 상태. starting과 stopping은 요청을 보내고 답을 기다리는 동안이다.
type Phase =
  | { kind: 'checking' }
  | { kind: 'check-failed'; error: ApiError }
  | { kind: 'idle' }
  | { kind: 'starting' }
  | { kind: 'recording'; session: Session }
  | { kind: 'stopping'; session: Session };

// 밀리초를 mm:ss로, 한 시간이 넘으면 h:mm:ss로 바꾼다.
function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const seconds = String(total % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${minutes}:${seconds}` : `${minutes}:${seconds}`;
}

// 녹음을 시작한 뒤 흐른 시간. 1초마다 다시 그린다.
// 시작 시각은 서버 시계, 지금 시각은 브라우저 시계라 두 시계가 다르면 어긋난다. 음수는 0으로 보인다.
function ElapsedTime({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <>{formatElapsed(now - Date.parse(startedAt))}</>;
}

export function RecordPage() {
  const navigate = useNavigate();
  const { recheckServer } = useOutletContext<LayoutContext>();
  const [phase, setPhase] = useState<Phase>({ kind: 'checking' });
  // 시작·종료가 실패했거나 예상과 다른 상태를 만났을 때 버튼 아래에 보여 줄 문구.
  const [notice, setNotice] = useState<string | null>(null);

  // 웹 버튼으로 끝내면 종료 응답과 스트림의 ended가 둘 다 온다. 먼저 온 쪽에서 한 번만 이동한다.
  const leftRef = useRef(false);
  const goToHistory = useCallback(
    (sessionId: number) => {
      if (leftRef.current) return;
      leftRef.current = true;
      navigate(`/history/${sessionId}`);
    },
    [navigate],
  );

  const streamSessionId =
    phase.kind === 'recording' || phase.kind === 'stopping' ? phase.session.id : null;
  const stream = useSessionStream(streamSessionId, goToHistory);

  // 실시간 연결이 다시 이어지면 위쪽 서버 상태도 바로 다시 확인한다.
  const reconnected = stream.connection.status === 'open' && stream.connection.reconnected;
  useEffect(() => {
    if (reconnected) recheckServer();
  }, [reconnected, recheckServer]);

  // 서버에 진행 중인 녹음이 있는지 확인한다. 화면을 열 때와, 시작·종료가 409로 실패했을 때 부른다.
  const checkActive = useCallback(async (signal?: AbortSignal) => {
    setPhase({ kind: 'checking' });
    try {
      const session = await getActiveSession(signal);
      setPhase(session ? { kind: 'recording', session } : { kind: 'idle' });
    } catch (error) {
      if (signal?.aborted) return;
      setPhase({ kind: 'check-failed', error: toApiError(error) });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void checkActive(controller.signal);
    return () => controller.abort();
  }, [checkActive]);

  // 녹음하고 있지 않은 동안 2초마다 서버에 진행 중인 녹음이 있는지 본다.
  // 기기(물리 버튼, audiostackd)가 시작한 녹음은 서버가 웹에 알려 주지 않으므로 이렇게 알아챈다 (T20).
  const idle = phase.kind === 'idle';
  useEffect(() => {
    if (!idle) return;
    const controller = new AbortController();
    const timer = setInterval(() => {
      void getActiveSession(controller.signal)
        .then((session) => {
          if (session && !controller.signal.aborted) setPhase({ kind: 'recording', session });
        })
        .catch(() => {});
    }, 2000);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [idle]);

  async function handleStart() {
    setNotice(null);
    setPhase({ kind: 'starting' });
    try {
      setPhase({ kind: 'recording', session: await startSession() });
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.code === 'SESSION_ALREADY_ACTIVE') {
        // 다른 탭이나 기기 버튼으로 이미 시작한 녹음이 있다. 그 녹음을 보여 준다.
        setNotice('이미 진행 중인 녹음이 있어 그 녹음을 보여 줍니다');
        await checkActive();
        return;
      }
      setNotice(`녹음을 시작하지 못했습니다: ${apiError.message}`);
      setPhase({ kind: 'idle' });
    }
  }

  async function handleStop(session: Session) {
    setNotice(null);
    setPhase({ kind: 'stopping', session });
    try {
      // 종료하면 저장된 문장을 볼 수 있는 히스토리 상세로 간다.
      goToHistory((await stopSession(session.id)).id);
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.code === 'SESSION_NOT_ACTIVE' || apiError.code === 'SESSION_NOT_FOUND') {
        // 다른 탭이나 기기 버튼으로 이미 끝난 녹음이다. 지금 상태를 다시 확인한다.
        setNotice(`이미 끝난 녹음입니다 (#${session.id})`);
        await checkActive();
        return;
      }
      // 서버는 종료에 실패하면 세션을 녹음 중으로 남긴다. 다시 누르면 종료를 다시 요청한다.
      setNotice(`녹음을 종료하지 못했습니다: ${apiError.message}. 잠시 뒤 다시 종료해 주세요`);
      setPhase({ kind: 'recording', session });
    }
  }

  return (
    <section>
      {streamSessionId !== null && (
        <ConnectionBanner connection={stream.connection} onReconnectNow={stream.reconnectNow} />
      )}
      <h1>녹음</h1>

      {phase.kind === 'checking' && <p>녹음 상태를 확인하는 중…</p>}

      {phase.kind === 'check-failed' && (
        <>
          <p role="alert">녹음 상태를 확인하지 못했습니다: {phase.error.message}</p>
          <button type="button" onClick={() => void checkActive()}>
            다시 확인
          </button>
        </>
      )}

      {(phase.kind === 'idle' || phase.kind === 'starting') && (
        <>
          <p role="status">{phase.kind === 'starting' ? '시작하는 중…' : '녹음하고 있지 않습니다'}</p>
          <button
            type="button"
            disabled={phase.kind === 'starting'}
            onClick={() => void handleStart()}
          >
            녹음 시작
          </button>
        </>
      )}

      {(phase.kind === 'recording' || phase.kind === 'stopping') && (
        <>
          <p role="status">
            {phase.kind === 'stopping' ? '종료하는 중…' : '녹음 중'} ·{' '}
            <ElapsedTime startedAt={phase.session.startedAt} /> (#{phase.session.id})
          </p>
          <button
            type="button"
            disabled={phase.kind === 'stopping'}
            onClick={() => void handleStop(phase.session)}
          >
            녹음 종료
          </button>
        </>
      )}

      {notice && <p role="alert">{notice}</p>}

      {streamSessionId !== null && <Transcript {...stream.transcript} />}

      <p>
        <small>
          녹음은 기기의 버튼으로 시작·종료합니다. 이 화면의 버튼은 보조용입니다. 기기 버튼으로 시작한
          녹음이 보이지 않으면 새로고침해 주세요.
        </small>
      </p>
    </section>
  );
}
