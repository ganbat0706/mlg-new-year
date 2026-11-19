/**
 * Нүүр хуудасны өвлийн дүр зураг — логоноос eyebrow хүртэлх хоосон зайд.
 *
 * ЦАС ЭНД БАЙХГҮЙ: хуудас бүхэлдээ цастай болсон (Sky компонент) тул энд
 * дахин цас цацвал хоёр өөр хурдтай цас давхарлаж, бохир харагдана.
 * Энэ дүр зураг одоо шөнийн өнгөтэй — машин харанхуй тэнгэр дээр
 * алдагдахгүйн тулд хүйтэн (frost) тоймтой, урдаа гэрлийн багананд.
 */
/** Зогсоолын контейнер — дүүргэсэн, хүйтэн тоймтой, дээрээ цастай. */
function Container({ x, y, fill }: { x: number; y: number; fill: string }) {
  return (
    <g>
      <rect x={x} y={y} width="40" height="20" rx="2" fill={fill} stroke="#C9D6E6" strokeWidth="1" />
      <rect x={x} y={y - 2} width="40" height="2" fill="#C9D6E6" opacity="0.8" />
    </g>
  );
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
        aria-label="Шөнийн ачааны буудал"
      >
        {/* Цасан довжоо — хаягийн шугамын оронд */}
        <rect x="0" y="96" width="390" height="24" fill="#E6EDF5" />

        {/* Зүүн тал — 3 контейнерийн тойм, 2+1 өрөлттэй */}
        <g>
          <Container x={20} y={74} fill="#E8B931" />
          <Container x={64} y={74} fill="#ED1C24" />
          <Container x={42} y={52} fill="#2A3350" />
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
            {/* урд гэрлийн багана — статик, бүдэг */}
            <polygon points="4,44 -60,30 -60,58" fill="#FFF1C9" opacity="0.22" />
            {/* бүхээг */}
            <rect x="4" y="30" width="38" height="34" rx="3" fill="#221E20" stroke="#C9D6E6" strokeWidth="1" />
            {/* контейнер */}
            <rect x="46" y="20" width="86" height="44" rx="3" fill="#ED1C24" stroke="#C9D6E6" strokeWidth="1" />
            <rect x="46" y="18" width="86" height="2" fill="#C9D6E6" opacity="0.85" />
            <rect x="68" y="20" width="4" height="44" fill="#FAF7F0" opacity="0.35" />
            <rect x="86" y="20" width="4" height="44" fill="#FAF7F0" opacity="0.35" />
            <rect x="104" y="20" width="4" height="44" fill="#FAF7F0" opacity="0.35" />
          </g>
        </g>

      </svg>
    </div>
  );
}
