import { submitReaction } from '@/lib/repo/attempts';
import { REACTION } from '@/lib/config';
import { ok, bad, boom, readJson } from '@/lib/http';
import type { Tap } from '@/lib/reaction';

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params;
  const body = await readJson<{ taps?: unknown }>(req);

  if (!body || !Array.isArray(body.taps)) return bad('taps дутуу байна');
  if (body.taps.length > REACTION.MAX_TAPS) {
    return bad(`Хэт олон tap илгээгдлээ (дээд тал нь ${REACTION.MAX_TAPS})`);
  }

  const taps: Tap[] = body.taps
    .filter((t): t is Tap =>
      typeof t === 'object' && t !== null &&
      typeof (t as Tap).id === 'number' && typeof (t as Tap).t === 'number')
    .map((t) => ({ id: t.id, t: t.t }));

  try {
    const result = await submitReaction(id, taps);
    if (!result.ok) return bad(result.error);
    return ok(result.value);
  } catch (err) {
    console.error('[attempt/reaction]', err);
    return boom();
  }
}
