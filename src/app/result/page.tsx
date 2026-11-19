import { Brand } from '@/components/Brand';
import { isGameOpen, eventInfo } from '@/lib/config';
import { ResultClient } from './ResultClient';

export const dynamic = 'force-dynamic';

export default function ResultPage() {
  const open = isGameOpen();
  const event = eventInfo();

  return (
    <main className="mx-auto max-w-2xl px-5 pb-28 pt-6">
      <div className="enter"><Brand /></div>

      <h1 className="enter mt-10 text-3xl font-extrabold tracking-tight">
        {open ? 'Үр дүн' : 'Тоглоом дууслаа'}
      </h1>

      {!open && (
        <p className="enter sheet mt-3 text-base">
          Тэмцээн хаагдлаа. Арга хэмжээ <strong>{event.date}</strong>
          {event.time ? ` · ${event.time}` : ''}
          {event.venue ? ` · ${event.venue}` : ''} болно.
          Урилгаа доороос дахин татаж авч болно.
        </p>
      )}

      <div className="enter mt-8">
        <ResultClient gameOpen={open} />
      </div>
    </main>
  );
}
