import { describe, it, expect, afterEach } from 'vitest';
import { isGameOpen, gameClosesAt } from '@/lib/config';

const ORIGINAL = process.env.GAME_CLOSES_AT;
afterEach(() => { process.env.GAME_CLOSES_AT = ORIGINAL; });

describe('isGameOpen', () => {
  it('хаагдах огнооноос өмнө нээлттэй', () => {
    process.env.GAME_CLOSES_AT = '2026-12-03T23:59:59+08:00';
    expect(isGameOpen(new Date('2026-12-01T10:00:00+08:00'))).toBe(true);
  });

  it('хаагдах огнооны дараа хаалттай', () => {
    process.env.GAME_CLOSES_AT = '2026-12-03T23:59:59+08:00';
    expect(isGameOpen(new Date('2026-12-04T00:00:01+08:00'))).toBe(false);
  });

  it('яг хаагдах мөчид нээлттэй хэвээр', () => {
    process.env.GAME_CLOSES_AT = '2026-12-03T23:59:59+08:00';
    expect(isGameOpen(new Date('2026-12-03T23:59:59+08:00'))).toBe(true);
  });

  it('GAME_CLOSES_AT тохируулаагүй бол анхдагч огноог ашиглана (сайт унахгүй)', () => {
    delete process.env.GAME_CLOSES_AT;
    expect(() => gameClosesAt()).not.toThrow();
    expect(gameClosesAt().toISOString()).toBe(new Date('2026-12-03T23:59:59+08:00').toISOString());
  });

  it('GAME_CLOSES_AT буруу бол алдаа шиднэ', () => {
    process.env.GAME_CLOSES_AT = 'тийм огноо байхгүй';
    expect(() => gameClosesAt()).toThrow();
  });
});
