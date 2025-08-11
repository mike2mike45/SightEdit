/**
 * SightEdit Web AI Panel (No API keys).
 * - Opens AI web apps in the external browser (or window.open fallback)
 * - Copies the selected text before opening
 * - Watches clipboard for changes and offers to insert/copy the result
 *
 * Services: ChatGPT, Claude, Gemini, Perplexity, Mistral, Poe, Copilot
 * Chinese-origin services are intentionally excluded per requirement.
 */
(() => {
  const WIN = typeof window !== 'undefined' ? window : null;
  if (!WIN) return;

  // ---- configuration ----
  const STORAGE_KEY = 'sightedit.webTargets.v1';
  const DEFAULT_TARGETS = {
    chatgpt: 'https://chat.openai.com/',
    claude: 'https://claude.ai/',
    gemini: 'https://gemini.google.com/',
    mistral: 'https://chat.mistral.ai/',
    poe: 'https://poe.com/',
    copilot: 'https://copilot.microsoft.com/'
  };
  const ORDER = ['chatgpt','claude','gemini','mistral','poe','copilot'];
  const LABEL = {
    chatgpt: 'ChatGPT',
    claude: 'Claude',
    gemini: 'Gemini',
    mistral: 'Mistral',
    poe: 'Poe',
    copilot: 'Copilot',
  };

  function loadTargets() {
    try {
      const raw = WIN.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      const merged = { ...DEFAULT_TARGETS, ...(parsed || {}) };
      return merged;
    } catch {
      return { ...DEFAULT_TARGETS };
    }
  }
  function saveTargets(next) {
    const merged = { ...DEFAULT_TARGETS, ...(next || {}) };
    WIN.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  }

  // ---- styles ----
  const css = `
.webai-floating {
  position: fixed; right: 16px; bottom: 16px; z-index: 2147483000;
  background: rgba(30,30,30,.92); color: #fff; border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,.35);
  padding: 8px; font: 13px/1.4 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  backdrop-filter: blur(6px);
}
.webai-row { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.webai-btn {
  border: 0; border-radius: 10px; padding: 6px 10px; cursor: pointer;
  background: #2b2b2b; color:#fff;
}
.webai-btn:hover { background: #3a3a3a; }
.webai-gear {
  margin-left: 8px; width: 28px; height: 28px; border-radius: 8px; border:0; cursor:pointer;
  background:#374151; color:#fff;
}
.webai-hint { opacity:.75; font-size: 12px; margin-top:6px }
.webai-pop {
  position: fixed; right: 16px; bottom: 86px; z-index: 2147483001;
  min-width: 340px; max-width: 560px; background: #1f2937; color:#fff;
  border-radius: 12px; padding: 10px; box-shadow: 0 8px 24px rgba(0,0,0,.35);
}
.webai-pop textarea {
  width: 100%; min-height: 160px; background: #111827; color:#fff;
  border: 1px solid #374151; border-radius: 8px; padding: 8px;
}
.webai-actions { display:flex; gap:8px; justify-content:flex-end; margin-top:8px; }
.webai-actions button { border:0; border-radius:8px; padding:6px 10px; cursor:pointer; }
.webai-actions .primary { background:#2563eb; color:#fff; }
.webai-actions .ghost { background:#374151; color:#fff; }
.webai-modal {
  position: fixed; inset: 0; z-index: 2147483002; display:none; align-items:center; justify-content:center;
  background: rgba(0,0,0,.4);
}
.webai-modal .panel {
  background:#1f2937; color:#fff; border-radius:12px; padding:12px; width:min(720px, 96vw);
  box-shadow: 0 8px 24px rgba(0,0,0,.35);
}
.webai-grid { display:grid; grid-template-columns: 160px 1fr; gap:10px; align-items:center; }
.webai-grid input {
  width:100%; padding:6px 8px; border-radius:8px; border:1px solid #374151; background:#111827; color:#fff;
}
.webai-modal .hdr { font-weight:700; margin-bottom:8px; }
.webai-modal .row { margin: 8px 0; }
.webai-modal .foot { display:flex; gap:8px; justify-content:flex-end; margin-top:12px; }
.webai-badge {
  font-size:11px; opacity:.8; margin-left:6px; background:#374151; padding:2px 6px; border-radius:8px;
}
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // ---- DOM creation ----
  const box = document.createElement('div');
  box.className = 'webai-floating';
  box.innerHTML = `
    <div class="webai-row" data-row></div>
    <div class="webai-hint">選択→ボタン→Webで生成→結果コピーで自動検知 <span class="webai-badge">Web連携</span></div>
  `;
  document.body.appendChild(box);

  const modal = document.createElement('div');
  modal.className = 'webai-modal';
  modal.innerHTML = `
    <div class="panel">
      <div class="hdr">AI Web URL 設定</div>
      <div class="webai-grid" data-grid></div>
      <div class="foot">
        <button class="ghost" data-cancel>キャンセル</button>
        <button class="primary" data-save>保存</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  function openModal(targets) {
    const grid = modal.querySelector('[data-grid]');
    grid.innerHTML = '';
    ORDER.forEach(key => {
      const label = LABEL[key] || key;
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `
        <div>${label}</div>
        <div><input type="url" data-k="${key}" placeholder="${DEFAULT_TARGETS[key] || ''}" value="${targets[key] || ''}"/></div>
      `;
      grid.appendChild(row);
    });
    modal.style.display = 'flex';
  }
  function closeModal(){ modal.style.display = 'none'; }

  modal.addEventListener('click', (e)=>{ if (e.target === modal) closeModal(); });
  modal.querySelector('[data-cancel]').addEventListener('click', closeModal);
  modal.querySelector('[data-save]').addEventListener('click', ()=>{
    const inputs = Array.from(modal.querySelectorAll('input[data-k]'));
    const next = {};
    inputs.forEach(inp => { next[inp.dataset.k] = inp.value.trim() || DEFAULT_TARGETS[inp.dataset.k]; });
    saveTargets(next);
    // re-render buttons
    renderButtons();
    closeModal();
  });

  // ---- selection helpers ----
  function getSelectedText(){
    let t = '';
    try { t = WIN.getSelection?.().toString() || ''; } catch {}
    if (!t) {
      const el = document.activeElement;
      if (el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type === 'text'))) {
        t = el.value.substring(el.selectionStart || 0, el.selectionEnd || 0);
      }
    }
    return t;
  }
  async function copySelection(){
    const t = getSelectedText();
    if (!t) return false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(t);
      } else if (WIN.webAI?.writeClipboard) {
        await WIN.webAI.writeClipboard(t);
      }
      return true;
    } catch {
      if (WIN.webAI?.writeClipboard) {
        try { await WIN.webAI.writeClipboard(t); return true; } catch {}
      }
      return false;
    }
  }

  function insertTextAtCursor(text){
    // execCommand path
    try {
      if (document.execCommand) {
        const ok = document.execCommand('insertText', false, text);
        if (ok) return true;
      }
    } catch {}
    // textarea/input path
    const el = document.activeElement;
    if (el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type === 'text'))) {
      const start = el.selectionStart || 0, end = el.selectionEnd || 0;
      const before = el.value.slice(0, start), after = el.value.slice(end);
      el.value = before + text + after;
      const pos = start + text.length;
      el.selectionStart = el.selectionEnd = pos;
      el.dispatchEvent(new Event('input', { bubbles:true }));
      return true;
    }
    // contenteditable path
    const sel = window.getSelection && window.getSelection();
    if (sel && sel.rangeCount > 0) {
      sel.deleteFromDocument();
      sel.getRangeAt(0).insertNode(document.createTextNode(text));
      return true;
    }
    return false;
  }

  // ---- result popup ----
  function showResultPopup(text){
    if (!text) return;
    let pop = document.querySelector('.webai-pop');
    if (!pop) {
      pop = document.createElement('div');
      pop.className = 'webai-pop';
      pop.innerHTML = `
        <div style="margin-bottom:6px; font-weight:600;">AI結果を反映しますか？</div>
        <textarea></textarea>
        <div class="webai-actions">
          <button class="ghost" data-act="copy">コピーのみ</button>
          <button class="primary" data-act="insert">挿入</button>
        </div>`;
      document.body.appendChild(pop);
      pop.querySelector('[data-act="copy"]').addEventListener('click', async ()=>{
        const v = pop.querySelector('textarea').value;
        try { await navigator.clipboard.writeText(v); } catch { await WIN.webAI?.writeClipboard?.(v); }
        pop.remove();
      });
      pop.querySelector('[data-act="insert"]').addEventListener('click', ()=>{
        const v = pop.querySelector('textarea').value;
        insertTextAtCursor(v);
        pop.remove();
      });
    }
    pop.querySelector('textarea').value = text || '';
  }

  // ---- clipboard watch (renderer polling; no main IPC required) ----
  let watchTimer = null;
  let lastText = '';
  async function tickClipboard(){
    try {
      // prefer navigator.clipboard
      if (navigator.clipboard?.readText) {
        const t = await navigator.clipboard.readText();
        if (t && t !== lastText) {
          lastText = t;
          showResultPopup(t);
        }
      }
    } catch (e) {
      // ignore permission errors
    }
  }
  function startWatch(){
    if (watchTimer) return;
    lastText = '';
    watchTimer = setInterval(tickClipboard, 1200);
  }
  function stopWatch(){
    if (watchTimer) { clearInterval(watchTimer); watchTimer = null; }
  }

  // ---- open URL ----
  async function openExternal(url){
    if (!url) return;
    // try preload helper then fallback
    if (WIN.electronAPI?.openExternal) {
      try { WIN.electronAPI.openExternal(url); return; } catch {}
    }
    if (WIN.electronAPI?.openExternalLink) {
      try { WIN.electronAPI.openExternalLink(url); return; } catch {}
    }
    try { window.open(url, '_blank', 'noopener'); } catch {}
  }

  // ---- render panel ----
  const row = box.querySelector('[data-row]');
  function renderButtons(){
    row.innerHTML = '';
    const targets = loadTargets();
    ORDER.forEach(key => {
      const url = targets[key];
      if (!url) return;
      const btn = document.createElement('button');
      btn.className = 'webai-btn';
      btn.dataset.key = key;
      btn.textContent = LABEL[key] || key;
      btn.title = url;
      btn.addEventListener('click', async ()=>{
        await copySelection();
        await openExternal(url);
        startWatch();
      });
      row.appendChild(btn);
    });
    // gear
    const gear = document.createElement('button');
    gear.className = 'webai-gear';
    gear.setAttribute('aria-label','設定');
    gear.title = 'URL設定';
    gear.textContent = '⚙';
    gear.addEventListener('click', ()=> openModal(loadTargets()));
    row.appendChild(gear);
  }
  renderButtons();

  // expose small API
  WIN.WebAI = {
    getTargets: loadTargets,
    setTargets: saveTargets,
    startClipboardWatch: startWatch,
    stopClipboardWatch: stopWatch
  };
})();
