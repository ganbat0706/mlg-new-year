import { getStanding } from '@/lib/repo/leaderboard';
import { contestById, focusContest } from '@/lib/contests';
import { findByPhone, findById } from '@/lib/repo/registrations';
import { validatePhone } from '@/lib/validation';
import { ok, bad, boom, readJson } from '@/lib/http';
import { hitRateLimit, clientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  if (hitRateLimit('standing', clientIp(req))) {
    return bad('Хэт олон удаа оролдлоо. Минут хүлээгээд дахин оролдоно уу.', 429);
  }

  const body = await readJson<{ phone?: string; registrationId?: string; contestId?: string }>(req);
  const contest = contestById(body?.contestId ?? '') ?? focusContest();

  /**
   * Хоёр оролт: утасны дугаар (бусдыг хайх) эсвэл бүртгэлийн id (өөрийн
   * session-оос). Сүүлийнх нь үр дүнгийн хуудас ачаалахад ЭХНЭЭС нь байраа
   * мэдэхэд хэрэгтэй — өмнө нь зөвхөн утсаар хайсан үед л байр мэдэгддэг
   * байсан тул «эхний 5-д оров» гэсэн мэдэгдэл хэзээ ч гарч чаддаггүй байв.
   *
   * id нь нууц биш (урилгын код шиг) бөгөөд буцаах өгөгдөл нь утсаар
   * хайхтай ЯГ ИЖИЛ — шинэ мэдээлэл задруулахгүй.
   */
  try {
    let reg;
    if (typeof body?.registrationId === 'string' && body.registrationId.length > 0) {
      reg = await findById(body.registrationId);
      if (!reg) return bad('Бүртгэл олдсонгүй', 404);
    } else {
      const phone = validatePhone(body?.phone ?? '');
      if (!phone.ok) return bad(phone.error);
      reg = await findByPhone(phone.value);
      if (!reg) return bad('Энэ дугаараар бүртгэл олдсонгүй', 404);
    }

    const standing = await getStanding(contest.id, reg.id);
    return ok({
      lastName: reg.lastName,
      firstName: reg.firstName,
      inviteCode: reg.inviteCode,
      bestScore: reg.bestScore,
      contestId: contest.id,
      contestName: contest.name,
      rank: standing?.rank ?? null,
      total: standing?.total ?? 0,
    });
  } catch (err) {
    console.error('[standing]', err);
    return boom();
  }
}
