// 웹앱 진입점. index.html의 #root에 라우터를 붙인다.
// 글꼴 Pretendard는 빌드에 넣어, 기기가 인터넷 없이 웹앱을 내보내도 같은 글꼴이 나온다(T38).
// 글자 범위별 조각 중 화면에 나온 글자의 조각만 브라우저가 받는다.
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './index.css';
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
