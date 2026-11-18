'use client';

import { LoaderIcon } from './Loader';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost';
  /** true үед товчны доторх текстийг 20px «Ачаа» дүрс + «Түр хүлээнэ үү…» болгоно. */
  busy?: boolean;
};

export function Button({ variant = 'primary', className = '', busy = false, disabled, children, ...rest }: Props) {
  const base =
    'press inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-6 text-base ' +
    'font-semibold disabled:opacity-50 disabled:cursor-not-allowed';
  const look = variant === 'primary'
    ? 'bg-[#C21019] text-white hover:bg-[#9E0D14]'
    : 'border border-[#221E20] text-[#221E20] hover:bg-[#221E20] hover:text-white';

  return (
    <button className={`${base} ${look} ${className}`} disabled={disabled || busy} {...rest}>
      {busy ? (
        <>
          <LoaderIcon />
          Түр хүлээнэ үү…
        </>
      ) : children}
    </button>
  );
}
