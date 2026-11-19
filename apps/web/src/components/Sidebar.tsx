// 사이드바 내용(T38). 브랜드, 녹음·히스토리 메뉴, 최근 녹음, 아래쪽 서버 상태를 차례로 그린다.
// 넓은 화면에서는 왼쪽에 늘 두고, 좁은 화면에서는 같은 내용을 서랍으로 연다(Layout.tsx).
import { APP_NAME, formatStartedAt, type Session, type SessionSummary } from '@app/shared';
import { NavLink } from 'react-router';
import type { Health } from '../api/endpoints';
import type { ApiState } from '../api/useApiData';
import { ElapsedTime } from './ElapsedTime';
import { BrandMark, CloseIcon, HistoryIcon, MicIcon } from './icons';
import { StatusBadge } from './StatusBadge';

// 메뉴 항목. 지금 화면이면 밝은 배경을 깐다.
function menuClass({ isActive }: { isActive: boolean }): string {
  return `flex items-center gap-2.5 rounded-[9px] px-2.5 py-[9px] text-sm font-medium ${
    isActive ? 'bg-surface2 text-text' : 'text-muted hover:bg-surface hover:text-text3'
  }`;
}

// 서버와 DB 상태를 점과 글로 보인다. 정상은 초록, 확인 중은 노랑, 실패는 빨강이다.
export function ServerStatus({ health, className }: { health: ApiState<Health>; className?: string }) {
  if (health.status === 'error') {
    return (
      <span role="alert" className={`flex min-w-0 items-center gap-2 text-rec-text ${className ?? ''}`}>
        <span className="size-2 flex-none rounded-full bg-rec" />
        <span className="truncate">서버: {health.error.message}</span>
      </span>
    );
  }
  const ok = health.status === 'success';
  return (
    <span className={`flex min-w-0 items-center gap-2 text-muted ${className ?? ''}`}>
      <span className={`size-2 flex-none rounded-full ${ok ? 'bg-ok' : 'bg-warn'}`} />
      <span className="truncate">{ok ? '서버 정상' : '서버 확인 중'}</span>
    </span>
  );
}

// 최근 녹음 한 줄. 번호와 시작 시각, 중단된 녹음이면 표시, 아래에 첫 문장을 한 줄로 자른다.
function RecentItem({ session }: { session: SessionSummary }) {
  return (
    <NavLink
      to={`/history/${session.id}`}
      className={({ isActive }) =>
        `block rounded-lg px-2.5 py-[9px] ${isActive ? 'bg-surface' : 'hover:bg-surface/60'}`
      }
    >
      <span className="flex items-center gap-1.5 text-xs text-muted tabular-nums">
        <b className="font-bold text-text3">#{session.id}</b>
        {formatStartedAt(session.startedAt)}
        {session.status === 'interrupted' && <StatusBadge status={session.status} small />}
      </span>
      <span className="mt-[3px] block truncate text-[13px] text-text3">{session.preview}</span>
    </NavLink>
  );
}

interface SidebarProps {
  health: ApiState<Health>;
  // 최근 녹음. 처음 불러오기 전이거나 없으면 이 절을 숨긴다.
  recent: SessionSummary[] | null;
  // 진행 중인 녹음. 있으면 첫 메뉴를 '녹음 중'과 흐른 시간으로 바꾼다(T39).
  activeSession: Session | null;
  // 서랍으로 열었을 때만 준다. 브랜드 옆에 닫기 버튼을 둔다.
  onClose?: () => void;
}

export function Sidebar({ health, recent, activeSession, onClose }: SidebarProps) {
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-side px-3.5 pt-5 pb-[18px]">
      <div className="flex items-center">
        <span className="flex items-center gap-2.5 px-2 text-[15px] font-bold tracking-[-0.2px]">
          <BrandMark />
          {APP_NAME}
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="메뉴 닫기"
            // 서랍이 열리면 키보드 초점을 닫기 버튼에 둔다.
            autoFocus
            className="mr-0.5 ml-auto rounded-md p-1 text-muted hover:text-text"
          >
            <CloseIcon className="size-[22px]" />
          </button>
        )}
      </div>

      <nav className="mt-[22px] flex flex-col gap-0.5">
        <NavLink to="/" end className={menuClass}>
          {activeSession ? (
            <>
              <span className="mx-[3px] size-[9px] flex-none rounded-full bg-rec ring-3 ring-rec/25" />
              녹음 중
              <span className="ml-auto text-[13px] font-bold text-rec-text tabular-nums">
                <ElapsedTime startedAt={activeSession.startedAt} />
              </span>
            </>
          ) : (
            <>
              <MicIcon className="size-4" />
              녹음
            </>
          )}
        </NavLink>
        <NavLink to="/history" className={menuClass}>
          <HistoryIcon className="size-4" />
          히스토리
        </NavLink>
      </nav>

      {recent && recent.length > 0 && (
        <section aria-label="최근 녹음">
          <h2 className="mt-6 mb-1.5 px-2.5 text-[11px] font-bold tracking-[0.6px] text-faint">최근 녹음</h2>
          {recent.map((session) => (
            <RecentItem key={session.id} session={session} />
          ))}
        </section>
      )}

      <div className="mt-auto flex border-t border-line px-2.5 pt-2.5 text-xs">
        <ServerStatus health={health} />
      </div>
    </div>
  );
}
