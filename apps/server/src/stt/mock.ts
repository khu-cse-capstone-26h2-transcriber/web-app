// 정해진 문장을 단어 단위로 흘려보내는 가짜 STT. 실제 STT가 붙기 전까지 쓴다.
import type { SttAdapter, SttEventHandler } from './adapter';

export const MOCK_SENTENCES = [
  '안녕하세요 오늘 회의를 시작하겠습니다',
  '첫 번째 안건은 일정 공유입니다',
  '다음 주까지 초안을 정리해 주세요',
];

export interface MockSttOptions {
  sentences?: string[];
  // 단어 하나가 나오는 간격(ms)
  intervalMs?: number;
}

export class MockSttAdapter implements SttAdapter {
  private readonly sentences: string[];
  private readonly intervalMs: number;
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(options: MockSttOptions = {}) {
    this.sentences = options.sentences ?? MOCK_SENTENCES;
    this.intervalMs = options.intervalMs ?? 200;
  }

  async start(onEvent: SttEventHandler): Promise<void> {
    if (this.timer) throw new Error('이미 시작된 어댑터입니다');

    let segmentId = 0;
    let wordCount = 0;
    let elapsedMs = 0;
    let startMs = 0;

    // 문장 목록을 끝까지 내보내면 처음 문장으로 돌아가 stop()까지 반복한다.
    this.timer = setInterval(() => {
      const words = this.sentences[segmentId % this.sentences.length].split(' ');
      wordCount += 1;
      elapsedMs += this.intervalMs;
      const isLastWord = wordCount === words.length;

      onEvent({
        type: isLastWord ? 'final' : 'partial',
        segmentId,
        text: words.slice(0, wordCount).join(' '),
        startMs,
        endMs: elapsedMs,
      });

      if (isLastWord) {
        segmentId += 1;
        wordCount = 0;
        startMs = elapsedMs;
      }
    }, this.intervalMs);
  }

  async stop(): Promise<void> {
    clearInterval(this.timer);
    this.timer = undefined;
  }
}
