# Background addendum — running rails and the Monlogistics plane

**Date:** 2026-11-21 · **Extends:** `2026-11-20-festive-art-direction.md` §3 (persistent background), §8.5 (node budget)
**Client request (verbatim):** "үндсэн background дээр 2 тийшээгээ rail явж болох уу, бас дээгүүр нь Monlogistics-ийн логотой онгоц нисээд байж болох уу"

Everything here is CSS `transform`/`opacity` on four small nodes plus one static gradient strip. No JS loop, no per-tie DOM, no filters, no new fonts, no new images, nothing from Tsagaan Sar. The invitation PNG, the games, the tap targets and every existing token are untouched.

---

## 1. My reading of the request, and what I am building

**"2 тийшээгээ rail явж"** — I read this as *traffic on the rails in both directions*, not as two static rail lines and not as the rail texture itself sliding. A rail "runs" only when something runs on it. Sliding the tie pattern would make the whole yard look like the camera is panning while the stacks and crane stand still — a broken illusion, and the one thing you would notice behind every page. Two rail lines are already implied by "2 тийшээгээ" (one each way), so the build is:

- **Two tracks** on the ground band of the yard silhouette (near and far), static, zero animated nodes.
- **Two freight trains**, one per track, one going east (left→right, near track, larger), one going west (right→left, far track, smaller and dimmer). Container flatcars with a locomotive: Monlogistics' own cargo, red containers with the same three paper stripes the hero truck and the stack game already use. Each train is **one node**.

**"Monlogistics-ийн логотой онгоц"** — a plane with the Monlogistics logo. The real `logo.png` cannot be carried by a background-scale plane; §3.4 says exactly why. What the client will get is a **night airliner in our livery**: dark fuselage with lit windows, a **brand-red tail fin with a paper-white band** (the logo's red block and white "mon" reduced to the two shapes that survive at 60 px) and a red cheatline. It crosses the top of the sky eastbound, is gone for a while, then comes back westbound: the Monlogistics flight out and the flight home. **One node** for the crossing plus **one node** for the blinking beacon.

If the client in fact meant the **gold alkhan band at the top** ("rail" is what my own doc calls it) scrolling sideways — the answer is no, and it is in §7. A marquee pinned at the top of every page, 40 px from the garland, is motion at the top of the eye on every screen, including the ones where people are reacting.

The literal request does not hurt the product; what would hurt it is doing it at daytime brightness. Both additions are built at silhouette values (between night-900 and night-500) with their own small lights, so they belong to the same night as the stacks and the crane, and they do not raise the luminance under body text (§2.4, §3.5).

---

## 2. The rails

### 2.1 Geometry

Replace the single dashed line in the yard SVG (`line 0,66 → 390,66`) with a static CSS strip, `.tracks`, pinned to the bottom of `.sky` in **px**, so it does not scale with the yard's `xMidYMax slice` on wide screens and the trains always sit on it.

| Element | Vertical position (from the viewport bottom) | Look |
|---|---|---|
| Near rail | 2–3 px (1 px line) | gleam: `rgba(201,214,230,.35)` over ground `#161C2E` → `#555D6E`, 2.56:1 against the ground — a rail catching the floodlight |
| Near ties | 1–5 px, 2 px wide every 10 px | `rgba(42,51,80,.75)` (night-500) |
| Far rail | 8–9 px (1 px line) | `rgba(201,214,230,.22)` → ≈`#3E475A`, 1.9:1 against the ground |
| Far ties | 7–10 px, 1.5 px wide every 8 px | `rgba(42,51,80,.55)` |

The ground band in the yard SVG is 12 viewBox units tall and bottom-aligned, so it is ≥ 12 px at every width; both tracks stay on the ground. The gantry crane (x 236–286 in the yard) straddles both tracks — a gantry over rail is what a rail terminal looks like, so the trains run under it.

### 2.2 The trains

One SVG data-URI per train is **not** needed: one drawing, facing east, 176 × 14; the west train is the same drawing at 150 × 12 (via `background-size`) and mirrored with `scaleX(-1)` inside its keyframes.

Train composition (left to right, east-facing): three flatcars at x = 0, 44, 88, a coupler, the locomotive at x = 134–176.

- **Flatcar:** deck `rect 0,10 40×1.5` `#2A3350`; wheels `circle r1.5` at x 5, 10, 30, 35, cy 12.5, `#2A3350`.
- **Container on each car:** `rect 2,3 36×7` fill **`#8C1C28`** (brand red at night, §2.4) with `#C9D6E6` stroke at .35 / .6 px; snow cap `rect 2,2 36×1.4` frost .8; three paper stripes 1 px wide at x 11, 20, 29, `#FAF7F0` at .35 — the MLG container signature from the hero and the stack game.
- **Locomotive:** body `rect 134,3 40×8.5 rx1` `#161C2E` stroke `#2A3350` .8; snow on the roof `rect 134,2.2 40×1.4` frost .8; cab window `rect 165,5 5×3` `#FFF1C9` at .7; headlight `circle 174.5,8 r1.5` `#FFF1C9`; deck `rect 134,11 40×1` `#2A3350`; wheels at x 139, 145, 163, 169; coupler `rect 128,9 6×1` `#2A3350`.

The headlight and cab window are the "night" cue and are static inside the moving tile — no extra nodes.

### 2.3 Timing

| Train | Track | Size | Crossing | Idle off-screen | Loop | Start offset | Speed on a 390 px phone |
|---|---|---|---|---|---|---|---|
| `.train-east` | near | 176 × 14, opacity 1 | 22 s, `linear` | 18 s | 40 s | `-10s` (on screen at first paint) | ≈ 26 px/s |
| `.train-west` | far | 150 × 12, opacity .7 | 30.2 s, `linear` | 25.8 s | 56 s | `-40s` (enters at 16 s) | ≈ 18 px/s |

Different loop lengths (40 / 56 s) mean the two trains pass each other on screen roughly every few minutes rather than on a fixed beat. Linear easing: shunting speed, no acceleration — a train at a terminal, not a toy.

### 2.4 Colour and the ratios being protected

The trains run through the bottom 20 px of the viewport. Footer text, the leaderboard title and the empty-state sheet scroll over that band. The one colour that could break text there is brand red: paper on `#ED1C24` is **4.38** and frost on it is **2.99**. So the containers are **not** `#ED1C24`. They are `#8C1C28` — `#ED1C24` at 55 % over the ground `#161C2E`, i.e. the same red the yard's silhouettes would show at night. New token:

| Token | Hex | Role |
|---|---|---|
| **`--color-brand-night`** | `#8C1C28` | Brand red in the dark: train containers, the plane's fin and cheatline. **Fills only, never text.** |

| Text | Over | Ratio | Verdict |
|---|---|---|---|
| `#FAF7F0` paper | `#8C1C28` brand-night | **8.49** | AA all sizes |
| `#C9D6E6` frost | `#8C1C28` | **6.16** | AA normal |
| `#E8B931` gold | `#8C1C28` | **4.94** | AA normal |
| `#FAF7F0` | `#161C2E` locomotive / ground | **15.84** | AA all sizes |
| `#C9D6E6` | `#161C2E` | **11.49** | AA all sizes (already in the 11-20 table) |
| far train at .7 over ground → `#691C2A` | — | darker still; every ratio above improves | — |

Sub-glyph elements — the 1 px rails and stripes, the 1.4 px snow caps, the 3 px headlight and cab window — are in the same class as the eight stars already under the text and are not counted; none is wider than a letter stroke.

### 2.5 CSS

```css
/* ---- Төмөр зам — хоёр чиглэлийн зам. Статик, зангилаа нэмэхгүй. ---- */
.tracks {
  position: absolute; left: 0; right: 0; bottom: 0; height: 12px;
  background-repeat: repeat-x;
  background-image:
    repeating-linear-gradient(90deg, rgba(42,51,80,.75) 0 2px, transparent 2px 10px), /* ойрын дэр */
    linear-gradient(rgba(201,214,230,.35), rgba(201,214,230,.35)),                  /* ойрын зам */
    repeating-linear-gradient(90deg, rgba(42,51,80,.55) 0 1.5px, transparent 1.5px 8px), /* холын дэр */
    linear-gradient(rgba(201,214,230,.22), rgba(201,214,230,.22));                  /* холын зам */
  background-size: 10px 4px, 100% 1px, 8px 3px, 100% 1px;
  background-position: 0 calc(100% - 1px), 0 calc(100% - 2px), 0 calc(100% - 7px), 0 calc(100% - 8px);
}

/* ---- Галт тэрэг — нэг зураг, хоёр зангилаа. Зөвхөн transform. ---- */
.train {
  position: absolute; bottom: 1px; left: 0;
  width: 176px; height: 14px;
  background-repeat: no-repeat; background-size: 100% 100%;
  will-change: transform;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='176' height='14' viewBox='0 0 176 14'%3E%3Cdefs%3E%3Cg id='c'%3E%3Crect x='2' y='3' width='36' height='7' fill='%238C1C28' stroke='%23C9D6E6' stroke-opacity='.35' stroke-width='.6'/%3E%3Crect x='2' y='2' width='36' height='1.4' fill='%23C9D6E6' opacity='.8'/%3E%3Cg fill='%23FAF7F0' opacity='.35'%3E%3Crect x='11' y='3' width='1' height='7'/%3E%3Crect x='20' y='3' width='1' height='7'/%3E%3Crect x='29' y='3' width='1' height='7'/%3E%3C/g%3E%3Crect x='0' y='10' width='40' height='1.5' fill='%232A3350'/%3E%3Cg fill='%232A3350'%3E%3Ccircle cx='5' cy='12.5' r='1.5'/%3E%3Ccircle cx='10' cy='12.5' r='1.5'/%3E%3Ccircle cx='30' cy='12.5' r='1.5'/%3E%3Ccircle cx='35' cy='12.5' r='1.5'/%3E%3C/g%3E%3C/g%3E%3C/defs%3E%3Cuse href='%23c' x='0'/%3E%3Cuse href='%23c' x='44'/%3E%3Cuse href='%23c' x='88'/%3E%3Crect x='128' y='9' width='6' height='1' fill='%232A3350'/%3E%3Crect x='134' y='3' width='40' height='8.5' rx='1' fill='%23161C2E' stroke='%232A3350' stroke-width='.8'/%3E%3Crect x='134' y='2.2' width='40' height='1.4' fill='%23C9D6E6' opacity='.8'/%3E%3Crect x='165' y='5' width='5' height='3' fill='%23FFF1C9' opacity='.7'/%3E%3Ccircle cx='174.5' cy='8' r='1.5' fill='%23FFF1C9'/%3E%3Crect x='134' y='11' width='40' height='1' fill='%232A3350'/%3E%3Cg fill='%232A3350'%3E%3Ccircle cx='139' cy='12.5' r='1.5'/%3E%3Ccircle cx='145' cy='12.5' r='1.5'/%3E%3Ccircle cx='163' cy='12.5' r='1.5'/%3E%3Ccircle cx='169' cy='12.5' r='1.5'/%3E%3C/g%3E%3C/svg%3E");
}
.train-east {
  animation: train-east 40s linear -10s infinite;
}
.train-west {
  left: auto; right: 0;
  bottom: 7px; width: 150px; height: 12px;
  opacity: .7;
  animation: train-west 56s linear -40s infinite;
}
@keyframes train-east {
  0%   { transform: translateX(-100%); }
  55%  { transform: translateX(100vw); }   /* 22 s crossing */
  100% { transform: translateX(100vw); }   /* 18 s parked off-right */
}
/* scaleX(-1) is in EVERY keyframe so it never interpolates. */
@keyframes train-west {
  0%   { transform: translateX(100%)   scaleX(-1); }
  54%  { transform: translateX(-100vw) scaleX(-1); } /* 30.2 s crossing */
  100% { transform: translateX(-100vw) scaleX(-1); } /* 25.8 s parked off-left */
}
```

Both trains are HTML divs, not `<g>` groups inside the yard SVG: a CSS transform on an SVG child repaints the SVG every frame in Chromium; a transform on an HTML box with `will-change` composites. That is the whole reason the rails moved out of the SVG.

### 2.6 Reduced motion — still form

Two trains **parked**, lights on, one at each end of the yard. They do not disappear.

```css
@media (prefers-reduced-motion: reduce) {
  .train { animation: none; }
  .train-east { transform: translateX(6vw); }
  .train-west { transform: translateX(-6vw) scaleX(-1); }
}
```

On a 390 px phone that puts the near train at x 23–199 and the far train at x 217–367: two trains waiting on two tracks, not touching.

---

## 3. The plane

### 3.1 View, size, position

**Side profile, not the DropStage top-down sprite.** The game's `Plane()` is drawn from above because the player drops cargo from it; seen in the sky it reads as a map marker. A plane crossing the sky above a yard is seen from the ground: side-on. It also must look *different* from the game plane — the game plane is bright red and the player tracks it; the background plane is a dark silhouette with lights. Two objects, two drawings. `Plane()` in `DropStage.tsx` is not changed.

- Rendered size **60 × 22 px** (`viewBox 0 0 60 22`). Small enough that body text passes over it in a glyph or two; big enough that the fin and windows read.
- `position: absolute; top: 60px; left: 0` inside `.sky`. The sound toggle is `fixed; top: 12px` and 44 px tall (12–56 px); the plane's band is 60–82 px, so it never passes behind a tap target. At scroll 0 that is the row of the logo label (opaque paper — the plane passes behind the shipping label) and below the garland (8–40 px), so it does not fly through the bulbs.
- Altitude never changes. No bob, no contrail, no banking.

### 3.2 Path and timing

One node does both directions. The flip (`scaleX(-1)`) happens inside the off-screen idle, where interpolating through `scaleX(0)` is invisible.

| Phase | Time | Keyframe |
|---|---|---|
| Eastbound crossing (left → right) | 0–13 s | 0 % → 20.3125 % |
| Idle, parked off-right; flips | 13–32 s | 20.3125 % → 50 % |
| Westbound crossing (right → left) | 32–45 s | 50 % → 70.3125 % |
| Idle, parked off-left; flips back | 45–64 s | 70.3125 % → 100 % |

Loop 64 s, `linear` (cruise), `animation-delay: -4s` so the plane is already 4 s into its first crossing at first paint. On a 390 px phone a crossing is ≈ 35 px/s — slower than the near snow, faster than the trains, so the three layers stack as far / middle / near. It never idles on screen; off-screen idle is 19 s each side, so a 4-minute session sees it 6–7 times (fewer, because stages pause it).

### 3.3 The beacon

One red anti-collision light on top of the fuselage, blinking at 1.2 s with `steps(1, end)`: 120 ms on, 1.08 s off. Step easing means two repaints of a 60 × 22 layer per cycle, not a per-frame fade. It is the one thing that makes a dark shape in the sky read as a *night flight* instead of a sticker. It is also the first node to cut if the budget is ever tight (§6).

### 3.4 Livery — what "логотой" means at 60 px

**The real logo cannot go on this plane, and I am not going to pretend it can.** `logo.png` is 480 × 133 with black lettering; scaled to the width of the fuselage (≈ 40 px) "logistics" has a 3 px x-height, which is noise, and it needs the paper plate behind it — a 40 × 11 px white rectangle crossing the top of every screen under the page titles. That is the one object that would actually break the contrast rule, and it would look like a bandage. A towed banner is worse (§7).

What survives at 60 px is the logo's *structure*: a red block with white marks spilling off its right edge. On a plane that is the **tail fin**: brand-red fin, a paper-white band through it, and a red cheatline along the fuselage. Red tail + white band + red stripe is the house livery; the hero truck's container and the game plane already use red + paper stripe, so this is the same family at a third scale. Two hundred Monlogistics employees will read a red-tailed plane over their own yard as theirs without a single letter.

Reds: the fin and cheatline are **`#8C1C28` brand-night** (§2.4), not `#ED1C24`, for the same reason as the containers. The only full-brightness red is the 2.6 px beacon, because it is a light. The fuselage is night-500 `#2A3350` with a frost hairline; windows are warm `#FFF1C9` dashes; the nose light is warm.

If the client needs to *see the actual logo on a plane*, the right place is a one-off static illustration on paper — e.g. a 160 px plane on the DropStage ready sheet, where the logo sits on a paper plate legitimately. That is outside this spec; I am flagging it so nobody tries to fix it in the background.

### 3.5 Ratios being protected

The plane crosses the title/body band at the top of the content. Text classes used there: paper (titles, body), frost (subtitles), gold (eyebrows).

| Text | Over | Ratio | Verdict |
|---|---|---|---|
| `#FAF7F0` paper | `#2A3350` fuselage | **11.63** | AA all sizes |
| `#C9D6E6` frost | `#2A3350` | **8.44** | AA all sizes |
| `#E8B931` gold | `#2A3350` | **6.76** | AA normal |
| `#FAF7F0` | `#8C1C28` fin / cheatline | **8.49** | AA all sizes |
| `#C9D6E6` | `#8C1C28` | **6.16** | AA normal |
| `#E8B931` | `#8C1C28` | **4.94** | AA normal |
| `#FAF7F0` | `#1B2237` wing | **14.75** | AA all sizes |

Excluded as sub-glyph (same class as the stars): the 1 px frost outline, the 1.2 px cheatline, the 1.7 px paper band on the fin, the 1.2 px window dashes, the 2.6 px nose light and beacon. Nothing on the plane larger than a letter stroke is brighter than `#2A3350`.

### 3.6 The SVG — complete, paste as-is into `Sky.tsx` (convert attributes to JSX)

```html
<svg class="plane" viewBox="0 0 60 22" width="60" height="22" aria-hidden="true">
  <!-- хойд тогтворжуулагч -->
  <path d="M45 13 L55 13 L52 16.5 L44 16.5 Z"
        fill="#2A3350" stroke="#C9D6E6" stroke-opacity=".7" stroke-width="1" stroke-linejoin="round"/>
  <!-- сүүл — логоны улаан блок, шөнийн улаан -->
  <path d="M43 10.5 L48.5 2.5 L55 2.5 L51.5 10.5 Z"
        fill="#8C1C28" stroke="#C9D6E6" stroke-opacity=".7" stroke-width="1" stroke-linejoin="round"/>
  <!-- сүүлэн дээрх цаасан зурвас — логоны цагаан «mon» -->
  <path d="M46.6 8.5 L49.6 4 L51.3 4 L48.3 8.5 Z" fill="#FAF7F0" opacity=".95"/>
  <!-- их бие -->
  <path d="M4 13 C4 10.6 7 9.5 11 9.5 L46 9.5 C50 9.5 54.5 11 58 13 C54.5 15 50 16.5 46 16.5 L11 16.5 C7 16.5 4 15.4 4 13 Z"
        fill="#2A3350" stroke="#C9D6E6" stroke-opacity=".85" stroke-width="1" stroke-linejoin="round"/>
  <!-- улаан cheatline -->
  <rect x="9" y="14" width="38" height="1.2" fill="#8C1C28"/>
  <!-- цонхнууд — дулаан гэрэл -->
  <line x1="13" y1="12" x2="42" y2="12"
        stroke="#FFF1C9" stroke-opacity=".85" stroke-width="1.2" stroke-dasharray="1.2 2.1"/>
  <!-- далавч (үзэгч рүү) ба хөдөлгүүр -->
  <path d="M20 13.5 L34 13.5 L27 20 L16 20 Z"
        fill="#1B2237" stroke="#C9D6E6" stroke-opacity=".7" stroke-width="1" stroke-linejoin="round"/>
  <rect x="21" y="17" width="8" height="3.2" rx="1.6"
        fill="#2A3350" stroke="#C9D6E6" stroke-opacity=".7" stroke-width=".8"/>
  <!-- хамрын гэрэл -->
  <circle cx="57" cy="13" r="1.3" fill="#FFF1C9"/>
  <!-- анивчдаг beacon — онгоцон дээрх ганц хөдөлгөөнт зангилаа -->
  <circle class="beacon" cx="30" cy="8.4" r="1.3" fill="#ED1C24"/>
</svg>
```

Draw order matters: stabiliser and fin first (behind), fuselage over them, wing and engine over the fuselage (nearer the viewer), lights last.

### 3.7 CSS

```css
/* ---- Онгоц — нэг зангилаа нисэлт, нэг зангилаа beacon. ---- */
.plane {
  position: absolute; top: 60px; left: 0;
  width: 60px; height: 22px;
  will-change: transform;
  transition: opacity 240ms linear;          /* тоглоом эхлэх/дуусахад л ашиглагдана */
  animation: plane-cross 64s linear -4s infinite;
}
/* Эргэлт (scaleX) дэлгэцийн гадна, зогссон үед л болно. */
@keyframes plane-cross {
  0%        { transform: translateX(-100%) scaleX(1);  }
  20.3125%  { transform: translateX(100vw) scaleX(1);  }  /* зүүн → баруун, 13 s */
  50%       { transform: translateX(100vw) scaleX(-1); }  /* баруунд зогссон, эргэнэ */
  70.3125%  { transform: translateX(-100%) scaleX(-1); }  /* баруун → зүүн, 13 s */
  100%      { transform: translateX(-100%) scaleX(1);  }  /* зүүнд зогссон, эргэнэ */
}
.beacon { animation: beacon 1.2s steps(1, end) infinite; }
@keyframes beacon {
  0%   { opacity: .15; }
  50%  { opacity: 1;   }
  60%  { opacity: .15; }
  100% { opacity: .15; }
}
```

`transform-origin` stays at the default centre, so the flip keeps the box in place while it is off-screen (the box is fully outside the viewport at both ends: `-100%` of its own width on the left, `100vw` on the right).

### 3.8 Reduced motion — still form

The plane is **parked in the sky**, top-right, beacon lit, not removed: `translateX(calc(100vw - 92px))` puts it at x `100vw-92 … 100vw-32`, y 60–82, below and left of the sound toggle (y 12–56, x `100vw-56 … 100vw-12`) with no overlap.

```css
@media (prefers-reduced-motion: reduce) {
  .plane  { animation: none; transform: translateX(calc(100vw - 92px)); }
  .beacon { animation: none; opacity: 1; }
}
```

---

## 4. Layering — updated `.sky` stack

Bottom to top in paint order (DOM order inside `.sky`, all `position: absolute`):

| # | Node | Animated? | Notes |
|---|---|---|---|
| 0 | `.sky` background | no | stars + sky gradient (unchanged) |
| 1 | **`svg.plane`** | yes (transform) + `.beacon` (opacity) | **new.** Above the stars, *below the snow*: snow falls in front of a plane that is far away. `top: 60px`. |
| 2 | `.snow-sway` → `.snow-far`, `.snow-near` | yes ×3 | unchanged |
| 3 | `svg.yard` | no | unchanged **except** the dashed rail `line 0,66 → 390,66` is deleted |
| 4 | **`.tracks`** | no | **new.** Static gradient strip, bottom 12 px |
| 5 | **`.train.train-west`** | yes (transform) | **new.** Far track, `bottom: 7px`, opacity .7, drawn first so the near train covers it |
| 6 | **`.train.train-east`** | yes (transform) | **new.** Near track, `bottom: 1px` |

```html
<div class="sky" aria-hidden="true">
  <svg class="plane" …>…</svg>
  <div class="snow-sway">
    <div class="snow snow-far"></div>
    <div class="snow snow-near"></div>
  </div>
  <svg class="yard" …>…</svg>          <!-- dashed rail line removed -->
  <div class="tracks"></div>
  <div class="train train-west"></div>
  <div class="train train-east"></div>
</div>
```

Everything stays behind `z-10` content, `pointer-events: none`, inside `overflow: hidden`. `Sky` stays a server component with no state; it lives in `layout.tsx`, so client-side route changes do not restart any of these animations (only a hard reload does).

---

## 5. Behaviour while a stage is running

`<html data-stage="running">` is set by `useRunningStage` on `phase === 'running'` for all four stages. In that state:

| Element | Behaviour | Why |
|---|---|---|
| Trains | **Freeze in place** (`animation-play-state: paused`). Stay visible. | A stopped train looks parked; it is the same kind of object as the static stacks. The sort game's lane buttons sit at the bottom of the viewport with 8 px gaps between them and 20 px gutters — frozen, nothing shows through those gaps that moves. |
| Plane | **Pause and fade to `opacity: 0` over 240 ms.** Returns the same way when the stage ends, resuming from where it was. | A frozen plane hanging mid-sky looks like a bug, not a pause. And in Агаараас буулгах the player is tracking *their* red plane across the bay; a second plane in the sky above it is interference. This is the one deliberate exception to "it stops, it does not disappear" — that rule is for reduced motion, where the user's preference is about motion, not attention. Here attention is the point. The node stays mounted; nothing re-layouts. |
| Beacon | Paused (it is inside the faded plane anyway). | — |
| Tracks | Static; nothing to do. | — |
| Snow, bulbs | Unchanged from §3.4 of the 11-20 doc (snow keeps falling, bulbs steady at .85). | — |

```css
html[data-stage="running"] .train,
html[data-stage="running"] .beacon { animation-play-state: paused; }
html[data-stage="running"] .plane  { animation-play-state: paused; opacity: 0; }
```

**Keyboard on `/register`.** The 11-20 doc §4.2 forbids anything animated fixed at the bottom while the soft keyboard is open; the trains are exactly that. Same quiet state while any field is focused, CSS-only, in its **own rule** so a browser without `:has()` drops only this rule and nothing else:

```css
html:has(input:focus, select:focus, textarea:focus) .train,
html:has(input:focus, select:focus, textarea:focus) .beacon { animation-play-state: paused; }
html:has(input:focus, select:focus, textarea:focus) .plane  { animation-play-state: paused; opacity: 0; }
```

Do not merge these selectors with the `data-stage` ones.

---

## 6. Budget

Persistent count rule from §8.5 of the 11-20 doc: 40-node ceiling at any instant, including one-off confetti.

| State | Before | After | Δ |
|---|---|---|---|
| Persistent, idle screens (`/`, `/register`, `/rules`, ready sheets, `/invite`) | 3 snow + 12 bulbs = **15** | 15 + 2 trains + 1 plane + 1 beacon = **19** | +4 |
| Running stage (`data-stage="running"`) | 3 (snow; bulbs paused) | **3** (trains, plane, beacon paused too) | 0 |
| Keyboard open on `/register` | 15 | **15** (new nodes paused) | 0 |
| `/result` score landing, 1100–2300 ms (22 confetti today) | 22 + 15 = **37** | 22 + 19 = **41 — over** | — |
| **`/result` score landing, with the two changes below** | — | 18 + 19 = **37** | ≤ 40 |
| `/result` top-5 burst (16 gold pieces) | as currently specified at 1600 ms it **overlaps** the landing confetti: 22 + 16 + 15 = 53 — a pre-existing overrun in my own §6.7 count, which forgot the landing pieces | 16 + 19 = **35** once sequenced | ≤ 40 |

**What is paid to make room (two changes, both on `/result`, both invisible to the player):**

1. Landing confetti `CONFETTI` in `ScoreCard.tsx` goes from **22 to 18 pieces**. §4.5 already keeps them out of the central 40 %, so fewer pieces across the two side bands is cleaner, not thinner.
2. The top-5 gold burst (§6.7) fires at **2400 ms instead of 1600 ms**, i.e. after the landing confetti has finished (1100 + 1200 ms). The banner itself still enters at 1600 ms; only its confetti waits 800 ms. The second chord (§7.6) moves with the burst to 2400 ms.

Worst case after this spec: **37** at the score landing. Headroom 3. If anything else ever needs a node, cut in this order: beacon (−1), far train (−1), then bulbs 12 → 10 (−2). Never the near train or the plane — they are the request.

Compositor notes: four new `will-change: transform` layers of ≤ 176 × 14 px and 60 × 22 px; one static gradient strip; the beacon's step blink repaints a 60 × 22 layer twice per 1.2 s. No filters, no blur, no layout.

---

## 7. What I rejected, and why

1. **Sliding the tie pattern ("moving rails").** Makes the camera pan while the stacks and crane stand still — the eye reads it as the page scrolling behind the text. Something must move *on* the rail, not the rail.
2. **The real `logo.png` on the plane.** 3 px x-height, black on a white plate crossing under titles. The only object in this spec that would genuinely break the 17.16 paper-on-night rule. Explained in §3.4; alternative given.
3. **A towed banner with the logo.** The classic "логотой онгоц". A 120–160 px white banner moving under body text on every page; also a daytime-beach image, not 11:50 pm in a snowed-in yard.
4. **Scrolling the gold alkhan band** (if that is what "rail" meant). Marquee motion at the top of every screen, 40 px from the garland, visible during the ready sheets where people are about to react. No.
5. **Full-brightness `#ED1C24` on the containers and the fin.** Paper 4.38, frost 2.99, gold 3.38 — fails under footer and subtitle text. Brand-night `#8C1C28` keeps every pair ≥ 4.94 and is what red looks like in the dark anyway.
6. **Trains as `<g>` groups inside the yard SVG.** CSS transforms on SVG children repaint the whole SVG per frame in Chromium. HTML divs with tiled backgrounds composite; that is why the rail left the SVG.
7. **Two planes (one per direction, simultaneous) or a formation.** Two nodes for a worse picture: one plane that leaves and comes back is a story; two is traffic.
8. **Reusing the DropStage `Plane()` sprite.** Top-down reads as a map marker in a sky; it is bright red by design because the player must track it; and the background plane must look like a *different* aircraft from the one you fly.
9. **Bob, contrail, banking, landing-light cone.** Each is a node or a gradient under text; none is needed for "a plane flew over".
10. **JS-timed random crossings.** A loop is a loop; 40 / 56 / 64 s periods with different lengths already de-sync the three movers. No JS in the background, same as before.
11. **A train on the top rail (the gantry rail the garland hangs from).** Motion through the bulbs, at the top of the eye. The garland stays as it is.
12. **Fading the trains out during stages (like the plane).** A train vanishing from the yard is more noticeable than a train stopping; stopping is what trains do. The plane is the exception, argued in §5.
