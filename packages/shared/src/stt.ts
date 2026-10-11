// STT 이벤트 타입 초안. 최종 형식은 T19(D4) 협의에서 확정한다.
export type SttEventType = 'partial' | 'final';

export interface SttEvent {
  // partial: 아직 바뀔 수 있는 중간 결과, final: 확정된 결과
  type: SttEventType;
  // 세션 안에서 0부터 증가한다. 같은 세그먼트의 partial과 final은 같은 값을 쓴다.
  segmentId: number;
  // 세그먼트 시작부터 지금까지의 전체 텍스트 (추가분만 보내지 않는다)
  text: string;
  // 세션 시작 기준 세그먼트 시작·끝 시각(ms)
  startMs: number;
  endMs: number;
}
