// 検索・置換ダイアログの実装
import { searchInEditor, highlightSearchResult, replaceText, replaceAll as replaceAllInEditor } from './editor.js';

export function createSearchReplaceDialog() {
  // ダイアログのHTML
  const dialogHTML = `
    <div id="search-replace-dialog" class="search-dialog" style="display: none;">
      <div class="search-header">
        <span>検索と置換</span>
        <button class="search-close">&times;</button>
      </div>
      <div class="search-body">
        <div class="search-row">
          <label>検索:</label>
          <input type="text" id="search-input" class="search-input" placeholder="検索する文字列">
          <button id="search-btn" class="search-btn" title="検索">🔍</button>
          <button id="search-prev" class="search-btn" title="前を検索">↑</button>
          <button id="search-next" class="search-btn" title="次を検索">↓</button>
        </div>
        <div class="search-row">
          <label>置換:</label>
          <input type="text" id="replace-input" class="search-input" placeholder="置換する文字列">
          <button id="replace-one" class="search-btn">置換</button>
          <button id="replace-all" class="search-btn">全て置換</button>
        </div>
        <div class="search-options">
          <label><input type="checkbox" id="search-case-sensitive"> 大文字小文字を区別</label>
          <label><input type="checkbox" id="search-whole-word"> 単語単位で検索</label>
          <label><input type="checkbox" id="search-regex"> 正規表現</label>
        </div>
        <div class="search-status">
          <span id="search-status-text"></span>
        </div>
      </div>
    </div>
  `;

  // ダイアログをbodyに追加
  const dialogDiv = document.createElement('div');
  dialogDiv.innerHTML = dialogHTML;
  document.body.appendChild(dialogDiv.firstElementChild);

  const dialog = document.getElementById('search-replace-dialog');
  const searchInput = document.getElementById('search-input');
  const replaceInput = document.getElementById('replace-input');
  const statusText = document.getElementById('search-status-text');
  
  let currentEditor = null;
  let isWysiwygMode = false;
  let currentMatch = -1;
  let matches = [];
  let isVisible = false;

  // 検索を実行
  function performSearch(direction = 'next') {
    if (!currentEditor) return;
    
    const searchText = searchInput.value;
    if (!searchText) {
      matches = [];
      currentMatch = -1;
      updateStatus();
      return;
    }

    const options = {
      caseSensitive: document.getElementById('search-case-sensitive').checked,
      wholeWord: document.getElementById('search-whole-word').checked,
      useRegex: document.getElementById('search-regex').checked
    };

    try {
      if (isWysiwygMode) {
        // WYSIWYGモードの検索
        matches = searchInEditor(currentEditor, searchText, options);
      } else {
        // ソースモードの検索
        const content = currentEditor.value;
        matches = [];
        
        let regex;
        if (options.useRegex) {
          regex = new RegExp(searchText, options.caseSensitive ? 'g' : 'gi');
        } else {
          let pattern = escapeRegExp(searchText);
          if (options.wholeWord) {
            pattern = `\\b${pattern}\\b`;
          }
          regex = new RegExp(pattern, options.caseSensitive ? 'g' : 'gi');
        }

        let match;
        while ((match = regex.exec(content)) !== null) {
          matches.push({
            start: match.index,
            end: match.index + match[0].length,
            text: match[0]
          });
        }
      }

      if (matches.length > 0) {
        if (direction === 'next') {
          currentMatch = (currentMatch + 1) % matches.length;
        } else {
          currentMatch = currentMatch - 1;
          if (currentMatch < 0) currentMatch = matches.length - 1;
        }
        highlightMatch(matches[currentMatch]);
      } else {
        currentMatch = -1;
      }
      
      updateStatus();
    } catch (e) {
      if (options.useRegex) {
        statusText.textContent = '無効な正規表現です';
      }
    }
  }

  // マッチをハイライト
  function highlightMatch(match) {
    if (!currentEditor || !match) return;
    
    if (isWysiwygMode) {
      highlightSearchResult(currentEditor, match.from, match.to);
    } else {
      // ソースモードでの強調表示
      console.log('Source mode highlight:', match);
      
      // フォーカスを当てる
      currentEditor.focus();
      
      // テキストを選択
      currentEditor.setSelectionRange(match.start, match.end);
      
      // スクロール処理
      scrollToMatch(currentEditor, match.start);
    }
  }

  // ソースエディターでのスクロール処理（完全修正版）
  function scrollToMatch(textarea, position) {
    try {
      // 計算用の要素を作成してフォントサイズと行の高さを正確に取得
      const testElement = document.createElement('div');
      testElement.style.cssText = `
        position: absolute;
        visibility: hidden;
        height: auto;
        width: auto;
        white-space: nowrap;
        font-family: ${window.getComputedStyle(textarea).fontFamily};
        font-size: ${window.getComputedStyle(textarea).fontSize};
        line-height: ${window.getComputedStyle(textarea).lineHeight};
      `;
      testElement.textContent = 'M';
      document.body.appendChild(testElement);
      
      const lineHeight = testElement.offsetHeight;
      document.body.removeChild(testElement);
      
      console.log('Calculated line height:', lineHeight);
      
      // 該当位置までのテキストから行番号を計算
      const textBeforePosition = textarea.value.substring(0, position);
      const lineNumber = textBeforePosition.split('\n').length - 1;
      
      console.log('Target line number:', lineNumber);
      
      // スクロール位置を計算（選択行を画面中央に表示）
      const targetScrollTop = (lineNumber * lineHeight) - (textarea.clientHeight / 2);
      const scrollTop = Math.max(0, targetScrollTop);
      
      console.log('Scrolling to:', scrollTop);
      
      // スクロール実行
      textarea.scrollTop = scrollTop;
      
      // 確実に選択状態にする
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(match.start, match.end);
      }, 10);
      
    } catch (error) {
      console.error('Scroll error:', error);
      // フォールバック: 単純にフォーカスと選択のみ
      textarea.focus();
      textarea.setSelectionRange(match.start, match.end);
    }
  }

  // ステータスを更新
  function updateStatus() {
    if (!searchInput.value) {
      statusText.textContent = '検索文字列を入力してください';
    } else if (matches.length === 0) {
      statusText.textContent = '見つかりませんでした';
    } else {
      statusText.textContent = `${currentMatch + 1} / ${matches.length} 件`;
    }
  }

  // 置換を実行（修正版）
  function replaceOne() {
    if (!currentEditor || currentMatch === -1 || matches.length === 0) return;
    
    const match = matches[currentMatch];
    const replaceTextValue = replaceInput.value;
    
    if (isWysiwygMode) {
      // WYSIWYGモードでは、matchオブジェクトのfrom/toプロパティを使用
      replaceText(currentEditor, match.from, match.to, replaceTextValue);
    } else {
      // ソースモードでは、matchオブジェクトのstart/endプロパティを使用
      const content = currentEditor.value;
      currentEditor.value = content.substring(0, match.start) + 
                          replaceTextValue + 
                          content.substring(match.end);
      
      // inputイベントを発火
      const event = new Event('input', { bubbles: true });
      currentEditor.dispatchEvent(event);
    }
    
    // 置換後に再検索
    setTimeout(() => performSearch('next'), 100);
  }

  // 全て置換
  function replaceAllFunc() {
    if (!currentEditor || matches.length === 0) return;
    
    const searchText = searchInput.value;
    const replaceTextValue = replaceInput.value;
    const options = {
      caseSensitive: document.getElementById('search-case-sensitive').checked,
      wholeWord: document.getElementById('search-whole-word').checked,
      useRegex: document.getElementById('search-regex').checked
    };
    
    try {
      let replaceCount;
      
      if (isWysiwygMode) {
        replaceCount = replaceAllInEditor(currentEditor, searchText, replaceTextValue, options);
      } else {
        let regex;
        if (options.useRegex) {
          regex = new RegExp(searchText, options.caseSensitive ? 'g' : 'gi');
        } else {
          let pattern = escapeRegExp(searchText);
          if (options.wholeWord) {
            pattern = `\\b${pattern}\\b`;
          }
          regex = new RegExp(pattern, options.caseSensitive ? 'g' : 'gi');
        }
        
        replaceCount = matches.length;
        const newContent = currentEditor.value.replace(regex, replaceTextValue);
        currentEditor.value = newContent;
        
        // inputイベントを発火
        const event = new Event('input', { bubbles: true });
        currentEditor.dispatchEvent(event);
      }
      
      statusText.textContent = `${replaceCount} 件を置換しました`;
      
      // 置換後に再検索
      setTimeout(() => performSearch(), 100);
    } catch (e) {
      statusText.textContent = '置換エラー';
    }
  }

  // 正規表現をエスケープ
  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // 入力フィールド用のコンテキストメニュー
  function showInputContextMenu(e, inputElement) {
    // 既存のメニューを削除
    const existingMenu = document.querySelector('.search-context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }

    const contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu search-context-menu visible';
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
            await handleInputContextMenuAction(item.action, inputElement);
            contextMenu.remove();
          });
        }
        
        contextMenu.appendChild(menuItem);
      }
    });

    document.body.appendChild(contextMenu);

    // メニューが画面外に出ないように位置を調整
    setTimeout(() => {
      const rect = contextMenu.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      let newLeft = parseFloat(contextMenu.style.left);
      let newTop = parseFloat(contextMenu.style.top);
      
      // 右端がはみ出る場合
      if (rect.right > windowWidth) {
        newLeft = Math.max(10, windowWidth - rect.width - 10);
      }
      
      // 左端がはみ出る場合
      if (newLeft < 10) {
        newLeft = 10;
      }
      
      // 下端がはみ出る場合
      if (rect.bottom > windowHeight) {
        newTop = Math.max(10, windowHeight - rect.height - 10);
      }
      
      // 上端がはみ出る場合
      if (newTop < 10) {
        newTop = 10;
      }
      
      contextMenu.style.left = newLeft + 'px';
      contextMenu.style.top = newTop + 'px';
    }, 0);

    // クリックでメニューを閉じる
    setTimeout(() => {
      document.addEventListener('click', function closeMenu() {
        if (document.body.contains(contextMenu)) {
          contextMenu.remove();
        }
        document.removeEventListener('click', closeMenu);
      });
    }, 100);
  }

  // 入力フィールドのコンテキストメニューアクション
  async function handleInputContextMenuAction(action, inputElement) {
    switch(action) {
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

  // ダイアログを表示
  function show(editor, isWysiwyg = false) {
    currentEditor = editor;
    isWysiwygMode = isWysiwyg;
    dialog.style.display = 'block';
    isVisible = true;
    
    // フォーカス管理を改善
    setTimeout(() => {
      searchInput.focus();
      searchInput.select();
    }, 50);
    
    // 選択テキストがあれば検索欄に設定
    if (isWysiwygMode) {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        const selectedText = editor.state.doc.textBetween(from, to, ' ');
        searchInput.value = selectedText;
        // 自動検索は行わない
      }
    } else if (editor.selectionStart !== editor.selectionEnd) {
      const selectedText = editor.value.substring(editor.selectionStart, editor.selectionEnd);
      searchInput.value = selectedText;
      // 自動検索は行わない
    }
  }

  // ダイアログを閉じる
  function hide() {
    dialog.style.display = 'none';
    isVisible = false;
    matches = [];
    currentMatch = -1;
    if (currentEditor) {
      if (isWysiwygMode) {
        currentEditor.commands.focus();
      } else {
        currentEditor.focus();
      }
    }
  }

  // イベントリスナー
  const closeBtn = dialog.querySelector('.search-close');
  const searchBtn = document.getElementById('search-btn');
  const nextBtn = document.getElementById('search-next');
  const prevBtn = document.getElementById('search-prev');
  const replaceOneBtn = document.getElementById('replace-one');
  const replaceAllBtn = document.getElementById('replace-all');
  
  if (closeBtn) closeBtn.addEventListener('click', hide);
  if (searchBtn) searchBtn.addEventListener('click', () => performSearch());
  if (nextBtn) nextBtn.addEventListener('click', () => performSearch('next'));
  if (prevBtn) prevBtn.addEventListener('click', () => performSearch('prev'));
  if (replaceOneBtn) replaceOneBtn.addEventListener('click', replaceOne);
  if (replaceAllBtn) replaceAllBtn.addEventListener('click', replaceAllFunc);
  
  if (searchInput) {
    // 右クリックメニューの設定
    searchInput.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showInputContextMenu(e, searchInput);
    });
    
    searchInput.addEventListener('keydown', (e) => {
      e.stopPropagation(); // イベントの伝播を止める
      if (e.key === 'Enter') {
        e.preventDefault();
        performSearch(e.shiftKey ? 'prev' : 'next');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        hide();
      }
    });
  }
  
  if (replaceInput) {
    // 右クリックメニューの設定
    replaceInput.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showInputContextMenu(e, replaceInput);
    });
    
    replaceInput.addEventListener('keydown', (e) => {
      e.stopPropagation(); // イベントの伝播を止める
      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) {
          replaceAllFunc();
        } else {
          replaceOne();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        hide();
      }
    });
  }
  
  // ダイアログ内のすべての入力要素でイベント伝播を停止
  dialog.addEventListener('keydown', (e) => {
    e.stopPropagation();
  });
  
  dialog.addEventListener('keyup', (e) => {
    e.stopPropagation();
  });
  
  dialog.addEventListener('keypress', (e) => {
    e.stopPropagation();
  });
  
  // オプション変更時の処理（自動検索は行わない）
  document.querySelectorAll('.search-options input').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      // オプション変更時は自動検索しない
      // 必要に応じて手動で検索ボタンを押す
    });
  });

  return { show, hide, isVisible: () => isVisible };
}

// 検索・置換ダイアログのスタイル
export function addSearchReplaceStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .search-dialog {
      position: fixed;
      top: 60px;
      right: 20px;
      width: 400px;
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1000;
    }

    .search-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid #eee;
      font-weight: 600;
    }

    .search-close {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #666;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
    }

    .search-close:hover {
      background: #f0f0f0;
    }

    .search-body {
      padding: 16px;
    }

    .search-row {
      display: flex;
      align-items: center;
      margin-bottom: 12px;
      gap: 8px;
    }

    .search-row label {
      width: 50px;
      font-size: 14px;
    }

    .search-input {
      flex: 1;
      padding: 6px 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      outline: none;
    }

    .search-input:focus {
      border-color: #007bff;
      box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
    }

    .search-btn {
      padding: 6px 12px;
      background: #f8f9fa;
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      white-space: nowrap;
    }

    .search-btn:hover {
      background: #e9ecef;
    }

    .search-options {
      display: flex;
      gap: 16px;
      margin: 12px 0;
      font-size: 13px;
    }

    .search-options label {
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
    }

    .search-status {
      font-size: 13px;
      color: #666;
      text-align: center;
      min-height: 20px;
    }

    /* ダークテーマ対応 */
    .dark-theme .search-dialog {
      background: #2d2d2d;
      border-color: #404040;
      color: #fff;
    }

    .dark-theme .search-header {
      border-bottom-color: #404040;
    }

    .dark-theme .search-close {
      color: #ccc;
    }

    .dark-theme .search-close:hover {
      background: #404040;
    }

    .dark-theme .search-input {
      background: #1a1a1a;
      border-color: #404040;
      color: #fff;
    }

    .dark-theme .search-input:focus {
      border-color: #007bff;
    }

    .dark-theme .search-btn {
      background: #404040;
      border-color: #555;
      color: #fff;
    }

    .dark-theme .search-btn:hover {
      background: #555;
    }

    .dark-theme .search-status {
      color: #ccc;
    }
  `;
  document.head.appendChild(style);
}