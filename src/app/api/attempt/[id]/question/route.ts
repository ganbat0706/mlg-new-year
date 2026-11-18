import { serveNextQuestion } from '@/lib/repo/attempts';
import { ok, bad, boom } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params;
  try {
    const result = await serveNextQuestion(id);
    if (!result.ok) return bad(result.error);
    return ok(result.value); // null = quiz дууссан
  } catch (err) {
    console.error('[attempt/question]', err);
    return boom();
  }
}
