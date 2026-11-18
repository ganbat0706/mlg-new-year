import { registerOrGet } from '@/lib/repo/registrations';
import { isGameOpen } from '@/lib/config';
import { ok, bad, closed, boom, readJson } from '@/lib/http';
import { hitRateLimit, clientIp } from '@/lib/rate-limit';

type Body = {
  lastName?: string; firstName?: string; department?: string; phone?: string;
};

export async function POST(req: Request): Promise<Response> {
  if (!isGameOpen()) return closed();

  if (hitRateLimit(clientIp(req))) {
    return bad('Хэт олон удаа оролдлоо. Минут хүлээгээд дахин оролдоно уу.', 429);
  }

  const body = await readJson<Body>(req);
  if (!body) return bad('Өгөгдөл буруу байна');

  try {
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
