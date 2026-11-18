export const QUIZ = {
  QUESTION_COUNT: 10,
  TIME_LIMIT_MS: 10_000,
  /** Сүлжээний саатлыг нөхөх хөнгөлөлт — серверийн хэмжсэн хугацаанаас хасна. */
  NETWORK_GRACE_MS: 800,
  BASE_POINTS: 100,
  SPEED_POINTS_PER_SECOND: 10,
} as const;

/**
 * Reaction тоглоом — Phase 2-т SORT/STACK/MEMO-оор солигдоно (P2-3).
 * Одоогоор зарим файл (reaction.ts, ReactionStage.tsx, reaction route,
 * submitReaction, reaction тестүүд) үүнээс хамааралтай тул хасаагүй.
 */
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

/** 1. Зөв зам — контейнер зөв чиглэлд ангилах тоглоом. Дээд оноо: 12 × 80 = 960. */
export const SORT = {
  DURATION_MS: 15_000,
  ITEM_COUNT: 12,
  DAMAGED_RATIO: 0.2,
  CORRECT_POINTS: 80,
  WRONG_POINTS: -40,
} as const;

/** 2. Контейнер овоолох — цаг хугацааны нарийвчлалын тоглоом. Дээд оноо: 6 × (100 + 60) = 960. */
export const STACK = {
  DURATION_MS: 10_000,
  LEVELS: 6,
  DROP_MS: 500,
  BASE_PERIOD_MS: 1_600,
  PERIOD_STEP_MS: 60,
  TOLERANCE_PCT: 12,
  BASE_POINTS: 100,
  PRECISION_POINTS: 60,
} as const;

/** 3. Хос манифест — санах ойн тоглоом. Дээд оноо: 6 × 130 + 180 = 960. */
export const MEMO = {
  DURATION_MS: 20_000,
  PAIRS: 6,
  LOCK_MS: 600,
  PAIR_POINTS: 130,
  BONUS_PER_SEC: 30,
  BONUS_MAX: 180,
} as const;

/** Бүх тоглоомд нийтлэг — хүний хуруу үүнээс хурдан дарж чадахгүй. */
export const PLAY = {
  MIN_EVENT_GAP_MS: 200,
  MAX_EVENTS: 400,
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
