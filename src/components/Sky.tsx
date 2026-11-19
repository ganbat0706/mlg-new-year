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
      <div className="snow-sway">
        <div className="snow snow-far" />
        <div className="snow snow-near" />
      </div>

      <svg className="yard" viewBox="0 0 390 72" preserveAspectRatio="xMidYMax slice">
        {/* газар ба цасан шугам */}
        <rect x={0} y={60} width={390} height={12} fill={BOX} />
        <rect x={0} y={58} width={390} height={2} fill="#C9D6E6" opacity={0.55} />
        {/* төмөр замын дэр */}
        <line x1={0} y1={66} x2={390} y2={66} stroke={EDGE} strokeWidth={1} strokeDasharray="6 10" />

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
    </div>
  );
}
