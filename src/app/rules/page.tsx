import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isGameOpen, QUIZ, REACTION, GAME } from '@/lib/config';
import { Brand } from '@/components/Brand';

export const dynamic = 'force-dynamic';

export default function RulesPage() {
  if (!isGameOpen()) redirect('/result');

  const seconds = REACTION.DURATION_MS / 1000;

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 py-10">
      <Brand />
      <h1 className="mt-10 text-3xl font-extrabold tracking-tight">Дүрэм</h1>

      <ol className="mt-8 space-y-6">
        <li>
          <h2 className="text-lg font-bold">1. Асуулт — {QUIZ.QUESTION_COUNT} ширхэг</h2>
          <p className="mt-1.5 text-base leading-relaxed text-[#6B6568]">
            Асуулт тус бүрт {QUIZ.TIME_LIMIT_MS / 1000} секунд. Хурдан хариулах тусам
            илүү оноо. Хугацаа дуусвал дараагийн асуулт руу автоматаар шилжинэ.
          </p>
        </li>
        <li>
          <h2 className="text-lg font-bold">2. Ачаа ачих — {seconds} секунд</h2>
          <p className="mt-1.5 text-base leading-relaxed text-[#6B6568]">
            Улаан контейнер дээр дарж ачна (+{REACTION.GOOD_POINTS}).
            Хар «эвдэрсэн ачаа» дээр дарвал оноо хасагдана ({REACTION.BAD_POINTS}).
          </p>
        </li>
        <li>
          <h2 className="text-lg font-bold">3. Оролдлого — {GAME.MAX_ATTEMPTS} удаа</h2>
          <p className="mt-1.5 text-base leading-relaxed text-[#6B6568]">
            Хамгийн сайн оноо тооцогдоно. Эхний {GAME.PRIZE_PLACES} байр шагналтай.
          </p>
        </li>
      </ol>

      <div className="flex-1" />

      <Link
        href="/play"
        className="mt-10 inline-flex min-h-14 w-full items-center justify-center rounded-lg
                   bg-[#C21019] px-8 text-lg font-semibold text-white hover:bg-[#9E0D14]"
      >
        Эхлэх
      </Link>
    </main>
  );
}
