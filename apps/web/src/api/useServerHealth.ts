// 서버와 DB가 살아 있는지 /health로 확인하는 훅. 처음 한 번, 그 뒤 30초마다, recheck를 부를 때 다시 확인한다.
// 다시 확인하는 동안에는 직전 결과를 그대로 둔다(확인 중으로 깜빡이지 않게).
import { useCallback, useEffect, useState } from 'react';
import { toApiError } from './client';
import { getHealth, type Health } from './endpoints';
import type { ApiState } from './useApiData';

// 서버 상태를 다시 확인하는 간격(ms).
const HEALTH_CHECK_INTERVAL_MS = 30_000;

export interface ServerHealth {
  health: ApiState<Health>;
  // 기다리지 않고 바로 다시 확인한다. 다음 확인은 그때부터 30초 뒤다.
  recheck: () => void;
}

export function useServerHealth(): ServerHealth {
  const [health, setHealth] = useState<ApiState<Health>>({ status: 'loading' });
  // 바뀔 때마다 한 번 확인한다.
  const [round, setRound] = useState(0);
  const recheck = useCallback(() => setRound((n) => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    getHealth(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setHealth({ status: 'success', data });
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setHealth({ status: 'error', error: toApiError(error) });
      },
    );
    // 확인을 시작할 때 다음 확인을 예약한다. 다음 확인이 시작되면 아직 답이 없는 요청은 취소된다.
    const timer = setTimeout(recheck, HEALTH_CHECK_INTERVAL_MS);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [round, recheck]);

  return { health, recheck };
}
