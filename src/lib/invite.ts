import { GAME } from './config';

/**
 * Sequence дугаарыг урилгын код болгоно.
 * 1 → MLG-202601, 100 → MLG-2026100
 * Тогтмол өргөнтэй болгохыг хүсвэл доорх мөрийг
 * `String(seq).padStart(3, '0')` болгож өөрчилнө.
 */
export function formatInviteCode(seq: number): string {
  if (!Number.isInteger(seq) || seq < 1) {
    throw new Error(`Урилгын дугаар эерэг бүхэл тоо байх ёстой: ${seq}`);
  }
  const suffix = seq < 10 ? `0${seq}` : String(seq);
  return `${GAME.INVITE_PREFIX}${suffix}`;
}
