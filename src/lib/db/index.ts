import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL тохируулаагүй байна');

/**
 * `prepare: false` — заавал.
 *
 * Production дээр Neon (эсвэл ижил төстэй) -ийн **pooled** холболтын мөрийг
 * ашиглана. Тэр эцэг нь PgBouncer-ийг *transaction* горимд ажиллуулдаг:
 * холболт нь гүйлгээ бүрийн дараа өөр клиент рүү шилждэг тул нэг холболт
 * дээр нэрлэгдсэн prepared statement үүсгээд дараа нь дуудах боломжгүй
 * («prepared statement "s1" does not exist» алдаа). postgres.js анхдагчаар
 * prepared statement ашигладаг тул үүнийг унтраав.
 *
 * Локал (шууд Postgres) дээр энэ нь ердөө өчүүхэн хурдны зардал — харин
 * production дээр энэгүйгээр санамсаргүй, давтагдахад хэцүү алдаа өгнө.
 */
const client = postgres(url, { max: 5, prepare: false });
export const db = drizzle(client, { schema });
export { client };
