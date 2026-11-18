import { describe, it, expect } from 'vitest';
import {
  generateSortSchedule,
  scoreSort,
  maxSortScore,
  type SortItem,
  type SortEvent,
  type SortLane,
} from '@/lib/games/sort';
import { SORT, PLAY } from '@/lib/config';

/** Хуваарийн дагуу бүх зүйлийг зөв, дарааллаар, аюулгүй зайтай дарах events үүсгэнэ. */
function playAllCorrectly(schedule: readonly SortItem[]): SortEvent[] {
  return schedule.map((item, i) => ({
    id: item.id,
    lane: (item.damaged ? 'return' : item.mode) as SortLane,
    t: (i + 1) * (PLAY.MIN_EVENT_GAP_MS + 50),
  }));
}

describe('generateSortSchedule', () => {
  it('ижил seed ижил хуваарь өгнө', () => {
    expect(generateSortSchedule(123)).toEqual(generateSortSchedule(123));
  });

  it('өөр seed өөр хуваарь өгнө', () => {
    expect(generateSortSchedule(1)).not.toEqual(generateSortSchedule(2));
  });

  it('SORT.ITEM_COUNT ширхэг, id нь 0-ээс эхэлсэн дараалсан тоо', () => {
    const s = generateSortSchedule(5);
    expect(s).toHaveLength(SORT.ITEM_COUNT);
    expect(s.map((i) => i.id)).toEqual(s.map((_, i) => i));
  });

  it('эвдэрсэн эзлэх хувь ойролцоогоор DAMAGED_RATIO', () => {
    // ITEM_COUNT=12 бага дээж тул маш өргөн хүлцэл (0-аас 1 хүртэл боломжтой).
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const total = seeds.reduce(
      (acc, seed) => acc + generateSortSchedule(seed).filter((i) => i.damaged).length,
      0,
    );
    const ratio = total / (seeds.length * SORT.ITEM_COUNT);
    expect(ratio).toBeGreaterThan(SORT.DAMAGED_RATIO - 0.15);
    expect(ratio).toBeLessThan(SORT.DAMAGED_RATIO + 0.15);
  });
});

describe('maxSortScore', () => {
  it('12 × 80 = 960', () => {
    const schedule = generateSortSchedule(77);
    expect(maxSortScore(schedule)).toBe(960);
  });
});

describe('scoreSort', () => {
  it('events хоосон бол 0 оноо', () => {
    const schedule = generateSortSchedule(42);
    const r = scoreSort(schedule, []);
    expect(r.score).toBe(0);
    expect(r.accepted).toBe(0);
    expect(r.rejected).toBe(0);
    expect(r.suspicious).toBe(false);
  });

  it('бүгдийг зөв дарвал яг 960 оноо', () => {
    const schedule = generateSortSchedule(42);
    const r = scoreSort(schedule, playAllCorrectly(schedule));
    expect(r.score).toBe(960);
    expect(r.accepted).toBe(SORT.ITEM_COUNT);
    expect(r.rejected).toBe(0);
  });

  it('гар тооцоо: rail/road/damaged 3 зүйлээс 2 зөв, 1 буруу → 80+80-40=120', () => {
    const schedule: SortItem[] = [
      { id: 0, mode: 'rail', damaged: false },
      { id: 1, mode: 'road', damaged: false },
      { id: 2, mode: 'air', damaged: true },
    ];
    // 0: 'rail' зөв (+80), 1: 'road' зөв (+80), 2: 'road' гэж дарсан боловч
    // хүлээгдэж буй нь 'return' (эвдэрсэн) тул буруу (-40).
    // Нийлбэр: 80 + 80 - 40 = 120.
    const events: SortEvent[] = [
      { id: 0, lane: 'rail', t: 300 },
      { id: 1, lane: 'road', t: 600 },
      { id: 2, lane: 'road', t: 900 },
    ];
    const r = scoreSort(schedule, events);
    expect(r.score).toBe(120);
    expect(r.accepted).toBe(3);
  });

  it('эцэст нь нэг л удаа clamp хийнэ — үйлдэл бүрт биш', () => {
    const schedule: SortItem[] = [
      { id: 0, mode: 'rail', damaged: false },
      { id: 1, mode: 'rail', damaged: false },
      { id: 2, mode: 'rail', damaged: false },
    ];
    // Буруу, буруу, зөв: -40, -40, +80.
    // Үйлдэл бүрт clamp хийвэл: 0, 0, 80 → эцсийн 80 (БУРУУ зан).
    // Эцэст нь нэг л удаа clamp хийвэл: max(0, -40-40+80) = max(0, 0) = 0 (ЗӨВ зан).
    const events: SortEvent[] = [
      { id: 0, lane: 'road', t: 300 },
      { id: 1, lane: 'road', t: 600 },
      { id: 2, lane: 'rail', t: 900 },
    ];
    const r = scoreSort(schedule, events);
    expect(r.score).toBe(0);
  });

  it('дараалал алдсан id-г татгалзана', () => {
    const schedule = generateSortSchedule(1);
    const r = scoreSort(schedule, [{ id: 1, lane: schedule[1].mode, t: 300 }]);
    expect(r.score).toBe(0);
    expect(r.rejected).toBe(1);
    expect(r.accepted).toBe(0);
  });

  it('давхардсан id-г татгалзана', () => {
    const schedule = generateSortSchedule(1);
    const lane0 = (schedule[0].damaged ? 'return' : schedule[0].mode) as SortLane;
    const r = scoreSort(schedule, [
      { id: 0, lane: lane0, t: 300 },
      { id: 0, lane: lane0, t: 600 },
    ]);
    expect(r.accepted).toBe(1);
    expect(r.rejected).toBe(1);
  });

  it('хэт хурдан (MIN_EVENT_GAP_MS-ээс бага зай) үйлдлийг татгалзаж suspicious тэмдэглэнэ', () => {
    const schedule = generateSortSchedule(1);
    const lane0 = (schedule[0].damaged ? 'return' : schedule[0].mode) as SortLane;
    const lane1 = (schedule[1].damaged ? 'return' : schedule[1].mode) as SortLane;
    const r = scoreSort(schedule, [
      { id: 0, lane: lane0, t: 300 },
      { id: 1, lane: lane1, t: 300 + PLAY.MIN_EVENT_GAP_MS - 1 },
    ]);
    expect(r.accepted).toBe(1);
    expect(r.rejected).toBe(1);
    expect(r.suspicious).toBe(true);
  });

  it('хугацаанаас хэтэрсэн (DURATION_MS+GRACE_MS-ээс их) t-г татгалзана', () => {
    const schedule = generateSortSchedule(1);
    const lane0 = (schedule[0].damaged ? 'return' : schedule[0].mode) as SortLane;
    const r = scoreSort(schedule, [
      { id: 0, lane: lane0, t: SORT.DURATION_MS + PLAY.GRACE_MS + 1 },
    ]);
    expect(r.score).toBe(0);
    expect(r.rejected).toBe(1);
  });

  it('байхгүй id-г татгалзана', () => {
    const schedule = generateSortSchedule(1);
    const r = scoreSort(schedule, [{ id: 999, lane: 'rail', t: 300 }]);
    expect(r.score).toBe(0);
    expect(r.rejected).toBe(1);
  });

  it('NaN/Infinity/бутархай t эсвэл id-тэй үйлдлийг шидэлгүй боловсруулна', () => {
    const schedule = generateSortSchedule(1);
    const bad: SortEvent[] = [
      { id: 0, lane: 'rail', t: Number.NaN },
      { id: 0, lane: 'rail', t: Number.POSITIVE_INFINITY },
      { id: 0.5, lane: 'rail', t: 300 },
      { id: Number.NaN, lane: 'rail', t: 300 },
    ];
    expect(() => scoreSort(schedule, bad)).not.toThrow();
    const r = scoreSort(schedule, bad);
    expect(r.score).toBe(0);
    expect(r.rejected).toBe(bad.length);
    expect(r.accepted).toBe(0);
  });

  it('оноо хэзээ ч 0-ээс доош буухгүй', () => {
    const schedule = generateSortSchedule(3);
    const events: SortEvent[] = schedule.map((item, i) => ({
      id: item.id,
      // Бүгдийг худал зам руу чиглүүлж буруутгана.
      lane: item.mode === 'rail' ? 'road' : 'rail',
      t: (i + 1) * (PLAY.MIN_EVENT_GAP_MS + 50),
    }));
    const r = scoreSort(schedule, events);
    expect(r.score).toBe(0);
    expect(r.score).toBeGreaterThanOrEqual(0);
  });
});
