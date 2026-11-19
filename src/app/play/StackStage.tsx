'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiPost } from '@/lib/api';
import { STACK } from '@/lib/config';
import { cranePosition, maxStackScore, type StackEvent, type StackLevel } from '@/lib/games/stack';
import { Button } from '@/components/Button';
import { audio } from '@/lib/audio';
import {
  StageReady, StageNotice, StageResult, useRunningStage,
} from './StageChrome';
import { Loader } from '@/components/Loader';

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
  useRunningStage(phase === 'running');
  /**
   * Одоогийн хувилбарт АЛДААНЫ ямар ч хариу байхгүй: хажуугаар буулгахад
   * юу ч болохгүй тул тоглогч өөрийгөө оносон гэж бодож үлддэг. Товчны
   * өнгө нь түгжээтэй (DROP_MS) хугацаанд тохирсон эсэхийг хэлнэ.
   */
  const [hit, setHit] = useState<'ok' | 'bad' | null>(null);
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
    audio.cue('clear');
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
    audio.cue('start');
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
    const landed = Math.abs(offset) <= STACK.TOLERANCE_PCT;
    audio.cue(landed ? 'correct' : 'wrong');
    setHit(landed ? 'ok' : 'bad');
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
      setHit(null);
      setDropping(false);
      if (levelIdxRef.current >= schedule.length) void submit();
    }, STACK.DROP_MS);
  }

  if (phase === 'ready') {
    return (
      <StageReady step={2} title="Контейнер овоолох" onStart={() => void begin()}>
        Савалж буй контейнерийг өмнөх овоолгын <strong>төвд тааруулан</strong> «Буулгах» дарж буулга.
      </StageReady>
    );
  }

  if (phase === 'begin-error') {
    return (
      <StageNotice message="Тоглоом эхлүүлж чадсангүй. Сүлжээгээ шалгаад дахин оролдоно уу." actionLabel="Дахин оролдох" onAction={() => void begin()} />
    );
  }

  if (phase === 'submitting') {
    return <Loader label="Оноог тооцож байна…" />;
  }

  if (phase === 'submit-error') {
    return (
      <StageNotice message="Илгээж чадсангүй. Таны тоглолт хадгалагдсан байгаа — дахин оролдоно уу." actionLabel="Дахин илгээх" onAction={() => void submit()} />
    );
  }

  if (phase === 'result') {
    return (
      <StageResult score={resultScore} max={maxStackScore(schedule)} />
    );
  }

  return (
    <div className="no-select">
      <div className="flex items-baseline justify-between text-sm font-semibold">
        <span data-testid="stage-live-score" className="text-[#C9D6E6]">Оноо: {liveScore}</span>
        <span data-testid="stack-level" className="text-[#C9D6E6]">
          Түвшин {Math.min(levelIdx + 1, schedule.length)} / {schedule.length}
        </span>
      </div>

      <div
        data-hit={hit ?? undefined}
        className="bay bay-stack relative mt-3 w-full touch-none overflow-hidden"
        style={{ height: 'min(52dvh, 380px)' }}
      >
        <div
          data-testid="crane"
          className="crane-box absolute top-4 h-9 w-14 -translate-x-1/2 rounded-sm
                     border border-[#FAF7F0]/50 bg-[#ED1C24]"
          style={{ left: `${craneX}%` }}
        />
        <div className="absolute inset-x-0 bottom-0 flex h-[70%] flex-col-reverse items-stretch">
          {stack.map((pos, i) => (
            <div
              key={i}
              className="obj-mount-centered container-face relative mb-0.5 h-8 w-14 rounded-sm
                         border border-[#FAF7F0]/40 bg-[#ED1C24]"
              style={{ left: `${pos}%`, ['--stripe' as string]: i % 2 ? '10px' : '12px' }}
            />
          ))}
        </div>
      </div>

      <Button
        data-testid="drop-button"
        data-hit={hit ?? undefined}
        className="lane-btn press mt-3 w-full touch-none"
        disabled={dropping}
        onPointerDown={drop}
      >
        Буулгах
      </Button>
    </div>
  );
}
