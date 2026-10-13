// sessions 테이블을 읽고 쓰는 SQL. 세션 상태는 여기서만 바꾼다.
import type { Session, SessionStatus } from '@app/shared';
import type { Pool } from 'pg';

// pg는 bigint를 문자열로, timestamptz를 Date로 준다.
interface SessionRow {
  id: string;
  status: SessionStatus;
  started_at: Date;
  ended_at: Date | null;
}

const COLUMNS = 'id, status, started_at, ended_at';

function toSession(row: SessionRow): Session {
  return {
    id: Number(row.id),
    status: row.status,
    startedAt: row.started_at.toISOString(),
    endedAt: row.ended_at ? row.ended_at.toISOString() : null,
  };
}

// 녹음 중인 세션을 하나 만든다. status의 기본값이 recording이다.
export async function insertSession(pool: Pool): Promise<Session> {
  const { rows } = await pool.query<SessionRow>(
    `insert into sessions default values returning ${COLUMNS}`,
  );
  return toSession(rows[0]);
}

export async function findSession(pool: Pool, id: number): Promise<Session | undefined> {
  const { rows } = await pool.query<SessionRow>(
    `select ${COLUMNS} from sessions where id = $1`,
    [id],
  );
  return rows[0] ? toSession(rows[0]) : undefined;
}

// 녹음 중인 세션을 닫는다. 이미 닫힌 세션이면 아무것도 바꾸지 않고 undefined를 돌려준다.
export async function closeSession(
  pool: Pool,
  id: number,
  status: Exclude<SessionStatus, 'recording'>,
): Promise<Session | undefined> {
  const { rows } = await pool.query<SessionRow>(
    `update sessions set status = $2, ended_at = now()
     where id = $1 and status = 'recording'
     returning ${COLUMNS}`,
    [id, status],
  );
  return rows[0] ? toSession(rows[0]) : undefined;
}

// 녹음 중으로 남아 있는 세션을 모두 중단으로 닫고, 닫은 세션 번호를 돌려준다.
export async function interruptOpenSessions(pool: Pool): Promise<number[]> {
  const { rows } = await pool.query<{ id: string }>(
    `update sessions set status = 'interrupted', ended_at = now()
     where status = 'recording'
     returning id`,
  );
  return rows.map((row) => Number(row.id));
}
