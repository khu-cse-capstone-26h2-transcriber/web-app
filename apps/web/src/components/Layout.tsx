// 모든 화면이 공유하는 틀(T38). 넓은 화면(768px 이상)은 왼쪽에 사이드바를 늘 두고,
// 좁은 화면은 위쪽 막대(메뉴 버튼, 브랜드, 서버 상태)를 두고 같은 사이드바를 서랍으로 연다.
// 틀은 화면 높이를 채우고, 화면 영역(main)만 스크롤한다. 녹음 화면은 이 높이를 자막 영역으로 나눠 쓴다.
// 진행 중인 녹음도 틀이 갖고 있어, 어느 화면에서나 사이드바에 '녹음 중'을 보인다(T39).
import { APP_NAME, type Session } from '@app/shared';
import { type MouseEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useActiveSessionPolling } from '../api/useActiveSessionPolling';
import { useRecentSessions } from '../api/useRecentSessions';
import { useServerHealth } from '../api/useServerHealth';
import { BrandMark, MenuIcon } from './icons';
import { ServerStatus, Sidebar } from './Sidebar';

// 사이드바 '최근 녹음'에 보일 개수.
const RECENT_LIMIT = 5;

// 화면이 useOutletContext로 받는 값.
export interface LayoutContext {
  // 서버 상태를 바로 다시 확인한다. 녹음 화면은 실시간 연결이 다시 이어졌을 때 부른다.
  recheckServer: () => void;
  // 진행 중인 녹음. 없으면 null이다.
  activeSession: Session | null;
  // 녹음 화면이 지금 녹음 상태를 알린다. 녹음 화면에 있는 동안은 틀이 따로 확인하지 않고 이 값을 쓴다.
  reportActiveSession: (session: Session | null) => void;
  // 진행 중이던 녹음이 끝날 때마다 1씩 는다. 끝난 녹음 목록(히스토리 목록)을 다시 불러올 때 쓴다(T40).
  historyRound: number;
}

export function Layout() {
  // 서버와 DB 상태. 열 때와 30초마다, 실패한 동안에는 5초마다 다시 확인한다(T15, T25).
  // 녹음 중 실시간 연결이 끊긴 것은 녹음 화면 맨 위의 배너가 따로 알린다.
  const { health, recheck } = useServerHealth();

  // 진행 중인 녹음. 녹음 화면에서는 녹음 화면이 알려 주고(대기 중 2초 확인, 실시간 자막, 시작·종료),
  // 그 밖의 화면에서는 틀이 2초마다 확인한다. 어느 쪽이든 확인 요청은 하나다.
  const onRecordPage = useLocation().pathname === '/';
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  // 같은 녹음이면 직전 값을 그대로 둬, 확인할 때마다 화면을 다시 그리지 않게 한다.
  const reportActiveSession = useCallback((session: Session | null) => {
    setActiveSession((prev) => (prev?.id === session?.id ? prev : session));
  }, []);
  useActiveSessionPolling(!onRecordPage, reportActiveSession);

  // 최근 녹음은 처음 열 때와, 진행 중이던 녹음이 끝났을 때(번호가 바뀌거나 없어질 때) 다시 불러온다.
  // 목록에는 끝난 녹음만 들어오므로 이때만 바뀐다. 히스토리 목록 화면도 같은 번호를 쓴다.
  const activeId = activeSession?.id ?? null;
  const [historyRound, setHistoryRound] = useState(0);
  const prevActiveIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (prevActiveIdRef.current !== null && prevActiveIdRef.current !== activeId) {
      setHistoryRound((n) => n + 1);
    }
    prevActiveIdRef.current = activeId;
  }, [activeId]);
  const recent = useRecentSessions(RECENT_LIMIT, historyRound);

  const context: LayoutContext = {
    recheckServer: recheck,
    activeSession,
    reportActiveSession,
    historyRound,
  };

  // 좁은 화면의 서랍. 닫으면 키보드 초점을 메뉴 버튼으로 돌려준다.
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  // 서랍이 열려 있으면 Esc로 닫는다.
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen, closeMenu]);

  // 서랍 안의 링크를 누르면 닫는다. 지금 화면의 링크를 눌러 주소가 그대로여도 닫히게 클릭으로 본다.
  function handleDrawerClick(event: MouseEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest('a')) closeMenu();
  }

  return (
    <div className="flex h-dvh">
      <aside className="hidden w-[248px] flex-none border-r border-line md:block">
        <Sidebar health={health} recent={recent} activeSession={activeSession} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 flex-none items-center gap-3 border-b border-line px-4 md:hidden">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="메뉴 열기"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            className="-ml-1 rounded-md p-1 text-text3"
          >
            <MenuIcon className="size-[22px]" />
          </button>
          <span className="flex min-w-0 items-center gap-2.5 text-sm font-bold tracking-[-0.2px]">
            <BrandMark small />
            {APP_NAME}
          </span>
          <ServerStatus health={health} className="ml-auto text-xs" />
        </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <Outlet context={context} />
        </main>
      </div>

      {menuOpen && (
        <div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="메뉴"
          className="fixed inset-0 z-40 md:hidden"
        >
          <button
            type="button"
            tabIndex={-1}
            aria-label="메뉴 닫기"
            onClick={closeMenu}
            className="absolute inset-0 bg-overlay/72"
          />
          <aside className="absolute inset-y-0 left-0 w-[296px] max-w-[85vw]" onClick={handleDrawerClick}>
            <Sidebar
              health={health}
              recent={recent}
              activeSession={activeSession}
              onClose={closeMenu}
            />
          </aside>
        </div>
      )}
    </div>
  );
}
