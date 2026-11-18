import { QUIZ } from './config';
import { shuffle } from './rng';

/**
 * Зөв хариултын оноо: суурь + хурдны урамшуулал.
 * Сөрөг эсвэл утгагүй elapsed-ийг хамгаалж 0-д clamp хийнэ.
 */
export function scoreAnswer(isCorrect: boolean, elapsedMs: number): number {
  if (!isCorrect) return 0;
  if (!Number.isFinite(elapsedMs)) return 0;

  const adjusted = Math.max(0, elapsedMs - QUIZ.NETWORK_GRACE_MS);
  if (adjusted >= QUIZ.TIME_LIMIT_MS) return 0;

  const remainingSeconds = Math.floor((QUIZ.TIME_LIMIT_MS - adjusted) / 1000);
  return QUIZ.BASE_POINTS + remainingSeconds * QUIZ.SPEED_POINTS_PER_SECOND;
}

export function buildOptionOrder(optionCount: number, rng: () => number): number[] {
  const indices = Array.from({ length: optionCount }, (_, i) => i);
  return shuffle(indices, rng);
}

export function applyOptionOrder(
  options: readonly string[],
  order: readonly number[],
): string[] {
  return order.map((i) => options[i]);
}

/** Хэрэглэгчийн харсан байрлалыг асуултын эх индекс рүү буулгана. */
export function resolveChoice(order: readonly number[], shownIndex: number): number {
  if (!Number.isInteger(shownIndex)) return -1;
  if (shownIndex < 0 || shownIndex >= order.length) return -1;
  return order[shownIndex];
}
