// 실시간 자막. 확정된 문장을 차례로 보이고, 말하는 중인 문장은 맨 아래에 흐리게 한 줄로 보인다.
// 새 문장이 오면 아래로 스크롤한다. 사용자가 위로 올려 읽는 중이면 스크롤하지 않는다.
import { useLayoutEffect, useRef } from 'react';
import type { TranscriptState } from '../api/useSessionStream';

// 바닥에서 이만큼(px) 안에 있으면 바닥을 보고 있는 것으로 본다.
const STICK_TO_BOTTOM_PX = 40;

export function Transcript({ finals, partial }: TranscriptState) {
  const boxRef = useRef<HTMLDivElement>(null);
  // 직전에 그렸을 때의 내용 높이. 지금 스크롤 위치가 그때의 바닥 근처였는지로 사용자가 바닥을 보고 있었는지 가린다.
  // scroll 이벤트로 재면 이벤트보다 다시 그리기가 먼저 올 때 위로 올린 스크롤을 바닥으로 되돌린다.
  const prevHeightRef = useRef(0);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const wasAtBottom =
      prevHeightRef.current - box.scrollTop - box.clientHeight < STICK_TO_BOTTOM_PX;
    if (wasAtBottom) box.scrollTop = box.scrollHeight;
    prevHeightRef.current = box.scrollHeight;
  }, [finals, partial]);

  const empty = finals.length === 0 && !partial;

  return (
    <div
      ref={boxRef}
      aria-live="polite"
      style={{
        maxHeight: '60vh',
        overflowY: 'auto',
        border: '1px solid #ccc',
        borderRadius: 4,
        padding: '8px 12px',
        lineHeight: 1.6,
      }}
    >
      {empty && <p style={{ color: '#888' }}>말을 기다리는 중…</p>}
      {finals.map((segment) => (
        <p key={segment.segmentId} style={{ margin: '4px 0' }}>
          {segment.text}
        </p>
      ))}
      {partial && <p style={{ margin: '4px 0', color: '#888' }}>{partial.text}</p>}
    </div>
  );
}
