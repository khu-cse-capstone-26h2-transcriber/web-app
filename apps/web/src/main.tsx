// 웹앱 진입점. index.html의 #root에 라우터를 붙인다.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { router } from './router';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('index.html에 #root 요소가 없습니다');

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
