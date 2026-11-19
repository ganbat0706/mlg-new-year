# Festive art direction — "New Year's Eve at the terminal"

**Date:** 2026-11-20 · **Supersedes in part:** `2026-11-19-art-direction.md` (see §0 for exactly what changes)
**Brief:** the client asked, in Mongolian, "делгецийг бүтэн шинэ жилийн уур амьсгалтай болгох" — make the whole screen feel like New Year. The current build is correct, calm and flat: cream page, dark boxes, red buttons. This spec turns the whole screen into a place, without touching the game logic, the invitation PNG, the brand red or any tap target.

Implementation stack assumed: Next.js App Router, Tailwind v4 `@theme` tokens, plain CSS in `globals.css`. Everything below is CSS transforms/opacity, inline SVG and tiled background images. No JS animation loops for decoration, no blur filters, no raster images.

---

## 0. What this changes from the 2026-11-19 doc, explicitly

The previous doc made five "do not touch" decisions. Four of them are kept; two are deliberately revised because the client's brief cannot be met on a cream page:

| 11-19 decision | Status now | Why |
|---|---|---|
| Snow only inside the home hero scene — "snow on every page looks like a cheap WordPress plugin" | **Revised.** Snow is now a page-wide background, but as **two tiled, compositor-only layers (2 DOM nodes)**, not 40 floating divs. The objection was to per-flake DOM snow dumped on a flat cream page. On a night sky, behind opaque paper cards, slow snow is the scene, not a sticker. | Client brief: whole screen. |
| Palette and Inter untouchable | **Palette extended, not replaced.** Every existing token keeps its hex and role. Three night surfaces and three "on-night" text tints are added. Inter stays. | Night needs its own surfaces. |
| Alkhan band in `#ED1C24` at the top of every page | **Kept, recoloured to gold `#E8B931`.** On the night sky, brand red at 4.19:1 reads as dull brown; gold reads as the lit rail the garland hangs from. Same SVG path, same 8px height. | Legibility on night. |
| Game field `#221E20`, 70dvh, nothing new inside | **Panel surface becomes night-700 `#1B2237` with a frost border; the "nothing moves inside the field that the rAF loop does not own" rule is kept word for word.** Everything added inside the three panels is a static background-image or a style on an element that already moves. | Dark-on-dark needs a visible frame. |
| Register form, rules structure, leaderboard, invitation PNG, button colours `#C21019`/`#9E0D14`, 56px press height | **Kept.** They move onto paper cards; nothing inside them changes. | — |
| Loader, score-landing choreography (§4 of the old doc), confetti | **Kept as specified**; only their surfaces change and two beats are added (§6). | — |

---

## 1. The idea

**It is 11:50 pm on New Year's Eve at the Monlogistics container terminal.** The yard has shut for the holiday; someone has strung a line of coloured bulbs along the gantry rail, snow is falling slowly through the floodlight glow, and the stacked containers along the horizon wear caps of fresh snow. Every screen is a window onto that one night: the page itself is the sky, the content sits on cream **paper sheets** — waybills and manifests pinned up in the dispatch office — and the three game panels are the lit **inspection bays** where the work (sorting, stacking, matching) happens. The brand red stays the colour of the containers and the buttons, exactly as it is on the invitation; gold is the colour of the lights and of winning; frost is the colour of snow and of quiet text. One place, one night, one logistics company. Nothing from Tsagaan Sar, nothing from Christmas (no green, no tree), no novelty font: the character comes from the night surface, the garland, the snow and the containers.

---

## 2. Palette

All tokens go in `@theme` next to the existing ones. Existing tokens keep their values.

### 2.1 Tokens

| Token | Hex | Role |
|---|---|---|
| `--color-brand` | `#ED1C24` | Brand red. Fills only: containers, closed memo cards, crane load, the "26" in 2026, bulbs, confetti. Never small text. |
| `--color-brand-text` | `#C21019` | Red for text on paper and for button backgrounds under white text. |
| `--color-brand-press` | `#9E0D14` | Button hover/active. |
| `--color-ink` | `#221E20` | Text on paper. |
| `--color-paper` | `#FAF7F0` | Card surface; also the primary **text colour on night**. |
| `--color-muted` | `#6B6568` | Secondary text on paper (unchanged). |
| `--color-gold` | `#E8B931` | Lights, prize, matched pair, eyebrow text on night, alkhan rail. |
| `--color-gold-ink` | `#8A5A00` | Gold-meaning text on paper (unchanged). |
| `--color-frost` | `#C9D6E6` | Snow, secondary text on night, panel borders, snow caps. |
| **`--color-night-900`** | `#0F1422` | Page background: the sky at the top. |
| **`--color-night-700`** | `#1B2237` | Game panel surface; the sky near the horizon; invitation frame. |
| **`--color-night-500`** | `#2A3350` | Horizon haze, yard silhouette highlights, dividers on night. |
| **`--color-warm`** | `#FFF1C9` | Warm-white bulb; the floodlight tint in panel spotlights; "your row" highlight on the leaderboard. |
| **`--color-alert-night`** | `#FF8A8E` | Timer in its last seconds and error text **on night**. (Brand red on night is only 4.19:1.) |
| **`--color-ok-night`** | `#7FE0A6` | "+N" and "hit" confirmations on night. |
| `--color-ok-bg` / `--color-ok-text` | `#E6F4EA` / `#13693B` | Correct state on paper (unchanged). |
| `--color-bad-bg` / `--color-bad-text` | `#FDECEC` / `#8A0F15` | Wrong state on paper (unchanged). |
| **`--color-ok-fill`** | `#1A5C3D` | Lane/drop button "hit" flash under white text. |
| **`--color-bad-fill`** | `#8A0F15` | Lane/drop button "miss" flash under white text. |

### 2.2 Every text/background pair used, with measured ratio

Ratios computed with the WCAG 2.x formula. AA normal text needs 4.5, AA large text (≥24px regular / ≥19px bold) needs 3.0.

| Foreground | Background | Ratio | Where | Verdict |
|---|---|---|---|---|
| `#FAF7F0` paper | `#0F1422` night-900 | **17.16** | Body text, headings on night | AA all sizes |
| `#FAF7F0` | `#1B2237` night-700 | **14.75** | Text inside game panels | AA all sizes |
| `#FAF7F0` | `#2A3350` night-500 | **11.63** | Text over horizon haze | AA all sizes |
| `#C9D6E6` frost | `#0F1422` | **12.46** | Secondary text, bullets, footer on night | AA all sizes |
| `#C9D6E6` | `#1B2237` | **10.71** | Secondary text in panels | AA all sizes |
| `#C9D6E6` | `#161C2E` (yard silhouette) | **11.49** | Footer text when it scrolls over the yard | AA all sizes |
| `#E8B931` gold | `#0F1422` | **9.98** | Eyebrows, invitation code, stage counter on night | AA all sizes |
| `#E8B931` | `#1B2237` | **8.58** | Gold labels inside panels | AA all sizes |
| `#FF8A8E` alert-night | `#0F1422` | **8.11** | Timer ≤3s, error text on night | AA all sizes |
| `#7FE0A6` ok-night | `#0F1422` | **11.47** | "+N" on night | AA all sizes |
| `#ED1C24` brand | `#0F1422` | **4.19** | **Only** the "26" in 2026 at 72px extrabold | AA large only — never below 24px |
| `#221E20` ink | `#FAF7F0` paper | **15.40** | Text on cards | AA all sizes |
| `#6B6568` muted | `#FAF7F0` | **5.32** | Secondary text on cards | AA normal |
| `#C21019` brand-text | `#FAF7F0` | **5.80** | Red text on cards, rule numbers | AA normal |
| `#8A5A00` gold-ink | `#FAF7F0` | **5.54** | "Шинэ дээд амжилт" meaning text on paper | AA normal |
| `#FFFFFF` | `#C21019` | **6.21** | All button labels | AA normal |
| `#FFFFFF` | `#9E0D14` | **8.33** | Button hover/active | AA normal |
| `#FFFFFF` | `#ED1C24` | **4.38** | Not used for text anywhere | — |
| `#221E20` ink | `#E8B931` gold | **8.96** | Matched memo card text, "Шинэ дээд амжилт" pill, top-5 banner | AA all sizes |
| `#221E20` | `#FFF1C9` warm | **14.65** | "Your row" on the leaderboard | AA all sizes |
| `#13693B` | `#E6F4EA` | **5.94** | Correct state on paper (quiz) | AA normal |
| `#8A0F15` | `#FDECEC` | **8.51** | Wrong state / error box on paper | AA normal |
| `#FFFFFF` | `#1A5C3D` ok-fill | **7.43** (paper) | Lane/drop button hit flash | AA normal |
| `#FFFFFF` | `#8A0F15` bad-fill | **9.09** (paper) | Lane/drop button miss flash | AA normal |
| `#FAF7F0` | `#221E20` | **15.40** | Leaderboard header row (unchanged) | AA all sizes |

Rules of thumb that follow: **brand red is never a text colour on night**; **gold is never a text colour on paper** (use gold-ink); **white on brand red is never used for text** (buttons stay `#C21019`).

### 2.3 OS dark mode

The design is already a night. `prefers-color-scheme: dark` changes nothing visually; do not add a dark variant. Two technical settings so the OS does not fight us: `color-scheme: light` on `html` (native `<select>` popups, inputs and scrollbars stay light, matching the paper cards they sit on) and `themeColor: '#0F1422'` in `viewport` so the Android/iOS chrome matches the sky. The invitation PNG is unaffected either way.

---

## 3. The persistent background layer

Rendered once in `layout.tsx`, behind every route. Structure, top to bottom in z-order:

```html
<body class="bg-night">                 <!-- background: #0F1422 so overscroll is also night -->
  <div class="sky" aria-hidden="true">   <!-- fixed, inset 0, z 0, pointer-events none -->
    <div class="snow snow-far"></div>    <!-- animated: translateY -->
    <div class="snow snow-near"></div>   <!-- animated: translateY -->
    <svg class="yard">…</svg>            <!-- static silhouette, bottom -->
  </div>
  <div class="rail" aria-hidden="true"></div>       <!-- alkhan band, gold, 8px, in flow -->
  <svg class="garland" aria-hidden="true">…</svg>   <!-- in flow, 32px, 12 twinkling bulbs -->
  <main class="relative z-10">…</main>
</body>
```

Animated node count of this layer: **2 snow layers + 12 bulbs = 14**. The sway wrapper (below) makes it 16. Everything else is static.

### 3.1 Sky

```css
html { color-scheme: light; }
body {
  background: #0F1422;
  color: #FAF7F0;
}
.sky {
  position: fixed; inset: 0; z-index: 0;
  pointer-events: none; overflow: hidden; contain: strict;
  background:
    /* stars: three static dot fields, no DOM */
    radial-gradient(1px 1px at 12% 8%,  rgba(250,247,240,.9) 50%, transparent 51%),
    radial-gradient(1px 1px at 31% 19%, rgba(250,247,240,.7) 50%, transparent 51%),
    radial-gradient(1.5px 1.5px at 47% 6%, rgba(255,241,201,.9) 50%, transparent 51%),
    radial-gradient(1px 1px at 63% 14%, rgba(250,247,240,.6) 50%, transparent 51%),
    radial-gradient(1px 1px at 78% 4%,  rgba(250,247,240,.8) 50%, transparent 51%),
    radial-gradient(1.5px 1.5px at 88% 22%, rgba(201,214,230,.8) 50%, transparent 51%),
    radial-gradient(1px 1px at 22% 31%, rgba(250,247,240,.5) 50%, transparent 51%),
    radial-gradient(1px 1px at 93% 36%, rgba(250,247,240,.5) 50%, transparent 51%),
    /* sky gradient: deep at top, hazy at the horizon */
    linear-gradient(180deg, #0F1422 0%, #0F1422 55%, #1B2237 85%, #2A3350 100%);
}
```

Stars are the only "sparkle" that never moves. Eight is enough; more reads as noise behind text.

### 3.2 Snow — two tiled layers, two nodes

Each layer is a vertically seamless SVG tile set as a repeating background and translated by exactly one tile height per loop, so the loop never jumps. The far layer is small, dim and slow; the near layer is larger, brighter and faster. That is the whole parallax.

```css
.snow {
  position: absolute; left: -24px; right: -24px;   /* room for sway */
  top: calc(-1 * var(--tile-h));                   /* one tile above the viewport */
  height: calc(100% + var(--tile-h));              /* so translateY(tile-h) is seamless */
  background-repeat: repeat;
  will-change: transform;
  animation: snow-fall var(--dur) linear infinite;
}
.snow-far {
  --tile-h: 360px; --dur: 18s;
  opacity: .45;
  background-size: 240px 360px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='360'%3E%3Cg fill='%23FFFFFF'%3E%3Ccircle cx='18' cy='22' r='1.3'/%3E%3Ccircle cx='71' cy='9' r='1.1'/%3E%3Ccircle cx='124' cy='48' r='1.4'/%3E%3Ccircle cx='203' cy='31' r='1.2'/%3E%3Ccircle cx='44' cy='96' r='1.2'/%3E%3Ccircle cx='160' cy='118' r='1.5'/%3E%3Ccircle cx='228' cy='140' r='1.1'/%3E%3Ccircle cx='9' cy='171' r='1.3'/%3E%3Ccircle cx='98' cy='203' r='1.2'/%3E%3Ccircle cx='186' cy='226' r='1.4'/%3E%3Ccircle cx='57' cy='262' r='1.1'/%3E%3Ccircle cx='141' cy='293' r='1.3'/%3E%3Ccircle cx='215' cy='318' r='1.2'/%3E%3Ccircle cx='31' cy='339' r='1.4'/%3E%3C/g%3E%3C/svg%3E");
}
.snow-near {
  --tile-h: 480px; --dur: 11s;
  opacity: .85;
  background-size: 300px 480px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='480'%3E%3Cg fill='%23FFFFFF'%3E%3Ccircle cx='26' cy='30' r='2.4'/%3E%3Ccircle cx='112' cy='12' r='2'/%3E%3Ccircle cx='201' cy='58' r='2.8'/%3E%3Ccircle cx='277' cy='37' r='2.2'/%3E%3Ccircle cx='64' cy='128' r='2.1'/%3E%3Ccircle cx='158' cy='151' r='2.6'/%3E%3Ccircle cx='248' cy='186' r='2'/%3E%3Ccircle cx='14' cy='226' r='2.5'/%3E%3Ccircle cx='131' cy='262' r='2.2'/%3E%3Ccircle cx='222' cy='298' r='2.7'/%3E%3Ccircle cx='79' cy='347' r='2'/%3E%3Ccircle cx='183' cy='389' r='2.4'/%3E%3Ccircle cx='289' cy='422' r='2.1'/%3E%3Ccircle cx='41' cy='453' r='2.6'/%3E%3C/g%3E%3C/svg%3E");
}
@keyframes snow-fall {
  from { transform: translateY(0); }
  to   { transform: translateY(var(--tile-h)); }
}
```

Sideways drift: wrap both layers in one `.snow-sway` div (makes the count 3) animated `translateX(-8px) ↔ translateX(8px)`, 7s `ease-in-out`, `alternate`, `infinite`. One wrapper moving both layers is cheaper and looks more like wind than per-layer sway.

```css
.snow-sway { position: absolute; inset: 0; animation: snow-sway 7s ease-in-out infinite alternate; }
@keyframes snow-sway { from { transform: translateX(-8px); } to { transform: translateX(8px); } }
```

Negative `animation-delay` (`-5s` on far, `-3s` on near, `-2s` on sway) so the first frame is already mid-fall.

**Reduced motion:** `.snow, .snow-sway { animation: none; }` and set `transform: translateY(calc(var(--tile-h) * .5))` so a scattered still field of flakes remains. The night keeps its snow; it just stops falling.

### 3.3 Yard silhouette (static)

Fixed to the bottom of the viewport inside `.sky`. It is behind every card and button (z 0), so on tall pages content simply scrolls over it. Inline SVG, `viewBox="0 0 390 72"`, `width="100%"`, `preserveAspectRatio="xMidYMax slice"`, `position:absolute; bottom:0`.

- Ground: `rect 0,60 390×12` fill `#161C2E`. Snow line on the ground: `rect 0,58 390×2` fill `#C9D6E6` opacity .55.
- Container stacks (left): `rect 12,40 44×18`, `rect 58,40 44×18`, `rect 35,22 44×18` — fill `#161C2E`, stroke `#2A3350` 1px. Each gets a snow cap: `rect x,y-2 w×2` fill `#C9D6E6` opacity .8.
- Container stacks (right): `rect 300,40 44×18`, `rect 346,40 44×18`, `rect 323,22 44×18` — same treatment.
- Gantry crane (centre-right, 230–290): two legs `rect 236,18 4×42`, `rect 282,18 4×42`; beam `rect 228,14 66×4`; cable `line 261,18 → 261,34` stroke `#2A3350` 1.5; hanging box `rect 251,34 20×10` fill `#161C2E` stroke `#2A3350` 1; a single warm light at the top of the crane: `circle 261,12 r2.5` fill `#FFF1C9`, static.
- One rail line across the ground: `line 0,66 → 390,66` stroke `#2A3350` 1, `stroke-dasharray 6 10` (ties). Static.

Silhouette values sit between `#0F1422` and `#2A3350` on purpose: it is a shape you notice, not a drawing you read.

### 3.4 The rail and the garland (top of every page)

**Rail:** the existing `.alkhan-band`, 8px, same path, stroke changed to `%23E8B931`. It is the gantry rail the lights hang from.

**Garland:** directly under the rail, in flow (not fixed, so it scrolls away and never covers content). Inline SVG `viewBox="0 0 390 32"`, `width="100%"`, `height="32"`, `preserveAspectRatio="none"`.

Wire: `<path d="M0 3 Q48 30 97 3 T195 3 T292 3 T390 3" fill="none" stroke="#2A3350" stroke-width="1.5"/>` — four swags.

Twelve bulbs, each a static halo circle plus one animated bulb circle:

| # | x | y | colour |
|---|---|---|---|
| 1 | 16 | 9 | `#ED1C24` |
| 2 | 48 | 16 | `#E8B931` |
| 3 | 80 | 9 | `#FFF1C9` |
| 4 | 113 | 9 | `#C9D6E6` |
| 5 | 146 | 16 | `#ED1C24` |
| 6 | 178 | 9 | `#E8B931` |
| 7 | 211 | 9 | `#FFF1C9` |
| 8 | 243 | 16 | `#C9D6E6` |
| 9 | 275 | 9 | `#ED1C24` |
| 10 | 308 | 9 | `#E8B931` |
| 11 | 341 | 16 | `#FFF1C9` |
| 12 | 373 | 9 | `#C9D6E6` |

Each bulb: `<circle class="halo" r="7" fill="{colour}" opacity=".18"/>` (static) and `<circle class="bulb" r="3.5" fill="{colour}"/>` with a 1px `rgba(255,255,255,.35)` stroke, plus a 2px stem `line` from the wire in `#2A3350`. No drop-shadow filters: the halo circle is the glow.

```css
.bulb { animation: bulb-twinkle 2.4s ease-in-out infinite; transform-origin: center; }
.bulb:nth-child(odd)  { animation-duration: 2.9s; }
/* stagger: inline style animation-delay = -(i * 0.37s) so all are mid-cycle on load */
@keyframes bulb-twinkle {
  0%, 100% { opacity: .55; }
  50%      { opacity: 1; }
}
```

Twinkle is opacity only; it never moves. **While any game stage is running** (`<html data-stage="running">`, set by the stage components on `phase === 'running'`, cleared on anything else): `.bulb { animation-play-state: paused; opacity: .85; }` — steady lights, nothing blinking in the top of the eye while the player is reacting.

**Reduced motion:** `.bulb { animation: none; opacity: .9; }` — lit, still.

### 3.5 Paper cards (the content surface)

Every block of text or form on every screen sits on a paper sheet:

```css
.sheet {
  background: #FAF7F0; color: #221E20;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 1px 0 rgba(255,255,255,.35) inset, 0 12px 32px rgba(0,0,0,.35);
}
.sheet-tag {           /* small dispatch-label chip at the top-left of a sheet */
  display:inline-block; font-size:12px; font-weight:700; letter-spacing:.14em;
  color:#C21019; text-transform:uppercase;
}
```

The logo (`Brand`) has ink lettering and must never sit directly on night. It gets its own small sheet, `.sheet-logo`: paper, `border-radius: 10px`, `padding: 10px 14px`, inline-block, with a 6px gold left border — a shipping label stuck in the corner. Same place on every page.

---

## 4. Per-screen treatment

Shared on all six screens: sky + snow + yard behind, gold rail + garland at the top, logo on its label sheet, sound toggle (§7.6) in the same header row at the right.

### 4.1 `/` Home

- Header row: logo label (left), sound toggle (right).
- **Hero scene** (`WinterScene`) is recoloured for night and loses its own flakes (the page snow replaces them): horizon line → a snow bank `rect 0,96 390×24` fill `#E6EDF5`; truck cab stays `#221E20` with a 1px `#C9D6E6` outline so it separates from the sky; container stays `#ED1C24` with the three 35% paper stripes; wheels `#221E20` with the frost hub; a static headlight cone `polygon 4,44 -60,30 -60,58` fill `#FFF1C9` opacity .22. The three outlined containers on the left become filled: `#E8B931`, `#ED1C24`, `#2A3350` with 1px frost outlines and 2px frost snow caps. Truck enter animation unchanged (700ms translateX). Reduced motion: unchanged (fade).
- Eyebrow `ШИНЭ ЖИЛИЙН БАЯР` — 14px semibold, tracking .18em, **gold `#E8B931`** on night (9.98).
- `2026` — 72px extrabold, "20" in paper `#FAF7F0`, "26" in brand `#ED1C24` (4.19, large text). Behind it, the existing radial blush changes to `radial-gradient(60% 40% at 100% 0%, rgba(237,28,36,.18), transparent)`.
- Pitch paragraph — 22px, paper on night. Bullets — 17px, frost on night.
- CTA `Тоглож урилгаа ав` — full width, min-height 56px, `#C21019` bg, white 18px bold, `box-shadow: 0 8px 24px rgba(237,28,36,.35), inset 0 1px 0 rgba(255,255,255,.18)`. This is the one lit object on the page; nothing else glows.
- Footer event line — 14px frost on night, with a 1px `#2A3350` rule above.
- No paper sheet on the home page: the home is the only screen where text sits straight on the sky. It should feel like standing outside before you go into the office.
- **Decoration forbidden:** inside the CTA button and 16px around it; over the "2026" numerals.

### 4.2 `/register`

- Title `Бүртгэл` 30px extrabold paper on night; subtitle 16px frost.
- The whole form is one `.sheet`. Top-left chip `.sheet-tag`: `АЖИЛТНЫ КАРТ`; top-right, in 12px muted, a monospace-ish `№ ______` blank — the sheet reads as a blank dispatch card about to be filled in. Fields, labels, helper text, error style, select, button: **unchanged** from the current build, now inside the sheet.
- The sheet has a dashed perforation line 1px `#DAD5CC` under the chip row, 12px above the first label.
- Primary button stays inside the sheet, full width.
- **Decoration forbidden:** the entire sheet interior; the keyboard-safe area below the sheet (nothing animated may appear in the viewport region the soft keyboard pushes into, i.e. nothing fixed at the bottom except the yard silhouette which is behind). The garland is in flow and scrolls away when the keyboard opens.

### 4.3 `/rules`

- Title `Дүрэм` on night as above.
- One `.sheet` with chip `ТОГЛООМЫН ДҮРЭМ`. The five numbered items keep their text; the leading number becomes a 28px circle, `#221E20` fill, paper 14px bold numeral, aligned to the heading baseline — five stamps down the margin.
- Button `Эхлэх` below the sheet (not inside), full width, same lit style as the home CTA.
- **Decoration forbidden:** inside the sheet; 16px around the button.

### 4.4 `/play` — the host shell

Shared for all stages:

- Header: logo label, sound toggle.
- **Stage-ready screens** (`phase === 'ready'`): a `.sheet` with chip `ШАТ 2 / 4` (quiz = 1, Зөв зам = 2, Контейнер овоолох = 3, Хос манифест = 4) in `#C21019`; a 40px static line icon above the title in `#221E20` (rail tracks / crane hook / two stacked cards); title 30px extrabold ink; description 16px muted; `Эхлэх` button inside the sheet. Sheet enters with the §6 "stage start" beat.
- **Running screens**: score row sits on night — `Оноо: N` in frost 14px semibold; the timer in frost, switching to `#FF8A8E` at ≤3s (sort) / ≤5s (memo), keeping the existing `tick-pulse`. Panel and controls as in §5.
- **Result flash** (700ms, `phase === 'result'`): the stamp card from §6.4.
- Loader and error states: the error `<p>` is a `.sheet` with the existing `#FDECEC`/`#8A0F15` box inside; loader text in frost on night.
- `data-stage="running"` on `<html>` during running (freezes the garland, §3.4).
- **Decoration forbidden on every running screen:** inside the panel (anything not listed in §5), inside and within 12px of the lane buttons / the `Буулгах` button / the memo grid, and over the score/timer row. The garland is above the logo, out of the play zone, and is frozen anyway.

### 4.5 `/result`

- Title `Үр дүн` on night.
- **Score card** (`ScoreCard`): keep the existing white card, choreography and confetti; change the border from `#ED1C24` to **gold `#E8B931` 2px** — gold is the prize colour and the card is the prize moment; red border on night looks like an error state. Chip `ТАНЫ ОНОО` stays.
- Invitation block ("Батхүү Ганбат — урилгын дугаар MLG-202603", `Урилгаа харах`, `Дахин тоглох (3 үлдсэн)`): one `.sheet`, chip `УРИЛГА`. Code in 16px bold ink.
- Search block (`Өөрийн байраа олох`): a `.sheet`, chip `ХАЙЛТ`.
- Leaderboard: title on night; the table in a `.sheet` with zero padding so the header row bleeds to the sheet edge. Header `#221E20`/paper unchanged. Top-5 rows: gold ★ unchanged. **The player's own row** gets `#FFF1C9` background (ink on warm, 14.65) and a 3px gold left border. Note under the title in frost.
- Top-5 banner and personal-best pill per §6.
- **Decoration forbidden:** over the score numeral while it rolls (confetti falls from the top edge of the card and the number is in the top third — confetti pieces must spawn with `left` spread across the width but **none in the central 40%** so they fall beside the numeral, not over it); inside the search input; inside the table.

### 4.6 `/invite/[code]`

The PNG is finished and is not touched. The page makes it look hung up.

- Title `Таны урилга` on night; `Урилгын дугаар` line in frost with the code in **gold** 16px bold (9.98).
- Image frame: a `night-700` `#1B2237` block, `border-radius: 16px`, `padding: 12px`, `border: 1px solid rgba(201,214,230,.35)`; the `<img>` inside with `border-radius: 8px`. Above the frame, centred, a static 2px `#2A3350` "cable" 28px tall ending in a small hook `path` in frost — the invitation hangs from the crane. Existing `invite-img-in` animation unchanged.
- Buttons (`InviteActions`) directly below, unchanged styles.
- Helper paragraph in frost.
- **Decoration forbidden:** over the image and 12px around it; the garland is above the title and out of the frame. Do not animate the cable or hook.

---

## 5. The three game panels

Common panel: `background: #1B2237; border: 1px solid rgba(201,214,230,.35); border-radius: 12px;` plus a static floodlight as a background-image so there is no extra node:

```css
.bay {
  background-color: #1B2237;
  background-image:
    radial-gradient(70% 55% at 50% 38%, rgba(255,241,201,.10), transparent 70%), /* floodlight */
    linear-gradient(0deg, #232B45 0 10%, transparent 10%);                      /* 10% floor strip */
  border: 1px solid rgba(201,214,230,.35);
  border-radius: 12px;
  transition: border-color 120ms linear;
}
.bay[data-hit="ok"]  { border-color: #7FE0A6; }
.bay[data-hit="bad"] { border-color: #FF8A8E; }
```

The border flash is the only panel-level reaction, it is colour only, and it is reset 160ms after the tap. Nothing new is mounted inside any panel during play; the rule from the 11-19 doc stands: the rAF loop owns the field.

### 5.1 Зөв зам (sort)

Currently a flat `#221E20` box with a white icon and label. Now:

- Panel is a `.bay`, height unchanged (`min(48dvh, 340px)`).
- The item (`.obj-mount` wrapper) is unchanged in size and position. Icon stroke paper `#FAF7F0`; label 20px bold paper (14.75 on night-700). The floodlight gradient sits exactly behind it so it looks picked out.
- The 10% floor strip at the bottom of the panel is "the dock" — the item appears to be standing on it even though it is centred; do not move the item down.
- Static corner label, 11px frost 70%, top-left inside the panel, 8px in: `ХЯНАЛТЫН ЦЭГ`. Pointer-events none. This is the only text decoration allowed inside the panel.
- **Lane buttons:** unchanged size (`min-h-14`, 4 columns), unchanged `#C21019`. Feedback: the tapped lane gets `data-hit="ok"` → `background:#1A5C3D` (white 7.43) or `data-hit="bad"` → `background:#8A0F15` (white 9.09) with the existing `shake-x` on the button only, both for 160ms, then back. Colour transitions 120ms linear. Lane labels, order and text unchanged. No icons on lanes (they would force a taller button and the labels already wrap).
- Correct also shows the existing `+N` badge (`pts-badge-in`) in `#7FE0A6`, 14px bold, positioned at the top-right of the score row — **not** inside the panel.
- **Forbidden:** anything moving inside the panel other than the item mount; anything within 12px of the lane buttons; snow is behind the opaque panel and cannot show through — do not make the panel translucent.
- Reduced motion: no shake, no badge scale; colours only.

### 5.2 Контейнер овоолох (stack)

Currently a red block sliding along the top of a dark box. Now it is a crane:

- Panel is a `.bay`, height unchanged (`min(52dvh, 380px)`).
- A static **gantry beam** drawn as a background-image on the panel — add to `.bay-stack`: `linear-gradient(180deg, transparent 10px, #2A3350 10px, #2A3350 13px, transparent 13px)` across the full width — and two static legs at 6% and 94% width (`linear-gradient(90deg, …)` 3px columns, from 13px to the floor). Zero nodes.
- The **moving crane element** (already `absolute top-4 h-9 w-14 -translate-x-1/2`, positioned by `left:%`) keeps its node and its positioning. Its look: a 1px frost cable from the beam to the box — implemented as `::before` on the same element (`top:-16px; height:16px; width:1px; left:50%; background:#C9D6E6`) so it travels with the box at no extra cost — and the box becomes a container: `#ED1C24` fill, three 35% paper vertical stripes via `background-image: repeating-linear-gradient(90deg, transparent 0 12px, rgba(250,247,240,.35) 12px 14px)`, 1px `rgba(250,247,240,.5)` border (existing).
- **Landed containers** (`.obj-mount-centered`, unchanged mount animation): same container face (red + stripes), plus a **snow cap**: `border-top: 3px solid rgba(255,255,255,.8)`. Levels alternate the stripe spacing (12/14px vs 10/12px) so a six-high stack does not look like one tall rectangle. Colours do not alternate; the stack is a Monlogistics stack and Monlogistics containers are red.
- Floor strip at the bottom is the snow-covered quay; the stack already rests on `bottom-0`.
- **`Буулгах` button:** unchanged size/colour. Feedback during `DROP_MS` while the button is already disabled: hit → `background:#1A5C3D`, miss → `background:#8A0F15` (the current build gives no miss feedback at all — this is the fix). Restores with the lock. A miss also flashes the bay border `bad`.
- Level counter text `Түвшин 1 / 6` unchanged.
- **Forbidden:** anything inside the panel other than the crane element and landed containers; nothing within 12px of the drop button.
- Reduced motion: no change needed; the crane movement is gameplay, not decoration. Colours only on the button.

### 5.3 Хос манифест (memo)

Currently: closed cards are plain red, opened cards grey `#4A4446` with 11px white text (8.90, but tiny). Now each card is a container with a manifest sheet inside:

- Grid container is a `.bay` with `padding: 12px; gap: 8px`; `grid-cols-4` unchanged. Cards keep `min-h-16` (64px) — ≥48px tap target.
- **Closed card** — a container door seen head-on: `background:#ED1C24` with, as background-image, a centre seam `linear-gradient(90deg, transparent calc(50% - 1px), rgba(255,255,255,.4) calc(50% - 1px) calc(50% + 1px), transparent calc(50% + 1px))` and two horizontal lock bars `linear-gradient(0deg, transparent 38%, rgba(34,30,32,.45) 38% 42%, transparent 42% 58%, rgba(34,30,32,.45) 58% 62%, transparent 62%)`; `border-top: 3px solid rgba(255,255,255,.8)` snow cap; `border-radius: 6px`. Hover `#C21019` as now. No text, no icon (aria-label unchanged: `Нээгээгүй контейнер`).
- **Open, not yet matched** — the manifest: `background:#FAF7F0`, icon in `#221E20` at 24px, word 12px bold `#221E20` (15.40), `border: 1px solid #DAD5CC`, no snow cap (the door is open).
- **Matched pair** — sealed: `background:#E8B931`, icon and word `#221E20` (8.96), plus a 12px `✓` top-right in ink. Stays gold to the end of the round. On match, both cards run `seal-pop`: `scale(1) → scale(1.07) → scale(1)`, 220ms `--spring`, transform only.
- **Mismatch** — both open cards get `outline: 2px solid #8A0F15; outline-offset: -2px` for the `LOCK_MS` lock, then close. No shake: a shaking 4×3 grid is noise right where the player is reading.
- **Flip**: cards flip with `transform: rotateY(90deg)` at 80ms then content swaps and `rotateY(0)` at 80ms — a two-step 160ms "door opens" using the existing `obj-mount` replaced by `door-flip`. Transform only; `backface-visibility` not needed because we swap at the 90° midpoint.
- **Forbidden:** anything inside the bay other than the 12 cards; no stray bulbs or snow caps between cards.
- Reduced motion: no flip, no seal-pop; instant colour swap and the `✓`.

```css
@keyframes door-flip { from { transform: rotateY(90deg); } to { transform: rotateY(0); } }
@keyframes seal-pop  { 0% { transform: scale(1); } 55% { transform: scale(1.07); } 100% { transform: scale(1); } }
.door-flip { animation: door-flip 80ms var(--out) both; }
.seal-pop  { animation: seal-pop 220ms var(--spring) both; }
@media (prefers-reduced-motion: reduce) { .door-flip, .seal-pop { animation: none; } }
```

---

## 6. Moments

Easing tokens already exist: `--out: cubic-bezier(0.2,0.8,0.2,1)`, `--spring: cubic-bezier(0.34,1.56,0.64,1)`. Add `--land: cubic-bezier(0.16,1,0.3,1)` (already used by the score roll).

| # | Moment | What happens | Duration / easing | Reduced-motion still form |
|---|---|---|---|---|
| 6.1 | **Correct tap** (sort lane, stack hit, memo match) | Tapped control → `#1A5C3D` (or card → gold); bay border → `#7FE0A6`; `+N` badge in `#7FE0A6` scales .8→1 at the score row. Sound: §7.2. | Colour 120ms linear, hold 160ms, back 120ms. Badge 200ms `--spring`. | Colours only; badge appears without scale. |
| 6.2 | **Wrong tap** (sort lane, stack miss, memo mismatch) | Control → `#8A0F15`; bay border → `#FF8A8E`; sort lane shakes (existing `shake-x` 320ms); memo cards outline; stack: nothing moves, button colour only. Sound: §7.3. | Colour 120ms linear, hold 160ms. Shake 320ms `--out`. | Colours only, no shake. |
| 6.3 | **Stage starting** (ready sheet appears) | Sheet slides up `translateY(16px)→0` + opacity 0→1; chip, icon, title, text, button stagger 0/40/80/120/160ms with `enter-sm`. Bulbs are twinkling here (not yet running). Sound: §7.4 on `Эхлэх` press, not on sheet appear. | 240ms `--out`, stagger as listed. | Sheet fades 150ms; no stagger. |
| 6.4 | **Stage result flash** (700ms) | Replace the plain `Дүн: X / Y` with a **stamp card**: paper `.sheet`, 2px gold border, chip `ДҮН`, score 44px extrabold ink, `/ max` 16px muted. It stamps in: `scale(1.15) rotate(-3deg) opacity 0 → scale(1) rotate(0) opacity 1`. Sound: §7.5. | 180ms `--out`; visible the remaining ~520ms; no exit animation (next stage replaces it). | 150ms fade, no scale/rotate. |
| 6.5 | **Final score landing** (`/result`) | Existing §4 choreography of the 11-19 doc, unchanged timings (card 0ms, label 120ms, roll 200–1100ms, rows 1100ms, confetti 1100ms, button 1500ms). Confetti spawn excludes the centre 40% (§4.5). Sound: §7.6. | As before. Roll 900ms `--land`. | Number shown immediately; no confetti; 150ms fades. |
| 6.6 | **New personal best** | Existing gold pill `Шинэ дээд амжилт` at 1400ms. Add: the gold card border pulses once `border-color #E8B931 → #FFE28A → #E8B931`. Sound: §7.6 adds the bell roll. | Pill 200ms `--spring`; border pulse 600ms ease-in-out, once. | Pill shown; no pulse. |
| 6.7 | **Top-5 placement** (rank ≤5 on this finish) | After the invitation sheet, a gold banner sheet: `background:#E8B931; color:#221E20`; chip `ТОП 5`; text `Та шагналын жагсаалтад орлоо — N-р байр` 18px bold; a 20px ★. Enters at 1600ms `scale(.92)→1` + opacity; a second, gold-only confetti burst of 16 pieces over the banner (not over the score card). Total animated nodes at that instant: 16 confetti + 3 snow + 0 bulbs (bulbs may twinkle here; 12 more = 31 ≤ 40). Sound: §7.6 chord plays twice, the second a fourth higher. | 260ms `--spring`; confetti 1200ms ease-in, once. | Banner appears without scale; no confetti. |

Rank for 6.7 comes from the `/api/standing` response the result page already uses; if rank is unknown at mount, skip the banner rather than delay the page.

---

## 7. Sound design brief (Web Audio API, synthesised, no samples)

Character: a cold, clear night — glassy sines and triangles, short bell-like partials, nothing brassy or chiptune. Everything mixes under a master gain at −14 dBFS; the bed sits 10 dB under the cues. Nothing plays until the player enables sound (§7.7). All cues ≤ 450ms except the final reveal.

Use the equal-tempered D major set throughout so every cue is in tune with the bed: D4 293.66 · F#4 369.99 · A4 440 · D5 587.33 · F#5 739.99 · A5 880 · D6 1174.66 · G3 196 · B3 246.94 · A2 110.

| # | Cue | Notes / interval | Length | Envelope and timbre (in words) |
|---|---|---|---|---|
| 7.1 | **Background bed** (loop, `/`, `/rules`, ready sheets, `/result`, `/invite`; ducked −6 dB while running; off on `/register` so typing is quiet) | Pedal D3 (146.83) + A3 (220) as two sines, with a third sine at D4 detuned +4 cents. A gain LFO at 0.08 Hz swings the whole pad ±3 dB. Every 7–11 s (random), a "sleigh shimmer": three 25ms bursts of white noise through a band-pass at 7 kHz, Q 6, 60ms apart, at −30 dBFS. | Endless; fade in 1.5 s, fade out 400ms on route change | Pad: attack 1.5 s, no decay, slow breathing. Shimmer: instant attack, 25ms exponential decay — distant bells on a cold night, never a melody. |
| 7.2 | **Correct** | D5 → A5 (perfect fifth up), second note starts 45ms after the first | 110ms total | Triangle wave; attack 4ms, exponential decay to −40 dB at 90ms. Add a sine at 2.76× each fundamental at −18 dB for a bell edge. A bright, small "ding" — glass, not plastic. |
| 7.3 | **Wrong** | A2 sliding down two semitones (110 → 98 Hz) over the note | 160ms | Sawtooth through a low-pass at 600 Hz; attack 2ms, decay to −40 dB at 150ms; 8ms of noise burst at the very start at −24 dB. A container set down too hard on the quay: a thud, not a buzzer. Not loud — −6 dB relative to 7.2. |
| 7.4 | **Stage start** (on `Эхлэх` press) | Truck horn: G3 + B3 together (major third) | 260ms | Two detuned sawtooths (±6 cents) per note, low-pass 1.2 kHz, attack 20ms, sustain, release 80ms. Short and friendly: the yard horn that means "go". |
| 7.5 | **Stage clear** (result flash) | Rising arpeggio D5 F#5 A5 D6, 70ms apart | ~420ms | Each note sine + 2.76× partial at −18 dB; attack 4ms, decay 180ms. On the last note a single 25ms shimmer (as in the bed) at −24 dB. A bell run. |
| 7.6 | **Final reveal** (`/result`) | While the number rolls (200–1100ms): a tick every 60ms, 12ms sine, pitch rising linearly 1200 → 1800 Hz over the roll, −22 dB. At 1100ms: chord D5 + F#5 + A5 + D6 struck together. **New best**: three D6 hits 60ms apart at 1400ms. **Top 5**: the chord again at 1600ms, transposed up a fourth (G5 B5 D6 G6). | Roll 900ms; chord 1.2 s | Chord: triangles with the bell partial, attack 8ms, decay to −12 dB at 300ms, release to silence at 1.2 s. The one moment allowed to ring. |

Implementation notes: build one `AudioContext` on the first toggle tap; schedule with `ctx.currentTime` offsets, not `setTimeout`; use `exponentialRampToValueAtTime` for decays (floor at 0.0001). Do not route cues through the bed's LFO.

### 7.7 The sound toggle

- Muted by default. State in `localStorage['mlg:sound']` (`"on"`/`"off"`), read on mount; the bed starts only after a tap in the session (autoplay policy).
- A 48×48 round button, in the header row at the right, opposite the logo label, on every screen including `/play` (it is above the score row, outside the play zone). Transparent background, `1px solid rgba(201,214,230,.45)` border, icon 22px stroke in frost `#C9D6E6`: a bell (not a speaker — bells are the night's sound). Muted: the same bell with a 2px diagonal slash in `#FF8A8E`. On: bell with two small arcs to its right in gold `#E8B931`.
- `aria-pressed`, visually-hidden label `Дуу асаах` / `Дуу хаах`.
- Press feedback: existing `.press` scale .97; on enabling, the bell icon swings `rotate(-12deg)→rotate(10deg)→0` 320ms `--spring` once and 7.2 plays as the confirmation. Reduced motion: no swing, cue still plays.
- Never auto-hides, never moves, never overlaps a card: it lives in the header row grid.

---

## 8. What I deliberately did NOT do, and why

1. **No horse, no 2026 mascot on the pages.** The year-of-the-horse motif already lives on the invitation PNG, which is the single most festive object in the product. Repeating it on every page would compete with it; the pages are the night the invitation is hung in.
2. **No pine, no wreath, no green at all.** Green + brand red is Christmas, and the previous doc's "borrowed holiday" objection stands. Winter here is snow, light and cold air; the only greens are the functional ok-state colours, kept because they already exist.
3. **No Tsagaan Sar signs** — no хадаг, no улзий, no ger — per the brief. The alkhan band stays because it is a general Mongolian geometric ornament, not a lunar-new-year symbol, and it was already built.
4. **No display font.** Inter has complete Cyrillic coverage and the brand already uses it; festive display faces with reliable Mongolian Cyrillic (Ө, Ү, correct ё/й forms) are rare and would cost a web-font download on a mid-range Android. Character comes from colour and surface.
5. **No per-flake DOM snow, no blur, no `filter: drop-shadow` glows.** Snow is two tiled layers; glows are static halo circles and gradients. The persistent animated node count is 15 (3 snow + 12 bulbs), leaving room for the game's own moving parts and the one-off confetti under the 40-node budget.
6. **No fixed garland and no decoration in the lower half of any running screen.** The garland is in flow and scrolls off; it freezes while a stage runs. Everything the player taps is on a plain field with nothing moving near it.
7. **No translucent game panels.** Snow behind a translucent bay would move behind the item the player is reading. Panels are opaque night-700.
8. **No colour-coded lanes in Зөв зам.** Tempting for speed, but it would let players answer by colour rather than by reading the cargo, which changes the game, and four distinct hues on red buttons fail contrast anyway.
9. **No redesign of the invitation PNG, the form, the rules copy, the leaderboard table or the score-landing timings.** They are correct; they were moved onto paper and lit.
10. **No OS dark-mode variant.** The design is a night already; a second theme would double the contrast matrix for no visible gain.
11. **No looping melody.** Two hundred phones in one room with a jingle looping would be the sound of the party going wrong. The bed is a pad and occasional distant bells; it is also muted by default.
