import { describe, it, expect } from 'vitest';
import { normalizeName, validateName, validatePhone, validateDepartment } from '@/lib/validation';

describe('normalizeName', () => {
  it('илүүдэл зай арилгана', () => {
    expect(normalizeName('  бат   болд ')).toBe('Бат болд');
  });
  it('эхний үсгийг томоор болгоно', () => {
    expect(normalizeName('ганбат')).toBe('Ганбат');
  });
  it('аль хэдийн том байвал хэвээр', () => {
    expect(normalizeName('Ганбат')).toBe('Ганбат');
  });
});

describe('validateName', () => {
  it('кирилл нэрийг зөвшөөрнө', () => {
    const r = validateName('ганбат', 'Нэр');
    expect(r).toEqual({ ok: true, value: 'Ганбат' });
  });

  it('өвөрмөц монгол үсгийг зөвшөөрнө', () => {
    expect(validateName('өнөрцэцэг', 'Нэр').ok).toBe(true);
    expect(validateName('үнэнбат', 'Нэр').ok).toBe(true);
    expect(validateName('ёндон', 'Нэр').ok).toBe(true);
  });

  it('зураастай нэрийг зөвшөөрнө', () => {
    expect(validateName('бат-эрдэнэ', 'Нэр').ok).toBe(true);
  });

  it('латин үсгийг татгалзана', () => {
    const r = validateName('Ganbat', 'Нэр');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('кирилл');
  });

  it('латин homoglyph холилдсоныг татгалзана', () => {
    // 'A' нь латин, бусад нь кирилл
    expect(validateName('Aлтан', 'Нэр').ok).toBe(false);
  });

  it('тоо агуулсныг татгалзана', () => {
    expect(validateName('Бат2', 'Нэр').ok).toBe(false);
  });

  it('хэт богиныг татгалзана', () => {
    expect(validateName('б', 'Нэр').ok).toBe(false);
  });

  it('хэт уртыг татгалзана', () => {
    expect(validateName('б'.repeat(51), 'Нэр').ok).toBe(false);
  });

  it('хоосныг татгалзана', () => {
    expect(validateName('   ', 'Нэр').ok).toBe(false);
  });

  it('алдааны мессеж талбарын нэрийг агуулна', () => {
    const r = validateName('', 'Овог');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('Овог');
  });
});

describe('validatePhone', () => {
  it('8-аар эхэлсэн 8 оронтойг зөвшөөрнө', () => {
    expect(validatePhone('88112233')).toEqual({ ok: true, value: '88112233' });
  });
  it('9-ээр эхэлсэнийг зөвшөөрнө', () => {
    expect(validatePhone('99112233').ok).toBe(true);
  });
  it('зай, зураас арилгаад хүлээн авна', () => {
    expect(validatePhone(' 8811-2233 ')).toEqual({ ok: true, value: '88112233' });
  });
  it('7-гоор эхэлсэнийг татгалзана', () => {
    expect(validatePhone('77112233').ok).toBe(false);
  });
  it('7 оронтойг татгалзана', () => {
    expect(validatePhone('8811223').ok).toBe(false);
  });
  it('9 оронтойг татгалзана', () => {
    expect(validatePhone('881122334').ok).toBe(false);
  });
  it('үсэг агуулсныг татгалзана', () => {
    expect(validatePhone('8811223a').ok).toBe(false);
  });
});

describe('validateDepartment', () => {
  const allowed = ['Хүний нөөц', 'Мэдээллийн технологи'];
  it('жагсаалтад байгааг зөвшөөрнө', () => {
    expect(validateDepartment('Хүний нөөц', allowed).ok).toBe(true);
  });
  it('жагсаалтад байхгүйг татгалзана', () => {
    expect(validateDepartment('Сансрын хэлтэс', allowed).ok).toBe(false);
  });
});
