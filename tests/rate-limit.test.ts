import { describe, it, expect, beforeEach } from 'vitest';
import { hitRateLimit, clientIp, resetRateLimit } from '@/lib/rate-limit';

beforeEach(() => { resetRateLimit(); });

describe('hitRateLimit', () => {
  it('эхний 60 хүсэлтийг зөвшөөрнө', () => {
    for (let i = 0; i < 60; i++) expect(hitRateLimit('register', '1.1.1.1')).toBe(false);
  });

  it('61 дэх хүсэлтийг татгалзана', () => {
    for (let i = 0; i < 60; i++) hitRateLimit('register', '1.1.1.1');
    expect(hitRateLimit('register', '1.1.1.1')).toBe(true);
  });

  it('өөр IP-д нөлөөлөхгүй', () => {
    for (let i = 0; i < 60; i++) hitRateLimit('register', '1.1.1.1');
    expect(hitRateLimit('register', '2.2.2.2')).toBe(false);
  });

  it('ижил IP ч өөр scope-д нөлөөлөхгүй — нэг endpoint нөгөөг нь өлсгөхгүй', () => {
    for (let i = 0; i < 60; i++) hitRateLimit('standing', '1.1.1.1');
    expect(hitRateLimit('standing', '1.1.1.1')).toBe(true);
    expect(hitRateLimit('register', '1.1.1.1')).toBe(false);
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
