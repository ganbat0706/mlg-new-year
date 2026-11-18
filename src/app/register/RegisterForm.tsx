'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEPARTMENTS } from '@/lib/departments';
import { saveSession } from '@/lib/session';
import { Button } from '@/components/Button';

export function RegisterForm() {
  const router = useRouter();
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lastName, firstName, department, phone }),
      });
      const body = await res.json();

      if (!res.ok || !body.ok) {
        setError(body.error ?? 'Алдаа гарлаа. Дахин оролдоно уу.');
        return;
      }

      saveSession(body.data);
      router.push('/rules');
    } catch {
      setError('Сүлжээний алдаа. Дахин оролдоно уу.');
    } finally {
      setBusy(false);
    }
  }

  const field =
    'min-h-12 w-full rounded-lg border border-[#DAD5CC] bg-white px-4 text-base ' +
    'outline-none focus:border-[#ED1C24]';

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label htmlFor="lastName" className="mb-1.5 block text-sm font-semibold">Овог</label>
        <input id="lastName" className={field} value={lastName} autoComplete="family-name"
               onChange={(e) => setLastName(e.target.value)} placeholder="Батхүү" required />
      </div>

      <div>
        <label htmlFor="firstName" className="mb-1.5 block text-sm font-semibold">Нэр</label>
        <input id="firstName" className={field} value={firstName} autoComplete="given-name"
               onChange={(e) => setFirstName(e.target.value)} placeholder="Ганбат" required />
      </div>

      <div>
        <label htmlFor="department" className="mb-1.5 block text-sm font-semibold">Хэлтэс</label>
        <select id="department" className={field} value={department} required
                onChange={(e) => setDepartment(e.target.value)}>
          <option value="">— сонгоно уу —</option>
          {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="phone" className="mb-1.5 block text-sm font-semibold">Утас</label>
        <input id="phone" className={field} value={phone} inputMode="numeric"
               autoComplete="tel" maxLength={8} placeholder="88112233"
               onChange={(e) => setPhone(e.target.value)} required />
        <p className="mt-1.5 text-sm text-[#6B6568]">
          Нэг дугаараар нэг л удаа бүртгүүлнэ.
        </p>
      </div>

      {error && (
        <p role="alert" className="enter-sm rounded-lg bg-[#FDECEC] px-4 py-3 text-base text-[#8A0F15]">
          {error}
        </p>
      )}

      <Button type="submit" busy={busy} className="w-full">
        Үргэлжлүүлэх
      </Button>
    </form>
  );
}
