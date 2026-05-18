// app/tree.js — Canvas 2D 宽冠橡树，6 个生长阶段

function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 0xffffffff; };
}

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
    grd.addColorStop(0,    `rgba(${pal.lf[0]},${pal.lf[1]},${pal.lf[2]},0.45)`);
    grd.addColorStop(0.55, `rgba(${pal.lf[0]},${pal.lf[1]},${pal.lf[2]},0.18)`);
    grd.addColorStop(1,    'rgba(0,0,0,0)');
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
    drawBranch(ctx, rng, ex, ey, angle+sp*0.88, len*0.6,  width*0.6, depth-1, maxDepth, pal);
    drawBranch(ctx, rng, ex, ey, angle,          len*0.64, width*0.6, depth-1, maxDepth, pal);
    drawBranch(ctx, rng, ex, ey, angle-sp*0.88, len*0.6,  width*0.6, depth-1, maxDepth, pal);
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
  ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by - 30);
  ctx.lineWidth = 3; ctx.strokeStyle = `rgba(${pal.br[0]},${pal.br[1]},${pal.br[2]},0.75)`;
  ctx.lineCap = 'round'; ctx.stroke();
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
  drawBranch(ctx, makeRng(42), bx+3, by-trunkH, Math.PI/2+0.32, brLen,      14, 7, 7, pal);
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
  drawBranch(ctx, makeRng(42), bx+4, by-trunkH, Math.PI/2+0.32, brLen,      17, 8, 8, pal);
  drawBranch(ctx, makeRng(43), bx+4, by-trunkH, Math.PI/2-0.28, brLen*0.96, 17, 8, 8, pal);
  drawBranch(ctx, makeRng(77), bx+2, by-trunkH*0.55, Math.PI/2+0.68, brLen*0.45, 7, 5, 5, pal);
}

// ── Public API ──

export function getStage(totalDaysThisYear) {
  if (totalDaysThisYear === 0)   return 'seed';
  if (totalDaysThisYear <= 7)    return 'sprout';
  if (totalDaysThisYear <= 30)   return 'sapling';
  if (totalDaysThisYear <= 90)   return 'young';
  if (totalDaysThisYear <= 300)  return 'mature';
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
