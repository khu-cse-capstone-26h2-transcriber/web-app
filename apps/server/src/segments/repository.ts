// segments 테이블을 읽고 쓰는 SQL.
import type { Segment, SttEvent } from '@app/shared';
import type { Pool } from 'pg';

interface SegmentRow {
  segment_id: number;
  text: string;
  start_ms: number;
  end_ms: number;
}

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

// 한 세션에 저장된 세그먼트를 순서대로 읽는다. 아직 쓰지 못해 메모리에 있는 것은 들어 있지 않다.
export async function listSegments(pool: Pool, sessionId: number): Promise<Segment[]> {
  const { rows } = await pool.query<SegmentRow>(
    `select segment_id, text, start_ms, end_ms
     from segments
     where session_id = $1
     order by segment_id`,
    [sessionId],
  );
  return rows.map((row) => ({
    segmentId: row.segment_id,
    text: row.text,
    startMs: row.start_ms,
    endMs: row.end_ms,
  }));
}
