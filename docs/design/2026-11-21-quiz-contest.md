# Contest 3 — «Мэдлэгийн тэмцээн», the Kahoot-style quiz

**Date:** 2026-11-21 · **Extends:** `2026-11-20-festive-art-direction.md` (palette, sheets, moments, sound), `2026-11-20-result-screen.md`, `2026-11-21-background-rail-and-plane.md` (node budget) · **Framework:** `src/lib/contests.ts` (`id: 'quiz'`, one play per employee, one winner)
**Brief (client):** "Online Quiz baih ym teriig bas quizin asuultuudiig admin oruulna er n gol aguulga n kahoot shg quiz tgloom gsen ug" — an online quiz, questions entered by the admin, Kahoot-like in feel.
**Scope:** the player stage (`/play` while contest 3 is open) and the admin question editor (`/admin/quiz`). Nothing in the other two contests changes. No new dependency, no new font, no blur, Tailwind v4 + the existing plain CSS.

Contrast ratios use the WCAG 2.x formula; pairs already measured in the art direction are cited with the same numbers, new pairs are computed here. AA: 4.5 normal text, 3.0 large text and UI boundaries.

---

## 1. The idea

**It is the dispatch office at the terminal, the night of the party, and someone is reading questions off a manifest.** The question is a paper sheet pinned up in front of you with a red fuse burning along its bottom edge. Under it, on the night, are four lit signal panels — **red steel, snow, gold light, sky** — the four materials of this product, each with a shape stamped on it. You slap one. The office goes quiet for a heartbeat while the manifest is checked. The panel lights green and a bell rings, or it thuds red and the right panel lights up so you learn something. Answer four in a row and you have a **цуваа** — a convoy — and every answer in the convoy carries extra freight.

What makes it a game and not a form, in order of importance:

1. **One tap is the whole interaction.** No radio buttons, no "Дараах" button, no scrolling. Tap a panel and the question is gone. The player never confirms anything.
2. **The clock is visible and it costs points.** Not a deadline — a price. Faster is worth more, every second, and the fuse on the manifest shows it burning.
3. **The outcome is a physical event**, not a tick in a list: the panel changes colour, the right one lights, the score row pops, a bell or a thud.
4. **The convoy.** A streak you can see growing in the score row, with the bonus printed on it, and lose in one miss.
5. **Panels, not rows.** Opaque coloured slabs with shadows, a 2 × 2 grid, bold type, a shape on each — the Kahoot silhouette, in our palette.

What it is *not*: a live room. There is no host, no PIN, no lobby, no between-question podium. Each employee plays alone, once, whenever they like inside the window. Every Kahoot element that needs a shared screen is dropped and §8 says which.

---

## 2. Rules

### 2.1 Constants (proposed `QUIZ` block in `src/lib/config.ts`)

| Constant | Value | Meaning |
|---|---|---|
| `QUESTIONS` | **8** | Questions per play |
| `POOL_MIN` | **8** | Pool size below which the server refuses to begin a play |
| `POOL_TARGET` | **24** | Pool size the admin screen asks for (3 × a play) |
| `OPTIONS_MIN` / `OPTIONS_MAX` | **2 / 4** | Answer options per question |
| `QUESTION_MAX_CHARS` / `OPTION_MAX_CHARS` | **120 / 40** | Admin validation (sized for the tiles, §3.3) |
| `TIME_LIMIT_MS` | **15 000** | Visible countdown per question |
| `SPEED_FLOOR_MS` | **3 000** | Answers at or under this get the full speed bonus |
| `CORRECT_POINTS` | **75** | Any correct answer |
| `SPEED_POINTS` | **35** | Maximum speed bonus, linear from the floor to the limit |
| `STREAK_FROM` | **4** | Convoy length at which the bonus starts |
| `STREAK_POINTS` | **16** | Bonus per question while the convoy is ≥ 4 |
| `REVEAL_MS` | **1 400** | Fixed outcome hold after every answer; no input accepted |
| `GRACE_MS` | **1 500** | Server accepts an answer up to this long after the visible limit (replaces `PLAY.GRACE_MS` for this game only: the quiz has a delivery hop the other games do not) |
| `MIN_READ_MS` | **800** | Used only in the nominal-duration formula below |
| `NOMINAL_MS` | `QUESTIONS × (REVEAL_MS + MIN_READ_MS)` = **17 600** | The "game duration" for the existing 0.8× elapsed check |
| `MAX_SCORE` | **960** | Same ceiling as the four games |

### 2.2 Scoring, with the arithmetic

Per question, where `t` is the **server-measured** answer time in ms (§2.4):

```
correct   = pick === correctIndex ? 75 : 0
speed     = correct ? round( 35 × (1 − clamp((t − 3000) / 12000, 0, 1)) ) : 0
streak    = correct ? streak + 1 : 0          // consecutive correct, this one included
convoy    = (correct && streak ≥ 4) ? 16 : 0
points    = correct + speed + convoy
```

`round` is round-half-up (`Math.round`). Wrong and timed-out answers score 0; there are no negative points (Kahoot has none, and a one-play contest should not punish a guess).

| Answer time `t` | speed | correct + speed |
|---|---|---|
| ≤ 3.0 s | 35 | **110** |
| 6.0 s | round(35 × 0.75) = 26 | 101 |
| 9.0 s | round(35 × 0.50) = 18 | 93 |
| 12.0 s | round(35 × 0.25) = 9 | 84 |
| ≥ 15.0 s (incl. the grace window) | 0 | 75 |

**Ceiling.** 8 questions × 110 = 880. Convoy bonus starts on the 4th consecutive correct answer, so in a perfect run it applies to questions 4, 5, 6, 7, 8: 5 × 16 = 80. **880 + 80 = 960.** Fixed, reachable by a sharp player who knows the material (3 s is enough to read a short question you know the answer to), and not reachable by luck.

**Convoy worked example.** Correct on 1–2, wrong on 3, correct on 4–8: streak runs 1, 2, 0, 1, 2, 3, 4, 5 → bonus on Q7 and Q8 only = 32. If every correct answer took ~6 s: 7 × 101 + 32 = **739**.

**Why these weights.** Correct must dominate speed (75 vs 35) or the contest rewards reflexes over knowledge and people will tap red every time. Speed must be worth more than a single convoy step (35 vs 16) or the convoy dominates — and the convoy must be worth something or it is decoration. The 3 s floor exists so that at the top of the table, Wi-Fi latency (100–400 ms, §2.4) decides nothing: two people who both know the answer both get 110. Below the floor, 35 points over 12 s is 2.9 points per second; 300 ms of latency is under one point.

**Tie-break.** Exactly one winner, 200 players, integer scores: ties will happen. Recommend ranking the quiz contest by `score DESC, totalAnswerTimeMs ASC` (the sum of the eight `t` values, stored on the attempt), falling back to the existing earlier-`finishedAt` rule. One line in `rankAll`; not part of the visual spec.

### 2.3 Pool, selection, shuffling

- Each play draws **8 questions from the pool at random**, and **shuffles the option order per question per player**. Both come from the attempt's seed: `generateQuizSchedule(seed, pool)` = `pickN(pool, 8, rng)` then, for each picked question, `shuffle([0..k−1], rng)` as the option permutation. Pure, deterministic, the same function on the server at every step.
- The pool is the list of non-archived questions **sorted by `seq`** (an integer assigned at creation, like `inviteSeq`), never by admin display order — so the schedule for a given seed is stable.
- Random subsets and shuffled options are the anti-collusion measure: with 200 colleagues in one building, "Q3 is B" in the group chat is inevitable; with 8-of-24 and shuffled tiles it is nearly useless.
- **The pool is frozen while the contest is open or closed.** From `startsAt` on, the admin may fix typos in question or option text only; adding, archiving, changing the number of options or the correct index is refused by the API (409) and disabled in the UI (§6.5). Before `startsAt` everything is editable. This is what keeps `f(seed, pool)` identical for an in-progress attempt.
- If the pool has fewer than 8 questions when a player presses `Эхлэх`, the server refuses `begin` and the player sees §3.7's "not ready" notice. The admin screen makes this state impossible to miss (§6.3).

### 2.4 Server authority — where the correct answer lives at every moment

The invariant from the four games holds: **the browser's score is never trusted, the server regenerates the schedule from the seed and scores from an event list with a pure function.** What differs is *transport*: a quiz needs per-question feedback, and the correct answer can only be revealed once the answer is locked in, so the event list is posted **one event at a time**, each answer getting its outcome in the reply. The stored artefact is still an event list; the final score is still `scoreQuiz(schedule, events)` run once over the stored list; the per-answer replies are a convenience view of the same arithmetic.

| Moment | Where the correct answer is | What the browser holds |
|---|---|---|
| Admin saves a question | `quiz_questions.correct_index` in the DB. Readable only by admin-cookie routes. | — |
| Player presses `Эхлэх` → `POST …/quiz { begin: true }` | Server stores `quizStartedAt`, derives the schedule from the seed, and replies with **question 1 only**: `{ q: 1, total: 8, text, options: [string × k] }` — the option strings in the shuffled order. No ids, no index, no `isCorrect`. | Question 1 text and options. |
| Player answers → `POST …/quiz { q: 1, pick: 2 }` (`pick` = tile position 0–3, or `null` on timeout) | Server maps the position back through the schedule's permutation, compares, stores the event, computes points. **Only now** does it reply with `correctPos` for this question — the window for this question is closed. | After the reply: `{ correct, correctPos, points, streak, score, next: { q: 2, … } \| null }`. |
| Reveal hold (1.4 s) | — | The outcome of q 1 and the text of q 2. Never the answer to q 2. |
| Last answer | Server writes `quizScore = scoreQuiz(schedule, events)`, `quizDone`, `flagged` as the other games do, and replies with `next: null, score, maxScore: 960, flagged`. | Final numbers for the stamp. |

**What is sent back is only `{ q, pick }`.** Nothing about time: the quiz does **not** trust a client `t`. Because the schedule is served one question at a time, the server has a timestamp for every hand-off and measures speed itself:

```
sentAt(1)   = quizStartedAt
sentAt(k>1) = the moment the server replied to answer k−1
t(k)        = receivedAt(k) − sentAt(k) − (k > 1 ? REVEAL_MS : 0), floored at 0
```

The client shows question k only after its 1 400 ms reveal of k−1, so subtracting `REVEAL_MS` is exact; what remains in `t` is the player's reading/thinking time plus one network round trip — paid equally by everyone and made irrelevant at the top by the 3 s floor.

Per-question acceptance rules (the quiz's form of the 200 ms gap):

| Arrival of answer k | Result |
|---|---|
| earlier than `sentAt(k) + REVEAL_MS − 100 ms` (k > 1) or `+ 200 ms` (k = 1) | The question was not yet on any screen. Rejected, 0 points, **flagged** `quiz: боломжгүй хурд` (−100 ms tolerates instance clock skew). A human cannot trigger this: the honest path is reply latency + 1 400 ms hold + ≥ 300 ms to see the tiles + request latency. |
| within `sentAt + REVEAL_MS + 15 000 + 1 500` | Scored normally. Beyond 15 000 the speed term is already 0, so the grace window is worth at most 75 points for a correct answer — the same as answering at 14.9 s. |
| later than that, or `pick: null`, or the player comes back after leaving | Timed out: 0, streak 0. The reply still carries `correctPos` so the reveal can show it. |
| a second answer for an already-answered `q` | Ignored; the stored outcome is returned again (idempotent — this is what makes client retries safe, §3.4). |

**The existing elapsed check** (`elapsed ≥ 0.8 × nominal`, non-negotiable) uses `NOMINAL_MS = 8 × (1 400 + 800) = 17 600 ms → threshold 14 080 ms`, measured from `quizStartedAt` to the arrival of the last answer. The fastest honest play — eight answers at 1 s each, the 1.4 s hold between each, ~150 ms per round trip — is 8 × 2 550 ≈ **20 400 ms**, 45 % above the threshold; a typical play is 60–100 s. A script posting eight answers back-to-back fails the per-question earliest-arrival rule first and the elapsed check second; either way it scores 0 and is flagged, exactly as the other games.

**Schema and route, in one line each** (so nothing is guessed): attempt gains `quizScore int`, `quizDone bool`, `quizStartedAt timestamptz`, `quizEvents jsonb` (`[{ q, pick, t }]` with the server-computed `t`), `quizTimeMs int`; questions live in `quiz_questions (id uuid, seq serial, text, options text[], correct_index int, archived_at timestamptz null, created_at, updated_at)`; player route `POST /api/attempt/[id]/quiz` with `{ begin: true } | { q, pick }`; admin routes under `/api/admin/quiz`.

---

## 3. The player screen, state by state

Shared with every stage: rail, garland (frozen while running via `data-stage="running"`), logo label, sound toggle; the plane fades out while running per the background spec. Page container `mx-auto max-w-2xl px-5` — 350 px content at 390.

### 3.1 Ready sheet

`StageReady` as built, with two differences: the chip and a second paragraph. Give `StageReady` an optional `chip` prop (default `Шат {step} / 4`).

- Chip: **`ТЭМЦЭЭН 3 / 3`** — `.sheet-tag`, 12 px / 700 / `#C21019` on paper **5.80**.
- Icon, 40 px, ink `#221E20`, static: a manifest sheet (rect 10,6 24×30 rx3, three lines at y 16/22/28 from x 15 to 29, 2.5 stroke) with a bold `?` 16 px centred in the lower half — the only question mark on the product.
- Title `Мэдлэгийн тэмцээн` — 30 px / 800 / ink **15.40**.
- Description 16 px / 400 / muted `#6B6568` **5.32**, `max-w-sm`, with the numbers in `<strong>` ink:
  `**8** асуулт, тус бүрд **15 секунд**. Зөв хариулт **75** оноо, хурдан хариулбал **35** хүртэл нэмэгдэнэ. **4**-өөс дээш дараалан зөв бол асуулт бүрд **+16**.`
- Second line, `margin-top: 12px`, 14 px / 600 / `#8A0F15` **8.51**: `Нэг л удаа тоглоно. Эхэлмэгц зогсоох боломжгүй.`
- Button `Эхлэх` — unchanged. On press: `audio.cue('start')`, the button goes `busy` (`Түр хүлээнэ үү…`, existing Button prop) until `begin` returns with question 1, then the running screen mounts. Typical wait 100–400 ms; the busy state exists so a slow network does not look like a dead button.
- Sheet enters with the §6.3 stage-start beat (unchanged).

### 3.2 Running — the layout (390 px)

Top to bottom, under the header row:

| # | Block | Surface | Height | Notes |
|---|---|---|---|---|
| 1 | **Score row** | night | 20 px | `margin-top: 24px`. Three cells: left score + badge, centre convoy pill, right countdown. |
| 2 | **Question sheet** | paper, `.sheet` | min 152 px | `margin-top: 12px`. Chip, question, fuse. |
| 3 | **Tile grid** | night | ~202 px (2 × 2) | `margin-top: 12px`. |
| 4 | **Status line** | night | 24 px reserved | `margin-top: 10px`, `min-height: 24px` so the layout never jumps; usually empty. |

Total ≈ 150 (header) + 20 + 12 + 152 + 12 + 202 + 34 = **582 px**: above the fold on 844, and on a 667 px SE with nothing hidden. Nothing scrolls during a question.

**Score row.** `flex items-baseline justify-between`, 14 px / 600, `font-variant-numeric: tabular-nums`.
- Left: `Оноо: 412` frost `#C9D6E6` on night **12.46**. After a correct answer the `+N` badge (`pts-badge-in`, 14 px / 700 / `#7FE0A6` **11.47**) sits 8 px to its right for the length of the reveal.
- Centre: the **convoy pill** (§3.5). Absent until the streak reaches 2.
- Right: `12 сек` frost; `#FF8A8E` **8.11** at ≤ 3 s (§4).

**Question sheet.** `.sheet` (paper, radius 16, padding 20, the standard shadow) with `position: relative; overflow: hidden; min-height: 152px`.
- Chip row: `.sheet-tag` **`АСУУЛТ 3 / 8`** left (5.80). Right side empty unless timed out, when it shows `Цаг дууслаа` 12 px / 700 / `#8A0F15` **8.51**, uppercase, same tracking.
- Question text, `margin-top: 10px`, ink **15.40**, `line-height: 1.3`, left-aligned, `font-weight: 700`: **20 px when the text is ≤ 80 characters, 17 px when longer** (up to 120). At 20 px bold Inter fits ~26 Cyrillic characters per line in 310 px, so 80 characters is ≤ 3 lines (78 px); at 17 px ~31 per line, so 120 characters is ≤ 4 lines (88 px). The `min-height` holds three lines, so the tile grid does not move between short questions; a 4-line question pushes it 10 px, once.
- **The fuse** (countdown bar) along the sheet's bottom edge, inside the sheet's clip: `position: absolute; left: 0; right: 0; bottom: 0; height: 6px`. Track `#E3DED2` (decorative, 1.37 on paper — the numeral carries the information). Fill `#ED1C24`, brand red on paper **4.10**, above the 3.0 boundary minimum for non-text UI, the same justification as the result card's meters. Form and behaviour in §4.

**Tile grid.** `display: grid; gap: 10px`. **Four options → `grid-cols-2`** (two rows of two, 170 px each); **two or three options → one column** of full-width rows. The 2 × 2 is the Kahoot silhouette and reads as a board; a lone fourth-row tile under a 2 × 2 would look like the "right" one, so three options stack.

Tile anatomy, 2 × 2: `min-height: 96px; padding: 10px 14px; border-radius: 12px; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; box-shadow: 0 6px 16px rgba(0,0,0,.35)`. Inside: the slot **glyph** (14 px SVG, `currentColor`) then the option text 4 px below, **16 px / 700 / `line-height: 1.25`**, left-aligned, no truncation. 142 px of text width fits ~15 bold Cyrillic characters a line; the 40-character option limit is therefore ≤ 3 lines (60 px) and the tile grows to 98 px for it — hence the limit.

Tile anatomy, stacked: `min-height: 64px` (three options) or `72px` (two); `padding: 12px 16px; flex-direction: row; align-items: center; gap: 12px`; glyph 16 px at the left, text 17 px / 700.

**The four slots** are fixed by position, not by content (the content is shuffled per player; the slot colours are the board):

| Slot | Position | Fill | Text | Ratio | Glyph |
|---|---|---|---|---|---|
| A | top-left | `#C21019` brand-text (the button red) | `#FFFFFF` | **6.21** | ▲ `M8 2 L14 13 H2 Z` |
| B | top-right | `#C9D6E6` frost | `#221E20` ink | **11.17** (computed: L 0.662 vs 0.0137) | ◆ `M8 1 L15 8 L8 15 L1 8 Z` |
| C | bottom-left | `#E8B931` gold | `#221E20` ink | **8.96** | ● `circle 8 8 r6.5` |
| D | bottom-right | `#2A3350` night-500, plus `border: 1.5px solid rgba(201,214,230,.55)` | `#FAF7F0` paper | **11.63**; the border composites to ≈`#757F8E`, **4.54** against the sky and **3.07** against the fill, so the tile has an edge | ■ `rect 2 2 12 12 rx1.5` |

Red steel, snow, gold light, sky. Every tile is an opaque slab on the night; the sky tile needs its border because night-500 on night-900 is 1.48 and would read as a hole. Glyphs are the Kahoot shapes on purpose: everyone who has ever played one knows them, they cost no reading, and they are the colour-blind channel. Tiles are `<button type="button">` with `aria-label="Хариулт А: {text}"`; the glyph is `aria-hidden`.

**Decoration forbidden:** inside the question sheet; inside and within 12 px of the tile grid; over the score row. Nothing in this screen moves except what §7 lists.

### 3.3 Question appears

Both at the first question (after `begin`) and at every swap:

- The sheet's content mounts with `quiz-h2-in` (existing: 180 ms `--out`, translateY 8 → 0, opacity). Keyed by `q` so the fuse animation restarts from full.
- Tiles mount with `quiz-opt-in` (existing: `mount-in-sm` 160 ms `--out`), staggered **0 / 40 / 80 / 120 ms** by slot, A → D.
- The fuse starts at mount of the sheet. The numeral shows `15 сек`.
- The countdown's wall-clock origin is the moment the question's data was received (`Date.now()` at `setState`), exactly as the other stages use `startedAtRef`.
- Tiles are interactive **from first paint**; there is no arming delay. The speed floor already removes any reason to tap before reading.
- No sound. Eight question arrivals with a cue each would be a doorbell.

### 3.4 Answer chosen → waiting → feedback

This is the moment the brief asks about. From the tap to the outcome there is a network round trip (100–400 ms on a normal connection; longer on venue Wi-Fi), and the screen must make that gap feel like *suspense*, not *loading*.

**At the tap (`pointerdown`, t₀):**
1. The tapped tile does `.press` (scale .97, 90 ms) — the only transform.
2. All four tiles get `pointer-events: none` immediately (a latch, as in `SortStage.tappingRef`).
3. The chosen tile gets `outline: 3px solid #FAF7F0; outline-offset: 2px` (paper on night **17.16** as a boundary), transition 120 ms linear. It keeps its slot colour. It looks *held down*, not *answered*.
4. The other tiles drop to `opacity: .55`, transition 150 ms linear. (Computed worst case: white-on-red composited over night at .55 is still 3.78; ink-on-frost 4.28. These tiles are non-interactive for ≤ 1.4 s + latency; the state is transient.)
5. The countdown **freezes**: the numeral stops updating; the fuse gets `animation-play-state: paused`. The clock has been stopped for this player — the server's clock is what counts, and the player's time is already in flight.
6. `POST { q, pick }` is sent. No sound at the tap: the next sound is the verdict.

**During the wait:** nothing else. The held tile and the dimmed board are the signal. If the reply has not arrived at **t₀ + 600 ms**, the status line shows `Холбогдож байна…` — 13 px / 400 / frost **12.46**, `fade-in` 150 ms. It is removed when the reply arrives.

**If the request fails** (network error, 5xx, timeout at 4 s): retry the identical payload at t₀ + 800 ms and t₀ + 2 000 ms; the server is idempotent on `(attemptId, q)` so a duplicate is harmless. If all three fail: `StageNotice` with `Хариултыг илгээж чадсангүй. Сүлжээгээ шалгаад дахин илгээнэ үү — серверийн цаг зогсохгүй.` and the button `Дахин илгээх`. The server clock did keep running; if the answer now arrives past the deadline the question is scored as timed out and the reveal says so. Rare, honest, and it costs the player at most one question.

**Timeout before any tap:** at `15 сек → 0` the client applies steps 2 and 4 to all four tiles (no outline, no held tile), writes `Цаг дууслаа` in the chip row, and sends `{ q, pick: null }`. The reveal that follows is the "wrong" reveal without a wrong tile.

**Reply arrives (t₁) → the reveal, 1 400 ms, no input accepted.**

*Correct:*
- Chosen tile: fill → `#1A5C3D` ok-fill, text → white **7.43**, outline removed, glyph swapped for a ✓ (`M3 8.5 L6.5 12 L13 4`, stroke 2.5, `currentColor`). Colour transition 120 ms linear. The other three stay dimmed.
- `audio.cue('correct')` at t₁. If this answer made the convoy ≥ 4, use the streak variant (§5.3).
- t₁ + 60 ms: score text updates to the new total (set, not rolled — a 900 ms roll eight times is a slot machine); the `+110` badge pops in `#7FE0A6` (`pts-badge-in`, 200 ms `--spring`); the convoy pill updates (§3.5).

*Wrong:*
- Chosen tile: fill → `#8A0F15` bad-fill, text white **9.09**, outline removed, glyph → ✕ (`M4 4 L12 12 M12 4 L4 12`, stroke 2.5); `shake-x` 320 ms `--out` on this tile only.
- The correct tile returns to `opacity: 1` and gets `outline: 3px solid #7FE0A6; outline-offset: 2px` (**11.47** against the sky), its glyph → ✓. The player learns the answer; Kahoot does this and the office quiz tradition depends on it.
- The remaining two stay dimmed.
- `audio.cue('wrong')` at t₁. No badge. The convoy pill disappears at t₁ + 60 ms (no exit animation; product rule).

*Timed out:* as wrong, with no bad tile; `Цаг дууслаа` already in the chip row; `wrong` cue at −6 dB (a softer thud — the player did not do anything wrong, they just ran out).

### 3.5 The convoy pill

Centre cell of the score row. `border-radius: 9999px; padding: 2px 10px; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; min-height: 22px`.

| Streak | Look | Text | Ratio |
|---|---|---|---|
| 0–1 | not rendered | — | — |
| 2–3 | ghost: transparent, `border: 1px solid rgba(201,214,230,.45)`, frost text | `ЦУВАА 2` / `ЦУВАА 3` | **12.46** |
| ≥ 4 | gold fill `#E8B931`, ink text | `ЦУВАА 4 · +16` … `ЦУВАА 8 · +16` | **8.96** |

On each increment the pill runs `seal-pop` (220 ms `--spring`, scale 1 → 1.07 → 1). Reaching 4 is the beat: the pill changes from ghost to gold in the same pop and the correct cue gains its third bell. On reset it is simply gone. "Цуваа" — a convoy — is the logistics word for a streak; the ready sheet uses "дараалан зөв" to explain it in plain words.

### 3.6 Between questions

At t₁ + 1 400 ms the sheet content and the four tiles are replaced (keyed by `q`) and §3.3 plays again: no exit animation, the next manifest is simply pinned over the last one, and the fuse is full. The status line clears. The reply to answer k already carried question k + 1, so this swap never waits for the network; if a player's reveal ends and, impossibly, `next` is missing, treat it as a failed request (§3.4 retry path), never as the end of the game.

After the **eighth** reveal (the reply had `next: null`): the stage goes to `result` with the stamp (§3.8). No `submitting` state is needed — the last reply *was* the submit.

### 3.7 Edge states

- **`begin` refused: pool not ready** — `StageNotice`: `Тэмцээн бэлэн болоогүй байна — асуултууд хараахан оруулаагүй. Жаахан хүлээгээд дахин орно уу.` Button `Дахин оролдох`. Server error string from the route; the admin screen prevents this ever being seen in practice.
- **`begin` refused: network** — existing copy `Тоглоом эхлүүлж чадсангүй. Сүлжээгээ шалгаад дахин оролдоно уу.`
- **Resume** (player left mid-play and returns within the 30-minute attempt window): `/api/attempt/start` reports the quiz in progress with the next unanswered `q`; any question whose deadline passed is already recorded as timed out. Show a ready-style sheet: chip `ТЭМЦЭЭН 3 / 3`, title `Үргэлжлүүлэх`, text `Та 5-р асуултаас үргэлжлүүлнэ. Орхисон асуулт 0 оноогоор тооцогдсон.`, button `Үргэлжлүүлэх`. Pressing it issues the next question fresh (the server sets a new `sentAt` — the player is not penalised for the walk back).
- **Contest not open** — handled by `/play` before any stage mounts (framework); not this spec.

### 3.8 Final stamp

`StageResult` as built (paper sheet, 2 px gold border, chip `ДҮН`, `stamp-in` 180 ms, visible ~520 ms more, `audio.cue('clear')`), with one addition: a second line under the number, 14 px / 600 / muted **5.32**, `Зөв: 6 / 8` — the number every player will be asked by the colleague next to them. Add an optional `sub` prop to `StageResult`. Then `onDone` → finish → `/result` as the other contests.

---

## 4. The countdown

**Form.** Two things that are one clock: the **numeral** in the score row (`15 сек` → `0 сек`, `Math.ceil(remaining / 1000)`, driven by the stage's rAF wall-clock loop exactly as `SortStage`) and the **fuse** — the 6 px bar along the bottom edge of the question sheet, which is one CSS animation per question. The numeral is the information; the fuse is the feeling. A ring would be prettier and would cost a 72 px circle somewhere in a layout that has no room for one; the fuse is zero-height and burns right under the words it is timing.

**Fuse implementation.** Change the existing `countdown-bar` keyframes from `width: 100% → 0%` (layout work on every frame) to `transform: scaleX(1) → scaleX(0)` with `transform-origin: left center`; `animation-duration` is set inline to `15000ms`, `linear`, `forwards`. The track is the sheet's own bottom strip; the fill is one node. Restart by remounting the fill with `key={q}`. Pause on answer with `animation-play-state: paused` (step 5 of §3.4).

**Timeline per question (from the sheet's mount, m):**

| Time | Numeral | Fuse | Sound |
|---|---|---|---|
| m → m + 12 s | frost **12.46**, counts 15 … 4 | `#ED1C24` fill shrinking linearly | — |
| m + 12 s (3 left) | → `#FF8A8E` **8.11**; `tick-pulse` (existing, 300 ms `--spring`, scale 1.25 → 1) on each change: at 3, 2, 1 | fill colour → `#8A0F15` (transition 120 ms linear) — the fuse goes dark red for its last fifth | `tick` cue at 3, 2, 1 (§5.4) |
| m + 15 s | `0 сек`, stays alert-coloured | fill at scaleX(0) | — |
| immediately | tiles locked, `Цаг дууслаа` in the chip row, `{ pick: null }` sent | — | `wrong` at −6 dB when the reply arrives |

The last-3-seconds treatment is identical in kind to the sort stage (`≤ 3 → #FF8A8E + tick-pulse`), so players who played contest 2 already know what it means.

**Reduced motion:** the fuse does not animate. Its width is set from the per-second tick (`style="transform: scaleX(0.8)"` updated when the numeral changes, `transition: none`) — a stepped bar, still a clock, no continuous motion. This replaces the existing reduced-motion rule `.countdown-bar { animation: none !important; width: 100% !important }`, which would leave a full bar that lies. The numeral's `tick-pulse` is already disabled under reduced motion; its colour change stays.

**Fairness note, for the engineer, not the player:** the visible limit is 15 s; the server accepts until 16.5 s (§2.4). A tap at `0 сек` on a slow connection is still scored (as 75 for a correct answer). Nothing on screen mentions the grace.

---

## 5. Feedback: right and wrong

### 5.1 Colour

| Event | Tapped tile | Correct tile (if different) | Other tiles | Score row |
|---|---|---|---|---|
| Correct | `#1A5C3D`, white text **7.43**, ✓ | — | opacity .55 | `+N` badge `#7FE0A6` **11.47**; pill pops |
| Wrong | `#8A0F15`, white text **9.09**, ✕, shake | own colour, `#7FE0A6` 3 px outline, ✓ | opacity .55 | pill gone |
| Timed out | — | own colour, `#7FE0A6` outline, ✓ | opacity .55 | pill gone; chip row `Цаг дууслаа` `#8A0F15` **8.51** |

Green and red here are the product's existing functional states (`ok-fill` / `bad-fill`, used by the sort lanes and drop button). They are not decoration and they are never used anywhere else on this screen, so the two verdicts are unmistakable even with the sound off.

### 5.2 Motion

Only the tapped tile moves on a wrong answer (`shake-x`, 320 ms), and only it changes shape on a correct one (nothing — a colour change and a glyph swap). No full-screen flash, no board flip: a 2 × 2 board shaking under the reader's eye is noise, and the sort stage's rule ("colour only near what you tap") applies. Reduced motion: colours and glyphs only; no shake, badge and pill appear without scale.

### 5.3 Sound (Web Audio, synthesised; cues per §7 of the art direction)

| Moment | Cue | Notes |
|---|---|---|
| `Эхлэх` | `start` — the yard horn, G3 + B3, 260 ms | existing |
| Correct | `correct` — D5 → A5 triangle "ding", 110 ms | existing |
| Correct, convoy reaches or stays ≥ 4 | **`correct` streak variant:** D5 → A5 → **D6**, each 45 ms after the last, ~160 ms total; same timbre | new, one extra note on the existing cue. Three bells for a convoy. |
| Wrong | `wrong` — A2 sliding down, low-passed sawtooth, the container set down too hard, 160 ms | existing |
| Timed out | `wrong` at −6 dB | existing cue, lower gain |
| 3, 2, 1 | **`tick`:** one 12 ms sine at 1 200 Hz, −26 dBFS, attack 1 ms, exponential decay — the dispatch clock. Three of them, 1 s apart | new; built from the existing `blip` envelope with a sine, or the 7.6 reveal ticks' sine at a fixed pitch |
| Stamp | `clear` — the D5 F#5 A5 D6 bell run | existing |
| Bed | ducked −6 dB while running, as every stage | existing |

No tap sound: the verdict is the sound, and it follows the tap by one round trip. Nothing loops, nothing plays per question appearance.

---

## 6. The admin screen — `/admin/quiz`

A separate route, linked from `/admin`'s header row (a ghost button `Асуултын сан` beside `CSV татах`), because the admin table is a wide desktop view and this editor must work on a phone held in one hand by the organiser standing in a corridor. Same night page, same paper sheets, one column, `mx-auto max-w-[640px] px-5 pb-28`. Gated by the same admin cookie; unauthenticated → the existing `LoginForm`.

### 6.1 Page anatomy (top to bottom)

| # | Block | Surface |
|---|---|---|
| 1 | Logo label (left) · sound toggle (right) | night |
| 2 | Title `Асуултын сан` — 30 px / 800 / paper **17.16**. Subtitle 14 px / frost **12.46**: `Мэдлэгийн тэмцээн · {startsAt} → {endsAt}` formatted `12-02 09:00 → 12-03 18:00` from `contests.ts` | night |
| 3 | **Status sheet** (§6.3) | paper |
| 4 | **`+ Асуулт нэмэх`** primary button, full width, `min-height: 56px` (hidden while the pool is frozen, §6.5) | — |
| 5 | **Editor sheet** — only when adding or editing (§6.4); when adding it opens *here*, directly under the button, so the organiser never loses their place | paper |
| 6 | **Question list** (§6.2), newest at the bottom, each a sheet | paper |
| 7 | Footer note 13 px frost: `Тоглогч бүрт 8 асуултыг санамсаргүй сонгож, хариултуудын дарааллыг холино. Энд байгаа дараалал тоглолтод нөлөөлөхгүй.` | night |

No modals: on a phone a modal plus the keyboard leaves 200 px of form. Everything is inline and the page scrolls.

### 6.2 A question in the list (collapsed)

A `.sheet` with `padding: 16px 20px`, `margin-top: 12px`. Tapping anywhere on it (it is a `<button>` covering the sheet, `aria-expanded`) opens the editor in place.

```
АСУУЛТ 7                                               Засах ›
Монлогистик Групп хэдэн онд байгуулагдсан бэ?
[ 1998 ]  [ ✓ 2003 ]  [ 2010 ]  [ 2015 ]
```

- Chip row: `.sheet-tag` `АСУУЛТ 7` (**5.80**; the number is the list position, for talking about it — "7-р асуулт" — not the `seq`); right: `Засах ›` 14 px / 600 / `#C21019` **5.80**.
- Question: 16 px / 600 / ink **15.40**, `line-height: 1.35`, clamped to 2 lines (`-webkit-line-clamp: 2`).
- Options, `margin-top: 8px`, wrapped chips `gap: 6px`: 13 px / 500, `padding: 3px 10px`, `border-radius: 9999px`. Normal: `#F0EDE6` background, **ink** `#221E20` text — **14.0** (computed: L 0.847 vs 0.0137; muted text on this chip would be 4.87, too close to the line for 13 px). Correct: `#E6F4EA` background, `#13693B` text **5.94**, prefixed with a 12 px ✓. Chips are `max-width: 100%` with ellipsis at one line; the editor shows full text.
- Just saved (2 s after a save): the sheet's border becomes `2px solid #13693B` (not `#7FE0A6` — ok-night is for the night, and on paper it is 1.6), then back; and the chip row gains a pill `ХАДГАЛАГДЛАА` at the right, `#E6F4EA` background, `#13693B` 12 px / 700 **5.94**, for the same 2 s. Transition 150 ms linear in, instant out.

### 6.3 The status sheet — "how many do I have versus how many a play needs"

The first thing on the page and the one the organiser checks every time. `.sheet`, chip `АСУУЛТЫН САН`.

```
АСУУЛТЫН САН                                   Тэмцээн: 11 хоног
11 / 24
████████████░░░░░░░░░░░░░░░░ 
Тоглоход хангалттай (хамгийн багадаа 8). 24-өөс цөөн бол
оролцогчдод ижил асуултууд их давтагдана.
```

- Chip row right: `Тэмцээн: 11 хоног` (days until `startsAt`; `Нээлттэй` while open; `Дууссан` after) 12 px / 600 / muted **5.32**.
- The count: `11` **44 px / 800 / ink** tabular, then `/ 24` 16 px / 600 / muted — the same display grammar as the score card's `2,894 / 3,840`. 24 is `POOL_TARGET`.
- Meter, `margin-top: 10px`: the result card's `.meter` (6 px track `#DAD5CC`, fill `#ED1C24` 4.10, `scaleX(count / 24)`, capped at 1). Two tick marks on the track at 8/24 and 24/24? No — one text line is clearer than ticks nobody will read.
- Status line, `margin-top: 10px`, 14 px / 400, `line-height: 1.45`, by state:

| Pool | Line | Colour |
|---|---|---|
| 0 | (the empty state §6.6 replaces the list; the status sheet still renders with `0 / 24`) `Тэмцээн эхлэхээс өмнө хамгийн багадаа 8 асуулт хэрэгтэй.` | in a `#FDECEC` box, `#8A0F15` **8.51** |
| 1–7 | `Тэмцээн эхлэхэд хамгийн багадаа 8 асуулт хэрэгтэй — дахиад {8 − n} нэмнэ үү.` | `#FDECEC` / `#8A0F15` **8.51** |
| 8–23 | `Тоглоход хангалттай. 24-өөс цөөн бол оролцогчдод ижил асуултууд их давтагдана.` | gold-ink `#8A5A00` **5.54** |
| ≥ 24 | `Бэлэн. Тоглогч бүрт 8 асуултыг санамсаргүй сонгоно.` | `#13693B` on paper **6.3** |

- When the contest is open or closed, a second line in a `#FFF8E8` box, 14 px / 600 / ink: `Тэмцээн явагдаж байна — зөвхөн үсгийн алдаа засах боломжтой.` (closed: `Тэмцээн дууссан — асуултууд түгжигдсэн.`) See §6.5.

### 6.4 The editor (add and edit are the same sheet)

A `.sheet` with `padding: 20px`, chip `ШИНЭ АСУУЛТ` or `АСУУЛТ 7 · ЗАСАХ`. Enters with `enter-sm`. When editing, it replaces the collapsed sheet in place; when adding, it sits under the add button. Only one editor is open at a time; opening another first asks nothing — unsaved text in the other is kept in component state and the other collapses with its chip row showing `Хадгалаагүй` in `#8A5A00` until saved or cancelled. (Organisers tap around. Losing a half-typed question is the worst thing this screen can do.)

**Field 1 — question.**
- Label `Асуулт` 14 px / 600 / ink. Right-aligned on the same line: counter `34 / 120` 12 px / muted tabular, turning `#8A0F15` at 121+.
- `<textarea>`: white, `border: 1px solid #DAD5CC` (the product's existing input), `border-radius: 8px`, `padding: 12px 14px`, 16 px ink, `min-height: 72px`, auto-grows to 4 lines; focus border `#C21019` (**6.21** boundary against white). `maxlength` is **not** set — a hard stop while typing feels broken; validation on save instead.
- Placeholder, muted: `Жишээ: Монлогистик Групп хэдэн онд байгуулагдсан бэ?`

**Field 2 — options.**
- Label row: `Хариултууд` + helper 13 px muted: `Зөв хариултыг тэмдэглэнэ үү.`
- 2 to 4 rows, `margin-top: 8px`, `gap: 8px`. Each row is `grid-template-columns: 48px 1fr 48px; align-items: center`:
  - Left: the **correct marker** — a 48 × 48 tap target (the visual is a 26 px circle centred in it): unselected `border: 2px solid #6B6568` on paper (**5.32**), transparent; selected `#1A5C3D` fill with a white ✓ (**7.43**). `role="radio"`, `aria-checked`, group label `Зөв хариулт`. One radio group across the rows — selecting one deselects the other.
  - Middle: text `<input>`, same style as the textarea, `min-height: 48px`, placeholder `Хариулт {n}`, with the counter `12/40` rendered inside at the right in 12 px muted (`padding-right: 56px` on the input).
  - Right: remove — a 48 × 48 ghost button with a 16 px ✕ in `#6B6568`, `aria-label="Хариулт {n}-г хасах"`. Rendered only while there are more than 2 rows; otherwise the cell is empty so the inputs do not shift.
- Under the rows: `+ Хариулт нэмэх` — ghost paper button (1 px ink border, ink text, `min-height: 48px`, full width), hidden at 4 rows.
- No slot colours or glyphs in the editor: players get a shuffled order, so showing "this one is the red triangle" would be a lie.

**Preview.** A text link `Тоглогчид яаж харагдах вэ ›` 14 px / 600 / `#C21019` **5.80** under the options; toggles a non-interactive render of the question sheet + tile grid (§3.2) inside a 350 px-wide night-900 box with 12 px padding, options in their *entered* order, no fuse, no countdown. It answers the one question organisers actually have — "does my long option fit?" — before anyone plays. Pure presentational reuse of the stage's sheet and tile components.

**Buttons row**, `margin-top: 20px`, `gap: 10px`:
- `Хадгалах` primary, `flex: 1`, `min-height: 48px`; `busy` → `Түр хүлээнэ үү…` (existing Button behaviour, LoaderIcon).
- `Болих` ghost, `min-width: 96px`. Discards changes; when adding, closes the editor; when editing, restores the collapsed sheet.
- Edit only: a third line below, centred, `Асуултыг устгах` 14 px / 600 / `#8A0F15` **8.51**, `min-height: 48px` tap area. Tap → it is replaced in place by `Устгах уу? Буцаах боломжгүй.` 14 px ink plus two buttons `Тийм, устга` (`#8A0F15` background, white **9.09**, min-h 48) and `Үгүй` (ghost). Two taps, same spot, no dialog. Deleting before `startsAt` removes the row; the list re-numbers.

**Validation** — on `Хадгалах` only, client-side first, server repeats it. Messages render under the offending field in 13 px / 600 / `#8A0F15` **8.51** with `role="alert"`; the first invalid field is focused and scrolled into view (`scrollIntoView({ block: 'center' })` so the keyboard does not cover it).

| Rule | Message |
|---|---|
| Question empty (after trim) | `Асуултаа бичнэ үү.` |
| Question > 120 chars | `Асуулт 120 тэмдэгтээс урт байж болохгүй.` |
| Any option empty | `Хариулт {n} хоосон байна.` |
| Option > 40 chars | `Хариулт 40 тэмдэгтээс урт байж болохгүй.` |
| Two options equal (trim, case-insensitive) | `Хариултууд давхардаж байна.` (under the second one) |
| No correct marked | `Зөв хариултыг тэмдэглэнэ үү.` (under the options block) |
| Fewer than 2 options | cannot happen in the UI; server message `Хамгийн багадаа 2 хариулт хэрэгтэй.` |

**Save states:**
- *Saving:* button busy; fields stay editable-looking but `readOnly` so a second tap cannot double-submit; the cancel button disabled.
- *Saved:* editor collapses into the list sheet (`enter-sm`), that sheet shows the 2 s `ХАДГАЛАГДЛАА` state (§6.2); the status sheet's count and meter update (the meter's fill transitions `scaleX` 400 ms `--out`). When adding, the new sheet is appended at the bottom and the page scrolls so it is in view; the add button is re-enabled and keeps focus so entering ten questions in a row is: type, save, type, save.
- *Error (network / 5xx):* a `#FDECEC` box above the buttons, `#8A0F15` **8.51**: `Хадгалж чадсангүй. Сүлжээгээ шалгаад дахин оролдоно уу.` Form contents untouched.
- *Error (409, pool frozen):* `Тэмцээн эхэлсэн тул энэ өөрчлөлтийг хийх боломжгүй.` Same box.

### 6.5 Frozen pool (contest open or closed)

From `startsAt` on, per §2.3:
- The add button is not rendered; the status sheet shows the `#FFF8E8` line.
- Each list sheet still opens its editor, but: the correct markers are disabled (`opacity: .5`, no tap); the remove buttons and `+ Хариулт нэмэх` are not rendered; `Асуултыг устгах` is not rendered. Only the question text and option texts are editable — typos. A helper line at the top of the editor, 13 px / `#8A5A00` **5.54**: `Тэмцээн явагдаж байна: зөвхөн үсгийн алдаа засна. Хариултын тоо, зөв хариулт, асуултын тоо өөрчлөгдөхгүй.`
- After `endsAt` everything is read-only; the `Засах ›` link reads `Харах ›` and the editor renders with every field `readOnly` and no buttons.

The API enforces all of this regardless of the UI (409 with the §6.4 message).

### 6.6 Empty state (pool = 0)

In place of the list, a `.sheet` centred text: the 40 px manifest icon from §3.1 in ink; `Асуулт одоогоор алга.` 20 px / 800 / ink **15.40**; `Эхний асуултаа нэмээд зөв хариултыг нь тэмдэглээрэй. Тэмцээн эхлэхэд хамгийн багадаа 8, 24 бол сайн.` 16 px / muted **5.32**; the `+ Асуулт нэмэх` button inside the sheet (the one above the list is hidden in this state so there is exactly one).

### 6.7 Contrast summary for the admin screen

| Pair | Ratio | Use |
|---|---|---|
| `#FAF7F0` on `#0F1422` | 17.16 | Title |
| `#C9D6E6` on `#0F1422` | 12.46 | Subtitle, footer note |
| `#221E20` on `#FAF7F0` | 15.40 | Question text, counts, labels |
| `#221E20` on `#F0EDE6` | 14.0 | Option chips (computed: L 0.846 vs 0.0137) |
| `#6B6568` on `#FAF7F0` | 5.32 | Counters, helpers |
| `#C21019` on `#FAF7F0` | 5.80 | Chips, `Засах ›`, preview link |
| `#8A5A00` on `#FAF7F0` | 5.54 | Warning line, frozen helper |
| `#13693B` on `#FAF7F0` / on `#E6F4EA` | 6.3 / 5.94 | Ready line, correct chip, saved state |
| `#8A0F15` on `#FAF7F0` / on `#FDECEC` | 8.51 / 8.51 | Validation, delete, error boxes |
| `#FFFFFF` on `#C21019` / `#8A0F15` / `#1A5C3D` | 6.21 / 9.09 / 7.43 | Save, confirm-delete, correct marker |
| `#221E20` on `#FFF8E8` | 15.57 | Frozen notice |
| `#C21019` border on white | 6.21 | Focus ring |

---

## 7. Animation table

Easings as everywhere: `--out`, `--spring`, `--land`. Transform/opacity only, plus colour transitions where stated. The reduced-motion column is the *still form*, never "nothing".

### 7.1 Player

| Beat | Motion | Duration / easing | Nodes | Reduced motion |
|---|---|---|---|---|
| Ready sheet | §6.3 of the art direction (sheet slide + stagger) | 240 ms `--out` | 6, once | 150 ms fade |
| `Эхлэх` busy | LoaderIcon spin | until reply | 1 | existing loader rule |
| Question sheet in | `quiz-h2-in` translateY 8 → 0 + opacity | 180 ms `--out` | 1 | `fade-in` 120 ms (existing rule) |
| Tiles in | `quiz-opt-in` (mount-in-sm), stagger 0/40/80/120 | 160 ms `--out` each | 4 | `fade-in` 120 ms, no stagger |
| Fuse | `scaleX(1 → 0)`, origin left | 15 000 ms linear, per question | 1, continuous | stepped per second via inline style, no transition |
| Last 3 s numeral | `tick-pulse` scale 1.25 → 1 at 3, 2, 1 | 300 ms `--spring` × 3 | 1 | colour only |
| Fuse last 3 s | `background-color #ED1C24 → #8A0F15` | 120 ms linear | 0 (colour) | same |
| Tap | `.press` scale .97 | 90 ms `--out` | 1 | colour only |
| Held tile outline / others dim | outline in, opacity → .55 | 120 / 150 ms linear | 0 (no transform) | same |
| Fuse pause | `animation-play-state: paused` | — | — | — |
| `Холбогдож байна…` | `fade-in` | 150 ms, at t₀ + 600 | 1 | shown without fade |
| Correct tile | fill → `#1A5C3D`, glyph swap | 120 ms linear | 0 | same |
| Wrong tile | fill → `#8A0F15`, `shake-x` | 120 ms colour; 320 ms `--out` shake | 1 | colour only |
| Correct-tile outline (wrong/timeout) | opacity .55 → 1, outline `#7FE0A6` | 120 ms linear | 0 | same |
| `+N` badge | `pts-badge-in` scale .8 → 1 + opacity | 200 ms `--spring`, at t₁ + 60 | 1 | `fade-in` 150 ms (existing rule) |
| Convoy pill increment | `seal-pop` 1 → 1.07 → 1 | 220 ms `--spring`, at t₁ + 60 | 1 | static update |
| Question swap | next sheet + tiles mount (no exit) | as "in" rows, at t₁ + 1 400 | 5 | fades |
| Stamp | `stamp-in` | 180 ms `--out` | 1 | 150 ms fade (existing) |
| Background | bulbs paused, plane faded, snow and trains as specified | — | — | snow still |

**Node budget.** Background while a stage runs: 19 as counted in the background spec (conservatively — bulbs are paused and the plane is faded, but count them). Quiz peaks: question swap = 1 sheet + 4 tiles + 1 fuse = **6 → 25**; reveal = shake 1 + badge 1 + pill 1 (fuse paused) = **3 → 22**; last three seconds = fuse 1 + tick-pulse 1 = **2 → 21**. Worst instant **25 of 40**. Nothing on this screen is a persistent animated node except the fuse.

### 7.2 Admin

| Beat | Motion | Duration | Reduced motion |
|---|---|---|---|
| Editor open / close | `enter-sm` | 160 ms `--out` | 150 ms fade |
| Saved flash | border colour → `#13693B` for 2 s; chip appears | 150 ms linear in, instant out | same (colour only) |
| Meter update | `scaleX` to the new fraction | 400 ms `--out` | jumps |
| Preview open | `enter-sm` | 160 ms | fade |
| Delete confirm swap | none (in-place replace) | — | — |
| Buttons | `.press` | 90 ms | colour only |

---

## 8. What I deliberately left out, and why

1. **Lobby, game PIN, host screen, nicknames.** They are the live format. This is 200 people playing alone over two days; there is nothing to wait for and no one to show a PIN to. The contest window in `contests.ts` is the lobby.
2. **A between-question leaderboard / podium.** Kahoot's "you are 3rd!" between questions needs everyone to be on the same question at the same time. Here a rank mid-play would compare an unfinished score with finished ones and would cost a leaderboard query per question. The result page's standing line is the podium.
3. **Admin reordering.** Asked for in the brief; left out because it would do nothing. Every player gets a random 8 of the pool with shuffled options (§2.3), so the admin's order is never the play order. Offering drag handles that change nothing is a lie in the interface; the footer note on `/admin/quiz` says why there are none. If the client later wants a fixed order for everyone, that is a one-line change in `generateQuizSchedule` — and a worse contest, because the group chat solves it in an hour.
4. **Negative points for wrong answers.** One play, one winner, no retries: a −40 would make guessing worse than silence and the smart move would be to let the clock run out. Zero is Kahoot's rule too.
5. **Client-side timing.** No `t` leaves the browser. The four games accept a client `t` because their schedules are fully known to the client anyway and the server bounds it; a quiz where the client reports "I answered in 200 ms" is a quiz with a 960 ceiling for anyone with DevTools. The server's own hand-off timestamps are the clock, with the 3 s floor so Wi-Fi never decides first place.
6. **Sending all eight questions at `begin`.** It would remove the round trip from the reveal — except it would not: the reveal needs the verdict, which needs the round trip either way. Per-question delivery adds nothing visible, keeps unanswered questions off the device, and gives the server the hand-off timestamps it measures speed with.
7. **A "Дараах" button after the reveal.** The reveal is 1.4 s and then the next manifest is pinned up. A button would make it a form, let players pause the game, and break the nominal-duration arithmetic.
8. **Images in questions.** Uploads from a phone, storage, moderation, and a 350 px tile grid under a photo that needs 200 px — for a one-evening contest. Text questions, 120 characters.
9. **Per-question time limits and point values in the admin.** Kahoot has them; organisers never change them; they would make the 960 ceiling variable and the scoring explanation on the ready sheet wrong. Every question is 15 s and 110.
10. **A countdown ring, a colour-changing sky, a full-screen green/red flash.** The ring has no room; the sky is the night and does not react to a wrong answer; a full-screen flash is the one thing that would move everything the player is reading. The tile is the thing that reacts, nothing else.
11. **A tap sound.** The verdict sound follows the tap by one round trip; a blip at the tap would make two sounds per answer, eight times.
12. **Reduced-motion variants that hide information.** The fuse becomes stepped, not absent; the dimmed tiles still dim; the verdict colours still change. The preference is about motion.
13. **Touching the other contests, the result page, or the invitation.** Contest 3's `/result` shows one row where contest 2 shows four; that is the result page's concern, and the score-card spec's `MAX_TOTAL_SCORE` constant per contest is where it lands.
