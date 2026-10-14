// segments 테이블에 쓰는 SQL.
import type { SttEvent } from '@app/shared';
import type { Pool } from 'pg';

// final 이벤트 하나를 한 행으로 쓴다. 같은 (세션, 세그먼트 번호)가 이미 있으면 나중 것으로 덮어쓴다.
export async function upsertSegment(pool: Pool, sessionId: number, event: SttEvent): Promise<void> {
  await pool.query(
    `insert into segments (session_id, segment_id, text, start_ms, end_ms)
     values ($1, $2, $3, $4, $5)
     on conflict (session_id, segment_id)
     do update set text = excluded.text, start_ms = excluded.start_ms, end_ms = excluded.end_ms`,
    [sessionId, event.segmentId, event.text, event.startMs, event.endMs],
  );
}
