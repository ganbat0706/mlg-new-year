import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const DIR = 'src/assets/fonts';

// Анхны төлөвлөгөө google/fonts repo-гийн "ofl/notosans/static/*.ttf" замаас
// татах байсан ч тэр repo variable font (NotoSans[wdth,wght].ttf) руу шилжсэн тул
// static замууд 404 өгдөг болсон (шалгасан: 2026-11-18). Satori нь woff2-г
// уншихгүй тул заавал .ttf хэрэгтэй хэвээр байгаа тул оронд нь fontsource-ийн
// jsDelivr CDN-ээс subset тус бүрээр (latin, cyrillic) static TTF татна — эдгээр
// нь жинхэнэ Noto Sans-аас хөрвүүлсэн, кирилл болон латин үсгийг бүрэн дэмждэг
// (Монгол кирилл-ийн нэмэлт үсэг Ө/ү-г оролцуулан баталгаажуулсан).
const DIST = 'https://cdn.jsdelivr.net/fontsource/fonts/noto-sans@latest';
const FILES = [
  ['NotoSans-Latin-Regular.ttf', `${DIST}/latin-400-normal.ttf`],
  ['NotoSans-Cyrillic-Regular.ttf', `${DIST}/cyrillic-400-normal.ttf`],
  ['NotoSans-Latin-Bold.ttf', `${DIST}/latin-700-normal.ttf`],
  ['NotoSans-Cyrillic-Bold.ttf', `${DIST}/cyrillic-700-normal.ttf`],
];

await mkdir(DIR, { recursive: true });

for (const [name, url] of FILES) {
  const path = `${DIR}/${name}`;
  if (existsSync(path)) { console.log(`• ${name} аль хэдийн байна`); continue; }

  const res = await fetch(url);
  if (!res.ok) {
    console.error(`✗ ${name} татагдсангүй (${res.status}) — ${url}`);
    console.error('  Кирилл дэмждэг ямар ч статик .ttf файлыг гараар энэ замд хуулж болно.');
    process.exit(1);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 5_000) {
    console.error(`✗ ${name} хэт жижиг (${buf.length} байт) — файл буруу байж магадгүй`);
    process.exit(1);
  }

  await writeFile(path, buf);
  console.log(`✓ ${name} (${Math.round(buf.length / 1024)} KB)`);
}
