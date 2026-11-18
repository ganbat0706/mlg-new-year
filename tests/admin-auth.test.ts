import { describe, it, expect, beforeEach } from 'vitest';
import { signAdminToken, verifyAdminToken } from '@/lib/admin-auth';

beforeEach(() => { process.env.ADMIN_PASSWORD = 'нууц-үг-123'; });

describe('admin token', () => {
  it('өөрийн гаргасан token-ыг хүлээн авна', () => {
    expect(verifyAdminToken(signAdminToken())).toBe(true);
  });

  it('хоосон token-ыг татгалзана', () => {
    expect(verifyAdminToken(undefined)).toBe(false);
    expect(verifyAdminToken('')).toBe(false);
  });

  it('өөрчилсөн token-ыг татгалзана', () => {
    const token = signAdminToken();
    expect(verifyAdminToken(token.slice(0, -1) + 'x')).toBe(false);
  });

  it('нууц үг солигдвол хуучин token хүчингүй болно', () => {
    const token = signAdminToken();
    process.env.ADMIN_PASSWORD = 'өөр-нууц-үг';
    expect(verifyAdminToken(token)).toBe(false);
  });

  it('ADMIN_PASSWORD тохируулаагүй бол алдаа шиднэ', () => {
    delete process.env.ADMIN_PASSWORD;
    expect(() => signAdminToken()).toThrow();
  });
});
