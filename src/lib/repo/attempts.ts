import {
  and, asc, eq, isNull, lt, sql,
} from 'drizzle-orm';
import { db } from '@/lib/db';
import { attempts, attemptAnswers, questions, registrations } from '@/lib/db/schema';
import { GAME, QUIZ, REACTION } from '@/lib/config';
import { mulberry32, pickN } from '@/lib/rng';
import {
  scoreAnswer, buildOptionOrder, applyOptionOrder, resolveChoice,
} from '@/lib/quiz';
import { generateSpawnSchedule, scoreTaps, type SpawnItem, type Tap } from '@/lib/reaction';
import { totalScore } from '@/lib/scoring';
import type { Result } from '@/lib/validation';

const fail = (error: string): Result<never> => ({ ok: false, error });

/** `db.transaction`-ий callback-д өгөгдөх гүйлгээний бариул (tx) — db-тэй ижил query API-тай. */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** `db` эсвэл түүний `tx` — query ажиллуулах аль ч бариулыг хүлээн авдаг функцэд зориулав. */
type Exec = typeof db | Tx;

/** 30 минутаас удсан in_progress оролдлогыг хүчингүй болгож, оролдлогын тоог буцаана. */
async function expireStaleAttempts(tx: Tx, registrationId: string): Promise<void> {
  const cutoff = new Date(Date.now() - GAME.ATTEMPT_TIMEOUT_MS);
  const stale = await tx.update(attempts)
    .set({ status: 'invalid', finishedAt: new Date() })
    .where(and(
      eq(attempts.registrationId, registrationId),
      eq(attempts.status, 'in_progress'),
      lt(attempts.startedAt, cutoff),
    ))
    .returning({ id: attempts.id });

  if (stale.length > 0) {
    await tx.update(registrations)
      .set({ attemptsUsed: sql`GREATEST(0, ${registrations.attemptsUsed} - ${stale.length})` })
      .where(eq(registrations.id, registrationId));
  }
}

export async function startAttempt(registrationId: string): Promise<Result<{
  attemptId: string;
  spawnSchedule: SpawnItem[];
  answered: number;
  reactionDone: boolean;
}>> {
  // Бүхэл шийдвэрийг нэг гүйлгээнд, тухайн бүртгэлийн мөрийг FOR UPDATE-ээр түгжсэн
  // байдлаар гүйцэтгэнэ. Ингэснээр нэг тоглогчийн зэрэг ирсэн startAttempt хүсэлтүүд
  // энэ мөр дээр дараалж, зөвхөн нэг нь шинэ оролдлого үүсгэнэ — бусад нь үүнийг
  // үргэлжлүүлнэ. Өөр бүртгэлүүд хоорондоо түгждэггүй (зөвхөн тухайн мөрийн түгжээ).
  //
  // ТҮГЖЭЭНИЙ ДАРААЛАЛ: registrations ЭХЭЛЖ, дараа нь attempts — ЯМАГТ.
  // (registrations before attempts, always.) finishAttempt ч яг энэ дарааллыг
  // баримталдаг тул хоёр transaction эсрэг чиглэлд түгжиж, Postgres deadlock
  // үүсгэх боломжгүй.
  return db.transaction(async (tx) => {
    const [reg] = await tx.select().from(registrations)
      .where(eq(registrations.id, registrationId)).for('update').limit(1);
    if (!reg) return fail('Бүртгэл олдсонгүй');

    await expireStaleAttempts(tx, registrationId);

    // expireStaleAttempts нь attemptsUsed-ийг өөрчилсөн байж болох тул дахин уншина.
    const [freshReg] = await tx.select().from(registrations)
      .where(eq(registrations.id, registrationId)).limit(1);

    // Дуусаагүй оролдлого байвал үргэлжлүүлнэ.
    const [open] = await tx.select().from(attempts)
      .where(and(eq(attempts.registrationId, registrationId), eq(attempts.status, 'in_progress')))
      .limit(1);

    if (open) {
      const answered = await countAnswered(tx, open.id);
      return {
        ok: true,
        value: {
          attemptId: open.id,
          spawnSchedule: generateSpawnSchedule(open.seed),
          answered,
          reactionDone: open.reactionDone,
        },
      };
    }

    if (freshReg.attemptsUsed >= GAME.MAX_ATTEMPTS) {
      return fail(`Та ${GAME.MAX_ATTEMPTS} оролдлогоо бүрэн ашигласан байна`);
    }

    const pool = await tx.select({ id: questions.id }).from(questions)
      .where(eq(questions.active, true));
    if (pool.length < QUIZ.QUESTION_COUNT) {
      return fail('Асуултын сан хүрэлцэхгүй байна');
    }

    const seed = Math.floor(Math.random() * 2_147_483_647);
    const questionIds = pickN(pool.map((q) => q.id), QUIZ.QUESTION_COUNT, mulberry32(seed));

    const [created] = await tx.insert(attempts)
      .values({ registrationId, seed, questionIds })
      .returning();
    await tx.update(registrations)
      .set({ attemptsUsed: sql`${registrations.attemptsUsed} + 1` })
      .where(eq(registrations.id, registrationId));

    return {
      ok: true,
      value: {
        attemptId: created.id,
        spawnSchedule: generateSpawnSchedule(seed),
        answered: 0,
        reactionDone: false,
      },
    };
  });
}

async function countAnswered(tx: Tx, attemptId: string): Promise<number> {
  const rows = await tx.select({ id: attemptAnswers.id }).from(attemptAnswers)
    .where(and(eq(attemptAnswers.attemptId, attemptId), sql`${attemptAnswers.answeredAt} IS NOT NULL`));
  return rows.length;
}

export type ServedQuestion = {
  position: number;
  total: number;
  questionId: number;
  text: string;
  options: string[];
  timeLimitMs: number;
};

export async function serveNextQuestion(
  attemptId: string,
): Promise<Result<ServedQuestion | null>> {
  // serveNextQuestion нь зөвхөн attempts болон attempt_answers хүснэгтэд хандана,
  // registrations-д огт хүрэхгүй тул "registrations ЭХЭЛЖ, дараа нь attempts — ЯМАГТ"
  // гэсэн (startAttempt/finishAttempt-ийн) түгжээний дарааллыг эвдэх эрсдэлгүй.
  //
  // Бүх шийдвэрийг нэг гүйлгээнд, тухайн attempt мөрийг FOR UPDATE-ээр түгжсэн
  // байдлаар гүйцэтгэнэ. Ингэснээр нэг оролдлогод зэрэг ирсэн serveNextQuestion
  // хүсэлтүүд дараалж, зөвхөн нэг нь шинэ асуулт үүсгэнэ — бусад нь ижил (pending)
  // асуултыг буцаана. Өөр attempt-үүд хоорондоо түгждэггүй.
  return db.transaction(async (tx) => {
    const [attempt] = await tx.select().from(attempts)
      .where(eq(attempts.id, attemptId)).for('update').limit(1);
    if (!attempt) return fail('Оролдлого олдсонгүй');
    if (attempt.status !== 'in_progress') return fail('Энэ оролдлого дууссан байна');

    const served = await tx.select().from(attemptAnswers)
      .where(eq(attemptAnswers.attemptId, attemptId))
      .orderBy(asc(attemptAnswers.position));

    // Хариулаагүй асуулт байвал ижлийг нь буцаана (refresh хийсэн тохиолдол,
    // эсвэл зэрэг ирсэн хүсэлтийн хоёр дахь нь).
    const pending = served.find((a) => a.answeredAt === null);
    if (pending) {
      const q = await loadQuestion(tx, pending.questionId);
      if (!q) return fail('Асуулт олдсонгүй');
      return {
        ok: true,
        value: {
          position: pending.position,
          total: QUIZ.QUESTION_COUNT,
          questionId: q.id,
          text: q.text,
          options: applyOptionOrder(q.options, pending.optionOrder),
          timeLimitMs: QUIZ.TIME_LIMIT_MS,
        },
      };
    }

    const position = served.length + 1;
    if (position > QUIZ.QUESTION_COUNT) return { ok: true, value: null };

    const questionId = attempt.questionIds[position - 1];
    const q = await loadQuestion(tx, questionId);
    if (!q) return fail('Асуулт олдсонгүй');

    const rng = mulberry32(attempt.seed + position);
    const optionOrder = buildOptionOrder(q.options.length, rng);

    await tx.insert(attemptAnswers).values({
      attemptId, questionId, position, optionOrder, servedAt: new Date(),
    });

    return {
      ok: true,
      value: {
        position,
        total: QUIZ.QUESTION_COUNT,
        questionId: q.id,
        text: q.text,
        options: applyOptionOrder(q.options, optionOrder),
        timeLimitMs: QUIZ.TIME_LIMIT_MS,
      },
    };
  });
}

async function loadQuestion(exec: Exec, id: number) {
  const [q] = await exec.select().from(questions).where(eq(questions.id, id)).limit(1);
  return q ?? null;
}

export async function submitAnswer(
  attemptId: string,
  questionId: number,
  shownIndex: number,
): Promise<Result<{ isCorrect: boolean; points: number }>> {
  // submitAnswer нь зөвхөн attempts болон attempt_answers хүснэгтэд хандана,
  // registrations-д огт хүрэхгүй тул "registrations ЭХЭЛЖ, дараа нь attempts — ЯМАГТ"
  // гэсэн (startAttempt/finishAttempt/serveNextQuestion-ийн) түгжээний дарааллыг
  // эвдэх эрсдэлгүй.
  //
  // Бүх шийдвэрийг нэг гүйлгээнд, тухайн attempt мөрийг FOR UPDATE-ээр түгжсэн
  // байдлаар гүйцэтгэнэ. Ингэснээр нэг асуултад зэрэг ирсэн submitAnswer хүсэлтүүд
  // дараалж, зөвхөн нэг нь оноо тооцож бичнэ — бусад нь (түгжээ суллагдсаны дараа
  // answeredAt аль хэдийн тавигдсаныг хараад) "аль хэдийн хариулсан" гэсэн алдаа
  // буцаана, isCorrect тооцохгүй. Үгүй бол энэ зам "хариулт оракул" болж, зэрэг
  // ирсэн олон хүсэлт бүр өөрийн isCorrect-ийг хүлээн авч зөв хариултыг илрүүлэх
  // боломжтой болдог байв.
  return db.transaction(async (tx) => {
    const [attempt] = await tx.select().from(attempts)
      .where(eq(attempts.id, attemptId)).for('update').limit(1);
    if (!attempt) return fail('Оролдлого олдсонгүй');
    if (attempt.status !== 'in_progress') return fail('Энэ оролдлого дууссан байна');

    // attempts мөрийг түгжсэний дараа attempt_answers мөрийг дахин уншиж,
    // "хариулаагүй" төлөвийг хамгийн сүүлийн үнэн эх сурвалжаас баталгаажуулна.
    const [row] = await tx.select().from(attemptAnswers)
      .where(and(
        eq(attemptAnswers.attemptId, attemptId),
        eq(attemptAnswers.questionId, questionId),
        isNull(attemptAnswers.answeredAt),
      )).limit(1);
    if (!row) return fail('Энэ асуулт өгөгдөөгүй эсвэл аль хэдийн хариулсан байна');

    const q = await loadQuestion(tx, questionId);
    if (!q) return fail('Асуулт олдсонгүй');

    const answeredAt = new Date();
    const elapsedMs = answeredAt.getTime() - row.servedAt.getTime();
    const originalIndex = resolveChoice(row.optionOrder, shownIndex);
    const isCorrect = originalIndex === q.correctIndex;
    const points = scoreAnswer(isCorrect, elapsedMs);

    await tx.update(attemptAnswers)
      .set({ answeredAt, choiceIndex: originalIndex, isCorrect, points })
      .where(eq(attemptAnswers.id, row.id));

    return { ok: true, value: { isCorrect, points } };
  });
}

export async function submitReaction(
  attemptId: string,
  taps: Tap[],
): Promise<Result<{ reactionScore: number }>> {
  if (!Array.isArray(taps)) return fail('Tap өгөгдөл буруу байна');
  if (taps.length > REACTION.MAX_TAPS) return fail('Хэт олон tap илгээгдлээ');

  const [attempt] = await db.select().from(attempts).where(eq(attempts.id, attemptId)).limit(1);
  if (!attempt) return fail('Оролдлого олдсонгүй');
  if (attempt.status !== 'in_progress') return fail('Энэ оролдлого дууссан байна');
  if (attempt.reactionDone) return fail('Reaction аль хэдийн илгээгдсэн байна');

  const schedule = generateSpawnSchedule(attempt.seed);
  const { score } = scoreTaps(schedule, taps);

  await db.update(attempts)
    .set({ reactionScore: score, reactionDone: true })
    .where(eq(attempts.id, attemptId));

  return { ok: true, value: { reactionScore: score } };
}

export async function finishAttempt(attemptId: string): Promise<Result<{
  totalScore: number; quizScore: number; reactionScore: number; bestScore: number;
}>> {
  // registrationId-г мэдэхийн тулд attempts-ээс урьдчилж уншина — энэ нь түгжээгүй,
  // transaction-оос гадуурх энгийн SELECT тул дарааллын баталгаанд нөлөөлөхгүй.
  const [existing] = await db.select({ registrationId: attempts.registrationId })
    .from(attempts).where(eq(attempts.id, attemptId)).limit(1);
  if (!existing) return fail('Оролдлого олдсонгүй');

  // ТҮГЖЭЭНИЙ ДАРААЛАЛ: registrations ЭХЭЛЖ, дараа нь attempts — ЯМАГТ.
  // (registrations before attempts, always.) startAttempt-тэй ижил дарааллыг
  // баримталж, эсрэг чиглэлийн түгжээнээс Postgres deadlock үүсэхээс сэргийлнэ.
  return db.transaction(async (tx) => {
    const [reg] = await tx.select().from(registrations)
      .where(eq(registrations.id, existing.registrationId)).for('update').limit(1);
    if (!reg) return fail('Бүртгэл олдсонгүй');

    // registrations мөрийг түгжсэний дараа attempts мөрийг дахин уншиж, хамгийн сүүлийн
    // (тухайлбал давхар finishAttempt дуудлагын эсрэг) төлөвийг баталгаажуулна.
    const [attempt] = await tx.select().from(attempts)
      .where(eq(attempts.id, attemptId)).limit(1);
    if (!attempt) return fail('Оролдлого олдсонгүй');
    if (attempt.status !== 'in_progress') return fail('Энэ оролдлого аль хэдийн дууссан байна');

    const answers = await tx.select({ points: attemptAnswers.points }).from(attemptAnswers)
      .where(eq(attemptAnswers.attemptId, attemptId));
    const quizScore = answers.reduce((sum, a) => sum + a.points, 0);
    const total = totalScore(quizScore, attempt.reactionScore);
    const finishedAt = new Date();

    await tx.update(attempts).set({
      status: 'completed', quizScore, totalScore: total, finishedAt,
    }).where(eq(attempts.id, attemptId));

    let bestScore = reg.bestScore;
    if (total > reg.bestScore) {
      await tx.update(registrations)
        .set({ bestScore: total, bestFinishedAt: finishedAt })
        .where(eq(registrations.id, existing.registrationId));
      bestScore = total;
    }

    return {
      ok: true,
      value: { totalScore: total, quizScore, reactionScore: attempt.reactionScore, bestScore },
    };
  });
}
