// 녹음 상태 표시(확정안 F-7 '상태 표시', T40). 종료됨은 초록, 중단됨은 노랑, 녹음 중은 빨강이다.
// small은 사이드바와 히스토리 목록에서 중단된 녹음 옆에 붙는 작은 표시다.
import { SESSION_STATUS_LABELS, type SessionStatus } from '@app/shared';

const COLORS: Record<SessionStatus, string> = {
  ended: 'bg-ok/12 text-ok',
  interrupted: 'bg-warn/12 text-warn',
  recording: 'bg-rec/14 text-rec-text',
};

export function StatusBadge({ status, small = false }: { status: SessionStatus; small?: boolean }) {
  const size = small
    ? 'rounded-[5px] px-[7px] py-0.5 text-[11px]'
    : 'rounded-md px-2.5 py-[3px] text-xs';
  return (
    <span className={`flex-none font-bold ${size} ${COLORS[status]}`}>
      {SESSION_STATUS_LABELS[status]}
    </span>
  );
}
