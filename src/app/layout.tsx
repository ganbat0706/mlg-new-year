import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SoundToggle } from '@/components/SoundToggle';
import { Sky } from '@/components/Sky';
import { Garland } from '@/components/Garland';

export const metadata: Metadata = {
  title: 'Monlogistics — Шинэ жилийн баяр 2026',
  description: 'Тоглоом тоглож урилгаа аваарай.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0F1422',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn">
      <body className="min-h-dvh antialiased">
        <Sky />
        <div className="relative z-10">
          <div className="alkhan-band" aria-hidden="true" />
          <Garland />
          <SoundToggle />
          {children}
        </div>
      </body>
    </html>
  );
}
