'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiPost } from '@/lib/api';
import { MEMO, PLAY } from '@/lib/config';
import { maxMemoScore, type MemoEvent } from '@/lib/games/memo';
import { Button } from '@/components/Button';
import { Loader } from '@/components/Loader';

type Props = {
  attemptId: string;
  schedule: number[];
  onDone: () => void;
  onError: (message: string) => void;
};

type Phase = 'ready' | 'begin-error' | 'running' | 'submitting' | 'submit-error' | 'result';

/** 6 ачаа/тээврийн сэдэвтэй үг — логистикийн нэг компанийн л хийж чадах онигоотой, Цагаан сарын тэмдэг (морь/хадаг) ОРООГҮЙ (п.9.2). */
const WORDS = ['Контейнер', 'Ачаа', 'Онгоц', 'Хөлөг', 'Вагон', 'Ачааны машин'];

function CargoIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-8 w-8" fill="none" stroke="#FAF7F0" strokeWidth="3">
      <rect x="12" y="16" width="40" height="32" rx="3" />
      <line x1="12" y1="32" x2="52" y2="32" />
      <line x1="32" y1="16" x2="32" y2="48" />
    </svg>
  );
}

/**
 * Хос манифест — 3×4 = 12 хаалттай контейнерээс 6 хосыг олно. Тохирсон хос
 * НЭЭЛТТЭЙ үлдэнэ, тохироогүй бол 600мс дараа хаагдана. Түгжээний дотор
 * ирсэн товшилтыг СЕРВЕР адил клиент ч бас ЗҮГЭЭР Л АЛГАСНА (татгалзахгүй) —
 * ингэснээр хоёр тал ижил төлөвт үлдэнэ.
 */
export function MemoStage({ attemptId, schedule, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>('ready');
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [remaining, setRemaining] = useState<number>(MEMO.DURATION_MS);
  const [liveScore, setLiveScore] = useState(0);
  const [resultScore, setResultScore] = useState(0);

  const totalPairs = schedule.length / 2;

  const startedAtRef = useRef(0);
  const openCardRef = useRef<number | null>(null);
  const lockUntilRef = useRef(0);
  const matchedRef = useRef<Set<number>>(new Set());
  const prevTRef = useRef<number | null>(null);
  const eventsRef = useRef<MemoEvent[]>([]);
  const rawScoreRef = useRef(0);
  const pairsFoundRef = useRef(0);
  const submittingRef = useRef(false);
  const beginningRef = useRef(false);

  const submit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setPhase('submitting');
    const res = await apiPost<{ score: number; maxScore: number; flagged: boolean }>(
      `/api/attempt/${attemptId}/game/memo`,
      { events: eventsRef.current },
    );
    if (!res.ok) {
      submittingRef.current = false;
      setPhase('submit-error');
      return;
    }
    setResultScore(res.data.score);
    setPhase('result');
    setTimeout(onDone, 700);
  }, [attemptId, onDone]);

  // Тоглоомын цаг — rAF-ээр, wall-clock-оор.
  useEffect(() => {
    if (phase !== 'running') return;
    let frame = 0;
    const tick = () => {
      const t = Date.now() - startedAtRef.current;
      const left = Math.max(0, MEMO.DURATION_MS - t);
      setRemaining(left);
      if (left === 0) { void submit(); return; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, submit]);

  async function begin() {
    if (beginningRef.current) return;
    beginningRef.current = true;
    const res = await apiPost<{ startedAt: string }>(
      `/api/attempt/${attemptId}/game/memo`,
      { begin: true },
    );
    beginningRef.current = false;
    if (!res.ok) { setPhase('begin-error'); return; }

    startedAtRef.current = Date.now();
    openCardRef.current = null;
    lockUntilRef.current = 0;
    matchedRef.current = new Set();
    prevTRef.current = null;
    eventsRef.current = [];
    rawScoreRef.current = 0;
    pairsFoundRef.current = 0;
    submittingRef.current = false;
    setFlipped(new Set());
    setMatched(new Set());
    setLiveScore(0);
    setRemaining(MEMO.DURATION_MS);
    setPhase('running');
  }

  // `now` нь дуудагдах мөчид (onPointerDown handler дотор) тооцогдоно.
  function tap(card: number, now: number) {
    if (phase !== 'running') return;

    // Серверийн scoreMemo адил: түгжээний дотор, аль хэдийн нээлттэй/тохирсон
    // хөзөр дээрх даралтыг ТАТГАЛЗАХГҮЙ, зүгээр л АЛГАСНА — client/server нэг
    // төлөвт үлдэх ёстой тул энд ч давхар боловсруулахгүй.
    if (now < lockUntilRef.current) return;
    if (matchedRef.current.has(card) || card === openCardRef.current) return;
    // Үйлдлийн доод зай (200мс) — хүний хуруу үүнээс хурдан дарж чадахгүй.
    if (prevTRef.current !== null && now - prevTRef.current < PLAY.MIN_EVENT_GAP_MS) return;

    prevTRef.current = now;
    eventsRef.current.push({ card, t: now });

    if (openCardRef.current === null) {
      openCardRef.current = card;
      setFlipped((prev) => new Set(prev).add(card));
      return;
    }

    const first = openCardRef.current;
    openCardRef.current = null;
    setFlipped((prev) => new Set(prev).add(card));

    if (schedule[first] === schedule[card]) {
      matchedRef.current.add(first);
      matchedRef.current.add(card);
      pairsFoundRef.current += 1;
      rawScoreRef.current += MEMO.PAIR_POINTS;
      setMatched((prev) => {
        const s = new Set(prev);
        s.add(first);
        s.add(card);
        return s;
      });
      setLiveScore(Math.max(0, rawScoreRef.current));

      if (pairsFoundRef.current === totalPairs) void submit();
    } else {
      lockUntilRef.current = now + MEMO.LOCK_MS;
      setTimeout(() => {
        setFlipped((prev) => {
          const s = new Set(prev);
          s.delete(first);
          s.delete(card);
          return s;
        });
      }, MEMO.LOCK_MS);
    }
  }

  if (phase === 'ready') {
    return (
      <div className="enter py-10 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight">Хос манифест</h2>
        <p className="mx-auto mt-4 max-w-sm text-base leading-relaxed text-[#6B6568]">
          Нуугдсан <strong>хос контейнерийг</strong> дарж олоорой — эрт дуусгах тусам урамшуулал.
        </p>
        <Button className="mt-10 w-full" onClick={() => void begin()}>Эхлэх</Button>
      </div>
    );
  }

  if (phase === 'begin-error') {
    return (
      <div className="enter py-10 text-center">
        <p role="alert" className="rounded-lg bg-[#FDECEC] px-4 py-3 text-base text-[#8A0F15]">
          Тоглоом эхлүүлж чадсангүй. Сүлжээгээ шалгаад дахин оролдоно уу.
        </p>
        <Button className="mt-6 w-full" onClick={() => void begin()}>Дахин оролдох</Button>
      </div>
    );
  }

  if (phase === 'submitting') {
    return <Loader label="Оноог тооцож байна…" />;
  }

  if (phase === 'submit-error') {
    return (
      <div className="enter py-10 text-center">
        <p role="alert" className="rounded-lg bg-[#FDECEC] px-4 py-3 text-base text-[#8A0F15]">
          Илгээж чадсангүй. Таны тоглолт хадгалагдсан байгаа — дахин оролдоно уу.
        </p>
        <Button className="mt-6 w-full" onClick={() => void submit()}>Дахин илгээх</Button>
      </div>
    );
  }

  if (phase === 'result') {
    return (
      <p data-testid="stage-result" className="enter py-24 text-center text-xl font-bold">
        Дүн: {resultScore} / {maxMemoScore(schedule)}
      </p>
    );
  }

  const secondsLeft = Math.ceil(remaining / 1000);

  return (
    <div className="no-select">
      <div className="flex items-baseline justify-between text-sm font-semibold">
        <span data-testid="stage-live-score" className="text-[#6B6568]">Оноо: {liveScore}</span>
        <span className={secondsLeft <= 5 ? 'text-[#C21019]' : 'text-[#6B6568]'}>{secondsLeft} сек</span>
      </div>

      <div
        className="mt-3 grid touch-none grid-cols-4 gap-2 rounded-xl bg-[#221E20] p-3"
      >
        {schedule.map((pairId, card) => {
          const isOpen = flipped.has(card) || matched.has(card);
          return (
            <button
              key={card}
              type="button"
              data-testid={`memo-card-${card}`}
              aria-label={isOpen ? WORDS[pairId] : 'Нээгээгүй контейнер'}
              onPointerDown={() => tap(card, Date.now() - startedAtRef.current)}
              className={`flex min-h-16 touch-none flex-col items-center justify-center gap-1
                         rounded-md text-[11px] font-semibold leading-tight text-[#FAF7F0]
                         transition ${
                isOpen ? 'bg-[#4A4446]' : 'bg-[#ED1C24] hover:bg-[#C21019]'
              }`}
            >
              {isOpen ? (
                <span key={card} className="obj-mount flex flex-col items-center gap-1">
                  <CargoIcon />
                  <span>{WORDS[pairId]}</span>
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
