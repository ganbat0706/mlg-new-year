import { registerOrGet } from '@/lib/repo/registrations';
import { isGameOpen } from '@/lib/config';
import { ok, bad, closed, boom, readJson } from '@/lib/http';
import { hitRateLimit, clientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  lastName?: string; firstName?: string; department?: string; phone?: string;
};

export async function POST(req: Request): Promise<Response> {
  if (hitRateLimit('register', clientIp(req))) {
    return bad('Хэт олон удаа оролдлоо. Минут хүлээгээд дахин оролдоно уу.', 429);
  }

  const body = await readJson<Body>(req);
  if (!body) return bad('Өгөгдөл буруу байна');

  try {
    // isGameOpen() нь GAME_CLOSES_AT орчны хувьсагч алга эсвэл буруу форматтай бол
    // throw хийдэг (gameClosesAt()) — try дотор байрлуулснаар энэ алдааг доорх
    // catch (boom()) барьж, цоожтой орчны тохиргооны алдаа нь хоосон 500 биш,
    // лог бүхий цэвэр хариу болно.
    if (!isGameOpen()) return closed();

    const result = await registerOrGet({
      lastName: body.lastName ?? '',
      firstName: body.firstName ?? '',
      department: body.department ?? '',
      phone: body.phone ?? '',
    });
    if (!result.ok) return bad(result.error);
    return ok(result.value);
  } catch (err) {
    console.error('[register]', err);
    return boom();
  }
}
