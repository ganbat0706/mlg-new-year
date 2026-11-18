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
  it('зураасаас хойш нэрийг томоор болгоно', () => {
    expect(normalizeName('бат-эрдэнэ')).toBe('Бат-Эрдэнэ');
  });
  it('тоо оруулахад хоосон буцаана', () => {
    expect(normalizeName(123 as any)).toBe('');
  });
  it('массив оруулахад хоосон буцаана', () => {
    expect(normalizeName(['бат'] as any)).toBe('');
  });
  it('null оруулахад хоосон буцаана', () => {
    expect(normalizeName(null as any)).toBe('');
  });
  it('undefined оруулахад хоосон буцаана', () => {
    expect(normalizeName(undefined as any)).toBe('');
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

  it('зураасаас төгсөхийг татгалзана', () => {
    expect(validateName('Бат-', 'Нэр').ok).toBe(false);
  });

  it('зайгаас төгсөхийг нормалижлаад өнгөрүүлнө', () => {
    expect(validateName('Бат ', 'Нэр')).toEqual({ ok: true, value: 'Бат' });
  });

  it('тоо оруулахад Result буцаана', () => {
    const r = validateName(123 as any, 'Нэр');
    expect(r.ok).toBe(false);
  });

  it('массив оруулахад Result буцаана', () => {
    const r = validateName(['бат'] as any, 'Нэр');
    expect(r.ok).toBe(false);
  });

  it('null оруулахад Result буцаана', () => {
    const r = validateName(null as any, 'Нэр');
    expect(r.ok).toBe(false);
  });

  it('undefined оруулахад Result буцаана', () => {
    const r = validateName(undefined as any, 'Нэр');
    expect(r.ok).toBe(false);
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

  it('976 төрийн код зайтай хүлээн авна', () => {
    expect(validatePhone('+976 8811-2233')).toEqual({ ok: true, value: '88112233' });
  });

  it('976 төрийн код зайгүйгээр хүлээн авна', () => {
    expect(validatePhone('97688112233')).toEqual({ ok: true, value: '88112233' });
  });

  it('976-аар эхэлсэн байвал орон тоолж шалгана', () => {
    expect(validatePhone('97612345')).toEqual({ ok: true, value: '97612345' });
  });

  it('тоо оруулахад Result буцаана', () => {
    const r = validatePhone(123 as any);
    expect(r.ok).toBe(false);
  });

  it('массив оруулахад Result буцаана', () => {
    const r = validatePhone(['88112233'] as any);
    expect(r.ok).toBe(false);
  });

  it('null оруулахад Result буцаана', () => {
    const r = validatePhone(null as any);
    expect(r.ok).toBe(false);
  });

  it('undefined оруулахад Result буцаана', () => {
    const r = validatePhone(undefined as any);
    expect(r.ok).toBe(false);
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

  it('тоо оруулахад Result буцаана', () => {
    const r = validateDepartment(123 as any, allowed);
    expect(r.ok).toBe(false);
  });

  it('массив оруулахад Result буцаана', () => {
    const r = validateDepartment(['Хүний нөөц'] as any, allowed);
    expect(r.ok).toBe(false);
  });

  it('null оруулахад Result буцаана', () => {
    const r = validateDepartment(null as any, allowed);
    expect(r.ok).toBe(false);
  });

  it('undefined оруулахад Result буцаана', () => {
    const r = validateDepartment(undefined as any, allowed);
    expect(r.ok).toBe(false);
  });
});
