// 서버와 DB가 살아 있는지 /health로 확인하는 훅. 처음 한 번, 그 뒤 30초마다, recheck를 부를 때 다시 확인한다.
// 확인이 실패하면 성공할 때까지 5초마다 다시 확인해, 서버가 다시 켜지면 곧 정상으로 돌아온다(T25).
// 다시 확인하는 동안에는 직전 결과를 그대로 둔다(확인 중으로 깜빡이지 않게).
import type { Health } from '@app/shared';
import { useCallback, useEffect, useState } from 'react';
import { ApiError, toApiError } from './client';
import { getHealth } from './endpoints';
import type { ApiState } from './useApiData';

// 서버 상태를 다시 확인하는 간격(ms).
const HEALTH_CHECK_INTERVAL_MS = 30_000;
// 확인이 실패했을 때 다음 확인까지의 간격(ms).
const HEALTH_RETRY_INTERVAL_MS = 5_000;
// 이만큼(ms) 답이 없으면 실패로 본다. 서버가 멈춰 답하지 않을 때 직전 결과(정상)가 남지 않도록.
const HEALTH_CHECK_TIMEOUT_MS = 5_000;

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
    // 다음 확인이 시작되거나 화면을 떠나면 false다. 그 뒤에 온 결과는 버린다.
    let current = true;
    // 시간 제한으로 끊었는지. 다음 확인이 시작되어 취소된 것과 구분한다.
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, HEALTH_CHECK_TIMEOUT_MS);
    // 확인을 시작할 때 다음 확인을 예약한다. 실패하면 더 짧게 다시 건다.
    let next = setTimeout(recheck, HEALTH_CHECK_INTERVAL_MS);

    getHealth(controller.signal)
      .then(
        (data) => {
          if (current) setHealth({ status: 'success', data });
        },
        (error: unknown) => {
          if (!current) return;
          setHealth({
            status: 'error',
            error: timedOut ? new ApiError(0, 'TIMEOUT', '서버가 답하지 않습니다') : toApiError(error),
          });
          clearTimeout(next);
          next = setTimeout(recheck, HEALTH_RETRY_INTERVAL_MS);
        },
      )
      .finally(() => clearTimeout(timeout));

    return () => {
      current = false;
      controller.abort();
      clearTimeout(timeout);
      clearTimeout(next);
    };
  }, [round, recheck]);

  return { health, recheck };
}
