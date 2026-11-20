import { describe, it, expect } from 'vitest';
import { isGameOpen } from '@/lib/config';
import { CONTESTS, contestStartsAt, contestEndsAt } from '@/lib/contests';

/**
 * `isGameOpen` нь одоо ГУРВАН ТЭМЦЭЭНИЙ хуваариас хамаарна: нэг ч
 * тэмцээн дуусаагүй л бол арга хэмжээ үргэлжилж байна.
 */
describe('isGameOpen', () => {
  const first = CONTESTS[0];
  const last = [...CONTESTS].sort((a, b) => contestEndsAt(b).getTime() - contestEndsAt(a).getTime())[0];

  it('эхний тэмцээн эхлэхээс өмнө ч нээлттэй (урьдчилж бүртгүүлнэ)', () => {
    expect(isGameOpen(new Date(contestStartsAt(first).getTime() - 86_400_000))).toBe(true);
  });

  it('тэмцээн хоорондын завсарт нээлттэй', () => {
    expect(isGameOpen(new Date(contestEndsAt(first).getTime() + 60_000))).toBe(true);
  });

  it('сүүлийн тэмцээн дуусах яг мөчид нээлттэй', () => {
    expect(isGameOpen(contestEndsAt(last))).toBe(true);
  });

  it('бүх тэмцээн дууссаны дараа хаалттай', () => {
    expect(isGameOpen(new Date(contestEndsAt(last).getTime() + 1000))).toBe(false);
  });
});
