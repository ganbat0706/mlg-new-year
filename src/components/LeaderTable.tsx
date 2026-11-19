type Row = {
  rank: number;
  lastName: string;
  firstName: string;
  bestScore: number;
  isPrize: boolean;
};

/**
 * Монгол уламжлалаар жагсаалтад нэрийг «Овгийн эхний үсэг. Нэр» хэлбэрээр
 * харуулна — жишээ нь «Ц. Отгонбаяр». `lastName` хоосон бол (ер нь тохиолдохгүй
 * ч) цоохор ". Нэр" гарахаас сэргийлж зөвхөн нэрийг үлдээнэ.
 */
function displayName(lastName: string, firstName: string): string {
  const initial = lastName.trim().charAt(0);
  return initial ? `${initial}. ${firstName}` : firstName;
}

export function LeaderTable({
  rows, highlightRank,
}: { rows: Row[]; highlightRank?: number | null }) {
  if (rows.length === 0) {
    return <p className="sheet py-8 text-center text-[#6B6568]">Одоогоор оролцогч алга.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#DAD5CC] bg-[#FAF7F0] text-[#221E20]">
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
                <td className="truncate px-3 py-2.5">{displayName(r.lastName, r.firstName)}</td>
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
