// 히스토리 목록 화면 ('/history'). 끝난 녹음을 최근에 시작한 것부터 카드로 보이고, 누르면 상세로 간다.
// 시작 시각과 상태 이름은 내보내기 파일과 같은 함수로 쓴다(@app/shared).
// 모양은 확정안 F-3을 따른다(T40). 녹음이 진행 중이면 맨 아래에 끝난 뒤 목록에 나타난다고 알리고,
// 그 녹음이 끝나면 직전 목록을 둔 채 다시 불러와 새 녹음을 맨 위에 보인다.
import { formatStartedAt, type SessionSummary } from '@app/shared';
import { Link, useOutletContext } from 'react-router';
import { listSessions } from '../api/endpoints';
import { useApiData } from '../api/useApiData';
import { ChevronRightIcon } from '../components/icons';
import type { LayoutContext } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';

// 목록의 카드 한 장. 시작 시각, 문장 수, 중단됐으면 표시, 아래에 첫 문장을 한 줄로 자른다.
// 목록에는 끝난 세션만 오므로, 중단된 세션에만 상태를 붙인다.
function SessionCard({ session }: { session: SessionSummary }) {
  return (
    <li>
      <Link
        to={`/history/${session.id}`}
        className="flex items-center gap-3.5 rounded-[14px] border border-card-line bg-surface px-4 py-[15px] hover:border-line2 hover:bg-surface2/60 md:gap-[22px] md:px-[22px] md:py-[17px]"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-[15px] font-bold text-soft tabular-nums">
              {formatStartedAt(session.startedAt)}
            </span>
            <span className="text-[13px] text-muted">
              문장 {session.segmentCount.toLocaleString('ko-KR')}개
            </span>
            {session.status !== 'ended' && <StatusBadge status={session.status} small />}
          </span>
          <span className="mt-1 block truncate text-sm text-cap3">{session.preview}</span>
        </span>
        <ChevronRightIcon className="size-5 text-dim" />
      </Link>
    </li>
  );
}

export function HistoryListPage() {
  const { activeSession, historyRound } = useOutletContext<LayoutContext>();
  const sessions = useApiData((signal) => listSessions(signal), [historyRound], {
    keepPrevious: true,
  });

  return (
    <section className="flex flex-1 flex-col px-5 py-6 md:px-12 md:py-9">
      <div className="flex items-baseline gap-3.5">
        <h1 className="text-[26px] font-bold tracking-[-0.6px] md:text-[30px]">히스토리</h1>
        {sessions.status === 'success' && sessions.data.length > 0 && (
          <span className="text-sm text-muted">지난 녹음 {sessions.data.length}개</span>
        )}
      </div>

      <div className="mt-6">
        {sessions.status === 'loading' && <p className="text-sm text-muted">불러오는 중…</p>}
        {sessions.status === 'error' && (
          <p role="alert" className="text-sm text-rec-text">
            {sessions.error.message}
          </p>
        )}
        {sessions.status === 'success' && sessions.data.length === 0 && (
          <p className="text-sm text-muted">지난 녹음이 없습니다</p>
        )}
        {sessions.status === 'success' && sessions.data.length > 0 && (
          <ul className="flex flex-col gap-2.5">
            {sessions.data.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </ul>
        )}
      </div>

      {activeSession && (
        <p className="mt-auto pt-6 text-[13px] text-faint">
          {formatStartedAt(activeSession.startedAt)}에 시작한 녹음은 끝난 뒤 목록에 나타납니다.
        </p>
      )}
    </section>
  );
}
