import { createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_COOKIE = 'mlg_admin';

function secret(): string {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) throw new Error('ADMIN_PASSWORD тохируулаагүй байна');
  return pw;
}

/** Нууц үгнээс гаргасан тогтмол токен. Нууц үг солигдвол хуучин нь хүчингүй. */
export function signAdminToken(): string {
  return createHmac('sha256', secret()).update('mlg-admin-v1').digest('hex');
}

export function verifyAdminToken(token: unknown): boolean {
  if (typeof token !== 'string' || token.length === 0) return false;
  let expected: string;
  try { expected = signAdminToken(); } catch { return false; }

  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function checkPassword(input: unknown): boolean {
  if (typeof input !== 'string') return false;

  let pw: string;
  try { pw = secret(); } catch { return false; }

  const a = Buffer.from(input);
  const b = Buffer.from(pw);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
