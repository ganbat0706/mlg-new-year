const WINDOW_MS = 60_000;
const MAX_HITS = 10;

const hits = new Map<string, number[]>();

/** true буцаавал хязгаар хэтэрсэн — хүсэлтийг татгалзана. */
export function hitRateLimit(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_HITS) {
    hits.set(key, recent);
    return true;
  }

  recent.push(now);
  hits.set(key, recent);

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
