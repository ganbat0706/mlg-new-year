import { getLeaderboard } from '@/lib/repo/leaderboard';
import { ok, boom } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  const limitRaw = new URL(req.url).searchParams.get('limit');
  const parsed = limitRaw === null ? 20 : Number(limitRaw);
  const limit = Number.isInteger(parsed) && parsed > 0 && parsed <= 500 ? parsed : 20;

  try {
    return ok(await getLeaderboard(limit));
  } catch (err) {
    console.error('[leaderboard]', err);
    return boom();
  }
}
