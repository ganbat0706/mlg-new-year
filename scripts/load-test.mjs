// Ачааллын шалгалт: 200 ажилтан зэрэг бүртгүүлэхийг дуурайна.
//
// Анхаарах 2 зүйл (анхны төлөвлөгөөнд байсан 2 согог):
//
// 1. Нэр: `Ажилтан${i}` гэх мэт тоо залгасан нэр `validateName`-д УНАНА — энэ
//    функц зөвхөн цэвэр кирилл үсэг зөвшөөрдөг (tests/leaderboard.test.ts-ийн
//    CYR массивтай адил аргаар, 200 өөр ЦЭВЭР кирилл нэр үүсгэнэ).
// 2. IP: fetch header нэмэхгүй бол бүх 200 хүсэлт `clientIp()`-д адил
//    'unknown' гэж харагдана (src/lib/rate-limit.ts) — 60/минутын хязгаарт
//    140 нь шууд 429 (rate limit) авна, энэ нь concurrency/sequence-ийн
//    бодит чадалтай ХОЛБООГҮЙ хиймэл согог. Бодит арга хэмжээнд 200 ажилтан
//    өөр өөр төхөөрөмж/сүлжээнээс ирэх тул X-Forwarded-For толгойд
//    санамсаргүй өөр IP өгч, бодит нөхцлийг дуурайна.
const BASE = process.argv[2] ?? 'http://localhost:3000';
const N = 200;

/** Монгол кирилл цагаан толгой (validateName-тай таарна: ё, ө, ү багтана, латин ОРОХГҮЙ). */
const CYR = 'абвгдежзийклмнопрстуфхцчшщъыьэюяёөү'.split('');

/** `i`-д тохирох өвөрмөц ЦЭВЭР кирилл нэр (2 үсэгт хослол — 200-аас хэт олон давхардалгүй хослол өгдөг). */
function cyrillicName(i) {
  const a = CYR[i % CYR.length];
  const b = CYR[Math.floor(i / CYR.length) % CYR.length];
  return `${a}${b}`;
}

/** Өөр өөр "ажилтан" өөр сүлжээнээс бүртгүүлж байгааг дуурайх хуурамч IP. */
function fakeIp(i) {
  return `10.${(i >> 16) & 255}.${(i >> 8) & 255}.${i & 255}`;
}

const started = Date.now();
const results = await Promise.all(
  Array.from({ length: N }, (_, i) =>
    fetch(`${BASE}/api/register`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': fakeIp(i),
      },
      body: JSON.stringify({
        lastName: 'Тест',
        firstName: cyrillicName(i),
        department: 'Бусад',
        phone: `9${String(1000000 + i).padStart(7, '0')}`,
      }),
    }).then((r) => r.json()).catch(() => ({ ok: false })),
  ),
);

const okRows = results.filter((r) => r.ok);
const failRows = results.filter((r) => !r.ok);
const codes = new Set(okRows.map((r) => r.data.inviteCode));

console.log(`Хугацаа:       ${Date.now() - started} ms`);
console.log(`Амжилттай:     ${okRows.length} / ${N}`);
console.log(`Өвөрмөц код:   ${codes.size}`);
if (failRows.length > 0) {
  const sample = [...new Set(failRows.map((r) => r.error))].slice(0, 5);
  console.log(`Амжилтгүй шалтгаан (эхний 5): ${sample.join(' | ')}`);
}

if (okRows.length !== N) { console.error('✗ Зарим хүсэлт амжилтгүй'); process.exit(1); }
if (codes.size !== N) { console.error('✗ Код давхардлаа!'); process.exit(1); }
console.log('✓ Бүх код өвөрмөц');
