'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CONTESTS, contestState, contestStartsAt, contestEndsAt,
  type Contest, type ContestState,
} from '@/lib/contests';
import { loadSession } from '@/lib/session';

/**
 * Нүүр хуудасны гурван КАРТ. Тэмцээн бүр нэг контейнер — цаг нь болсон
 * бол бүтэн карт нь товч болж, дарангуут тоглоом руу шууд оруулна
 * (бүртгүүлээгүй бол эхлээд бүртгэл рүү).
 *
 * Цагийг КЛИЕНТ дээр тоолно, гэхдээ ЭХНИЙ render нь серверийн `serverNow`-г
 * хэрэглэнэ — эс бөгөөс сервер, браузер хоёрын «одоо» зөрж hydration алдаа
 * өгнө (өмнө нь үр дүнгийн карт үүнээс болж алга болж байсан).
 */
export function ContestCards({ serverNow }: { serverNow: number }) {
  const [now, setNow] = useState(serverNow);
  const [session, setSession] = useState<ReturnType<typeof loadSession>>(null);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect --
       localStorage бол React-ийн гадна систем. Сервер дээр байхгүй тул
       эхний render заавал «бүртгэлгүй» гэж гарч, эффект дотор л үнэнээ
       мэдэж болно. (Lazy initializer-т уншвал hydration зөрчилдөнө —
       үр дүнгийн хуудсан дээр яг үүнээс болж оноо алга болж байсан.) */
    setSession(loadSession());
    // Эхний утга нь серверийн цаг; эндээс хойш секунд тутамд өөрсдөө тоолно.
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const current = new Date(now);

  return (
    <div className="space-y-3">
      {CONTESTS.map((c, i) => (
        <ContestCard
          key={c.id}
          contest={c}
          index={i + 1}
          state={contestState(c, current)}
          now={now}
          registered={session !== null}
        />
      ))}

      {session ? (
        <p className="pt-1 text-center text-sm text-[#C9D6E6]">
          {session.lastName} {session.firstName} ·{' '}
          <Link href={`/invite/${session.inviteCode}`} className="font-semibold text-[#E8B931] underline-offset-4 hover:underline">
            Урилга харах
          </Link>
        </p>
      ) : (
        <Link
          href="/register"
          className="press mt-1 flex min-h-14 items-center justify-center rounded-xl bg-[#C21019]
                     px-6 text-lg font-semibold text-white hover:bg-[#9E0D14]"
          style={{ boxShadow: '0 8px 24px rgba(237,28,36,.35), inset 0 1px 0 rgba(255,255,255,.18)' }}
        >
          Бүртгүүлэх
        </Link>
      )}
    </div>
  );
}

function ContestCard({
  contest, index, state, now, registered,
}: {
  contest: Contest;
  index: number;
  state: ContestState;
  now: number;
  registered: boolean;
}) {
  // Нээлттэй БӨГӨӨД тоглоом нь бичигдсэн байж л картыг дарж болно.
  const playable = state === 'open' && contest.ready;
  const href = playable ? (registered ? '/play' : '/register') : null;

  const body = (
    <>
      <div className="flex items-start gap-3">
        <span className={`contest-no ${playable ? 'contest-no-open' : ''}`}>
          {String(index).padStart(2, '0')}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="truncate text-lg font-extrabold tracking-tight text-[#FAF7F0]">
              {contest.name}
            </h2>
            <StateChip state={state} ready={contest.ready} />
          </div>
          <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-[#C9D6E6]">{contest.tagline}</p>
          <p className="mt-1.5 text-sm tabular-nums text-[#C9D6E6]">
            {range(contest)}
          </p>
        </div>
      </div>

      <div className="mt-3 border-t border-dashed border-[#C9D6E6]/25 pt-2.5 text-sm font-semibold">
        <Footline contest={contest} state={state} now={now} playable={playable} registered={registered} />
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="contest-card contest-card-open press block" data-contest={contest.id}>
        {body}
      </Link>
    );
  }

  if (state === 'closed') {
    return (
      <Link href={`/result?contest=${contest.id}`} className="contest-card press block" data-contest={contest.id}>
        {body}
      </Link>
    );
  }

  return <div className="contest-card" data-contest={contest.id}>{body}</div>;
}

function StateChip({ state, ready }: { state: ContestState; ready: boolean }) {
  if (state === 'open' && ready) {
    return <span className="contest-chip contest-chip-open">НЭЭЛТТЭЙ</span>;
  }
  if (state === 'open') return <span className="contest-chip">БЭЛТГЭЖ БАЙНА</span>;
  if (state === 'closed') return <span className="contest-chip">ДУУССАН</span>;
  return <span className="contest-chip">УДАХГҮЙ</span>;
}

function Footline({
  contest, state, now, playable, registered,
}: {
  contest: Contest; state: ContestState; now: number; playable: boolean; registered: boolean;
}) {
  if (playable) {
    const left = contestEndsAt(contest).getTime() - now;
    return (
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-[#E8B931]">
          {registered ? 'Дарж тоглох' : 'Бүртгүүлээд тоглох'} →
        </span>
        <span className="font-normal text-[#C9D6E6]">Дуусахад {countdown(left)}</span>
      </span>
    );
  }
  if (state === 'open') {
    return <span className="text-[#C9D6E6]">Тоглоом бэлтгэгдэж байна</span>;
  }
  if (state === 'closed') {
    return <span className="text-[#C9D6E6]">Жагсаалт харах →</span>;
  }
  const left = contestStartsAt(contest).getTime() - now;
  return <span className="text-[#C9D6E6]">Эхлэхэд {countdown(left)}</span>;
}

function range(c: Contest): string {
  const f = (d: Date) =>
    `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${f(contestStartsAt(c))} – ${f(contestEndsAt(c))}`;
}

/** «3 өдөр 4 цаг», «12 мин 09 сек» — хамгийн том хоёр нэгжийг л хэлнэ. */
function countdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86_400);
  const h = Math.floor((total % 86_400) / 3_600);
  const m = Math.floor((total % 3_600) / 60);
  const s = total % 60;
  if (d > 0) return `${d} өдөр ${h} цаг`;
  if (h > 0) return `${h} цаг ${m} мин`;
  if (m > 0) return `${m} мин ${String(s).padStart(2, '0')} сек`;
  return `${s} сек`;
}
