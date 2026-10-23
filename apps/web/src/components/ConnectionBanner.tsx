// 실시간 자막 스트림의 연결 배너. 끊기면 다시 연결하는 중임을 알리고, 다시 연결되면 잠깐 알린 뒤 숨는다.
// 녹음 화면 맨 위에 두고, 스크롤해도 위에 붙어 있게 한다.
import { useEffect, useState } from 'react';
import type { StreamConnection } from '../api/useSessionStream';

// 다시 연결됐다는 문구를 보이는 시간(ms).
const RECOVERED_NOTICE_MS = 3_000;

const bannerStyle = {
  position: 'sticky',
  top: 0,
  zIndex: 1,
  display: 'flex',
  gap: 12,
  alignItems: 'center',
  flexWrap: 'wrap',
  padding: '8px 12px',
  borderRadius: 4,
} as const;

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
      <div role="alert" style={{ ...bannerStyle, background: '#fff3cd', color: '#664d03' }}>
        <span>
          실시간 연결이 끊겼습니다. 다시 연결하는 중… ({connection.attempt}번째 시도)
        </span>
        <button type="button" onClick={onReconnectNow}>
          지금 다시 연결
        </button>
      </div>
    );
  }

  if (showRecovered) {
    return (
      <div role="status" style={{ ...bannerStyle, background: '#d1e7dd', color: '#0f5132' }}>
        다시 연결되었습니다
      </div>
    );
  }

  return null;
}
