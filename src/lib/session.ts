'use client';

const KEY = 'mlg.registration';

export type Session = {
  id: string;
  lastName: string;
  firstName: string;
  inviteCode: string;
  attemptsLeft: number;
  bestScore: number;
};

export function saveSession(s: Session): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ }
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    return typeof parsed?.id === 'string' ? parsed : null;
  } catch { return null; }
}

export function clearSession(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
