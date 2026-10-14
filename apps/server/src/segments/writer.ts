// 한 세션의 final 세그먼트를 온 순서대로 DB에 쓴다. 쓰지 못한 것은 메모리에 두고 다시 시도한다.
import type { SttEvent } from '@app/shared';
import type { Pool } from 'pg';
import { upsertSegment } from './repository';

// 값이나 제약 때문에 DB가 거절한 경우(SQLSTATE 22, 23으로 시작). 다시 써도 결과가 같다.
function isRejectedRow(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' && /^(22|23)/.test(code);
}

function describe(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  // 연결 실패는 message가 비어 있는 경우가 있다. 그때는 ECONNREFUSED 같은 코드를 쓴다.
  const code = (error as { code?: unknown }).code;
  return error.message || (typeof code === 'string' ? code : error.name);
}

export class SegmentWriter {
  private readonly pool: Pool;
  private readonly sessionId: number;
  // 아직 쓰지 못한 final. 온 순서대로 쌓이고 맨 앞부터 쓴다.
  private readonly pending: SttEvent[] = [];
  private draining: Promise<void> | undefined;
  private failing = false;
  private saved = 0;

  constructor(pool: Pool, sessionId: number) {
    this.pool = pool;
    this.sessionId = sessionId;
  }

  // DB에 쓴 세그먼트 개수.
  get savedCount(): number {
    return this.saved;
  }

  // 아직 쓰지 못해 메모리에 남은 세그먼트 개수.
  get pendingCount(): number {
    return this.pending.length;
  }

  // final 하나를 쌓고 바로 써 본다. 실패해도 던지지 않는다. 다음 final이나 flush 때 다시 쓴다.
  enqueue(event: SttEvent): void {
    this.pending.push(event);
    // 실패는 drain에서 기록한다.
    void this.flush().catch(() => {});
  }

  // 쌓인 것을 모두 쓸 때까지 기다린다. 쓰지 못하면 던지고, 쌓인 것은 그대로 남는다.
  async flush(): Promise<void> {
    while (this.pending.length > 0) {
      // 쓰기는 한 번에 하나만 돌려 순서를 지킨다.
      this.draining ??= this.drain().finally(() => {
        this.draining = undefined;
      });
      await this.draining;
    }
  }

  private async drain(): Promise<void> {
    while (this.pending.length > 0) {
      const event = this.pending[0];
      try {
        await upsertSegment(this.pool, this.sessionId, event);
        this.saved += 1;
      } catch (error) {
        if (!isRejectedRow(error)) {
          // DB에 닿지 못했다. 맨 앞에 그대로 두고 멈춘다. 실패는 처음 한 번만 알린다.
          if (!this.failing) {
            this.failing = true;
            console.error(
              `[segment] #${this.sessionId} 저장 실패, 메모리에 두고 다시 시도합니다: ${describe(error)}`,
            );
          }
          throw error;
        }
        // 남겨 두면 뒤의 세그먼트와 세션 종료를 막으므로 버린다.
        console.error(
          `[segment] #${this.sessionId} 세그먼트 ${event.segmentId}번을 DB가 거절해 버립니다: ${describe(error)}`,
        );
      }
      this.pending.shift();
    }

    if (this.failing) {
      this.failing = false;
      console.log(`[segment] #${this.sessionId} 밀린 세그먼트를 모두 저장했습니다`);
    }
  }
}
