import { describe, it, expect, beforeEach } from 'vitest';
import {
  startAttempt, serveNextQuestion, submitAnswer, submitReaction, finishAttempt,
} from '@/lib/repo/attempts';
import { registerOrGet } from '@/lib/repo/registrations';
import { resetDb, seedQuestions } from './helpers/db';
import { QUIZ, REACTION, GAME } from '@/lib/config';
import { db } from '@/lib/db';
import { attempts, attemptAnswers, registrations } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { generateSpawnSchedule } from '@/lib/reaction';

/**
 * startAttempt одоо spawnSchedule буцаахгүй болсон (P2-3 — sort/stack/memo
 * сольсон) тул reaction-ий тестүүдэд хэрэгтэй хуваарийг attempt-ийн seed-ээр
 * шууд дахин үүсгэнэ — submitReaction дотроо яг ижил зүйлийг хийдэг.
 */
async function spawnScheduleFor(attemptId: string) {
  const [row] = await db.select().from(attempts).where(eq(attempts.id, attemptId));
  return generateSpawnSchedule(row.seed);
}

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
  await seedQuestions(15);
});

describe('startAttempt', () => {
  it('оролдлого үүсгэж гурван тоглоомын хуваарь буцаана', async () => {
    const reg = await newRegistration();
    const r = await startAttempt(reg.id);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.sortSchedule.length).toBe(12);
    expect(r.value.stackSchedule.length).toBe(6);
    expect(r.value.memoSchedule.length).toBe(12);
    expect(r.value.answered).toBe(0);
    expect(r.value.sortDone).toBe(false);
    expect(r.value.stackDone).toBe(false);
    expect(r.value.memoDone).toBe(false);
  });

  it('дуусаагүй оролдлого байвал шинээр үүсгэхгүй, үргэлжлүүлнэ', async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id);
    const b = await startAttempt(reg.id);
    expect(a.ok && b.ok && a.value.attemptId).toBe(b.ok ? b.value.attemptId : '');
  });

  it('оролдлого үргэлжлүүлэхэд хариулсан тоо хадгалагдана', async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id);
    if (!a.ok) throw new Error('эхлээгүй');
    const q = await serveNextQuestion(a.value.attemptId);
    if (!q.ok || !q.value) throw new Error('асуулт ирсэнгүй');
    await submitAnswer(a.value.attemptId, q.value.questionId, 0);

    const b = await startAttempt(reg.id);
    expect(b.ok && b.value.answered).toBe(1);
  });

  it('30 минутаас удсан оролдлого хүчингүй болж, оролдлогын тоонд тооцогдохгүй', async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id);
    if (!a.ok) throw new Error(a.error);

    // Эхэлсэн цагийг хиймлээр хоцроож, хугацаа хэтэрсэн болгоно.
    const stale = new Date(Date.now() - GAME.ATTEMPT_TIMEOUT_MS - 60_000);
    await db.update(attempts).set({ startedAt: stale }).where(eq(attempts.id, a.value.attemptId));

    const b = await startAttempt(reg.id);
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
      const a = await startAttempt(reg.id);
      if (!a.ok) throw new Error(a.error);
      await finishAttempt(a.value.attemptId);
    }
    const extra = await startAttempt(reg.id);
    expect(extra.ok).toBe(false);
    if (!extra.ok) expect(extra.error).toContain('оролдлого');
  });
});

describe('startAttempt - зэрэгцээ (concurrency)', () => {
  it('нэг бүртгэлд зэрэг ирсэн 10 хүсэлт яг нэг л оролдлого үүсгэнэ', async () => {
    const reg = await newRegistration();

    // 1-р үе: шинэ бүртгэлд 10 startAttempt хүсэлт зэрэг ирнэ.
    // FOR UPDATE түгжээгүй бол хэд хэдэн in_progress мөр үүсч, attemptsUsed
    // хэт их нэмэгдэх эрсдэлтэй байсан (reviewer-ийн илрүүлсэн согог).
    const firstRound = await Promise.all(
      Array.from({ length: 10 }, () => startAttempt(reg.id)),
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
        Array.from({ length: 10 }, () => startAttempt(reg.id)),
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

    const extra = await startAttempt(reg.id);
    expect(extra.ok).toBe(false);
  });
});

describe('serveNextQuestion', () => {
  it(`${QUIZ.QUESTION_COUNT} асуулт дараалан өгнө, дараа нь null`, async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id);
    if (!a.ok) throw new Error(a.error);

    for (let i = 1; i <= QUIZ.QUESTION_COUNT; i++) {
      const q = await serveNextQuestion(a.value.attemptId);
      expect(q.ok).toBe(true);
      if (!q.ok || !q.value) throw new Error(`${i}-р асуулт ирсэнгүй`);
      expect(q.value.position).toBe(i);
      expect(q.value.total).toBe(QUIZ.QUESTION_COUNT);
      expect(q.value.options).toHaveLength(4);
      await submitAnswer(a.value.attemptId, q.value.questionId, 0);
    }

    const extra = await serveNextQuestion(a.value.attemptId);
    expect(extra.ok && extra.value).toBeNull();
  });

  it('хариулаагүй байхад дахин дуудвал ижил асуулт буцаана', async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id);
    if (!a.ok) throw new Error(a.error);
    const first = await serveNextQuestion(a.value.attemptId);
    const again = await serveNextQuestion(a.value.attemptId);
    expect(first.ok && again.ok && first.value?.questionId)
      .toBe(again.ok ? again.value?.questionId : -1);
  });

  it('зөв хариултыг хариултанд оруулж илгээхгүй', async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id);
    if (!a.ok) throw new Error(a.error);
    const q = await serveNextQuestion(a.value.attemptId);
    if (!q.ok || !q.value) throw new Error('асуулт алга');
    expect(JSON.stringify(q.value)).not.toContain('correctIndex');
    expect(JSON.stringify(q.value)).not.toContain('correct_index');
  });

  it('асуултууд давхардахгүй', async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id);
    if (!a.ok) throw new Error(a.error);
    const ids: number[] = [];
    for (let i = 0; i < QUIZ.QUESTION_COUNT; i++) {
      const q = await serveNextQuestion(a.value.attemptId);
      if (!q.ok || !q.value) break;
      ids.push(q.value.questionId);
      await submitAnswer(a.value.attemptId, q.value.questionId, 0);
    }
    expect(new Set(ids).size).toBe(QUIZ.QUESTION_COUNT);
  });
});

describe('serveNextQuestion - зэрэгцээ (concurrency)', () => {
  it('нэг оролдлогод зэрэг ирсэн 5 хүсэлт яг нэг л асуулт үүсгэнэ', async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id);
    if (!a.ok) throw new Error(a.error);

    for (let round = 1; round <= QUIZ.QUESTION_COUNT; round++) {
      const results = await Promise.all(
        Array.from({ length: 5 }, () => serveNextQuestion(a.value.attemptId)),
      );
      for (const r of results) expect(r.ok).toBe(true);

      const questionIds = new Set(results.map((r) => (r.ok && r.value ? r.value.questionId : -1)));
      const positions = new Set(results.map((r) => (r.ok && r.value ? r.value.position : -1)));
      expect(questionIds.size).toBe(1); // бүгд ижил questionId буцаасан
      expect(positions.size).toBe(1); // бүгд ижил position буцаасан
      expect([...positions][0]).toBe(round);

      const rows = await db.select().from(attemptAnswers)
        .where(eq(attemptAnswers.attemptId, a.value.attemptId));
      expect(rows.length).toBe(round); // давхар INSERT хийгдээгүй — яг round мөр

      const first = results.find((r) => r.ok && r.value);
      if (!first || !first.ok || !first.value) throw new Error('асуулт алга');
      await submitAnswer(a.value.attemptId, first.value.questionId, 0);
    }

    const finalRows = await db.select().from(attemptAnswers)
      .where(eq(attemptAnswers.attemptId, a.value.attemptId));
    expect(finalRows.length).toBe(QUIZ.QUESTION_COUNT); // нийт яг QUESTION_COUNT мөр, илүүгүй

    const extra = await serveNextQuestion(a.value.attemptId);
    expect(extra.ok && extra.value).toBeNull();
  });
});

describe('submitAnswer', () => {
  it('зөв хариултад оноо өгнө', async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id);
    if (!a.ok) throw new Error(a.error);
    const q = await serveNextQuestion(a.value.attemptId);
    if (!q.ok || !q.value) throw new Error('асуулт алга');

    // seedQuestions: correct_index = id % 4, options нь ['A','B','C','D']
    // Зөв хувилбарын ТЕКСТийг олж, түүний харагдсан байрлалыг илгээнэ.
    const correctLetter = ['A', 'B', 'C', 'D'][q.value.questionId % 4];
    const shownIndex = q.value.options.indexOf(correctLetter);

    const r = await submitAnswer(a.value.attemptId, q.value.questionId, shownIndex);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.isCorrect).toBe(true);
    expect(r.value.points).toBeGreaterThan(0);
  });

  it('буруу хариултад 0 оноо', async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id);
    if (!a.ok) throw new Error(a.error);
    const q = await serveNextQuestion(a.value.attemptId);
    if (!q.ok || !q.value) throw new Error('асуулт алга');

    const correctLetter = ['A', 'B', 'C', 'D'][q.value.questionId % 4];
    const wrongIndex = q.value.options.findIndex((o) => o !== correctLetter);

    const r = await submitAnswer(a.value.attemptId, q.value.questionId, wrongIndex);
    expect(r.ok && r.value.isCorrect).toBe(false);
    expect(r.ok && r.value.points).toBe(0);
  });

  it('нэг асуултад давхар хариулахыг татгалзана', async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id);
    if (!a.ok) throw new Error(a.error);
    const q = await serveNextQuestion(a.value.attemptId);
    if (!q.ok || !q.value) throw new Error('асуулт алга');

    await submitAnswer(a.value.attemptId, q.value.questionId, 0);
    const second = await submitAnswer(a.value.attemptId, q.value.questionId, 1);
    expect(second.ok).toBe(false);
  });

  it('өгөгдөөгүй асуултад хариулахыг татгалзана', async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id);
    if (!a.ok) throw new Error(a.error);
    await serveNextQuestion(a.value.attemptId);
    const r = await submitAnswer(a.value.attemptId, 99999, 0);
    expect(r.ok).toBe(false);
  });

  it('хүрээнээс гадуур сонголт буруу гэж тооцогдоно', async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id);
    if (!a.ok) throw new Error(a.error);
    const q = await serveNextQuestion(a.value.attemptId);
    if (!q.ok || !q.value) throw new Error('асуулт алга');
    const r = await submitAnswer(a.value.attemptId, q.value.questionId, 99);
    expect(r.ok && r.value.isCorrect).toBe(false);
    expect(r.ok && r.value.points).toBe(0);
  });
});

describe('submitAnswer - зэрэгцээ (concurrency)', () => {
  // submitAnswer одоо attempts мөрийг FOR UPDATE-ээр түгжиж, нэг гүйлгээн дотор
  // ажилладаг тул нэг асуултад зэрэг ирсэн хариултуудаас ЗӨВХӨН НЭГ нь амжилттай
  // болж, бусад нь (түгжээ суллагдсаны дараа answeredAt аль хэдийн тавигдсаныг
  // хараад) "аль хэдийн хариулсан" гэж татгалзана. Чухал нь: татгалзсан хариулт
  // isCorrect-ийг ил гаргахгүй — үгүй бол зэрэг ирсэн олон хүсэлт бүр өөрийн
  // isCorrect-ийг хүлээн авч зөв хариултыг илрүүлэх "оракул" болдог байсан (нэг
  // асуулт, олон оролдлого → зөв хувилбарыг таамаглалгүй олох боломж).
  it('нэг асуултад зэрэг ирсэн хариултуудаас зөвхөн нэг амжилттай болж, isCorrect ил гарахгүй', async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id);
    if (!a.ok) throw new Error(a.error);
    const q = await serveNextQuestion(a.value.attemptId);
    if (!q.ok || !q.value) throw new Error('асуулт алга');

    const correctLetter = ['A', 'B', 'C', 'D'][q.value.questionId % 4];
    const shownIndex = q.value.options.indexOf(correctLetter);
    const { questionId } = q.value;

    const results = await Promise.all(
      Array.from({ length: 5 }, () => submitAnswer(a.value.attemptId, questionId, shownIndex)),
    );

    const succeeded = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);
    expect(succeeded.length).toBe(1); // яг нэг л амжилттай
    expect(failed.length).toBe(4); // бусад дөрвөөс бүгд татгалзсан

    // Татгалзсан хариултууд isCorrect (эсвэл ямар ч оноо/зөв мэдээлэл) агуулахгүй —
    // "хариулт оракул" хаагдсан эсэхийг шалгана.
    for (const r of failed) {
      expect(r).not.toHaveProperty('value');
      expect(JSON.stringify(r)).not.toContain('isCorrect');
    }

    const rows = await db.select().from(attemptAnswers)
      .where(and(
        eq(attemptAnswers.attemptId, a.value.attemptId),
        eq(attemptAnswers.questionId, questionId),
      ));
    expect(rows.length).toBe(1); // нэг л мөр — давхар INSERT хийгдээгүй
    expect(rows[0].answeredAt).not.toBeNull(); // яг нэг мөр answeredAt-тай болсон

    // Хадгалагдсан points нь амжилттай болсон цорын ганц хариултын буцаасан
    // points-той яг таарна — сүүлд бичсэн нь санамсаргүй ялгаатай оноогоор
    // дарагдаагүй.
    const [succeededResult] = succeeded;
    if (succeededResult.ok) {
      expect(rows[0].points).toBe(succeededResult.value.points);
      expect(rows[0].isCorrect).toBe(succeededResult.value.isCorrect);
    }

    const finish = await finishAttempt(a.value.attemptId);
    expect(finish.ok).toBe(true);
    if (!finish.ok) return;
    // Нэг асуултын боломжит дээд онооноос (хурдны урамшуулал орсон ч) хэтрэхгүй.
    expect(finish.value.quizScore).toBeLessThanOrEqual(
      QUIZ.BASE_POINTS + (QUIZ.TIME_LIMIT_MS / 1000) * QUIZ.SPEED_POINTS_PER_SECOND,
    );
  });
});

describe('submitReaction', () => {
  it('зөв tap-уудад оноо өгнө', async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id);
    if (!a.ok) throw new Error(a.error);

    const schedule = await spawnScheduleFor(a.value.attemptId);
    const good = schedule.filter((i) => i.kind === 'good').slice(0, 3);
    const r = await submitReaction(
      a.value.attemptId,
      good.map((i) => ({ id: i.id, t: i.t + 100 })),
    );
    expect(r.ok && r.value.reactionScore).toBe(REACTION.GOOD_POINTS * 3);
  });

  it('хуурамч id-тай tap оноо нэмэхгүй', async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id);
    if (!a.ok) throw new Error(a.error);
    const r = await submitReaction(a.value.attemptId, [
      { id: 99999, t: 10 }, { id: 99998, t: 20 },
    ]);
    expect(r.ok && r.value.reactionScore).toBe(0);
  });

  it(`${REACTION.MAX_TAPS}-аас олон tap-ыг татгалзана`, async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id);
    if (!a.ok) throw new Error(a.error);
    const taps = Array.from({ length: REACTION.MAX_TAPS + 1 }, (_, i) => ({ id: i, t: i }));
    const r = await submitReaction(a.value.attemptId, taps);
    expect(r.ok).toBe(false);
  });

  it('reaction-ийг давхар илгээхийг татгалзана', async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id);
    if (!a.ok) throw new Error(a.error);
    await submitReaction(a.value.attemptId, []);
    const second = await submitReaction(a.value.attemptId, []);
    expect(second.ok).toBe(false);
  });
});

describe('finishAttempt', () => {
  it('нийт оноог тооцож бүртгэлийн дээд оноог шинэчилнэ, reactionScore нийлбэрт ОРОХГҮЙ', async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id);
    if (!a.ok) throw new Error(a.error);

    for (let i = 0; i < QUIZ.QUESTION_COUNT; i++) {
      const q = await serveNextQuestion(a.value.attemptId);
      if (!q.ok || !q.value) break;
      const correctLetter = ['A', 'B', 'C', 'D'][q.value.questionId % 4];
      await submitAnswer(a.value.attemptId, q.value.questionId, q.value.options.indexOf(correctLetter));
    }
    const schedule = await spawnScheduleFor(a.value.attemptId);
    const good = schedule.filter((i) => i.kind === 'good').slice(0, 5);
    await submitReaction(a.value.attemptId, good.map((i) => ({ id: i.id, t: i.t + 50 })));

    const r = await finishAttempt(a.value.attemptId);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.quizScore).toBeGreaterThan(0);
    // reactionScore хадгалагдсан хэвээр ч (reaction route хараахан хасаагүй) —
    // Phase 2-ын totalScore = quiz + sort + stack + memo, reaction ОРОХГҮЙ.
    expect(r.value.reactionScore).toBe(REACTION.GOOD_POINTS * 5);
    expect(r.value.sortScore).toBe(0);
    expect(r.value.stackScore).toBe(0);
    expect(r.value.memoScore).toBe(0);
    expect(r.value.totalScore).toBe(r.value.quizScore);
    expect(r.value.bestScore).toBe(r.value.totalScore);
  });

  it('хоёр дахь оролдлого муу бол дээд оноо буурахгүй', async () => {
    const reg = await newRegistration();

    const first = await startAttempt(reg.id);
    if (!first.ok) throw new Error(first.error);
    for (let i = 0; i < QUIZ.QUESTION_COUNT; i++) {
      const q = await serveNextQuestion(first.value.attemptId);
      if (!q.ok || !q.value) break;
      const correctLetter = ['A', 'B', 'C', 'D'][q.value.questionId % 4];
      await submitAnswer(first.value.attemptId, q.value.questionId, q.value.options.indexOf(correctLetter));
    }
    const r1 = await finishAttempt(first.value.attemptId);

    const second = await startAttempt(reg.id);
    if (!second.ok) throw new Error(second.error);
    const r2 = await finishAttempt(second.value.attemptId);

    expect(r1.ok && r1.value.totalScore).toBeGreaterThan(0);
    expect(r1.ok && r2.ok && r2.value.bestScore).toBe(r1.ok ? r1.value.totalScore : -1);
  });

  it('аль хэдийн дууссан оролдлогыг дахин дуусгахыг татгалзана', async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id);
    if (!a.ok) throw new Error(a.error);
    await finishAttempt(a.value.attemptId);
    expect((await finishAttempt(a.value.attemptId)).ok).toBe(false);
  });

  it('байхгүй оролдлогыг татгалзана', async () => {
    expect((await finishAttempt('00000000-0000-0000-0000-000000000000')).ok).toBe(false);
  });
});
