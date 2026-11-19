'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Loader } from '@/components/Loader';

/**
 * Урилгыг ҮР ДҮНГИЙН ХУУДСАНД ШУУД харуулна — товчны ард нуухгүй.
 *
 * Шалтгаан: тоглогчийн хожсон зүйл нь яг энэ зураг. Товч бол амлалт,
 * зураг бол хүргэлт. Мөн бүтцийн хувьд: цаас → улаан → цаас гэсэн хэмнэл
 * үүсгэж, өмнөх «гурван ижил цагаан тэгш өнцөгт» байдлыг арилгана.
 *
 * Зураг нь сервер дээр ~5 секундэд үүсдэг. Үүнийг нуухын тулд <img>-ийг
 * 0мс-д (харагдахгүй байдлаар) холбоно: онооны хөдөлгөөн 1.6 секунд
 * үргэлжлэх бөгөөд хүрээ нь нугалаасын доор байдаг тул хүлээлт мэдрэгдэхгүй.
 */

const LOAD_TIMEOUT_MS = 20_000;

/** Кранаас унжсан дэгээ — урилга өлгөөтэй мэт. Статик. */
function Hook() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" className="mx-auto block">
      <rect x="13" y="0" width="2" height="14" fill="#2A3350" />
      <path
        d="M14 14 v4 a4 4 0 1 1-4 4"
        fill="none" stroke="#C9D6E6" strokeWidth="2" strokeLinecap="round"
      />
    </svg>
  );
}

export function InviteBlock({
  code, fullName, bestScore, attemptsLeft, gameOpen,
}: {
  code: string;
  fullName: string;
  /** Кэш шинэчлэх түлхүүр — оноо сайжирвал зураг заавал дахин татагдана. */
  bestScore: number;
  attemptsLeft: number;
  gameOpen: boolean;
}) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [bust, setBust] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const src = `/invite/${code}/image?v=${bestScore}${bust ? `&r=${bust}` : ''}`;

  useEffect(() => {
    if (state !== 'loading') return undefined;
    timerRef.current = setTimeout(() => setState('error'), LOAD_TIMEOUT_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [state, bust]);

  async function download() {
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${code}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // Татахад садаа болвол зургийг шинэ цонхонд нээж, урт дарж хадгалуулна.
      window.open(src, '_blank');
    }
  }

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#E8B931]">
          Таны урилга
        </span>
        <span className="text-base font-bold tracking-[0.04em] tabular-nums text-[#E8B931]">
          {code}
        </span>
      </div>

      <div className="mt-2"><Hook /></div>

      <div className="rounded-2xl border border-[#C9D6E6]/35 bg-[#1B2237] p-3">
        <div className="relative overflow-hidden rounded-lg" style={{ aspectRatio: '4 / 5' }}>
          {/*
            Ачаалж буй/алдааны төлөв нь ЦААСАН дэвсгэртэй: Loader нь цаасанд
            зориулж зурагдсан (хар бүхээг, #DAD5CC зам) тул шөнийн ялтас
            дээр бараг үл үзэгдэнэ.
          */}
          {state !== 'ready' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-[#FAF7F0] px-6 text-center">
              {state === 'loading' ? (
                <Loader label="Урилгыг хэвлэж байна…" />
              ) : (
                <>
                  <p className="text-base text-[#221E20]">Урилга ачаалсангүй.</p>
                  <button
                    type="button"
                    onClick={() => { setBust(Date.now()); setState('loading'); }}
                    className="press inline-flex min-h-12 items-center justify-center rounded-lg
                               border border-[#221E20] px-6 font-semibold text-[#221E20]
                               hover:bg-[#221E20] hover:text-white"
                  >
                    Дахин ачаалах
                  </button>
                </>
              )}
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={src}
            src={src}
            alt={`${fullName}-ийн урилга, дугаар ${code}`}
            width={1080}
            height={1350}
            loading="eager"
            decoding="async"
            onLoad={() => setState('ready')}
            onError={() => setState('error')}
            className={`absolute inset-0 h-full w-full object-cover ${
              state === 'ready' ? 'invite-img-in' : 'opacity-0'
            }`}
          />
        </div>
      </div>

      <p className="mt-3 text-[13px] text-[#C9D6E6]">
        Хаалган дээр энэ дугаарыг үзүүлнэ.
      </p>

      <div className="mt-4 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={() => void download()}
          className="press inline-flex min-h-12 w-full items-center justify-center rounded-lg
                     bg-[#C21019] px-6 text-base font-semibold text-white hover:bg-[#9E0D14]"
        >
          Урилгаа татах
        </button>

        {gameOpen && attemptsLeft > 0 ? (
          <Link
            href="/play"
            className="btn-night-ghost press inline-flex min-h-12 w-full items-center justify-center
                       rounded-lg px-6 text-base font-semibold"
          >
            Дахин тоглох ({attemptsLeft} үлдсэн)
          </Link>
        ) : gameOpen ? (
          <p className="py-2 text-center text-sm text-[#C9D6E6]">
            Оролдлого дууссан · хамгийн сайн оноо тооцогдоно.
          </p>
        ) : null}

        <Link
          href={`/invite/${code}`}
          className="inline-flex min-h-12 w-full items-center justify-center text-sm
                     font-semibold text-[#C9D6E6] underline underline-offset-4"
        >
          Урилгын хуудас нээх
        </Link>
      </div>
    </section>
  );
}
