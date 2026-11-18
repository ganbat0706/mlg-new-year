import { describe, it, expect } from 'vitest';
import { ok, bad, closed, readJson } from '@/lib/http';

describe('ok', () => {
  it('200 статустай JSON буцаана', async () => {
    const res = ok({ a: 1 });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: { a: 1 } });
  });
});

describe('bad', () => {
  it('анхдагчаар 400', async () => {
    const res = bad('буруу');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: 'буруу' });
  });
  it('статусыг дамжуулж болно', () => {
    expect(bad('олдсонгүй', 404).status).toBe(404);
  });
});

describe('closed', () => {
  it('410 буцаана', async () => {
    const res = closed();
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toContain('хаагдсан');
  });
});

describe('readJson', () => {
  it('зөв JSON-ийг уншина', async () => {
    const req = new Request('http://x', { method: 'POST', body: JSON.stringify({ a: 1 }) });
    expect(await readJson(req)).toEqual({ a: 1 });
  });
  it('буруу JSON-д null буцаана', async () => {
    const req = new Request('http://x', { method: 'POST', body: '{' });
    expect(await readJson(req)).toBeNull();
  });
  it('хоосон биед null буцаана', async () => {
    const req = new Request('http://x', { method: 'POST' });
    expect(await readJson(req)).toBeNull();
  });
});
