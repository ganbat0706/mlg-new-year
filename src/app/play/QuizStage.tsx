'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';

type Question = {
  position: number;
  total: number;
  questionId: number;
  text: string;
  options: string[];
  timeLimitMs: number;
};

type Props = {
  attemptId: string;
  onDone: () => void;
  onError: (message: string) => void;
};

export function QuizStage({ attemptId, onDone, onError }: Props) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState<{ correct: boolean; points: number } | null>(null);
  const deadlineRef = useRef(0);

  const loadNext = useCallback(async () => {
    const res = await apiGet<Question | null>(`/api/attempt/${attemptId}/question`);
    if (!res.ok) { onError(res.error); return; }

    setFeedback(null);
    setLocked(false);

    if (res.data === null) { onDone(); return; }

    setQuestion(res.data);
    deadlineRef.current = Date.now() + res.data.timeLimitMs;
    setRemainingMs(res.data.timeLimitMs);
  }, [attemptId, onDone, onError]);

  const answer = useCallback(async (shownIndex: number) => {
    if (locked || !question) return;
    setLocked(true);

    const res = await apiPost<{ isCorrect: boolean; points: number }>(
      `/api/attempt/${attemptId}/answer`,
      { questionId: question.questionId, choiceIndex: shownIndex },
    );

    if (!res.ok) {
      // Хугацаа дууссаны улмаас сервер татгалзсан бол дараагийн асуулт руу.
      setFeedback({ correct: false, points: 0 });
    } else {
      setFeedback({ correct: res.data.isCorrect, points: res.data.points });
    }

    setTimeout(() => { void loadNext(); }, 900);
  }, [attemptId, locked, loadNext, question]);

  useEffect(() => {
    const t = setTimeout(() => { void loadNext(); }, 0);
    return () => clearTimeout(t);
  }, [loadNext]);

  // Цаг тоолуур — 100ms тутам шинэчилнэ, 0 болоход автоматаар алгасна.
  useEffect(() => {
    if (!question || locked) return;

    const timer = setInterval(() => {
      const left = Math.max(0, deadlineRef.current - Date.now());
      setRemainingMs(left);
      if (left === 0) { void answer(-1); }
    }, 100);

    return () => clearInterval(timer);
  }, [question, locked, answer]);

  if (!question) {
    return <p className="py-20 text-center text-[#6B6568]">Ачааллаж байна…</p>;
  }

  const pct = (remainingMs / question.timeLimitMs) * 100;

  return (
    <div className="no-select">
      <div className="flex items-baseline justify-between text-sm font-semibold text-[#6B6568]">
        <span>Асуулт {question.position} / {question.total}</span>
        <span className={remainingMs < 3000 ? 'text-[#C21019]' : ''}>
          {Math.ceil(remainingMs / 1000)} сек
        </span>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#E3DED2]">
        <div
          className="h-full rounded-full bg-[#ED1C24] transition-[width] duration-100 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>

      <h2 className="mt-8 text-2xl font-bold leading-snug">{question.text}</h2>

      <div className="mt-6 space-y-3">
        {question.options.map((option, i) => (
          <button
            key={i}
            type="button"
            disabled={locked}
            onClick={() => void answer(i)}
            className="min-h-14 w-full rounded-lg border border-[#DAD5CC] bg-white px-5
                       py-3 text-left text-base font-medium transition
                       hover:border-[#ED1C24] disabled:opacity-60"
          >
            {option}
          </button>
        ))}
      </div>

      {feedback && (
        <p
          role="status"
          className={`mt-6 rounded-lg px-4 py-3 text-base font-semibold ${
            feedback.correct ? 'bg-[#E6F4EA] text-[#13693B]' : 'bg-[#FDECEC] text-[#8A0F15]'
          }`}
        >
          {feedback.correct ? `Зөв! +${feedback.points} оноо` : 'Буруу'}
        </p>
      )}
    </div>
  );
}
