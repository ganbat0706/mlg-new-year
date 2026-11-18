'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import { loadSession } from '@/lib/session';
import { Button } from '@/components/Button';
import { QuizStage } from './QuizStage';
import { ReactionStage } from './ReactionStage';
import type { SpawnItem } from '@/lib/reaction';

type StartData = {
  attemptId: string;
  spawnSchedule: SpawnItem[];
  answered: number;
  reactionDone: boolean;
};

type FinishData = {
  totalScore: number;
  quizScore: number;
  reactionScore: number;
  bestScore: number;
};

type Stage = 'loading' | 'quiz' | 'reaction' | 'error';

export function PlayClient() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('loading');
  const [start, setStart] = useState<StartData | null>(null);
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

      if (res.data.reactionDone) {
        // reactionDone === true зөвхөн энэ оролдлогын reaction tap-ууд аль хэдийн
        // илгээгдсэн ч finish дуудагдаагүй гэсэн үг. ReactionStage рүү дахин оруулбал
        // тоглогч тоглоомоо дахин тоглох ёстой болох ба submitReaction хоёр дахь
        // илгээлтийг татгалзана («Reaction аль хэдийн илгээгдсэн байна») — тэнцвэргүй
        // мухардалд хүргэнэ. Иймд reaction үе шатыг алгасаж, шууд дуусгаад /result
        // руу шилжинэ.
        const finishRes = await apiPost<FinishData>(
          `/api/attempt/${res.data.attemptId}/finish`,
          {},
        );
        if (!finishRes.ok) { setError(finishRes.error); setStage('error'); return; }
        router.push('/result');
        return;
      }

      setStage('quiz');
    })();
  }, [router]);

  if (stage === 'loading') {
    return <p className="py-24 text-center text-[#6B6568]">Бэлтгэж байна…</p>;
  }

  if (stage === 'error') {
    return (
      <div className="py-16">
        <p role="alert" className="rounded-lg bg-[#FDECEC] px-4 py-3 text-base text-[#8A0F15]">
          {error}
        </p>
        <Button className="mt-6 w-full" onClick={() => router.push('/result')}>
          Үр дүн харах
        </Button>
      </div>
    );
  }

  if (!start) return null;

  if (stage === 'quiz') {
    return (
      <QuizStage
        attemptId={start.attemptId}
        onDone={() => setStage('reaction')}
        onError={(m) => { setError(m); setStage('error'); }}
      />
    );
  }

  return (
    <ReactionStage
      attemptId={start.attemptId}
      schedule={start.spawnSchedule}
      onDone={async () => {
        const res = await apiPost<unknown>(`/api/attempt/${start.attemptId}/finish`, {});
        if (!res.ok) { setError(res.error); setStage('error'); return; }
        router.push('/result');
      }}
      onError={(m) => { setError(m); setStage('error'); }}
    />
  );
}
