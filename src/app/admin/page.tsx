import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { registrations } from '@/lib/db/schema';
import { rankAll } from '@/lib/scoring';
import { listFlaggedReasons } from '@/lib/repo/attempts';
import { verifyAdminToken, ADMIN_COOKIE } from '@/lib/admin-auth';
import { GAME } from '@/lib/config';
import { Brand } from '@/components/Brand';
import { LoginForm } from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const jar = await cookies();
  const authed = verifyAdminToken(jar.get(ADMIN_COOKIE)?.value);

  if (!authed) {
    return (
      <main className="mx-auto max-w-xl px-5 py-10">
        <Brand />
        <h1 className="mt-10 text-3xl font-extrabold tracking-tight">Админ</h1>
        <div className="mt-8"><LoginForm /></div>
      </main>
    );
  }

  const rows = await db.select().from(registrations);
  const ranked = rankAll(rows);
  const played = ranked.filter((r) => r.bestScore > 0);
  const flagged = await listFlaggedReasons();
  const flaggedCount = [...flagged.keys()].filter((id) => rows.some((r) => r.id === id)).length;

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <Brand />

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold tracking-tight">Админ</h1>
        <a
          href="/api/admin/export"
          className="inline-flex min-h-12 items-center justify-center rounded-lg
                     bg-[#C21019] px-6 font-semibold text-white hover:bg-[#9E0D14]"
        >
          CSV татах
        </a>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#DAD5CC] bg-white p-4">
          <dt className="text-sm text-[#6B6568]">Бүртгүүлсэн</dt>
          <dd className="mt-1 text-3xl font-extrabold tabular-nums">{rows.length}</dd>
        </div>
        <div className="rounded-xl border border-[#DAD5CC] bg-white p-4">
          <dt className="text-sm text-[#6B6568]">Тоглосон</dt>
          <dd className="mt-1 text-3xl font-extrabold tabular-nums">{played.length}</dd>
        </div>
        <div className="rounded-xl border border-[#DAD5CC] bg-white p-4">
          <dt className="text-sm text-[#6B6568]">Хамгийн өндөр оноо</dt>
          <dd className="mt-1 text-3xl font-extrabold tabular-nums">
            {played[0]?.bestScore.toLocaleString('mn-MN') ?? '—'}
          </dd>
        </div>
        <div className="rounded-xl border border-[#DAD5CC] bg-white p-4">
          <dt className="text-sm text-[#6B6568]">Сэжигтэй (шалгах)</dt>
          <dd className="mt-1 text-3xl font-extrabold tabular-nums">{flaggedCount}</dd>
        </div>
      </dl>

      <p className="mt-8 text-sm text-[#6B6568]">
        «Шалгах» тэмдэгтэй мөр — сервер нь энэ оролдлогыг сэжигтэй гэж үзсэн
        (боломжгүй хурд, зай зөрчсөн, эсвэл хэтэрхий төгс). Энэ нь баталгаа
        биш, зөвхөн шагнахаас өмнө хүн шалгах ёстойг заана. Шалтгааныг мөрөн
        дээр очоод (hover) харна уу.
      </p>

      <div className="mt-3 overflow-x-auto rounded-xl border border-[#DAD5CC]">
        <table className="w-full border-collapse text-base">
          <thead>
            <tr className="bg-[#221E20] text-left text-sm text-[#FAF7F0]">
              <th scope="col" className="px-3 py-2.5">Байр</th>
              <th scope="col" className="px-3 py-2.5">Овог нэр</th>
              <th scope="col" className="px-3 py-2.5">Хэлтэс</th>
              <th scope="col" className="px-3 py-2.5">Утас</th>
              <th scope="col" className="px-3 py-2.5">Дугаар</th>
              <th scope="col" className="px-3 py-2.5 text-right">Оноо</th>
              <th scope="col" className="px-3 py-2.5 text-right">Оролдлого</th>
              <th scope="col" className="px-3 py-2.5">Шалгах</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((r) => {
              const reasons = flagged.get(r.id);
              return (
                <tr
                  key={r.id}
                  className={`border-t border-[#E3DED2] ${
                    reasons ? 'bg-[#FDECEC]'
                      : r.bestScore > 0 && r.rank <= GAME.PRIZE_PLACES ? 'bg-[#FFF8E8]' : ''
                  }`}
                >
                  <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">
                    {r.bestScore > 0 ? r.rank : '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">{r.lastName} {r.firstName}</td>
                  <td className="px-3 py-2.5">{r.department}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{r.phone}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">{r.inviteCode}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.bestScore}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.attemptsUsed}</td>
                  <td className="px-3 py-2.5">
                    {reasons && (
                      <span title={reasons.join('; ')} className="inline-flex items-center gap-1.5">
                        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" className="shrink-0">
                          <path
                            d="M8 1.5 15 14.5 H1 Z" fill="none" stroke="#8A0F15" strokeWidth="1.5"
                            strokeLinejoin="round"
                          />
                          <rect x="7.25" y="6" width="1.5" height="4" fill="#8A0F15" />
                          <rect x="7.25" y="11" width="1.5" height="1.5" fill="#8A0F15" />
                        </svg>
                        <span className="text-sm font-semibold text-[#8A0F15]">Шалгах</span>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
