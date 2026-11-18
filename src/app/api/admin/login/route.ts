import { cookies } from 'next/headers';
import { checkPassword, signAdminToken, ADMIN_COOKIE } from '@/lib/admin-auth';
import { ok, bad, readJson } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  const body = await readJson<{ password?: string }>(req);
  if (!checkPassword(body?.password ?? '')) {
    return bad('Нууц үг буруу байна', 401);
  }

  const jar = await cookies();
  jar.set(ADMIN_COOKIE, signAdminToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  });

  return ok({ ok: true });
}
