export const QUIZ = {
  QUESTION_COUNT: 10,
  TIME_LIMIT_MS: 10_000,
  /** Сүлжээний саатлыг нөхөх хөнгөлөлт — серверийн хэмжсэн хугацаанаас хасна. */
  NETWORK_GRACE_MS: 800,
  BASE_POINTS: 100,
  SPEED_POINTS_PER_SECOND: 10,
} as const;

export const REACTION = {
  DURATION_MS: 20_000,
  OBJECT_LIFETIME_MS: 1_200,
  SPAWN_INTERVAL_MS: 300,
  BAD_RATIO: 0.25,
  GOOD_POINTS: 40,
  BAD_POINTS: -25,
  /** Нэг хүсэлтэд зөвшөөрөх дээд tap тоо — илүү бол 400. */
  MAX_TAPS: 400,
  /** Tap-ын цагт зөвшөөрөх хөнгөлөлт. */
  GRACE_MS: 400,
} as const;

export const GAME = {
  MAX_ATTEMPTS: 3,
  PRIZE_PLACES: 5,
  /** Үүнээс удсан in_progress оролдлого хүчингүй болно. */
  ATTEMPT_TIMEOUT_MS: 30 * 60 * 1000,
  INVITE_PREFIX: 'MLG-2026',
} as const;

export function gameClosesAt(): Date {
  const raw = process.env.GAME_CLOSES_AT;
  if (!raw) throw new Error('GAME_CLOSES_AT тохируулаагүй байна');
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) throw new Error(`GAME_CLOSES_AT буруу: ${raw}`);
  return d;
}

export function isGameOpen(now: Date = new Date()): boolean {
  return now.getTime() <= gameClosesAt().getTime();
}

export function eventInfo() {
  return {
    date: process.env.EVENT_DATE ?? '2026-12-05',
    time: process.env.EVENT_TIME ?? '',
    venue: process.env.EVENT_VENUE ?? '',
  };
}
