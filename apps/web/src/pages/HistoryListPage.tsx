// 히스토리 목록 화면 ('/history'). 끝난 녹음을 최근에 시작한 것부터 보이고, 누르면 상세로 간다.
// 시작 시각과 상태 이름은 내보내기 파일과 같은 함수로 쓴다(@app/shared).
import { SESSION_STATUS_LABELS, formatStartedAt, type SessionSummary } from '@app/shared';
import { Link } from 'react-router';
import { listSessions } from '../api/endpoints';
import { useApiData } from '../api/useApiData';

// 목록의 한 항목. 첫 줄에 번호, 시작 시각, 문장 수를, 둘째 줄에 첫 문장을 한 줄로 잘라 보인다.
// 목록에는 끝난 세션만 오므로, 중단된 세션에만 상태 이름을 붙인다.
function SessionItem({ session }: { session: SessionSummary }) {
  return (
    <li style={{ borderBottom: '1px solid #eee' }}>
      <Link
        to={`/history/${session.id}`}
        style={{ display: 'block', padding: '8px 0', color: 'inherit', textDecoration: 'none' }}
      >
        <strong>#{session.id}</strong> · {formatStartedAt(session.startedAt)} · 문장{' '}
        {session.segmentCount}개
        {session.status !== 'ended' && ` · ${SESSION_STATUS_LABELS[session.status]}`}
        <span
          style={{
            display: 'block',
            color: '#666',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {session.preview}
        </span>
      </Link>
    </li>
  );
}

export function HistoryListPage() {
  const sessions = useApiData((signal) => listSessions(signal), []);

  return (
    <section>
      <h1>히스토리</h1>
      {sessions.status === 'loading' && <p>불러오는 중…</p>}
      {sessions.status === 'error' && <p role="alert">{sessions.error.message}</p>}
      {sessions.status === 'success' && sessions.data.length === 0 && <p>지난 녹음이 없습니다</p>}
      {sessions.status === 'success' && sessions.data.length > 0 && (
        <>
          <p>지난 녹음 {sessions.data.length}개</p>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {sessions.data.map((session) => (
              <SessionItem key={session.id} session={session} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
