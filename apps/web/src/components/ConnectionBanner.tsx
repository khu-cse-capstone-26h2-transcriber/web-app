// 실시간 자막 스트림의 연결 배너. 끊기면 다시 연결하는 중임을 알리고, 다시 연결되면 잠깐 알린 뒤 숨는다.
// 녹음 화면 맨 위에 가로로 꽉 차게 둔다. 끊김은 노란 띠, 회복은 초록 띠다(확정안 F-5·F-7, T39).
import { useEffect, useState } from 'react';
import type { StreamConnection } from '../api/useSessionStream';
import { CheckIcon, WarningIcon } from './icons';

// 다시 연결됐다는 문구를 보이는 시간(ms).
const RECOVERED_NOTICE_MS = 3_000;

const bannerClass =
  'sticky top-0 z-10 flex flex-none items-center gap-2.5 border-b px-4 py-[11px] text-[13px] leading-normal md:px-12';

interface ConnectionBannerProps {
  connection: StreamConnection;
  onReconnectNow: () => void;
}

export function ConnectionBanner({ connection, onReconnectNow }: ConnectionBannerProps) {
  const recovered = connection.status === 'open' && connection.reconnected;
  const [showRecovered, setShowRecovered] = useState(false);

  // 다시 연결될 때마다 회복 문구를 잠깐 보인다.
  useEffect(() => {
    if (!recovered) {
      setShowRecovered(false);
      return;
    }
    setShowRecovered(true);
    const timer = setTimeout(() => setShowRecovered(false), RECOVERED_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [recovered]);

  if (connection.status === 'reconnecting') {
    return (
      <div role="alert" className={`${bannerClass} border-warn-line bg-warn-bg text-warn-text`}>
        <WarningIcon className="size-[18px]" />
        <span className="min-w-0 flex-1">
          실시간 연결이 끊겼습니다. 다시 연결하는 중… ({connection.attempt}번째 시도)
        </span>
        <button
          type="button"
          onClick={onReconnectNow}
          className="flex-none rounded-lg border border-warn-button px-2.5 py-1.5 text-xs font-bold hover:bg-warn/10"
        >
          지금 다시 연결
        </button>
      </div>
    );
  }

  if (showRecovered) {
    return (
      <div role="status" className={`${bannerClass} border-ok-line bg-ok-bg text-ok-text`}>
        <CheckIcon className="size-[18px]" />
        다시 연결되었습니다
      </div>
    );
  }

  return null;
}
