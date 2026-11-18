const WINDOW_MS = 60_000;
// 8 оронтой монгол дугаарын орон зай ойролцоогоор 20 сая тул 60/минут хурдаар ч
// бүрэн задлахад 6 сараас дээш хугацаа шаардагдана — хамгаалалтын үр нөлөө бараг
// адилхан хэвээр үлдэнэ. Харин нэг оффис/NAT-ийн ард зэрэг бүртгүүлэх бодит
// урсгалд (~200 ажилтан нэг зарлалаар) 10/минут хэтэрхий хатуу байв.
const MAX_HITS = 60;

const hits = new Map<string, number[]>();

/**
 * true буцаавал хязгаар хэтэрсэн — хүсэлтийг татгалзана.
 * `scope` нь endpoint тус бүрийг тусдаа тоолуурт хуваана (жишээ нь 'register' ба
 * 'standing') — ижил IP-гаас ирсэн хүсэлтүүд нэг endpoint дээр хязгаар хэтрэхэд
 * нөгөө endpoint рүү нөлөөлөхгүй.
 */
export function hitRateLimit(scope: string, key: string): boolean {
  const bucketKey = `${scope}:${key}`;
  const now = Date.now();
  const recent = (hits.get(bucketKey) ?? []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_HITS) {
    hits.set(bucketKey, recent);
    return true;
  }

  recent.push(now);
  hits.set(bucketKey, recent);

  // Санах ой хэт өсөхөөс сэргийлж хааяа цэвэрлэнэ.
  if (hits.size > 1000) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }

  return false;
}

export function clientIp(req: Request): string {
  // x-real-ip нь платформоос тавигддаг — клиент өөрөө өөрчилж чадахгүй.
  // x-forwarded-for бол клиентийн илгээсэн header тул дур мэдэн хуурамчаар
  // солиод хязгаарлалтаас мултарч болно, иймд үүнийг эхэнд нь тавихгүй.
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return 'unknown';
}

/** Зөвхөн тестэд — тоолуурыг тэглэнэ. */
export function resetRateLimit(): void {
  hits.clear();
}
