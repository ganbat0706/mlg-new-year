import { Brand } from '@/components/Brand';
import { isGameOpen, eventInfo } from '@/lib/config';
import { ResultClient } from './ResultClient';

export const dynamic = 'force-dynamic';

export default function ResultPage() {
  const open = isGameOpen();
  const event = eventInfo();

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Brand />

      <h1 className="mt-10 text-3xl font-extrabold tracking-tight">
        {open ? 'Үр дүн' : 'Тоглоом дууслаа'}
      </h1>

      {!open && (
        <p className="mt-3 rounded-lg bg-[#221E20] px-5 py-4 text-base text-[#FAF7F0]">
          Тэмцээн хаагдлаа. Арга хэмжээ <strong>{event.date}</strong>
          {event.time ? ` · ${event.time}` : ''}
          {event.venue ? ` · ${event.venue}` : ''} болно.
          Урилгаа доороос дахин татаж авч болно.
        </p>
      )}

      <div className="mt-8">
        <ResultClient gameOpen={open} />
      </div>
    </main>
  );
}
