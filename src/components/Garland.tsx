/**
 * Гантрейн төмөр замаас унжсан гэрлэн чимэглэл. Урсгал (flow) дотор сууна —
 * тогтмол (fixed) БИШ: гүйлгэхэд дээшээ алга болно, тоглогчийн дарах юмыг
 * хэзээ ч халхлахгүй. Тоглоом явж байхад анивчилт зогсоно (globals.css).
 */
const BULBS: { x: number; y: number; c: string }[] = [
  { x: 16, y: 9, c: '#ED1C24' },
  { x: 48, y: 16, c: '#E8B931' },
  { x: 80, y: 9, c: '#FFF1C9' },
  { x: 113, y: 9, c: '#C9D6E6' },
  { x: 146, y: 16, c: '#ED1C24' },
  { x: 178, y: 9, c: '#E8B931' },
  { x: 211, y: 9, c: '#FFF1C9' },
  { x: 243, y: 16, c: '#C9D6E6' },
  { x: 275, y: 9, c: '#ED1C24' },
  { x: 308, y: 9, c: '#E8B931' },
  { x: 341, y: 16, c: '#FFF1C9' },
  { x: 373, y: 9, c: '#C9D6E6' },
];

export function Garland() {
  return (
    <svg className="garland" viewBox="0 0 390 32" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M0 3 Q48 30 97 3 T195 3 T292 3 T390 3"
        fill="none" stroke="#2A3350" strokeWidth={1.5}
      />
      {BULBS.map((b, i) => (
        <g key={b.x}>
          <line x1={b.x} y1={b.y - 6} x2={b.x} y2={b.y - 2} stroke="#2A3350" strokeWidth={2} />
          {/* гэрлийн туяа — статик тойрог. filter: drop-shadow ашиглавал
              хямд утсан дээр бүх хүрээг дахин зурдаг тул зориуд тойрог. */}
          <circle cx={b.x} cy={b.y} r={7} fill={b.c} opacity={0.18} />
          <circle
            className="bulb"
            cx={b.x} cy={b.y} r={3.5}
            fill={b.c}
            stroke="rgba(255,255,255,.35)" strokeWidth={1}
            style={{ animationDelay: `${-(i * 0.37).toFixed(2)}s`, animationDuration: i % 2 ? '2.9s' : '2.4s' }}
          />
        </g>
      ))}
    </svg>
  );
}
