export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

/** Монгол кирилл үсэг (ё, ө, ү багтана). Латин үсэг энд ОРОХГҮЙ. */
const CYRILLIC_LETTER = 'А-Яа-яЁёӨөҮү';
const NAME_RE = new RegExp(`^[${CYRILLIC_LETTER}][${CYRILLIC_LETTER}\\s-]*$`, 'u');

const NAME_MIN = 2;
const NAME_MAX = 50;

export function normalizeName(raw: string): string {
  if (typeof raw !== 'string') return '';
  const t = raw.trim().replace(/\s+/g, ' ');
  if (t.length === 0) return '';
  // Capitalize first letter of each hyphen-separated part
  return t
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-');
}

export function validateName(raw: string, field: string): Result<string> {
  if (typeof raw !== 'string') {
    return { ok: false, error: `${field} хоосон байна` };
  }
  const value = normalizeName(raw);
  if (value.length === 0) {
    return { ok: false, error: `${field} хоосон байна` };
  }
  if (value.length < NAME_MIN || value.length > NAME_MAX) {
    return { ok: false, error: `${field} ${NAME_MIN}-${NAME_MAX} тэмдэгт байх ёстой` };
  }
  if (!NAME_RE.test(value) || /[\s-]$/.test(value)) {
    return { ok: false, error: `${field}-ээ кирилл үсгээр бичнэ үү` };
  }
  return { ok: true, value };
}

const PHONE_RE = /^[89]\d{7}$/;

export function validatePhone(raw: string): Result<string> {
  if (typeof raw !== 'string') {
    return { ok: false, error: 'Утасны дугаар 8 эсвэл 9-өөр эхэлсэн 8 оронтой байна' };
  }
  let value = raw.replace(/[\s-]/g, '');
  // Strip leading +
  if (value.startsWith('+')) {
    value = value.slice(1);
  }
  // Strip leading 976 only if exactly 8 digits remain
  if (value.startsWith('976')) {
    const afterPrefix = value.slice(3);
    if (/^\d{8}$/.test(afterPrefix)) {
      value = afterPrefix;
    }
  }
  if (!PHONE_RE.test(value)) {
    return { ok: false, error: 'Утасны дугаар 8 эсвэл 9-өөр эхэлсэн 8 оронтой байна' };
  }
  return { ok: true, value };
}

export function validateDepartment(raw: string, allowed: readonly string[]): Result<string> {
  if (typeof raw !== 'string') {
    return { ok: false, error: 'Хэлтсээ жагсаалтаас сонгоно уу' };
  }
  const value = raw.trim();
  if (!allowed.includes(value)) {
    return { ok: false, error: 'Хэлтсээ жагсаалтаас сонгоно уу' };
  }
  return { ok: true, value };
}
