import {
  beginGame, submitSort, submitStack, submitMemo, submitDrop, type GameName,
} from '@/lib/repo/attempts';
import { PLAY } from '@/lib/config';
import { ok, bad, boom, readJson } from '@/lib/http';
import type { SortEvent, SortLane } from '@/lib/games/sort';
import type { StackEvent } from '@/lib/games/stack';
import type { MemoEvent } from '@/lib/games/memo';
import type { DropEvent } from '@/lib/games/drop';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GAME_NAMES: readonly GameName[] = ['sort', 'stack', 'memo', 'drop'];

function isGameName(value: string): value is GameName {
  return (GAME_NAMES as readonly string[]).includes(value);
}

type Body = { begin?: boolean; events?: unknown[] };

/**
 * Browser-ээс ирэх `events`-ийг аюулгүйгээр типжүүлнэ. `lane`-ийн утгыг
 * `string`-ээс гадуур шалгахгүй — буруу/хуурамч утга зөвхөн `scoreSort`-д
 * «тохирохгүй» гэж тооцогдоно (WRONG_POINTS), аюулгүй байдлын цоорхой биш.
 */
function parseSortEvents(raw: unknown[]): SortEvent[] {
  return raw
    .filter((e): e is { id: number; lane: string; t: number } =>
      typeof e === 'object' && e !== null &&
      typeof (e as { id?: unknown }).id === 'number' &&
      typeof (e as { lane?: unknown }).lane === 'string' &&
      typeof (e as { t?: unknown }).t === 'number')
    .map((e) => ({ id: e.id, lane: e.lane as SortLane, t: e.t }));
}

function parseStackEvents(raw: unknown[]): StackEvent[] {
  return raw
    .filter((e): e is { level: number; t: number } =>
      typeof e === 'object' && e !== null &&
      typeof (e as { level?: unknown }).level === 'number' &&
      typeof (e as { t?: unknown }).t === 'number')
    .map((e) => ({ level: e.level, t: e.t }));
}

function parseMemoEvents(raw: unknown[]): MemoEvent[] {
  return raw
    .filter((e): e is { card: number; t: number } =>
      typeof e === 'object' && e !== null &&
      typeof (e as { card?: unknown }).card === 'number' &&
      typeof (e as { t?: unknown }).t === 'number')
    .map((e) => ({ card: e.card, t: e.t }));
}

function parseDropEvents(raw: unknown[]): DropEvent[] {
  return raw
    .filter((e): e is { index: number; t: number } =>
      typeof e === 'object' && e !== null &&
      typeof (e as { index?: unknown }).index === 'number' &&
      typeof (e as { t?: unknown }).t === 'number')
    .map((e) => ({ index: e.index, t: e.t }));
}

/**
 * Дөрвөн тоглоомын (sort/stack/memo/drop) ганц route. Хоёр хэлбэрийн body
 * хүлээн авна:
 *  - `{ begin: true }` — тухайн тоглоомын серверийн эхлэх цагийг тэмдэглэнэ.
 *  - `{ events: [...] }` — үйлдлийн жагсаалтыг дахин тоглож оноо тооцно.
 *
 * `PLAY.MAX_EVENTS`-ийг санд хандахаас ӨМНӨ энд шалгана.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string; game: string }> },
): Promise<Response> {
  const { id, game } = await ctx.params;
  if (!isGameName(game)) return bad('Тоглоомын нэр буруу байна');

  const body = await readJson<Body>(req);
  if (!body) return bad('Хүсэлтийн өгөгдөл буруу байна');

  try {
    if (body.begin === true) {
      const result = await beginGame(id, game);
      if (!result.ok) return bad(result.error);
      return ok(result.value);
    }

    if (!Array.isArray(body.events)) return bad('events дутуу байна');
    if (body.events.length > PLAY.MAX_EVENTS) {
      return bad(`Хэт олон үйлдэл илгээгдлээ (дээд тал нь ${PLAY.MAX_EVENTS})`);
    }

    if (game === 'sort') {
      const result = await submitSort(id, parseSortEvents(body.events));
      if (!result.ok) return bad(result.error);
      return ok(result.value);
    }
    if (game === 'stack') {
      const result = await submitStack(id, parseStackEvents(body.events));
      if (!result.ok) return bad(result.error);
      return ok(result.value);
    }

    if (game === 'memo') {
      const result = await submitMemo(id, parseMemoEvents(body.events));
      if (!result.ok) return bad(result.error);
      return ok(result.value);
    }

    const result = await submitDrop(id, parseDropEvents(body.events));
    if (!result.ok) return bad(result.error);
    return ok(result.value);
  } catch (err) {
    console.error(`[attempt/game/${game}]`, err);
    return boom();
  }
}
