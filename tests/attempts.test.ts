import { describe, it, expect, beforeEach } from 'vitest';
import { startAttempt, finishAttempt } from '@/lib/repo/attempts';
import { CONTESTS, contestStartsAt } from '@/lib/contests';
import { registerOrGet } from '@/lib/repo/registrations';
import { resetDb } from './helpers/db';
import { GAME } from '@/lib/config';
import { db } from '@/lib/db';
import { attempts, registrations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Оролдлого үүсгэхэд НЭЭЛТТЭЙ ТЭМЦЭЭН хэрэгтэй болсон. Тестүүд бодит
 * «одоо»-гоос хамаарвал тэмцээний огноо өөрчлөгдөх бүрт унах тул
 * эхний тэмцээний цонх доторх тогтсон мөчийг өгнө.
 */
const DURING = new Date(contestStartsAt(CONTESTS[0]).getTime() + 60_000);

const input = {
  lastName: 'батхүү', firstName: 'ганбат',
  department: 'Мэдээллийн технологи', phone: '88112233',
};

async function newRegistration(phone = '88112233') {
  const r = await registerOrGet({ ...input, phone });
  if (!r.ok) throw new Error(r.error);
  return r.value;
}

beforeEach(async () => {
  await resetDb();
});

describe('startAttempt', () => {
  it('оролдлого үүсгэж гурван тоглоомын хуваарь буцаана', async () => {
    const reg = await newRegistration();
    const r = await startAttempt(reg.id, DURING);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.sortSchedule.length).toBe(12);
    expect(r.value.stackSchedule.length).toBe(6);
    expect(r.value.memoSchedule.length).toBe(12);
    expect(r.value.sortDone).toBe(false);
    expect(r.value.stackDone).toBe(false);
    expect(r.value.memoDone).toBe(false);
  });

  it('дуусаагүй оролдлого байвал шинээр үүсгэхгүй, үргэлжлүүлнэ', async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id, DURING);
    const b = await startAttempt(reg.id, DURING);
    expect(a.ok && b.ok && a.value.attemptId).toBe(b.ok ? b.value.attemptId : '');
  });


  it('30 минутаас удсан оролдлого хүчингүй болж, оролдлогын тоонд тооцогдохгүй', async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id, DURING);
    if (!a.ok) throw new Error(a.error);

    // Эхэлсэн цагийг хиймлээр хоцроож, хугацаа хэтэрсэн болгоно.
    const stale = new Date(Date.now() - GAME.ATTEMPT_TIMEOUT_MS - 60_000);
    await db.update(attempts).set({ startedAt: stale }).where(eq(attempts.id, a.value.attemptId));

    const b = await startAttempt(reg.id, DURING);
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    expect(b.value.attemptId).not.toBe(a.value.attemptId);

    const [row] = await db.select().from(attempts).where(eq(attempts.id, a.value.attemptId));
    expect(row.status).toBe('invalid');

    const [regRow] = await db.select().from(registrations).where(eq(registrations.id, reg.id));
    expect(regRow.attemptsUsed).toBe(1); // хуучин нь хасагдаж, шинэ нь нэмэгдсэн
  });

  it(`${GAME.MAX_ATTEMPTS} оролдлогын дараа татгалзана`, async () => {
    const reg = await newRegistration();
    for (let i = 0; i < GAME.MAX_ATTEMPTS; i++) {
      const a = await startAttempt(reg.id, DURING);
      if (!a.ok) throw new Error(a.error);
      await finishAttempt(a.value.attemptId);
    }
    const extra = await startAttempt(reg.id, DURING);
    expect(extra.ok).toBe(false);
    if (!extra.ok) expect(extra.error).toContain('тэмцээн');
  });
});

describe('startAttempt - зэрэгцээ (concurrency)', () => {
  it('нэг бүртгэлд зэрэг ирсэн 10 хүсэлт яг нэг л оролдлого үүсгэнэ', async () => {
    const reg = await newRegistration();

    // 1-р үе: шинэ бүртгэлд 10 startAttempt хүсэлт зэрэг ирнэ.
    // FOR UPDATE түгжээгүй бол хэд хэдэн in_progress мөр үүсч, attemptsUsed
    // хэт их нэмэгдэх эрсдэлтэй байсан (reviewer-ийн илрүүлсэн согог).
    const firstRound = await Promise.all(
      Array.from({ length: 10 }, () => startAttempt(reg.id, DURING)),
    );
    for (const r of firstRound) expect(r.ok).toBe(true);

    const firstIds = new Set(firstRound.map((r) => (r.ok ? r.value.attemptId : 'FAIL')));
    expect(firstIds.size).toBe(1); // бүх хүсэлт яг ижил attemptId буцаасан

    const [reg1] = await db.select().from(registrations).where(eq(registrations.id, reg.id));
    expect(reg1.attemptsUsed).toBe(1);

    const rows1 = await db.select().from(attempts).where(eq(attempts.registrationId, reg.id));
    expect(rows1.length).toBe(1); // attempts хүснэгтэд яг нэг л мөр үүссэн

    let currentAttemptId = [...firstIds][0] as string;
    await finishAttempt(currentAttemptId);

    // Үлдсэн үеүүдэд ижил зэрэгцээ хуваарийг давтаж, MAX_ATTEMPTS хүртэл зөв
    // нэмэгдэж байгааг баталгаажуулна.
    for (let round = 2; round <= GAME.MAX_ATTEMPTS; round++) {
      const results = await Promise.all(
        Array.from({ length: 10 }, () => startAttempt(reg.id, DURING)),
      );
      for (const r of results) expect(r.ok).toBe(true);

      const ids = new Set(results.map((r) => (r.ok ? r.value.attemptId : 'FAIL')));
      expect(ids.size).toBe(1);

      const [regRow] = await db.select().from(registrations).where(eq(registrations.id, reg.id));
      expect(regRow.attemptsUsed).toBe(round);

      currentAttemptId = [...ids][0] as string;
      await finishAttempt(currentAttemptId);
    }

    const allRows = await db.select().from(attempts).where(eq(attempts.registrationId, reg.id));
    expect(allRows.length).toBe(GAME.MAX_ATTEMPTS); // нийт яг MAX_ATTEMPTS мөр — давхардаагүй

    const extra = await startAttempt(reg.id, DURING);
    expect(extra.ok).toBe(false);
  });
});

describe('finishAttempt', () => {
  it('нийт оноог тооцож бүртгэлийн дээд оноог шинэчилнэ', async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id, DURING);
    if (!a.ok) throw new Error(a.error);

    // Тоглоомын онооны нийлбэрийг шалгах нь энд зорилго тул гурван тоглоомын
    // оноог шууд бичиж (тэдгээрийн өөрсдийн шалгалт attempt-games.test.ts-д байна)
    // finishAttempt НИЙЛБЭР зөв гаргаж байгааг тусад нь баталгаажуулна.
    await db.update(attempts)
      .set({ sortScore: 800, stackScore: 600, memoScore: 400 })
      .where(eq(attempts.id, a.value.attemptId));

    const r = await finishAttempt(a.value.attemptId);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.sortScore).toBe(800);
    expect(r.value.stackScore).toBe(600);
    expect(r.value.memoScore).toBe(400);
    expect(r.value.totalScore).toBe(1800);
    expect(r.value.bestScore).toBe(1800);
  });

  it('ӨӨР ТЭМЦЭЭН дэх муу оролдлого нийт дээд оноог буулгахгүй', async () => {
    /*
      Нэг тэмцээнд нэг л удаа тоглодог болсон тул «хоёр дахь оролдлого»
      гэдэг нь одоо ДАРААГИЙН ТЭМЦЭЭН гэсэн үг. registrations.bestScore
      нь бүх тэмцээний хамгийн сайн оноо (урилган дээр хэрэглэгдэнэ) тул
      хожим муу тоглосон ч буурах ёсгүй.
    */
    const reg = await newRegistration();

    const first = await startAttempt(reg.id, DURING);
    if (!first.ok) throw new Error(first.error);
    await db.update(attempts)
      .set({ sortScore: 900, stackScore: 500, memoScore: 300 })
      .where(eq(attempts.id, first.value.attemptId));
    const r1 = await finishAttempt(first.value.attemptId);

    const during2 = new Date(contestStartsAt(CONTESTS[1]).getTime() + 60_000);
    const second = await startAttempt(reg.id, during2);
    if (!second.ok) throw new Error(second.error);
    const r2 = await finishAttempt(second.value.attemptId);

    expect(r1.ok && r1.value.totalScore).toBeGreaterThan(0);
    expect(r1.ok && r2.ok && r2.value.bestScore).toBe(r1.ok ? r1.value.totalScore : -1);
  });

  it('аль хэдийн дууссан оролдлогыг дахин дуусгахыг татгалзана', async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id, DURING);
    if (!a.ok) throw new Error(a.error);
    await finishAttempt(a.value.attemptId);
    expect((await finishAttempt(a.value.attemptId)).ok).toBe(false);
  });

  it('байхгүй оролдлогыг татгалзана', async () => {
    expect((await finishAttempt('00000000-0000-0000-0000-000000000000')).ok).toBe(false);
  });
});
