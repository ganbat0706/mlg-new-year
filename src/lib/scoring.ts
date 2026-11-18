export type Rankable = {
  id: string;
  bestScore: number;
  bestFinishedAt: Date | null;
};

export function totalScore(quiz: number, reaction: number): number {
  const q = Number.isFinite(quiz) ? Math.max(0, quiz) : 0;
  const r = Number.isFinite(reaction) ? Math.max(0, reaction) : 0;
  return Math.round(q + r);
}

/** Өндөр оноо эхэнд; тэнцвэл эрт дуусгасан нь дээгүүр; дуусгаагүй нь доор. */
export function compareForRank(a: Rankable, b: Rankable): number {
  if (a.bestScore !== b.bestScore) return b.bestScore - a.bestScore;

  const at = a.bestFinishedAt?.getTime() ?? Number.POSITIVE_INFINITY;
  const bt = b.bestFinishedAt?.getTime() ?? Number.POSITIVE_INFINITY;
  if (at !== bt) return at - bt;

  return a.id.localeCompare(b.id);
}

export function rankAll<T extends Rankable>(
  rows: readonly T[],
): Array<T & { rank: number }> {
  return [...rows]
    .sort(compareForRank)
    .map((row, i) => ({ ...row, rank: i + 1 }));
}

export function rankOf(rows: readonly Rankable[], id: string): number | null {
  const found = rankAll(rows).find((r) => r.id === id);
  return found ? found.rank : null;
}
