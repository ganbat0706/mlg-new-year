import { describe, it, expect } from 'vitest';
import {
  CONTESTS, contestState, contestById, activeContest, nextContest,
  focusContest, allContestsClosed, contestStartsAt, contestEndsAt,
} from '@/lib/contests';

const at = (iso: string) => new Date(iso);

describe('CONTESTS тохиргоо', () => {
  it('яг гурван тэмцээнтэй, id нь давхардахгүй', () => {
    expect(CONTESTS).toHaveLength(3);
    expect(new Set(CONTESTS.map((c) => c.id)).size).toBe(3);
  });

  it('тэмцээн бүр эхлэхээсээ ӨМНӨ дуусдаггүй', () => {
    for (const c of CONTESTS) {
      expect(contestEndsAt(c).getTime()).toBeGreaterThan(contestStartsAt(c).getTime());
    }
  });

  it('тэмцээнүүд хоорондоо давхцахгүй', () => {
    const sorted = [...CONTESTS].sort((a, b) => contestStartsAt(a).getTime() - contestStartsAt(b).getTime());
    for (let i = 1; i < sorted.length; i++) {
      expect(contestStartsAt(sorted[i]).getTime())
        .toBeGreaterThan(contestEndsAt(sorted[i - 1]).getTime());
    }
  });

  it('бүгд арга хэмжээний өдрөөс (2026-12-05) өмнө дуусна', () => {
    for (const c of CONTESTS) {
      expect(contestEndsAt(c).getTime()).toBeLessThan(at('2026-12-05T00:00:00+08:00').getTime());
    }
  });
});

describe('contestState', () => {
  const c = CONTESTS[0];
  it('эхлэхээс өмнө upcoming', () => {
    expect(contestState(c, new Date(contestStartsAt(c).getTime() - 1000))).toBe('upcoming');
  });
  it('яг эхлэх мөчид open', () => {
    expect(contestState(c, contestStartsAt(c))).toBe('open');
  });
  it('яг дуусах мөчид бас open (хил нь багтана)', () => {
    expect(contestState(c, contestEndsAt(c))).toBe('open');
  });
  it('дууссаны дараа closed', () => {
    expect(contestState(c, new Date(contestEndsAt(c).getTime() + 1000))).toBe('closed');
  });
});

describe('activeContest / nextContest / focusContest', () => {
  it('тэмцээний дундуур тэр тэмцээнийг буцаана', () => {
    const c = CONTESTS[1];
    const mid = new Date((contestStartsAt(c).getTime() + contestEndsAt(c).getTime()) / 2);
    expect(activeContest(mid)?.id).toBe(c.id);
  });

  it('хоорондын завсарт нээлттэй тэмцээн байхгүй, дараагийнх нь мэдэгдэнэ', () => {
    const gap = new Date(contestEndsAt(CONTESTS[0]).getTime() + 60_000);
    expect(activeContest(gap)).toBeNull();
    expect(nextContest(gap)?.id).toBe(CONTESTS[1].id);
  });

  it('эхлэхээс өмнө focusContest нь эхний тэмцээн', () => {
    const before = new Date(contestStartsAt(CONTESTS[0]).getTime() - 86_400_000);
    expect(focusContest(before).id).toBe(CONTESTS[0].id);
  });

  it('завсарт focusContest нь сүүлд ДУУССАН тэмцээн (жагсаалт нь хэрэгтэй)', () => {
    const gap = new Date(contestEndsAt(CONTESTS[0]).getTime() + 60_000);
    expect(focusContest(gap).id).toBe(CONTESTS[0].id);
  });

  it('бүгд дууссаны дараа allContestsClosed', () => {
    const after = new Date(contestEndsAt(CONTESTS[2]).getTime() + 1000);
    expect(allContestsClosed(after)).toBe(true);
    expect(activeContest(after)).toBeNull();
    expect(nextContest(after)).toBeNull();
    expect(focusContest(after).id).toBe(CONTESTS[2].id);
  });
});

describe('contestById', () => {
  it('байгаа id-г олно', () => expect(contestById('quiz')?.name).toBeTruthy());
  it('байхгүй id-д undefined', () => expect(contestById('alga')).toBeUndefined());
});
