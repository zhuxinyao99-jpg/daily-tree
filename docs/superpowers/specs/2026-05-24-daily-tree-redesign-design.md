# Daily Tree Redesign — Design Spec
_2026-05-24_

## Scope

Four feature areas in one release:

1. Landing page flash fix
2. Tree growth system (7 stages + sprouting animation)
3. Bottom nav redesign (timeline strip + date navigation)
4. Clickable tree branches (view past entries by time period)

---

## 1. Landing Page Flash Fix

**Problem:** `index.html` uses `<meta http-equiv="refresh" content="0;url=landing.html">`. The browser renders the blank page first, then redirects — causing a white flash before the landing page appears.

**Fix:** Replace meta-refresh with an inline `<script>` redirect:

```html
<script>window.location.replace('landing.html');</script>
```

`window.location.replace` avoids adding a history entry, so the back button works correctly. No visual flash.

---

## 2. Tree Growth System

### 2.1 Stage Definitions

| Stage | Days | Label |
|-------|------|-------|
| 种子 Seed | 0 | 一颗种子 |
| 破土 Crack | 1 | 开始破土 |
| 嫩芽 Sprout | 2–7 | 嫩芽初现 |
| 幼树 Sapling | 8–30 | 幼苗生长 |
| 小树 Young | 31–90 | 茁壮成长 |
| 成年树 Mature | 91–300 | 枝繁叶茂 |
| 古树 Ancient | 300+ | 参天古树 |

### 2.2 Rendering Architecture

All stages rendered on a single `<canvas>` element via Canvas 2D API. No WebGL, no SVG. The renderer lives in `app/tree.js` and exports a single function:

```js
drawTree(canvas, { dayCount, seed, animate })
```

- `seed`: derived from user ID or creation date — ensures the same tree shape across sessions
- `animate`: boolean, triggers sprouting animation only on first entry of the day
- Canvas sized per stage (see below); caller sets `canvas.width` / `canvas.height`

### 2.3 Visual Design (approved)

**Seed:** Oval dark brown shape with subtle highlight, half-buried in soil.

**Crack:** Same seed with a small split crack at top, a tiny white cotyledon tip emerging.

**Sprout:** Two small elliptical leaves on a thin green stem, slightly asymmetric.

**Sapling (8–30 days):** Single straight trunk (~60px), 2 main branches, small leaf clusters. No crown blob — individual leaves only.

**Young (31–90 days):** Taller trunk (~100px), 4 branches, denser leaf clusters with base volume blob.

**Mature (91–300 days):** Full trunk with horizontal gradient + bark streaks. 6 branches at 3 heights (t=0.55/0.74/0.93), recursive depth=3, crown blobs + individual leaves. Canvas 340×460.

**Ancient (300+ days):** Wider trunk (trunkW=30), 6 branches, recursive depth=4, more roots (×6), larger scale. Canvas 380×490.

### 2.4 Trunk Rendering

Horizontal linear gradient (dark edges → bright center → dark edges) creates a cylinder illusion. Bark streaks: 4–6 vertical lines at random x positions with low-opacity brown stroke.

### 2.5 Branch Rendering

Tapered polygon shape using quadratic bezier curves (`branchSeg`). Recursive `growBranch` collects tip positions into `tips[]` array for crown placement. Seeded RNG (`rngFrom(seed)`) ensures deterministic variation.

### 2.6 Crown Rendering

Per tip point:
1. Base volume blob: 8–13 radial gradient ellipses, `rgba(68,148,42,0.55)`
2. Individual leaf shapes (55–85 leaves, 3 passes back→front): `hsl(95–123, 55–77%, 28–55%)`
3. Top highlight radial gradient

Leaf lightness must be ≥28% (minimum) to be visible on the dark `#080e08` background.

### 2.7 Sprouting Animation

Triggered once per day on first journal entry. Only plays for Seed→Crack→Sprout stages.

- Seed to Crack: 400ms ease-in, crack line draws from center outward
- Crack to Sprout: 600ms, stem grows upward (height lerp 0→full), leaves scale in (transform: scale)
- Implementation: `requestAnimationFrame` loop with progress `t` from 0→1, no CSS transitions (canvas redraws each frame)

---

## 3. Bottom Nav Redesign

### 3.1 Layout

Remove the search icon. Final bottom bar layout (left to right):

```
[ 日历 ]  [ 统计 ]  [  +  ]  [ 树 ]  [ 设置 ]
```

The `+` FAB remains centered, green, elevated (box-shadow).

### 3.2 Timeline Strip

A horizontal scrollable date strip sits **above** the bottom nav bar. It is always visible (not a drawer).

```
┌─────────────────────────────────────────┐
│  ... 5/20  5/21  5/22  5/23 [5/24] ... │  ← timeline strip
├─────────────────────────────────────────┤
│  日历   统计   [+]   树   设置          │  ← bottom nav
└─────────────────────────────────────────┘
```

- Each date cell: ~44px wide, shows day number + a small dot if entry exists
- Today is highlighted (green pill background)
- Scrolls horizontally; auto-scrolls to today on load
- Tapping a past date navigates to that day's view (read-only if no entry, or shows entry)
- Strip height: 40px

### 3.3 Date Navigation State

The app maintains a `selectedDate` (default: today). Tapping a date in the strip sets `selectedDate` and re-renders the main tree + entry view for that date. A "今天" chip appears when viewing a past date to return to today.

---

## 4. Clickable Tree Branches

### 4.1 Concept

Each major branch on the mature/ancient tree corresponds to a time period. Tapping a branch shows a panel with journal entries from that period.

### 4.2 Branch-to-Period Mapping

Based on `branchDefs` trunk position values:

| Branch pair | Trunk t | Time period |
|-------------|---------|-------------|
| Low branches | 0.55 | Earliest third of growth |
| Mid branches | 0.74 | Middle third |
| High branches | 0.93 | Most recent third |

For a tree with N total days, each third covers ~N/3 days.

For young trees (< 4 branches), all branches map to the full history.

### 4.3 Hit Detection

During `growBranch`, collect all branch segments into a `branchSegments[]` array alongside their period tag:

```js
branchSegments.push({ x0, y0, x1, y1, period: 'early' | 'mid' | 'recent' })
```

On canvas `touchstart` / `click`:
1. Convert event coordinates to canvas space (accounting for `getBoundingClientRect` + devicePixelRatio)
2. Find the segment with minimum point-to-segment distance
3. If distance < 18px (touch-friendly threshold), trigger the period panel

### 4.4 Entry Panel

A bottom sheet slides up showing:
- Period label (e.g., "第 1–30 天")
- List of entry cards (date + first line of text)
- Tapping an entry card opens it in full read view
- Dismiss: tap outside or swipe down

The bottom sheet reuses the existing modal component styling.

### 4.5 Stages That Support Branch Tapping

Only Mature (91+) and Ancient (300+) stages have enough branches to make tapping meaningful. Earlier stages show a tap → gentle pulse animation with no panel (branches too young to categorize).

---

## Data Flow

```
app.js
  ├── reads localStorage entries (keyed by date YYYY-MM-DD)
  ├── computes dayCount from firstEntryDate → today
  ├── calls drawTree(canvas, { dayCount, seed, animate })
  │     └── tree.js: renders stage, returns branchSegments[]
  ├── attaches canvas click handler → hit-detect on branchSegments[]
  │     └── on hit: shows EntryPanel for period
  └── timeline strip: renders dates, handles selectedDate state
```

---

## Files Changed

| File | Change |
|------|--------|
| `index.html` | Replace meta-refresh with JS redirect |
| `app/tree.js` | Full rewrite: 7-stage renderer + animation + branchSegments export |
| `app/index.html` | Bottom nav restructure + timeline strip HTML |
| `app/style.css` | Timeline strip styles + bottom nav update + entry panel bottom sheet |
| `app/app.js` | selectedDate state + canvas click handler + period panel logic |

---

## Out of Scope

- Server-side storage (localStorage only)
- Push notifications
- Social / sharing features
- Landscape orientation support
