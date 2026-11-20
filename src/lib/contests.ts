/**
 * Гурван тусдаа тэмцээн. Тус бүр өөрийн эхлэх өдөр, эхлэх цаг, дуусах
 * цагтай; тус бүрдээ өөрийн жагсаалт, өөрийн ЯЛАГЧТАЙ (1-р байр).
 * Нэг тэмцээнд нэг ажилтан ЯГ НЭГ удаа тоглоно.
 *
 * Огноог энд, кодод бичсэн нь зориуд: эдгээр нь нууц биш, цөөхөн, бөгөөд
 * хүн бүр харах ёстой мэдээлэл. Орчны хувьсагчид тараавал ямар утга хаана
 * тохируулагдсаныг хэн ч хянаж чадахгүй болно. Өөрчлөх шаардлагатай бол
 * энэ файлыг засаад push хийхэд хангалттай (Vercel автоматаар deploy).
 */

export type ContestId = 'eyes' | 'games' | 'quiz';

export type Contest = {
  id: ContestId;
  /** Жагсаалт, хуудасны гарчигт харагдах нэр. */
  name: string;
  /** Нэг мөрийн тайлбар. */
  tagline: string;
  /** ISO 8601, цагийн бүсийн хамт (+08:00 — Улаанбаатар). */
  startsAt: string;
  endsAt: string;
  /**
   * Тухайн тэмцээний тоглоом КОДОД бэлэн болсон эсэх.
   *
   * Яагаад хэрэгтэй вэ: огноог арга хэмжээний баг бөглөх тул тоглоом нь
   * бичигдэж дуусаагүй байхад цаг нь болчих магадлалтай. Тэр үед карт нь
   * «нээлттэй» гэж хуурахын оронд «удахгүй» гэж шударгаар хэлнэ.
   * Тоглоом нь бэлэн болмогц энд true болгоно.
   */
  ready: boolean;
};

/**
 * ⚠️ ОГНОО, ЦАГИЙГ АРГА ХЭМЖЭЭНИЙ БАГ БӨГЛӨНӨ.
 * Доорх утгууд нь зөвхөн бүтцийг харуулсан ЖИШЭЭ — арга хэмжээ
 * 2026-12-05-д болох тул гурван тэмцээн түүнээс өмнө дуусах ёстой.
 */
export const CONTESTS: readonly Contest[] = [
  {
    id: 'eyes',
    name: 'Хэний нүд вэ?',
    tagline: 'Хамт олны нүдээр нь танина',
    startsAt: '2026-11-24T09:00:00+08:00',
    endsAt: '2026-11-26T18:00:00+08:00',
    ready: false,
  },
  {
    id: 'games',
    name: 'Ачааны тоглоом',
    tagline: 'Зөв зам · Овоолох · Хос манифест · Агаараас буулгах',
    startsAt: '2026-11-28T09:00:00+08:00',
    endsAt: '2026-11-30T18:00:00+08:00',
    ready: true,
  },
  {
    id: 'quiz',
    name: 'Мэдлэгийн тэмцээн',
    tagline: 'Хурдан бөгөөд зөв хариул',
    startsAt: '2026-12-02T09:00:00+08:00',
    endsAt: '2026-12-03T18:00:00+08:00',
    ready: false,
  },
] as const;

export type ContestState = 'upcoming' | 'open' | 'closed';

function parse(iso: string, field: string): Date {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Тэмцээний ${field} буруу: ${iso}`);
  }
  return d;
}

export function contestStartsAt(c: Contest): Date { return parse(c.startsAt, 'эхлэх цаг'); }
export function contestEndsAt(c: Contest): Date { return parse(c.endsAt, 'дуусах цаг'); }

export function contestState(c: Contest, now: Date = new Date()): ContestState {
  const t = now.getTime();
  if (t < contestStartsAt(c).getTime()) return 'upcoming';
  if (t > contestEndsAt(c).getTime()) return 'closed';
  return 'open';
}

export function contestById(id: string): Contest | undefined {
  return CONTESTS.find((c) => c.id === id);
}

/** Яг одоо нээлттэй тэмцээн. Хоорондын завсарт null. */
export function activeContest(now: Date = new Date()): Contest | null {
  return CONTESTS.find((c) => contestState(c, now) === 'open') ?? null;
}

/** Дараагийн эхлэх тэмцээн (одоо нээлттэй нь байхгүй үед юу хүлээхийг хэлнэ). */
export function nextContest(now: Date = new Date()): Contest | null {
  const upcoming = CONTESTS
    .filter((c) => contestState(c, now) === 'upcoming')
    .sort((a, b) => contestStartsAt(a).getTime() - contestStartsAt(b).getTime());
  return upcoming[0] ?? null;
}

/**
 * Жагсаалт харуулахад ашиглах тэмцээн: нээлттэй нь, эс бөгөөс хамгийн
 * сүүлд дууссан нь. Бүгд ирээдүйд бол эхнийх.
 */
export function focusContest(now: Date = new Date()): Contest {
  const open = activeContest(now);
  if (open) return open;
  const closed = CONTESTS
    .filter((c) => contestState(c, now) === 'closed')
    .sort((a, b) => contestEndsAt(b).getTime() - contestEndsAt(a).getTime());
  return closed[0] ?? CONTESTS[0];
}

/** Бүх тэмцээн дууссан эсэх — нүүр хуудас үр дүн рүү шилжих нөхцөл. */
export function allContestsClosed(now: Date = new Date()): boolean {
  return CONTESTS.every((c) => contestState(c, now) === 'closed');
}
