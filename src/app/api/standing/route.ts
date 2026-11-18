import { getStanding } from '@/lib/repo/leaderboard';
import { findByPhone } from '@/lib/repo/registrations';
import { validatePhone } from '@/lib/validation';
import { ok, bad, boom, readJson } from '@/lib/http';
import { hitRateLimit, clientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  if (hitRateLimit(clientIp(req))) {
    return bad('Хэт олон удаа оролдлоо. Минут хүлээгээд дахин оролдоно уу.', 429);
  }

  const body = await readJson<{ phone?: string }>(req);
  const phone = validatePhone(body?.phone ?? '');
  if (!phone.ok) return bad(phone.error);

  try {
    const reg = await findByPhone(phone.value);
    if (!reg) return bad('Энэ дугаараар бүртгэл олдсонгүй', 404);

    const standing = await getStanding(reg.id);
    return ok({
      lastName: reg.lastName,
      firstName: reg.firstName,
      inviteCode: reg.inviteCode,
      bestScore: reg.bestScore,
      rank: standing?.rank ?? null,
      total: standing?.total ?? 0,
    });
  } catch (err) {
    console.error('[standing]', err);
    return boom();
  }
}
