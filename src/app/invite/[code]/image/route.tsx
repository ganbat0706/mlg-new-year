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

/**
 * Урилга «C · ЧИНГЭЛЭГ» чиглэл (Fable-ийн гурван саналаас хэрэглэгч сонгов).
 * Бүх хуудас нь брэндийн улаан чингэлэгийн хаалга: хажуугийн атираа, хоёр
 * талын цоожны хошуу, дээвэр дээрх цас, стенсил бичиглэл. Урилгын код нь
 * чингэлэгийн дугаарын байрлалд сууна.
 *
 * Бүрэн дүүрэн улаан дэвсгэр тул ЖИЖИГ бичвэр бүр заавал хар (INK) эсвэл
 * цагаан (WHITE) ялтас дээр суух ёстой — цагаан бичвэр #ED1C24 дээр ердөө
 * 4.38:1 контрасттай, энэ нь зөвхөн ТОМ бичвэрт (≥24px энгийн, ≥19px bold)
 * WCAG AA-д тэнцдэг. Тиймээс 18px шошго бүр ялтас дээр байрлав.
 */
const RED = '#ED1C24';
const RIB_DARK = '#C8131A';
const RIB_LIGHT = '#F6555B';
const INK = '#221E20';
const WHITE = '#FFFFFF';
const ROD_EDGE = '#171415';
const ROD_FACE = '#3E3739';
const INK_LABEL = '#B5AFB1';
const PLATE_LABEL = '#6B6568';
const PLATE_DOT = '#C9C2C4';
const INK_DOT = '#6B6568';

/** Өгөгдлийн ялтас доторх БАЙРШИЛ баганын тогтмол өргөн (px). */
const VENUE_WIDTH = 414;
/**
 * БАЙРШИЛ-ын талбарын тогтмол өндөр. Ялтасны өндөр эндээс тодорхойлогддог тул
 * фонт багасахад мөрийн тоо нэмэгддэг ч ялтас ӨСӨХГҮЙ — доорх ДУГААРын ялтас
 * хэзээ ч доошоо түлхэгдэхгүй.
 */
const VENUE_BOX_HEIGHT = 96;

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

/**
 * Эзэмшигчийн нэр 860px контентын өргөнөөс халиж 2 дахь мөр рүү шилжвэл доорх
 * ялтаснууд доошоо түлхэгдэнэ. Урт нь нэмэгдэх тусам фонтыг багасгаж нэг мөрөнд
 * багтаана.
 */
function nameFontSize(fullName: string): number {
  const len = fullName.length;
  if (len <= 14) return 60;
  if (len <= 20) return 52;
  if (len <= 28) return 42;
  if (len <= 36) return 34;
  return 26;
}

/**
 * БАЙРШИЛ бол арга хэмжээний баг гараар бөглөх чөлөөт текст — урт нь урьдчилан
 * мэдэгдэхгүй.
 *
 * Босгуудыг ТААМАГЛААГҮЙ: 414px багананд DejaVu Sans Bold-оор бодит зураг
 * үүсгэж хэмжсэнээр нэг мөрөнд ≈ 609/фонт тэмдэгт багтдаг нь гарсан
 * (16px дээр 38 тэмдэгт/мөр × 3 мөр = 114 гэж хэмжигдэв). VENUE_BOX_HEIGHT
 * (96px) дотор багтах мөрийн тоо = floor(96 / (фонт × 1.28)).
 *
 *   25px → 3 мөр × 24 =  72 тэмдэгт
 *   22px → 3 мөр × 27 =  83
 *   19px → 3 мөр × 32 =  96
 *   16px → 4 мөр × 38 = 152
 */
function venueFontSize(venue: string): number {
  const len = venue.length;
  if (len <= 65) return 25;
  if (len <= 80) return 22;
  if (len <= 92) return 19;
  return 16;
}

/** Фонт бүрийн багтаах дээд хэмжээ — үүнээс урт бол гурван цэгээр төгсгөнө. */
const VENUE_CHAR_BUDGET: Record<number, number> = { 25: 72, 22: 83, 19: 96, 16: 152 };

/**
 * Хайчилбал ҮГНИЙ ДУНДУУР таслахгүй, гурван цэг нэмнэ. Зочны хаалган дээр
 * хэрэгтэй мэдээлэл тул «...буудлын Их» гэж дуусдаг байдлыг зориуд арилгав.
 */
function fitVenue(venue: string, size: number): string {
  const budget = VENUE_CHAR_BUDGET[size] ?? 152;
  if (venue.length <= budget) return venue;
  const cut = venue.slice(0, budget - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > budget * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,\s]+$/, '')}…`;
}

const SNOWFLAKE_PATH = 'M14 8l6 4 6-4M14 32l6-4 6 4M6 16l7 4-1 8M34 16l-7 4 1 8M6 24l7-4-1-8M34 24l-7-4 1-8';

/**
 * Цасан ширхэг. Байрлалууд нь зориуд гарчгийн баруун талын ХООСОН бүсэд
 * сонгогдсон — гарчгийн хамгийн урт мөр («ЖИЛИЙН», 118px) ~644px хүрдэг тул
 * x ≥ 760 нь ямар ч өгөгдөлтэй давхцахгүй нь баталгаатай.
 */
function Snowflake({ left, top, size }: { left: number; top: number; size: number }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 40 40"
      style={{ position: 'absolute', left, top, width: size, height: size }}
    >
      <g stroke={WHITE} strokeWidth={2.4} strokeLinecap="round" fill="none">
        <line x1={20} y1={3} x2={20} y2={37} />
        <line x1={5.3} y1={11.5} x2={34.7} y2={28.5} />
        <line x1={5.3} y1={28.5} x2={34.7} y2={11.5} />
        <path d={SNOWFLAKE_PATH} />
      </g>
    </svg>
  );
}

/** Чингэлэгийн хажуугийн атираа — 18 давталт × 60px = 1080px. */
function Corrugation() {
  const ribs = Array.from({ length: 18 }, (_, i) => (
    <div key={i} style={{ display: 'flex', width: 60, height: H }}>
      <div style={{ width: 36, height: H }} />
      <div style={{ width: 10, height: H, background: RIB_DARK }} />
      <div style={{ width: 4, height: H, background: RIB_LIGHT }} />
      <div style={{ width: 10, height: H, background: RIB_DARK }} />
    </div>
  ));
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, display: 'flex' }}>
      {ribs}
    </div>
  );
}

/**
 * Цоожны хошуу. Satori-д linear-gradient-ээс хамаарахгүйн тулд гурван хатуу
 * өнгийн багана болгон угсрав — ижил металл эффект, гэхдээ бүрэн тодорхой.
 */
function LockRod({ left }: { left: number }) {
  return (
    <div style={{ position: 'absolute', left, top: 0, width: 16, height: H, display: 'flex' }}>
      <div style={{ width: 5, height: H, background: ROD_EDGE }} />
      <div style={{ width: 6, height: H, background: ROD_FACE }} />
      <div style={{ width: 5, height: H, background: ROD_EDGE }} />
    </div>
  );
}

function RodKeeper({ left, top }: { left: number; top: number }) {
  return <div style={{ position: 'absolute', left, top, width: 44, height: 30, background: INK, borderRadius: 3 }} />;
}

/** Дээврийн ирмэг дэх цасан давхарга. */
function RoofSnow() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1080 60"
      preserveAspectRatio="none"
      style={{ position: 'absolute', left: 0, top: 0, width: W, height: 60 }}
    >
      <path
        fill={WHITE}
        d="M0 0 H1080 V24 C1030 44 980 20 920 32 C860 46 800 22 740 34 C680 48 620 24 560 36 C500 50 440 22 380 32 C320 44 260 20 200 32 C140 46 80 24 0 34 Z"
      />
      <path
        fill={RIB_DARK}
        opacity={0.5}
        d="M0 34 C80 24 140 46 200 32 C260 20 320 44 380 32 C440 22 500 50 560 36 C620 24 680 48 740 34 C800 22 860 46 920 32 C980 20 1030 44 1080 24 V30 C1030 50 980 26 920 38 C860 52 800 28 740 40 C680 54 620 30 560 42 C500 56 440 28 380 38 C320 50 260 26 200 38 C140 52 80 30 0 40 Z"
      />
    </svg>
  );
}

/** Ялтасны булангийн шураг. */
function PlateDots({ color }: { color: string }) {
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, display: 'flex' }}>
      <div style={{ position: 'absolute', left: 8, top: 8, width: 8, height: 8, borderRadius: 4, background: color }} />
      <div style={{ position: 'absolute', right: 8, top: 8, width: 8, height: 8, borderRadius: 4, background: color }} />
      <div style={{ position: 'absolute', left: 8, bottom: 8, width: 8, height: 8, borderRadius: 4, background: color }} />
      <div style={{ position: 'absolute', right: 8, bottom: 8, width: 8, height: 8, borderRadius: 4, background: color }} />
    </div>
  );
}

const stencilLabel = (text: string, color: string) => (
  <div style={{ fontSize: 18, letterSpacing: 3, color }}>{text}</div>
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
  const venueShown = fitVenue(venueText, venueSize);

  const scoreLine = `ОНОО ${reg.bestScore.toLocaleString('mn-MN')}${standing ? ` · ${standing.rank}-Р БАЙР` : ''}`;

  return new ImageResponse(
    (
      <div style={{
        width: W, height: H, boxSizing: 'border-box', position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', background: RED, color: WHITE,
        fontFamily: 'DejaVuSans',
      }}>
        <Corrugation />
        <LockRod left={52} />
        <LockRod left={1012} />
        <RodKeeper left={38} top={120} />
        <RodKeeper left={38} top={560} />
        <RodKeeper left={38} top={1000} />
        <RodKeeper left={38} top={1260} />
        <RodKeeper left={998} top={120} />
        <RodKeeper left={998} top={560} />
        <RodKeeper left={998} top={1000} />
        <RodKeeper left={998} top={1260} />
        {/*
          Хаалганы бариул. Урт нь 46px — контентын багана x=110..970 хооронд
          эхэлдэг тул үүнээс урт бариул ЭЗЭМШИГЧийн нэрний эхний үсэг рүү
          орж ирдэг (бодит зураг дээр 4px давхцаж байсныг хэмжиж илрүүлэв).
        */}
        <div style={{ position: 'absolute', left: 60, top: 760, width: 46, height: 16, background: INK, borderRadius: '0 8px 8px 0' }} />
        <div style={{ position: 'absolute', left: 974, top: 760, width: 46, height: 16, background: INK, borderRadius: '8px 0 0 8px' }} />
        <RoofSnow />
        <Snowflake left={880} top={250} size={40} />
        <Snowflake left={800} top={360} size={28} />
        <Snowflake left={930} top={470} size={22} />
        <Snowflake left={560} top={180} size={24} />

        {/* толгой: лого (цагаан ялтас дээр) + морин жилийн тэмдэг */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '82px 110px 0' }}>
          <div style={{
            position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 360, height: 112, background: WHITE, borderRadius: 4,
          }}>
            <PlateDots color={PLATE_DOT} />
            <img src={logo} width={300} height={83} alt="Monlogistics Group" />
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 22px 12px 16px',
            background: INK, borderRadius: 4, fontSize: 22, fontWeight: 700, letterSpacing: 2,
          }}>
            <svg aria-hidden="true" viewBox="0 0 100 100" style={{ width: 32, height: 32, flexShrink: 0 }}>
              <path
                fill={WHITE}
                d="M28 90 L76 90 C76 78 74 62 70 50 C66 40 62 28 58 16 L52 24 L46 14 L42 26 C36 30 28 40 24 48 L16 54 L20 60 L30 58 C34 60 36 64 34 70 C32 78 28 84 28 90 Z"
              />
            </svg>
            <span>МОРИН ЖИЛ · 2026</span>
          </div>
        </div>

        {/* стенсил гарчиг */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '44px 110px 0' }}>
          <div style={{ fontSize: 118, fontWeight: 700, lineHeight: 1, letterSpacing: 4 }}>ШИНЭ</div>
          <div style={{ fontSize: 118, fontWeight: 700, lineHeight: 1, letterSpacing: 4 }}>ЖИЛИЙН</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 30, fontSize: 118, fontWeight: 700, lineHeight: 1, letterSpacing: 4 }}>
            <span>БАЯР</span><span style={{ color: INK }}>2026</span>
          </div>
          <div style={{ marginTop: 20, fontSize: 28, lineHeight: 1.2 }}>Жилийн аян замын төгсгөлд — хамтдаа</div>
        </div>

        {/* эзэмшигч */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '40px 110px 0' }}>
          <div style={{ display: 'flex', padding: '6px 14px', background: INK, borderRadius: 3, fontSize: 18, letterSpacing: 3 }}>
            ЭЗЭМШИГЧ
          </div>
          <div style={{ marginTop: 12, fontSize: nameFontSize(fullName), fontWeight: 700, lineHeight: 1.05 }}>
            {fullName}
          </div>
          <div style={{ marginTop: 8, fontSize: 26, fontWeight: 700, letterSpacing: 1 }}>{scoreLine}</div>
        </div>

        {/* өгөгдлийн ялтас */}
        <div style={{
          position: 'relative', display: 'flex', margin: '40px 110px 0', padding: '26px 32px',
          gap: 36, background: INK, borderRadius: 4,
        }}>
          <PlateDots color={INK_DOT} />
          <div style={{ display: 'flex', flexDirection: 'column', width: 200 }}>
            {stencilLabel('ОГНОО', INK_LABEL)}
            <div style={{ marginTop: 6, fontSize: 32, fontWeight: 700 }}>{event.date}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', width: 110 }}>
            {stencilLabel('ЦАГ', INK_LABEL)}
            <div style={{ marginTop: 6, fontSize: 32, fontWeight: 700 }}>{event.time || '—'}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', width: VENUE_WIDTH }}>
            {stencilLabel('БАЙРШИЛ', INK_LABEL)}
            <div style={{
              marginTop: 8, width: VENUE_WIDTH, height: VENUE_BOX_HEIGHT, overflow: 'hidden',
              fontSize: venueSize, fontWeight: 700, lineHeight: venueLineHeight,
            }}>
              {venueShown}
            </div>
          </div>
        </div>

        {/*
          Чингэлэгийн дугаарын ялтас. Урилгын код бол зочны хаалган дээр
          хэрэгтэй цорын ганц талбар тул дээрх (чөлөөт урттай) БАЙРШИЛ-аас
          тусдаа мөрөнд, өөрийн тогтмол фонт, padding-тай байрлана — БАЙРШИЛ
          хэзээ ч үүнийг шахахгүй.
        */}
        <div style={{
          position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          margin: '22px 110px 0', padding: '22px 32px 24px', background: WHITE, color: INK, borderRadius: 4,
        }}>
          <PlateDots color={PLATE_DOT} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {stencilLabel('ДУГААР · ХААЛГАН ДЭЭР ҮЗҮҮЛНЭ', PLATE_LABEL)}
            <div style={{ marginTop: 4, fontSize: 72, fontWeight: 700, lineHeight: 1.05, letterSpacing: 2 }}>
              {reg.inviteCode}
            </div>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            width: 86, height: 86, border: `4px solid ${INK}`, fontSize: 44, fontWeight: 700,
          }}>
            1
          </div>
        </div>

        <div style={{ flexGrow: 1, display: 'flex' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 110px 56px', fontSize: 22, fontWeight: 700, letterSpacing: 3 }}>
          <span>MLG · ШИНЭ ЖИЛИЙН БАЯР</span>
          <span>ХУВИЙН УРИЛГА · 1 ХҮН</span>
        </div>
      </div>
    ),
    { width: W, height: H, fonts },
  );
}
