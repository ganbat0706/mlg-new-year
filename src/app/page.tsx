import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isGameOpen, eventInfo } from '@/lib/config';
import { CONTESTS, contestState, contestStartsAt, contestEndsAt } from '@/lib/contests';
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

        {/*
          Гурван тусдаа тэмцээн — тус бүр өөрийн цонхтой, өөрийн ялагчтай.
          Хүн хэзээ юу болохыг нүүр хуудаснаас шууд харах ёстой.
        */}
        <ol className="enter enter-delay-3 mt-8 space-y-2.5">
          {CONTESTS.map((c, i) => {
            const st = contestState(c);
            const d = (iso: Date) => iso.toLocaleString('mn-MN', {
              month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
            });
            return (
              <li key={c.id} className="flex items-baseline gap-3 text-base">
                <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full
                                  text-xs font-bold ${
                  st === 'open' ? 'bg-[#E8B931] text-[#221E20]'
                    : st === 'closed' ? 'bg-[#2A3350] text-[#C9D6E6]'
                      : 'border border-[#C9D6E6]/45 text-[#C9D6E6]'
                }`}>{i + 1}</span>
                <span className="min-w-0">
                  <span className="font-semibold text-[#FAF7F0]">{c.name}</span>
                  {st === 'open' && <span className="ml-2 text-sm font-semibold text-[#E8B931]">одоо нээлттэй</span>}
                  {st === 'closed' && <span className="ml-2 text-sm text-[#C9D6E6]">дууссан</span>}
                  <span className="block text-sm text-[#C9D6E6]">
                    {d(contestStartsAt(c))} – {d(contestEndsAt(c))}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
        <p className="enter enter-delay-3 mt-4 text-sm text-[#C9D6E6]">
          Тэмцээн бүрт <strong className="text-[#FAF7F0]">нэг л удаа</strong> тоглоно.
          Тус бүрийн <strong className="text-[#FAF7F0]">1-р байр</strong> шагнал хүртэнэ.
        </p>

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
