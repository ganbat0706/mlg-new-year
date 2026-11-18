'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import { Button } from '@/components/Button';

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await apiPost('/api/admin/login', { password });
    if (!res.ok) { setError(res.error); return; }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="max-w-sm space-y-4">
      <div>
        <label htmlFor="pw" className="mb-1.5 block text-sm font-semibold">Нууц үг</label>
        <input
          id="pw" type="password" value={password} autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)}
          className="min-h-12 w-full rounded-lg border border-[#DAD5CC] bg-white px-4
                     text-base outline-none focus:border-[#ED1C24]"
        />
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-[#FDECEC] px-4 py-3 text-[#8A0F15]">{error}</p>
      )}
      <Button type="submit" className="w-full">Нэвтрэх</Button>
    </form>
  );
}
