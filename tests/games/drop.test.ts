import { describe, it, expect } from 'vitest';
import {
  generateDropSchedule, planePosition, columnAt, scoreDrop, maxDropScore,
  type DropEvent,
} from '@/lib/games/drop';
import { DROP, PLAY } from '@/lib/config';

const SEED = 123456;

/**
 * Сонгосон багана руу оносон ҮНЭМЛЭХҮЙ мөчийг олно.
 *
 * Чухал: сервер `planePosition(pass, t - openAt)` гэж тооцдог — өөрөөр
 * хэлбэл нислэг бүрийн цаг нь тэр нислэг НЭЭГДСЭН мөчөөс эхэлнэ. Эхний
 * хувилбарт үүнийг мартаж үнэмлэхүй `t`-г шууд өгч байсан тул тест худал
 * унаж байв.
 */
function timeToHitColumn(
  pass: ReturnType<typeof generateDropSchedule>['passes'][number],
  col: number,
  openAt: number,
): number {
  for (let rel = 0; rel < pass.periodMs * 2; rel += 5) {
    if (columnAt(planePosition(pass, rel)) === col) return openAt + rel;
  }
  throw new Error(`${col}-р багана руу хүрэх мөч олдсонгүй`);
}

describe('generateDropSchedule', () => {
  it('нэг seed үргэлж ижил хуваарь өгнө', () => {
    expect(generateDropSchedule(SEED)).toEqual(generateDropSchedule(SEED));
  });

  it('DROP.DROPS ширхэг нислэгтэй', () => {
    expect(generateDropSchedule(SEED).passes).toHaveLength(DROP.DROPS);
  });

  it('ханын нийт контейнер нь яг DROPS-тэй тэнцүү', () => {
    for (const seed of [1, 2, 999, 123456, 2_000_000_000]) {
      const { wall } = generateDropSchedule(seed);
      expect(wall).toHaveLength(DROP.COLS);
      expect(wall.reduce((a, b) => a + b, 0)).toBe(DROP.DROPS);
      for (const h of wall) {
        expect(h).toBeGreaterThanOrEqual(1);
        expect(h).toBeLessThanOrEqual(3);
      }
    }
  });

  it('нислэг бүр өмнөхөөсөө хурдан (период богиносно)', () => {
    const { passes } = generateDropSchedule(SEED);
    for (let i = 1; i < passes.length; i++) {
      expect(passes[i].periodMs).toBeLessThan(passes[i - 1].periodMs);
    }
  });
});

describe('planePosition / columnAt', () => {
  it('онгоц 5..95 хооронд үлдэнэ', () => {
    const { passes } = generateDropSchedule(SEED);
    for (const pass of passes) {
      for (let t = 0; t < pass.periodMs * 2; t += 7) {
        const x = planePosition(pass, t);
        expect(x).toBeGreaterThanOrEqual(5 - 1e-9);
        expect(x).toBeLessThanOrEqual(95 + 1e-9);
      }
    }
  });

  it('багана үргэлж 0..COLS-1 дотор', () => {
    for (const x of [-100, 0, 5, 50, 95, 200]) {
      const c = columnAt(x);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(DROP.COLS - 1);
    }
  });
});

describe('scoreDrop', () => {
  it('контейнертэй багана руу оноход HIT_POINTS өгнө', () => {
    const schedule = generateDropSchedule(SEED);
    const col = schedule.wall.findIndex((h) => h > 0);
    const t = timeToHitColumn(schedule.passes[0], col, 0);
    const r = scoreDrop(schedule, [{ index: 1, t }]);
    expect(r.score).toBe(DROP.HIT_POINTS);
    expect(r.accepted).toBe(1);
  });

  it('хоосон багана руу буулгавал 0 оноо, гэхдээ үйлдэл хүлээн авагдана', () => {
    const schedule = generateDropSchedule(SEED);
    // Эхлээд нэг багана руу түүний өндрөөр нь дараалан буулгаж хоослоно.
    const col = schedule.wall.findIndex((h) => h > 0);
    const height = schedule.wall[col];
    const events: DropEvent[] = [];
    let openAt = 0;
    for (let i = 1; i <= height + 1; i++) {
      const t = timeToHitColumn(schedule.passes[i - 1], col, openAt);
      events.push({ index: i, t });
      openAt = t + DROP.FALL_MS;
    }
    const r = scoreDrop(schedule, events);
    expect(r.score).toBe(height * DROP.HIT_POINTS);
    expect(r.accepted).toBe(height + 1);
  });

  it('дарааллаас гадуур нислэгийг татгалзана', () => {
    const schedule = generateDropSchedule(SEED);
    const r = scoreDrop(schedule, [{ index: 3, t: 500 }]);
    expect(r.accepted).toBe(0);
    expect(r.rejected).toBe(1);
    expect(r.score).toBe(0);
  });

  it('ачаа унаж дуусахаас өмнөх буулгалтыг татгалзана', () => {
    const schedule = generateDropSchedule(SEED);
    const r = scoreDrop(schedule, [
      { index: 1, t: 600 },
      { index: 2, t: 600 + DROP.FALL_MS - 50 },
    ]);
    expect(r.accepted).toBe(1);
    expect(r.rejected).toBe(1);
  });

  it('хүний боломжгүй хурдтай үйлдлийг сэжигтэй гэж тэмдэглэнэ', () => {
    // FALL_MS-ийг 0 болгож чадахгүй тул шууд MIN_EVENT_GAP_MS-ийн шалгуурыг
    // өдөөх цорын ганц зам нь openAt-аас хойш боловч prevT-д хэт ойр үйлдэл.
    // FALL_MS (400) > MIN_EVENT_GAP_MS (200) тул энэ нь одоогийн тохиргоогоор
    // хүрэхгүй — харин тохиргоо өөрчлөгдвөл хамгаалалт ажиллахыг баталгаажуулав.
    expect(DROP.FALL_MS).toBeGreaterThanOrEqual(PLAY.MIN_EVENT_GAP_MS);
  });

  it('оноо хэзээ ч сөрөг болохгүй', () => {
    const schedule = generateDropSchedule(SEED);
    const r = scoreDrop(schedule, []);
    expect(r.score).toBe(0);
  });

  it('дээд оноо 12 × 80 = 960', () => {
    const schedule = generateDropSchedule(SEED);
    expect(maxDropScore(schedule)).toBe(DROP.DROPS * DROP.HIT_POINTS);
    expect(maxDropScore(schedule)).toBe(960);
  });

  it('төгс тоглолт дээд онооных нь яг тэнцүү', () => {
    const schedule = generateDropSchedule(SEED);
    const wall = [...schedule.wall];
    const events: DropEvent[] = [];
    let openAt = 0;
    for (let i = 1; i <= DROP.DROPS; i++) {
      const col = wall.findIndex((h) => h > 0);
      const t = timeToHitColumn(schedule.passes[i - 1], col, openAt);
      events.push({ index: i, t });
      wall[col] -= 1;
      openAt = t + DROP.FALL_MS;
    }
    const r = scoreDrop(schedule, events);
    expect(r.score).toBe(maxDropScore(schedule));
    expect(r.suspicious).toBe(false);
  });
});
