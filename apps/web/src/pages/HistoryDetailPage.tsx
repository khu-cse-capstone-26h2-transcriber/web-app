// 히스토리 상세 화면 ('/history/:id'). 머리말(시작, 길이, 상태)과 내려받기 버튼 아래에 문장을 시각과 함께 보인다.
// 머리말과 문장 앞 시각은 내보내기 파일(T11)과 같은 함수로 써서, 화면과 내려받은 파일의 내용이 같다.
// 녹음 중인 세션은 그때까지 DB에 저장된 문장만 보인다(T10).
// 모양은 확정안 F-4를 따른다(T40). 시각은 파일과 달리 괄호 없이 왼쪽 칸에 둔다.
import {
  formatDuration,
  formatOffset,
  formatStartedAt,
  recordingLengthMs,
} from '@app/shared';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { getSession, type SessionDetail } from '../api/endpoints';
import { useApiData } from '../api/useApiData';
import { DownloadButtons } from '../components/DownloadButtons';
import { ArrowLeftIcon } from '../components/icons';
import { StatusBadge } from '../components/StatusBadge';

// 머리말의 정보 칩.
function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-lg border border-chip-line bg-surface px-3 py-1.5 text-[13px] text-text3 tabular-nums">
      {children}
    </span>
  );
}

function SessionView({ detail }: { detail: SessionDetail }) {
  const { session, segments } = detail;

  return (
    <>
      <div className="mt-3.5 flex flex-wrap items-end gap-4">
        <div className="min-w-0">
          <h1 className="text-[26px] font-bold tracking-[-0.6px] md:text-[30px]">녹음 #{session.id}</h1>
          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <Chip>{formatStartedAt(session.startedAt)} 시작</Chip>
            <Chip>길이 {formatDuration(recordingLengthMs(segments))}</Chip>
            <StatusBadge status={session.status} />
          </div>
        </div>
        <div className="md:ml-auto">
          <DownloadButtons session={session} />
        </div>
      </div>

      <div className="mt-[26px] mb-2.5 h-px bg-line" />

      {segments.length === 0 ? (
        <p className="py-2 text-sm text-muted">저장된 문장이 없습니다</p>
      ) : (
        <ol className="max-w-[860px]">
          {segments.map((segment) => (
            <li key={segment.segmentId} className="flex gap-3.5 py-[9px] md:gap-[22px]">
              <span className="w-12 flex-none pt-[3px] text-sm text-faint tabular-nums md:w-[52px]">
                {formatOffset(segment.startMs)}
              </span>
              <span className="min-w-0 text-base leading-[1.75] text-text2 md:text-[17px]">
                {segment.text}
              </span>
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
    <section className="flex-1 px-5 py-6 md:px-12 md:pt-7 md:pb-9">
      <Link to="/history" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text3">
        <ArrowLeftIcon className="size-4" />
        히스토리
      </Link>
      {detail.status === 'success' ? (
        <SessionView detail={detail.data} />
      ) : (
        <>
          <h1 className="mt-3.5 text-[26px] font-bold tracking-[-0.6px] md:text-[30px]">녹음 #{id}</h1>
          {detail.status === 'loading' && <p className="mt-4 text-sm text-muted">불러오는 중…</p>}
          {detail.status === 'error' && (
            <p role="alert" className="mt-4 text-sm text-rec-text">
              {detail.error.message}
            </p>
          )}
        </>
      )}
    </section>
  );
}
