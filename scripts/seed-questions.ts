import './load-env';
import { sql } from 'drizzle-orm';
import { db, client } from '../src/lib/db';
import { questions } from '../src/lib/db/schema';
import { QUESTION_BANK, PLACEHOLDER_MARK } from '../src/data/questions';

async function main() {
  await db.execute(sql`TRUNCATE questions RESTART IDENTITY CASCADE`);
  await db.insert(questions).values(
    QUESTION_BANK.map((q) => ({
      text: q.text,
      options: q.options,
      correctIndex: q.correctIndex,
      active: true,
    })),
  );

  const pending = QUESTION_BANK.filter((q) => q.text.includes(PLACEHOLDER_MARK)).length;
  console.log(`✅ ${QUESTION_BANK.length} асуулт нэмэгдлээ.`);
  if (pending > 0) console.warn(`⚠️  ${pending} асуулт бөглөгдөөгүй хэвээр байна.`);

  await client.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
