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

      {!open && (
        <p className="enter mt-6 text-xs font-bold uppercase tracking-[0.14em] text-[#E8B931]">
          Тэмцээн хаагдлаа
        </p>
      )}
      <h1 className={`enter text-3xl font-extrabold tracking-tight ${open ? 'mt-6' : 'mt-1'}`}>
        {open ? 'Үр дүн' : 'Эцсийн үр дүн'}
      </h1>

      {!open && (
        <p className="enter mt-2 text-base text-[#C9D6E6]">
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
