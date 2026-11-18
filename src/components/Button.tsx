'use client';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost';
};

export function Button({ variant = 'primary', className = '', ...rest }: Props) {
  const base =
    'inline-flex min-h-12 items-center justify-center rounded-lg px-6 text-base ' +
    'font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed';
  const look = variant === 'primary'
    ? 'bg-[#C21019] text-white hover:bg-[#9E0D14]'
    : 'border border-[#221E20] text-[#221E20] hover:bg-[#221E20] hover:text-white';

  return <button className={`${base} ${look} ${className}`} {...rest} />;
}
