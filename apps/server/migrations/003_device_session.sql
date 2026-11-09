-- 기기(audiostackd)가 만든 세션 번호를 저장한다. 웹 버튼으로 만든 세션은 비어 있다.
-- 서버의 정수 번호(id)는 그대로 쓰고, 기기 번호는 기기에서 온 통지를 이 세션에 잇는 데만 쓴다.
alter table sessions add column device_session_id text;

create unique index sessions_device_session_id_key on sessions (device_session_id)
  where device_session_id is not null;
