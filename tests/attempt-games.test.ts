import { describe, it, expect, beforeEach } from 'vitest';
import {
  startAttempt, beginGame, submitSort, submitStack, submitMemo, finishAttempt,
} from '@/lib/repo/attempts';
import { registerOrGet } from '@/lib/repo/registrations';
import { resetDb, seedQuestions } from './helpers/db';
import { SORT, STACK, MEMO, PLAY } from '@/lib/config';
import { db } from '@/lib/db';
import { attempts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { scoreSort, maxSortScore, type SortItem, type SortEvent, type SortLane } from '@/lib/games/sort';
import { maxStackScore, type StackLevel, type StackEvent } from '@/lib/games/stack';

const input = {
  lastName: 'батхүү', firstName: 'ганбат',
  department: 'Мэдээллийн технологи', phone: '88112233',
};

async function newRegistration(phone = '88112233') {
  const r = await registerOrGet({ ...input, phone });
  if (!r.ok) throw new Error(r.error);
  return r.value;
}

/** Шинэ attempt үүсгэж, гурван тоглоомын хуваарийн хамт буцаана. */
async function freshAttempt() {
  const reg = await newRegistration();
  const r = await startAttempt(reg.id);
  if (!r.ok) throw new Error(r.error);
  return r.value;
}

/** Тухайн тоглоомын StartedAt баганыг өнгөрсөн рүү түлхэж, "хангалттай цаг өнгөрсөн" нөхцөлийг хиймлээр үүсгэнэ. */
async function backdateStart(attemptId: string, column: 'sortStartedAt' | 'stackStartedAt' | 'memoStartedAt', durationMs: number) {
  await db.update(attempts)
    .set({ [column]: new Date(Date.now() - durationMs - 500) })
    .where(eq(attempts.id, attemptId));
}

/** Хуваарийн дагуу бүх зүйлийг зөв, дарааллаар, аюулгүй зайтай дарах sort events үүсгэнэ. */
function playSortCorrectly(schedule: readonly SortItem[]): SortEvent[] {
  return schedule.map((item, i) => ({
    id: item.id,
    lane: (item.damaged ? 'return' : item.mode) as SortLane,
    t: (i + 1) * (PLAY.MIN_EVENT_GAP_MS + 50),
  }));
}

/** cranePosition-ийн томьёог урвуулж, target байрлалд хүрэх elapsedMs-ийг олно. */
function elapsedForPosition(level: StackLevel, target: number): number {
  const { periodMs, startPhase, direction } = level;
  const half = periodMs / 2;
  const m = ((target - 10) / 80) * half;
  let elapsed = direction * (m - startPhase);
  elapsed = ((elapsed % periodMs) + periodMs) % periodMs;
  return elapsed;
}

/** Хуваарийн бүх түвшинг яг төвд нь (centre=50 хэвээр) буулгах stack events үүсгэнэ. */
function playStackPerfectly(schedule: readonly StackLevel[]): StackEvent[] {
  const events: StackEvent[] = [];
  let openAt = 0;
  for (const level of schedule) {
    const elapsed = elapsedForPosition(level, 50);
    const t = Math.max(openAt + elapsed, openAt);
    events.push({ level: level.level, t });
    openAt = t + STACK.DROP_MS;
  }
  return events;
}

/** schedule-ийн хос бүрийг дараалан, зөв (хэзээ ч алдаагүй) тоглох memo events үүсгэнэ. */
function playMemoAllCorrectly(schedule: readonly number[]): { card: number; t: number }[] {
  const byValue = new Map<number, number[]>();
  schedule.forEach((value, idx) => {
    const arr = byValue.get(value) ?? [];
    arr.push(idx);
    byValue.set(value, arr);
  });
  const events: { card: number; t: number }[] = [];
  let t = 0;
  const gap = PLAY.MIN_EVENT_GAP_MS + 50;
  for (const positions of byValue.values()) {
    const [a, b] = positions;
    t += gap;
    events.push({ card: a, t });
    t += gap;
    events.push({ card: b, t });
  }
  return events;
}

beforeEach(async () => {
  await resetDb();
  await seedQuestions(15);
});

describe('beginGame', () => {
  it('тухайн тоглоомын StartedAt-ийг тэмдэглэнэ', async () => {
    const a = await freshAttempt();
    const before = Date.now();
    const r = await beginGame(a.attemptId, 'sort');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(new Date(r.value.startedAt).getTime()).toBeGreaterThanOrEqual(before);

    const [row] = await db.select().from(attempts).where(eq(attempts.id, a.attemptId));
    expect(row.sortStartedAt).not.toBeNull();
    expect(row.stackStartedAt).toBeNull();
    expect(row.memoStartedAt).toBeNull();
  });

  it('аль хэдийн илгээгдсэн тоглоомд begin хийхийг татгалзана', async () => {
    const a = await freshAttempt();
    await backdateStart(a.attemptId, 'sortStartedAt', SORT.DURATION_MS);
    await submitSort(a.attemptId, playSortCorrectly(a.sortSchedule));

    const r = await beginGame(a.attemptId, 'sort');
    expect(r.ok).toBe(false);
  });

  it('байхгүй оролдлогод татгалзана', async () => {
    const r = await beginGame('00000000-0000-0000-0000-000000000000', 'sort');
    expect(r.ok).toBe(false);
  });
});

describe('submitSort — цагийн хамгаалалт', () => {
  it('begin дуудагдаагүй бол татгалзана', async () => {
    const a = await freshAttempt();
    const r = await submitSort(a.attemptId, playSortCorrectly(a.sortSchedule));
    expect(r.ok).toBe(false);
  });

  it('бодит хугацаа хэтэрхий богино бол 0 оноо, flagged=true (оролдлогыг татгалзахгүй)', async () => {
    const a = await freshAttempt();
    const begin = await beginGame(a.attemptId, 'sort');
    expect(begin.ok).toBe(true);

    // begin дуудсан даруйдаа (бодит хугацаа бараг 0) бүтэн тоглоомыг илгээнэ —
    // энэ бол яг script-ийн хийдэг заль мэх: event-үүдийн дотоод t зөв боловч
    // бодит wall-clock хугацаа огт өнгөрөөгүй.
    const r = await submitSort(a.attemptId, playSortCorrectly(a.sortSchedule));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.score).toBe(0);
    expect(r.value.flagged).toBe(true);

    const [row] = await db.select().from(attempts).where(eq(attempts.id, a.attemptId));
    expect(row.sortDone).toBe(true);
    expect(row.sortScore).toBe(0);
    expect(row.flagged).toBe(true);
    expect(row.flagReason).toContain('sort');
  });

  it('хангалттай хугацаа өнгөрсний дараа жинхэнэ оноогоор тооцно', async () => {
    const a = await freshAttempt();
    await backdateStart(a.attemptId, 'sortStartedAt', SORT.DURATION_MS);

    const events = playSortCorrectly(a.sortSchedule);
    const expected = scoreSort(a.sortSchedule, events);
    const r = await submitSort(a.attemptId, events);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.score).toBe(expected.score);
    expect(r.value.score).toBe(maxSortScore(a.sortSchedule));
    expect(r.value.flagged).toBe(false);
  });

  it('browser-ийн илгээсэн хуваарьт БИШ, сервер өөрөө дахин үүсгэсэн хуваарьт итгэнэ', async () => {
    // events-ийг огт өөр (ямар ч seed-тэй холбоогүй) хуваариар зохиовол сервер
    // өөрийн generateSortSchedule(attempt.seed)-ээр дахин тооцдог тул оноо
    // "илгээсэн хуваарьт" тулгуурлахгүй.
    const a = await freshAttempt();
    await backdateStart(a.attemptId, 'sortStartedAt', SORT.DURATION_MS);

    const fakeSchedule: SortItem[] = a.sortSchedule.map((item) => ({ ...item, mode: 'rail', damaged: false }));
    const events = playSortCorrectly(fakeSchedule); // бодит серверийн хуваарьт тохироогүй байж магадгүй
    const expected = scoreSort(a.sortSchedule, events); // сервертэй ЯГ АДИЛ дахин тооцоолно
    const r = await submitSort(a.attemptId, events);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.score).toBe(expected.score);
  });

  it('давхар илгээхийг татгалзана', async () => {
    const a = await freshAttempt();
    await backdateStart(a.attemptId, 'sortStartedAt', SORT.DURATION_MS);
    const events = playSortCorrectly(a.sortSchedule);
    const first = await submitSort(a.attemptId, events);
    expect(first.ok).toBe(true);
    const second = await submitSort(a.attemptId, events);
    expect(second.ok).toBe(false);
  });
});

describe('submitStack / submitMemo — цагийн хамгаалалт', () => {
  it('submitStack: хэтэрхий богино хугацаанд илгээвэл 0 оноо, flagged', async () => {
    const a = await freshAttempt();
    await beginGame(a.attemptId, 'stack');
    const r = await submitStack(a.attemptId, playStackPerfectly(a.stackSchedule));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.score).toBe(0);
    expect(r.value.flagged).toBe(true);
  });

  it('submitStack: хангалттай хугацааны дараа жинхэнэ оноо', async () => {
    const a = await freshAttempt();
    await backdateStart(a.attemptId, 'stackStartedAt', STACK.DURATION_MS);
    const events = playStackPerfectly(a.stackSchedule);
    const r = await submitStack(a.attemptId, events);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.score).toBe(maxStackScore(a.stackSchedule));
    expect(r.value.flagged).toBe(false);
  });

  it('submitMemo: хэтэрхий богино хугацаанд илгээвэл 0 оноо, flagged', async () => {
    const a = await freshAttempt();
    await beginGame(a.attemptId, 'memo');
    const r = await submitMemo(a.attemptId, playMemoAllCorrectly(a.memoSchedule));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.score).toBe(0);
    expect(r.value.flagged).toBe(true);
  });

  it('submitMemo: хангалттай хугацааны дараа жинхэнэ оноо, алдаагүй дуусгавал "perfect" гэж flag тэмдэглэнэ', async () => {
    const a = await freshAttempt();
    await backdateStart(a.attemptId, 'memoStartedAt', MEMO.DURATION_MS);
    const events = playMemoAllCorrectly(a.memoSchedule);
    const r = await submitMemo(a.attemptId, events);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.score).toBeGreaterThan(0);
    // playMemoAllCorrectly хэзээ ч алдаа гаргадаггүй тул дуусгаваас "perfect" болно
    // (10,000-д 1 удаа тохиолддогтой тэнцэх ховор явдал) — сэжигтэй тул flagged.
    expect(r.value.flagged).toBe(true);

    const [row] = await db.select().from(attempts).where(eq(attempts.id, a.attemptId));
    expect(row.flagReason).toContain('memo');
    expect(row.flagReason).toContain('төгс');
  });

  it('submitStack: давхар илгээхийг татгалзана', async () => {
    const a = await freshAttempt();
    await backdateStart(a.attemptId, 'stackStartedAt', STACK.DURATION_MS);
    const events = playStackPerfectly(a.stackSchedule);
    await submitStack(a.attemptId, events);
    const second = await submitStack(a.attemptId, events);
    expect(second.ok).toBe(false);
  });

  it('submitMemo: давхар илгээхийг татгалзана', async () => {
    const a = await freshAttempt();
    await backdateStart(a.attemptId, 'memoStartedAt', MEMO.DURATION_MS);
    const events = playMemoAllCorrectly(a.memoSchedule);
    await submitMemo(a.attemptId, events);
    const second = await submitMemo(a.attemptId, events);
    expect(second.ok).toBe(false);
  });
});

describe('гурван тоглоомын зэрэгцээ (concurrency) submit — зөвхөн нэг нь амжилттай', () => {
  it('submitSort: зэрэг ирсэн 10 хүсэлтээс яг нэг л оноо бичнэ', async () => {
    const a = await freshAttempt();
    await backdateStart(a.attemptId, 'sortStartedAt', SORT.DURATION_MS);
    const events = playSortCorrectly(a.sortSchedule);

    const results = await Promise.all(
      Array.from({ length: 10 }, () => submitSort(a.attemptId, events)),
    );
    const succeeded = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);
    expect(succeeded.length).toBe(1);
    expect(failed.length).toBe(9);

    const [row] = await db.select().from(attempts).where(eq(attempts.id, a.attemptId));
    expect(row.sortDone).toBe(true);
    expect(row.sortScore).toBe(maxSortScore(a.sortSchedule));
  });

  it('submitStack: зэрэг ирсэн 10 хүсэлтээс яг нэг л оноо бичнэ', async () => {
    const a = await freshAttempt();
    await backdateStart(a.attemptId, 'stackStartedAt', STACK.DURATION_MS);
    const events = playStackPerfectly(a.stackSchedule);

    const results = await Promise.all(
      Array.from({ length: 10 }, () => submitStack(a.attemptId, events)),
    );
    expect(results.filter((r) => r.ok).length).toBe(1);
    expect(results.filter((r) => !r.ok).length).toBe(9);

    const [row] = await db.select().from(attempts).where(eq(attempts.id, a.attemptId));
    expect(row.stackDone).toBe(true);
    expect(row.stackScore).toBe(maxStackScore(a.stackSchedule));
  });

  it('submitMemo: зэрэг ирсэн 10 хүсэлтээс яг нэг л оноо бичнэ', async () => {
    const a = await freshAttempt();
    await backdateStart(a.attemptId, 'memoStartedAt', MEMO.DURATION_MS);
    const events = playMemoAllCorrectly(a.memoSchedule);

    const results = await Promise.all(
      Array.from({ length: 10 }, () => submitMemo(a.attemptId, events)),
    );
    expect(results.filter((r) => r.ok).length).toBe(1);
    expect(results.filter((r) => !r.ok).length).toBe(9);

    const [row] = await db.select().from(attempts).where(eq(attempts.id, a.attemptId));
    expect(row.memoDone).toBe(true);
  });
});

describe('finishAttempt — Phase 2 нийт оноо', () => {
  it('totalScore = quiz + sort + stack + memo', async () => {
    const a = await freshAttempt();

    await backdateStart(a.attemptId, 'sortStartedAt', SORT.DURATION_MS);
    const sortResult = await submitSort(a.attemptId, playSortCorrectly(a.sortSchedule));
    expect(sortResult.ok).toBe(true);

    await backdateStart(a.attemptId, 'stackStartedAt', STACK.DURATION_MS);
    const stackResult = await submitStack(a.attemptId, playStackPerfectly(a.stackSchedule));
    expect(stackResult.ok).toBe(true);

    await backdateStart(a.attemptId, 'memoStartedAt', MEMO.DURATION_MS);
    const memoResult = await submitMemo(a.attemptId, playMemoAllCorrectly(a.memoSchedule));
    expect(memoResult.ok).toBe(true);

    const r = await finishAttempt(a.attemptId);
    expect(r.ok).toBe(true);
    if (!r.ok || !sortResult.ok || !stackResult.ok || !memoResult.ok) return;

    expect(r.value.sortScore).toBe(sortResult.value.score);
    expect(r.value.stackScore).toBe(stackResult.value.score);
    expect(r.value.memoScore).toBe(memoResult.value.score);
    expect(r.value.totalScore).toBe(
      r.value.quizScore + sortResult.value.score + stackResult.value.score + memoResult.value.score,
    );
    // flagged — memo "perfect" тул энэ оролдлого flag-тай дуусна.
    expect(r.value.flagged).toBe(true);
  });
});
