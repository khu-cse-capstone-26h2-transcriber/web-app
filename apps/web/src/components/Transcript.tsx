// 실시간 자막(확정안 F-1·F-5, T39). 확정된 문장을 차례로 보이고, 최신 문장이 가장 크고 밝으며 지난 문장일수록 작고 흐리다.
// 말하는 중인 문장(partial)은 맨 아래에 최신 문장 크기로 흐리게 보이고 끝에 빨간 커서를 붙인다.
// 자막 영역은 녹음 화면의 남은 높이를 채우고, 문장이 적으면 아래쪽에 붙는다.
// 새 문장이 오면 아래로 스크롤한다. 사용자가 위로 올려 읽는 중이면 스크롤하지 않고,
// 지난 문장을 모두 읽을 수 있는 색으로 바꾼다(2026-11-19 사용자 결정). 바닥으로 돌아오면 단계 색으로 돌아간다.
import { useLayoutEffect, useRef, useState } from 'react';
import type { TranscriptState } from '../api/useSessionStream';

// 바닥에서 이만큼(px) 안에 있으면 바닥을 보고 있는 것으로 본다.
const STICK_TO_BOTTOM_PX = 40;

// 최신 확정 문장에서 몇 번째 전인지(0이 최신)에 따른 글자 크기. 그보다 전은 마지막 크기다. 좁은 화면은 작게 쓴다.
const STAGE_SIZES = [
  'text-[22px] leading-[1.55] font-medium tracking-[-0.3px] md:text-[30px]',
  'text-lg leading-[1.6] md:text-[23px]',
  'text-[17px] leading-[1.6] md:text-[21px]',
  'text-base leading-[1.6] md:text-xl',
];
// 같은 기준의 글자색. 그보다 전은 마지막 색(cap0, 가장 흐림)이다.
const STAGE_COLORS = ['text-text', 'text-cap3', 'text-cap2', 'text-cap1', 'text-cap0'];

// age번째 전 확정 문장의 모양. 읽는 중이면 최신이 아닌 문장을 모두 text3으로 밝힌다. 크기는 그대로 둬 위치가 움직이지 않는다.
function finalClass(age: number, reading: boolean): string {
  const size = STAGE_SIZES[Math.min(age, STAGE_SIZES.length - 1)];
  const color =
    age > 0 && reading ? 'text-text3' : STAGE_COLORS[Math.min(age, STAGE_COLORS.length - 1)];
  return `${size} ${color} transition-colors duration-300`;
}

export function Transcript({ finals, partial }: TranscriptState) {
  const boxRef = useRef<HTMLDivElement>(null);
  // 직전에 그렸을 때의 내용 높이. 지금 스크롤 위치가 그때의 바닥 근처였는지로 사용자가 바닥을 보고 있었는지 가린다.
  // scroll 이벤트로 재면 이벤트보다 다시 그리기가 먼저 올 때 위로 올린 스크롤을 바닥으로 되돌린다.
  const prevHeightRef = useRef(0);
  // 사용자가 위로 올려 읽는 중인지. 색을 바꾸는 데만 쓴다.
  const [reading, setReading] = useState(false);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const wasAtBottom =
      prevHeightRef.current - box.scrollTop - box.clientHeight < STICK_TO_BOTTOM_PX;
    if (wasAtBottom) box.scrollTop = box.scrollHeight;
    prevHeightRef.current = box.scrollHeight;
  }, [finals, partial]);

  function handleScroll() {
    const box = boxRef.current;
    if (!box) return;
    setReading(box.scrollHeight - box.scrollTop - box.clientHeight >= STICK_TO_BOTTOM_PX);
  }

  const empty = finals.length === 0 && !partial;

  return (
    <div
      ref={boxRef}
      onScroll={handleScroll}
      aria-live="polite"
      className="min-h-0 flex-1 overflow-y-auto px-5 pb-[18px] md:px-12 md:pb-7"
    >
      <div className="flex min-h-full flex-col justify-end">
        <div className="flex max-w-[880px] flex-col gap-3 pt-6 md:gap-3.5">
          {empty && <p className="text-base text-partial">말을 기다리는 중…</p>}
          {finals.map((segment, index) => (
            <p key={segment.segmentId} className={finalClass(finals.length - 1 - index, reading)}>
              {segment.text}
            </p>
          ))}
          {partial && (
            <p className={`${STAGE_SIZES[0]} text-partial`}>
              {partial.text}
              <span
                aria-hidden="true"
                className="ml-1 inline-block h-[22px] w-[3px] rounded-sm bg-rec align-[-4px] md:h-[30px] md:align-[-5px]"
              />
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
