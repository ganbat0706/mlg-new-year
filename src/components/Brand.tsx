import Image from 'next/image';

export function Brand({ className = '' }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="Monlogistics Group"
      width={480}
      height={133}
      priority
      className={`h-10 w-auto ${className}`}
    />
  );
}
