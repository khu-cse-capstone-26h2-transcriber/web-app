// 진행 중인 녹음을 2초마다 확인하는 훅(T39). 녹음 화면 밖에서 사이드바의 '녹음 중'과 히스토리 목록의 안내에 쓴다.
// 기기(물리 버튼, audiostackd)가 시작·종료한 녹음은 서버가 웹에 알려 주지 않으므로 이렇게 알아챈다(T20과 같은 방법).
// enabled가 false면 쉬고, 켜질 때 바로 한 번 확인한다. 실패하면 onResult를 부르지 않아 직전 값이 남는다.
// 서버나 DB 문제는 서버 상태 표시가 따로 알린다.
import type { Session } from '@app/shared';
import { useEffect } from 'react';
import { getActiveSession } from './endpoints';

// 확인 간격(ms). 녹음 화면의 대기 중 확인(T20)과 같다.
const ACTIVE_CHECK_INTERVAL_MS = 2_000;

export function useActiveSessionPolling(
  enabled: boolean,
  onResult: (session: Session | null) => void,
): void {
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const check = () => {
      getActiveSession(controller.signal).then(
        (session) => {
          if (!controller.signal.aborted) onResult(session);
        },
        () => {},
      );
    };
    check();
    const timer = setInterval(check, ACTIVE_CHECK_INTERVAL_MS);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [enabled, onResult]);
}
