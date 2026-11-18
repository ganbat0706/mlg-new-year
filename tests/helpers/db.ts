import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  ensureInviteSequence, ensureOneOpenAttemptIndex, ensureAttemptAnswerUniqueness,
} from '../../scripts/db-setup';

/** Тест бүрийн өмнө DB-г цэвэрлэж, sequence-ийг 1 рүү буцаана. */
export async function resetDb(): Promise<void> {
  // Дараалал чухал: эхлээд TRUNCATE хийнэ — энэ нь sequence, индексүүд байгаа эсэхээс
  // хамаардаггүй тул "бузар" (concurrency-хамгаалах unique индексүүдийг зөрчсөн,
  // жишээ нь ижил position-той давхар мөртэй) өгөгдлийн сан дээр ч үргэлж ажиллаж,
  // зөрчилтэй мөрүүдийг арилгана. Зөвхөн ҮҮНИЙ ДАРАА sequence болон индексүүдийг
  // (идемпотент) баталгаажуулна — энэ үед хүснэгт хоосон тул давхардлын улмаас
  // индекс үүсгэх нь бүтэлгүйтэх боломжгүй. Эцэст нь sequence-ийг 1 рүү буцаана
  // (ensureInviteSequence() үүнээс өмнө ажилласан байх ёстой тул энэ дарааллаар).
  await db.execute(sql`TRUNCATE attempt_answers, attempts, registrations RESTART IDENTITY CASCADE`);
  await ensureInviteSequence();
  await ensureOneOpenAttemptIndex();
  await ensureAttemptAnswerUniqueness();
  await db.execute(sql`ALTER SEQUENCE invite_seq_counter RESTART WITH 1`);
}

export async function seedQuestions(count = 15): Promise<void> {
  await db.execute(sql`TRUNCATE questions RESTART IDENTITY CASCADE`);
  for (let i = 1; i <= count; i++) {
    await db.execute(sql`
      INSERT INTO questions (text, options, correct_index, active)
      VALUES (${`Тест асуулт ${i}`}, ${JSON.stringify(['A', 'B', 'C', 'D'])}::jsonb, ${i % 4}, true)
    `);
  }
}
