# Image & Emoji Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在每日记录 Modal 中支持上传本地图片（存 IndexedDB）和插入 Emoji，并在记录卡片中展示缩略图。

**Architecture:** 新增三个独立 JS 模块（`db.js` / `image-compressor.js` / `emoji-picker.js`），通过 ES module import 挂载到 `app.js`；图片存 IndexedDB，entry 只存图片 ID 数组；Emoji 直接插入 textarea 光标位置。

**Tech Stack:** 原生 JS ES Modules、IndexedDB API、Canvas API（图片压缩）、无外部依赖

---

## 文件清单

| 操作 | 路径 | 职责 |
|------|------|------|
| 新建 | `app/db.js` | IndexedDB 初始化（版本2）、图片存取删 |
| 新建 | `app/image-compressor.js` | Canvas 压缩图片到 ≤800px / ≤300KB |
| 新建 | `app/emoji-picker.js` | Emoji 浮层组件，插入光标 |
| 修改 | `app/app.js` | entry 结构扩展、modal 工具栏、缩略图渲染、全屏预览、deleteEntry |
| 修改 | `app/index.html` | modal 工具栏 HTML、图片预览区、全屏预览 overlay、引入新 JS |
| 修改 | `app/style.css` | 工具栏、缩略图行、emoji 浮层、全屏预览样式 |

---

## Task 1: IndexedDB 模块（db.js）

**Files:**
- Create: `app/db.js`

- [ ] **Step 1: 创建 db.js**

```js
// app/db.js
const DB_NAME    = 'daily-tree-db';
const DB_VERSION = 2;
const STORE_NAME = 'images';

let _db = null;

export function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = e => { _db = e.target.result; resolve(_db); };
    req.onerror   = e => reject(e.target.error);
  });
}

export async function saveImage(id, blob) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ id, blob, createdAt: new Date().toISOString() });
    tx.oncomplete = resolve;
    tx.onerror    = e => reject(e.target.error);
  });
}

export async function getImage(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, 'readonly')
      .objectStore(STORE_NAME).get(id);
    req.onsuccess = e => resolve(e.target.result?.blob || null);
    req.onerror   = e => reject(e.target.error);
  });
}

export async function deleteImage(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = resolve;
    tx.onerror    = e => reject(e.target.error);
  });
}

export async function getDBSizeEstimate() {
  if (!navigator.storage?.estimate) return 0;
  const { usage } = await navigator.storage.estimate();
  return usage || 0;
}
```

- [ ] **Step 2: 浏览器手动验证**

在 `app/index.html` 末尾临时加一行：
```html
<script type="module">
  import { openDB, saveImage, getImage, deleteImage } from './db.js';
  window._db = { openDB, saveImage, getImage, deleteImage };
</script>
```
打开 `http://localhost:PORT/app/`，在 DevTools Console 中运行：
```js
const blob = new Blob(['test'], { type: 'image/png' });
await _db.saveImage('test-id-1', blob);
const result = await _db.getImage('test-id-1');
console.log(result); // 应输出 Blob
await _db.deleteImage('test-id-1');
console.log(await _db.getImage('test-id-1')); // 应输出 null
```
验证通过后删除临时 script 标签。

- [ ] **Step 3: Commit**

```bash
cd ~/DailyTree
git add app/db.js
git commit -m "feat: add IndexedDB module for image storage"
```

---

## Task 2: 图片压缩模块（image-compressor.js）

**Files:**
- Create: `app/image-compressor.js`

- [ ] **Step 1: 创建 image-compressor.js**

```js
// app/image-compressor.js
const MAX_SIZE   = 800;   // px，最长边
const MAX_BYTES  = 300 * 1024; // 300KB
const QUALITY_HI = 0.8;
const QUALITY_LO = 0.6;

/**
 * 压缩图片文件，返回压缩后的 Blob
 * GIF 文件直接返回原始 Blob，不压缩
 */
export function compressImage(file) {
  if (file.type === 'image/gif') return Promise.resolve(file);

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      // 缩放到最长边 ≤ MAX_SIZE
      if (width > MAX_SIZE || height > MAX_SIZE) {
        if (width >= height) { height = Math.round(height * MAX_SIZE / width); width = MAX_SIZE; }
        else                 { width  = Math.round(width  * MAX_SIZE / height); height = MAX_SIZE; }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      // 先用高质量，超出再降
      canvas.toBlob(blob => {
        if (blob && blob.size <= MAX_BYTES) { resolve(blob); return; }
        canvas.toBlob(blob2 => resolve(blob2 || file), 'image/jpeg', QUALITY_LO);
      }, 'image/jpeg', QUALITY_HI);
    };
    img.onerror = reject;
    img.src = url;
  });
}
```

- [ ] **Step 2: 浏览器手动验证**

临时加 script：
```html
<script type="module">
  import { compressImage } from './image-compressor.js';
  window._compress = compressImage;
</script>
```
在 DevTools Console 中：
1. 拖一张 >1MB 的图片到页面，`File` 对象赋给 `f`
2. `const b = await _compress(f); console.log(b.size)` — 应 ≤ 307200
3. 拖一个 GIF，`const b = await _compress(gifFile); console.log(b === gifFile)` — 应输出 `true`

验证通过后删除临时 script。

- [ ] **Step 3: Commit**

```bash
git add app/image-compressor.js
git commit -m "feat: add canvas image compressor module"
```

---

## Task 3: Emoji Picker 模块（emoji-picker.js）

**Files:**
- Create: `app/emoji-picker.js`

- [ ] **Step 1: 创建 emoji-picker.js**

```js
// app/emoji-picker.js
const EMOJI_LIST = [
  // 常用
  '😊','😂','🥹','😭','😍','🥰','😎','🤔','😤','🥲',
  // 自然
  '🌱','🌿','🌲','🍃','🌸','🌻','🍂','❄️','🌈','⭐',
  // 活动
  '🎉','🎶','📚','✏️','💪','🏃','🍜','☕','🛌','🎮',
];

let _picker = null;
let _activeTextarea = null;

export function initEmojiPicker() {
  _picker = document.createElement('div');
  _picker.id = 'emoji-picker';
  _picker.className = 'emoji-picker hidden';
  _picker.innerHTML = EMOJI_LIST.map(e =>
    `<button class="emoji-btn" data-emoji="${e}" type="button">${e}</button>`
  ).join('');

  _picker.addEventListener('click', e => {
    const btn = e.target.closest('.emoji-btn');
    if (!btn || !_activeTextarea) return;
    insertAtCursor(_activeTextarea, btn.dataset.emoji);
    // 触发 input 事件更新字数
    _activeTextarea.dispatchEvent(new Event('input'));
  });

  // 点击外部关闭
  document.addEventListener('click', e => {
    if (!_picker.contains(e.target) && e.target.id !== 'btn-emoji') {
      _picker.classList.add('hidden');
    }
  });

  document.body.appendChild(_picker);
}

export function toggleEmojiPicker(textarea, anchorEl) {
  _activeTextarea = textarea;
  if (_picker.classList.contains('hidden')) {
    const rect = anchorEl.getBoundingClientRect();
    _picker.style.left   = rect.left + 'px';
    _picker.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
    _picker.classList.remove('hidden');
  } else {
    _picker.classList.add('hidden');
  }
}

function insertAtCursor(el, text) {
  const start = el.selectionStart;
  const end   = el.selectionEnd;
  const val   = el.value;
  el.value = val.slice(0, start) + text + val.slice(end);
  el.selectionStart = el.selectionEnd = start + text.length;
  el.focus();
}
```

- [ ] **Step 2: 浏览器手动验证**

临时加 script：
```html
<script type="module">
  import { initEmojiPicker, toggleEmojiPicker } from './emoji-picker.js';
  initEmojiPicker();
  window._toggleEmoji = (ta, anchor) => toggleEmojiPicker(ta, anchor);
</script>
```
在 DevTools Console 中：
```js
const ta = document.getElementById('entry-text');
const anchor = document.getElementById('entry-submit'); // 随便一个锚点
_toggleEmoji(ta, anchor); // 应出现 emoji 浮层
```
点击 emoji 应插入到 textarea。删除临时 script。

- [ ] **Step 3: Commit**

```bash
git add app/emoji-picker.js
git commit -m "feat: add emoji picker module"
```

---

## Task 4: HTML 结构改造

**Files:**
- Modify: `app/index.html`

- [ ] **Step 1: 改造 modal-card，加工具栏 + 图片预览区**

找到 `index.html` 中的 modal-card 部分（第 106–123 行），替换为：

```html
<!-- ── Entry Modal ── -->
<div class="modal-overlay" id="modal-overlay" role="dialog" aria-modal="true">
  <div class="modal-card">
    <div class="modal-header">
      <span class="modal-label" id="modal-label">今天最重要的一件事？</span>
      <button class="modal-close" id="modal-close" aria-label="关闭">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <textarea class="modal-textarea" id="entry-text"
      placeholder="一个瞬间，一个想法，一件值得记住的事……"
      maxlength="500"></textarea>

    <!-- 图片预览区 -->
    <div class="modal-images" id="modal-images"></div>

    <!-- 工具栏 -->
    <div class="modal-toolbar" id="modal-toolbar">
      <button class="toolbar-btn" id="btn-emoji" type="button" aria-label="插入表情">😊</button>
      <label class="toolbar-btn" id="btn-image" aria-label="添加图片">
        📷
        <input type="file" id="image-file-input" accept="image/*" multiple style="display:none">
      </label>
      <div class="modal-footer">
        <span class="char-count"><span id="char-count">0</span> / 500</span>
        <button class="modal-submit" id="entry-submit">保存</button>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 2: 在 </body> 前加全屏图片预览 overlay**

在 `<script type="module" src="app.js"></script>` 之前插入：

```html
<!-- 全屏图片预览 -->
<div class="img-preview-overlay hidden" id="img-preview-overlay">
  <img class="img-preview-full" id="img-preview-full" alt="图片预览">
  <button class="img-preview-close" id="img-preview-close" aria-label="关闭">✕</button>
</div>
```

- [ ] **Step 3: 浏览器验证结构**

打开 `http://localhost:PORT/app/`，点击 + 按钮，应看到 Modal 底部有 😊 和 📷 两个按钮，以及字数和保存按钮排在同一行工具栏。

- [ ] **Step 4: Commit**

```bash
git add app/index.html
git commit -m "feat: add modal toolbar and image preview area to HTML"
```

---

## Task 5: CSS 样式

**Files:**
- Modify: `app/style.css`

- [ ] **Step 1: 在 style.css 末尾追加样式**

```css
/* ── Modal Toolbar ─────────────────────────────────────── */
.modal-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px 10px;
}
.toolbar-btn {
  background: rgba(255,255,255,0.06);
  border: none;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 16px;
  cursor: pointer;
  color: inherit;
  line-height: 1;
  flex-shrink: 0;
}
.toolbar-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.modal-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

/* ── Modal Image Previews ──────────────────────────────── */
.modal-images {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 12px 4px;
  min-height: 0;
}
.modal-images:empty { display: none; }
.modal-img-thumb {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}
.modal-img-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.modal-img-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 16px;
  height: 16px;
  background: rgba(0,0,0,0.65);
  border: none;
  border-radius: 50%;
  color: #fff;
  font-size: 9px;
  line-height: 16px;
  text-align: center;
  cursor: pointer;
  padding: 0;
}

/* ── Emoji Picker ──────────────────────────────────────── */
.emoji-picker {
  position: fixed;
  z-index: 9999;
  background: #1a2e1a;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 12px;
  padding: 8px;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  max-width: 224px;
}
.emoji-picker.hidden { display: none; }
.emoji-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  border-radius: 6px;
  padding: 4px;
  line-height: 1;
  transition: background 0.12s;
}
.emoji-btn:hover { background: rgba(255,255,255,0.1); }

/* ── Entry Thumbnails (branch panel & cards) ───────────── */
.entry-thumbs {
  display: flex;
  gap: 5px;
  margin-top: 6px;
  flex-wrap: wrap;
}
.entry-thumb {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  object-fit: cover;
  cursor: pointer;
  flex-shrink: 0;
}
.entry-thumb-more {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  background: rgba(255,255,255,0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: rgba(255,255,255,0.5);
  flex-shrink: 0;
}

/* ── Full-screen Image Preview ─────────────────────────── */
.img-preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0,0,0,0.92);
  display: flex;
  align-items: center;
  justify-content: center;
}
.img-preview-overlay.hidden { display: none; }
.img-preview-full {
  max-width: 92vw;
  max-height: 88vh;
  border-radius: 8px;
  object-fit: contain;
}
.img-preview-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(255,255,255,0.15);
  border: none;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  font-size: 16px;
  color: #fff;
  cursor: pointer;
}
```

- [ ] **Step 2: 浏览器验证样式**

打开 Modal，工具栏应显示在底部，😊 📷 按钮左对齐，字数/保存右对齐。

- [ ] **Step 3: Commit**

```bash
git add app/style.css
git commit -m "feat: add image, emoji picker, and thumbnail CSS styles"
```

---

## Task 6: app.js 集成——工具栏 + 图片上传

**Files:**
- Modify: `app/app.js`

- [ ] **Step 1: 顶部引入新模块**

在 `app/app.js` 第 1 行后添加：

```js
import { saveImage, getImage, deleteImage, getDBSizeEstimate } from './db.js';
import { compressImage } from './image-compressor.js';
import { initEmojiPicker, toggleEmojiPicker } from './emoji-picker.js';
```

- [ ] **Step 2: 添加 modal 图片状态变量**

在 `let _editEntry = null;`（第 449 行）后追加：

```js
let _modalImages = []; // { id: string, objectUrl: string }[]
```

- [ ] **Step 3: 修改 addEntryWithDate，支持 images 字段**

将第 36–43 行替换为：

```js
function addEntryWithDate(dateStr, text, imageIds = []) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const entries = loadEntries();
  if (!entries[year]) entries[year] = [];
  const d = new Date(year, month - 1, day, 12, 0, 0);
  entries[year].push({ id: Date.now(), text: text.slice(0, 500), date: d.toISOString(), images: imageIds });
  saveEntries(entries);
}
```

- [ ] **Step 4: 修改 updateEntry，支持 images 字段**

将第 44–50 行替换为：

```js
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
```

- [ ] **Step 5: 新增 clearModalImages 函数**

在 `closeModal` 函数（第 474 行）之前插入：

```js
function clearModalImages() {
  _modalImages.forEach(m => URL.revokeObjectURL(m.objectUrl));
  _modalImages = [];
  const container = document.getElementById('modal-images');
  if (container) container.innerHTML = '';
}
```

- [ ] **Step 6: 修改 openModal，加载已有图片**

将 `openModal` 函数（第 451–472 行）替换为：

```js
function openModal(entryToEdit, readOnly) {
  _editEntry = (!readOnly && entryToEdit) ? entryToEdit : null;
  const overlay  = document.getElementById('modal-overlay');
  const textarea = document.getElementById('entry-text');
  const label    = document.getElementById('modal-label');
  const submit   = document.getElementById('entry-submit');
  const toolbar  = document.getElementById('modal-toolbar');

  clearModalImages();

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
  if (entryToEdit?.images?.length) {
    entryToEdit.images.forEach(imgId => {
      getImage(imgId).then(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        _modalImages.push({ id: imgId, objectUrl: url });
        appendThumbToModal(imgId, url);
      });
    });
  }

  overlay?.classList.add('active');
  if (!readOnly) setTimeout(() => textarea?.focus(), 150);
}
```

- [ ] **Step 7: 修改 closeModal，清理图片**

将 `closeModal` 函数（第 474–481 行）替换为：

```js
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
```

- [ ] **Step 8: 新增 appendThumbToModal 函数**

在 `clearModalImages` 之后插入：

```js
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
```

- [ ] **Step 9: 修改 submitEntry，保存图片 ID**

将 `submitEntry` 函数（第 508–529 行）替换为：

```js
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
```

- [ ] **Step 10: 在 bindEvents 中绑定图片上传事件**

在 `bindEvents` 函数内，`document.getElementById('entry-text')?.addEventListener('input', updateCharCount);` 这行之后插入：

```js
  document.getElementById('image-file-input')?.addEventListener('change', async e => {
    const files = Array.from(e.target.files || []);
    e.target.value = ''; // 允许重复选同一文件
    const remaining = 3 - _modalImages.length;
    const toProcess = files.slice(0, remaining);
    for (const file of toProcess) {
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
    }
  });
```

- [ ] **Step 11: 在 bindEvents 中绑定 Emoji 按钮**

在上一步代码之后插入：

```js
  document.getElementById('btn-emoji')?.addEventListener('click', e => {
    e.stopPropagation();
    const ta     = document.getElementById('entry-text');
    const anchor = document.getElementById('btn-emoji');
    toggleEmojiPicker(ta, anchor);
  });
```

- [ ] **Step 12: 在 DOMContentLoaded 中初始化 Emoji Picker**

将：
```js
window.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  initApp();
  setTimeout(showGuide, 600);
});
```
改为：
```js
window.addEventListener('DOMContentLoaded', () => {
  initEmojiPicker();
  bindEvents();
  initApp();
  setTimeout(showGuide, 600);
});
```

- [ ] **Step 13: 浏览器验证——图片上传**

1. 打开 App，点击 + 打开 Modal
2. 点击 📷，选一张本地图片 → 应出现 56×56 缩略图
3. 再选两张 → 最多 3 张，📷 按钮应变灰
4. 点击缩略图上的 ✕ → 缩略图消失，📷 按钮恢复
5. 写文字，点保存 → 无报错

- [ ] **Step 14: 浏览器验证——Emoji**

1. 打开 Modal，点击 😊 按钮 → Emoji 面板出现
2. 点击任意 Emoji → 插入到 textarea 光标位置，字数更新
3. 点击面板外 → 面板关闭

- [ ] **Step 15: Commit**

```bash
git add app/app.js
git commit -m "feat: integrate image upload and emoji picker into modal"
```

---

## Task 7: 展示层——Branch Panel & 全屏预览

**Files:**
- Modify: `app/app.js`

- [ ] **Step 1: 新增 renderEntryThumbs 工具函数**

在 `escapeHtml` 函数（第 54 行）之后插入：

```js
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
    // 视图销毁时释放
    img.addEventListener('load', () => {});
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
```

- [ ] **Step 2: 新增 openImagePreview / closeImagePreview**

在 `renderEntryThumbs` 之后插入：

```js
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
```

- [ ] **Step 3: 修改 openBranchPanel，渲染缩略图**

找到 `openBranchPanel` 中 branch-entry 的 li 渲染部分（第 406–418 行），将：

```js
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
```

替换为：

```js
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
```

- [ ] **Step 4: 在 bindEvents 中绑定全屏预览关闭**

在 `bindEvents` 中 `document.getElementById('modal-close')` 那行之后插入：

```js
  document.getElementById('img-preview-close')?.addEventListener('click', closeImagePreview);
  document.getElementById('img-preview-overlay')?.addEventListener('click', e => {
    if (e.target.id === 'img-preview-overlay') closeImagePreview();
  });
```

同时在 keydown 全局事件（Escape 那行）里加上 `closeImagePreview()`：

```js
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closeBranchPanel(); closeSettings(); closeGuide(); closeStagePanel(); closeImagePreview(); }
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') { e.preventDefault(); openModal(getTodayEntry(), false); }
  });
```

- [ ] **Step 5: 浏览器完整验证**

1. 新增一条带图片的记录，保存
2. 点击树枝打开 Branch Panel → 应在文字下方看到缩略图
3. 点击缩略图 → 全屏预览打开
4. 点击 ✕ 或 Esc → 全屏预览关闭
5. 编辑已有带图片的记录 → Modal 打开时应预加载已有缩略图

- [ ] **Step 6: Commit**

```bash
git add app/app.js
git commit -m "feat: render image thumbnails in branch panel with fullscreen preview"
```

---

## Task 8: 收尾验证

- [ ] **Step 1: 检查旧记录兼容性**

打开 App，已有的旧记录（无 `images` 字段）不应报错，Branch Panel 正常显示无缩略图。

- [ ] **Step 2: 检查 readOnly 模式**

点击时间轴上过去某天的记录（有记录的日期），Modal 应以只读模式打开，工具栏不显示。

- [ ] **Step 3: 最终 Commit**

```bash
git add -A
git commit -m "feat: complete image & emoji support for daily entries"
```
