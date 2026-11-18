'use client';

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

async function call<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, init);
    const body = await res.json().catch(() => null);

    if (!res.ok || !body?.ok) {
      return {
        ok: false,
        status: res.status,
        error: body?.error ?? 'Алдаа гарлаа. Дахин оролдоно уу.',
      };
    }
    return { ok: true, data: body.data as T };
  } catch {
    return { ok: false, status: 0, error: 'Сүлжээний алдаа. Дахин оролдоно уу.' };
  }
}

export function apiGet<T>(url: string): Promise<ApiResult<T>> {
  return call<T>(url, { cache: 'no-store' });
}

export function apiPost<T>(url: string, body: unknown): Promise<ApiResult<T>> {
  return call<T>(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}
