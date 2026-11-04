// Last-Event-ID 헤더 해석의 테스트(T17). 다시 접속할 때 어디부터 보낼지 정하는 값이다(T09).
import { describe, expect, it } from 'vitest';
import { HttpError } from '../http/errors';
import { parseLastEventId } from './routes';

// 함수가 던진 값을 돌려준다. 던지지 않으면 undefined.
function thrownBy(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return undefined;
}

describe('parseLastEventId', () => {
  it('헤더가 없거나 비어 있으면 처음부터 보낸다', () => {
    expect(parseLastEventId(undefined)).toBeUndefined();
    expect(parseLastEventId('')).toBeUndefined();
  });

  it('0 이상의 정수를 마지막으로 받은 segmentId로 읽는다', () => {
    expect(parseLastEventId('0')).toBe(0);
    expect(parseLastEventId('12')).toBe(12);
  });

  it.each(['-1', '01', '1.5', 'abc', ' 3', '9007199254740992'])('%j는 400으로 거절한다', (value) => {
    const error = thrownBy(() => parseLastEventId(value));
    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ status: 400, code: 'INVALID_LAST_EVENT_ID' });
  });
});
