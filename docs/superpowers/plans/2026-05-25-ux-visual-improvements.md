# Daily Tree UX & Visual Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 landing page 引导卡片文案和交互、提升雨天视觉效果、修复 App 引导第三步树形、新增底部「树」按钮成长阶段预览面板。

**Architecture:** 纯前端改动，无新依赖。Landing page 重组 HTML 结构（大 CTA 优先 + 折叠卡片区）；App 扩展现有 showGuide() 和 btn-tree 事件处理；weather.js 只调参数。

**Tech Stack:** Vanilla JS (ES modules), Canvas API, CSS, localStorage

---

## 文件清单

| 文件 | 改动类型 | 说明 |
|------|---------|------|
| `landing.html` | Modify | 文案修复 + 结构重组（hero + 折叠卡片） |
| `app/index.html` | Modify | guide-step-2 替换 SVG → canvas；新增 stage-panel HTML |
| `app/app.js` | Modify | showGuide() 初始化 canvas-2；btn-tree 改为 openStagePanel；新增 openStagePanel/closeStagePanel |
| `app/weather.js` | Modify | RainLayer 调参 |
| `app/style.css` | Modify | 新增 stage-panel 样式 |

---

## Task 1：Landing 文案修复

**Files:**
- Modify: `landing.html:453`

- [ ] **Step 1: 修改第三张卡片标题**

找到 `landing.html` 第 453 行：
```html
<div class="card-title">第 <em>47</em> 天，<br>别断掉。</div>
```
改为：
```html
<div class="card-title">坚持，<em>别中断。</em></div>
```

- [ ] **Step 2: 验证**

在浏览器打开 `landing.html`（或已部署地址），滑到第三张卡，确认标题显示「坚持，别中断。」

- [ ] **Step 3: Commit**

```bash
git add landing.html
git commit -m "fix: update card #3 copy from '第47天' to '坚持别中断'"
```

---

## Task 2：雨天效果增强

**Files:**
- Modify: `app/weather.js:59-77`

- [ ] **Step 1: 调整 RainLayer 参数**

找到 `weather.js` `RainLayer._init()` 和 `draw()` 方法，做以下修改：

```js
// _init() 里
const count = Math.round(160 * this.density);   // 原来是 80
// ...
this.particles.push({
  x: Math.random() * W,
  y: Math.random() * H,
  speed: 6 + Math.random() * 6,
  drift: 0.5 + Math.random() * 1.2,
  len:   14 + Math.random() * 12,              // 原来是 8 + random * 8
  alpha: 0.45 + Math.random() * 0.3,           // 原来是 0.2 + random * 0.3
});

// draw() 里
ctx.strokeStyle = 'rgba(200, 230, 255, 0.65)'; // 原来是 rgba(180, 220, 255, 0.5)
ctx.lineWidth = 1.2;                            // 原来是 1
```

- [ ] **Step 2: 验证**

在设置页面将天气强制设为 rain（或修改 `wmoToCondition` 临时返回 `'rain'`），打开 App 确认雨粒明显可见但树主体清晰。

- [ ] **Step 3: Commit**

```bash
git add app/weather.js
git commit -m "feat: increase rain visibility (density x2, higher alpha and length)"
```

---

## Task 3：引导第三步替换真实 Canvas 树

**Files:**
- Modify: `app/index.html:184-198`
- Modify: `app/app.js:572-587`

- [ ] **Step 1: 替换 index.html 中 guide-step-2 的 SVG**

找到 `app/index.html` `#guide-step-2`（当前约第 184 行），将内部 `.guide-visual` 里的 SVG 全部替换为 canvas：

```html
<div class="guide-step hidden" id="guide-step-2">
  <div class="guide-visual">
    <canvas id="guide-tree-canvas-2" width="160" height="220"></canvas>
  </div>
  <h2 class="guide-title">点击树枝，回顾过去</h2>
  <p class="guide-desc">树的不同部位对应不同时期的记录，点击树枝可以查看那段时间写的内容。</p>
</div>
```

- [ ] **Step 2: 在 app.js showGuide() 中初始化 canvas-2**

找到 `showGuide()` 函数（约第 572 行），在 `guideCanvas` 初始化块之后添加：

```js
function showGuide() {
  if (localStorage.getItem(ONBOARDED_KEY)) return;
  document.getElementById('guide-overlay')?.classList.add('active');
  guideStep = 0;
  updateGuideStep(0);

  const dpr = devicePixelRatio || 1;
  const GW = 160, GH = 220;

  const guideCanvas = document.getElementById('guide-tree-canvas');
  if (guideCanvas) {
    guideCanvas.style.width  = GW + 'px';
    guideCanvas.style.height = GH + 'px';
    guideCanvas.width  = GW * dpr;
    guideCanvas.height = GH * dpr;
    drawTree(guideCanvas, 20, 12345);
  }

  // 新增：step-2 用 young 阶段树（35天，有明显分叉枝条）
  const guideCanvas2 = document.getElementById('guide-tree-canvas-2');
  if (guideCanvas2) {
    guideCanvas2.style.width  = GW + 'px';
    guideCanvas2.style.height = GH + 'px';
    guideCanvas2.width  = GW * dpr;
    guideCanvas2.height = GH * dpr;
    drawTree(guideCanvas2, 35, 12345);
  }
}
```

- [ ] **Step 3: 验证**

打开 App 重置引导（设置 → 重置引导），进入第三步，确认显示有分叉枝条的真实树形（不再是简笔 SVG）。

- [ ] **Step 4: Commit**

```bash
git add app/index.html app/app.js
git commit -m "fix: replace guide step-2 SVG with real canvas tree (young stage)"
```

---

## Task 4：Landing Page CTA 重构

**Files:**
- Modify: `landing.html`（HTML 结构 + 内联 JS）

### 目标结构

```
#stage            ← 保留背景动画
#hero-cta         ← 新增：hero 文字 + 立即开始按钮（默认可见）
#philosophy-toggle ← 新增：折叠区标题「💡 了解产品理念 ▾」
#cards-stage      ← 改为默认隐藏，点击 toggle 展开
```

- [ ] **Step 1: 在 `#cards-stage` 上方插入 hero + toggle**

在 `landing.html` 中找到 `<div id="cards-stage">` 这行，在其**前面**插入：

```html
<div id="hero-cta">
  <p class="hero-sub">每天记一件事，看见自己成长</p>
  <a class="btn-p hero-btn" onclick="goApp();return false;" href="#">立即开始 →</a>
  <button id="philosophy-toggle" onclick="togglePhilosophy()" aria-expanded="false">
    <span id="philosophy-toggle-label">💡 了解产品理念</span>
    <span id="philosophy-arrow">▾</span>
  </button>
</div>
```

- [ ] **Step 2: 给 `#cards-stage` 添加 collapsed 默认状态**

找到 `<div id="cards-stage">` 改为：
```html
<div id="cards-stage" class="collapsed">
```

- [ ] **Step 3: 在 CSS `<style>` 区块中添加新样式**

找到 CSS `#final-cta` 附近，插入：

```css
#hero-cta {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px 24px 36px;
  background: linear-gradient(to top, rgba(0,0,0,0.85) 60%, transparent);
  z-index: 20;
}
.hero-btn {
  width: 100%;
  max-width: 320px;
  padding: 16px;
  font-size: 16px;
  font-weight: 700;
  text-align: center;
}
.hero-sub {
  font-size: 13px;
  color: rgba(255,255,255,0.4);
  margin: 0;
}
#philosophy-toggle {
  background: none;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 20px;
  padding: 7px 16px;
  color: rgba(255,255,255,0.45);
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}
#philosophy-arrow {
  display: inline-block;
  transition: transform 0.25s ease;
}
#philosophy-toggle[aria-expanded="true"] #philosophy-arrow {
  transform: rotate(180deg);
}
#cards-stage.collapsed {
  display: none;
}
```

- [ ] **Step 4: 添加 `togglePhilosophy()` JS 函数**

在 `landing.html` 的 `<script>` 区块中，找到 `function goApp()` 附近，添加：

```js
function togglePhilosophy() {
  const stage = document.getElementById('cards-stage');
  const toggle = document.getElementById('philosophy-toggle');
  const isOpen = !stage.classList.contains('collapsed');
  stage.classList.toggle('collapsed', isOpen);
  toggle.setAttribute('aria-expanded', String(!isOpen));
}
```

- [ ] **Step 5: 隐藏旧的 `#final-cta`**

现有 `#final-cta` 只在滑完所有卡片后出现，现在有了常驻 CTA，不再需要它在卡片外出现。找到 CSS：
```css
#final-cta { ... }
```
将其 `display` 改为 `none`（或直接从 HTML 删除 `<div id="final-cta">` 块），以避免双 CTA：

```css
#final-cta { display: none !important; }
```

- [ ] **Step 6: 验证**

打开 `landing.html`：
1. 默认看到底部「立即开始」按钮和「💡 了解产品理念」
2. 点击「了解产品理念」展开三张卡片
3. 再次点击收起
4. 「立即开始」点击跳转到 `app/index.html`

- [ ] **Step 7: Commit**

```bash
git add landing.html
git commit -m "feat: restructure landing CTA — hero button always visible, philosophy cards collapsible"
```

---

## Task 5：底部「树」按钮 — 成长阶段预览面板

**Files:**
- Modify: `app/index.html`（添加 panel HTML）
- Modify: `app/style.css`（添加 panel 样式）
- Modify: `app/app.js`（替换 btn-tree 事件 + 新增 open/close 函数）

### 阶段配置数据

```js
const STAGE_CONFIG = [
  { key: 'seed',    label: '种子',  emoji: '🌰', unlock: 1,   renderDays: 1,   desc: '万物始于一粒种子' },
  { key: 'sprout',  label: '嫩芽',  emoji: '🌱', unlock: 3,   renderDays: 3,   desc: '破土而出，生命开始' },
  { key: 'sapling', label: '幼苗',  emoji: '🪴', unlock: 7,   renderDays: 15,  desc: '第一片叶，扎根成形' },
  { key: 'young',   label: '青树',  emoji: '🌿', unlock: 30,  renderDays: 50,  desc: '枝条分叉，树冠成型' },
  { key: 'mature',  label: '壮年树', emoji: '🌳', unlock: 90,  renderDays: 180, desc: '繁茂深根，见证岁月' },
  { key: 'ancient', label: '古树',  emoji: '🌲', unlock: 300, renderDays: 400, desc: '历经风雨，屹立不倒' },
];
```

当前阶段由 `dayCount` 决定：取 `STAGE_CONFIG` 中最后一个 `unlock <= dayCount` 的项。

- [ ] **Step 1: 在 `app/index.html` 末尾（`</body>` 前）添加面板 HTML**

```html
<!-- ── Stage Preview Panel ── -->
<div class="stage-panel-overlay" id="stage-panel-overlay"></div>
<div class="stage-panel" id="stage-panel" role="dialog" aria-modal="true" aria-label="成长阶段">
  <div class="stage-panel-handle"></div>
  <div class="stage-panel-header">树的一生</div>

  <div class="stage-panel-body">
    <div class="stage-panel-label">当前阶段</div>
    <div class="stage-current">
      <canvas id="stage-canvas" width="100" height="130"></canvas>
      <div class="stage-current-info">
        <div class="stage-current-name" id="stage-current-name"></div>
        <div class="stage-current-desc" id="stage-current-desc"></div>
      </div>
    </div>

    <div class="stage-next-row" id="stage-next-row">
      <span class="stage-next-label" id="stage-next-label"></span>
    </div>
    <div class="stage-progress-bar"><div class="stage-progress-fill" id="stage-progress-fill"></div></div>

    <div class="stage-path" id="stage-path"></div>
  </div>
</div>
```

- [ ] **Step 2: 在 `app/style.css` 末尾添加 panel 样式**

```css
/* ── Stage Panel ── */
.stage-panel-overlay {
  position: fixed; inset: 0; z-index: 39;
  background: rgba(0,0,0,0.5);
  opacity: 0; pointer-events: none;
  transition: opacity 0.25s ease;
}
.stage-panel-overlay.open { opacity: 1; pointer-events: all; }

.stage-panel {
  position: fixed; bottom: 0; left: 0; right: 0;
  z-index: 40;
  background: #071410;
  border-radius: 20px 20px 0 0;
  padding: 12px 20px 40px;
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
}
.stage-panel.open { transform: translateY(0); }

.stage-panel-handle {
  width: 36px; height: 4px;
  background: rgba(255,255,255,0.15);
  border-radius: 2px;
  margin: 0 auto 14px;
}
.stage-panel-header {
  font-size: 14px; font-weight: 600;
  color: rgba(200,240,200,0.8);
  text-align: center;
  margin-bottom: 18px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
}
.stage-panel-label {
  font-size: 10px; letter-spacing: .08em;
  color: rgba(255,255,255,0.3);
  margin-bottom: 10px;
}
.stage-current {
  display: flex; gap: 14px; align-items: center;
  margin-bottom: 16px;
}
#stage-canvas {
  border-radius: 10px;
  background: rgba(74,140,92,0.1);
  border: 1.5px solid rgba(74,140,92,0.35);
  flex-shrink: 0;
}
.stage-current-info { flex: 1; }
.stage-current-name {
  font-size: 18px; font-weight: 700;
  color: #6dc88a; margin-bottom: 5px;
}
.stage-current-desc {
  font-size: 12px; line-height: 1.6;
  color: rgba(255,255,255,0.4);
}
.stage-next-row {
  margin-bottom: 6px;
  font-size: 12px; color: rgba(255,255,255,0.4);
}
.stage-next-label em { color: #6dc88a; font-style: normal; font-weight: 600; }
.stage-progress-bar {
  height: 3px; background: rgba(255,255,255,0.08);
  border-radius: 2px; overflow: hidden; margin-bottom: 20px;
}
.stage-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4a8c5c, #6dc88a);
  border-radius: 2px;
  transition: width 0.4s ease;
}
.stage-path {
  display: flex; justify-content: space-between; align-items: center;
  padding-top: 14px;
  border-top: 1px solid rgba(255,255,255,0.06);
}
.stage-path-item {
  text-align: center; flex: 1;
}
.stage-path-emoji {
  font-size: 20px; display: block;
  transition: opacity 0.2s;
}
.stage-path-item.locked .stage-path-emoji { opacity: 0.2; }
.stage-path-item.current .stage-path-emoji {
  font-size: 26px;
  filter: drop-shadow(0 0 6px rgba(109,200,138,0.5));
}
```

- [ ] **Step 3: 在 `app/app.js` 顶部常量区域添加 STAGE_CONFIG**

在 `const ONBOARDED_KEY` 附近（约第 6 行）添加：

```js
const STAGE_CONFIG = [
  { key: 'seed',    label: '种子',   emoji: '🌰', unlock: 1,   renderDays: 1,   desc: '万物始于一粒种子' },
  { key: 'sprout',  label: '嫩芽',   emoji: '🌱', unlock: 3,   renderDays: 3,   desc: '破土而出，生命开始' },
  { key: 'sapling', label: '幼苗',   emoji: '🪴', unlock: 7,   renderDays: 15,  desc: '第一片叶，扎根成形' },
  { key: 'young',   label: '青树',   emoji: '🌿', unlock: 30,  renderDays: 50,  desc: '枝条分叉，树冠成型' },
  { key: 'mature',  label: '壮年树', emoji: '🌳', unlock: 90,  renderDays: 180, desc: '繁茂深根，见证岁月' },
  { key: 'ancient', label: '古树',   emoji: '🌲', unlock: 300, renderDays: 400, desc: '历经风雨，屹立不倒' },
];
```

- [ ] **Step 4: 在 `app/app.js` 中添加 `openStagePanel` 和 `closeStagePanel` 函数**

在 `closeGuide()` 函数之后（约第 603 行）添加：

```js
function openStagePanel() {
  const dayCount = computeTotalDaysThisYear();

  // 当前阶段：STAGE_CONFIG 中 unlock <= dayCount 的最后一项
  let curIdx = 0;
  for (let i = 0; i < STAGE_CONFIG.length; i++) {
    if (dayCount >= STAGE_CONFIG[i].unlock) curIdx = i;
  }
  const cur = STAGE_CONFIG[curIdx];
  const next = STAGE_CONFIG[curIdx + 1] || null;

  // 渲染当前阶段树形 canvas
  const canvas = document.getElementById('stage-canvas');
  if (canvas) {
    const dpr = devicePixelRatio || 1;
    canvas.style.width  = '100px';
    canvas.style.height = '130px';
    canvas.width  = 100 * dpr;
    canvas.height = 130 * dpr;
    drawTree(canvas, cur.renderDays, 12345);
  }

  // 填充文字
  document.getElementById('stage-current-name').textContent = cur.label;
  document.getElementById('stage-current-desc').textContent = cur.desc;

  // 下一阶段倒计时
  const nextRow = document.getElementById('stage-next-row');
  const progressFill = document.getElementById('stage-progress-fill');
  if (next) {
    const daysLeft = next.unlock - dayCount;
    document.getElementById('stage-next-label').innerHTML =
      `再 <em>${daysLeft}</em> 天 → ${next.label}`;
    const prevUnlock = cur.unlock;
    const span = next.unlock - prevUnlock;
    const progress = Math.min(100, ((dayCount - prevUnlock) / span) * 100);
    progressFill.style.width = progress + '%';
    nextRow.style.display = '';
  } else {
    nextRow.style.display = 'none';
    progressFill.style.width = '100%';
  }

  // 底部路径
  const pathEl = document.getElementById('stage-path');
  pathEl.innerHTML = STAGE_CONFIG.map((s, i) => `
    <div class="stage-path-item ${i === curIdx ? 'current' : i > curIdx ? 'locked' : ''}">
      <span class="stage-path-emoji">${s.emoji}</span>
    </div>
  `).join('');

  document.getElementById('stage-panel').classList.add('open');
  document.getElementById('stage-panel-overlay').classList.add('open');
}

function closeStagePanel() {
  document.getElementById('stage-panel').classList.remove('open');
  document.getElementById('stage-panel-overlay').classList.remove('open');
}
```

- [ ] **Step 5: 替换 `btn-tree` 事件处理**

找到（约第 626 行）：
```js
document.getElementById('btn-tree')?.addEventListener('click', () => {
  const total = computeTotalDaysThisYear();
  openBranchPanel(total >= 91 ? 'recent' : 'early');
});
```
替换为：
```js
document.getElementById('btn-tree')?.addEventListener('click', openStagePanel);
```

- [ ] **Step 6: 添加 overlay 点击关闭**

在上方事件绑定区找到 `branch-panel-close` 附近，添加：
```js
document.getElementById('stage-panel-overlay')?.addEventListener('click', closeStagePanel);
```

并在 Escape 键处理（约第 682 行）的 `closeGuide()` 后追加 `closeStagePanel()`：
```js
if (e.key === 'Escape') { closeModal(); closeBranchPanel(); closeSettings(); closeGuide(); closeStagePanel(); }
```

- [ ] **Step 7: 验证**

1. 打开 App，点击底部「树」图标
2. 面板从底部弹出，显示当前阶段名称、真实树形 canvas、倒计时
3. 底部路径显示所有 6 个阶段 emoji，已解锁高亮，未解锁淡化
4. 点击灰色背景或按 Escape 关闭面板

- [ ] **Step 8: Commit**

```bash
git add app/index.html app/style.css app/app.js
git commit -m "feat: add stage preview panel to tree nav button"
```

---

## Task 6：推送并验证部署

- [ ] **Step 1: 推送到 main**

```bash
git push origin worktree-fix-google-fonts
# 然后合并到 main（或在 GitHub 创建 PR）
```

- [ ] **Step 2: 确认 GitHub Actions 部署成功**

```bash
gh run list --repo nuts-and-bytes/daily-tree --limit 3
```

期望输出：最新一条状态为 `completed success`。

- [ ] **Step 3: 手机验证**

在手机上打开 `https://nuts-and-bytes.github.io/daily-tree/`：
1. Landing 底部直接看到「立即开始」按钮
2. 点「了解产品理念」展开三张卡片，第三张显示「坚持，别中断。」
3. 进入 App，重置引导，第三步看到真实树形
4. 底部「树」按钮弹出成长阶段面板
5. 雨天（可改 weather mock）雨粒明显可见
