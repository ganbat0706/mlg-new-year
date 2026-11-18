import { finishAttempt } from '@/lib/repo/attempts';
import { ok, bad, boom } from '@/lib/http';

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params;
  try {
    const result = await finishAttempt(id);
    if (!result.ok) return bad(result.error);
    return ok(result.value);
  } catch (err) {
    console.error('[attempt/finish]', err);
    return boom();
  }
}
