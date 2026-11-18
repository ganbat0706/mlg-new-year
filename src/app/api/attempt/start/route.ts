import { startAttempt } from '@/lib/repo/attempts';
import { isGameOpen } from '@/lib/config';
import { ok, bad, closed, boom, readJson } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  const body = await readJson<{ registrationId?: string }>(req);
  if (!body?.registrationId) return bad('registrationId дутуу байна');

  try {
    // isGameOpen() нь GAME_CLOSES_AT орчны хувьсагч алга эсвэл буруу форматтай бол
    // throw хийдэг (gameClosesAt()) — try дотор байрлуулснаар энэ алдааг доорх
    // catch (boom()) барьж, цоожтой орчны тохиргооны алдаа нь хоосон 500 биш,
    // лог бүхий цэвэр хариу болно.
    if (!isGameOpen()) return closed();

    const result = await startAttempt(body.registrationId);
    if (!result.ok) return bad(result.error);
    return ok(result.value);
  } catch (err) {
    console.error('[attempt/start]', err);
    return boom();
  }
}
