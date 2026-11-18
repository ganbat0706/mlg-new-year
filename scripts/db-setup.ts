import './load-env';
import { client } from '../src/lib/db';

/**
 * Урилгын кодын дараалал тоолуур (invite_seq_counter) — Task 6-д ачигдана.
 * Хэдэн ч удаа ажиллуулахад аюулгүй (IF NOT EXISTS).
 */
export async function ensureInviteSequence(): Promise<void> {
  await client`CREATE SEQUENCE IF NOT EXISTS invite_seq_counter START 1;`;
}

async function main() {
  await ensureInviteSequence();
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
