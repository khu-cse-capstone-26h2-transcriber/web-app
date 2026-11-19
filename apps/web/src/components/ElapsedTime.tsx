// 녹음을 시작한 뒤 흐른 시간. 녹음 화면의 큰 시간과 사이드바의 '녹음 중' 옆 시간이 같이 쓴다(T39, RecordPage에서 옮김).
import { useEffect, useState } from 'react';

// 밀리초를 mm:ss로, 한 시간이 넘으면 h:mm:ss로 바꾼다.
function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const seconds = String(total % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${minutes}:${seconds}` : `${minutes}:${seconds}`;
}

// 1초마다 다시 그린다.
// 시작 시각은 서버 시계, 지금 시각은 브라우저 시계라 두 시계가 다르면 어긋난다. 음수는 0으로 보인다.
export function ElapsedTime({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <>{formatElapsed(now - Date.parse(startedAt))}</>;
}
