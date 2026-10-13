-- 세션 상태 컬럼을 추가한다.
-- recording: 녹음 중, ended: 사용자가 종료함, interrupted: 서버가 꺼져서 끊김.
alter table sessions
  add column status text not null default 'recording'
  constraint sessions_status_check check (status in ('recording', 'ended', 'interrupted'));

-- 이미 있던 행은 ended_at을 보고 상태를 맞춘다.
update sessions set status = 'ended' where ended_at is not null;

-- 녹음 중인 세션만 ended_at이 비어 있다.
alter table sessions
  add constraint sessions_status_ended_at_check check ((status = 'recording') = (ended_at is null));
