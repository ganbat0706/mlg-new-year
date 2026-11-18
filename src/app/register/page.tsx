import { redirect } from 'next/navigation';
import { isGameOpen } from '@/lib/config';
import { Brand } from '@/components/Brand';
import { RegisterForm } from './RegisterForm';

export const dynamic = 'force-dynamic';

export default function RegisterPage() {
  if (!isGameOpen()) redirect('/result');

  return (
    <main className="mx-auto max-w-xl px-5 py-10">
      <div className="enter"><Brand /></div>
      <h1 className="enter mt-10 text-3xl font-extrabold tracking-tight">Бүртгэл</h1>
      <p className="enter mt-2 text-base text-[#6B6568]">
        Овог нэрээ <strong>кирилл</strong> үсгээр бичнэ үү.
      </p>
      <div className="enter mt-8">
        <RegisterForm />
      </div>
    </main>
  );
}
