// Daily Tree V2 — Core App Logic

(function () {
  'use strict';

  const STORAGE_KEY  = 'daily_tree_entries';
  const GUIDE_KEY    = 'daily_tree_guide_seen';
  const LANG_KEY     = 'daily_tree_lang';
  const REMINDER_KEY = 'daily_tree_reminder';
  const YEARS_TO_SHOW = 5;

  // ── i18n ──────────────────────────────────────────────────────────────────

  const I18N = {
    en: {
      todayNotRecorded: "Today's tree hasn't grown yet",
      todayRecorded:    "Today's tree is growing",
      whatMattersToday: 'What matters most today?',
      placeholder:      'One moment. One thought. One thing worth remembering...',
      saveEntry:        'Save',
      editEntry:        'Edit today',
      addEntry:         'Record today',
      noEntries:        'No entries yet.',
      saved:            'Saved! Your tree just grew.',
      emptyError:       'Write something first.',
      emptyForestTitle: 'Start your forest',
      emptyForestDesc:  'Tap + to write your first entry.',
      days:             'days',
      todayBadgeNone:   'Not yet today',
      todayBadgeDone:   'Recorded today ✓',
      searchPlaceholder:'Search your entries...',
      searchNoResults:  'No entries found.',
      settingsTitle:    'Settings',
      reminderLabel:    'Daily reminder',
      reminderSub:      'Get notified to write your entry',
      reminderTimeLabel:'Reminder time',
      exportLabel:      'Export backup',
      importLabel:      'Import backup',
      importSuccess:    'Backup restored.',
      importError:      'Invalid backup file.',
      guideStep1Title:  'One moment a day',
      guideStep1Desc:   'Tap + to record the single most important thing today.',
      guideStep2Title:  'Your tree grows',
      guideStep2Desc:   'Each entry adds new leaves. Your tree changes with the seasons.',
      guideStep4Title:  'Tap to revisit',
      guideStep4Desc:   "Tap any year in the bottom bar to read that year's entries.",
      guideClickHint:   'Tap a past year in the dock to read it',
      skipGuide:        'Skip',
      startNow:         'Start now',
      nextStep:         'Next',
    },
    zh: {
      todayNotRecorded: '今天的小树还没有成长哦',
      todayRecorded:    '今天已记录，小树在成长',
      whatMattersToday: '今天最重要的一件事？',
      placeholder:      '一个瞬间，一个想法，一件值得记住的事……',
      saveEntry:        '保存',
      editEntry:        '修改今天的记录',
      addEntry:         '记录今天',
      noEntries:        '还没有记录。',
      saved:            '已保存！你的树又长大了一点。',
      emptyError:       '先写点什么吧。',
      emptyForestTitle: '开始你的森林',
      emptyForestDesc:  '点击 + 写下第一条记录。',
      days:             '天',
      todayBadgeNone:   '今天还没记录',
      todayBadgeDone:   '今天已记录 ✓',
      searchPlaceholder:'搜索你的记录…',
      searchNoResults:  '没有找到相关记录。',
      settingsTitle:    '设置',
      reminderLabel:    '每日提醒',
      reminderSub:      '提醒你每天写记录',
      reminderTimeLabel:'提醒时间',
      exportLabel:      '导出备份',
      importLabel:      '导入备份',
      importSuccess:    '备份已恢复。',
      importError:      '无效的备份文件。',
      guideStep1Title:  '每天一个瞬间',
      guideStep1Desc:   '点击 + 按钮，记录今天最重要的那件事。',
      guideStep2Title:  '树会成长',
      guideStep2Desc:   '每一条记录都让树长出新叶子。树随季节变化。',
      guideStep4Title:  '点击回顾',
      guideStep4Desc:   '点击底栏中任意年份，查看那一年的所有记录。',
      guideClickHint:   '点击底栏中的年份查看记录',
      skipGuide:        '跳过',
      startNow:         '开始记录',
      nextStep:         '下一步',
    },
  };

  let currentLang = 'en';
  function t(key) { return (I18N[currentLang] || {})[key] || I18N.en[key] || key; }
  function detectLang() {
    const s = localStorage.getItem(LANG_KEY);
    if (s) return s;
    return (navigator.language || 'en').startsWith('zh') ? 'zh' : 'en';
  }
  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    applyLang();
    const btn = document.getElementById('lang-toggle');
    if (btn) btn.querySelector('span').textContent = lang === 'en' ? 'EN/中' : '中/EN';
  }
  function applyLang() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });
    updateTodayChip();
  }

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
  function addEntry(year, text) {
    const entries = loadEntries();
    if (!entries[year]) entries[year] = [];
    entries[year].push({ id: Date.now(), text: text.slice(0, 500), date: new Date().toISOString() });
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

  // ── Streak ────────────────────────────────────────────────────────────────

  function computeStreak() {
    const entries = loadEntries();
    let streak = 0;
    const d = new Date();
    d.setDate(d.getDate() - 1); // start from yesterday
    while (true) {
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const year = d.getFullYear();
      const hasEntry = (entries[year] || []).some(e => e.date && e.date.substring(0,10) === key);
      if (!hasEntry) break;
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  function updateStreakChip() {
    const chip    = document.getElementById('chip-streak');
    const numEl   = document.getElementById('streak-num');
    const labelEl = document.getElementById('streak-label');
    if (!chip) return;
    const streak = computeStreak();
    if (streak > 0) {
      chip.style.display = 'flex';
      numEl.textContent   = streak;
      labelEl.textContent = t('days');
    } else {
      chip.style.display = 'none';
    }
  }

  // ── Today Chip ────────────────────────────────────────────────────────────

  function updateTodayChip() {
    const dot = document.getElementById('chip-today-dot');
    const msg = document.getElementById('chip-today-msg');
    if (!dot || !msg) return;
    const today = getTodayEntry();
    dot.classList.toggle('recorded', !!today);
    msg.textContent = today ? t('todayRecorded') : t('todayNotRecorded');
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
    const container = document.querySelector('.main-canvas');
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
    const canvas = document.getElementById('forest-canvas');
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
    setTimeout(() => showToast(t('saved'), 'success'), 300);
    updateTodayChip();
    updateStreakChip();
  }

  // ── Forest ────────────────────────────────────────────────────────────────

  let forestScene = null;

  async function initForest() {
    const canvas = document.getElementById('forest-canvas');
    if (!canvas || !window.THREE) { showFallback(); return; }
    try {
      const { ForestScene } = await import('./webgl/scene.js');
      const { Tree }        = await import('./webgl/tree.js');
      forestScene = new ForestScene(canvas);
      window._TreeClass = Tree;
      refreshForest();
    } catch (err) {
      console.error('Forest init failed:', err);
      showFallback();
    }
  }

  function showFallback() {
    const hint = document.getElementById('forest-hint');
    if (hint) {
      hint.style.display = 'flex';
      const title = hint.querySelector('.forest-hint-title');
      const desc  = hint.querySelector('.forest-hint-desc');
      if (title) title.textContent = currentLang === 'zh' ? '3D渲染不可用' : '3D unavailable';
      if (desc)  desc.textContent  = currentLang === 'zh' ? '仍可正常记录。' : 'You can still record entries.';
    }
  }

  function refreshForest() {
    if (!forestScene || !window._TreeClass) return;
    const entries     = loadEntries();
    const currentYear = new Date().getFullYear();
    const yearEntries = entries[currentYear] || [];

    forestScene.removeAllTrees();

    if (!yearEntries || yearEntries.length === 0) {
      // show empty hint, don't render a tree
      const hint = document.getElementById('forest-hint');
      if (hint) hint.style.display = 'flex';
      updateDock(entries, currentYear);
      updateTodayChip();
      updateStreakChip();
      return;
    }

    const lastDate = yearEntries[yearEntries.length - 1].date;
    const streakDays = computeStreak();
    forestScene.addTree(window._TreeClass, currentYear, streakDays, { lastEntryDate: lastDate });

    updateDock(entries, currentYear);
    updateTodayChip();
    updateStreakChip();
    updateEmptyHint();
  }

  function updateEmptyHint() {
    const hint    = document.getElementById('forest-hint');
    if (!hint) return;
    const entries = loadEntries();
    const total   = Object.values(entries).reduce((s, a) => s + a.length, 0);
    hint.style.display = total === 0 ? 'flex' : 'none';
  }

  // ── Dock ──────────────────────────────────────────────────────────────────

  let selectedYear = null;

  function updateDock(entries, currentYear) {
    const container = document.getElementById('dock-past-years');
    if (!container) return;
    container.innerHTML = '';

    const years = [];
    for (let i = 0; i < YEARS_TO_SHOW; i++) years.push(currentYear - i);

    years.forEach(year => {
      const yearEntries = entries[year] || [];
      const count = yearEntries.length;
      const item  = document.createElement('div');
      item.className = 'dock-year-item' + (selectedYear === year ? ' active' : '');
      item.setAttribute('role', 'button');
      item.setAttribute('aria-label', String(year));
      item.innerHTML = `
        ${miniTreeSvg(year, count, yearEntries)}
        <span class="dock-year-label">${year}</span>
      `;
      item.addEventListener('click', () => {
        selectedYear = year;
        updateDock(loadEntries(), currentYear);
        showYearPanel(year);
      });
      container.appendChild(item);
    });
  }

  function miniTreeSvg(year, count, yearEntries) {
    const currentYear = new Date().getFullYear();
    const daysSince = yearEntries.length > 0
      ? (Date.now() - new Date(yearEntries[yearEntries.length-1].date)) / 86400000
      : 999;
    const state = count === 0
      ? 'empty'
      : (daysSince <= 14 ? 'living' : (year === currentYear ? 'dormant' : 'archived'));

    const green  = state === 'living'   ? '#4A7C59' : (state === 'dormant' ? '#3D4F5F' : '#3D3020');
    const bark   = state === 'living'   ? '#8B7355' : (state === 'dormant' ? '#6B6050' : '#4A3A2A');
    const crownH = 8 + Math.min(count, 40) * 0.3;
    const crownW = 6 + Math.min(count, 40) * 0.2;
    const trunkH = 6 + Math.min(count, 40) * 0.15;
    const opacity = state === 'empty' ? 0.2 : (state === 'archived' ? 0.4 : 1);

    return `<svg viewBox="0 0 36 48" fill="none" width="32" height="40" aria-hidden="true" style="opacity:${opacity}">
      <line x1="18" y1="${48 - trunkH}" x2="18" y2="46" stroke="${bark}" stroke-width="2.5" stroke-linecap="round"/>
      <ellipse cx="18" cy="${36 - crownH * 0.4}" rx="${crownW}" ry="${crownH * 0.55}" fill="${green}" opacity="0.5"/>
      <ellipse cx="18" cy="${30 - crownH * 0.3}" rx="${crownW * 0.7}" ry="${crownH * 0.45}" fill="${green}" opacity="0.65"/>
      <ellipse cx="18" cy="${24 - crownH * 0.2}" rx="${crownW * 0.5}" ry="${crownH * 0.35}" fill="${green}" opacity="0.8"/>
    </svg>`;
  }

  // ── Year Panel ────────────────────────────────────────────────────────────

  function showYearPanel(year) {
    const panel     = document.getElementById('year-panel');
    const titleEl   = document.getElementById('panel-title');
    const badge     = document.getElementById('panel-today-badge');
    const addBtn    = document.getElementById('panel-add-btn');
    if (!panel) return;

    if (titleEl) titleEl.textContent = year;
    const currentYear   = new Date().getFullYear();
    const isCurrentYear = year === currentYear;
    const todayEntry    = isCurrentYear ? getTodayEntry() : null;

    if (badge) {
      badge.style.display = isCurrentYear ? '' : 'none';
      badge.textContent   = todayEntry ? t('todayBadgeDone') : t('todayBadgeNone');
      badge.className     = 'panel-today-status' + (todayEntry ? ' recorded' : '');
    }
    if (addBtn) {
      addBtn.style.display = isCurrentYear ? '' : 'none';
      const span = addBtn.querySelector('span');
      if (span) span.textContent = todayEntry ? t('editEntry') : t('addEntry');
    }

    const list    = document.getElementById('panel-entries');
    const entries = getYearEntries(year);
    if (!list) return;
    list.innerHTML = '';

    if (entries.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'empty-note';
      empty.textContent = t('noEntries');
      list.appendChild(empty);
    } else {
      entries.slice().reverse().forEach(entry => {
        const li = document.createElement('li');
        li.className = 'entry-item';
        li.setAttribute('data-date', entry.date.substring(0, 10));
        const date    = new Date(entry.date);
        const isToday = entry.date.substring(0,10) === getTodayKey();
        const dateStr = date.toLocaleDateString(currentLang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' });
        li.innerHTML = `
          <div class="entry-row">
            <div class="entry-left">
              <span class="entry-date">${dateStr}</span>
              ${isToday ? `<span class="entry-today-badge">${currentLang === 'zh' ? '今天' : 'Today'}</span>` : ''}
            </div>
            ${isToday ? `<button class="entry-edit-btn" data-id="${entry.id}">${currentLang === 'zh' ? '修改' : 'Edit'}</button>` : ''}
          </div>
          <p class="entry-text">${escapeHtml(entry.text)}</p>
        `;
        list.appendChild(li);
      });
    }
    panel.classList.add('open');
  }

  function closeYearPanel() {
    document.getElementById('year-panel')?.classList.remove('open');
  }

  function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }

  // ── Modal ─────────────────────────────────────────────────────────────────

  let _editEntry = null;

  function openModal(year, entryToEdit) {
    _editEntry = entryToEdit || null;
    const overlay   = document.getElementById('modal-overlay');
    const textarea  = document.getElementById('entry-text');
    const yearLabel = document.getElementById('modal-year');
    const label     = document.getElementById('modal-label');
    if (yearLabel) yearLabel.textContent = year;
    if (textarea)  { textarea.value = entryToEdit ? entryToEdit.text : ''; updateCharCount(); }
    if (label)     label.textContent = entryToEdit ? t('editEntry') : t('whatMattersToday');
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

  function submitEntry(year) {
    const ta   = document.getElementById('entry-text');
    const text = ta ? ta.value.trim() : '';
    if (!text) { showToast(t('emptyError')); ta?.focus(); return; }
    if (_editEntry) {
      updateEntry(_editEntry.id, text);
      showToast(t('saved'), 'success');
    } else {
      addEntry(year, text);
      showSaveSuccess();
    }
    closeModal();
    refreshForest();
    const panel = document.getElementById('year-panel');
    if (panel?.classList.contains('open')) showYearPanel(year);
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
        if (entry.text.toLowerCase().includes(q)) {
          results.push({ year: parseInt(year), entry });
        }
      });
    });

    if (results.length === 0) {
      const li = document.createElement('li');
      li.className = 'search-no-results';
      li.textContent = t('searchNoResults');
      list.appendChild(li);
      return;
    }

    results.slice(0, 30).forEach(({ year, entry }) => {
      const li      = document.createElement('li');
      li.className  = 'search-result-item';
      const date    = new Date(entry.date);
      const dateStr = date.toLocaleDateString(currentLang === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      const escaped = escapeHtml(entry.text);
      const highlighted = escaped.replace(
        new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'gi'),
        m => `<mark>${m}</mark>`
      );
      li.innerHTML = `
        <div class="search-result-meta">${dateStr}</div>
        <div class="search-result-text">${highlighted}</div>
      `;
      li.addEventListener('click', () => {
        closeSearch();
        selectedYear = year;
        showYearPanel(year);
        const entryDate = entry.date.substring(0, 10);
        const targetLi = document.querySelector(`#panel-entries li[data-date="${entryDate}"]`);
        if (targetLi) {
          targetLi.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetLi.classList.add('highlight-flash');
          setTimeout(() => targetLi.classList.remove('highlight-flash'), 1200);
        }
      });
      list.appendChild(li);
    });
  }

  // ── Settings ──────────────────────────────────────────────────────────────

  function openSettings() { document.getElementById('settings-overlay')?.classList.add('active'); }
  function closeSettings() { document.getElementById('settings-overlay')?.classList.remove('active'); }

  function loadReminder() {
    try { return JSON.parse(localStorage.getItem(REMINDER_KEY) || 'null'); }
    catch (e) { return null; }
  }
  function saveReminder(r) { localStorage.setItem(REMINDER_KEY, JSON.stringify(r)); }

  function initReminder() {
    const r         = loadReminder();
    const toggle    = document.getElementById('reminder-toggle');
    const timeInput = document.getElementById('reminder-time');
    const timeRow   = document.getElementById('reminder-time-row');
    if (!toggle) return;
    if (r) {
      toggle.checked = r.enabled;
      if (timeInput) timeInput.value = r.time || '21:00';
      if (timeRow) timeRow.style.display = r.enabled ? '' : 'none';
    }
    toggle.addEventListener('change', () => {
      const enabled = toggle.checked;
      const time    = (timeInput && timeInput.value) || '21:00';
      saveReminder({ enabled, time });
      if (timeRow) timeRow.style.display = enabled ? '' : 'none';
      if (enabled) scheduleReminder(time);
    });
    if (timeInput) {
      timeInput.addEventListener('change', () => {
        const r2 = loadReminder();
        if (r2 && r2.enabled) {
          saveReminder({ enabled: true, time: timeInput.value });
          scheduleReminder(timeInput.value);
        }
      });
    }
    if (r && r.enabled) scheduleReminder(r.time || '21:00');
  }

  let _reminderTimeout = null;

  function scheduleReminder(timeStr) {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    clearTimeout(_reminderTimeout);
    const [h, m]  = (timeStr || '21:00').split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return; // invalid time string, do not schedule
    const now     = new Date();
    const target  = new Date(now);
    target.setHours(h, m, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    const ms = target - now;
    _reminderTimeout = setTimeout(() => {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Daily Tree', {
          body: currentLang === 'zh' ? '今天的树还没有成长哦 🌱' : "Your tree is waiting to grow today 🌱",
        });
      } else {
        showToast(currentLang === 'zh' ? '今天的树还没有成长哦 🌱' : "Your tree is waiting to grow today 🌱");
      }
      scheduleReminder(timeStr);
    }, ms);
  }

  // ── Export / Import ───────────────────────────────────────────────────────

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
          if (!k.startsWith('daily_tree')) return; // skip unexpected keys
          localStorage.setItem(k, typeof data[k] === 'string' ? data[k] : JSON.stringify(data[k]));
        });
        refreshForest();
        showToast(t('importSuccess'), 'success');
        closeSettings();
      } catch {
        showToast(t('importError'));
      }
    };
    reader.readAsText(file);
  }

  // ── Guide ─────────────────────────────────────────────────────────────────

  const GUIDE_TOTAL = 3;
  let guideStep = 0;

  function showGuide() {
    if (localStorage.getItem(GUIDE_KEY)) return;
    document.getElementById('guide-overlay')?.classList.add('active');
    guideStep = 0;
    updateGuideStep(0);
  }

  function updateGuideStep(step) {
    document.querySelectorAll('.guide-dot').forEach((d,i) => d.classList.toggle('active', i === step));
    for (let i = 0; i < GUIDE_TOTAL; i++) {
      document.getElementById(`guide-step-${i}`)?.classList.toggle('hidden', i !== step);
    }
    const nextLabel = document.getElementById('guide-next-label');
    if (nextLabel) nextLabel.textContent = step === GUIDE_TOTAL - 1 ? t('startNow') : t('nextStep');
  }

  function closeGuide() {
    document.getElementById('guide-overlay')?.classList.remove('active');
    localStorage.setItem(GUIDE_KEY, '1');
    guideStep = 0;
  }

  // ── Events ────────────────────────────────────────────────────────────────

  function bindEvents() {
    // Lang toggle
    document.getElementById('lang-toggle')?.addEventListener('click', () => {
      setLang(currentLang === 'en' ? 'zh' : 'en');
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
      const year = parseInt(document.getElementById('modal-year')?.textContent, 10) || new Date().getFullYear();
      submitEntry(year);
    });
    document.getElementById('entry-text')?.addEventListener('input', updateCharCount);
    document.getElementById('entry-text')?.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        const year = parseInt(document.getElementById('modal-year')?.textContent, 10) || new Date().getFullYear();
        submitEntry(year);
      }
      if (e.key === 'Escape') closeModal();
    });

    // Year panel
    document.getElementById('panel-close')?.addEventListener('click', closeYearPanel);
    document.getElementById('panel-add-btn')?.addEventListener('click', () => {
      openModal(new Date().getFullYear(), getTodayEntry());
    });
    document.getElementById('panel-entries')?.addEventListener('click', e => {
      const btn = e.target.closest('.entry-edit-btn');
      if (!btn) return;
      const id    = parseInt(btn.getAttribute('data-id'), 10);
      const year  = new Date().getFullYear();
      const entry = getYearEntries(year).find(x => x.id === id);
      if (entry) openModal(year, entry);
    });

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

    // Guide
    document.getElementById('guide-next')?.addEventListener('click', () => {
      if (guideStep < GUIDE_TOTAL - 1) { guideStep++; updateGuideStep(guideStep); }
      else closeGuide();
    });
    document.getElementById('guide-skip')?.addEventListener('click', closeGuide);
    document.getElementById('guide-overlay')?.addEventListener('click', e => {
      if (e.target.id === 'guide-overlay') closeGuide();
    });

    // Global keyboard
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeModal(); closeYearPanel(); closeSearch(); closeSettings(); closeGuide(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') { e.preventDefault(); openModal(new Date().getFullYear(), getTodayEntry()); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') { e.preventDefault(); openSearch(); }
    });
  }

  // ── Bootstrap ─────────────────────────────────────────────────────────────

  window.addEventListener('DOMContentLoaded', () => {
    currentLang = detectLang();
    bindEvents();
    setLang(currentLang);
    initReminder();
    initForest().then(() => {
      updateTodayChip();
      updateStreakChip();
      setTimeout(showGuide, 600);
    });
  });

})();
