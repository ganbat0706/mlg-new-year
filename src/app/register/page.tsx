import { redirect } from 'next/navigation';
import { isGameOpen } from '@/lib/config';
import { Brand } from '@/components/Brand';
import { RegisterForm } from './RegisterForm';

export const dynamic = 'force-dynamic';

export default function RegisterPage() {
  if (!isGameOpen()) redirect('/result');

  return (
    <main className="mx-auto max-w-xl px-5 pb-28 pt-6">
      <div className="enter"><Brand /></div>
      <h1 className="enter mt-10 text-3xl font-extrabold tracking-tight">Бүртгэл</h1>
      <p className="enter mt-2 text-base text-[#C9D6E6]">
        Овог нэрээ <strong className="text-[#FAF7F0]">кирилл</strong> үсгээр бичнэ үү.
      </p>
      {/* Маягт бүхэлдээ нэг цаасан хуудсан дээр — илгээмжийн карт шиг. */}
      <div className="enter sheet mt-8">
        <div className="flex items-baseline justify-between">
          <span className="sheet-tag">Ажилтны карт</span>
          <span className="text-xs text-[#6B6568]">№ ______</span>
        </div>
        <div className="mt-3 mb-5 border-t border-dashed border-[#DAD5CC]" />
        <RegisterForm />
      </div>
    </main>
  );
}
