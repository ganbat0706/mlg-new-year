import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isGameOpen, eventInfo } from '@/lib/config';
import { Brand } from '@/components/Brand';

export const dynamic = 'force-dynamic';

export default function Home() {
  // Тоглоом хаагдсан бол шууд үр дүнгийн хуудас руу (спек 3.2).
  if (!isGameOpen()) redirect('/result');

  const event = eventInfo();

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 py-10">
      <Brand />

      <div className="flex flex-1 flex-col justify-center py-10">
        <p className="text-sm font-semibold tracking-[0.2em] text-[#ED1C24]">
          ШИНЭ ЖИЛИЙН БАЯР
        </p>
        <h1 className="mt-3 text-5xl font-extrabold leading-none tracking-tight sm:text-6xl">
          2026
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-[#221E20]">
          Богино тоглоом тоглоод урилгаа аваарай. Хамгийн өндөр оноо авсан
          эхний 5 ажилтан арга хэмжээн дээр шагнал хүртэнэ.
        </p>

        <ul className="mt-8 space-y-2 text-base text-[#6B6568]">
          <li>· 10 асуулт — асуулт тус бүр 10 секунд</li>
          <li>· 20 секундын «Ачаа ачих» тоглоом</li>
          <li>· 3 удаа оролдож болно, хамгийн сайн оноо тооцогдоно</li>
        </ul>

        <Link
          href="/register"
          className="mt-10 inline-flex min-h-14 items-center justify-center rounded-lg
                     bg-[#ED1C24] px-8 text-lg font-semibold text-white hover:bg-[#C21019]"
        >
          Тоглож урилгаа ав
        </Link>
      </div>

      <footer className="border-t border-[#DAD5CC] pt-5 text-sm text-[#6B6568]">
        Арга хэмжээ: {event.date}
        {event.time ? ` · ${event.time}` : ''}
        {event.venue ? ` · ${event.venue}` : ''}
      </footer>
    </main>
  );
}
