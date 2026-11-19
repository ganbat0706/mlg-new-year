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
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 py-10">
      <div className="enter"><Brand /></div>

      <div
        className="relative mt-6 rounded-2xl"
        style={{ backgroundImage: 'radial-gradient(60% 40% at 100% 0%, #FDECEC, transparent)' }}
      >
        <WinterScene />
      </div>

      <div className="flex flex-1 flex-col justify-center py-10">
        <p className="enter enter-delay-1 text-sm font-semibold tracking-[0.2em] text-[#C21019]">
          ШИНЭ ЖИЛИЙН БАЯР
        </p>
        <h1 className="enter enter-delay-2 mt-3 text-5xl font-extrabold leading-none tracking-tight sm:text-6xl">
          <span className="text-[#221E20]">20</span><span className="text-[#ED1C24]">26</span>
        </h1>
        <p className="enter enter-delay-3 mt-6 text-lg leading-relaxed text-[#221E20]">
          Богино тоглоом тоглоод урилгаа аваарай. Хамгийн өндөр оноо авсан
          эхний 5 ажилтан арга хэмжээн дээр шагнал хүртэнэ.
        </p>

        <ul className="enter enter-delay-3 mt-8 space-y-2 text-base text-[#6B6568]">
          <li>· Зөв зам · Контейнер овоолох · Хос манифест — 3 богино тоглоом</li>
          <li>· 3 удаа оролдож болно, хамгийн сайн оноо тооцогдоно</li>
        </ul>

        <Link
          href="/register"
          className="enter enter-delay-4 press mt-10 inline-flex min-h-14 items-center justify-center rounded-lg
                     bg-[#C21019] px-8 text-lg font-semibold text-white hover:bg-[#9E0D14]"
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
