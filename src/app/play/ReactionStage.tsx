'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiPost } from '@/lib/api';
import { REACTION } from '@/lib/config';
import type { SpawnItem, Tap } from '@/lib/reaction';
import { Button } from '@/components/Button';

type Props = {
  attemptId: string;
  schedule: SpawnItem[];
  onDone: () => void;
  onError: (message: string) => void;
};

type Phase = 'ready' | 'running' | 'sending';

export function ReactionStage({ attemptId, schedule, onDone, onError }: Props) {
  const [phase, setPhase] = useState<Phase>('ready');
  const [elapsed, setElapsed] = useState(0);
  const [shownScore, setShownScore] = useState(0);
  const [tappedIds, setTappedIds] = useState<Set<number>>(new Set());

  const startedAtRef = useRef(0);
  const tapsRef = useRef<Tap[]>([]);

  const submit = useCallback(async () => {
    setPhase('sending');
    const res = await apiPost<{ reactionScore: number }>(
      `/api/attempt/${attemptId}/reaction`,
      { taps: tapsRef.current },
    );
    if (!res.ok) { onError(res.error); return; }
    onDone();
  }, [attemptId, onDone, onError]);

  // Тоглоомын цаг — requestAnimationFrame-ээр жигд явуулна.
  useEffect(() => {
    if (phase !== 'running') return;

    let frame = 0;
    const tick = () => {
      const t = Date.now() - startedAtRef.current;
      setElapsed(t);
      if (t >= REACTION.DURATION_MS) { void submit(); return; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [phase, submit]);

  function begin() {
    startedAtRef.current = Date.now();
    tapsRef.current = [];
    setTappedIds(new Set());
    setShownScore(0);
    setElapsed(0);
    setPhase('running');
  }

  if (phase === 'ready') {
    return (
      <div className="py-10 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight">Ачаа ачих</h2>
        <p className="mx-auto mt-4 max-w-sm text-base leading-relaxed text-[#6B6568]">
          {REACTION.DURATION_MS / 1000} секундын дотор <strong>улаан контейнер</strong> дээр
          дарж ачаарай. <strong>Хар эвдэрсэн ачаа</strong> дээр дарвал оноо хасагдана.
        </p>
        <Button className="mt-10 w-full" onClick={begin}>Эхлэх</Button>
      </div>
    );
  }

  if (phase === 'sending') {
    return <p className="py-24 text-center text-[#6B6568]">Оноог тооцож байна…</p>;
  }

  const visible = schedule.filter(
    (i) => elapsed >= i.t
      && elapsed <= i.t + REACTION.OBJECT_LIFETIME_MS
      && !tappedIds.has(i.id),
  );
  const remaining = Math.ceil((REACTION.DURATION_MS - elapsed) / 1000);

  return (
    <div className="no-select">
      <div className="flex items-baseline justify-between text-sm font-semibold">
        <span className="text-[#6B6568]">Оноо: {shownScore}</span>
        <span className={remaining <= 5 ? 'text-[#C21019]' : 'text-[#6B6568]'}>
          {remaining} сек
        </span>
      </div>

      <div
        className="relative mt-3 w-full overflow-hidden rounded-xl bg-[#221E20] touch-none"
        style={{ height: 'min(70dvh, 560px)' }}
      >
        {visible.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-label={item.kind === 'good' ? 'Контейнер ачих' : 'Эвдэрсэн ачаа'}
            onPointerDown={() => {
              if (phase !== 'running' || tappedIds.has(item.id)) return;

              const t = Date.now() - startedAtRef.current;
              if (tapsRef.current.length >= REACTION.MAX_TAPS) return;

              tapsRef.current.push({ id: item.id, t });
              setTappedIds((prev) => new Set(prev).add(item.id));
              setShownScore((s) => Math.max(0, s + (item.kind === 'good'
                ? REACTION.GOOD_POINTS : REACTION.BAD_POINTS)));
            }}
            className="absolute rounded-md"
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              width: 64,
              height: 48,
              marginLeft: -32,
              marginTop: -24,
              background: item.kind === 'good' ? '#ED1C24' : '#4A4446',
              border: item.kind === 'good' ? '2px solid #FF6B70' : '2px dashed #8A8285',
            }}
          />
        ))}
      </div>

      <p className="mt-3 text-center text-sm text-[#6B6568]">
        Улаан = ачих · Хар тасархай = бүү дар
      </p>
    </div>
  );
}
