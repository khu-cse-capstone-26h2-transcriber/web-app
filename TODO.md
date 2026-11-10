# TODO — speech-transcriber

Claude Code가 작업하면서 직접 갱신하는 파일입니다. 끝낸 항목은 `[x]`로 체크하고, 맨 아래 '작업 기록'에 한 줄을 추가합니다. 사용자는 이 파일을 직접 고치지 않습니다.

- 체크는 지침서의 완료 기준을 실행해 확인한 뒤에만 합니다.
- 우선순위: P0 = 크리티컬 패스, P1 = 핵심 기능 완성, P2 = 확장.
- 단계: 선행 작업 기준 착수 순서입니다. 같은 단계는 병행할 수 있습니다.
- 협의: 팀원 합의가 필요한 파트입니다. `[AI]` = 박지윤, `[하드웨어]` = 김범수.
- 지침서는 `docs/guides/Txx.md`에 있습니다.
- 일자별 상세 기록은 `docs/logs/YYYY-MM-DD.md`에 있습니다.
- 프로젝트 설명은 `docs/project-overview.md`에 있습니다.

마지막 갱신: 2026-11-10

## 오늘의 작업 (2026-11-02) — 실제 모델 연동과 Rubik Pi 올리기 준비

진행 순서(사용자 결정): 노트북에서 실제 모델 연동, Rubik Pi에 서버, Rubik Pi에서 모델과 서버 연동, 하드웨어 파이프라인. 이번 목표는 세 번째 단계까지이고, 하드웨어 파이프라인은 내용을 파악한 뒤 시작합니다.

의존성: T20은 T19 합의를 기다리지 않고 노트북에서 끝냅니다(2026-11-10 사용자 결정). 수신 경로 이름처럼 하드웨어 동의가 필요한 것은 T19에 남깁니다. T26은 T20과 T21이 모두 끝나야 시작합니다. T21은 T20 없이 mock으로도 할 수 있지만 사용자 결정에 따라 T20 뒤에 합니다. T17은 막는 작업이 없어 T19 뒤에 합니다.

### 오늘 할 일

- [x] 1. 박지윤(AI)에게 자료 받기 — 막는 작업: T20 — 2026-11-09 `stt-engine` 저장소의 `ENGINE_CONTRACT.md`·`README.md`로 답 받음(모델은 QNN 변환본·Release `v0.1`, 엔진 코드는 `stt-engine`, Mac은 ONNX로만, WAV 도구는 `feed_wav.py`, 결과 예시, partial 누적)
  - 모델 파일 형식(학습 원본, ONNX, QNN 변환본 중 무엇이 있는지)과 받는 방법
  - 엔진 코드와 실행 방법 (조직 저장소에 없음)
  - NPU 없이 CPU로 엔진을 돌릴 수 있는지
  - WAV를 엔진에 넣는 도구의 위치 (`audio-stack`에 없음)
  - 실제 결과 예시(H2), partial 텍스트가 누적인지(E2)
- [x] 2. 김범수(하드웨어)에게 확인 — 막는 작업: T21 — 2026-11-10 해결: 기기는 사용자가 보관하고 OS는 Ubuntu 24.04로 정함(사용자 결정), `audio-stack` 문서는 앱이 쓰는 부분이 코드와 같음(대조)
  - 기기를 언제 어디서 쓸 수 있는지, SSH 계정과 네트워크 — 기기는 사용자가 보관(2026-11-10). SSH와 네트워크는 T21에서 직접 설정
  - 설치된 OS 판 (`CLAUDE.md`와 `audio-stack` README가 다름) — Ubuntu 24.04로 확정(2026-11-10 사용자 결정). AI 파트가 측정한 보드도 Ubuntu 24.04(2026-11-09)
  - `audio-stack` 문서가 최신인지 (마지막 커밋 2026-10-12) — `main`은 `7ee28fa`(11-04) 그대로, 박지윤이 올린 PR #1·#2 리뷰 대기(2026-11-09). 문서는 11-04 `7ee28fa`에서 코드와 함께 갱신됐고, 앱이 쓰는 부분(백엔드 POST 3개, 재전송, `ctrl.sock`, 세션 시작·교체·종료)은 코드와 같음(2026-11-10 대조)
- [ ] 3. 세션 주체와 연동 방식을 정해 T19 지침서 작성 (추천: 데몬 형식의 수신 경로 + WAV 재생 스크립트) — 초안 `docs/guides/T19.md` 작성(2026-11-03), AI 답 받음(2026-11-09), 앱 결정 3개(2026-11-09), 하드웨어 합의 대기
- [x] 4. 노트북 준비: 새 Python(시스템 3.9.6, Homebrew 3.12.14, 판은 모델 형식을 본 뒤 정함), 16 kHz 모노 한국어 WAV 1~2개와 정답 문장 — Homebrew Python 3.12 가상환경과 zeroth-korean 테스트 WAV 100개·정답 준비(2026-11-03, ~/Desktop/stt-lab)

### T20 노트북 연동 준비

- 선행: 위 1, 4 (3은 기다리지 않음, 2026-11-10)
- 지침서: `docs/guides/T20.md` (2026-11-10)
- 노트북에서는 NPU와 `audiostackd`를 쓸 수 없어 같은 모델을 CPU나 Mac GPU로 돌립니다. 이때의 정확도와 지연은 기기 값이 아닙니다.
- 완료 확인: WAV 입력이 웹 자막, DB, 히스토리, 내보내기까지 이어지는지
- 결과: 2026-11-10 완료, `docs/guides/T20.md` '결과'

### T21 Rubik Pi에 서버 올리기 준비

- 기기 초기 설정(OS 확인, 네트워크, SSH, 시간대)은 T30에서 먼저 함(지침서 `docs/guides/T30.md`, 2026-11-10 사용자 결정)
- OS: Ubuntu 24.04(2026-11-10 사용자 결정). 기기에서 `cat /etc/os-release`로 확인(다시 설치하면 데이터가 지워짐)
- 네트워크: 서버에 로그인이 없으므로 믿을 수 있는 네트워크에서만 실험
- 설치: `nvm`으로 Node 22.22.0, Docker 없이 `apt`로 PostgreSQL(Ubuntu 24.04 기본 판은 16으로 개발 환경과 같음) (2026-11-10 사용자 확인)
- 실행: 기기용 `.env`(비밀번호는 예시 값과 다르게), `npm ci`, `npm run db:migrate`, `npm run dev:server`
- 착수 전 결정: 웹앱 제공 방법. 지금 Vite는 `localhost`에서만 열립니다. `vite preview --host`로 열지, Express가 `apps/web/dist`를 내보낼지 정합니다.
- 완료 확인: 노트북 브라우저에서 mock 녹음, 자막, 히스토리까지 동작
- 측정: 서버와 PostgreSQL의 메모리·CPU, `free -h`, `df -h`
- 앞선 작업에서 넘어온 확인: listen 주소(T04), 세그먼트 대기열 상한(T08), final 목록 메모리(T09), 시간대 데이터(T11), 웹 빌드 제공(T12), 기기 시계와 쿼리 시간 제한(T13), Node 22 설치(T25)

### T26 Rubik Pi에서 모델과 서버 연동 준비

- 박지윤: NPU용 모델, QNN 런타임, 엔진 실행 방법, 기기에서 실제 받아쓰기를 확인했는지 — 2026-11-10 `stt-engine` 저장소로 답 찾음: 모델은 Release `v0.1`, 실행은 `build.sh`·`set_governor.sh performance`·`run_engine.sh`, 보드 NPU에서 실제 `audiostackd`를 거쳐 확인함. 남은 것: QNN 런타임(`sdk250/`)을 받는 방법(`docs/team-questions.md` AI-1)
- 김범수: NPU 접근 권한, 마이크 없이 WAV를 넣는 경로 — 2026-11-10 저장소로 답 찾음: 엔진은 기본 `ubuntu` 계정·`audio` 그룹으로 돎, WAV는 `feed_wav.py` 또는 `snd-aloop`(실제 데몬을 거침). 남은 것: `audiostack.conf` 경로 변경 동의(HW-1), audio-stack PR #1·#2 병합(HW-6)
- 측정: final 지연, CER, 세 프로그램을 함께 돌릴 때의 메모리·CPU (D8 판단 근거)

## 함께 확인할 것

### 사용자가 직접 할 일

- [ ] **D4 협의 요청** — 박지윤(AI), 김범수(하드웨어)에게 STT 연동 방식 협의를 요청합니다. T05가 끝나 D4의 '늦어도 필요한 시점'이 됐고, T19가 이 합의에 막혀 있습니다. 박지윤 답은 받았고(2026-11-09) 김범수 답만 남았습니다.
  - 들고 갈 초안: `docs/project-overview.md`의 'STT 이벤트' 절
  - 정할 것: STT 호출 방법, 오디오 입력 형식, partial/final 이벤트 형식
- [ ] D7(팀 전체 마일스톤과 주차별 일정) — '가능한 빨리'로 적힌 항목입니다. D4 협의 때 함께 꺼낼 수 있습니다.
- [ ] 박지윤에게 PR #1 병합 방식 알리기 (T20 push 전)
- [ ] 팀원에게 남은 질문 보내기 — `docs/team-questions.md` 2장(김범수 HW-1~8, 박지윤 AI-1~7, 둘 다 ALL-1). 보낼지와 보내는 방법은 사용자가 정함

### 결정하면 풀리는 작업

- [x] D3(웹앱 빌드 도구) 결정 — 2026-10-19 Vite로 확정. T12 완료.
- [x] D6(히스토리 다운로드 포맷) 결정 — 2026-10-27 txt와 md 둘 다로 확정. T11 완료.

## 기능별 작업

### 프로젝트 기반

- [x] T01 모노레포 스캐폴딩 — P0 · 단계 1 · 선행: 없음 · 협의: 없음
- [x] T02 로컬 PostgreSQL(docker-compose)과 환경변수 로더 — P0 · 단계 2 · 선행: T01 · 협의: 없음
- [x] T03 DB 스키마 v0와 마이그레이션 스크립트 — P0 · 단계 3 · 선행: T02 · 협의: 없음
- [x] T04 서버 뼈대(HTTP 서버, `/health`, 에러 처리, pg 연결 풀) — P0 · 단계 3 · 선행: T01, T02 · 협의: 없음 · 서버 프레임워크: Express(D2 확정)

### STT 연동

- [x] T05 STT 어댑터 인터페이스와 mock STT — P0 · 단계 2 · 선행: T01 · 협의: 없음 · 이 인터페이스가 T19 협의의 초안
- [ ] T19 STT 연동 인터페이스 합의와 문서화 — P0 · 단계 3 · 선행: T05 · 협의: **[AI, 하드웨어]** (D4) · 세션 주체, 결과 전달 경로, `segmentId`, 시각 기준을 먼저 정함 · 상태: 진행 중(지침서 초안 작성, AI 답 받음 2026-11-09, 앱 결정 3개 2026-11-09, 하드웨어 합의 대기)
- [x] T20 실제 STT 어댑터로 mock 교체(노트북, WAV 입력) — P0 · 단계 4 · 선행: T05, T29 · 협의: **[AI]** · 상태: 완료(2026-11-10). web-app PR #1을 병합 커밋으로 넣고 고칠 것 3개(웹이 새 기기 세션을 놓침, `/end` 실패 처리, 중단 표시 '중단됨')를 고침. 노트북 시험(fleurs, mock 중 기기 세션, curl 20단계) 통과. 수신 경로 이름은 하드웨어 동의 대기(T19)
- [x] T28 실제 모델 서버 연동 실험(노트북, WAV 입력, 방식 B) — P1 · 단계 4 · 선행: T05 · 협의: 없음
- [x] T29 기기 수신 경로(web-app PR #1) 노트북 실제 모델 시험(WAV 입력) — P1 · 단계 4 · 선행: T05 · 협의: 없음(결과는 [AI]·[하드웨어]에 전달)

### 녹음 세션과 실시간 전달

- [x] T06 세션 시작/종료 API와 상태 전이 — P0 · 단계 4 · 선행: T04, T05 · 협의: 없음
- [x] T07 SSE 스트림 엔드포인트(mock 이벤트, heartbeat) — P0 · 단계 5 · 선행: T06 · 협의: 없음
- [x] T08 세그먼트 DB 저장(partial/final 구분) — P0 · 단계 5 · 선행: T03, T06 · 협의: 없음
- [x] T09 SSE 재연결 이어받기(`Last-Event-ID`) — P1 · 단계 6 · 선행: T07, T08 · 협의: 없음

### 웹앱 화면

- [x] T12 웹앱 뼈대(React, 라우팅, API 클라이언트) — P0 · 단계 2 · 선행: T01 · 협의: 없음 · D3: Vite(2026-10-19 확정)
- [x] T13 녹음 제어 UI — P0 · 단계 5 · 선행: T06, T12 · 협의: 없음
- [x] T14 실시간 트랜스크립트 화면 — P0 · 단계 6 · 선행: T07, T12 · 협의: 없음
- [x] T15 SSE 끊김 처리(자동 재연결, 상단 배너) — P1 · 단계 7 · 선행: T14 · 협의: 없음

### 세션 히스토리

- [x] T10 히스토리 API(목록, 상세) — P1 · 단계 6 · 선행: T08 · 협의: 없음
- [x] T11 히스토리 내보내기 API — P1 · 단계 7 · 선행: T10 · 협의: 없음 · D6: txt·md(2026-10-27 확정)
- [x] T16 히스토리 화면과 다운로드 버튼 — P1 · 단계 8 · 선행: T10, T11, T12 · 협의: 없음

### 검증

- [x] T17 핵심 로직 단위 테스트(Vitest) — P1 · 단계 8 · 선행: T09, T11 · 협의: 없음
- [x] T18 M1 점검: mock STT로 녹음 → 실시간 자막 → 히스토리 엔드투엔드 — P0 · 단계 9 · 선행: T13, T14, T16 · 협의: 없음 · **첫 마일스톤**
- [x] T25 T18에서 찾은 문제 처리(Node 22 고정, 의존성 취약점, 서버 상태 표시) — P1 · 단계 10 · 선행: T18 · 협의: 없음

### 기기 연동

- [ ] T30 Rubik Pi 초기 설정(OS 확인, 네트워크, SSH, 시간) — P0 · 단계 10 · 선행: 없음 · 협의: **[AI]**(다시 설치·업그레이드 전 `~/rubikpi` 확인) · 상태: 지침서 작성(2026-11-10)
- [ ] T21 Rubik Pi에 서버 올리기와 실측(mock STT, Node, PostgreSQL, 메모리·CPU) — P0 · 단계 10 · 선행: T18, T30 · 협의: **[하드웨어]** (D5) · 순서: T20 뒤 · 상태: 착수 가능(2026-11-10, 기기는 사용자가 보관). 착수 전 결정: 웹앱 제공 방법
- [ ] T26 Rubik Pi에서 실제 모델과 서버 연동(WAV 입력) — P0 · 단계 11 · 선행: T20, T21 · 협의: **[AI, 하드웨어]**
- [ ] T27 하드웨어 파이프라인 연동(`audiostackd`, 마이크, 물리 버튼) — P0 · 단계 12 · 선행: T26 · 협의: **[하드웨어]** · 상태: 보류(내용 파악 뒤 시작)

### 확장

- [ ] T22 모드 전환(일반 녹음/AI 질의) UI와 API 자리 — P2 · 단계 6 · 선행: T13 · 협의: **[하드웨어]** (물리 버튼 방식일 때)
- [ ] T23 트랜스크립트 검색 — P2 · 단계 7 · 선행: T10 · 협의: 없음
- [ ] T24 확장 기능 Must/Should/Could 분류 확정 — P2 · 단계 10 · 선행: T18 · 협의: **[AI, 하드웨어]** (D7)

## 팀원 합의가 필요한 항목

| 결정 | 내용 | 협의 파트(상대) | 막는 작업 | 늦어도 필요한 시점 |
| --- | --- | --- | --- | --- |
| D4 | STT 호출 방법, 오디오 입력 형식, partial/final 이벤트 형식. 2026-10-17 종합본(1차 멘토링 자료)에서 일부 답: 마이크는 `audiostackd`가 읽음, partial 지원, 구간은 6초 이후 단어 사이·최대 10초. 남은 쟁점: 결과 전달 방향(데몬이 백엔드로 HTTP POST 중), 세션 ID 발급과 시작·종료 주체, `seq`와 `segmentId`, STT 주소. 상세는 `docs/d4-stt-questions.md` 답 칸. 녹음 시작·종료의 주 제어는 기기 물리 버튼(2026-10-20 사용자 결정). 버튼 신호가 백엔드에 오는 경로, 웹에서 시작할 때 데몬에 알리는 방법, 화면이 다른 곳에서 시작한 녹음을 알아채는 방법도 함께 정함. 2026-11-02 `audio-stack` 확인: 데몬은 켜면 바로 세션을 만들고, 경로는 `audiostack.conf`에서 바꿀 수 있음. 서버와 다른 점은 `docs/logs/2026-11-02.md`. 2026-11-09 AI 파트가 `stt-engine` `ENGINE_CONTRACT.md`로 엔진 결과 형식을 확정(partial 누적, 구간마다 final 한 번, 세션 기준 ms, 빈 final `empty: true`, 끝 신호 `session_done`). 남은 쟁점: 세션 주체와 수신 경로(하드웨어 동의). 앱 결정(2026-11-09): `segmentId`는 서버가 붙임, 빈 final은 버림, 세션 교체 때 앞 세션은 `ended`. 상세는 `docs/guides/T19.md` '2026-11-09 확인 결과' | [AI](박지윤), [하드웨어](김범수) | T19, T20, T26, T27 | T05 완료 직후 |
| D5 | 입출력(마이크 등). 기기는 사용자가 보관(2026-11-10). OS는 Ubuntu 24.04로 확정(2026-11-10 사용자 결정, AI 파트가 측정한 보드도 24.04). 마이크는 3.5 mm 포트 계획. `audio-stack` 기본 설정은 3.5 mm 헤드셋(`plughw:0,2`, 48 kHz)이고 XVF3800 USB 마이크 설정도 있음. 무엇을 쓸지와 실물을 누가 가졌는지 확인 필요(`docs/team-questions.md` HW-7, 2026-11-10) | [하드웨어](김범수) | T21, T26 | T18 완료 전 |
| D7 | 팀 전체 마일스톤과 주차별 일정 | [AI], [하드웨어] 모두 | 우선순위 재조정 | 가능한 빨리 |
| D8 | PostgreSQL 메모리 설정, SQLite 전환 여부 | [하드웨어](김범수), 실측 후 | T21 이후 | T21 완료 후 |

## 작업 기록

새 기록은 맨 위에 추가합니다. 상태는 `완료`, `진행 중`, `막힘` 중 하나입니다.

| 날짜 | 작업 ID | 상태 | 한 일 | 막힌 점·남은 일 | 다음에 할 작업 |
| --- | --- | --- | --- | --- | --- |
| 2026-11-10 | 팀 저장소 확인 | 완료 | 브랜치 `docs/team-repo-findings`(`docs/t30-device-setup`에서)에서 조직 저장소를 읽기만 해 확인. `stt-engine` `c8f5bd3`·`audio-stack` `7ee28fa` 그대로, audio-stack PR #1·#2 리뷰 없음, 김범수 답 없음. 물을 것 중 12개는 저장소에서 답을 찾음(`ctrl.sock`은 `root:audio 0660`이라 서버 계정을 `audio` 그룹에 넣으면 됨, `503`·`4xx`는 3초마다 계속 다시 보냄, 대기열이 차면 세션 통지·`/end`도 버려질 수 있음, 엔진이 끊겨도 데몬은 세션 유지, NPU는 `ubuntu` 계정, WAV 경로 두 가지 등). 새 파일 `docs/team-questions.md`, `T19.md`·`T30.md`·`d4-stt-questions.md`·`project-overview.md` 갱신. 데몬·엔진 실행과 코드 변경 없음 | 남은 질문 김범수 8개, 박지윤 7개(새 질문: QNN 런타임 받는 방법, 같은 보드에서 CPU 나누기), 둘 다 1개. 보낼지는 사용자가 정함. 조직 Projects는 토큰 권한(`read:project`)이 없어 못 봄. 커밋 안 함 | 질문 보내기, T30 착수 |
| 2026-11-10 | T30 | 진행 중 | 브랜치 `docs/t30-device-setup`에서 지침서 `T30.md` 작성(9단계, 단계별 확인 명령, 2단계 판단 표). Thundercomm 매뉴얼 1.0.0-u 확인. 사용자 결정: 초기 설정을 T21과 나눠 T30으로 | 기기 작업 전. 네트워크, 다시 설치 여부, 업그레이드 범위는 착수 때 정함 | T30 착수(보드 연결) |
| 2026-11-10 | T21 준비 | 완료 | 사용자 결정: 기기는 사용자가 보관, OS는 Ubuntu 24.04, Node 22·PostgreSQL 16 설치 계획 그대로. audio-stack `main`(`7ee28fa`)의 문서(`PROTOCOL.md`, `INTEGRATION-WEB.md`, `audiostack.conf`)와 데몬 코드(`daemon.cpp`)를 대조해 앱이 쓰는 부분(백엔드 POST 3개, 재전송, `ctrl.sock`, 세션 시작·교체·종료)이 같음을 확인. `project-overview.md`, `T19.md`, `d4-stt-questions.md`의 OS·기기 줄 갱신, 로컬 `CLAUDE.md` 갱신(사용자 승인). 코드 변경 없음 | 차이 2개(시각 'segment-relative' 문구, 대기열이 찼을 때 재전송 항목이 세지 않고 사라짐). 기기에서 데몬을 돌릴 때 `audiostack.conf` 경로 세 줄을 `/api/device/sessions`로 바꿔야 함(T26). 착수 전 결정: 웹앱 제공 방법. `main`에 병합, push 안 함 | T21 지침서(웹앱 제공 방법 결정) |
| 2026-11-10 | T20 | 완료 | 브랜치 `feat/t20-device-ingest`에서 web-app PR #1(`7b0c408`)을 병합 커밋 `b6c6eb6`으로 넣고 고칠 점 3개를 커밋: 중단 표시 '중단됨'(`2c1cf54`), 기기 `/end`가 실패하면 세션을 남겨 다시 닫음(`aaa77f8`), 끊긴 사이에 다른 녹음이 시작되면 녹음 화면에서 이어 보임(`cbc9fdf`). 완료 기준 통과: typecheck, 테스트 42개, 웹 빌드, `003` 적용, fleurs 5 = 화면 5 = psql 5, mock 중 기기 세션에서 웹이 새 세션(#58)을 이어 보임, curl 20단계(14가 이제 `503`, DB가 돌아오면 `ended`와 final 저장). 문서: `project-overview.md` '기기 결과 수신 경로' 절, `T19.md` 진행 표, `T20.md` '결과'. 지침서와 다른 점: 같은 뜻의 주석 2곳(`session.ts`, `HistoryListPage.tsx`)도 고침 | push와 PR #1 '병합됨' 확인(박지윤에게 먼저 알림), T29 시험 자원 정리(사용자 확인), 수신 경로 이름은 하드웨어 동의 대기. 커밋하고 `main`에 병합(fast-forward), push 안 함 | T21 착수 전 결정(웹앱 제공 방법), 김범수 답 받기 |
| 2026-11-10 | T20 | 진행 중 | 브랜치 `feat/t20-device-ingest`에서 지침서 `T20.md` 작성. 사용자 확정: PR #1은 T20 브랜치에 병합 커밋으로 넣고 고친 뒤 한꺼번에 `main`에 병합·push(박지윤에게는 push 전에 사용자가 알림), T19 합의를 기다리지 않고 노트북에서 끝냄. 고칠 점 3개의 원인을 코드로 확인, `applyMessage`는 주석만 고치기로 함. 코드 변경 없음 | 구현 전, 커밋 안 함 | T20 1일차(PR #1 병합, 고칠 점 3개) |
| 2026-11-09 | T29 | 완료 | T29 결과로 남은 결정 9개를 사용자에게 받아 `T29.md` '결과를 보고 정한 것'에 기록. 결과는 팀원 공유·PR 코멘트 안 함, PR #1은 병합 뒤 앱 파트가 T20에서 고침(새 기기 세션은 웹에서 진행 중인 세션 재확인, `/end` 실패 처리, 중단 표시 '중단됨'), 웹 종료 한계는 T27까지 그대로, 엔진이 죽는 문제는 하드웨어 F1 답을 기다림, 빈 final 버림 유지, 시험 자원은 PR #1 병합·T20까지 둠. 코드 변경 없음 | PR #1 병합 시점과 담당 미정. 이 기록과 함께 커밋해 `main`에 병합, push 안 함 | T20 지침서, 김범수 답 받기 |
| 2026-11-09 | T29 | 완료 | 브랜치 `docs/t29-guide`에서 지침서 1·2일차 시험을 이어서 함. `~/Desktop/stt-lab`에 엔진(`c8f5bd3`)·audio-stack(PR #2 `a775c37`)·ONNX·`engine-venv`, PR #1 워크트리(`7b0c408`)와 DB `transcriber_pr1`. 완료 기준 통과: fleurs 5 = 서버 5 = 화면 5 = psql 5(시각 0.1초 안), 빈 final 2개 버림, demo_long 22문장 CER 4.71%·final 지연 평균 3.64초(Mac CPU, partial 끄면 2.25초), 끊김·서버 종료·curl 16단계 기대대로. 지침서와 다른 점: txt·md는 버튼 대신 같은 내보내기 주소를 curl로 받음(내장 브라우저 파일 저장 회피). 코드 변경 없음 | PR #1 고칠 점 후보 3개(mock 녹음 중 기기 세션이 시작되면 웹이 새 세션을 놓침, 중단 이유 표시, `/end` 503 뒤 세션이 녹음 중으로 남고 final 잃음). 엔진이 죽으면 `feed_wav.py`도 죽어 세션이 녹음 중으로 남음(F1 근거). fleurs 정답 첫 줄에 음성에 없는 절. 워크트리·시험용 DB 남김. 커밋(2026-11-09, `03b6d56`)하고 `main`에 병합, push 안 함 | PR #1 의견과 팀원 전달 내용 정하기, 김범수 답 받기 |
| 2026-11-09 | T29 | 진행 중 | 브랜치 `docs/t29-guide`에서 지침서 `T29.md` 작성. 사용자 확정: 새 작업 T29, PR #1(`7b0c408`)은 `~/Desktop/stt-lab/web-app-pr1` 워크트리(커밋 안 함), 시험용 DB `transcriber_pr1`, 클론·모델은 `~/Desktop/stt-lab`. 코드 변경 없음 | 시험 전(엔진 코드·ONNX 모델·Docker 준비 필요), 커밋 안 함 | T29 1일차(준비, 기본 흐름, 엔진 결과 처리, 측정) |
| 2026-11-09 | T19 | 진행 중 | 브랜치 `docs/t19-app-decisions`에서 앱 파트 결정 3개를 사용자에게 받아 `T19.md`('앱 파트 결정' 절, 수신 경로 표, 변환 규칙), `d4-stt-questions.md` 7행, `project-overview.md`(기술 결정 표 '엔진 결과 처리', 미정 목록)에 반영. 사용자 확정: `segmentId`는 서버가 붙임, 빈 final은 버림(AI 파트 요청과 다름), 세션 교체 때 앞 세션은 `ended`로 닫고 늦은 final 30초 저장. 셋 다 web-app PR #1의 지금 동작. PR #1 `convert.ts:57` 코멘트에 결정을 답으로 올림, 로컬 `CLAUDE.md` 갱신(둘 다 사용자 승인). 코드 변경 없음 | 하드웨어 답 대기. 늦은 final이 히스토리 상세에 바로 보이는지는 T20에서 확인. `main`에 병합(2026-11-09, `37a55ab`), push 안 함 | 김범수 답 받기 |
| 2026-11-09 | T19 | 진행 중 | 브랜치 `docs/stt-engine-answers`에서 새 저장소 `stt-engine`(박지윤)의 `ENGINE_CONTRACT.md`로 AI 질문 10개의 답을 확인해 `T19.md`('2026-11-09 확인 결과'), `d4-stt-questions.md` 답 칸, `project-overview.md`에 반영. 엔진 동작은 AI 파트가 정하는 항목이라 확정으로 둠. audio-stack PR #1·#2와 web-app 초안 PR #1(박지윤) 확인: web-app PR #1은 typecheck·테스트 42개 통과, 고칠 점 2개(`/end` 실패 때 세션이 녹음 중으로 남음, 빈 final을 버림). 로컬 `CLAUDE.md`의 미정 항목·기술 결정 갱신(사용자 승인). 코드 변경 없음. web-app PR #1에 리뷰 코멘트 2개를 올림(ingest.ts:101 종료 순서, convert.ts:57 빈 final). | 하드웨어 답과 PR 리뷰 대기. 앱이 정할 것: `segmentId` 주체, 빈 final 처리, 세션 교체 때 앞 세션 상태. `main`에 병합하고 push(2026-11-09, `066a5be`) | PR #1 수정 확인, 김범수 답 받기, 앱 결정 3개 |
| 2026-11-04 | T17 | 완료 | 브랜치 `test/t17-core-unit-tests`에서 지침서 `T17.md`(구현 전 작성), Vitest 5.0.5(루트, `vitest.config.ts`, `npm test`), 테스트 파일 5개·37개: 포매터(shared·server), 이벤트 재개(`parseLastEventId`, `SessionManager.subscribe`는 `vi.mock`으로 DB 함수를 가짜로), 세그먼트 병합(`applyMessage`). 동작 코드는 `export` 두 곳만 바꿈. 완료 기준 통과(DB 꺼진 상태 37개 통과, typecheck, 웹 빌드, 영역마다 일부러 틀리게 바꾸면 실패). 사용자 확정: 세 영역 모두, export와 DB 가짜, 루트에 하나. 지침서와 다른 점: npm 10 버그로 `--legacy-peer-deps` 설치(`npm ci`는 옵션 없이 통과) | `applyMessage`가 뒤 구간 final에도 앞 partial을 지움(주석보다 넓음, T20에서 다시 봄). `main`에 병합하고 push(2026-11-04, `2665906`) | 팀원 답 받기(오늘 할 일 1·2), T19 |
| 2026-11-03 | T28 | 완료 | 브랜치 `feat/t28-local-whisper`에서 실험용 어댑터 `stt/local.ts`와 `STT_MODE`(mock 기본, local) 추가(`24b1177`), 엔진은 `~/Desktop/stt-lab/stream_engine.py`. 완료 기준 통과: 웹에서 실제 모델 받아쓰기가 자막·DB·히스토리·txt까지 이어짐, 16구간 = 로그 16 = psql 16, CER 3.66%, final 지연 평균 0.84초(최대 1.23초), 중간 종료 때 말하던 구간 저장, 서버 종료·엔진 경로 오류(503) 처리 | partial 22개 중 9개가 final과 크게 다름(안정화 필요, AI 파트와 이야기). 시작 약 9초. 확인용 세션 #51~#55. `main`에 병합하고 push(2026-11-03, `91e5c88`) | T19 협의, T17 |
| 2026-11-03 | T28 | 진행 중 | 브랜치 `feat/t28-local-whisper`에서 지침서 `T28.md` 작성. 사용자 확정: 새 작업 T28, partial은 1초마다 다시 받아써서 포함, 입력은 WAV 파일만, 엔진은 `~/Desktop/stt-lab`. 코드 변경 없음 | 구현 전 | T28 구현 |
| 2026-11-03 | 모델 로컬 실험 1단계 | 완료 | 저장소 밖 `~/Desktop/stt-lab`에서 공개 모델 `seastar105/whisper-small-komixv2`를 받아 zeroth-korean 테스트 100개로 측정. Mac GPU float16 파일당 0.67초(실시간 대비 0.065), CER 6.91%(숫자 표기 차이 포함, 숫자 없는 문장 4.43%). 긴 구간 누락 1건, 모델 구간 시각은 쓸 수 없음. 서버 코드 변경 없음 | AI 파트 가중치와 같은지 확인 필요. 노트북 값이라 기기 값과 다를 수 있음 | 2단계 서버 연동 실험 지침서 |
| 2026-11-03 | T19 | 진행 중 | 브랜치 `docs/t19-guide`에서 지침서 `T19.md` 초안과 일지 작성. `audio-stack` 코드와 대조해 수신 경로·응답 규칙, `SttEvent` 변환 규칙, 시작·종료 순서, 파트별 질문을 정리. 사용자 확정(앱 파트 제안): 데몬이 세션 주체, 서버 정수 번호 유지와 열 추가, `segmentId`는 서버가 붙임, 시각은 엔진 값 우선이고 없으면 서버가 받은 시각. 코드 변경 없음 | 박지윤·김범수 합의 대기. 데몬의 4xx 재시도와 대기 상태 없음은 김범수에게 요청. 지침서 초안은 T28 병합 때 `main`에 들어가 push(2026-11-03, `70442a3`) | 팀원에게 질문 전달, 합의 뒤 T19 마무리 (기다리는 동안 T17) |
| 2026-11-02 | 기기 연동 계획 | 완료 | 오늘 할 일과 T20·T21·T26 준비 사항을 의존성 순서로 정리. `audio-stack` 문서와 서버를 대조해 다른 점을 일지에 기록. T26·T27 추가. 사용자 확정: 노트북 연동, 기기에 서버, 기기에서 모델 연동, 하드웨어 파이프라인 순서이고 이번 목표는 세 번째 단계까지. 코드 변경 없음 | D4의 세션 주체 미정. 모델과 엔진 코드 수령 전. 기기 사용 시점 미확인 | T19 |
| 2026-10-30 | T25 | 완료 | 브랜치 `fix/t18-findings`에서 지침서 `T25.md`(구현 전 작성)를 쓰고 T18의 찾은 문제 3개 처리. Node 기준을 22.22.0으로 올려 `.nvmrc`·`engines`(`^22.12.0`)·`.npmrc`(`engine-strict`)로 고정, `@types/node` ^22. `npm audit fix`(`body-parser` 2.4.0, `qs` 6.17.1, lockfile만). `useServerHealth.ts`: 실패하면 5초 뒤 다시, 5초 시간 제한(`서버가 답하지 않습니다`). 완료 기준 통과(새 클론에서 Node 20은 `EBADENGINE`, 22는 통과, audit 0개, 서버 재시작 뒤 0~1초 안에 `정상`, `SIGSTOP` 18초 뒤 표시). 사용자 확정: Node 22, audit fix, 5초 다시 확인과 시간 제한, 한 작업으로 묶음. 지침서와 다른 점: 앱 브라우저 패널이 가려져 시각 측정은 Playwright로 | 기기에 Node 22를 까는 방법은 T21([하드웨어]). 로컬 DB에 확인용 세션 #48·#49 추가(`sessions` 45행, `segments` 698행). `main` 병합과 push 안 함 | T17 (T21은 D5 기기 수령 대기) |
| 2026-10-29 | T18 | 완료 | 브랜치 `feat/t18-m1-e2e`에서 지침서 `T18.md`(점검 전 작성)를 쓰고, 저장소 밖 새 클론(`main` `bfb6597`, Node 20.20.2)과 빈 DB `transcriber_m1`에서 M1 점검. 완료 기준 통과(설치·마이그레이션, 녹음 #1의 자막·상세·txt·md·psql 일치, 375px, 서버 `SIGSTOP`·`SIGCONT` 뒤 다시 연결 #2, 녹음 중 서버 재시작 `중단됨` #3). M1 통과. 사용자 확정: 직접 점검, 새 클론·빈 DB, 기본 흐름+실패 경로 2개, 문제는 기록만, 결과는 지침서에만. 지침서와 다른 점: 앱 미리보기 실행기로 띄운 Vite가 프록시에서 `EAGAIN`이라 서버들을 셸 백그라운드로 띄움 | 찾은 문제 3개(기록만): Node 판 미기재(`.nvmrc`·`engines` 없음, 이 컴퓨터 nvm 기본 22.22.0), `npm audit` `body-parser`(high)·`qs`(moderate), 서버 재시작 뒤 위쪽 서버 상태가 14초 늦게 돌아옴. Safari·`409` 문구 미확인. `transcriber_m1` DB 남김. `main`에 병합하고 push(2026-10-29) | 찾은 문제 처리 여부 결정, T17 (T21은 D5 기기 수령 대기) |
| 2026-10-28 | T16 | 완료 | 브랜치 `feat/t16-history-screen`에서 공용 표시 함수 `shared/src/format.ts`(`SESSION_STATUS_LABELS`, `formatStartedAt`, `formatOffset`, `formatDuration`, `recordingLengthMs`. 서버 `export/format.ts`에서 옮김), 웹 `client.ts`(`requestFile`, `send`·`responseError`로 묶음)·`endpoints.ts`(`exportSession`)·`DownloadButtons.tsx`·`HistoryListPage.tsx`·`HistoryDetailPage.tsx`, 지침서 `T16.md`(구현 전 작성). 완료 기준 통과(내보내기 74개 바이트 비교, 목록·상세가 psql·txt와 같음, Playwright로 실제 저장, DB 꺼짐·서버 꺼짐 문구, 녹음 중 세션). 사용자 확정: `fetch`로 받아 저장, 표시 함수 shared로, 목록에 길이 없음, 상세는 문장별 시각. 지침서와 다른 점: 앱 브라우저 창이 파일을 저장하지 않아 실제 저장은 Playwright로 확인 | `409` 화면 문구는 버튼을 막아 확인 못 함. Safari 저장 미확인. 로컬 DB에 확인용 세션 #47 추가(`sessions` 43행, `segments` 583행). `main`에 병합하고 push(2026-10-28) | T17 또는 T18 (T18은 선행 작업이 모두 끝남) |
| 2026-10-27 | T11 | 완료 | 브랜치 `feat/t11-history-export`에서 공용 `ExportFormat`·`EXPORT_FORMATS`(`shared/src/export.ts`), 포매터 `export/format.ts`(txt·md, 순수 함수), 라우트 `GET /api/sessions/:id/export?format=txt\|md`(`routes.ts`, 404를 `requireSession`으로 묶음), 지침서 `T11.md`(구현 전 작성). 완료 기준 통과(curl로 헤더·본문·psql 비교, interrupted, 문장 없음, 409·400·404·503, Vite 프록시, 1시간 넘는 값). 사용자 확정: D6 txt·md 둘 다, 머리말 아래 문장별 시작 시각, 한국 시간 고정, 길이는 마지막 문장 끝 시각(`ended_at` 보정의 답), 녹음 중이면 409. 지침서와 다른 점: `Content-Disposition` 파일 이름에 따옴표 없음(Express 동작). `main`에 병합하고 push(2026-10-27) | 브라우저 저장 확인과 `formatDuration` 공유 여부는 T16. 기기 Node의 시간대 데이터는 T21. 로컬 DB에 확인용 세션 #46 추가(`sessions` 42행, `segments` 579행) | T16 (T17도 시작 가능) |
| 2026-10-23 | T15 | 완료 | 브랜치 `feat/t15-sse-reconnect`에서 `useSessionStream.ts`(직접 다시 연결: `error`나 30초 무소식이면 닫고 1·2·4·8·10초 간격으로 `GET /api/sessions/active`를 확인해 같은 세션이면 새로 열고, 끊긴 사이에 끝났으면 히스토리 상세로), `ConnectionBanner.tsx`(녹음 화면 맨 위, '지금 다시 연결', 회복 문구 3초), `useServerHealth.ts`·`Layout.tsx`(서버 상태를 30초마다와 다시 연결될 때 확인, `Outlet` context), `RecordPage.tsx` 수정, 지침서 `T15.md`(구현 전 작성). 완료 기준 통과(브라우저: preview 끄고 켜기, 서버 `SIGSTOP`·`SIGCONT`, 끊긴 사이 종료, 서버 재시작 `interrupted`, psql과 같음). 사용자 확정: 직접 다시 연결, 끊긴 사이에 끝나면 히스토리 상세, 서버 상태 다시 확인 포함, 기본값(30초 판정, 간격, 배너 문구). 구현하면서 정한 것: 세션 확인 5초 시간 제한, 처음 접속 실패도 끊김으로 처리. `main`에 병합하고 push(2026-10-23) | 프록시 502에서 `EventSource`가 멈춰 T14 문서의 '계속 다시 접속'이 틀렸음(overview 고침). 끊긴 사이 기기 버튼으로 시작한 새 녹음은 D4 뒤 [하드웨어]. 로컬 DB에 확인용 세션 #42~#45 추가(`sessions` 41행, `segments` 577행) | D6을 정하면 T11 (결정 없이 시작할 수 있는 P0·P1 없음) |
| 2026-10-22 | T14 | 완료 | 완료 기준 재확인(typecheck, 빌드, 브라우저: #40 시작·자동 스크롤·새로고침·밖에서 종료 72개, #41 웹 버튼 종료 13개, psql과 같음, 콘솔 에러 없음). 지침서 `T14.md` 작성(구현 뒤 작성, 사용자 결정 4개, 구현하면서 정한 것 6개, 완료 기준 15개), `project-overview`의 구성 요소 표·폴더 구조·'웹앱' 절·'실시간 스트림' 절 갱신. 다른 워크트리의 파일을 고칠 수 없어 T14 커밋을 `claude/elastic-cohen-4120f0`로 fast-forward해 그 위에서 문서를 쓰고, `main`을 fast-forward로 병합하고 push(2026-10-22) | `409`로 스트림이 멈춘 채 남고 서버가 꺼져도 표시가 없음(T15). 로컬 DB에 확인용 세션 #40·#41 추가(`sessions` 37행, `segments` 431행) | T15 (T11은 D6 결정 필요) |
| 2026-10-21 | T14 | 진행 중 | 브랜치 `feat/t14-live-transcript`에서 `useSessionStream.ts`(`EventSource` 구독, final은 `segmentId`로 덮어쓰기, `ended`면 `onEnded`)·`Transcript.tsx`(final 목록, 흐린 partial 한 줄, 바닥에 있을 때만 자동 스크롤)·`RecordPage.tsx`(버튼 아래 자막, 종료 응답과 `ended` 중 먼저 온 쪽에서 한 번만 히스토리 상세로) 작성. 브라우저 확인(시작, 새로고침, 밖에서 종료, 웹 버튼 종료). 사용자 확정: 녹음 화면 아래, `ended`면 히스토리 상세, partial은 흐린 한 줄 | 지침서 `T14.md`, overview 갱신, `main` 병합. `409`일 때 스트림이 닫힌 채 남음(T15). 로컬 DB에 확인용 세션 #38·#39 추가 | T14 마무리, T15 |
| 2026-10-20 | T13 | 완료 | 브랜치 `feat/t13-record-control`에서 서버 `db/errors.ts`(`isDbUnavailable`)·`http/errors.ts`(DB에 닿지 못하면 `503 DB_UNAVAILABLE`), 웹 `endpoints.ts`(세션 API 3개)·`client.ts`(`toApiError`)·`RecordPage.tsx`(녹음 상태, 흐른 시간, 보조 시작·종료 버튼, 409·503 문구, 종료하면 히스토리 상세로), 지침서 `T13.md` 작성. 완료 기준 23개 통과(브라우저 확인 포함). 사용자 확정: 503, 열 때 진행 중인 녹음 확인, 웹 버튼은 보조(주 제어는 물리 버튼), 다른 곳에서 시작한 녹음 감지는 D4 뒤, 종료 후 히스토리 상세. 지침서 없이 정한 것: DB 연결 실패를 에러 코드·메시지로 판정, `toApiError`를 client로 옮김, 에러 코드는 문자열 비교, 흐른 시간은 브라우저 시계. `main`에 병합하고 push(2026-10-20) | 물리 버튼 신호 경로와 외부 시작 감지 [하드웨어](D4). 물리 버튼 종료 때 이동 여부(T14), 기기 시계(D5), 쿼리 시간 제한(T21). 로컬 DB에 확인용 세션 33개, 세그먼트 235행 | T14 |
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
