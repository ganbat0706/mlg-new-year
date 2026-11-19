# `/result` — the reward moment, redesigned

**Date:** 2026-11-20 · **Extends:** `2026-11-20-festive-art-direction.md` · **Supersedes in part:** its §4.5 (result page), §6.5 (the 1500 ms "button" beat), §6.7 (top-5 banner placement and second confetti burst) and §8.9 (the sentence "no redesign of the leaderboard table"). Everything else in that doc stands.
**Brief:** the client says the result screen "ene heseg arai sonin haragdaad bn". Screenshot reviewed: `shots-new/40-result-fixed.png` (390 px, legibility fix applied). Reference the client likes: `shots-new/31-drop-running.png`.

Files this spec changes: `src/app/result/page.tsx`, `src/app/result/ResultClient.tsx`, `src/app/result/ScoreCard.tsx`, `src/components/LeaderTable.tsx`, `src/app/globals.css`. Two small non-visual dependencies outside those files are listed in §1.4; the visual spec does not wait for them, but two beats and one bug fix do.

Contrast ratios below use the WCAG 2.x formula. AA: 4.5 for normal text, 3.0 for large text (≥24 px regular / ≥19 px bold) and for UI component boundaries. I recomputed every pair I introduce; pairs already measured in the art direction doc are cited with the same numbers.

---

## 1. Diagnosis

### 1.1 What the client is seeing

The drop screen the client likes has **one surface, one lit object, one button**: night, the bay, `Буулгах`. The result screen has three paper rectangles of equal size, equal weight, equal corner radius, equal shadow, stacked with equal gaps, on a sky that then runs empty for 600 px. There is no object on the page — only documents. That is what "odd" means here: it looks like the dispatch office after the party, not the party.

Your six points are right. Ranked by how much each contributes to the oddness:

1. **The invitation is absent.** (Your #4.) The player has just won a 1080×1350 brand-red container door with their name on it, and the page shows them a button. The red mass is the one thing that would break the paper-paper-paper rhythm, and it is the thing we are not showing. This is the root cause; the other five are symptoms.
2. **Nothing is subordinate.** (#1, #6.) Score card, invitation card and table all sit on `.sheet` with the same 20 px padding. The leaderboard heading, the search heading and the body text are 18/18/16 px — a 2 px step. The eye has nowhere to land.
3. **The second card is a leftover.** (#3.) It exists because the old page had no score card; it repeats the name (already on the invitation) and the code (already the button's destination) and carries one button. It is 200 px of paper doing 40 px of work.
4. **The score card is a receipt.** (#2, #5.) `2,894` with no denominator reads like a bank balance. `Хос манифест 390` tells the player nothing unless they remember that a game maxes at 960 — nobody does. A number without a scale is not a score.
5. **The search competes.** (#6.) `Өөрийн байраа олох` is for a person who does *not* have a session on this phone. On a fresh finish — the state where the page is most seen — it is for nobody, and it sits above the leaderboard at full weight.

### 1.2 What you missed (or I did, in the previous doc)

- **The top-5 beat can never fire.** §6.7 of my doc says rank "comes from the `/api/standing` response the result page already uses". That was wrong: `ResultClient` only calls `/api/standing` inside the phone-search `lookup()`. On mount, rank is unknown, so the guard "skip the banner rather than delay the page" skips it every time. The emotional peak for the five people who matter most has been silently disabled. Fix in §1.4.
- **A quarter of the confetti is invisible.** `CONFETTI_COLORS` includes `#FFFFFF`; the card is `#FAF7F0` (ratio 1.03). Six of 24 pieces fall unseen. Replace white with night-500 `#2A3350` (11.6 on paper). Red, gold, ink, night-blue — the four colours of the page.
- **The confetti centre exclusion was never implemented.** §4.5 asked for no pieces in the central 40 % so they fall beside the numeral; `left: (i*37)%100` spreads them evenly. Still to do; geometry in §7.
- **The invitation PNG is cached immutably with a stale score on it.** `ImageResponse` from `next/og` sets `Cache-Control: public, immutable, no-transform, max-age=31536000` in production (verified in `node_modules/next/dist/compiled/@vercel/og/index.node.js`); the route in `src/app/invite/[code]/image/route.tsx` does not override it. The PNG prints `ОНОО 2,894 · 3-Р БАЙР`. A player who downloads after attempt 1 and improves on attempt 2 gets the attempt-1 image again from browser cache (and from any CDN in front). This is a live bug on `/invite` already; embedding the image here would make it visible on the result page too. Fix in §1.4.
- **The post-search "ТАНЫ ҮР ДҮН" card has a brand-red 2 px border** on a white card — the exact "looks like an error" problem §4.5 removed from the score card. It also hides the player's own invitation block while shown. Both go.
- **The title margin is too generous for a page whose first element is the payoff.** `mt-10` (40 px) between logo and `Үр дүн`, then 32 px to the card: 72 px of sky before anything happens. The drop screen puts the score row 60 px under the logo.
- **200 rows in one table.** `limit=200` renders every player. On party day that is a 7 000 px table under the thing people actually came for (their invitation, the top 5).

### 1.3 The idea for this screen

The result page is **the dispatch office wall at midnight**: one manifest pinned up (the score), the invitation hanging from the crane hook under it (the red door, lit), and the crew list on the wall below (the table). Three objects, three different materials — **paper, red steel, paper** — not three sheets. Paper is for documents you read; red is for the thing you own; gold is for what you have won and nothing else.

Hierarchy in one sentence: *number → red door → list*. Everything else is secondary type on night.

### 1.4 Required non-visual changes (small, outside the five files)

1. **Rank on mount.** `POST /api/standing` additionally accepts `{ registrationId: string }` (the session already holds `id`); the route branches on which key is present and returns the same shape. `ResultClient` calls it on mount whenever a session exists, in parallel with the leaderboard request. If the call fails or is slow, the rank line and the top-5 banner are simply omitted — never delayed. *Fallback if you refuse to touch the API:* find the player in the leaderboard rows by `lastName + firstName + bestScore === session.bestScore`; if zero or more than one row matches, treat rank as unknown.
2. **Invitation cache header.** The image route sets `headers: { 'Cache-Control': 'private, no-store' }` on its `ImageResponse` (the constructor takes `headers`). Until that ships, every `<img src>` and download URL for the invitation carries `?v=${bestScore}` so a new best always misses the cache. Keep the `?v=` even after the header fix; it costs nothing and protects against intermediaries.

---

## 2. The new layout, top to bottom (390 px, fresh finish)

Page container unchanged: `mx-auto max-w-2xl px-5 pb-28` — 20 px gutters, 350 px content. Nothing below has a fixed width wider than 350 px; no horizontal scroll. Every tap target ≥ 48 px.

| # | Block | Surface | Top margin | Notes |
|---|---|---|---|---|
| 0 | Rail, garland, logo label, sound toggle | — | — | Unchanged (layout.tsx). |
| 1 | **Title** `Үр дүн` | night | 24 px under the logo (was 40) | 30 px / 800 / `#FAF7F0` on `#0F1422` **17.16**. Tracking -0.02em. No subtitle on fresh finish. |
| 2 | **Score card** | paper sheet, 2 px gold border | 20 px | §3. The only full `.sheet` on the upper half of the page. |
| 3 | **Top-5 banner** (conditional) | gold | 16 px | §5.4. Sits *under the score card*, not under the invitation (change from §6.7 — see §8). |
| 4 | **Invitation** | night + the red PNG | 32 px | §4. No sheet. Eyebrow, hook, frame, image, code line, buttons. |
| 5 | **Leaderboard** | night heading + paper table | 40 px | §6. |
| 6 | **Find** (not on fresh finish) | paper sheet | 40 px | §6.5. Hidden entirely when a `FinishPayload` is present; collapsed to a text link on return visits; a full sheet only when there is no session. |

Sizes and weights used on this page, so there are exactly four text levels on night and four on paper:

| Level | Night | Paper |
|---|---|---|
| Display | — | 56 px / 800 / ink, tabular |
| Title | 30 px / 800 / paper (17.16) | — |
| Section | 22 px / 800 / paper (17.16) | 20 px / 800 / ink (15.40) — search sheet title only |
| Body | 16 px / 400 / paper (17.16) | 16 px / 400 / ink (15.40) |
| Secondary | 14 px / 400 / frost `#C9D6E6` (12.46) | 14 px / 400 / muted `#6B6568` (5.32) |
| Eyebrow | 12 px / 700 / gold `#E8B931` / .14em / uppercase (9.98) | 12 px / 700 / `#C21019` / .14em / uppercase — the existing `.sheet-tag` (5.80) |
| Code | 16 px / 700 / gold (9.98) | 16 px / 700 / ink |

What is which colour, and why:

- **Paper** — the score card and the table. Documents. Also the search sheet when it is the main thing on the page (no session).
- **Red** — the invitation PNG (the object), the primary button `#C21019`, the bar fills in the score card, the `.sheet-tag` chips. Red never appears as a border on this page.
- **Gold** — the score card border (the prize document), the on-night eyebrows, the invite code on night, the top-5 banner, the ★ on prize rows, the 3 px left border on the player's own row, the perfect-game ★. Gold is reserved for *won* things; it never touches the search or the empty state.
- **Night** — everything else: the title, the invitation's text and buttons, the leaderboard heading. Night-700 `#1B2237` only as the invitation frame.
- **Frost** — secondary text on night, the ghost-night button border, the crane cable.

---

## 3. The score card in detail

`<section class="sheet">` with `border: 2px solid #E8B931`, `border-radius: 16px`, `padding: 20px`, `position: relative; overflow: hidden` (confetti clip). Width 350 px, inner 306 px.

### 3.1 Anatomy (top to bottom)

**Row A — chip row.** Flex, `justify-between`, `align-baseline`.
- Left: `.sheet-tag` `ТАНЫ ОНОО` — 12 px / 700 / `#C21019` on paper **5.80**.
- Right: attempt counter `Оролдлого 2 / 3` — 12 px / 600 / `#6B6568` on paper **5.32**, tabular. Source: `data.attemptsUsed` and `GAME.MAX_ATTEMPTS`. It answers "can I try again?" before the player scrolls to the button.

**Row B — the number.** `margin-top: 4px`. Flex, `align-items: baseline`, `gap: 8px`.
- `2,894` — 56 px / 800 / `#221E20` on paper **15.40**, `line-height: 1`, `font-variant-numeric: tabular-nums`, `letter-spacing: -0.02em`. Rolls 0 → total (unchanged).
- `/ 3,840` — 16 px / 600 / `#6B6568` **5.32**, tabular. Static, appears with the label at 120 ms. Formatted with the same `toLocaleString('mn-MN')` as the number so the separators match. 3,840 is a constant (`4 × 960`); put it next to the game `MAX` constants, do not derive it on the client from the rows.

**Row C — standing.** `margin-top: 8px`. 14 px / 600 / `#221E20` **15.40**. Appears with the rows at 1100 ms.
- Rank known: `12-р байр · 87 оролцогчоос`. If rank ≤ 5: prefix a 14 px ★ in gold-ink `#8A5A00` **5.54** — not `#E8B931`, which is 1.72 on paper and would vanish.
- Rank unknown (API slow/failed): row omitted; nothing shifts because Row C is `min-height: 0`.

**Divider.** `margin-top: 16px`, 1 px `#E3DED2`, full inner width.

**Rows D1–D4 — the four games.** `margin-top: 16px`, `gap: 12px`. Each row is two lines:

```
Зөв зам                                    960 / 960 ★
██████████████████████████████████████████████████████
```

- Line 1: flex, `justify-between`, `align-baseline`. Label 14 px / 400 / `#6B6568` **5.32**, truncating never (longest label `Контейнер овоолох` is ~118 px at 14 px; the value column is ~90 px; 306 px inner leaves room). Value: `720` 15 px / 600 / ink **15.40** tabular, then `/ 960` 12 px / 400 / muted **5.32** with a 4 px gap. A perfect 960 appends a 13 px ★ in gold-ink `#8A5A00` **5.54** with `title="Бүрэн оноо"`.
- Line 2: the **meter**, `margin-top: 6px`.
  - Track: `height: 6px; border-radius: 3px; background: #DAD5CC` (1.37 on paper — decorative; the information is carried by the fill edge and the text, so a 0-score row still reads as "0 / 960" in text).
  - Fill: `height: 100%; border-radius: 3px; background: #ED1C24; width: calc(score / 960 * 100%)`. Brand red on paper is **4.10**, above the 3.0 boundary requirement for non-text UI. This is a deliberate extension of the art direction's "red is a fill colour only" list: a score bar is a fill. Gold fills are *not* used for bars (1.72 on paper); gold-ink `#8A5A00` as a fill would read as mud next to red. A full bar stays red; the ★ marks perfection.
  - Fill width animates from 0 with each row's entrance (§7). `transform-origin: left; transform: scaleX()` is cheaper than animating `width`, so animate `scaleX(0 → 1)` on an inner element whose static width is the final percentage.
  - Each row has `aria-label="Зөв зам: 960-аас 720 оноо"` on the row and `aria-hidden` on the bar; the bar is decoration for sighted users, the text is the data.
- Game order unchanged: Зөв зам, Контейнер овоолох, Хос манифест, Агаараас буулгах. The art direction's game-labels are the source of truth for the strings.

**Row E — new personal best** (conditional, `isNewBest`). `margin-top: 16px`. The existing pill: `#E8B931` bg, ink text 14 px / 600 **8.96**, `padding: 4px 12px`, `border-radius: 9999px`. Text `Шинэ дээд амжилт`. Unchanged.

**Row F — flagged note** (conditional, `data.flagged`). `margin-top: 12px`. 13 px / 400 / `#6B6568` **5.32**, `line-height: 1.45`. Copy: `Энэ оролдлогыг нэмж шалгана. Хэвийн бол оноо бүрэн тооцогдоно.` See §5.5 for the prominence argument.

**No button.** The `Урилгаа харах` link leaves the card. The invitation is 32 px below; a button pointing at a thing you can already see is a receipt-footer again. The 1500 ms beat that used to reveal the button now reveals the invitation block (§7).

### 3.2 Why no total meter under the big number

Tried it on paper: a 100 %-wide red bar directly under `2,894 / 3,840` plus four more bars below is five bars in 220 px — the card turns into a settings panel. The denominator text gives the scale; the four bars give the shape. The four bars sum to the total visually anyway.

### 3.3 Card height

Chip row 16 + number 56 + standing 20 + divider 17 + rows 4×(20+6+6)+3×12 = 164 + pill 28 (when present) + note 38 (when present) + padding 40 ≈ **380–445 px**. The whole card is above the fold on a 390×844 viewport with the smaller header margin.

---

## 4. Showing the invitation on this page

### 4.1 Decision: embed it, full width, after the score lands

Embed. Reasons, in order of weight:

1. **It is the reward.** The page's job is to hand over the thing. A button is a promise; the image is the delivery.
2. **It fixes the composition.** 350 px of brand red with white stencil type is the only element on the product that can hold its own against the night. It is the drop screen's red bay, here. Paper → red → paper is a rhythm; paper → paper → paper is a list.
3. **Cost is fine.** ~130 KB once, 4:5 at 350 px = 437 px tall. The page currently has 600 px of empty sky at the bottom; we are spending space we already have.
4. **The 5 s generation is hidden by the choreography and the fold.** The `<img>` mounts at 0 ms (opacity 0, inside the frame, no layout shift because the frame has a fixed 4:5 box). The score choreography runs to 1.6 s and the card is ~400 px tall; on a 844 px viewport the frame's top edge is at roughly 560 px, so the player sees the loading placeholder only if they scroll in the first ~4 s. The warm-up on the `/invite` page is identical, so nothing new is being paid for — it is being paid for *earlier*, which is the point.
5. **Privacy is unchanged.** `/invite/[code]/image` is already reachable by anyone with the code; the result page only ever embeds the session's own code (and the search result deliberately does not embed the image, §6.5).

What is *not* embedded: the search-result standing (someone else's phone) shows a link, not the image.

### 4.2 Block anatomy

All on night, no sheet. Width 350 px.

**Eyebrow row.** Flex, `justify-between`, `align-baseline`.
- Left: `ТАНЫ УРИЛГА` — 12 px / 700 / gold `#E8B931` / .14em / uppercase on night **9.98**.
- Right: the code `MLG-202604` — 16 px / 700 / gold **9.98**, `letter-spacing: .04em`, tabular.

**Hook and cable.** `margin-top: 8px`, centred, 28 px tall: a 2 px × 20 px `#2A3350` cable with a frost `#C9D6E6` hook path (the same one specified for `/invite` in §4.6 of the art direction — reuse the SVG). Static. `aria-hidden`.

**Frame.** `background: #1B2237; border: 1px solid rgba(201,214,230,.35); border-radius: 16px; padding: 12px;`. Inside, one 4:5 box (`aspect-ratio: 4 / 5; border-radius: 8px; overflow: hidden; position: relative`). The frame is the *only* night-700 surface on the page, so it reads as "a different material" — the steel the door is mounted in.

**The image.** `<img src="/invite/{code}/image?v={bestScore}" width=1080 height=1350 alt="{Овог Нэр}-ийн урилга, дугаар {code}">`, `absolute inset-0 w-full h-full object-cover`. `loading="eager"`, `decoding="async"`. `bestScore` is `data.bestScore` on a fresh finish, `session.bestScore` otherwise (see §1.4.2). On load → `invite-img-in` (existing: 320 ms `--out`, translateY 16 → 0, scale .98 → 1).

**Loading state** (until `onLoad`). Inside the 4:5 box: a paper sheet (`background: #FAF7F0; border-radius: 8px; inset: 0`) — a blank manifest in the frame — with the existing `<Loader>` truck centred and its label changed for this context: `Урилгыг хэвлэж байна…` 14 px / 400 / `#6B6568` on paper **5.32**. The Loader is designed for paper (ink cab, `#DAD5CC` road) and is invisible on night-700 (ink on night-700 ≈ 1.2) — that is why the placeholder is paper, not a dark skeleton. The Loader already waits 80 ms before showing, so a cached image never flashes it.

**Error state** (`onError`, or the image has not loaded 20 s after mount). Same paper sheet, centred: `Урилга ачаалсангүй.` 16 px / 400 / ink **15.40**; under it a ghost button (paper variant: 1 px `#221E20` border, ink text, min-h 48) `Дахин ачаалах` that re-sets `src` with a fresh `?v=…&r=${Date.now()}`. The link to the `/invite` page below the frame remains the second way out.

**Code line.** `margin-top: 12px`. 13 px / 400 / frost `#C9D6E6` on night **12.46**: `Хаалган дээр энэ дугаарыг үзүүлнэ.` The code itself is already in the eyebrow row and inside the image; this line is the instruction.

**Buttons.** `margin-top: 16px`, stacked, `gap: 10px`, each full width (350 px), `min-height: 48px`.
1. **Primary** `Урилгаа татах` — `#C21019` bg, white 16 px / 600 **6.21**, hover `#9E0D14` **8.33**, `border-radius: 8px`. Same download handler as `InviteActions` (fetch → blob → `a.download`), using the `?v=` URL; on failure it opens `/invite/{code}/image?v=…` in a new tab, as today. No glow: the lit object on this page is the image.
2. **Secondary** `Дахин тоглох (2 үлдсэн)` — `.btn-night-ghost`: transparent, `border: 1px solid rgba(201,214,230,.45)` (≈ `#636B7A` over night, **3.42** boundary contrast), paper text 16 px / 600 **17.16**, hover `background: rgba(201,214,230,.12)`, active `.press`. Rendered only when `gameOpen && session.attemptsLeft > 0`. When the game is open and no attempts remain, replace with one line of frost 14 px: `Оролдлого дууссан · хамгийн сайн оноо тооцогдоно.`
3. **Text link** `Урилгын хуудас нээх` — 14 px / 600 / frost **12.46**, underline, centred, `min-height: 48px` tap area via padding. → `/invite/{code}`. This is the escape hatch for the long-press-to-save helper that lives on that page.

Why download is primary and replay secondary: replay is reversible and cheap; the download is the thing they will regret not having on 12-05. On closed day there is no replay, so the ordering is the same in every state.

**Decoration forbidden:** over the frame and 12 px around it; inside the buttons. Confetti from the score card is clipped by the card's `overflow: hidden` and cannot reach here.

---

## 5. States

### 5.1 Fresh finish (`FinishPayload` present, session present)

Exactly §2: title → score card (choreographed) → optional top-5 banner → invitation (hidden until 1500 ms, image mounted at 0 ms) → leaderboard (own row highlighted, rank from §1.4.1). **No search block at all.** If the standing call has not returned by 1100 ms, Row C and the banner are skipped for this visit; the leaderboard still highlights the row if the rank arrives later.

Edge: `FinishPayload` present but no session (storage cleared mid-session) — show the score card without Row C and without the invitation block, then the find sheet (§5.6 layout). This should not happen; do not design around it beyond not crashing.

### 5.2 Return visit (session, no `FinishPayload`, game open)

No animation beyond the page's normal `.enter` (220 ms, reduced-motion → 150 ms fade). What makes it worth visiting: *the invitation is right there, and their standing is one line.*

- Title `Үр дүн`.
- **Standing line** directly under the title, `margin-top: 8px`, 16 px / 400 / paper **17.16** with bold numbers: `Дээд оноо **2,894** / 3,840 · **12-р байр**` (rank part omitted if unknown; if `session.bestScore === 0`: `Та хараахан тоглоогүй байна.`). If rank ≤ 5: a 16 px ★ in gold before the rank. This replaces the whole second card of the current build.
- Invitation block (§4) — the hero of this state. Replay button present when attempts remain.
- Leaderboard (§6), own row highlighted.
- **Find, collapsed:** a single frost text link under the leaderboard, `Өөр дугаараар хайх` (14 px / 600 / frost **12.46**, 48 px tap height). Tapping expands the search sheet (§6.5) in place with `enter-sm`. Nobody with a session needs it on a normal day, but the person checking a colleague's rank on their own phone does.

### 5.3 New personal best

Row E in the card at 1400 ms (unchanged timing), plus the §6.6 border pulse `#E8B931 → #FFE28A → #E8B931` 600 ms ease-in-out once, plus the `best` audio cue (unchanged). Nothing else on the page changes: a personal best is a card event. Reduced motion: pill shown with the rows, no pulse.

### 5.4 Top-5 placement (`rank ≤ 5` on this finish)

- Row C in the card gets the gold-ink ★ (`★ 3-р байр · 87 оролцогчоос`).
- **Banner** at 1600 ms, *between the score card and the invitation* (`margin-top: 16px`): `background: #E8B931; color: #221E20; border-radius: 16px; padding: 16px 20px`, no shadow (it is a tag, not a sheet). Inside: `.sheet-tag`-style chip `ТОП 5` recoloured to ink 12 px / 700 / .14em (ink on gold **8.96**); text `Та шагналын жагсаалтад орлоо — 3-р байр` 18 px / 700 / ink **8.96**; a 20 px ★ in ink at the right. Enters `scale(.92) → 1` + opacity, 260 ms `--spring`; the ★ runs the existing `seal-pop` once at 1700 ms.
- **The second confetti burst is cut.** §6.7 asked for 16 gold pieces over the banner. Two problems: gold confetti on a gold banner is invisible, and at 1600 ms the first burst (1100 + 1200 ms + up to 75 ms delay = ends ~2375 ms) is still falling, so the real count would be 24 + 16 + 3 snow + 12 bulbs = 55 animated nodes, over the 40 budget my own doc set. The banner's gold surface, the ★ pop and the transposed chord (§7.6 of the art direction, unchanged) carry the moment.
- Placement change from §6.7 ("after the invitation sheet"): the invitation is now a 437 px image; a banner under it at 1600 ms would land off-screen. Under the card, it lands in view while the number is still warm.
- The leaderboard row for the player is both `isPrize` and `mine`: the own-row treatment wins (§6.3), the ★ stays.
- Reduced motion: banner appears with the rows (no scale), ★ static.

### 5.5 Flagged attempt

Keep it **quiet, honest, and in the card** — Row F, 13 px muted, under the rows, never near the number, never a pill, never red. Reasons:

- Three things set `flagged`: impossible elapsed time (that game is scored 0 — the player sees `0 / 960` and the note explains it), event spacing under 200 ms, and a *perfect* memo round (a genuinely good player being flagged for being good). For the third case especially, a loud "we are checking you" on their best moment is the wrong note. The admin reviews before prizes are handed out; the player cannot act on this, so it is information, not a call to action.
- Copy change: `Энэ оролдлогыг нэмж шалгана. Хэвийн бол оноо бүрэн тооцогдоно.` — two short sentences, says what happens and what the outcome is if nothing is wrong, without "шалгаж байна" (present progressive, which suggests someone is watching right now).
- It does **not** appear on the return visit, in the leaderboard, or on the invitation: `flagged` is a property of the attempt, and only the attempt card shows it.
- The standing line (§5.2) and leaderboard use `bestScore` from the server, which already includes any zeroed game; nothing to add there.

### 5.6 Game closed (after 2026-12-03 23:59:59 +08:00; `/` redirects here)

This is the state ~200 people open at the door, often on poor venue Wi-Fi, often one-handed. Priorities: *my invitation* (session) or *find my invitation* (no session), then *who won*, then everyone else.

- Title block: eyebrow `ТЭМЦЭЭН ХААГДЛАА` 12 px / 700 / gold **9.98** / .14em; h1 `Эцсийн үр дүн` 30 px / 800 / paper; subtitle 16 px / 400 / frost **12.46** with the event facts in paper 16 px / 600 **17.16**: `Арга хэмжээ **2026-12-05** · **18:00** · **Venue**. Урилгаа хаалган дээр үзүүлнэ үү.` This replaces the current paper `.sheet` paragraph — a subtitle is not a document.
- **With session:** standing line as §5.2 (`Дээд оноо … · N-р байр`, ★ if ≤ 5), then the **invitation block** with the primary `Урилгаа татах` and the page link; no replay button, no "attempts over" line (the game is closed; the subtitle said so). Then the leaderboard. Then the collapsed find link.
- **Without session:** the **find sheet** (§6.5) is the hero, titled `Урилгаа олох` with the helper `Бүртгүүлсэн утасны дугаараа оруулна уу.`; after a successful lookup the result (name, score, rank, `Урилгаа харах` link) replaces the form in the same sheet. Then the leaderboard.
- **Leaderboard on closed day:** heading `Эцсийн жагсаалт`; the table sheet's border becomes 2 px gold `#E8B931` (the only day the list itself is a prize document); the first five rows keep `#FFF8E8` + ★; the section note changes to `★ шагналтан — эхний 5 байр.` The default row cap is still 20 with the expander (§6.4), because the top of the list is what the room wants.
- No confetti, no choreography, no sound cue beyond the bed. Party day is loud enough.

### 5.7 Empty leaderboard (nobody has a score)

Not a lonely pill. The table sheet renders with its ink header row and **five placeholder rows** — the prize places, waiting:

```
Байр   Ажилтан                        Оноо
1 ★    — — —                             —
2 ★    — — —                             —
…
5 ★    — — —                             —
```

Rows: rank number ink 15.40, ★ in `#C21019` as on real prize rows, name cell three em-dashes in `#6B6568` **5.32**, score cell `—` muted. Row background plain paper (not `#FFF8E8`: nothing has been won). Under the table, `margin-top: 10px`, 14 px frost on night **12.46**: `Одоогоор оролцогч алга — эхний байр чөлөөтэй.` On a fresh finish the leaderboard can never be empty (the player's own score is in it), so this state is only ever seen by early visitors; it should make them want to be row 1.

---

## 6. The leaderboard

### 6.1 Heading

On night, `margin-top: 40px`. Flex, `justify-between`, `align-baseline`.
- `Жагсаалт` (closed day: `Эцсийн жагсаалт`) — 22 px / 800 / paper **17.16**.
- `87 оролцогч` — 14 px / 400 / frost **12.46**, tabular. Source: `rows.length` (the API returns everyone up to 200; if the standing call returned `total`, prefer that).
- Note line under, `margin-top: 4px`: `★ эхний 5 байр шагнал хүртэнэ` — 14 px / 400 / frost **12.46**. (Was `#6B6568` on night, 2.9:1 — a contrast failure in the current build. Frost fixes it.)

### 6.2 Table sheet

`.sheet` with `padding: 0; overflow: hidden; border-radius: 16px` so the header row bleeds to the edge. Header row `#221E20` with paper text 14 px / 600 **15.40**, `padding: 10px 12px`. Columns: `Байр` 56 px, `Ажилтан` flexible, `Оноо` 80 px right-aligned, `table-fixed`. Body rows 16 px / 400 / ink **15.40**, `padding: 10px 12px` (44 px row height — rows are not tap targets, so this is fine), `border-top: 1px solid #E3DED2`. Name format `Б. Ганбат` unchanged.

Row states, in precedence order:

| State | Background | Extras | Ink contrast |
|---|---|---|---|
| **Mine** | `#FFF1C9` warm | `border-left: 3px solid #E8B931` (the cell padding absorbs it; no horizontal shift); name 600; an 11 px / 700 / .08em chip `ТА` in gold-ink `#8A5A00` after the name (**5.27** on warm) | **14.65** |
| Prize (rank ≤ 5) | `#FFF8E8` | `★` 14 px `#C21019` after the rank number (**5.80** on paper; on `#FFF8E8` ≈ 5.9) | **15.57** |
| Normal | paper | — | **15.40** |

Mine wins over Prize (the ★ stays, the background is warm). The current `#FDECEC` pink for the own row is dropped: it is the error-box colour on this product.

### 6.3 The player's own row and the cap

Render the first **20** rows. Then:
- If the player's rank is ≤ 20: nothing more.
- If the player's rank is > 20: a separator row (one cell spanning all columns, `···` centred, 14 px muted, `padding: 6px`) and then **their row** (mine treatment), then the separator again only if more rows exist below.
- Under the table, `margin-top: 12px`: `.btn-night-ghost` full width, `Бүгдийг харах (87)`, which replaces the capped list with all rows (no pagination; 200 rows of plain `<tr>` is fine once it is opt-in). After expanding, the button disappears.
- If `rows.length ≤ 20`, no cap, no button.

Reason: on party day the only rows anyone reads are the top 5 and their own.

### 6.4 Search result row vs. own row

After a phone search (`me` set), `highlightRank = me.rank` and the chip reads `ТА` only if `me.inviteCode === session?.inviteCode`; otherwise the row gets the warm background and gold border but **no `ТА` chip** (it is someone else, looked up on this phone).

### 6.5 The find sheet

`.sheet` with `.sheet-tag` `ХАЙЛТ`. Title 20 px / 800 / ink **15.40**: `Өөрийн байраа олох` (open) or `Урилгаа олох` (closed, no session). Helper 14 px muted **5.32**: `Бүртгүүлсэн 8 оронтой дугаараа оруулна уу.` Form row `margin-top: 12px`, `gap: 10px`: input `min-height: 48px`, white, 1 px `#DAD5CC`, 16 px ink, placeholder muted, focus border `#C21019` (not `#ED1C24` — same reason as everywhere: red on paper at 4.10 is fine for a border, but the darker red matches the button it sits beside), `inputmode="numeric"`, `autocomplete="tel"`; button `Хайх` primary, `min-width: 88px`. Error box unchanged (`#FDECEC` / `#8A0F15` **8.51**, `role="alert"`).

Result (replaces the form inside the same sheet, `enter-sm`): name 20 px / 800 / ink; `2,894 оноо · 12-р байр` 16 px / 400 / ink (★ gold-ink if ≤ 5; `тоглоогүй` if rank null); primary link `Урилгаа харах` → `/invite/{code}` (no image, no download — this may not be the phone's owner); a text link `Дахин хайх` 14 px / 600 / `#C21019` **5.80** that restores the form.

Where it lives: fresh finish — nowhere; return visit — collapsed link under the leaderboard (§5.2); no session — a full sheet *above* the leaderboard, `margin-top: 20px` under the title block.

---

## 7. Animation table

Easings: `--out: cubic-bezier(0.2,0.8,0.2,1)`, `--spring: cubic-bezier(0.34,1.56,0.64,1)`, `--land: cubic-bezier(0.16,1,0.3,1)`. All transform/opacity only except the two colour pulses. Reduced motion column is what `prefers-reduced-motion: reduce` shows instead — the still form, never "nothing".

| t (ms) | Beat | Motion | Duration / easing | Reduced-motion still form |
|---|---|---|---|---|
| 0 | Score card enters | `mount-in` translateY 10 → 0, opacity 0 → 1 | 240 ms `--out` | 150 ms fade |
| 0 | Invitation `<img>` mounts | none (opacity 0 inside the frame; starts the 5 s generation) | — | same |
| 120 | `ТАНЫ ОНОО`, `Оролдлого 2 / 3`, `/ 3,840` fade in | opacity | 150 ms linear | visible at mount |
| 200 → 1100 | Number rolls 0 → total | rAF, `bezierY(0.16,1,0.3,1)` (existing) | 900 ms `--land` | final number at mount |
| 1100 | Rows D1–D4 enter | `score-row-in` translateY 6 → 0 + opacity, stagger 0/80/160/240 | 200 ms `--out` each | visible at mount |
| 1100 (+stagger) | Bars fill | inner fill `scaleX(0 → 1)`, `transform-origin: left`, starts with each row's entrance | 400 ms `--out` | bars at final width at mount |
| 1100 | Row C standing line | opacity with the rows | 150 ms linear | visible at mount |
| 1100 | Confetti, 24 pieces | `confetti-fall` translateY −10 → 160 px + rotate, opacity 1 → 0. Colours `#ED1C24 #E8B931 #221E20 #2A3350`. **Spawn x:** `left = i < 12 ? (i * 5) % 30 : 70 + (i * 5) % 30` (%) — nothing between 30 % and 70 %, so pieces fall beside the numeral, not over it | 1200 ms ease-in, delays `(i % 6) * 15` | not rendered |
| 1400 | New-best pill | scale .75 → 1 + opacity | 200 ms `--spring` | shown with the rows |
| 1400 | New-best border pulse | `border-color #E8B931 → #FFE28A → #E8B931` | 600 ms ease-in-out, once | none |
| 1500 | **Invitation block reveals** (was: the card button) | `mount-in` translateY 10 → 0 + opacity on the whole block | 240 ms `--out` | visible at mount |
| 1600 | Top-5 banner | scale .92 → 1 + opacity | 260 ms `--spring` | shown with the rows, no scale |
| 1700 | Banner ★ | `seal-pop` scale 1 → 1.07 → 1 | 220 ms `--spring`, once | static |
| on load | Invitation image | `invite-img-in` translateY 16 → 0, scale .98 → 1, opacity | 320 ms `--out` | 150 ms fade |
| on expand | `Бүгдийг харах`, search sheet, search result | `enter-sm` translateY 6 → 0 + opacity | 160 ms `--out` | 150 ms fade |
| any | Buttons | `.press` scale .97 on `:active` | 90 ms `--out` | no scale; colour change only |
| any | Snow, garland | unchanged from the art direction (bulbs twinkle here — no stage is running) | — | snow still, bulbs lit |

Timing reasons: every existing beat keeps its time. The one change is what the 1500 ms beat reveals — the invitation block instead of a button — because the button no longer exists; the beat's job (lead the eye from the number to the reward) is unchanged. The banner stays at 1600 ms so the chord in §7.6 of the art direction still lines up.

Animated-node budget at the worst instant (1600–2375 ms, top-5 finish): 24 confetti + 1 banner + 1 ★ + 3 snow + 12 bulbs = **41**. One over. Resolve by rendering **22** confetti pieces (11 per side) instead of 24 — the difference is invisible — bringing the peak to 39. The `CONFETTI` array length becomes 22; the spawn formula above already uses `i < 12 / 70 + …` which also works for 11 per side with `i < 11`.

Sound (unchanged, for completeness): `reveal` at 0 ms, `best` at 1400 ms; the top-5 chord per §7.6 of the art direction at 1600 ms if the audio library gains that cue — not a blocker for this spec.

---

## 8. What I deliberately left alone, and why

1. **The score-landing timings.** 0 / 120 / 200–1100 / 1100 / 1400 / 1500 / 1600 are kept to the millisecond. They were tuned against the chord; only the target of the 1500 ms beat changed.
2. **The invitation PNG.** Not a pixel. The only thing added is `?v=` on the URL and a cache header on the route, both invisible.
3. **The games, the play shell, the `/invite` page.** Untouched; the `/invite` page's frame-and-hook is reused here rather than redesigned.
4. **Paper for the score card.** I considered putting the score on night (gold numerals, no sheet) to get a fourth material. It would make the number pretty and the four rows unreadable at 14 px muted on night, and it would lose the "manifest pinned to the wall" idea that the whole art direction rests on. The card stays paper with the gold border it already has; what changes is the content, and what is *around* it.
5. **Row order of the four games, and the game names.** They are the stage order; a player reads the card in the order they played.
6. **The `Шинэ дээд амжилт` rule** (`totalScore === bestScore && attemptsUsed > 1`). A first attempt is not a "new" best; the rule is correct.
7. **The leaderboard's name format, column set and header colour.** `Б. Ганбат`, three columns, ink header — correct and already built. The changes are hierarchy (cap, own row, empty state), not structure. This is the partial override of §8.9.
8. **The sound toggle.** It overlaps the garland's right end on every page, not just this one; it belongs to the layout, not the result screen. Note for later, not for this spec.
9. **`mn-MN` number formatting.** `2,894` with a comma is what the locale gives; consistent with the games' score rows and the PNG.
10. **No "share" button, no social preview, no QR.** The invitation's job is to be shown at a door; the download covers that. A share sheet on a page that 200 colleagues open on the same evening is a way to get 200 identical images posted to one group chat.
11. **No horse, no 2026 lockup on this page.** The year-of-the-horse mark lives on the PNG, which is now on the page. Repeating it above the PNG would compete with the PNG.
12. **No dark-mode variant, no new font, no blur, no new dependency.** Everything above is Tailwind utilities plus ~40 lines of plain CSS (`.btn-night-ghost`, `.meter`, the confetti colour change, the banner).
