// 웹앱의 주소와 화면. 모든 화면은 Layout 안에 그린다.
import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { HistoryDetailPage } from './pages/HistoryDetailPage';
import { HistoryListPage } from './pages/HistoryListPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RecordPage } from './pages/RecordPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <RecordPage /> },
      { path: 'history', element: <HistoryListPage /> },
      { path: 'history/:id', element: <HistoryDetailPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
