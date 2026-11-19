import { DROP, PLAY } from '../config';
import { mulberry32 } from '../rng';
import type { GameResult } from './types';

/** Нэг нислэг — онгоцны хөдөлгөөнийг бүрэн тодорхойлно. */
export type DropPass = {
  /** 1-ээс эхэлсэн буулгалтын дугаар. */
  index: number;
  periodMs: number;
  /** t=0 үеийн долгионы фаз (мс). */
  startPhase: number;
  /** Эхний хөдөлгөөний чиглэл: +1 эсвэл -1. */
  direction: 1 | -1;
};

export type DropSchedule = {
  passes: DropPass[];
  /** Багана бүрийн контейнерийн тоо (1..3). Нийлбэр нь үргэлж DROP.DROPS. */
  wall: number[];
};

export type DropEvent = { index: number; t: number };

/**
 * drop-ийн тусдаа санамсаргүй урсгал. sort (0x9E3779B9), stack (0x85EBCA6B),
 * memo (0xC2B2AE35)-аас ялгаатай тогтмол — нэг seed-ээс дөрвөн үл хамаарах
 * хуваарь гаргахын тулд.
 */
const DROP_SEED_XOR = 0x27d4eb2f;

/** Онгоц нисэх хэвтээ зурвас (хувиар). Ханын өргөнтэй яг таарна. */
const X_MIN = 5;
const X_MAX = 95;
const X_SPAN = X_MAX - X_MIN;

/**
 * Хана — багана бүрт 1..3 контейнер, нийлбэр нь ЯГ DROP.DROPS.
 *
 * Бүгдийг 2-оор эхлүүлээд (6 багана × 2 = 12) санамсаргүй хосыг сонгож
 * нэгээс нь нэмж нөгөөгөөс нь хасна — нийлбэр хадгалагдаж, өндөр нь
 * 1..3 хооронд үлдэнэ. Ингэснээр хана тэгш биш, сонирхолтой болох
 * хэрнээ «12 буулгалт = 12 контейнер» гэсэн тэнцвэр эвдэрэхгүй.
 */
function generateWall(rng: () => number): number[] {
  const base = Math.floor(DROP.DROPS / DROP.COLS);
  const wall = new Array<number>(DROP.COLS).fill(base);
  let remainder = DROP.DROPS - base * DROP.COLS;
  for (let i = 0; remainder > 0; i = (i + 1) % DROP.COLS) {
    wall[i] += 1;
    remainder -= 1;
  }

  for (let n = 0; n < DROP.COLS * 2; n++) {
    const a = Math.floor(rng() * DROP.COLS);
    const b = Math.floor(rng() * DROP.COLS);
    if (a === b) continue;
    if (wall[a] < 3 && wall[b] > 1) {
      wall[a] += 1;
      wall[b] -= 1;
    }
  }
  return wall;
}

/** seed → DROP.DROPS ширхэг нислэг + ханын хэлбэр. */
export function generateDropSchedule(seed: number): DropSchedule {
  const rng = mulberry32(seed ^ DROP_SEED_XOR);
  const passes: DropPass[] = [];
  for (let index = 1; index <= DROP.DROPS; index++) {
    const periodMs = DROP.BASE_PERIOD_MS - DROP.PERIOD_STEP_MS * index;
    const direction: 1 | -1 = rng() < 0.5 ? 1 : -1;
    const startPhase = rng() * periodMs;
    passes.push({ index, periodMs, startPhase, direction });
  }
  return { passes, wall: generateWall(rng) };
}

/**
 * Онгоцны байрлал (5..95 хувь) — цагийн ЦЭВЭР функц, гурвалжин долгион.
 * Browser зурахдаа, сервер шалгахдаа яг ижил функцийг дуудна; хоёр тусдаа
 * хэрэгжилт байвал тоглоом шударга бус болно (cranePosition-тэй ижил дүрэм).
 */
export function planePosition(pass: DropPass, elapsedMs: number): number {
  const { periodMs, startPhase, direction } = pass;
  const half = periodMs / 2;
  let m = (startPhase + direction * elapsedMs) % periodMs;
  if (m < 0) m += periodMs;
  return m <= half
    ? X_MIN + (X_SPAN * m) / half
    : X_MIN + (X_SPAN * (periodMs - m)) / half;
}

/** Хэвтээ байрлал (5..95) → ханын баганын индекс (0..COLS-1). */
export function columnAt(x: number): number {
  const ratio = (x - X_MIN) / X_SPAN;
  const col = Math.floor(ratio * DROP.COLS);
  return Math.min(DROP.COLS - 1, Math.max(0, col));
}

/** Бүх буулгалт контейнер онсон үеийн дээд оноо. */
export function maxDropScore(schedule: DropSchedule): number {
  const standing = schedule.wall.reduce((a, b) => a + b, 0);
  return Math.min(schedule.passes.length, standing) * DROP.HIT_POINTS;
}

/**
 * Browser-ээс ирсэн буулгалтуудыг дахин тоглож оноо тооцно.
 *
 * Нислэг 1 t=0-д нээгдэнэ; n+1 нь өмнөх үйлдлийн t + FALL_MS-д (ачаа унаж
 * дуустал дахин буулгаж болохгүй). Дараалалгүй, эрт ирсэн, цаг буураагүй
 * эсвэл хэт ойрхон үйлдлийг татгалзана.
 *
 * Онолт: тухайн мөчийн онгоцны байрлал дахь БАГАНА хоосон биш бол хамгийн
 * дээд контейнер нурж +HIT_POINTS. Хоосон багана дээр буулгавал 0 — алдаа
 * нь зөвхөн боломжоо алдах, сөрөг оноо байхгүй.
 */
export function scoreDrop(
  schedule: DropSchedule,
  events: readonly DropEvent[],
): GameResult {
  const byIndex = new Map(schedule.passes.map((p) => [p.index, p]));
  const wall = [...schedule.wall];

  let nextIndex = 1;
  let openAt = 0;
  let prevT: number | null = null;
  let score = 0;
  let accepted = 0;
  let rejected = 0;
  let suspicious = false;

  for (const ev of events) {
    if (!ev || !Number.isInteger(ev.index) || !Number.isFinite(ev.t) || ev.t < 0) {
      rejected++;
      continue;
    }
    if (ev.index !== nextIndex) {
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
    if (prevT !== null && ev.t - prevT < PLAY.MIN_EVENT_GAP_MS) {
      rejected++;
      suspicious = true;
      continue;
    }

    const pass = byIndex.get(ev.index);
    if (!pass) {
      rejected++;
      continue;
    }

    const col = columnAt(planePosition(pass, ev.t - openAt));
    if (wall[col] > 0) {
      wall[col] -= 1;
      score += DROP.HIT_POINTS;
    }

    accepted++;
    prevT = ev.t;
    nextIndex++;
    openAt = ev.t + DROP.FALL_MS;
  }

  return { score: Math.max(0, score), accepted, rejected, suspicious };
}
