# Daily Tree V2 — Design Spec

**Date:** 2026-05-16  
**Status:** Approved

---

## Context

Daily Tree is a personal journaling app where one entry per day makes a tree grow. The current version uses abstract concentric rings (top-down cross-section) to represent the tree. Users found this too geometric and disconnected from the emotional metaphor — "the tree is me."

This redesign makes the tree feel alive, organic, and personal: something you'd adopt and nurture. It also adds features (streak, seasons, search, reminders, export) and a more immersive full-screen layout.

---

## Visual Direction: 有机发光 (Organic Glow)

- Background: `#0A0C10` deep dark
- Each living tree has a soft green radial glow (`rgba(74,124,89,0.2)`) around its canopy
- Typography and UI: unchanged token system, same font stack
- Living trees "breathe" via a subtle scale pulse animation (1.0 → 1.02, 3s ease-in-out loop)

---

## Tree Shape: Organic Leaf Clusters + Root System

Replace the abstract ring cross-section with a side-view organic tree.

### Structure
- **Trunk**: `TubeGeometry` following a slightly curved spline, bark-brown texture
- **Roots**: 3–4 `TubeGeometry` curves branching from base, fade into ground
- **Canopy**: `InstancedMesh` of ellipsoid leaf blobs, distributed via 3D Gaussian noise around the crown center. Blob count scales with entry count.
- **Crown shape**: roughly egg-shaped, slightly wider in the middle third

### Growth mapping
| Entry count | Visual state |
|-------------|--------------|
| 0 | Bare trunk + 2 tiny buds |
| 1–7 | Seedling: sparse small blobs, top-heavy |
| 8–30 | Young tree: fuller crown, visible branching |
| 31–100 | Mature: dense layered blobs, visible light/shadow |
| 100+ | Ancient: very wide crown, extra root complexity |

### Tree states
| State | Trigger | Appearance |
|-------|---------|------------|
| Living | Entry within 14 days | Full green, breathing glow, leaf shimmer |
| Dormant | No entry for 14+ days | Leaves darken and thin out, no glow |
| Archived | Past year | Bare trunk silhouette, faint outline only |

### Seasonal appearance (current year tree only, based on real date)
| Season | Months | Effect |
|--------|--------|--------|
| Spring | Mar–May | Pale green + small pink flower particles at tips |
| Summer | Jun–Aug | Deep rich green, fullest density |
| Autumn | Sep–Nov | Leaves shift to gold/orange, some falling leaf particles |
| Winter | Dec–Feb | Bare branches, occasional snow particle drift |

---

## Layout: Full-Screen Tree + Bottom Dock

### Desktop
```
┌─────────────────────────────────────────┐
│  [streak chip top-right]  [today chip]  │
│                                         │
│          Three.js canvas                │
│        (current year tree)              │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │ 🌳2024  🌲2025  ➕  🔍  ⚙️      │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Bottom dock items (left → right)
1. Past year mini-trees (click → slide up year detail panel)
2. Current year tree thumbnail (active indicator)
3. **+ button** (center, primary CTA — opens entry modal)
4. Search icon → full-screen search panel
5. Settings icon → settings panel (reminders, export, language)

### Mobile
Same layout; dock is fixed to bottom with safe-area padding. Sidebar is removed entirely.

---

## New Features

### 1. Streak Counter
- Count consecutive calendar days with at least one entry
- Display: floating chip top-right of canvas, gold color (`#C4A77D`)
- Format: `🔥 7天` / `🔥 7 days`
- Resets to 0 if yesterday has no entry

### 2. Seasonal Tree Appearance
- Computed from `new Date().getMonth()` at render time
- Affects: leaf color uniforms in shader/material, particle emitter config
- No user setting — always follows real-world season

### 3. Search
- Trigger: search icon in dock
- UI: full-screen overlay, text input at top, results list below
- Search scope: all entries across all years, case-insensitive substring match
- Result item shows: date, year, entry excerpt with match highlighted
- Click result → close search, open year panel scrolled to that entry

### 4. Daily Reminder Notification
- Location: Settings panel → "Daily reminder" toggle + time picker
- Implementation: Web Notifications API + `setTimeout`/`setInterval` calculated from current time to next trigger
- Persisted in `localStorage` (`daily_tree_reminder: { enabled, time }`)
- Fallback: if notifications denied, show in-app toast suggestion

### 5. Export / Import
- Export: download `daily-tree-backup-YYYY-MM-DD.json` containing full `localStorage` data
- Import: file picker, validates JSON structure before overwriting
- Location: Settings panel

---

## Files to Change

| File | Change |
|------|--------|
| `app/webgl/tree.js` | Full rewrite — organic tree geometry |
| `app/webgl/scene.js` | Update camera, lighting, layout for full-screen single-tree focus |
| `app/index.html` | New layout: remove sidebar, add bottom dock HTML |
| `app/style.css` | New dock styles, search overlay, settings panel, seasonal animations |
| `app/app.js` | Add streak logic, search, reminder, export/import; update layout bindings |

---

## Verification

1. Open `app/index.html` in browser (local file or `npx serve`)
2. Tree renders as organic leaf-cluster form (not rings)
3. Add entry → tree visually grows (new blob appears)
4. Streak chip shows correct count
5. Season matches current real-world month
6. Search finds entries across years
7. Export downloads valid JSON; import restores data
8. Reminder notification fires at set time (test with 1-minute offset)
9. Mobile layout: dock visible, no sidebar, tree fills screen
