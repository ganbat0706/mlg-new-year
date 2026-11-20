import './load-env';
import { client } from '../src/lib/db';

/**
 * Урилгын кодын дараалал тоолуур (invite_seq_counter) — Task 6-д ачигдана.
 * Хэдэн ч удаа ажиллуулахад аюулгүй (IF NOT EXISTS).
 */
export async function ensureInviteSequence(): Promise<void> {
  await client`CREATE SEQUENCE IF NOT EXISTS invite_seq_counter START 1;`;
}

/**
 * Нэг бүртгэлд зэрэг хэдэн ч in_progress оролдлого үүсэхээс санг түвшинд хамгаална
 * (Task 7 — concurrency fix). Аппликейшны логик (FOR UPDATE түгжээ) давхар хамгаалалт
 * өгдөг ч ирээдүйд дахин зохион бүтээхэд энэ индекс нь сүүлчийн бат бэх хамгаалалт болно.
 * Хэдэн ч удаа ажиллуулахад аюулгүй (IF NOT EXISTS).
 */
export async function ensureOneOpenAttemptIndex(): Promise<void> {
  await client`
    CREATE UNIQUE INDEX IF NOT EXISTS attempts_one_open_per_registration
    ON attempts (registration_id)
    WHERE status = 'in_progress';
  `;
}
/**
 * НЭГ ТЭМЦЭЭНД НЭГ ОРОЛДЛОГО — санд түвшинд. Аппликейшны логик (FOR UPDATE
 * түгжээтэй тоолол) үүнийг аль хэдийн хангадаг ч тэмцээн бүрт ганц ялагч
 * шалгаруулж, шагнал олгох тул давхар баталгаа зүйтэй.
 *
 * `invalid` (30 минутаас удаж хүчингүй болсон) оролдлого тоологдохгүй —
 * сүлжээ тасарсан хүн дахин тоглох ёстой.
 *
 * ЖИЧ: энэ индекс нь GAME.MAX_ATTEMPTS = 1 гэдгийг кодчилсон. Хэрэв нэг
 * тэмцээнд олон оролдлого зөвшөөрөх бол ЭНЭ ИНДЕКСИЙГ УСТГАНА.
 */
export async function ensureOneAttemptPerContest(): Promise<void> {
  await client`
    CREATE UNIQUE INDEX IF NOT EXISTS attempts_one_per_registration_contest
    ON attempts (registration_id, contest_id)
    WHERE status <> 'invalid';
  `;
}

async function main() {
  await ensureInviteSequence();
  await ensureOneOpenAttemptIndex();
  await ensureOneAttemptPerContest();
}

if (require.main === module) {
  main()
    .then(() => client.end())
    .catch(async (err) => {
      console.error(err);
      await client.end();
      process.exit(1);
    });
}
