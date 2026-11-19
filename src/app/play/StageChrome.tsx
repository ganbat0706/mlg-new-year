'use client';

import { useEffect } from 'react';

/**
 * Гурван тоглоомын хуваалцдаг бүрхүүл. Шат бүр ижил гурван дүртэй:
 * «бэлэн» цаасан хуудас, алдааны мэдэгдэл, дүнгийн тамга. Нэг газар
 * байрлуулснаар гурван файлд ижил JSX давтагдахгүй.
 */

/** Шатны дугаарыг чипэд харуулна — тоглогч хаана явааг мэднэ. */
export function StageReady({
  step, title, children, onStart,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
  onStart: () => void;
}) {
  return (
    <div className="enter sheet mt-6 text-center">
      <span className="sheet-tag">Шат {step} / 3</span>
      <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#221E20]">{title}</h2>
      <p className="mx-auto mt-3 max-w-sm text-base leading-relaxed text-[#6B6568]">{children}</p>
      <button
        type="button"
        onClick={onStart}
        className="press mt-8 inline-flex min-h-14 w-full items-center justify-center rounded-lg
                   bg-[#C21019] px-8 text-lg font-semibold text-white hover:bg-[#9E0D14]"
      >
        Эхлэх
      </button>
    </div>
  );
}

/** Алдаа — цаасан хуудсан дээр, одоо байгаа улаан хайрцагтайгаа. */
export function StageNotice({
  message, actionLabel, onAction,
}: {
  message: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="enter sheet mt-6 text-center">
      <p role="alert" className="rounded-lg bg-[#FDECEC] px-4 py-3 text-base text-[#8A0F15]">
        {message}
      </p>
      <button
        type="button"
        onClick={onAction}
        className="press mt-6 inline-flex min-h-14 w-full items-center justify-center rounded-lg
                   bg-[#C21019] px-8 text-lg font-semibold text-white hover:bg-[#9E0D14]"
      >
        {actionLabel}
      </button>
    </div>
  );
}

/** Шатны дүн — 700мс харагдах «тамга». */
export function StageResult({ score, max }: { score: number; max: number }) {
  return (
    <div className="mt-16 flex justify-center">
      <div className="stamp-in sheet border-2 border-[#E8B931] text-center" style={{ minWidth: 220 }}>
        <span className="sheet-tag">Дүн</span>
        <p data-testid="stage-result" className="mt-1 text-[44px] font-extrabold leading-none text-[#221E20]">
          {score}
          <span className="ml-2 align-middle text-base font-semibold text-[#6B6568]">/ {max}</span>
        </p>
      </div>
    </div>
  );
}

/**
 * Шат ажиллаж байх хугацаанд <html data-stage="running"> тавина — энэ нь
 * дээд талын гэрлэн чимэглэлийн анивчилтыг зогсооно (globals.css). Нүдний
 * захад юм анивчиж байхад хариу үйлдлийн хурд мууддаг.
 */
export function useRunningStage(running: boolean): void {
  useEffect(() => {
    if (!running) return undefined;
    document.documentElement.dataset.stage = 'running';
    return () => { delete document.documentElement.dataset.stage; };
  }, [running]);
}
