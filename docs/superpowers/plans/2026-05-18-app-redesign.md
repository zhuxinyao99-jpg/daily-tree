# Daily Tree App 大规模重设计实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Daily Tree app 使用界面从 WebGL 绿色主题全面重设计为 Canvas 2D、黑底绿树、顶底状态栏布局，加入养成系树木、点击树枝查历史、天气粒子效果，并实现首次访问检测。

**Architecture:** landing.html 顶部加路由逻辑（localStorage 检测）；app/index.html 完整重写为新布局；新建 app/tree.js（Canvas 2D 递归分叉树）和重写 app/weather.js（粒子层）；app/app.js 保留数据层函数，替换渲染和 UI 逻辑。

**Tech Stack:** 原生 HTML/CSS/JavaScript（ES Module），Canvas 2D API，Open-Meteo API（无需 key），navigator.geolocation。

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `landing.html` | 修改 top ~10 行 | 加首次访问检测，已访问则跳转 app |
| `app/index.html` | 完整重写 | 新 HTML 结构：顶栏 + canvas + 底栏 + 所有浮层 |
| `app/style.css` | 完整重写 | 黑底绿色主题，新布局变量 |
| `app/tree.js` | 新建 | Canvas 2D 树绘制模块，export `drawTree()` |
| `app/app.js` | 修改 | 删除 WebGL/旧 forest，加新数据函数，接 tree.js，改 guide/branch-tap |
| `app/weather.js` | 重写 | Open-Meteo 请求 + 粒子 canvas 渲染 |
| `app/webgl/` | 不删除 | 保留但不再 import（减少风险） |

---

## Task 1：导航路由 — landing.html 首次访问检测

**Files:**
- Modify: `landing.html` (顶部，`<script>` 标签前插入)

- [ ] **Step 1：在 landing.html `<head>` 最底部，`</head>` 之前插入路由脚本**

  打开 `landing.html`，找到 `</head>` 标签（当前约第 5 行），在其**之前**插入：

  ```html
  <script>
    // First-visit routing: if already visited, go straight to app
    (function(){
      if (localStorage.getItem('daily_tree_visited') === 'true') {
        window.location.replace('app/index.html');
      }
    })();
  </script>
  ```

- [ ] **Step 2：找到 landing.html 中「免费开始」按钮的点击处理，写入 visited 标志**

  在 landing.html 的 JS 中搜索处理「免费开始」按钮点击的代码（`cta-btn` 或类似）。在跳转前加：

  ```js
  localStorage.setItem('daily_tree_visited', 'true');
  ```

  如果按钮是 `<a href="app/index.html">`，改为 `<a href="#" onclick="goApp()">` 并加：

  ```js
  function goApp() {
    localStorage.setItem('daily_tree_visited', 'true');
    window.location.href = 'app/index.html';
  }
  ```

- [ ] **Step 3：验证**

  打开 `landing.html`：
  - 清除 localStorage（DevTools → Application → Clear Storage），刷新页面 → 应正常显示 landing，不跳转
  - 点击「免费开始」→ 应跳转到 `app/index.html`，且 `localStorage.daily_tree_visited === 'true'`
  - 刷新 `landing.html` → 应立即跳转 `app/index.html`（因为 visited 已设置）

- [ ] **Step 4：Commit**

  ```bash
  cd /tmp/daily-tree
  git add landing.html
  git commit -m "feat: add first-visit routing to landing page"
  ```

---

## Task 2：新 app HTML 结构重写

**Files:**
- Modify: `app/index.html` (完整替换)

> 说明：保留所有原有浮层（modal、search、settings、guide），只改布局骨架和移除 WebGL script。

- [ ] **Step 1：将 `app/index.html` 替换为以下完整内容**

  ```html
  <!DOCTYPE html>
  <html lang="zh">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>Daily Tree</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="style.css">
  </head>
  <body>

  <!-- ── Top Status Bar ── -->
  <header class="top-bar" id="top-bar">
    <button class="top-back" id="top-back" aria-label="返回首页">← Daily Tree</button>
    <span class="top-date" id="top-date"></span>
    <div class="top-right" id="top-right">
      <span class="top-reminder" id="top-reminder">✦ 今天还没记录</span>
    </div>
  </header>

  <!-- ── Full-screen Tree Canvas ── -->
  <main class="canvas-wrap">
    <canvas id="tree-canvas"></canvas>
    <canvas id="weather-canvas" aria-hidden="true"></canvas>
  </main>

  <!-- ── Bottom Action Bar ── -->
  <nav class="bottom-bar" id="bottom-bar">
    <button class="bar-icon" id="btn-search" aria-label="搜索">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/>
      </svg>
    </button>

    <div class="bar-chart" id="bar-chart" aria-label="近14天打卡"></div>

    <button class="bar-fab" id="fab-new" aria-label="记录今天">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    </button>

    <div class="bar-chart bar-chart-right" id="bar-chart-right" aria-label="近14天打卡后半"></div>

    <button class="bar-icon" id="btn-settings" aria-label="设置">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <circle cx="12" cy="8" r="4"/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
    </button>
  </nav>

  <!-- ── Branch Tap Panel (history viewer) ── -->
  <div class="branch-panel" id="branch-panel" role="dialog" aria-modal="true">
    <div class="branch-panel-handle"></div>
    <div class="branch-panel-header">
      <span class="branch-panel-title" id="branch-panel-title">记录</span>
      <button class="branch-panel-close" id="branch-panel-close" aria-label="关闭">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <ul class="branch-panel-entries" id="branch-panel-entries"></ul>
  </div>

  <!-- ── Entry Modal ── -->
  <div class="modal-overlay" id="modal-overlay" role="dialog" aria-modal="true">
    <div class="modal-card">
      <div class="modal-header">
        <span class="modal-label" id="modal-label">今天最重要的一件事？</span>
        <button class="modal-close" id="modal-close" aria-label="关闭">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <textarea class="modal-textarea" id="entry-text"
        placeholder="一个瞬间，一个想法，一件值得记住的事……"
        maxlength="500"></textarea>
      <div class="modal-footer">
        <span class="char-count"><span id="char-count">0</span> / 500</span>
        <button class="modal-submit" id="entry-submit">保存</button>
      </div>
    </div>
  </div>

  <!-- ── Search Overlay ── -->
  <div class="search-overlay" id="search-overlay" role="dialog" aria-modal="true">
    <div class="search-inner">
      <div class="search-bar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="22" y2="22"/>
        </svg>
        <input class="search-input" id="search-input" type="text" placeholder="搜索记录…">
        <button class="search-close" id="search-close" aria-label="关闭">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <ul class="search-results" id="search-results"></ul>
    </div>
  </div>

  <!-- ── Settings Panel ── -->
  <div class="settings-overlay" id="settings-overlay" role="dialog" aria-modal="true">
    <div class="settings-card">
      <div class="settings-header">
        <h2 class="settings-title">设置</h2>
        <button class="settings-close" id="settings-close" aria-label="关闭">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="settings-section">
        <button class="settings-action-btn" id="btn-export">导出备份</button>
        <label class="settings-action-btn">
          导入备份
          <input type="file" id="import-file" accept=".json" style="display:none">
        </label>
      </div>
      <div class="settings-section">
        <button class="settings-action-btn settings-action-danger" id="btn-reset-visited">
          重新查看引导页
        </button>
      </div>
    </div>
  </div>

  <!-- ── Onboarding Guide ── -->
  <div class="guide-overlay" id="guide-overlay" role="dialog" aria-modal="true">
    <div class="guide-card">
      <div class="guide-dots" id="guide-dots">
        <div class="guide-dot active" data-step="0"></div>
        <div class="guide-dot" data-step="1"></div>
        <div class="guide-dot" data-step="2"></div>
      </div>

      <div class="guide-step" id="guide-step-0">
        <div class="guide-visual">
          <canvas id="guide-tree-canvas" width="160" height="200"></canvas>
        </div>
        <h2 class="guide-title">你的树，从今天开始生长</h2>
        <p class="guide-desc">每天记录一件事，你的树就会长大。记录越多，树越茂盛。</p>
      </div>

      <div class="guide-step hidden" id="guide-step-1">
        <div class="guide-visual guide-visual-fab">
          <div class="guide-fab-demo">
            <div class="guide-fab-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </div>
            <div class="guide-fab-arrow">↑</div>
          </div>
        </div>
        <h2 class="guide-title">每天写下一件事</h2>
        <p class="guide-desc">点击底部的 + 按钮，写下今天最重要的一件事。</p>
      </div>

      <div class="guide-step hidden" id="guide-step-2">
        <div class="guide-visual guide-visual-branch">
          <svg viewBox="0 0 120 160" width="90" height="120" fill="none">
            <line x1="60" y1="155" x2="60" y2="100" stroke="rgba(105,78,48,0.8)" stroke-width="8" stroke-linecap="round"/>
            <line x1="60" y1="120" x2="35" y2="80" stroke="rgba(105,78,48,0.7)" stroke-width="5" stroke-linecap="round"/>
            <line x1="60" y1="120" x2="82" y2="75" stroke="rgba(105,78,48,0.7)" stroke-width="5" stroke-linecap="round"/>
            <ellipse cx="28" cy="68" rx="16" ry="12" fill="rgba(108,195,90,0.45)" stroke="rgba(150,230,130,0.5)" stroke-width="0.8"/>
            <ellipse cx="85" cy="62" rx="16" ry="12" fill="rgba(108,195,90,0.45)" stroke="rgba(150,230,130,0.5)" stroke-width="0.8"/>
            <!-- tap indicator -->
            <circle cx="35" cy="80" r="10" fill="none" stroke="rgba(150,230,130,0.8)" stroke-width="1.5" stroke-dasharray="3 2"/>
            <text x="20" y="42" font-size="10" fill="rgba(150,230,130,0.8)" font-family="sans-serif">点我</text>
          </svg>
        </div>
        <h2 class="guide-title">点击树枝，回顾过去</h2>
        <p class="guide-desc">树的不同部位对应不同时期的记录，点击树枝可以查看那段时间写的内容。</p>
      </div>

      <div class="guide-actions">
        <button class="guide-skip" id="guide-skip">跳过</button>
        <button class="guide-next" id="guide-next">
          <span id="guide-next-label">下一步</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    </div>
  </div>

  <script type="module" src="app.js"></script>
  </body>
  </html>
  ```

- [ ] **Step 2：验证 HTML 可以被浏览器加载**

  在浏览器打开 `app/index.html`，预期：页面结构存在，无 JS 报错（可以有 404 because style.css/app.js will error until next tasks）。

- [ ] **Step 3：Commit**

  ```bash
  cd /tmp/daily-tree
  git add app/index.html
  git commit -m "feat: rewrite app HTML with new top/bottom bar layout"
  ```

---

## Task 3：新 app CSS 主题

**Files:**
- Modify: `app/style.css` (完整替换)

- [ ] **Step 1：将 `app/style.css` 替换为以下完整内容**

  ```css
  /* ── Reset & Base ── */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #000;
    --bar-bg: rgba(2, 4, 2, 0.88);
    --bar-border: rgba(80, 160, 80, 0.10);
    --bar-blur: blur(14px);
    --top-h: 44px;
    --bot-h: 72px;
    --accent: rgba(90, 190, 90, 0.88);
    --accent-glow: rgba(80, 200, 80, 0.38);
    --leaf: rgb(108, 195, 90);
    --leaf-dim: rgba(108, 195, 90, 0.35);
    --bark: rgb(105, 78, 48);
    --text-pri: rgba(200, 235, 200, 0.88);
    --text-sec: rgba(150, 200, 150, 0.55);
    --amber: rgba(255, 210, 90, 0.9);
    --amber-bg: rgba(30, 20, 0, 0.65);
    --amber-border: rgba(200, 160, 20, 0.28);
    --font: 'Outfit', system-ui, sans-serif;
  }
  html, body { height: 100%; overflow: hidden; background: var(--bg); font-family: var(--font); color: var(--text-pri); }

  /* ── Top Bar ── */
  .top-bar {
    position: fixed; top: 0; left: 0; right: 0;
    height: var(--top-h);
    background: var(--bar-bg);
    backdrop-filter: var(--bar-blur);
    -webkit-backdrop-filter: var(--bar-blur);
    border-bottom: 1px solid var(--bar-border);
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 16px;
    z-index: 100;
  }
  .top-back {
    background: none; border: none; cursor: pointer;
    font-size: 12px; color: var(--text-sec); font-family: var(--font);
    padding: 6px 0; letter-spacing: .02em;
  }
  .top-back:hover { color: var(--text-pri); }
  .top-date { font-size: 11px; color: rgba(160, 210, 160, 0.38); }
  .top-right { display: flex; align-items: center; }
  .top-reminder {
    font-size: 11px; color: var(--amber);
    background: var(--amber-bg);
    border: 1px solid var(--amber-border);
    border-radius: 20px; padding: 3px 10px;
    white-space: nowrap;
  }
  .top-weather {
    font-size: 11px; color: var(--text-sec); letter-spacing: .02em;
  }

  /* ── Canvas Area ── */
  .canvas-wrap {
    position: fixed; inset: 0;
    padding-top: var(--top-h);
    padding-bottom: var(--bot-h);
  }
  #tree-canvas, #weather-canvas {
    position: absolute; inset: 0; width: 100%; height: 100%;
  }
  #weather-canvas { pointer-events: none; z-index: 2; }
  #tree-canvas { z-index: 1; }

  /* ── Bottom Bar ── */
  .bottom-bar {
    position: fixed; bottom: 0; left: 0; right: 0;
    height: var(--bot-h);
    background: var(--bar-bg);
    backdrop-filter: var(--bar-blur);
    -webkit-backdrop-filter: var(--bar-blur);
    border-top: 1px solid var(--bar-border);
    display: flex; align-items: center; justify-content: space-around;
    padding: 0 12px;
    z-index: 100;
  }
  .bar-icon {
    width: 36px; height: 36px; border-radius: 50%;
    background: none; border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
  }
  .bar-icon svg { width: 16px; height: 16px; stroke: rgba(120, 190, 120, 0.45); transition: stroke .15s; }
  .bar-icon:hover svg { stroke: rgba(150, 220, 150, 0.8); }
  .bar-fab {
    width: 50px; height: 50px; border-radius: 50%;
    background: var(--accent);
    border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 20px var(--accent-glow);
    transition: transform .15s, box-shadow .15s;
  }
  .bar-fab:hover { transform: scale(1.06); box-shadow: 0 0 28px var(--accent-glow); }
  .bar-fab svg { width: 22px; height: 22px; stroke: #fff; }
  .bar-chart { display: flex; gap: 3px; align-items: flex-end; }
  .bar-day {
    width: 5px; border-radius: 2px;
    background: rgba(80, 160, 80, 0.18);
    transition: background .2s;
  }
  .bar-day.done { background: rgba(110, 200, 100, 0.55); }
  .bar-day.today { background: rgba(140, 230, 120, 0.85); }

  /* ── Branch Panel ── */
  .branch-panel {
    position: fixed; bottom: 0; left: 0; right: 0;
    background: rgba(4, 8, 4, 0.96);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border-top: 1px solid var(--bar-border);
    border-radius: 18px 18px 0 0;
    padding: 0 0 calc(var(--bot-h) + 16px);
    max-height: 65vh;
    overflow-y: auto;
    transform: translateY(100%);
    transition: transform .32s cubic-bezier(.4,0,.2,1);
    z-index: 200;
  }
  .branch-panel.open { transform: translateY(0); }
  .branch-panel-handle {
    width: 36px; height: 4px; border-radius: 2px;
    background: rgba(120, 180, 120, 0.2);
    margin: 12px auto 0;
  }
  .branch-panel-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 20px 8px;
  }
  .branch-panel-title { font-size: 14px; font-weight: 600; color: var(--text-pri); }
  .branch-panel-close {
    background: none; border: none; cursor: pointer;
    color: var(--text-sec); padding: 4px;
  }
  .branch-panel-entries {
    list-style: none; padding: 0 20px 12px;
  }
  .branch-entry {
    padding: 12px 0;
    border-bottom: 1px solid rgba(80, 160, 80, 0.08);
  }
  .branch-entry:last-child { border-bottom: none; }
  .branch-entry-date { font-size: 11px; color: var(--text-sec); margin-bottom: 4px; }
  .branch-entry-text { font-size: 13px; color: var(--text-pri); line-height: 1.6; }

  /* ── Modal ── */
  .modal-overlay {
    position: fixed; inset: 0; z-index: 300;
    background: rgba(0,0,0,0.7);
    display: flex; align-items: flex-end;
    opacity: 0; pointer-events: none;
    transition: opacity .22s;
  }
  .modal-overlay.active { opacity: 1; pointer-events: all; }
  .modal-card {
    width: 100%; background: rgba(6, 12, 6, 0.98);
    border-top: 1px solid var(--bar-border);
    border-radius: 18px 18px 0 0;
    padding: 20px 20px calc(var(--bot-h) + 16px);
    transform: translateY(20px);
    transition: transform .24s cubic-bezier(.4,0,.2,1);
  }
  .modal-overlay.active .modal-card { transform: translateY(0); }
  .modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
  .modal-label { font-size: 14px; font-weight: 600; color: var(--text-pri); }
  .modal-close { background: none; border: none; cursor: pointer; color: var(--text-sec); padding: 4px; }
  .modal-textarea {
    width: 100%; min-height: 120px;
    background: rgba(20, 35, 20, 0.5);
    border: 1px solid rgba(80, 160, 80, 0.18);
    border-radius: 12px;
    color: var(--text-pri); font-family: var(--font); font-size: 14px; line-height: 1.65;
    padding: 14px 16px; resize: none; outline: none;
  }
  .modal-textarea:focus { border-color: rgba(110, 200, 100, 0.4); }
  .modal-textarea::placeholder { color: rgba(130, 180, 130, 0.35); }
  .modal-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; }
  .char-count { font-size: 11px; color: var(--text-sec); }
  .modal-submit {
    background: var(--accent); border: none; border-radius: 10px;
    color: #fff; font-family: var(--font); font-size: 13px; font-weight: 600;
    padding: 9px 22px; cursor: pointer;
    transition: opacity .15s;
  }
  .modal-submit:hover { opacity: .88; }

  /* ── Search ── */
  .search-overlay {
    position: fixed; inset: 0; z-index: 300;
    background: rgba(0,0,0,0.85);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    display: flex; align-items: flex-start; justify-content: center;
    padding-top: calc(var(--top-h) + 20px);
    opacity: 0; pointer-events: none;
    transition: opacity .2s;
  }
  .search-overlay.active { opacity: 1; pointer-events: all; }
  .search-inner { width: 100%; max-width: 480px; padding: 0 20px; }
  .search-bar {
    display: flex; align-items: center; gap: 10px;
    background: rgba(20, 35, 20, 0.8);
    border: 1px solid rgba(80, 160, 80, 0.2);
    border-radius: 12px; padding: 10px 14px;
    margin-bottom: 12px;
  }
  .search-bar svg { stroke: var(--text-sec); flex-shrink: 0; }
  .search-input {
    flex: 1; background: none; border: none; outline: none;
    color: var(--text-pri); font-family: var(--font); font-size: 14px;
  }
  .search-input::placeholder { color: rgba(130, 180, 130, 0.35); }
  .search-close { background: none; border: none; cursor: pointer; color: var(--text-sec); padding: 4px; }
  .search-results { list-style: none; max-height: 60vh; overflow-y: auto; }
  .search-result-item {
    padding: 12px 16px; background: rgba(12, 20, 12, 0.7);
    border: 1px solid rgba(80, 160, 80, 0.1);
    border-radius: 10px; margin-bottom: 8px; cursor: pointer;
  }
  .search-result-item:hover { border-color: rgba(110, 200, 100, 0.3); }
  .search-result-date { font-size: 11px; color: var(--text-sec); margin-bottom: 4px; }
  .search-result-text { font-size: 13px; color: var(--text-pri); }
  .search-result-text mark { background: rgba(150, 230, 120, 0.25); color: var(--text-pri); border-radius: 2px; }
  .search-empty { font-size: 13px; color: var(--text-sec); padding: 20px 0; text-align: center; }

  /* ── Settings ── */
  .settings-overlay {
    position: fixed; inset: 0; z-index: 300;
    background: rgba(0,0,0,0.7);
    display: flex; align-items: flex-end;
    opacity: 0; pointer-events: none;
    transition: opacity .22s;
  }
  .settings-overlay.active { opacity: 1; pointer-events: all; }
  .settings-card {
    width: 100%; background: rgba(6, 12, 6, 0.98);
    border-top: 1px solid var(--bar-border);
    border-radius: 18px 18px 0 0;
    padding: 20px 20px calc(var(--bot-h) + 20px);
    transform: translateY(20px);
    transition: transform .24s cubic-bezier(.4,0,.2,1);
  }
  .settings-overlay.active .settings-card { transform: translateY(0); }
  .settings-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
  .settings-title { font-size: 16px; font-weight: 600; color: var(--text-pri); }
  .settings-close { background: none; border: none; cursor: pointer; color: var(--text-sec); padding: 4px; }
  .settings-section { margin-bottom: 16px; display: flex; flex-direction: column; gap: 8px; }
  .settings-action-btn {
    background: rgba(20, 40, 20, 0.6);
    border: 1px solid rgba(80, 160, 80, 0.2);
    border-radius: 10px; color: var(--text-pri);
    font-family: var(--font); font-size: 13px;
    padding: 12px 16px; cursor: pointer; text-align: left;
    transition: border-color .15s;
  }
  .settings-action-btn:hover { border-color: rgba(110, 200, 100, 0.4); }
  .settings-action-danger { color: rgba(255, 120, 100, 0.7); }

  /* ── Guide ── */
  .guide-overlay {
    position: fixed; inset: 0; z-index: 400;
    background: rgba(0, 0, 0, 0.96);
    display: flex; align-items: center; justify-content: center;
    opacity: 0; pointer-events: none;
    transition: opacity .28s;
  }
  .guide-overlay.active { opacity: 1; pointer-events: all; }
  .guide-card {
    width: min(360px, 90vw);
    display: flex; flex-direction: column; align-items: center;
    text-align: center; gap: 0; padding: 0 24px;
  }
  .guide-dots { display: flex; gap: 6px; margin-bottom: 32px; }
  .guide-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: rgba(120, 190, 120, 0.2);
    transition: background .2s, width .2s;
  }
  .guide-dot.active { background: rgba(140, 220, 120, 0.85); width: 18px; border-radius: 3px; }
  .guide-step { width: 100%; }
  .guide-step.hidden { display: none; }
  .guide-visual {
    height: 200px; display: flex; align-items: center; justify-content: center;
    margin-bottom: 24px;
  }
  .guide-visual-fab { flex-direction: column; gap: 12px; }
  .guide-fab-demo { display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .guide-fab-btn {
    width: 60px; height: 60px; border-radius: 50%;
    background: var(--accent); display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 28px var(--accent-glow);
  }
  .guide-fab-btn svg { width: 26px; height: 26px; stroke: #fff; stroke-width: 2.5; }
  .guide-fab-arrow { font-size: 24px; color: rgba(150, 220, 130, 0.5); animation: bounce 1.2s infinite; }
  @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  .guide-visual-branch { }
  .guide-title { font-size: 20px; font-weight: 600; color: var(--text-pri); margin-bottom: 10px; }
  .guide-desc { font-size: 14px; color: var(--text-sec); line-height: 1.65; }
  .guide-actions {
    display: flex; gap: 12px; justify-content: center;
    margin-top: 36px; width: 100%;
  }
  .guide-skip {
    background: none; border: 1px solid rgba(80, 160, 80, 0.18);
    border-radius: 10px; color: var(--text-sec);
    font-family: var(--font); font-size: 13px;
    padding: 10px 20px; cursor: pointer;
  }
  .guide-next {
    background: var(--accent); border: none; border-radius: 10px;
    color: #fff; font-family: var(--font); font-size: 13px; font-weight: 600;
    padding: 10px 24px; cursor: pointer;
    display: flex; align-items: center; gap: 6px;
  }
  .guide-next:hover { opacity: .88; }

  /* ── Toast ── */
  .app-toast {
    position: fixed; bottom: calc(var(--bot-h) + 16px); left: 50%; transform: translateX(-50%) translateY(16px);
    background: rgba(20, 40, 20, 0.92); border: 1px solid rgba(80, 160, 80, 0.25);
    border-radius: 20px; padding: 8px 18px;
    font-size: 12.5px; color: var(--text-pri);
    opacity: 0; transition: opacity .2s, transform .2s; pointer-events: none;
    z-index: 500; white-space: nowrap;
  }
  .app-toast.visible { opacity: 1; transform: translateX(-50%) translateY(0); }
  .app-toast.success { border-color: rgba(110, 200, 100, 0.4); }

  /* ── Save floater ── */
  .save-floater {
    position: absolute; font-size: 18px; font-weight: 700;
    color: var(--leaf); pointer-events: none;
    animation: floatUp 1.8s ease-out forwards;
  }
  @keyframes floatUp { 0%{opacity:1;transform:translateY(0)} 100%{opacity:0;transform:translateY(-50px)} }
  ```

- [ ] **Step 2：在浏览器验证样式**

  打开 `app/index.html`，预期：黑色背景，顶部绿色半透明状态栏，底部状态栏可见，无控制台 CSS 错误。

- [ ] **Step 3：Commit**

  ```bash
  cd /tmp/daily-tree
  git add app/style.css
  git commit -m "feat: new dark green CSS theme for app"
  ```

---

## Task 4：Canvas 2D 树模块

**Files:**
- Create: `app/tree.js`

- [ ] **Step 1：创建 `app/tree.js` 并写入完整内容**

  ```js
  // app/tree.js — Canvas 2D 宽冠橡树，6 个生长阶段

  function makeRng(seed) {
    let s = (seed >>> 0) || 1;
    return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 0xffffffff; };
  }

  // Compute branch/leaf palette based on vitality (0–7)
  function getPalette(vitality7) {
    const v = Math.max(0, Math.min(7, vitality7)) / 7;
    return {
      br:  [105, 78, 48],
      lf:  [Math.round(108 - (1-v)*28), Math.round(195 - (1-v)*55), Math.round(90 - (1-v)*20)],
      rim: [150, 230, 130],
      dot: [210, 255, 190],
      amb: [60, 170, 60],
      spread: 0.55,
      leanL: 1.15,
      leanR: 1.0,
    };
  }

  function drawBranch(ctx, rng, x, y, angle, len, width, depth, maxDepth, pal) {
    if (depth === 0 || len < 2) return;
    const ex = x + Math.cos(angle) * len;
    const ey = y - Math.sin(angle) * len;
    const t = depth / maxDepth;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey);
    ctx.lineWidth = width; ctx.lineCap = 'round';
    ctx.strokeStyle = `rgba(${pal.br[0]},${pal.br[1]},${pal.br[2]},${0.55 + t * 0.35})`;
    ctx.stroke();

    if (depth <= 2) {
      const r = 14 + rng() * 10;
      const grd = ctx.createRadialGradient(ex, ey, 0, ex, ey, r);
      grd.addColorStop(0,   `rgba(${pal.lf[0]},${pal.lf[1]},${pal.lf[2]},0.45)`);
      grd.addColorStop(0.55,`rgba(${pal.lf[0]},${pal.lf[1]},${pal.lf[2]},0.18)`);
      grd.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.beginPath();
      for (let i = 0; i <= 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const j = r * (0.6 + rng() * 0.7);
        const px = ex + Math.cos(a) * j, py = ey + Math.sin(a) * j;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fillStyle = grd; ctx.fill();
      ctx.strokeStyle = `rgba(${pal.rim[0]},${pal.rim[1]},${pal.rim[2]},0.22)`;
      ctx.lineWidth = 0.8; ctx.stroke();
      if (rng() > 0.48) {
        ctx.beginPath();
        ctx.arc(ex + (rng()-0.5)*5, ey + (rng()-0.5)*5, 1.5 + rng()*2, 0, Math.PI*2);
        ctx.fillStyle = `rgba(${pal.dot[0]},${pal.dot[1]},${pal.dot[2]},0.68)`;
        ctx.fill();
      }
      return;
    }

    const sp = pal.spread, sv = sp * 0.28;
    const splits = rng() > 0.65 ? 3 : 2;
    if (splits === 2) {
      drawBranch(ctx, rng, ex, ey, angle+(sp+rng()*sv)*pal.leanL, len*(0.62+rng()*0.1), width*0.65, depth-1, maxDepth, pal);
      drawBranch(ctx, rng, ex, ey, angle-(sp+rng()*sv)*pal.leanR, len*(0.62+rng()*0.1), width*0.65, depth-1, maxDepth, pal);
    } else {
      drawBranch(ctx, rng, ex, ey, angle+sp*0.88, len*0.6, width*0.6, depth-1, maxDepth, pal);
      drawBranch(ctx, rng, ex, ey, angle,          len*0.64, width*0.6, depth-1, maxDepth, pal);
      drawBranch(ctx, rng, ex, ey, angle-sp*0.88, len*0.6, width*0.6, depth-1, maxDepth, pal);
    }
  }

  function drawRoots(ctx, x, y, pal, sc) {
    [[Math.PI*1.22, 0.16, 3], [Math.PI*1.78, 0.16, 3], [Math.PI*1.5, 0.10, 2]].forEach(([a, sp, n]) => {
      for (let i = 0; i < n; i++) {
        const ang = a + (i - (n-1)/2) * sp;
        const len = (22 + i * 10) * sc;
        const ex = x + Math.cos(ang) * len, ey = y - Math.sin(ang) * len;
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + Math.cos(ang+0.2)*len*0.5, y - Math.sin(ang+0.2)*len*0.5, ex, ey);
        ctx.lineWidth = (3 - i*0.6) * sc;
        ctx.strokeStyle = `rgba(${pal.br[0]},${pal.br[1]},${pal.br[2]},${0.42 - i*0.07})`;
        ctx.lineCap = 'round'; ctx.stroke();
      }
    });
  }

  function drawAmbient(ctx, x, y, W, H, pal) {
    const grd = ctx.createRadialGradient(x, y - H*0.3, 0, x, y - H*0.3, W*0.55);
    grd.addColorStop(0, `rgba(${pal.amb[0]},${pal.amb[1]},${pal.amb[2]},0.1)`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
  }

  // ── Stage renderers ──

  function drawSeed(ctx, W, H, pal) {
    const cx = W/2, cy = H - 30;
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 18);
    grd.addColorStop(0, `rgba(${pal.lf[0]},${pal.lf[1]},${pal.lf[2]},0.7)`);
    grd.addColorStop(0.5, `rgba(${pal.lf[0]},${pal.lf[1]},${pal.lf[2]},0.2)`);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI*2);
    ctx.fillStyle = grd; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI*2);
    ctx.fillStyle = `rgba(${pal.lf[0]},${pal.lf[1]},${pal.lf[2]},0.9)`; ctx.fill();
  }

  function drawSprout(ctx, W, H, pal) {
    const bx = W/2, by = H - 28;
    drawAmbient(ctx, bx, by, W, H, pal);
    // thin trunk
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by - 30);
    ctx.lineWidth = 3; ctx.strokeStyle = `rgba(${pal.br[0]},${pal.br[1]},${pal.br[2]},0.75)`;
    ctx.lineCap = 'round'; ctx.stroke();
    // two leaves
    for (const [sign, rx, ry] of [[-1, 12, 8], [1, 12, 8]]) {
      ctx.beginPath();
      ctx.ellipse(bx + sign * 10, by - 40, rx, ry, sign * 0.4, 0, Math.PI*2);
      ctx.fillStyle = `rgba(${pal.lf[0]},${pal.lf[1]},${pal.lf[2]},0.55)`; ctx.fill();
      ctx.strokeStyle = `rgba(${pal.rim[0]},${pal.rim[1]},${pal.rim[2]},0.3)`; ctx.lineWidth = 0.6; ctx.stroke();
    }
  }

  function drawSapling(ctx, W, H, pal) {
    const bx = W/2, by = H - 28;
    drawAmbient(ctx, bx, by, W, H, pal);
    drawRoots(ctx, bx, by, pal, 0.6);
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx+1, by-65);
    ctx.lineWidth = 8; ctx.strokeStyle = `rgba(${pal.br[0]},${pal.br[1]},${pal.br[2]},0.78)`;
    ctx.lineCap = 'round'; ctx.stroke();
    drawBranch(ctx, makeRng(42), bx+1, by-65, Math.PI/2+0.32, 42, 5, 4, 4, pal);
    drawBranch(ctx, makeRng(43), bx+1, by-65, Math.PI/2-0.28, 40, 5, 4, 4, pal);
  }

  function drawYoung(ctx, W, H, pal) {
    const bx = W/2+2, by = H - 28;
    drawAmbient(ctx, bx, by, W, H, pal);
    drawRoots(ctx, bx, by, pal, 0.85);
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx+2, by-88);
    ctx.lineWidth = 12; ctx.strokeStyle = `rgba(${pal.br[0]},${pal.br[1]},${pal.br[2]},0.80)`;
    ctx.lineCap = 'round'; ctx.stroke();
    drawBranch(ctx, makeRng(42), bx+2, by-88, Math.PI/2+0.32, 58, 7, 5, 5, pal);
    drawBranch(ctx, makeRng(43), bx+2, by-88, Math.PI/2-0.28, 55, 7, 5, 5, pal);
  }

  function drawMature(ctx, W, H, pal) {
    const bx = W/2+4, by = H - 28;
    drawAmbient(ctx, bx, by, W, H, pal);
    drawRoots(ctx, bx, by, pal, 1.0);
    const trunkH = H * 0.20;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx+3, by-trunkH);
    ctx.lineWidth = 18; ctx.strokeStyle = `rgba(${pal.br[0]},${pal.br[1]},${pal.br[2]},0.84)`;
    ctx.lineCap = 'round'; ctx.stroke();
    const brLen = H * 0.17;
    drawBranch(ctx, makeRng(42), bx+3, by-trunkH, Math.PI/2+0.32, brLen,   14, 7, 7, pal);
    drawBranch(ctx, makeRng(43), bx+3, by-trunkH, Math.PI/2-0.28, brLen*0.96, 14, 7, 7, pal);
  }

  function drawAncient(ctx, W, H, pal) {
    const bx = W/2+4, by = H - 10;
    drawAmbient(ctx, bx, by, W, H, pal);
    drawRoots(ctx, bx, by, pal, 1.35);
    const trunkH = H * 0.24;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx+4, by-trunkH);
    ctx.lineWidth = 24; ctx.strokeStyle = `rgba(${pal.br[0]},${pal.br[1]},${pal.br[2]},0.88)`;
    ctx.lineCap = 'round'; ctx.stroke();
    const brLen = H * 0.20;
    drawBranch(ctx, makeRng(42), bx+4, by-trunkH, Math.PI/2+0.32, brLen,   17, 8, 8, pal);
    drawBranch(ctx, makeRng(43), bx+4, by-trunkH, Math.PI/2-0.28, brLen*0.96, 17, 8, 8, pal);
    // extra low branch for ancient feel
    drawBranch(ctx, makeRng(77), bx+2, by-trunkH*0.55, Math.PI/2+0.68, brLen*0.45, 7, 5, 5, pal);
  }

  // ── Public API ──

  export function getStage(totalDaysThisYear) {
    if (totalDaysThisYear === 0)        return 'seed';
    if (totalDaysThisYear <= 7)         return 'sprout';
    if (totalDaysThisYear <= 30)        return 'sapling';
    if (totalDaysThisYear <= 90)        return 'young';
    if (totalDaysThisYear <= 300)       return 'mature';
    return 'ancient';
  }

  // Returns [trunkBaseX, trunkBaseY, trunkTopX, trunkTopY, trunkHeight] in canvas px
  export function getTrunkBounds(canvas, stage) {
    const W = canvas.width, H = canvas.height;
    const map = {
      seed:    [W/2, H-30, W/2, H-30, 0],
      sprout:  [W/2, H-28, W/2, H-58, 30],
      sapling: [W/2, H-28, W/2+1, H-93, 65],
      young:   [W/2+2, H-28, W/2+4, H-116, 88],
      mature:  [W/2+4, H-28, W/2+7, H-28-H*0.20, H*0.20],
      ancient: [W/2+4, H-10, W/2+8, H-10-H*0.24, H*0.24],
    };
    return map[stage] || map['mature'];
  }

  export function drawTree(canvas, totalDaysThisYear, vitality7) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const stage = getStage(totalDaysThisYear);
    const pal = getPalette(vitality7);
    switch (stage) {
      case 'seed':    drawSeed(ctx, W, H, pal);    break;
      case 'sprout':  drawSprout(ctx, W, H, pal);  break;
      case 'sapling': drawSapling(ctx, W, H, pal); break;
      case 'young':   drawYoung(ctx, W, H, pal);   break;
      case 'mature':  drawMature(ctx, W, H, pal);  break;
      case 'ancient': drawAncient(ctx, W, H, pal); break;
    }
  }
  ```

- [ ] **Step 2：在浏览器的 DevTools console 中快速验证模块可导入**

  在 `app/index.html` 中临时加一段测试（或用 DevTools）：
  ```js
  // 在 browser console (after app loads) — 验证 tree.js 可以被引用
  // 如果 app.js 已 import tree.js，在 console 检查 tree-canvas 是否有内容
  // 预期：canvas 上可见树形（取决于 totalDays）
  ```

- [ ] **Step 3：Commit**

  ```bash
  cd /tmp/daily-tree
  git add app/tree.js
  git commit -m "feat: add Canvas 2D tree module with 6 growth stages"
  ```

---

## Task 5：重写 app.js — 接入新 UI 与树

**Files:**
- Modify: `app/app.js` (大规模改动，逐段替换)

> 策略：保留所有数据层函数（loadEntries, saveEntries, getTodayKey, getTodayEntry, addEntry, addEntryWithDate, updateEntry, getYearEntries, escapeHtml），替换所有渲染/UI 函数。

- [ ] **Step 1：在 `app/app.js` 顶部增加新常量，替换旧常量**

  找到：
  ```js
  const STORAGE_KEY  = 'daily_tree_entries';
  const GUIDE_KEY    = 'daily_tree_guide_seen';
  const LANG_KEY     = 'daily_tree_lang';
  const REMINDER_KEY = 'daily_tree_reminder';
  const YEARS_TO_SHOW = 5;
  ```

  替换为：
  ```js
  const STORAGE_KEY   = 'daily_tree_entries';
  const VISITED_KEY   = 'daily_tree_visited';
  const ONBOARDED_KEY = 'daily_tree_onboarded';
  const LANG_KEY      = 'daily_tree_lang';
  ```

- [ ] **Step 2：在数据函数区（`// ── Data ──` 之后）新增两个计算函数**

  在 `function getYearEntries(year)` 行之后插入：

  ```js
  function computeTotalDaysThisYear() {
    const year = new Date().getFullYear();
    const entries = loadEntries()[year] || [];
    const days = new Set(entries.map(e => e.date.substring(0, 10)));
    return days.size;
  }

  function computeVitality7() {
    const entries = loadEntries();
    const year = new Date().getFullYear();
    const yearEntries = entries[year] || [];
    let count = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      if (yearEntries.some(e => e.date.substring(0, 10) === key)) count++;
    }
    return count;
  }
  ```

- [ ] **Step 3：替换 `initForest` 和 `refreshForest` 为新版本**

  删除整段 `// ── Forest ──` 直到（不含）`// ── Dock ──`，替换为：

  ```js
  // ── Tree ──────────────────────────────────────────────────────────────────

  import { drawTree, getTrunkBounds, getStage } from './tree.js';
  import { WeatherManager } from './weather.js';

  let weatherMgr = null;

  function resizeCanvas(canvas) {
    const wrap = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    const w = wrap.clientWidth, h = wrap.clientHeight;
    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function refreshTree() {
    const canvas = document.getElementById('tree-canvas');
    if (!canvas) return;
    resizeCanvas(canvas);
    drawTree(canvas, computeTotalDaysThisYear(), computeVitality7());
    updateTopBar();
    updateBottomBar();
  }

  async function initApp() {
    const treeCanvas    = document.getElementById('tree-canvas');
    const weatherCanvas = document.getElementById('weather-canvas');
    if (!treeCanvas) return;

    resizeCanvas(treeCanvas);
    refreshTree();

    // Tree canvas click → branch tap
    treeCanvas.addEventListener('click', onTreeClick);

    // Weather
    if (weatherCanvas) {
      resizeCanvas(weatherCanvas);
      weatherMgr = new WeatherManager(weatherCanvas);
      weatherMgr.init();
    }

    // Re-render on resize
    window.addEventListener('resize', () => {
      resizeCanvas(treeCanvas);
      refreshTree();
      if (weatherCanvas) resizeCanvas(weatherCanvas);
    });
  }
  ```

  > Note: The `import` statements need to move to the top of the file. See Step 4.

- [ ] **Step 4：将 `import` 语句移到文件最顶部**

  app.js 顶部当前是 `(function () { 'use strict';`。ES Module `import` 语句必须在模块顶层，不能在 IIFE 内。

  将整个文件从 IIFE 包装 `(function(){ ... })();` 改为直接的模块代码：

  - 删除第一行 `(function () {` 和 `'use strict';`
  - 删除最后一行 `})();`
  - 在文件最顶部（第1行）加：
    ```js
    import { drawTree, getTrunkBounds, getStage } from './tree.js';
    import { WeatherManager } from './weather.js';
    ```

- [ ] **Step 5：替换 `// ── Dock ──` 区域**

  删除整段 `// ── Dock ──`（updateDock, miniTreeSvg），替换为底部 bar 渲染函数：

  ```js
  // ── Top / Bottom Bar ──────────────────────────────────────────────────────

  function updateTopBar() {
    // Date
    const dateEl = document.getElementById('top-date');
    if (dateEl) {
      const d = new Date();
      dateEl.textContent = `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
    }
    // Right: reminder vs weather
    const rightEl  = document.getElementById('top-right');
    const reminder = document.getElementById('top-reminder');
    const weatherEl = document.getElementById('top-weather');
    if (!rightEl) return;
    const todayDone = !!getTodayEntry();
    if (reminder) reminder.style.display = todayDone ? 'none' : '';
    if (weatherEl) weatherEl.style.display = todayDone ? '' : 'none';
  }

  function updateBottomBar() {
    const chartL = document.getElementById('bar-chart');
    const chartR = document.getElementById('bar-chart-right');
    if (!chartL || !chartR) return;
    const entries = loadEntries();
    const year = new Date().getFullYear();
    const yearEntries = entries[year] || [];
    const days = new Set(yearEntries.map(e => e.date.substring(0, 10)));

    function makeBars(container, startOffset, count) {
      container.innerHTML = '';
      for (let i = 0; i < count; i++) {
        const d = new Date();
        d.setDate(d.getDate() - startOffset - i);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const isToday = startOffset === 0 && i === 0;
        const done = days.has(key);
        const bar = document.createElement('div');
        bar.className = 'bar-day' + (isToday ? ' today' : done ? ' done' : '');
        bar.style.height = (8 + (done ? 10 : 0) + (isToday ? 4 : 0)) + 'px';
        container.appendChild(bar);
      }
    }
    makeBars(chartL, 0, 7);
    makeBars(chartR, 7, 7);
  }
  ```

- [ ] **Step 6：替换 `// ── Year Panel ──` 区域**

  删除 `showYearPanel` 和 `closeYearPanel`，替换为新的 branch panel 函数：

  ```js
  // ── Branch Panel ──────────────────────────────────────────────────────────

  function openBranchPanel(zone) {
    // zone: 'early' | 'mid' | 'recent'
    const entries = loadEntries();
    const year = new Date().getFullYear();
    const yearEntries = (entries[year] || []).slice().sort((a, b) => a.date < b.date ? -1 : 1);
    const total = yearEntries.length;
    if (total === 0) return;

    const third = Math.ceil(total / 3);
    let slice, label;
    if (zone === 'early') {
      slice = yearEntries.slice(0, third);
      label = `第 1–${third} 条记录`;
    } else if (zone === 'mid') {
      slice = yearEntries.slice(third, third * 2);
      label = `第 ${third+1}–${third*2} 条记录`;
    } else {
      slice = yearEntries.slice(third * 2);
      label = `第 ${third*2+1}–${total} 条记录（最近）`;
    }

    document.getElementById('branch-panel-title').textContent = label;
    const list = document.getElementById('branch-panel-entries');
    list.innerHTML = '';
    slice.slice().reverse().forEach(entry => {
      const li = document.createElement('li');
      li.className = 'branch-entry';
      const date = new Date(entry.date);
      const dateStr = date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
      li.innerHTML = `<div class="branch-entry-date">${dateStr}</div><div class="branch-entry-text">${escapeHtml(entry.text)}</div>`;
      list.appendChild(li);
    });

    document.getElementById('branch-panel').classList.add('open');
  }

  function closeBranchPanel() {
    document.getElementById('branch-panel')?.classList.remove('open');
  }

  function onTreeClick(e) {
    const canvas = document.getElementById('tree-canvas');
    if (!canvas) return;
    const totalDays = computeTotalDaysThisYear();
    if (totalDays === 0) return;       // nothing to show
    const stage = getStage(totalDays);
    if (stage === 'seed' || stage === 'sprout') return;  // tree too small to tap

    const rect = canvas.getBoundingClientRect();
    const clickY = e.clientY - rect.top;  // in CSS pixels
    const H = rect.height;

    // Trunk bounds in CSS px (canvas coords / dpr)
    const dpr = window.devicePixelRatio || 1;
    const bounds = getTrunkBounds(canvas, stage);
    // bounds[1] = trunkBaseY in canvas px → CSS px = bounds[1] / dpr
    const baseY   = bounds[1] / dpr;
    const topY    = bounds[3] / dpr;
    const trunkH  = baseY - topY;

    // Expand hit area: crown = top 1/2 of canvas above trunk
    const hitBaseY = baseY;
    const hitTopY  = Math.max(0, topY - trunkH * 0.5);
    const hitH     = hitBaseY - hitTopY;

    if (clickY < hitTopY || clickY > hitBaseY) return;  // outside tree area

    const ratio = (hitBaseY - clickY) / hitH;  // 0 = base, 1 = top
    let zone;
    if (ratio < 0.33)      zone = 'early';
    else if (ratio < 0.66) zone = 'mid';
    else                   zone = 'recent';

    openBranchPanel(zone);
  }
  ```

- [ ] **Step 7：替换 `submitEntry` 中的 `refreshForest()` 调用**

  全文搜索 `refreshForest()`，全部替换为 `refreshTree()`。

- [ ] **Step 8：更新 `bindEvents` 函数**

  删除旧 bindEvents 中与旧 HTML 元素对应的绑定（dock, lang-toggle, cards, chip-streak, chip-today, guide-dots等），替换为：

  ```js
  function bindEvents() {
    // Back to landing
    document.getElementById('top-back')?.addEventListener('click', () => {
      window.location.href = '../landing.html';
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
      submitEntry(new Date().getFullYear());
    });
    document.getElementById('entry-text')?.addEventListener('input', updateCharCount);
    document.getElementById('entry-text')?.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submitEntry(new Date().getFullYear());
      if (e.key === 'Escape') closeModal();
    });

    // Branch panel
    document.getElementById('branch-panel-close')?.addEventListener('click', closeBranchPanel);

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
    document.getElementById('btn-reset-visited')?.addEventListener('click', () => {
      localStorage.removeItem(VISITED_KEY);
      localStorage.removeItem(ONBOARDED_KEY);
      closeSettings();
      showGuide();
    });

    // Guide
    document.getElementById('guide-next')?.addEventListener('click', () => {
      if (guideStep < GUIDE_TOTAL - 1) { guideStep++; updateGuideStep(guideStep); }
      else closeGuide();
    });
    document.getElementById('guide-skip')?.addEventListener('click', closeGuide);

    // Global keyboard
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeModal(); closeBranchPanel(); closeSearch(); closeSettings(); closeGuide(); }
    });
  }
  ```

- [ ] **Step 9：更新 Bootstrap `DOMContentLoaded`**

  找到末尾的 `window.addEventListener('DOMContentLoaded', ...)` 替换为：

  ```js
  window.addEventListener('DOMContentLoaded', () => {
    bindEvents();
    initApp();
    setTimeout(showGuide, 500);
  });
  ```

- [ ] **Step 10：更新 `openModal` — 移除旧的 year badge 和 date row 逻辑**

  新版 modal 没有 `#modal-year` 和 `#modal-date-row`，找到 `openModal` 函数，简化为：

  ```js
  function openModal(year, entryToEdit) {
    _editEntry = entryToEdit || null;
    const overlay  = document.getElementById('modal-overlay');
    const textarea = document.getElementById('entry-text');
    const label    = document.getElementById('modal-label');
    if (textarea) { textarea.value = entryToEdit ? entryToEdit.text : ''; updateCharCount(); }
    if (label)    label.textContent = entryToEdit ? '修改记录' : '今天最重要的一件事？';
    overlay?.classList.add('active');
    setTimeout(() => textarea?.focus(), 150);
  }
  ```

- [ ] **Step 11：验证 app 基本功能可用**

  打开 `app/index.html`，检查：
  - 页面不报 JS 错误（console 干净）
  - 顶栏显示日期，底栏可见
  - 点击「+」按钮弹出输入框
  - 写入文字保存后，树 canvas 重绘（stage 从 seed 变 sprout 或更高）
  - 刷新页面，树保持上次 stage

- [ ] **Step 12：Commit**

  ```bash
  cd /tmp/daily-tree
  git add app/app.js
  git commit -m "feat: rewire app.js to Canvas 2D tree, new UI bindings"
  ```

---

## Task 6：新手引导流（Guide）

**Files:**
- Modify: `app/app.js`（替换 guide 相关函数）

- [ ] **Step 1：找到并删除旧的 guide 函数**

  在 app.js 中搜索 `// ── Guide ──`，找到 `showGuide`, `closeGuide`, `updateGuideStep` 等函数，全部删除。

- [ ] **Step 2：插入新的 guide 函数**

  ```js
  // ── Guide ─────────────────────────────────────────────────────────────────

  const GUIDE_TOTAL = 3;
  let guideStep = 0;

  function showGuide() {
    if (localStorage.getItem(ONBOARDED_KEY) === 'true') return;
    // Draw guide tree preview on step 0
    const gc = document.getElementById('guide-tree-canvas');
    if (gc) drawTree(gc, 150, 7);  // show mature tree as preview
    document.getElementById('guide-overlay')?.classList.add('active');
    guideStep = 0;
    updateGuideStep(0);
  }

  function closeGuide() {
    localStorage.setItem(ONBOARDED_KEY, 'true');
    document.getElementById('guide-overlay')?.classList.remove('active');
  }

  function updateGuideStep(step) {
    document.querySelectorAll('.guide-step').forEach((el, i) => {
      el.classList.toggle('hidden', i !== step);
    });
    document.querySelectorAll('.guide-dot').forEach((el, i) => {
      el.classList.toggle('active', i === step);
    });
    const nextLabel = document.getElementById('guide-next-label');
    if (nextLabel) nextLabel.textContent = step < GUIDE_TOTAL - 1 ? '下一步' : '开始记录';
  }
  ```

- [ ] **Step 3：验证引导流**

  清除 `localStorage.daily_tree_onboarded`，刷新页面：
  - 引导全屏出现，第 0 步显示 canvas 树
  - 点「下一步」→ 第 1 步（FAB 示意）→ 第 2 步（树枝示意）→「开始记录」关闭引导
  - 再刷新页面 → 引导不再出现（已存 onboarded key）

- [ ] **Step 4：Commit**

  ```bash
  cd /tmp/daily-tree
  git add app/app.js
  git commit -m "feat: new 3-step onboarding guide with tree preview"
  ```

---

## Task 7：天气粒子系统

**Files:**
- Modify: `app/weather.js` (完整重写)

- [ ] **Step 1：将 `app/weather.js` 替换为以下完整内容**

  ```js
  // app/weather.js — Open-Meteo 天气 + Canvas 粒子层

  const WEATHER_KEY = 'daily_tree_weather';

  function wmoToCondition(code) {
    if (code === 0)                             return 'clear';
    if (code <= 2)                              return 'cloudy';
    if (code === 3)                             return 'overcast';
    if (code === 45 || code === 48)             return 'fog';
    if (code >= 51 && code <= 67)               return 'rain';
    if (code >= 71 && code <= 77)               return 'snow';
    if (code >= 80 && code <= 82)               return 'rain';
    if (code === 95 || code === 96 || code === 99) return 'storm';
    return 'cloudy';
  }

  async function fetchWeatherData() {
    // Use cached value if from today
    const cached = JSON.parse(sessionStorage.getItem(WEATHER_KEY) || 'null');
    if (cached) {
      const cachedDate = new Date(cached.ts).toDateString();
      if (cachedDate === new Date().toDateString()) return cached;
    }

    const pos = await new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('no geolocation'));
      navigator.geolocation.getCurrentPosition(
        p => resolve(p.coords),
        err => reject(err),
        { timeout: 6000, maximumAge: 3600000 }
      );
    });

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${pos.latitude}&longitude=${pos.longitude}&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('weather api error');
    const data = await resp.json();
    const c = data.current;
    const result = {
      code: c.weather_code,
      temp: Math.round(c.temperature_2m),
      wind: c.wind_speed_10m,
      condition: wmoToCondition(c.weather_code),
      ts: Date.now(),
    };
    sessionStorage.setItem(WEATHER_KEY, JSON.stringify(result));
    return result;
  }

  // ── Particle Systems ──

  class RainLayer {
    constructor(canvas, density = 1) {
      this.canvas = canvas;
      this.density = density;
      this.particles = [];
      this._init();
    }
    _init() {
      const count = Math.round(80 * this.density);
      const W = this.canvas.width, H = this.canvas.height;
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          speed: 6 + Math.random() * 6,
          drift: 0.5 + Math.random() * 1.2,
          len:   8 + Math.random() * 8,
          alpha: 0.2 + Math.random() * 0.3,
        });
      }
    }
    draw() {
      const ctx = this.canvas.getContext('2d');
      const W = this.canvas.width, H = this.canvas.height;
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(180, 220, 255, 0.5)';
      ctx.lineWidth = 1;
      this.particles.forEach(p => {
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.drift * 1.5, p.y + p.len);
        ctx.stroke();
        p.y += p.speed;
        p.x += p.drift;
        if (p.y > H) { p.y = -p.len; p.x = Math.random() * W; }
        if (p.x > W) { p.x = 0; }
      });
      ctx.globalAlpha = 1;
    }
  }

  class SnowLayer {
    constructor(canvas) {
      this.canvas = canvas;
      this.particles = [];
      this._init();
    }
    _init() {
      const W = this.canvas.width, H = this.canvas.height;
      for (let i = 0; i < 60; i++) {
        this.particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: 1.5 + Math.random() * 3,
          speed: 0.8 + Math.random() * 1.5,
          drift: (Math.random() - 0.5) * 0.8,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }
    draw() {
      const ctx = this.canvas.getContext('2d');
      const W = this.canvas.width, H = this.canvas.height;
      ctx.clearRect(0, 0, W, H);
      const t = Date.now() / 2000;
      this.particles.forEach(p => {
        const sway = Math.sin(t + p.phase) * 1.5;
        ctx.beginPath();
        ctx.arc(p.x + sway, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, 0.7)`;
        ctx.fill();
        p.y += p.speed;
        p.x += p.drift;
        if (p.y > H) { p.y = -p.r; p.x = Math.random() * W; }
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
      });
    }
  }

  // ── WeatherManager ──

  export class WeatherManager {
    constructor(weatherCanvas) {
      this.canvas = weatherCanvas;
      this.weather = null;
      this.layer = null;
      this.raf = null;
      this.fps = 60;
      this._lastFrame = 0;
    }

    async init() {
      try {
        this.weather = await fetchWeatherData();
        this._applyWeather(this.weather);
        this._updateTopBarWeather(this.weather);
      } catch (e) {
        // silent fail — no weather effects
      }
    }

    _applyWeather(w) {
      const condition = w.condition;
      const isWindy = w.wind > 5;

      if (condition === 'rain' || condition === 'storm') {
        this.layer = new RainLayer(this.canvas, condition === 'storm' ? 2 : 1);
      } else if (condition === 'snow') {
        this.layer = new SnowLayer(this.canvas);
      }

      if (this.layer) this._startLoop();
      // Wind sway: set CSS custom property for tree canvas animation
      if (isWindy) document.documentElement.style.setProperty('--wind-sway', '1');
    }

    _updateTopBarWeather(w) {
      const icons = { clear: '☀', cloudy: '⛅', overcast: '☁', fog: '🌫', rain: '🌧', snow: '❄', storm: '⛈' };
      const icon = icons[w.condition] || '🌡';
      const el = document.getElementById('top-weather');
      if (el) el.textContent = `${icon} ${w.temp}°`;
    }

    _startLoop() {
      const loop = (ts) => {
        if (!this.layer) return;
        const delta = ts - this._lastFrame;
        // Throttle to ~30fps on slow devices
        if (delta > 1000 / Math.min(this.fps, 30)) {
          this.layer.draw();
          this._lastFrame = ts;
        }
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    }

    stop() {
      if (this.raf) cancelAnimationFrame(this.raf);
      this.layer = null;
    }
  }
  ```

- [ ] **Step 2：在 `app/index.html` 的 `#top-right` div 中补充 weather 元素**

  找到：
  ```html
  <div class="top-right" id="top-right">
    <span class="top-reminder" id="top-reminder">✦ 今天还没记录</span>
  </div>
  ```

  替换为：
  ```html
  <div class="top-right" id="top-right">
    <span class="top-reminder" id="top-reminder">✦ 今天还没记录</span>
    <span class="top-weather" id="top-weather" style="display:none"></span>
  </div>
  ```

- [ ] **Step 3：验证天气系统**

  打开 app，允许位置权限：
  - 控制台不应出现 uncaught error（仅 warn 级别可接受）
  - 如果当地有雨/雪，weather canvas 上应出现粒子
  - 顶栏已记录后应显示天气图标 + 温度（替换提醒 badge）
  - 拒绝位置权限 → 无特效，无报错

- [ ] **Step 4：Commit**

  ```bash
  cd /tmp/daily-tree
  git add app/weather.js app/index.html
  git commit -m "feat: weather particle system with rain/snow effects"
  ```

---

## Task 8：Search 和 Settings 逻辑对齐

**Files:**
- Modify: `app/app.js`

> 旧版 search 和 settings 使用了 `YEARS_TO_SHOW`、`currentLang` 等已删除的变量。检查并修复。

- [ ] **Step 1：检查 search 相关函数 (`openSearch`, `closeSearch`, `renderSearchResults`)**

  在 app.js 中找到这些函数，确认：
  - `renderSearchResults` 中的结果渲染使用新的 CSS class 名（`search-result-item`, `search-result-date`, `search-result-text`）
  - 如果有 `currentLang === 'zh'` 的条件语句，简化为固定中文（本次设计移除了语言切换）

  将 `renderSearchResults` 替换为：

  ```js
  function renderSearchResults(query) {
    const list = document.getElementById('search-results');
    if (!list) return;
    if (!query.trim()) { list.innerHTML = ''; return; }

    const entries = loadEntries();
    const allEntries = Object.values(entries).flat();
    const q = query.toLowerCase();
    const matches = allEntries.filter(e => e.text.toLowerCase().includes(q))
      .sort((a, b) => b.date < a.date ? -1 : 1)
      .slice(0, 30);

    list.innerHTML = '';
    if (matches.length === 0) {
      const li = document.createElement('li');
      li.className = 'search-empty';
      li.textContent = '没有找到相关记录';
      list.appendChild(li);
      return;
    }
    matches.forEach(entry => {
      const li = document.createElement('li');
      li.className = 'search-result-item';
      const date = new Date(entry.date);
      const dateStr = date.toLocaleDateString('zh-CN', { year:'numeric', month:'long', day:'numeric' });
      const highlighted = escapeHtml(entry.text).replace(
        new RegExp(escapeHtml(q), 'gi'),
        m => `<mark>${m}</mark>`
      );
      li.innerHTML = `<div class="search-result-date">${dateStr}</div><div class="search-result-text">${highlighted}</div>`;
      list.appendChild(li);
    });
  }
  ```

- [ ] **Step 2：移除旧的 `computeStreak`、`updateStreakChip`、`updateTodayChip`**

  这些函数引用已不存在的 DOM 元素（`#chip-streak` 等）。删除这三个函数，以及它们在 `bindEvents` 和 `initApp` 中的调用。

- [ ] **Step 3：修复 `showSaveSuccess` 和 `spawnParticles` 中的旧 DOM 引用**

  `showSaveSuccess` 引用了已改名的 canvas，`spawnParticles` 引用了已改名的容器 class，需要更新：

  找到 `showSaveSuccess` 函数，将：
  ```js
  const canvas = document.getElementById('forest-canvas');
  ```
  替换为：
  ```js
  const canvas = document.getElementById('tree-canvas');
  ```

  找到 `spawnParticles` 函数，将：
  ```js
  const container = document.querySelector('.main-canvas');
  ```
  替换为：
  ```js
  const container = document.querySelector('.canvas-wrap');
  ```

- [ ] **Step 4：保留 `exportBackup` 和 `importBackup` 函数不变**

  这两个函数只依赖 `loadEntries` / `saveEntries`，无需修改。

- [ ] **Step 4：整体验证**

  打开 app，测试以下流程：
  - 写一条记录 → 保存 → 树重绘 → 顶栏提醒消失
  - 点树枝区域 → branch panel 弹出，显示记录列表
  - 搜索按钮 → 输入关键词 → 结果高亮显示
  - 设置 → 导出备份 → 下载 JSON 文件
  - ← Daily Tree 按钮 → 跳转 landing.html

- [ ] **Step 5：Commit**

  ```bash
  cd /tmp/daily-tree
  git add app/app.js
  git commit -m "feat: align search and settings to new UI, remove streak chip"
  ```

---

## Task 9：端到端冒烟测试 + 最终清理

**Files:**
- Modify: `landing.html`（如 Step 1 中有遗留问题）
- Read-only verification

- [ ] **Step 1：完整首次访问流程测试**

  1. 清除 localStorage 和 sessionStorage（DevTools → Application → Clear Storage）
  2. 打开 `landing.html` → 应正常显示 landing（不跳转）
  3. 点「免费开始」→ 跳转 `app/index.html`
  4. 引导流出现，走完 3 步
  5. 关闭引导后树可见
  6. 写入一条记录，保存，树 stage 应该从 seed/sprout 变化
  7. 刷新 `landing.html` → 应立即跳转 `app/index.html`（已 visited）
  8. app 内顶栏「← Daily Tree」→ 跳回 landing

- [ ] **Step 2：检查 console 无 uncaught error**

  打开浏览器 DevTools，确认 Console 面板：
  - 没有红色 error（404、TypeError、ReferenceError 等）
  - 允许 yellow warning（如 geolocation 被拒）

- [ ] **Step 3：确认 `app/webgl/` 不被加载**

  检查 Network 面板，确认没有对 `webgl/three.js`、`webgl/tree.js`、`webgl/scene.js` 的请求。

- [ ] **Step 4：最终 Commit**

  ```bash
  cd /tmp/daily-tree
  git add -A
  git status   # 确认无意外文件
  git commit -m "feat: complete app redesign — canvas tree, weather, onboarding, routing"
  ```

---

## 自检 — Spec 覆盖验证

| Spec 需求 | 对应 Task |
|----------|-----------|
| 首次访问才经过 landing | Task 1 |
| app 内返回 landing 入口 | Task 5 (top-back button) |
| 配色和交互对齐 landing | Task 2, 3 |
| 树形：6 生长阶段 | Task 4 |
| 树形：活力度影响叶片 | Task 4 (getPalette) |
| 点击树枝查看记录 | Task 5 (onTreeClick, openBranchPanel) |
| 新手引导 3 步 | Task 6 |
| 今日未记录提醒（顶栏） | Task 5 (updateTopBar) |
| 底部打卡条形图 | Task 5 (updateBottomBar) |
| 天气 API Open-Meteo | Task 7 |
| 雨滴粒子 | Task 7 (RainLayer) |
| 雪花粒子 | Task 7 (SnowLayer) |
| 风速 > 5m/s 标记 | Task 7 (--wind-sway CSS var) |
| 位置拒绝降级 | Task 7 (try/catch) |
| 天气 sessionStorage 缓存 | Task 7 (fetchWeatherData) |
