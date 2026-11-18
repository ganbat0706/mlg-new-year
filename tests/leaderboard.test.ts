import { describe, it, expect, beforeEach } from 'vitest';
import { getLeaderboard, getStanding } from '@/lib/repo/leaderboard';
import { registerOrGet } from '@/lib/repo/registrations';
import { db } from '@/lib/db';
import { registrations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { resetDb } from './helpers/db';
import { GAME } from '@/lib/config';

const base = { lastName: 'батхүү', department: 'Мэдээллийн технологи' };
/** Нэрэнд орлуулж ашиглах кирилл үсгүүд — `${index}`-ийг нэрэнд шууд залгаж болохгүй тул. */
const CYR = ['а', 'б', 'в', 'г', 'д', 'е', 'ж', 'з', 'и', 'к'];

async function make(firstName: string, phone: string, score: number, finishedIso: string) {
  const r = await registerOrGet({ ...base, firstName, phone });
  if (!r.ok) throw new Error(r.error);
  await db.update(registrations)
    .set({ bestScore: score, bestFinishedAt: new Date(finishedIso) })
    .where(eq(registrations.id, r.value.id));
  return r.value.id;
}

beforeEach(async () => { await resetDb(); });

describe('getLeaderboard', () => {
  it('хоосон DB дээр хоосон жагсаалт', async () => {
    expect(await getLeaderboard()).toEqual([]);
  });

  it('оноогоор буурахаар эрэмбэлнэ', async () => {
    await make('нэгдүгээр', '88000001', 1000, '2026-12-01T10:00:00Z');
    await make('хоёрдугаар', '88000002', 3000, '2026-12-01T10:00:00Z');
    const rows = await getLeaderboard();
    expect(rows.map((r) => r.bestScore)).toEqual([3000, 1000]);
    expect(rows[0].rank).toBe(1);
  });

  it(`эхний ${GAME.PRIZE_PLACES} байрыг шагналтай гэж тэмдэглэнэ`, async () => {
    for (let i = 0; i < 7; i++) {
      await make(`ажилтан${CYR[i]}`, `8800000${i}`, 1000 - i * 10, '2026-12-01T10:00:00Z');
    }
    const rows = await getLeaderboard();
    expect(rows.filter((r) => r.isPrize)).toHaveLength(GAME.PRIZE_PLACES);
    expect(rows[GAME.PRIZE_PLACES - 1].isPrize).toBe(true);
    expect(rows[GAME.PRIZE_PLACES].isPrize).toBe(false);
  });

  it('тэнцсэн үед эрт дуусгасан нь дээгүүр', async () => {
    await make('орой', '88000001', 2000, '2026-12-01T18:00:00Z');
    await make('эрт', '88000002', 2000, '2026-12-01T09:00:00Z');
    expect((await getLeaderboard())[0].firstName).toBe('Эрт');
  });

  it('limit-ийг хүндэтгэнэ', async () => {
    for (let i = 0; i < 10; i++) {
      await make(`ажилтан${CYR[i]}`, `8800000${i}`, 100 + i, '2026-12-01T10:00:00Z');
    }
    expect(await getLeaderboard(3)).toHaveLength(3);
  });

  it('утасны дугаарыг задруулахгүй', async () => {
    await make('ганбат', '88112233', 500, '2026-12-01T10:00:00Z');
    expect(JSON.stringify(await getLeaderboard())).not.toContain('88112233');
  });

  it('огт тоглоогүй (0 оноотой) хүн жагсаалтад орохгүй', async () => {
    const r = await registerOrGet({ ...base, firstName: 'тоглоогүй', phone: '88009999' });
    expect(r.ok).toBe(true);
    expect(await getLeaderboard()).toEqual([]);
  });
});

describe('getStanding', () => {
  it('байр ба нийт оролцогчийн тоог буцаана', async () => {
    await make('нэг', '88000001', 3000, '2026-12-01T10:00:00Z');
    const id = await make('хоёр', '88000002', 1000, '2026-12-01T10:00:00Z');
    const s = await getStanding(id);
    expect(s).toEqual({ rank: 2, bestScore: 1000, total: 2 });
  });

  it('байхгүй бүртгэлд null', async () => {
    expect(await getStanding('00000000-0000-0000-0000-000000000000')).toBeNull();
  });
});
