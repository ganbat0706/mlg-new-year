import { describe, it, expect, beforeEach } from 'vitest';
import { hitRateLimit, clientIp, resetRateLimit } from '@/lib/rate-limit';

beforeEach(() => { resetRateLimit(); });

describe('hitRateLimit', () => {
  it('эхний 10 хүсэлтийг зөвшөөрнө', () => {
    for (let i = 0; i < 10; i++) expect(hitRateLimit('1.1.1.1')).toBe(false);
  });

  it('11 дэх хүсэлтийг татгалзана', () => {
    for (let i = 0; i < 10; i++) hitRateLimit('1.1.1.1');
    expect(hitRateLimit('1.1.1.1')).toBe(true);
  });

  it('өөр IP-д нөлөөлөхгүй', () => {
    for (let i = 0; i < 10; i++) hitRateLimit('1.1.1.1');
    expect(hitRateLimit('2.2.2.2')).toBe(false);
  });
});

describe('clientIp', () => {
  it('x-forwarded-for-ийн эхний утгыг авна', () => {
    const req = new Request('http://x', {
      headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' },
    });
    expect(clientIp(req)).toBe('203.0.113.5');
  });

  it('header байхгүй бол unknown', () => {
    expect(clientIp(new Request('http://x'))).toBe('unknown');
  });

  it('хоёул ирвэл x-real-ip-ийг ашиглана (x-forwarded-for-ийг клиент хуурамчаар солиод мултарч болохгүй)', () => {
    const req = new Request('http://x', {
      headers: {
        'x-real-ip': '198.51.100.9',
        'x-forwarded-for': '203.0.113.5, 10.0.0.1',
      },
    });
    expect(clientIp(req)).toBe('198.51.100.9');
  });
});
