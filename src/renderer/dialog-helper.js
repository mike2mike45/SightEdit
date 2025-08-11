import { addDialogStyles, createDialog } from './dialog-core.js';
// カスタムダイアログの実装
export function createDialog() {
  // ダイアログのHTML
  const dialogHTML = `
    <div id="custom-dialog" class="dialog-overlay" style="display: none;">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3 id="dialog-title">タイトル</h3>
          <button class="dialog-close">&times;</button>
        </div>
        <div class="dialog-body">
          <label id="dialog-label" for="dialog-input">ラベル</label>
          <input type="text" id="dialog-input" class="dialog-input" />
          <div id="file-select-area" style="display: none;">
            <button id="file-select-btn" class="file-select-btn">ファイルを選択</button>
            <input type="file" id="file-input" style="display: none;" accept="image/*" />
          </div>
        </div>
        <div class="dialog-footer">
          <button class="dialog-cancel">キャンセル</button>
          <button class="dialog-ok">OK</button>
        </div>
      </div>
    </div>
  `;

  // ダイアログをbodyに追加
  const dialogDiv = document.createElement('div');
  dialogDiv.innerHTML = dialogHTML;
  document.body.appendChild(dialogDiv.firstElementChild);

  const dialog = document.getElementById('custom-dialog');
  const dialogTitle = document.getElementById('dialog-title');
  const dialogLabel = document.getElementById('dialog-label');
  const dialogInput = document.getElementById('dialog-input');
  const fileSelectArea = document.getElementById('file-select-area');
  const fileSelectBtn = document.getElementById('file-select-btn');
  const fileInput = document.getElementById('file-input');
  const closeBtn = dialog.querySelector('.dialog-close');
  const cancelBtn = dialog.querySelector('.dialog-cancel');
  const okBtn = dialog.querySelector('.dialog-ok');

  let resolvePromise = null;
  let isImageDialog = false;

  // ダイアログを表示
  function show(title, label, defaultValue = '', options = {}) {
    dialogTitle.textContent = title;
    dialogLabel.textContent = label;
    dialogInput.value = defaultValue;
    dialog.style.display = 'flex';
    
    // 画像ダイアログの場合
    isImageDialog = options.isImageDialog || false;
    if (isImageDialog) {
      fileSelectArea.style.display = 'block';
    } else {
      fileSelectArea.style.display = 'none';
    }
    
    dialogInput.focus();
    dialogInput.select();

    return new Promise((resolve) => {
      resolvePromise = resolve;
    });
  }

  // ダイアログを閉じる
  function close(value = null) {
    dialog.style.display = 'none';
    if (resolvePromise) {
      resolvePromise(value);
      resolvePromise = null;
    }
  }

  // ファイル選択ボタンのイベント
  fileSelectBtn.addEventListener('click', () => {
    fileInput.click();
  });

  // ファイル選択時の処理
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      // ファイルをBase64に変換
      const reader = new FileReader();
      reader.onload = (e) => {
        dialogInput.value = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  // 右クリックメニューの設定
  dialogInput.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showInputContextMenu(e, dialogInput);
  });

  // イベントリスナー
  closeBtn.addEventListener('click', () => close(null));
  cancelBtn.addEventListener('click', () => close(null));
  okBtn.addEventListener('click', () => close(dialogInput.value));

  // Enterキーでも確定
  dialogInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      close(dialogInput.value);
    } else if (e.key === 'Escape') {
      close(null);
    }
  });

  // 背景クリックで閉じる
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      close(null);
    }
  });

  return { show };
}

// 入力フィールド用のコンテキストメニュー
function showInputContextMenu(e, inputElement) {
  // 既存のメニューを削除
  const existingMenu = document.querySelector('.input-context-menu');
  if (existingMenu) {
    existingMenu.remove();
  }

  const contextMenu = document.createElement('div');
  contextMenu.className = 'context-menu input-context-menu visible';
  contextMenu.style.left = e.pageX + 'px';
  contextMenu.style.top = e.pageY + 'px';

  const hasSelection = inputElement.selectionStart !== inputElement.selectionEnd;
  
  const menuItems = [
    { label: 'コピー', action: 'copy', enabled: hasSelection },
    { label: '切り取り', action: 'cut', enabled: hasSelection },
    { label: '貼り付け', action: 'paste', enabled: true },
    { type: 'separator' },
    { label: 'すべて選択', action: 'selectAll', enabled: true }
  ];

  menuItems.forEach(item => {
    if (item.type === 'separator') {
      const separator = document.createElement('div');
      separator.className = 'context-menu-separator';
      contextMenu.appendChild(separator);
    } else {
      const menuItem = document.createElement('div');
      menuItem.className = 'context-menu-item';
      if (!item.enabled) {
        menuItem.classList.add('disabled');
      }
      menuItem.textContent = item.label;
      
      if (item.enabled) {
        menuItem.addEventListener('click', async () => {
          contextMenu.remove();
          await handleInputMenuAction(item.action, inputElement);
        });
      }
      
      contextMenu.appendChild(menuItem);
    }
  });

  document.body.appendChild(contextMenu);

  // クリック外で閉じる
  setTimeout(() => {
    document.addEventListener('click', function closeMenu() {
      contextMenu.remove();
      document.removeEventListener('click', closeMenu);
    });
  }, 0);
}

// 入力フィールドのメニューアクション処理
async function handleInputMenuAction(action, inputElement) {
  switch (action) {
    case 'copy':
      const selectedText = inputElement.value.substring(
        inputElement.selectionStart,
        inputElement.selectionEnd
      );
      if (selectedText) {
        try {
          await navigator.clipboard.writeText(selectedText);
        } catch {
          inputElement.focus();
          document.execCommand('copy');
        }
      }
      break;
      
    case 'cut':
      const textToCut = inputElement.value.substring(
        inputElement.selectionStart,
        inputElement.selectionEnd
      );
      if (textToCut) {
        try {
          await navigator.clipboard.writeText(textToCut);
          const start = inputElement.selectionStart;
          const end = inputElement.selectionEnd;
          const value = inputElement.value;
          inputElement.value = value.substring(0, start) + value.substring(end);
          inputElement.setSelectionRange(start, start);
        } catch {
          inputElement.focus();
          document.execCommand('cut');
        }
      }
      break;
      
    case 'paste':
      try {
        // まずHTML形式を試す
        const clipboardItems = await navigator.clipboard.read();
        let pasteSuccessful = false;
        
        for (const clipboardItem of clipboardItems) {
          for (const type of clipboardItem.types) {
            if (type === 'text/html') {
              const blob = await clipboardItem.getType(type);
              const html = await blob.text();
              
              // HTMLからプレーンテキストを抽出
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = html;
              const text = tempDiv.textContent || tempDiv.innerText || '';
              
              const start = inputElement.selectionStart;
              const end = inputElement.selectionEnd;
              const value = inputElement.value;
              inputElement.value = value.substring(0, start) + text + value.substring(end);
              inputElement.setSelectionRange(start + text.length, start + text.length);
              pasteSuccessful = true;
              break;
            }
          }
          if (pasteSuccessful) break;
        }
        
        // HTML形式がない場合はプレーンテキスト
        if (!pasteSuccessful) {
          const text = await navigator.clipboard.readText();
          const start = inputElement.selectionStart;
          const end = inputElement.selectionEnd;
          const value = inputElement.value;
          inputElement.value = value.substring(0, start) + text + value.substring(end);
          inputElement.setSelectionRange(start + text.length, start + text.length);
        }
      } catch {
        document.execCommand('paste');
      }
      break;
      
    case 'selectAll':
      inputElement.select();
      break;
  }
}

// 目次生成ダイアログを作成
export function createTOCDialog() {
  // ダイアログのHTML
  const dialogHTML = `
    <div id="toc-dialog" class="dialog-overlay" style="display: none;">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>目次の形式を選択</h3>
          <button class="dialog-close">&times;</button>
        </div>
        <div class="dialog-body">
          <div class="toc-dialog-content">
            <p>生成する目次の形式を選択してください：</p>
            <div class="toc-options">
              <label class="toc-radio-option">
                <input type="radio" name="toc-type" value="linked" checked>
                <div class="toc-option-content">
                  <strong>リンク付き目次</strong>
                  <div class="toc-option-description">
                    見出しへのジャンプリンク付き<br>
                    <small>GitHub、GitLab、SightEdit等で動作</small>
                  </div>
                  <div class="toc-example">
                    例: <code>- [見出し1](#見出し1)</code>
                  </div>
                </div>
              </label>
              <label class="toc-radio-option">
                <input type="radio" name="toc-type" value="simple">
                <div class="toc-option-content">
                  <strong>シンプル目次</strong>
                  <div class="toc-option-description">
                    テキストのみ、リンクなし<br>
                    <small>すべてのMarkdown環境で動作</small>
                  </div>
                  <div class="toc-example">
                    例: <code>- 見出し1</code>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="dialog-cancel">キャンセル</button>
          <button class="dialog-ok">目次を生成</button>
        </div>
      </div>
    </div>
  `;

  const dialogDiv = document.createElement('div');
  dialogDiv.innerHTML = dialogHTML;
  document.body.appendChild(dialogDiv.firstElementChild);

  const dialog = document.getElementById('toc-dialog');
  const closeBtn = dialog.querySelector('.dialog-close');
  const cancelBtn = dialog.querySelector('.dialog-cancel');
  const okBtn = dialog.querySelector('.dialog-ok');

  let resolvePromise = null;

  // ダイアログを表示
  function show() {
    dialog.style.display = 'flex';
    
    // デフォルト選択を復元
    const linkedRadio = dialog.querySelector('input[value="linked"]');
    if (linkedRadio) {
      linkedRadio.checked = true;
    }

    return new Promise((resolve) => {
      resolvePromise = resolve;
    });
  }

  // ダイアログを閉じる
  function close(result = null) {
    dialog.style.display = 'none';
    if (resolvePromise) {
      resolvePromise(result);
      resolvePromise = null;
    }
  }

  // イベントリスナー
  closeBtn.addEventListener('click', () => close(null));
  cancelBtn.addEventListener('click', () => close(null));
  okBtn.addEventListener('click', () => {
    const selectedType = dialog.querySelector('input[name="toc-type"]:checked')?.value;
    close(selectedType);
  });

  // 背景クリックで閉じる
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      close(null);
    }
  });

  return { show };
}

// ダイアログのスタイルを追加
export function addDialogStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    }

    .dialog-content {
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      width: 400px;
      max-width: 90%;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #e0e0e0;
    }

    .dialog-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }

    .dialog-close {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
    }

    .dialog-close:hover {
      background: #f0f0f0;
    }

    .dialog-body {
      padding: 20px;
    }

    .dialog-body label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: #333;
    }

    .dialog-input {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      outline: none;
    }

    .dialog-input:focus {
      border-color: #007bff;
      box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
    }

    .file-select-btn {
      margin-top: 12px;
      padding: 8px 16px;
      background: #f8f9fa;
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      color: #333;
      width: 100%;
    }

    .file-select-btn:hover {
      background: #e9ecef;
    }

    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 16px 20px;
      border-top: 1px solid #e0e0e0;
    }

    .dialog-footer button {
      padding: 8px 16px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      background: white;
      color: #333;
    }

    .dialog-footer button:hover {
      background: #f8f8f8;
    }

    .dialog-ok {
      background: #007bff !important;
      color: white !important;
      border-color: #007bff !important;
    }

    .dialog-ok:hover {
      background: #0056b3 !important;
    }

    /* 目次ダイアログのスタイル */
    #toc-dialog .dialog-content {
      width: 500px;
      max-width: 95%;
    }

    .toc-dialog-content {
      font-size: 14px;
      line-height: 1.5;
    }

    .toc-dialog-content p {
      margin: 0 0 16px 0;
      color: #333;
    }

    .toc-options {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .toc-radio-option {
      display: flex;
      align-items: flex-start;
      padding: 12px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .toc-radio-option:hover {
      border-color: #007bff;
      background: #f8f9fa;
    }

    .toc-radio-option input[type="radio"] {
      margin: 3px 12px 0 0;
      cursor: pointer;
    }

    .toc-radio-option input[type="radio"]:checked + .toc-option-content {
      color: #007bff;
    }

    .toc-radio-option:has(input[type="radio"]:checked) {
      border-color: #007bff;
      background: #f0f8ff;
    }

    .toc-option-content {
      flex: 1;
    }

    .toc-option-content strong {
      display: block;
      font-size: 15px;
      margin-bottom: 4px;
    }

    .toc-option-description {
      font-size: 13px;
      color: #6c757d;
      margin-bottom: 8px;
      line-height: 1.4;
    }

    .toc-option-description small {
      color: #28a745;
      font-weight: 500;
    }

    .toc-example {
      font-size: 12px;
      color: #6c757d;
      background: #f8f9fa;
      padding: 6px 8px;
      border-radius: 4px;
      border-left: 3px solid #e9ecef;
    }

    .toc-example code {
      background: transparent;
      color: #495057;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 11px;
    }

    /* ダークテーマ対応 */
    .dark-theme .dialog-content {
      background: #2d2d2d;
      color: #fff;
    }

    .dark-theme .dialog-header {
      border-bottom-color: #404040;
    }

    .dark-theme .dialog-close {
      color: #ccc;
    }

    .dark-theme .dialog-close:hover {
      background: #404040;
    }

    .dark-theme .dialog-body label {
      color: #fff;
    }

    .dark-theme .dialog-input {
      background: #1a1a1a;
      border-color: #404040;
      color: #fff;
    }

    .dark-theme .dialog-input:focus {
      border-color: #007bff;
    }

    .dark-theme .file-select-btn {
      background: #404040;
      border-color: #555;
      color: #fff;
    }

    .dark-theme .file-select-btn:hover {
      background: #555;
    }

    .dark-theme .dialog-footer {
      border-top-color: #404040;
    }

    .dark-theme .dialog-footer button {
      background: #404040;
      border-color: #555;
      color: #fff;
    }

    .dark-theme .dialog-footer button:hover {
      background: #555;
    }

    .dark-theme .toc-dialog-content p {
      color: #fff;
    }

    .dark-theme .toc-radio-option {
      border-color: #555;
      background: #3a3a3a;
    }

    .dark-theme .toc-radio-option:hover {
      border-color: #007bff;
      background: #404040;
    }

    .dark-theme .toc-radio-option:has(input[type="radio"]:checked) {
      border-color: #007bff;
      background: #1a2332;
    }

    .dark-theme .toc-radio-option input[type="radio"]:checked + .toc-option-content {
      color: #4db8ff;
    }

    .dark-theme .toc-option-content strong {
      color: #fff;
    }

    .dark-theme .toc-option-description {
      color: #ccc;
    }

    .dark-theme .toc-option-description small {
      color: #4ade80;
    }

    .dark-theme .toc-example {
      background: #1a1a1a;
      border-left-color: #555;
      color: #ccc;
    }

    .dark-theme .toc-example code {
      color: #fff;
    }
  `;
  document.head.appendChild(style);
    }
}