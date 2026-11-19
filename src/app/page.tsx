import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isGameOpen, eventInfo } from '@/lib/config';
import { Brand } from '@/components/Brand';
import { WinterScene } from '@/components/WinterScene';

export const dynamic = 'force-dynamic';

export default function Home() {
  // Тоглоом хаагдсан бол шууд үр дүнгийн хуудас руу (спек 3.2).
  if (!isGameOpen()) redirect('/result');

  const event = eventInfo();

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 pb-28 pt-6">
      <div className="enter"><Brand /></div>

      <div
        className="relative mt-6 rounded-2xl"
        style={{ backgroundImage: 'radial-gradient(60% 40% at 100% 0%, rgba(237,28,36,.18), transparent)' }}
      >
        <WinterScene />
      </div>

      <div className="flex flex-1 flex-col justify-center py-10">
        <p className="enter enter-delay-1 text-sm font-semibold tracking-[0.2em] text-[#E8B931]">
          ШИНЭ ЖИЛИЙН БАЯР
        </p>
        <h1 className="enter enter-delay-2 mt-3 text-5xl font-extrabold leading-none tracking-tight sm:text-6xl">
          <span className="text-[#FAF7F0]">20</span><span className="text-[#ED1C24]">26</span>
        </h1>
        <p className="enter enter-delay-3 mt-6 text-lg leading-relaxed text-[#FAF7F0]">
          Богино тоглоом тоглоод урилгаа аваарай. Хамгийн өндөр оноо авсан
          эхний 5 ажилтан арга хэмжээн дээр шагнал хүртэнэ.
        </p>

        <ul className="enter enter-delay-3 mt-8 space-y-2 text-base text-[#C9D6E6]">
          <li>· Зөв зам · Контейнер овоолох · Хос манифест · Агаараас буулгах — 4 богино тоглоом</li>
          <li>· 3 удаа оролдож болно, хамгийн сайн оноо тооцогдоно</li>
        </ul>

        <Link
          href="/register"
          className="enter enter-delay-4 press mt-10 inline-flex min-h-14 items-center justify-center rounded-lg
                     bg-[#C21019] px-8 text-lg font-semibold text-white hover:bg-[#9E0D14]"
          style={{ boxShadow: '0 8px 24px rgba(237,28,36,.35), inset 0 1px 0 rgba(255,255,255,.18)' }}
        >
          Тоглож урилгаа ав
        </Link>
      </div>

      <footer className="border-t border-[#2A3350] pt-5 text-sm text-[#C9D6E6]">
        Арга хэмжээ: {event.date}
        {event.time ? ` · ${event.time}` : ''}
        {event.venue ? ` · ${event.venue}` : ''}
      </footer>
    </main>
  );
}
