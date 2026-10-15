// SSE 응답 하나를 맡는다. 메시지는 data 한 줄에 JSON 하나로 보내고, 일정 간격으로 heartbeat를 보낸다.
import type { Response } from 'express';

export interface SseHeartbeat {
  // 보내는 간격(ms)
  intervalMs: number;
  // 그때마다 보내는 메시지
  message: unknown;
}

export class SseStream {
  private readonly res: Response;
  private readonly heartbeat: SseHeartbeat;
  private timer: ReturnType<typeof setInterval> | undefined;
  private started = false;
  private closed = false;

  constructor(res: Response, heartbeat: SseHeartbeat) {
    this.res = res;
    this.heartbeat = heartbeat;
    // 브라우저가 끊었거나 응답이 끝났다. 끝난 응답에 쓰면 에러가 나므로 이 뒤로는 쓰지 않는다.
    res.on('close', () => this.close());
  }

  // 헤더를 보내 스트림을 연다. 열기 전에는 에러 JSON 같은 다른 응답을 보낼 수 있다.
  start(): void {
    if (this.started || this.closed) return;
    this.started = true;
    this.res.status(200).set({
      'Content-Type': 'text/event-stream; charset=utf-8',
      // 중간에서 캐시하거나 모아 두지 않게 한다. X-Accel-Buffering은 nginx용이다.
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    });
    this.res.flushHeaders();
    this.timer = setInterval(() => this.send(this.heartbeat.message), this.heartbeat.intervalMs);
  }

  send(data: unknown): void {
    if (this.closed) return;
    this.start();
    // JSON.stringify는 줄바꿈을 \n으로 바꾸므로 data 한 줄에 들어간다.
    this.res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  // 스트림을 닫는다. 여러 번 불러도 된다.
  close(): void {
    if (this.closed) return;
    this.closed = true;
    clearInterval(this.timer);
    if (!this.res.writableEnded) this.res.end();
  }
}
