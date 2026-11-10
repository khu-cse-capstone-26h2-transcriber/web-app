# 팀원에게 물을 것 — 현황

2026-11-10 · 이광호

앱 파트가 박지윤(AI)·김범수(하드웨어)에게 물어야 했던 것을 한곳에 모았습니다. 팀원 저장소(`stt-engine`, `audio-stack`)를 읽어 이미 답이 있는 것(1장)과 아직 물어야 할 것(2장)으로 나눴습니다. 그동안 질문은 [`guides/T19.md`](guides/T19.md) '파트별로 받아야 할 답', [`d4-stt-questions.md`](d4-stt-questions.md), T29 시험 결과, `TODO.md` 'T26 준비', [`guides/T30.md`](guides/T30.md) '남은 질문'에 흩어져 있었습니다.

- 확인 방법: GitHub에서 문서와 코드를 읽기만 했습니다. 데몬과 엔진을 실행해 보지는 않았습니다. '근거'가 코드인 답은 코드를 읽고 판단한 것이라 기기에서 다시 확인합니다.
- 답이 오면 이 문서의 표를 고치고, 결정이 바뀌면 해당 지침서에도 적습니다.

## 저장소 현황 (2026-11-10)

| 저장소 | 담당 | 내 권한 | 마지막 변경 | 지난 확인(11-09·11-10) 뒤 바뀐 것 |
| --- | --- | --- | --- | --- |
| `web-app` | 이광호 | 관리자 | 2026-11-10 `9fef6da` | PR #1 병합(T20) |
| `stt-engine` | 박지윤(`v33jy`) | 읽기 | 2026-11-09 `c8f5bd3`, Release `v0.1` | 없음. PR·이슈 없음 |
| `audio-stack` | 김범수(`jerrybeomsoo`) | 읽기 | 2026-11-04 `7ee28fa` | 없음. 박지윤이 올린 PR #1(`d3ef336`)·#2(`a775c37`)는 열린 채이고 리뷰·댓글이 없음. 이슈 없음 |
| `demo-repository` | 김범수 | 읽기 | 2026-10-12 | GitHub 예제 템플릿(조직을 만들 때 생김). 프로젝트와 관계없음 |

- 조직 멤버는 세 명(`gwangholee507`, `jerrybeomsoo`, `v33jy`)입니다.
- 조직의 Projects 보드는 보지 못했습니다. 지금 `gh` 토큰에 `read:project` 권한이 없습니다.
- 김범수의 답은 저장소 어디에도 없습니다(커밋, PR 리뷰, 이슈 모두 없음).

## 1. 저장소에서 답을 찾은 것

| 질문 (처음 나온 곳) | 답 | 근거 | 남은 확인 |
| --- | --- | --- | --- |
| 서버 실행 계정이 `ctrl.sock`에 쓸 권한 (T19 김범수 표) | 데몬은 제어 소켓도 엔진 소켓과 같은 함수로 만들고 권한을 `0660`으로 둡니다. 서비스는 `root` 사용자, `audio` 그룹으로 돌아서 `root:audio 0660`이 됩니다. **서버를 돌리는 계정을 `audio` 그룹에 넣으면 씁니다** | `audio-stack` `src/ipc_server.cpp:56`(`chmod 0660`), `:203`(제어 소켓), `systemd/audiostack.service`(`User=root`, `Group=audio`). 엔진 소켓이 `root:audio 0660`인 것은 `stt-engine` `README.md`에도 적힘 | T27에서 기기로 확인. 서비스로 설치하지 않고 직접 띄우면 띄운 사용자 기준이 됨 |
| 백엔드가 `503`을 주면 얼마 간격으로, 언제까지 다시 보내는지 (T29) | 실패하면 3초(`retry_seconds`) 기다린 뒤 그 항목을 대기열 맨 앞에 다시 넣고, 포기하지 않고 계속 보냅니다. 요청 하나의 시간 제한은 3초(`timeout_ms`)입니다 | `src/daemon.cpp:150-178`, `config/audiostack.conf` | 없음 |
| 대기열이 차면 세션 통지나 `/end`도 버려지는지 (T29) | 버려질 수 있습니다. 대기열(512개)이 찬 상태에서 새 항목이 들어오면 종류를 가리지 않고 가장 오래된 것부터 버리고 `dropped`에 셉니다. 다시 보내려던 항목은 대기열이 차 있으면 `dropped`에 세지 않고 사라집니다 | `src/daemon.cpp:125-127`, `:177` | 바꿔 달라는 요청은 2장 HW-5 |
| `4xx`를 받으면 어떻게 하는지 (T19 김범수 표) | 지금은 `2xx`가 아니면 모두 다시 보냅니다(`4xx` 포함). 앱 서버는 그래서 `2xx`나 `503`으로만 답합니다(T19 '수신 경로') | `src/daemon.cpp:164-178` | 바꿔 달라는 요청은 2장 HW-5 |
| 녹음 중 엔진 연결이 끊기면 데몬은 어떻게 하는지 (T29) | 데몬은 세션을 연 채 오디오를 계속 받고, 최근 10초(`cache_seconds`)를 늘 들고 있습니다. 엔진이 다시 접속하면 같은 세션의 `SESSION_BEGIN`과 최근 10초를 다시 보내고, 엔진은 같은 세션으로 이어 받습니다(이미 받은 오디오는 버림). 10초보다 오래 끊기면 그 앞 오디오는 받아쓰지 못합니다. 서버에는 아무것도 알리지 않습니다 | `src/daemon.cpp:440-475`, `stt-engine` `ENGINE_CONTRACT.md` 2절 | 서버는 그 세션을 '녹음 중'으로 두면 됩니다. 엔진 프로세스를 새로 띄운 경우에는 시각 기준이 어긋날 수 있음(박지윤이 하드웨어에 요청, `ENGINE_CONTRACT.md` 5절 5). 엔진이 죽은 것을 서버가 아는 방법은 여전히 없음(HW-4) |
| 기기에서 STT와 데몬을 어떻게 띄우는지 (D4 질문 G1) | 데몬은 `audiostack.service`(`root`, `Restart=always`, `sudo bash scripts/install_service.sh`로 설치). 엔진은 `whisper-engine.service`(`ubuntu` 계정, `audio` 그룹, `audiostack.service` 뒤에 뜸, `Restart=always`). 엔진 서비스는 설치 스크립트가 없어 파일 맨 위 주석대로 손으로 설치합니다. 앱 서버를 띄우는 방법은 앱 파트가 정합니다 | `audio-stack` `systemd/`, `scripts/install_service.sh`, `stt-engine` `whisper-engine.service` | 앱 서버를 서비스로 등록할지는 T21·T26에서 정함 |
| NPU 접근 권한 (`TODO.md` 'T26 준비') | 따로 적힌 권한은 없습니다. 엔진은 기본 `ubuntu` 계정과 `audio` 그룹으로 돌고, AI 파트가 이 구성으로 보드에서 측정했습니다 | `whisper-engine.service`, `run_stream.sh` | T26에서 같은 계정으로 실행해 확인 |
| 기기에서 마이크 없이 WAV를 넣는 경로 (`TODO.md` 'T26 준비', T19) | 두 가지입니다. (1) `tools/feed_wav.py`: 데몬 없이 엔진 소켓에 WAV를 넣고 결과를 백엔드로 보냅니다. 노트북 T29·T20과 같은 방법입니다. (2) ALSA `snd-aloop`과 `scripts/feed_wav_loopback.sh`: 실제 데몬을 거칩니다. AI 파트가 보드에서 이 방법으로 시험했습니다(보드 커널에 `snd-aloop`이 있음) | `audio-stack` `docs/UBUNTU-INPUT.md`, `stt-engine` `ENGINE_CONTRACT.md` 4절 | (2)를 쓸 때는 데몬의 백엔드 경로를 앱 경로로 바꿈(HW-1) |
| NPU용 모델, 엔진 실행 방법, 기기에서 실제로 받아써 봤는지 (`TODO.md` 'T26 준비') | 모델은 Release `v0.1`에 있습니다(`enc_10s.bin` 107 MB, `dec_10s.bin` 223 MB 등. 보드에서 `gh release download`로 받음). 실행은 `build.sh`, `set_governor.sh performance`, `run_engine.sh` 순서입니다. 보드 NPU에서 실제 `audiostackd`를 거쳐 받아쓰기를 확인했습니다(CER 3.5%, final 지연 평균 1.07초) | `stt-engine` `README.md` '설치'·'실행', Release `v0.1`, `ENGINE_CONTRACT.md` 4절 | QNN 런타임을 받는 방법은 AI-1 |
| 보드 지연(평균 0.98초)이 partial을 켠 상태인지 (T29) | 켠 상태입니다(중간 결과 2초, `dec_10s.bin`) | `stt-engine` `README.md` '보드 성능' 표 | 보드에서도 partial이 final을 늦추는지는 측정 없음(AI-5) |
| 빈 final을 버리기로 한 결정을 박지윤에게 알리기 (T19 '다른 파트에 알릴 것') | 2026-11-09 web-app PR #1 `convert.ts:57` 코멘트로 알렸고, 그 뒤 PR이 병합됨 | web-app PR #1 리뷰 코멘트 | 없음 |
| 백엔드를 기기 밖 서버에 둘 때 (D8 대안 B) | 데몬은 `[backend] base_url`만 바꾸면 됩니다. 웹 버튼 제어는 `ctrl.sock`을 `socat`으로 TCP에 열거나, 데몬이 계속 녹음하고 웹은 히스토리만 보는 방법을 문서가 제안합니다 | `audio-stack` `docs/INTEGRATION-WEB.md` 2절 | D8을 정할 때 씀 |

## 2. 아직 물어야 할 것

질문 문장은 그대로 보낼 수 있게 썼습니다. '시점'은 그 답이 늦어도 필요한 작업입니다.

### 김범수(하드웨어)

| 번호 | 질문 | 왜 묻는지 | 시점 | 처음 나온 곳 |
| --- | --- | --- | --- | --- |
| HW-1 | `audiostack.conf`의 백엔드 경로 세 줄을 `/api/device/sessions` 아래로 바꿔도 될까요? | 앱 서버는 이미 이 경로로 받습니다(T20). 기본값 `/api/sessions`는 앱에서 웹 버튼의 녹음 시작 API라, 그대로 두면 서버가 mock 세션을 켭니다. `INTEGRATION-WEB.md`에도 경로를 앱 백엔드에 맞추라고 적혀 있습니다 | T26 전 | T19 |
| HW-2 | 켜도 녹음하지 않는 대기 상태와 `session start`·`session stop` 명령을 넣어 주실 수 있나요? 대기 중에 엔진 결과가 오면 어떻게 할까요? | 물리 버튼이 주 제어입니다. 지금 제어 명령은 `status`, `stats`, `level`, `session rotate`, `shutdown`뿐이고, 데몬은 켜자마자 세션을 엽니다 | T27 전 | T19 |
| HW-3 | 물리 버튼은 누가 어떻게 읽나요? 어느 GPIO 핀을 쓰고, 어떤 프로그램이 읽어서 데몬에 알리나요? | 데몬에 버튼 코드가 없고, 문서에는 'GPIO 버튼도 `session rotate`를 부른다'고만 적혀 있습니다 | T27 전 | T19 |
| HW-4 | 엔진 상태(`ready`, `error`)와 엔진 연결 끊김을 백엔드에 HTTP로 보내 주실 수 있나요? 된다면 경로와 본문을 함께 정하고 싶습니다 | 지금은 로그에만 남아, 엔진이 죽어도 서버 세션이 '녹음 중'으로 남고 화면에도 표시가 없습니다(T29에서 재현). 박지윤도 같은 것을 요청했습니다(`ENGINE_CONTRACT.md` 5절 3) | T27 전 | T19(F1), T29 |
| HW-5 | `4xx`는 다시 보내지 않고 버리며 `dropped`에 세도록 바꿀 수 있나요? 대기열이 찼을 때 세션 통지와 `/end`는 버리지 않게 할 수 있나요? | 지금은 `4xx`도 계속 다시 보내 뒤 결과가 막히고, 대기열이 차면 세션 통지나 `/end`가 버려져 서버 세션이 '녹음 중'으로 남을 수 있습니다(1장) | T27 전 | T19, T29 |
| HW-6 | audio-stack PR #1(세션 교체 직후 결과의 세션 번호, `session_done` 뒤 `/end`)과 #2(`feed_wav.py --backend-prefix`)를 언제 리뷰·병합할 수 있나요? | PR #1이 없으면 세션을 바꿀 때 앞 세션의 마지막 문장이 새 세션으로 가거나 `/end` 뒤에 옵니다. PR #2가 병합되면 [`device-ingest.md`](device-ingest.md)에서 PR 브랜치를 받는 줄을 뺄 수 있습니다 | T26 전 | T19, T29 |
| HW-7 | 마이크는 3.5 mm 헤드셋과 XVF3800 중 무엇을 쓰나요? 실물은 누가 가지고 있나요? | 기본 설정은 3.5 mm(`plughw:0,2`, 48 kHz)이고 XVF3800 설정도 있습니다. 3.5 mm는 마이크 달린 헤드셋이 따로 있어야 합니다. 기기는 이광호가 보관하므로 마이크도 함께 있어야 T27을 할 수 있습니다 | T27 전 | D5 |
| HW-8 | (박지윤 요청, 앱도 영향을 받음) `PROTOCOL.md`의 시각 설명 'segment-relative'를 세션 기준으로 고치고, `SESSION_BEGIN`에 세션 시작 시각을 넣어 주실 수 있나요? | 앱은 엔진 시각을 세션 기준으로 저장합니다. 엔진을 새로 띄우면 시각 기준이 어긋날 수 있습니다 | T27 전 | `ENGINE_CONTRACT.md` 5절 4·5 |

### 박지윤(AI)

| 번호 | 질문 | 왜 묻는지 | 시점 | 처음 나온 곳 |
| --- | --- | --- | --- | --- |
| AI-1 | 보드에 `~/rubikpi/sdk250`(QNN 2.50 런타임)이 없으면 어디서 받나요? 쓰시던 묶음을 받을 수 있을까요? | 저장소와 Release `v0.1`에 없고 Qualcomm QNN SDK 2.50에서 따로 받아야 합니다(`README.md` '저장소에 없는 것'). T26에서 엔진을 돌리려면 필요합니다 | T26 전 | 새 질문 |
| AI-2 | 보드에 `~/rubikpi`가 있으면 OS를 다시 설치해도(지워도) 될까요? `apt full-upgrade`로 커널이 바뀌어도 엔진이 돌까요? | T30의 다시 설치 여부와 업그레이드 범위를 정합니다. `sdk250`은 다시 구하기 어려울 수 있습니다(AI-1) | T30 착수 때(보드에 `~/rubikpi`가 있을 때만) | T30 |
| AI-3 | partial을 안정시킬 계획이 있나요? 보드 기본 설정에서 `--lp-min -0.5`나 `--adapt`를 켤 계획이 있나요? | T28에서 partial 22개 중 9개가 final과 크게 달랐고, T29 긴 음성에서 숨소리가 `하아 하아`라는 문장으로 저장됐습니다. 두 옵션은 `README.md`에 있지만 기본은 꺼져 있습니다 | T26 전 | T19, T29 |
| AI-4 | 보드에서 글자 있는 partial을 낸 구간이 빈 final로 끝나는 경우가 얼마나 자주 있나요? | 앱은 빈 final을 버려서, 이때 흐린 partial이 다음 결과가 올 때까지 화면에 남습니다. 자주 생기면 처리 방법을 다시 봅니다 | T26 | T29 |
| AI-5 | 보드에서 partial을 끄면 final 지연이 줄어드나요? | 노트북 CPU에서는 partial을 켜면 final 지연이 평균 1.4초 늘었습니다(2.25초 → 3.64초) | T26 | T29 |
| AI-6 | `samples/fleurs_ko_30s.txt` 첫 줄 뒷절('수소 원자는 양성자 하나와 전자 하나로 구성되므로')이 음성에 없습니다. 고쳐 주실 수 있나요? | 원래 정답으로 재면 CER이 21.43%, 뒷절을 빼면 7.56%입니다. 2026-11-10에도 그대로입니다 | 아무 때나 | T29 |
| AI-7 | 엔진과 앱 서버·PostgreSQL을 같은 보드에서 돌릴 때 CPU를 어떻게 나눌까요? | 엔진은 가장 빠른 코어에 자신을 고정하고(`run_stream.sh`의 `taskset`), CPU 클럭을 최고로 고정한 상태(`set_governor.sh performance`)에서 측정했습니다. 앱 서버와 PostgreSQL이 같은 코어를 쓰면 엔진 지연이 늘 수 있습니다 | T26 | 새 질문(D8 근거) |

### 두 분 모두

| 번호 | 질문 | 왜 묻는지 | 시점 | 처음 나온 곳 |
| --- | --- | --- | --- | --- |
| ALL-1 | 팀 전체 마일스톤과 주차별 일정을 정할 수 있을까요? | 우선순위와 T26·T27 시점을 맞춥니다 | 가능한 빨리 | D7 |

## 3. 앱 작업에 주는 의미

- **T30**: 보드 계정은 기본 `ubuntu` 그대로 둡니다. `whisper-engine.service`가 `User=ubuntu`, `WorkingDirectory=/home/ubuntu/rubikpi/runner`로 고정돼 있습니다. 보드에 `~/rubikpi/sdk250`이 있으면 지우지 않습니다(AI-1, AI-2).
- **T21**: 서버와 PostgreSQL을 잴 때 CPU 클럭 정책(`cat /sys/devices/system/cpu/cpufreq/policy*/scaling_governor`)도 함께 적습니다. AI 파트의 엔진 측정값은 `performance` 기준입니다.
- **T26**: 보드에서 `gh auth login`(비공개 저장소의 Release를 받음), 엔진 빌드 패키지(`g++`, `python3-numpy`), 데몬 빌드(`scripts/setup_rubikpi.sh`, `scripts/build.sh`), 엔진 실행 계정의 `audio` 그룹이 필요합니다. 데몬을 띄울 때는 기기의 `/etc/audiostack/audiostack.conf`에서 경로 세 줄을 바꿉니다(설치 스크립트가 이미 있는 설정 파일을 덮어쓰지 않음). WAV 입력 경로 두 가지는 1장에 있습니다.
- **T27**: 서버를 돌리는 계정을 `audio` 그룹에 넣으면 `ctrl.sock`에 쓸 수 있습니다. 대기 상태, 물리 버튼, 엔진 상태 전달은 HW-2~HW-4의 답이 있어야 합니다.

## 관련 문서

- [`guides/T19.md`](guides/T19.md): STT 연동 합의 초안. 김범수 표에 2026-11-10 코드 확인 결과를 함께 적음
- [`d4-stt-questions.md`](d4-stt-questions.md): D4 질문 목록과 답 칸
- [`guides/T30.md`](guides/T30.md): Rubik Pi 초기 설정
- [`stt-engine` `README.md`](https://github.com/khu-cse-capstone-26h2-transcriber/stt-engine/blob/main/README.md), [`ENGINE_CONTRACT.md`](https://github.com/khu-cse-capstone-26h2-transcriber/stt-engine/blob/main/ENGINE_CONTRACT.md) (비공개 저장소)
- [`audio-stack` `docs/INTEGRATION-WEB.md`](https://github.com/khu-cse-capstone-26h2-transcriber/audio-stack/blob/main/docs/INTEGRATION-WEB.md), [`docs/UBUNTU-INPUT.md`](https://github.com/khu-cse-capstone-26h2-transcriber/audio-stack/blob/main/docs/UBUNTU-INPUT.md)
