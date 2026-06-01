import { drawTree, drawAnimated, getStage } from './tree.js';
import { WeatherManager } from './weather.js';
import { saveImage, getImage, deleteImage, getDBSizeEstimate } from './db.js';
import { compressImage } from './image-compressor.js';
import { initEmojiPicker, toggleEmojiPicker } from './emoji-picker.js';

const STORAGE_KEY   = 'daily_tree_entries';
const VISITED_KEY   = 'daily_tree_visited';
const ONBOARDED_KEY = 'daily_tree_onboarded';

const STAGE_CONFIG = [
  { key:'seed',    name:'种子',   emoji:'🌰', unlock:1,   renderDays:1,   desc:'万物始于一粒种子' },
  { key:'sprout',  name:'嫩芽',   emoji:'🌱', unlock:3,   renderDays:3,   desc:'破土而出，生命开始' },
  { key:'sapling', name:'幼苗',   emoji:'🪴', unlock:7,   renderDays:15,  desc:'第一片叶，扎根成形' },
  { key:'young',   name:'青树',   emoji:'🌿', unlock:30,  renderDays:50,  desc:'枝条分叉，树冠成型' },
  { key:'mature',  name:'壮年树', emoji:'🌳', unlock:90,  renderDays:180, desc:'繁茂深根，见证岁月' },
  { key:'ancient', name:'古树',   emoji:'🌲', unlock:300, renderDays:400, desc:'历经风雨，屹立不倒' },
];

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
function addEntryWithDate(dateStr, text, imageIds = []) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const entries = loadEntries();
  if (!entries[year]) entries[year] = [];
  const d = new Date(year, month - 1, day, 12, 0, 0);
  entries[year].push({ id: Date.now(), text: text.slice(0, 500), date: d.toISOString(), images: imageIds });
  saveEntries(entries);
}
function updateEntry(id, text, imageIds) {
  const entries = loadEntries();
  for (const y in entries) {
    const e = entries[y].find(x => x.id === id);
    if (e) {
      e.text = text.slice(0, 500);
      if (imageIds !== undefined) e.images = imageIds;
      saveEntries(entries);
      return true;
    }
  }
  return false;
}
function getYearEntries(year) { return (loadEntries()[year] || []); }

function escapeHtml(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

async function renderEntryThumbs(entry, container) {
  const ids = entry.images || [];
  if (!ids.length) return;
  const row = document.createElement('div');
  row.className = 'entry-thumbs';
  const show = ids.slice(0, 3);
  for (const id of show) {
    const blob = await getImage(id);
    if (!blob) continue;
    const url = URL.createObjectURL(blob);
    const img = document.createElement('img');
    img.src = url;
    img.className = 'entry-thumb';
    img.alt = '';
    img.addEventListener('click', () => openImagePreview(url));
    row.appendChild(img);
  }
  if (ids.length > 3) {
    const more = document.createElement('div');
    more.className = 'entry-thumb-more';
    more.textContent = `+${ids.length - 3}`;
    row.appendChild(more);
  }
  container.appendChild(row);
}

function openImagePreview(objectUrl) {
  const overlay = document.getElementById('img-preview-overlay');
  const img     = document.getElementById('img-preview-full');
  if (!overlay || !img) return;
  img.src = objectUrl;
  overlay.classList.remove('hidden');
}
function closeImagePreview() {
  const overlay = document.getElementById('img-preview-overlay');
  if (overlay) overlay.classList.add('hidden');
}

function computeTotalDaysThisYear() {
  const year = new Date().getFullYear();
  const entries = getYearEntries(year);
  const days = new Set(entries.map(e => e.date.substring(0, 10)));
  return days.size;
}

function getTreeSeed() {
  let seed = parseInt(localStorage.getItem('daily_tree_seed') || '0', 10);
  if (!seed) {
    seed = Math.floor(Math.random() * 99999) + 1;
    localStorage.setItem('daily_tree_seed', String(seed));
  }
  return seed;
}

// ── selectedDate ──────────────────────────────────────────────────────────

let selectedDate = getTodayKey();

function selectDate(dateKey) {
  selectedDate = dateKey;
  const todayKey = getTodayKey();
  const chip = document.getElementById('today-chip');
  if (chip) chip.classList.toggle('hidden', dateKey === todayKey);

  const entries = loadEntries();
  const year = parseInt(dateKey.split('-')[0], 10);
  const entry = (entries[year] || []).find(e => e.date.substring(0, 10) === dateKey);

  document.querySelectorAll('.timeline-cell').forEach(cell => {
    cell.classList.toggle('selected', cell.dataset.date === dateKey);
  });

  if (entry) {
    openModal(entry, dateKey !== todayKey);
  } else if (dateKey === todayKey) {
    openModal(null, false);
  } else {
    showToast('那天没有记录。');
  }
}

function renderTimeline() {
  const strip = document.getElementById('timeline-strip');
  if (!strip) return;

  const entries = loadEntries();
  const todayKey = getTodayKey();
  const today = new Date();

  const doneSet = new Set();
  for (const year in entries) {
    for (const e of entries[year]) doneSet.add(e.date.substring(0, 10));
  }

  strip.innerHTML = '';
  let todayCell = null;

  for (let i = 59; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const isToday = key === todayKey;
    const hasDot = doneSet.has(key);

    const cell = document.createElement('div');
    cell.className = 'timeline-cell' + (isToday ? ' today' : '') + (key === selectedDate ? ' selected' : '');
    cell.dataset.date = key;

    const label = document.createElement('div');
    label.className = 'timeline-day';
    label.textContent = `${d.getMonth()+1}/${d.getDate()}`;

    const dot = document.createElement('div');
    dot.className = 'timeline-dot' + (hasDot ? '' : ' empty');

    cell.appendChild(label);
    cell.appendChild(dot);
    cell.addEventListener('click', () => selectDate(key));
    strip.appendChild(cell);

    if (isToday) todayCell = cell;
  }

  if (todayCell) {
    requestAnimationFrame(() => {
      todayCell.scrollIntoView({ inline: 'center', behavior: 'smooth' });
    });
  }
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
  const container = document.querySelector('.canvas-wrap');
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
  const canvas = document.getElementById('tree-canvas');
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
  setTimeout(() => showToast('已保存！你的树又长大了一点。', 'success'), 300);
}

// ── Background Particles ──────────────────────────────────────────────────

function initBgParticles(canvas) {
  const ctx = canvas.getContext('2d');
  const particles = [];

  function resize() {
    const dpr = devicePixelRatio || 1;
    canvas.width  = Math.round(canvas.clientWidth  * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
  }

  function spawn() {
    const W = canvas.width || 400, H = canvas.height || 800;
    const dpr = devicePixelRatio || 1;
    return {
      x: Math.random() * W,
      y: H * (0.25 + Math.random() * 0.75),
      vy: -(0.10 + Math.random() * 0.32) * dpr,
      vx: (Math.random() - 0.5) * 0.14 * dpr,
      r: (0.7 + Math.random() * 2.0) * dpr,
      alpha: 0.10 + Math.random() * 0.28,
      life: 0,
      maxLife: 200 + Math.random() * 340,
      hue: 115 + Math.random() * 48,
    };
  }

  resize();
  for (let i = 0; i < 42; i++) {
    const p = spawn();
    p.y = Math.random() * (canvas.height || 800);
    p.life = Math.random() * p.maxLife;
    particles.push(p);
  }
  window.addEventListener('resize', resize);

  function frame() {
    const W = canvas.width, H = canvas.height;
    if (!W || !H) { requestAnimationFrame(frame); return; }
    const dpr = devicePixelRatio || 1;

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0,   '#030a05');
    bg.addColorStop(0.55, '#060f07');
    bg.addColorStop(1,   '#071309');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    const bGld = ctx.createRadialGradient(W/2, H, 0, W/2, H, W * 0.62);
    bGld.addColorStop(0, 'rgba(22, 72, 22, 0.16)');
    bGld.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bGld; ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx + Math.sin(p.life * 0.022) * 0.22 * dpr;
      p.y += p.vy;
      p.life++;
      const lr   = p.life / p.maxLife;
      const fade = lr < 0.14 ? lr / 0.14 : lr > 0.78 ? (1 - lr) / 0.22 : 1;
      const grd  = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2.4);
      grd.addColorStop(0, `hsla(${p.hue},62%,68%,${p.alpha * fade})`);
      grd.addColorStop(1, 'hsla(0,0%,0%,0)');
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 2.4, 0, Math.PI * 2);
      ctx.fillStyle = grd; ctx.fill();
      if (p.life >= p.maxLife || p.y < -10) particles[i] = spawn();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// ── Tree / App Core ───────────────────────────────────────────────────────

let weatherManager = null;
let treeAnimRafId  = null;
let _branchSegments = [];

function pointSegDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx*dx + dy*dy;
  if (lenSq === 0) return Math.hypot(px-ax, py-ay);
  const t = Math.max(0, Math.min(1, ((px-ax)*dx + (py-ay)*dy) / lenSq));
  return Math.hypot(px - (ax + t*dx), py - (ay + t*dy));
}

function startTreeAnimation() {
  if (treeAnimRafId) { cancelAnimationFrame(treeAnimRafId); treeAnimRafId = null; }
  const canvas = document.getElementById('tree-canvas');
  if (!canvas) return;
  const total = computeTotalDaysThisYear();
  const seed  = getTreeSeed();
  const stage = getStage(total);

  if (stage === 'seed' || stage === 'crack' || stage === 'sprout') {
    function frame(t) {
      drawAnimated(canvas, total, seed, t);
      treeAnimRafId = requestAnimationFrame(frame);
    }
    treeAnimRafId = requestAnimationFrame(frame);
    _branchSegments = [];
  } else {
    const result = drawTree(canvas, total, seed);
    _branchSegments = result.branchSegments || [];
  }
}

function initApp() {
  const treeCanvas    = document.getElementById('tree-canvas');
  const weatherCanvas = document.getElementById('weather-canvas');
  const bgCanvas      = document.getElementById('bg-canvas');
  if (!treeCanvas) return;

  function resizeCanvases() {
    const W = Math.round(treeCanvas.clientWidth  * devicePixelRatio);
    const H = Math.round(treeCanvas.clientHeight * devicePixelRatio);
    if (W === 0 || H === 0) return;
    treeCanvas.width    = W; treeCanvas.height    = H;
    if (weatherCanvas) { weatherCanvas.width = W; weatherCanvas.height = H; }
  }
  if (bgCanvas) initBgParticles(bgCanvas);
  if (weatherCanvas) {
    weatherManager = new WeatherManager(weatherCanvas);
    weatherManager.init();
  }

  // defer until after first paint so clientWidth/Height are available on mobile
  requestAnimationFrame(() => { resizeCanvases(); refreshTree(); });
  window.addEventListener('resize', () => { resizeCanvases(); refreshTree(); });
}

function refreshTree() {
  const total = computeTotalDaysThisYear();
  startTreeAnimation();
  updateTopBar();
  renderTimeline();
  updateEmptyHint(total);
}

function updateEmptyHint(total) {
  const hint = document.getElementById('empty-hint');
  if (!hint) return;
  if (total > 0) {
    hint.classList.add('hidden');
  } else {
    hint.classList.remove('hidden');
  }
}

// ── Top Bar ───────────────────────────────────────────────────────────────

function updateTopBar() {
  const dateEl     = document.getElementById('top-date');
  const reminderEl = document.getElementById('top-reminder');
  if (dateEl) {
    const d = new Date();
    dateEl.textContent = d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });
  }
  if (reminderEl) {
    const today = getTodayEntry();
    reminderEl.style.display = today ? 'none' : '';
  }
}


// ── Branch Panel ──────────────────────────────────────────────────────────

function openBranchPanel(zone) {
  const panel   = document.getElementById('branch-panel');
  const titleEl = document.getElementById('branch-panel-title');
  const list    = document.getElementById('branch-panel-entries');
  if (!panel || !list) return;

  const allEntries = getYearEntries(new Date().getFullYear());
  const todayKey   = getTodayKey();

  let filtered = [];
  let label    = '';
  if (zone === 'recent') {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
    filtered = allEntries.filter(e => new Date(e.date) >= cutoff);
    label = '近 30 天';
  } else if (zone === 'mid') {
    const c1 = new Date(); c1.setDate(c1.getDate() - 90);
    const c2 = new Date(); c2.setDate(c2.getDate() - 30);
    filtered = allEntries.filter(e => { const d = new Date(e.date); return d >= c1 && d < c2; });
    label = '30–90 天前';
  } else {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 90);
    filtered = allEntries.filter(e => new Date(e.date) < cutoff);
    label = '90 天以前';
  }

  if (titleEl) titleEl.textContent = label;
  list.innerHTML = '';

  if (filtered.length === 0) {
    const li = document.createElement('li');
    li.className = 'branch-empty';
    li.textContent = '暂无记录';
    list.appendChild(li);
  } else {
    filtered.slice().reverse().forEach(entry => {
      const li      = document.createElement('li');
      li.className  = 'branch-entry';
      li.setAttribute('data-date', entry.date.substring(0, 10));
      const date    = new Date(entry.date);
      const dateStr = date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
      const isToday = entry.date.substring(0, 10) === todayKey;
      li.innerHTML = `
        <span class="branch-entry-date">${dateStr}${isToday ? ' <em>今天</em>' : ''}</span>
        <p class="branch-entry-text">${escapeHtml(entry.text)}</p>
      `;
      renderEntryThumbs(entry, li);
      list.appendChild(li);
    });
  }

  panel.classList.add('open');
}

function closeBranchPanel() {
  document.getElementById('branch-panel')?.classList.remove('open');
}

function onTreeClick(e) {
  if (!_branchSegments.length) return;
  const canvas = document.getElementById('tree-canvas');
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const dpr  = devicePixelRatio || 1;
  const cx   = (e.clientX - rect.left) * dpr;
  const cy   = (e.clientY - rect.top)  * dpr;

  let minDist = Infinity, nearest = null;
  for (const seg of _branchSegments) {
    const d = pointSegDist(cx, cy, seg.x0, seg.y0, seg.x1, seg.y1);
    if (d < minDist) { minDist = d; nearest = seg; }
  }

  if (minDist < 18 * dpr) openBranchPanel(nearest.period);
}

// ── Modal ─────────────────────────────────────────────────────────────────

let _editEntry = null;
let _modalImages = []; // { id: string, objectUrl: string }[]
let _modalSessionId = 0;

function clearModalImages() {
  _modalImages.forEach(m => URL.revokeObjectURL(m.objectUrl));
  _modalImages = [];
  const container = document.getElementById('modal-images');
  if (container) container.innerHTML = '';
}

function openModal(entryToEdit, readOnly) {
  _editEntry = (!readOnly && entryToEdit) ? entryToEdit : null;
  const overlay  = document.getElementById('modal-overlay');
  const textarea = document.getElementById('entry-text');
  const label    = document.getElementById('modal-label');
  const submit   = document.getElementById('entry-submit');
  const toolbar  = document.getElementById('modal-toolbar');

  clearModalImages();
  const sessionId = ++_modalSessionId;

  if (textarea) {
    textarea.value = entryToEdit ? entryToEdit.text : '';
    textarea.readOnly = !!readOnly;
    updateCharCount();
  }
  if (label) {
    label.textContent = readOnly
      ? (entryToEdit?.date?.substring(0,10) || selectedDate)
      : (entryToEdit ? '修改记录' : '今天最重要的一件事？');
  }
  if (submit) submit.style.display = readOnly ? 'none' : '';
  if (toolbar) toolbar.style.display = readOnly ? 'none' : '';

  // 加载已有图片缩略图
  // 先同步插入 ID（保证 submitEntry 读到完整 imageIds），再异步填充 objectUrl
  if (entryToEdit?.images?.length) {
    entryToEdit.images.forEach(imgId => {
      _modalImages.push({ id: imgId, objectUrl: '' }); // 占位，确保 ID 不丢失
      getImage(imgId).then(blob => {
        if (sessionId !== _modalSessionId) { return; }
        if (!blob) {
          _modalImages = _modalImages.filter(m => m.id !== imgId);
          return;
        }
        const url = URL.createObjectURL(blob);
        const entry = _modalImages.find(m => m.id === imgId);
        if (entry) entry.objectUrl = url;
        appendThumbToModal(imgId, url);
      });
    });
    updateImageBtnState();
  }

  overlay?.classList.add('active');
  if (!readOnly) setTimeout(() => textarea?.focus(), 150);
}

function closeModal() {
  document.getElementById('modal-overlay')?.classList.remove('active');
  const textarea = document.getElementById('entry-text');
  const submit   = document.getElementById('entry-submit');
  const toolbar  = document.getElementById('modal-toolbar');
  if (textarea) textarea.readOnly = false;
  if (submit)   submit.style.display = '';
  if (toolbar)  toolbar.style.display = '';
  clearModalImages();
  _editEntry = null;
}

function appendThumbToModal(imgId, objectUrl) {
  const container = document.getElementById('modal-images');
  if (!container) return;
  const wrap = document.createElement('div');
  wrap.className = 'modal-img-thumb';
  wrap.dataset.imgId = imgId;
  const img = document.createElement('img');
  img.src = objectUrl;
  img.alt = '';
  const btn = document.createElement('button');
  btn.className = 'modal-img-remove';
  btn.textContent = '✕';
  btn.type = 'button';
  btn.addEventListener('click', () => {
    _modalImages = _modalImages.filter(m => m.id !== imgId);
    URL.revokeObjectURL(objectUrl);
    deleteImage(imgId).catch(() => {}); // 忽略删除失败，不影响 UI
    wrap.remove();
    updateImageBtnState();
  });
  wrap.appendChild(img);
  wrap.appendChild(btn);
  container.appendChild(wrap);
  updateImageBtnState();
}

function updateImageBtnState() {
  const btn = document.getElementById('btn-image');
  if (btn) btn.style.opacity = _modalImages.length >= 3 ? '0.35' : '1';
  const input = document.getElementById('image-file-input');
  if (input) input.disabled = _modalImages.length >= 3;
}

function updateCharCount() {
  const ta = document.getElementById('entry-text');
  const cc = document.getElementById('char-count');
  if (ta && cc) cc.textContent = ta.value.length;
}

function playSproutTransition(canvas, dayCount, seed) {
  const stageBefore = getStage(dayCount - 1);
  const stageAfter  = getStage(dayCount);
  if (stageBefore === stageAfter) return;
  if (!['seed','crack','sprout'].includes(stageAfter)) return;

  const start = performance.now();
  const DURATION = stageAfter === 'crack' ? 400 : 600;

  function frame(now) {
    const t = Math.min(1, (now - start) / DURATION);
    drawAnimated(canvas, dayCount, seed, now);
    if (t < 1) requestAnimationFrame(frame);
    else startTreeAnimation();
  }
  if (treeAnimRafId) { cancelAnimationFrame(treeAnimRafId); treeAnimRafId = null; }
  requestAnimationFrame(frame);
}

async function submitEntry() {
  const ta   = document.getElementById('entry-text');
  const text = ta ? ta.value.trim() : '';
  if (!text) { showToast('先写点什么吧。'); ta?.focus(); return; }
  const imageIds = _modalImages.map(m => m.id);
  if (_editEntry) {
    updateEntry(_editEntry.id, text, imageIds);
    showToast('已保存！', 'success');
    closeModal();
    refreshTree();
  } else {
    const prevTotal = computeTotalDaysThisYear();
    addEntryWithDate(getTodayKey(), text, imageIds);
    showSaveSuccess();
    closeModal();
    const newTotal = computeTotalDaysThisYear();
    const canvas   = document.getElementById('tree-canvas');
    if (canvas && newTotal !== prevTotal && getStage(newTotal) !== getStage(prevTotal)) {
      playSproutTransition(canvas, newTotal, getTreeSeed());
    }
    refreshTree();
  }
}


// ── Settings ──────────────────────────────────────────────────────────────

function openSettings() { document.getElementById('settings-overlay')?.classList.add('active'); }
function closeSettings() { document.getElementById('settings-overlay')?.classList.remove('active'); }

function exportBackup() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    try { data[k] = JSON.parse(localStorage.getItem(k)); }
    catch { data[k] = localStorage.getItem(k); }
  }
  const blob  = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement('a');
  const today = new Date().toISOString().substring(0, 10);
  a.href      = url;
  a.download  = `daily-tree-backup-${today}.json`;
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
      if (typeof data !== 'object' || Array.isArray(data)) throw new Error('invalid');
      Object.keys(data).forEach(k => {
        if (!k.startsWith('daily_tree')) return;
        localStorage.setItem(k, typeof data[k] === 'string' ? data[k] : JSON.stringify(data[k]));
      });
      refreshTree();
      showToast('备份已恢复。', 'success');
      closeSettings();
    } catch {
      showToast('无效的备份文件。');
    }
  };
  reader.readAsText(file);
}

// ── Stage Panel ───────────────────────────────────────────────────────────

function getCurrentStageIndex(dayCount) {
  let idx = 0;
  for (let i = 0; i < STAGE_CONFIG.length; i++) {
    if (dayCount >= STAGE_CONFIG[i].unlock) idx = i; else break;
  }
  return idx;
}

let _stagePanelIdx = 0;

function renderStagePanel(idx) {
  const dayCount = computeTotalDaysThisYear();
  const stage = STAGE_CONFIG[idx];
  const nextStage = STAGE_CONFIG[idx + 1];
  const prevStage = STAGE_CONFIG[idx - 1];

  document.getElementById('stage-panel-name').textContent =
    `${stage.emoji} ${stage.name}` + (idx === getCurrentStageIndex(dayCount) ? ' ·当前' : '');
  document.getElementById('stage-panel-desc').textContent = stage.desc;

  const canvas = document.getElementById('stage-preview-canvas');
  if (canvas) {
    const dpr = devicePixelRatio || 1;
    canvas.style.width = '90px'; canvas.style.height = '120px';
    canvas.width = 90 * dpr; canvas.height = 120 * dpr;
    drawTree(canvas, stage.renderDays, 12345);
  }

  const countdownEl = document.getElementById('stage-panel-countdown');
  if (nextStage) {
    const daysLeft = nextStage.unlock - dayCount;
    countdownEl.textContent = daysLeft > 0
      ? `再 ${daysLeft} 天 → ${nextStage.name}`
      : `已解锁 ${nextStage.name}`;
  } else {
    countdownEl.textContent = '已成长为古树 🌲';
  }

  const fillEl = document.getElementById('stage-panel-progress-fill');
  if (fillEl && nextStage) {
    const pct = Math.max(0, Math.min(100, Math.round(
      ((dayCount - stage.unlock) / (nextStage.unlock - stage.unlock)) * 100
    )));
    fillEl.style.width = pct + '%';
  } else if (fillEl) {
    fillEl.style.width = '100%';
  }

  const pathEl = document.getElementById('stage-panel-path');
  if (pathEl) {
    pathEl.innerHTML = STAGE_CONFIG.map((s, i) =>
      `<span class="stage-path-item ${dayCount >= s.unlock ? 'unlocked' : ''} ${i === idx ? 'current' : ''}"
        data-stage-idx="${i}">${s.emoji}</span>`
    ).join('');
    pathEl.querySelectorAll('.stage-path-item').forEach(el => {
      el.addEventListener('click', () => {
        _stagePanelIdx = parseInt(el.dataset.stageIdx, 10);
        renderStagePanel(_stagePanelIdx);
      });
    });
  }
}

function openStagePanel() {
  _stagePanelIdx = getCurrentStageIndex(computeTotalDaysThisYear());
  renderStagePanel(_stagePanelIdx);
  document.getElementById('stage-panel-overlay').classList.add('active');
  document.getElementById('stage-panel').classList.add('open');
}

function closeStagePanel() {
  document.getElementById('stage-panel-overlay').classList.remove('active');
  document.getElementById('stage-panel').classList.remove('open');
}

function initStagePanelSwipe() {
  const panel = document.getElementById('stage-panel');
  let touchStartX = 0;
  panel.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  panel.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) < 40) return;
    if (dx < 0 && _stagePanelIdx < STAGE_CONFIG.length - 1) {
      _stagePanelIdx++;
      renderStagePanel(_stagePanelIdx);
    } else if (dx > 0 && _stagePanelIdx > 0) {
      _stagePanelIdx--;
      renderStagePanel(_stagePanelIdx);
    }
  }, { passive: true });
}

// ── Guide ─────────────────────────────────────────────────────────────────

const GUIDE_TOTAL = 3;
let guideStep = 0;

function showGuide() {
  if (localStorage.getItem(ONBOARDED_KEY)) return;
  document.getElementById('guide-overlay')?.classList.add('active');
  guideStep = 0;
  updateGuideStep(0);
  const guideCanvas = document.getElementById('guide-tree-canvas');
  if (guideCanvas) {
    const dpr = devicePixelRatio || 1;
    const GW = 160, GH = 220;
    guideCanvas.style.width  = GW + 'px';
    guideCanvas.style.height = GH + 'px';
    guideCanvas.width  = GW * dpr;
    guideCanvas.height = GH * dpr;
    drawTree(guideCanvas, 20, 12345);
  }
  const guideCanvas2 = document.getElementById('guide-tree-canvas-2');
  if (guideCanvas2) {
    const dpr = devicePixelRatio || 1;
    const GW = 160, GH = 220;
    guideCanvas2.style.width  = GW + 'px';
    guideCanvas2.style.height = GH + 'px';
    guideCanvas2.width  = GW * dpr;
    guideCanvas2.height = GH * dpr;
    drawTree(guideCanvas2, 35, 12345);
  }
}

function updateGuideStep(step) {
  document.querySelectorAll('.guide-dot').forEach((d,i) => d.classList.toggle('active', i === step));
  for (let i = 0; i < GUIDE_TOTAL; i++) {
    document.getElementById(`guide-step-${i}`)?.classList.toggle('hidden', i !== step);
  }
  const nextLabel = document.getElementById('guide-next-label');
  if (nextLabel) nextLabel.textContent = step === GUIDE_TOTAL - 1 ? '开始记录' : '下一步';
}

function closeGuide() {
  document.getElementById('guide-overlay')?.classList.remove('active');
  localStorage.setItem(ONBOARDED_KEY, '1');
  guideStep = 0;
}

// ── Events ────────────────────────────────────────────────────────────────

function bindEvents() {
  document.getElementById('top-back')?.addEventListener('click', () => {
    window.location.href = '../index.html';
  });

  document.getElementById('fab-new')?.addEventListener('click', () => {
    selectedDate = getTodayKey();
    openModal(getTodayEntry(), false);
  });

  document.getElementById('today-chip')?.addEventListener('click', () => {
    selectedDate = getTodayKey();
    document.getElementById('today-chip')?.classList.add('hidden');
    document.querySelectorAll('.timeline-cell').forEach(cell => {
      cell.classList.toggle('selected', cell.dataset.date === selectedDate);
    });
    const todayCell = document.querySelector('.timeline-cell.today');
    if (todayCell) todayCell.scrollIntoView({ inline: 'center', behavior: 'smooth' });
  });

  document.getElementById('btn-tree')?.addEventListener('click', openStagePanel);

  document.getElementById('btn-cal')?.addEventListener('click', () => {
    const isHidden = document.body.classList.toggle('strip-hidden');
    document.getElementById('btn-cal').classList.toggle('active', !isHidden);
    if (!isHidden) {
      // Strip just became visible — scroll to today
      requestAnimationFrame(() => {
        const todayCell = document.querySelector('.timeline-cell.today');
        if (todayCell) todayCell.scrollIntoView({ inline: 'center', behavior: 'smooth' });
      });
    }
  });

  document.getElementById('btn-stats')?.addEventListener('click', () => {
    const total = computeTotalDaysThisYear();
    showToast(`今年共记录 ${total} 天 🌱`);
  });

  document.getElementById('tree-canvas')?.addEventListener('click', onTreeClick);

  document.getElementById('branch-panel-close')?.addEventListener('click', closeBranchPanel);

  document.getElementById('modal-overlay')?.addEventListener('click', e => {
    if (e.target.id === 'modal-overlay') closeModal();
  });
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('img-preview-close')?.addEventListener('click', closeImagePreview);
  document.getElementById('img-preview-overlay')?.addEventListener('click', e => {
    if (e.target.id === 'img-preview-overlay') closeImagePreview();
  });
  document.getElementById('entry-submit')?.addEventListener('click', submitEntry);
  document.getElementById('entry-text')?.addEventListener('input', updateCharCount);
  document.getElementById('image-file-input')?.addEventListener('change', async e => {
    const files = Array.from(e.target.files || []);
    e.target.value = ''; // 允许重复选同一文件
    const remaining = 3 - _modalImages.length;
    const toProcess = files.slice(0, remaining);
    for (const file of toProcess) {
      try {
        const usage = await getDBSizeEstimate();
        if (usage > 50 * 1024 * 1024) {
          showToast('存储空间超过 50MB，请先清理旧记录。');
          break;
        }
        const blob = await compressImage(file);
        const id   = `img_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
        await saveImage(id, blob);
        const url  = URL.createObjectURL(blob);
        _modalImages.push({ id, objectUrl: url });
        appendThumbToModal(id, url);
      } catch {
        showToast('图片保存失败，请重试。');
      }
    }
  });
  document.getElementById('btn-emoji')?.addEventListener('click', e => {
    e.stopPropagation();
    const ta     = document.getElementById('entry-text');
    const anchor = document.getElementById('btn-emoji');
    toggleEmojiPicker(ta, anchor);
  });
  document.getElementById('entry-text')?.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submitEntry();
    if (e.key === 'Escape') closeModal();
  });

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
    showToast('已重置，下次打开将看到引导页。', 'success');
  });

  document.getElementById('guide-next')?.addEventListener('click', () => {
    if (guideStep < GUIDE_TOTAL - 1) { guideStep++; updateGuideStep(guideStep); }
    else closeGuide();
  });
  document.getElementById('guide-skip')?.addEventListener('click', closeGuide);
  document.getElementById('guide-overlay')?.addEventListener('click', e => {
    if (e.target.id === 'guide-overlay') closeGuide();
  });

  document.getElementById('stage-panel-overlay')?.addEventListener('click', closeStagePanel);
  initStagePanelSwipe();

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closeBranchPanel(); closeSettings(); closeGuide(); closeStagePanel(); closeImagePreview(); }
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') { e.preventDefault(); openModal(getTodayEntry(), false); }
  });
}

// ── Bootstrap ─────────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', () => {
  initEmojiPicker();
  bindEvents();
  initApp();
  setTimeout(showGuide, 600);
});
