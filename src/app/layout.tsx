import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Monlogistics — Шинэ жилийн баяр 2026',
  description: 'Тоглоом тоглож урилгаа аваарай.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#ED1C24',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn">
      <body className="min-h-dvh antialiased">
        <div className="alkhan-band" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
