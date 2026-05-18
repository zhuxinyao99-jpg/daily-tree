import { drawTree, getTrunkBounds, getStage } from './tree.js';
import { WeatherManager } from './weather.js';

const STORAGE_KEY   = 'daily_tree_entries';
const VISITED_KEY   = 'daily_tree_visited';
const ONBOARDED_KEY = 'daily_tree_onboarded';

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
function addEntryWithDate(dateStr, text) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const entries = loadEntries();
  if (!entries[year]) entries[year] = [];
  const d = new Date(year, month - 1, day, 12, 0, 0);
  entries[year].push({ id: Date.now(), text: text.slice(0, 500), date: d.toISOString() });
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

function escapeHtml(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

function computeTotalDaysThisYear() {
  const year = new Date().getFullYear();
  const entries = getYearEntries(year);
  const days = new Set(entries.map(e => e.date.substring(0, 10)));
  return days.size;
}

function computeVitality7() {
  const entries = loadEntries();
  const now = Date.now();
  let count = 0;
  const seen = new Set();
  for (const year in entries) {
    for (const e of entries[year]) {
      const dayKey = e.date.substring(0, 10);
      if (seen.has(dayKey)) continue;
      const diff = (now - new Date(e.date).getTime()) / 86400000;
      if (diff >= 0 && diff < 7) { seen.add(dayKey); count++; }
    }
  }
  return Math.min(7, count);
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

// ── Tree / App Core ───────────────────────────────────────────────────────

let weatherManager = null;

function initApp() {
  const treeCanvas    = document.getElementById('tree-canvas');
  const weatherCanvas = document.getElementById('weather-canvas');
  if (!treeCanvas) return;

  function resizeCanvases() {
    const W = treeCanvas.clientWidth  * devicePixelRatio;
    const H = treeCanvas.clientHeight * devicePixelRatio;
    treeCanvas.width    = W; treeCanvas.height    = H;
    if (weatherCanvas) { weatherCanvas.width = W; weatherCanvas.height = H; }
  }
  resizeCanvases();
  window.addEventListener('resize', () => { resizeCanvases(); refreshTree(); });

  if (weatherCanvas) {
    weatherManager = new WeatherManager(weatherCanvas);
    weatherManager.init();
  }

  refreshTree();
}

function refreshTree() {
  const canvas = document.getElementById('tree-canvas');
  if (!canvas) return;
  const total    = computeTotalDaysThisYear();
  const vitality = computeVitality7();
  drawTree(canvas, total, vitality);
  updateTopBar();
  updateBottomBar();
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

// ── Bottom Bar ────────────────────────────────────────────────────────────

function updateBottomBar() {
  const leftChart  = document.getElementById('bar-chart');
  const rightChart = document.getElementById('bar-chart-right');
  if (!leftChart || !rightChart) return;

  const entries = loadEntries();
  const today   = new Date();

  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key  = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const year = d.getFullYear();
    const done = (entries[year] || []).some(e => e.date.substring(0,10) === key);
    const isToday = i === 0;
    days.push({ key, done, isToday });
  }

  function renderBars(container, slice) {
    container.innerHTML = '';
    slice.forEach(day => {
      const bar = document.createElement('div');
      bar.className = 'bar-day' + (day.done ? ' done' : '') + (day.isToday ? ' today' : '');
      container.appendChild(bar);
    });
  }

  renderBars(leftChart,  days.slice(0, 7));
  renderBars(rightChart, days.slice(7, 14));
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
      list.appendChild(li);
    });
  }

  panel.classList.add('open');
}

function closeBranchPanel() {
  document.getElementById('branch-panel')?.classList.remove('open');
}

function onTreeClick(e) {
  const canvas = document.getElementById('tree-canvas');
  if (!canvas) return;

  const rect      = canvas.getBoundingClientRect();
  const clickY    = e.clientY - rect.top;
  const dpr       = devicePixelRatio || 1;
  const stage     = getStage(computeTotalDaysThisYear());
  const bounds    = getTrunkBounds(canvas, stage);
  const trunkTopY = bounds[3] / dpr;
  const trunkBotY = bounds[1] / dpr;

  if (clickY > trunkBotY || clickY < trunkTopY - 20) return;

  const relY = (clickY - trunkTopY) / (trunkBotY - trunkTopY);
  const zone = relY < 0.33 ? 'recent' : relY < 0.66 ? 'mid' : 'early';
  openBranchPanel(zone);
}

// ── Modal ─────────────────────────────────────────────────────────────────

let _editEntry = null;

function openModal(entryToEdit) {
  _editEntry = entryToEdit || null;
  const overlay  = document.getElementById('modal-overlay');
  const textarea = document.getElementById('entry-text');
  const label    = document.getElementById('modal-label');

  if (textarea) { textarea.value = entryToEdit ? entryToEdit.text : ''; updateCharCount(); }
  if (label)    label.textContent = entryToEdit ? '修改记录' : '今天最重要的一件事？';

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

function submitEntry() {
  const ta   = document.getElementById('entry-text');
  const text = ta ? ta.value.trim() : '';
  if (!text) { showToast('先写点什么吧。'); ta?.focus(); return; }
  if (_editEntry) {
    updateEntry(_editEntry.id, text);
    showToast('已保存！', 'success');
  } else {
    addEntryWithDate(getTodayKey(), text);
    showSaveSuccess();
  }
  closeModal();
  refreshTree();
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
  const list = document.getElementById('search-results');
  if (!list) return;
  list.innerHTML = '';
  const q = query.trim().toLowerCase();
  if (!q) return;

  const entries = loadEntries();
  const results = [];
  Object.keys(entries).sort((a,b) => b - a).forEach(year => {
    (entries[year] || []).forEach(entry => {
      if (entry.text.toLowerCase().includes(q)) results.push({ year: parseInt(year), entry });
    });
  });

  if (results.length === 0) {
    const li = document.createElement('li');
    li.className = 'search-no-results';
    li.textContent = '没有找到相关记录。';
    list.appendChild(li);
    return;
  }

  results.slice(0, 30).forEach(({ entry }) => {
    const li      = document.createElement('li');
    li.className  = 'search-result-item';
    const date    = new Date(entry.date);
    const dateStr = date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
    const escaped = escapeHtml(entry.text);
    const highlighted = escaped.replace(
      new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'gi'),
      m => `<mark>${m}</mark>`
    );
    li.innerHTML = `
      <div class="search-result-date">${dateStr}</div>
      <div class="search-result-text">${highlighted}</div>
    `;
    list.appendChild(li);
  });
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

// ── Guide ─────────────────────────────────────────────────────────────────

const GUIDE_TOTAL = 3;
let guideStep = 0;

function showGuide() {
  if (localStorage.getItem(ONBOARDED_KEY)) return;
  document.getElementById('guide-overlay')?.classList.add('active');
  guideStep = 0;
  updateGuideStep(0);
  const guideCanvas = document.getElementById('guide-tree-canvas');
  if (guideCanvas) drawTree(guideCanvas, 45, 5);
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
    openModal(getTodayEntry());
  });

  document.getElementById('tree-canvas')?.addEventListener('click', onTreeClick);

  document.getElementById('branch-panel-close')?.addEventListener('click', closeBranchPanel);

  document.getElementById('modal-overlay')?.addEventListener('click', e => {
    if (e.target.id === 'modal-overlay') closeModal();
  });
  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('entry-submit')?.addEventListener('click', submitEntry);
  document.getElementById('entry-text')?.addEventListener('input', updateCharCount);
  document.getElementById('entry-text')?.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submitEntry();
    if (e.key === 'Escape') closeModal();
  });

  document.getElementById('btn-search')?.addEventListener('click', openSearch);
  document.getElementById('search-close')?.addEventListener('click', closeSearch);
  document.getElementById('search-overlay')?.addEventListener('click', e => {
    if (e.target.id === 'search-overlay') closeSearch();
  });
  document.getElementById('search-input')?.addEventListener('input', e => {
    renderSearchResults(e.target.value);
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

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closeBranchPanel(); closeSearch(); closeSettings(); closeGuide(); }
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') { e.preventDefault(); openModal(getTodayEntry()); }
    if ((e.metaKey || e.ctrlKey) && e.key === 'f') { e.preventDefault(); openSearch(); }
  });
}

// ── Bootstrap ─────────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  initApp();
  setTimeout(showGuide, 600);
});
