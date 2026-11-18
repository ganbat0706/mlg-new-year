'use client';

import { Button } from '@/components/Button';

export function InviteActions({ code }: { code: string }) {
  async function download() {
    try {
      const res = await fetch(`/invite/${code}/image`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${code}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // Татахад садаа болвол зургийг шинэ цонхонд нээж, урт дарж хадгалуулна.
      window.open(`/invite/${code}/image`, '_blank');
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button onClick={download}>Урилгаа татах</Button>
      <a
        href={`/invite/${code}/image`}
        target="_blank"
        rel="noreferrer"
        className="press inline-flex min-h-12 items-center justify-center rounded-lg
                   border border-[#221E20] px-6 font-semibold hover:bg-[#221E20] hover:text-white"
      >
        Шинэ цонхонд нээх
      </a>
    </div>
  );
}
