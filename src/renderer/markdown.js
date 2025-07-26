import TurndownService from 'turndown';
import { marked } from 'marked';

// TurndownServiceの設定
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  hr: '---'
});

// ネストしたマークのカスタムルール（強制的に正しい順序で処理）
turndownService.addRule('nestedMarks', {
  filter: (node) => {
    // strong, em, s, delタグをチェック
    return ['STRONG', 'B', 'EM', 'I', 'S', 'STRIKE', 'DEL'].includes(node.tagName);
  },
  replacement: (content, node) => {
    const tagName = node.tagName.toLowerCase();
    
    // ネストしたマークを適切に処理
    switch (tagName) {
      case 'strong':
      case 'b':
        return `**${content}**`;
      case 'em':
      case 'i':
        return `*${content}*`;
      case 's':
      case 'strike':
      case 'del':
        return `~~${content}~~`;
      default:
        return content;
    }
  }
});

// タスクリストのカスタムルール
turndownService.addRule('taskListItem', {
  filter: (node) => {
    return node.tagName === 'LI' && 
           node.getAttribute('data-type') === 'taskItem';
  },
  replacement: (content, node) => {
    const isChecked = node.getAttribute('data-checked') === 'true';
    const check = isChecked ? '[x]' : '[ ]';
    const text = content.trim();
    return `- ${check} ${text}\n`;
  }
});

// テーブルのカスタムルール
turndownService.addRule('table', {
  filter: 'table',
  replacement: (content, node) => {
    const rows = Array.from(node.querySelectorAll('tr'));
    if (rows.length === 0) return '';
    
    let markdown = '\n';
    
    rows.forEach((row, rowIndex) => {
      const cells = Array.from(row.querySelectorAll('th, td'));
      const cellContents = cells.map(cell => cell.textContent.trim());
      markdown += '| ' + cellContents.join(' | ') + ' |\n';
      
      // ヘッダー行の後にセパレーターを追加
      if (rowIndex === 0) {
        const separator = cells.map(() => '---').join(' | ');
        markdown += '| ' + separator + ' |\n';
      }
    });
    
    return markdown + '\n';
  }
});

// コードブロックのカスタムルール
turndownService.addRule('codeBlock', {
  filter: (node) => {
    return node.tagName === 'PRE' && 
           node.firstChild && 
           node.firstChild.tagName === 'CODE';
  },
  replacement: (content, node) => {
    const codeElement = node.querySelector('code');
    const language = codeElement.getAttribute('class')?.replace('language-', '') || '';
    const code = codeElement.textContent;
    return '\n```' + language + '\n' + code + '\n```\n';
  }
});

// HTMLからMarkdownへの変換
export function htmlToMarkdown(html) {
  // TipTapの属性を削除
  const cleanHtml = html
    .replace(/data-[^=]+=["'][^"']*["']/g, '')
    .replace(/class=["'][^"']*["']/g, '')
    .replace(/\s+>/g, '>')
    .replace(/>\s+</g, '><');
  
  return turndownService.turndown(cleanHtml);
}

// MarkdownからHTMLへの変換（ネストしたマーク対応）
export function markdownToHtml(markdown) {
  // markedの設定
  marked.setOptions({
    breaks: true,
    gfm: true,
    tables: true,
    pedantic: false,
    smartLists: true,
    smartypants: false
  });

  // カスタムレンダラー
  const renderer = new marked.Renderer();
  
  // 見出しのレンダリング
  renderer.heading = function(text, level) {
    return `<h${level}>${text}</h${level}>`;
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
  
  // コードブロックのレンダリング
  renderer.code = function(code, language) {
    const lang = language || 'text';
    const escapedCode = escapeHtml(code);
    return `<pre><code class="language-${lang}">${escapedCode}</code></pre>`;
  };
  
  // リストアイテムのレンダリング（タスクリスト対応）
  renderer.listitem = function(text, task, checked) {
    if (task) {
      const checkedAttr = checked ? 'data-checked="true"' : 'data-checked="false"';
      return `<li data-type="taskItem" ${checkedAttr}>${text}</li>`;
    }
    return `<li>${text}</li>`;
  };
  
  // リストのレンダリング
  renderer.list = function(body, ordered, start) {
    const type = ordered ? 'ol' : 'ul';
    const isTaskList = body.includes('data-type="taskItem"');
    const classAttr = isTaskList ? ' class="task-list"' : '';
    const startAttr = ordered && start !== 1 ? ` start="${start}"` : '';
    return `<${type}${classAttr}${startAttr}>${body}</${type}>`;
  };

  marked.use({ renderer });

  // ネストしたマークを処理するためのプリプロセッシング
  let processedMarkdown = preprocessNestedMarks(markdown);
  
  return marked.parse(processedMarkdown);
}

// ネストしたマークをプリプロセッシング
function preprocessNestedMarks(markdown) {
  // ~~**text**~~ のようなパターンを正しく処理
  return markdown
    // ~~**text**~~ → <del><strong>text</strong></del>
    .replace(/~~\*\*(.*?)\*\*~~/g, '<del><strong>$1</strong></del>')
    // **~~text~~** → <strong><del>text</del></strong>
    .replace(/\*\*~~(.*?)~~\*\*/g, '<strong><del>$1</del></strong>')
    // ~~*text*~~ → <del><em>text</em></del>
    .replace(/~~\*(.*?)\*~~/g, '<del><em>$1</em></del>')
    // *~~text~~* → <em><del>text</del></em>
    .replace(/\*~~(.*?)~~\*/g, '<em><del>$1</del></em>')
    // ***~~text~~*** → <strong><em><del>text</del></em></strong>
    .replace(/\*\*\*~~(.*?)~~\*\*\*/g, '<strong><em><del>$1</del></em></strong>')
    // ~~***text***~~ → <del><strong><em>text</em></strong></del>
    .replace(/~~\*\*\*(.*?)\*\*\*~~/g, '<del><strong><em>$1</em></strong></del>');
}

// HTMLエスケープ用のヘルパー関数
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