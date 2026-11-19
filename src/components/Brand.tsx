import Image from 'next/image';

/**
 * Лого — ҮРГЭЛЖ цагаан ялтас дээр. Лого дотор хар үсэг байдаг тул шөнийн
 * дэвсгэр дээр шууд тавибал уншигдахаа болино. Ялтас нь зүүн талдаа алтан
 * захтай — агуулахын шошго шиг.
 */
export function Brand({ className = '' }: { className?: string }) {
  return (
    <span className="sheet-logo">
      {/*
        className нь ЗУРАГ дээр очно, ялтас дээр биш: дуудагчид `h-8` гэх мэт
        өндрийн класс дамжуулдаг бөгөөд үүнийг ялтас дээр тавибал ялтас
        агуулгаасаа намхан болж лого доороос нь халина (бодит зураг дээр
        /play хуудсан дээр 14px халиж байсан).
      */}
      <Image
        src="/logo.png"
        alt="Monlogistics Group"
        width={480}
        height={133}
        priority
        className={`block h-9 w-auto ${className}`}
      />
    </span>
  );
}
