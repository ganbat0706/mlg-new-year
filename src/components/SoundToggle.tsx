'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { audio } from '@/lib/audio';

/**
 * Дуу асаах/унтраах товч. Дэлгэцийн баруун дээд буланд тогтмол сууна.
 *
 * Хоёр зүйлийг анхаарав:
 *  1. Хөтөч нь хэрэглэгчийн үйлдлээс өмнө дуу гаргахыг хориглодог тул
 *     энэ товч дарагдах нь өөрөө «үйлдэл» болж AudioContext-ийг нээнэ.
 *  2. Ажил дээрээ утсаа нээсэн хүн гэнэт чанга дуу гарахыг хүсэхгүй —
 *     тиймээс сонголтыг localStorage-д хадгалж, дахин асуухгүй.
 */
export function SoundToggle() {
  // `useSyncExternalStore` нь яг энэ тохиолдолд зориулагдсан: гаднын (React-ийн
  // бус) төлвийг рендерт аюулгүй уншина. Сервер дээрх snapshot `false` тул
  // hydration зөрчилдөхгүй, эффект дотор setState дуудах ч шаардлагагүй.
  const subscribe = useCallback((cb: () => void) => audio.subscribe(cb), []);
  const muted = useSyncExternalStore(subscribe, () => audio.isMuted(), () => false);

  return (
    <button
      type="button"
      aria-label={muted ? 'Дуу асаах' : 'Дуу унтраах'}
      aria-pressed={!muted}
      onClick={() => {
        void audio.unlock().then(() => {
          audio.setMuted(!audio.isMuted());
          if (!audio.isMuted()) audio.cue('tap');
        });
      }}
      className="press fixed right-3 top-3 z-30 flex h-11 w-11 items-center justify-center
                 rounded-full border border-[#221E20]/15 bg-white/85 text-[#221E20]
                 backdrop-blur hover:bg-white"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none"
           stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor" stroke="none" />
        {muted
          ? <><line x1="16.5" y1="9" x2="21" y2="14" /><line x1="21" y1="9" x2="16.5" y2="14" /></>
          : <><path d="M16 9.2a3.8 3.8 0 0 1 0 5.6" /><path d="M18.6 6.8a7.2 7.2 0 0 1 0 10.4" /></>}
      </svg>
    </button>
  );
}
