import { describe, it, expect, afterAll } from 'vitest';
import { ensureInviteSequence } from '../scripts/db-setup';
import { client } from '@/lib/db';

afterAll(async () => {
  await client.end();
});

describe('ensureInviteSequence', () => {
  it('хоёр удаа ажиллуулахад алдаа гаргахгүй (idempotent)', async () => {
    await expect(ensureInviteSequence()).resolves.not.toThrow();
    await expect(ensureInviteSequence()).resolves.not.toThrow();
  });

  it('invite_seq_counter дараалал ажиллаж байгааг нотлох', async () => {
    await ensureInviteSequence();
    const rows = await client`SELECT nextval('invite_seq_counter') AS val;`;
    // postgres.js int8/bigint баганыг нарийвчлал алдахгүйн тулд string хэлбэрээр
    // буцаадаг тул тоон утга мөн эсэхийг Number()-ээр шалгана (NaN биш, >= 1).
    const value = Number(rows[0].val);
    expect(Number.isNaN(value)).toBe(false);
    expect(value).toBeGreaterThanOrEqual(1);
  });
});
