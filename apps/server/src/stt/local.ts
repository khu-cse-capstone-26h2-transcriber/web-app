// 노트북에서 실제 모델 엔진(Python)을 자식 프로세스로 띄우는 실험용 STT 어댑터 (T28, 방식 B).
// 엔진과는 표준 입출력으로 한 줄에 JSON 하나씩 주고받는다. 약속은 docs/guides/T28.md에 있다.
import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { setTimeout as sleep } from 'node:timers/promises';
import type { SttEventType } from '@app/shared';
import { HttpError } from '../http/errors';
import type { SttAdapter, SttEventHandler } from './adapter';

export interface LocalSttOptions {
  // 엔진을 실행할 Python. 모델 패키지를 깐 가상환경의 python이다.
  python: string;
  script: string;
  // 실제 말하는 속도로 흘려 넣을 16 kHz 모노 WAV
  wav: string;
}

// 모델을 불러오는 데 걸리는 시간. 처음 실행 때는 torch를 불러오느라 더 걸린다.
const READY_TIMEOUT_MS = 30_000;
// stop을 보낸 뒤 엔진이 말하던 구간을 final로 내고 끝나기를 기다리는 시간
const STOP_TIMEOUT_MS = 5_000;
// SIGTERM을 보낸 뒤 끝나기를 기다리는 시간. 넘으면 SIGKILL을 보낸다.
const KILL_TIMEOUT_MS = 2_000;

// 엔진이 내는 한 줄. 값은 믿지 않고 쓰기 전에 확인한다.
interface EngineLine {
  type?: unknown;
  text?: unknown;
  startMs?: unknown;
  endMs?: unknown;
  latencyMs?: unknown;
  device?: unknown;
  message?: unknown;
}

// promise가 ms 안에 끝나면 true.
async function settlesWithin(promise: Promise<unknown>, ms: number): Promise<boolean> {
  return Promise.race([promise.then(() => true), sleep(ms).then(() => false)]);
}

export class LocalSttAdapter implements SttAdapter {
  private readonly options: LocalSttOptions;
  private child: ChildProcessWithoutNullStreams | undefined;
  private onEvent: SttEventHandler | undefined;
  // final을 낼 때마다 1 올린다. 엔진은 번호를 내지 않는다(T19 제안과 같음).
  private segmentId = 0;
  private exited: Promise<void> = Promise.resolve();
  private hasExited = false;
  private notifyReady: (() => void) | undefined;
  private notifyEnd: (() => void) | undefined;

  constructor(options: LocalSttOptions) {
    this.options = options;
  }

  // 엔진을 띄우고 모델이 준비될 때까지 기다린다. 준비되지 못하면 503을 던진다.
  async start(onEvent: SttEventHandler): Promise<void> {
    if (this.child) throw new Error('이미 시작된 어댑터입니다');
    this.onEvent = onEvent;

    const { python, script, wav } = this.options;
    const child = spawn(python, [script, '--wav', wav], { stdio: 'pipe' });
    this.child = child;
    // 실행 파일이 없으면 close 없이 error만 오므로 둘 다 끝난 것으로 본다.
    this.exited = new Promise((resolve) => {
      const done = (detail: string) => {
        if (this.hasExited) return;
        this.hasExited = true;
        console.log(`[stt-local] 엔진 종료 (${detail})`);
        this.notifyEnd?.();
        resolve();
      };
      child.once('error', (error) => done(error.message));
      child.once('close', (code, signal) => done(`code ${code ?? '-'}, signal ${signal ?? '-'}`));
    });
    // 엔진이 먼저 끝났을 때 stop을 써도 서버가 죽지 않게 한다.
    child.stdin.on('error', () => {});
    createInterface({ input: child.stderr }).on('line', (line) => console.log(`[stt-local] ${line}`));
    createInterface({ input: child.stdout }).on('line', (line) => this.handleLine(line));

    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error(`${READY_TIMEOUT_MS / 1000}초 안에 준비되지 않았습니다`)),
          READY_TIMEOUT_MS,
        );
        this.notifyReady = () => {
          clearTimeout(timer);
          resolve();
        };
        void this.exited.then(() => {
          clearTimeout(timer);
          reject(new Error('엔진이 준비되기 전에 끝났습니다'));
        });
      });
    } catch (error) {
      this.onEvent = undefined;
      if (!this.hasExited) child.kill('SIGKILL');
      const reason = error instanceof Error ? error.message : String(error);
      throw new HttpError(503, 'STT_UNAVAILABLE', `STT 엔진을 시작하지 못했습니다: ${reason}`);
    } finally {
      this.notifyReady = undefined;
    }
  }

  // 엔진에 stop을 보내고, 말하던 구간의 final과 end가 올 때까지 기다린다. 늦으면 신호로 끝낸다.
  async stop(): Promise<void> {
    const child = this.child;
    if (!child) return;

    if (!this.hasExited) {
      const ended = new Promise<void>((resolve) => {
        this.notifyEnd = resolve;
      });
      child.stdin.write('stop\n');
      if (!(await settlesWithin(ended, STOP_TIMEOUT_MS))) {
        console.error(`[stt-local] 엔진이 ${STOP_TIMEOUT_MS / 1000}초 안에 끝내지 않아 SIGTERM을 보냅니다`);
        child.kill('SIGTERM');
      }
      if (!(await settlesWithin(this.exited, KILL_TIMEOUT_MS))) {
        console.error('[stt-local] 엔진이 끝나지 않아 SIGKILL을 보냅니다');
        child.kill('SIGKILL');
        await this.exited;
      }
    }
    // 멈춘 뒤에는 onEvent를 부르지 않는다.
    this.onEvent = undefined;
    this.notifyEnd = undefined;
  }

  private handleLine(line: string): void {
    let message: EngineLine;
    try {
      message = JSON.parse(line) as EngineLine;
    } catch {
      console.error(`[stt-local] JSON이 아닌 줄을 버립니다: ${line.slice(0, 200)}`);
      return;
    }

    switch (message.type) {
      case 'ready':
        console.log(`[stt-local] 준비됨 (${String(message.device)})`);
        this.notifyReady?.();
        return;
      case 'end':
        this.notifyEnd?.();
        return;
      case 'error':
        console.error(`[stt-local] 엔진 오류: ${String(message.message)}`);
        return;
      case 'partial':
      case 'final':
        this.forward(message.type, message);
        return;
      default:
        console.error(`[stt-local] 모르는 줄을 버립니다: ${line.slice(0, 200)}`);
    }
  }

  // 엔진의 결과를 SttEvent로 바꿔 넘긴다. 번호는 여기서 붙인다.
  private forward(type: SttEventType, message: EngineLine): void {
    const { text, startMs, endMs } = message;
    if (typeof text !== 'string' || typeof startMs !== 'number' || typeof endMs !== 'number') {
      console.error(`[stt-local] 필드가 맞지 않는 ${type}을 버립니다: ${JSON.stringify(message).slice(0, 200)}`);
      return;
    }
    const onEvent = this.onEvent;
    if (!onEvent) return;

    const segmentId = this.segmentId;
    onEvent({ type, segmentId, text, startMs: Math.round(startMs), endMs: Math.round(endMs) });
    if (type === 'final') {
      console.log(
        `[stt-local] final #${segmentId} ${Math.round(startMs)}-${Math.round(endMs)}ms 지연 ${String(message.latencyMs)}ms`,
      );
      this.segmentId += 1;
    }
  }
}
