// 사이드바 '최근 녹음'을 불러오는 훅(T38). 히스토리 목록과 같은 API(끝난 세션, 최근 것부터)에서 앞 몇 개만 쓴다.
// refreshKey가 바뀌면 다시 불러온다. 다시 불러오는 동안과 실패했을 때는 직전 목록을 그대로 둬 사이드바가 깜빡이지 않게 한다.
// 실패 이유는 따로 보이지 않는다. 서버나 DB 문제는 사이드바 아래 서버 상태가 알린다.
import type { SessionSummary } from '@app/shared';
import { useEffect, useState } from 'react';
import { listSessions } from './endpoints';

// 처음 불러오기 전이면 null이다.
export function useRecentSessions(limit: number, refreshKey: unknown): SessionSummary[] | null {
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    listSessions(controller.signal).then(
      (all) => {
        if (!controller.signal.aborted) setSessions(all.slice(0, limit));
      },
      () => {},
    );
    return () => controller.abort();
  }, [limit, refreshKey]);

  return sessions;
}
