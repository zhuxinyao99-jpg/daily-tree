// Daily Tree — Core App Logic

(function() {
  'use strict';

  const STORAGE_KEY = 'daily_tree_entries';
  const YEARS_TO_SHOW = 5;

  // ── Data Layer ────────────────────────────────────────────────────────────

  function loadEntries() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  }

  function saveEntries(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  function getYearEntries(year) {
    const entries = loadEntries();
    return entries[year] || [];
  }

  function addEntry(year, text) {
    const entries = loadEntries();
    if (!entries[year]) entries[year] = [];
    entries[year].push({
      id: Date.now(),
      text: text.slice(0, 500),
      date: new Date().toISOString(),
    });
    saveEntries(entries);
    return entries[year];
  }

  function getYears() {
    const entries = loadEntries();
    return Object.keys(entries)
      .map(Number)
      .sort((a, b) => b - a);
  }

  // ── UI State ───────────────────────────────────────────────────────────────

  let forestScene = null;
  let selectedYear = null;

  // ── Modal ─────────────────────────────────────────────────────────────────

  function openModal(year) {
    const overlay = document.getElementById('modal-overlay');
    const textarea = document.getElementById('entry-text');
    const yearLabel = document.getElementById('modal-year');
    const charCount = document.getElementById('char-count');

    yearLabel.textContent = year;
    textarea.value = '';
    charCount.textContent = '0';

    overlay.classList.add('active');
    setTimeout(() => textarea.focus(), 100);
  }

  function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('active');
  }

  function submitEntry(year) {
    const textarea = document.getElementById('entry-text');
    const text = textarea.value.trim();
    if (!text) return;

    addEntry(year, text);
    closeModal();
    refreshForest();
    showToast(`Entry saved for ${year}`);
  }

  // ── Toast ──────────────────────────────────────────────────────────────────

  function showToast(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => toast.classList.remove('visible'), 2800);
  }

  // ── Forest ─────────────────────────────────────────────────────────────────

  async function initForest() {
    const canvas = document.getElementById('forest-canvas');
    if (!canvas) return;

    const { ForestScene } = await import('./webgl/scene.js');
    const { Tree } = await import('./webgl/tree.js');

    forestScene = new ForestScene(canvas);
    window.forestScene = forestScene;
    window.TreeClass = Tree;

    refreshForest();
  }

  function refreshForest() {
    if (!forestScene) return;
    const entries = loadEntries();
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: YEARS_TO_SHOW }, (_, i) => currentYear - i);

    forestScene.removeAllTrees();

    years.forEach(year => {
      const yearEntries = entries[year] || [];
      const lastDate = yearEntries.length > 0
        ? yearEntries[yearEntries.length - 1].date
        : `${year}-01-01T00:00:00`;

      forestScene.addTree(window.TreeClass, year, yearEntries.length, {
        lastEntryDate: lastDate,
      });
    });

    updateSidebar(entries, years);
  }

  // ── Sidebar ───────────────────────────────────────────────────────────────

  function updateSidebar(entries, years) {
    const list = document.getElementById('year-list');
    if (!list) return;
    list.innerHTML = '';

    years.forEach(year => {
      const count = (entries[year] || []).length;
      const li = document.createElement('li');
      li.className = 'year-item' + (selectedYear === year ? ' active' : '');
      li.innerHTML = `
        <span class="year-num">${year}</span>
        <span class="year-count">${count} ${count === 1 ? 'entry' : 'entries'}</span>
      `;
      li.addEventListener('click', () => {
        selectedYear = year;
        updateSidebar(loadEntries(), years);
        if (count > 0) showYearDetail(year, count);
      });
      list.appendChild(li);
    });
  }

  // ── Year Detail Panel ──────────────────────────────────────────────────────

  function showYearDetail(year, count) {
    const panel = document.getElementById('year-panel');
    const title = document.getElementById('panel-title');
    const list = document.getElementById('panel-entries');
    const entries = getYearEntries(year);

    title.textContent = year;
    list.innerHTML = '';

    if (entries.length === 0) {
      list.innerHTML = `<li class="empty-note">No entries yet.</li>`;
    } else {
      entries.slice().reverse().forEach(entry => {
        const li = document.createElement('li');
        const date = new Date(entry.date);
        const dateStr = date.toLocaleDateString('en-US', {
          month: 'short', day: 'numeric',
        });
        li.innerHTML = `
          <span class="entry-date">${dateStr}</span>
          <span class="entry-text">${escapeHtml(entry.text)}</span>
        `;
        list.appendChild(li);
      });
    }

    panel.classList.add('open');
  }

  function closeYearPanel() {
    const panel = document.getElementById('year-panel');
    if (panel) panel.classList.remove('open');
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ── FAB + New Entry ────────────────────────────────────────────────────────

  function handleNewEntry() {
    const year = selectedYear || new Date().getFullYear();
    openModal(year);
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  function bindEvents() {
    // Modal
    const overlay = document.getElementById('modal-overlay');
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('entry-submit').addEventListener('click', () => {
      const year = Number(document.getElementById('modal-year').textContent);
      submitEntry(year);
    });

    const textarea = document.getElementById('entry-text');
    textarea.addEventListener('input', () => {
      document.getElementById('char-count').textContent = textarea.value.length;
    });
    textarea.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        const year = Number(document.getElementById('modal-year').textContent);
        submitEntry(year);
      }
    });

    // Year panel close
    const closePanelBtn = document.getElementById('panel-close');
    if (closePanelBtn) closePanelBtn.addEventListener('click', closeYearPanel);

    // FAB
    const fab = document.getElementById('fab-new');
    if (fab) fab.addEventListener('click', handleNewEntry);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal();
        closeYearPanel();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        handleNewEntry();
      }
    });
  }

  window.addEventListener('DOMContentLoaded', () => {
    bindEvents();
    initForest();
  });

  // Expose
  window.showYearDetail = showYearDetail;
})();
