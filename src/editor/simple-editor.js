// SightEdit Simple Editor - Chrome Extension版
// TipTapの代わりに基本的なtextareaベースのエディターを使用

class SimpleMarkdownEditor {
  constructor() {
    this.currentFileName = null;
    this.isSourceMode = false;
    this.init();
  }

  // MarkdownテキストをHTMLに変換
  markdownToHtml(markdown) {
    if (!markdown) return '';

    let html = markdown;

    // HTMLタグを一時的に保護
    const htmlTags = {};
    let htmlIndex = 0;
    html = html.replace(/<[^>]+>/g, (match) => {
      const placeholder = `__HTML_${htmlIndex++}__`;
      htmlTags[placeholder] = match;
      return placeholder;
    });

    // エスケープ文字を一時的に保護
    const escapes = {};
    let escapeIndex = 0;
    html = html.replace(/\\(.)/g, (match, char) => {
      const placeholder = `__ESCAPE_${escapeIndex++}__`;
      escapes[placeholder] = char;
      return placeholder;
    });

    // 1. コードブロック（最優先で処理）
    html = html.replace(/```([a-zA-Z0-9]*)\n?([\s\S]*?)```/g, (match, lang, code) => {
      let processedCode = code.trim()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      if (lang === 'javascript' || lang === 'js' || lang === 'typescript' || lang === 'ts') {
        processedCode = this.addBasicSyntaxHighlight(processedCode);
      }

      const language = lang ? ` class="language-${lang}" data-lang="${lang}"` : '';
      return `<pre><code${language}>${processedCode}</code></pre>`;
    });

    // 2. インラインコード（コードブロック後に処理）
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 3. タスクリスト（チェックボックス）
    html = html.replace(/^\s*-\s+\[x\]\s+(.+)$/gm, '<div class="task-item"><input type="checkbox" checked class="task-checkbox"> <span class="task-text" style="text-decoration: line-through">$1</span></div>');
    html = html.replace(/^\s*-\s+\[\s\]\s+(.+)$/gm, '<div class="task-item"><input type="checkbox" class="task-checkbox"> <span class="task-text">$1</span></div>');

    // 4. 表（テーブル）処理
    html = this.processTable(html);

    // 5. 見出し（h1-h6）
    html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

    // 6. 水平線
    html = html.replace(/^---+$/gm, '<hr>');

    // 7. 引用
    html = html.replace(/^>\s*(.+)$/gm, '<blockquote>$1</blockquote>');

    // 8. リスト処理
    html = html.replace(/^[\*\-\+]\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*?<\/li>(\s*<li>.*?<\/li>)*)/gm, '<ul>$1</ul>');
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li class="ordered">$1</li>');
    html = html.replace(/(<li class="ordered">.*?<\/li>(\s*<li class="ordered">.*?<\/li>)*)/gm, '<ol>$1</ol>');
    html = html.replace(/class="ordered"/g, '');

    // 9. 太字・斜体（エスケープされたアスタリスクを除外）
    html = html.replace(/(?<!\\)\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/(?<!\\)\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/(?<!\\)\*([^*\s][^*]*[^*\s]|\w)\*/g, '<em>$1</em>');

    // 10. 取り消し線
    html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');

    // 11. 画像（クリック可能・編集可能）- リンクより先に処理
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="editable-image" data-alt="$1" data-src="$2" style="max-width: 100%; height: auto; cursor: pointer; display: inline-block; border-radius: 4px;">');

    // 12. リンク（クリック可能・編集可能）
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="editable-link" data-text="$1" data-url="$2">$1</a>');

    // 13. 段落処理
    const lines = html.split('\n');
    const processed = [];
    let currentParagraph = [];

    for (const line of lines) {
      if (line.trim() === '') {
        if (currentParagraph.length > 0) {
          const paragraphContent = currentParagraph.join('\n').trim();
          if (paragraphContent && !this.isBlockElement(paragraphContent)) {
            processed.push(`<p>${paragraphContent}</p>`);
          } else {
            processed.push(paragraphContent);
          }
          currentParagraph = [];
        }
      } else {
        if (this.isBlockElement(line)) {
          if (currentParagraph.length > 0) {
            const paragraphContent = currentParagraph.join('\n').trim();
            if (paragraphContent) {
              processed.push(`<p>${paragraphContent}</p>`);
            }
            currentParagraph = [];
          }
          processed.push(line);
        } else {
          currentParagraph.push(line);
        }
      }
    }

    if (currentParagraph.length > 0) {
      const paragraphContent = currentParagraph.join('\n').trim();
      if (paragraphContent && !this.isBlockElement(paragraphContent)) {
        processed.push(`<p>${paragraphContent}</p>`);
      } else if (paragraphContent) {
        processed.push(paragraphContent);
      }
    }

    html = processed.join('\n');

    // 改行処理（HTMLタグ復元前に実行）
    html = html.replace(/  \n/g, '<br>\n');

    // HTMLタグを復元
    for (const [placeholder, tag] of Object.entries(htmlTags)) {
      html = html.replace(new RegExp(placeholder, 'g'), tag);
    }

    // エスケープ文字を復元
    for (const [placeholder, char] of Object.entries(escapes)) {
      html = html.replace(new RegExp(placeholder, 'g'), char);
    }

    // エスケープされたBRタグを復元
    html = html.replace(/&lt;br&gt;/gi, '<br>');

    return html;
  }

  // テーブル処理
  processTable(html) {
    const lines = html.split('\n');
    const processed = [];
    let inTable = false;
    let tableRows = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.includes('|') && line.length > 2) {
        if (!inTable) {
          // テーブル開始をチェック
          const nextLine = lines[i + 1];
          if (nextLine && nextLine.includes('|') && (nextLine.includes('-') || nextLine.includes(':'))) {
            inTable = true;
            tableRows = [];
          }
        }

        if (inTable) {
          tableRows.push(line);

          // 区切り行の次がテーブル行でない場合、テーブル終了
          const nextLine = lines[i + 1];
          if (!nextLine || (!nextLine.trim().includes('|') && nextLine.trim().length > 0)) {
            processed.push(this.convertToTable(tableRows));
            inTable = false;
            tableRows = [];
          }
        } else {
          processed.push(line);
        }
      } else {
        if (inTable) {
          processed.push(this.convertToTable(tableRows));
          inTable = false;
          tableRows = [];
        }
        processed.push(line);
      }
    }

    if (inTable && tableRows.length > 0) {
      processed.push(this.convertToTable(tableRows));
    }

    return processed.join('\n');
  }

  // テーブル変換
  convertToTable(rows) {
    if (rows.length < 2) return rows.join('\n');

    const headerRow = rows[0];
    const separatorRow = rows[1];
    const dataRows = rows.slice(2);

    // 配置情報を取得
    const alignments = separatorRow.split('|').map(cell => {
      const trimmed = cell.trim();
      if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center';
      if (trimmed.endsWith(':')) return 'right';
      return 'left';
    }).filter(align => align);

    // ヘッダー行を処理
    const headers = headerRow.split('|').map(cell => cell.trim()).filter(cell => cell);
    const headerHtml = headers.map((header, i) => {
      const align = alignments[i] || 'left';
      return `<th style="text-align: ${align}">${header}</th>`;
    }).join('');

    // データ行を処理
    const dataHtml = dataRows.map(row => {
      const cells = row.split('|').map(cell => cell.trim()).filter(cell => cell);
      return `<tr>${cells.map((cell, i) => {
        const align = alignments[i] || 'left';
        return `<td style="text-align: ${align}">${cell}</td>`;
      }).join('')}</tr>`;
    }).join('');

    return `<table class="markdown-table"><thead><tr>${headerHtml}</tr></thead><tbody>${dataHtml}</tbody></table>`;
  }

  // ブロック要素かどうかを判定
  isBlockElement(line) {
    return /^<(h[1-6]|pre|code|blockquote|ul|ol|li|hr|div|table|thead|tbody|tr|th|td|img)/.test(line.trim()) ||
           /^<\/(h[1-6]|pre|code|blockquote|ul|ol|li|hr|div|table|thead|tbody|tr|th|td)>/.test(line.trim()) ||
           /<table|<\/table>|<thead|<\/thead>|<tbody|<\/tbody>|class="task-item"|class="editable-/.test(line);
  }

  // 基本的なシンタックスハイライト
  addBasicSyntaxHighlight(code) {
    return code
      // JavaScript キーワード
      .replace(/\b(function|const|let|var|if|else|for|while|return|class|import|export|from|default|async|await|try|catch|finally|throw|new|this|super|extends|static|public|private|protected)\b/g, '<span class="keyword">$1</span>')

      // 文字列
      .replace(/(["'])((?:\\.|(?!\1)[^\\])*?)\1/g, '<span class="string">$1$2$1</span>')
      .replace(/(`)((?:\\.|[^\\`])*?)(`)/g, '<span class="string">$1$2$3</span>')

      // 数値
      .replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>')

      // 関数名
      .replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g, '<span class="function">$1</span>')

      // コメント
      .replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>')
      .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>');
  }

  // HTMLをMarkdownに変換
  htmlToMarkdown(html) {
    if (!html) return '';

    let markdown = html;

    // 1. コードブロック（先に処理）
    markdown = markdown.replace(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/g, (match, code) => {
      return '```\n' + code.trim() + '\n```';
    });

    // 2. インラインコード
    markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/g, '`$1`');

    // 3. 見出し
    markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/g, '# $1');
    markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/g, '## $1');
    markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/g, '### $1');
    markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/g, '#### $1');
    markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/g, '##### $1');
    markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/g, '###### $1');

    // 4. 太字・斜体
    markdown = markdown.replace(/<strong[^>]*><em[^>]*>(.*?)<\/em><\/strong>/g, '***$1***');
    markdown = markdown.replace(/<em[^>]*><strong[^>]*>(.*?)<\/strong><\/em>/g, '***$1***');
    markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/g, '**$1**');
    markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/g, '**$1**');
    markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/g, '*$1*');
    markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/g, '*$1*');

    // 5. 取り消し線
    markdown = markdown.replace(/<del[^>]*>(.*?)<\/del>/g, '~~$1~~');
    markdown = markdown.replace(/<s[^>]*>(.*?)<\/s>/g, '~~$1~~');

    // 6. リンク
    markdown = markdown.replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/g, '[$2]($1)');

    // 7. 画像
    markdown = markdown.replace(/<img[^>]*src=["']([^"']*)["'][^>]*alt=["']([^"']*)["'][^>]*>/g, '![$2]($1)');
    markdown = markdown.replace(/<img[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']*)["'][^>]*>/g, '![$1]($2)');
    markdown = markdown.replace(/<img[^>]*src=["']([^"']*)["'][^>]*>/g, '![]($1)');

    // 8. リスト
    markdown = markdown.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/g, (match, content) => {
      return content.replace(/<li[^>]*>(.*?)<\/li>/g, '* $1\n').trim();
    });
    markdown = markdown.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/g, (match, content) => {
      let counter = 1;
      return content.replace(/<li[^>]*>(.*?)<\/li>/g, () => `${counter++}. $1\n`).trim();
    });

    // 9. 引用
    markdown = markdown.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/g, '> $1');

    // 10. 水平線
    markdown = markdown.replace(/<hr[^>]*>/g, '---');

    // 11. 段落
    markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/g, '$1\n\n');

    // 12. 改行
    markdown = markdown.replace(/<br[^>]*>/g, '\n');

    // 13. 残りのHTMLタグを除去
    markdown = markdown.replace(/<[^>]*>/g, '');

    // 14. 重複する改行を整理
    markdown = markdown.replace(/\n{3,}/g, '\n\n');

    // 15. HTML entities をデコード
    markdown = markdown
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    return markdown.trim();
  }

  init() {
    this.setupEditor();
    this.setupToolbar();
    this.setupEventListeners();
    this.updateWordCount();
  }

  setupEditor() {
    const editorElement = document.getElementById('editor');
    if (editorElement) {
      // WYSIWYGエディターの代わりにcontentEditableを使用
      editorElement.innerHTML = '<div contenteditable="true" class="wysiwyg-editor-content" id="wysiwyg-content"></div>';

      const content = document.getElementById('wysiwyg-content');
      content.addEventListener('input', () => {
        this.updateWordCount();
      });

      // リンク・画像編集機能
      content.addEventListener('click', (e) => {
        if (e.target.classList.contains('editable-link')) {
          e.preventDefault();
          this.editLink(e.target);
        } else if (e.target.classList.contains('editable-image')) {
          e.preventDefault();
          this.editImage(e.target);
        }
      });

      // フォーカスを設定
      content.focus();
    }
  }

  setupToolbar() {
    // 基本的なMarkdown記法ボタンの設定
    const toolbarButtons = {
      bold: () => this.wrapText('**', '**'),
      italic: () => this.wrapText('*', '*'),
      strike: () => this.wrapText('~~', '~~'),
      code: () => this.wrapText('`', '`'),
      bulletList: () => this.insertAtLineStart('- '),
      orderedList: () => this.insertNumberedList(),
      blockquote: () => this.insertAtLineStart('> '),
      codeBlock: () => this.wrapText('```\n', '\n```'),
      horizontalRule: () => this.insertText('\n---\n'),
      link: () => this.insertLink(),
      image: () => this.insertImage(),
      table: () => this.insertTable(),
      undo: () => document.execCommand('undo'),
      redo: () => document.execCommand('redo')
    };

    // ツールバーボタンのイベントリスナーを設定
    Object.keys(toolbarButtons).forEach(buttonName => {
      const button = document.querySelector(`[data-action="${buttonName}"]`);
      if (button) {
        button.addEventListener('click', (e) => {
          e.preventDefault();
          toolbarButtons[buttonName]();
        });
      }
    });

    // 見出しセレクトボックスの設定
    const headingSelect = document.getElementById('heading-select');
    if (headingSelect) {
      headingSelect.addEventListener('change', (e) => {
        const value = e.target.value;
        if (value === 'p') {
          // 段落は何もしない
        } else if (value) {
          const level = parseInt(value);
          const prefix = '#'.repeat(level) + ' ';
          this.insertAtLineStart(prefix);
        }
        e.target.value = ''; // 選択後にリセット
      });
    }

    // モード切り替えボタン
    const toggleModeBtn = document.getElementById('toggle-mode-btn');
    if (toggleModeBtn) {
      toggleModeBtn.addEventListener('click', () => this.toggleEditMode());
    }

    // 目次生成ボタン
    const tocBtn = document.getElementById('toc-btn');
    if (tocBtn) {
      tocBtn.addEventListener('click', () => this.generateTOC());
    }

    // ヘルプボタン
    const helpBtn = document.getElementById('help-btn');
    if (helpBtn) {
      helpBtn.addEventListener('click', () => this.showHelp());
    }

    // ファイル操作ボタン
    const newFileBtn = document.getElementById('new-file-btn');
    if (newFileBtn) {
      newFileBtn.addEventListener('click', () => this.newFile());
    }

    const openFileBtn = document.getElementById('open-file-btn');
    if (openFileBtn) {
      openFileBtn.addEventListener('click', () => this.openFile());
    }

    const saveFileBtn = document.getElementById('save-file-btn');
    if (saveFileBtn) {
      saveFileBtn.addEventListener('click', () => this.saveFile());
    }

    const saveAsBtn = document.getElementById('save-as-btn');
    if (saveAsBtn) {
      saveAsBtn.addEventListener('click', () => this.saveAsFile());
    }
  }

  wrapText(before, after) {
    const content = document.getElementById('wysiwyg-content');
    const selection = window.getSelection();

    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const selectedText = range.toString();
      const wrappedText = before + selectedText + after;

      range.deleteContents();
      range.insertNode(document.createTextNode(wrappedText));

      // カーソル位置を調整
      range.setStart(range.endContainer, range.endOffset);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    content.focus();
    this.updateWordCount();
  }

  insertAtLineStart(prefix) {
    const content = document.getElementById('wysiwyg-content');
    const selection = window.getSelection();

    if (selection.rangeCount > 0) {
      const text = content.textContent;
      const cursorPos = this.getCaretPosition(content);
      const lineStart = text.lastIndexOf('\n', cursorPos - 1) + 1;

      // プレフィックスを挿入
      const beforeText = text.substring(0, lineStart);
      const afterText = text.substring(lineStart);
      content.textContent = beforeText + prefix + afterText;

      // カーソル位置を調整
      this.setCaretPosition(content, lineStart + prefix.length);
    }

    content.focus();
    this.updateWordCount();
  }

  insertNumberedList() {
    const content = document.getElementById('wysiwyg-content');
    const text = content.textContent;
    const cursorPos = this.getCaretPosition(content);

    // 前の行の番号を確認
    const lines = text.substring(0, cursorPos).split('\n');
    let nextNumber = 1;

    if (lines.length > 1) {
      const prevLine = lines[lines.length - 2];
      const match = prevLine.match(/^(\d+)\./);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    this.insertAtLineStart(`${nextNumber}. `);
  }

  insertText(text) {
    const content = document.getElementById('wysiwyg-content');
    const selection = window.getSelection();

    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
    }

    content.focus();
    this.updateWordCount();
  }

  insertLink() {
    const url = prompt('リンクURLを入力してください:');
    const text = prompt('リンクテキストを入力してください:', 'リンク');

    if (url && text) {
      this.insertText(`[${text}](${url})`);
    }
  }

  insertImage() {
    const url = prompt('画像URLを入力してください:');
    const alt = prompt('画像の説明を入力してください:', '画像');

    if (url && alt) {
      this.insertText(`![${alt}](${url})`);
    }
  }

  insertTable() {
    const tableMarkdown = `\n| ヘッダー1 | ヘッダー2 | ヘッダー3 |\n|-----------|-----------|-----------|\n| セル1     | セル2     | セル3     |\n| セル4     | セル5     | セル6     |\n`;
    this.insertText(tableMarkdown);
  }

  toggleEditMode() {
    const editorContent = document.getElementById('editor');
    const sourceEditor = document.getElementById('source-editor');
    const modeLabel = document.getElementById('editor-mode');

    if (!this.isSourceMode) {
      // WYSIWYG → ソースモード
      const wysiwygContent = document.getElementById('wysiwyg-content');
      const markdown = wysiwygContent ? this.htmlToMarkdown(wysiwygContent.innerHTML) : '';

      sourceEditor.value = markdown;
      editorContent.style.display = 'none';
      sourceEditor.style.display = 'block';
      if (modeLabel) modeLabel.textContent = 'ソースモード';
      this.isSourceMode = true;
      sourceEditor.focus();
    } else {
      // ソース → WYSIWYGモード
      const markdown = sourceEditor.value;
      const wysiwygContent = document.getElementById('wysiwyg-content');

      if (wysiwygContent) {
        wysiwygContent.innerHTML = this.markdownToHtml(markdown);
        // タスクリストのイベントリスナーを設定
        setupTaskListEvents();
      }

      sourceEditor.style.display = 'none';
      editorContent.style.display = 'block';
      if (modeLabel) modeLabel.textContent = 'WYSIWYGモード';
      this.isSourceMode = false;

      if (wysiwygContent) {
        wysiwygContent.focus();
      }
    }

    this.updateWordCount();
  }

  generateTOC() {
    const content = this.getCurrentContent();
    const lines = content.split('\n');
    const headings = [];

    lines.forEach(line => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2];
        headings.push({ level, text });
      }
    });

    if (headings.length === 0) {
      alert('見出しが見つかりません。見出しを追加してから目次を生成してください。');
      return;
    }

    let toc = '## 目次\n\n';
    headings.forEach(heading => {
      const indent = '  '.repeat(heading.level - 1);
      const anchor = heading.text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      toc += `${indent}- [${heading.text}](#${anchor})\n`;
    });

    // 先頭に目次を挿入
    this.insertAtBeginning(toc + '\n');
  }

  insertAtBeginning(text) {
    if (this.isSourceMode) {
      const sourceEditor = document.getElementById('source-editor');
      sourceEditor.value = text + sourceEditor.value;
    } else {
      const wysiwygContent = document.getElementById('wysiwyg-content');
      if (wysiwygContent) {
        const currentHtml = wysiwygContent.innerHTML;
        const newMarkdown = text + this.htmlToMarkdown(currentHtml);
        wysiwygContent.innerHTML = this.markdownToHtml(newMarkdown);
        // タスクリストのイベントリスナーを設定
        setupTaskListEvents();
      }
    }
    this.updateWordCount();
  }

  getCurrentContent() {
    if (this.isSourceMode) {
      const sourceEditor = document.getElementById('source-editor');
      return sourceEditor.value;
    } else {
      const wysiwygContent = document.getElementById('wysiwyg-content');
      return wysiwygContent ? this.htmlToMarkdown(wysiwygContent.innerHTML) : '';
    }
  }

  showHelp() {
    const helpContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <h2>📝 SightEdit ヘルプ</h2>

        <h3>🎯 基本操作</h3>
        <ul>
          <li><strong>📄 新規</strong>: 新しいドキュメントを作成</li>
          <li><strong>📂 開く</strong>: Markdownファイルを読み込み</li>
          <li><strong>💾 保存</strong>: Markdownファイルとして保存</li>
          <li><strong>🔄 モード</strong>: WYSIWYG/ソース表示を切り替え</li>
        </ul>

        <h3>📝 Markdown記法</h3>
        <ul>
          <li><strong># 見出し</strong>: 見出しレベル1-6</li>
          <li><strong>**太字**</strong>: 太字テキスト</li>
          <li><strong>*斜体*</strong>: 斜体テキスト</li>
          <li><strong>~~取り消し~~</strong>: 取り消し線</li>
          <li><strong>\`コード\`</strong>: インラインコード</li>
          <li><strong>[Link](url)</strong>: リンク</li>
          <li><strong>![Alt](url)</strong>: 画像</li>
          <li><strong>- 項目</strong>: 箇条書き</li>
          <li><strong>1. 項目</strong>: 番号付きリスト</li>
          <li><strong>> 引用</strong>: 引用文</li>
        </ul>

        <h3>🛠️ 高度な機能</h3>
        <ul>
          <li><strong>📊 表</strong>: テーブルの挿入と編集</li>
          <li><strong>📋 目次</strong>: 見出しから自動生成</li>
        </ul>
      </div>
    `;

    this.showModal('ヘルプ', helpContent);
  }

  showModal(title, content) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal-content';

    modal.innerHTML = `
      <div class="modal-header">
        <h2 class="modal-title">${title}</h2>
        <button id="modal-close" class="modal-close">&times;</button>
      </div>
      <div>${content}</div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // 閉じるボタンのイベント
    modal.querySelector('#modal-close').onclick = () => {
      document.body.removeChild(overlay);
    };

    // オーバーレイクリックで閉じる
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    };
  }

  newFile() {
    const currentContent = this.getCurrentContent();
    if (currentContent.trim() && confirm('現在の内容は失われます。新規ファイルを作成しますか？')) {
      this.clearContent();
      this.currentFileName = null;
    } else if (!currentContent.trim()) {
      this.clearContent();
      this.currentFileName = null;
    }
  }

  clearContent() {
    if (this.isSourceMode) {
      const sourceEditor = document.getElementById('source-editor');
      sourceEditor.value = '';
    } else {
      const wysiwygContent = document.getElementById('wysiwyg-content');
      if (wysiwygContent) {
        wysiwygContent.innerHTML = '';
      }
    }
    this.updateWordCount();
  }

  // リンク編集
  editLink(linkElement) {
    const currentText = linkElement.dataset.text || linkElement.textContent;
    const currentUrl = linkElement.dataset.url || linkElement.href;

    // カスタムダイアログを作成
    const dialog = document.createElement('div');
    dialog.className = 'edit-dialog-overlay';
    dialog.innerHTML = `
      <div class="edit-dialog-content">
        <h3 class="edit-dialog-title">リンクを編集</h3>
        <div class="edit-dialog-field">
          <label class="edit-dialog-label">リンクテキスト:</label>
          <input type="text" id="linkText" value="${currentText}" class="edit-dialog-input">
        </div>
        <div class="edit-dialog-field">
          <label class="edit-dialog-label">URL:</label>
          <input type="text" id="linkUrl" value="${currentUrl}" class="edit-dialog-input">
        </div>
        <div class="edit-dialog-buttons">
          <button id="cancelBtn" class="edit-dialog-btn edit-dialog-btn-cancel">キャンセル</button>
          <button id="okBtn" class="edit-dialog-btn edit-dialog-btn-ok">OK</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    // フォーカスをテキストフィールドに設定
    const textInput = dialog.querySelector('#linkText');
    const urlInput = dialog.querySelector('#linkUrl');
    textInput.focus();
    textInput.select();

    // イベントリスナー
    dialog.querySelector('#okBtn').onclick = () => {
      const newText = textInput.value.trim();
      const newUrl = urlInput.value.trim();

      if (newText && newUrl) {
        linkElement.textContent = newText;
        linkElement.href = newUrl;
        linkElement.dataset.text = newText;
        linkElement.dataset.url = newUrl;
      }
      document.body.removeChild(dialog);
    };

    dialog.querySelector('#cancelBtn').onclick = () => {
      document.body.removeChild(dialog);
    };

    // Escapeキーでキャンセル
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.body.removeChild(dialog);
      }
    });
  }

  // 画像編集
  editImage(imgElement) {
    const currentAlt = imgElement.dataset.alt || imgElement.alt || '';
    const currentSrc = imgElement.dataset.src || imgElement.src || '';

    // カスタムダイアログを作成
    const dialog = document.createElement('div');
    dialog.className = 'edit-dialog-overlay';
    dialog.innerHTML = `
      <div class="edit-dialog-content">
        <h3 class="edit-dialog-title">画像を編集</h3>
        <div class="edit-dialog-field">
          <label class="edit-dialog-label">代替テキスト:</label>
          <input type="text" id="imageAlt" value="${currentAlt}" class="edit-dialog-input">
        </div>
        <div class="edit-dialog-field">
          <label class="edit-dialog-label">画像URL:</label>
          <input type="text" id="imageSrc" value="${currentSrc}" class="edit-dialog-input">
        </div>
        <div class="edit-dialog-buttons">
          <button id="cancelBtn" class="edit-dialog-btn edit-dialog-btn-cancel">キャンセル</button>
          <button id="okBtn" class="edit-dialog-btn edit-dialog-btn-ok">OK</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    // フォーカスを代替テキストフィールドに設定
    const altInput = dialog.querySelector('#imageAlt');
    const srcInput = dialog.querySelector('#imageSrc');
    altInput.focus();
    altInput.select();

    // イベントリスナー
    dialog.querySelector('#okBtn').onclick = () => {
      const newAlt = altInput.value.trim();
      const newSrc = srcInput.value.trim();

      if (newSrc) {
        imgElement.alt = newAlt;
        imgElement.src = newSrc;
        imgElement.dataset.alt = newAlt;
        imgElement.dataset.src = newSrc;
      }
      document.body.removeChild(dialog);
    };

    dialog.querySelector('#cancelBtn').onclick = () => {
      document.body.removeChild(dialog);
    };

    // Escapeキーでキャンセル
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.body.removeChild(dialog);
      }
    });
  }

  openFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.markdown,.txt';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target.result;

          if (this.isSourceMode) {
            const sourceEditor = document.getElementById('source-editor');
            sourceEditor.value = content;
          } else {
            const wysiwygContent = document.getElementById('wysiwyg-content');
            if (wysiwygContent) {
              wysiwygContent.innerHTML = this.markdownToHtml(content);
              // タスクリストのイベントリスナーを設定
              setupTaskListEvents();
            }
          }

          this.currentFileName = file.name;
          this.updateWordCount();
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }

  saveFile() {
    const content = this.getCurrentContent();
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.currentFileName || 'document.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  saveAsFile() {
    const filename = prompt('ファイル名を入力してください:', this.currentFileName || 'document.md');
    if (filename) {
      this.currentFileName = filename;
      const content = this.getCurrentContent();
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  updateWordCount() {
    const wordCountElement = document.getElementById('word-count');
    if (wordCountElement) {
      const content = this.getCurrentContent();
      const charCount = content.length;
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
      wordCountElement.textContent = `文字数: ${charCount} | 単語数: ${wordCount}`;
    }
  }

  setupEventListeners() {
    // キーボードショートカット
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey)) {
        switch(e.key) {
          case 's':
            e.preventDefault();
            this.saveFile();
            break;
          case 'n':
            e.preventDefault();
            this.newFile();
            break;
          case 'o':
            e.preventDefault();
            this.openFile();
            break;
        }
      }
    });
  }

  getCaretPosition(element) {
    let caretOffset = 0;
    const selection = window.getSelection();

    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(element);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      caretOffset = preCaretRange.toString().length;
    }

    return caretOffset;
  }

  setCaretPosition(element, pos) {
    const selection = window.getSelection();
    const range = document.createRange();

    let charIndex = 0;
    let nodeStack = [element];
    let node;
    let foundStart = false;

    while (!foundStart && (node = nodeStack.pop())) {
      if (node.nodeType === Node.TEXT_NODE) {
        const nextCharIndex = charIndex + node.length;
        if (pos >= charIndex && pos <= nextCharIndex) {
          range.setStart(node, pos - charIndex);
          range.collapse(true);
          foundStart = true;
        }
        charIndex = nextCharIndex;
      } else {
        for (let i = node.childNodes.length - 1; i >= 0; i--) {
          nodeStack.push(node.childNodes[i]);
        }
      }
    }

    selection.removeAllRanges();
    selection.addRange(range);
  }
}

// タスクリストのチェックボックス切り替え関数
window.toggleTaskStrike = function(checkbox) {
  const taskText = checkbox.parentNode.querySelector('.task-text');
  if (taskText) {
    if (checkbox.checked) {
      taskText.style.textDecoration = 'line-through';
      taskText.style.color = '#6c757d';
    } else {
      taskText.style.textDecoration = 'none';
      taskText.style.color = '';
    }
  }
};

// タスクリストのイベントリスナーを設定する関数
function setupTaskListEvents() {
  const wysiwygContent = document.getElementById('wysiwyg-content');
  if (wysiwygContent) {
    // 既存のリスナーを削除（重複防止）
    const checkboxes = wysiwygContent.querySelectorAll('.task-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.removeEventListener('change', window.toggleTaskStrike);
      checkbox.addEventListener('change', function() {
        window.toggleTaskStrike(this);
      });
    });
  }
}

// エディターを初期化
document.addEventListener('DOMContentLoaded', () => {
  new SimpleMarkdownEditor();
});

export default SimpleMarkdownEditor;