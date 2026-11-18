import { describe, it, expect, beforeEach } from 'vitest';
import { signAdminToken, verifyAdminToken, checkPassword } from '@/lib/admin-auth';

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

  it('string бус token-ыг шидэлгүйгээр татгалзана', () => {
    expect(verifyAdminToken(12345)).toBe(false);
    expect(verifyAdminToken(true)).toBe(false);
    expect(verifyAdminToken({ a: 1 })).toBe(false);
    expect(verifyAdminToken(['x'])).toBe(false);
    expect(verifyAdminToken(null)).toBe(false);
    expect(verifyAdminToken(undefined)).toBe(false);
  });
});

describe('checkPassword', () => {
  it('зөв нууц үгийг зөвшөөрнө', () => {
    expect(checkPassword('нууц-үг-123')).toBe(true);
  });

  it('буруу нууц үгийг татгалзана', () => {
    expect(checkPassword('буруу')).toBe(false);
  });

  it('string бус утгыг шидэлгүйгээр татгалзана', () => {
    expect(checkPassword(12345)).toBe(false);
    expect(checkPassword(true)).toBe(false);
    expect(checkPassword({ a: 1 })).toBe(false);
    expect(checkPassword(['x'])).toBe(false);
    expect(checkPassword(null)).toBe(false);
    expect(checkPassword(undefined)).toBe(false);
  });
});
