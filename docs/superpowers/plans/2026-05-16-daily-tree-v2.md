# Daily Tree V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Daily Tree with an organic side-view tree, full-screen + bottom-dock layout, and five new features: streak counter, seasonal appearance, search, daily reminders, and export/import.

**Architecture:** The Three.js canvas shows only the current year's organic leaf-cluster tree (centered, full-screen). Past year trees appear as CSS/SVG mini-thumbnails in a bottom dock. Features (streak, seasons, search, reminders, export) are wired into `app.js`; the tree geometry lives entirely in `tree.js`.

**Tech Stack:** Three.js (already bundled as `webgl/three.js`), Vanilla JS (ES modules), CSS custom properties, Web Notifications API, localStorage.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `app/index.html` | Rewrite | New layout: full-screen canvas + bottom dock + overlays |
| `app/style.css` | Rewrite | New design system: dock, chips, search/settings panels |
| `app/webgl/tree.js` | Rewrite | Organic leaf-cluster tree with seasons + seeded random |
| `app/webgl/scene.js` | Rewrite | Single-tree frontal scene, raycaster removed (no click needed) |
| `app/app.js` | Rewrite | New event bindings, streak, search, reminders, export/import |

---

## Task 1: New HTML Layout

**Files:**
- Rewrite: `app/index.html`

- [ ] **Step 1: Replace index.html**

Replace the entire file with the new full-screen + dock layout:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>Daily Tree — Watch your life grow</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
  <script src="webgl/three.js"></script>
  <script>if (typeof THREE !== 'undefined') window.THREE = THREE;</script>
</head>
<body>

<!-- ── Floating chips ── -->
<div class="chip-streak" id="chip-streak" style="display:none">
  <span class="chip-streak-icon">🔥</span>
  <span class="chip-streak-num" id="streak-num">0</span>
  <span class="chip-streak-label" id="streak-label">days</span>
</div>

<div class="chip-today" id="chip-today">
  <div class="chip-today-dot" id="chip-today-dot"></div>
  <span class="chip-today-msg" id="chip-today-msg" data-i18n="todayNotRecorded">Today's tree hasn't grown yet.</span>
</div>

<!-- ── Main Canvas ── -->
<main class="main-canvas">
  <canvas id="forest-canvas"></canvas>

  <!-- Empty state -->
  <div class="forest-hint" id="forest-hint">
    <div class="forest-hint-rings">
      <div class="hint-ring r1"></div>
      <div class="hint-ring r2"></div>
      <div class="hint-ring r3"></div>
      <div class="hint-core"></div>
    </div>
    <p class="forest-hint-title" data-i18n="emptyForestTitle">Start your forest</p>
    <p class="forest-hint-desc" data-i18n="emptyForestDesc">Tap + to write your first entry.</p>
  </div>
</main>

<!-- ── Bottom Dock ── -->
<nav class="dock" id="dock">
  <div class="dock-past-years" id="dock-past-years"></div>

  <button class="dock-fab" id="fab-new" aria-label="New entry">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  </button>

  <div class="dock-actions">
    <button class="dock-icon-btn" id="btn-search" aria-label="Search">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/>
      </svg>
    </button>
    <button class="dock-icon-btn" id="btn-settings" aria-label="Settings">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    </button>
    <button class="dock-icon-btn lang-toggle" id="lang-toggle" title="Switch language">
      <span style="font-size:10px;font-family:var(--font-mono);letter-spacing:.05em">EN/中</span>
    </button>
  </div>
</nav>

<!-- ── Entry Modal ── -->
<div class="modal-overlay" id="modal-overlay">
  <div class="modal-card">
    <div class="modal-header">
      <div class="modal-header-left">
        <span class="modal-year-badge" id="modal-year">2026</span>
        <span class="modal-label" id="modal-label" data-i18n="whatMattersToday">What matters most today?</span>
      </div>
      <button class="modal-close" id="modal-close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <textarea class="modal-textarea" id="entry-text"
      data-i18n-placeholder="placeholder"
      placeholder="One moment. One thought. One thing worth remembering..."
      maxlength="500"></textarea>
    <div class="modal-footer">
      <span class="char-count"><span id="char-count">0</span><span class="char-max"> / 500</span></span>
      <button class="modal-submit" id="entry-submit">
        <span data-i18n="saveEntry">Save</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
      </button>
    </div>
  </div>
</div>

<!-- ── Year Detail Panel ── -->
<div class="year-panel" id="year-panel">
  <div class="panel-handle"></div>
  <div class="panel-header">
    <div class="panel-header-left">
      <span class="panel-title" id="panel-title">2026</span>
      <span class="panel-today-status" id="panel-today-badge"></span>
    </div>
    <div class="panel-header-right">
      <button class="panel-add-btn" id="panel-add-btn">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        <span data-i18n="addEntry">Record today</span>
      </button>
      <button class="panel-close" id="panel-close">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  </div>
  <ul class="panel-entries" id="panel-entries"></ul>
</div>

<!-- ── Search Overlay ── -->
<div class="search-overlay" id="search-overlay">
  <div class="search-inner">
    <div class="search-bar">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/>
      </svg>
      <input class="search-input" id="search-input" type="text" data-i18n-placeholder="searchPlaceholder" placeholder="Search your entries...">
      <button class="search-close" id="search-close">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <ul class="search-results" id="search-results"></ul>
  </div>
</div>

<!-- ── Settings Panel ── -->
<div class="settings-overlay" id="settings-overlay">
  <div class="settings-card">
    <div class="settings-header">
      <h2 class="settings-title" data-i18n="settingsTitle">Settings</h2>
      <button class="settings-close" id="settings-close">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <div class="settings-section">
      <div class="settings-row">
        <div class="settings-row-left">
          <span class="settings-row-label" data-i18n="reminderLabel">Daily reminder</span>
          <span class="settings-row-sub" data-i18n="reminderSub">Get notified to write your entry</span>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="reminder-toggle">
          <span class="toggle-track"></span>
        </label>
      </div>
      <div class="settings-row reminder-time-row" id="reminder-time-row" style="display:none">
        <span class="settings-row-label" data-i18n="reminderTimeLabel">Reminder time</span>
        <input type="time" class="time-input" id="reminder-time" value="21:00">
      </div>
    </div>

    <div class="settings-section">
      <button class="settings-action-btn" id="btn-export" data-i18n="exportLabel">Export backup</button>
      <label class="settings-action-btn" id="btn-import-label" data-i18n="importLabel">
        Import backup
        <input type="file" id="import-file" accept=".json" style="display:none">
      </label>
    </div>
  </div>
</div>

<!-- ── Guide Overlay ── -->
<div class="guide-overlay" id="guide-overlay">
  <div class="guide-card">
    <div class="guide-steps" id="guide-steps">
      <div class="guide-dot active" data-step="0"></div>
      <div class="guide-dot" data-step="1"></div>
      <div class="guide-dot" data-step="2"></div>
    </div>

    <div class="guide-step-content" id="guide-step-0">
      <div class="guide-visual rings-visual">
        <div class="gv-ring r1"></div><div class="gv-ring r2"></div>
        <div class="gv-ring r3"></div><div class="gv-core"></div>
      </div>
      <h2 class="guide-title" data-i18n="guideStep1Title">One moment a day</h2>
      <p class="guide-desc" data-i18n="guideStep1Desc">Tap + to record the single most important thing that happened today.</p>
    </div>
    <div class="guide-step-content hidden" id="guide-step-1">
      <div class="guide-visual tree-grow-visual">
        <svg class="gv-tree" viewBox="0 0 80 100" fill="none">
          <rect x="37" y="58" width="6" height="32" rx="2" fill="#8B7355"/>
          <ellipse cx="40" cy="35" rx="22" ry="26" fill="rgba(74,124,89,0.3)" stroke="#4A7C59" stroke-width="1"/>
          <ellipse cx="40" cy="25" rx="14" ry="17" fill="rgba(107,155,122,0.35)" stroke="#6B9B7A" stroke-width="0.8"/>
        </svg>
      </div>
      <h2 class="guide-title" data-i18n="guideStep2Title">Your tree grows</h2>
      <p class="guide-desc" data-i18n="guideStep2Desc">Each entry adds new leaves. Your tree changes with the seasons.</p>
    </div>
    <div class="guide-step-content hidden" id="guide-step-2">
      <div class="guide-visual click-visual">
        <svg class="gv-tap" viewBox="0 0 80 80" fill="none">
          <circle cx="40" cy="40" r="28" fill="none" stroke="#4A7C59" stroke-width="1" opacity="0.3"/>
          <circle cx="40" cy="40" r="18" fill="none" stroke="#4A7C59" stroke-width="1.5" opacity="0.5"/>
          <circle cx="40" cy="40" r="10" fill="#4A7C59" opacity="0.7"/>
        </svg>
        <p class="gv-tap-hint" data-i18n="guideClickHint">Tap a past year in the dock to read it</p>
      </div>
      <h2 class="guide-title" data-i18n="guideStep4Title">Tap to revisit</h2>
      <p class="guide-desc" data-i18n="guideStep4Desc">Tap any year in the bottom bar to read that year's entries.</p>
    </div>

    <div class="guide-actions">
      <button class="guide-skip" id="guide-skip" data-i18n="skipGuide">Skip</button>
      <button class="guide-next" id="guide-next">
        <span id="guide-next-label">Next</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
  </div>
</div>

<script type="module" src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Verify structure**

Open `app/index.html` in a browser. Page should load without JS errors. Canvas area should be visible; dock area at bottom (will be unstyled until Task 2).

---

## Task 2: New CSS — Layout, Dock, Overlays

**Files:**
- Rewrite: `app/style.css`

- [ ] **Step 1: Write new style.css**

```css
/* Daily Tree V2 — Styles */

@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

/* ── Tokens ─────────────────────────────────────────────────────────────── */
:root {
  --void:          #0A0C10;
  --surface:       #13161A;
  --surface-raise: #1A1E24;
  --border:        rgba(255,255,255,0.07);
  --border-strong: rgba(255,255,255,0.12);
  --green:         #4A7C59;
  --green-light:   #6B9B7A;
  --green-glow:    rgba(74,124,89,0.25);
  --gold:          #C4A77D;
  --bark:          #8B7355;
  --mist:          #E8E8EC;
  --mist-dim:      rgba(232,232,236,0.5);
  --mist-faint:    rgba(232,232,236,0.25);

  --font-sans: 'Outfit', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --r-sm:   6px;
  --r-md:   12px;
  --r-lg:   20px;
  --r-pill: 9999px;

  --dock-h: 72px;
  --safe-bottom: env(safe-area-inset-bottom, 0px);
}

/* ── Reset ───────────────────────────────────────────────────────────────── */
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
html, body { height: 100%; }
body {
  font-family: var(--font-sans);
  background: var(--void);
  color: var(--mist);
  -webkit-font-smoothing: antialiased;
  overflow: hidden;
}

/* ── Main Canvas ─────────────────────────────────────────────────────────── */
.main-canvas {
  position: fixed;
  inset: 0;
  bottom: calc(var(--dock-h) + var(--safe-bottom));
}
.main-canvas canvas {
  width: 100% !important;
  height: 100% !important;
  display: block;
}

/* ── Floating Chips ──────────────────────────────────────────────────────── */
.chip-streak {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 5px;
  background: rgba(196,167,125,0.12);
  border: 1px solid rgba(196,167,125,0.3);
  border-radius: var(--r-pill);
  padding: 5px 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--gold);
  backdrop-filter: blur(8px);
}
.chip-streak-icon { font-size: 14px; }
.chip-streak-label { font-size: 11px; font-weight: 400; opacity: 0.7; }

.chip-today {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(10,12,16,0.7);
  border: 1px solid var(--border);
  border-radius: var(--r-pill);
  padding: 6px 14px;
  font-size: 12px;
  color: var(--mist-dim);
  backdrop-filter: blur(8px);
}
.chip-today-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--mist-faint);
  transition: background 0.4s;
}
.chip-today-dot.recorded { background: var(--green-light); box-shadow: 0 0 6px var(--green); }

/* ── Bottom Dock ─────────────────────────────────────────────────────────── */
.dock {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  z-index: 200;
  height: calc(var(--dock-h) + var(--safe-bottom));
  padding-bottom: var(--safe-bottom);
  background: rgba(10,12,16,0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  padding: 0 16px;
  padding-bottom: var(--safe-bottom);
}

.dock-past-years {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 8px 0;
}
.dock-past-years::-webkit-scrollbar { display: none; }

.dock-year-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--r-md);
  transition: background 0.15s;
  flex-shrink: 0;
}
.dock-year-item:hover { background: rgba(255,255,255,0.05); }
.dock-year-item.active { background: rgba(74,124,89,0.1); }
.dock-year-item svg { display: block; }
.dock-year-label {
  font-size: 9px;
  color: var(--mist-faint);
  font-family: var(--font-mono);
  letter-spacing: 0.05em;
}
.dock-year-item.active .dock-year-label { color: var(--green-light); }

.dock-fab {
  width: 52px; height: 52px;
  border-radius: 50%;
  background: var(--green);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 4px 20px rgba(74,124,89,0.5);
  transition: transform 0.15s, box-shadow 0.15s;
  flex-shrink: 0;
  margin: 0 12px;
}
.dock-fab:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(74,124,89,0.65); }
.dock-fab:active { transform: scale(0.96); }
.dock-fab svg { width: 22px; height: 22px; }

.dock-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.dock-icon-btn {
  width: 36px; height: 36px;
  border-radius: var(--r-md);
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--mist-dim);
  transition: background 0.15s, color 0.15s;
}
.dock-icon-btn:hover { background: rgba(255,255,255,0.07); color: var(--mist); }
.dock-icon-btn svg { width: 17px; height: 17px; }

/* ── Empty Forest Hint ───────────────────────────────────────────────────── */
.forest-hint {
  position: absolute;
  inset: 0;
  display: none;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  pointer-events: none;
}
.forest-hint-rings { position: relative; width: 80px; height: 80px; }
.hint-ring, .hint-core {
  position: absolute; border-radius: 50%;
  top: 50%; left: 50%; transform: translate(-50%, -50%);
}
.hint-ring.r1 { width: 80px; height: 80px; border: 1px solid rgba(74,124,89,0.15); }
.hint-ring.r2 { width: 54px; height: 54px; border: 1px solid rgba(74,124,89,0.25); }
.hint-ring.r3 { width: 30px; height: 30px; border: 1px solid rgba(74,124,89,0.35); }
.hint-core { width: 10px; height: 10px; background: rgba(74,124,89,0.4); }
.forest-hint-title { font-size: 17px; font-weight: 600; color: var(--mist-dim); }
.forest-hint-desc  { font-size: 13px; color: var(--mist-faint); }

/* ── Entry Modal ─────────────────────────────────────────────────────────── */
.modal-overlay {
  position: fixed; inset: 0; z-index: 500;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  display: flex; align-items: flex-end; justify-content: center;
  opacity: 0; pointer-events: none;
  transition: opacity 0.2s;
}
.modal-overlay.active { opacity: 1; pointer-events: all; }

.modal-card {
  width: 100%; max-width: 560px;
  background: var(--surface-raise);
  border: 1px solid var(--border-strong);
  border-radius: var(--r-lg) var(--r-lg) 0 0;
  padding: 20px 20px calc(20px + var(--safe-bottom));
  transform: translateY(20px);
  transition: transform 0.25s cubic-bezier(.16,1,.3,1);
}
.modal-overlay.active .modal-card { transform: translateY(0); }

.modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.modal-header-left { display: flex; align-items: center; gap: 10px; }
.modal-year-badge {
  font-size: 11px; font-family: var(--font-mono);
  background: rgba(74,124,89,0.2); color: var(--green-light);
  border: 1px solid rgba(74,124,89,0.35);
  border-radius: var(--r-pill); padding: 3px 9px;
}
.modal-label { font-size: 14px; font-weight: 500; color: var(--mist-dim); }
.modal-close {
  width: 28px; height: 28px; border-radius: var(--r-sm);
  background: transparent; border: none; cursor: pointer;
  color: var(--mist-faint); display: flex; align-items: center; justify-content: center;
}
.modal-close:hover { color: var(--mist); background: rgba(255,255,255,0.07); }
.modal-close svg { width: 16px; height: 16px; }

.modal-textarea {
  width: 100%; min-height: 120px; max-height: 260px;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  color: var(--mist); font-family: var(--font-sans); font-size: 15px; line-height: 1.6;
  padding: 12px 14px; resize: none; outline: none;
  transition: border-color 0.15s;
}
.modal-textarea:focus { border-color: rgba(74,124,89,0.5); }
.modal-textarea::placeholder { color: var(--mist-faint); }

.modal-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; }
.char-count { font-size: 12px; font-family: var(--font-mono); color: var(--mist-faint); }
.char-max { opacity: 0.6; }

.modal-submit {
  display: flex; align-items: center; gap: 7px;
  background: var(--green); color: #fff;
  border: none; border-radius: var(--r-pill);
  padding: 9px 20px; font-size: 13px; font-weight: 600;
  cursor: pointer; transition: background 0.15s, transform 0.1s;
}
.modal-submit:hover { background: var(--green-light); }
.modal-submit:active { transform: scale(0.97); }

/* ── Year Detail Panel ───────────────────────────────────────────────────── */
.year-panel {
  position: fixed; left: 0; right: 0;
  bottom: calc(var(--dock-h) + var(--safe-bottom));
  z-index: 300;
  background: var(--surface);
  border-top: 1px solid var(--border);
  border-radius: var(--r-lg) var(--r-lg) 0 0;
  max-height: 65vh; overflow-y: auto;
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(.16,1,.3,1);
}
.year-panel.open { transform: translateY(0); }

.panel-handle {
  width: 36px; height: 4px; border-radius: 2px;
  background: rgba(255,255,255,0.12);
  margin: 10px auto 0;
}
.panel-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 18px;
  border-bottom: 1px solid var(--border);
  position: sticky; top: 0; background: var(--surface); z-index: 1;
}
.panel-header-left { display: flex; align-items: center; gap: 10px; }
.panel-title { font-size: 17px; font-weight: 700; }
.panel-today-status {
  font-size: 11px; border-radius: var(--r-pill); padding: 3px 9px;
  background: rgba(255,255,255,0.06); color: var(--mist-faint);
}
.panel-today-status.recorded {
  background: rgba(74,124,89,0.15); color: var(--green-light);
}
.panel-header-right { display: flex; align-items: center; gap: 6px; }

.panel-add-btn {
  display: inline-flex; align-items: center; gap: 5px;
  background: rgba(74,124,89,0.15); border: 1px solid rgba(74,124,89,0.3);
  border-radius: var(--r-pill); padding: 5px 12px;
  font-size: 12px; color: var(--green-light); cursor: pointer;
}
.panel-add-btn:hover { background: rgba(74,124,89,0.25); }
.panel-close {
  width: 28px; height: 28px; border-radius: var(--r-sm);
  background: transparent; border: none; cursor: pointer;
  color: var(--mist-faint); display: flex; align-items: center; justify-content: center;
}
.panel-close:hover { color: var(--mist); background: rgba(255,255,255,0.07); }
.panel-close svg { width: 14px; height: 14px; }

.panel-entries { list-style: none; padding: 10px 18px 24px; }

.entry-item { padding: 14px 0; border-bottom: 1px solid var(--border); }
.entry-item:last-child { border-bottom: none; }
.entry-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.entry-left { display: flex; align-items: center; gap: 8px; }
.entry-date { font-size: 11px; font-family: var(--font-mono); color: var(--mist-faint); }
.entry-today-badge {
  font-size: 10px; border-radius: var(--r-pill); padding: 2px 8px;
  background: rgba(74,124,89,0.15); color: var(--green-light);
}
.entry-edit-btn {
  font-size: 11px; color: var(--mist-faint);
  background: transparent; border: 1px solid var(--border); border-radius: var(--r-pill);
  padding: 2px 9px; cursor: pointer;
}
.entry-edit-btn:hover { color: var(--mist); border-color: var(--border-strong); }
.entry-text { font-size: 14px; line-height: 1.65; color: rgba(232,232,236,0.85); }
.empty-note { font-size: 13px; color: var(--mist-faint); padding: 20px 0; text-align: center; }

/* ── Search Overlay ─────────────────────────────────────────────────────── */
.search-overlay {
  position: fixed; inset: 0; z-index: 600;
  background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);
  opacity: 0; pointer-events: none; transition: opacity 0.2s;
  display: flex; flex-direction: column; align-items: center;
  padding-top: 80px;
}
.search-overlay.active { opacity: 1; pointer-events: all; }
.search-inner { width: 100%; max-width: 560px; padding: 0 16px; }
.search-bar {
  display: flex; align-items: center; gap: 10px;
  background: var(--surface-raise);
  border: 1px solid var(--border-strong);
  border-radius: var(--r-pill);
  padding: 10px 16px; margin-bottom: 12px;
  color: var(--mist-faint);
}
.search-bar svg { flex-shrink: 0; }
.search-input {
  flex: 1; background: transparent; border: none; outline: none;
  font-family: var(--font-sans); font-size: 15px; color: var(--mist);
}
.search-input::placeholder { color: var(--mist-faint); }
.search-close {
  background: transparent; border: none; cursor: pointer;
  color: var(--mist-faint); display: flex; align-items: center; justify-content: center;
}
.search-close:hover { color: var(--mist); }
.search-results { list-style: none; max-height: 60vh; overflow-y: auto; }
.search-result-item {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: 12px 16px; margin-bottom: 8px; cursor: pointer;
}
.search-result-item:hover { border-color: var(--border-strong); background: var(--surface-raise); }
.search-result-meta { font-size: 10px; font-family: var(--font-mono); color: var(--mist-faint); margin-bottom: 4px; }
.search-result-text { font-size: 13px; line-height: 1.5; color: rgba(232,232,236,0.8); }
.search-result-text mark { background: rgba(196,167,125,0.25); color: var(--gold); border-radius: 2px; }
.search-no-results { text-align: center; color: var(--mist-faint); font-size: 13px; padding: 24px 0; }

/* ── Settings Panel ─────────────────────────────────────────────────────── */
.settings-overlay {
  position: fixed; inset: 0; z-index: 600;
  background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);
  opacity: 0; pointer-events: none; transition: opacity 0.2s;
  display: flex; align-items: flex-end; justify-content: center;
}
.settings-overlay.active { opacity: 1; pointer-events: all; }
.settings-card {
  width: 100%; max-width: 480px;
  background: var(--surface-raise);
  border: 1px solid var(--border-strong);
  border-radius: var(--r-lg) var(--r-lg) 0 0;
  padding: 24px 20px calc(24px + var(--safe-bottom));
  transform: translateY(20px);
  transition: transform 0.25s cubic-bezier(.16,1,.3,1);
}
.settings-overlay.active .settings-card { transform: translateY(0); }
.settings-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.settings-title { font-size: 16px; font-weight: 700; }
.settings-close {
  width: 28px; height: 28px; border-radius: var(--r-sm);
  background: transparent; border: none; cursor: pointer;
  color: var(--mist-faint); display: flex; align-items: center; justify-content: center;
}
.settings-close:hover { color: var(--mist); background: rgba(255,255,255,0.07); }
.settings-close svg { width: 14px; height: 14px; }
.settings-section { margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--border); }
.settings-section:last-child { border-bottom: none; }
.settings-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; gap: 12px; }
.settings-row-left { display: flex; flex-direction: column; gap: 2px; }
.settings-row-label { font-size: 14px; font-weight: 500; }
.settings-row-sub { font-size: 12px; color: var(--mist-faint); }

.toggle-switch { position: relative; width: 40px; height: 22px; flex-shrink: 0; }
.toggle-switch input { display: none; }
.toggle-track {
  position: absolute; inset: 0; border-radius: var(--r-pill);
  background: rgba(255,255,255,0.1); cursor: pointer;
  transition: background 0.2s;
}
.toggle-track::after {
  content: ''; position: absolute;
  width: 16px; height: 16px; border-radius: 50%;
  background: #fff; top: 3px; left: 3px;
  transition: transform 0.2s;
}
.toggle-switch input:checked + .toggle-track { background: var(--green); }
.toggle-switch input:checked + .toggle-track::after { transform: translateX(18px); }

.time-input {
  background: rgba(255,255,255,0.06); border: 1px solid var(--border);
  border-radius: var(--r-sm); color: var(--mist); font-family: var(--font-mono);
  font-size: 13px; padding: 5px 10px; outline: none;
}
.time-input:focus { border-color: rgba(74,124,89,0.5); }

.settings-action-btn {
  display: flex; align-items: center; justify-content: center;
  width: 100%; padding: 11px; margin-bottom: 8px;
  background: rgba(255,255,255,0.05); border: 1px solid var(--border);
  border-radius: var(--r-md); cursor: pointer;
  font-family: var(--font-sans); font-size: 14px; color: var(--mist-dim);
  transition: background 0.15s;
}
.settings-action-btn:hover { background: rgba(255,255,255,0.09); }
.settings-action-btn:last-child { margin-bottom: 0; }

/* ── Guide ───────────────────────────────────────────────────────────────── */
.guide-overlay {
  position: fixed; inset: 0; z-index: 700;
  background: rgba(0,0,0,0.75); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; pointer-events: none; transition: opacity 0.3s;
}
.guide-overlay.active { opacity: 1; pointer-events: all; }
.guide-card {
  background: var(--surface-raise);
  border: 1px solid var(--border-strong);
  border-radius: var(--r-lg);
  padding: 32px 28px;
  max-width: 360px; width: 90%;
  text-align: center;
}
.guide-steps { display: flex; gap: 8px; justify-content: center; margin-bottom: 24px; }
.guide-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--border-strong); transition: background 0.2s; }
.guide-dot.active { background: var(--green-light); }
.guide-step-content { min-height: 180px; }
.guide-step-content.hidden { display: none; }
.guide-visual { display: flex; align-items: center; justify-content: center; margin-bottom: 20px; height: 100px; }
.guide-title { font-size: 20px; font-weight: 700; margin-bottom: 10px; }
.guide-desc { font-size: 14px; color: var(--mist-dim); line-height: 1.6; }
.guide-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 24px; }
.guide-skip { background: transparent; border: none; cursor: pointer; font-family: var(--font-sans); font-size: 13px; color: var(--mist-faint); }
.guide-skip:hover { color: var(--mist-dim); }
.guide-next {
  display: flex; align-items: center; gap: 6px;
  background: var(--green); color: #fff;
  border: none; border-radius: var(--r-pill);
  padding: 9px 20px; font-size: 13px; font-weight: 600;
  cursor: pointer; transition: background 0.15s;
}
.guide-next:hover { background: var(--green-light); }

/* Visual elements for guide steps */
.rings-visual { position: relative; }
.gv-ring, .gv-core {
  position: absolute; border-radius: 50%;
  top: 50%; left: 50%; transform: translate(-50%, -50%);
}
.gv-ring.r1 { width: 80px; height: 80px; border: 1px solid rgba(74,124,89,0.2); }
.gv-ring.r2 { width: 54px; height: 54px; border: 1px solid rgba(74,124,89,0.35); }
.gv-ring.r3 { width: 30px; height: 30px; border: 1px solid rgba(74,124,89,0.5); }
.gv-core { width: 10px; height: 10px; background: var(--green); opacity: 0.8; }
.gv-tree { display: block; }
.gv-tap { display: block; }
.gv-tap-hint { font-size: 12px; color: var(--mist-faint); margin-top: 8px; }

/* ── Toast ───────────────────────────────────────────────────────────────── */
.app-toast {
  position: fixed; bottom: calc(var(--dock-h) + var(--safe-bottom) + 12px);
  left: 50%; transform: translateX(-50%) translateY(8px);
  background: var(--surface-raise); border: 1px solid var(--border-strong);
  border-radius: var(--r-pill); padding: 9px 18px;
  font-size: 13px; color: var(--mist);
  opacity: 0; pointer-events: none;
  transition: opacity 0.2s, transform 0.2s;
  white-space: nowrap; z-index: 800;
}
.app-toast.visible { opacity: 1; transform: translateX(-50%) translateY(0); }
.app-toast.success { border-color: rgba(74,124,89,0.4); color: var(--green-light); }

/* ── Particles & Save Floater ────────────────────────────────────────────── */
.particle {
  position: absolute; width: 6px; height: 6px; border-radius: 50%;
  pointer-events: none;
  animation: particle-fly 0.9s ease-out forwards;
}
@keyframes particle-fly {
  to { transform: translate(var(--tx), var(--ty)); opacity: 0; }
}
.save-floater {
  position: absolute;
  font-size: 18px; font-weight: 700; color: var(--green-light);
  pointer-events: none;
  animation: float-up 2s ease-out forwards;
  transform: translateX(-50%);
}
@keyframes float-up {
  to { transform: translateX(-50%) translateY(-60px); opacity: 0; }
}
```

- [ ] **Step 2: Verify layout**

Reload `index.html`. Expect:
- Black full-screen canvas area
- Bottom dock visible with centered + button
- Floating chips top-left and top-right (empty/hidden until JS runs)
- No sidebar

---

## Task 3: Rewrite tree.js — Organic Leaf-Cluster Tree

**Files:**
- Rewrite: `app/webgl/tree.js`

- [ ] **Step 1: Write new tree.js**

```javascript
// Daily Tree V2 — Organic leaf-cluster tree
// THREE must be available globally before this module loads.

// Seeded pseudo-random (LCG) — deterministic per year+index
function seededRng(seed) {
  let s = Math.abs(seed) || 1;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function getSeason() {
  const m = new Date().getMonth(); // 0-11
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}

export class Tree {
  constructor(year, entryCount, options) {
    this.year       = year;
    this.entryCount = entryCount || 0;
    this.THREE      = options.THREE || window.THREE;
    this.lastEntryDate = options.lastEntryDate || null;
    this.isCurrentYear = (year === new Date().getFullYear());

    this.group  = new this.THREE.Group();
    this.blobs  = [];     // leaf blob meshes
    this.glowMesh = null; // point light proxy sphere

    this._build();
  }

  // ── State ────────────────────────────────────────────────────────────────

  getState() {
    if (this.entryCount === 0) return 'empty';
    const daysSince = (Date.now() - new Date(this.lastEntryDate)) / 86400000;
    if (daysSince <= 14) return 'living';
    if (daysSince <= 30) return 'dormant';
    return 'archived';
  }

  // ── Colors ───────────────────────────────────────────────────────────────

  _leafColor(state) {
    const season = this.isCurrentYear ? getSeason() : 'summer';
    if (state === 'archived') return new this.THREE.Color(0x3D3020);
    if (state === 'dormant')  return new this.THREE.Color(0x2E3D30);
    // living — varies by season
    if (season === 'spring')  return new this.THREE.Color(0x7DB88A);
    if (season === 'summer')  return new this.THREE.Color(0x4A7C59);
    if (season === 'autumn')  return new this.THREE.Color(0xB8863C);
    if (season === 'winter')  return new this.THREE.Color(0x2A3530);
    return new this.THREE.Color(0x4A7C59);
  }

  _trunkColor(state) {
    if (state === 'living')   return new this.THREE.Color(0x8B7355);
    if (state === 'dormant')  return new this.THREE.Color(0x6B6050);
    if (state === 'archived') return new this.THREE.Color(0x4A3A2A);
    return new this.THREE.Color(0x3A2A1A);
  }

  // ── Build ────────────────────────────────────────────────────────────────

  _build() {
    const state = this.getState();
    this._buildTrunk(state);
    this._buildRoots(state);
    if (this.entryCount > 0 && state !== 'empty') {
      this._buildCanopy(state);
    }
    if (state === 'living') {
      this._buildGlow();
    }
  }

  _buildTrunk(state) {
    const h = this._trunkHeight();
    // Slightly tapered cylinder — wider at base
    const geo = new this.THREE.CylinderGeometry(1.2, 2.2, h, 10, 1);
    const mat = new this.THREE.MeshStandardMaterial({
      color: this._trunkColor(state),
      roughness: 0.95,
      metalness: 0.0,
    });
    const trunk = new this.THREE.Mesh(geo, mat);
    trunk.position.y = h / 2;
    trunk.castShadow = true;
    this.group.add(trunk);
    this.trunk = trunk;
    this.group.userData.trunkHeight = h;
  }

  _buildRoots(state) {
    if (this.entryCount < 5) return;
    const rng = seededRng(this.year * 7 + 1);
    const rootMat = new this.THREE.MeshStandardMaterial({
      color: this._trunkColor(state),
      roughness: 0.98,
    });
    const numRoots = 3 + Math.floor(rng() * 2); // 3–4 roots
    for (let i = 0; i < numRoots; i++) {
      const angle = (i / numRoots) * Math.PI * 2 + rng() * 0.4;
      const len   = 5 + rng() * 4;
      const pts   = [
        new this.THREE.Vector3(0, 1, 0),
        new this.THREE.Vector3(Math.cos(angle) * len * 0.5, 0.4, Math.sin(angle) * len * 0.5),
        new this.THREE.Vector3(Math.cos(angle) * len, 0,   Math.sin(angle) * len),
      ];
      const curve  = new this.THREE.CatmullRomCurve3(pts);
      const geo    = new this.THREE.TubeGeometry(curve, 8, 0.5, 5, false);
      const mesh   = new this.THREE.Mesh(geo, rootMat);
      this.group.add(mesh);
    }
  }

  _buildCanopy(state) {
    const h      = this._trunkHeight();
    const count  = this._blobCount();
    const rng    = seededRng(this.year * 13 + this.entryCount);
    const leafColor = this._leafColor(state);
    const opacity   = state === 'dormant' ? 0.4 : (state === 'archived' ? 0.25 : 0.75);

    // Crown center sits at ~75% of trunk height, offset slightly toward viewer
    const crownY = h * 0.75;
    const crownW = 8 + Math.min(this.entryCount, 60) * 0.35; // horizontal spread
    const crownH = 12 + Math.min(this.entryCount, 60) * 0.28; // vertical spread

    for (let i = 0; i < count; i++) {
      // Gaussian-ish distribution: box-muller lite
      const u  = rng(), v = rng();
      const nx = Math.sqrt(-2 * Math.log(u + 0.001)) * Math.cos(2 * Math.PI * v);
      const ny = Math.sqrt(-2 * Math.log(rng() + 0.001)) * Math.cos(2 * Math.PI * rng());
      const nz = (rng() - 0.5) * 0.6; // shallow z — tree reads as 2D from camera

      const bx = nx * crownW * 0.4;
      const by = crownY + Math.abs(ny) * crownH * 0.5 + ny * crownH * 0.2;
      const bz = nz * crownW * 0.25;

      // Blob size varies — larger toward top center, smaller at edges
      const distFromCenter = Math.sqrt(nx * nx + ny * ny);
      const size = (4 + rng() * 5) * (1 - distFromCenter * 0.15);

      const geo = new this.THREE.SphereGeometry(Math.max(size, 2), 7, 6);
      // Squash into ellipsoid
      geo.scale(1 + rng() * 0.4, 0.7 + rng() * 0.5, 0.8 + rng() * 0.3);

      const mat = new this.THREE.MeshStandardMaterial({
        color: leafColor,
        transparent: true,
        opacity: opacity * (0.6 + rng() * 0.4),
        roughness: 0.85,
        metalness: 0.0,
      });
      const blob = new this.THREE.Mesh(geo, mat);
      blob.position.set(bx, by, bz);
      blob.userData.baseOpacity = mat.opacity;
      blob.castShadow = true;
      this.group.add(blob);
      this.blobs.push(blob);
    }
  }

  _buildGlow() {
    // Soft emissive sphere at crown center to simulate glow
    const h = this._trunkHeight();
    const crownY = h * 0.75;
    const geo = new this.THREE.SphereGeometry(this._crownRadius() * 0.6, 8, 8);
    const mat = new this.THREE.MeshBasicMaterial({
      color: 0x4A7C59,
      transparent: true,
      opacity: 0.06,
    });
    this.glowMesh = new this.THREE.Mesh(geo, mat);
    this.glowMesh.position.y = crownY;
    this.group.add(this.glowMesh);
  }

  // ── Geometry helpers ─────────────────────────────────────────────────────

  _trunkHeight() {
    return Math.min(18 + this.entryCount * 0.6, 60);
  }

  _blobCount() {
    if (this.entryCount === 0) return 0;
    // 1–7 entries: 4–12 blobs; 8–30: 12–30; 31+: up to 60
    return Math.min(4 + Math.floor(this.entryCount * 0.9), 60);
  }

  _crownRadius() {
    return 8 + Math.min(this.entryCount, 60) * 0.35;
  }

  // ── Animation ────────────────────────────────────────────────────────────

  update(elapsed) {
    const state = this.getState();
    if (state === 'living') {
      // Gentle breathing: scale crown blobs slightly
      const breathe = Math.sin(elapsed * 0.7 + this.year * 0.5) * 0.015;
      const s = 1 + breathe;
      this.blobs.forEach((b, i) => {
        const phase = Math.sin(elapsed * 0.5 + i * 0.3) * 0.008;
        b.material.opacity = b.userData.baseOpacity + phase;
      });
      if (this.glowMesh) {
        this.glowMesh.material.opacity = 0.06 + Math.sin(elapsed * 0.9) * 0.02;
      }
      // Subtle trunk lean
      if (this.trunk) {
        this.trunk.rotation.z = Math.sin(elapsed * 0.4) * 0.01;
      }
    } else if (state === 'dormant') {
      const slow = Math.sin(elapsed * 0.25) * 0.01;
      this.blobs.forEach(b => {
        b.material.opacity = b.userData.baseOpacity + slow;
      });
    }
  }
}
```

- [ ] **Step 2: Verify tree builds without error**

Open browser console. Add one entry, then reload. The tree should render as an organic blob cluster in the Three.js canvas (this requires scene.js to also be updated — do Task 4 next).

---

## Task 4: Update scene.js — Single-Tree Frontal Scene

**Files:**
- Rewrite: `app/webgl/scene.js`

- [ ] **Step 1: Write new scene.js**

```javascript
// Daily Tree V2 — Single-tree frontal scene
// THREE must be loaded globally before this module.

export class ForestScene {
  constructor(canvas) {
    this.canvas   = canvas;
    this.tree     = null;  // only the current year tree
    this._init();
  }

  _init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0A0C10);

    this.camera = new THREE.PerspectiveCamera(
      45,
      this.canvas.clientWidth / this.canvas.clientHeight,
      0.1,
      2000
    );
    this.camera.position.set(0, 45, 160);
    this.camera.lookAt(0, 45, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.shadowMap.enabled = true;

    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(500, 500);
    const groundMat = new THREE.MeshBasicMaterial({ color: 0x0D0F12 });
    const ground    = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Lighting: soft ambient + warm key light from upper right
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const keyLight = new THREE.DirectionalLight(0xC8E8D0, 0.8);
    keyLight.position.set(60, 120, 80);
    keyLight.castShadow = true;
    this.scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x4A6A8A, 0.3);
    fillLight.position.set(-60, 40, -40);
    this.scene.add(fillLight);

    this.clock = new THREE.Clock();
    window.addEventListener('resize', () => this._onResize());
    this._animate();
  }

  _onResize() {
    if (!this.camera || !this.renderer) return;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  _animate() {
    this._animId = requestAnimationFrame(() => this._animate());
    const elapsed = this.clock.getElapsedTime();
    if (this.tree) this.tree.update(elapsed);
    this.renderer.render(this.scene, this.camera);
  }

  /** Remove existing tree from scene */
  removeAllTrees() {
    if (this.tree) {
      this.scene.remove(this.tree.group);
      this.tree = null;
    }
  }

  /** Add the current year's tree (centered) */
  addTree(TreeClass, year, entryCount, options) {
    const tree = new TreeClass(year, entryCount, {
      THREE,
      lastEntryDate: (options && options.lastEntryDate) || null,
    });
    tree.group.position.set(0, 0, 0);
    this.scene.add(tree.group);
    this.tree = tree;
    return tree;
  }
}
```

- [ ] **Step 2: Verify scene renders**

Reload app. The Three.js canvas should show a dark ground plane with the current year tree centered. If no entries exist, the scene is empty (tree with no blobs). Add an entry → tree updates with blobs.

---

## Task 5: Rewrite app.js — Core Logic with New Layout

**Files:**
- Rewrite: `app/app.js`

- [ ] **Step 1: Write new app.js (core + layout)**

```javascript
// Daily Tree V2 — Core App Logic

(function () {
  'use strict';

  const STORAGE_KEY  = 'daily_tree_entries';
  const GUIDE_KEY    = 'daily_tree_guide_seen';
  const LANG_KEY     = 'daily_tree_lang';
  const REMINDER_KEY = 'daily_tree_reminder';
  const YEARS_TO_SHOW = 5;

  // ── i18n ──────────────────────────────────────────────────────────────────

  const I18N = {
    en: {
      todayNotRecorded: "Today's tree hasn't grown yet",
      todayRecorded:    "Today's tree is growing",
      whatMattersToday: 'What matters most today?',
      placeholder:      'One moment. One thought. One thing worth remembering...',
      saveEntry:        'Save',
      editEntry:        'Edit today',
      addEntry:         'Record today',
      noEntries:        'No entries yet.',
      saved:            'Saved! Your tree just grew.',
      emptyError:       'Write something first.',
      emptyForestTitle: 'Start your forest',
      emptyForestDesc:  'Tap + to write your first entry.',
      days:             'days',
      todayBadgeNone:   'Not yet today',
      todayBadgeDone:   'Recorded today ✓',
      searchPlaceholder:'Search your entries...',
      searchNoResults:  'No entries found.',
      settingsTitle:    'Settings',
      reminderLabel:    'Daily reminder',
      reminderSub:      'Get notified to write your entry',
      reminderTimeLabel:'Reminder time',
      exportLabel:      'Export backup',
      importLabel:      'Import backup',
      importSuccess:    'Backup restored.',
      importError:      'Invalid backup file.',
      guideStep1Title:  'One moment a day',
      guideStep1Desc:   'Tap + to record the single most important thing today.',
      guideStep2Title:  'Your tree grows',
      guideStep2Desc:   'Each entry adds new leaves. Your tree changes with the seasons.',
      guideStep4Title:  'Tap to revisit',
      guideStep4Desc:   'Tap any year in the bottom bar to read that year\'s entries.',
      guideClickHint:   'Tap a past year in the dock to read it',
      skipGuide:        'Skip',
      startNow:         'Start now',
      nextStep:         'Next',
    },
    zh: {
      todayNotRecorded: '今天的小树还没有成长哦',
      todayRecorded:    '今天已记录，小树在成长',
      whatMattersToday: '今天最重要的一件事？',
      placeholder:      '一个瞬间，一个想法，一件值得记住的事……',
      saveEntry:        '保存',
      editEntry:        '修改今天的记录',
      addEntry:         '记录今天',
      noEntries:        '还没有记录。',
      saved:            '已保存！你的树又长大了一点。',
      emptyError:       '先写点什么吧。',
      emptyForestTitle: '开始你的森林',
      emptyForestDesc:  '点击 + 写下第一条记录。',
      days:             '天',
      todayBadgeNone:   '今天还没记录',
      todayBadgeDone:   '今天已记录 ✓',
      searchPlaceholder:'搜索你的记录…',
      searchNoResults:  '没有找到相关记录。',
      settingsTitle:    '设置',
      reminderLabel:    '每日提醒',
      reminderSub:      '提醒你每天写记录',
      reminderTimeLabel:'提醒时间',
      exportLabel:      '导出备份',
      importLabel:      '导入备份',
      importSuccess:    '备份已恢复。',
      importError:      '无效的备份文件。',
      guideStep1Title:  '每天一个瞬间',
      guideStep1Desc:   '点击 + 按钮，记录今天最重要的那件事。',
      guideStep2Title:  '树会成长',
      guideStep2Desc:   '每一条记录都让树长出新叶子。树随季节变化。',
      guideStep4Title:  '点击回顾',
      guideStep4Desc:   '点击底栏中任意年份，查看那一年的所有记录。',
      guideClickHint:   '点击底栏中的年份查看记录',
      skipGuide:        '跳过',
      startNow:         '开始记录',
      nextStep:         '下一步',
    },
  };

  let currentLang = 'en';
  function t(key) { return (I18N[currentLang] || {})[key] || I18N.en[key] || key; }
  function detectLang() {
    const s = localStorage.getItem(LANG_KEY);
    if (s) return s;
    return (navigator.language || 'en').startsWith('zh') ? 'zh' : 'en';
  }
  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    applyLang();
    const btn = document.getElementById('lang-toggle');
    if (btn) btn.querySelector('span').textContent = lang === 'en' ? 'EN/中' : '中/EN';
  }
  function applyLang() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });
    updateTodayChip();
  }

  // ── Data ──────────────────────────────────────────────────────────────────

  function loadEntries() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function saveEntries(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }
  function getTodayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function getTodayEntry() {
    const entries = loadEntries();
    const year    = new Date().getFullYear();
    const today   = getTodayKey();
    return (entries[year] || []).find(e => e.date && e.date.substring(0,10) === today) || null;
  }
  function addEntry(year, text) {
    const entries = loadEntries();
    if (!entries[year]) entries[year] = [];
    entries[year].push({ id: Date.now(), text: text.slice(0, 500), date: new Date().toISOString() });
    saveEntries(entries);
  }
  function updateEntry(id, text) {
    const entries = loadEntries();
    for (const y in entries) {
      const e = entries[y].find(x => x.id === id);
      if (e) { e.text = text.slice(0, 500); saveEntries(entries); return true; }
    }
    return false;
  }
  function getYearEntries(year) { return (loadEntries()[year] || []); }

  // ── Streak ────────────────────────────────────────────────────────────────

  function computeStreak() {
    const entries = loadEntries();
    let streak = 0;
    const d = new Date();
    while (true) {
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const year = d.getFullYear();
      const hasEntry = (entries[year] || []).some(e => e.date && e.date.substring(0,10) === key);
      if (!hasEntry) break;
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  function updateStreakChip() {
    const chip    = document.getElementById('chip-streak');
    const numEl   = document.getElementById('streak-num');
    const labelEl = document.getElementById('streak-label');
    if (!chip) return;
    const streak = computeStreak();
    if (streak > 0) {
      chip.style.display = 'flex';
      numEl.textContent   = streak;
      labelEl.textContent = t('days');
    } else {
      chip.style.display = 'none';
    }
  }

  // ── Today Chip ────────────────────────────────────────────────────────────

  function updateTodayChip() {
    const dot = document.getElementById('chip-today-dot');
    const msg = document.getElementById('chip-today-msg');
    if (!dot || !msg) return;
    const today = getTodayEntry();
    dot.classList.toggle('recorded', !!today);
    msg.textContent = today ? t('todayRecorded') : t('todayNotRecorded');
  }

  // ── Toast ─────────────────────────────────────────────────────────────────

  function showToast(message, type) {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      document.body.appendChild(toast);
    }
    toast.className = 'app-toast visible' + (type ? ' ' + type : '');
    toast.textContent = message;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { toast.className = 'app-toast'; }, 3200);
  }

  // ── Particles ─────────────────────────────────────────────────────────────

  function spawnParticles(x, y) {
    const container = document.querySelector('.main-canvas');
    if (!container) return;
    const colors = ['#4A7C59', '#6B9B7A', '#C4A77D', '#8B7355'];
    for (let i = 0; i < 10; i++) {
      const p     = document.createElement('div');
      p.className = 'particle';
      const angle = (Math.PI * 2 * i) / 10 + Math.random() * 0.4;
      const dist  = 45 + Math.random() * 55;
      p.style.cssText = [
        'left:'+x+'px', 'top:'+y+'px',
        'background:'+colors[i % colors.length],
        '--tx:'+(Math.cos(angle)*dist)+'px',
        '--ty:'+(Math.sin(angle)*dist - 25)+'px',
      ].join(';');
      container.appendChild(p);
      setTimeout(() => p.remove(), 900);
    }
  }

  function showSaveSuccess() {
    const canvas = document.getElementById('forest-canvas');
    if (!canvas) return;
    const cx = canvas.clientWidth / 2;
    const cy = canvas.clientHeight / 2;
    const floater = document.createElement('div');
    floater.className = 'save-floater';
    floater.textContent = '+1';
    floater.style.cssText = `left:${cx}px;top:${cy-40}px`;
    canvas.parentElement.appendChild(floater);
    setTimeout(() => floater.remove(), 2000);
    spawnParticles(cx, cy + 30);
    setTimeout(() => showToast(t('saved'), 'success'), 300);
    updateTodayChip();
    updateStreakChip();
  }

  // ── Forest ────────────────────────────────────────────────────────────────

  let forestScene = null;

  async function initForest() {
    const canvas = document.getElementById('forest-canvas');
    if (!canvas || !window.THREE) { showFallback(); return; }
    try {
      const { ForestScene } = await import('./webgl/scene.js');
      const { Tree }        = await import('./webgl/tree.js');
      forestScene = new ForestScene(canvas);
      window._TreeClass = Tree;
      refreshForest();
    } catch (err) {
      console.error('Forest init failed:', err);
      showFallback();
    }
  }

  function showFallback() {
    const hint = document.getElementById('forest-hint');
    if (hint) {
      hint.style.display = 'flex';
      const title = hint.querySelector('.forest-hint-title');
      const desc  = hint.querySelector('.forest-hint-desc');
      if (title) title.textContent = currentLang === 'zh' ? '3D渲染不可用' : '3D unavailable';
      if (desc)  desc.textContent  = currentLang === 'zh' ? '仍可正常记录。' : 'You can still record entries.';
    }
  }

  function refreshForest() {
    if (!forestScene || !window._TreeClass) return;
    const entries     = loadEntries();
    const currentYear = new Date().getFullYear();
    const yearEntries = entries[currentYear] || [];
    const lastDate    = yearEntries.length > 0
      ? yearEntries[yearEntries.length - 1].date
      : `${currentYear}-01-01T00:00:00`;

    forestScene.removeAllTrees();
    forestScene.addTree(window._TreeClass, currentYear, yearEntries.length, { lastEntryDate: lastDate });

    updateDock(entries, currentYear);
    updateTodayChip();
    updateStreakChip();
    updateEmptyHint();
  }

  function updateEmptyHint() {
    const hint    = document.getElementById('forest-hint');
    if (!hint) return;
    const entries = loadEntries();
    const total   = Object.values(entries).reduce((s, a) => s + a.length, 0);
    hint.style.display = total === 0 ? 'flex' : 'none';
  }

  // ── Dock ──────────────────────────────────────────────────────────────────

  let selectedYear = null;

  function updateDock(entries, currentYear) {
    const container = document.getElementById('dock-past-years');
    if (!container) return;
    container.innerHTML = '';

    // Current year mini in dock
    const years = [];
    for (let i = 0; i < YEARS_TO_SHOW; i++) years.push(currentYear - i);

    years.forEach(year => {
      const count = (entries[year] || []).length;
      const item  = document.createElement('div');
      item.className = 'dock-year-item' + (selectedYear === year ? ' active' : '');
      item.innerHTML = `
        ${miniTreeSvg(year, count, entries[year] || [])}
        <span class="dock-year-label">${year}</span>
      `;
      item.addEventListener('click', () => {
        selectedYear = year;
        updateDock(loadEntries(), currentYear);
        showYearPanel(year);
      });
      container.appendChild(item);
    });
  }

  function miniTreeSvg(year, count, yearEntries) {
    const isCurrentYear = year === new Date().getFullYear();
    const daysSince = yearEntries.length > 0
      ? (Date.now() - new Date(yearEntries[yearEntries.length-1].date)) / 86400000
      : 999;
    const state = count === 0 ? 'empty' : (daysSince <= 14 ? 'living' : (year === new Date().getFullYear() ? 'dormant' : 'archived'));

    const green  = state === 'living'   ? '#4A7C59' : (state === 'dormant' ? '#3D4F5F' : '#3D3020');
    const bark   = state === 'living'   ? '#8B7355' : (state === 'dormant' ? '#6B6050' : '#4A3A2A');
    const crownH = 8 + Math.min(count, 40) * 0.3;
    const crownW = 6 + Math.min(count, 40) * 0.2;
    const trunkH = 6 + Math.min(count, 40) * 0.15;
    const opacity = state === 'empty' ? 0.2 : (state === 'archived' ? 0.4 : 1);

    return `<svg viewBox="0 0 36 48" fill="none" width="32" height="40" style="opacity:${opacity}">
      <line x1="18" y1="${48 - trunkH}" x2="18" y2="46" stroke="${bark}" stroke-width="2.5" stroke-linecap="round"/>
      <ellipse cx="18" cy="${36 - crownH * 0.4}" rx="${crownW}" ry="${crownH * 0.55}" fill="${green}" opacity="0.5"/>
      <ellipse cx="18" cy="${30 - crownH * 0.3}" rx="${crownW * 0.7}" ry="${crownH * 0.45}" fill="${green}" opacity="0.65"/>
      <ellipse cx="18" cy="${24 - crownH * 0.2}" rx="${crownW * 0.5}" ry="${crownH * 0.35}" fill="${green}" opacity="0.8"/>
    </svg>`;
  }

  // ── Year Panel ────────────────────────────────────────────────────────────

  function showYearPanel(year) {
    const panel     = document.getElementById('year-panel');
    const titleEl   = document.getElementById('panel-title');
    const badge     = document.getElementById('panel-today-badge');
    const addBtn    = document.getElementById('panel-add-btn');
    if (!panel) return;

    if (titleEl) titleEl.textContent = year;
    const currentYear  = new Date().getFullYear();
    const isCurrentYear = year === currentYear;
    const todayEntry   = isCurrentYear ? getTodayEntry() : null;

    if (badge) {
      badge.style.display = isCurrentYear ? '' : 'none';
      badge.textContent   = todayEntry ? t('todayBadgeDone') : t('todayBadgeNone');
      badge.className     = 'panel-today-status' + (todayEntry ? ' recorded' : '');
    }
    if (addBtn) {
      addBtn.style.display = isCurrentYear ? '' : 'none';
      const span = addBtn.querySelector('span');
      if (span) span.textContent = todayEntry ? t('editEntry') : t('addEntry');
    }

    const list    = document.getElementById('panel-entries');
    const entries = getYearEntries(year);
    if (!list) return;
    list.innerHTML = '';

    if (entries.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'empty-note';
      empty.textContent = t('noEntries');
      list.appendChild(empty);
    } else {
      entries.slice().reverse().forEach(entry => {
        const li = document.createElement('li');
        li.className = 'entry-item';
        const date    = new Date(entry.date);
        const isToday = entry.date.substring(0,10) === getTodayKey();
        const dateStr = date.toLocaleDateString(currentLang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' });
        li.innerHTML = `
          <div class="entry-row">
            <div class="entry-left">
              <span class="entry-date">${dateStr}</span>
              ${isToday ? `<span class="entry-today-badge">${currentLang === 'zh' ? '今天' : 'Today'}</span>` : ''}
            </div>
            ${isToday ? `<button class="entry-edit-btn" data-id="${entry.id}">${currentLang === 'zh' ? '修改' : 'Edit'}</button>` : ''}
          </div>
          <p class="entry-text">${escapeHtml(entry.text)}</p>
        `;
        list.appendChild(li);
      });
    }
    panel.classList.add('open');
  }

  function closeYearPanel() {
    document.getElementById('year-panel')?.classList.remove('open');
  }

  function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }

  // ── Modal ─────────────────────────────────────────────────────────────────

  let _editEntry = null;

  function openModal(year, entryToEdit) {
    _editEntry = entryToEdit || null;
    const overlay   = document.getElementById('modal-overlay');
    const textarea  = document.getElementById('entry-text');
    const yearLabel = document.getElementById('modal-year');
    const label     = document.getElementById('modal-label');
    if (yearLabel) yearLabel.textContent = year;
    if (textarea)  { textarea.value = entryToEdit ? entryToEdit.text : ''; updateCharCount(); }
    if (label)     label.textContent = entryToEdit ? t('editEntry') : t('whatMattersToday');
    overlay?.classList.add('active');
    setTimeout(() => textarea?.focus(), 150);
  }

  function closeModal() {
    document.getElementById('modal-overlay')?.classList.remove('active');
    _editEntry = null;
  }

  function updateCharCount() {
    const ta = document.getElementById('entry-text');
    const cc = document.getElementById('char-count');
    if (ta && cc) cc.textContent = ta.value.length;
  }

  function submitEntry(year) {
    const ta   = document.getElementById('entry-text');
    const text = ta ? ta.value.trim() : '';
    if (!text) { showToast(t('emptyError')); ta?.focus(); return; }
    if (_editEntry) {
      updateEntry(_editEntry.id, text);
      showToast(t('saved'), 'success');
    } else {
      addEntry(year, text);
      showSaveSuccess();
    }
    closeModal();
    refreshForest();
    const panel = document.getElementById('year-panel');
    if (panel?.classList.contains('open')) showYearPanel(year);
  }

  // ── Search ────────────────────────────────────────────────────────────────

  function openSearch() {
    document.getElementById('search-overlay')?.classList.add('active');
    document.getElementById('search-input')?.focus();
    renderSearchResults('');
  }

  function closeSearch() {
    document.getElementById('search-overlay')?.classList.remove('active');
    const input = document.getElementById('search-input');
    if (input) input.value = '';
  }

  function renderSearchResults(query) {
    const list    = document.getElementById('search-results');
    if (!list) return;
    list.innerHTML = '';
    const q       = query.trim().toLowerCase();
    if (!q) return;

    const entries = loadEntries();
    const results = [];
    Object.keys(entries).sort((a,b) => b - a).forEach(year => {
      (entries[year] || []).forEach(entry => {
        if (entry.text.toLowerCase().includes(q)) {
          results.push({ year: parseInt(year), entry });
        }
      });
    });

    if (results.length === 0) {
      const li = document.createElement('li');
      li.className = 'search-no-results';
      li.textContent = t('searchNoResults');
      list.appendChild(li);
      return;
    }

    results.slice(0, 30).forEach(({ year, entry }) => {
      const li    = document.createElement('li');
      li.className = 'search-result-item';
      const date   = new Date(entry.date);
      const dateStr = date.toLocaleDateString(currentLang === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      const highlighted = escapeHtml(entry.text).replace(
        new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'gi'),
        m => `<mark>${m}</mark>`
      );
      li.innerHTML = `
        <div class="search-result-meta">${dateStr}</div>
        <div class="search-result-text">${highlighted}</div>
      `;
      li.addEventListener('click', () => {
        closeSearch();
        selectedYear = year;
        showYearPanel(year);
      });
      list.appendChild(li);
    });
  }

  // ── Settings ──────────────────────────────────────────────────────────────

  function openSettings() { document.getElementById('settings-overlay')?.classList.add('active'); }
  function closeSettings() { document.getElementById('settings-overlay')?.classList.remove('active'); }

  function loadReminder() {
    try { return JSON.parse(localStorage.getItem(REMINDER_KEY) || 'null'); }
    catch (e) { return null; }
  }
  function saveReminder(r) { localStorage.setItem(REMINDER_KEY, JSON.stringify(r)); }

  function initReminder() {
    const r = loadReminder();
    const toggle   = document.getElementById('reminder-toggle');
    const timeInput = document.getElementById('reminder-time');
    const timeRow   = document.getElementById('reminder-time-row');
    if (!toggle) return;
    if (r) {
      toggle.checked = r.enabled;
      if (timeInput) timeInput.value = r.time || '21:00';
      if (timeRow) timeRow.style.display = r.enabled ? '' : 'none';
    }
    toggle.addEventListener('change', () => {
      const enabled = toggle.checked;
      const time    = (timeInput && timeInput.value) || '21:00';
      saveReminder({ enabled, time });
      if (timeRow) timeRow.style.display = enabled ? '' : 'none';
      if (enabled) scheduleReminder(time);
    });
    if (timeInput) {
      timeInput.addEventListener('change', () => {
        const r2 = loadReminder();
        if (r2 && r2.enabled) {
          saveReminder({ enabled: true, time: timeInput.value });
          scheduleReminder(timeInput.value);
        }
      });
    }
    if (r && r.enabled) scheduleReminder(r.time || '21:00');
  }

  let _reminderTimeout = null;

  function scheduleReminder(timeStr) {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    clearTimeout(_reminderTimeout);
    const [h, m]  = (timeStr || '21:00').split(':').map(Number);
    const now     = new Date();
    const target  = new Date(now);
    target.setHours(h, m, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    const ms = target - now;
    _reminderTimeout = setTimeout(() => {
      if (Notification.permission === 'granted') {
        new Notification('Daily Tree', { body: currentLang === 'zh' ? '今天的树还没有成长哦 🌱' : "Your tree is waiting to grow today 🌱" });
      } else {
        showToast(currentLang === 'zh' ? '今天的树还没有成长哦 🌱' : "Your tree is waiting to grow today 🌱");
      }
      scheduleReminder(timeStr); // reschedule for next day
    }, ms);
  }

  // ── Export / Import ───────────────────────────────────────────────────────

  function exportBackup() {
    const data    = localStorage.getItem(STORAGE_KEY) || '{}';
    const blob    = new Blob([data], { type: 'application/json' });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    const today   = new Date().toISOString().substring(0, 10);
    a.href        = url;
    a.download    = `daily-tree-backup-${today}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importBackup(file) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        // Validate: must be object with year keys containing arrays
        if (typeof data !== 'object' || Array.isArray(data)) throw new Error('invalid');
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        refreshForest();
        showToast(t('importSuccess'), 'success');
        closeSettings();
      } catch {
        showToast(t('importError'));
      }
    };
    reader.readAsText(file);
  }

  // ── Guide ─────────────────────────────────────────────────────────────────

  const GUIDE_TOTAL = 3;
  let guideStep = 0;

  function showGuide() {
    if (localStorage.getItem(GUIDE_KEY)) return;
    document.getElementById('guide-overlay')?.classList.add('active');
    guideStep = 0;
    updateGuideStep(0);
  }

  function updateGuideStep(step) {
    document.querySelectorAll('.guide-dot').forEach((d,i) => d.classList.toggle('active', i === step));
    for (let i = 0; i < GUIDE_TOTAL; i++) {
      document.getElementById(`guide-step-${i}`)?.classList.toggle('hidden', i !== step);
    }
    const nextLabel = document.getElementById('guide-next-label');
    if (nextLabel) nextLabel.textContent = step === GUIDE_TOTAL - 1 ? t('startNow') : t('nextStep');
  }

  function closeGuide() {
    document.getElementById('guide-overlay')?.classList.remove('active');
    localStorage.setItem(GUIDE_KEY, '1');
    guideStep = 0;
  }

  // ── Events ────────────────────────────────────────────────────────────────

  function bindEvents() {
    // Lang toggle
    document.getElementById('lang-toggle')?.addEventListener('click', () => {
      setLang(currentLang === 'en' ? 'zh' : 'en');
    });

    // FAB
    document.getElementById('fab-new')?.addEventListener('click', () => {
      openModal(new Date().getFullYear(), getTodayEntry());
    });

    // Modal
    document.getElementById('modal-overlay')?.addEventListener('click', e => {
      if (e.target.id === 'modal-overlay') closeModal();
    });
    document.getElementById('modal-close')?.addEventListener('click', closeModal);
    document.getElementById('entry-submit')?.addEventListener('click', () => {
      const year = parseInt(document.getElementById('modal-year')?.textContent, 10) || new Date().getFullYear();
      submitEntry(year);
    });
    document.getElementById('entry-text')?.addEventListener('input', updateCharCount);
    document.getElementById('entry-text')?.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        const year = parseInt(document.getElementById('modal-year')?.textContent, 10) || new Date().getFullYear();
        submitEntry(year);
      }
      if (e.key === 'Escape') closeModal();
    });

    // Year panel
    document.getElementById('panel-close')?.addEventListener('click', closeYearPanel);
    document.getElementById('panel-add-btn')?.addEventListener('click', () => {
      openModal(new Date().getFullYear(), getTodayEntry());
    });
    document.getElementById('panel-entries')?.addEventListener('click', e => {
      const btn = e.target.closest('.entry-edit-btn');
      if (!btn) return;
      const id    = parseInt(btn.getAttribute('data-id'), 10);
      const year  = new Date().getFullYear();
      const entry = getYearEntries(year).find(x => x.id === id);
      if (entry) openModal(year, entry);
    });

    // Search
    document.getElementById('btn-search')?.addEventListener('click', openSearch);
    document.getElementById('search-close')?.addEventListener('click', closeSearch);
    document.getElementById('search-overlay')?.addEventListener('click', e => {
      if (e.target.id === 'search-overlay') closeSearch();
    });
    document.getElementById('search-input')?.addEventListener('input', e => {
      renderSearchResults(e.target.value);
    });

    // Settings
    document.getElementById('btn-settings')?.addEventListener('click', openSettings);
    document.getElementById('settings-close')?.addEventListener('click', closeSettings);
    document.getElementById('settings-overlay')?.addEventListener('click', e => {
      if (e.target.id === 'settings-overlay') closeSettings();
    });
    document.getElementById('btn-export')?.addEventListener('click', exportBackup);
    document.getElementById('import-file')?.addEventListener('change', e => {
      if (e.target.files[0]) importBackup(e.target.files[0]);
    });

    // Guide
    document.getElementById('guide-next')?.addEventListener('click', () => {
      if (guideStep < GUIDE_TOTAL - 1) { guideStep++; updateGuideStep(guideStep); }
      else closeGuide();
    });
    document.getElementById('guide-skip')?.addEventListener('click', closeGuide);
    document.getElementById('guide-overlay')?.addEventListener('click', e => {
      if (e.target.id === 'guide-overlay') closeGuide();
    });

    // Global keyboard
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeModal(); closeYearPanel(); closeSearch(); closeSettings(); closeGuide(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') { e.preventDefault(); openModal(new Date().getFullYear(), getTodayEntry()); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') { e.preventDefault(); openSearch(); }
    });
  }

  // ── Bootstrap ─────────────────────────────────────────────────────────────

  window.addEventListener('DOMContentLoaded', () => {
    currentLang = detectLang();
    bindEvents();
    setLang(currentLang);
    initReminder();
    initForest().then(() => {
      updateTodayChip();
      updateStreakChip();
      setTimeout(showGuide, 600);
    });
  });

})();
```

- [ ] **Step 2: Verify core functionality**

Reload the app. Test each of these in sequence:
1. Page loads without console errors
2. Bottom dock is visible
3. Tap + → modal opens → type text → Save → tree updates with new blobs
4. Streak chip appears after first entry (shows "1 day")
5. Past year in dock → click → year panel slides up with entries
6. Search icon → type a word you wrote → result appears → click → year panel opens
7. Settings icon → export → JSON file downloads
8. `Cmd+N` opens modal, `Escape` closes overlays

---

## Verification Checklist

After all tasks are complete, verify end-to-end:

- [ ] Open `app/index.html` via `npx serve app` or a local HTTP server (ES modules require HTTP)
- [ ] **Tree**: organic leaf blobs visible, not abstract rings
- [ ] **Growth**: adding an entry rebuilds tree with more blobs
- [ ] **Breathing**: living tree canopy pulses subtly
- [ ] **Seasons**: manually change system clock to different month, reload — tree color shifts (spring = pale green, summer = deep green, autumn = gold, winter = sparse)
- [ ] **Streak**: consecutive day entries → chip increments; gap of 1 day → resets to 0
- [ ] **Dock**: past year mini-trees render; clicking opens year panel
- [ ] **Search**: finds entries across years; highlights match in gold
- [ ] **Reminder**: enable in settings, set time 1 minute from now → notification fires (or toast if notifications denied)
- [ ] **Export**: downloads valid JSON file
- [ ] **Import**: import that same JSON → data restores, tree refreshes
- [ ] **Mobile** (DevTools emulation): dock visible at bottom, no overflow
- [ ] **Guide**: clear `localStorage` and reload → guide appears, 3 steps, skip works
