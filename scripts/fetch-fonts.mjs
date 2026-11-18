import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const DIR = 'src/assets/fonts';

// Анхны төлөвлөгөө google/fonts repo-гийн "ofl/notosans/static/*.ttf" замаас
// татах байсан ч тэр repo variable font (NotoSans[wdth,wght].ttf) руу шилжсэн тул
// static замууд 404 өгдөг болсон (шалгасан: 2026-11-18).
//
// Дараа нь fontsource-ийн jsDelivr CDN-ээс subset тус бүрээр (latin, cyrillic)
// татаж, Satori-ийн ижил нэртэй fallback stack-ээр нэгтгэсэн ч код-review дээр
// илэрсэн: Satori-ийн subset-fallback нь жин (weight)-г тэмдэгт бүрээр зөв
// шийдвэрлэдэггүй болох нь тогтоогдсон — кирилл текст үргэлж Regular жингээр
// зурагдаж, Bold нь зөвхөн латин тэмдэгтэд ажилладаг байв (пиксел хэмжилтээр
// нотлогдсон, task-15-report.md-ийн "Fix round 1"-ийг үзнэ үү).
//
// Тиймээс нэг файл = нэг жин, латин+кирилл ХОЁУЛАНГ нь нэг TTF дотор агуулсан
// фонт руу шилжив: DejaVu Sans (chromium/LibreOffice-ийн адил өргөн тархсан,
// нээлттэй эх кодтой, Cyrillic Extended-A-г (Ө/Ү) оролцуулсан бүрэн Unicode
// хамрах хүрээтэй). Файлууд том болсон (нийт ~1.4 MB) ч жингийн шийдвэрлэлтийг
// subset-fallback-гүйгээр баталгаатай болгосон тул энэ нь зөв сэлгэц.
const DIST = 'https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf';
const FILES = [
  ['DejaVuSans-Regular.ttf', `${DIST}/DejaVuSans.ttf`],
  ['DejaVuSans-Bold.ttf', `${DIST}/DejaVuSans-Bold.ttf`],
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
