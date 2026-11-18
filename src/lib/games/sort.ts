import { SORT, PLAY } from '../config';
import { mulberry32 } from '../rng';
import type { GameResult } from './types';

export type SortMode = 'rail' | 'road' | 'air';
export type SortLane = SortMode | 'return';

export type SortItem = {
  id: number;
  mode: SortMode;
  /** Эвдэрсэн эсэх — эвдэрсэн бол «Буцаах» руу явах ёстой. */
  damaged: boolean;
};

export type SortEvent = { id: number; lane: SortLane; t: number };

const MODES: readonly SortMode[] = ['rail', 'road', 'air'];

/**
 * sort-ийн тусдаа санамсаргүй урсгал. Нэг seed-ээс sort/stack/memo гурав
 * өөр хуваарь гаргахын тулд ижил seed-ийг өөр өөр тогтмолоор XOR хийнэ.
 */
const SORT_SEED_XOR = 0x9e3779b9;

/** seed → SORT.ITEM_COUNT ширхэг контейнер, SORT.DAMAGED_RATIO нь эвдэрсэн. */
export function generateSortSchedule(seed: number): SortItem[] {
  const rng = mulberry32(seed ^ SORT_SEED_XOR);
  const items: SortItem[] = [];
  for (let id = 0; id < SORT.ITEM_COUNT; id++) {
    const mode = MODES[Math.floor(rng() * MODES.length)];
    const damaged = rng() < SORT.DAMAGED_RATIO;
    items.push({ id, mode, damaged });
  }
  return items;
}

/** Хуваарийн дагуу бүгдийг зөв дарвал гарах дээд оноо. */
export function maxSortScore(schedule: readonly SortItem[]): number {
  return schedule.length * SORT.CORRECT_POINTS;
}

/**
 * Browser-ээс ирсэн үйлдлүүдийг хуваарийн эсрэг дахин тоглож оноо тооцно.
 * Үйлдэл бүрийг дараах шалгуураар татгалзана (score-гүй):
 *  - id нь дараагийн хүлээгдэж буй (0,1,2…) биш бол
 *  - t өмнөхөөсөө чанд их биш бол (сөрөг/давтагдсан t-ийг хамарна)
 *  - t нь SORT.DURATION_MS + PLAY.GRACE_MS-ээс хэтэрвэл
 *  - өмнөх зөвшөөрөгдсөн үйлдлээс хойших зай PLAY.MIN_EVENT_GAP_MS-ээс бага бол
 *      (энэ тохиолдолд suspicious=true болно)
 * Оноог үйлдэл бүрт биш, ЭЦЭСТ НЬ нэг л удаа 0-д clamp хийнэ.
 */
export function scoreSort(
  schedule: readonly SortItem[],
  events: readonly SortEvent[],
): GameResult {
  const byId = new Map(schedule.map((item) => [item.id, item]));
  const latestAllowed = SORT.DURATION_MS + PLAY.GRACE_MS;

  let nextExpectedId = 0;
  let prevT: number | null = null;
  let score = 0;
  let accepted = 0;
  let rejected = 0;
  let suspicious = false;

  for (const ev of events) {
    if (
      !ev ||
      !Number.isInteger(ev.id) ||
      !Number.isFinite(ev.t) ||
      ev.t < 0
    ) {
      rejected++;
      continue;
    }
    if (ev.id !== nextExpectedId) {
      rejected++;
      continue;
    }
    if (prevT !== null && !(ev.t > prevT)) {
      rejected++;
      continue;
    }
    if (ev.t > latestAllowed) {
      rejected++;
      continue;
    }
    if (prevT !== null && ev.t - prevT < PLAY.MIN_EVENT_GAP_MS) {
      rejected++;
      suspicious = true;
      continue;
    }

    const item = byId.get(ev.id);
    if (!item) {
      // ITEM_COUNT-аас гадуурх id — nextExpectedId хэзээ ч үүнтэй тэнцэхгүй
      // тул энд хүрэхгүй, гэхдээ аюулгүйн үүднээс хамгаална.
      rejected++;
      continue;
    }

    nextExpectedId++;
    prevT = ev.t;
    accepted++;

    const expectedLane: SortLane = item.damaged ? 'return' : item.mode;
    score += ev.lane === expectedLane ? SORT.CORRECT_POINTS : SORT.WRONG_POINTS;
  }

  return { score: Math.max(0, score), accepted, rejected, suspicious };
}
