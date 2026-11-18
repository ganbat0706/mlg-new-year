export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

/** Монгол кирилл үсэг (ё, ө, ү багтана). Латин үсэг энд ОРОХГҮЙ. */
const CYRILLIC_LETTER = 'А-Яа-яЁёӨөҮү';
const NAME_RE = new RegExp(`^[${CYRILLIC_LETTER}][${CYRILLIC_LETTER}\\s-]*$`, 'u');

const NAME_MIN = 2;
const NAME_MAX = 50;

export function normalizeName(raw: string): string {
  const t = raw.trim().replace(/\s+/g, ' ');
  if (t.length === 0) return '';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function validateName(raw: string, field: string): Result<string> {
  const value = normalizeName(raw ?? '');
  if (value.length === 0) {
    return { ok: false, error: `${field} хоосон байна` };
  }
  if (value.length < NAME_MIN || value.length > NAME_MAX) {
    return { ok: false, error: `${field} ${NAME_MIN}-${NAME_MAX} тэмдэгт байх ёстой` };
  }
  if (!NAME_RE.test(value)) {
    return { ok: false, error: `${field}-ээ кирилл үсгээр бичнэ үү` };
  }
  return { ok: true, value };
}

const PHONE_RE = /^[89]\d{7}$/;

export function validatePhone(raw: string): Result<string> {
  const value = (raw ?? '').replace(/[\s-]/g, '');
  if (!PHONE_RE.test(value)) {
    return { ok: false, error: 'Утасны дугаар 8 эсвэл 9-өөр эхэлсэн 8 оронтой байна' };
  }
  return { ok: true, value };
}

export function validateDepartment(raw: string, allowed: readonly string[]): Result<string> {
  const value = (raw ?? '').trim();
  if (!allowed.includes(value)) {
    return { ok: false, error: 'Хэлтсээ жагсаалтаас сонгоно уу' };
  }
  return { ok: true, value };
}
