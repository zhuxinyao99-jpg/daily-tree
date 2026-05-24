// app/tree.js — Daily Tree 7-stage canvas renderer

// ── Seeded RNG (LCG) ─────────────────────────────────────────────────────────
function rngFrom(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

function lerp(a, b, t) { return a + (b - a) * t; }

// ── Ground ───────────────────────────────────────────────────────────────────
function drawGround(ctx, cx, gy, W) {
  const sh = ctx.createRadialGradient(cx, gy + 4, 0, cx, gy + 4, W * 0.44);
  sh.addColorStop(0, 'rgba(0,0,0,0.6)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sh; ctx.beginPath();
  ctx.ellipse(cx, gy + 6, W * 0.44, 15, 0, 0, Math.PI * 2); ctx.fill();

  const gr = ctx.createLinearGradient(0, gy - 3, 0, gy + 24);
  gr.addColorStop(0, '#1e1409'); gr.addColorStop(0.5, '#271908'); gr.addColorStop(1, '#0b0905');
  ctx.fillStyle = gr; ctx.beginPath();
  ctx.ellipse(cx, gy + 9, W * 0.38, 13, 0, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = 'rgba(100,70,35,0.22)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(cx, gy, W * 0.34, 5, 0, 0, Math.PI); ctx.stroke();
}

// ── Detailed Roots (mature/ancient) ──────────────────────────────────────────
function drawDetailedRoots(ctx, cx, gy, nRoots, scale, rng) {
  const baseAngles = [-72, -46, -22, 22, 48, 74];
  for (let i = 0; i < nRoots; i++) {
    const a = baseAngles[i] * Math.PI / 180;
    const len = (24 + rng() * 14) * scale;
    const w = (3.5 + rng() * 1.8) * scale;
    const ex = cx + Math.cos(a) * len;
    const ey = gy + Math.abs(Math.sin(a)) * len * 0.52;
    const cpx = cx + Math.cos(a) * len * 0.48 + (rng() - 0.5) * 12;
    const cpy = gy + Math.abs(Math.sin(a)) * len * 0.22;
    const rg = ctx.createLinearGradient(cx, gy, ex, ey);
    rg.addColorStop(0, 'rgba(90,64,30,0.95)');
    rg.addColorStop(0.6, 'rgba(65,44,20,0.7)');
    rg.addColorStop(1, 'rgba(38,24,10,0)');
    ctx.strokeStyle = rg; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, gy);
    ctx.quadraticCurveTo(cpx, cpy, ex, ey); ctx.stroke();
    if (scale > 0.8) {
      const sa = a + (rng() - 0.5) * 0.7, sl = len * 0.4;
      ctx.strokeStyle = `rgba(55,36,14,${0.32 * scale})`; ctx.lineWidth = w * 0.35;
      ctx.beginPath(); ctx.moveTo(ex, ey);
      ctx.lineTo(ex + Math.cos(sa) * sl, ey + Math.abs(Math.sin(sa)) * sl * 0.45); ctx.stroke();
    }
  }
}

// ── Simple Roots (sapling/young) ─────────────────────────────────────────────
function drawSimpleRoots(ctx, cx, gy, scale) {
  [[Math.PI * 1.22, 0.16, 3], [Math.PI * 1.78, 0.16, 3], [Math.PI * 1.5, 0.10, 2]].forEach(([a, sp, n]) => {
    for (let i = 0; i < n; i++) {
      const ang = a + (i - (n - 1) / 2) * sp;
      const len = (22 + i * 10) * scale;
      const ex = cx + Math.cos(ang) * len, ey = gy - Math.sin(ang) * len;
      ctx.beginPath(); ctx.moveTo(cx, gy);
      ctx.quadraticCurveTo(cx + Math.cos(ang + 0.2) * len * 0.5, gy - Math.sin(ang + 0.2) * len * 0.5, ex, ey);
      ctx.lineWidth = (3 - i * 0.6) * scale;
      ctx.strokeStyle = `rgba(105,78,48,${0.42 - i * 0.07})`;
      ctx.lineCap = 'round'; ctx.stroke();
    }
  });
}

// ── Trunk (gradient + bark streaks) ──────────────────────────────────────────
function drawTrunk(ctx, cx, baseY, topY, baseW, lean, rng) {
  const topX = cx + lean;
  const topW = baseW * 0.26;
  const m1x = cx + lean * 0.28 + (rng() - 0.5) * 3;
  const m1y = baseY - (baseY - topY) * 0.35;
  const m2x = cx + lean * 0.62 + (rng() - 0.5) * 3;
  const m2y = baseY - (baseY - topY) * 0.68;

  const left = [
    { x: cx - baseW / 2, y: baseY },
    { x: m1x - lerp(baseW, topW, 0.35) / 2, y: m1y },
    { x: m2x - lerp(baseW, topW, 0.68) / 2, y: m2y },
    { x: topX - topW / 2, y: topY },
  ];
  const right = [
    { x: cx + baseW / 2, y: baseY },
    { x: m1x + lerp(baseW, topW, 0.35) / 2, y: m1y },
    { x: m2x + lerp(baseW, topW, 0.68) / 2, y: m2y },
    { x: topX + topW / 2, y: topY },
  ];

  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y);
  ctx.bezierCurveTo(left[0].x, left[0].y, left[1].x, left[1].y, left[2].x, left[2].y);
  ctx.lineTo(left[3].x, left[3].y);
  ctx.lineTo(right[3].x, right[3].y);
  ctx.bezierCurveTo(right[3].x, right[3].y, right[2].x, right[2].y, right[1].x, right[1].y);
  ctx.lineTo(right[0].x, right[0].y);
  ctx.closePath();

  const g = ctx.createLinearGradient(cx - baseW / 2, 0, cx + baseW / 2, 0);
  g.addColorStop(0, 'rgb(35,22,9)');
  g.addColorStop(0.52, 'rgb(130,92,52)');
  g.addColorStop(1, 'rgb(30,18,6)');
  ctx.fillStyle = g; ctx.fill();

  for (let i = 0; i < 5; i++) {
    const bx = cx + (rng() - 0.5) * baseW * 0.7;
    ctx.beginPath(); ctx.moveTo(bx, baseY - 6); ctx.lineTo(bx + (rng() - 0.5) * 3, topY + 8);
    ctx.strokeStyle = `rgba(${rng() > 0.5 ? '180,140,75' : '25,14,4'},${0.08 + rng() * 0.10})`;
    ctx.lineWidth = 0.9 + rng() * 0.8; ctx.stroke();
  }

  return { topX, topY };
}

// ── Branch segment (tapered polygon) ─────────────────────────────────────────
function branchSeg(ctx, x0, y0, x1, y1, w0, w1, rng) {
  if (w0 < 0.5) return;
  const ang = Math.atan2(y1 - y0, x1 - x0), perp = ang + Math.PI / 2;
  const cpx = Math.cos(perp), cpy = Math.sin(perp);
  ctx.beginPath();
  ctx.moveTo(x0 + cpx * w0 / 2, y0 + cpy * w0 / 2);
  ctx.quadraticCurveTo(
    (x0 + x1) / 2 + cpx * (w0 + w1) * 0.22, (y0 + y1) / 2 + cpy * (w0 + w1) * 0.22,
    x1 + cpx * w1 / 2, y1 + cpy * w1 / 2
  );
  ctx.lineTo(x1 - cpx * w1 / 2, y1 - cpy * w1 / 2);
  ctx.quadraticCurveTo(
    (x0 + x1) / 2 - cpx * (w0 + w1) * 0.22, (y0 + y1) / 2 - cpy * (w0 + w1) * 0.22,
    x0 - cpx * w0 / 2, y0 - cpy * w0 / 2
  );
  ctx.closePath();
  const bright = 50 + rng() * 18;
  ctx.fillStyle = `rgb(${Math.round(75 + bright * 0.55)},${Math.round(50 + bright * 0.38)},${Math.round(26 + bright * 0.2)})`;
  ctx.fill();
}

// ── Recursive branch (populates tips[] and segments[]) ───────────────────────
function growBranch(ctx, x, y, angle, len, w, depth, rng, tips, segments, period) {
  if (w < 0.7 || len < 4) { if (w >= 0.4) tips.push({ x, y }); return; }
  const curve = (rng() - 0.5) * 0.20;
  const ex = x + Math.cos(angle + curve) * len;
  const ey = y + Math.sin(angle + curve) * len;
  const w1 = w * (0.60 + rng() * 0.06);
  branchSeg(ctx, x, y, ex, ey, w, w1, rng);
  segments.push({ x0: x, y0: y, x1: ex, y1: ey, period });
  if (depth <= 0) { tips.push({ x: ex, y: ey }); return; }
  const n = rng() < 0.28 ? 3 : 2;
  const spread = 0.40 + rng() * 0.20;
  for (let i = 0; i < n; i++) {
    const side = n === 2 ? (i === 0 ? -1 : 1) : (i - 1);
    growBranch(
      ctx, ex, ey, angle + curve + side * spread * (0.8 + rng() * 0.4),
      len * (0.60 + rng() * 0.10), w1, depth - 1, rng, tips, segments, period
    );
  }
}

// ── Leaf Crown ───────────────────────────────────────────────────────────────
function drawCrown(ctx, cx, cy, radius, rng) {
  const nb = 8 + Math.floor(rng() * 5);
  for (let i = 0; i < nb; i++) {
    const t = rng() * Math.PI * 2;
    const d = rng() * radius * 0.6;
    const bx = cx + Math.cos(t) * d, by = cy + Math.sin(t) * d * 0.75;
    const br = radius * (0.45 + rng() * 0.35);
    const bg = ctx.createRadialGradient(bx - br * 0.2, by - br * 0.2, 0, bx, by, br);
    bg.addColorStop(0, 'rgba(68,148,42,0.55)');
    bg.addColorStop(0.5, 'rgba(45,110,28,0.40)');
    bg.addColorStop(1, 'rgba(25,70,14,0)');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.ellipse(bx, by, br, br * 0.78, rng() * Math.PI, 0, Math.PI * 2); ctx.fill();
  }

  const totalLeaves = Math.floor(55 + rng() * 30);
  for (let pass = 0; pass < 3; pass++) {
    const share = pass === 0 ? 0.40 : pass === 1 ? 0.35 : 0.25;
    const n = Math.round(totalLeaves * share);
    for (let i = 0; i < n; i++) {
      const t = rng() * Math.PI * 2;
      const normY = (Math.sin(t) * 0.5 + 0.5);
      const rx = radius * (0.5 + normY * 0.5);
      const ry = radius * 0.75;
      const lx = cx + Math.cos(t) * rx * (0.15 + rng() * 0.85);
      const ly = cy + Math.sin(t) * ry * (0.15 + rng() * 0.85);
      const leafLen = radius * (0.28 + rng() * 0.24);
      const leafW = leafLen * (0.36 + rng() * 0.26);
      const leafAng = rng() * Math.PI * 2;
      const hue = 95 + rng() * 28;
      const sat = 55 + rng() * 22;
      const lit = pass === 0 ? (28 + rng() * 10) : pass === 1 ? (36 + rng() * 12) : (44 + rng() * 11);
      ctx.save();
      ctx.translate(lx, ly); ctx.rotate(leafAng);
      ctx.beginPath(); ctx.ellipse(0, 0, leafLen * 0.5, leafW * 0.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue},${sat}%,${lit}%,${0.88 + rng() * 0.12})`;
      ctx.fill();
      if (pass === 2 && leafLen > 8) {
        ctx.beginPath(); ctx.moveTo(-leafLen * 0.4, 0); ctx.lineTo(leafLen * 0.44, 0);
        ctx.strokeStyle = `hsla(${hue},${sat - 8}%,${lit + 14}%,0.30)`;
        ctx.lineWidth = 0.5; ctx.stroke();
      }
      ctx.restore();
    }
  }

  const hl = ctx.createRadialGradient(cx - radius * 0.18, cy - radius * 0.28, 0, cx, cy, radius * 0.9);
  hl.addColorStop(0, 'rgba(180,255,120,0.10)');
  hl.addColorStop(0.5, 'rgba(120,200,70,0.05)');
  hl.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = hl; ctx.beginPath();
  ctx.ellipse(cx, cy, radius * 0.9, radius * 0.72, 0, 0, Math.PI * 2); ctx.fill();
}

// ── Ambient glow ─────────────────────────────────────────────────────────────
function drawAmbient(ctx, cx, cy, W, H) {
  const grd = ctx.createRadialGradient(cx, cy - H * 0.3, 0, cx, cy - H * 0.3, W * 0.55);
  grd.addColorStop(0, 'rgba(60,170,60,0.10)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
}

// ── Stage: Seed (0 days) ──────────────────────────────────────────────────────
function drawSeed(ctx, W, H) {
  const cx = W / 2, cy = H * 0.62;
  const rng = rngFrom(7);
  const ground = cy + 22;
  const gGrd = ctx.createLinearGradient(cx - 60, ground, cx + 60, ground);
  gGrd.addColorStop(0, 'rgba(0,0,0,0)');
  gGrd.addColorStop(0.3, 'rgba(105,78,48,0.30)');
  gGrd.addColorStop(0.7, 'rgba(105,78,48,0.30)');
  gGrd.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gGrd; ctx.fillRect(cx - 60, ground, 120, 5);
  const outerGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 80);
  outerGrd.addColorStop(0, 'rgba(108,195,90,0.08)'); outerGrd.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = outerGrd; ctx.fillRect(cx - 80, cy - 80, 160, 160);
  const halo = ctx.createRadialGradient(cx, cy, 4, cx, cy, 36);
  halo.addColorStop(0, 'rgba(108,195,90,0.55)'); halo.addColorStop(0.45, 'rgba(108,195,90,0.18)'); halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath(); ctx.arc(cx, cy, 36, 0, Math.PI * 2); ctx.fillStyle = halo; ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx, cy, 9, 12, -0.15, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(125,96,60,0.92)'; ctx.fill();
  ctx.strokeStyle = 'rgba(108,195,90,0.55)'; ctx.lineWidth = 1.5; ctx.stroke();
  for (let i = 0; i < 7; i++) {
    const ang = rng() * Math.PI * 2, dist = 22 + rng() * 28;
    const px = cx + Math.cos(ang) * dist, py = cy + Math.sin(ang) * dist;
    ctx.beginPath(); ctx.arc(px, py, 1.2 + rng() * 1.8, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(210,255,190,${0.35 + rng() * 0.4})`; ctx.fill();
  }
}

// ── Stage: Crack (1 day) ──────────────────────────────────────────────────────
function drawCrack(ctx, W, H) {
  drawSeed(ctx, W, H);
  const cx = W / 2, cy = H * 0.62;
  ctx.beginPath(); ctx.moveTo(cx, cy - 12); ctx.lineTo(cx - 2, cy - 22); ctx.lineTo(cx + 1, cy - 28);
  ctx.strokeStyle = 'rgba(20,10,4,0.9)'; ctx.lineWidth = 1.4; ctx.lineCap = 'round'; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(cx, cy - 29, 2.5, 4, 0.1, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(200,245,180,0.90)'; ctx.fill();
  const cg = ctx.createRadialGradient(cx, cy - 22, 0, cx, cy - 22, 14);
  cg.addColorStop(0, 'rgba(150,230,120,0.28)'); cg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = cg; ctx.fillRect(cx - 14, cy - 36, 28, 28);
}

// ── Stage: Sprout (2–7 days) ─────────────────────────────────────────────────
function drawSprout(ctx, W, H) {
  const bx = W / 2, by = H - 28, stemH = H * 0.18;
  drawAmbient(ctx, bx, by, W, H);
  const gGrd = ctx.createLinearGradient(bx - 55, by, bx + 55, by);
  gGrd.addColorStop(0, 'rgba(0,0,0,0)'); gGrd.addColorStop(0.3, 'rgba(105,78,48,0.28)');
  gGrd.addColorStop(0.7, 'rgba(105,78,48,0.28)'); gGrd.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gGrd; ctx.fillRect(bx - 55, by, 110, 5);
  ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by - stemH);
  ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(105,78,48,0.82)'; ctx.lineCap = 'round'; ctx.stroke();
  const ty = by - stemH;
  for (const [sign, tilt] of [[-1, 0.5], [1, -0.5]]) {
    const lw = stemH * 0.58, lh = stemH * 0.35;
    const lx = bx + sign * stemH * 0.38, ly = ty + stemH * 0.08;
    ctx.beginPath(); ctx.ellipse(lx, ly, lw, lh, tilt, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(108,195,90,0.62)'; ctx.fill();
    ctx.strokeStyle = 'rgba(150,230,130,0.35)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx, ty); ctx.lineTo(lx + sign * lw * 0.45, ly);
    ctx.lineWidth = 0.8; ctx.strokeStyle = 'rgba(150,230,130,0.22)'; ctx.stroke();
  }
  const budGrd = ctx.createRadialGradient(bx, ty - 6, 0, bx, ty - 6, 14);
  budGrd.addColorStop(0, 'rgba(108,195,90,0.5)'); budGrd.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath(); ctx.arc(bx, ty - 6, 14, 0, Math.PI * 2); ctx.fillStyle = budGrd; ctx.fill();
  ctx.beginPath(); ctx.arc(bx, ty - 6, 5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(108,195,90,0.85)'; ctx.fill();
}

// ── Stage: Sapling (8–30 days) ───────────────────────────────────────────────
function drawSapling(ctx, W, H, seed) {
  const cx = W / 2, gy = H - 40;
  drawAmbient(ctx, cx, gy, W, H);
  drawGround(ctx, cx, gy, W);
  drawSimpleRoots(ctx, cx, gy, 0.6);
  ctx.beginPath(); ctx.moveTo(cx, gy); ctx.lineTo(cx + 1, gy - 65);
  ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(105,78,48,0.82)'; ctx.lineCap = 'round'; ctx.stroke();
  const tips = [], segs = [];
  growBranch(ctx, cx + 1, gy - 65, -Math.PI / 2 + 0.45, 32, 6, 1, rngFrom(seed + 10), tips, segs, 'early');
  growBranch(ctx, cx + 1, gy - 65, -Math.PI / 2 - 0.45, 30, 5.5, 1, rngFrom(seed + 20), tips, segs, 'early');
  tips.forEach(pt => {
    drawCrown(ctx, pt.x, pt.y, 22, rngFrom(Math.floor(pt.x * 11 + pt.y * 17 + seed)));
  });
}

// ── Stage: Young (31–90 days) ────────────────────────────────────────────────
function drawYoung(ctx, W, H, seed) {
  const cx = W / 2, gy = H - 45;
  drawAmbient(ctx, cx, gy, W, H);
  drawGround(ctx, cx, gy, W);
  drawSimpleRoots(ctx, cx, gy, 0.85);
  ctx.beginPath(); ctx.moveTo(cx, gy); ctx.lineTo(cx + 2, gy - 95);
  ctx.lineWidth = 13; ctx.strokeStyle = 'rgba(105,78,48,0.85)'; ctx.lineCap = 'round'; ctx.stroke();
  const topY = gy - 95, tips = [], segs = [];
  const branchDefs = [
    { t: 0.80, ang: -Math.PI / 2 + 0.55, lenR: 0.44, wR: 0.30 },
    { t: 0.80, ang: -Math.PI / 2 - 0.55, lenR: 0.42, wR: 0.28 },
    { t: 0.50, ang: -Math.PI / 2 + 0.72, lenR: 0.32, wR: 0.20 },
    { t: 0.50, ang: -Math.PI / 2 - 0.72, lenR: 0.30, wR: 0.18 },
  ];
  branchDefs.forEach((def, idx) => {
    const bx = lerp(cx, cx + 2, def.t);
    const by = lerp(gy, topY, def.t);
    growBranch(ctx, bx, by, def.ang, 95 * def.lenR, 13 * def.wR, 2, rngFrom(seed + idx * 7), tips, segs, 'early');
  });
  tips.forEach(pt => {
    drawCrown(ctx, pt.x, pt.y, 28, rngFrom(Math.floor(pt.x * 11 + pt.y * 17 + seed)));
  });
}

// ── Shared: mature/ancient full tree ─────────────────────────────────────────
function drawFullTree(ctx, W, H, cfg, seedN, segments) {
  const rng = rngFrom(seedN);
  const cx = W / 2, gy = H - cfg.groundOff;
  drawAmbient(ctx, cx, gy, W, H);
  drawGround(ctx, cx, gy, W);
  drawDetailedRoots(ctx, cx, gy, cfg.roots, cfg.rootScale, rngFrom(seedN + 11));
  const { topX, topY } = drawTrunk(ctx, cx, gy, gy - cfg.trunkH, cfg.trunkW, cfg.lean, rngFrom(seedN + 3));

  const tips = [];
  const branchDefs = [
    { t: 0.93, ang: -Math.PI / 2 + 0.55, lenR: 0.50, wR: 0.27, period: 'recent' },
    { t: 0.93, ang: -Math.PI / 2 - 0.55, lenR: 0.48, wR: 0.25, period: 'recent' },
    { t: 0.74, ang: -Math.PI / 2 + 0.68, lenR: 0.44, wR: 0.20, period: 'mid'    },
    { t: 0.74, ang: -Math.PI / 2 - 0.68, lenR: 0.42, wR: 0.19, period: 'mid'    },
    { t: 0.55, ang: -Math.PI / 2 + 0.78, lenR: 0.36, wR: 0.15, period: 'early'  },
    { t: 0.55, ang: -Math.PI / 2 - 0.78, lenR: 0.34, wR: 0.14, period: 'early'  },
  ].slice(0, cfg.nBranches);

  branchDefs.forEach(def => {
    const bx = lerp(cx, topX, def.t) + (rng() - 0.5) * 2.5;
    const by = lerp(gy, topY, def.t);
    const blen = cfg.trunkH * def.lenR;
    const bw = cfg.trunkW * def.wR;
    growBranch(ctx, bx, by, def.ang + (rng() - 0.5) * 0.08, blen, bw, cfg.branchDepth, rngFrom(Math.floor(bx * 7 + by * 13 + seedN)), tips, segments, def.period);
  });

  tips.forEach(pt => {
    const cr2 = rngFrom(Math.floor(pt.x * 11 + pt.y * 17 + seedN));
    drawCrown(ctx, pt.x, pt.y, cfg.trunkH * (0.18 + cr2() * 0.10), cr2);
  });
}

// ── Stage: Mature (91–300 days) ───────────────────────────────────────────────
function drawMature(ctx, W, H, seed, segments) {
  drawFullTree(ctx, W, H, {
    trunkH: 148, trunkW: 22, lean: 8, nBranches: 6, branchDepth: 3,
    roots: 5, rootScale: 1.0, groundOff: 70,
  }, seed, segments);
}

// ── Stage: Ancient (300+ days) ───────────────────────────────────────────────
function drawAncient(ctx, W, H, seed, segments) {
  drawFullTree(ctx, W, H, {
    trunkH: 165, trunkW: 30, lean: 11, nBranches: 6, branchDepth: 4,
    roots: 6, rootScale: 1.45, groundOff: 80,
  }, seed, segments);
}

// ── Animated: Seed ───────────────────────────────────────────────────────────
function drawSeedAnimated(ctx, W, H, t) {
  const cx = W / 2, cy = H * 0.62;
  const pulse = 0.82 + Math.sin(t * 0.0018) * 0.18;
  const orbit = t * 0.00055;
  const rng = rngFrom(7);
  const outerGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, 95);
  outerGrd.addColorStop(0, 'rgba(108,195,90,0.07)'); outerGrd.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = outerGrd; ctx.fillRect(0, 0, W, H);
  const soilGrd = ctx.createRadialGradient(cx, cy + 20, 0, cx, cy + 20, 52);
  soilGrd.addColorStop(0, 'rgba(105,78,48,0.42)'); soilGrd.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath(); ctx.ellipse(cx, cy + 22, 52, 14, 0, 0, Math.PI * 2); ctx.fillStyle = soilGrd; ctx.fill();
  const halo = ctx.createRadialGradient(cx, cy, 5, cx, cy, 44 * pulse);
  halo.addColorStop(0, 'rgba(108,195,90,0.55)'); halo.addColorStop(0.45, 'rgba(108,195,90,0.16)'); halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath(); ctx.arc(cx, cy, 44 * pulse, 0, Math.PI * 2); ctx.fillStyle = halo; ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx, cy, 9, 12, -0.15, 0, Math.PI * 2);
  const sg = ctx.createRadialGradient(cx - 3, cy - 4, 0, cx, cy, 14);
  sg.addColorStop(0, 'rgba(160,120,78,1)'); sg.addColorStop(0.55, 'rgba(120,90,56,0.96)'); sg.addColorStop(1, 'rgba(90,68,42,0.88)');
  ctx.fillStyle = sg; ctx.fill();
  ctx.strokeStyle = 'rgba(108,195,90,0.52)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx - 2.5, cy - 4, 2.8, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.38)'; ctx.fill();
  for (let i = 0; i < 6; i++) {
    const base = rng() * Math.PI * 2;
    const ang = base + orbit * (1 + i * 0.28);
    const dist = 28 + rng() * 18;
    const px = cx + Math.cos(ang) * dist, py = cy + Math.sin(ang) * dist * 0.45;
    const sr = 0.9 + rng() * 1.6;
    const fa = 0.25 + Math.abs(Math.sin(t * 0.0019 + i * 1.1)) * 0.35;
    const pg = ctx.createRadialGradient(px, py, 0, px, py, sr * 2.2);
    pg.addColorStop(0, `rgba(210,255,190,${fa})`); pg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.arc(px, py, sr * 2.2, 0, Math.PI * 2); ctx.fillStyle = pg; ctx.fill();
  }
}

// ── Animated: Crack ───────────────────────────────────────────────────────────
function drawCrackAnimated(ctx, W, H, t) {
  drawSeedAnimated(ctx, W, H, t);
  const cx = W / 2, cy = H * 0.62;
  const pulse = 0.82 + Math.sin(t * 0.0022) * 0.18;
  ctx.beginPath(); ctx.moveTo(cx, cy - 12); ctx.lineTo(cx - 2, cy - 22); ctx.lineTo(cx + 1, cy - 28);
  ctx.strokeStyle = 'rgba(20,10,4,0.9)'; ctx.lineWidth = 1.4; ctx.lineCap = 'round'; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(cx, cy - 29, 2.5 * pulse, 4 * pulse, 0.1, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(200,245,180,0.90)'; ctx.fill();
  const cg = ctx.createRadialGradient(cx, cy - 22, 0, cx, cy - 22, 14 * pulse);
  cg.addColorStop(0, 'rgba(150,230,120,0.28)'); cg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = cg; ctx.fillRect(cx - 14, cy - 36, 28, 28);
}

// ── Animated: Sprout ──────────────────────────────────────────────────────────
function drawSproutAnimated(ctx, W, H, t) {
  const bx = W / 2, by = H - 30, stemH = H * 0.22;
  const sway = Math.sin(t * 0.00088) * 0.058 + Math.sin(t * 0.00142) * 0.022;
  drawAmbient(ctx, bx, by, W, H);
  const soilGrd = ctx.createRadialGradient(bx, by + 4, 0, bx, by + 4, 55);
  soilGrd.addColorStop(0, 'rgba(105,78,48,0.48)'); soilGrd.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath(); ctx.ellipse(bx, by + 6, 55, 15, 0, 0, Math.PI * 2); ctx.fillStyle = soilGrd; ctx.fill();
  ctx.save(); ctx.translate(bx, by); ctx.rotate(sway);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -stemH);
  ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(105,78,48,0.90)'; ctx.lineCap = 'round'; ctx.stroke();
  const leafWave = Math.sin(t * 0.00155 + 0.3) * 0.065;
  for (const [side, wave] of [[-1, leafWave], [1, -leafWave]]) {
    ctx.save(); ctx.translate(0, -stemH * 0.55); ctx.rotate(side * 0.42 + wave);
    const lw = stemH * 0.40, lh = stemH * 0.26;
    ctx.beginPath(); ctx.ellipse(side * lw * 0.5, -lh * 0.3, lw, lh, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(108,195,90,0.77)'; ctx.fill();
    ctx.restore();
  }
  const pulse = 0.80 + Math.sin(t * 0.0022) * 0.20;
  const budR = 22 * pulse;
  const budGrd = ctx.createRadialGradient(0, -stemH - 9, 0, 0, -stemH - 9, budR);
  budGrd.addColorStop(0, 'rgba(108,195,90,0.78)'); budGrd.addColorStop(0.42, 'rgba(108,195,90,0.22)'); budGrd.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath(); ctx.arc(0, -stemH - 9, budR, 0, Math.PI * 2); ctx.fillStyle = budGrd; ctx.fill();
  ctx.beginPath(); ctx.arc(0, -stemH - 9, 5.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(108,195,90,0.95)'; ctx.fill();
  ctx.restore();
}

// ── Public API ───────────────────────────────────────────────────────────────

export function getStage(dayCount) {
  if (dayCount === 0)   return 'seed';
  if (dayCount === 1)   return 'crack';
  if (dayCount <= 7)    return 'sprout';
  if (dayCount <= 30)   return 'sapling';
  if (dayCount <= 90)   return 'young';
  if (dayCount <= 300)  return 'mature';
  return 'ancient';
}

// Returns { branchSegments: [{x0,y0,x1,y1,period},...] }
export function drawTree(canvas, dayCount, seed) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const stage = getStage(dayCount);
  const s = seed || 42;
  const segments = [];
  switch (stage) {
    case 'seed':    drawSeed(ctx, W, H); break;
    case 'crack':   drawCrack(ctx, W, H); break;
    case 'sprout':  drawSprout(ctx, W, H); break;
    case 'sapling': drawSapling(ctx, W, H, s); break;
    case 'young':   drawYoung(ctx, W, H, s); break;
    case 'mature':  drawMature(ctx, W, H, s, segments); break;
    case 'ancient': drawAncient(ctx, W, H, s, segments); break;
  }
  return { branchSegments: segments };
}

// Animated variant for seed/crack/sprout (oscillating glow + sway)
export function drawAnimated(canvas, dayCount, seed, t) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const stage = getStage(dayCount);
  const s = seed || 42;
  if (stage === 'seed')   { drawSeedAnimated(ctx, W, H, t); return; }
  if (stage === 'crack')  { drawCrackAnimated(ctx, W, H, t); return; }
  if (stage === 'sprout') { drawSproutAnimated(ctx, W, H, t); return; }
  const segments = [];
  switch (stage) {
    case 'sapling': drawSapling(ctx, W, H, s); break;
    case 'young':   drawYoung(ctx, W, H, s); break;
    case 'mature':  drawMature(ctx, W, H, s, segments); break;
    case 'ancient': drawAncient(ctx, W, H, s, segments); break;
  }
}

// For transition animation in app.js
export { drawSeedAnimated as _drawSeedAnimated, drawCrackAnimated as _drawCrackAnimated, drawSprout as _drawSprout };
