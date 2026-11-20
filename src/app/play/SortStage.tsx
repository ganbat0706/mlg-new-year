'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiPost } from '@/lib/api';
import { SORT } from '@/lib/config';
import { maxSortScore, type SortEvent, type SortItem, type SortLane, type SortMode } from '@/lib/games/sort';
import { audio } from '@/lib/audio';
import {
  StageReady, StageNotice, StageResult, useRunningStage,
} from './StageChrome';
import { Loader } from '@/components/Loader';

type Props = {
  attemptId: string;
  schedule: SortItem[];
  onDone: () => void;
  onError: (message: string) => void;
};

type Phase = 'ready' | 'begin-error' | 'running' | 'submitting' | 'submit-error' | 'result';

const LANES: { lane: SortLane; label: string }[] = [
  { lane: 'rail', label: 'Төмөр зам' },
  { lane: 'road', label: 'Авто' },
  { lane: 'air', label: 'Агаар' },
  { lane: 'return', label: 'Буцаах' },
];

const MODE_LABEL: Record<SortMode, string> = {
  rail: 'Төмөр зам',
  road: 'Авто',
  air: 'Агаар',
};

function ModeIcon({ mode }: { mode: SortMode }) {
  if (mode === 'rail') {
    return (
      <svg viewBox="0 0 64 64" className="h-16 w-16" fill="none" stroke="#FAF7F0" strokeWidth="3">
        <rect x="14" y="10" width="36" height="34" rx="6" />
        <line x1="14" y1="26" x2="50" y2="26" />
        <circle cx="22" cy="50" r="4" fill="#FAF7F0" />
        <circle cx="42" cy="50" r="4" fill="#FAF7F0" />
      </svg>
    );
  }
  if (mode === 'road') {
    return (
      <svg viewBox="0 0 64 64" className="h-16 w-16" fill="none" stroke="#FAF7F0" strokeWidth="3">
        <rect x="8" y="22" width="30" height="18" rx="2" />
        <path d="M38 26h10l8 8v6h-18z" />
        <circle cx="18" cy="46" r="5" fill="#FAF7F0" />
        <circle cx="46" cy="46" r="5" fill="#FAF7F0" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16" fill="none" stroke="#FAF7F0" strokeWidth="3">
      <path d="M32 6 L38 28 L56 34 L56 38 L38 34 L36 50 L44 56 L44 59 L32 55 L20 59 L20 56 L28 50 L26 34 L8 38 L8 34 L26 28 Z" />
    </svg>
  );
}

function DamagedIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16" fill="none" stroke="#ED1C24" strokeWidth="3">
      <rect x="14" y="14" width="36" height="36" rx="4" />
      <path d="M14 32 L26 24 L32 38 L40 20 L50 32" />
    </svg>
  );
}

/**
 * Зөв зам — 12 ачааг зөв тээврийн хэрэгсэл рүү (эсвэл эвдэрсэн бол буцаах
 * луу) чиглүүлнэ. 4 товч доод талд ТОГТМОЛ байрлалтай — тоглогч байрлалыг
 * сурч, цаашид харахгүйгээр дарж чадна.
 */
export function SortStage({ attemptId, schedule, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>('ready');
  useRunningStage(phase === 'running');
  /**
   * Товшилтын хариу: дарсан товч болон талбайн хүрээ 160мс өнгөө солино.
   * ЗӨВХӨН өнгө — тоглогчийн дарах юмны ойролцоо юу ч хөдлөхгүй.
   */
  const [hit, setHit] = useState<{ lane: SortLane; kind: 'ok' | 'bad' } | null>(null);
  const hitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (hitTimer.current) clearTimeout(hitTimer.current); }, []);
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState<number>(SORT.DURATION_MS);
  const [liveScore, setLiveScore] = useState(0);
  const [resultScore, setResultScore] = useState(0);

  const startedAtRef = useRef(0);
  const indexRef = useRef(0);
  const eventsRef = useRef<SortEvent[]>([]);
  const rawScoreRef = useRef(0);
  const submittingRef = useRef(false);
  const beginningRef = useRef(false);
  // Латч — StackStage-ийн `droppingRef`-тэй ЯГ ИЖИЛ хэлбэр: гар дотор (await-гүй,
  // синхрон) хамгийн эхэнд шалгаж, тавигдана. Хоёр pointerdown нэг JS tick-д
  // (жинхэнэ хоёр дахин товшилт биш, нэг л даралтаас ирсэн давхардсан эвент)
  // ирвэл хоёр дахь нь энд ШУУД хаагдана — `i`-г ахиулахаас ч өмнө. Дараагийн
  // зүйл дэлгэц дээр ҮНЭХЭЭР гарч ирмэгц (`index`-ийн өөрчлөлтийн дараах effect)
  // суллагдана — жинхэнэ хурдан тоглогчийн (секунд тутамд нэг товшилт гэх мэт)
  // хоёр дахь товшилтыг хэзээ ч хаахгүй.
  const tappingRef = useRef(false);

  const submit = useCallback(async () => {
    // Латч — submit хоёр удаа (цаг дуусах ба сүүлийн товшилт зэрэг ирвэл) явахаас хамгаална.
    if (submittingRef.current) return;
    submittingRef.current = true;
    setPhase('submitting');
    const res = await apiPost<{ score: number; maxScore: number; flagged: boolean }>(
      `/api/attempt/${attemptId}/game/sort`,
      { events: eventsRef.current },
    );
    if (!res.ok) {
      // Сервер татгалзсан/сүлжээ тасарсан — тоглолт ХАДГАЛАГДСАН (eventsRef хэвээрээ),
      // 0 оноо гэж харуулахгүй, дахин илгээх боломж өгнө.
      submittingRef.current = false;
      setPhase('submit-error');
      return;
    }
    setResultScore(res.data.score);
    audio.cue('clear');
    setPhase('result');
    setTimeout(onDone, 700);
  }, [attemptId, onDone]);

  // Тоглоомын цаг — rAF-ээр, wall-clock-оор (Date.now() - startedAtRef), frame-ийн
  // нийлбэр биш, тул дэвсгэрт орсон таб цаг нэмэхгүй.
  useEffect(() => {
    if (phase !== 'running') return;
    let frame = 0;
    const tick = () => {
      const t = Date.now() - startedAtRef.current;
      const left = Math.max(0, SORT.DURATION_MS - t);
      setRemaining(left);
      if (left === 0 || indexRef.current >= schedule.length) { void submit(); return; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, submit, schedule.length]);

  // `index` өөрчлөгдөж, шинэ зүйл дэлгэц дээр гарч ирмэгц (commit хийгдсэний
  // дараах effect) л товшилтын латчийг суллана.
  useEffect(() => {
    tappingRef.current = false;
  }, [index]);

  async function begin() {
    if (beginningRef.current) return;
    beginningRef.current = true;
    const res = await apiPost<{ startedAt: string }>(
      `/api/attempt/${attemptId}/game/sort`,
      { begin: true },
    );
    beginningRef.current = false;
    if (!res.ok) { setPhase('begin-error'); return; }

    startedAtRef.current = Date.now();
    indexRef.current = 0;
    eventsRef.current = [];
    rawScoreRef.current = 0;
    submittingRef.current = false;
    tappingRef.current = false;
    setIndex(0);
    setLiveScore(0);
    setRemaining(SORT.DURATION_MS);
    audio.cue('start');
    setPhase('running');
  }

  // `t` нь дуудагдах мөчид (onPointerDown handler дотор) тооцогдоно — цаашид
  // жинхэнэ дарах мөчөөс хойш ямар ч async/re-render хоцролт орохгүй.
  function tap(lane: SortLane, t: number) {
    // Латч — ХАМГИЙН ЭХЭНД, синхроноор шалгаж, тавигдана (StackStage-ийн
    // droppingRef-тэй ижил хэлбэр). Нэг л даралтаас хоёр pointerdown нэг
    // tick-д ирвэл хоёр дахь нь энд зогсоно — `i`-г уншихаас ч өмнө, тул
    // буруу зүйлийг онооход хэзээ ч хүрэхгүй.
    if (tappingRef.current) return;
    tappingRef.current = true;

    const i = indexRef.current;
    if (phase !== 'running' || i >= schedule.length) { tappingRef.current = false; return; }
    // Латч — энэ синхрон товшилтыг индексийг ШУУД ахиулж хаана (await-аас өмнө).
    indexRef.current = i + 1;

    const item = schedule[i];
    eventsRef.current.push({ id: item.id, lane, t });

    const expected: SortLane = item.damaged ? 'return' : item.mode;
    const ok = lane === expected;
    audio.cue(ok ? 'correct' : 'wrong');
    setHit({ lane, kind: ok ? 'ok' : 'bad' });
    if (hitTimer.current) clearTimeout(hitTimer.current);
    hitTimer.current = setTimeout(() => setHit(null), 160);
    rawScoreRef.current += ok ? SORT.CORRECT_POINTS : SORT.WRONG_POINTS;
    // Серверийн адил эцэст нь ГАГЦХҮҮ нэг удаа clamp хийнэ — tap тутамд биш.
    setLiveScore(Math.max(0, rawScoreRef.current));
    setIndex(indexRef.current);

    if (indexRef.current >= schedule.length) void submit();
  }

  if (phase === 'ready') {
    return (
      <StageReady step={1} title="Зөв зам" onStart={() => void begin()}>
        Ачааг зөв тээврийн хэрэгсэл рүү (<strong>төмөр зам · авто · агаар</strong>) чиглүүл,{' '}
          <strong>эвдэрсэн</strong> ачааг «Буцаах» руу илгээ.
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
      <StageResult score={resultScore} max={maxSortScore(schedule)} />
    );
  }

  const current = schedule[index];
  const secondsLeft = Math.ceil(remaining / 1000);

  return (
    <div className="no-select">
      <div className="flex items-baseline justify-between text-sm font-semibold">
        <span data-testid="stage-live-score" className="text-[#C9D6E6]">Оноо: {liveScore}</span>
        <span className={secondsLeft <= 3 ? 'text-[#FF8A8E]' : 'text-[#C9D6E6]'}>{secondsLeft} сек</span>
      </div>

      <div
        data-testid="sort-stage-item"
        data-hit={hit?.kind}
        className="bay relative mt-3 flex w-full touch-none items-center justify-center overflow-hidden"
        style={{ height: 'min(48dvh, 340px)' }}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-2 top-2 text-[11px] tracking-[0.14em] text-[#C9D6E6]/70"
        >
          ХЯНАЛТЫН ЦЭГ
        </span>
        {current && (
          <div key={current.id} className="obj-mount flex flex-col items-center gap-3">
            {current.damaged ? <DamagedIcon /> : <ModeIcon mode={current.mode} />}
            {/*
              Нэрийг НУУВ — зөвхөн дүрсээр таних. Өмнө нь «Төмөр зам» гэж
              бичээд доор нь «Төмөр зам» товч байсан тул тоглоом бараг
              уншиж товших дасгал болсон байв. Дүрс нь ачааны төрлийг
              хэлэх ёстой; нэр нь дэлгэц уншигчид (screen reader)
              хэвээр хүрнэ.
            */}
            <p data-testid="sort-label" className="sr-only">
              {current.damaged ? 'Эвдэрсэн' : MODE_LABEL[current.mode]}
            </p>
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {LANES.map(({ lane, label }) => (
          <button
            key={lane}
            type="button"
            data-testid={`lane-${lane}`}
            data-hit={hit?.lane === lane ? hit.kind : undefined}
            onPointerDown={() => tap(lane, Date.now() - startedAtRef.current)}
            className="lane-btn press min-h-14 touch-none rounded-lg bg-[#C21019] px-1 text-sm
                       font-semibold leading-tight text-white hover:bg-[#9E0D14]"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
