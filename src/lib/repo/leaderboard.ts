import { gt } from 'drizzle-orm';
import { db } from '@/lib/db';
import { registrations } from '@/lib/db/schema';
import { GAME } from '@/lib/config';
import { rankAll } from '@/lib/scoring';

export type LeaderRow = {
  rank: number;
  lastName: string;
  firstName: string;
  bestScore: number;
  isPrize: boolean;
};

/** Оноо авсан (0-ээс дээш) бүртгэлүүдийг эрэмбэлсэн дарааллаар. */
async function rankedRows() {
  const rows = await db.select({
    id: registrations.id,
    lastName: registrations.lastName,
    firstName: registrations.firstName,
    bestScore: registrations.bestScore,
    bestFinishedAt: registrations.bestFinishedAt,
  }).from(registrations).where(gt(registrations.bestScore, 0));

  return rankAll(rows);
}

export async function getLeaderboard(limit?: number): Promise<LeaderRow[]> {
  const ranked = await rankedRows();
  const sliced = typeof limit === 'number' ? ranked.slice(0, limit) : ranked;

  return sliced.map((r) => ({
    rank: r.rank,
    lastName: r.lastName,
    firstName: r.firstName,
    bestScore: r.bestScore,
    isPrize: r.rank <= GAME.PRIZE_PLACES,
  }));
}

export async function getStanding(registrationId: string): Promise<
  { rank: number; bestScore: number; total: number } | null
> {
  const ranked = await rankedRows();
  const me = ranked.find((r) => r.id === registrationId);
  if (!me) return null;
  return { rank: me.rank, bestScore: me.bestScore, total: ranked.length };
}
