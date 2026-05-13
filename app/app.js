// Daily Tree — Core App Logic

(function() {
  'use strict';

  const STORAGE_KEY = 'daily_tree_entries';
  const GUIDE_KEY = 'daily_tree_guide_seen';
  const LANG_KEY = 'daily_tree_lang';
  const YEARS_TO_SHOW = 5;

  // ── i18n ────────────────────────────────────────────────────────────────

  const I18N = {
    en: {
      years: 'Years',
      sidebarHint: 'Click a year to read. Click + to record today.',
      entries: 'entries',
      entry: 'entry',
      whatMattersToday: 'What matters most today?',
      placeholder: 'One moment. One thought. One thing worth remembering...',
      charCount: '/ 500',
      ctrlEnter: 'Ctrl+Enter to save',
      saveEntry: 'Save',
      close: 'Close',
      noEntries: 'No entries yet. Click + to start.',
      saved: 'Saved! Your tree just grew.',
      emptyError: 'Write something first.',
      guideTitle: 'How it works',
      guideStep1Title: 'One moment a day',
      guideStep1Desc: 'Click the + button to record the single most important thing that happened today.',
      guideStep2Title: 'Your tree grows',
      guideStep2Desc: "Each entry makes the current year's tree taller and fuller. Watch your forest accumulate.",
      guideStep3Title: 'Click to revisit',
      guideStep3Desc: 'Click any tree to read all entries from that year. The forest remembers everything.',
      gotIt: 'Got it',
      tryIt: 'Try it now',
      emptyForestTitle: 'Start your forest',
      emptyForestDesc: 'Click + to write your first entry. A tree will grow from nothing.',
    },
    zh: {
      years: '年份',
      sidebarHint: '点击年份查看记录。点击 + 记录今天。',
      entries: '条记录',
      entry: '条记录',
      whatMattersToday: '今天最重要的一件事是什么？',
      placeholder: '一个瞬间，一个想法，一件值得记住的事……',
      charCount: '/ 500',
      ctrlEnter: 'Ctrl+回车 保存',
      saveEntry: '保存',
      close: '关闭',
      noEntries: '还没有记录。点击 + 开始。',
      saved: '已保存！你的树刚刚长大了一点。',
      emptyError: '先写点什么吧。',
      guideTitle: '使用指南',
      guideStep1Title: '每天一个瞬间',
      guideStep1Desc: '点击 + 按钮，记录今天最重要的那件事。',
      guideStep2Title: '树会成长',
      guideStep2Desc: '每一条记录，都让今年的树长高一点。看着你的森林慢慢积累。',
      guideStep3Title: '点击回顾',
      guideStep3Desc: '点击任意一棵树，可以看到那一年的所有记录。森林记得一切。',
      gotIt: '明白了',
      tryIt: '开始记录',
      emptyForestTitle: '开始你的森林',
      emptyForestDesc: '点击 + 写下第一条记录，一棵树就会从无到有。',
    },
  };

  let currentLang = 'en';

  function t(key) {
    return (I18N[currentLang] && I18N[currentLang][key]) || I18N.en[key] || key;
  }

  function detectLang() {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored) return stored;
    const browser = navigator.language || 'en';
    return browser.startsWith('zh') ? 'zh' : 'en';
  }

  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem(LANG_KEY, lang);
    applyLang();
  }

  function applyLang() {
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = t(key);
    });
  }

  // ── Data Layer ────────────────────────────────────────────────────────────

  function loadEntries() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  function saveEntries(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
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

  function getYearEntries(year) {
    return (loadEntries()[year] || []);
  }

  // ── Feedback Animations ───────────────────────────────────────────────────

  function showSaveSuccess() {
    // Floating "+1" on canvas
    var canvas = document.getElementById('forest-canvas');
    var floater = document.createElement('div');
    floater.className = 'save-floater';
    floater.textContent = '+1';
    var cx = canvas.clientWidth / 2;
    var cy = canvas.clientHeight / 2 - 50;
    floater.style.left = cx + 'px';
    floater.style.top = cy + 'px';
    canvas.parentElement.appendChild(floater);

    // Tree growth animation
    if (window.forestScene && window.currentYearTree) {
      window.forestScene.growTree(window.currentYearTree);
    }

    // Particles
    spawnParticles(cx, cy + 100);

    // Toast
    setTimeout(function() { showToast(t('saved')); }, 600);

    setTimeout(function() { floater.remove(); }, 2000);
  }

  function spawnParticles(x, y) {
    var container = document.querySelector('.main-canvas');
    var colors = ['#4A7C59', '#6B9B7A', '#C4A77D', '#8B7355'];
    for (var i = 0; i < 14; i++) {
      var p = document.createElement('div');
      p.className = 'particle';
      var angle = (Math.PI * 2 * i) / 14 + Math.random() * 0.3;
      var dist = 60 + Math.random() * 80;
      var color = colors[Math.floor(Math.random() * colors.length)];
      p.style.cssText = [
        'left:' + x + 'px',
        'top:' + y + 'px',
        'background:' + color,
        '--tx:' + (Math.cos(angle) * dist) + 'px',
        '--ty:' + (Math.sin(angle) * dist - 40) + 'px'
      ].join(';');
      container.appendChild(p);
      setTimeout(function(pp) { pp.remove(); }, 1000, p);
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

  // ── Guide Overlay ────────────────────────────────────────────────────────

  var guideStep = 0;

  function showGuide() {
    if (localStorage.getItem(GUIDE_KEY)) return;
    var overlay = document.getElementById('guide-overlay');
    overlay.classList.add('active');
    guideStep = 0;
    updateGuideStep(0);
  }

  function updateGuideStep(step) {
    var steps = [
      { num: '01', title: t('guideStep1Title'), desc: t('guideStep1Desc') },
      { num: '02', title: t('guideStep2Title'), desc: t('guideStep2Desc') },
      { num: '03', title: t('guideStep3Title'), desc: t('guideStep3Desc') },
    ];

    var s = steps[step];
    document.getElementById('guide-num').textContent = s.num;
    document.getElementById('guide-step-title').textContent = s.title;
    document.getElementById('guide-step-desc').textContent = s.desc;

    var dots = document.querySelectorAll('.guide-dot');
    dots.forEach(function(d, i) { d.classList.toggle('active', i === step); });

    var nextBtn = document.getElementById('guide-next');
    if (step < steps.length - 1) {
      nextBtn.textContent = step === 0 ? t('tryIt') : 'Next';
    } else {
      nextBtn.textContent = t('gotIt');
    }
  }

  function nextGuideStep() {
    if (guideStep < 2) {
      guideStep++;
      updateGuideStep(guideStep);
    } else {
      closeGuide();
    }
  }

  function closeGuide() {
    document.getElementById('guide-overlay').classList.remove('active');
    localStorage.setItem(GUIDE_KEY, '1');
    guideStep = 0;
  }

  function toggleLang() {
    setLang(currentLang === 'en' ? 'zh' : 'en');
  }

  // ── Modal ─────────────────────────────────────────────────────────────────

  function openModal(year) {
    var overlay = document.getElementById('modal-overlay');
    var textarea = document.getElementById('entry-text');
    document.getElementById('modal-year').textContent = year;
    textarea.value = '';
    document.getElementById('char-count').textContent = '0';
    document.getElementById('entry-submit').disabled = false;
    overlay.classList.add('active');
    setTimeout(function() { textarea.focus(); }, 100);
  }

  function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
  }

  function submitEntry(year) {
    var textarea = document.getElementById('entry-text');
    var text = textarea.value.trim();
    if (!text) {
      showToast(t('emptyError'));
      textarea.focus();
      return;
    }
    document.getElementById('entry-submit').disabled = true;
    addEntry(year, text);
    closeModal();
    refreshForest();
    setTimeout(showSaveSuccess, 100);
  }

  // ── Forest ─────────────────────────────────────────────────────────────────

  var forestScene = null;
  var selectedYear = null;

  async function initForest() {
    var canvas = document.getElementById('forest-canvas');
    if (!canvas) return;

    var SceneModule = await import('./webgl/scene.js');
    var TreeModule = await import('./webgl/tree.js');

    forestScene = new SceneModule.ForestScene(canvas);
    window.forestScene = forestScene;
    window.TreeClass = TreeModule.Tree;

    refreshForest();
    updateEmptyHint();
  }

  function refreshForest() {
    if (!forestScene) return;
    var entries = loadEntries();
    var currentYear = new Date().getFullYear();
    var years = [];
    for (var i = 0; i < YEARS_TO_SHOW; i++) {
      years.push(currentYear - i);
    }

    forestScene.removeAllTrees();

    years.forEach(function(year) {
      var yearEntries = entries[year] || [];
      var lastDate = yearEntries.length > 0
        ? yearEntries[yearEntries.length - 1].date
        : year + '-01-01T00:00:00';

      var tree = forestScene.addTree(window.TreeClass, year, yearEntries.length, {
        lastEntryDate: lastDate,
      });

      if (year === currentYear) {
        window.currentYearTree = tree;
      }
    });

    updateSidebar(entries, years);
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

    years.forEach(function(year) {
      var yearEntries = entries[year] || [];
      var count = yearEntries.length;
      var li = document.createElement('li');
      li.className = 'year-item' + (selectedYear === year ? ' active' : '');
      var entryWord = count === 1 ? t('entry') : t('entries');
      li.innerHTML = '<span class="year-num">' + year + '</span>' +
        '<span class="year-count">' + count + ' ' + entryWord + '</span>';
      li.addEventListener('click', function() {
        selectedYear = year;
        updateSidebar(loadEntries(), years);
        showYearDetail(year);
      });
      list.appendChild(li);
    });
  }

  // ── Year Detail Panel ──────────────────────────────────────────────────────

  function showYearDetail(year) {
    var panel = document.getElementById('year-panel');
    var title = document.getElementById('panel-title');
    var list = document.getElementById('panel-entries');
    var entries = getYearEntries(year);

    title.textContent = year;
    list.innerHTML = '';

    if (entries.length === 0) {
      var empty = document.createElement('li');
      empty.className = 'empty-note';
      empty.textContent = t('noEntries');
      list.appendChild(empty);
    } else {
      entries.slice().reverse().forEach(function(entry) {
        var li = document.createElement('li');
        var date = new Date(entry.date);
        var dateStr = date.toLocaleDateString(currentLang === 'zh' ? 'zh-CN' : 'en-US', {
          month: 'short', day: 'numeric',
        });
        li.innerHTML = '<span class="entry-date">' + dateStr + '</span>' +
          '<span class="entry-text">' + escapeHtml(entry.text) + '</span>';
        list.appendChild(li);
      });
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

  // ── Init ───────────────────────────────────────────────────────────────────

  function bindEvents() {
    currentLang = detectLang();

    var langBtn = document.getElementById('lang-toggle');
    if (langBtn) langBtn.addEventListener('click', toggleLang);

    var guideNext = document.getElementById('guide-next');
    if (guideNext) guideNext.addEventListener('click', nextGuideStep);

    var guideSkip = document.getElementById('guide-skip');
    if (guideSkip) guideSkip.addEventListener('click', closeGuide);

    var guideOverlay = document.getElementById('guide-overlay');
    if (guideOverlay) {
      guideOverlay.addEventListener('click', function(e) {
        if (e.target === guideOverlay) closeGuide();
      });
    }

    // Modal
    var overlay = document.getElementById('modal-overlay');
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeModal();
    });

    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('entry-submit').addEventListener('click', function() {
      var year = Number(document.getElementById('modal-year').textContent);
      submitEntry(year);
    });

    var textarea = document.getElementById('entry-text');
    textarea.addEventListener('input', function() {
      document.getElementById('char-count').textContent = textarea.value.length;
    });
    textarea.addEventListener('keydown', function(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        var year = Number(document.getElementById('modal-year').textContent);
        submitEntry(year);
      }
      if (e.key === 'Escape') closeModal();
    });

    // FAB — always uses current year
    document.getElementById('fab-new').addEventListener('click', function() {
      openModal(new Date().getFullYear());
    });

    // Year panel close
    document.getElementById('panel-close').addEventListener('click', closeYearPanel);

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closeModal();
        closeYearPanel();
        closeGuide();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        openModal(new Date().getFullYear());
      }
    });
  }

  window.addEventListener('DOMContentLoaded', function() {
    bindEvents();
    applyLang();
    initForest();
    setTimeout(showGuide, 800);
  });

  window.showYearDetail = showYearDetail;
})();
