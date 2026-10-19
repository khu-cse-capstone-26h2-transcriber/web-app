// Vite 설정. 개발 서버와 미리보기 서버가 /api, /health 요청을 Express 서버로 넘긴다.
// 웹앱과 서버가 같은 출처처럼 보이므로 서버에 CORS를 두지 않는다.
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// 서버와 같은 루트 .env를 읽는다.
const ROOT_DIR = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig(({ mode }) => {
  const { PORT } = loadEnv(mode, ROOT_DIR, '');
  if (!PORT) {
    throw new Error('루트 .env에 PORT가 없습니다. .env.example을 복사해 .env를 만드세요.');
  }
  const proxy = {
    '/api': `http://localhost:${PORT}`,
    '/health': `http://localhost:${PORT}`,
  };

  return {
    plugins: [react()],
    server: { proxy },
    preview: { proxy },
  };
});
