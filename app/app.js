// Daily Tree — Core App Logic

(function() {
  'use strict';

  const STORAGE_KEY = 'daily_tree_entries';
  const GUIDE_KEY   = 'daily_tree_guide_seen';
  const LANG_KEY    = 'daily_tree_lang';
  const YEARS_TO_SHOW = 5;

  // ── i18n ────────────────────────────────────────────────────────────────

  const I18N = {
    en: {
      years: 'Years',
      sidebarHint: 'Tap a year to read. Tap + to record today.',
      entries: 'entries', entry: 'entry',
      whatMattersToday: "What matters most today?",
      placeholder: 'One moment. One thought. One thing worth remembering...',
      charCount: '/ 500',
      ctrlEnter: 'Ctrl+Enter to save',
      saveEntry: 'Save',
      close: 'Close',
      noEntries: 'No entries yet.',
      saved: 'Saved! Your tree just grew.',
      emptyError: 'Write something first.',
      emptyForestTitle: 'Start your forest',
      emptyForestDesc: 'Tap + to write your first entry.',
      todayNotRecorded: "Today's tree hasn't grown yet",
      todayRecorded: "Today's tree is growing",
      addEntry: 'Record today',
      editEntry: 'Edit today',
      todayBadgeNone: "Not yet today — tap + to grow",
      todayBadgeDone: "Recorded today ✓",
      guideStep1Title: 'One moment a day',
      guideStep1Desc: 'Tap + to record the single most important thing that happened today.',
      guideStep2Title: 'Your tree grows',
      guideStep2Desc: "Each entry makes this year's tree taller and fuller. Living trees breathe.",
      guideStep3Title: 'Three kinds of trees',
      guideStep3Desc: 'Active → Living. 14 days of silence → Dormant. Past years → Archived. Each tells a story.',
      guidePreviewTitle: 'Watch your forest grow',
      guidePreviewDesc: 'Consistency builds something beautiful. Each ring is a day you showed up.',
      guideStep4Title: 'Tap to revisit',
      guideStep4Desc: "Tap any tree to read that year's entries. The forest remembers everything.",
      guideClickHint: 'Tap any tree to read that year',
      skipGuide: 'Skip',
      startNow: 'Start now',
      nextStep: 'Next',
      preview1Week: '1 week',
      preview1Month: '1 month',
      preview6Month: '6 months',
      preview1Year: '1 year',
      tl1WeekDesc: 'A seed sprouts',
      tl1MonthDesc: 'A sapling grows',
      tl6MonthDesc: 'A forest emerges',
      tl1YearDesc: 'A living memory',
      previewLiving: 'Living',
      previewDormant: 'Dormant',
      previewArchived: 'Archived',
    },
    zh: {
      years: '年份',
      sidebarHint: '点击年份查看记录。点击 + 记录今天。',
      entries: '条记录', entry: '条记录',
      whatMattersToday: '今天最重要的一件事？',
      placeholder: '一个瞬间，一个想法，一件值得记住的事……',
      charCount: '/ 500',
      ctrlEnter: 'Ctrl+回车 保存',
      saveEntry: '保存',
      close: '关闭',
      noEntries: '还没有记录。',
      saved: '已保存！你的树又长大了一点。',
      emptyError: '先写点什么吧。',
      emptyForestTitle: '开始你的森林',
      emptyForestDesc: '点击 + 写下第一条记录。',
      todayNotRecorded: '今天的小树还没有成长哦',
      todayRecorded: '今天已记录，小树在成长',
      addEntry: '记录今天',
      editEntry: '修改今天的记录',
      todayBadgeNone: '今天还没记录 — 点 + 来成长',
      todayBadgeDone: '今天已记录 ✓',
      guideStep1Title: '每天一个瞬间',
      guideStep1Desc: '点击 + 按鈕，记录今天最重要的那件事。',
      guideStep2Title: '树会成长',
      guideStep2Desc: '每一条记录都让今年的树长高一些。活着的树在呼吸。',
      guideStep3Title: '三种树的形态',
      guideStep3Desc: '活跃 → 活着。沉默14天 → 沉睡。已过去的年份 → 归档。每一棵都在讲述故事。',
      guidePreviewTitle: '看着你的森林成长',
      guidePreviewDesc: '坚持记录，会积累出美好的东西。每一个年轮，都是你出现的那一天。',
      guideStep4Title: '点击回顾',
      guideStep4Desc: '点击任意一棵树，可以看到那一年的所有记录。森林记得一切。',
      guideClickHint: '点击任意一棵树，查看那一年',
      skipGuide: '跳过',
      startNow: '开始记录',
      nextStep: '下一步',
      preview1Week: '1周',
      preview1Month: '1个月',
      preview6Month: '6个月',
      preview1Year: '1年',
      tl1WeekDesc: '一颗种子发芽',
      tl1MonthDesc: '一棵小苗在生长',
      tl6MonthDesc: '一片森林初现',
      tl1YearDesc: '一段活着的记忆',
      previewLiving: '活着',
      previewDormant: '沉睡',
      previewArchived: '归档',
    },
  };

  let currentLang = 'en';

  function t(key) {
    return (I18N[currentLang] && I18N[currentLang][key]) || (I18N.en && I18N.en[key]) || key;
  }

  function detectLang() {
    var stored = localStorage.getItem(LANG_KEY);
    if (stored) return stored;
    return (navigator.language || 'en').startsWith('zh') ? 'zh' : 'en';
  }

  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    applyLang();
    var lt = document.getElementById('lang-toggle');
    var ltm = document.getElementById('lang-toggle-mobile');
    if (lt) lt.textContent = lang === 'en' ? 'EN / 中文' : '中文 / EN';
    if (ltm) ltm.textContent = lang === 'en' ? 'EN/中' : '中/EN';
  }

  function applyLang() {
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
      el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });
    updateTodayIndicator();
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
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function getTodayEntry() {
    var entries = loadEntries();
    var year = new Date().getFullYear();
    var today = getTodayKey();
    return (entries[year] || []).find(function(e) {
      return e.date && e.date.substring(0, 10) === today;
    }) || null;
  }

  function addEntry(year, text) {
    var entries = loadEntries();
    if (!entries[year]) entries[year] = [];
    entries[year].push({ id: Date.now(), text: text.slice(0, 500), date: new Date().toISOString() });
    saveEntries(entries);
  }

  function updateEntry(entryId, newText) {
    var entries = loadEntries();
    for (var y in entries) {
      for (var i = 0; i < entries[y].length; i++) {
        if (entries[y][i].id === entryId) {
          entries[y][i].text = newText.slice(0, 500);
          saveEntries(entries);
          return true;
        }
      }
    }
    return false;
  }

  function getYearEntries(year) {
    return (loadEntries()[year] || []);
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

  function showToast(message, type) {
    var toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      toast.className = 'app-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = 'app-toast visible' + (type ? ' ' + type : '');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(function() { toast.className = 'app-toast'; }, 3500);
  }

  // ── Particles ───────────────────────────────────────────────────────────

  function spawnParticles(x, y) {
    var container = document.querySelector('.main-canvas');
    if (!container) return;
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

  function showSaveSuccess() {
    var canvas = document.getElementById('forest-canvas');
    if (!canvas) return;
    var cx = canvas.clientWidth / 2;
    var cy = canvas.clientHeight / 2;

    var floater = document.createElement('div');
    floater.className = 'save-floater';
    floater.textContent = '+1';
    floater.style.left = cx + 'px';
    floater.style.top = (cy - 40) + 'px';
    canvas.parentElement.appendChild(floater);
    setTimeout(function() { floater.remove(); }, 2000);

    spawnParticles(cx, cy + 30);
    setTimeout(function() { showToast(t('saved'), 'success'); }, 300);
    updateTodayIndicator();
  }

  // ── Guide ──────────────────────────────────────────────────────────────

  var guideStep = 0;
  var GUIDE_TOTAL = 5;

  function showGuide() {
    if (localStorage.getItem(GUIDE_KEY)) return;
    var overlay = document.getElementById('guide-overlay');
    if (!overlay) return;
    overlay.classList.add('active');
    guideStep = 0;
    updateGuideStep(0);
  }

  function updateGuideStep(step) {
    document.querySelectorAll('.guide-dot').forEach(function(d, i) {
      d.classList.toggle('active', i === step);
    });
    for (var i = 0; i < GUIDE_TOTAL; i++) {
      var el = document.getElementById('guide-step-' + i);
      if (el) el.classList.toggle('hidden', i !== step);
    }
    var nextLabel = document.getElementById('guide-next-label');
    if (nextLabel) nextLabel.textContent = step === GUIDE_TOTAL - 1 ? t('startNow') : t('nextStep');
  }

  function nextGuideStep() {
    if (guideStep < GUIDE_TOTAL - 1) { guideStep++; updateGuideStep(guideStep); }
    else closeGuide();
  }

  function closeGuide() {
    var overlay = document.getElementById('guide-overlay');
    if (overlay) overlay.classList.remove('active');
    localStorage.setItem(GUIDE_KEY, '1');
    guideStep = 0;
  }

  // ── Modal ─────────────────────────────────────────────────────────────────

  var _currentEditEntry = null;

  function openModal(year, entryToEdit) {
    _currentEditEntry = entryToEdit || null;
    var overlay = document.getElementById('modal-overlay');
    var textarea = document.getElementById('entry-text');
    var yearLabel = document.getElementById('modal-year');
    var modalLabel = document.getElementById('modal-label');

    if (yearLabel) yearLabel.textContent = year;
    if (textarea) {
      textarea.value = entryToEdit ? entryToEdit.text : '';
      var charCount = document.getElementById('char-count');
      if (charCount) charCount.textContent = textarea.value.length;
    }
    if (modalLabel) modalLabel.textContent = entryToEdit ? t('editEntry') : t('whatMattersToday');
    if (overlay) overlay.classList.add('active');
    setTimeout(function() { if (textarea) textarea.focus(); }, 150);
  }

  function closeModal() {
    var overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.remove('active');
    _currentEditEntry = null;
  }

  function submitEntry(year) {
    var textarea = document.getElementById('entry-text');
    var text = textarea ? textarea.value.trim() : '';
    if (!text) { showToast(t('emptyError')); if (textarea) textarea.focus(); return; }

    if (_currentEditEntry) {
      updateEntry(_currentEditEntry.id, text);
      closeModal();
      refreshForest();
      showToast(t('saved'), 'success');
    } else {
      addEntry(year, text);
      closeModal();
      refreshForest();
      showSaveSuccess();
    }
    var panel = document.getElementById('year-panel');
    if (panel && panel.classList.contains('open')) showYearPanel(year);
  }

  // ── Forest ─────────────────────────────────────────────────────────────────

  var forestScene = null;
  var selectedYear = null;

  async function initForest() {
    var canvas = document.getElementById('forest-canvas');
    if (!canvas) return;

    if (!window.THREE) {
      console.error('THREE.js not loaded. Check webgl/three.js path.');
      showFallbackMessage();
      return;
    }

    try {
      var SceneModule = await import('./webgl/scene.js');
      var TreeModule  = await import('./webgl/tree.js');

      forestScene = new SceneModule.ForestScene(canvas);
      window._forestScene = forestScene;
      window._TreeModule = TreeModule;

      window.showYearDetail = function(year) {
        selectedYear = year;
        showYearPanel(year);
        updateSidebarActive(year);
      };

      refreshForest();
      updateTodayIndicator();
      updateEmptyHint();
    } catch (err) {
      console.error('Forest init failed:', err);
      showFallbackMessage();
    }
  }

  function showFallbackMessage() {
    var hint = document.getElementById('forest-hint');
    if (hint) {
      hint.style.display = 'flex';
      var title = hint.querySelector('.forest-hint-title');
      if (title) title.textContent = currentLang === 'zh' ? '3D森林加载失败' : '3D forest unavailable';
      var desc = hint.querySelector('.forest-hint-desc');
      if (desc) desc.textContent = currentLang === 'zh'
        ? '仍可正常记录，点击年份查看记录。'
        : 'You can still record entries and view them by year.';
    }
  }

  function refreshForest() {
    if (!forestScene || !window._TreeModule) return;
    var entries = loadEntries();
    var currentYear = new Date().getFullYear();
    var years = [];
    for (var i = 0; i < YEARS_TO_SHOW; i++) years.push(currentYear - i);

    forestScene.removeAllTrees();

    years.forEach(function(year) {
      var yearEntries = entries[year] || [];
      var lastDate = yearEntries.length > 0
        ? yearEntries[yearEntries.length - 1].date
        : year + '-01-01T00:00:00';

      var tree = forestScene.addTree(window._TreeModule.Tree, year, yearEntries.length, {
        lastEntryDate: lastDate,
      });
      if (year === currentYear) window._currentYearTree = tree;
    });

    updateSidebar(entries, years);
    updateTodayIndicator();
    updateEmptyHint();
  }

  function updateEmptyHint() {
    var hint = document.getElementById('forest-hint');
    if (!hint) return;
    var entries = loadEntries();
    var total = Object.values(entries).reduce(function(s, arr) { return s + arr.length; }, 0);
    hint.style.display = total === 0 ? 'flex' : 'none';
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
      var isCurrentYear = year === currentYear;
      var hasToday = isCurrentYear && todayEntry !== null;

      var li = document.createElement('li');
      li.className = 'year-item' +
        (selectedYear === year ? ' active' : '') +
        (isCurrentYear ? ' current-year' : '');

      li.innerHTML =
        '<div class="year-item-left">' +
          '<span class="year-num">' + year + '</span>' +
          (hasToday ? '<span class="today-dot-inline recorded"></span>' : '') +
        '</div>' +
        '<span class="year-count">' + count + ' ' + (count === 1 ? t('entry') : t('entries')) + '</span>';

      li.addEventListener('click', function() {
        selectedYear = year;
        updateSidebar(loadEntries(), years);
        showYearPanel(year);
        closeSidebar();
      });
      list.appendChild(li);
    });
  }

  function updateSidebarActive(year) {
    selectedYear = year;
    var entries = loadEntries();
    var currentYear = new Date().getFullYear();
    var years = [];
    for (var i = 0; i < YEARS_TO_SHOW; i++) years.push(currentYear - i);
    updateSidebar(entries, years);
  }

  // ── Year Detail Panel ──────────────────────────────────────────────────────

  function showYearPanel(year) {
    var panel = document.getElementById('year-panel');
    var titleEl = document.getElementById('panel-title');
    if (titleEl) titleEl.textContent = year;

    var todayBadge = document.getElementById('panel-today-badge');
    var todayEntry = getTodayEntry();
    var isCurrentYear = (year === new Date().getFullYear());

    if (todayBadge) {
      if (isCurrentYear) {
        todayBadge.style.display = 'inline-flex';
        if (todayEntry) {
          todayBadge.textContent = t('todayBadgeDone');
          todayBadge.className = 'panel-today-status recorded';
        } else {
          todayBadge.textContent = t('todayBadgeNone');
          todayBadge.className = 'panel-today-status';
        }
      } else {
        todayBadge.style.display = 'none';
      }
    }

    var addBtn = document.getElementById('panel-add-btn');
    if (addBtn) {
      if (isCurrentYear) {
        addBtn.style.display = 'inline-flex';
        var addBtnSpan = addBtn.querySelector('span');
        if (addBtnSpan) addBtnSpan.textContent = todayEntry ? t('editEntry') : t('addEntry');
      } else {
        addBtn.style.display = 'none';
      }
    }

    var entries = getYearEntries(year);
    var list = document.getElementById('panel-entries');
    if (!list) return;
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
        var dateStr = date.toLocaleDateString(currentLang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' });
        li.innerHTML =
          '<div class="entry-row">' +
            '<div class="entry-left">' +
              '<span class="entry-date">' + dateStr + '</span>' +
              (isToday ? '<span class="entry-today-badge">' + (currentLang === 'zh' ? '今天' : 'Today') + '</span>' : '') +
            '</div>' +
            (isToday ? '<button class="entry-edit-btn" data-id="' + entry.id + '">' + (currentLang === 'zh' ? '修改' : 'Edit') + '</button>' : '') +
          '</div>' +
          '<p class="entry-text">' + escapeHtml(entry.text) + '</p>';
        list.appendChild(li);
      });
    }

    panel.classList.add('open');
  }

  function closeYearPanel() {
    var panel = document.getElementById('year-panel');
    if (panel) panel.classList.remove('open');
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ── Sidebar mobile ─────────────────────────────────────────────────────────

  function openSidebar() {
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebar-overlay');
    var toggle = document.getElementById('sidebar-toggle');
    if (sidebar) sidebar.classList.add('open');
    if (overlay) overlay.classList.add('active');
    if (toggle) toggle.classList.add('open');
  }

  function closeSidebar() {
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebar-overlay');
    var toggle = document.getElementById('sidebar-toggle');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    if (toggle) toggle.classList.remove('open');
  }

  // ── Events ───────────────────────────────────────────────────────────────

  function bindEvents() {
    currentLang = detectLang();

    var sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', function() {
        var sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('open')) closeSidebar();
        else openSidebar();
      });
    }

    var sidebarOverlay = document.getElementById('sidebar-overlay');
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

    var langToggle = document.getElementById('lang-toggle');
    if (langToggle) langToggle.addEventListener('click', function() { setLang(currentLang === 'en' ? 'zh' : 'en'); });

    var langToggleMobile = document.getElementById('lang-toggle-mobile');
    if (langToggleMobile) langToggleMobile.addEventListener('click', function() { setLang(currentLang === 'en' ? 'zh' : 'en'); });

    var guideNext = document.getElementById('guide-next');
    if (guideNext) guideNext.addEventListener('click', nextGuideStep);
    var guideSkip = document.getElementById('guide-skip');
    if (guideSkip) guideSkip.addEventListener('click', closeGuide);
    var guideOverlay = document.getElementById('guide-overlay');
    if (guideOverlay) guideOverlay.addEventListener('click', function(e) { if (e.target === guideOverlay) closeGuide(); });

    var modalOverlay = document.getElementById('modal-overlay');
    if (modalOverlay) modalOverlay.addEventListener('click', function(e) { if (e.target === modalOverlay) closeModal(); });
    var modalClose = document.getElementById('modal-close');
    if (modalClose) modalClose.addEventListener('click', closeModal);

    var submitBtn = document.getElementById('entry-submit');
    if (submitBtn) submitBtn.addEventListener('click', function() {
      var year = parseInt((document.getElementById('modal-year') || {}).textContent, 10) || new Date().getFullYear();
      submitEntry(year);
    });

    var textarea = document.getElementById('entry-text');
    if (textarea) {
      textarea.addEventListener('input', function() {
        var cc = document.getElementById('char-count');
        if (cc) cc.textContent = textarea.value.length;
      });
      textarea.addEventListener('keydown', function(e) {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          var year = parseInt((document.getElementById('modal-year') || {}).textContent, 10) || new Date().getFullYear();
          submitEntry(year);
        }
        if (e.key === 'Escape') closeModal();
      });
    }

    var fab = document.getElementById('fab-new');
    if (fab) fab.addEventListener('click', function() { openModal(new Date().getFullYear(), getTodayEntry()); });

    var panelAddBtn = document.getElementById('panel-add-btn');
    if (panelAddBtn) panelAddBtn.addEventListener('click', function() { openModal(new Date().getFullYear(), getTodayEntry()); });

    var panelClose = document.getElementById('panel-close');
    if (panelClose) panelClose.addEventListener('click', closeYearPanel);

    var panelEntries = document.getElementById('panel-entries');
    if (panelEntries) panelEntries.addEventListener('click', function(e) {
      var btn = e.target.closest('.entry-edit-btn');
      if (!btn) return;
      var id = parseInt(btn.getAttribute('data-id'), 10);
      var year = new Date().getFullYear();
      var entry = getYearEntries(year).find(function(en) { return en.id === id; });
      if (entry) openModal(year, entry);
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') { closeModal(); closeYearPanel(); closeGuide(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        openModal(new Date().getFullYear(), getTodayEntry());
      }
    });
  }

  // ── Bootstrap ───────────────────────────────────────────────────────────

  window.addEventListener('DOMContentLoaded', function() {
    bindEvents();
    setLang(detectLang());
    initForest().then(function() {
      setTimeout(showGuide, 600);
    });
  });

})();
