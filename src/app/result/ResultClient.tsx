'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import { loadSession, type Session } from '@/lib/session';
import { takeLastFinish, type FinishPayload } from '@/lib/finish';
import { GAME } from '@/lib/config';
import { Button } from '@/components/Button';
import { LeaderTable } from '@/components/LeaderTable';
import { ScoreCard } from './ScoreCard';
import { InviteBlock } from './InviteBlock';

type LeaderRow = {
  rank: number; lastName: string; firstName: string; bestScore: number; isPrize: boolean;
};

type Standing = {
  lastName: string; firstName: string; inviteCode: string;
  bestScore: number; rank: number | null; total: number;
};

export function ResultClient({ gameOpen }: { gameOpen: boolean }) {
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [mine, setMine] = useState<Standing | null>(null);   // өөрийн байр (session-оос)
  const [found, setFound] = useState<Standing | null>(null); // утсаар хайсан хүн
  const [session, setSession] = useState<Session | null>(null);
  const [finish, setFinish] = useState<FinishPayload | null>(null);
  const [phone, setPhone] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [busy, setBusy] = useState(false);
  const [findOpen, setFindOpen] = useState(false);

  /*
    sessionStorage/localStorage-ийг РЕНДЕРИЙН ҮЕД уншиж БОЛОХГҮЙ.
    Сервер дээр тэдгээр байхгүй тул анхны render null буцаана; клиент дээр
    lazy initializer утга буцаавал hydration зөрчилдөж, React дахин
    рендерлэнэ — тэр үед `takeLastFinish()` аль хэдийн уншаад цэвэрлэчихсэн
    байдаг тул ОНООНЫ КАРТ ОГТ ГАРАХГҮЙ. (Үүнийг lazy initializer руу
    шилжүүлээд бодит дэлгэц дээр алга болохыг нь хараад буцаав.)

    Тиймээс эффект дотор уншина. `react-hooks/set-state-in-effect` дүрмийг
    энд зориуд унтраав: энэ бол яг тэр дүрмийн зөвшөөрдөг тохиолдол —
    гаднын (React-ийн бус) системээс нэг удаа уншиж React-тай тааруулж буй.
  */
  useEffect(() => {
    const s = loadSession();
    /* eslint-disable react-hooks/set-state-in-effect -- дээрх тайлбарыг үз */
    setSession(s);
    setFinish(takeLastFinish());
    /* eslint-enable react-hooks/set-state-in-effect */

    // Жагсаалт болон ӨӨРИЙН БАЙРЫГ зэрэг ачаална. Байр нь ирэхгүй бол
    // (удаан/алдаа) зүгээр л харуулахгүй — хуудсыг ХЭЗЭЭ Ч хүлээлгэхгүй.
    void apiGet<LeaderRow[]>('/api/leaderboard?limit=200').then((res) => {
      if (res.ok) setRows(res.data);
    });
    if (s) {
      void apiPost<Standing>('/api/standing', { registrationId: s.id }).then((res) => {
        if (res.ok) setMine(res.data);
      });
    }
  }, []);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setLookupError('');
    setBusy(true);
    const res = await apiPost<Standing>('/api/standing', { phone });
    setBusy(false);
    if (!res.ok) { setLookupError(res.error); return; }
    setFound(res.data);
  }

  const field =
    'min-h-12 w-full rounded-lg border border-[#DAD5CC] bg-white px-4 text-base text-[#221E20] ' +
    'outline-none focus:border-[#ED1C24]';

  const freshFinish = Boolean(finish && session);
  const bestScore = finish?.bestScore ?? mine?.bestScore ?? session?.bestScore ?? 0;
  const attemptsLeft = session
    ? Math.max(0, GAME.MAX_ATTEMPTS - (finish?.attemptsUsed ?? GAME.MAX_ATTEMPTS - session.attemptsLeft))
    : 0;

  const findForm = (
    <form onSubmit={lookup} className="mt-3 flex gap-3">
      <input
        className={field} value={phone} inputMode="numeric" maxLength={8}
        placeholder="Утасны дугаар" aria-label="Утасны дугаар"
        onChange={(e) => setPhone(e.target.value)}
      />
      <Button type="submit" disabled={busy}>Хайх</Button>
    </form>
  );

  return (
    <div className="space-y-8">
      {freshFinish && finish && (
        <ScoreCard data={finish} rank={mine?.rank ?? null} total={mine?.total ?? 0} />
      )}

      {/* Эхний 5-д орсон бол — онооны картын ЯГ доор, урилгын өмнө. */}
      {mine?.rank && mine.rank <= GAME.PRIZE_PLACES && (
        <section className="enter rounded-xl bg-[#E8B931] px-5 py-4 text-[#221E20]">
          <span className="text-xs font-bold uppercase tracking-[0.14em]">Топ {GAME.PRIZE_PLACES}</span>
          <p className="mt-1 text-lg font-bold">
            <span aria-hidden="true">★</span> Та шагналын жагсаалтад орлоо — {mine.rank}-р байр
          </p>
        </section>
      )}

      {/*
        Урилга — товчны ард биш, ШУУД энд. Хожсон зүйлээ харахгүйгээр
        хуудаснаас гарах ёсгүй. Дахин зочлоход ч ижил.
      */}
      {session && (
        <InviteBlock
          code={session.inviteCode}
          fullName={`${session.lastName} ${session.firstName}`}
          bestScore={bestScore}
          attemptsLeft={attemptsLeft}
          gameOpen={gameOpen}
        />
      )}

      {/* Дахин зочлоход онооны карт байхгүй тул байраа энд нэг мөрөөр харуулна. */}
      {!freshFinish && mine && (
        <p className="text-base text-[#FAF7F0]">
          <strong>{mine.lastName} {mine.firstName}</strong> ·{' '}
          {mine.bestScore.toLocaleString('mn-MN')} оноо
          {mine.rank ? ` · ${mine.rank}-р байр ${mine.total} оролцогчоос` : ' · тоглоогүй'}
        </p>
      )}

      <section className="enter">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[22px] font-extrabold tracking-tight">Нийт жагсаалт</h2>
          {rows.length > 0 && (
            <span className="text-sm text-[#C9D6E6]">{rows.length} оролцогч</span>
          )}
        </div>
        <p className="mb-3 mt-1 text-sm text-[#C9D6E6]">
          ★ тэмдэгтэй эхний {GAME.PRIZE_PLACES} байр шагнал хүртэнэ.
        </p>
        <LeaderTable rows={rows} highlightRank={found?.rank ?? mine?.rank ?? null} />
      </section>

      {/*
        Хайлт — шинэ үр дүн гарсан үед огт харуулахгүй (тоглогч өөрийгөө
        хайхгүй). Дахин зочлоход нугалсан холбоос, session огт байхгүй үед
        бүтэн хэсэг.
      */}
      {!freshFinish && (
        <section className="enter">
          {session && !findOpen ? (
            <button
              type="button"
              onClick={() => setFindOpen(true)}
              className="inline-flex min-h-12 items-center text-sm font-semibold text-[#C9D6E6] underline underline-offset-4"
            >
              Өөр хүний байрыг хайх
            </button>
          ) : (
            <>
              <h2 className="text-[22px] font-extrabold tracking-tight">Өөрийн байраа олох</h2>
              {findForm}
            </>
          )}
          {lookupError && (
            <p role="alert" className="enter-sm mt-3 rounded-lg bg-[#FDECEC] px-4 py-3 text-[#8A0F15]">
              {lookupError}
            </p>
          )}
          {found && (
            <div className="sheet mt-4">
              <span className="sheet-tag">Хайлтын үр дүн</span>
              <p className="mt-2 text-xl font-extrabold">{found.lastName} {found.firstName}</p>
              <p className="mt-1 text-base text-[#6B6568]">
                {found.bestScore.toLocaleString('mn-MN')} оноо
                {found.rank ? ` · ${found.rank}-р байр` : ' · тоглоогүй'}
              </p>
              <Link
                href={`/invite/${found.inviteCode}`}
                className="mt-3 inline-flex min-h-12 items-center text-sm font-semibold text-[#C21019] underline underline-offset-4"
              >
                Урилгын хуудас ({found.inviteCode})
              </Link>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
