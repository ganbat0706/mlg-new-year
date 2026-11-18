'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import { loadSession, type Session } from '@/lib/session';
import { takeLastFinish, type FinishPayload } from '@/lib/finish';
import { Button } from '@/components/Button';
import { LeaderTable } from '@/components/LeaderTable';
import { ScoreCard } from './ScoreCard';

type LeaderRow = {
  rank: number; lastName: string; firstName: string; bestScore: number; isPrize: boolean;
};

type Standing = {
  lastName: string; firstName: string; inviteCode: string;
  bestScore: number; rank: number | null; total: number;
};

export function ResultClient({ gameOpen }: { gameOpen: boolean }) {
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [me, setMe] = useState<Standing | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [finish, setFinish] = useState<FinishPayload | null>(null);
  const [phone, setPhone] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [busy, setBusy] = useState(false);
  const finishTakenRef = useRef(false);

  useEffect(() => {
    // Оноо буух картыг НЭГ Л УДАА уншина — дахин ачаалбал (refresh) харагдахгүй.
    if (!finishTakenRef.current) {
      finishTakenRef.current = true;
      setFinish(takeLastFinish());
    }

    void (async () => {
      setSession(loadSession());
      const res = await apiGet<LeaderRow[]>('/api/leaderboard?limit=200');
      if (res.ok) setRows(res.data);
    })();
  }, []);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setLookupError('');
    setBusy(true);
    const res = await apiPost<Standing>('/api/standing', { phone });
    setBusy(false);
    if (!res.ok) { setLookupError(res.error); return; }
    setMe(res.data);
  }

  const field =
    'min-h-12 w-full rounded-lg border border-[#DAD5CC] bg-white px-4 text-base ' +
    'outline-none focus:border-[#ED1C24]';

  return (
    <div className="space-y-10">
      {finish && session && (
        <ScoreCard data={finish} inviteCode={session.inviteCode} />
      )}

      {me && (
        <section className="enter rounded-xl border-2 border-[#ED1C24] bg-white p-5">
          <p className="text-sm font-semibold tracking-[0.16em] text-[#6B6568]">ТАНЫ ҮР ДҮН</p>
          <p className="mt-2 text-2xl font-extrabold">{me.lastName} {me.firstName}</p>
          <p className="mt-1 text-lg">
            {me.bestScore.toLocaleString('mn-MN')} оноо
            {me.rank ? ` · ${me.rank} / ${me.total} байр` : ' · тоглоогүй'}
          </p>
          <Link
            href={`/invite/${me.inviteCode}`}
            className="press mt-5 inline-flex min-h-12 items-center justify-center rounded-lg
                       bg-[#C21019] px-6 font-semibold text-white hover:bg-[#9E0D14]"
          >
            Урилгаа харах ({me.inviteCode})
          </Link>
        </section>
      )}

      {!me && session && (
        <section className="enter rounded-xl border border-[#DAD5CC] bg-white p-5">
          <p className="text-base">
            <strong>{session.lastName} {session.firstName}</strong> — урилгын дугаар{' '}
            <strong>{session.inviteCode}</strong>
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`/invite/${session.inviteCode}`}
              className="press inline-flex min-h-12 items-center justify-center rounded-lg
                         bg-[#C21019] px-6 font-semibold text-white hover:bg-[#9E0D14]"
            >
              Урилгаа харах
            </Link>
            {gameOpen && session.attemptsLeft > 0 && (
              <Link
                href="/play"
                className="press inline-flex min-h-12 items-center justify-center rounded-lg
                           border border-[#221E20] px-6 font-semibold hover:bg-[#221E20] hover:text-white"
              >
                Дахин тоглох ({session.attemptsLeft} үлдсэн)
              </Link>
            )}
          </div>
        </section>
      )}

      {!me && (
        <section className="enter">
          <h2 className="text-lg font-bold">Өөрийн байраа олох</h2>
          <form onSubmit={lookup} className="mt-3 flex gap-3">
            <input
              className={field} value={phone} inputMode="numeric" maxLength={8}
              placeholder="Утасны дугаар" aria-label="Утасны дугаар"
              onChange={(e) => setPhone(e.target.value)}
            />
            <Button type="submit" disabled={busy}>Хайх</Button>
          </form>
          {lookupError && (
            <p role="alert" className="enter-sm mt-3 rounded-lg bg-[#FDECEC] px-4 py-3 text-[#8A0F15]">
              {lookupError}
            </p>
          )}
        </section>
      )}

      <section className="enter">
        <h2 className="text-lg font-bold">Нийт жагсаалт</h2>
        <p className="mb-3 mt-1 text-sm text-[#6B6568]">
          ★ тэмдэгтэй эхний 5 байр шагнал хүртэнэ.
        </p>
        <LeaderTable rows={rows} highlightRank={me?.rank ?? null} />
      </section>
    </div>
  );
}
