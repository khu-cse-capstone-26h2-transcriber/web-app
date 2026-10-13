# TODO — speech-transcriber

Claude Code가 작업하면서 직접 갱신하는 파일입니다. 끝낸 항목은 `[x]`로 체크하고, 맨 아래 '작업 기록'에 한 줄을 추가합니다. 사용자는 이 파일을 직접 고치지 않습니다.

- 체크는 지침서의 완료 기준을 실행해 확인한 뒤에만 합니다.
- 우선순위: P0 = 크리티컬 패스, P1 = 핵심 기능 완성, P2 = 확장.
- 단계: 선행 작업 기준 착수 순서입니다. 같은 단계는 병행할 수 있습니다.
- 협의: 팀원 합의가 필요한 파트입니다. `[AI]` = 박지윤, `[하드웨어]` = 김범수.
- 지침서는 `docs/guides/Txx.md`에 있습니다.
- 일자별 상세 기록은 `docs/logs/YYYY-MM-DD.md`에 있습니다.
- 프로젝트 설명은 `docs/project-overview.md`에 있습니다.

마지막 갱신: 2026-10-12

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

- [ ] D3(웹앱 빌드 도구) 결정 — D3을 정하면 T12를 시작할 수 있습니다. D2는 Express로 확정되어 T04를 바로 시작할 수 있습니다.

## 기능별 작업

### 프로젝트 기반

- [x] T01 모노레포 스캐폴딩 — P0 · 단계 1 · 선행: 없음 · 협의: 없음
- [x] T02 로컬 PostgreSQL(docker-compose)과 환경변수 로더 — P0 · 단계 2 · 선행: T01 · 협의: 없음
- [x] T03 DB 스키마 v0와 마이그레이션 스크립트 — P0 · 단계 3 · 선행: T02 · 협의: 없음
- [ ] T04 서버 뼈대(HTTP 서버, `/health`, 에러 처리, pg 연결 풀) — P0 · 단계 3 · 선행: T01, T02 · 협의: 없음 · 서버 프레임워크: Express(D2 확정)

### STT 연동

- [x] T05 STT 어댑터 인터페이스와 mock STT — P0 · 단계 2 · 선행: T01 · 협의: 없음 · 이 인터페이스가 T19 협의의 초안
- [ ] T19 STT 연동 인터페이스 합의와 문서화 — P0 · 단계 3 · 선행: T05 · 협의: **[AI, 하드웨어]** (D4)
- [ ] T20 실제 STT 어댑터로 mock 교체 — P0 · 단계 4 · 선행: T05, T19 · 협의: **[AI]**

### 녹음 세션과 실시간 전달

- [ ] T06 세션 시작/종료 API와 상태 전이 — P0 · 단계 4 · 선행: T04, T05 · 협의: 없음
- [ ] T07 SSE 스트림 엔드포인트(mock 이벤트, heartbeat) — P0 · 단계 5 · 선행: T06 · 협의: 없음
- [ ] T08 세그먼트 DB 저장(partial/final 구분) — P0 · 단계 5 · 선행: T03, T06 · 협의: 없음
- [ ] T09 SSE 재연결 이어받기(`Last-Event-ID`) — P1 · 단계 6 · 선행: T07, T08 · 협의: 없음

### 웹앱 화면

- [ ] T12 웹앱 뼈대(React, 라우팅, API 클라이언트) — P0 · 단계 2 · 선행: T01 · 협의: 없음 · 필요한 결정: D3 빌드 도구
- [ ] T13 녹음 제어 UI — P0 · 단계 5 · 선행: T06, T12 · 협의: 없음
- [ ] T14 실시간 트랜스크립트 화면 — P0 · 단계 6 · 선행: T07, T12 · 협의: 없음
- [ ] T15 SSE 끊김 처리(자동 재연결, 상단 배너) — P1 · 단계 7 · 선행: T14 · 협의: 없음

### 세션 히스토리

- [ ] T10 히스토리 API(목록, 상세) — P1 · 단계 6 · 선행: T08 · 협의: 없음
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
| D4 | STT 호출 방법, 오디오 입력 형식, partial/final 이벤트 형식 | [AI](박지윤), [하드웨어](김범수) | T19, T20 | T05 완료 직후 |
| D5 | Rubik Pi OS, 입출력(마이크 등), 기기 수령 시점 | [하드웨어](김범수) | T21 | T18 완료 전 |
| D7 | 팀 전체 마일스톤과 주차별 일정 | [AI], [하드웨어] 모두 | 우선순위 재조정 | 가능한 빨리 |
| D8 | PostgreSQL 메모리 설정, SQLite 전환 여부 | [하드웨어](김범수), 실측 후 | T21 이후 | T21 완료 후 |

## 작업 기록

새 기록은 맨 위에 추가합니다. 상태는 `완료`, `진행 중`, `막힘` 중 하나입니다.

| 날짜 | 작업 ID | 상태 | 한 일 | 막힌 점·남은 일 | 다음에 할 작업 |
| --- | --- | --- | --- | --- | --- |
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
