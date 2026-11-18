import { describe, it, expect, beforeEach } from 'vitest';
import {
  startAttempt, serveNextQuestion, submitAnswer, submitReaction, finishAttempt,
} from '@/lib/repo/attempts';
import { registerOrGet } from '@/lib/repo/registrations';
import { resetDb, seedQuestions } from './helpers/db';
import { QUIZ, REACTION, GAME } from '@/lib/config';
import { db } from '@/lib/db';
import { attempts, registrations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

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
  it('оролдлого үүсгэж spawn хуваарь буцаана', async () => {
    const reg = await newRegistration();
    const r = await startAttempt(reg.id);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.spawnSchedule.length).toBeGreaterThan(30);
    expect(r.value.answered).toBe(0);
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

describe('submitReaction', () => {
  it('зөв tap-уудад оноо өгнө', async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id);
    if (!a.ok) throw new Error(a.error);

    const good = a.value.spawnSchedule.filter((i) => i.kind === 'good').slice(0, 3);
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
  it('нийт оноог тооцож бүртгэлийн дээд оноог шинэчилнэ', async () => {
    const reg = await newRegistration();
    const a = await startAttempt(reg.id);
    if (!a.ok) throw new Error(a.error);

    for (let i = 0; i < QUIZ.QUESTION_COUNT; i++) {
      const q = await serveNextQuestion(a.value.attemptId);
      if (!q.ok || !q.value) break;
      const correctLetter = ['A', 'B', 'C', 'D'][q.value.questionId % 4];
      await submitAnswer(a.value.attemptId, q.value.questionId, q.value.options.indexOf(correctLetter));
    }
    const good = a.value.spawnSchedule.filter((i) => i.kind === 'good').slice(0, 5);
    await submitReaction(a.value.attemptId, good.map((i) => ({ id: i.id, t: i.t + 50 })));

    const r = await finishAttempt(a.value.attemptId);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.quizScore).toBeGreaterThan(0);
    expect(r.value.reactionScore).toBe(REACTION.GOOD_POINTS * 5);
    expect(r.value.totalScore).toBe(r.value.quizScore + r.value.reactionScore);
    expect(r.value.bestScore).toBe(r.value.totalScore);
  });

  it('хоёр дахь оролдлого муу бол дээд оноо буурахгүй', async () => {
    const reg = await newRegistration();

    const first = await startAttempt(reg.id);
    if (!first.ok) throw new Error(first.error);
    const good = first.value.spawnSchedule.filter((i) => i.kind === 'good').slice(0, 10);
    await submitReaction(first.value.attemptId, good.map((i) => ({ id: i.id, t: i.t + 50 })));
    const r1 = await finishAttempt(first.value.attemptId);

    const second = await startAttempt(reg.id);
    if (!second.ok) throw new Error(second.error);
    await submitReaction(second.value.attemptId, []);
    const r2 = await finishAttempt(second.value.attemptId);

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
