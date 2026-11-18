import { MEMO, PLAY } from '../config';
import { mulberry32, shuffle } from '../rng';
import type { GameResult } from './types';

export type MemoEvent = { card: number; t: number };

/**
 * memo-ийн тусдаа санамсаргүй урсгал (sort/stack-аас ялгаатай тогтмол,
 * нэг seed-ээс гурван үл хамаарах хуваарь гаргахын тулд).
 */
const MEMO_SEED_XOR = 0xc2b2ae35;

/** seed → MEMO.PAIRS*2 нүднийх холисон хос id (0,0,1,1,…,холисон). */
export function generateMemoSchedule(seed: number): number[] {
  const rng = mulberry32(seed ^ MEMO_SEED_XOR);
  const pairs: number[] = [];
  for (let p = 0; p < MEMO.PAIRS; p++) pairs.push(p, p);
  return shuffle(pairs, rng);
}

/** Хуваарийн дагуу хамгийн хурдан (бонус дээдтэй) дуусгавал гарах дээд оноо. */
export function maxMemoScore(schedule: readonly number[]): number {
  const pairs = schedule.length / 2;
  return pairs * MEMO.PAIR_POINTS + MEMO.BONUS_MAX;
}

/**
 * Browser-д ажилладагтай ЯГ ИЖИЛ төлөвийн машиныг дахин тоглуулж оноо
 * тооцно.
 *
 * Аль хэдийн нээлттэй/тохирсон хөзөр дээрх даралт, эсвэл буруу хос
 * тохирсны дараах MEMO.LOCK_MS түгжээний доторх ЯМАР Ч даралт —
 * ТАТГАЛЗАХГҮЙ, зүгээр л АЛГАСНА (төлөв хэвээрээ, тоологдохгүй): client
 * мөн адил эдгээрийг хэзээ ч бодитоор боловсруулдаггүй тул энд
 * татгалзвал client/server төлөв зөрнө.
 *
 * Бусад (мэдэгдэхүйц) даралтыг дараах шалгуураар татгалзана:
 *  - card нь [0, нүдний тоо) мужаас гадуур эсвэл бүхэл тоо биш
 *  - t өмнөх ЖИНХЭНЭ (алгасаагүй) даралтаас чанд их биш
 *  - t-ийн зай PLAY.MIN_EVENT_GAP_MS-ээс бага (suspicious=true болно)
 */
export function scoreMemo(
  schedule: readonly number[],
  events: readonly MemoEvent[],
): GameResult & { perfect: boolean } {
  const cardCount = schedule.length;
  const totalPairs = cardCount / 2;

  const matched = new Set<number>();
  let openCard: number | null = null;
  let lockUntil = 0;
  let prevT: number | null = null;
  let pairsFound = 0;
  let mismatchHappened = false;
  let finishedAt: number | null = null;

  let score = 0;
  let accepted = 0;
  let rejected = 0;
  let suspicious = false;

  for (const ev of events) {
    if (
      !ev ||
      !Number.isInteger(ev.card) ||
      ev.card < 0 ||
      ev.card >= cardCount ||
      !Number.isFinite(ev.t) ||
      ev.t < 0
    ) {
      rejected++;
      continue;
    }

    // Төлөв өөрчлөгдөхгүй тохиолдлууд — зүгээр л алгасна.
    if (ev.t < lockUntil) continue;
    if (matched.has(ev.card) || ev.card === openCard) continue;

    // Эндээс цаашид жинхэнэ (шинэ хөзөр нээх) даралт.
    if (prevT !== null && !(ev.t > prevT)) {
      rejected++;
      continue;
    }
    if (prevT !== null && ev.t - prevT < PLAY.MIN_EVENT_GAP_MS) {
      rejected++;
      suspicious = true;
      continue;
    }

    prevT = ev.t;
    accepted++;

    if (openCard === null) {
      openCard = ev.card;
      continue;
    }

    const first = openCard;
    openCard = null;

    if (schedule[first] === schedule[ev.card]) {
      matched.add(first);
      matched.add(ev.card);
      pairsFound++;
      score += MEMO.PAIR_POINTS;
      if (pairsFound === totalPairs) finishedAt = ev.t;
    } else {
      mismatchHappened = true;
      lockUntil = ev.t + MEMO.LOCK_MS;
    }
  }

  let perfect = false;
  if (finishedAt !== null) {
    const rawBonus = Math.floor((MEMO.DURATION_MS - finishedAt) / 1000) * MEMO.BONUS_PER_SEC;
    score += Math.min(MEMO.BONUS_MAX, Math.max(0, rawBonus));
    perfect = !mismatchHappened;
  }

  return { score: Math.max(0, score), accepted, rejected, suspicious, perfect };
}
