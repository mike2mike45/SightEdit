// Markdown処理モジュール
import TurndownService from 'turndown';
import { marked } from 'marked';

// ==========================================
// 解決策1: HTMLからMarkdownへの変換設定
// ==========================================

// Turndownサービスのインスタンス作成
const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '*'
});

// カスタムルールの追加
// 取り消し線
turndownService.addRule('strikethrough', {
  filter: ['del', 's', 'strike'],
  replacement: (content) => {
    return '~~' + content + '~~';
  }
});

// タスクリスト
turndownService.addRule('taskListItem', {
  filter: (node) => {
    return node.tagName === 'LI' && 
           (node.getAttribute('data-type') === 'taskItem' ||
            node.classList.contains('task-list-item') ||
            node.querySelector('input[type="checkbox"]'));
  },
  replacement: (content, node) => {
    // チェック状態を判定
    const isChecked = node.getAttribute('data-checked') === 'true' ||
                     node.querySelector('input[type="checkbox"]:checked') !== null;
    const checkbox = isChecked ? '[x]' : '[ ]';
    
    // input要素とlabel要素のテキスト内容を取得
    let taskText = content;
    
    // input要素を除去
    taskText = taskText.replace(/<input[^>]*>/gi, '');
    // 既存のチェックボックス記法を除去
    taskText = taskText.replace(/^\s*(\[[ x]\]|\☐|\☑)\s*/i, '');
    // 余分な空白を削除
    taskText = taskText.replace(/^\s+|\s+$/g, '');
    
    // タスクテキストが空でないことを確認
    if (!taskText) {
      // label内のdivやspanからテキストを抽出
      const textNode = node.querySelector('div, span');
      if (textNode) {
        taskText = textNode.textContent || '';
      } else {
        taskText = node.textContent || '';
        // input要素のテキストは除去
        taskText = taskText.replace(/^\s*(\[[ x]\]|\☐|\☑)\s*/i, '');
      }
      taskText = taskText.trim();
    }
    
    return '- ' + checkbox + ' ' + taskText + '\n';
  }
});

// タスクリスト（ul要素）
turndownService.addRule('taskList', {
  filter: (node) => {
    return node.tagName === 'UL' && 
           (node.getAttribute('data-type') === 'taskList' ||
            node.classList.contains('task-list') ||
            node.querySelector('li[data-type="taskItem"], li.task-list-item, li input[type="checkbox"]'));
  },
  replacement: (content, node) => {
    // タスクリストの場合、個々のリストアイテムは既にtaskListItemルールで処理されているので
    // 単純に内容を返す
    return '\n' + content + '\n';
  }
});

// 水平線のカスタムルール
turndownService.addRule('horizontalRule', {
  filter: 'hr',
  replacement: (content, node) => {
    const style = node.getAttribute('data-hr-style');
    switch(style) {
      case '***':
        return '\n\n***\n\n';
      case '___':
        return '\n\n___\n\n';
      default:
        return '\n\n---\n\n';
    }
  }
});

// テーブルサポート
turndownService.keep(['table', 'thead', 'tbody', 'tr', 'th', 'td']);

// 改行の処理
turndownService.addRule('lineBreak', {
  filter: 'br',
  replacement: () => '  \n'
});

// ==========================================
// 解決策2: コードブロックの言語指定を保持
// ==========================================
turndownService.addRule('codeBlock', {
  filter: (node) => {
    return node.tagName === 'PRE' && node.firstChild && node.firstChild.tagName === 'CODE';
  },
  replacement: (content, node) => {
    const codeElement = node.querySelector('code');
    const language = codeElement.className.replace(/language-/, '') || '';
    const code = codeElement.textContent;
    return '\n```' + language + '\n' + code + '\n```\n';
  }
});

// インラインコード
turndownService.addRule('inlineCode', {
  filter: (node) => {
    return node.tagName === 'CODE' && 
           (!node.parentNode || node.parentNode.tagName !== 'PRE');
  },
  replacement: (content, node) => {
    return '`' + node.textContent + '`';
  }
});

// HTMLからMarkdownへの変換
export function htmlToMarkdown(html) {
  // TipTapの属性を削除する前に、必要な情報を保持
  let processedHtml = html;
  
  // タスクリスト項目を直接Markdownに変換（turndownServiceより先に処理）
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = processedHtml;
  
  // タスクリストを検出してMarkdownに変換
  const taskLists = tempDiv.querySelectorAll('ul[data-type="taskList"], ul.task-list');
  taskLists.forEach(ul => {
    const taskItems = ul.querySelectorAll('li[data-type="taskItem"], li.task-list-item');
    let markdownItems = '';
    
    taskItems.forEach(li => {
      const isChecked = li.getAttribute('data-checked') === 'true' || 
                       li.querySelector('input[type="checkbox"]:checked') !== null;
      const checkbox = isChecked ? '[x]' : '[ ]';
      
      // テキスト内容を取得（input要素以外から）
      let text = '';
      const textContainer = li.querySelector('span, div:not(:has(input))');
      if (textContainer) {
        text = textContainer.textContent || '';
      } else {
        text = li.textContent || '';
        // input要素のテキストは除去
        const inputText = li.querySelector('input');
        if (inputText) {
          text = text.replace(inputText.textContent || '', '');
        }
      }
      text = text.trim();
      
      if (text) {
        markdownItems += `- ${checkbox} ${text}\n`;
      }
    });
    
    if (markdownItems) {
      const placeholder = `__TASK_LIST_${Date.now()}_${Math.random()}__`;
      ul.outerHTML = placeholder;
      processedHtml = processedHtml.replace(placeholder, '\n\n' + markdownItems.trim() + '\n\n');
    }
  });
  
  // 他のHTML要素は通常通りturndownServiceで処理
  // TipTapの余分な属性を削除
  processedHtml = processedHtml
    .replace(/data-(?!hr-style)[^=]+=["'][^"']*["']/g, '')
    .replace(/class=["'][^"']*["']/g, '')
    .replace(/style=["'][^"']*["']/g, '')
    .replace(/\s+>/g, '>')
    .replace(/>\s+</g, '><');
  
  const markdown = turndownService.turndown(processedHtml);
  
  return markdown;
}

// ==========================================
// 解決策3: MarkdownからHTMLへの変換で水平線の形式を保持
// ==========================================
export function markdownToHtml(markdown) {
  // インラインコード内のHTMLエンティティを保護
  const codeBlocks = [];
  let protectedMarkdown = markdown;
  
  // インラインコードを一時的に置き換え
  protectedMarkdown = protectedMarkdown.replace(/`([^`]+)`/g, (match, code) => {
    codeBlocks.push(code);
    return `__INLINE_CODE_${codeBlocks.length - 1}__`;
  });
  
  // タスクリストの前処理（markedがタスクリストを認識できるようにする）
  let processedMarkdown = protectedMarkdown;
  
  // GitHub style task lists を標準的な形式に変換
  processedMarkdown = processedMarkdown.replace(/^(\s*)[-*+]\s+\[([x ])\]\s+(.+)$/gmi, (match, indent, checked, text) => {
    return `${indent}- [${checked.toLowerCase()}] ${text}`;
  });
  
  // 行末の2つのスペースを改行として処理するための前処理
  processedMarkdown = processedMarkdown.replace(/  \n/g, '<br>\n');
  // 行末の2つのスペースも処理
  processedMarkdown = processedMarkdown.replace(/  $/gm, '<br>');
  
  // インラインコードを復元
  processedMarkdown = processedMarkdown.replace(/__INLINE_CODE_(\d+)__/g, (match, index) => {
    return '`' + codeBlocks[parseInt(index)] + '`';
  });
  
  // 水平線の形式を検出して保存
  const hrPatterns = [
    { pattern: /^---+$/gm, style: '---' },
    { pattern: /^\*\*\*+$/gm, style: '***' },
    { pattern: /^___+$/gm, style: '___' }
  ];
  
  let hrStyles = [];
  
  // 各パターンを検出して記録
  hrPatterns.forEach(({ pattern, style }) => {
    processedMarkdown = processedMarkdown.replace(pattern, (match) => {
      hrStyles.push(style);
      return `[HR_PLACEHOLDER_${hrStyles.length - 1}]`;
    });
  });
  
  // markedの設定
  marked.setOptions({
    breaks: true,
    gfm: true,
    tables: true,
    pedantic: false,
    smartLists: true,
    smartypants: false
  });

  // タスクリストを直接処理（より確実な方法）
  // まず連続するタスクリストを検出してグループ化
  const taskListPattern = /^(\s*)((?:[-*+]\s+\[[x ]\]\s+.+(?:\n|$))+)/gmi;
  processedMarkdown = processedMarkdown.replace(taskListPattern, (match, indent, taskItems) => {
    const listItems = taskItems.trim().split('\n').map(line => {
      const itemMatch = line.match(/^(\s*)[-*+]\s+\[([x ])\]\s+(.+)$/);
      if (itemMatch) {
        const [, itemIndent, checked, text] = itemMatch;
        const isChecked = checked.toLowerCase() === 'x';
        const checkedAttr = isChecked ? 'data-checked="true"' : 'data-checked="false"';
        const checkboxInput = isChecked 
          ? '<input type="checkbox" checked disabled style="margin: 0; flex-shrink: 0;" />' 
          : '<input type="checkbox" disabled style="margin: 0; flex-shrink: 0;" />';
        
        return `<li data-type="taskItem" ${checkedAttr} style="margin: 4px 0; list-style: none;"><label style="display: flex; align-items: flex-start; width: 100%; cursor: pointer; gap: 8px;">${checkboxInput}${text}</label></li>`;
      }
      return '';
    }).filter(Boolean).join('\n');
    
    return `${indent}<ul data-type="taskList" style="list-style: none; padding-left: 0;">\n${listItems}\n</ul>\n`;
  });

  // カスタムレンダラー
  const renderer = new marked.Renderer();
  
  // テキストのレンダリング - 二重エスケープを処理
  renderer.text = function(text) {
    // 二重エスケープの処理
    // &amp;lt; → &lt; → <
    // &amp;gt; → &gt; → >
    let processedText = text
      .replace(/&amp;lt;/gi, '&lt;')
      .replace(/&amp;gt;/gi, '&gt;')
      .replace(/&amp;amp;/gi, '&amp;');
    
    return processedText;
  };
  
  // HTMLタグの処理方法を改善
  renderer.html = function(html) {
    // HTMLタグをそのまま通す（エスケープしない）
    return html;
  };
  
  // パラグラフのレンダリング
  renderer.paragraph = function(text) {
    // <code>タグで囲まれた部分を保護（すでにレンダリング済みのインラインコード）
    const codeProtected = [];
    let protectedText = text.replace(/<code>([^<]*)<\/code>/g, (match) => {
      codeProtected.push(match);
      return `__CODE_PROTECTED_${codeProtected.length - 1}__`;
    });
    
    // 二重エスケープされている場合も処理（ただし保護された部分以外）
    protectedText = protectedText
      .replace(/&amp;lt;/gi, '&lt;')
      .replace(/&amp;gt;/gi, '&gt;')
      .replace(/&amp;amp;/gi, '&amp;');
    
    // 保護されていない部分のHTMLエンティティをデコード
    protectedText = protectedText
      .replace(/&lt;br\s*\/?&gt;/gi, '<br>')
      .replace(/&lt;(\/?)hr\s*\/?&gt;/gi, '<$1hr>')
      .replace(/&lt;(\/?)details&gt;/gi, '<$1details>')
      .replace(/&lt;(\/?)summary&gt;/gi, '<$1summary>');
    
    // 保護したコード部分を復元
    codeProtected.forEach((code, index) => {
      protectedText = protectedText.replace(`__CODE_PROTECTED_${index}__`, code);
    });
    
    return '<p>' + protectedText + '</p>\n';
  };
  
  // 引用ブロックのレンダリング
  renderer.blockquote = function(quote) {
    // 引用内でも二重エスケープを処理
    let processedQuote = quote
      .replace(/&amp;lt;/gi, '&lt;')
      .replace(/&amp;gt;/gi, '&gt;')
      .replace(/&amp;amp;/gi, '&amp;')
      .replace(/&lt;br\s*\/?&gt;/gi, '<br>');
    
    return '<blockquote>\n' + processedQuote + '</blockquote>\n';
  };
  
  // 見出しのレンダリング
  renderer.heading = function(text, level) {
    // 見出し内でも二重エスケープを処理
    let processedText = text
      .replace(/&amp;lt;/gi, '&lt;')
      .replace(/&amp;gt;/gi, '&gt;')
      .replace(/&amp;amp;/gi, '&amp;')
      .replace(/&lt;br\s*\/?&gt;/gi, '<br>');
    
    return `<h${level}>${processedText}</h${level}>`;
  };
  
  // リンクのレンダリング
  renderer.link = function(href, title, text) {
    const titleAttr = title ? ` title="${title}"` : '';
    return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
  };
  
  // 画像のレンダリング
  renderer.image = function(href, title, text) {
    const titleAttr = title ? ` title="${title}"` : '';
    return `<img src="${href}" alt="${text}"${titleAttr} />`;
  };
  
  // 水平線のレンダリング（カスタム）
  let hrIndex = 0;
  renderer.hr = function() {
    const style = hrStyles[hrIndex] || '---';
    hrIndex++;
    return `<hr data-hr-style="${style}" />`;
  };
  
  // コードブロックのレンダリング
  renderer.code = function(code, language) {
    const lang = language || 'text';
    const escapedCode = escapeHtml(code);
    return `<pre><code class="language-${lang}">${escapedCode}</code></pre>`;
  };
  
  // インラインコードのレンダリング
  renderer.codespan = function(code) {
    // デバッグ: 実際に何が渡されているか確認
    console.log('インラインコード内容:', code);
    
    // 二重エスケープを修正
    // &amp;lt; → &lt;
    // &amp;gt; → &gt;
    let processedCode = code
      .replace(/&amp;lt;/g, '&lt;')
      .replace(/&amp;gt;/g, '&gt;')
      .replace(/&amp;quot;/g, '&quot;')
      .replace(/&amp;#39;/g, '&#39;')
      .replace(/&amp;amp;/g, '&amp;');
    
    console.log('処理後:', processedCode);
    
    // すでにエスケープされているのでそのまま返す
    return `<code>${processedCode}</code>`;
  };
  
  // リストアイテムのレンダリング（タスクリスト対応）
  renderer.listitem = function(text, task, checked) {
    // <code>タグで囲まれた部分を保護
    const codeProtected = [];
    let processedText = text.replace(/<code>([^<]*)<\/code>/g, (match) => {
      codeProtected.push(match);
      return `__CODE_PROTECTED_${codeProtected.length - 1}__`;
    });
    
    // 二重エスケープも処理
    processedText = processedText
      .replace(/&amp;lt;/gi, '&lt;')
      .replace(/&amp;gt;/gi, '&gt;')
      .replace(/&amp;amp;/gi, '&amp;');
    
    processedText = processedText
      .replace(/&lt;br\s*\/?&gt;/gi, '<br>')
      .replace(/&lt;(\/?)hr\s*\/?&gt;/gi, '<$1hr>');
    
    codeProtected.forEach((code, index) => {
      processedText = processedText.replace(`__CODE_PROTECTED_${index}__`, code);
    });
    
    // タスクリスト項目かどうかをより厳密に判定
    const isTaskItem = task === true || text.match(/^\s*\[([x ])\]\s/);
    
    if (isTaskItem) {
      // タスクリスト項目の場合
      let taskChecked = checked;
      let taskText = processedText;
      
      // テキスト内にタスクリスト記法があれば解析
      const taskMatch = processedText.match(/^\s*\[([x ])\]\s+(.*)/);
      if (taskMatch) {
        taskChecked = taskMatch[1].toLowerCase() === 'x';
        taskText = taskMatch[2];
      }
      
      const checkedAttr = taskChecked ? 'data-checked="true"' : 'data-checked="false"';
      const checkbox = taskChecked 
        ? '<input type="checkbox" checked disabled />' 
        : '<input type="checkbox" disabled />';
      
      return `<li data-type="taskItem" ${checkedAttr} class="task-list-item" style="list-style: none; margin: 4px 0;"><label style="display: flex; align-items: flex-start; width: 100%; gap: 8px; margin: 0; padding: 0;">${checkbox}${taskText}</label></li>`;
    }
    return `<li>${processedText}</li>`;
  };
  
  // リストのレンダリング
  renderer.list = function(body, ordered, start) {
    const type = ordered ? 'ol' : 'ul';
    const isTaskList = body.includes('data-type="taskItem"');
    
    if (isTaskList) {
      return `<ul data-type="taskList" class="task-list" style="list-style: none !important; padding-left: 0;">${body}</ul>`;
    }
    
    const startAttr = ordered && start !== 1 ? ` start="${start}"` : '';
    return `<${type}${startAttr}>${body}</${type}>`;
  };
  
  // テーブルのレンダリング（配置指定対応）
  renderer.table = function(header, body) {
    return '<table>\n' +
      '<thead>\n' +
      header +
      '</thead>\n' +
      '<tbody>\n' +
      body +
      '</tbody>\n' +
      '</table>\n';
  };
  
  renderer.tablerow = function(content) {
    return '<tr>\n' + content + '</tr>\n';
  };
  
  renderer.tablecell = function(content, flags) {
    const type = flags.header ? 'th' : 'td';
    const alignStyle = flags.align ? ` style="text-align: ${flags.align};"` : '';
    
    // テーブルセル内でも二重エスケープを処理
    let processedContent = content
      .replace(/&amp;lt;/gi, '&lt;')
      .replace(/&amp;gt;/gi, '&gt;')
      .replace(/&amp;amp;/gi, '&amp;')
      .replace(/&lt;br\s*\/?&gt;/gi, '<br>');
    
    return `<${type}${alignStyle}>${processedContent}</${type}>\n`;
  };

  marked.use({ renderer });

  // ネストしたマークを処理するためのプリプロセッシング
  processedMarkdown = preprocessNestedMarks(processedMarkdown);
  
  // プレースホルダーを水平線のMarkdownに戻す
  processedMarkdown = processedMarkdown.replace(/\[HR_PLACEHOLDER_(\d+)\]/g, (match, index) => {
    return hrStyles[parseInt(index)] || '---';
  });
  
  return marked.parse(processedMarkdown);
}

// ネストしたマークをプリプロセッシング
function preprocessNestedMarks(markdown) {
  // ~~**text**~~ のようなパターンを正しく処理
  return markdown
    // ~~***text***~~ → <del><strong><em>text</em></strong></del>
    .replace(/~~\*\*\*(.*?)\*\*\*~~/g, '<del><strong><em>$1</em></strong></del>')
    // ***~~text~~*** → <strong><em><del>text</del></em></strong>
    .replace(/\*\*\*~~(.*?)~~\*\*\*/g, '<strong><em><del>$1</del></em></strong>')
    // ~~**text**~~ → <del><strong>text</strong></del>
    .replace(/~~\*\*(.*?)\*\*~~/g, '<del><strong>$1</strong></del>')
    // **~~text~~** → <strong><del>text</del></strong>
    .replace(/\*\*~~(.*?)~~\*\*/g, '<strong><del>$1</del></strong>')
    // ~~*text*~~ → <del><em>text</em></del>
    .replace(/~~\*(.*?)\*~~/g, '<del><em>$1</em></del>')
    // *~~text~~* → <em><del>text</del></em>
    .replace(/\*~~(.*?)~~\*/g, '<em><del>$1</del></em>')
    // **_text_** → <strong><em>text</em></strong>
    .replace(/\*\*_(.*?)_\*\*/g, '<strong><em>$1</em></strong>')
    // _**text**_ → <em><strong>text</strong></em>
    .replace(/_\*\*(.*?)\*\*_/g, '<em><strong>$1</strong></em>')
    // ***text*** → <strong><em>text</em></strong>
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
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