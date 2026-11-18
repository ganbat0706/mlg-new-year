'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { Loader } from '@/components/Loader';

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
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; points: number } | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const deadlineRef = useRef(0);
  // Давхар товшилтыг бодитоор хориглох түгжээ — "locked" state нь зөвхөн харагдах
  // байдал (disabled товч) бөгөөд commit хийгдэхээс өмнө хуучин утгыг уншиж болзошгүй
  // тул синхрон шалгалт хийхэд тохирохгүй. Ref нь энэ хоёрдугаар товшилтыг хаана.
  const answeringRef = useRef(false);

  const loadNext = useCallback(async () => {
    const res = await apiGet<Question | null>(`/api/attempt/${attemptId}/question`);
    if (!res.ok) { onError(res.error); return; }

    answeringRef.current = false;
    setFeedback(null);
    setSelected(null);
    setTimedOut(false);
    setSubmitFailed(false);
    setLocked(false);

    if (res.data === null) { onDone(); return; }

    setQuestion(res.data);
    deadlineRef.current = Date.now() + res.data.timeLimitMs;
    setRemainingMs(res.data.timeLimitMs);
  }, [attemptId, onDone, onError]);

  const answer = useCallback(async (shownIndex: number) => {
    if (answeringRef.current || !question) return;
    answeringRef.current = true;
    setLocked(true);
    setSelected(shownIndex);
    if (shownIndex === -1) setTimedOut(true);

    const res = await apiPost<{ isCorrect: boolean; points: number }>(
      `/api/attempt/${attemptId}/answer`,
      { questionId: question.questionId, choiceIndex: shownIndex },
    );

    if (!res.ok) {
      // Сервер татгалзсан — сүлжээ тасарсан эсвэл асуулт аль хэдийн хариулагдсан
      // (давхар бичлэгийн зэрэгцээ хүсэлтийн тохиолдол) байж болно. Аль ч тохиолдолд
      // тоглогч зөв хариулсан эсэхийг бид мэдэхгүй тул «Буруу» гэж буруу мэдээлэхгүй —
      // гэхдээ бүрэн чимээгүй ч үлдээхгүй: богино, цочроохгүй мэдэгдэл үзүүлээд
      // (хариулт магадгүй хадгалагдаагүй, ижил асуулт дахин гарч болзошгүй),
      // урсгалыг блоклохгүйгээр богино хугацааны дараа дараагийн асуулт руу шилжинэ.
      setSubmitFailed(true);
      setTimeout(() => { void loadNext(); }, 900);
      return;
    }

    setFeedback({ correct: res.data.isCorrect, points: res.data.points });
    setTimeout(() => { void loadNext(); }, 900);
  }, [attemptId, loadNext, question]);

  useEffect(() => {
    const t = setTimeout(() => { void loadNext(); }, 0);
    return () => clearTimeout(t);
  }, [loadNext]);

  // Цаг тоолуур — 100ms тутам шинэчилнэ, 0 болоход автоматаар алгасна. Энэ нь
  // зөвхөн тоон харуулалт (секунд) болон автомат алгаслалтад зориулагдсан —
  // зурвасын өргөнийг ЭНЭ ХУДАЛДААГҮЙ, доорх `.countdown-bar` нь ганцаараа
  // нэг CSS анимэйшнээр (width 100%→0%, linear, duration=timeLimitMs) явна.
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
    return <Loader label="Ачааллаж байна…" />;
  }

  const secondsLeft = Math.ceil(remainingMs / 1000);
  const urgent = remainingMs < 3000;

  return (
    <div className="no-select">
      <div className="flex items-baseline justify-between text-sm font-semibold text-[#6B6568]">
        <span>Асуулт {question.position} / {question.total}</span>
        <span className={urgent ? 'text-[#C21019]' : ''}>
          <span key={secondsLeft} className={urgent ? 'tick-pulse' : ''}>{secondsLeft}</span> сек
        </span>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#E3DED2]">
        <div
          key={question.questionId}
          className="countdown-bar"
          style={{
            animationDuration: `${question.timeLimitMs}ms`,
            animationPlayState: locked ? 'paused' : 'running',
            backgroundColor: urgent ? '#C21019' : '#ED1C24',
          }}
        />
      </div>

      <div key={question.questionId}>
        <h2 className="quiz-h2-in mt-8 text-2xl font-bold leading-snug">{question.text}</h2>

        <div className="mt-6 space-y-3">
          {question.options.map((option, i) => {
            const isSelected = selected === i;
            const isWrongTap = isSelected && feedback && !feedback.correct;
            const isCorrectTap = isSelected && feedback && feedback.correct;
            return (
              <button
                key={i}
                type="button"
                disabled={locked}
                onClick={() => void answer(i)}
                style={{ animationDelay: `${i * 40}ms` }}
                className={`quiz-opt-in press min-h-14 w-full rounded-lg border px-5 py-3 text-left
                           text-base font-medium disabled:cursor-not-allowed ${
                  isCorrectTap
                    ? 'border-2 border-[#13693B] bg-[#E6F4EA]'
                    : isWrongTap
                      ? 'border-2 border-[#8A0F15] bg-[#FDECEC] shake-x'
                      : 'border-[#DAD5CC] bg-white hover:border-[#ED1C24] disabled:opacity-60'
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      {submitFailed ? (
        <p role="status" className="pts-badge-in mt-6 text-base font-medium text-[#6B6568]">
          Илгээгдсэнгүй — энэ асуулт дахин гарч магадгүй
        </p>
      ) : timedOut ? (
        <p role="status" className="pts-badge-in mt-6 text-base font-medium text-[#6B6568]">
          Хугацаа дууслаа
        </p>
      ) : feedback && (
        <p
          role="status"
          className={`pts-badge-in mt-6 inline-block rounded-lg px-4 py-3 text-base font-semibold ${
            feedback.correct ? 'bg-[#E6F4EA] text-[#13693B]' : 'bg-[#FDECEC] text-[#8A0F15]'
          }`}
        >
          {feedback.correct ? `Зөв! +${feedback.points} оноо` : 'Буруу'}
        </p>
      )}
    </div>
  );
}
