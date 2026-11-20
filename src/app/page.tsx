import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isGameOpen, eventInfo, GAME } from '@/lib/config';
import { Brand } from '@/components/Brand';
import { WinterScene } from '@/components/WinterScene';
import { ContestCards } from '@/components/ContestCards';

export const dynamic = 'force-dynamic';

export default function Home() {
  // Бүх тэмцээн дууссан бол шууд үр дүнгийн хуудас руу.
  if (!isGameOpen()) redirect('/result');

  const event = eventInfo();

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 pb-28 pt-6">
      <div className="enter"><Brand /></div>

      <div
        className="relative mt-5 rounded-2xl"
        style={{ backgroundImage: 'radial-gradient(60% 40% at 100% 0%, rgba(237,28,36,.18), transparent)' }}
      >
        <WinterScene />
      </div>

      <p className="enter enter-delay-1 mt-6 text-sm font-semibold tracking-[0.2em] text-[#E8B931]">
        ШИНЭ ЖИЛИЙН БАЯР
      </p>
      <h1 className="enter enter-delay-2 mt-2 text-5xl font-extrabold leading-none tracking-tight sm:text-6xl">
        <span className="text-[#FAF7F0]">20</span><span className="text-[#ED1C24]">26</span>
      </h1>
      <p className="enter enter-delay-3 mt-4 text-base leading-relaxed text-[#C9D6E6]">
        Гурван тэмцээн, гурван ялагч. Цаг нь болмогц доорх картаа дараад
        шууд тоглоно. Тэмцээн бүрт{' '}
        <strong className="text-[#FAF7F0]">{GAME.MAX_ATTEMPTS} л удаа</strong>,
        тус бүрийн <strong className="text-[#FAF7F0]">{GAME.PRIZE_PLACES}-р байр</strong> шагналтай.
      </p>

      {/*
        Тэмцээний картууд. Цаг тоолох, бүртгэлтэй эсэхийг мэдэх хэрэгтэй тул
        клиент тал дээр; эхний render серверийн цагийг хэрэглэж hydration-ийг
        таарулна.
      */}
      <div className="enter enter-delay-4 mt-6">
        {/* eslint-disable-next-line react-hooks/purity --
            Хуудас `force-dynamic` тул энэ нь ХҮСЭЛТИЙН цаг — яг тэр утга
            хэрэгтэй. Клиент үүнийг эхний render-тээ хэрэглээд (hydration
            таарна) дараа нь өөрөө тоолно. */}
        <ContestCards serverNow={Date.now()} />
      </div>

      <p className="enter enter-delay-4 mt-4 text-center text-sm">
        <Link href="/rules" className="text-[#C9D6E6] underline-offset-4 hover:underline">
          Тоглоомын дүрэм
        </Link>
      </p>

      <div className="flex-1" />

      <footer className="mt-8 border-t border-[#2A3350] pt-5 text-sm text-[#C9D6E6]">
        Арга хэмжээ: {event.date}
        {event.time ? ` · ${event.time}` : ''}
        {event.venue ? ` · ${event.venue}` : ''}
      </footer>
    </main>
  );
}
