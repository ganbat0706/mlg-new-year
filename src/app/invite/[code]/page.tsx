import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Brand } from '@/components/Brand';
import { findByInviteCode } from '@/lib/repo/registrations';
import { InviteActions } from './InviteActions';
import { InviteImage } from './InviteImage';

export const dynamic = 'force-dynamic';

export default async function InvitePage(
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const reg = await findByInviteCode(code);
  if (!reg) notFound();

  return (
    <main className="mx-auto max-w-xl px-5 pb-28 pt-6">
      <div className="enter"><Brand /></div>

      <h1 className="enter mt-10 text-3xl font-extrabold tracking-tight">Таны урилга</h1>
      <p className="enter mt-2 text-base text-[#6B6568]">
        Урилгын дугаар <strong className="text-[#221E20]">{reg.inviteCode}</strong>
      </p>

      <InviteImage code={code} alt={`${reg.lastName} ${reg.firstName}-ийн урилга, дугаар ${reg.inviteCode}`} />

      <div className="enter mt-6">
        <InviteActions code={code} />
      </div>

      <p className="enter mt-6 text-sm leading-relaxed text-[#6B6568]">
        Зураг татагдахгүй бол дээрх зураг дээр удаан дарж «Зураг хадгалах» сонгоно уу.
      </p>

      <Link
        href="/"
        className="enter press mt-8 flex min-h-14 items-center justify-center rounded-xl bg-[#C21019]
                   px-6 text-lg font-semibold text-white hover:bg-[#9E0D14]"
      >
        Тэмцээн рүү →
      </Link>
    </main>
  );
}
