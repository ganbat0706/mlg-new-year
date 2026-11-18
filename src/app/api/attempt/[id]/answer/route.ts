import { submitAnswer } from '@/lib/repo/attempts';
import { ok, bad, boom, readJson } from '@/lib/http';

type Body = { questionId?: number; choiceIndex?: number };

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params;
  const body = await readJson<Body>(req);
  if (!body || typeof body.questionId !== 'number') {
    return bad('questionId дутуу байна');
  }
  const choiceIndex = typeof body.choiceIndex === 'number' ? body.choiceIndex : -1;

  try {
    const result = await submitAnswer(id, body.questionId, choiceIndex);
    if (!result.ok) return bad(result.error);
    return ok(result.value);
  } catch (err) {
    console.error('[attempt/answer]', err);
    return boom();
  }
}
