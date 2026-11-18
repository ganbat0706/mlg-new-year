import { notFound } from 'next/navigation';
import { Brand } from '@/components/Brand';
import { findByInviteCode } from '@/lib/repo/registrations';
import { InviteActions } from './InviteActions';

export const dynamic = 'force-dynamic';

export default async function InvitePage(
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const reg = await findByInviteCode(code);
  if (!reg) notFound();

  return (
    <main className="mx-auto max-w-xl px-5 py-10">
      <Brand />

      <h1 className="mt-10 text-3xl font-extrabold tracking-tight">Таны урилга</h1>
      <p className="mt-2 text-base text-[#6B6568]">
        Урилгын дугаар <strong className="text-[#221E20]">{reg.inviteCode}</strong>
      </p>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/invite/${code}/image`}
        alt={`${reg.lastName} ${reg.firstName}-ийн урилга, дугаар ${reg.inviteCode}`}
        width={1080}
        height={1350}
        className="mt-6 w-full rounded-xl border border-[#DAD5CC]"
      />

      <div className="mt-6">
        <InviteActions code={code} />
      </div>

      <p className="mt-6 text-sm leading-relaxed text-[#6B6568]">
        Зураг татагдахгүй бол дээрх зураг дээр удаан дарж «Зураг хадгалах» сонгоно уу.
      </p>
    </main>
  );
}
