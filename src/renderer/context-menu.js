// コンテキストメニューモジュール
import { commonEditActions } from './editor.js';

// HTMLクリーニング関数（html-cleaner.jsの代替として内部実装）
function cleanHtmlForEditor(html) {
  // 一時的なDOMコンテナを作成
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // 不要な要素を削除
  const unwantedElements = ['script', 'style', 'meta', 'link', 'object', 'embed', 'iframe', 'form', 'input', 'button'];
  unwantedElements.forEach(tag => {
    const elements = tempDiv.querySelectorAll(tag);
    elements.forEach(el => el.remove());
  });
  
  // 不要な属性を削除（class, id, style以外の属性は保持）
  const allElements = tempDiv.querySelectorAll('*');
  allElements.forEach(el => {
    // 危険な属性を削除
    const dangerousAttrs = ['onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout', 'onmousemove', 'onmouseenter', 'onmouseleave'];
    dangerousAttrs.forEach(attr => {
      el.removeAttribute(attr);
    });
    
    // スタイル属性をクリーンアップ（基本的なスタイルのみ保持）
    if (el.hasAttribute('style')) {
      const style = el.getAttribute('style');
      // 基本的なテキストスタイルのみ保持
      const allowedStyles = ['font-weight', 'font-style', 'text-decoration', 'color', 'background-color'];
      const styleObj = {};
      
      style.split(';').forEach(rule => {
        const [property, value] = rule.split(':').map(s => s.trim());
        if (property && value && allowedStyles.some(allowed => property.startsWith(allowed))) {
          styleObj[property] = value;
        }
      });
      
      const newStyle = Object.entries(styleObj).map(([prop, val]) => `${prop}: ${val}`).join('; ');
      if (newStyle) {
        el.setAttribute('style', newStyle);
      } else {
        el.removeAttribute('style');
      }
    }
  });
  
  // クリーンなHTMLを返す
  return tempDiv.innerHTML;
}

// WYSIWYGエディタ用のコンテキストメニュー設定
export function setupContextMenu(editor) {
  // エディターのDOM要素に右クリックイベントを設定
  editor.view.dom.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showContextMenu(e, editor);
  });
}

// ソースエディタ用のコンテキストメニュー設定
export function setupSourceEditorContextMenu(sourceEditor) {
  if (sourceEditor) {
    sourceEditor.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showSourceContextMenu(e, sourceEditor);
    });
  }
}

function showContextMenu(e, editor) {
  // 既存のメニューを削除
  const existingMenu = document.querySelector('.context-menu');
  if (existingMenu) {
    existingMenu.remove();
  }

  const { selection } = editor.state;
  const hasSelection = !selection.empty;
  
  // テーブル内かチェック
  const isInTable = isInsideTable(editor);
  
  // コンテキストメニューを作成
  const contextMenu = document.createElement('div');
  contextMenu.className = 'context-menu';
  
  // クライアント座標を使用
  contextMenu.style.left = e.clientX + 'px';
  contextMenu.style.top = e.clientY + 'px';

  const menuItems = [];

  // 基本的なメニュー項目
  menuItems.push(
    { label: 'コピー', action: 'copy', enabled: hasSelection },
    { label: '切り取り', action: 'cut', enabled: hasSelection },
    { label: '貼り付け', action: 'paste', enabled: true },
    { type: 'separator' },
    { label: 'すべて選択', action: 'selectAll', enabled: true },
    { type: 'separator' },
    { label: 'HTMLソースを表示', action: 'showHtmlSource', enabled: true }
  );

  // 選択テキストがある場合はGoogle検索とGoogle翻訳を追加
  if (hasSelection) {
    menuItems.push(
      { type: 'separator' },
      { label: 'Googleで検索', action: 'google-search', enabled: true },
      { label: 'Google翻訳で翻訳', action: 'google-translate', enabled: true }
    );
  }

  // テーブル内の場合はテーブル操作を追加
  if (isInTable) {
    menuItems.push(
      { type: 'separator' },
      { label: '行を上に追加', action: 'addRowBefore', enabled: true },
      { label: '行を下に追加', action: 'addRowAfter', enabled: true },
      { label: '行を削除', action: 'deleteRow', enabled: true },
      { type: 'separator' },
      { label: '列を左に追加', action: 'addColumnBefore', enabled: true },
      { label: '列を右に追加', action: 'addColumnAfter', enabled: true },
      { label: '列を削除', action: 'deleteColumn', enabled: true }
    );
  }

  // メニュー項目を作成
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
        menuItem.addEventListener('click', () => {
          handleContextMenuAction(item.action, editor);
          contextMenu.remove();
        });
      }
      
      contextMenu.appendChild(menuItem);
    }
  });

  document.body.appendChild(contextMenu);

  // アニメーション用にvisibleクラスを追加
  requestAnimationFrame(() => {
    contextMenu.classList.add('visible');
  });

  // 位置調整
  setTimeout(() => {
    const rect = contextMenu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let newLeft = e.clientX;
    let newTop = e.clientY;
    
    // 右端の調整
    if (newLeft + rect.width > viewportWidth - 10) {
      newLeft = Math.max(10, viewportWidth - rect.width - 10);
    }
    
    // 下端の調整
    if (newTop + rect.height > viewportHeight - 10) {
      newTop = Math.max(10, e.clientY - rect.height);
    }
    
    // 最小マージンを確保
    newLeft = Math.max(10, newLeft);
    newTop = Math.max(10, newTop);
    
    contextMenu.style.left = newLeft + 'px';
    contextMenu.style.top = newTop + 'px';
  }, 10);

  // クリックでメニューを閉じる
  setTimeout(() => {
    document.addEventListener('click', function closeMenu() {
      if (document.body.contains(contextMenu)) {
        contextMenu.remove();
      }
      document.removeEventListener('click', closeMenu);
    });
  }, 100);

  // ESCキーでメニューを閉じる
  document.addEventListener('keydown', function closeOnEsc(e) {
    if (e.key === 'Escape' && document.body.contains(contextMenu)) {
      contextMenu.remove();
      document.removeEventListener('keydown', closeOnEsc);
    }
  });
}

// テーブル内かチェック
function isInsideTable(editor) {
  const { $from } = editor.state.selection;
  
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name === 'table') {
      return true;
    }
  }
  
  return false;
}

// コンテキストメニューのアクション処理（共通関数を使用）
function handleContextMenuAction(action, editor) {
  switch(action) {
    case 'copy':
      commonEditActions.copy();
      break;
    case 'cut':
      commonEditActions.cut(editor);
      break;
    case 'paste':
      commonEditActions.paste(editor);
      break;
    case 'selectAll':
      commonEditActions.selectAll(editor);
      break;
    case 'google-search': {
      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to);
      if (selectedText && window.electronAPI) {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(selectedText)}`;
        window.electronAPI.openExternalLink(searchUrl);
      }
      break;
    }
    case 'google-translate': {
      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to);
      if (selectedText && window.electronAPI) {
        const translateUrl = `https://translate.google.com/?sl=auto&tl=ja&text=${encodeURIComponent(selectedText)}&op=translate`;
        window.electronAPI.openExternalLink(translateUrl);
      }
      break;
    }
    // テーブル操作
    case 'addRowBefore':
      editor.chain().focus().addRowBefore().run();
      break;
    case 'addRowAfter':
      editor.chain().focus().addRowAfter().run();
      break;
    case 'deleteRow':
      editor.chain().focus().deleteRow().run();
      break;
    case 'addColumnBefore':
      editor.chain().focus().addColumnBefore().run();
      break;
    case 'addColumnAfter':
      editor.chain().focus().addColumnAfter().run();
      break;
    case 'deleteColumn':
      editor.chain().focus().deleteColumn().run();
      break;
    case 'showHtmlSource':
      showHtmlSourceWindow(editor);
      break;
  }
}

// ソースエディタ用のコンテキストメニュー
function showSourceContextMenu(e, sourceEditor) {
  // 既存のメニューを削除
  const existingMenu = document.querySelector('.context-menu');
  if (existingMenu) {
    existingMenu.remove();
  }

  const hasSelection = sourceEditor.selectionStart !== sourceEditor.selectionEnd;
  
  const contextMenu = document.createElement('div');
  contextMenu.className = 'context-menu';
  
  // クライアント座標を使用
  contextMenu.style.left = e.clientX + 'px';
  contextMenu.style.top = e.clientY + 'px';

  const menuItems = [
    { label: 'コピー', action: 'copy', enabled: hasSelection },
    { label: '切り取り', action: 'cut', enabled: hasSelection },
    { label: '貼り付け', action: 'paste', enabled: true },
    { label: 'リッチテキストで貼り付け', action: 'paste-rich', enabled: true },
    { type: 'separator' },
    { label: 'すべて選択', action: 'selectAll', enabled: true }
  ];

  // 選択テキストがある場合はGoogle検索とGoogle翻訳を追加
  if (hasSelection) {
    menuItems.push(
      { type: 'separator' },
      { label: 'Googleで検索', action: 'google-search', enabled: true },
      { label: 'Google翻訳で翻訳', action: 'google-translate', enabled: true }
    );
  }

  // メニュー項目を作成
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
        menuItem.addEventListener('click', () => {
          handleSourceContextMenuAction(item.action, sourceEditor);
          contextMenu.remove();
        });
      }
      
      contextMenu.appendChild(menuItem);
    }
  });

  document.body.appendChild(contextMenu);

  // アニメーション用にvisibleクラスを追加
  requestAnimationFrame(() => {
    contextMenu.classList.add('visible');
  });

  // 位置調整
  setTimeout(() => {
    const rect = contextMenu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let newLeft = e.clientX;
    let newTop = e.clientY;
    
    // 右端の調整
    if (newLeft + rect.width > viewportWidth - 10) {
      newLeft = Math.max(10, viewportWidth - rect.width - 10);
    }
    
    // 下端の調整
    if (newTop + rect.height > viewportHeight - 10) {
      newTop = Math.max(10, e.clientY - rect.height);
    }
    
    // 最小マージンを確保
    newLeft = Math.max(10, newLeft);
    newTop = Math.max(10, newTop);
    
    contextMenu.style.left = newLeft + 'px';
    contextMenu.style.top = newTop + 'px';
  }, 10);

  // クリックでメニューを閉じる
  setTimeout(() => {
    document.addEventListener('click', function closeMenu() {
      if (document.body.contains(contextMenu)) {
        contextMenu.remove();
      }
      document.removeEventListener('click', closeMenu);
    });
  }, 100);

  // ESCキーでメニューを閉じる
  document.addEventListener('keydown', function closeOnEsc(e) {
    if (e.key === 'Escape' && document.body.contains(contextMenu)) {
      contextMenu.remove();
      document.removeEventListener('keydown', closeOnEsc);
    }
  });
}

// ソースエディタのアクション処理
function handleSourceContextMenuAction(action, sourceEditor) {
  switch(action) {
    case 'copy': {
      const selectedText = sourceEditor.value.substring(
        sourceEditor.selectionStart,
        sourceEditor.selectionEnd
      );
      if (selectedText) {
        navigator.clipboard.writeText(selectedText).then(() => {
          window.showMessage('コピーしました', 'success');
        }).catch(() => {
          // フォールバック
          sourceEditor.focus();
          document.execCommand('copy');
          window.showMessage('コピーしました', 'success');
        });
      }
      break;
    }
    case 'cut': {
      const selectedText = sourceEditor.value.substring(
        sourceEditor.selectionStart,
        sourceEditor.selectionEnd
      );
      if (selectedText) {
        navigator.clipboard.writeText(selectedText).then(() => {
          const start = sourceEditor.selectionStart;
          const end = sourceEditor.selectionEnd;
          const value = sourceEditor.value;
          sourceEditor.value = value.substring(0, start) + value.substring(end);
          sourceEditor.setSelectionRange(start, start);
          
          // inputイベントを発火
          const event = new Event('input', { bubbles: true });
          sourceEditor.dispatchEvent(event);
          
          window.showMessage('切り取りました', 'success');
        }).catch(() => {
          // フォールバック
          sourceEditor.focus();
          document.execCommand('cut');
          window.showMessage('切り取りました', 'success');
        });
      }
      break;
    }
    case 'paste': {
      navigator.clipboard.readText().then(text => {
        const start = sourceEditor.selectionStart;
        const end = sourceEditor.selectionEnd;
        const value = sourceEditor.value;
        sourceEditor.value = value.substring(0, start) + text + value.substring(end);
        sourceEditor.setSelectionRange(start + text.length, start + text.length);
        
        // inputイベントを発火
        const event = new Event('input', { bubbles: true });
        sourceEditor.dispatchEvent(event);
        
        window.showMessage('貼り付けました', 'success');
      }).catch(() => {
        // フォールバック
        sourceEditor.focus();
        document.execCommand('paste');
      });
      break;
    }
    case 'paste-rich':
      // リッチテキストの貼り付け
      handleSourcePasteRichTextAction(sourceEditor);
      break;
    case 'selectAll':
      sourceEditor.select();
      break;
    case 'google-search': {
      const selectedText = sourceEditor.value.substring(
        sourceEditor.selectionStart,
        sourceEditor.selectionEnd
      );
      if (selectedText && window.electronAPI) {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(selectedText)}`;
        window.electronAPI.openExternalLink(searchUrl);
      }
      break;
    }
    case 'google-translate': {
      const selectedText = sourceEditor.value.substring(
        sourceEditor.selectionStart,
        sourceEditor.selectionEnd
      );
      if (selectedText && window.electronAPI) {
        const translateUrl = `https://translate.google.com/?sl=auto&tl=ja&text=${encodeURIComponent(selectedText)}&op=translate`;
        window.electronAPI.openExternalLink(translateUrl);
      }
      break;
    }
  }
}

// ソースエディタのリッチテキスト貼り付け処理
async function handleSourcePasteRichTextAction(sourceEditor) {
  try {
    // まずHTML形式を試す
    const clipboardItems = await navigator.clipboard.read();
    let pasteSuccessful = false;
    
    for (const clipboardItem of clipboardItems) {
      for (const type of clipboardItem.types) {
        if (type === 'text/html') {
          const blob = await clipboardItem.getType(type);
          const html = await blob.text();
          
          const start = sourceEditor.selectionStart;
          const end = sourceEditor.selectionEnd;
          const value = sourceEditor.value;
          
          // HTMLをクリーニングしてからMarkdownに変換
          const cleanedHtml = cleanHtmlForEditor(html);
          
          // dynamic importを使用
          const { htmlToMarkdown } = await import('./markdown.js');
          const markdown = htmlToMarkdown(cleanedHtml);
          
          sourceEditor.value = value.substring(0, start) + markdown + value.substring(end);
          sourceEditor.setSelectionRange(start + markdown.length, start + markdown.length);
          
          // inputイベントを発火
          const event = new Event('input', { bubbles: true });
          sourceEditor.dispatchEvent(event);
          
          window.showMessage('リッチテキストを貼り付けました', 'success');
          pasteSuccessful = true;
          break;
        }
      }
      
      if (pasteSuccessful) break;
    }
    
    if (!pasteSuccessful) {
      // プレーンテキストとして貼り付け
      handleSourceContextMenuAction('paste', sourceEditor);
    }
  } catch (error) {
    console.error('Rich text paste error:', error);
    // フォールバック
    handleSourceContextMenuAction('paste', sourceEditor);
  }
}

// HTMLソースを新しいウィンドウで表示する関数
function showHtmlSourceWindow(editor) {
  try {
    // エディターからHTMLを取得
    const htmlContent = editor.getHTML();
    
    // HTMLソースを整形
    const formattedHtml = formatHtml(htmlContent);
    
    // 新しいウィンドウを開く
    const newWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
    
    if (newWindow) {
      // ウィンドウのコンテンツを設定
      newWindow.document.write(`
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HTMLソース - SightEdit</title>
    <style>
        body {
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            border-bottom: 1px solid #e0e0e0;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        .header h1 {
            margin: 0;
            font-size: 18px;
            color: #333;
        }
        .header p {
            margin: 5px 0 0 0;
            color: #666;
            font-size: 14px;
        }
        .content {
            position: relative;
        }
        pre {
            background-color: #f8f8f8;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            padding: 15px;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-size: 13px;
            line-height: 1.4;
            margin: 0;
            overflow: auto;
        }
        .copy-btn {
            position: absolute;
            top: 10px;
            right: 10px;
            background: #007acc;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }
        .copy-btn:hover {
            background: #005fa3;
        }
        .copy-btn:active {
            background: #004a85;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>HTMLソース</h1>
            <p>WYSIWYG編集画面で生成されたHTMLコードです</p>
        </div>
        <div class="content">
            <button class="copy-btn" onclick="copyToClipboard()">コピー</button>
            <pre id="htmlContent">${escapeHtml(formattedHtml)}</pre>
        </div>
    </div>
    
    <script>
        function copyToClipboard() {
            const content = document.getElementById('htmlContent').textContent;
            navigator.clipboard.writeText(content).then(() => {
                const btn = document.querySelector('.copy-btn');
                const originalText = btn.textContent;
                btn.textContent = 'コピーしました!';
                btn.style.background = '#28a745';
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '#007acc';
                }, 2000);
            }).catch(err => {
                console.error('コピーに失敗しました:', err);
                alert('コピーに失敗しました');
            });
        }
        
        // ショートカットキー（Ctrl+A で全選択）
        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                e.preventDefault();
                const range = document.createRange();
                range.selectNodeContents(document.getElementById('htmlContent'));
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            }
        });
    </script>
</body>
</html>
      `);
      
      newWindow.document.close();
      newWindow.focus();
    } else {
      window.showMessage('新しいウィンドウを開けませんでした', 'error');
    }
  } catch (error) {
    console.error('HTMLソース表示エラー:', error);
    window.showMessage('HTMLソースの表示に失敗しました', 'error');
  }
}

// HTMLを整形する関数
function formatHtml(html) {
  // 簡易的なHTML整形
  let formatted = html;
  let indent = 0;
  const indentSize = 2;
  
  // タグを改行で分割
  formatted = formatted.replace(/></g, '>\n<');
  
  const lines = formatted.split('\n');
  const formattedLines = [];
  
  lines.forEach(line => {
    line = line.trim();
    if (!line) return;
    
    // 閉じタグの場合はインデントを減らす
    if (line.startsWith('</')) {
      indent = Math.max(0, indent - indentSize);
    }
    
    // インデントを追加
    formattedLines.push(' '.repeat(indent) + line);
    
    // 開始タグの場合はインデントを増やす（自己閉じタグ以外）
    if (line.startsWith('<') && !line.startsWith('</') && !line.endsWith('/>')) {
      // テキストを含む単一行タグは除く（例：<p>text</p>）
      const tagContent = line.match(/<([^>]+)>(.+)<\/\1>/);
      if (!tagContent) {
        indent += indentSize;
      }
    }
  });
  
  return formattedLines.join('\n');
}

// HTMLエスケープ関数
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}