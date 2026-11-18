import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { ensureInviteSequence } from '../../scripts/db-setup';

/** Тест бүрийн өмнө DB-г цэвэрлэж, sequence-ийг 1 рүү буцаана. */
export async function resetDb(): Promise<void> {
  // Шинэ (цэвэр) өгөгдлийн сан дээр sequence байхгүй байж болзошгүй тул
  // RESTART-аас өмнө үүсгэх ёстойг баталгаажуулна (идемпотент).
  await ensureInviteSequence();
  await db.execute(sql`TRUNCATE attempt_answers, attempts, registrations RESTART IDENTITY CASCADE`);
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
