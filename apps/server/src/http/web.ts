// 웹앱 빌드(apps/web/dist)를 내보낸다. 기기에서는 Vite 없이 서버 포트 하나로 웹앱과 API를 함께 연다. (T31)
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type RequestHandler, type Router } from 'express';

// 이 코드가 있는 폴더에서 위로 올라가며 package.json이 있는 첫 폴더(= apps/server)를 찾는다.
// 개발 방식(src/http/web.ts)과 묶은 파일(dist/index.js)은 깊이가 달라 고정 상대 경로를 쓸 수 없다. (T33)
function findServerPackageDir(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  while (!existsSync(path.join(dir, 'package.json'))) {
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('서버 패키지 폴더(package.json)를 찾지 못했습니다');
    dir = parent;
  }
  return dir;
}

// 저장소 안의 고정 경로라 환경변수로 받지 않는다. 서버 패키지 폴더 옆의 apps/web/dist다.
export const WEB_DIST_DIR = path.join(findServerPackageDir(), '..', 'web', 'dist');

// 1년. assets/ 파일 이름에는 내용 해시가 붙어, 새 빌드는 새 이름이 된다.
const ASSET_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

// API 경로는 화면 주소로 보지 않는다. 없는 API는 지금처럼 JSON 404로 간다.
function isApiPath(urlPath: string): boolean {
  return urlPath === '/api' || urlPath.startsWith('/api/') || urlPath === '/health';
}

// 빌드가 없으면 null을 돌려준다. 그때 서버는 API만 연다.
export function createWebRouter(distDir: string): Router | null {
  const indexFile = path.join(distDir, 'index.html');
  if (!existsSync(indexFile)) return null;

  // /history/12 같은 화면 주소는 index.html을 주고, 주소는 React Router가 읽는다.
  // 확장자가 있는 경로(/favicon.ico 등)는 없는 파일로 보고 넘긴다.
  const serveIndex: RequestHandler = (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (isApiPath(req.path) || path.extname(req.path) !== '') return next();
    // 새 빌드를 바로 쓰도록 index.html은 매번 새로 확인하게 한다.
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(indexFile);
  };

  const router = express.Router();
  router.use(
    '/assets',
    express.static(path.join(distDir, 'assets'), { immutable: true, maxAge: ASSET_MAX_AGE_MS }),
  );
  // index.html은 위의 serveIndex가 캐시 헤더와 함께 준다.
  router.use(express.static(distDir, { index: false }));
  router.use(serveIndex);
  return router;
}
