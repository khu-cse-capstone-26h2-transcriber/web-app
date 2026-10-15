// DB에 저장된 세그먼트 타입. final 이벤트 하나가 한 행이다(T08). 히스토리 상세가 이 모양으로 보낸다.
export interface Segment {
  // 세션 안에서 0부터 증가한다.
  segmentId: number;
  text: string;
  // 세션 시작 기준 세그먼트 시작·끝 시각(ms)
  startMs: number;
  endMs: number;
}
