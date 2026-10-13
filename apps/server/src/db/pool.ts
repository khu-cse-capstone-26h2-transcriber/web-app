// pg 연결 풀을 만든다. 서버 전체가 이 풀 하나를 함께 쓴다.
import { Pool } from 'pg';

export function createPool(dbUrl: string): Pool {
  // DB가 꺼져 있을 때 요청이 오래 매달리지 않도록 연결 대기 시간을 둔다.
  const pool = new Pool({ connectionString: dbUrl, connectionTimeoutMillis: 2000 });
  // 쉬고 있던 연결이 끊겨도 프로세스가 죽지 않게 받아서 기록만 한다.
  pool.on('error', (error) => {
    console.error(`[db] 연결 오류: ${error.message || error.name}`);
  });
  return pool;
}
