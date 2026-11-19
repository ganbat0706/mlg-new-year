import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * ЯАГААД ЭНД THROW ХИЙХГҮЙ ВЭ:
 *
 * Next.js `build` үед бүх route модулийг импортлож тохиргоог нь цуглуулдаг.
 * Өмнө нь энэ файл модуль ачаалах үедээ шууд `throw` хийдэг байсан тул
 * `DATABASE_URL`-гүй орчинд (Vercel дээрх анхны build, preview build, CI)
 * БҮТЭЭХ үйл явц өөрөө унадаг байв:
 *
 *     Error: Failed to collect page data for /api/admin/export
 *       [cause]: Error: DATABASE_URL тохируулаагүй байна
 *
 * Build нь ажиллаж байгаа өгөгдлийн сан шаардах ёсгүй — зөвхөн АЖИЛЛАХ үед
 * хэрэгтэй. Тиймээс:
 *
 *  • `DATABASE_URL` байгаа бол (хэвийн тохиолдол) — өмнөхтэй ЯГ адилхан,
 *    ямар ч нэмэлт давхарга байхгүй.
 *  • Байхгүй бол — хандах үед нь ойлгомжтой алдаа шиддэг «хорт бэлдмэл»
 *    объект буцаана. Импорт амжилттай болж build гүйцэд явна, харин
 *    өгөгдлийн санд хандах эхний оролдлого тодорхой алдаа өгнө.
 */
function missing(what: string): never {
  throw new Error(
    `DATABASE_URL тохируулаагүй байна — ${what} ашиглах боломжгүй. `
    + 'Production дээр Vercel-ийн Environment Variables хэсэгт нэмнэ үү '
    + '(Neon-ийн POOLED холболтын мөр).',
  );
}

/** Хандсан даруйд ойлгомжтой алдаа шиддэг орлуулагч. */
function poison<T extends object>(what: string): T {
  return new Proxy({} as T, {
    get: () => missing(what),
    apply: () => missing(what),
  });
}

const url = process.env.DATABASE_URL;

/**
 * `prepare: false` — заавал.
 *
 * Production дээр Neon-ийн **pooled** холболтын мөрийг ашиглана. Тэр эцэг нь
 * PgBouncer-ийг *transaction* горимд ажиллуулдаг: холболт гүйлгээ бүрийн
 * дараа өөр клиент рүү шилждэг тул нэг холболт дээр нэрлэгдсэн prepared
 * statement үүсгээд дараа нь дуудах боломжгүй («prepared statement "s1"
 * does not exist»). postgres.js анхдагчаар prepared statement ашигладаг.
 */
const realClient = url ? postgres(url, { max: 5, prepare: false }) : null;

export const client = realClient ?? poison<ReturnType<typeof postgres>>('postgres client');
export const db = realClient
  ? drizzle(realClient, { schema })
  : poison<ReturnType<typeof drizzle<typeof schema>>>('өгөгдлийн сан');
