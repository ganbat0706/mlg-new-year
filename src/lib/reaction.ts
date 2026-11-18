import { REACTION } from './config';
import { mulberry32 } from './rng';

export type SpawnKind = 'good' | 'bad';

export type SpawnItem = {
  id: number;
  /** Тоглоом эхэлснээс хойших миллисекунд. */
  t: number;
  /** Талбайн өргөний хувь (0-100). */
  x: number;
  /** Талбайн өндрийн хувь (0-100). */
  y: number;
  kind: SpawnKind;
};

export type Tap = { id: number; t: number };

export type TapResult = {
  score: number;
  hits: number;
  misses: number;
  rejected: number;
};

export function generateSpawnSchedule(seed: number): SpawnItem[] {
  const rng = mulberry32(seed);
  const items: SpawnItem[] = [];
  const last = REACTION.DURATION_MS - REACTION.OBJECT_LIFETIME_MS;

  let id = 0;
  for (let t = 0; t <= last; t += REACTION.SPAWN_INTERVAL_MS) {
    // Байрлалыг ирмэгээс 8% дотогш байлгаж, товшилтын талбайг бүтэн үлдээнэ.
    const x = 8 + rng() * 84;
    const y = 8 + rng() * 84;
    const kind: SpawnKind = rng() < REACTION.BAD_RATIO ? 'bad' : 'good';
    items.push({ id: id++, t, x: round1(x), y: round1(y), kind });
  }
  return items;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function maxReactionScore(schedule: readonly SpawnItem[]): number {
  return schedule.filter((i) => i.kind === 'good').length * REACTION.GOOD_POINTS;
}

export function scoreTaps(
  schedule: readonly SpawnItem[],
  taps: readonly Tap[],
): TapResult {
  const byId = new Map(schedule.map((i) => [i.id, i]));
  const seen = new Set<number>();
  const latestAllowed = REACTION.DURATION_MS + REACTION.GRACE_MS;

  let score = 0;
  let hits = 0;
  let misses = 0;
  let rejected = 0;

  for (const tap of taps) {
    if (!Number.isFinite(tap?.t) || !Number.isInteger(tap?.id)) { rejected++; continue; }
    if (tap.t < 0 || tap.t > latestAllowed) { rejected++; continue; }

    const item = byId.get(tap.id);
    if (!item) { rejected++; continue; }
    if (seen.has(tap.id)) { rejected++; continue; }

    const opensAt = item.t;
    const closesAt = item.t + REACTION.OBJECT_LIFETIME_MS + REACTION.GRACE_MS;
    if (tap.t < opensAt || tap.t > closesAt) { rejected++; continue; }

    seen.add(tap.id);
    if (item.kind === 'good') {
      score += REACTION.GOOD_POINTS;
      hits++;
    } else {
      score += REACTION.BAD_POINTS;
      misses++;
    }
  }

  return { score: Math.max(0, score), hits, misses, rejected };
}
