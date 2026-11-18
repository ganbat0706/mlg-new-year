import { startAttempt } from '@/lib/repo/attempts';
import { isGameOpen } from '@/lib/config';
import { ok, bad, closed, boom, readJson } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  if (!isGameOpen()) return closed();

  const body = await readJson<{ registrationId?: string }>(req);
  if (!body?.registrationId) return bad('registrationId дутуу байна');

  try {
    const result = await startAttempt(body.registrationId);
    if (!result.ok) return bad(result.error);
    return ok(result.value);
  } catch (err) {
    console.error('[attempt/start]', err);
    return boom();
  }
}
