import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { registrations } from '@/lib/db/schema';
import { rankAll } from '@/lib/scoring';
import { listFlaggedReasons } from '@/lib/repo/attempts';
import { verifyAdminToken, ADMIN_COOKIE } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** CSV талбарыг хашилтаар хамгаална (таслал, хашилт, мөр таслалт). */
function cell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(): Promise<Response> {
  const jar = await cookies();
  if (!verifyAdminToken(jar.get(ADMIN_COOKIE)?.value)) {
    return new Response('Нэвтрээгүй байна', { status: 401 });
  }

  const rows = await db.select().from(registrations);
  const ranked = rankAll(rows);
  const flagged = await listFlaggedReasons();

  const header = [
    'Байр', 'Овог', 'Нэр', 'Хэлтэс', 'Утас',
    'Урилгын дугаар', 'Оноо', 'Оролдлого', 'Бүртгүүлсэн',
    'Сэжигтэй', 'Шалтгаан',
  ];

  const lines = [
    header.map(cell).join(','),
    ...ranked.map((r) => {
      const reasons = flagged.get(r.id);
      return [
        r.bestScore > 0 ? r.rank : '',
        r.lastName, r.firstName, r.department, r.phone,
        r.inviteCode, r.bestScore, r.attemptsUsed,
        r.createdAt.toISOString(),
        reasons ? 'тийм' : 'үгүй',
        reasons ? reasons.join('; ') : '',
      ].map(cell).join(',');
    }),
  ];

  // Excel кирилл үсгийг зөв уншихын тулд BOM нэмнэ.
  const csv = '﻿' + lines.join('\r\n');

  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="mlg-registrations.csv"',
    },
  });
}
