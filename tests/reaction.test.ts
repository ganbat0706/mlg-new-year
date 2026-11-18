import { describe, it, expect } from 'vitest';
import { generateSpawnSchedule, scoreTaps, maxReactionScore } from '@/lib/reaction';
import { REACTION } from '@/lib/config';

describe('generateSpawnSchedule', () => {
  it('ижил seed ижил хуваарь өгнө', () => {
    expect(generateSpawnSchedule(123)).toEqual(generateSpawnSchedule(123));
  });

  it('өөр seed өөр хуваарь өгнө', () => {
    expect(generateSpawnSchedule(1)).not.toEqual(generateSpawnSchedule(2));
  });

  it('id нь 0-ээс эхэлсэн дараалсан тоо', () => {
    const s = generateSpawnSchedule(5);
    expect(s.map((i) => i.id)).toEqual(s.map((_, i) => i));
  });

  it('бүх объект тоглоомын хугацаанд багтана', () => {
    for (const item of generateSpawnSchedule(5)) {
      expect(item.t).toBeGreaterThanOrEqual(0);
      expect(item.t + REACTION.OBJECT_LIFETIME_MS).toBeLessThanOrEqual(REACTION.DURATION_MS);
    }
  });

  it('байрлал 0-100 хувийн хооронд', () => {
    for (const item of generateSpawnSchedule(5)) {
      expect(item.x).toBeGreaterThanOrEqual(0);
      expect(item.x).toBeLessThanOrEqual(100);
      expect(item.y).toBeGreaterThanOrEqual(0);
      expect(item.y).toBeLessThanOrEqual(100);
    }
  });

  it('муу объектын эзлэх хувь ойролцоогоор BAD_RATIO', () => {
    const s = generateSpawnSchedule(77);
    const bad = s.filter((i) => i.kind === 'bad').length;
    expect(bad / s.length).toBeGreaterThan(REACTION.BAD_RATIO - 0.15);
    expect(bad / s.length).toBeLessThan(REACTION.BAD_RATIO + 0.15);
  });

  it('дээд оноо 2000-д ойр байна', () => {
    const max = maxReactionScore(generateSpawnSchedule(77));
    expect(max).toBeGreaterThan(1500);
    expect(max).toBeLessThan(2500);
  });
});

describe('scoreTaps', () => {
  const schedule = generateSpawnSchedule(42);
  const good = schedule.filter((i) => i.kind === 'good');
  const bad = schedule.filter((i) => i.kind === 'bad');

  it('tap байхгүй бол 0 оноо', () => {
    expect(scoreTaps(schedule, []).score).toBe(0);
  });

  it('зөв объект дарвал оноо нэмэгдэнэ', () => {
    const r = scoreTaps(schedule, [{ id: good[0].id, t: good[0].t + 100 }]);
    expect(r.score).toBe(REACTION.GOOD_POINTS);
    expect(r.hits).toBe(1);
  });

  it('муу объект дарвал оноо хасагдана', () => {
    const r = scoreTaps(schedule, [
      { id: good[0].id, t: good[0].t + 10 },
      { id: good[1].id, t: good[1].t + 10 },
      { id: bad[0].id, t: bad[0].t + 10 },
    ]);
    expect(r.score).toBe(REACTION.GOOD_POINTS * 2 + REACTION.BAD_POINTS);
  });

  it('оноо 0-ээс доош буухгүй', () => {
    const taps = bad.slice(0, 5).map((i) => ({ id: i.id, t: i.t + 10 }));
    expect(scoreTaps(schedule, taps).score).toBe(0);
  });

  it('байхгүй объектын id-г татгалзана', () => {
    const r = scoreTaps(schedule, [{ id: 99999, t: 100 }]);
    expect(r.score).toBe(0);
    expect(r.rejected).toBe(1);
  });

  it('объект гарахаас өмнөх tap-ыг татгалзана', () => {
    const item = good.find((i) => i.t > 2000)!;
    const r = scoreTaps(schedule, [{ id: item.id, t: item.t - 1000 }]);
    expect(r.score).toBe(0);
    expect(r.rejected).toBe(1);
  });

  it('объект алга болсны дараах tap-ыг татгалзана', () => {
    const item = good[0];
    const late = item.t + REACTION.OBJECT_LIFETIME_MS + REACTION.GRACE_MS + 1;
    const r = scoreTaps(schedule, [{ id: item.id, t: late }]);
    expect(r.score).toBe(0);
    expect(r.rejected).toBe(1);
  });

  it('нэг объектыг давхар дарахыг нэг л удаа тооцно', () => {
    const item = good[0];
    const r = scoreTaps(schedule, [
      { id: item.id, t: item.t + 10 },
      { id: item.id, t: item.t + 20 },
    ]);
    expect(r.score).toBe(REACTION.GOOD_POINTS);
    expect(r.rejected).toBe(1);
  });

  it('тоглоомын хугацаанаас хэтэрсэн tap-ыг татгалзана', () => {
    const r = scoreTaps(schedule, [{ id: good[0].id, t: REACTION.DURATION_MS + 10_000 }]);
    expect(r.score).toBe(0);
  });

  it('бүх зөв объектыг дарсан нь дээд онооноос хэтрэхгүй', () => {
    const taps = good.map((i) => ({ id: i.id, t: i.t + 50 }));
    const r = scoreTaps(schedule, taps);
    expect(r.score).toBe(maxReactionScore(schedule));
  });

  it('эмх замбараагүй дарааллаар ирсэн tap-ыг зөв боловсруулна', () => {
    const taps = [
      { id: good[3].id, t: good[3].t + 10 },
      { id: good[0].id, t: good[0].t + 10 },
    ];
    expect(scoreTaps(schedule, taps).score).toBe(REACTION.GOOD_POINTS * 2);
  });

  it('утгагүй t (NaN) бүхий tap-ыг татгалзана', () => {
    const r = scoreTaps(schedule, [{ id: good[0].id, t: Number.NaN }]);
    expect(r.rejected).toBe(1);
    expect(r.score).toBe(0);
  });
});
