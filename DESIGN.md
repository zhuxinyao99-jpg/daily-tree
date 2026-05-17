# Design System: Daily Tree — 每日一树

## 1. Visual Theme & Atmosphere

A contemplative, living digital space where time becomes visible. The interface breathes slowly — like a forest in timelapse. Dense information is forbidden; every element earns its place. The dominant mood is **premium dark observatory** — the feeling of looking at something vast and alive through a dark glass. Motion is perpetual but glacial: slow rotations, breathing glows, the sense that this forest is always growing even when you're not looking.

**Density:** 2/10 — Gallery Airy. Maximum negative space.
**Variance:** 6/10 — Offset Asymmetric. Not a centered grid — organic clustering.
**Motion:** 7/10 — Fluid CSS + WebGL. Constant subtle movement. Trees breathe.

---

## 2. Color Palette & Roles

- **Void Black** (#0A0A0B) — Primary background. Deep space. The canvas the forest grows in.
- **Forest Floor** (#111113) — Secondary surface. Slightly elevated layers.
- **Mist White** (#E8E8EC) — Primary text. Not pure white — slightly warm, organic.
- **Bark Brown** (#8B7355) — Tree trunk/branch color. Warm, natural.
- **Canopy Green** (#4A7C59) — Primary accent. Healthy, muted forest green. No neon.
- **Root Earth** (#C4A77D) — Secondary accent. Warm amber for roots/historical layers.
- **Living Glow** (#6B9B7A) — Active/live tree glow. Soft pulse.
- **Dormant Blue** (#3D4F5F) — Sleeping/archive tree state. Cool, inactive.
- **Whisper Border** (rgba(255,255,255,0.06)) — Subtle structural lines.
- **Banned:** Purple, neon, outer glow, oversaturated green.

---

## 3. Typography Rules

- **Display / Headlines:** `Outfit` — Track-tight (letter-spacing: -0.03em), weight 600-700. Size via clamp(2.5rem, 6vw, 5rem). Not centered — left-aligned or asymmetric.
- **Body / UI Labels:** `Outfit` — Weight 400-500. Relaxed leading (line-height: 1.6). Secondary color (Mist White at 70% opacity).
- **Metadata / Timestamps:** `JetBrains Mono` — Small (11-12px), uppercase tracking for dates, counts.
- **Font CDN:** `https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap`
- **Banned:** Inter, generic serif, pure black text.

---

## 4. Component Stylings

### Trees (WebGL)
- **Crown shape:** Procedurally generated circle/cloud clusters, varying radius per year.
- **Trunk:** Thin vertical line, bark brown. Height = number of entries that year.
- **Canopy:** Multiple overlapping translucent circles, forest green at varying opacity (0.4-0.8).
- **Breathing animation:** Canopy circles oscillate scale ±5% on a 4-second sine loop. Staggered per tree.
- **States:**
  - Living: Canopy Green glow, breathing animation active.
  - Sleeping (14+ days inactive): Dormant Blue, no breathing.
  - Archived (30+ days): Same position, reduced opacity (0.3), no interaction.
- **Hover:** Tree brightens, tooltip appears showing year + entry count.

### Entry Modal
- Full-screen overlay, Void Black at 95% opacity with backdrop blur.
- Centered content card: Forest Floor background, generous padding (3rem).
- Close: small ×  button top-right, or click outside.
- Input: Single large textarea, Outfit, 1.25rem, no visible border — just bottom hairline in Whisper Border.
- Submit: Forest Green pill button, bottom-right of card.

### Year Sidebar (Desktop)
- Fixed left sidebar, 240px wide, Forest Floor background.
- Each year: large number (Outfit 700, 4rem), entry count below (JetBrains Mono 12px).
- Active year: left border 2px solid Canopy Green.
- Scroll: custom thin scrollbar, Dormant Blue track, Mist White thumb.

### Empty State
- Centered composition: A single seed illustration (SVG), no emoji.
- Text: "Start your first entry. A forest begins with a single tree." — Mist White, Outfit 400.
- Subtle: seed gently bobs up/down (float animation, 3s ease-in-out infinite).

### Hero Section (Landing / About)
- Left-aligned headline spanning ~60% width.
- Headline: "Watch your life grow in rings." — Outfit 700, clamp(2.5rem, 5vw, 4.5rem).
- Subhead: Single sentence description, Outfit 400, Mist White at 70%.
- CTA: Single Forest Green pill button — "Start Planting".
- Background: Subtle radial gradient from Forest Floor to Void Black, slightly offset to top-right.

---

## 5. Layout Principles

- **Desktop:** Sidebar (240px year navigation) + Main canvas (WebGL tree forest) + Optional right panel (entry detail, 320px).
- **Tablet:** Sidebar collapses to top horizontal year strip, canvas full width.
- **Mobile:** Full-screen canvas, floating action button (FAB) bottom-right for new entry, year selector as bottom sheet.
- **Grid:** No CSS Grid — WebGL canvas IS the layout. HTML overlays use absolute/fixed positioning within a relative container.
- **Containment:** Max-width 100dvw × 100dvh, full-bleed canvas always.
- **Banned:** Centered hero, 3-column equal layouts, flexbox math, h-screen (use 100dvh).

---

## 6. Motion & Interaction

- **Tree breathing:** Canopy scale oscillation: `transform: scale(var(--breathe));` where --breathe cycles 0.95→1.05 on 4s ease-in-out. Each tree has a random phase offset (0-4s) so the forest doesn't pulse in sync.
- **New entry growth:** When an entry is added, the tree for that year grows taller with a 600ms spring ease (stiffness: 100, damping: 15).
- **Modal open:** Fade in 200ms + scale from 0.96→1.0.
- **Year change:** Canvas rotates smoothly (CSS perspective + rotateY) to re-center on selected year's cluster.
- **Hover states:** 150ms ease-out transitions on all interactive elements.
- **Scroll-driven:** Year sidebar highlights follow scroll position (IntersectionObserver).
- **Performance:** WebGL via Three.js, canvas renders at device pixel ratio, requestAnimationFrame loop. HTML overlay animations use CSS only (transform + opacity).
- **Perpetual micro-loops:** Active trees always breathing. Even dormant trees have a very slow opacity pulse (0.25→0.35 over 8s).

---

## 7. Landing Page Design (For GitHub README)

- **Hero:** Dark background (Void Black), headline left-aligned, single CTA.
- **Feature row:** 3-column asymmetric — "365 moments", "Time as rings", "Never forget a day". Each with a small inline SVG icon (not emoji).
- **Demo GIF:** Looping 5-second animation of a forest growing (shown in README).
- **Tech stack:** Minimal badge row — Three.js, Vanilla JS, LocalStorage. No heavy frameworks.
- **GitHub README contrast:** Forest Floor card for code block sections.

---

## 8. Anti-Patterns (Banned)

- No emojis anywhere in UI or landing page
- No Inter font
- No pure black (#000000)
- No neon green or electric green
- No outer glow shadows on buttons or cards
- No centered hero sections
- No 3-column equal card grids on landing page
- No generic placeholder text ("John Doe", "Lorem ipsum")
- No fake round numbers as stats
- No "Scroll to explore" or bounce chevron arrows
- No floating labels in inputs — label above, always
- No visible card borders — shadow elevation only
- No generic serif fonts

---

## 9. File Structure

```
DailyTree/
├── index.html          # Main app (canvas + overlays)
├── style.css          # All CSS, design tokens as custom properties
├── app.js             # Core app logic, LocalStorage, entry management
├── webgl/
│   ├── scene.js        # Three.js scene setup
│   ├── tree.js         # Tree generation + animation
│   └── renderer.js     # Render loop
├── components/
│   ├── modal.js        # Entry modal logic
│   ├── sidebar.js      # Year navigation
│   └── toast.js        # Subtle feedback toasts
├── landing.html        # Standalone landing page (for GitHub Pages)
└── README.md
```
