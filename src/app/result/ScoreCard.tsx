'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { FinishPayload } from '@/lib/finish';

/**
 * Онооны карт — апп доторх цорын ганц зохион байгуулалттай (orchestrated)
 * хөдөлгөөний мөч (урлагийн чиглэл, 4-р хэсэг). `PlayClient` `finishAttempt`-ийн
 * хариуг хадгалдаг тул энд НЭГ УДАА харуулж, тоглогч оноогоо "буухыг" харна.
 */

const ROWS = (d: FinishPayload) => [
  { label: 'Асуулт', score: d.quizScore },
  { label: 'Зөв зам', score: d.sortScore },
  { label: 'Контейнер овоолох', score: d.stackScore },
  { label: 'Хос манифест', score: d.memoScore },
];

/** cubic-bezier(p1x,p1y,p2x,p2y)-ийг Newton-ий аргаар бодож, x дэх y-г олно. */
function bezierY(x: number, p1x: number, p1y: number, p2x: number, p2y: number): number {
  const bx = (t: number) => 3 * (1 - t) ** 2 * t * p1x + 3 * (1 - t) * t ** 2 * p2x + t ** 3;
  const by = (t: number) => 3 * (1 - t) ** 2 * t * p1y + 3 * (1 - t) * t ** 2 * p2y + t ** 3;
  let t = x;
  for (let i = 0; i < 8; i++) {
    const dx = bx(t) - x;
    if (Math.abs(dx) < 1e-4) break;
    const slope = 3 * (1 - t) ** 2 * p1x + 6 * (1 - t) * t * (p2x - p1x) + 3 * t ** 2 * (1 - p2x);
    t = Math.min(1, Math.max(0, t - dx / (slope || 1e-6)));
  }
  return by(t);
}

const CONFETTI_COLORS = ['#ED1C24', '#E8B931', '#221E20', '#FFFFFF'];
const CONFETTI = Array.from({ length: 24 }, (_, i) => ({
  left: (i * 37) % 100,
  rotate: (i * 53) % 360,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  delay: (i % 6) * 15,
}));

/** SSR-ээс ялгаатай client лазь-инициалчлал — зөвхөн анхны render-д нэг удаа бодогдоно. */
function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function ScoreCard({ data, inviteCode }: { data: FinishPayload; inviteCode: string }) {
  const isNewBest = data.totalScore === data.bestScore && data.attemptsUsed > 1;

  // Reduced motion: эцсийн тоо шууд, confetti байхгүй, ээлжлэл байхгүй — эдгээрийг
  // эффект дотор setState-ээр биш, анхны (lazy) төлвөөр шууд тохируулна.
  const [reduced] = useState(prefersReducedMotion);
  const [labelOn, setLabelOn] = useState(reduced);
  const [display, setDisplay] = useState(reduced ? data.totalScore : 0);
  const [rowsOn, setRowsOn] = useState(reduced);
  const [confettiOn, setConfettiOn] = useState(false);
  const [bestOn, setBestOn] = useState(reduced && isNewBest);
  const [inviteOn, setInviteOn] = useState(reduced);

  useEffect(() => {
    if (reduced) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setLabelOn(true), 120));
    timers.push(setTimeout(() => setRowsOn(true), 1100));
    timers.push(setTimeout(() => setConfettiOn(true), 1100));
    if (isNewBest) timers.push(setTimeout(() => setBestOn(true), 1400));
    timers.push(setTimeout(() => setInviteOn(true), 1500));

    let raf = 0;
    const countTimer = setTimeout(() => {
      const startedAt = performance.now();
      const DURATION = 900;
      const tick = (now: number) => {
        const p = Math.min(1, (now - startedAt) / DURATION);
        const eased = bezierY(p, 0.16, 1, 0.3, 1);
        setDisplay(Math.round(eased * data.totalScore));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, 200);
    timers.push(countTimer);

    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section
      className="enter relative overflow-hidden rounded-xl border-2 border-[#ED1C24] bg-white p-5"
      style={{ animationDuration: '240ms' }}
    >
      {confettiOn && !reduced && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {CONFETTI.map((c, i) => (
            <span
              key={i}
              className="confetti-piece"
              style={{
                left: `${c.left}%`,
                backgroundColor: c.color,
                animationDelay: `${c.delay}ms`,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ['--rot' as any]: `${c.rotate}deg`,
              }}
            />
          ))}
        </div>
      )}

      <p
        className={`text-sm font-semibold tracking-[0.16em] text-[#6B6568] transition-opacity duration-150 ${
          labelOn ? 'opacity-100' : 'opacity-0'
        }`}
      >
        ТАНЫ ОНОО
      </p>

      <p className="mt-1 text-[56px] font-extrabold leading-none tabular-nums">
        {display.toLocaleString('mn-MN')}
      </p>

      <div className="mt-5 space-y-2">
        {ROWS(data).map((r, i) => (
          <div
            key={r.label}
            className={rowsOn ? 'score-row-in flex items-baseline justify-between text-sm' : 'flex items-baseline justify-between text-sm opacity-0'}
            style={rowsOn ? { animationDelay: `${i * 80}ms` } : undefined}
          >
            <span className="text-[#6B6568]">{r.label}</span>
            <span className="font-semibold tabular-nums">{r.score.toLocaleString('mn-MN')}</span>
          </div>
        ))}
      </div>

      {isNewBest && (
        <p
          className={`mt-4 inline-flex items-center rounded-full bg-[#E8B931] px-3 py-1 text-sm
                      font-semibold text-[#221E20] transition-all duration-200 ${
            bestOn ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
          }`}
          style={{ transitionTimingFunction: 'var(--spring)' }}
        >
          Шинэ дээд амжилт
        </p>
      )}

      {data.flagged && (
        <p className="mt-3 text-xs text-[#6B6568]">
          Энэ оролдлогыг шалгаж байна — хэвийн тул шагналд нөлөөлөхгүй.
        </p>
      )}

      <Link
        href={`/invite/${inviteCode}`}
        className={`press mt-6 inline-flex min-h-12 items-center justify-center rounded-lg bg-[#C21019]
                    px-6 font-semibold text-white transition-opacity duration-150 hover:bg-[#9E0D14] ${
          inviteOn ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        Урилгаа харах
      </Link>
    </section>
  );
}
