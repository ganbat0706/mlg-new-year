import { STACK, PLAY } from '../config';
import { mulberry32 } from '../rng';
import type { GameResult } from './types';

export type StackLevel = {
  /** 1-ээс эхэлсэн түвшний дугаар. */
  level: number;
  periodMs: number;
  /** t=0 үеийн долгионы фаз (мс) — эхлэх тал/байрлалыг тодорхойлно. */
  startPhase: number;
  /** Эхний хөдөлгөөний чиглэл: +1 эсвэл -1. */
  direction: 1 | -1;
};

export type StackEvent = { level: number; t: number };

/**
 * stack-ийн тусдаа санамсаргүй урсгал (sort/memo-оос ялгаатай тогтмол,
 * нэг seed-ээс гурван үл хамаарах хуваарь гаргахын тулд).
 */
const STACK_SEED_XOR = 0x85ebca6b;

/** seed → STACK.LEVELS ширхэг түвшин, тус бүрийн период/фаз/чиглэл. */
export function generateStackSchedule(seed: number): StackLevel[] {
  const rng = mulberry32(seed ^ STACK_SEED_XOR);
  const levels: StackLevel[] = [];
  for (let level = 1; level <= STACK.LEVELS; level++) {
    const periodMs = STACK.BASE_PERIOD_MS - STACK.PERIOD_STEP_MS * level;
    const direction: 1 | -1 = rng() < 0.5 ? 1 : -1;
    const startPhase = rng() * periodMs;
    levels.push({ level, periodMs, startPhase, direction });
  }
  return levels;
}

/**
 * Краны байрлал (10..90 хувь) — цагийн цэвэр функц, гурвалжин долгион.
 * Browser зурахдаа, сервер шалгахдаа яг ижил функцийг дуудна — хоёр
 * тусдаа хэрэгжилт байвал тоглоом шударга бус болно.
 */
export function cranePosition(level: StackLevel, elapsedMs: number): number {
  const { periodMs, startPhase, direction } = level;
  const half = periodMs / 2;
  let m = (startPhase + direction * elapsedMs) % periodMs;
  if (m < 0) m += periodMs;
  return m <= half ? 10 + (80 * m) / half : 10 + (80 * (periodMs - m)) / half;
}

/** Хуваарийн дагуу бүх түвшинг яг төвд нь буулгавал гарах дээд оноо. */
export function maxStackScore(schedule: readonly StackLevel[]): number {
  return schedule.length * (STACK.BASE_POINTS + STACK.PRECISION_POINTS);
}

/**
 * Browser-ээс ирсэн буулгалтуудыг дахин тоглож оноо тооцно.
 * Түвшин 1 t=0-д нээгдэнэ; n+1 нь өмнөх түвшний үйлдлийн t + DROP_MS-д.
 * Дараалалгүй, эрт ирсэн, цаг буурсан эсвэл хэт ойрхон (MIN_EVENT_GAP_MS-
 * ээс бага зайтай) үйлдлийг татгалзана (score-гүй).
 */
export function scoreStack(
  schedule: readonly StackLevel[],
  events: readonly StackEvent[],
): GameResult {
  const byLevel = new Map(schedule.map((lvl) => [lvl.level, lvl]));

  let nextLevel = 1;
  let openAt = 0;
  let centre = 50;
  let prevT: number | null = null;
  let score = 0;
  let accepted = 0;
  let rejected = 0;
  let suspicious = false;

  for (const ev of events) {
    if (!ev || !Number.isInteger(ev.level) || !Number.isFinite(ev.t) || ev.t < 0) {
      rejected++;
      continue;
    }
    if (ev.level !== nextLevel) {
      rejected++;
      continue;
    }
    if (ev.t < openAt) {
      rejected++;
      continue;
    }
    if (prevT !== null && !(ev.t > prevT)) {
      rejected++;
      continue;
    }
    // Хамгаалалтын давхар давхарга: openAt = prevT + STACK.DROP_MS (500мс) учир
    // "эрт ирсэн" шалгалт дээрх ev.t < openAt аль хэдийн 500мс-ийн зайг
    // баталгаажуулдаг тул энэ нь одоогийн тохиргоогоор хэзээ ч өдөөгдөхгүй —
    // гэвч DROP_MS ирээдүйд MIN_EVENT_GAP_MS-ээс бага болвол хамгаална.
    if (prevT !== null && ev.t - prevT < PLAY.MIN_EVENT_GAP_MS) {
      rejected++;
      suspicious = true;
      continue;
    }

    const lvl = byLevel.get(ev.level);
    if (!lvl) {
      rejected++;
      continue;
    }

    const pos = cranePosition(lvl, ev.t - openAt);
    const offset = pos - centre;

    if (Math.abs(offset) <= STACK.TOLERANCE_PCT) {
      score +=
        STACK.BASE_POINTS +
        Math.round(STACK.PRECISION_POINTS * (1 - Math.abs(offset) / STACK.TOLERANCE_PCT));
      centre = pos;
    }
    // Эс бөгөөс унасан: 0 оноо, centre өөрчлөгдөхгүй.

    accepted++;
    prevT = ev.t;
    nextLevel++;
    openAt = ev.t + STACK.DROP_MS;
  }

  return { score: Math.max(0, score), accepted, rejected, suspicious };
}
