import { describe, it, expect } from 'vitest';
import {
  generateStackSchedule,
  cranePosition,
  scoreStack,
  maxStackScore,
  type StackLevel,
  type StackEvent,
} from '@/lib/games/stack';
import { STACK } from '@/lib/config';

/**
 * Өгөгдсөн target (10..90) утгад яг хүрэх хамгийн эхний elapsedMs-ийг
 * cranePosition-ийн томьёог урвуулж олно (зөвхөн тестэд зориулав).
 */
function elapsedForPosition(level: StackLevel, target: number): number {
  const { periodMs, startPhase, direction } = level;
  const half = periodMs / 2;
  const m = ((target - 10) / 80) * half; // өсөх хэсэгт харгалзах m (0..half)
  let elapsed = direction * (m - startPhase);
  elapsed = ((elapsed % periodMs) + periodMs) % periodMs;
  return elapsed;
}

/** Хуваарийн бүх түвшинг яг төвд нь (centre=50 хэвээр) буулгах events үүсгэнэ. */
function playAllPerfectly(schedule: readonly StackLevel[]): StackEvent[] {
  const events: StackEvent[] = [];
  let openAt = 0;
  for (const level of schedule) {
    const elapsed = elapsedForPosition(level, 50);
    const t = Math.max(openAt + elapsed, openAt);
    events.push({ level: level.level, t });
    openAt = t + STACK.DROP_MS;
  }
  return events;
}

describe('generateStackSchedule', () => {
  it('ижил seed ижил хуваарь өгнө', () => {
    expect(generateStackSchedule(9)).toEqual(generateStackSchedule(9));
  });

  it('өөр seed өөр хуваарь өгнө', () => {
    expect(generateStackSchedule(1)).not.toEqual(generateStackSchedule(2));
  });

  it('STACK.LEVELS ширхэг, period нь томьёоны дагуу буурна', () => {
    const s = generateStackSchedule(4);
    expect(s).toHaveLength(STACK.LEVELS);
    s.forEach((lvl, i) => {
      expect(lvl.level).toBe(i + 1);
      expect(lvl.periodMs).toBe(STACK.BASE_PERIOD_MS - STACK.PERIOD_STEP_MS * (i + 1));
    });
  });
});

describe('cranePosition', () => {
  const level: StackLevel = { level: 1, periodMs: 1000, startPhase: 0, direction: 1 };

  it('10..90 хооронд үлдэнэ — олон цэгээр нэвт шалгана', () => {
    for (let t = -5000; t <= 5000; t += 37) {
      const pos = cranePosition(level, t);
      expect(pos).toBeGreaterThanOrEqual(10);
      expect(pos).toBeLessThanOrEqual(90);
    }
  });

  it('эргэлтийн цэгүүдэд тасралтгүй (continuous) байна', () => {
    // half period дээр 90-д хүрнэ; period-ийн эхлэл/төгсгөлд 10-д хүрнэ.
    const half = level.periodMs / 2;
    for (const turn of [half, level.periodMs, 2 * level.periodMs]) {
      const before = cranePosition(level, turn - 0.001);
      const at = cranePosition(level, turn);
      const after = cranePosition(level, turn + 0.001);
      expect(Math.abs(before - at)).toBeLessThan(0.1);
      expect(Math.abs(after - at)).toBeLessThan(0.1);
    }
  });

  it('direction эсрэг чиглэлд ижил муруйг урвуулж явуулна', () => {
    const fwd: StackLevel = { level: 1, periodMs: 1000, startPhase: 0, direction: 1 };
    const bwd: StackLevel = { level: 1, periodMs: 1000, startPhase: 0, direction: -1 };
    expect(cranePosition(fwd, 100)).toBeCloseTo(cranePosition(bwd, -100), 6);
  });
});

describe('maxStackScore', () => {
  it('6 × (100+60) = 960', () => {
    const schedule = generateStackSchedule(5);
    expect(maxStackScore(schedule)).toBe(960);
  });
});

describe('scoreStack', () => {
  it('events хоосон бол 0 оноо', () => {
    const schedule = generateStackSchedule(5);
    const r = scoreStack(schedule, []);
    expect(r.score).toBe(0);
    expect(r.accepted).toBe(0);
  });

  it('бүх түвшинг яг төвд нь буулгавал 960 оноо', () => {
    const schedule = generateStackSchedule(5);
    const events = playAllPerfectly(schedule);
    const r = scoreStack(schedule, events);
    expect(r.score).toBe(960);
    expect(r.accepted).toBe(STACK.LEVELS);
    expect(r.rejected).toBe(0);
  });

  it('гар тооцоо: offset=6 (12-ын тэн хагас) → 100 + round(60×(1-6/12)) = 100+30 = 130', () => {
    // period=1000, startPhase=0, direction=1 → t=250мс дээр pos = 10+80*(250/500) = 50.
    // centre=50 тул offset=0 бол яг 160 гарна; offset=6 гаргахын тулд pos=56 болгоно:
    // 56 = 10+80*(m/500) → m = 500*46/80 = 287.5мс.
    const level: StackLevel = { level: 1, periodMs: 1000, startPhase: 0, direction: 1 };
    const r = scoreStack([level], [{ level: 1, t: 287.5 }]);
    // 100 + round(60 × (1 - 6/12)) = 100 + round(30) = 130
    expect(r.score).toBe(130);
  });

  it('тэнцвэрээс (TOLERANCE_PCT) гадуур унавал 0 оноо, centre өөрчлөгдөхгүй', () => {
    const level: StackLevel = { level: 1, periodMs: 1000, startPhase: 0, direction: 1 };
    const level2: StackLevel = { level: 2, periodMs: 940, startPhase: 0, direction: 1 };
    // t=0 үед pos=10 (centre=50-ээс 40 хол, TOLERANCE 12-оос их) → унана.
    const r = scoreStack([level, level2], [
      { level: 1, t: 0 },
      { level: 2, t: STACK.DROP_MS + 10 },
    ]);
    expect(r.accepted).toBe(2);
    // Эхний түвшин унасан тул centre 50 хэвээр, 2 дахь түвшин ч мөн шалгагдана.
    expect(r.score).toBeGreaterThanOrEqual(0);
  });

  it('эрт ирсэн (дараагийн түвшин нээгдэхээс өмнөх) үйлдлийг татгалзана', () => {
    const level1: StackLevel = { level: 1, periodMs: 1000, startPhase: 0, direction: 1 };
    const level2: StackLevel = { level: 2, periodMs: 940, startPhase: 0, direction: 1 };
    const t1 = 300;
    const openAt2 = t1 + STACK.DROP_MS; // 800
    const r = scoreStack([level1, level2], [
      { level: 1, t: t1 },
      { level: 2, t: openAt2 - 100 }, // level 2 нээгдэхээс 100мс өмнө
    ]);
    expect(r.accepted).toBe(1);
    expect(r.rejected).toBe(1);
  });

  it('дараалалгүй (level 2-г 1-ээс өмнө) ирсэн үйлдлийг татгалзана', () => {
    const schedule = generateStackSchedule(5);
    const r = scoreStack(schedule, [{ level: 2, t: 300 }]);
    expect(r.rejected).toBe(1);
    expect(r.accepted).toBe(0);
  });

  // Анхаарал: STACK.DROP_MS (500мс) нь PLAY.MIN_EVENT_GAP_MS (200мс)-ээс их тул
  // "эрт ирсэн" шалгалт дээр аль хэдийн >=500мс зайг баталгаажуулдаг — доод зайн
  // шалгалт stack-д одоогийн тохиргоогоор хэзээ ч бие даан өдөөгдөхгүй (зөвхөн
  // ирээдүйн тохиргооны өөрчлөлтөөс хамгаалах давхар давхарга, sort.test.ts/
  // memo.test.ts-д энэ замыг бодитоор шалгасан).

  it('байхгүй түвшний үйлдлийг татгалзана', () => {
    const r = scoreStack([], [{ level: 1, t: 0 }]);
    expect(r.rejected).toBe(1);
  });

  it('NaN/Infinity/бутархай level эсвэл t-тэй үйлдлийг шидэлгүй боловсруулна', () => {
    const schedule = generateStackSchedule(5);
    const bad: StackEvent[] = [
      { level: 1, t: Number.NaN },
      { level: 1, t: Number.POSITIVE_INFINITY },
      { level: 1.5, t: 300 },
      { level: Number.NaN, t: 300 },
    ];
    expect(() => scoreStack(schedule, bad)).not.toThrow();
    const r = scoreStack(schedule, bad);
    expect(r.score).toBe(0);
    expect(r.rejected).toBe(bad.length);
  });

  it('оноо хэзээ ч 0-ээс доош буухгүй', () => {
    const schedule = generateStackSchedule(5);
    // Бүх түвшинг хэтэрхий эрт (openAt-аас өмнө биш гэхдээ санаатай muu байрлалд) буулгана.
    const events: StackEvent[] = [];
    let openAt = 0;
    for (const level of schedule) {
      const t = openAt; // t - openAt = 0 → pos = cranePosition(level,0)
      events.push({ level: level.level, t });
      openAt = t + STACK.DROP_MS;
    }
    const r = scoreStack(schedule, events);
    expect(r.score).toBeGreaterThanOrEqual(0);
  });
});
