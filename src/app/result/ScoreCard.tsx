'use client';

import { useEffect, useState } from 'react';
import type { FinishPayload } from '@/lib/finish';
import { GAME, MAX_TOTAL_SCORE } from '@/lib/config';
import { audio } from '@/lib/audio';

/**
 * Онооны карт — апп доторх цорын ганц зохион байгуулалттай (orchestrated)
 * хөдөлгөөний мөч (урлагийн чиглэл, 4-р хэсэг). `PlayClient` `finishAttempt`-ийн
 * хариуг хадгалдаг тул энд НЭГ УДАА харуулж, тоглогч оноогоо "буухыг" харна.
 */

/** Тоглоом бүрийн дээд оноо тэнцүү (960) — шугам нь ижил хуваарьтай. */
const PER_GAME_MAX = MAX_TOTAL_SCORE / 4;

const ROWS = (d: FinishPayload) => [
  { label: 'Зөв зам', score: d.sortScore },
  { label: 'Контейнер овоолох', score: d.stackScore },
  { label: 'Хос манифест', score: d.memoScore },
  { label: 'Агаараас буулгах', score: d.dropScore },
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

/**
 * Confetti-гийн өнгө. ЦАГААН БАЙХГҮЙ: карт нь #FAF7F0 цаас тул цагаан
 * хэсгүүд 1.03:1 контрасттай буюу огт харагддаггүй байв (24-өөс 6 нь).
 * Оронд нь шөнийн цэнхэр — цаасан дээр 11.6:1.
 */
const CONFETTI_COLORS = ['#ED1C24', '#E8B931', '#221E20', '#2A3350'];

/**
 * Голын 40%-д хэзээ ч унахгүй: тэр хэсэгт 56px-ийн том оноо эргэлдэж
 * байдаг бөгөөд дээгүүр нь өнгөт зүйл унавал тоог уншихад саад болно.
 * Зүүн 30% (0..30) ба баруун 30% (70..100) -д л тараана.
 */
const CONFETTI = Array.from({ length: 22 }, (_, i) => {
  const side = i % 2 === 0 ? 0 : 70;
  return {
    left: side + ((i * 17) % 30),
    rotate: (i * 53) % 360,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: (i % 6) * 15,
  };
});

/** SSR-ээс ялгаатай client лазь-инициалчлал — зөвхөн анхны render-д нэг удаа бодогдоно. */
function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function ScoreCard({
  data, rank, total,
}: {
  data: FinishPayload;
  /** Байр нь мэдэгдээгүй бол (API удаан/алдаа) мөрийг огт харуулахгүй — хүлээхгүй. */
  rank: number | null;
  total: number;
}) {
  const isNewBest = data.totalScore === data.bestScore && data.attemptsUsed > 1;

  // Reduced motion: эцсийн тоо шууд, confetti байхгүй, ээлжлэл байхгүй — эдгээрийг
  // эффект дотор setState-ээр биш, анхны (lazy) төлвөөр шууд тохируулна.
  const [reduced] = useState(prefersReducedMotion);
  const [labelOn, setLabelOn] = useState(reduced);
  const [display, setDisplay] = useState(reduced ? data.totalScore : 0);
  const [rowsOn, setRowsOn] = useState(reduced);
  const [confettiOn, setConfettiOn] = useState(false);
  const [bestOn, setBestOn] = useState(reduced && isNewBest);

  // Дуун дохио нь reduced-motion-оос ХАМААРАХГҮЙ: хөдөлгөөн багасгах хүсэлт
  // бол хөдөлгөөний тухай, дуу чимээний тухай биш. Дуугүй болгох сонголт нь
  // SoundToggle-д тусдаа байна.
  useEffect(() => {
    audio.cue('reveal');
    if (isNewBest) {
      const t = setTimeout(() => audio.cue('best'), reduced ? 300 : 1400);
      return () => clearTimeout(t);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (reduced) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setLabelOn(true), 120));
    timers.push(setTimeout(() => setRowsOn(true), 1100));
    timers.push(setTimeout(() => setConfettiOn(true), 1100));
    if (isNewBest) timers.push(setTimeout(() => setBestOn(true), 1400));
    // 1500мс-ийн цохилт одоо УРИЛГЫН БЛОКИЙГ нээнэ (ResultClient) — энд товч байхгүй.

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
      className="enter relative overflow-hidden rounded-xl border-2 border-[#E8B931] bg-white p-5"
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

      {/* A — чип мөр: нэр + оролдлогын тоолуур */}
      <div
        className={`flex items-baseline justify-between transition-opacity duration-150 ${
          labelOn ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <span className="sheet-tag">Таны оноо</span>
        <span className="text-xs font-semibold tabular-nums text-[#6B6568]">
          Оролдлого {data.attemptsUsed} / {GAME.MAX_ATTEMPTS}
        </span>
      </div>

      {/* B — том тоо + нийт боломжит оноо */}
      <div className="mt-1 flex items-baseline gap-2">
        <p className="text-[56px] font-extrabold leading-none tracking-[-0.02em] tabular-nums text-[#221E20]">
          {display.toLocaleString('mn-MN')}
        </p>
        <span
          className={`text-base font-semibold tabular-nums text-[#6B6568] transition-opacity duration-150 ${
            labelOn ? 'opacity-100' : 'opacity-0'
          }`}
        >
          / {MAX_TOTAL_SCORE.toLocaleString('mn-MN')}
        </span>
      </div>

      {/* C — байр. Мэдэгдээгүй бол мөр огт байхгүй, юу ч шилжихгүй. */}
      {rank !== null && (
        <p
          className={`mt-2 text-sm font-semibold text-[#221E20] ${
            rowsOn ? 'score-row-in' : 'opacity-0'
          }`}
        >
          {rank <= GAME.PRIZE_PLACES && (
            <span className="mr-1 text-[#8A5A00]" aria-hidden="true">★</span>
          )}
          {rank}-р байр · {total.toLocaleString('mn-MN')} оролцогчоос
        </p>
      )}

      <div className="mt-4 h-px bg-[#E3DED2]" />

      {/* D — тоглоом бүр: нэр, оноо / дээд оноо, хэмжүүр */}
      <div className="mt-4 space-y-3">
        {ROWS(data).map((r, i) => {
          const perfect = r.score >= PER_GAME_MAX;
          return (
            <div
              key={r.label}
              className={rowsOn ? 'score-row-in' : 'opacity-0'}
              style={{ animationDelay: `${i * 60}ms` }}
              aria-label={`${r.label}: ${PER_GAME_MAX}-аас ${r.score} оноо`}
            >
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-[#6B6568]">{r.label}</span>
                <span className="tabular-nums">
                  <span className="text-[15px] font-semibold text-[#221E20]">
                    {r.score.toLocaleString('mn-MN')}
                  </span>
                  <span className="ml-1 text-xs text-[#6B6568]">
                    / {PER_GAME_MAX.toLocaleString('mn-MN')}
                  </span>
                  {perfect && (
                    <span className="ml-1 text-[13px] text-[#8A5A00]" title="Бүрэн оноо" aria-hidden="true">★</span>
                  )}
                </span>
              </div>
              {/*
                Хэмжүүр — зөвхөн чимэглэл (aria-hidden). Мэдээллийг дээрх
                бичвэр бүрэн дамжуулдаг тул 0 оноотой мөр ч «0 / 960» гэж
                уншигдана. width биш scaleX-ээр хөдөлгөнө — compositor л
                ажиллана.
              */}
              <div
                aria-hidden="true"
                className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#DAD5CC]"
              >
                <div
                  className={`h-full rounded-full bg-[#ED1C24] ${rowsOn && !reduced ? 'meter-fill' : ''}`}
                  style={{
                    width: `${Math.round((Math.min(r.score, PER_GAME_MAX) / PER_GAME_MAX) * 100)}%`,
                    animationDelay: `${i * 60}ms`,
                  }}
                />
              </div>
            </div>
          );
        })}
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

      {/*
        Сэжигтэй тэмдэглэгээг зориуд ЧИМЭЭГҮЙ байлгав: memo-г алдаагүй
        дуусгасан ЖИНХЭНЭ тоглогч ч энэ тэмдэглэгээг авдаг. Том анхааруулга
        болговол шударга хүнийг гэм буруутай мэт сэтгэгдэлд оруулна.
      */}
      {data.flagged && (
        <p className="mt-3 text-[13px] leading-relaxed text-[#6B6568]">
          Энэ оролдлогыг нэмж шалгана. Хэвийн бол оноо бүрэн тооцогдоно.
        </p>
      )}
    </section>
  );
}
