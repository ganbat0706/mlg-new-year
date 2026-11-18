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
 * Урилга "А · Ачааны баримт" (waybill) чиглэл — зочин бол хүлээн авагч, баярын
 * зочлол бол ачаа. Манифестийн хүснэгт доторх БАЙРШИЛ баганад тогтмол px
 * өргөн заавал өгөх ёстой: Satori/Yoga flexGrow+minWidth:0 хослол энд текстийг
 * зөв биелдэггүй болох нь өмнөх (загвар загварын) хувилбар дээр бодит зураг
 * үзээд илэрсэн асуудал — 85 тэмдэгттэй хаяг ДУГААРыг 1080px canvas-аас ч
 * гадагшлуулж байв. ДУГААР үргэлж БАЙРШИЛ-ийн доор, хүснэгтийн тусдаа мөрөнд,
 * өөрийн баталгаатай зайтайгаар байрлана — БАЙРШИЛ хэзээ ч түүнийг шахахгүй.
 */
const VENUE_WIDTH = 874;

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

/** Урт нэр манифестийн мөрнөөс халиахгүйн тулд урт нь нэмэгдэх тусам фонтыг багасгана. */
function nameFontSize(fullName: string): number {
  const len = fullName.length;
  if (len <= 14) return 58;
  if (len <= 20) return 48;
  if (len <= 28) return 40;
  if (len <= 36) return 34;
  return 28;
}

/** Тасалбар (tear-off stub) дэх нэрийн давталт — нэг мөрөнд багтаах тул арай жижиг. */
function stubNameFontSize(fullName: string): number {
  const len = fullName.length;
  if (len <= 16) return 24;
  if (len <= 26) return 20;
  if (len <= 36) return 17;
  return 14;
}

/**
 * Байршлын талбар бол event.venue гэдэг нь арга хэмжээний баг гараар бөглөх
 * чөлөөт текст — урт нь урьдчилан мэдэгдэхгүй. Урт нь нэмэгдэх тусам фонтыг
 * багасгаж, доод талд 2 мөрөөр хязгаарлан хэтэрсэн хэсгийг тасална
 * (venueMaxHeight-той хамт). Босго утгуудыг богино, ~85 тэмдэгтийн бодит
 * Монгол хаяг, 200 тэмдэгтийн туйлшруулсан тохиолдол гэсэн гурван тохиолдол
 * дээр бодит зураг үүсгэж харж тохируулсан — таамаглаагүй.
 */
function venueFontSize(venue: string): number {
  const len = venue.length;
  if (len <= 20) return 30;
  if (len <= 40) return 26;
  if (len <= 70) return 22;
  return 18;
}

const SNOWFLAKE_PATH = 'M14 8l6 4 6-4M14 32l6-4 6 4M6 16l7 4-1 8M34 16l-7 4 1 8M6 24l7-4-1-8M34 24l-7-4 1-8';

function Snowflake({ left, top, size }: { left: number; top: number; size: number }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 40 40"
      style={{ position: 'absolute', left, top, width: size, height: size }}
    >
      <g stroke={RED} strokeWidth={2.4} strokeLinecap="round" fill="none">
        <line x1={20} y1={3} x2={20} y2={37} />
        <line x1={5.3} y1={11.5} x2={34.7} y2={28.5} />
        <line x1={5.3} y1={28.5} x2={34.7} y2={11.5} />
        <path d={SNOWFLAKE_PATH} />
      </g>
    </svg>
  );
}

/** Декорацийн зураасан код — бодит дугаарыг кодлодоггүй, зөвхөн ачааны баримтын харагдах байдлыг өгнө. */
const BARCODE_WIDTHS = [
  2, 3, 4, 6, 2, 3, 8, 2, 4, 3, 2, 6, 3, 2, 4, 8, 2, 3, 2, 5, 3, 2, 6, 2, 4, 3, 2, 8, 3, 2, 4, 2, 6, 3, 2,
  4, 3, 8, 2, 3, 2, 4, 6, 2, 3, 2, 5, 3, 2, 4, 8, 2, 3, 4, 2,
];

function Barcode() {
  const positions: Array<{ x: number; w: number }> = [];
  let cursor = 0;
  for (let i = 0; i < BARCODE_WIDTHS.length; i += 1) {
    const w = BARCODE_WIDTHS[i];
    const gap = i % 3 === 0 ? 4 : i % 2 === 0 ? 6 : 2;
    cursor += gap;
    positions.push({ x: cursor, w });
    cursor += w;
  }
  const bars = positions.map(({ x, w }, i) => (
    <rect key={i} x={x} y={0} width={w} height={100} />
  ));
  return (
    <svg
      role="img"
      aria-label="Зураасан код"
      viewBox="0 0 363 100"
      preserveAspectRatio="none"
      style={{ width: 290, height: 84, flexShrink: 0 }}
    >
      <g fill={INK}>{bars}</g>
    </svg>
  );
}

function CustomsStamp() {
  return (
    <div style={{
      position: 'absolute', right: 52, top: 128, width: 340, height: 140, boxSizing: 'border-box',
      display: 'flex', padding: 6, border: `5px solid ${RED}`, borderRadius: 12,
      transform: 'rotate(-11deg)', opacity: 0.92, overflow: 'hidden',
    }}>
      <div style={{
        flexGrow: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        border: `2px solid ${RED}`, borderRadius: 7, padding: '0 10px',
      }}>
        <svg aria-hidden="true" viewBox="0 0 100 100" style={{ width: 46, height: 46, flexShrink: 0 }}>
          <path
            fill={RED}
            d="M28 90 L76 90 C76 78 74 62 70 50 C66 40 62 28 58 16 L52 24 L46 14 L42 26 C36 30 28 40 24 48 L16 54 L20 60 L30 58 C34 60 36 64 34 70 C32 78 28 84 28 90 Z"
          />
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, color: RED, lineHeight: 1.15 }}>
          <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: 0.5, whiteSpace: 'nowrap' }}>БАТАЛГААЖСАН</div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 0.5, whiteSpace: 'nowrap' }}>МОРИН ЖИЛ · 2026</div>
        </div>
      </div>
    </div>
  );
}

const cellLabel = (text: string) => (
  <div style={{ fontSize: 18, letterSpacing: 3, color: MUTED }}>{text}</div>
);

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
  const venueLineHeight = 1.28;
  const venueMaxHeight = Math.round(venueSize * venueLineHeight * 2); // 2 мөрөөс хэтрэхгүй

  const scoreLine = `ОНОО ${reg.bestScore.toLocaleString('mn-MN')}${standing ? ` · ${standing.rank}-Р БАЙР` : ''}`;

  return new ImageResponse(
    (
      <div style={{
        width: W, height: H, boxSizing: 'border-box', position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', background: PAPER, color: INK,
        fontFamily: 'DejaVuSans',
      }}>
        <Snowflake left={28} top={330} size={34} />
        <Snowflake left={1020} top={560} size={26} />
        <Snowflake left={20} top={1120} size={22} />

        {/* толгой: лого + баримтын дугаар */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '60px 72px 0' }}>
          <img src={logo} width={300} height={83} alt="Monlogistics Group" />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            {cellLabel('ТЭЭВРИЙН БАРИМТ')}
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 1 }}>{`№ ${reg.inviteCode}`}</div>
          </div>
        </div>
        <div style={{ display: 'flex', margin: '32px 72px 0', height: 3, background: INK }} />

        {/* гарчиг + лац */}
        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', padding: '38px 72px 0' }}>
          <div style={{ fontSize: 92, fontWeight: 700, lineHeight: 1, letterSpacing: -1 }}>ШИНЭ ЖИЛИЙН</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 26, fontSize: 92, fontWeight: 700, lineHeight: 1, letterSpacing: -1 }}>
            <span>БАЯР</span><span style={{ color: RED }}>2026</span>
          </div>
          <div style={{ marginTop: 18, fontSize: 28, lineHeight: 1.2, color: INK }}>
            Жилийн аян замын төгсгөлд — хамтдаа
          </div>
          <CustomsStamp />
        </div>

        {/* манифест */}
        <div style={{ display: 'flex', flexDirection: 'column', margin: '44px 72px 0', border: `3px solid ${INK}` }}>
          <div style={{ display: 'flex', flexDirection: 'column', padding: '20px 28px 22px' }}>
            {cellLabel('ХҮЛЭЭН АВАГЧ · УРИЛГА ЭЗЭМШИГЧ')}
            <div style={{ marginTop: 8, fontSize: nameFontSize(fullName), fontWeight: 700, lineHeight: 1.05 }}>
              {fullName}
            </div>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12, fontSize: 24, fontWeight: 700 }}>
              <span style={{ display: 'flex', width: 12, height: 12, background: RED }} />
              <span>{scoreLine}</span>
            </div>
          </div>

          <div style={{ display: 'flex', borderTop: `3px solid ${INK}` }}>
            <div style={{ display: 'flex', flexDirection: 'column', width: 290, padding: '20px 28px 22px' }}>
              {cellLabel('ОГНОО')}
              <div style={{ marginTop: 6, fontSize: 34, fontWeight: 700 }}>{event.date}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', width: 190, padding: '20px 28px 22px', borderLeft: `3px solid ${INK}` }}>
              {cellLabel('ЦАГ')}
              <div style={{ marginTop: 6, fontSize: 34, fontWeight: 700 }}>{event.time || '—'}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, padding: '20px 28px 22px', borderLeft: `3px solid ${INK}` }}>
              {cellLabel('АЧАА')}
              <div style={{ marginTop: 8, fontSize: 28, fontWeight: 700 }}>Баяр хөөр, 1 ш</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', padding: '20px 28px 22px', borderTop: `3px solid ${INK}` }}>
            {cellLabel('БАЙРШИЛ · ХҮРЭХ ЦЭГ')}
            <div style={{
              marginTop: 6, width: VENUE_WIDTH, maxHeight: venueMaxHeight, overflow: 'hidden',
              fontSize: venueSize, fontWeight: 700, lineHeight: venueLineHeight,
            }}>
              {venueText}
            </div>
          </div>

          {/*
            ДУГААР (урилгын код) бол зочны хаалган дээр хэрэгтэй цорын ганц
            талбар тул БАЙРШИЛ (дээрх, чөлөөт урттай) ямар ч тохиолдолд үүнийг
            шахахгүй: энэ мөр өөрийн тогтмол padding, фонт хэмжээтэй, БАЙРШИЛ-ийн
            агуулгын уртаас үл хамааран үргэлж бүтэн харагдана (Критик алдаа:
            урт хаяг ДУГААРыг 1080px canvas-аас гадагшлуулж байсныг засав).
          */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 36, padding: '20px 28px 24px', borderTop: `3px solid ${INK}` }}>
            <Barcode />
            <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
              {cellLabel('ДУГААР · ХААЛГАН ДЭЭР ҮЗҮҮЛНЭ')}
              <div style={{ marginTop: 4, fontSize: 64, fontWeight: 700, lineHeight: 1.05, letterSpacing: 1 }}>
                {reg.inviteCode}
              </div>
            </div>
          </div>
        </div>

        {/* тасдах шугам */}
        <div style={{ display: 'flex', margin: '26px 72px 0', height: 0, borderTop: `3px dashed #B9B3A8` }} />

        {/* тасалбар — хаалган дээр үзүүлэх хэсэг */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          margin: '22px 72px 0', padding: '22px 32px', background: RED, color: '#FFFFFF',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexGrow: 1, minWidth: 0, overflow: 'hidden' }}>
            <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 2 }}>ТАСАЛБАР · ХААЛГАН ДЭЭР</div>
            <div style={{
              fontSize: stubNameFontSize(fullName), fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden',
            }}>
              {fullName}
            </div>
          </div>
          <div style={{ display: 'flex', flexShrink: 0, fontSize: 34, fontWeight: 700, letterSpacing: 2, marginLeft: 24 }}>
            {reg.inviteCode}
          </div>
        </div>

        <div style={{ flexGrow: 1, display: 'flex' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 72px 44px', fontSize: 16, letterSpacing: 1, color: MUTED }}>
          <span>МОНЛОГИСТИКС ГРУПП · ШИНЭ ЖИЛИЙН БАЯР 2026</span>
          <span>ХУВИЙН УРИЛГА · ДАХИН ОЛГОХГҮЙ</span>
        </div>
      </div>
    ),
    { width: W, height: H, fonts },
  );
}
