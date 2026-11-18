import { describe, it, expect } from 'vitest';
import {
  scoreAnswer, buildOptionOrder, applyOptionOrder, resolveChoice,
} from '@/lib/quiz';
import { mulberry32 } from '@/lib/rng';
import { QUIZ } from '@/lib/config';

describe('scoreAnswer', () => {
  it('буруу хариулт 0 оноо', () => {
    expect(scoreAnswer(false, 0)).toBe(0);
  });

  it('шууд хариулсан зөв хариулт дээд оноо', () => {
    expect(scoreAnswer(true, 0)).toBe(200);
  });

  it('10 оролдлогын дээд оноо 2000 болно', () => {
    expect(scoreAnswer(true, 0) * QUIZ.QUESTION_COUNT).toBe(2000);
  });

  it('5 секундэд хариулбал дунд зэргийн оноо', () => {
    // 5000ms - 800ms grace = 4200ms → үлдсэн 5800ms → floor 5 секунд
    expect(scoreAnswer(true, 5000)).toBe(100 + 5 * 10);
  });

  it('9.5 секундэд хариулбал суурь оноо', () => {
    // 9500 - 800 = 8700 → үлдсэн 1300 → floor 1 секунд
    expect(scoreAnswer(true, 9500)).toBe(100 + 1 * 10);
  });

  it('хугацаа дуусвал 0 оноо', () => {
    expect(scoreAnswer(true, 11_000)).toBe(0);
  });

  it('grace дотор яг хугацаандаа хариулсныг тооцно', () => {
    // 10_200ms - 800ms = 9_400ms < 10_000ms → суурь оноо авна
    expect(scoreAnswer(true, 10_200)).toBeGreaterThan(0);
  });

  it('сөрөг elapsed-ийг 0 мэт үзнэ (цагийн зөрүү)', () => {
    expect(scoreAnswer(true, -5000)).toBe(200);
  });

  it('NaN elapsed-ийг 0 оноо болгоно', () => {
    expect(scoreAnswer(true, Number.NaN)).toBe(0);
  });
});

describe('option order', () => {
  it('buildOptionOrder бүх индексийг агуулна', () => {
    const order = buildOptionOrder(4, mulberry32(5));
    expect([...order].sort()).toEqual([0, 1, 2, 3]);
  });

  it('applyOptionOrder дарааллын дагуу хувилбаруудыг байрлуулна', () => {
    expect(applyOptionOrder(['a', 'b', 'c', 'd'], [2, 0, 3, 1]))
      .toEqual(['c', 'a', 'd', 'b']);
  });

  it('resolveChoice харагдсан индексийг эх индекс рүү буулгана', () => {
    const order = [2, 0, 3, 1];
    expect(resolveChoice(order, 0)).toBe(2);
    expect(resolveChoice(order, 3)).toBe(1);
  });

  it('хүрээнээс гадуурх сонголт -1 буцаана', () => {
    expect(resolveChoice([2, 0, 3, 1], 9)).toBe(-1);
    expect(resolveChoice([2, 0, 3, 1], -1)).toBe(-1);
  });
});
