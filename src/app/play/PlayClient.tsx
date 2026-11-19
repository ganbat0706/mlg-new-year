'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import { loadSession } from '@/lib/session';
import { saveLastFinish, type FinishPayload } from '@/lib/finish';
import { Button } from '@/components/Button';
import { Loader } from '@/components/Loader';
import { audio } from '@/lib/audio';
import { SortStage } from './SortStage';
import { StackStage } from './StackStage';
import { MemoStage } from './MemoStage';
import { DropStage } from './DropStage';
import type { SortItem } from '@/lib/games/sort';
import type { StackLevel } from '@/lib/games/stack';
import type { DropSchedule } from '@/lib/games/drop';

type StartData = {
  attemptId: string;
  sortSchedule: SortItem[];
  stackSchedule: StackLevel[];
  memoSchedule: number[];
  dropSchedule: DropSchedule;
  sortDone: boolean;
  stackDone: boolean;
  memoDone: boolean;
  dropDone: boolean;
};

type Progress = { sort: boolean; stack: boolean; memo: boolean; drop: boolean };

type Stage = 'loading' | 'sort' | 'stack' | 'memo' | 'drop' | 'finishing' | 'error';

/**
 * Эхлэх дэс дараа нь: Зөв зам → Контейнер овоолох → Хос манифест →
 * Агаараас буулгах → finish.
 */
function firstUnfinished(p: Progress): Stage {
  if (!p.sort) return 'sort';
  if (!p.stack) return 'stack';
  if (!p.memo) return 'memo';
  if (!p.drop) return 'drop';
  return 'finishing';
}

export function PlayClient() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('loading');
  const [start, setStart] = useState<StartData | null>(null);
  const [progress, setProgress] = useState<Progress>({ sort: false, stack: false, memo: false, drop: false });
  const [error, setError] = useState('');

  useEffect(() => {
    const session = loadSession();
    if (!session) { router.replace('/register'); return; }

    void (async () => {
      const res = await apiPost<StartData>('/api/attempt/start', {
        registrationId: session.id,
      });
      if (!res.ok) { setError(res.error); setStage('error'); return; }

      setStart(res.data);
      setProgress({
        sort: res.data.sortDone,
        stack: res.data.stackDone,
        memo: res.data.memoDone,
        drop: res.data.dropDone,
      });
      // Дуусаагүй эхний тоглоомоос эхэлнэ (оролдлогоо завсарлаад буцаж ирсэн
      // тохиолдолд дууссан тоглоомыг давтахгүй).
      const ns = firstUnfinished({
        sort: res.data.sortDone, stack: res.data.stackDone,
        memo: res.data.memoDone, drop: res.data.dropDone,
      });
      setStage(ns === 'finishing' ? 'sort' : ns);
    })();
  }, [router]);

  // Хөтөч autoplay-г хориглодог тул дэвсгэр хөгжмийг ТОГЛОГЧИЙН ЭХНИЙ
  // товшилтоор л эхлүүлнэ. /play хуудас дээрх ямар ч товшилт тохирно
  // («Эхлэх» дарах нь хамгийн түгээмэл). Хуудсаас гарахад зогсоно.
  useEffect(() => {
    const onFirstTap = () => {
      void audio.unlock().then(() => audio.startMusic());
    };
    document.addEventListener('pointerdown', onFirstTap, { once: true });
    return () => {
      document.removeEventListener('pointerdown', onFirstTap);
      audio.stopMusic();
    };
  }, []);

  async function finishAndGo() {
    if (!start) return;
    setStage('finishing');
    const res = await apiPost<FinishPayload>(`/api/attempt/${start.attemptId}/finish`, {});
    if (!res.ok) { setError(res.error); setStage('error'); return; }
    saveLastFinish(res.data);
    router.push('/result');
  }

  /** Тухайн тоглоомыг дуусгаад (resume-ийн эхний төлвөөс тооцож) дараагийн
   * дуусаагүй шат руу шилжинэ, бүгд дуусвал finish дуудна. */
  function afterGame(game: keyof Progress) {
    const next = { ...progress, [game]: true };
    setProgress(next);
    const ns = firstUnfinished(next);
    if (ns === 'finishing') void finishAndGo();
    else setStage(ns);
  }

  if (stage === 'loading' || stage === 'finishing') {
    return <Loader label="Бэлтгэж байна…" />;
  }

  if (stage === 'error') {
    return (
      <div className="py-16">
        <p role="alert" className="enter-sm rounded-lg bg-[#FDECEC] px-4 py-3 text-base text-[#8A0F15]">
          {error}
        </p>
        <Button className="mt-6 w-full" onClick={() => router.push('/result')}>
          Үр дүн харах
        </Button>
      </div>
    );
  }

  if (!start) return null;

  if (stage === 'sort') {
    return (
      <SortStage
        attemptId={start.attemptId}
        schedule={start.sortSchedule}
        onDone={() => afterGame('sort')}
        onError={(m) => { setError(m); setStage('error'); }}
      />
    );
  }

  if (stage === 'stack') {
    return (
      <StackStage
        attemptId={start.attemptId}
        schedule={start.stackSchedule}
        onDone={() => afterGame('stack')}
        onError={(m) => { setError(m); setStage('error'); }}
      />
    );
  }

  if (stage === 'memo') {
    return (
      <MemoStage
        attemptId={start.attemptId}
        schedule={start.memoSchedule}
        onDone={() => afterGame('memo')}
        onError={(m) => { setError(m); setStage('error'); }}
      />
    );
  }

  return (
    <DropStage
      attemptId={start.attemptId}
      schedule={start.dropSchedule}
      onDone={() => afterGame('drop')}
      onError={(m) => { setError(m); setStage('error'); }}
    />
  );
}
