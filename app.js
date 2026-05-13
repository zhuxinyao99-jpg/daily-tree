// Daily Tree — Core App Logic

(function() {
  'use strict';

  const STORAGE_KEY = 'daily_tree_entries';
  const GUIDE_KEY = 'daily_tree_guide_seen';
  const LANG_KEY = 'daily_tree_lang';
  const YEARS_TO_SHOW = 5;
  const TODAY_CHECK_KEY = 'daily_tree_today_done';

  // ── i18n ────────────────────────────────────────────────────────────────

  const I18N = {
    en: {
      years: 'Years',
      sidebarHint: 'Click a year to read. Click + to record today.',
      entries: 'entries', entry: 'entry',
      whatMattersToday: "What's the single most important thing today?",
      placeholder: 'One moment. One thought. One thing worth remembering...',
      charCount: '/ 500',
      ctrlEnter: 'Ctrl+Enter to save',
      saveEntry: 'Save',
      close: 'Close',
      noEntries: 'No entries yet.',
      saved: 'Saved! Your tree just grew.',
      emptyError: 'Write something first.',
      // Guide
      guideTitle: 'How it works',
      guideStep1Title: 'One moment a day',
      guideStep1Desc: 'Click the + button to record the single most important thing that happened today.',
      guideStep2Title: 'Your tree grows',
      guideStep2Desc: "Each entry makes this year's tree taller and fuller. Living trees breathe. Dormant trees wait.",
      guideStep3Title: 'Click to revisit',
      guideStep3Desc: 'Click any tree to read that year. The forest remembers everything — your wins and your silences.',
      gotIt: 'Got it',
      tryIt: 'Start now',
      // Guide preview slide
      guidePreviewTitle: 'Watch your forest grow',
      guidePreviewDesc: 'The more you record, the more your trees breathe. Here\'s what consistency looks like:',
      preview1Week: '1 week',
      preview1Month: '1 month',
      preview1Year: '1 year',
      previewDormant: 'Dormant — took a break',
      previewLiving: 'Living — active recently',
      previewArchived: 'Archived — that year is closed',
      emptyForestTitle: 'Start your forest',
      emptyForestDesc: 'Click + to write your first entry.',
      // Today reminders
      todayNotRecorded: "Today's tree hasn't grown yet.",
      todayRecorded: "Today's tree is growing!",
      editEntry: 'Edit today\'s entry',
      addEntry: 'Record today',
      // Tree states
      livingTree: 'Living tree — active this year',
      dormantTree: 'Dormant tree — took a break',
      archivedTree: 'Archived tree — that year is closed',
    },
    zh: {
      years: '年份',
      sidebarHint: '点击年份查看记录。点击 + 记录今天。',
      entries: '条记录', entry: '条记录',
      whatMattersToday: '今天最重要的一件事是什么？',
      placeholder: '一个瞬间，一个想法，一件值得记住的事……',
      charCount: '/ 500',
      ctrlEnter: 'Ctrl+回车 保存',
      saveEntry: '保存',
      close: '关闭',
      noEntries: '还没有记录。',
      saved: '已保存！你的树长大了一点。',
      emptyError: '先写点什么吧。',
      // Guide
      guideTitle: '使用指南',
      guideStep1Title: '每天一个瞬间',
      guideStep1Desc: '点击 + 按钮，记录今天最重要的那件事。',
      guideStep2Title: '树会成长',
      guideStep2Desc: '每一条记录都让今年的树长高一些。活着的树在呼吸，沉睡的树在等待。',
      guideStep3Title: '点击回顾',
      guideStep3Desc: '点击任意一棵树，可以看到那一年的所有记录。森林记得一切。',
      gotIt: '明白了',
      tryIt: '开始记录',
      // Guide preview slide
      guidePreviewTitle: '看着你的森林成长',
      guidePreviewDesc: '记录越多，树越有生命力。坚持一段时间后，你的森林是这样的：',
      preview1Week: '1周',
      preview1Month: '1个月',
      preview1Year: '1年',
      previewDormant: '沉睡 — 按下了暂停',
      previewLiving: '活着 — 最近在生长',
      previewArchived: '归档 — 那一年结束了',
      emptyForestTitle: '开始你的森林',
      emptyForestDesc: '点击 + 写下第一条记录。',
      // Today reminders
      todayNotRecorded: '今天的小树还没有成长哦。',
      todayRecorded: '今天已记录，小树在成长！',
      editEntry: '修改今天的记录',
      addEntry: '记录今天',
      // Tree states
      livingTree: '活着的树 — 今年还在生长',
      dormantTree: '沉睡的树 — 按下了暂停',
      archivedTree: '归档的树 — 那一年结束了',
    },
  };

  let currentLang = 'en';

  function t(key) {
    return (I18N[currentLang] && I18N[currentLang][key]) || (I18N.en && I18N.en[key]) || key;
  }

  function detectLang() {
    var stored = localStorage.getItem(LANG_KEY);
    if (stored) return stored;
    var browser = navigator.language || 'en';
    return browser.startsWith('zh') ? 'zh' : 'en';
  }

  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    applyLang();
  }

  function applyLang() {
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
      el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });
  }

  // ── Data Layer ────────────────────────────────────────────────────────────

  function loadEntries() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch (e) { return {}; }
  }

  function saveEntries(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  function getTodayKey() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function hasTodayEntry() {
    var entries = loadEntries();
    var year = new Date().getFullYear();
    var yearEntries = entries[year] || [];
    var today = getTodayKey();
    return yearEntries.some(function(e) {
      return e.date && e.date.substring(0, 10) === today;
    });
  }

  function getTodayEntry() {
    var entries = loadEntries();
    var year = new Date().getFullYear();
    var yearEntries = entries[year] || [];
    var today = getTodayKey();
    return yearEntries.find(function(e) {
      return e.date && e.date.substring(0, 10) === today;
    }) || null;
  }

  function addEntry(year, text) {
    var entries = loadEntries();
    if (!entries[year]) entries[year] = [];
    entries[year].push({
      id: Date.now(),
      text: text.slice(0, 500),
      date: new Date().toISOString(),
    });
    saveEntries(entries);
    return entries[year];
  }

  function updateEntry(entryId, newText) {
    var entries = loadEntries();
    var found = false;
    for (var y in entries) {
      var arr = entries[y];
      for (var i = 0; i < arr.length; i++) {
        if (arr[i].id === entryId) {
          arr[i].text = newText.slice(0, 500);
          found = true;
          break;
        }
      }
      if (found) break;
    }
    if (found) saveEntries(entries);
    return found;
  }

  function getYearEntries(year) {
    return (loadEntries()[year] || []);
  }

  // ── Visual Feedback ───────────────────────────────────────────────────

  function showSaveSuccess(tree) {
    var canvas = document.getElementById('forest-canvas');
    var floater = document.createElement('div');
    floater.className = 'save-floater';
    floater.textContent = '+1';
    var cx = canvas.clientWidth / 2;
    floater.style.left = cx + 'px';
    floater.style.top = (canvas.clientHeight / 2 - 60) + 'px';
    canvas.parentElement.appendChild(floater);
    setTimeout(function() { floater.remove(); }, 2000);

    if (window._forestScene && tree) {
      window._forestScene.growTree(tree);
    } else if (window._forestScene && window._currentYearTree) {
      window._forestScene.growTree(window._currentYearTree);
    }

    spawnParticles(cx, canvas.clientHeight / 2 + 50);

    setTimeout(function() { showToast(t('saved')); }, 300);
    updateTodayIndicator();
  }

  function spawnParticles(x, y) {
    var container = document.querySelector('.main-canvas');
    var colors = ['#4A7C59', '#6B9B7A', '#C4A77D', '#8B7355'];
    for (var i = 0; i < 12; i++) {
      var p = document.createElement('div');
      p.className = 'particle';
      var angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.3;
      var dist = 50 + Math.random() * 70;
      p.style.cssText = [
        'left:' + x + 'px', 'top:' + y + 'px',
        'background:' + colors[i % colors.length],
        '--tx:' + (Math.cos(angle) * dist) + 'px',
        '--ty:' + (Math.sin(angle) * dist - 30) + 'px'
      ].join(';');
      container.appendChild(p);
      setTimeout(function(pp) { pp.remove(); }, 900, p);
    }
  }

  // ── Today Indicator ───────────────────────────────────────────────────

  function updateTodayIndicator() {
    var dot = document.getElementById('today-dot');
    var msg = document.getElementById('today-msg');
    if (!dot || !msg) return;

    var today = getTodayEntry();
    if (today) {
      dot.classList.add('recorded');
      msg.textContent = t('todayRecorded');
    } else {
      dot.classList.remove('recorded');
      msg.textContent = t('todayNotRecorded');
    }
  }

  // ── Toast ─────────────────────────────────────────────────────────────────

  function showToast(message) {
    var toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(function() { toast.classList.remove('visible'); }, 3500);
  }

  // ── Guide ──────────────────────────────────────────────────────────────

  var guideStep = 0;

  function showGuide() {
    if (localStorage.getItem(GUIDE_KEY)) return;
    document.getElementById('guide-overlay').classList.add('active');
    guideStep = 0;
    updateGuideStep(0);
  }

  function updateGuideStep(step) {
    var steps = [
      { num: '01', title: t('guideStep1Title'), desc: t('guideStep1Desc') },
      { num: '02', title: t('guideStep2Title'), desc: t('guideStep2Desc') },
      { num: '03', title: t('guideStep3Title'), desc: t('guideStep3Desc') },
      { num: '04', title: t('guidePreviewTitle'), desc: t('guidePreviewDesc'), isPreview: true },
    ];
    var s = steps[step];
    document.getElementById('guide-num').textContent = s.num;
    document.getElementById('guide-step-title').textContent = s.title;
    document.getElementById('guide-step-desc').textContent = s.desc;

    var dotsContainer = document.querySelector('.guide-steps');
    if (dotsContainer) dotsContainer.querySelectorAll('.guide-dot').forEach(function(d, i) {
      d.classList.toggle('active', i === step);
    });

    var previewRow = document.getElementById('guide-preview-row');
    if (previewRow) previewRow.style.display = step === 3 ? 'flex' : 'none';

    var nextBtn = document.getElementById('guide-next');
    nextBtn.textContent = step < steps.length - 1
      ? (step === 0 ? t('tryIt') : 'Next')
      : t('gotIt');
  }

  function nextGuideStep() {
    if (guideStep < 3) { guideStep++; updateGuideStep(guideStep); }
    else { closeGuide(); }
  }

  function closeGuide() {
    document.getElementById('guide-overlay').classList.remove('active');
    localStorage.setItem(GUIDE_KEY, '1');
    guideStep = 0;
  }

  // ── Modal ─────────────────────────────────────────────────────────────────

  var _currentEditEntry = null; // null = new entry, else = entry object to edit

  function openModal(year, entryToEdit) {
    _currentEditEntry = entryToEdit || null;
    var overlay = document.getElementById('modal-overlay');
    var textarea = document.getElementById('entry-text');
    var submitBtn = document.getElementById('entry-submit');
    var yearLabel = document.getElementById('modal-year');
    var modalLabel = document.getElementById('modal-label');

    yearLabel.textContent = year;
    textarea.value = entryToEdit ? entryToEdit.text : '';
    document.getElementById('char-count').textContent = textarea.value.length;

    if (entryToEdit) {
      modalLabel.textContent = t('editEntry');
      submitBtn.textContent = t('saveEntry') + ' ✓';
    } else {
      modalLabel.textContent = t('whatMattersToday');
      submitBtn.innerHTML = '<span data-i18n="saveEntry">' + t('saveEntry') + '</span>' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    }

    overlay.classList.add('active');
    setTimeout(function() { textarea.focus(); }, 100);
  }

  function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
    _currentEditEntry = null;
  }

  function submitEntry(year) {
    var textarea = document.getElementById('entry-text');
    var text = textarea.value.trim();
    if (!text) {
      showToast(t('emptyError'));
      textarea.focus();
      return;
    }

    if (_currentEditEntry) {
      updateEntry(_currentEditEntry.id, text);
      showToast(t('saved'));
      closeModal();
      refreshForest();
    } else {
      // Save first, then grow tree, then refresh
      addEntry(year, text);
      closeModal();
      var tree = refreshForest();
      if (tree) {
        window._currentYearTree = tree;
        showSaveSuccess(tree);
      } else {
        refreshForest();
      }
    }
  }

  // ── Forest ─────────────────────────────────────────────────────────────────

  var forestScene = null;
  var selectedYear = null;
  var SceneModuleRef = null;
  var TreeModuleRef = null;

  function isForestReady() { return forestScene !== null; }

  async function initForest() {
    var canvas = document.getElementById('forest-canvas');
    if (!canvas) return;

    // THREE must be loaded and set on window before importing scene/tree modules
    // (those files use: import * as THREE from 'three')
    if (!window.THREE) {
      var threeModule = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
      window.THREE = threeModule;
    }

    SceneModuleRef = await import('./webgl/scene.js');
    TreeModuleRef = await import('./webgl/tree.js');

    forestScene = new SceneModuleRef.ForestScene(canvas);
    window._forestScene = forestScene;

    refreshForest();
    updateTodayIndicator();
    updateEmptyHint();
  }

  function refreshForest() {
    if (!forestScene || !TreeModuleRef) return null;
    var entries = loadEntries();
    var currentYear = new Date().getFullYear();
    var years = [];
    for (var i = 0; i < YEARS_TO_SHOW; i++) { years.push(currentYear - i); }

    forestScene.removeAllTrees();

    var currentTree = null;
    years.forEach(function(year) {
      var yearEntries = entries[year] || [];
      var lastDate = yearEntries.length > 0
        ? yearEntries[yearEntries.length - 1].date
        : year + '-01-01T00:00:00';

      var tree = forestScene.addTree(TreeModuleRef.Tree, year, yearEntries.length, {
        lastEntryDate: lastDate,
      });

      if (year === currentYear) {
        currentTree = tree;
        window._currentYearTree = tree;
      }
    });

    updateSidebar(entries, years);
    updateTodayIndicator();
    updateEmptyHint();
    renderYearNav(years, selectedYear);
    return currentTree;
  }

  function updateEmptyHint() {
    var hint = document.getElementById('forest-hint');
    if (!hint) return;
    var entries = loadEntries();
    var total = Object.values(entries).reduce(function(s, arr) { return s + arr.length; }, 0);
    hint.style.display = total === 0 ? 'flex' : 'none';
  }

  // ── Year Ring Navigation ───────────────────────────────────────────────

  function renderYearNav(years, activeYear) {
    var container = document.getElementById('year-nav');
    if (!container) return;
    container.innerHTML = '';

    var count = years.length;
    if (count === 0) return;

    var maxRing = 36;
    var step = 7;

    years.forEach(function(year, idx) {
      var radius = maxRing + (count - 1 - idx) * step;
      var isActive = year === activeYear;
      var item = document.createElement('div');
      item.className = 'year-ring-nav-item' + (isActive ? ' active' : '');
      item.style.width = (radius * 2) + 'px';
      item.style.height = (radius * 2) + 'px';
      item.dataset.year = year;

      var label = document.createElement('span');
      label.textContent = year;
      item.appendChild(label);

      item.addEventListener('click', function() {
        selectedYear = year;
        showYearPanel(year);
        renderYearNav(years, year);
      });

      container.appendChild(item);
    });
  }

  // ── Sidebar ───────────────────────────────────────────────────────────────

  function updateSidebar(entries, years) {
    var list = document.getElementById('year-list');
    if (!list) return;
    list.innerHTML = '';

    var currentYear = new Date().getFullYear();
    var todayEntry = getTodayEntry();

    years.forEach(function(year) {
      var yearEntries = entries[year] || [];
      var count = yearEntries.length;
      var li = document.createElement('li');
      var isActive = selectedYear === year;
      var isCurrentYear = year === currentYear;
      var hasToday = isCurrentYear && todayEntry !== null;

      li.className = 'year-item' + (isActive ? ' active' : '') + (isCurrentYear ? ' current-year' : '');
      li.innerHTML =
        '<span class="year-num">' + year + '</span>' +
        '<span class="year-count">' + count + ' ' + (count === 1 ? t('entry') : t('entries')) + '</span>' +
        (hasToday ? '<span class="today-dot-inline recorded" id="today-dot-inline"></span>' : '');
      li.addEventListener('click', function() {
        selectedYear = year;
        updateSidebar(loadEntries(), years);
        showYearPanel(year);
      });
      list.appendChild(li);
    });
  }

  // ── Year Detail Panel ──────────────────────────────────────────────────────

  function showYearPanel(year) {
    var panel = document.getElementById('year-panel');
    document.getElementById('panel-title').textContent = year;

    var entries = getYearEntries(year);
    var list = document.getElementById('panel-entries');
    list.innerHTML = '';

    if (entries.length === 0) {
      var empty = document.createElement('li');
      empty.className = 'empty-note';
      empty.textContent = t('noEntries');
      list.appendChild(empty);
    } else {
      entries.slice().reverse().forEach(function(entry) {
        var li = document.createElement('li');
        li.className = 'entry-item';

        var date = new Date(entry.date);
        var todayKey = getTodayKey();
        var isToday = entry.date.substring(0, 10) === todayKey;

        var dateStr = date.toLocaleDateString(currentLang === 'zh' ? 'zh-CN' : 'en-US', {
          month: 'short', day: 'numeric',
        });

        li.innerHTML =
          '<div class="entry-row">' +
            '<div class="entry-left">' +
              '<span class="entry-date">' + dateStr + '</span>' +
              (isToday ? '<span class="entry-today-badge">' + (currentLang === 'zh' ? '今天' : 'Today') + '</span>' : '') +
            '</div>' +
            (isToday
              ? '<button class="entry-edit-btn" data-id="' + entry.id + '">' + (currentLang === 'zh' ? '修改' : 'Edit') + '</button>'
              : '') +
          '</div>' +
          '<p class="entry-text">' + escapeHtml(entry.text) + '</p>';
        list.appendChild(li);
      });
    }

    // Today FAB hint
    var todayHint = document.getElementById('today-fab-hint');
    var currentYearEntries = getYearEntries(new Date().getFullYear());
    var todayEntry2 = getTodayEntry();
    if (todayHint) {
      if (todayEntry2) {
        todayHint.textContent = t('todayRecorded');
        todayHint.classList.add('recorded');
      } else {
        todayHint.textContent = t('todayNotRecorded');
        todayHint.classList.remove('recorded');
      }
    }

    panel.classList.add('open');
  }

  function closeYearPanel() {
    document.getElementById('year-panel').classList.remove('open');
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ── Events ───────────────────────────────────────────────────────────────

  function bindEvents() {
    currentLang = detectLang();

    // Sidebar toggle (mobile)
    var sidebarToggle = document.getElementById('sidebar-toggle');
    var sidebar = document.querySelector('.sidebar');
    if (sidebarToggle && sidebar) {
      sidebarToggle.addEventListener('click', function() {
        sidebar.classList.toggle('open');
        sidebarToggle.classList.toggle('open');
      });
      // Close sidebar when clicking canvas area
      document.getElementById('forest-canvas').addEventListener('click', function() {
        sidebar.classList.remove('open');
        sidebarToggle.classList.remove('open');
      });
    }

    // Language toggle
    document.getElementById('lang-toggle').addEventListener('click', function() {
      setLang(currentLang === 'en' ? 'zh' : 'en');
    });

    // Guide
    document.getElementById('guide-next').addEventListener('click', nextGuideStep);
    var skipBtn = document.getElementById('guide-skip');
    if (skipBtn) skipBtn.addEventListener('click', closeGuide);
    var guideOverlay = document.getElementById('guide-overlay');
    guideOverlay.addEventListener('click', function(e) {
      if (e.target === guideOverlay) closeGuide();
    });

    // Modal
    var modalOverlay = document.getElementById('modal-overlay');
    modalOverlay.addEventListener('click', function(e) {
      if (e.target === modalOverlay) closeModal();
    });
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('entry-submit').addEventListener('click', function() {
      var year = parseInt(document.getElementById('modal-year').textContent, 10);
      submitEntry(year);
    });

    var textarea = document.getElementById('entry-text');
    textarea.addEventListener('input', function() {
      document.getElementById('char-count').textContent = textarea.value.length;
    });
    textarea.addEventListener('keydown', function(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        var year = parseInt(document.getElementById('modal-year').textContent, 10);
        submitEntry(year);
      }
      if (e.key === 'Escape') closeModal();
    });

    // FAB — context-sensitive
    document.getElementById('fab-new').addEventListener('click', function() {
      var year = new Date().getFullYear();
      var todayEntry = getTodayEntry();
      if (todayEntry) {
        openModal(year, todayEntry);
      } else {
        openModal(year, null);
      }
    });

    // Panel close
    document.getElementById('panel-close').addEventListener('click', closeYearPanel);

    // Entry edit from panel (delegated)
    document.getElementById('panel-entries').addEventListener('click', function(e) {
      var btn = e.target.closest('.entry-edit-btn');
      if (!btn) return;
      var id = parseInt(btn.getAttribute('data-id'), 10);
      var year = new Date().getFullYear();
      var entries = getYearEntries(year);
      var entry = entries.find(function(e) { return e.id === id; });
      if (entry) openModal(year, entry);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closeModal();
        closeYearPanel();
        closeGuide();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        var year = new Date().getFullYear();
        var todayEntry = getTodayEntry();
        openModal(year, todayEntry);
      }
    });

    // Forest click
    document.getElementById('forest-canvas').addEventListener('click', function(e) {
      // handled by scene.js raycaster, but also check if clicking empty area
      // If no tree hovered after click, close panel
    });
  }

  // ── Bootstrap ───────────────────────────────────────────────────────────

  window.addEventListener('DOMContentLoaded', function() {
    bindEvents();
    applyLang();
    initForest().then(function() {
      setTimeout(showGuide, 800);
    });
  });

})();
