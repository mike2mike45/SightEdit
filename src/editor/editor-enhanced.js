// SightEdit Chrome Extension エディター - 拡張機能版

// TipTapライブラリは外部CDNから読み込み
// import { Editor } from '@tiptap/core';
// import { StarterKit } from '@tiptap/starter-kit';
// import { Link } from '@tiptap/extension-link';
// import { Image } from '@tiptap/extension-image';
// import { Table } from '@tiptap/extension-table';
// import { TableRow } from '@tiptap/extension-table-row';
// import { TableCell } from '@tiptap/extension-table-cell';
// import { TableHeader } from '@tiptap/extension-table-header';
// import { AIManager } from '../lib/ai-manager.js';

class SightEditEditor {
  constructor() {
    this.editor = null;
    this.aiManager = new AIManager();
    this.currentFileName = null;
    this.isSourceMode = false;
    this.init();
  }

  async init() {
    this.createEditor();
    this.setupToolbar();
    this.setupAI();
    this.setupEventListeners();
    await this.aiManager.loadSettings();
    this.updateWordCount();
  }

  createEditor() {
    this.editor = new Editor({
      element: document.querySelector('#editor'),
      extensions: [
        StarterKit.configure({
          link: false,
        }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: 'editor-link',
          },
        }),
        Image.configure({
          HTMLAttributes: {
            class: 'editor-image',
          },
        }),
        Table.configure({
          resizable: true,
          HTMLAttributes: {
            class: 'editor-table',
          },
        }),
        TableRow,
        TableCell,
        TableHeader,
      ],
      content: '<p>エディターでテキストを入力してください</p>',
      autofocus: true,
      editable: true,
      onUpdate: ({ editor }) => {
        this.updateWordCount();
      },
    });
  }

  setupToolbar() {
    const toolbar = document.querySelector('.toolbar');
    if (!toolbar) return;

    const toolbarButtons = {
      bold: () => this.editor.chain().focus().toggleBold().run(),
      italic: () => this.editor.chain().focus().toggleItalic().run(),
      strike: () => this.editor.chain().focus().toggleStrike().run(),
      code: () => this.editor.chain().focus().toggleCode().run(),
      bulletList: () => this.editor.chain().focus().toggleBulletList().run(),
      orderedList: () => this.editor.chain().focus().toggleOrderedList().run(),
      blockquote: () => this.editor.chain().focus().toggleBlockquote().run(),
      codeBlock: () => this.editor.chain().focus().toggleCodeBlock().run(),
      horizontalRule: () => this.editor.chain().focus().setHorizontalRule().run(),
      undo: () => this.editor.chain().focus().undo().run(),
      redo: () => this.editor.chain().focus().redo().run(),
      image: () => this.addImage(),
      table: () => this.addTable(),
      link: () => this.addLink(),
    };

    // ツールバーボタンのイベントリスナーを設定
    Object.keys(toolbarButtons).forEach(buttonName => {
      const button = toolbar.querySelector(`[data-action="${buttonName}"]`);
      if (button) {
        button.addEventListener('click', toolbarButtons[buttonName]);
      }
    });

    // 見出しセレクトボックスの設定
    const headingSelect = document.getElementById('heading-select');
    if (headingSelect) {
      headingSelect.addEventListener('change', (e) => {
        const value = e.target.value;
        if (value === 'p') {
          this.editor.chain().focus().setParagraph().run();
        } else if (value) {
          const level = parseInt(value);
          this.editor.chain().focus().toggleHeading({ level }).run();
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
  }

  addImage() {
    const url = prompt('画像のURLを入力してください:');
    if (url) {
      this.editor.chain().focus().setImage({ src: url }).run();
    }
  }

  addTable() {
    this.editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  }

  addLink() {
    const url = prompt('リンクURLを入力してください:');
    if (url) {
      this.editor.chain().focus().setLink({ href: url }).run();
    }
  }

  toggleEditMode() {
    const editorContent = document.getElementById('editor');
    let sourceEditor = document.getElementById('source-editor');
    const modeLabel = document.getElementById('editor-mode');

    if (!sourceEditor) {
      // ソースエディターがない場合は作成
      sourceEditor = document.createElement('textarea');
      sourceEditor.id = 'source-editor';
      sourceEditor.style.cssText = 'display: none; width: 100%; height: 100%; padding: 20px; font-family: monospace; font-size: 14px; line-height: 1.6; border: none; outline: none; resize: none; background: #f8f9fa;';
      editorContent.parentElement.appendChild(sourceEditor);
    }

    if (!this.isSourceMode) {
      // WYSIWYG → ソースモード
      const markdown = this.editorToMarkdown();
      sourceEditor.value = markdown;
      editorContent.style.display = 'none';
      sourceEditor.style.display = 'block';
      if (modeLabel) modeLabel.textContent = 'ソースモード';
      this.isSourceMode = true;
    } else {
      // ソース → WYSIWYGモード
      const markdown = sourceEditor.value;
      this.markdownToEditor(markdown);
      sourceEditor.style.display = 'none';
      editorContent.style.display = 'block';
      if (modeLabel) modeLabel.textContent = 'WYSIWYGモード';
      this.isSourceMode = false;
    }
  }

  editorToMarkdown() {
    // TipTapコンテンツをMarkdownに変換
    const html = this.editor.getHTML();
    return this.htmlToMarkdown(html);
  }

  htmlToMarkdown(html) {
    // 簡易的なHTML→Markdown変換
    let markdown = html;

    // 見出し
    markdown = markdown.replace(/<h1>(.*?)<\/h1>/g, '# $1\n\n');
    markdown = markdown.replace(/<h2>(.*?)<\/h2>/g, '## $1\n\n');
    markdown = markdown.replace(/<h3>(.*?)<\/h3>/g, '### $1\n\n');
    markdown = markdown.replace(/<h4>(.*?)<\/h4>/g, '#### $1\n\n');
    markdown = markdown.replace(/<h5>(.*?)<\/h5>/g, '##### $1\n\n');
    markdown = markdown.replace(/<h6>(.*?)<\/h6>/g, '###### $1\n\n');

    // 段落
    markdown = markdown.replace(/<p>(.*?)<\/p>/g, '$1\n\n');

    // 太字、斜体、取り消し線
    markdown = markdown.replace(/<strong>(.*?)<\/strong>/g, '**$1**');
    markdown = markdown.replace(/<em>(.*?)<\/em>/g, '*$1*');
    markdown = markdown.replace(/<s>(.*?)<\/s>/g, '~~$1~~');

    // コード
    markdown = markdown.replace(/<code>(.*?)<\/code>/g, '`$1`');
    markdown = markdown.replace(/<pre><code>(.*?)<\/code><\/pre>/gs, '```\n$1\n```\n');

    // リスト
    markdown = markdown.replace(/<ul>(.*?)<\/ul>/gs, (match, content) => {
      return content.replace(/<li>(.*?)<\/li>/g, '- $1\n') + '\n';
    });

    markdown = markdown.replace(/<ol>(.*?)<\/ol>/gs, (match, content) => {
      let counter = 1;
      return content.replace(/<li>(.*?)<\/li>/g, () => `${counter++}. $1\n`) + '\n';
    });

    // 引用
    markdown = markdown.replace(/<blockquote>(.*?)<\/blockquote>/gs, '> $1\n\n');

    // リンク
    markdown = markdown.replace(/<a href="(.*?)">(.*?)<\/a>/g, '[$2]($1)');

    // 画像
    markdown = markdown.replace(/<img src="(.*?)" alt="(.*?)".*?>/g, '![$2]($1)');

    // 水平線
    markdown = markdown.replace(/<hr>/g, '---\n\n');

    // HTMLタグを除去
    markdown = markdown.replace(/<[^>]*>/g, '');

    // 余分な改行を整理
    markdown = markdown.replace(/\n{3,}/g, '\n\n');

    return markdown.trim();
  }

  markdownToEditor(markdown) {
    // MarkdownをHTMLに変換してエディターにセット
    const html = this.markdownToHtml(markdown);
    this.editor.commands.setContent(html);
  }

  markdownToHtml(markdown) {
    // 簡易的なMarkdown→HTML変換
    let html = markdown;

    // コードブロック（先に処理）
    html = html.replace(/```(.*?)\n(.*?)```/gs, '<pre><code>$2</code></pre>');

    // 見出し
    html = html.replace(/^###### (.*?)$/gm, '<h6>$1</h6>');
    html = html.replace(/^##### (.*?)$/gm, '<h5>$1</h5>');
    html = html.replace(/^#### (.*?)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');

    // 太字、斜体、取り消し線
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/~~(.+?)~~/g, '<s>$1</s>');

    // インラインコード
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');

    // リンク
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

    // 画像
    html = html.replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1">');

    // 水平線
    html = html.replace(/^---$/gm, '<hr>');

    // リスト（箇条書き）
    html = html.replace(/^- (.+?)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // リスト（番号付き）
    html = html.replace(/^\d+\. (.+?)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
      if (!match.includes('<ul>')) {
        return '<ol>' + match + '</ol>';
      }
      return match;
    });

    // 引用
    html = html.replace(/^> (.+?)$/gm, '<blockquote>$1</blockquote>');

    // 段落
    html = html.split('\n\n').map(para => {
      para = para.trim();
      if (para && !para.match(/^<[hulo]/)) {
        return `<p>${para.replace(/\n/g, '<br>')}</p>`;
      }
      return para;
    }).join('\n');

    return html;
  }

  generateTOC() {
    const headings = [];
    const doc = this.editor.state.doc;

    doc.descendants((node, pos) => {
      if (node.type.name === 'heading') {
        const level = node.attrs.level;
        const text = node.textContent;
        headings.push({ level, text, pos });
      }
    });

    if (headings.length === 0) {
      alert('見出しが見つかりません。見出しを追加してから目次を生成してください。');
      return;
    }

    let tocMarkdown = '## 目次\n\n';
    headings.forEach(heading => {
      const indent = '  '.repeat(heading.level - 1);
      const anchor = heading.text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      tocMarkdown += `${indent}- [${heading.text}](#${anchor})\n`;
    });

    // 目次をエディターの先頭に挿入
    const tocHtml = this.markdownToHtml(tocMarkdown);
    this.editor.chain().focus().setTextSelection(0).insertContent(tocHtml + '<br>').run();
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

        <h3>⌨️ キーボードショートカット</h3>
        <ul>
          <li><strong>Ctrl/Cmd + B</strong>: 太字</li>
          <li><strong>Ctrl/Cmd + I</strong>: 斜体</li>
          <li><strong>Ctrl/Cmd + U</strong>: 下線</li>
          <li><strong>Ctrl/Cmd + Z</strong>: 元に戻す</li>
          <li><strong>Ctrl/Cmd + Y</strong>: やり直し</li>
          <li><strong>Ctrl/Cmd + S</strong>: 保存</li>
        </ul>

        <h3>📝 Markdown記法</h3>
        <ul>
          <li><strong># 見出し</strong>: 見出しレベル1-6</li>
          <li><strong>**太字**</strong>: 太字テキスト</li>
          <li><strong>*斜体*</strong>: 斜体テキスト</li>
          <li><strong>~~取り消し~~</strong>: 取り消し線</li>
          <li><strong>`コード`</strong>: インラインコード</li>
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
          <li><strong>🤖 AI</strong>: 文章の改善、翻訳、要約</li>
        </ul>
      </div>
    `;

    this.showModal('ヘルプ', helpContent);
  }

  showModal(title, content) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;';

    const modal = document.createElement('div');
    modal.style.cssText = 'background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); max-width: 600px; max-height: 80vh; overflow-y: auto; position: relative;';

    modal.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #dee2e6;">
        <h2 style="margin: 0; color: #333;">${title}</h2>
        <button id="modal-close" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #6c757d; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">&times;</button>
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
    if (this.editor.getHTML() !== '<p></p>' && confirm('現在の内容は失われます。新規ファイルを作成しますか？')) {
      this.editor.commands.clearContent();
      this.currentFileName = null;
      this.updateWordCount();
    } else if (this.editor.getHTML() === '<p></p>') {
      this.editor.commands.clearContent();
      this.currentFileName = null;
    }
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
          this.markdownToEditor(content);
          this.currentFileName = file.name;
          this.updateWordCount();
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }

  saveFile() {
    const markdown = this.isSourceMode ?
      document.getElementById('source-editor').value :
      this.editorToMarkdown();

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.currentFileName || 'document.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  updateWordCount() {
    const wordCountElement = document.getElementById('word-count');
    if (wordCountElement && this.editor) {
      const text = this.editor.getText();
      const charCount = text.length;
      const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
      wordCountElement.textContent = `文字数: ${charCount} | 単語数: ${wordCount}`;
    }
  }

  setupAI() {
    // AI機能のセットアップ（既存のコードを維持）
    const aiButton = document.querySelector('#ai-assist-btn');
    if (aiButton) {
      aiButton.addEventListener('click', () => {
        this.showAIDialog();
      });
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

  async showAIDialog() {
    // AI機能の実装（既存のコードを維持）
    console.log('AI Dialog would be shown here');
  }
}

// エディターを初期化
document.addEventListener('DOMContentLoaded', () => {
  new SightEditEditor();
});

export default SightEditEditor;