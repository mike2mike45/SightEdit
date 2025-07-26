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

// 貼り付け処理を分離（大幅改良版）
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
          
          // HTMLをクリーニングしてから挿入（大幅改良版）
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

// HTMLをエディター用にクリーニングする関数（完全書き直し版）
function cleanHtmlForEditor(html) {
  console.log('Original HTML:', html);
  
  // 一時的なDIV要素でHTMLをパース
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // DOM操作で構造を正規化
  normalizeListStructure(tempDiv);
  normalizeCodeBlocks(tempDiv);
  
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
  
  // 再帰的にHTMLをクリーニング
  function cleanNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent;
    }
    
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();
      
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
  
  console.log('Cleaned HTML:', cleanedContent);
  
  return cleanedContent;
}

// リスト構造を正規化（完全書き直し版）
function normalizeListStructure(container) {
  // 1. 番号付きリストの検出と変換
  const numberedItems = container.querySelectorAll('p, div, span');
  const detectedLists = new Map();
  
  numberedItems.forEach(item => {
    const text = item.textContent.trim();
    const match = text.match(/^(\d+)\.\s+(.+)$/);
    if (match) {
      const number = parseInt(match[1]);
      const content = match[2];
      
      // 連続する番号付き項目をグループ化
      let listGroup = null;
      for (let [key, group] of detectedLists) {
        const lastNumber = group[group.length - 1].number;
        if (number === lastNumber + 1) {
          listGroup = group;
          break;
        }
      }
      
      if (!listGroup) {
        listGroup = [];
        detectedLists.set(item, listGroup);
      }
      
      listGroup.push({ element: item, number, content });
    }
  });
  
  // 検出したリストをol要素に変換
  for (let [firstItem, group] of detectedLists) {
    if (group.length > 0) {
      const ol = document.createElement('ol');
      if (group[0].number !== 1) {
        ol.setAttribute('start', group[0].number.toString());
      }
      
      group.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item.content;
        ol.appendChild(li);
        
        // 元の要素を削除
        if (item.element.parentNode) {
          item.element.parentNode.removeChild(item.element);
        }
      });
      
      // 最初の要素の位置にol要素を挿入
      if (firstItem.parentNode) {
        firstItem.parentNode.insertBefore(ol, firstItem);
      }
    }
  }
  
  // 2. ビュレットポイントの検出と変換
  const bulletItems = container.querySelectorAll('p, div, span');
  const bulletGroups = [];
  let currentGroup = [];
  
  bulletItems.forEach(item => {
    const text = item.textContent.trim();
    if (text.match(/^[•\-\*]\s+(.+)$/)) {
      const content = text.replace(/^[•\-\*]\s+/, '');
      currentGroup.push({ element: item, content });
    } else if (currentGroup.length > 0) {
      bulletGroups.push(currentGroup);
      currentGroup = [];
    }
  });
  
  if (currentGroup.length > 0) {
    bulletGroups.push(currentGroup);
  }
  
  // ビュレットポイントをul要素に変換
  bulletGroups.forEach(group => {
    if (group.length > 0) {
      const ul = document.createElement('ul');
      
      group.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item.content;
        ul.appendChild(li);
        
        // 元の要素を削除
        if (item.element.parentNode) {
          item.element.parentNode.removeChild(item.element);
        }
      });
      
      // 最初の要素の位置にul要素を挿入
      const firstItem = group[0].element;
      if (firstItem.parentNode) {
        firstItem.parentNode.insertBefore(ul, firstItem);
      }
    }
  });
  
  // 3. 既存のli要素をul/olで適切に囲む
  const orphanedLis = container.querySelectorAll('li');
  orphanedLis.forEach(li => {
    if (!li.parentNode || !['UL', 'OL'].includes(li.parentNode.tagName)) {
      const ul = document.createElement('ul');
      li.parentNode.insertBefore(ul, li);
      ul.appendChild(li);
    }
  });
}

// コードブロックを正規化（改行保持）
function normalizeCodeBlocks(container) {
  // preタグ内のテキストの改行を保持
  const preElements = container.querySelectorAll('pre');
  preElements.forEach(pre => {
    // 改行を明示的に保持
    const text = pre.textContent;
    pre.innerHTML = ''; // 内容をクリア
    
    const codeElement = document.createElement('code');
    // 改行を保持してテキストを設定
    codeElement.textContent = text;
    pre.appendChild(codeElement);
  });
  
  // コードブロックパターンの検出（```で囲まれたテキスト）
  const textNodes = getTextNodes(container);
  textNodes.forEach(textNode => {
    const text = textNode.textContent;
    const codeBlockPattern = /```(\w*)\n([\s\S]*?)\n```/g;
    
    if (codeBlockPattern.test(text)) {
      const newHTML = text.replace(codeBlockPattern, (match, language, code) => {
        const lang = language || 'text';
        return `<pre><code class="language-${lang}">${escapeHtml(code)}</code></pre>`;
      });
      
      // テキストノードをHTMLに置換
      const wrapper = document.createElement('div');
      wrapper.innerHTML = newHTML;
      
      while (wrapper.firstChild) {
        textNode.parentNode.insertBefore(wrapper.firstChild, textNode);
      }
      textNode.parentNode.removeChild(textNode);
    }
  });
}

// テキストノードを取得
function getTextNodes(node) {
  const textNodes = [];
  const walker = document.createTreeWalker(
    node,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  let textNode;
  while (textNode = walker.nextNode()) {
    textNodes.push(textNode);
  }
  
  return textNodes;
}

// HTMLエスケープ
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