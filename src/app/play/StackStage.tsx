'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiPost } from '@/lib/api';
import { STACK } from '@/lib/config';
import { cranePosition, maxStackScore, type StackEvent, type StackLevel } from '@/lib/games/stack';
import { Button } from '@/components/Button';

type Props = {
  attemptId: string;
  schedule: StackLevel[];
  onDone: () => void;
  onError: (message: string) => void;
};

type Phase = 'ready' | 'begin-error' | 'running' | 'submitting' | 'submit-error' | 'result';

/**
 * Контейнер овоолох — кран дээрх контейнер гурвалжин долгионоор савлана.
 * `cranePosition` нь СЕРВЕРТЭЙ ЯГ ИЖИЛ томьёо (src/lib/games/stack.ts) — өөр
 * хэрэгжилт зурвал тоглоом шударга бус болно.
 */
export function StackStage({ attemptId, schedule, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>('ready');
  const [levelIdx, setLevelIdx] = useState(0);
  const [craneX, setCraneX] = useState(50);
  const [stack, setStack] = useState<number[]>([]);
  const [dropping, setDropping] = useState(false);
  const [liveScore, setLiveScore] = useState(0);
  const [resultScore, setResultScore] = useState(0);

  const startedAtRef = useRef(0);
  const levelIdxRef = useRef(0);
  const openAtRef = useRef(0);
  const centreRef = useRef(50);
  const eventsRef = useRef<StackEvent[]>([]);
  const rawScoreRef = useRef(0);
  const droppingRef = useRef(false);
  const submittingRef = useRef(false);
  const beginningRef = useRef(false);

  const submit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setPhase('submitting');
    const res = await apiPost<{ score: number; maxScore: number; flagged: boolean }>(
      `/api/attempt/${attemptId}/game/stack`,
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

  // Краны байрлал — rAF-ээр, wall-clock-оор дахин тооцож зурна.
  useEffect(() => {
    if (phase !== 'running') return;
    let frame = 0;
    const tick = () => {
      const i = levelIdxRef.current;
      if (i < schedule.length) {
        const t = Date.now() - startedAtRef.current;
        setCraneX(cranePosition(schedule[i], t - openAtRef.current));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, schedule]);

  async function begin() {
    if (beginningRef.current) return;
    beginningRef.current = true;
    const res = await apiPost<{ startedAt: string }>(
      `/api/attempt/${attemptId}/game/stack`,
      { begin: true },
    );
    beginningRef.current = false;
    if (!res.ok) { setPhase('begin-error'); return; }

    startedAtRef.current = Date.now();
    levelIdxRef.current = 0;
    openAtRef.current = 0;
    centreRef.current = 50;
    eventsRef.current = [];
    rawScoreRef.current = 0;
    submittingRef.current = false;
    setLevelIdx(0);
    setStack([]);
    setLiveScore(0);
    setCraneX(cranePosition(schedule[0], 0));
    setPhase('running');
  }

  function drop() {
    // Латч — унах/хүлээх (DROP_MS) хугацаанд дараагийн товшилтыг синхроноор хаана.
    if (droppingRef.current) return;
    const i = levelIdxRef.current;
    if (phase !== 'running' || i >= schedule.length) return;
    droppingRef.current = true;
    setDropping(true);

    const t = Date.now() - startedAtRef.current;
    const level = schedule[i];
    const pos = cranePosition(level, t - openAtRef.current);
    eventsRef.current.push({ level: level.level, t });

    const offset = pos - centreRef.current;
    if (Math.abs(offset) <= STACK.TOLERANCE_PCT) {
      rawScoreRef.current += STACK.BASE_POINTS
        + Math.round(STACK.PRECISION_POINTS * (1 - Math.abs(offset) / STACK.TOLERANCE_PCT));
      centreRef.current = pos;
      setStack((prev) => [...prev, pos]);
    }
    setLiveScore(Math.max(0, rawScoreRef.current));

    openAtRef.current = t + STACK.DROP_MS;
    levelIdxRef.current = i + 1;
    setLevelIdx(levelIdxRef.current);

    setTimeout(() => {
      droppingRef.current = false;
      setDropping(false);
      if (levelIdxRef.current >= schedule.length) void submit();
    }, STACK.DROP_MS);
  }

  if (phase === 'ready') {
    return (
      <div className="py-10 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight">Контейнер овоолох</h2>
        <p className="mx-auto mt-4 max-w-sm text-base leading-relaxed text-[#6B6568]">
          Савалж буй контейнерийг өмнөх овоолгын <strong>төвд тааруулан</strong> «Буулгах» дарж буулга.
        </p>
        <Button className="mt-10 w-full" onClick={() => void begin()}>Эхлэх</Button>
      </div>
    );
  }

  if (phase === 'begin-error') {
    return (
      <div className="py-10 text-center">
        <p role="alert" className="rounded-lg bg-[#FDECEC] px-4 py-3 text-base text-[#8A0F15]">
          Тоглоом эхлүүлж чадсангүй. Сүлжээгээ шалгаад дахин оролдоно уу.
        </p>
        <Button className="mt-6 w-full" onClick={() => void begin()}>Дахин оролдох</Button>
      </div>
    );
  }

  if (phase === 'submitting') {
    return <p className="py-24 text-center text-[#6B6568]">Оноог тооцож байна…</p>;
  }

  if (phase === 'submit-error') {
    return (
      <div className="py-10 text-center">
        <p role="alert" className="rounded-lg bg-[#FDECEC] px-4 py-3 text-base text-[#8A0F15]">
          Илгээж чадсангүй. Таны тоглолт хадгалагдсан байгаа — дахин оролдоно уу.
        </p>
        <Button className="mt-6 w-full" onClick={() => void submit()}>Дахин илгээх</Button>
      </div>
    );
  }

  if (phase === 'result') {
    return (
      <p data-testid="stage-result" className="py-24 text-center text-xl font-bold">
        Дүн: {resultScore} / {maxStackScore(schedule)}
      </p>
    );
  }

  return (
    <div className="no-select">
      <div className="flex items-baseline justify-between text-sm font-semibold">
        <span data-testid="stage-live-score" className="text-[#6B6568]">Оноо: {liveScore}</span>
        <span data-testid="stack-level" className="text-[#6B6568]">
          Түвшин {Math.min(levelIdx + 1, schedule.length)} / {schedule.length}
        </span>
      </div>

      <div
        className="relative mt-3 w-full touch-none overflow-hidden rounded-xl bg-[#221E20]"
        style={{ height: 'min(52dvh, 380px)' }}
      >
        <div
          data-testid="crane"
          className="absolute top-4 h-9 w-14 -translate-x-1/2 rounded-sm border border-[#FAF7F0]/50 bg-[#ED1C24]"
          style={{ left: `${craneX}%` }}
        />
        <div className="absolute inset-x-0 bottom-0 flex h-[70%] flex-col-reverse items-stretch">
          {stack.map((pos, i) => (
            <div
              key={i}
              className="relative mb-0.5 h-8 w-14 -translate-x-1/2 rounded-sm border border-[#FAF7F0]/40 bg-[#ED1C24]"
              style={{ left: `${pos}%` }}
            />
          ))}
        </div>
      </div>

      <Button
        data-testid="drop-button"
        className="mt-3 w-full touch-none"
        disabled={dropping}
        onPointerDown={drop}
      >
        Буулгах
      </Button>
    </div>
  );
}
