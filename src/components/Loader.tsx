'use client';

import { useEffect, useState } from 'react';

/**
 * «Ачаа» ачааны машины loader — inline SVG, 96×36. 80мс саатлын дараа гарч
 * ирнэ (хурдан хариу ирвэл наалдахгүй), 120мс бүдгээр гарна, доод хугацаа
 * байхгүй (`visible` болсон даруйд эх компонент устгаж болно). Бүх хэсэг
 * эхний кадраас мөчлөгийн дунд байх ёстой (сөрөг `animation-delay`) — 300мс
 * харагдсан ч хөдөлж буй машин мэт уншигдана.
 */
function useDelayedMount(delayMs = 80): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);
  return visible;
}

/** Мөчлөгийн дундаас эхлэх сөрөг офсет. */
const MID = '-225ms';

function TruckGlyph({ size = 96 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 96 36"
      width={size}
      height={size * (36 / 96)}
      aria-hidden="true"
      className="loader-truck"
    >
      <line
        x1="0" y1="31" x2="96" y2="31"
        stroke="#DAD5CC" strokeWidth="2" strokeDasharray="8 6"
        className="loader-road"
      />
      <g className="loader-bounce">
        <rect x="22" y="8" width="36" height="18" rx="2" fill="#ED1C24" />
        <line x1="31" y1="8" x2="31" y2="26" stroke="#FAF7F0" strokeWidth="2" opacity="0.35" />
        <line x1="40" y1="8" x2="40" y2="26" stroke="#FAF7F0" strokeWidth="2" opacity="0.35" />
        <line x1="49" y1="8" x2="49" y2="26" stroke="#FAF7F0" strokeWidth="2" opacity="0.35" />
        <rect x="58" y="12" width="16" height="14" rx="2" fill="#221E20" />
        <g className="loader-wheel" style={{ transformOrigin: '30px 28px' }}>
          <circle cx="30" cy="28" r="4" fill="#221E20" />
          <circle cx="30" cy="26.5" r="1.5" fill="#DAD5CC" />
        </g>
        <g className="loader-wheel" style={{ transformOrigin: '62px 28px' }}>
          <circle cx="62" cy="28" r="4" fill="#221E20" />
          <circle cx="62" cy="26.5" r="1.5" fill="#DAD5CC" />
        </g>
      </g>
    </svg>
  );
}

/** Бүрэн loader — машин + доорх тайлбар. */
export function Loader({ label }: { label: string }) {
  const visible = useDelayedMount(80);
  if (!visible) return null;

  return (
    <div className="loader-wrap flex flex-col items-center justify-center gap-2 py-16" role="status">
      <TruckGlyph size={96} />
      <p className="text-sm text-[#6B6568]">{label}</p>
    </div>
  );
}

/** Товч доторх 20px хувилбар — «Түр хүлээнэ үү…» дэргэд. */
export function LoaderIcon() {
  return (
    <svg viewBox="0 0 96 36" width="20" height="20" aria-hidden="true" className="loader-truck shrink-0">
      <g className="loader-bounce">
        <rect x="22" y="8" width="36" height="18" rx="2" fill="currentColor" />
        <rect x="58" y="12" width="16" height="14" rx="2" fill="currentColor" opacity="0.7" />
        <g className="loader-wheel" style={{ transformOrigin: '30px 28px' }}>
          <circle cx="30" cy="28" r="4" fill="currentColor" opacity="0.9" />
        </g>
        <g className="loader-wheel" style={{ transformOrigin: '62px 28px' }}>
          <circle cx="62" cy="28" r="4" fill="currentColor" opacity="0.9" />
        </g>
      </g>
    </svg>
  );
}

export const LOADER_MID_DELAY = MID;
