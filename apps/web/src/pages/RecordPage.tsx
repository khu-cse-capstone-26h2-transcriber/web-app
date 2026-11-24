// 녹음 화면 ('/'). 진행 중인 녹음의 상태를 보여 주고, 웹에서도 녹음을 시작·종료할 수 있게 한다.
// 녹음의 주 제어는 기기의 물리 버튼이고, 이 화면의 버튼은 개발·시연·원격 종료용 보조 수단이다.
// 녹음하지 않는 동안 2초마다 진행 중인 녹음을 확인해, 기기 버튼으로 시작한 녹음도 새로고침 없이 보인다(T20).
// 녹음 중에는 위쪽 상태 줄 아래에 실시간 자막(T14)을 보인다. 어디서 끝냈든 녹음이 끝나면 히스토리 상세로 간다.
// 자막 스트림이 끊기면 맨 위에 배너를 띄우고 다시 연결한다(T15). 끊긴 사이에 끝났어도 히스토리 상세로 간다.
// 다만 끊긴 사이에 다른 녹음이 시작됐으면(기기 세션이 웹 버튼 녹음을 중단시킴 등) 그 녹음을 이어 보인다(T20).
// '녹음 종료'를 누른 뒤에는 늘 히스토리 상세로 간다.
// 이 화면에 있는 동안은 지금 녹음 상태를 틀(Layout)에 알려, 사이드바가 따로 확인하지 않고 이 값을 쓴다(T39).
// 모양은 확정안 F-1(녹음 중), F-2(대기), F-5(좁은 화면)를 따른다(T39).
import { type Session, formatStartedAt } from '@app/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router';
import { type ApiError, toApiError } from '../api/client';
import { getActiveSession, startSession, stopSession } from '../api/endpoints';
import { useSessionStream } from '../api/useSessionStream';
import { ConnectionBanner } from '../components/ConnectionBanner';
import { ElapsedTime } from '../components/ElapsedTime';
import { MicIcon, StopIcon } from '../components/icons';
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

// 버튼 아래(녹음 중에는 상태 줄 아래) 알림 문구. info는 안내(노랑), error는 실패(빨강)다.
interface Notice {
  tone: 'info' | 'error';
  text: string;
}

// 작은 테두리 버튼(녹음 시작·종료, 다시 확인). 웹 버튼은 보조라 작게 둔다. display는 쓰는 곳에서 정한다.
const BUTTON_BASE =
  'items-center justify-center gap-2 rounded-[10px] border border-line2 font-medium text-text3 hover:bg-surface disabled:border-off-line disabled:text-dim disabled:hover:bg-transparent';
const SMALL_BUTTON = `${BUTTON_BASE} px-[15px] py-[9px] text-sm`;
// 확인 실패 때의 '다시 확인'. 조금 더 작다(확정안 F-7).
const RETRY_BUTTON = `${BUTTON_BASE} px-3 py-1.5 text-[13px]`;

function NoticeText({ notice }: { notice: Notice }) {
  return notice.tone === 'error' ? (
    <p role="alert" className="text-sm text-rec-text">
      {notice.text}
    </p>
  ) : (
    <p role="status" className="text-sm text-warn-text">
      {notice.text}
    </p>
  );
}

export function RecordPage() {
  const navigate = useNavigate();
  const { recheckServer, reportActiveSession } = useOutletContext<LayoutContext>();
  const [phase, setPhase] = useState<Phase>({ kind: 'checking' });
  // 시작·종료가 실패했거나 예상과 다른 상태를 만났을 때 보여 줄 문구.
  const [notice, setNotice] = useState<Notice | null>(null);

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

  // 지금 아는 녹음 상태를 틀에 알린다. 확인 중·시작 중처럼 모르는 동안에는 알리지 않아 직전 값이 남는다.
  const knownSession =
    phase.kind === 'recording' || phase.kind === 'stopping'
      ? phase.session
      : phase.kind === 'idle'
        ? null
        : undefined;
  useEffect(() => {
    if (knownSession !== undefined) reportActiveSession(knownSession);
  }, [knownSession, reportActiveSession]);

  // 스트림이 녹음이 끝났다고 알릴 때 부른다. useSessionStream이 최신 함수를 쓰므로 지금 phase를 읽을 수 있다.
  function handleEnded(sessionId: number, next: Session | null) {
    if (next && phase.kind !== 'stopping') {
      // 끊긴 사이에 이 녹음이 끝나고 다른 녹음이 시작됐다. 히스토리로 가지 않고 그 녹음을 보인다.
      // 웹은 왜 끝났는지 모르므로(기기 세션 시작, 서버 재시작 뒤 기기 세션 등) 이유는 쓰지 않는다.
      setNotice({
        tone: 'info',
        text: `녹음이 끝나, 진행 중인 녹음(${formatStartedAt(next.startedAt)} 시작)을 보여 줍니다`,
      });
      setPhase({ kind: 'recording', session: next });
      return;
    }
    goToHistory(sessionId);
  }

  const streamSessionId =
    phase.kind === 'recording' || phase.kind === 'stopping' ? phase.session.id : null;
  const stream = useSessionStream(streamSessionId, handleEnded);

  // 실시간 연결이 다시 이어지면 서버 상태도 바로 다시 확인한다.
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
        setNotice({ tone: 'info', text: '이미 진행 중인 녹음이 있어 그 녹음을 보여 줍니다' });
        await checkActive();
        return;
      }
      setNotice({ tone: 'error', text: `녹음을 시작하지 못했습니다: ${apiError.message}` });
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
        setNotice({ tone: 'info', text: `이미 끝난 녹음입니다 (${formatStartedAt(session.startedAt)} 시작)` });
        await checkActive();
        return;
      }
      // 서버는 종료에 실패하면 세션을 녹음 중으로 남긴다. 다시 누르면 종료를 다시 요청한다.
      setNotice({
        tone: 'error',
        text: `녹음을 종료하지 못했습니다: ${apiError.message}. 잠시 뒤 다시 종료해 주세요`,
      });
      setPhase({ kind: 'recording', session });
    }
  }

  const live = phase.kind === 'recording' || phase.kind === 'stopping' ? phase : null;

  // '녹음 종료' 버튼. 넓은 화면은 상태 줄 오른쪽, 좁은 화면은 맨 아래 넓은 버튼이다.
  function stopButton(session: Session, className: string) {
    const stopping = phase.kind === 'stopping';
    return (
      <button
        type="button"
        disabled={stopping}
        onClick={() => void handleStop(session)}
        className={`${SMALL_BUTTON} ${className}`}
      >
        {stopping ? (
          '종료하는 중…'
        ) : (
          <>
            <StopIcon className="size-[13px]" />
            녹음 종료
          </>
        )}
      </button>
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <h1 className="sr-only">녹음</h1>
      {streamSessionId !== null && (
        <ConnectionBanner connection={stream.connection} onReconnectNow={stream.reconnectNow} />
      )}

      {live ? (
        <>
          <div className="flex flex-none items-center gap-3 px-5 pt-5 md:gap-[18px] md:px-12 md:pt-8">
            <span
              role="status"
              className="flex flex-none items-center gap-2 rounded-full bg-rec/14 py-[7px] pr-3.5 pl-3 text-[13px] font-bold text-rec-text md:text-sm"
            >
              <span className="size-2 rounded-full bg-rec ring-3 ring-rec/25 md:size-2.5" />
              녹음 중
            </span>
            <span className="text-[32px] leading-tight font-bold tracking-[-1.5px] tabular-nums md:text-[44px]">
              <ElapsedTime startedAt={live.session.startedAt} />
            </span>
            <span className="ml-auto text-sm text-muted tabular-nums md:ml-0">
              {formatStartedAt(live.session.startedAt)} 시작
            </span>
            {stopButton(live.session, 'hidden flex-none md:ml-auto md:flex')}
          </div>
          {notice && (
            <div className="flex-none px-5 pt-3 md:px-12">
              <NoticeText notice={notice} />
            </div>
          )}
          <Transcript {...stream.transcript} />
          <div className="flex-none px-5 pb-7 md:hidden">{stopButton(live.session, 'flex w-full')}</div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-[18px] px-5 pt-6 pb-6 text-center">
          {phase.kind === 'checking' && (
            <p role="status" className="text-sm text-muted">
              녹음 상태를 확인하는 중…
            </p>
          )}

          {phase.kind === 'check-failed' && (
            <>
              <p role="alert" className="text-sm text-rec-text">
                녹음 상태를 확인하지 못했습니다: {phase.error.message}
              </p>
              <button
                type="button"
                onClick={() => void checkActive()}
                className={`${RETRY_BUTTON} inline-flex`}
              >
                다시 확인
              </button>
            </>
          )}

          {(phase.kind === 'idle' || phase.kind === 'starting') && (
            <>
              <div className="flex size-32 items-center justify-center rounded-full border-2 border-dashed border-line2 text-faint">
                <MicIcon className="size-[42px]" strokeWidth={1.6} />
              </div>
              <p role="status" className="mt-2 text-[28px] font-bold tracking-[-0.6px]">
                녹음하고 있지 않습니다
              </p>
              <p className="text-base leading-[1.7] text-muted">
                기기의 버튼을 누르면 녹음이 시작되고,
                <br />
                자막이 이 화면에 바로 나타납니다.
              </p>
              <button
                type="button"
                disabled={phase.kind === 'starting'}
                onClick={() => void handleStart()}
                className={`${SMALL_BUTTON} mt-1.5 flex`}
              >
                {phase.kind === 'starting' ? (
                  '시작하는 중…'
                ) : (
                  <>
                    <span className="size-[9px] rounded-full bg-rec" />
                    녹음 시작
                  </>
                )}
              </button>
            </>
          )}

          {notice && <NoticeText notice={notice} />}
        </div>
      )}

      <footer className="hidden h-[50px] flex-none items-center gap-2 border-t border-line px-12 text-[13px] text-faint md:flex">
        <span>녹음은 기기의 버튼으로 시작·종료합니다. 이 화면의 버튼은 보조용입니다.</span>
        {live && (
          <span className="ml-auto tabular-nums">
            문장 {stream.transcript.finals.length.toLocaleString('ko-KR')}개
          </span>
        )}
      </footer>
    </section>
  );
}
