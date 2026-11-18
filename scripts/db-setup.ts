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

async function main() {
  await ensureInviteSequence();
  await ensureOneOpenAttemptIndex();
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
