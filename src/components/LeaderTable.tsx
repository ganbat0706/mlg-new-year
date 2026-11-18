type Row = {
  rank: number;
  lastName: string;
  firstName: string;
  bestScore: number;
  isPrize: boolean;
};

export function LeaderTable({
  rows, highlightRank,
}: { rows: Row[]; highlightRank?: number | null }) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-[#6B6568]">Одоогоор оролцогч алга.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#DAD5CC]">
      <table className="w-full table-fixed border-collapse text-base">
        <caption className="sr-only">Оноогоор эрэмбэлсэн жагсаалт</caption>
        <thead>
          <tr className="bg-[#221E20] text-left text-sm text-[#FAF7F0]">
            <th scope="col" className="w-14 px-3 py-2.5 font-semibold">Байр</th>
            <th scope="col" className="px-3 py-2.5 font-semibold">Ажилтан</th>
            <th scope="col" className="w-20 px-3 py-2.5 text-right font-semibold">Оноо</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const mine = highlightRank === r.rank;
            return (
              <tr
                key={r.rank}
                className={`border-t border-[#E3DED2] ${
                  mine ? 'bg-[#FDECEC] font-semibold' : r.isPrize ? 'bg-[#FFF8E8]' : ''
                }`}
              >
                <td className="truncate px-3 py-2.5 tabular-nums">
                  {r.rank}
                  {r.isPrize && (
                    <span className="ml-1.5 text-sm text-[#C21019]" title="Шагналтай байр">★</span>
                  )}
                </td>
                <td className="truncate px-3 py-2.5">{r.lastName} {r.firstName}</td>
                <td className="truncate px-3 py-2.5 text-right tabular-nums">
                  {r.bestScore.toLocaleString('mn-MN')}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
