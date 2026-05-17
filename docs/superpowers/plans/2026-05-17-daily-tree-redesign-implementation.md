# Daily Tree 重设计 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Daily Tree 从抽象树形升级为高逼真树形，支持完整的成长动画、天气系统、季节变化和交互功能。

**Architecture:** 
- **Landing Page：** 使用卡片系统展示三阶段和四季，每个卡片下方动态加载对应的树（SVG 或 Canvas）
- **应用内树：** 重构 Three.js 树建模，支持侧视图、高逼真形态、动态成长、拖动旋转
- **天气系统：** 集成天气 API，实现动态背景渲染和季节色变
- **交互：** 实现卡片滑动、打卡选择、树的旋转和编辑功能

**Tech Stack:** Three.js, HTML5 Canvas, Geolocation API, Weather API, CSS3 Animation

---

## Phase 1：基础树形和成长规则

### Task 1: 修改树的成长规则系统

**Files:**
- Modify: `app/app.js` (数据模型层)
- Modify: `app/webgl/tree.js` (树的视觉表现)

**目标：** 从"按记录数成长"改为"按连续记录天数成长"，实现里程碑概念。

- [ ] **Step 1: 理解当前的树形数据结构**

打开 `app/app.js` 和 `app/webgl/tree.js`，找到：
- 当前如何存储每年的记录数
- 树的 `entryCount` 如何被使用
- Tree 类的构造函数和 `_build()` 方法

- [ ] **Step 2: 在数据模型中添加"连续记录天数"追踪**

修改 `app/app.js` 中的数据存储结构。找到本地存储的数据格式（可能在 localStorage 或 IndexedDB），为每年的数据添加：

```javascript
// 在应用的数据模型中添加
const yearData = {
  year: 2026,
  entries: { /* 现有的日期->内容映射 */ },
  lastEntryDate: '2026-05-17', // 最后一次记录的日期
  streakDays: 7, // 连续记录天数（当前计算值，不需要存储）
  maxStreakDays: 30, // 历史最高 streak
}
```

计算连续记录天数的函数：

```javascript
function calculateStreak(year, today = new Date()) {
  const entries = yearData.entries; // { '2026-05-17': 'content', ... }
  let streak = 0;
  let checkDate = new Date(today);
  
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0]; // YYYY-MM-DD
    if (entries[dateStr]) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
```

- [ ] **Step 3: 添加树的成长阶段映射**

在 `app/webgl/tree.js` 中，添加一个函数将连续天数映射到树的阶段：

```javascript
// 树的成长阶段定义
const GROWTH_STAGES = {
  0: { name: 'seed', label: '种子' },
  1: { name: 'sprout', label: '芽', dayRange: [1, 6] },
  7: { name: 'seedling', label: '小植株', dayRange: [7, 14] },
  15: { name: 'sapling', label: '小树', dayRange: [15, 29] },
  30: { name: 'young-tree', label: '小成树', dayRange: [30, 179] },
  180: { name: 'mature-tree', label: '成树', dayRange: [180, 364] },
  365: { name: 'ancient-tree', label: '古树', dayRange: [365, Infinity] },
};

function getGrowthStage(streakDays) {
  const milestones = [365, 180, 30, 15, 7, 1, 0];
  for (const milestone of milestones) {
    if (streakDays >= milestone) {
      return GROWTH_STAGES[milestone];
    }
  }
  return GROWTH_STAGES[0];
}
```

- [ ] **Step 4: 修改 Tree 类构造函数，使用 streakDays 代替 entryCount**

在 `app/webgl/tree.js` 中修改：

```javascript
export class Tree {
  constructor(year, streakDays, options) {
    this.year = year;
    this.streakDays = streakDays || 0;  // 改用 streakDays
    this.THREE = options.THREE || window.THREE;
    this.lastEntryDate = options.lastEntryDate || null;
    this.isCurrentYear = (year === new Date().getFullYear());
    
    this.group = new this.THREE.Group();
    this.currentStage = getGrowthStage(this.streakDays);
    
    this._build();
  }
  
  updateStreak(newStreakDays) {
    const oldStage = this.currentStage.name;
    this.streakDays = newStreakDays;
    this.currentStage = getGrowthStage(this.streakDays);
    
    // 如果阶段改变了，重新构建树
    if (oldStage !== this.currentStage.name) {
      this._rebuildForStage();
    } else {
      // 否则只做渐进式的微小增长
      this._incrementalGrow();
    }
  }
}
```

- [ ] **Step 5: 在 app.js 中更新调用 Tree 的地方**

在应用加载和新增记录时，计算最新的 streakDays 并传给 Tree：

```javascript
// 加载某年的树时
const streak = calculateStreak(yearData);
const tree = new Tree(2026, streak, {
  THREE: THREE,
  lastEntryDate: yearData.lastEntryDate,
});
scene.add(tree.group);

// 新增记录时
yearData.entries[todayStr] = content;
yearData.lastEntryDate = todayStr;
const newStreak = calculateStreak(yearData);
currentTree.updateStreak(newStreak);
```

- [ ] **Step 6: 提交**

```bash
git add app/app.js app/webgl/tree.js
git commit -m "feat: switch tree growth from entry count to consecutive days with milestone stages"
```

---

### Task 2: 重构树的 3D 建模 — 实现高逼真侧视图

**Files:**
- Modify: `app/webgl/tree.js` (完全重写树的构建逻辑)
- Create: `app/webgl/tree-models.js` (按阶段的树形定义)

**目标：** 用 Three.js 的 TubeGeometry 和 InstancedMesh 构建真实树形，支持树干、树杈、叶片和根系。

- [ ] **Step 1: 创建树形定义文件**

创建 `app/webgl/tree-models.js`：

```javascript
// 定义每个阶段的树形参数
export const TREE_MODELS = {
  seed: {
    trunkRadius: 0.05,
    trunkHeight: 0.1,
    leafCount: 0,
    rootCount: 0,
    rootDepth: 0.05,
  },
  sprout: {
    trunkRadius: 0.08,
    trunkHeight: 0.3,
    leafCount: 3,
    rootCount: 1,
    rootDepth: 0.08,
  },
  seedling: {
    trunkRadius: 0.1,
    trunkHeight: 0.5,
    leafCount: 8,
    branchCount: 2,
    rootCount: 2,
    rootDepth: 0.12,
  },
  sapling: {
    trunkRadius: 0.15,
    trunkHeight: 0.8,
    leafCount: 20,
    branchCount: 4,
    rootCount: 3,
    rootDepth: 0.15,
  },
  'young-tree': {
    trunkRadius: 0.2,
    trunkHeight: 1.2,
    leafCount: 40,
    branchCount: 6,
    rootCount: 4,
    rootDepth: 0.2,
  },
  'mature-tree': {
    trunkRadius: 0.25,
    trunkHeight: 1.5,
    leafCount: 80,
    branchCount: 8,
    rootCount: 4,
    rootDepth: 0.25,
  },
  'ancient-tree': {
    trunkRadius: 0.3,
    trunkHeight: 2.0,
    leafCount: 150,
    branchCount: 10,
    rootCount: 4,
    rootDepth: 0.3,
  },
};

// 树干曲线的参数（使 trunk 有机地弯曲）
export function getTrunkCurve(height) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.05, height * 0.3, 0),
    new THREE.Vector3(0.02, height * 0.7, 0.02),
    new THREE.Vector3(0, height, 0.05),
  ]);
  return curve;
}

// 树枝位置和方向
export function getBranchPositions(stage, count) {
  const branches = [];
  const positions = [];
  
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const height = 0.4 + (i % 3) * 0.3; // 分层出现
    const direction = new THREE.Vector3(
      Math.cos(angle) * 0.3,
      0.5 + Math.random() * 0.2,
      Math.sin(angle) * 0.3
    ).normalize();
    
    branches.push({
      startPos: new THREE.Vector3(0, height, 0),
      direction: direction,
      length: 0.6 + Math.random() * 0.3,
    });
  }
  return branches;
}
```

- [ ] **Step 2: 完全重写 Tree 类的 _build() 方法**

在 `app/webgl/tree.js` 中，添加导入并重写：

```javascript
import { TREE_MODELS, getTrunkCurve, getBranchPositions } from './tree-models.js';

// 在 Tree 类中
_build() {
  this.group.clear(); // 清除旧的树
  
  const model = TREE_MODELS[this.currentStage.name];
  
  // 1. 构建树干
  this._buildTrunk(model);
  
  // 2. 构建树枝
  if (model.branchCount > 0) {
    this._buildBranches(model);
  }
  
  // 3. 构建树叶
  if (model.leafCount > 0) {
    this._buildLeaves(model);
  }
  
  // 4. 构建根系
  if (model.rootCount > 0) {
    this._buildRoots(model);
  }
  
  // 5. 添加发光效果
  this._addGlow();
}

_buildTrunk(model) {
  const curve = getTrunkCurve(model.trunkHeight);
  const points = curve.getPoints(20);
  
  // 使用 TubeGeometry 沿曲线创建树干
  const geometry = new this.THREE.TubeGeometry(curve, 20, model.trunkRadius, 6, false);
  const material = new this.THREE.MeshPhongMaterial({
    color: 0x8B6F47, // 树干棕色
    side: this.THREE.FrontSide,
  });
  
  const trunk = new this.THREE.Mesh(geometry, material);
  this.group.add(trunk);
}

_buildBranches(model) {
  const branches = getBranchPositions(this.currentStage, model.branchCount);
  
  for (const branch of branches) {
    const curve = new this.THREE.LineCurve3(
      branch.startPos,
      branch.startPos.clone().add(branch.direction.multiplyScalar(branch.length))
    );
    
    const geometry = new this.THREE.TubeGeometry(curve, 8, 0.08, 4, false);
    const material = new this.THREE.MeshPhongMaterial({
      color: 0x8B6F47,
    });
    
    const branchMesh = new this.THREE.Mesh(geometry, material);
    this.group.add(branchMesh);
  }
}

_buildLeaves(model) {
  // 使用 InstancedMesh 渲染大量叶子
  const leafGeometry = new this.THREE.SphereGeometry(0.15, 8, 8);
  const leafColor = this._getLeafColor();
  const leafMaterial = new this.THREE.MeshPhongMaterial({
    color: leafColor,
    side: this.THREE.FrontSide,
  });
  
  const leafMesh = new this.THREE.InstancedMesh(
    leafGeometry,
    leafMaterial,
    model.leafCount
  );
  
  // 在树冠周围分布叶子（使用高斯分布）
  for (let i = 0; i < model.leafCount; i++) {
    const x = (Math.random() - 0.5) * 0.8;
    const y = 0.8 + (Math.random() - 0.5) * 0.6; // 集中在上方
    const z = (Math.random() - 0.5) * 0.8;
    
    const matrix = new this.THREE.Matrix4();
    matrix.setPosition(x, y, z);
    leafMesh.setMatrixAt(i, matrix);
  }
  
  leafMesh.instanceMatrix.needsUpdate = true;
  this.group.add(leafMesh);
  this.leafMesh = leafMesh;
}

_buildRoots(model) {
  const rootColor = 0x654321; // 根系褐色
  const rootMaterial = new this.THREE.MeshPhongMaterial({ color: rootColor });
  
  for (let i = 0; i < model.rootCount; i++) {
    const angle = (i / model.rootCount) * Math.PI * 2;
    const startPos = new THREE.Vector3(
      Math.cos(angle) * 0.1,
      0,
      Math.sin(angle) * 0.1
    );
    const endPos = new THREE.Vector3(
      Math.cos(angle) * (0.3 + Math.random() * 0.1),
      -model.rootDepth,
      Math.sin(angle) * (0.3 + Math.random() * 0.1)
    );
    
    const curve = new this.THREE.LineCurve3(startPos, endPos);
    const geometry = new this.THREE.TubeGeometry(curve, 8, 0.06, 4, false);
    const root = new this.THREE.Mesh(geometry, rootMaterial);
    
    this.group.add(root);
  }
}

_getLeafColor() {
  const season = this.isCurrentYear ? getSeason() : 'summer';
  const colors = {
    spring: 0x7DB776,  // 淡绿
    summer: 0x4A7C59,  // 深绿
    autumn: 0xD4A574,  // 金黄
    winter: 0xA9A9A9,  // 苍白
  };
  return colors[season] || colors.summer;
}

_addGlow() {
  // 添加发光球体（可选）
  const glowGeometry = new this.THREE.SphereGeometry(0.8, 16, 16);
  const glowMaterial = new this.THREE.MeshBasicMaterial({
    color: 0x6B9B7A,
    transparent: true,
    opacity: 0.1,
  });
  const glow = new this.THREE.Mesh(glowGeometry, glowMaterial);
  glow.position.y = 0.6;
  this.group.add(glow);
}

_incrementalGrow() {
  // 如果同一阶段内，只做微小的叶子增长动画
  // 可以用一个简单的 scale 动画表示生长
  const startScale = this.group.scale.x;
  const duration = 800; // ms
  const startTime = Date.now();
  
  const animate = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // 缓动：从 startScale 增长 1%
    const newScale = startScale + (0.01 * progress);
    this.group.scale.set(newScale, newScale, newScale);
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };
  
  animate();
}

_rebuildForStage() {
  // 里程碑时重新构建树，带动画过渡
  const oldGroup = this.group;
  this.group = new this.THREE.Group();
  this._build();
  
  // 淡入淡出效果（如果使用 transparency）
  this.group.position.copy(oldGroup.position);
  oldGroup.parent.add(this.group);
  
  // 1.5 秒后移除旧的
  setTimeout(() => {
    oldGroup.parent.remove(oldGroup);
  }, 1500);
}
```

- [ ] **Step 3: 提交**

```bash
git add app/webgl/tree.js app/webgl/tree-models.js
git commit -m "feat: rebuild tree rendering with realistic TubeGeometry and InstancedMesh leaves"
```

---

### Task 3: 实现树的季节色变系统

**Files:**
- Modify: `app/webgl/tree.js`

**目标：** 当前年的树根据月份自动改变颜色和粒子效果。

- [ ] **Step 1: 定义季节配置**

在 `app/webgl/tree.js` 中添加：

```javascript
const SEASON_CONFIG = {
  spring: {
    leafColor: 0x7DB776,  // 淡绿
    particleType: 'flower',
    particleColor: 0xFFB6C1, // 粉色
  },
  summer: {
    leafColor: 0x4A7C59,  // 深绿
    particleType: 'none',
  },
  autumn: {
    leafColor: 0xD4A574,  // 金黄
    particleType: 'leaf',
    particleColor: 0xDAA520, // 深金黄
  },
  winter: {
    leafColor: 0xA9A9A9,  // 苍白
    particleType: 'snow',
    particleColor: 0xFFFFFF, // 白色
  },
};

function getCurrentSeason() {
  const m = new Date().getMonth();
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}
```

- [ ] **Step 2: 修改 _getLeafColor() 方法使用配置**

```javascript
_getLeafColor() {
  if (!this.isCurrentYear) {
    return 0x4A7C59; // 往年树保持绿色
  }
  
  const season = getCurrentSeason();
  const config = SEASON_CONFIG[season];
  return config.leafColor;
}
```

- [ ] **Step 3: 更新叶子颜色的实时变化**

在 `_buildLeaves()` 中，保存对 leafMesh 的引用，然后添加一个方法来更新颜色：

```javascript
updateLeafColor() {
  if (this.leafMesh) {
    const newColor = this._getLeafColor();
    // 更新所有叶子的材质颜色
    this.leafMesh.material.color.setHex(newColor);
  }
}

// 在应用的主循环中（比如 animate() 函数）定期调用
// 可以每 60 帧检查一次是否需要更新季节
```

- [ ] **Step 4: 提交**

```bash
git add app/webgl/tree.js
git commit -m "feat: add seasonal color changes for current year tree"
```

---

### Task 4: 在应用中集成新的树形渲染

**Files:**
- Modify: `app/app.js` (更新树的加载和创建逻辑)

**目标：** 确保应用正确加载和更新新的树形。

- [ ] **Step 1: 更新树的创建调用**

在 `app/app.js` 中，找到创建 Tree 对象的地方，修改为：

```javascript
// 旧的
// const tree = new Tree(year, entryCount, { THREE });

// 新的
const yearData = database.getYearData(year); // 假设有这样的函数
const streak = calculateStreak(yearData);
const tree = new Tree(year, streak, {
  THREE: window.THREE,
  lastEntryDate: yearData.lastEntryDate,
});

scene.add(tree.group);
currentTrees[year] = tree;
```

- [ ] **Step 2: 更新新增记录时的树形更新**

```javascript
// 当用户提交新的日记时
function saveEntry(content) {
  const today = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();
  
  const yearData = database.getYearData(currentYear);
  yearData.entries[today] = content;
  yearData.lastEntryDate = today;
  database.saveYearData(yearData);
  
  // 更新树的成长状态
  const newStreak = calculateStreak(yearData);
  const currentTree = currentTrees[currentYear];
  if (currentTree) {
    currentTree.updateStreak(newStreak);
    updateStreakChip(newStreak); // 更新 UI
  }
}
```

- [ ] **Step 3: 测试树的加载和更新**

在浏览器中手动测试：
1. 打开应用，检查树是否正确渲染
2. 新增一条记录，观察树是否有成长（微小的缩放动画）
3. 快速新增多条记录至里程碑天数（如修改代码让 localStorage 中的日期），检查树是否有明显的形态变化
4. 更换月份（修改系统时间或在代码中硬编码季节），检查树的颜色是否改变

- [ ] **Step 4: 提交**

```bash
git add app/app.js
git commit -m "feat: integrate new tree rendering system with streak-based growth"
```

---

## Phase 2：交互和功能

### Task 5: 实现树的拖动旋转交互

**Files:**
- Modify: `app/webgl/scene.js` (添加鼠标/触摸事件处理)
- Modify: `app/app.js` (绑定事件)

**目标：** 用户可以拖动树来旋转它。

- [ ] **Step 1: 在 Scene 类中添加旋转控制**

在 `app/webgl/scene.js` 中添加：

```javascript
export class Scene {
  constructor(canvas, THREE) {
    this.canvas = canvas;
    this.THREE = THREE;
    // ... 现有初始化 ...
    
    this.treeRotationX = 0;
    this.treeRotationY = 0;
    this.targetRotationX = 0;
    this.targetRotationY = 0;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    
    this._bindEvents();
  }
  
  _bindEvents() {
    // 桌面端
    this.canvas.addEventListener('mousedown', (e) => this._onDragStart(e));
    this.canvas.addEventListener('mousemove', (e) => this._onDragMove(e));
    this.canvas.addEventListener('mouseup', (e) => this._onDragEnd(e));
    
    // 移动端
    this.canvas.addEventListener('touchstart', (e) => this._onDragStart(e));
    this.canvas.addEventListener('touchmove', (e) => this._onDragMove(e));
    this.canvas.addEventListener('touchend', (e) => this._onDragEnd(e));
  }
  
  _onDragStart(e) {
    this.isDragging = true;
    const pos = this._getPointerPos(e);
    this.dragStartX = pos.x;
    this.dragStartY = pos.y;
  }
  
  _onDragMove(e) {
    if (!this.isDragging) return;
    
    const pos = this._getPointerPos(e);
    const deltaX = pos.x - this.dragStartX;
    const deltaY = pos.y - this.dragStartY;
    
    // 将拖动转换为旋转（每像素 0.005 弧度）
    this.targetRotationY += deltaX * 0.005;
    this.targetRotationX += deltaY * 0.005;
    
    // 限制 X 轴旋转范围（防止翻转）
    this.targetRotationX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.targetRotationX));
    
    this.dragStartX = pos.x;
    this.dragStartY = pos.y;
  }
  
  _onDragEnd(e) {
    this.isDragging = false;
  }
  
  _getPointerPos(e) {
    if (e.touches) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else {
      return { x: e.clientX, y: e.clientY };
    }
  }
  
  applyTreeRotation(treeGroup) {
    // 使用缓动使旋转平滑（当不拖动时逐渐停止）
    if (!this.isDragging) {
      // 慢速衰减（阻尼）
      this.targetRotationX *= 0.95;
      this.targetRotationY *= 0.95;
    }
    
    // 将目标旋转应用到树
    treeGroup.rotation.order = 'YXZ';
    treeGroup.rotation.y = this.targetRotationY;
    treeGroup.rotation.x = this.targetRotationX;
  }
}
```

- [ ] **Step 2: 在渲染循环中应用旋转**

在 `app/app.js` 的 animate 函数中，在树的渲染前调用：

```javascript
function animate() {
  requestAnimationFrame(animate);
  
  // 应用树的旋转
  if (currentTree && currentTree.group) {
    scene.applyTreeRotation(currentTree.group);
  }
  
  // 其他渲染逻辑...
  renderer.render(threeScene, camera);
}
```

- [ ] **Step 3: 提交**

```bash
git add app/webgl/scene.js app/app.js
git commit -m "feat: implement tree drag-to-rotate interaction"
```

---

### Task 6: 实现卡片左右滑动

**Files:**
- Modify: `app/app.js` (卡片滑动事件和 DOM 操作)
- Modify: `app/style.css` (卡片样式和动画)

**目标：** 用户可以左右滑动卡片查看当天的其他记录。

- [ ] **Step 1: 在 HTML 中添加卡片容器结构**

修改 `app/index.html` 中的卡片容器：

```html
<!-- 现有的卡片区域，添加一个 wrapper 用于滑动 -->
<div class="cards-container" id="cards-container">
  <div class="cards-wrapper" id="cards-wrapper">
    <!-- 卡片会动态插入这里 -->
  </div>
</div>

<!-- 卡片的单个样式定义 -->
<template id="card-template">
  <div class="card" data-date="">
    <div class="card-date" data-i18n=""></div>
    <div class="card-content"></div>
    <div class="card-actions">
      <button class="card-edit" data-i18n="editEntry">Edit</button>
      <button class="card-delete" data-i18n="deleteEntry">Delete</button>
    </div>
  </div>
</template>
```

- [ ] **Step 2: 在 CSS 中添加卡片滑动样式**

在 `app/style.css` 中添加：

```css
.cards-container {
  position: relative;
  width: 100%;
  height: 120px;
  overflow: hidden;
  border-radius: 8px;
  background: var(--forest-floor);
}

.cards-wrapper {
  display: flex;
  transition: transform 0.3s ease-out;
  /* 会被 JS 动态设置 transform: translateX(...) */
}

.card {
  flex: 0 0 100%;
  padding: 1rem;
  box-sizing: border-box;
  border-right: 1px solid var(--whisper-border);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.card:last-child {
  border-right: none;
}

.card-date {
  font-size: 0.75rem;
  color: var(--root-earth);
  font-weight: 600;
}

.card-content {
  font-size: 0.9rem;
  color: var(--mist-white);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.card-edit, .card-delete {
  font-size: 0.75rem;
  padding: 0.3rem 0.6rem;
  border: 1px solid var(--whisper-border);
  border-radius: 4px;
  background: transparent;
  color: var(--mist-white);
  cursor: pointer;
  transition: all 0.2s;
}

.card-edit:hover {
  border-color: var(--canopy-green);
  color: var(--canopy-green);
}

.card-delete:hover {
  border-color: #FF6B6B;
  color: #FF6B6B;
}
```

- [ ] **Step 3: 在 app.js 中实现滑动逻辑**

```javascript
class CardCarousel {
  constructor(wrapperId) {
    this.wrapper = document.getElementById(wrapperId);
    this.cards = [];
    this.currentIndex = 0;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartIndex = 0;
    
    this._bindEvents();
  }
  
  _bindEvents() {
    this.wrapper.addEventListener('mousedown', (e) => this._onDragStart(e));
    document.addEventListener('mousemove', (e) => this._onDragMove(e));
    document.addEventListener('mouseup', (e) => this._onDragEnd(e));
    
    this.wrapper.addEventListener('touchstart', (e) => this._onDragStart(e));
    document.addEventListener('touchmove', (e) => this._onDragMove(e));
    document.addEventListener('touchend', (e) => this._onDragEnd(e));
  }
  
  _onDragStart(e) {
    this.isDragging = true;
    this.dragStartX = e.touches ? e.touches[0].clientX : e.clientX;
    this.dragStartIndex = this.currentIndex;
  }
  
  _onDragMove(e) {
    if (!this.isDragging) return;
    
    const currentX = e.touches ? e.touches[0].clientX : e.clientX;
    const delta = currentX - this.dragStartX;
    
    // 实时移动（但还没提交）
    const tempIndex = this.dragStartIndex - Math.round(delta / 100);
    if (tempIndex >= 0 && tempIndex < this.cards.length) {
      this._updateTransform(tempIndex, true); // true = 不平滑
    }
  }
  
  _onDragEnd(e) {
    if (!this.isDragging) return;
    this.isDragging = false;
    
    const endX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const delta = endX - this.dragStartX;
    
    // 如果拖动距离 > 50px，切换卡片
    if (Math.abs(delta) > 50) {
      const newIndex = this.dragStartIndex - Math.sign(delta);
      this.goToCard(Math.max(0, Math.min(newIndex, this.cards.length - 1)));
    } else {
      // 否则回到原位置
      this.goToCard(this.dragStartIndex);
    }
  }
  
  addCards(entries) {
    // entries: { '2026-05-17': 'content1', '2026-05-16': 'content2', ... }
    this.cards = Object.entries(entries).reverse(); // 最新的在前
    this.currentIndex = 0;
    this._renderCards();
  }
  
  _renderCards() {
    this.wrapper.innerHTML = '';
    const template = document.getElementById('card-template');
    
    for (const [date, content] of this.cards) {
      const card = template.content.cloneNode(true);
      card.querySelector('.card').dataset.date = date;
      card.querySelector('.card-date').textContent = date;
      card.querySelector('.card-content').textContent = content;
      
      // 为编辑/删除按钮添加事件
      card.querySelector('.card-edit').onclick = () => this._editCard(date);
      card.querySelector('.card-delete').onclick = () => this._deleteCard(date);
      
      this.wrapper.appendChild(card);
    }
  }
  
  goToCard(index) {
    this.currentIndex = Math.max(0, Math.min(index, this.cards.length - 1));
    this._updateTransform(this.currentIndex, false);
  }
  
  _updateTransform(index, noSmooth = false) {
    const offset = -index * 100; // 每张卡片 100% 宽
    this.wrapper.style.transition = noSmooth ? 'none' : 'transform 0.3s ease-out';
    this.wrapper.style.transform = `translateX(${offset}%)`;
  }
  
  _editCard(date) {
    // 打开编辑 modal，预填充内容
    const content = Object.fromEntries(this.cards)[date];
    openEntryModal(content, date);
  }
  
  _deleteCard(date) {
    if (confirm('Delete this entry?')) {
      // 删除数据库中的记录
      deleteEntry(date);
      // 刷新卡片
      this.addCards(getTodaysEntries());
    }
  }
}

// 在应用初始化时
const cardCarousel = new CardCarousel('cards-wrapper');
```

- [ ] **Step 4: 提交**

```bash
git add app/app.js app/index.html app/style.css
git commit -m "feat: implement card carousel with swipe interaction"
```

---

### Task 7: 实现打卡和当天编辑功能

**Files:**
- Modify: `app/app.js` (打卡逻辑和数据管理)
- Modify: `app/index.html` (Modal 布局)
- Modify: `app/style.css` (Modal 样式)

**目标：** 用户可以选择年份和日期，当天可以编辑删改记录。

- [ ] **Step 1: 更新 Modal HTML 和样式**

在 `app/index.html` 中修改 Modal：

```html
<!-- Entry Modal -->
<div class="modal-overlay" id="modal-overlay" role="dialog" aria-modal="true">
  <div class="modal-card">
    <div class="modal-header">
      <!-- 年份选择器 -->
      <div class="modal-year-selector">
        <button class="year-nav" id="year-prev">&lt;</button>
        <span class="modal-year" id="modal-year">2026</span>
        <button class="year-nav" id="year-next">&gt;</button>
      </div>
      <span class="modal-date" id="modal-date">2026-05-17</span>
      <span class="modal-label" id="modal-label" data-i18n="whatMattersToday">What matters most today?</span>
      <button class="modal-close" id="modal-close" aria-label="Close">&times;</button>
    </div>
    <textarea class="modal-textarea" id="modal-textarea" placeholder="..."></textarea>
    <div class="modal-footer">
      <button class="modal-btn modal-btn-save" id="modal-save" data-i18n="saveEntry">Save</button>
    </div>
  </div>
</div>
```

在 `app/style.css` 中添加年份选择器样式：

```css
.modal-year-selector {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.year-nav {
  background: transparent;
  border: 1px solid var(--whisper-border);
  color: var(--mist-white);
  width: 32px;
  height: 32px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.year-nav:hover {
  border-color: var(--canopy-green);
  color: var(--canopy-green);
}

.modal-year {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--canopy-green);
  min-width: 60px;
  text-align: center;
}

.modal-date {
  font-size: 0.85rem;
  color: var(--root-earth);
  font-weight: 500;
}
```

- [ ] **Step 2: 在 app.js 中实现打卡逻辑**

```javascript
class EntryManager {
  constructor() {
    this.selectedYear = new Date().getFullYear();
    this.allEntries = {}; // { year: { date: content, ... }, ... }
    this._loadAllEntries();
    this._bindEvents();
  }
  
  _loadAllEntries() {
    // 从 localStorage 或数据库加载所有年份的数据
    const stored = localStorage.getItem('dailyTreeData');
    if (stored) {
      this.allEntries = JSON.parse(stored);
    }
  }
  
  _bindEvents() {
    document.getElementById('fab-new').onclick = () => this.openNewEntryModal();
    document.getElementById('year-prev').onclick = () => this.changeYear(-1);
    document.getElementById('year-next').onclick = () => this.changeYear(1);
    document.getElementById('modal-close').onclick = () => this.closeModal();
    document.getElementById('modal-save').onclick = () => this.saveEntry();
  }
  
  openNewEntryModal() {
    this.selectedYear = new Date().getFullYear(); // 默认当前年
    const today = new Date().toISOString().split('T')[0];
    
    document.getElementById('modal-year').textContent = this.selectedYear;
    document.getElementById('modal-date').textContent = today;
    document.getElementById('modal-textarea').value = '';
    document.getElementById('modal-textarea').focus();
    document.getElementById('modal-overlay').style.display = 'flex';
  }
  
  changeYear(delta) {
    const minYear = 2020; // 应用创建年份
    const maxYear = new Date().getFullYear();
    this.selectedYear = Math.max(minYear, Math.min(maxYear, this.selectedYear + delta));
    document.getElementById('modal-year').textContent = this.selectedYear;
  }
  
  closeModal() {
    document.getElementById('modal-overlay').style.display = 'none';
  }
  
  saveEntry() {
    const content = document.getElementById('modal-textarea').value.trim();
    if (!content) {
      alert('Write something first!');
      return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    const year = this.selectedYear;
    
    // 保存到数据结构
    if (!this.allEntries[year]) {
      this.allEntries[year] = {};
    }
    this.allEntries[year][today] = content;
    
    // 保存到 localStorage
    localStorage.setItem('dailyTreeData', JSON.stringify(this.allEntries));
    
    // 更新 UI
    this.closeModal();
    this.updateTreeForYear(year);
    this.loadTodaysEntries();
  }
  
  loadTodaysEntries() {
    const today = new Date().toISOString().split('T')[0];
    const entries = this.allEntries[this.selectedYear] || {};
    
    // 筛选出当天的记录（注：题目说"当天"是指日期相同，不管时间）
    const todaysEntries = {};
    if (entries[today]) {
      todaysEntries[today] = entries[today];
    }
    
    // 更新卡片轮播
    cardCarousel.addCards(todaysEntries);
  }
  
  updateTreeForYear(year) {
    const entries = this.allEntries[year] || {};
    const dateStrings = Object.keys(entries).sort().reverse(); // 最新的在前
    
    // 计算连续记录天数
    let streak = 0;
    let checkDate = new Date();
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (dateStrings.includes(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    // 更新树
    if (currentTrees[year]) {
      currentTrees[year].updateStreak(streak);
    }
  }
  
  deleteEntry(date) {
    const year = this.selectedYear;
    if (this.allEntries[year]) {
      delete this.allEntries[year][date];
      localStorage.setItem('dailyTreeData', JSON.stringify(this.allEntries));
      this.updateTreeForYear(year);
      this.loadTodaysEntries();
    }
  }
}

// 在应用初始化时
const entryManager = new EntryManager();
```

- [ ] **Step 3: 提交**

```bash
git add app/app.js app/index.html app/style.css
git commit -m "feat: implement full entry recording with year selection and same-day editing"
```

---

## Phase 3：天气和季节系统

### Task 8: 集成天气 API 和背景渲染

**Files:**
- Create: `app/webgl/weather.js` (天气数据和背景渲染)
- Modify: `app/webgl/scene.js` (集成天气背景)
- Modify: `app/app.js` (初始化天气系统)

**目标：** 根据用户实时位置的天气动态渲染背景。

- [ ] **Step 1: 创建天气模块**

创建 `app/webgl/weather.js`：

```javascript
export class WeatherSystem {
  constructor(THREE) {
    this.THREE = THREE;
    this.currentWeather = 'sunny'; // sunny, cloudy, rainy, snowy
    this.backgroundMesh = null;
    this.particleSystem = null;
    this.lastUpdateTime = 0;
    this.updateInterval = 3600000; // 1 小时
  }
  
  async initialize(scene) {
    // 请求地理位置
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => this.fetchWeather(position.coords),
        (error) => {
          console.warn('Geolocation error:', error);
          this.setWeather('sunny'); // 默认晴天
        }
      );
    } else {
      this.setWeather('sunny');
    }
    
    // 创建背景 mesh
    this._createBackgroundMesh(scene);
  }
  
  async fetchWeather(coords) {
    try {
      const { latitude, longitude } = coords;
      // 使用免费的天气 API（如 open-meteo）
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=weather_code,is_day`
      );
      const data = await response.json();
      const weatherCode = data.current.weather_code;
      const isDay = data.current.is_day;
      
      // 根据 WMO 天气代码判断天气
      let weather = 'sunny';
      if (weatherCode === 0) weather = 'sunny';
      else if (weatherCode === 1 || weatherCode === 2) weather = 'cloudy';
      else if (weatherCode >= 45 && weatherCode <= 48) weather = 'cloudy';
      else if (weatherCode >= 51 && weatherCode <= 67) weather = 'rainy';
      else if (weatherCode >= 71 && weatherCode <= 86) weather = 'snowy';
      else if (weatherCode >= 80 && weatherCode <= 82) weather = 'rainy';
      
      // 如果是夜晚且晴天，调整背景
      if (!isDay && weather === 'sunny') {
        weather = 'night';
      }
      
      this.setWeather(weather);
    } catch (error) {
      console.error('Weather fetch error:', error);
    }
  }
  
  setWeather(weatherType) {
    if (this.currentWeather === weatherType) return;
    
    this.currentWeather = weatherType;
    this._updateBackgroundColor();
    this._updateParticles();
  }
  
  _createBackgroundMesh(scene) {
    // 创建一个大球体作为背景
    const geometry = new this.THREE.SphereGeometry(500, 32, 32);
    const material = new this.THREE.MeshBasicMaterial({
      side: this.THREE.BackSide,
      fog: false,
    });
    
    this.backgroundMesh = new this.THREE.Mesh(geometry, material);
    scene.add(this.backgroundMesh);
  }
  
  _updateBackgroundColor() {
    if (!this.backgroundMesh) return;
    
    const colors = {
      sunny: { r: 0.1, g: 0.15, b: 0.25 },   // 深蓝
      cloudy: { r: 0.08, g: 0.1, b: 0.15 },  // 灰蓝
      rainy: { r: 0.12, g: 0.18, b: 0.2 },   // 青绿
      snowy: { r: 0.15, g: 0.15, b: 0.2 },   // 冷白
      night: { r: 0.02, g: 0.02, b: 0.05 },  // 极深
    };
    
    const color = colors[this.currentWeather] || colors.sunny;
    const targetColor = new this.THREE.Color(color.r, color.g, color.b);
    
    // 平滑过渡到新颜色
    this._tweenColor(this.backgroundMesh.material.color, targetColor, 2000);
  }
  
  _tweenColor(fromColor, toColor, duration) {
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Math.min(Date.now() - startTime, duration);
      const progress = elapsed / duration;
      
      fromColor.lerp(toColor, progress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }
  
  _updateParticles() {
    // 移除旧的粒子系统
    if (this.particleSystem) {
      this.particleSystem.dispose();
    }
    
    const particleConfigs = {
      sunny: { count: 0 }, // 无粒子
      cloudy: { count: 0 },
      rainy: { count: 150, type: 'rain' },
      snowy: { count: 100, type: 'snow' },
      night: { count: 0 },
    };
    
    const config = particleConfigs[this.currentWeather];
    if (config.count > 0) {
      this.particleSystem = this._createParticleSystem(config);
    }
  }
  
  _createParticleSystem(config) {
    const particles = new this.THREE.BufferGeometry();
    const positions = new Float32Array(config.count * 3);
    
    for (let i = 0; i < config.count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;     // x
      positions[i * 3 + 1] = Math.random() * 50 - 10;     // y
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100; // z
    }
    
    particles.setAttribute('position', new this.THREE.BufferAttribute(positions, 3));
    
    const material = new this.THREE.PointsMaterial({
      size: config.type === 'rain' ? 0.1 : 0.3,
      color: config.type === 'rain' ? 0x87CEEB : 0xFFFFFF,
      transparent: true,
      opacity: 0.6,
    });
    
    const particleSystem = new this.THREE.Points(particles, material);
    
    // 保存粒子数据以便更新
    particleSystem.userData.config = config;
    particleSystem.userData.positions = positions;
    
    return particleSystem;
  }
  
  update() {
    // 在动画循环中定期调用，更新粒子位置
    if (!this.particleSystem) return;
    
    const positions = this.particleSystem.userData.positions;
    const config = this.particleSystem.userData.config;
    
    for (let i = 0; i < config.count; i++) {
      const index = i * 3;
      
      if (config.type === 'rain') {
        // 雨向下飘落
        positions[index + 1] -= 0.5;
        if (positions[index + 1] < -20) {
          positions[index + 1] = 30;
        }
      } else if (config.type === 'snow') {
        // 雪轻飘
        positions[index + 1] -= 0.1;
        positions[index] += Math.sin(Date.now() * 0.001 + i) * 0.05;
        if (positions[index + 1] < -20) {
          positions[index + 1] = 30;
        }
      }
    }
    
    this.particleSystem.geometry.attributes.position.needsUpdate = true;
  }
}
```

- [ ] **Step 2: 在 Scene 中集成天气系统**

修改 `app/webgl/scene.js`：

```javascript
import { WeatherSystem } from './weather.js';

export class Scene {
  constructor(canvas, THREE) {
    // ... 现有代码 ...
    this.weatherSystem = new WeatherSystem(THREE);
  }
  
  async initialize() {
    await this.weatherSystem.initialize(this.scene);
  }
  
  animate() {
    // 在动画循环中更新天气粒子
    this.weatherSystem.update();
  }
}
```

- [ ] **Step 3: 在 app.js 中初始化**

```javascript
// 在应用初始化时
await scene.initialize(); // 初始化天气系统
```

- [ ] **Step 4: 提交**

```bash
git add app/webgl/weather.js app/webgl/scene.js app/app.js
git commit -m "feat: implement weather API integration and dynamic background rendering"
```

---

## Phase 4：优化和最终打磨

### Task 9: Landing Page 卡片系统实现

**Files:**
- Modify: `/tmp/daily-tree/index.html` (Landing page 结构)
- Modify: `/tmp/daily-tree/index.html` 中的 CSS (卡片样式)
- Create: `/tmp/daily-tree/landing.js` (卡片交互和树的渲染)

**目标：** 实现 Landing page 的两组卡片系统（三阶段 + 四季），每个卡片下方动态渲染对应的树。

- [ ] **Step 1: 在 index.html 中创建卡片容器结构**

找到 Landing page 的主内容区域，添加两组卡片容器：

```html
<!-- ━━━ 卡片系统 1: 三个阶段 ━━━ -->
<section class="cards-section" id="stages-section">
  <h2>Your Journey</h2>
  <div class="cards-group" id="stages-cards">
    <div class="card" data-stage="diary" onclick="switchCard('stages', 'diary')">
      <h3>Diary</h3>
      <p>Every entry nurtures your tree</p>
    </div>
    <div class="card" data-stage="monthly" onclick="switchCard('stages', 'monthly')">
      <h3>Monthly</h3>
      <p>A month of persistence shows growth</p>
    </div>
    <div class="card" data-stage="yearly" onclick="switchCard('stages', 'yearly')">
      <h3>Yearly</h3>
      <p>A year of commitment, your tree thrives</p>
    </div>
  </div>
  <div class="tree-preview" id="stages-tree-preview"></div>
</section>

<!-- ━━━ 卡片系统 2: 四季 ━━━ -->
<section class="cards-section" id="seasons-section">
  <h2>Four Seasons</h2>
  <div class="cards-group" id="seasons-cards">
    <div class="card" data-season="spring" onclick="switchCard('seasons', 'spring')">
      <h3>Spring 🌸</h3>
      <p>Fresh growth, new beginnings</p>
    </div>
    <div class="card" data-season="summer" onclick="switchCard('seasons', 'summer')">
      <h3>Summer 🌿</h3>
      <p>Full bloom, abundant energy</p>
    </div>
    <div class="card" data-season="autumn" onclick="switchCard('seasons', 'autumn')">
      <h3>Autumn 🍂</h3>
      <p>Golden wisdom, letting go</p>
    </div>
    <div class="card" data-season="winter" onclick="switchCard('seasons', 'winter')">
      <h3>Winter ❄️</h3>
      <p>Rest and reflection</p>
    </div>
  </div>
  <div class="tree-preview" id="seasons-tree-preview"></div>
</section>
```

- [ ] **Step 2: 添加卡片样式到 index.html 的 CSS**

```css
.cards-section {
  padding: 4rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.cards-section h2 {
  font-family: 'Fraunces', Georgia, serif;
  font-size: clamp(1.75rem, 5vw, 2.75rem);
  font-weight: 600;
  margin-bottom: 2rem;
  color: var(--mist-white);
}

.cards-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.card {
  padding: 1.5rem;
  background: var(--forest-floor);
  border: 2px solid var(--whisper-border-strong);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
}

.card h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--mist-white);
  margin-bottom: 0.5rem;
}

.card p {
  font-size: 0.9rem;
  color: rgba(232,232,236,0.6);
  line-height: 1.5;
}

.card:hover {
  border-color: var(--canopy-green);
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(74,124,89,0.15);
}

.card.active {
  border-color: var(--canopy-green);
  background: rgba(74,124,89,0.1);
  color: var(--canopy-green);
}

.tree-preview {
  height: 300px;
  background: rgba(0,0,0,0.3);
  border: 1px solid var(--whisper-border);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  /* Canvas 会插入到这里 */
}

@media (max-width: 768px) {
  .cards-group {
    grid-template-columns: 1fr;
  }
  
  .cards-section {
    padding: 2rem 1rem;
  }
}
```

- [ ] **Step 3: 创建 landing.js 处理卡片交互**

创建 `/tmp/daily-tree/landing.js`：

```javascript
// 卡片状态管理
const cardState = {
  stages: 'diary',    // 当前选中的阶段
  seasons: 'spring',  // 当前选中的季节
  canvases: {}        // 存储 Three.js canvas 和 scene
};

// 初始化 Landing page 的卡片和树渲染
async function initLandingCards() {
  // 初始化阶段卡片
  initCardGroup('stages');
  initCardGroup('seasons');
  
  // 动态加载 Three.js 并初始化树渲染
  if (window.THREE) {
    renderPreviewTree('stages', 'diary');
    renderPreviewTree('seasons', 'spring');
  }
}

function initCardGroup(groupName) {
  const cards = document.querySelectorAll(`#${groupName}-cards .card`);
  cards.forEach((card, index) => {
    if (index === 0) {
      card.classList.add('active');
    }
    card.addEventListener('click', function() {
      switchCard(groupName, this.dataset[groupName === 'stages' ? 'stage' : 'season']);
    });
  });
}

function switchCard(groupName, selectedValue) {
  // 更新状态
  cardState[groupName] = selectedValue;
  
  // 更新 UI
  const cards = document.querySelectorAll(`#${groupName}-cards .card`);
  cards.forEach(card => {
    const value = card.dataset[groupName === 'stages' ? 'stage' : 'season'];
    card.classList.toggle('active', value === selectedValue);
  });
  
  // 更新树的渲染
  renderPreviewTree(groupName, selectedValue);
}

function renderPreviewTree(groupName, value) {
  const containerId = `${groupName}-tree-preview`;
  const container = document.getElementById(containerId);
  
  // 如果已有 canvas，移除它
  const existingCanvas = container.querySelector('canvas');
  if (existingCanvas) {
    existingCanvas.remove();
  }
  
  // 创建新的 canvas 和场景
  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  container.appendChild(canvas);
  
  // 使用 Three.js 渲染对应的树
  renderThreeJsTree(canvas, groupName, value);
}

function renderThreeJsTree(canvas, groupName, value) {
  if (!window.THREE) return;
  
  const width = canvas.parentElement.clientWidth;
  const height = canvas.parentElement.clientHeight;
  
  // 创建 Three.js 场景
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  
  renderer.setSize(width, height);
  renderer.setClearColor(0x0A0A0B);
  
  camera.position.set(0, 0.5, 1.5);
  camera.lookAt(0, 0.5, 0);
  
  // 添加灯光
  const light = new THREE.DirectionalLight(0xFFFFFF, 1);
  light.position.set(5, 5, 5);
  scene.add(light);
  
  const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.5);
  scene.add(ambientLight);
  
  // 根据卡片类型创建树
  let treeGroup;
  if (groupName === 'stages') {
    treeGroup = createStageTree(value);
  } else {
    treeGroup = createSeasonTree(value);
  }
  
  scene.add(treeGroup);
  
  // 旋转动画
  const animate = () => {
    requestAnimationFrame(animate);
    treeGroup.rotation.y += 0.005;
    renderer.render(scene, camera);
  };
  
  animate();
}

function createStageTree(stage) {
  // 根据阶段创建不同形态的树
  const group = new THREE.Group();
  
  const stageModels = {
    diary: { 
      trunkHeight: 0.5, 
      leafCount: 8,
      color: 0x7DB776 // 淡绿
    },
    monthly: { 
      trunkHeight: 0.8, 
      leafCount: 20,
      color: 0x4A7C59 // 深绿
    },
    yearly: { 
      trunkHeight: 1.2, 
      leafCount: 40,
      color: 0x4A7C59 // 深绿
    }
  };
  
  const model = stageModels[stage];
  
  // 构建简化版本的树（用于 Landing page）
  const trunkGeometry = new THREE.CylinderGeometry(0.1, 0.15, model.trunkHeight, 8);
  const trunkMaterial = new THREE.MeshPhongMaterial({ color: 0x8B6F47 });
  const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
  group.add(trunk);
  
  // 树叶
  const leafGeometry = new THREE.SphereGeometry(0.2, 8, 8);
  const leafMaterial = new THREE.MeshPhongMaterial({ color: model.color });
  const leafMesh = new THREE.InstancedMesh(leafGeometry, leafMaterial, model.leafCount);
  
  for (let i = 0; i < model.leafCount; i++) {
    const x = (Math.random() - 0.5) * 0.6;
    const y = 0.5 + (Math.random() - 0.5) * 0.4;
    const z = (Math.random() - 0.5) * 0.6;
    
    const matrix = new THREE.Matrix4();
    matrix.setPosition(x, y, z);
    leafMesh.setMatrixAt(i, matrix);
  }
  
  leafMesh.instanceMatrix.needsUpdate = true;
  group.add(leafMesh);
  
  return group;
}

function createSeasonTree(season) {
  // 根据季节创建树，颜色变化
  const group = new THREE.Group();
  
  const seasonColors = {
    spring: 0x7DB776,   // 淡绿
    summer: 0x4A7C59,   // 深绿
    autumn: 0xD4A574,   // 金黄
    winter: 0xA9A9A9    // 苍白
  };
  
  // 构建相同形态但不同颜色的树
  const trunkGeometry = new THREE.CylinderGeometry(0.1, 0.15, 1.0, 8);
  const trunkMaterial = new THREE.MeshPhongMaterial({ color: 0x8B6F47 });
  const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
  group.add(trunk);
  
  // 树叶
  const leafGeometry = new THREE.SphereGeometry(0.2, 8, 8);
  const leafColor = seasonColors[season];
  const leafMaterial = new THREE.MeshPhongMaterial({ color: leafColor });
  const leafMesh = new THREE.InstancedMesh(leafGeometry, leafMaterial, 30);
  
  for (let i = 0; i < 30; i++) {
    const x = (Math.random() - 0.5) * 0.6;
    const y = 0.5 + (Math.random() - 0.5) * 0.4;
    const z = (Math.random() - 0.5) * 0.6;
    
    const matrix = new THREE.Matrix4();
    matrix.setPosition(x, y, z);
    leafMesh.setMatrixAt(i, matrix);
  }
  
  leafMesh.instanceMatrix.needsUpdate = true;
  group.add(leafMesh);
  
  return group;
}

// 页面加载时初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLandingCards);
} else {
  initLandingCards();
}
```

- [ ] **Step 4: 在 index.html 中引入 landing.js**

```html
<script src="webgl/three.js"></script>
<script src="landing.js"></script>
```

- [ ] **Step 5: 提交**

```bash
git add index.html landing.js
git commit -m "feat: implement landing page card system with dynamic tree rendering"
```

### Task 10: 英文字体升级

**Files:**
- Modify: `/tmp/daily-tree/index.html` (导入新字体)
- Modify: `/tmp/daily-tree/index.html` CSS (应用新字体)

**目标：** Landing page 的英文标题升级为 Fraunces 衬线体，提升优雅感。

- [ ] **Step 1: 在 index.html 的 `<head>` 中导入 Fraunces 字体**

```html
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;600;700&display=swap" rel="stylesheet">
```

- [ ] **Step 2: 更新 index.html 的 CSS，应用到英文标题**

找到 h1、h2 选择器，修改为：

```css
h1, h2 {
  font-family: 'Fraunces', Georgia, serif;
  font-weight: 600;
  font-optical-sizing: auto;
}
```

也可以对特定的类应用，比如 Landing page 的主标题：

```css
.hero h1 {
  font-family: 'Fraunces', Georgia, serif;
  font-weight: 600;
  letter-spacing: -0.02em;
}
```

- [ ] **Step 3: 在 app/style.css 中保持 Outfit（不变）**

应用内保持现代的 Outfit 字体，不使用 Fraunces。

- [ ] **Step 4: 提交**

```bash
git add index.html
git commit -m "feat: upgrade landing page typography with Fraunces serif font for elegance"
```

### Task 11: 响应式适配和性能优化

**Files:**
- Modify: `app/style.css` (媒体查询和优化)
- Modify: `app/webgl/scene.js` (WebGL 性能)

- [ ] **核心优化点：**
  1. 媒体查询确保手机上三阶段和四季卡片显示完整
  2. Three.js 树的复杂度根据设备性能动态调整
  3. 粒子系统根据设备能力（mobile vs desktop）改变粒子数
  4. 缓存天气数据避免频繁 API 调用

---

## 技术细节参考

### 存储格式

```javascript
// localStorage 中的数据格式
{
  "dailyTreeData": {
    "2026": {
      "entries": {
        "2026-05-17": "Today's reflection...",
        "2026-05-16": "Yesterday's thought..."
      },
      "lastEntryDate": "2026-05-17",
      "maxStreakDays": 30
    },
    "2025": {
      "entries": { /* ... */ }
    }
  }
}
```

### Three.js 坐标系

- X 轴: 左右（负=左，正=右）
- Y 轴: 上下（负=下，正=上）
- Z 轴: 深度（负=远，正=近）

树的初始位置在原点 (0, 0, 0)，根系向下 (Y < 0)，树冠向上 (Y > 0)。

### 色彩转换

从十六进制到 RGB：
```javascript
const hex = 0x4A7C59;
const r = (hex >> 16) & 255; // 74
const g = (hex >> 8) & 255;  // 124
const b = hex & 255;          // 89
```

---

## 提交检查清单

每个 phase 完成后，运行：

```bash
git log --oneline -10  # 确认提交信息清晰
npm run build          # 确认构建成功（如果有构建步骤）
```

在实际浏览器中测试关键功能：
- [ ] 树的成长（手动添加记录，观察 Day 0/7/15/30/180/365）
- [ ] 季节变化（修改系统日期或代码中的月份）
- [ ] 天气系统（允许位置权限，观察背景变化）
- [ ] 卡片滑动（左右滑动查看当天记录）
- [ ] 树的旋转（拖动树看是否平滑旋转）
- [ ] Landing page（响应式检查，三阶段和四季卡片都显示）

---

