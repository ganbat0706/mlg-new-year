/**
 * Нүүр хуудасны өвлийн дүр зураг — логоноос eyebrow хүртэлх хоосон зайд.
 * Цас ЗӨВХӨН энд, тус дүр зургийн дотор (`overflow-hidden`) — бусад хуудсанд
 * цас цацахгүй (п.1, урлагийн чиглэл баримт).
 */
type Flake = { cx: number; r: number; variant: 1 | 2 | 3; duration: number; delayFrac: number };

const FLAKES: Flake[] = [
  { cx: 18, r: 3, variant: 1, duration: 8, delayFrac: 0.1 },
  { cx: 46, r: 2, variant: 2, duration: 10, delayFrac: 0.4 },
  { cx: 74, r: 4, variant: 3, duration: 9, delayFrac: 0.7 },
  { cx: 102, r: 2.5, variant: 1, duration: 11, delayFrac: 0.2 },
  { cx: 136, r: 3.5, variant: 2, duration: 7, delayFrac: 0.6 },
  { cx: 164, r: 2, variant: 3, duration: 9.5, delayFrac: 0.9 },
  { cx: 198, r: 3, variant: 1, duration: 10.5, delayFrac: 0.3 },
  { cx: 226, r: 4, variant: 2, duration: 8.5, delayFrac: 0.8 },
  { cx: 254, r: 2.5, variant: 3, duration: 7.5, delayFrac: 0.5 },
  { cx: 288, r: 3, variant: 1, duration: 10, delayFrac: 0.15 },
  { cx: 322, r: 2, variant: 2, duration: 9, delayFrac: 0.65 },
  { cx: 362, r: 3.5, variant: 3, duration: 11, delayFrac: 0.35 },
];

function ContainerOutline({ x, y, stroke }: { x: number; y: number; stroke: string }) {
  return <rect x={x} y={y} width="40" height="20" rx="2" fill="none" stroke={stroke} strokeWidth="2" />;
}

export function WinterScene() {
  return (
    <div className="relative w-full overflow-hidden" style={{ aspectRatio: '390 / 120' }}>
      <svg
        viewBox="0 0 390 120"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMax slice"
        role="img"
        aria-label="Өвлийн ачааны буудал, цас орж байна"
      >
        {/* Тэнгэрийн хаяа */}
        <line x1="0" y1="96" x2="390" y2="96" stroke="#DAD5CC" strokeWidth="2" />

        {/* Зүүн тал — 3 контейнерийн тойм, 2+1 өрөлттэй */}
        <g>
          <ContainerOutline x={20} y={72} stroke="#E8B931" />
          <ContainerOutline x={64} y={72} stroke="#ED1C24" />
          <ContainerOutline x={42} y={50} stroke="#221E20" />
        </g>

        {/* Ачааны машин — голоос баруун тийш. Дотоод <g> нь орох хөдөлгөөнийг
            (translateX −40→0) даана, гадна <g> нь байрлалыг (attribute
            transform) барина — CSS transform attribute transform-ийг бус,
            орлуулдаг тул давхарлаж байрлуулна. */}
        <g transform="translate(200,40)">
          <g className="hero-truck-in">
            {/* дугуй */}
            <circle cx="40" cy="76" r="10" fill="#221E20" />
            <circle cx="40" cy="76" r="3" fill="#C9D6E6" />
            <circle cx="118" cy="76" r="10" fill="#221E20" />
            <circle cx="118" cy="76" r="3" fill="#C9D6E6" />
            {/* бүхээг */}
            <rect x="4" y="30" width="38" height="34" rx="3" fill="#221E20" />
            {/* контейнер */}
            <rect x="46" y="20" width="86" height="44" rx="3" fill="#ED1C24" />
            <rect x="68" y="20" width="4" height="44" fill="#FAF7F0" opacity="0.35" />
            <rect x="86" y="20" width="4" height="44" fill="#FAF7F0" opacity="0.35" />
            <rect x="104" y="20" width="4" height="44" fill="#FAF7F0" opacity="0.35" />
          </g>
        </g>

        {/* Цас — зөвхөн энэ дүр зургийн дотор */}
        <g>
          {FLAKES.map((f, i) => (
            <circle
              key={i}
              className={`snowflake snow-v${f.variant}`}
              cx={f.cx}
              cy="0"
              r={f.r}
              fill="#C9D6E6"
              style={{
                animationDuration: `${f.duration}s`,
                animationDelay: `-${f.duration * f.delayFrac}s`,
              }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
