import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { attempts, registrations } from '@/lib/db/schema';
import { GAME } from '@/lib/config';
import { rankAll } from '@/lib/scoring';

export type LeaderRow = {
  rank: number;
  lastName: string;
  firstName: string;
  bestScore: number;
  isPrize: boolean;
};

/**
 * Жагсаалт нь ТЭМЦЭЭН ТУС БҮРЭЭР гарна.
 *
 * Оноог `registrations.bestScore`-оос биш, тухайн тэмцээнд ДУУССАН
 * оролдлогоос шууд уншина: тэр багана нь бүх тэмцээний хамгийн сайн оноо
 * (урилган дээр хэрэглэгддэг) бөгөөд нэг тэмцээний жагсаалтад тохирохгүй.
 *
 * Нэг тэмцээнд нэг ажилтан нэг л удаа тоглодог тул мөр давхардахгүй;
 * гэвч тохиргоо өөрчлөгдвөл давхардахад бэлэн байхын тулд хамгийн өндөр
 * онооны мөрийг сонгоно.
 */
async function rankedRows(contestId: string) {
  const rows = await db.select({
    id: attempts.registrationId,
    lastName: registrations.lastName,
    firstName: registrations.firstName,
    bestScore: attempts.totalScore,
    bestFinishedAt: attempts.finishedAt,
  })
    .from(attempts)
    .innerJoin(registrations, eq(registrations.id, attempts.registrationId))
    .where(and(eq(attempts.contestId, contestId), eq(attempts.status, 'completed')));

  const best = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    const prev = best.get(r.id);
    if (!prev || r.bestScore > prev.bestScore) best.set(r.id, r);
  }

  return rankAll([...best.values()].filter((r) => r.bestScore > 0));
}

export async function getLeaderboard(contestId: string, limit?: number): Promise<LeaderRow[]> {
  const ranked = await rankedRows(contestId);
  const sliced = typeof limit === 'number' ? ranked.slice(0, limit) : ranked;

  return sliced.map((r) => ({
    rank: r.rank,
    lastName: r.lastName,
    firstName: r.firstName,
    bestScore: r.bestScore,
    isPrize: r.rank <= GAME.PRIZE_PLACES,
  }));
}

export async function getStanding(contestId: string, registrationId: string): Promise<
  { rank: number; bestScore: number; total: number } | null
> {
  const ranked = await rankedRows(contestId);
  const me = ranked.find((r) => r.id === registrationId);
  if (!me) return null;
  return { rank: me.rank, bestScore: me.bestScore, total: ranked.length };
}
