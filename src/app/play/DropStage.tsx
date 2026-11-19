'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiPost } from '@/lib/api';
import { DROP } from '@/lib/config';
import {
  planePosition, columnAt, maxDropScore,
  type DropEvent, type DropSchedule,
} from '@/lib/games/drop';
import { audio } from '@/lib/audio';
import {
  StageReady, StageNotice, StageResult, useRunningStage,
} from './StageChrome';
import { Loader } from '@/components/Loader';
import { Button } from '@/components/Button';

type Props = {
  attemptId: string;
  schedule: DropSchedule;
  onDone: () => void;
  onError: (message: string) => void;
};

type Phase = 'ready' | 'begin-error' | 'running' | 'submitting' | 'submit-error' | 'result';

/**
 * MLG ачааны онгоц — дээрээс харсан дүрс. Дээрээс харсан нь хажуугаас
 * харснаас илүү танигдацтай: далавч хоёр тал руугаа тэгш сунах тул жижиг
 * хэмжээнд ч «онгоц» гэж уншигдана.
 */
function Plane() {
  return (
    <svg viewBox="0 0 56 40" width="52" height="37" aria-hidden="true">
      {/* далавч */}
      <path d="M26 16 L6 24 L6 29 L26 25 L30 25 L50 29 L50 24 L30 16 Z"
            fill="#ED1C24" stroke="#FAF7F0" strokeWidth="1.2" strokeLinejoin="round" />
      {/* сүүл */}
      <path d="M26 32 L17 36 L17 38 L26 37 L30 37 L39 38 L39 36 L30 32 Z"
            fill="#ED1C24" stroke="#FAF7F0" strokeWidth="1.2" strokeLinejoin="round" />
      {/* их бие */}
      <path d="M28 2 C31 2 33 6 33 12 L33 36 C33 38 31 39 28 39 C25 39 23 38 23 36 L23 12 C23 6 25 2 28 2 Z"
            fill="#ED1C24" stroke="#FAF7F0" strokeWidth="1.2" strokeLinejoin="round" />
      {/* MLG-ийн цагаан зурвас */}
      <rect x="23.5" y="18" width="9" height="3" fill="#FAF7F0" opacity="0.95" />
    </svg>
  );
}

/**
 * Агаараас буулгах — MLG онгоц хөндлөн нисэхэд ачаа буулгаж контейнерийн
 * ханыг нураана.
 *
 * `planePosition` нь СЕРВЕРТЭЙ ЯГ ИЖИЛ томьёо (src/lib/games/drop.ts).
 * Хоёр тусдаа хэрэгжилт зурвал дэлгэц дээр харагдсан байрлал, серверийн
 * тооцоолсон багана зөрж, тоглоом шударга бус болно — StackStage-ийн
 * `cranePosition`-той ижил дүрэм.
 */
export function DropStage({ attemptId, schedule, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>('ready');
  useRunningStage(phase === 'running');

  const [planeX, setPlaneX] = useState(50);
  const [facing, setFacing] = useState<1 | -1>(1);
  const prevXRef = useRef(50);
  const [wall, setWall] = useState<number[]>(() => [...schedule.wall]);
  const [dropping, setDropping] = useState(false);
  const [falling, setFalling] = useState<{ x: number; key: number } | null>(null);
  const [hit, setHit] = useState<'ok' | 'bad' | null>(null);
  const [liveScore, setLiveScore] = useState(0);
  const [remaining, setRemaining] = useState<number>(DROP.DURATION_MS);
  const [resultScore, setResultScore] = useState(0);

  const startedAtRef = useRef(0);
  const passIdxRef = useRef(0);
  const openAtRef = useRef(0);
  const wallRef = useRef<number[]>([...schedule.wall]);
  const eventsRef = useRef<DropEvent[]>([]);
  const rawScoreRef = useRef(0);
  const droppingRef = useRef(false);
  const submittingRef = useRef(false);
  const beginningRef = useRef(false);

  const submit = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setPhase('submitting');
    const res = await apiPost<{ score: number; maxScore: number; flagged: boolean }>(
      `/api/attempt/${attemptId}/game/drop`,
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

  // Онгоцны байрлал — rAF-ээр, wall-clock-оор дахин тооцож зурна.
  useEffect(() => {
    if (phase !== 'running') return undefined;
    let frame = 0;
    const tick = () => {
      const i = passIdxRef.current;
      if (i < schedule.passes.length) {
        const t = Date.now() - startedAtRef.current;
        const x = planePosition(schedule.passes[i], t - openAtRef.current);
        // Чиглэл — байрлалын өөрчлөлтөөс. Маш жижиг хөдөлгөөнд эргүүлэхгүй,
        // эс бөгөөс эргэлтийн цэг дээр онгоц чичирнэ.
        if (Math.abs(x - prevXRef.current) > 0.05) {
          setFacing(x > prevXRef.current ? 1 : -1);
          prevXRef.current = x;
        }
        setPlaneX(x);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, schedule]);

  // Хугацаа — дуусмагц илгээнэ.
  useEffect(() => {
    if (phase !== 'running') return undefined;
    const id = setInterval(() => {
      const left = DROP.DURATION_MS - (Date.now() - startedAtRef.current);
      setRemaining(Math.max(0, left));
      if (left <= 0) void submit();
    }, 100);
    return () => clearInterval(id);
  }, [phase, submit]);

  async function begin() {
    if (beginningRef.current) return;
    beginningRef.current = true;
    const res = await apiPost<{ startedAt: string }>(
      `/api/attempt/${attemptId}/game/drop`,
      { begin: true },
    );
    beginningRef.current = false;
    if (!res.ok) { setPhase('begin-error'); return; }

    startedAtRef.current = Date.now();
    passIdxRef.current = 0;
    openAtRef.current = 0;
    wallRef.current = [...schedule.wall];
    eventsRef.current = [];
    rawScoreRef.current = 0;
    submittingRef.current = false;
    droppingRef.current = false;
    setWall([...schedule.wall]);
    setLiveScore(0);
    setRemaining(DROP.DURATION_MS);
    setPlaneX(planePosition(schedule.passes[0], 0));
    audio.cue('start');
    setPhase('running');
  }

  function drop() {
    // Латч — ачаа унах (FALL_MS) хугацаанд дараагийн товшилтыг СИНХРОНООР
    // хаана. StackStage-ийн droppingRef-тэй ижил: re-render-ийг хүлээвэл нэг
    // даралтаас хоёр үйлдэл бүртгэгдэнэ.
    if (droppingRef.current) return;
    const i = passIdxRef.current;
    if (phase !== 'running' || i >= schedule.passes.length) return;
    droppingRef.current = true;
    setDropping(true);

    const t = Date.now() - startedAtRef.current;
    const pass = schedule.passes[i];
    const x = planePosition(pass, t - openAtRef.current);
    eventsRef.current.push({ index: pass.index, t });

    const col = columnAt(x);
    const landed = wallRef.current[col] > 0;
    if (landed) {
      wallRef.current[col] -= 1;
      rawScoreRef.current += DROP.HIT_POINTS;
      setWall([...wallRef.current]);
    }
    audio.cue(landed ? 'correct' : 'wrong');
    setHit(landed ? 'ok' : 'bad');
    setFalling({ x, key: t });
    setLiveScore(rawScoreRef.current);

    openAtRef.current = t + DROP.FALL_MS;
    passIdxRef.current = i + 1;

    setTimeout(() => {
      droppingRef.current = false;
      setHit(null);
      setFalling(null);
      setDropping(false);
      const noneLeft = wallRef.current.every((h) => h === 0);
      if (passIdxRef.current >= schedule.passes.length || noneLeft) void submit();
    }, DROP.FALL_MS);
  }

  if (phase === 'ready') {
    return (
      <StageReady step={4} title="Агаараас буулгах" onStart={() => void begin()}>
        MLG онгоц хөндлөн нисэхэд <strong>«Буулгах»</strong> дарж ачаагаа тавь — доорх
        контейнерийн ханыг бүрэн нурааж чадах уу?
      </StageReady>
    );
  }

  if (phase === 'begin-error') {
    return (
      <StageNotice message="Тоглоом эхлүүлж чадсангүй. Сүлжээгээ шалгаад дахин оролдоно уу." actionLabel="Дахин оролдох" onAction={() => void begin()} />
    );
  }

  if (phase === 'submitting') return <Loader label="Оноог тооцож байна…" />;

  if (phase === 'submit-error') {
    return (
      <StageNotice message="Илгээж чадсангүй. Таны тоглолт хадгалагдсан байгаа — дахин оролдоно уу." actionLabel="Дахин илгээх" onAction={() => void submit()} />
    );
  }

  if (phase === 'result') {
    return <StageResult score={resultScore} max={maxDropScore(schedule)} />;
  }

  const secondsLeft = Math.ceil(remaining / 1000);
  const left = 5;
  const span = 90;

  return (
    <div className="no-select">
      <div className="flex items-baseline justify-between text-sm font-semibold">
        <span data-testid="stage-live-score" className="text-[#C9D6E6]">Оноо: {liveScore}</span>
        <span className={secondsLeft <= 3 ? 'text-[#FF8A8E]' : 'text-[#C9D6E6]'}>{secondsLeft} сек</span>
      </div>

      <div
        data-hit={hit ?? undefined}
        className="bay relative mt-3 w-full touch-none overflow-hidden"
        style={{ height: 'min(44dvh, 320px)' }}
      >
        {/* онгоц */}
        <div
          data-testid="plane"
          className="absolute top-3"
          style={{ left: `${planeX}%`, transform: `translateX(-50%) scaleX(${facing})` }}
        >
          <Plane />
        </div>

        {/* унаж буй ачаа */}
        {falling && (
          <div
            key={falling.key}
            data-testid="falling-cargo"
            className="cargo-fall container-face absolute w-7 rounded-sm border border-[#FAF7F0]/60 bg-[#ED1C24]"
            style={{ left: `${falling.x}%`, ['--fall-ms' as string]: `${DROP.FALL_MS}ms` }}
          />
        )}

        {/* контейнерийн хана — доод талд, багана тус бүр доороос дээш өрөгдөнө */}
        <div className="absolute inset-x-0 bottom-0 flex items-end" style={{ paddingLeft: `${left}%`, paddingRight: `${left}%` }}>
          {wall.map((height, col) => (
            <div
              key={col}
              data-testid={`wall-col-${col}`}
              className="flex flex-col-reverse items-center gap-0.5"
              style={{ width: `${span / DROP.COLS}%` }}
            >
              {Array.from({ length: height }, (_, row) => (
                <div
                  key={row}
                  className="container-face h-6 w-[86%] rounded-sm border border-[#FAF7F0]/40 bg-[#ED1C24]"
                  style={{ ['--stripe' as string]: row % 2 ? '8px' : '10px' }}
                />
              ))}
            </div>
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
