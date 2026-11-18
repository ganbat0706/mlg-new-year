import {
  and, asc, eq, isNull, lt, sql,
} from 'drizzle-orm';
import { db } from '@/lib/db';
import { attempts, attemptAnswers, questions, registrations } from '@/lib/db/schema';
import {
  GAME, QUIZ, SORT, STACK, MEMO, PLAY,
} from '@/lib/config';
import { mulberry32, pickN } from '@/lib/rng';
import {
  scoreAnswer, buildOptionOrder, applyOptionOrder, resolveChoice,
} from '@/lib/quiz';
import {
  generateSortSchedule, scoreSort, maxSortScore, type SortItem, type SortEvent,
} from '@/lib/games/sort';
import {
  generateStackSchedule, scoreStack, maxStackScore, type StackLevel, type StackEvent,
} from '@/lib/games/stack';
import {
  generateMemoSchedule, scoreMemo, maxMemoScore, type MemoEvent,
} from '@/lib/games/memo';
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
  sortSchedule: SortItem[];
  stackSchedule: StackLevel[];
  memoSchedule: number[];
  answered: number;
  sortDone: boolean;
  stackDone: boolean;
  memoDone: boolean;
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
          sortSchedule: generateSortSchedule(open.seed),
          stackSchedule: generateStackSchedule(open.seed),
          memoSchedule: generateMemoSchedule(open.seed),
          answered,
          sortDone: open.sortDone,
          stackDone: open.stackDone,
          memoDone: open.memoDone,
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
        sortSchedule: generateSortSchedule(seed),
        stackSchedule: generateStackSchedule(seed),
        memoSchedule: generateMemoSchedule(seed),
        answered: 0,
        sortDone: false,
        stackDone: false,
        memoDone: false,
      },
    };
  });
}

/**
 * Сэжигтэй (flagged) оролдлоготой бүртгэлүүдийг, учир шалтгааны хамт буцаана.
 * Нэг бүртгэлд хэд хэдэн flagged оролдлого байж болох тул шалтгаануудыг
 * нэгтгэнэ (давхцсан мөрийг алгасна) — админ хуудас болон CSV экспортод
 * ашиглана (анти-чит хэлхээний сүүлчийн холбоос, п.5).
 */
export async function listFlaggedReasons(): Promise<Map<string, string[]>> {
  const rows = await db.select({
    registrationId: attempts.registrationId,
    flagReason: attempts.flagReason,
  }).from(attempts).where(eq(attempts.flagged, true));

  const byReg = new Map<string, string[]>();
  for (const r of rows) {
    const reason = r.flagReason ?? 'Тодорхойгүй шалтгаан';
    const existing = byReg.get(r.registrationId) ?? [];
    if (!existing.includes(reason)) existing.push(reason);
    byReg.set(r.registrationId, existing);
  }
  return byReg;
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

/** Phase 2-ын гурван шинэ тоглоом (P2-3). */
export type GameName = 'sort' | 'stack' | 'memo';

/** Олон шалтгаан хуримтлагдаж болох тул хоосон бол шинээр, үгүй бол "; "-ээр залгана. */
function appendReason(existing: string | null, reason: string): string {
  return existing ? `${existing}; ${reason}` : reason;
}

/**
 * Тухайн тоглоомын серверийн wall-clock эхлэх цагийг тэмдэглэнэ. Үйлдлийн
 * жагсаалт дотоод `t` утгуудад итгэхгүй байхын цорын ганц учир — script бүх
 * `t`-г зөв зайтай хуурамчаар зохиож, хуваарийг шууд (0 секундэд) тоглож
 * чадна. Submit үед энэ цагаас хойш БОДИТООР хэд секунд өнгөрснийг шалгана.
 *
 * submitSort/submitStack/submitMemo-той адил зөвхөн attempts хүснэгтэд
 * хандана, registrations-д огт хүрэхгүй тул "registrations ЭХЭЛЖ, дараа нь
 * attempts — ЯМАГТ" гэсэн түгжээний дарааллыг эвдэх эрсдэлгүй.
 */
export async function beginGame(
  attemptId: string,
  game: GameName,
): Promise<Result<{ startedAt: string }>> {
  return db.transaction(async (tx) => {
    const [attempt] = await tx.select().from(attempts)
      .where(eq(attempts.id, attemptId)).for('update').limit(1);
    if (!attempt) return fail('Оролдлого олдсонгүй');
    if (attempt.status !== 'in_progress') return fail('Энэ оролдлого дууссан байна');

    const done = game === 'sort' ? attempt.sortDone
      : game === 'stack' ? attempt.stackDone
        : attempt.memoDone;
    if (done) return fail('Энэ тоглоом аль хэдийн илгээгдсэн байна');

    const startedAt = new Date();
    if (game === 'sort') {
      await tx.update(attempts).set({ sortStartedAt: startedAt }).where(eq(attempts.id, attemptId));
    } else if (game === 'stack') {
      await tx.update(attempts).set({ stackStartedAt: startedAt }).where(eq(attempts.id, attemptId));
    } else {
      await tx.update(attempts).set({ memoStartedAt: startedAt }).where(eq(attempts.id, attemptId));
    }

    return { ok: true, value: { startedAt: startedAt.toISOString() } };
  });
}

export async function submitSort(
  attemptId: string,
  events: SortEvent[],
): Promise<Result<{ score: number; maxScore: number; flagged: boolean }>> {
  // submitSort/submitStack/submitMemo нь зөвхөн attempts хүснэгтэд хандана,
  // registrations-д огт хүрэхгүй тул "registrations ЭХЭЛЖ, дараа нь attempts —
  // ЯМАГТ" гэсэн (startAttempt/finishAttempt-ийн) түгжээний дарааллыг эвдэх
  // эрсдэлгүй.
  //
  // Бүх шийдвэрийг нэг гүйлгээнд, тухайн attempt мөрийг FOR UPDATE-ээр
  // түгжсэн байдлаар гүйцэтгэнэ. Ингэснээр нэг тоглоомд зэрэг ирсэн submit
  // хүсэлтүүд дараалж, зөвхөн нэг нь оноо бичнэ — бусад нь (түгжээ суллагдсаны
  // дараа sortDone аль хэдийн true болсныг хараад) татгалзана. Үгүй бол энэ
  // нь projectийн давтсан алдаа — score inflation bug — болох байв.
  return db.transaction(async (tx) => {
    const [attempt] = await tx.select().from(attempts)
      .where(eq(attempts.id, attemptId)).for('update').limit(1);
    if (!attempt) return fail('Оролдлого олдсонгүй');
    if (attempt.status !== 'in_progress') return fail('Энэ оролдлого дууссан байна');
    if (attempt.sortDone) return fail('Энэ тоглоом аль хэдийн илгээгдсэн байна');
    if (!attempt.sortStartedAt) return fail('Тоглоом эхлээгүй байна (begin дуудагдаагүй)');

    const schedule = generateSortSchedule(attempt.seed);
    const elapsedMs = Date.now() - attempt.sortStartedAt.getTime();

    let flagged = attempt.flagged;
    let flagReason = attempt.flagReason;
    let score: number;

    if (elapsedMs < SORT.DURATION_MS * PLAY.MIN_ELAPSED_RATIO) {
      // Бодитоор хангалттай хугацаа өнгөрөөгүй — хүн энэ хурдаар тоглох
      // боломжгүй. Бүхэл оролдлогыг татгалзахгүй, зөвхөн энэ тоглоомыг 0
      // болгож, тэмдэглэнэ (шагнахаас өмнө админ шалгана).
      score = 0;
      flagged = true;
      flagReason = appendReason(flagReason, 'sort: бодит хугацаа хэт богино (боломжгүй хурд)');
    } else {
      const result = scoreSort(schedule, events);
      score = result.score;
      if (result.suspicious) {
        flagged = true;
        flagReason = appendReason(flagReason, 'sort: үйлдлийн доод зай (200мс) зөрчигдсөн');
      }
    }

    await tx.update(attempts)
      .set({
        sortScore: score, sortDone: true, flagged, flagReason,
      })
      .where(eq(attempts.id, attemptId));

    return { ok: true, value: { score, maxScore: maxSortScore(schedule), flagged } };
  });
}

export async function submitStack(
  attemptId: string,
  events: StackEvent[],
): Promise<Result<{ score: number; maxScore: number; flagged: boolean }>> {
  // Тайлбар: submitSort-той ижил — зөвхөн attempts хүснэгтэд хандана, нэг
  // гүйлгээнд attempt мөрийг FOR UPDATE-ээр түгжиж, төлвийг ТҮГЖЭЭНИЙ ДОТОР
  // дахин шалгана.
  return db.transaction(async (tx) => {
    const [attempt] = await tx.select().from(attempts)
      .where(eq(attempts.id, attemptId)).for('update').limit(1);
    if (!attempt) return fail('Оролдлого олдсонгүй');
    if (attempt.status !== 'in_progress') return fail('Энэ оролдлого дууссан байна');
    if (attempt.stackDone) return fail('Энэ тоглоом аль хэдийн илгээгдсэн байна');
    if (!attempt.stackStartedAt) return fail('Тоглоом эхлээгүй байна (begin дуудагдаагүй)');

    const schedule = generateStackSchedule(attempt.seed);
    const elapsedMs = Date.now() - attempt.stackStartedAt.getTime();

    let flagged = attempt.flagged;
    let flagReason = attempt.flagReason;
    let score: number;

    if (elapsedMs < STACK.DURATION_MS * PLAY.MIN_ELAPSED_RATIO) {
      score = 0;
      flagged = true;
      flagReason = appendReason(flagReason, 'stack: бодит хугацаа хэт богино (боломжгүй хурд)');
    } else {
      const result = scoreStack(schedule, events);
      score = result.score;
      if (result.suspicious) {
        flagged = true;
        flagReason = appendReason(flagReason, 'stack: үйлдлийн доод зай (200мс) зөрчигдсөн');
      }
    }

    await tx.update(attempts)
      .set({
        stackScore: score, stackDone: true, flagged, flagReason,
      })
      .where(eq(attempts.id, attemptId));

    return { ok: true, value: { score, maxScore: maxStackScore(schedule), flagged } };
  });
}

export async function submitMemo(
  attemptId: string,
  events: MemoEvent[],
): Promise<Result<{ score: number; maxScore: number; flagged: boolean }>> {
  // Тайлбар: submitSort-той ижил — зөвхөн attempts хүснэгтэд хандана, нэг
  // гүйлгээнд attempt мөрийг FOR UPDATE-ээр түгжиж, төлвийг ТҮГЖЭЭНИЙ ДОТОР
  // дахин шалгана.
  return db.transaction(async (tx) => {
    const [attempt] = await tx.select().from(attempts)
      .where(eq(attempts.id, attemptId)).for('update').limit(1);
    if (!attempt) return fail('Оролдлого олдсонгүй');
    if (attempt.status !== 'in_progress') return fail('Энэ оролдлого дууссан байна');
    if (attempt.memoDone) return fail('Энэ тоглоом аль хэдийн илгээгдсэн байна');
    if (!attempt.memoStartedAt) return fail('Тоглоом эхлээгүй байна (begin дуудагдаагүй)');

    const schedule = generateMemoSchedule(attempt.seed);
    const elapsedMs = Date.now() - attempt.memoStartedAt.getTime();

    let flagged = attempt.flagged;
    let flagReason = attempt.flagReason;
    let score: number;

    if (elapsedMs < MEMO.DURATION_MS * PLAY.MIN_ELAPSED_RATIO) {
      score = 0;
      flagged = true;
      flagReason = appendReason(flagReason, 'memo: бодит хугацаа хэт богино (боломжгүй хурд)');
    } else {
      const result = scoreMemo(schedule, events);
      score = result.score;
      if (result.suspicious) {
        flagged = true;
        flagReason = appendReason(flagReason, 'memo: үйлдлийн доод зай (200мс) зөрчигдсөн');
      }
      if (result.perfect) {
        // Алдаагүй (10,000-д 1 удаа тохиолдоход зохистой) дуусгавал — боломжтой ч
        // ховор тул админ шалгахын тулд тэмдэглэнэ, оноог хасахгүй.
        flagged = true;
        flagReason = appendReason(flagReason, 'memo: алдаагүй дууссан (хэтэрхий төгс)');
      }
    }

    await tx.update(attempts)
      .set({
        memoScore: score, memoDone: true, flagged, flagReason,
      })
      .where(eq(attempts.id, attemptId));

    return { ok: true, value: { score, maxScore: maxMemoScore(schedule), flagged } };
  });
}

export async function finishAttempt(attemptId: string): Promise<Result<{
  totalScore: number;
  quizScore: number;
  sortScore: number;
  stackScore: number;
  memoScore: number;
  bestScore: number;
  flagged: boolean;
  /** Оноо буух мөчийг (score-reveal) "Шинэ дээд амжилт" эсэхийг шийдэхэд
   * ашиглана — энэ бол хэдэн дэх оролдлого вэ (эхний оролдлого шинэ дээд
   * амжилт болох нь мэдээж тул тоолохгүй). */
  attemptsUsed: number;
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
    // Phase 2: totalScore = quiz + sort + stack + memo (reaction тоглоом устгагдсан).
    const total = totalScore(quizScore, attempt.sortScore, attempt.stackScore, attempt.memoScore);
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
      value: {
        totalScore: total,
        quizScore,
        sortScore: attempt.sortScore,
        stackScore: attempt.stackScore,
        memoScore: attempt.memoScore,
        bestScore,
        flagged: attempt.flagged,
        attemptsUsed: reg.attemptsUsed,
      },
    };
  });
}
