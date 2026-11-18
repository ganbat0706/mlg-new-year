export function ok<T>(data: T): Response {
  return Response.json({ ok: true, data }, { status: 200 });
}

export function bad(error: string, status = 400): Response {
  return Response.json({ ok: false, error }, { status });
}

export function closed(): Response {
  return Response.json(
    { ok: false, error: 'Тоглоом хаагдсан байна' },
    { status: 410 },
  );
}

export function boom(): Response {
  return Response.json(
    { ok: false, error: 'Түр зуурын алдаа гарлаа. Дахин оролдоно уу.' },
    { status: 500 },
  );
}

export async function readJson<T = unknown>(req: Request): Promise<T | null> {
  try {
    const text = await req.text();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
