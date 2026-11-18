'use client';

const KEY = 'mlg:lastFinish';

export type FinishPayload = {
  totalScore: number;
  quizScore: number;
  sortScore: number;
  stackScore: number;
  memoScore: number;
  bestScore: number;
  flagged: boolean;
  attemptsUsed: number;
};

/**
 * `PlayClient` дуусахдаа энд хадгалж `/result` рүү шилждэг — тоглогч өөрийн
 * оноо буухыг нэг удаа харах ёстой тул (урлагийн чиглэл, 4-р хэсэг).
 * `sessionStorage` ашигласан нь шинэ tab/дахин ачаалахад л арилна —
 * localStorage шиг мөнхөд үлдэхгүй, гэхдээ `/result`-руу шилжихэд хэвээр байна.
 */
export function saveLastFinish(data: FinishPayload): void {
  try { sessionStorage.setItem(KEY, JSON.stringify(data)); } catch { /* private mode */ }
}

/** НЭГ УДАА уншиж, шууд цэвэрлэнэ — дахин сэргээхэд (refresh) давтагдахгүй. */
export function takeLastFinish(): FinishPayload | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    const parsed = JSON.parse(raw) as FinishPayload;
    return typeof parsed?.totalScore === 'number' ? parsed : null;
  } catch { return null; }
}
