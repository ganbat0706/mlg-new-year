import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  isGameOpen, SORT, STACK, MEMO, GAME,
} from '@/lib/config';
import { Brand } from '@/components/Brand';

export const dynamic = 'force-dynamic';

export default function RulesPage() {
  if (!isGameOpen()) redirect('/result');

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 py-10">
      <div className="enter"><Brand /></div>
      <h1 className="enter mt-10 text-3xl font-extrabold tracking-tight">Дүрэм</h1>

      <ol className="enter mt-8 space-y-6">
        <li>
          <h2 className="text-lg font-bold">1. Зөв зам — {SORT.DURATION_MS / 1000} секунд</h2>
          <p className="mt-1.5 text-base leading-relaxed text-[#6B6568]">
            Ачааг зөв тээврийн хэрэгсэл рүү (төмөр зам, авто, агаар) чиглүүлнэ,
            эвдэрсэн ачааг буцаана.
          </p>
        </li>
        <li>
          <h2 className="text-lg font-bold">2. Контейнер овоолох — {STACK.DURATION_MS / 1000} секунд</h2>
          <p className="mt-1.5 text-base leading-relaxed text-[#6B6568]">
            Савалж буй контейнерийг өмнөх овоолгын төвд тааруулан буулгана.
          </p>
        </li>
        <li>
          <h2 className="text-lg font-bold">3. Хос манифест — {MEMO.DURATION_MS / 1000} секунд</h2>
          <p className="mt-1.5 text-base leading-relaxed text-[#6B6568]">
            Нуугдсан хос контейнерийг санаж олно. Хурдан дуусгах тусам урамшуулал.
          </p>
        </li>
        <li>
          <h2 className="text-lg font-bold">4. Оролдлого — {GAME.MAX_ATTEMPTS} удаа</h2>
          <p className="mt-1.5 text-base leading-relaxed text-[#6B6568]">
            Хамгийн сайн оноо тооцогдоно. Эхний {GAME.PRIZE_PLACES} байр шагналтай.
          </p>
        </li>
      </ol>

      <div className="flex-1" />

      <Link
        href="/play"
        className="enter press mt-10 inline-flex min-h-14 w-full items-center justify-center rounded-lg
                   bg-[#C21019] px-8 text-lg font-semibold text-white hover:bg-[#9E0D14]"
      >
        Эхлэх
      </Link>
    </main>
  );
}
