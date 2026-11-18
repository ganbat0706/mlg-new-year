import { Brand } from '@/components/Brand';
import { PlayClient } from './PlayClient';

export const dynamic = 'force-dynamic';

export default function PlayPage() {
  return (
    <main className="mx-auto max-w-xl px-5 py-8">
      <Brand className="h-8" />
      <div className="mt-8">
        <PlayClient />
      </div>
    </main>
  );
}
