// 히스토리 상세 화면 ('/history/:id'). 머리말(시작, 길이, 상태)과 내려받기 버튼 아래에 문장을 시각과 함께 보인다.
// 머리말과 문장 앞 시각은 내보내기 파일(T11)과 같은 함수로 써서, 화면과 내려받은 파일의 내용이 같다.
// 녹음 중인 세션은 그때까지 DB에 저장된 문장만 보인다(T10).
import {
  SESSION_STATUS_LABELS,
  formatDuration,
  formatOffset,
  formatStartedAt,
  recordingLengthMs,
} from '@app/shared';
import { Link, useParams } from 'react-router';
import { getSession, type SessionDetail } from '../api/endpoints';
import { useApiData } from '../api/useApiData';
import { DownloadButtons } from '../components/DownloadButtons';

function SessionView({ detail }: { detail: SessionDetail }) {
  const { session, segments } = detail;

  return (
    <>
      <p>
        시작 {formatStartedAt(session.startedAt)} · 길이{' '}
        {formatDuration(recordingLengthMs(segments))} · {SESSION_STATUS_LABELS[session.status]}
      </p>
      <DownloadButtons session={session} />
      {segments.length === 0 ? (
        <p style={{ color: '#888' }}>저장된 문장이 없습니다</p>
      ) : (
        <ol style={{ listStyle: 'none', padding: 0, lineHeight: 1.6 }}>
          {segments.map((segment) => (
            <li key={segment.segmentId} style={{ margin: '4px 0' }}>
              <span style={{ color: '#888', fontVariantNumeric: 'tabular-nums' }}>
                [{formatOffset(segment.startMs)}]
              </span>{' '}
              {segment.text}
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

export function HistoryDetailPage() {
  // 라우트가 'history/:id'라 id는 항상 있다.
  const id = useParams().id ?? '';
  const detail = useApiData((signal) => getSession(id, signal), [id]);

  return (
    <section>
      <p>
        <Link to="/history">← 히스토리</Link>
      </p>
      <h1>녹음 #{id}</h1>
      {detail.status === 'loading' && <p>불러오는 중…</p>}
      {detail.status === 'error' && <p role="alert">{detail.error.message}</p>}
      {detail.status === 'success' && <SessionView detail={detail.data} />}
    </section>
  );
}
