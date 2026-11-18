import { describe, it, expect } from 'vitest';
import { mulberry32, shuffle, pickN } from '@/lib/rng';

describe('mulberry32', () => {
  it('ижил seed ижил дараалал өгнө', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('өөр seed өөр дараалал өгнө', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });

  it('0 ба 1-ийн хооронд утга буцаана', () => {
    const r = mulberry32(7);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('shuffle', () => {
  it('бүх элементийг хадгална', () => {
    const out = shuffle([1, 2, 3, 4, 5], mulberry32(3));
    expect([...out].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });

  it('эх массивыг өөрчлөхгүй', () => {
    const src = [1, 2, 3];
    shuffle(src, mulberry32(3));
    expect(src).toEqual([1, 2, 3]);
  });

  it('ижил seed ижил үр дүн', () => {
    expect(shuffle([1, 2, 3, 4, 5], mulberry32(9)))
      .toEqual(shuffle([1, 2, 3, 4, 5], mulberry32(9)));
  });
});

describe('pickN', () => {
  it('яг n ширхэг сонгоно', () => {
    expect(pickN([1, 2, 3, 4, 5], 3, mulberry32(1))).toHaveLength(3);
  });

  it('давхардахгүй', () => {
    const out = pickN([1, 2, 3, 4, 5], 5, mulberry32(1));
    expect(new Set(out).size).toBe(5);
  });

  it('n массиваас их бол бүгдийг буцаана', () => {
    expect(pickN([1, 2], 10, mulberry32(1))).toHaveLength(2);
  });
});
