// 히스토리 상세 화면 ('/history/:id'). 지금은 주소의 번호로 상세 API를 불러 요약만 보여 준다.
// 문장 본문과 다운로드 버튼은 T16에서 만든다.
import { Link, useParams } from 'react-router';
import { getSession } from '../api/endpoints';
import { useApiData } from '../api/useApiData';

export function HistoryDetailPage() {
  // 라우트가 'history/:id'라 id는 항상 있다.
  const id = useParams().id ?? '';
  const detail = useApiData((signal) => getSession(id, signal), [id]);

  return (
    <section>
      <p>
        <Link to="/history">← 히스토리</Link>
      </p>
      <h1>세션 #{id}</h1>
      {detail.status === 'loading' && <p>불러오는 중…</p>}
      {detail.status === 'error' && <p role="alert">{detail.error.message}</p>}
      {detail.status === 'success' && (
        <p>
          상태 {detail.data.session.status} · 시작{' '}
          {new Date(detail.data.session.startedAt).toLocaleString('ko-KR')} · 세그먼트{' '}
          {detail.data.segments.length}개
        </p>
      )}
    </section>
  );
}
