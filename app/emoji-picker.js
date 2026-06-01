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
    // 用 closest 兼容 label 内子元素点击
    if (!_picker.contains(e.target) && !e.target.closest('#btn-emoji')) {
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
