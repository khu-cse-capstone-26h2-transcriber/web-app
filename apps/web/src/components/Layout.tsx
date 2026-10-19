// 모든 화면이 공유하는 틀. 위쪽에 메뉴와 서버 상태를 두고, 아래에 현재 주소의 화면을 그린다.
import { APP_NAME } from '@app/shared';
import { NavLink, Outlet } from 'react-router';
import { getHealth } from '../api/endpoints';
import { useApiData } from '../api/useApiData';

// 웹앱을 열 때 한 번 /health를 불러 서버와 DB가 살아 있는지 보여 준다.
// 녹음 중 연결 끊김 배너는 T15에서 따로 만든다.
function ServerStatus() {
  const health = useApiData((signal) => getHealth(signal), []);
  if (health.status === 'loading') return <span>서버 확인 중…</span>;
  if (health.status === 'error') return <span role="alert">서버: {health.error.message}</span>;
  return <span>서버: 정상</span>;
}

export function Layout() {
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
        <ServerStatus />
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}
