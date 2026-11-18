import { describe, it, expect, beforeEach } from 'vitest';
import { registerOrGet, findByPhone, findByInviteCode } from '@/lib/repo/registrations';
import { resetDb } from './helpers/db';

const input = {
  lastName: 'батхүү',
  firstName: 'ганбат',
  department: 'Мэдээллийн технологи',
  phone: '88112233',
};

beforeEach(async () => { await resetDb(); });

describe('registerOrGet', () => {
  it('шинэ бүртгэл үүсгэж эхний кодыг өгнө', async () => {
    const r = await registerOrGet(input);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.inviteCode).toBe('MLG-202601');
    expect(r.value.attemptsLeft).toBe(3);
  });

  it('нэрийг хэвийн болгож хадгална', async () => {
    const r = await registerOrGet({ ...input, firstName: '  ганбат ' });
    expect(r.ok && r.value.firstName).toBe('Ганбат');
  });

  it('дараалсан кодууд өснө', async () => {
    const a = await registerOrGet(input);
    const b = await registerOrGet({ ...input, phone: '88112234' });
    expect(a.ok && a.value.inviteCode).toBe('MLG-202601');
    expect(b.ok && b.value.inviteCode).toBe('MLG-202602');
  });

  it('ижил утсаар дахин бүртгүүлэхэд ижил код буцаана', async () => {
    const a = await registerOrGet(input);
    const b = await registerOrGet({ ...input, firstName: 'өөр' });
    expect(a.ok && b.ok && a.value.inviteCode).toBe(b.ok ? b.value.inviteCode : '');
    expect(a.ok && b.ok && a.value.id).toBe(b.ok ? b.value.id : '');
  });

  it('латин нэрийг татгалзана', async () => {
    const r = await registerOrGet({ ...input, firstName: 'Ganbat' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('кирилл');
  });

  it('буруу утсыг татгалзана', async () => {
    expect((await registerOrGet({ ...input, phone: '12345' })).ok).toBe(false);
  });

  it('жагсаалтад байхгүй хэлтсийг татгалзана', async () => {
    expect((await registerOrGet({ ...input, department: 'Сансрын алба' })).ok).toBe(false);
  });

  it('зэрэг ирсэн ижил утасны 5 хүсэлт нэг л бүртгэл үүсгэнэ', async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () => registerOrGet(input)),
    );
    const ids = new Set(results.map((r) => (r.ok ? r.value.id : 'err')));
    expect(ids.size).toBe(1);
    expect(ids.has('err')).toBe(false);
  });

  it('зэрэг ирсэн 20 өөр утас бүгд өвөрмөц кодтой', async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        registerOrGet({ ...input, phone: `881122${String(i).padStart(2, '0')}` })),
    );
    const codes = results.map((r) => (r.ok ? r.value.inviteCode : 'err'));
    expect(new Set(codes).size).toBe(20);
    expect(codes).not.toContain('err');
  });
});

describe('findByPhone / findByInviteCode', () => {
  it('бүртгэлтэй утсаар олно', async () => {
    await registerOrGet(input);
    const found = await findByPhone('88112233');
    expect(found?.inviteCode).toBe('MLG-202601');
  });

  it('бүртгэлгүй утсаар null', async () => {
    expect(await findByPhone('99999999')).toBeNull();
  });

  it('кодоор олно', async () => {
    await registerOrGet(input);
    const found = await findByInviteCode('MLG-202601');
    expect(found?.firstName).toBe('Ганбат');
  });

  it('буцаасан өгөгдөлд утасны дугаар агуулагдахгүй', async () => {
    await registerOrGet(input);
    const found = await findByInviteCode('MLG-202601');
    expect(JSON.stringify(found)).not.toContain('88112233');
  });

  it('байхгүй кодоор null', async () => {
    expect(await findByInviteCode('MLG-209999')).toBeNull();
  });
});
