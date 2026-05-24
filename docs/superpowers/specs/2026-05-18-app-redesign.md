# Daily Tree App 使用界面大规模重设计

## 概述

对 `/tmp/daily-tree/app/index.html` 及相关文件进行全面重设计，目标是与 landing page 视觉风格统一、建立养成系树木系统、加入天气联动效果，并优化首次进入流程。

分四个子系统实现，按依赖顺序：

1. **导航路由**：首次访问检测，landing ↔ app 跳转逻辑
2. **UI 主题**：配色、布局、控件全面对齐 landing page 风格
3. **树的养成系统**：Canvas 2D 宽冠橡树，6 个生长阶段，点击树枝查看记录
4. **天气系统**：Open-Meteo API，雨/雪/风粒子效果

---

## 子系统 1：导航路由

### 首次访问检测

- 使用 `localStorage` key `daily_tree_visited` 标记是否已访问过
- **Landing page 入口逻辑**（`landing.html` 顶部 JS）：
  - 若 `daily_tree_visited === 'true'` → 立即跳转 `app/index.html`，不展示 landing
  - 否则正常渲染 landing
- **「免费开始」按钮点击时**：写入 `localStorage.setItem('daily_tree_visited', 'true')`，然后跳转 `app/index.html`

### App 内返回入口

- 顶部状态栏左侧「← Daily Tree」文字按钮
- 点击直接 `window.location.href = '../landing.html'`
- **不清除** `daily_tree_visited`，返回后再次进入仍直接进 app

### 新手引导触发

- App 内使用独立 key `daily_tree_onboarded` 判断是否已看过引导
- 首次进入 app（`!localStorage.getItem('daily_tree_onboarded')`）→ 展示全屏引导流
- 引导完成后写入 `daily_tree_onboarded = 'true'`

---

## 子系统 2：UI 主题

### 布局：顶部状态栏 + 全屏树 + 底部操作栏

```
┌─────────────────────────────────┐
│  ← Daily Tree   日期   ✦ 提醒   │  ← 顶部状态栏 44px
├─────────────────────────────────┤
│                                 │
│                                 │
│          Canvas 树              │  ← 全屏，树铺满
│                                 │
│                                 │
├─────────────────────────────────┤
│  🔍  ▮▮▮▮▯▯▯  [+]  ▮▮▮▮▮▮▮  👤 │  ← 底部操作栏 72px
└─────────────────────────────────┘
```

### 颜色系统

| 用途 | 值 |
|------|-----|
| 页面背景 | `#000000` |
| 顶/底栏背景 | `rgba(2, 4, 2, 0.85)` + `backdrop-filter: blur(12px)` |
| 顶/底栏边框 | `rgba(80, 160, 80, 0.10)` |
| 树干 | `rgb(105, 78, 48)` |
| 叶片填充 | `rgb(108, 195, 90)` |
| 叶片边缘 | `rgb(150, 230, 130)` |
| Accent（FAB、高亮） | `rgba(90, 190, 90, 0.88)` |
| 今日提醒（未记录） | `rgba(255, 210, 90, 0.85)`，背景 `rgba(30,20,0,0.6)` |
| 打卡条（已完成） | `rgba(110, 200, 100, 0.55)` |
| 打卡条（未完成） | `rgba(80, 160, 80, 0.20)` |

### 顶部状态栏（44px，固定）

- 左：「← Daily Tree」，字号 11px，`rgba(140,200,140,0.6)`
- 中：当前日期（`YYYY年M月D日`），字号 10px，半透明
- 右：今日状态区域
  - 未记录时：「✦ 今天还没记录」琥珀色圆角 badge
  - 已记录时：天气图标 + 温度（如「🌧 14°」）

### 底部操作栏（72px，固定）

从左到右：
1. 搜索图标（放大镜）→ 弹出搜索浮层
2. 近 14 天打卡条形图（每天一根小条，高度按当日是否记录）
3. FAB「+」按钮（50px 圆形，绿色，居中）→ 打开记录输入框
4. 另一组近 14 天（或留空）
5. 用户/设置图标 → 打开设置面板

### 移除项

- 原 WebGL Three.js 依赖（`app/webgl/tree.js` 整个替换）
- 原绿色系 UI 样式
- 底部年份 tab（仅保留今年）

### 新手引导（全屏流，3 张卡片）

背景纯黑，卡片居中，点击/滑动切换，最后一张有「开始记录」按钮。

| 卡片 | 标题 | 内容 |
|------|------|------|
| 1/3 | 你的树，从今天开始生长 | 展示小树苗插图 + 「每天记录一件事，树就会长大」 |
| 2/3 | 每天写下一件事 | 箭头指向底部「+」按钮，说明「点击 + 开始今天的记录」 |
| 3/3 | 回顾过去 | 「点击树干或树枝，查看那段时间的记录」，展示树枝点击示意 |

---

## 子系统 3：树的养成系统

### 生长驱动指标

- **成长度**：今年（1月1日起）累计记录天数（`totalDaysThisYear`）—— 只增不减
- **活力度**：最近 7 天中有记录的天数（`vitality7`，0–7）—— 影响叶片亮度

### 生长阶段

| 阶段 | 累计天数 | Canvas 形态描述 |
|------|----------|----------------|
| 种子 `seed` | 0 | 地面中央一粒淡绿光点（半径 4px，发光晕） |
| 嫩芽 `sprout` | 1–7 | 细主干（高 30px）+ 两片子叶（椭圆），无分叉 |
| 树苗 `sapling` | 8–30 | 主干（高 80px）+ 2 层递归分叉，叶片稀疏（depth=4） |
| 幼树 `young` | 31–90 | 主干（高 120px）+ 3 层，叶片成团（depth=5） |
| 茂盛 `mature` | 91–300 | 完整宽冠橡树，depth=7，两主枝展开（当前预览样式） |
| 参天 `ancient` | 301–365 | depth=8，树冠超出 canvas 边缘，根系更粗壮（lineWidth×1.3） |

### 活力度对叶片的影响

```js
// vitality: 0–7，影响叶片 alpha 和色彩饱和度
const vitalityFactor = vitality7 / 7; // 0.0 ~ 1.0
// 叶片 rgb：基础 (108,195,90)，最低降至 (80,140,70)（不枯萎，只暗淡）
const lf = [
  108 - (1 - vitalityFactor) * 28,
  195 - (1 - vitalityFactor) * 55,
  90  - (1 - vitalityFactor) * 20,
];
```

### Canvas 树绘制函数结构

```
drawTree(canvas, stage, vitality7)
  ├── drawAmbient()       // 绿色环境光晕
  ├── drawRoots()         // 根系曲线（stage >= sapling 才显示）
  ├── drawTrunk()         // 主干
  └── drawCrown()         // 递归分叉 branch()
        └── branch()      // 递归，depth 由 stage 决定
```

沿用已验证的 `makeRng(seed)` 和 `branch()` 算法（来自 `tree-real.html`）。

### 点击树枝查看记录

**分区规则**（按树干高度从下到上）：

| 区域（相对树干基部） | 对应记录时段 |
|---------------------|-------------|
| 底部 1/3（粗枝/树干区） | 最早期的记录（第1天～最早1/3时段） |
| 中部 1/3 | 中期记录 |
| 上部 1/3（细枝/树冠区） | 最近1/3时段的记录 |

**交互流程**：
1. canvas 监听 `click` 事件，计算点击 y 坐标相对于树干范围的位置
2. 映射到时段区间，取对应记录条目
3. 底部滑入浮层（`transform: translateY`）：
   - 标题：「第X天 ~ 第Y天的记录」
   - 列表：每条显示日期 + 正文摘要（前40字）
   - 关闭按钮或点击蒙层关闭

---

## 子系统 4：天气系统

### 数据获取流程

```
app 启动
  → navigator.geolocation.getCurrentPosition()
    ├── 成功 → 调用 Open-Meteo API
    │          → 解析 WMO 天气码 → 存入 sessionStorage
    │          → 更新 weatherState，触发天气效果渲染
    └── 失败/拒绝 → 静默降级，weatherState = null，不显示天气
```

### Open-Meteo API 调用

```
GET https://api.open-meteo.com/v1/forecast
  ?latitude={lat}&longitude={lon}
  &current=temperature_2m,weathercode,windspeed_10m
  &timezone=auto
```

响应字段：`current.temperature_2m`、`current.weathercode`、`current.windspeed_10m`

### WMO 天气码映射

| WMO Code | 类型 | 效果 |
|----------|------|------|
| 0–2 | clear | 无特效，叶片最亮 |
| 3 | cloudy | 顶栏「☁ Xº」，叶片亮度 -5% |
| 51–55, 61–65 | rain | 雨滴粒子 + 树叶微摆 |
| 71–75 | snow | 雪花粒子 |
| 95–99 | storm | 密集雨滴 + 强风摆动 |

风速 `windspeed_10m > 5 m/s` → 叠加树枝摆动动画（不覆盖其他效果）

### 粒子系统（Canvas 叠加层）

在主树 canvas 之上，再叠一个透明 canvas（`pointer-events: none`）专门渲染粒子。

**雨滴**：
```js
// 每帧更新
particle.y += particle.speed;          // 竖直下落
particle.x += particle.windDrift;      // 风偏移
if (particle.y > H) particle.y = -10; // 循环
// 绘制：细线段，rgba(180,220,255,0.4)，长6–12px
```

**雪花**：慢速飘落，椭圆，`rgba(255,255,255,0.6)`，带随机横向漂移

**树枝摆动**（风效果）：对 `branch()` 绘制时的 angle 加入正弦偏移：
```js
const sway = Math.sin(Date.now() / 800 + depth * 0.5) * windFactor * 0.04;
angle += sway;
```

**性能保护**：`requestAnimationFrame` 中检测实际帧率，若 fps < 30 则将粒子数量减半

### 天气 sessionStorage 缓存

- key：`daily_tree_weather`，value：`{ code, temp, wind, ts }`
- 同一天内（ts 在今日内）直接使用缓存，不重复请求

---

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `landing.html` | 修改 | 顶部加首次访问检测 + 跳转逻辑 |
| `app/index.html` | 重写 | 新布局、新样式，移除旧 UI |
| `app/app.js` | 修改 | 新手引导逻辑、树枝点击交互、天气调用入口 |
| `app/tree.js` | 新建 | Canvas 2D 树绘制（替换 webgl/tree.js） |
| `app/weather.js` | 新建 | Open-Meteo 请求、WMO 映射、粒子渲染 |
| `app/webgl/tree.js` | 删除 | Three.js 树，不再使用 |

---

## 不在此次范围内

- 多年数据对比视图
- 树木装饰物/道具系统（可后续迭代）
- 推送通知提醒
- 数据导出/备份
