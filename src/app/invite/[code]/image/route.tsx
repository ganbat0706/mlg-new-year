// Satori (next/og) нь next/image-ийг дэмждэггүй тул <img> ашиглана. Мөрөн доторх JSX
// коммент ({/* ... */}) нь нэмэлт (undefined) хүүхэд болж, Satori-ийн "олон хүүхэдтэй бол
// заавал display: flex" шалгалтыг эвддэг тул уг дүрмийг файлын эхэнд нэг удаа disable хийв.
/* eslint-disable @next/next/no-img-element */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { findByInviteCode } from '@/lib/repo/registrations';
import { getStanding } from '@/lib/repo/leaderboard';
import { eventInfo } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const W = 1080;
const H = 1350;
const RED = '#ED1C24';
const INK = '#221E20';
const PAPER = '#FAF7F0';
const MUTED = '#6B6568';
/**
 * Footer дотор БАЙРШИЛ баганад тогтмол px өргөн заавал өгөх ёстой: Satori/Yoga
 * flexGrow+minWidth:0 хослол энд текстийг зөв биелдэггүй болох нь бодит
 * зураг үзээд илэрсэн (текст card-аас, бүр 1080px canvas-аас ч гадагшилж
 * байсан). Тогтмол width өгснөөр текст үргэлж энэ хайрцгийн дотор wrap хийнэ,
 * ДУГААР багана бол доор өөрийн тусдаа мөрөнд байгаа тул энэ өргөн хэзээ ч
 * ДУГААР-ыг шахахгүй.
 */
const VENUE_WIDTH = 420;

/**
 * Анх Noto Sans-ийг subset (latin/cyrillic) тус бүрээр дөрвөн файлаар fallback
 * stack болгон өгч байсан ч код-ревьюгээр илэрсэн: Satori-ийн subset-fallback
 * нь жин (weight)-ийг тэмдэгт бүрээр зөв шийдвэрлэдэггүй — кирилл текст үргэлж
 * Regular зурагдаж, Bold зөвхөн латин тэмдэгтэд нөлөөлдөг байв (пиксел
 * хэмжилтээр нотлогдсон, task-15-report.md-ийн "Fix round 1"-ийг үзнэ үү).
 *
 * Тиймээс DejaVu Sans руу шилжив: нэг TTF файл латин ба кирилл хоёуланг нь
 * агуулдаг тул жин бүрт ганц файл хангалттай — subset-fallback огт хэрэггүй
 * болж, жингийн шийдвэрлэлт найдвартай болсон.
 */
async function loadFonts() {
  const dir = path.join(process.cwd(), 'src/assets/fonts');
  const [regular, bold] = await Promise.all([
    readFile(path.join(dir, 'DejaVuSans-Regular.ttf')),
    readFile(path.join(dir, 'DejaVuSans-Bold.ttf')),
  ]);
  return [
    { name: 'DejaVuSans', data: regular, weight: 400 as const, style: 'normal' as const },
    { name: 'DejaVuSans', data: bold, weight: 700 as const, style: 'normal' as const },
  ];
}

async function loadLogo(origin: string): Promise<string> {
  const res = await fetch(`${origin}/logo.png`);
  const buf = Buffer.from(await res.arrayBuffer());
  return `data:image/png;base64,${buf.toString('base64')}`;
}

/** Урт нэр картнаас халиахгүйн тулд урт нь нэмэгдэх тусам фонтыг багасгана. */
function nameFontSize(fullName: string): number {
  const len = fullName.length;
  if (len <= 18) return 64;
  if (len <= 26) return 52;
  if (len <= 36) return 42;
  return 34;
}

/**
 * Байршлын талбар бол event.venue гэдэг нь арга хэмжээний баг гараар бөглөх
 * чөлөөт текст — урт нь урьдчилан мэдэгдэхгүй. Урт нь нэмэгдэх тусам фонтыг
 * багасгаж, доод талд 2 мөрөөр хязгаарлан хэтэрсэн хэсгийг тасална
 * (venueMaxHeight-той хамт). Босго утгуудыг бодит зураг үүсгэж харж тохируулсан
 * (task-15-report.md-ийн "Fix round 1" хэсгийг үзнэ үү) — таамаглаагүй.
 */
function venueFontSize(venue: string): number {
  const len = venue.length;
  if (len <= 20) return 32;
  if (len <= 40) return 26;
  if (len <= 70) return 22;
  return 18;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ code: string }> },
): Promise<Response> {
  const { code } = await ctx.params;

  const reg = await findByInviteCode(code);
  if (!reg) return new Response('Урилга олдсонгүй', { status: 404 });

  const standing = await getStanding(reg.id);
  const event = eventInfo();
  const origin = new URL(req.url).origin;
  const [fonts, logo] = await Promise.all([loadFonts(), loadLogo(origin)]);

  const fullName = `${reg.lastName} ${reg.firstName}`;
  const venueText = event.venue || '—';
  const venueSize = venueFontSize(venueText);
  const venueLineHeight = 1.25;
  const venueMaxHeight = Math.round(venueSize * venueLineHeight * 2); // 2 мөрөөс хэтрэхгүй

  const label = (text: string) => (
    <div style={{ fontSize: 20, letterSpacing: 3, color: MUTED }}>{text}</div>
  );

  return new ImageResponse(
    (
      <div style={{
        width: W, height: H, display: 'flex', flexDirection: 'column',
        background: PAPER, color: INK, fontFamily: 'DejaVuSans',
      }}>
        <div style={{ display: 'flex', height: 16 }}>
          <div style={{ flexGrow: 3, background: RED }} />
          <div style={{ flexGrow: 1, background: INK }} />
          <div style={{ flexGrow: 2, background: RED }} />
        </div>

        <div style={{ display: 'flex', padding: '58px 80px 0', alignItems: 'center' }}>
          <img src={logo} width={310} height={86} alt="Monlogistics Group" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', padding: '62px 80px 0' }}>
          <div style={{ fontSize: 100, fontWeight: 700, lineHeight: 1 }}>ШИНЭ ЖИЛИЙН</div>
          <div style={{ fontSize: 100, fontWeight: 700, lineHeight: 1 }}>БАЯР 2026</div>
          <div style={{ marginTop: 26, fontSize: 30, color: RED }}>
            Жилийн аян замын төгсгөлд — хамтдаа
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, padding: '56px 80px 0', alignItems: 'flex-end' }}>
          {[56, 112, 56, 168, 112, 56, 112].map((h, i) => (
            <div key={i} style={{
              width: 116, height: h, borderRadius: 4,
              background: [RED, INK, '#E3DED2'][i % 3],
            }} />
          ))}
        </div>

        <div style={{ display: 'flex', padding: '10px 80px 0' }}>
          <div style={{ width: '100%', height: 6, borderRadius: 3, background: INK }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', padding: '54px 80px 0' }}>
          {label('УРИЛГА ЭЗЭМШИГЧ')}
          <div style={{ marginTop: 12, fontSize: nameFontSize(fullName), fontWeight: 700 }}>
            {fullName}
          </div>
          <div style={{ marginTop: 10, fontSize: 26, color: MUTED }}>
            {`${reg.bestScore.toLocaleString('mn-MN')} оноо${standing ? ` · ${standing.rank}-р байр` : ''}`}
          </div>
        </div>

        <div style={{ flexGrow: 1 }} />

        {/*
          ДУГААР (урилгын код) бол зочны хаалган дээр хэрэгтэй цорын ганц
          талбар тул БАЙРШИЛ (чөлөөт, урт нь мэдэгдэхгүй текст)-тай адил мөрөнд
          зэрэгцүүлэхгүй — өөрийн тусдаа мөрөнд, ямар ч тохиолдолд бусад
          талбараас шахагдахгүйгээр байрлуулав (Критик алдаа: урт хаяг
          ДУГААР-ыг 1080px canvas-аас гадагшлуулж байсныг засав).
        */}
        <div style={{
          display: 'flex', flexDirection: 'column', margin: '0 80px',
          borderRadius: 8, background: INK, color: PAPER,
        }}>
          <div style={{ display: 'flex', padding: '34px 44px 0', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', marginRight: 56 }}>
              <div style={{ fontSize: 18, letterSpacing: 3, color: '#B5AFB1' }}>ОГНОО</div>
              <div style={{ fontSize: 32, fontWeight: 700 }}>{event.date}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', marginRight: 56 }}>
              <div style={{ fontSize: 18, letterSpacing: 3, color: '#B5AFB1' }}>ЦАГ</div>
              <div style={{ fontSize: 32, fontWeight: 700 }}>{event.time || '—'}</div>
            </div>
            <div style={{
              display: 'flex', flexDirection: 'column', width: VENUE_WIDTH,
            }}>
              <div style={{ fontSize: 18, letterSpacing: 3, color: '#B5AFB1' }}>БАЙРШИЛ</div>
              <div style={{
                width: VENUE_WIDTH, marginTop: 4, fontSize: venueSize, fontWeight: 700,
                lineHeight: venueLineHeight, maxHeight: venueMaxHeight, overflow: 'hidden',
              }}>
                {venueText}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', margin: '28px 44px 0' }}>
            <div style={{ width: '100%', height: 1, background: 'rgba(250,247,240,0.2)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', padding: '22px 44px 34px' }}>
            <div style={{ fontSize: 18, letterSpacing: 3, color: '#B5AFB1' }}>ДУГААР</div>
            <div style={{ marginTop: 4, fontSize: 44, fontWeight: 700 }}>{reg.inviteCode}</div>
          </div>
        </div>

        <div style={{ display: 'flex', height: 48 }} />
        <div style={{ display: 'flex', height: 16 }}>
          <div style={{ flexGrow: 2, background: RED }} />
          <div style={{ flexGrow: 1, background: INK }} />
          <div style={{ flexGrow: 3, background: RED }} />
        </div>
      </div>
    ),
    { width: W, height: H, fonts },
  );
}
