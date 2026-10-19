// 히스토리 목록 화면 ('/history'). 지금은 서버 연결 확인용으로 목록을 그대로 보여 준다. 화면 구성은 T16에서 정한다.
import { Link } from 'react-router';
import { listSessions } from '../api/endpoints';
import { useApiData } from '../api/useApiData';

export function HistoryListPage() {
  const sessions = useApiData((signal) => listSessions(signal), []);

  return (
    <section>
      <h1>히스토리</h1>
      {sessions.status === 'loading' && <p>불러오는 중…</p>}
      {sessions.status === 'error' && <p role="alert">{sessions.error.message}</p>}
      {sessions.status === 'success' && (
        <>
          <p>지난 녹음 {sessions.data.length}개</p>
          <ul>
            {sessions.data.map((session) => (
              <li key={session.id}>
                <Link to={`/history/${session.id}`}>#{session.id}</Link>{' '}
                {new Date(session.startedAt).toLocaleString('ko-KR')} · 세그먼트{' '}
                {session.segmentCount}개 · {session.preview}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
