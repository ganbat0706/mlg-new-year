import {
  and, eq, lt, ne, sql,
} from 'drizzle-orm';
import { db } from '@/lib/db';
import { attempts, registrations } from '@/lib/db/schema';
import {
  GAME, SORT, STACK, MEMO, DROP, PLAY,
} from '@/lib/config';
import {
  generateSortSchedule, scoreSort, maxSortScore, type SortItem, type SortEvent,
} from '@/lib/games/sort';
import {
  generateStackSchedule, scoreStack, maxStackScore, type StackLevel, type StackEvent,
} from '@/lib/games/stack';
import {
  generateMemoSchedule, scoreMemo, maxMemoScore, type MemoEvent,
} from '@/lib/games/memo';
import {
  generateDropSchedule, scoreDrop, maxDropScore, type DropSchedule, type DropEvent,
} from '@/lib/games/drop';
import { totalScore } from '@/lib/scoring';
import type { Result } from '@/lib/validation';
import { activeContest, type Contest } from '@/lib/contests';

const fail = (error: string): Result<never> => ({ ok: false, error });

/** `db.transaction`-ий callback-д өгөгдөх гүйлгээний бариул (tx) — db-тэй ижил query API-тай. */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];


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

export async function startAttempt(
  registrationId: string,
  /** Цагийг гаднаас өгөх боломжтой — тестэд тодорхой тэмцээний цонх дотор
   *  байрлуулахад, мөн «яг энэ мөчид аль тэмцээн нээлттэй вэ» гэдгийг
   *  нэг л газраас шийдэхэд хэрэгтэй. */
  now: Date = new Date(),
): Promise<Result<{
  attemptId: string;
  sortSchedule: SortItem[];
  stackSchedule: StackLevel[];
  memoSchedule: number[];
  dropSchedule: DropSchedule;
  sortDone: boolean;
  stackDone: boolean;
  memoDone: boolean;
  dropDone: boolean;
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
  // Тоглох боломжтой эсэх нь ЦАГААС хамаарна: яг одоо нээлттэй тэмцээн
  // байхгүй бол оролдлого огт үүсэхгүй. Үүнийг транзакцаас ГАДНА шалгана —
  // санд хандах шаардлагагүй.
  const contest: Contest | null = activeContest(now);
  if (!contest) return fail('Яг одоо нээлттэй тэмцээн алга байна');

  return db.transaction(async (tx) => {
    const [reg] = await tx.select().from(registrations)
      .where(eq(registrations.id, registrationId)).for('update').limit(1);
    if (!reg) return fail('Бүртгэл олдсонгүй');

    await expireStaleAttempts(tx, registrationId);

    // Дуусаагүй оролдлого байвал үргэлжлүүлнэ.
    const [open] = await tx.select().from(attempts)
      .where(and(
        eq(attempts.registrationId, registrationId),
        eq(attempts.contestId, contest.id),
        eq(attempts.status, 'in_progress'),
      ))
      .limit(1);

    if (open) {
      return {
        ok: true,
        value: {
          attemptId: open.id,
          sortSchedule: generateSortSchedule(open.seed),
          stackSchedule: generateStackSchedule(open.seed),
          memoSchedule: generateMemoSchedule(open.seed),
          dropSchedule: generateDropSchedule(open.seed),
          sortDone: open.sortDone,
          stackDone: open.stackDone,
          memoDone: open.memoDone,
          dropDone: open.dropDone,
        },
      };
    }

    /*
      Хязгаарыг бүртгэлийн НИЙТ тоогоор биш, ЭНЭ ТЭМЦЭЭН дэх оролдлогоор
      тооцно. Гурван тусдаа тэмцээн тул нэг тэмцээн дэх оролдлого нөгөөд
      нөлөөлөх ёсгүй. `attemptsUsed` багана нь админд харуулах нийт тоо
      болж үлдэнэ.
    */
    /*
      ХҮЧИНГҮЙ болсон оролдлого тоологдохгүй. `expireStaleAttempts` нь 30
      минутаас удсан дуусаагүй оролдлогыг `invalid` болгодог — сүлжээ
      тасарч дундаас нь гарсан хүн дахин тоглох ёстой. Үүнийг тооцохгүй
      бол тэр хүн тэмцээнээс бүрмөсөн хасагдана.
    */
    const used = await tx.select({ id: attempts.id }).from(attempts)
      .where(and(
        eq(attempts.registrationId, registrationId),
        eq(attempts.contestId, contest.id),
        ne(attempts.status, 'invalid'),
      ));
    if (used.length >= GAME.MAX_ATTEMPTS) {
      return fail(GAME.MAX_ATTEMPTS === 1
        ? 'Та энэ тэмцээнд аль хэдийн оролцсон байна'
        : `Та энэ тэмцээний ${GAME.MAX_ATTEMPTS} оролдлогоо бүрэн ашигласан байна`);
    }

    const seed = Math.floor(Math.random() * 2_147_483_647);

    const [created] = await tx.insert(attempts)
      .values({ registrationId, seed, contestId: contest.id })
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
        dropSchedule: generateDropSchedule(seed),
        sortDone: false,
        stackDone: false,
        memoDone: false,
        dropDone: false,
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

/** Гурван тоглоом. */
export type GameName = 'sort' | 'stack' | 'memo' | 'drop';

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
        : game === 'memo' ? attempt.memoDone
          : attempt.dropDone;
    if (done) return fail('Энэ тоглоом аль хэдийн илгээгдсэн байна');

    const startedAt = new Date();
    if (game === 'sort') {
      await tx.update(attempts).set({ sortStartedAt: startedAt }).where(eq(attempts.id, attemptId));
    } else if (game === 'stack') {
      await tx.update(attempts).set({ stackStartedAt: startedAt }).where(eq(attempts.id, attemptId));
    } else if (game === 'memo') {
      await tx.update(attempts).set({ memoStartedAt: startedAt }).where(eq(attempts.id, attemptId));
    } else {
      await tx.update(attempts).set({ dropStartedAt: startedAt }).where(eq(attempts.id, attemptId));
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

export async function submitDrop(
  attemptId: string,
  events: DropEvent[],
): Promise<Result<{ score: number; maxScore: number; flagged: boolean }>> {
  // submitSort/submitStack/submitMemo-той ижил: зөвхөн attempts хүснэгтэд
  // хандана, нэг гүйлгээнд attempt мөрийг FOR UPDATE-ээр түгжиж, төлвийг
  // ТҮГЖЭЭНИЙ ДОТОР дахин шалгана.
  return db.transaction(async (tx) => {
    const [attempt] = await tx.select().from(attempts)
      .where(eq(attempts.id, attemptId)).for('update').limit(1);
    if (!attempt) return fail('Оролдлого олдсонгүй');
    if (attempt.status !== 'in_progress') return fail('Энэ оролдлого дууссан байна');
    if (attempt.dropDone) return fail('Энэ тоглоом аль хэдийн илгээгдсэн байна');
    if (!attempt.dropStartedAt) return fail('Тоглоом эхлээгүй байна (begin дуудагдаагүй)');

    const schedule = generateDropSchedule(attempt.seed);
    const elapsedMs = Date.now() - attempt.dropStartedAt.getTime();

    let flagged = attempt.flagged;
    let flagReason = attempt.flagReason;
    let score: number;

    if (elapsedMs < DROP.DURATION_MS * PLAY.MIN_ELAPSED_RATIO) {
      score = 0;
      flagged = true;
      flagReason = appendReason(flagReason, 'drop: бодит хугацаа хэт богино (боломжгүй хурд)');
    } else {
      const result = scoreDrop(schedule, events);
      score = result.score;
      if (result.suspicious) {
        flagged = true;
        flagReason = appendReason(flagReason, 'drop: үйлдлийн доод зай (200мс) зөрчигдсөн');
      }
    }

    await tx.update(attempts)
      .set({
        dropScore: score, dropDone: true, flagged, flagReason,
      })
      .where(eq(attempts.id, attemptId));

    return { ok: true, value: { score, maxScore: maxDropScore(schedule), flagged } };
  });
}

export async function finishAttempt(attemptId: string): Promise<Result<{
  totalScore: number;
  sortScore: number;
  dropScore: number;
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

    // totalScore = sort + stack + memo + drop. Асуултын тоглоом хасагдсан.
    const total = totalScore(
      attempt.sortScore, attempt.stackScore, attempt.memoScore, attempt.dropScore,
    );
    const finishedAt = new Date();

    await tx.update(attempts).set({
      status: 'completed', totalScore: total, finishedAt,
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
        sortScore: attempt.sortScore,
        dropScore: attempt.dropScore,
        stackScore: attempt.stackScore,
        memoScore: attempt.memoScore,
        bestScore,
        flagged: attempt.flagged,
        attemptsUsed: reg.attemptsUsed,
      },
    };
  });
}
