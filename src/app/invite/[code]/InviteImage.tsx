'use client';

import { useState } from 'react';
import { Loader } from '@/components/Loader';

/**
 * Урилгын PNG — апп дахь хамгийн баярын мэдрэмжтэй зураг тул энэ өөрөө
 * хөдлөхгүй, зөвхөн ачаалах явцыг (4:5 орон зай + loader) мэдрэмжтэй болгоно.
 * Ачаалж дуусахад (`onLoad`) 320мс --out, translateY16→0, scale .98→1.
 */
export function InviteImage({ code, alt }: { code: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative mt-6 w-full overflow-hidden rounded-xl border border-[#DAD5CC]" style={{ aspectRatio: '4 / 5' }}>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#FAF7F0]">
          <Loader label="Ачааллаж байна…" />
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/invite/${code}/image`}
        alt={alt}
        width={1080}
        height={1350}
        onLoad={() => setLoaded(true)}
        className={`absolute inset-0 h-full w-full object-cover ${loaded ? 'invite-img-in' : 'opacity-0'}`}
      />
    </div>
  );
}
