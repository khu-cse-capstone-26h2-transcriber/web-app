// 기기(audiostackd)가 HTTP로 보낸 결과를 세션에 넣는 어댑터 (T20, 방식 A).
// 인식은 기기에서 하므로 켜고 끌 것이 없다. 수신 경로(device/routes.ts)가 push로 이벤트를 넣는다.
import type { SttEvent } from '@app/shared';
import type { SttAdapter, SttEventHandler } from './adapter';

export class DeviceSttAdapter implements SttAdapter {
  private onEvent: SttEventHandler | undefined;

  async start(onEvent: SttEventHandler): Promise<void> {
    this.onEvent = onEvent;
  }

  // 멈춘 뒤에는 onEvent를 부르지 않는다(SttAdapter 약속).
  async stop(): Promise<void> {
    this.onEvent = undefined;
  }

  // 멈춘 뒤에 온 이벤트는 버리고 false를 돌려준다.
  push(event: SttEvent): boolean {
    if (!this.onEvent) return false;
    this.onEvent(event);
    return true;
  }
}
