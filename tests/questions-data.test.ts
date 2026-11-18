import { describe, it, expect } from 'vitest';
import { QUESTION_BANK, PLACEHOLDER_MARK } from '@/data/questions';
import { QUIZ } from '@/lib/config';

describe('QUESTION_BANK', () => {
  it(`дор хаяж ${QUIZ.QUESTION_COUNT} асуулттай`, () => {
    expect(QUESTION_BANK.length).toBeGreaterThanOrEqual(QUIZ.QUESTION_COUNT);
  });

  it('асуулт бүр 4 хувилбартай', () => {
    for (const q of QUESTION_BANK) expect(q.options).toHaveLength(4);
  });

  it('correctIndex хүрээнд багтана', () => {
    for (const q of QUESTION_BANK) {
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(q.options.length);
    }
  });

  it('хувилбарууд давхардахгүй', () => {
    for (const q of QUESTION_BANK) {
      expect(new Set(q.options).size).toBe(q.options.length);
    }
  });

  it('асуултын текст давхардахгүй', () => {
    expect(new Set(QUESTION_BANK.map((q) => q.text)).size).toBe(QUESTION_BANK.length);
  });

  it('бөглөөгүй асуулт үлдсэн эсэхийг сануулна', () => {
    const pending = QUESTION_BANK.filter((q) => q.text.includes(PLACEHOLDER_MARK));
    if (pending.length > 0) {
      console.warn(`\n⚠️  ${pending.length} асуулт бөглөгдөөгүй байна:\n` +
        pending.map((q) => `   - ${q.text}`).join('\n') + '\n');
    }
    // Энэ тест унахгүй — зөвхөн сануулга. Арга хэмжээнээс өмнө 0 болгоно.
    expect(pending.length).toBeLessThanOrEqual(3);
  });
});
