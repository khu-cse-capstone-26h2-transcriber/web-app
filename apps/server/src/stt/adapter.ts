// STT 구현체가 따라야 하는 인터페이스. mock과 실제 STT를 바꿔 끼우는 경계다.
import type { SttEvent } from '@app/shared';

export type SttEventHandler = (event: SttEvent) => void;

export interface SttAdapter {
  // 인식을 시작한다. 이벤트가 생길 때마다 onEvent를 호출한다.
  start(onEvent: SttEventHandler): Promise<void>;
  // 인식을 멈춘다. 멈춘 뒤에는 onEvent를 호출하지 않는다.
  stop(): Promise<void>;
}
