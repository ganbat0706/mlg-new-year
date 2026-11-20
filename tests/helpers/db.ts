import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  ensureInviteSequence, ensureOneOpenAttemptIndex, ensureOneAttemptPerContest,
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
  await db.execute(sql`TRUNCATE attempts, registrations RESTART IDENTITY CASCADE`);
  await ensureInviteSequence();
  await ensureOneOpenAttemptIndex();
  await ensureOneAttemptPerContest();
  await db.execute(sql`ALTER SEQUENCE invite_seq_counter RESTART WITH 1`);
}

