/**
 * Шөнийн тэнгэр — хуудас бүрийн ард тогтмол сууна. Серверийн компонент:
 * ямар ч төлөв, ямар ч JS хэрэггүй.
 *
 * Хөдөлгөөнт зангилаа ердөө 3: найгалтын бүрхүүл + цасны хоёр давхарга.
 * Од, зогсоолын дүрс, кран бүгд статик (цэвэр SVG/gradient).
 */
const SNOW_CAP = 'rgba(201,214,230,.8)';
const BOX = '#161C2E';
const EDGE = '#2A3350';

/** Зогсоол дахь контейнерийн овоолго — дээрээ цастай. */
function Stack({ x, y, w = 44, h = 18 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <>
      <rect x={x} y={y} width={w} height={h} fill={BOX} stroke={EDGE} strokeWidth={1} />
      <rect x={x} y={y - 2} width={w} height={2} fill={SNOW_CAP} />
    </>
  );
}

export function Sky() {
  return (
    <div className="sky" aria-hidden="true">
      {/*
        Онгоц — ЦАСНЫ АРД. Хол нисч буй онгоцны урдуур цас унах нь зөв
        гүн өгнө. Биеийн өнгө нь шөнийн цэнхэр, сүүл нь брэндийн улаан —
        бодит лого (хар үсэгтэй PNG) 60px дээр уншигдахгүй тул логоны
        улаан блок + цагаан зурвасыг л үлдээв.
      */}
      <svg className="plane" viewBox="0 0 60 22" width="84" height="31" aria-hidden="true">
        <path d="M45 13 L55 13 L52 16.5 L44 16.5 Z" fill="#2A3350" stroke="#C9D6E6" strokeOpacity=".7" strokeWidth="1" strokeLinejoin="round" />
        <path d="M43 10.5 L48.5 2.5 L55 2.5 L51.5 10.5 Z" fill="#8C1C28" stroke="#C9D6E6" strokeOpacity=".7" strokeWidth="1" strokeLinejoin="round" />
        <path d="M46.6 8.5 L49.6 4 L51.3 4 L48.3 8.5 Z" fill="#FAF7F0" opacity=".95" />
        <path d="M4 13 C4 10.6 7 9.5 11 9.5 L46 9.5 C50 9.5 54.5 11 58 13 C54.5 15 50 16.5 46 16.5 L11 16.5 C7 16.5 4 15.4 4 13 Z" fill="#2A3350" stroke="#C9D6E6" strokeOpacity=".85" strokeWidth="1" strokeLinejoin="round" />
        <rect x="9" y="14" width="38" height="1.2" fill="#8C1C28" />
        <line x1="13" y1="12" x2="42" y2="12" stroke="#FFF1C9" strokeOpacity=".85" strokeWidth="1.2" strokeDasharray="1.2 2.1" />
        <path d="M20 13.5 L34 13.5 L27 20 L16 20 Z" fill="#1B2237" stroke="#C9D6E6" strokeOpacity=".7" strokeWidth="1" strokeLinejoin="round" />
        <rect x="21" y="17" width="8" height="3.2" rx="1.6" fill="#2A3350" stroke="#C9D6E6" strokeOpacity=".7" strokeWidth=".8" />
        <circle cx="57" cy="13" r="1.3" fill="#FFF1C9" />
        <circle className="beacon" cx="30" cy="8.4" r="1.3" fill="#ED1C24" />
      </svg>

      <div className="snow-sway">
        <div className="snow snow-far" />
        <div className="snow snow-near" />
      </div>

      <svg className="yard" viewBox="0 0 390 72" preserveAspectRatio="xMidYMax slice">
        {/* газар ба цасан шугам */}
        <rect x={0} y={60} width={390} height={12} fill={BOX} />
        <rect x={0} y={58} width={390} height={2} fill="#C9D6E6" opacity={0.55} />

        {/* зүүн гар талын овоолго */}
        <Stack x={12} y={40} />
        <Stack x={58} y={40} />
        <Stack x={35} y={22} />
        {/* баруун гар талын овоолго */}
        <Stack x={300} y={40} />
        <Stack x={346} y={40} />
        <Stack x={323} y={22} />

        {/* гантрей кран */}
        <rect x={236} y={18} width={4} height={42} fill={BOX} stroke={EDGE} strokeWidth={0.5} />
        <rect x={282} y={18} width={4} height={42} fill={BOX} stroke={EDGE} strokeWidth={0.5} />
        <rect x={228} y={14} width={66} height={4} fill={BOX} stroke={EDGE} strokeWidth={0.5} />
        <line x1={261} y1={18} x2={261} y2={34} stroke={EDGE} strokeWidth={1.5} />
        <rect x={251} y={34} width={20} height={10} fill={BOX} stroke={EDGE} strokeWidth={1} />
        <circle cx={261} cy={12} r={2.5} fill="#FFF1C9" />
      </svg>

      {/*
        Хоёр зам, хоёр чиглэл. Зам нь статик gradient (зангилаа нэмэхгүй);
        галт тэрэг тус бүр НЭГ div — SVG-ийн дотор transform хийвэл
        Chromium бүхэл SVG-г кадр бүрт дахин зурдаг тул гадна гаргав.
      */}
      <div className="tracks" />
      <div className="train train-west" />
      <div className="train train-east" />
    </div>
  );
}
