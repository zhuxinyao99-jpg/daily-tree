# Daily Tree

**Watch your life grow in rings.**

A personal forest of your daily entries. Every day you write one thought, one moment worth remembering. Each year becomes a tree. Each entry adds growth. Over time, a living forest forms — a map of your time and thoughts.

**[Open App →](https://zhuxinyao99-jpg.github.io/daily-tree/app/)**
&nbsp;&middot;&nbsp;
**[Live Demo (Landing)](https://zhuxinyao99-jpg.github.io/daily-tree/)**
&nbsp;&middot;&nbsp;
**[GitHub →](https://github.com/zhuxinyao99-jpg/daily-tree)**

---

## What it does

- **Streak-based growth** — Your tree grows with consecutive daily entries. From seed (0 days) to ancient (365+ days)
- **High-fidelity 3D trees** — Realistic trunks, branches, roots, and leaf clusters with organic variation
- **Seasonal colors** — Tree appearance changes with seasons (spring pale green → summer deep forest → autumn gold → winter silver)
- **Interactive 3D** — Drag to rotate your tree, swipe to browse today's entries, quick edit/delete
- **Smart backgrounds** — Background changes based on real-time weather (sunshine, rain, snow, storms)
- **Responsive design** — Optimized for mobile, tablet, and desktop with touch-friendly controls
- **Entry carousel** — Swipe through multiple entries from today, add entries for any date
- **No social feed** — Your forest is yours. Data lives in LocalStorage, never leaves your device

---

## How it works

```
Daily Tree/
├── app/
│   ├── index.html          # Main application
│   ├── style.css           # Responsive design (mobile/tablet/desktop)
│   ├── app.js              # Core logic, state, UI management
│   ├── weather.js          # Real-time weather integration
│   └── webgl/
│       ├── three.js        # Three.js library (via CDN)
│       ├── scene.js        # 3D scene, interaction, camera
│       └── tree.js         # Streak-based tree generation
├── landing.html            # Landing page (3/4 isometric view)
└── .github/workflows/
    └── deploy.yml          # Auto-deploy to GitHub Pages
```

**Tech stack:** Three.js · WebGL · Vanilla JS · ES6 Modules · LocalStorage · Open-Meteo Weather API · GitHub Pages

No backend. No database. Everything lives in your browser. Auto-deployed via GitHub Actions.

---

## Quick start

```bash
# No installation needed — open in browser
open https://zhuxinyao99-jpg.github.io/daily-tree/app/

# Or run locally with any static server
npx serve .
# then open http://localhost:3000/app/
```

---

## Philosophy

Most journaling apps are about writing. This one is about **remembering**.

The constraint is intentional: one entry, one moment, per day. It forces distillation — finding the single thing that mattered most. Over years, a forest accumulates that tells a different kind of story than a diary ever could.

The trees are not decorative. They are **visual memory**. The height of a tree encodes how present you were. The state of the canopy (living, dormant, archived) tells you at a glance which years you were most engaged.

---

## Automatic Deployment

This project uses **GitHub Actions** to automatically deploy whenever code is pushed:

1. **On every push** to `main` or `feature/**` branches
2. **Validation** checks HTML/CSS/JS syntax
3. **Auto-deploys** to GitHub Pages within 1-2 minutes
4. **Live at** https://zhuxinyao99-jpg.github.io/daily-tree/

No manual deployment needed — just push and it's live.

### Local Development

```bash
# Clone
git clone https://github.com/zhuxinyao99-jpg/daily-tree.git
cd daily-tree

# Start local server
python3 -m http.server 8000

# Open in browser
# App: http://localhost:8000/app/index.html
# Landing: http://localhost:8000/landing.html
```

---

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+N` / `Cmd+N` | New entry |
| `Ctrl+Enter` / `Cmd+Enter` | Submit entry |
| `Esc` | Close modal |

---

## License

MIT · [View on GitHub](https://github.com/zhuxinyao99-jpg/daily-tree)
