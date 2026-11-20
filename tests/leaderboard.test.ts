import { describe, it, expect, beforeEach } from 'vitest';
import { getLeaderboard, getStanding } from '@/lib/repo/leaderboard';
import { registerOrGet } from '@/lib/repo/registrations';
import { db } from '@/lib/db';
import { attempts } from '@/lib/db/schema';
import { CONTESTS } from '@/lib/contests';
import { resetDb } from './helpers/db';
import { GAME } from '@/lib/config';

const base = { lastName: 'батхүү', department: 'Мэдээллийн технологи' };
/** Нэрэнд орлуулж ашиглах кирилл үсгүүд — `${index}`-ийг нэрэнд шууд залгаж болохгүй тул. */
const CYR = ['а', 'б', 'в', 'г', 'д', 'е', 'ж', 'з', 'и', 'к'];

const CONTEST = CONTESTS[0].id;
const OTHER = CONTESTS[1].id;

/**
 * Жагсаалт нь одоо `attempts`-ээс уншдаг тул тестийн өгөгдлийг ДУУССАН
 * оролдлого болгож хийнэ (өмнө нь registrations.bestScore-г шууд бичдэг
 * байсан — тэр багана нь одоо зөвхөн урилган дээрх «нийт хамгийн сайн
 * оноо» болж үлдсэн).
 */
async function make(
  firstName: string, phone: string, score: number, finishedIso: string,
  contestId: string = CONTEST,
) {
  const r = await registerOrGet({ ...base, firstName, phone });
  if (!r.ok) throw new Error(r.error);
  await db.insert(attempts).values({
    registrationId: r.value.id,
    contestId,
    seed: 1,
    status: 'completed',
    totalScore: score,
    finishedAt: new Date(finishedIso),
  });
  return r.value.id;
}

beforeEach(async () => { await resetDb(); });

describe('getLeaderboard', () => {
  it('хоосон DB дээр хоосон жагсаалт', async () => {
    expect(await getLeaderboard(CONTEST)).toEqual([]);
  });

  it('оноогоор буурахаар эрэмбэлнэ', async () => {
    await make('нэгдүгээр', '88000001', 1000, '2026-12-01T10:00:00Z');
    await make('хоёрдугаар', '88000002', 3000, '2026-12-01T10:00:00Z');
    const rows = await getLeaderboard(CONTEST);
    expect(rows.map((r) => r.bestScore)).toEqual([3000, 1000]);
    expect(rows[0].rank).toBe(1);
  });

  it(`эхний ${GAME.PRIZE_PLACES} байрыг шагналтай гэж тэмдэглэнэ`, async () => {
    for (let i = 0; i < 7; i++) {
      await make(`ажилтан${CYR[i]}`, `8800000${i}`, 1000 - i * 10, '2026-12-01T10:00:00Z');
    }
    const rows = await getLeaderboard(CONTEST);
    expect(rows.filter((r) => r.isPrize)).toHaveLength(GAME.PRIZE_PLACES);
    expect(rows[GAME.PRIZE_PLACES - 1].isPrize).toBe(true);
    expect(rows[GAME.PRIZE_PLACES].isPrize).toBe(false);
  });

  it('тэнцсэн үед эрт дуусгасан нь дээгүүр', async () => {
    await make('орой', '88000001', 2000, '2026-12-01T18:00:00Z');
    await make('эрт', '88000002', 2000, '2026-12-01T09:00:00Z');
    expect((await getLeaderboard(CONTEST))[0].firstName).toBe('Эрт');
  });

  it('limit-ийг хүндэтгэнэ', async () => {
    for (let i = 0; i < 10; i++) {
      await make(`ажилтан${CYR[i]}`, `8800000${i}`, 100 + i, '2026-12-01T10:00:00Z');
    }
    expect(await getLeaderboard(CONTEST, 3)).toHaveLength(3);
  });

  it('утасны дугаарыг задруулахгүй', async () => {
    await make('ганбат', '88112233', 500, '2026-12-01T10:00:00Z');
    expect(JSON.stringify(await getLeaderboard(CONTEST))).not.toContain('88112233');
  });

  it('огт тоглоогүй (0 оноотой) хүн жагсаалтад орохгүй', async () => {
    const r = await registerOrGet({ ...base, firstName: 'тоглоогүй', phone: '88009999' });
    expect(r.ok).toBe(true);
    expect(await getLeaderboard(CONTEST)).toEqual([]);
  });
});

describe('тэмцээн тусгаарлалт', () => {
  it('нэг тэмцээний оноо нөгөөд харагдахгүй', async () => {
    await make('Нэгдүгээр', '88110001', 900, '2026-11-25T10:00:00+08:00', CONTEST);
    await make('Хоёрдугаар', '88110002', 800, '2026-11-29T10:00:00+08:00', OTHER);

    const a = await getLeaderboard(CONTEST);
    const b = await getLeaderboard(OTHER);
    expect(a.map((r) => r.firstName)).toEqual(['Нэгдүгээр']);
    expect(b.map((r) => r.firstName)).toEqual(['Хоёрдугаар']);
  });

  it('шагналт байр зөвхөн 1-р байр', async () => {
    await make('Нэг', '88110003', 900, '2026-11-25T10:00:00+08:00');
    await make('Хоёр', '88110004', 800, '2026-11-25T10:00:00+08:00');
    const rows = await getLeaderboard(CONTEST);
    expect(rows.map((r) => r.isPrize)).toEqual([true, false]);
  });
});

describe('getStanding', () => {
  it('байр ба нийт оролцогчийн тоог буцаана', async () => {
    await make('нэг', '88000001', 3000, '2026-12-01T10:00:00Z');
    const id = await make('хоёр', '88000002', 1000, '2026-12-01T10:00:00Z');
    const s = await getStanding(CONTEST, id);
    expect(s).toEqual({ rank: 2, bestScore: 1000, total: 2 });
  });

  it('байхгүй бүртгэлд null', async () => {
    expect(await getStanding(CONTEST, '00000000-0000-0000-0000-000000000000')).toBeNull();
  });
});
