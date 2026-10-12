-- 스키마 v0. 녹음 세션과, 세션에 속한 확정(final) 세그먼트를 저장한다.

-- 녹음 세션. ended_at이 비어 있으면 아직 녹음 중이다.
create table sessions (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

-- final 이벤트만 저장한다. 컬럼은 SttEvent 초안(D4 합의 전)의 필드를 따른다.
create table segments (
  session_id bigint not null references sessions (id) on delete cascade,
  -- SttEvent.segmentId. 세션 안에서 0부터 증가한다.
  segment_id integer not null,
  text text not null,
  -- 세션 시작 기준 세그먼트 시작·끝 시각(ms)
  start_ms integer not null,
  end_ms integer not null,
  primary key (session_id, segment_id)
);
