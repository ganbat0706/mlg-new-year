export type Rankable = {
  id: string;
  bestScore: number;
  bestFinishedAt: Date | null;
};

/**
 * Нийт оноо — ямар ч тооны бүрэлдэхүүн хэсгийг (sort, stack, memo гэх мэт)
 * хүлээн авна. Бүрэлдэхүүн бүрийг ХУВИ ХУВЬД нь 0-ээс доош үгүй болгож (clamp),
 * дараа нь нэмж, эцэст нь нэг л удаа бүхэлд нь тойрог (round) хийнэ.
 */
export function totalScore(...scores: number[]): number {
  const sum = scores.reduce(
    (acc, s) => acc + (Number.isFinite(s) ? Math.max(0, s) : 0),
    0,
  );
  return Math.round(sum);
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
