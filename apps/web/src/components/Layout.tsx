// 모든 화면이 공유하는 틀. 위쪽에 메뉴와 서버 상태를 두고, 아래에 현재 주소의 화면을 그린다.
import { APP_NAME } from '@app/shared';
import { NavLink, Outlet } from 'react-router';
import type { Health } from '../api/endpoints';
import type { ApiState } from '../api/useApiData';
import { useServerHealth } from '../api/useServerHealth';

// 화면이 useOutletContext로 받는 값.
export interface LayoutContext {
  // 위쪽 서버 상태를 바로 다시 확인한다. 녹음 화면은 실시간 연결이 다시 이어졌을 때 부른다.
  recheckServer: () => void;
}

// 서버와 DB가 살아 있는지 보여 준다. 열 때와 30초마다, 실패한 동안에는 5초마다 다시 확인한다(T15, T25).
// 녹음 중 실시간 연결이 끊긴 것은 녹음 화면 맨 위의 배너가 따로 알린다.
function ServerStatus({ health }: { health: ApiState<Health> }) {
  if (health.status === 'loading') return <span>서버 확인 중…</span>;
  if (health.status === 'error') return <span role="alert">서버: {health.error.message}</span>;
  return <span>서버: 정상</span>;
}

export function Layout() {
  const { health, recheck } = useServerHealth();
  const context: LayoutContext = { recheckServer: recheck };

  return (
    <>
      <header style={{ display: 'flex', gap: 16, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <strong>{APP_NAME}</strong>
        <nav style={{ display: 'flex', gap: 12 }}>
          <NavLink to="/" end>
            녹음
          </NavLink>
          <NavLink to="/history">히스토리</NavLink>
        </nav>
        <ServerStatus health={health} />
      </header>
      <main>
        <Outlet context={context} />
      </main>
    </>
  );
}
