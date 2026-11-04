// Vitest 설정. 서버, 웹, shared의 단위 테스트를 루트에서 한 번에 돌린다(T17).
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // .claude/worktrees 아래 다른 작업 트리의 파일을 함께 돌리지 않도록 워크스페이스의 src만 본다.
    include: ['apps/*/src/**/*.test.ts', 'packages/*/src/**/*.test.ts'],
    // 웹 테스트도 순수 함수만 다뤄 브라우저 환경이 필요 없다.
    environment: 'node',
  },
});
