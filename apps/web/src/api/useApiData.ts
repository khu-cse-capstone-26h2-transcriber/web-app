// 화면에서 API 하나를 불러 상태로 쓰는 훅. deps가 바뀌거나 화면을 떠나면 이전 요청을 취소한다.
import { type DependencyList, useEffect, useState } from 'react';
import { ApiError } from './client';

export type ApiState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: ApiError };

export function useApiData<T>(
  load: (signal: AbortSignal) => Promise<T>,
  deps: DependencyList,
): ApiState<T> {
  const [state, setState] = useState<ApiState<T>>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ status: 'success', data });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        // request는 ApiError만 던진다. 그 밖의 에러는 화면 코드의 버그다.
        const apiError =
          error instanceof ApiError ? error : new ApiError(0, 'CLIENT_ERROR', String(error));
        setState({ status: 'error', error: apiError });
      },
    );
    return () => controller.abort();
  }, deps);

  return state;
}
