# 기기 연동 시험 (보드 없이 Mac에서)

기기(audiostackd)가 보내는 결과를 이 서버가 받아 녹음 화면에 띄우는지 확인합니다. 보드 대신 audio-stack의 `tools/feed_wav.py`가 데몬처럼 WAV를 엔진에 넣고 결과를 서버로 보냅니다. 엔진은 NPU 대신 ONNX로 돌아서 받아쓴 글자와 속도는 보드와 다릅니다(연결 확인용).

```text
feed_wav.py(데몬 대신) ─AUDIO→ stt-engine(ONNX) ─RESULT→ feed_wav.py ─HTTP→ 이 서버 /api/device/sessions ─SSE→ 녹음 화면
```

## 준비 (처음 한 번)

`stt-engine`이 비공개 저장소라 모델을 받으려면 GitHub CLI가 필요합니다(`brew install gh` 뒤 `gh auth login` 한 번).

```bash
git clone https://github.com/khu-cse-capstone-26h2-transcriber/stt-engine.git
git clone https://github.com/khu-cse-capstone-26h2-transcriber/audio-stack.git
# --backend-prefix가 audio-stack에 병합되기 전에는 그 브랜치를 받습니다 (아래 '알아 둘 것')
git -C audio-stack fetch https://github.com/v33jy/audio-stack.git feat/feed-wav-backend-paths && git -C audio-stack checkout FETCH_HEAD
python3 -m venv stt-venv && stt-venv/bin/pip install numpy onnxruntime
mkdir onnx && gh release download v0.1 -R khu-cse-capstone-26h2-transcriber/stt-engine -p '*.onnx' -D onnx   # 약 1.1 GB
```

## 실행 (터미널 4개)

```bash
# 1. 서버와 웹 (이 저장소, README대로 DB와 .env 준비)
npm run db:migrate && npm run dev:server
npm run dev:web                     # http://localhost:5173 열기: '녹음하고 있지 않습니다'

# 2. 데몬 대신 WAV 보내기 (audio-stack)
python3 audio-stack/tools/feed_wav.py stt-engine/samples/fleurs_ko_30s.wav --socket /tmp/astk/engine.sock \
  --backend-url http://localhost:3000 --backend-prefix /api/device/sessions

# 3. 엔진 (stt-engine)
cd stt-engine && WHISPER_RUNNER="../stt-venv/bin/python fake_runner.py" ../stt-venv/bin/python board_stream.py \
  --astk /tmp/astk/engine.sock --once --bins ../onnx --cut early --partial 2
```

엔진이 모델을 불러오면(몇 초) 녹음 화면이 저절로 녹음 중으로 바뀌고, 약 26초 동안 문장이 나온 뒤 히스토리로 넘어갑니다. 정답 문장은 `stt-engine/samples/fleurs_ko_30s.txt`입니다.

## 알아 둘 것

- 녹음 중에 웹의 종료 버튼을 누르면 서버 세션만 닫히고 엔진은 계속 보냅니다. 그 뒤 결과는 서버가 버립니다(T27 전까지).
- 실제 데몬에서는 `audiostack.conf`의 `[backend]` 세 경로를 `/api/device/sessions`로 바꿉니다(`docs/guides/T19.md` '수신 경로').
- `--backend-prefix`는 [audio-stack PR #2](https://github.com/khu-cse-capstone-26h2-transcriber/audio-stack/pull/2)로 추가하는 옵션입니다. 병합되면 위의 `fetch`, `checkout` 줄은 빼도 됩니다.
