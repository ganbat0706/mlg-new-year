import { getLeaderboard } from '@/lib/repo/leaderboard';
import { contestById, focusContest } from '@/lib/contests';
import { ok, boom } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  const params = new URL(req.url).searchParams;
  // ?contest=<id> — өгөөгүй бол нээлттэй, эс бөгөөс сүүлд дууссан тэмцээн.
  const contest = contestById(params.get('contest') ?? '') ?? focusContest();
  const limitRaw = params.get('limit');
  const parsed = limitRaw === null ? 20 : Number(limitRaw);
  const limit = Number.isInteger(parsed) && parsed > 0 && parsed <= 500 ? parsed : 20;

  try {
    return ok({ contestId: contest.id, contestName: contest.name, rows: await getLeaderboard(contest.id, limit) });
  } catch (err) {
    console.error('[leaderboard]', err);
    return boom();
  }
}
