import { describe, it, expect } from 'vitest';
import { totalScore, rankAll, rankOf } from '@/lib/scoring';

const at = (iso: string) => new Date(iso);

describe('totalScore', () => {
  it('хоёр оноог нэмнэ', () => {
    expect(totalScore(1200, 800)).toBe(2000);
  });
  it('сөрөг утгыг 0 болгоно', () => {
    expect(totalScore(-50, 800)).toBe(800);
  });
  it('бутархайг бүхэлчилнэ', () => {
    expect(totalScore(100.6, 0)).toBe(101);
  });
});

describe('rankAll', () => {
  it('өндөр оноотой нь эхэнд', () => {
    const out = rankAll([
      { id: 'a', bestScore: 1000, bestFinishedAt: at('2026-12-01T10:00:00Z') },
      { id: 'b', bestScore: 3000, bestFinishedAt: at('2026-12-01T10:00:00Z') },
    ]);
    expect(out.map((r) => r.id)).toEqual(['b', 'a']);
    expect(out[0].rank).toBe(1);
    expect(out[1].rank).toBe(2);
  });

  it('тэнцсэн үед эрт дуусгасан нь дээгүүр', () => {
    const out = rankAll([
      { id: 'late', bestScore: 2000, bestFinishedAt: at('2026-12-01T12:00:00Z') },
      { id: 'early', bestScore: 2000, bestFinishedAt: at('2026-12-01T09:00:00Z') },
    ]);
    expect(out.map((r) => r.id)).toEqual(['early', 'late']);
  });

  it('дуусгаагүй (null) нь хамгийн доор', () => {
    const out = rankAll([
      { id: 'none', bestScore: 2000, bestFinishedAt: null },
      { id: 'done', bestScore: 2000, bestFinishedAt: at('2026-12-01T12:00:00Z') },
    ]);
    expect(out.map((r) => r.id)).toEqual(['done', 'none']);
  });

  it('байр 1-ээс эхэлж дараалан өснө', () => {
    const out = rankAll([
      { id: 'a', bestScore: 300, bestFinishedAt: at('2026-12-01T10:00:00Z') },
      { id: 'b', bestScore: 200, bestFinishedAt: at('2026-12-01T10:00:00Z') },
      { id: 'c', bestScore: 100, bestFinishedAt: at('2026-12-01T10:00:00Z') },
    ]);
    expect(out.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it('хоосон жагсаалт хоосон үр дүн', () => {
    expect(rankAll([])).toEqual([]);
  });

  it('эх массивыг өөрчлөхгүй', () => {
    const rows = [
      { id: 'a', bestScore: 100, bestFinishedAt: null },
      { id: 'b', bestScore: 200, bestFinishedAt: null },
    ];
    rankAll(rows);
    expect(rows[0].id).toBe('a');
  });
});

describe('rankOf', () => {
  const rows = [
    { id: 'a', bestScore: 300, bestFinishedAt: at('2026-12-01T10:00:00Z') },
    { id: 'b', bestScore: 200, bestFinishedAt: at('2026-12-01T10:00:00Z') },
  ];

  it('байрыг олно', () => {
    expect(rankOf(rows, 'b')).toBe(2);
  });

  it('олдохгүй бол null', () => {
    expect(rankOf(rows, 'zzz')).toBeNull();
  });
});
