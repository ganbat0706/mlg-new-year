import { describe, it, expect } from 'vitest';
import {
  generateMemoSchedule,
  scoreMemo,
  maxMemoScore,
  type MemoEvent,
} from '@/lib/games/memo';
import { MEMO, PLAY } from '@/lib/config';

describe('generateMemoSchedule', () => {
  it('ижил seed ижил хуваарь өгнө', () => {
    expect(generateMemoSchedule(123)).toEqual(generateMemoSchedule(123));
  });

  it('өөр seed өөр хуваарь өгнө', () => {
    expect(generateMemoSchedule(1)).not.toEqual(generateMemoSchedule(2));
  });

  it('MEMO.PAIRS*2 нүд, хос бүр яг 2 удаа орсон', () => {
    const s = generateMemoSchedule(7);
    expect(s).toHaveLength(MEMO.PAIRS * 2);
    const counts = new Map<number, number>();
    for (const pairId of s) counts.set(pairId, (counts.get(pairId) ?? 0) + 1);
    expect(counts.size).toBe(MEMO.PAIRS);
    for (const count of counts.values()) expect(count).toBe(2);
  });
});

describe('maxMemoScore', () => {
  it('6 × 130 + 180 = 960', () => {
    const schedule = generateMemoSchedule(3);
    expect(maxMemoScore(schedule)).toBe(960);
  });
});

describe('scoreMemo', () => {
  it('events хоосон бол 0 оноо', () => {
    const schedule = generateMemoSchedule(3);
    const r = scoreMemo(schedule, []);
    expect(r.score).toBe(0);
    expect(r.accepted).toBe(0);
    expect(r.rejected).toBe(0);
    expect(r.perfect).toBe(false);
  });

  it('ижил schedule/events давтан дуудвал ижил үр дүн (цэвэр функц)', () => {
    const schedule = generateMemoSchedule(9);
    const events: MemoEvent[] = [
      { card: 0, t: 0 },
      { card: 1, t: 300 },
    ];
    expect(scoreMemo(schedule, events)).toEqual(scoreMemo(schedule, events));
  });

  it(
    'гар тооцоо: 2 хос, алдаагүй, 600мс-д дуусав — оноог тохиргооноос гаргана',
    () => {
      // schedule: slot0=pair0, slot1=pair1, slot2=pair0, slot3=pair1
      const schedule = [0, 1, 0, 1];
      const events: MemoEvent[] = [
        { card: 0, t: 0 },
        { card: 2, t: 200 }, // хос0 тохирно
        { card: 1, t: 400 },
        { card: 3, t: 600 }, // хос1 тохирно → дуусав
      ];
      const r = scoreMemo(schedule, events);
      // Тоог ГАРААР бичихгүй: PAIR_POINTS / BONUS_* өөрчлөгдөхөд тест худал
      // унадаг байв. Томьёог нь шалгах нь зорилго, тогтмолыг нь биш.
      const bonus = Math.min(
        MEMO.BONUS_MAX,
        Math.floor((MEMO.DURATION_MS - 600) / 1000) * MEMO.BONUS_PER_SEC,
      );
      expect(r.score).toBe(2 * MEMO.PAIR_POINTS + bonus);
      expect(r.accepted).toBe(4);
      expect(r.rejected).toBe(0);
      expect(r.perfect).toBe(true);
    },
  );

  it('бүх хосыг оносон ч алдаа гаргасан бол perfect=false', () => {
    const schedule = [0, 1, 1, 0];
    const events: MemoEvent[] = [
      { card: 0, t: 0 },
      { card: 1, t: 200 }, // буруу хос → lockUntil = 800
      { card: 0, t: 900 }, // түгжээ дууссаны дараа дахин нээнэ
      { card: 3, t: 1100 }, // хос0 тохирно
    ];
    const r = scoreMemo(schedule, events);
    expect(r.score).toBe(MEMO.PAIR_POINTS); // зөвхөн 1 хос, цаг урамшуулалгүй (дуусаагүй)
    expect(r.perfect).toBe(false);
  });

  it(
    'алгассан (ignored) даралтууд төлөвийг ЖИНХЭНЭ өөрчлөхгүй — ' +
      'тэдгээрийг хоорондуур нь шургуулаад ижил үр дүн гарна',
    () => {
      const schedule = [0, 1, 1, 0, 2, 2];
      const baseline: MemoEvent[] = [
        { card: 0, t: 0 },
        { card: 1, t: 200 }, // буруу хос → lockUntil = 200 + MEMO.LOCK_MS
        { card: 0, t: 900 }, // дахин нээнэ
        { card: 3, t: 1100 }, // хос0 тохирно (+130)
        { card: 1, t: 1300 },
        { card: 2, t: 1500 }, // хос1 тохирно (+130)
        { card: 4, t: 1700 },
        { card: 5, t: 1900 }, // хос2 тохирно (+130) → бүгд дуусав
      ];
      const withIgnored: MemoEvent[] = [
        { card: 0, t: 0 },
        { card: 0, t: 50 }, // аль хэдийн нээлттэй → алгасав
        { card: 1, t: 200 },
        { card: 2, t: 500 }, // түгжээний дотор → алгасав
        { card: 0, t: 900 },
        { card: 3, t: 1100 },
        { card: 3, t: 1150 }, // аль хэдийн тохирсон → алгасав
        { card: 1, t: 1300 },
        { card: 1, t: 1350 }, // аль хэдийн нээлттэй → алгасав
        { card: 2, t: 1500 },
        { card: 4, t: 1700 },
        { card: 5, t: 1900 },
      ];

      const rBase = scoreMemo(schedule, baseline);
      const rIgnored = scoreMemo(schedule, withIgnored);

      expect(rIgnored).toEqual(rBase);
      const bonus = Math.min(
        MEMO.BONUS_MAX,
        Math.floor((MEMO.DURATION_MS - 1900) / 1000) * MEMO.BONUS_PER_SEC,
      );
      expect(rBase.score).toBe(3 * MEMO.PAIR_POINTS + bonus);
      expect(rBase.accepted).toBe(8);
      expect(rBase.rejected).toBe(0);
      expect(rBase.perfect).toBe(false);
    },
  );

  it('шинэ хөзөр рүү хэт хурдан (MIN_EVENT_GAP_MS-ээс бага) дарвал татгалзаж suspicious тэмдэглэнэ', () => {
    const schedule = [0, 1, 1, 0];
    const r = scoreMemo(schedule, [
      { card: 0, t: 0 },
      { card: 1, t: PLAY.MIN_EVENT_GAP_MS - 1 }, // шинэ хөзөр, хэт хурдан
    ]);
    expect(r.accepted).toBe(1);
    expect(r.rejected).toBe(1);
    expect(r.suspicious).toBe(true);
  });

  it('мужаас гадуурх, бутархай, NaN/Infinity card-тай үйлдлийг шидэлгүй татгалзана', () => {
    const schedule = [0, 1, 1, 0];
    const bad: MemoEvent[] = [
      { card: -1, t: 0 },
      { card: 4, t: 0 },
      { card: 0.5, t: 0 },
      { card: Number.NaN, t: 0 },
      { card: 0, t: Number.NaN },
      { card: 0, t: Number.POSITIVE_INFINITY },
    ];
    expect(() => scoreMemo(schedule, bad)).not.toThrow();
    const r = scoreMemo(schedule, bad);
    expect(r.accepted).toBe(0);
    expect(r.rejected).toBe(bad.length);
    expect(r.score).toBe(0);
  });

  it('цаг буурсан (дараалал алдсан) үйлдлийг татгалзана', () => {
    const schedule = [0, 1, 1, 0];
    const r = scoreMemo(schedule, [
      { card: 0, t: 500 },
      { card: 1, t: 300 }, // өмнөхөөс эрт
    ]);
    expect(r.accepted).toBe(1);
    expect(r.rejected).toBe(1);
  });

  it('оноо хэзээ ч 0-ээс доош буухгүй', () => {
    const schedule = generateMemoSchedule(11);
    const r = scoreMemo(schedule, []);
    expect(r.score).toBeGreaterThanOrEqual(0);
  });
});
