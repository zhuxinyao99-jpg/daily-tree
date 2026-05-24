# Landing Page Redesign — Daily Tree

**Date:** 2026-05-18  
**Status:** Approved

---

## 概述

将 Daily Tree 现有的 landing page（`/tmp/daily-tree/landing.html`）替换为全新的沉浸式单页设计，采用蓝银配色 + 数字年轮主视觉 + Apple 风格弹窗卡片序列，彻底脱离原有绿色树木风格。

---

## 视觉风格

- **背景**：纯黑（`#000`）+ 深蓝径向渐变 `radial-gradient(ellipse 65% 55% at 50% 46%, #071220, #000)`
- **主色**：蓝银系 `rgba(100~188, 158~228, 232~255, 0.22~0.44)`
- **字体**：Fraunces（衬线，标题/数字）+ Outfit（无衬线，正文/标签）
- **卡片材质**：深蓝玻璃 `rgba(8,20,48,0.84)` + `backdrop-filter: blur(28px)`

---

## 入场动画序列

| 时间 | 事件 |
|------|------|
| 0ms | 纯黑 |
| 900ms | 背景蓝色晕光淡入 |
| 1200ms | 年轮 SVG 从 `scale(0) rotate(-120deg)` 弹出至 `scale(1) rotate(0deg)`，同时 ambient glow 绽放 |
| 1900ms | 6 颗浮动粒子依次出现，开始 bob 动画 |
| 2900ms | **Hello.** 淡入（Fraunces 斜体点，长期保留） |
| 3600ms | 副标题（eyebrow）淡入 |
| 3800ms | 主标题 `Watch your life grow.` 淡入 |
| 4000ms | 描述文字淡入 |
| 4800ms | 第一张卡片弹出 |

---

## 数字年轮（SVG）

- **5 圈同心圆**，半径 162 / 136 / 110 / 85 / 60，宽度 16~10px
- 外圈慢（90s/圈），内圈快（22s/圈），相邻圈方向相反（CW / CCW 交替）
- 3 条文字路径随环旋转：月份（JAN~DEC）/ 年份（2023~2025）/ 周次（W1~W52）
- 中央：Fraunces 字体大数字 `47` + `DAYS` 标签
- 顶层：光泽 radialGradient（左上亮 / 右下暗）

---

## 卡片序列

### 交互逻辑
- 卡片从屏幕下方弹出（`translateY(120%) → translateY(0)`）
- 弹簧曲线：`cubic-bezier(0.34, 1.52, 0.64, 1)`，时长 620ms
- 点击当前卡片：旧卡飞出（`translateY(-90%) scale(0.88)`，360ms），新卡弹入
- 卡片出现时，背景暗幕 `rgba(0,0,14,0.55)` 叠上，年轮区上移 `-14vh`

### 卡片内容（4 张）

| # | 图标 | 标签 | 标题 |
|---|------|------|------|
| 1 | 🌱 | 每日记录 | 每天一句话，*足够了。* |
| 2 | 🌳 | 成长可视化 | 坚持，*长出年轮。* |
| 3 | 🔥 | 连续打卡 | 第 *47* 天，别断掉。 |
| 4 | 📅 | 时光回溯 | 一年前的今天，*你在想什么？* |

### 结束状态
最后一张点完后：暗幕收起，年轮回归中央，`免费开始 / 了解更多 →` CTA 按钮弹出。

---

## 文件结构

```
/tmp/daily-tree/
├── landing.html          ← 目标文件，需替换
└── app/
    ├── index.html        ← 主 app（不动）
    └── style.css         ← 主 app 样式（不动）
```

设计稿原型位于：  
`/tmp/daily-tree/.superpowers/brainstorm/44270-1779087916/content/landing-full.html`

---

## 实现要点

1. **字体加载**：Google Fonts CDN（Outfit + Fraunces），保持与原型一致
2. **SVG textPath**：`<defs>` 中定义路径，路径自身带 CSS animation 旋转，文字跟随
3. **入场时序**：全部用 `setTimeout` 链实现，无需外部动画库
4. **卡片重置**：`↺ 重播` 按钮清除所有状态后重新跑 `run()`
5. **不引入 Three.js / WebGL**：landing page 纯 SVG + CSS，与 app 内 WebGL 树完全解耦

---

## 不在本次范围内

- app 内页（`index.html`）的视觉改动
- 移动端适配细节调整（基础响应式已有，深度优化另排）
- 实际用户数据接入（年轮数字目前为静态 `47`）
