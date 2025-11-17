/**
 * EditorView - Main Editor UI Component
 * ES2024対応のメインエディタービュー
 */
import { BaseView } from './BaseView.js';
import { EVENTS } from '../core/EventBus.js';

export class EditorView extends BaseView {
  #isSourceMode = false;
  #wysiwygEditor = null;
  #sourceEditor = null;
  #currentContent = '';

  constructor(config = {}) {
    super({
      ...config,
      template: config.template || EditorView.getDefaultTemplate()
    });

    this.#isSourceMode = config.isSourceMode || false;
  }

  /**
   * デフォルトテンプレートを取得
   * @static
   * @returns {string} テンプレート
   */
  static getDefaultTemplate() {
    return `
      <div class="editor-container">
        <div class="editor-header">
          <div class="editor-info">
            <span id="current-file-name" class="file-name">{{fileName}}</span>
            <span class="file-status {{#if isModified}}modified{{/if}}">
              {{#if isModified}}●{{/if}}
            </span>
          </div>
          <div class="editor-actions">
            <button type="button" class="btn btn-sm" id="toggle-mode-btn" title="{{modeTitle}}">
              <span class="icon">{{modeIcon}}</span>
              {{modeText}}
            </button>
          </div>
        </div>
        <div class="editor-content">
          <div id="wysiwyg-editor" class="wysiwyg-editor {{#unless isSourceMode}}active{{/unless}}">
            <div contenteditable="true" id="wysiwyg-content" class="editor-input"></div>
          </div>
          <div id="source-editor" class="source-editor {{#if isSourceMode}}active{{/if}}">
            <textarea id="source-textarea" class="source-textarea" placeholder="Markdownを入力してください..."></textarea>
          </div>
        </div>
        <div class="editor-footer">
          <div class="editor-stats">
            <span id="word-count" class="stat-item">{{stats.words}} 単語</span>
            <span id="char-count" class="stat-item">{{stats.characters}} 文字</span>
            <span id="line-count" class="stat-item">{{stats.lines}} 行</span>
          </div>
          <div class="editor-mode">
            <span class="mode-indicator">{{currentMode}}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 初期化
   */
  init() {
    super.init();
    this.#setupEventListeners();
    this.#setupEditors();
    this.#updateModeDisplay();
  }

  /**
   * イベントリスナーをセットアップ
   * @private
   */
  #setupEventListeners() {
    // モード切り替えボタン
    this.addEventListener('click', '#toggle-mode-btn', this.#handleModeToggle);

    // WYSIWYGエディターのイベント
    this.addEventListener('input', '#wysiwyg-content', this.#handleWysiwygInput);
    this.addEventListener('paste', '#wysiwyg-content', this.#handleWysiwygPaste);
    this.addEventListener('keydown', '#wysiwyg-content', this.#handleWysiwygKeydown);

    // ソースエディターのイベント
    this.addEventListener('input', '#source-textarea', this.#handleSourceInput);
    this.addEventListener('keydown', '#source-textarea', this.#handleSourceKeydown);

    // ドラッグ&ドロップ
    this.addEventListener('dragover', '.editor-content', this.#handleDragOver);
    this.addEventListener('drop', '.editor-content', this.#handleDrop);
  }

  /**
   * エディターをセットアップ
   * @private
   */
  #setupEditors() {
    this.#wysiwygEditor = this.find('#wysiwyg-content');
    this.#sourceEditor = this.find('#source-textarea');

    if (this.#wysiwygEditor) {
      this.#wysiwygEditor.innerHTML = '';
    }

    if (this.#sourceEditor) {
      this.#sourceEditor.value = '';
    }
  }

  /**
   * モード切り替えハンドラー
   * @private
   * @param {Event} e - イベント
   */
  #handleModeToggle = (e) => {
    e.preventDefault();
    this.toggleMode();
  }

  /**
   * WYSIWYGエディターの入力ハンドラー
   * @private
   * @param {Event} e - イベント
   */
  #handleWysiwygInput = (e) => {
    if (this.#isSourceMode) return;

    const content = this.#htmlToMarkdown(this.#wysiwygEditor.innerHTML);
    this.#currentContent = content;
    this.#emitContentChange(content);
  }

  /**
   * WYSIWYGエディターの貼り付けハンドラー
   * @private
   * @param {Event} e - イベント
   */
  #handleWysiwygPaste = (e) => {
    e.preventDefault();
    
    const text = e.clipboardData.getData('text/plain');
    const html = e.clipboardData.getData('text/html');

    // プレーンテキストを優先
    if (text) {
      document.execCommand('insertText', false, text);
    } else if (html) {
      // HTMLをサニタイズして挿入
      const sanitized = this.#sanitizeHtml(html);
      document.execCommand('insertHTML', false, sanitized);
    }
  }

  /**
   * WYSIWYGエディターのキーボードハンドラー
   * @private
   * @param {Event} e - イベント
   */
  #handleWysiwygKeydown = (e) => {
    // Ctrl+Z (Undo)
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      this.emit(EVENTS.EDITOR_UNDO);
      return;
    }

    // Ctrl+Y or Ctrl+Shift+Z (Redo)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      this.emit(EVENTS.EDITOR_REDO);
      return;
    }

    // Tab key handling
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertText', false, '  ');
    }
  }

  /**
   * ソースエディターの入力ハンドラー
   * @private
   * @param {Event} e - イベント
   */
  #handleSourceInput = (e) => {
    if (!this.#isSourceMode) return;

    this.#currentContent = this.#sourceEditor.value;
    this.#emitContentChange(this.#currentContent);
  }

  /**
   * ソースエディターのキーボードハンドラー
   * @private
   * @param {Event} e - イベント
   */
  #handleSourceKeydown = (e) => {
    // Tab key handling
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      
      e.target.value = e.target.value.substring(0, start) + '  ' + e.target.value.substring(end);
      e.target.selectionStart = e.target.selectionEnd = start + 2;
    }

    // Ctrl+Z (Undo)
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      this.emit(EVENTS.EDITOR_UNDO);
      return;
    }

    // Ctrl+Y or Ctrl+Shift+Z (Redo)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      this.emit(EVENTS.EDITOR_REDO);
      return;
    }
  }

  /**
   * ドラッグオーバーハンドラー
   * @private
   * @param {Event} e - イベント
   */
  #handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }

  /**
   * ドロップハンドラー
   * @private
   * @param {Event} e - イベント
   */
  #handleDrop = (e) => {
    e.preventDefault();
    
    const files = Array.from(e.dataTransfer.files);
    const textData = e.dataTransfer.getData('text/plain');

    if (files.length > 0) {
      this.emit(EVENTS.FILE_DROP, { files });
    } else if (textData) {
      this.insertText(textData);
    }
  }

  /**
   * コンテンツ変更イベントを発火
   * @private
   * @param {string} content - コンテンツ
   */
  #emitContentChange(content) {
    this.#updateStats(content);
    this.emit(EVENTS.EDITOR_CONTENT_CHANGED, {
      content,
      mode: this.#isSourceMode ? 'source' : 'wysiwyg'
    });
  }

  /**
   * 統計情報を更新
   * @private
   * @param {string} content - コンテンツ
   */
  #updateStats(content) {
    const stats = {
      characters: content.length,
      words: content.trim() ? content.trim().split(/\s+/).length : 0,
      lines: content.split('\n').length
    };

    this.setData('stats', stats);
    
    // UI要素を直接更新
    const wordCountEl = this.find('#word-count');
    const charCountEl = this.find('#char-count');
    const lineCountEl = this.find('#line-count');

    if (wordCountEl) wordCountEl.textContent = `${stats.words} 単語`;
    if (charCountEl) charCountEl.textContent = `${stats.characters} 文字`;
    if (lineCountEl) lineCountEl.textContent = `${stats.lines} 行`;
  }

  /**
   * HTMLをMarkdownに変換
   * @private
   * @param {string} html - HTML
   * @returns {string} Markdown
   */
  #htmlToMarkdown(html) {
    if (!html) return '';
    
    // HTMLタグをMarkdownに変換
    let markdown = html;
    
    // 太字変換
    markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
    markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
    
    // イタリック変換
    markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
    markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
    
    // コード変換
    markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
    
    // 見出し変換
    for (let i = 6; i >= 1; i--) {
      const regex = new RegExp(`<h${i}[^>]*>(.*?)<\/h${i}>`, 'gi');
      markdown = markdown.replace(regex, '#'.repeat(i) + ' $1');
    }
    
    // リンク変換
    markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
    
    // 改行変換
    markdown = markdown.replace(/<br[^>]*>/gi, '\n');
    markdown = markdown.replace(/<\/p>/gi, '\n\n');
    markdown = markdown.replace(/<p[^>]*>/gi, '');
    
    // HTMLタグを除去
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = markdown;
    markdown = tempDiv.textContent || tempDiv.innerText || '';
    
    // 余分な空白と改行を整理
    markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();
    
    return markdown;
  }

  /**
   * MarkdownをHTMLに変換
   * @private
   * @param {string} markdown - Markdown
   * @returns {string} HTML
   */
  #markdownToHtml(markdown) {
    if (!markdown) return '';
    
    let html = markdown;
    
    // エスケープ処理
    html = html.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;');
    
    // 見出し変換 (h1-h6)
    for (let i = 6; i >= 1; i--) {
      const regex = new RegExp(`^#{${i}}\\s+(.+)$`, 'gm');
      html = html.replace(regex, `<h${i}>$1</h${i}>`);
    }
    
    // 太字変換
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // イタリック変換
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // コード変換
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // リンク変換
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    
    // 改行変換
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    
    // 段落で包む
    if (html && !html.startsWith('<h') && !html.startsWith('<p>')) {
      html = '<p>' + html + '</p>';
    }
    
    // 空の段落を除去
    html = html.replace(/<p><\/p>/g, '');
    
    return html;
  }

  /**
   * HTMLをサニタイズ
   * @private
   * @param {string} html - HTML
   * @returns {string} サニタイズ済みHTML
   */
  #sanitizeHtml(html) {
    const tempDiv = document.createElement('div');
    tempDiv.textContent = html;
    return tempDiv.innerHTML;
  }

  /**
   * モード表示を更新
   * @private
   */
  #updateModeDisplay() {
    const modeData = {
      isSourceMode: this.#isSourceMode,
      modeTitle: this.#isSourceMode ? 'WYSIWYGモードに切り替え' : 'ソースモードに切り替え',
      modeIcon: this.#isSourceMode ? '📝' : '📄',
      modeText: this.#isSourceMode ? 'WYSIWYG' : 'ソース',
      currentMode: this.#isSourceMode ? 'ソースモード' : 'WYSIWYGモード'
    };

    Object.entries(modeData).forEach(([key, value]) => {
      this.setData(key, value);
    });

    // エディターの表示/非表示を切り替え
    const wysiwygEditor = this.find('#wysiwyg-editor');
    const sourceEditor = this.find('#source-editor');

    if (wysiwygEditor && sourceEditor) {
      if (this.#isSourceMode) {
        wysiwygEditor.classList.remove('active');
        sourceEditor.classList.add('active');
        this.#sourceEditor?.focus();
      } else {
        sourceEditor.classList.remove('active');
        wysiwygEditor.classList.add('active');
        this.#wysiwygEditor?.focus();
      }
    }
  }

  /**
   * モードを切り替え
   */
  toggleMode() {
    const oldMode = this.#isSourceMode;
    this.#isSourceMode = !this.#isSourceMode;

    // コンテンツを同期
    if (this.#isSourceMode) {
      // WYSIWYG → ソース
      if (this.#wysiwygEditor && this.#sourceEditor) {
        const markdown = this.#htmlToMarkdown(this.#wysiwygEditor.innerHTML);
        this.#sourceEditor.value = markdown;
        this.#currentContent = markdown;
      }
    } else {
      // ソース → WYSIWYG
      if (this.#sourceEditor && this.#wysiwygEditor) {
        const html = this.#markdownToHtml(this.#sourceEditor.value);
        this.#wysiwygEditor.innerHTML = html;
        this.#currentContent = this.#sourceEditor.value;
      }
    }

    this.#updateModeDisplay();

    this.emit(EVENTS.EDITOR_MODE_CHANGED, {
      oldMode: oldMode ? 'source' : 'wysiwyg',
      newMode: this.#isSourceMode ? 'source' : 'wysiwyg'
    });
  }

  /**
   * コンテンツを取得
   * @returns {string} 現在のコンテンツ
   */
  getContent() {
    if (this.#isSourceMode && this.#sourceEditor) {
      return this.#sourceEditor.value;
    } else if (!this.#isSourceMode && this.#wysiwygEditor) {
      return this.#htmlToMarkdown(this.#wysiwygEditor.innerHTML);
    }
    return this.#currentContent;
  }

  /**
   * コンテンツを設定
   * @param {string} content - コンテンツ
   */
  setContent(content) {
    this.#currentContent = content;

    if (this.#sourceEditor) {
      this.#sourceEditor.value = content;
    }

    if (this.#wysiwygEditor) {
      this.#wysiwygEditor.innerHTML = this.#markdownToHtml(content);
    }

    this.#updateStats(content);
  }

  /**
   * テキストを挿入
   * @param {string} text - 挿入するテキスト
   */
  insertText(text) {
    if (this.#isSourceMode && this.#sourceEditor) {
      const start = this.#sourceEditor.selectionStart;
      const end = this.#sourceEditor.selectionEnd;
      const value = this.#sourceEditor.value;
      
      this.#sourceEditor.value = value.substring(0, start) + text + value.substring(end);
      this.#sourceEditor.selectionStart = this.#sourceEditor.selectionEnd = start + text.length;
      
      this.#handleSourceInput({ target: this.#sourceEditor });
    } else if (!this.#isSourceMode && this.#wysiwygEditor) {
      document.execCommand('insertText', false, text);
    }
  }

  /**
   * ファイル名を更新
   * @param {string} fileName - ファイル名
   */
  updateFileName(fileName) {
    this.setData('fileName', fileName || '無題');
    
    const fileNameEl = this.find('#current-file-name');
    if (fileNameEl) {
      fileNameEl.textContent = fileName || '無題';
    }
  }

  /**
   * 変更状態を更新
   * @param {boolean} isModified - 変更されているかどうか
   */
  updateModifiedStatus(isModified) {
    this.setData('isModified', isModified);
    
    const statusEl = this.find('.file-status');
    if (statusEl) {
      statusEl.classList.toggle('modified', isModified);
      statusEl.textContent = isModified ? '●' : '';
    }
  }

  /**
   * フォーカスを設定
   */
  focus() {
    if (this.#isSourceMode && this.#sourceEditor) {
      this.#sourceEditor.focus();
    } else if (!this.#isSourceMode && this.#wysiwygEditor) {
      this.#wysiwygEditor.focus();
    }
  }

  /**
   * 破棄処理
   */
  destroy() {
    this.#wysiwygEditor = null;
    this.#sourceEditor = null;
    this.#currentContent = '';
    
    super.destroy();
  }
}