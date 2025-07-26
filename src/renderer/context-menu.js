export function setupContextMenu(editor) {
  // エディターのDOM要素に右クリックイベントを設定
  editor.view.dom.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showContextMenu(e, editor);
  });
}

// ソースエディタ用のコンテキストメニュー設定
export function setupSourceEditorContextMenu() {
  const sourceEditor = document.getElementById('source-editor');
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
  contextMenu.className = 'context-menu visible';
  contextMenu.style.left = e.pageX + 'px';
  contextMenu.style.top = e.pageY + 'px';

  const menuItems = [];

  // 基本的なメニュー項目
  menuItems.push(
    { label: 'コピー', action: 'copy', enabled: hasSelection },
    { label: '切り取り', action: 'cut', enabled: hasSelection },
    { label: '貼り付け', action: 'paste', enabled: true },
    { type: 'separator' },
    { label: 'すべて選択', action: 'selectAll', enabled: true }
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

  // メニューが画面外に出ないように位置を調整（修正版）
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

// ソースエディタ用のコンテキストメニュー
function showSourceContextMenu(e, sourceEditor) {
  // 既存のメニューを削除
  const existingMenu = document.querySelector('.context-menu');
  if (existingMenu) {
    existingMenu.remove();
  }

  const hasSelection = sourceEditor.selectionStart !== sourceEditor.selectionEnd;
  
  const contextMenu = document.createElement('div');
  contextMenu.className = 'context-menu visible';
  contextMenu.style.left = e.pageX + 'px';
  contextMenu.style.top = e.pageY + 'px';

  const menuItems = [
    { label: 'コピー', action: 'copy', enabled: hasSelection },
    { label: '切り取り', action: 'cut', enabled: hasSelection },
    { label: '貼り付け', action: 'paste', enabled: true },
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

  // メニューが画面外に出ないように位置を調整（修正版）
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

function handleContextMenuAction(action, editor) {
  switch(action) {
    case 'copy': {
      const selectedTextForCopy = editor.state.doc.textBetween(
        editor.state.selection.from,
        editor.state.selection.to,
        ' '
      );
      if (selectedTextForCopy) {
        navigator.clipboard.writeText(selectedTextForCopy).then(() => {
          window.showMessage('コピーしました', 'success');
        }).catch(() => {
          // フォールバック
          editor.commands.focus();
          document.execCommand('copy');
          window.showMessage('コピーしました', 'success');
        });
      }
      break;
    }
    case 'cut': {
      const selectedTextForCut = editor.state.doc.textBetween(
        editor.state.selection.from,
        editor.state.selection.to,
        ' '
      );
      if (selectedTextForCut) {
        navigator.clipboard.writeText(selectedTextForCut).then(() => {
          editor.chain().focus().deleteSelection().run();
          window.showMessage('切り取りました', 'success');
        }).catch(() => {
          // フォールバック
          editor.commands.focus();
          document.execCommand('cut');
          window.showMessage('切り取りました', 'success');
        });
      }
      break;
    }
      
    case 'paste': {
      handlePasteAction(editor);
      break;
    }
    case 'selectAll': {
      editor.chain().focus().selectAll().run();
      break;
    }
    case 'google-search': {
      const selectedText = editor.state.doc.textBetween(
        editor.state.selection.from,
        editor.state.selection.to,
        ' '
      );
      if (selectedText && window.electronAPI) {
        const searchUrl = 'https://www.google.com/search?q=' + encodeURIComponent(selectedText);
        window.electronAPI.openExternalLink(searchUrl);
      }
      break;
    }
      
    case 'google-translate': {
      const textToTranslate = editor.state.doc.textBetween(
        editor.state.selection.from,
        editor.state.selection.to,
        ' '
      );
      if (textToTranslate && window.electronAPI) {
        // 英語から日本語への翻訳（自動検出）
        const translateUrl = `https://translate.google.com/?sl=auto&tl=ja&text=${encodeURIComponent(textToTranslate)}&op=translate`;
        window.electronAPI.openExternalLink(translateUrl);
      }
      break;
    }
      
    // テーブル操作
    case 'addRowBefore': {
      editor.chain().focus().addRowBefore().run();
      break;
    }
      
    case 'addRowAfter': {
      editor.chain().focus().addRowAfter().run();
      break;
    }
    case 'deleteRow': {
      editor.chain().focus().deleteRow().run();
      break;
    }
    case 'addColumnBefore': {
      editor.chain().focus().addColumnBefore().run();
      break;
    }
    case 'addColumnAfter': {
      editor.chain().focus().addColumnAfter().run();
      break;
    }
    case 'deleteColumn': {
      editor.chain().focus().deleteColumn().run();
      break;
    }
  }
}

// 貼り付け処理を分離（リスト構造の修正版）
async function handlePasteAction(editor) {
  try {
    // まずHTML形式を試す
    const clipboardItems = await navigator.clipboard.read();
    let pasteSuccessful = false;
    
    for (const clipboardItem of clipboardItems) {
      for (const type of clipboardItem.types) {
        if (type === 'text/html') {
          const blob = await clipboardItem.getType(type);
          const html = await blob.text();
          
          // HTMLをクリーニングしてから挿入（リスト処理強化）
          const cleanedHtml = cleanHtmlForEditor(html);
          editor.chain().focus().insertContent(cleanedHtml).run();
          window.showMessage('リッチテキストを貼り付けました', 'success');
          pasteSuccessful = true;
          break;
        }
      }
      if (pasteSuccessful) break;
    }
    
    // HTML形式がない場合はプレーンテキスト
    if (!pasteSuccessful) {
      const text = await navigator.clipboard.readText();
      if (text) {
        editor.chain().focus().insertContent(text).run();
        window.showMessage('貼り付けました', 'success');
      }
    }
  } catch (error) {
    // フォールバック: 古いAPI
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        editor.chain().focus().insertContent(text).run();
        window.showMessage('貼り付けました', 'success');
      }
    } catch {
      // 最終フォールバック
      editor.commands.focus();
      document.execCommand('paste');
    }
  }
}

// HTMLをエディター用にクリーニングする関数（リスト処理大幅改良版）
function cleanHtmlForEditor(html) {
  // 一時的なDIV要素でHTMLをパース
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // 許可するタグと属性を定義
  const allowedTags = {
    'h1': [], 'h2': [], 'h3': [], 'h4': [], 'h5': [], 'h6': [],
    'p': [], 'br': [],
    'strong': [], 'b': [], 'em': [], 'i': [], 'u': [], 's': [], 'strike': [], 'del': [],
    'code': [], 'pre': [],
    'blockquote': [],
    'ul': [], 'ol': ['start'], 'li': [],
    'a': ['href', 'title'],
    'img': ['src', 'alt', 'title'],
    'table': [], 'thead': [], 'tbody': [], 'tr': [], 'th': [], 'td': []
  };
  
  // リスト構造の前処理（重要な修正）
  function preprocessLists(element) {
    // 連続するli要素を検出してul/olで囲む
    const listItems = element.querySelectorAll('li');
    const processedItems = new Set();
    
    listItems.forEach(li => {
      if (processedItems.has(li) || li.parentElement.matches('ul, ol')) {
        return; // 既に処理済みまたは適切な親要素がある
      }
      
      // 連続するli要素を収集
      const siblingItems = [li];
      let nextSibling = li.nextElementSibling;
      
      while (nextSibling && nextSibling.tagName === 'LI') {
        siblingItems.push(nextSibling);
        nextSibling = nextSibling.nextElementSibling;
      }
      
      if (siblingItems.length > 0) {
        // 番号付きリストか判定（より精密な判定）
        const hasNumbers = siblingItems.some(item => {
          const text = item.textContent.trim();
          return /^\d+\./.test(text) || item.querySelector('*[start]');
        });
        
        // 適切なリストタグで囲む
        const listTag = hasNumbers ? 'ol' : 'ul';
        const listElement = document.createElement(listTag);
        
        // li要素の内容をクリーニング
        siblingItems.forEach(item => {
          processedItems.add(item);
          
          // 番号プレフィックスを除去
          const textContent = item.textContent.trim();
          const cleanedText = textContent.replace(/^\d+\.\s*/, '');
          
          if (cleanedText !== textContent) {
            item.textContent = cleanedText;
          }
          
          listElement.appendChild(item.cloneNode(true));
        });
        
        // 元の要素を置換
        li.parentNode.insertBefore(listElement, li);
        siblingItems.forEach(item => {
          if (item.parentNode) {
            item.parentNode.removeChild(item);
          }
        });
      }
    });
  }
  
  // リスト前処理を実行
  preprocessLists(tempDiv);
  
  // 再帰的にHTMLをクリーニング
  function cleanNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent;
    }
    
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();
      
      // 空のdiv/span/pを li として扱う特別処理
      if (['div', 'span', 'p'].includes(tagName)) {
        const text = node.textContent.trim();
        if (text && (text.startsWith('•') || text.startsWith('-') || /^\d+\./.test(text))) {
          const cleanedText = text.replace(/^[•\-]\s*/, '').replace(/^\d+\.\s*/, '');
          return `<li>${cleanedText}</li>`;
        }
      }
      
      // 許可されていないタグの場合、内容のみを返す
      if (!allowedTags.hasOwnProperty(tagName)) {
        return cleanChildNodes(node);
      }
      
      // 許可されたタグの場合
      let result = `<${tagName}`;
      
      // 許可された属性のみを追加
      const allowedAttrs = allowedTags[tagName];
      if (allowedAttrs.length > 0) {
        for (let attr of allowedAttrs) {
          if (node.hasAttribute(attr)) {
            const attrValue = node.getAttribute(attr);
            if (attr === 'start' && !isNaN(attrValue)) {
              result += ` ${attr}="${attrValue}"`;
            } else if (attr !== 'start') {
              result += ` ${attr}="${attrValue}"`;
            }
          }
        }
      }
      
      result += '>';
      result += cleanChildNodes(node);
      
      if (!['br', 'img', 'hr'].includes(tagName)) {
        result += `</${tagName}>`;
      }
      
      return result;
    }
    
    return '';
  }
  
  function cleanChildNodes(node) {
    let content = '';
    for (let child of node.childNodes) {
      content += cleanNode(child);
    }
    return content;
  }
  
  // すべての子ノードをクリーニング
  let cleanedContent = '';
  for (let child of tempDiv.childNodes) {
    cleanedContent += cleanNode(child);
  }
  
  // 後処理：リスト構造の最終調整
  cleanedContent = cleanedContent
    // 連続するli要素をul/olで囲む
    .replace(/(<li[^>]*>.*?<\/li>)(\s*<li[^>]*>.*?<\/li>)+/gs, (match) => {
      const hasNumbers = /<li[^>]*>\s*\d+\./.test(match);
      const listType = hasNumbers ? 'ol' : 'ul';
      return `<${listType}>${match}</${listType}>`;
    })
    // 空のリスト項目を除去
    .replace(/<li[^>]*>\s*<\/li>/g, '')
    // 空のリストを除去
    .replace(/<(ul|ol)[^>]*>\s*<\/(ul|ol)>/g, '')
    // 余分な空白を除去
    .replace(/\s+/g, ' ')
    .trim();
  
  console.log('Original HTML:', html);
  console.log('Cleaned HTML:', cleanedContent);
  
  return cleanedContent;
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
      const textToCut = sourceEditor.value.substring(
        sourceEditor.selectionStart,
        sourceEditor.selectionEnd
      );
      if (textToCut) {
        navigator.clipboard.writeText(textToCut).then(() => {
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
      handleSourcePasteAction(sourceEditor);
      break;
    }
      
    case 'selectAll': {
      sourceEditor.select();
      break;
    }
      
    case 'google-search': {
      const selectedText = sourceEditor.value.substring(
        sourceEditor.selectionStart,
        sourceEditor.selectionEnd
      );
      if (selectedText && window.electronAPI) {
        const searchUrl = 'https://www.google.com/search?q=' + encodeURIComponent(selectedText);
        window.electronAPI.openExternalLink(searchUrl);
      }
      break;
    }
      
    case 'google-translate': {
      const textToTranslate = sourceEditor.value.substring(
        sourceEditor.selectionStart,
        sourceEditor.selectionEnd
      );
      if (textToTranslate && window.electronAPI) {
        const translateUrl = `https://translate.google.com/?sl=auto&tl=ja&text=${encodeURIComponent(textToTranslate)}&op=translate`;
        window.electronAPI.openExternalLink(translateUrl);
      }
      break;
    }
  }
}

// ソースエディタの貼り付け処理を分離（async関数）
async function handleSourcePasteAction(sourceEditor) {
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
    
    // HTML形式がない場合はプレーンテキスト
    if (!pasteSuccessful) {
      const text = await navigator.clipboard.readText();
      if (text) {
        const start = sourceEditor.selectionStart;
        const end = sourceEditor.selectionEnd;
        const value = sourceEditor.value;
        sourceEditor.value = value.substring(0, start) + text + value.substring(end);
        sourceEditor.setSelectionRange(start + text.length, start + text.length);
        
        // inputイベントを発火
        const event = new Event('input', { bubbles: true });
        sourceEditor.dispatchEvent(event);
        
        window.showMessage('貼り付けました', 'success');
      }
    }
  } catch (error) {
    // フォールバック
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const start = sourceEditor.selectionStart;
        const end = sourceEditor.selectionEnd;
        const value = sourceEditor.value;
        sourceEditor.value = value.substring(0, start) + text + value.substring(end);
        sourceEditor.setSelectionRange(start + text.length, start + text.length);
        
        // inputイベントを発火
        const event = new Event('input', { bubbles: true });
        sourceEditor.dispatchEvent(event);
        
        window.showMessage('貼り付けました', 'success');
      }
    } catch {
      document.execCommand('paste');
    }
  }
}

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