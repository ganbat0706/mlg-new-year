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
  /**
   * `begin` дуудлагаас хойш бодитоор өнгөрсөн wall-clock хугацаа тоглоомын
   * DURATION_MS-ийн хэдэн хувиас багагүй байх ёстойг тогтооно (events дотоод
   * t утгууд биш — скрипт эдгээрийг хуурамчаар зөв зайтай зохиож чадна).
   *
   * 0.8 гэдэг нь: жинхэнэ тоглогч бараг үргэлж DURATION_MS-д ойрхон буюу бага зэрэг
   * түүнээс дээш (сүлжээний саатал, render frame) хугацаа зарцуулна — бодит elapsed
   * ойролцоогоор 0.95–1.3× DURATION_MS хооронд байдаг (эрт дуусгаж болдог memo-г эс
   * тооцвол). 0.8 босго нь үүнээс доош — зөвхөн script бүх үйлдлийг шууд, зогсолтгүй
   * илгээж чадсан тохиолдолд л хүрнэ. Дээд тал руу зориудаар хязгаарлаагүй: гар утас
   * арын горимд орох, сүлжээ удаашрах зэрэг хоцролтыг хууран мэдэхгүй байхын тулд.
   */
  MIN_ELAPSED_RATIO: 0.8,
} as const;

/**
 * 4. Агаараас буулгах — MLG онгоц хөндлөн нисэхэд ачаа буулгаж контейнерийн
 * ханыг нураана. Дээд оноо: 12 буулгалт × 80 = 960 (бусад гурвантай ижил).
 */
export const DROP = {
  DURATION_MS: 15_000,
  /** Ханын багана. Нийт контейнер = DROPS, өндөр нь багана бүрт 1..3. */
  COLS: 6,
  DROPS: 12,
  /** Ачаа унах хугацаа — энэ хооронд дахин буулгаж болохгүй (STACK.DROP_MS-тэй ижил санаа). */
  FALL_MS: 400,
  BASE_PERIOD_MS: 1_900,
  PERIOD_STEP_MS: 60,
  HIT_POINTS: 80,
} as const;

/**
 * Дөрвөн тоглоомын дээд оноо. Клиент дээр мөрүүдээс НЭМЖ гаргахгүй —
 * тоглоом дутуу үлдсэн тохиолдолд «нийт» нь багасаж, тоглогчид буруу
 * хуваарь харагдана.
 */
export const MAX_TOTAL_SCORE = 4 * 960;

export const GAME = {
  MAX_ATTEMPTS: 3,
  PRIZE_PLACES: 5,
  /** Үүнээс удсан in_progress оролдлого хүчингүй болно. */
  ATTEMPT_TIMEOUT_MS: 30 * 60 * 1000,
  INVITE_PREFIX: 'MLG-2026',
} as const;

/**
 * Тоглоом хаагдах хугацааны АНХДАГЧ утга. `.env.example`-тэй ижил.
 *
 * Өмнө нь `GAME_CLOSES_AT` тохируулаагүй бол энэ функц алдаа шиддэг байв.
 * Үүний үр дүнг production дээр бодитоор үзлээ: хувьсагч нэмэхээс өмнө
 * нүүр хуудас, дүрэм, үр дүн — БҮХ хуудас 500 буцааж, ажилтанд ямар ч
 * мэдээлэл үлдэхгүй цагаан дэлгэц харагдав. Тоглоомын хаалтын огноо нь
 * кодод аль хэдийн бичигдсэн, тогтсон мэдээлэл тул түүнийг нууц
 * тохиргоо мэт шаардах шалтгаан байхгүй.
 *
 * Буруу бичигдсэн утга бол ӨӨР асуудал — тэр нь бодит алдаа тул хэвээр
 * шиднэ (чимээгүйгээр анхдагч руу буцвал арга хэмжээний баг буруу огноо
 * тохируулсанаа мэдэхгүй өнгөрнө).
 */
const DEFAULT_CLOSES_AT = '2026-12-03T23:59:59+08:00';

export function gameClosesAt(): Date {
  const raw = process.env.GAME_CLOSES_AT ?? DEFAULT_CLOSES_AT;
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
