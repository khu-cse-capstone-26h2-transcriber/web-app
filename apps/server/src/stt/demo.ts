// mock STT가 내보내는 이벤트를 콘솔에 찍어 보는 확인용 스크립트.
import type { SttAdapter } from './adapter';
import { MOCK_SENTENCES, MockSttAdapter } from './mock';

const adapter: SttAdapter = new MockSttAdapter();
let partialCount = 0;
let finalCount = 0;

await adapter.start((event) => {
  if (event.type === 'partial') partialCount += 1;
  else finalCount += 1;

  console.log(
    `[stt] ${event.type.padEnd(7)} #${event.segmentId} ${event.startMs}-${event.endMs}ms ${event.text}`,
  );

  // 문장 목록을 한 바퀴 돌면 멈춘다. 멈춘 뒤 프로세스가 끝나면 타이머가 정리된 것이다.
  if (finalCount === MOCK_SENTENCES.length) {
    void adapter.stop().then(() => {
      console.log(`[stt] stopped - partial ${partialCount}개, final ${finalCount}개`);
    });
  }
});
