import { describe, it, expect } from 'vitest';
import { formatInviteCode } from '@/lib/invite';

describe('formatInviteCode', () => {
  it('эхний кодыг MLG-202601 гэж үүсгэнэ', () => {
    expect(formatInviteCode(1)).toBe('MLG-202601');
  });
  it('хоёр оронтой дугаарыг хэвээр нь залгана', () => {
    expect(formatInviteCode(42)).toBe('MLG-202642');
  });
  it('99-ээс хойш оронгийн тоо өснө', () => {
    expect(formatInviteCode(100)).toBe('MLG-2026100');
  });
  it('0 эсвэл сөрөг дугаарыг татгалзана', () => {
    expect(() => formatInviteCode(0)).toThrow();
    expect(() => formatInviteCode(-1)).toThrow();
  });
  it('бутархай дугаарыг татгалзана', () => {
    expect(() => formatInviteCode(1.5)).toThrow();
  });
});
