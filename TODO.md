# TODO — speech-transcriber

Claude Code가 작업하면서 직접 갱신하는 파일입니다. 끝낸 항목은 `[x]`로 체크하고, 맨 아래 '작업 기록'에 한 줄을 추가합니다. 사용자는 이 파일을 직접 고치지 않습니다.

- 체크는 지침서의 완료 기준을 실행해 확인한 뒤에만 합니다.
- 우선순위: P0 = 크리티컬 패스, P1 = 핵심 기능 완성, P2 = 확장.
- 단계: 선행 작업 기준 착수 순서입니다. 같은 단계는 병행할 수 있습니다.
- 협의: 팀원 합의가 필요한 파트입니다. `[AI]` = 박지윤, `[하드웨어]` = 김범수.
- 지침서는 `docs/guides/Txx.md`에 있습니다.
- 일자별 상세 기록은 `docs/logs/YYYY-MM-DD.md`에 있습니다.
- 프로젝트 설명은 `docs/project-overview.md`에 있습니다.

마지막 갱신: 2026-10-20

## 오늘의 작업 (2026-10-12) — T02 로컬 PostgreSQL(docker-compose)과 환경변수 로더

지침서: `docs/guides/T02.md`

2026-10-12에 저장소 상태를 확인하고 정리한 단계입니다. 2026-10-12에 구현까지 마쳤습니다.

### 착수 전 확인

아래 네 가지는 사용자가 2026-10-12에 확정했습니다. 다시 묻지 않고 이대로 진행합니다.

| 항목 | 결정 | 비고 |
| --- | --- | --- |
| 브랜치 이름 | `feat/t02-postgres-env` | T05와 같은 형식 |
| PostgreSQL 버전 | 16 (`postgres:16` 이미지) | Rubik Pi에서 쓸 버전(D5)이 정해지면 맞춥니다 |
| `.env` 읽는 방법 | Node 20 내장 `--env-file` | 패키지를 추가하지 않습니다. 파일이 없으면 실행이 실패하므로 `.env`를 먼저 만듭니다 |
| `pg` 설치 시점 | T02에서는 설치하지 않음 | 실제 DB 연결과 연결 풀은 T04 범위입니다 |

### 확인한 저장소 상태

- `.env.example`은 T01에서 이미 만들었습니다. 변수는 `PORT`, `DB_URL`, `STT_URL`입니다. 새 이름을 만들지 않고 이 이름을 그대로 씁니다.
- `.gitignore`에 `.env`, `.env.*`, `!.env.example`이 이미 있습니다. 고칠 것이 없습니다.
- Docker 29.2.0과 Docker Compose v5.0.2가 설치되어 있지만, 확인 시점에 Docker 데몬이 꺼져 있었습니다. Docker Desktop을 먼저 켜야 합니다.
- 5432 포트를 쓰는 프로세스는 없었습니다.
- Node는 v20.20.2입니다.

### 단계

- [x] 1. Docker Desktop 실행, `docker info`로 데몬 확인
- [x] 2. `docs/guides/T02.md` 지침서 작성 (형식은 `T05.md`를 따름)
- [x] 3. 브랜치 `feat/t02-postgres-env` 생성
- [x] 4. 루트 `docker-compose.yml` 작성: PostgreSQL 서비스, 5432 포트, 이름 있는 볼륨, `pg_isready` healthcheck. 계정·비밀번호·DB 이름은 `.env.example`의 `DB_URL`과 맞춤
- [x] 5. `.env.example`의 값이 4단계와 맞는지 확인하고 필요하면 수정, `.env`로 복사 (`.env`는 커밋하지 않음)
- [x] 6. `apps/server/src/config/env.ts` 환경변수 로더 작성: `PORT`, `DB_URL`, `STT_URL`을 읽고, 빠진 값이 있으면 이름을 알리고 종료 코드 1로 끝냄
- [x] 7. `apps/server/src/index.ts`에서 로더 호출, `dev` 스크립트에 `--env-file` 연결 (실행 위치가 `apps/server`이므로 루트 `.env` 경로에 주의)
- [x] 8. 완료 기준 확인 후 커밋
  - `docker compose up -d` 뒤 `docker compose ps`에서 `healthy`
  - 컨테이너 안에서 `psql`로 `select 1` 성공
  - `npm run typecheck` 통과
  - `npm run dev:server`가 읽은 설정으로 시작 (비밀번호는 출력하지 않음)
  - `DB_URL`을 뺀 채 실행하면 빠진 변수 이름을 알리고 종료 코드 1
  - `npm run dev:stt`가 전과 같이 동작
- [x] 9. 일지(`docs/logs/`), 지침서 '결과' 작성, `TODO.md` 변경안 보고

하지 않는 것: `pg` 설치와 연결 풀(T04), 테이블과 마이그레이션(T03), 서버 프레임워크 도입(D2), `STT_URL`을 실제로 쓰는 코드(T20).

## 함께 확인할 것

### 사용자가 직접 할 일

- [ ] **D4 협의 요청** — 박지윤(AI), 김범수(하드웨어)에게 STT 연동 방식 협의를 요청합니다. T05가 끝나 D4의 '늦어도 필요한 시점'이 됐고, T19와 T20이 이 합의에 막혀 있습니다.
  - 들고 갈 초안: `docs/project-overview.md`의 'STT 이벤트' 절
  - 정할 것: STT 호출 방법, 오디오 입력 형식, partial/final 이벤트 형식
- [ ] D7(팀 전체 마일스톤과 주차별 일정) — '가능한 빨리'로 적힌 항목입니다. D4 협의 때 함께 꺼낼 수 있습니다.

### 결정하면 풀리는 작업

- [x] D3(웹앱 빌드 도구) 결정 — 2026-10-19 Vite로 확정. T12 완료.
- [ ] D6(히스토리 다운로드 포맷) 결정 — D6을 정하면 T11을 시작할 수 있습니다.

## 기능별 작업

### 프로젝트 기반

- [x] T01 모노레포 스캐폴딩 — P0 · 단계 1 · 선행: 없음 · 협의: 없음
- [x] T02 로컬 PostgreSQL(docker-compose)과 환경변수 로더 — P0 · 단계 2 · 선행: T01 · 협의: 없음
- [x] T03 DB 스키마 v0와 마이그레이션 스크립트 — P0 · 단계 3 · 선행: T02 · 협의: 없음
- [x] T04 서버 뼈대(HTTP 서버, `/health`, 에러 처리, pg 연결 풀) — P0 · 단계 3 · 선행: T01, T02 · 협의: 없음 · 서버 프레임워크: Express(D2 확정)

### STT 연동

- [x] T05 STT 어댑터 인터페이스와 mock STT — P0 · 단계 2 · 선행: T01 · 협의: 없음 · 이 인터페이스가 T19 협의의 초안
- [ ] T19 STT 연동 인터페이스 합의와 문서화 — P0 · 단계 3 · 선행: T05 · 협의: **[AI, 하드웨어]** (D4)
- [ ] T20 실제 STT 어댑터로 mock 교체 — P0 · 단계 4 · 선행: T05, T19 · 협의: **[AI]**

### 녹음 세션과 실시간 전달

- [x] T06 세션 시작/종료 API와 상태 전이 — P0 · 단계 4 · 선행: T04, T05 · 협의: 없음
- [x] T07 SSE 스트림 엔드포인트(mock 이벤트, heartbeat) — P0 · 단계 5 · 선행: T06 · 협의: 없음
- [x] T08 세그먼트 DB 저장(partial/final 구분) — P0 · 단계 5 · 선행: T03, T06 · 협의: 없음
- [x] T09 SSE 재연결 이어받기(`Last-Event-ID`) — P1 · 단계 6 · 선행: T07, T08 · 협의: 없음

### 웹앱 화면

- [x] T12 웹앱 뼈대(React, 라우팅, API 클라이언트) — P0 · 단계 2 · 선행: T01 · 협의: 없음 · D3: Vite(2026-10-19 확정)
- [ ] T13 녹음 제어 UI — P0 · 단계 5 · 선행: T06, T12 · 협의: 없음
- [ ] T14 실시간 트랜스크립트 화면 — P0 · 단계 6 · 선행: T07, T12 · 협의: 없음
- [ ] T15 SSE 끊김 처리(자동 재연결, 상단 배너) — P1 · 단계 7 · 선행: T14 · 협의: 없음

### 세션 히스토리

- [x] T10 히스토리 API(목록, 상세) — P1 · 단계 6 · 선행: T08 · 협의: 없음
- [ ] T11 히스토리 내보내기 API — P1 · 단계 7 · 선행: T10 · 협의: 없음 · 필요한 결정: D6 다운로드 포맷
- [ ] T16 히스토리 화면과 다운로드 버튼 — P1 · 단계 8 · 선행: T10, T11, T12 · 협의: 없음

### 검증

- [ ] T17 핵심 로직 단위 테스트(Vitest) — P1 · 단계 8 · 선행: T09, T11 · 협의: 없음
- [ ] T18 M1 점검: mock STT로 녹음 → 실시간 자막 → 히스토리 엔드투엔드 — P0 · 단계 9 · 선행: T13, T14, T16 · 협의: 없음 · **첫 마일스톤**

### 기기 실측

- [ ] T21 Rubik Pi 실측(Node, PostgreSQL 구동, 메모리·CPU) — P0 · 단계 10 · 선행: T18 · 협의: **[하드웨어]** (D5) · 상태: 막힘(기기 수령 대기)

### 확장

- [ ] T22 모드 전환(일반 녹음/AI 질의) UI와 API 자리 — P2 · 단계 6 · 선행: T13 · 협의: **[하드웨어]** (물리 버튼 방식일 때)
- [ ] T23 트랜스크립트 검색 — P2 · 단계 7 · 선행: T10 · 협의: 없음
- [ ] T24 확장 기능 Must/Should/Could 분류 확정 — P2 · 단계 10 · 선행: T18 · 협의: **[AI, 하드웨어]** (D7)

## 팀원 합의가 필요한 항목

| 결정 | 내용 | 협의 파트(상대) | 막는 작업 | 늦어도 필요한 시점 |
| --- | --- | --- | --- | --- |
| D4 | STT 호출 방법, 오디오 입력 형식, partial/final 이벤트 형식. 2026-10-17 종합본(1차 멘토링 자료)에서 일부 답: 마이크는 `audiostackd`가 읽음, partial 지원, 구간은 6초 이후 단어 사이·최대 10초. 남은 쟁점: 결과 전달 방향(데몬이 백엔드로 HTTP POST 중), 세션 ID 발급과 시작·종료 주체, `seq`와 `segmentId`, STT 주소. 상세는 `docs/d4-stt-questions.md` 답 칸 | [AI](박지윤), [하드웨어](김범수) | T19, T20 | T05 완료 직후 |
| D5 | 입출력(마이크 등), 기기 수령 시점. OS는 Ubuntu for Qualcomm으로 확정(2026-10-17 하드웨어 파트 문서), 마이크는 3.5 mm 포트 계획 | [하드웨어](김범수) | T21 | T18 완료 전 |
| D7 | 팀 전체 마일스톤과 주차별 일정 | [AI], [하드웨어] 모두 | 우선순위 재조정 | 가능한 빨리 |
| D8 | PostgreSQL 메모리 설정, SQLite 전환 여부 | [하드웨어](김범수), 실측 후 | T21 이후 | T21 완료 후 |

## 작업 기록

새 기록은 맨 위에 추가합니다. 상태는 `완료`, `진행 중`, `막힘` 중 하나입니다.

| 날짜 | 작업 ID | 상태 | 한 일 | 막힌 점·남은 일 | 다음에 할 작업 |
| --- | --- | --- | --- | --- | --- |
| 2026-10-20 | 1차 멘토링 자료 정리 | 완료 | 2026-10-18 1차 멘토링 종합본(10-17 작성, 세 파트 진행 현황)에서 확정 사안과 D4 답을 정리. D4·D5 행, 로컬 `CLAUDE.md`의 미정 목록(OS 확정), `docs/d4-stt-questions.md` 답 칸, `docs/project-overview.md`의 기술 결정 표(기기 OS 행)와 D5 줄 갱신. 코드 변경 없음. 브랜치 `docs/mentoring-1-summary`에서 커밋하고 `main`에 병합한 뒤 push(2026-10-20) | 종합본에 멘토 피드백·회의 결론은 없음. D4 핵심 쟁점(결과 전달 방향, 세션 ID 발급과 시작·종료 주체, `seq`와 `segmentId`) 남음 | T13, T14 (D4 협의) |
| 2026-10-19 | T12 | 완료 | 브랜치 `feat/t12-web-skeleton`에서 Vite 8.3.4·React 19.3.1·React Router 7.18.4 설치, `vite.config.ts`(루트 `.env`의 `PORT`로 `/api`·`/health` 프록시), `api/client.ts`(`ApiError`)·`endpoints.ts`·`useApiData.ts`, `Layout.tsx`(메뉴, 서버 상태), 화면 `/`·`/history`·`/history/:id`·없는 주소, 루트 `dev:web`, 지침서 `T12.md` 작성. 완료 기준 21개 통과(브라우저 확인, 프록시를 거친 SSE 포함). 사용자 확정(D3 포함): Vite, React Router, Vite 프록시(CORS 없음), `fetch` 래퍼. 지침서 없이 정한 것: React Router 8.x는 Node 22.22 이상이라 7.x, npm 10 버그로 Vite만 `--legacy-peer-deps`로 설치(`npm ci`는 옵션 없이 통과), 데이터는 loader 대신 훅, 프록시 502는 `NETWORK_ERROR`, 응답을 감싸는 타입은 웹에 둠. `main`에 병합하고 push(2026-10-19) | 기기에서 빌드 결과를 누가 내보낼지(D5와 함께). 로컬 DB에 확인용 세션 29개, 세그먼트 191행 | T13, T14 (T13 전 DB 꺼짐 시 500/503 결정. T11은 D6 결정 필요) |
| 2026-10-16 | T09 | 완료 | 브랜치 `feat/t09-sse-resume`에서 `http/sse.ts`(`id:` 줄), `sessions/manager.ts`(진행 중인 세션의 final 목록, `subscribe`에서 먼저 보내기), `sessions/routes.ts`(`Last-Event-ID` 읽기, final에 `segmentId`를 `id`로), `shared/src/stream.ts`(규칙 주석) 수정, 지침서 `T09.md` 작성, T07 지침서에 바뀐 결정 덧붙임. 접속하면 지금까지의 final을 먼저 보내고, `Last-Event-ID`가 있으면 그 번호 뒤의 것만 보냄. 완료 기준 19개 통과(브라우저 `EventSource` 재접속 포함). 사용자 확정: final에만 `segmentId`로 `id`, 헤더가 없으면 처음부터(T07 결정 변경), 메모리에서 다시 보냄, 끝난 세션은 `409` 그대로. 지침서 없이 정한 것: heartbeat·`ended`에는 `id` 없음, 잘못된 헤더 `400`, 말하던 중이던 partial은 다시 보내지 않음, final 목록 상한 없음. `main`에 병합하고 push(2026-10-16) | `id`는 `segmentId`가 0부터 늘어난다는 D4 초안에 기댐 [AI]. `retry:`와 `409`일 때 상세 API로 채우기는 T15. final 목록 메모리는 T21. 로컬 DB에 확인용 세션 28개, 세그먼트 189행 | T11은 D6, T12는 D3 결정 필요 (결정 없이 시작할 수 있는 P0·P1 없음) |
| 2026-10-15 | T10 | 완료 | 브랜치 `feat/t10-history-api`에서 공용 `Segment`(`shared/src/segment.ts`)·`SessionSummary` 타입, `listFinishedSessions`(`sessions/repository.ts`)·`listSegments`(`segments/repository.ts`), 라우트 `GET /api/sessions`(목록)·`GET /api/sessions/:id`(상세) 추가, 지침서 `T10.md` 작성. 목록은 끝난 세션 중 세그먼트가 있는 것만 최신순 전부, 항목마다 `segmentCount`와 첫 문장 `preview`. 상세는 어느 세션이든 세션과 세그먼트 전체. 완료 기준 18개 통과(psql 비교 포함). 사용자 확정: 세션 아래 주소, 요약 포함, 전부·최신순, 끝난 것만. 지침서 없이 정한 것: 미리보기는 자르지 않음, 녹음 중 세션의 상세는 DB에 저장된 것만, 녹음 길이는 응답에 넣지 않음. `main`에 병합하고 push(2026-10-15) | 강제로 꺼진 세션의 `ended_at` 보정(T16 전, T06에서 넘어옴). 세그먼트 없는 세션은 DB에 남음. T11은 D6 결정 필요. 로컬 DB에 확인용 세션 22개, 세그먼트 105행 | T09 (T11은 D6, T12는 D3 결정 필요) |
| 2026-10-15 | 문서 기준 정리 | 완료 | 작업 목록과 진행 상황의 기준을 루트 `TODO.md`로 정함(사용자 결정). 로컬 `CLAUDE.md`의 '문서 링크' 절을 고쳐, 진행 보드·TODO 문서(claude.ai)는 2026-10-10 이후 갱신하지 않은 참고용으로 표시하고 내용이 다르면 `TODO.md`를 따르도록 함 | 진행 보드와 TODO 문서는 갱신하지 않음(D2 Fastify 제안, 옛 백로그 상태가 남음) | T10 (T12는 D3 결정 필요) |
| 2026-10-15 | T07 | 완료 | 브랜치 `feat/t07-sse-stream`에서 공용 `SessionStreamMessage`·`STREAM_HEARTBEAT_MS`(`shared/src/stream.ts`), `http/sse.ts`(`SseStream`) 작성, `sessions/manager.ts`(구독 관리)·`routes.ts`(`GET /api/sessions/:id/events`)·`index.ts`(서버 종료 때 스트림을 먼저 닫음) 수정, 지침서 `T07.md` 작성. partial/final을 `data` 한 줄 JSON으로 보내고 15초마다 heartbeat, 종료하면 `ended` 뒤 스트림을 닫음. 완료 기준 17개 통과(브라우저 `EventSource` 포함). 사용자 확정: 세션별 주소, 접속 이후 이벤트만, `data` 안의 `type`으로 구분, heartbeat 15초. 지침서 없이 정한 것: heartbeat도 JSON 메시지로 보냄(T15 끊김 감지용), 동시 접속 제한 없음, 종료 실패 때 스트림 유지. `main`에 병합하고 push(2026-10-15) | 물리 버튼으로 시작한 녹음을 웹앱이 알아채는 방법 [하드웨어](D4). 이벤트 `id:`와 재접속 때 다시 보낼 범위는 T09에서 결정. 로컬 DB에 확인용 세션 20개, 세그먼트 102행 | T10, T09 (T12는 D3 결정 필요) |
| 2026-10-14 | T08 | 완료 | 브랜치 `feat/t08-segment-storage`에서 `segments/repository.ts`(`upsertSegment`), `segments/writer.ts`(`SegmentWriter`) 작성, `sessions/manager.ts` 수정, 지침서 `T08.md` 작성. final이 올 때마다 `segments`에 한 행씩 저장하고 partial은 저장하지 않음. DB에 닿지 못하면 메모리에 두었다가 다음 final과 종료 때 순서대로 다시 씀. 완료 기준 16개 통과. 사용자 확정: 저장 실패 시 재시도, 중복 final은 덮어쓰기. 지침서 없이 정한 것: DB가 거절한 행(값·제약 오류)은 재시도하지 않고 버림, 대기열 상한 없음. 스키마는 바꾸지 않음. `main`에 병합하고 push(2026-10-15) | 정지할 때 말하던 문장은 저장되지 않음(D4의 C3, AI 파트). 대기열 상한은 T21 때 확인. 로컬 DB에 확인용 세션 13개, 세그먼트 32행 남음 | T07, T10 (T12는 D3 결정 필요) |
| 2026-10-13 | T06 | 완료 | 브랜치 `feat/t06-session-api`에서 마이그레이션 `002_session_status.sql`(`status` 컬럼: `recording`·`ended`·`interrupted`), 공용 `Session` 타입, `sessions/repository.ts`·`manager.ts`·`routes.ts`, 지침서 `T06.md` 작성. API는 `POST /api/sessions`, `POST /api/sessions/:id/stop`, `GET /api/sessions/active`. 시작하면 mock STT가 켜지고, 서버를 켤 때 녹음 중으로 남은 세션을 `interrupted`로 닫음. 완료 기준 17개 통과. 사용자 확정: 경로, `status` 컬럼, 중복 시작 409, 재시작 처리. 지침서에 코드 전문은 싣지 않음(구현과 같은 세션에서 작성). `main`에 병합하고 push | DB가 꺼져 있을 때 세션 API가 500(503으로 맞출지 T13 전 결정). 로컬 DB에 확인용 세션 6개 남음. 물리 버튼 시작과 정지 뒤 final 대기는 D4 협의 | T07, T08 (T12는 D3 결정 필요) |
| 2026-10-13 | T04 | 완료 | 브랜치 `feat/t04-server-skeleton`에서 `express` 5.3.0·`@types/express` 5.0.6 설치, pg 연결 풀 `db/pool.ts`, 에러 형식과 미들웨어 `http/errors.ts`, 앱 조립 `app.ts`, 진입점 `index.ts` 교체(listen, 종료 처리). 완료 기준 13개 통과. 사전 검증에서 보류됐던 DB 켜진 상태의 `/health` 200과 DB 재시작 뒤 회복을 확인. 지침서와 다른 점: Ctrl+C 대신 같은 프로세스들에 `SIGINT`를 보내 확인. `main`에 병합하고 push | DB를 켠 직후 첫 `/health`는 503, 준비되면 200. 서버 listen 주소(D5)와 CORS(T12)는 미정 | T06 (T12는 D3 결정 필요) |
| 2026-10-13 | 저장소 이전 | 완료 | 팀이 organization에서 함께 정리하기로 해 개인 저장소의 작업을 `khu-cse-capstone-26h2-transcriber/web-app`(private)으로 옮김. `main` 커밋 27개 push, `origin` 변경, 개인 저장소 `gwangholee507/speech-transcriber-app`은 archive. 처음 정한 Public은 히스토리 점검(옛 `CLAUDE.md`, 작성자 이메일) 뒤 Private으로 바꿈(사용자 결정) | 공개 전환 여부 미정. `v33jy`는 read 권한이라 push 불가 | T04 |
| 2026-10-12 | D2 확정 | 완료 | 서버 프레임워크를 Express로 확정(사용자가 익숙함). `CLAUDE.md`와 `docs/project-overview.md`에 반영. 팀 공유용 문서 작성, D4 협의 질문 목록 `docs/d4-stt-questions.md` 작성. `main`에 병합하고 push | 진행 보드는 10-10 이후 갱신되지 않아 D2가 Fastify 제안으로 남아 있음 | T04 |
| 2026-10-12 | T03 | 완료 | 브랜치 `feat/t03-db-schema`에서 `pg`·`@types/pg` 설치, 스키마 v0(`001_init.sql`: `sessions`, `segments`), 마이그레이션 실행 스크립트 `db/migrate.ts`, `db:migrate` 명령어, 지침서 `T03.md` 작성. 완료 기준 10개 통과, `main`에 병합하고 push. `CLAUDE.md`의 개발 명령어에 `npm run db:migrate` 추가. 바뀐 결정: `pg` 설치를 T04에서 T03으로 앞당김(사용자 확정) | D4 합의에서 이벤트 형식이 바뀌면 `segments`를 고치는 마이그레이션 필요 | D2를 정하면 T04, D3을 정하면 T12 |
| 2026-10-12 | 저장소 정리 | 완료 | `main`을 `origin`에 push(T02 준비와 T02 커밋 5개). `CLAUDE.md`의 폴더 구조에 `docker-compose.yml`, 개발 명령어에 `docker compose up -d` 추가 | 없음 | T03 |
| 2026-10-12 | T02 | 완료 | 브랜치 `feat/t02-postgres-env`에서 `docker-compose.yml`(PostgreSQL 16), 환경변수 로더 `config/env.ts`, `dev` 스크립트의 `--env-file` 연결, 지침서 `T02.md` 작성. 완료 기준 9개 통과, `main`에 병합. `TODO.md` 단계에 없던 것: 서버 tsconfig에 `types: ["node"]` 추가(없으면 `process` 타입 검사 실패), 포트를 `127.0.0.1`로만 열기, compose 프로젝트 이름 고정, `PORT` 정수 확인 | 없음 | T03 (T04는 D2, T12는 D3 결정 필요) |
| 2026-10-12 | T02 준비 | 완료 | 커밋과 저장소 상태를 확인하고 T02 단계 9개와 착수 전 확인 4개를 `TODO.md`에 정리. 코드는 바꾸지 않음 | 착수 전 확인 4개는 사용자가 확정. Docker 데몬이 꺼져 있었음 | T02 구현(다른 세션) |
| 2026-10-11 | 프로젝트 문서 | 완료 | `docs/project-overview.md` 작성(프로젝트 소개, 구성, STT 이벤트 필드와 사용 예시) | 예정으로 적은 부분은 해당 작업 완료 때 갱신 | T19, T02 |
| 2026-10-11 | T05 | 완료 | 브랜치 `feat/t05-stt-adapter`에서 `SttEvent` 타입, `SttAdapter` 인터페이스, `MockSttAdapter`, `dev:stt` 추가. 완료 기준 5개 통과, `main`에 병합. 지침서와 다른 점: 워크트리 작업이라 `git switch main` 생략 | 없음 | T19(D4 협의), T02 |
| 2026-10-11 | T05 지침서 | 완료 | `docs/guides/T05.md` 작성, 코드 사전 검증, `main`에 병합 | 없음 | T05 구현 |
| 2026-10-10 | gitignore 정리 | 완료 | 브랜치 `chore/gitignore-claude-md`에서 `CLAUDE.md`를 `.gitignore`에 추가하고 추적 해제. 추천 항목 6개(`.DS_Store`, `.env.*`, `*.log`, `coverage/`, `*.tsbuildinfo`, `.claude` 개인 설정) 추가, `main` 병합과 push | 이전 커밋 3개에는 `CLAUDE.md`가 남아 있음 | T02, T05 |
| 2026-10-10 | 저장소 설정 | 완료 | GitHub private 저장소 `gwangholee507/speech-transcriber-app` 생성, `origin` 연결, `main` push. `CLAUDE.md`에 브랜치 규칙 추가(`main`에는 완성된 버전만, 기능 개발은 새 브랜치) | 브랜치 이름 규칙과 `main` 병합 방식 미정 | T02, T05 |
| 2026-10-10 | T01 | 완료 | 폴더 구조, 설정·소스 파일 생성, 개발 도구 설치, 로컬 git 저장소와 첫 커밋. 완료 기준 5개 통과. 지침서와 다른 점: 주석을 경로 표기 대신 한국어 설명으로 작성(CLAUDE.md 규칙), `@types/node`를 Node 20에 맞춰 `^20`으로 지정(지침서는 버전 미지정), `docs/guides`·`docs/logs` 추가와 CLAUDE.md에 기록·승인·git 규칙 반영(사용자 지시) | 없음 | T02, T05 (T04는 D2, T12는 D3 결정 필요) |
