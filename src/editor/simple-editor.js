// SightEdit Simple Editor - Chrome Extension版
// TipTapの代わりに基本的なtextareaベースのエディターを使用

// CSSファイルをインポート
import './ai-command-panel.css';
import './export-menu.css';
import './ai-settings.css';
import './settings.css';
import './chat-panel.css';
import './prompt-library.css';
import './structured-generation.css';

// バージョン管理機能をインポート
import { VersionIntegration } from './version-integration.js';
// ローカル履歴機能をインポート
import { LocalHistoryIntegration } from './local-history-integration.js';

// CommonMark準拠のMarkdownパーサーをインポート
import { marked } from 'marked';
import TurndownService from 'turndown';

// AI チャット機能をインポート
import { ChatStorage } from '../lib/chat-storage.js';
import { AIChatManager } from '../lib/ai-chat-manager.js';
import { ChatPanel } from './chat-panel.js';

// プロンプト管理機能をインポート
import { getPromptManager } from '../lib/prompt-manager.js';
import { PromptLibrary } from './prompt-library.js';

// スタイル制御機能をインポート
import { getStyleController } from '../lib/style-controller.js';

// 構造化生成機能をインポート
import { getStructuredGenerator } from '../lib/structured-generator.js';
import { StructuredGenerationModal } from './structured-generation-modal.js';

// Export/Import機能をインポート
import { ExportImportManager } from '../lib/export-import-manager.js';

// Google Drive画像ピッカーをインポート
import { getDriveImagePicker } from './drive-image-picker.js';

class SimpleMarkdownEditor {
  constructor() {
    this.currentFileName = null;
    this.isSourceMode = false;
    this.versionIntegration = null;
    this.localHistoryIntegration = null;

    // Undo/Redo履歴スタック
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistorySize = 100; // 最大履歴数

    // CommonMark準拠のmarkedを設定
    marked.setOptions({
      gfm: true, // GitHub Flavored Markdown
      breaks: false, // 改行をbrタグに変換しない（CommonMark準拠）
      pedantic: false, // CommonMarkモード
      smartLists: true,
      smartypants: false
    });

    // Turndownサービスを初期化（HTML→Markdown変換）
    this.turndownService = new TurndownService({
      headingStyle: 'atx', // ATX形式の見出し（# ## ###）
      hr: '---',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      fence: '```',
      emDelimiter: '*',
      strongDelimiter: '**',
      linkStyle: 'inlined'
    });

    this.init();
  }

  // MarkdownテキストをHTMLに変換（CommonMark準拠）
  markdownToHtml(markdown) {
    if (!markdown) return '';

    try {
      // markedライブラリでCommonMark準拠のHTML変換
      let html = marked.parse(markdown);

      // カスタムクラスの追加（既存の機能を維持）
      html = html.replace(/<img\s+([^>]*?)>/g, (match, attrs) => {
        // 画像にクリック可能なクラスを追加
        if (!attrs.includes('class=')) {
          return `<img ${attrs} class="editable-image" style="max-width: 100%; height: auto; cursor: pointer; display: inline-block; border-radius: 4px;">`;
        }
        return match;
      });

      html = html.replace(/<a\s+([^>]*?)>([^<]*)<\/a>/g, (match, attrs, text) => {
        // リンクに編集可能なクラスを追加
        if (!attrs.includes('class=')) {
          return `<a ${attrs} class="editable-link">${text}</a>`;
        }
        return match;
      });

      return html;
    } catch (error) {
      console.error('Markdown parsing error:', error);
      // エラー時は元のMarkdownをそのまま返す
      return `<pre>${markdown}</pre>`;
    }
  }

  // 旧バージョンの互換性のため、以下のヘルパーメソッドは残しておく
  markdownToHtmlLegacy(markdown) {
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

  // HTMLをMarkdownに変換（CommonMark準拠）
  htmlToMarkdown(html) {
    if (!html) return '';

    try {
      // turndownライブラリでCommonMark準拠のMarkdown変換
      const markdown = this.turndownService.turndown(html);
      return markdown.trim();
    } catch (error) {
      console.error('HTML to Markdown conversion error:', error);
      // エラー時は元のHTMLからタグを除去して返す
      return html.replace(/<[^>]*>/g, '').trim();
    }
  }

  init() {
    console.log('エディターの初期化を開始...');
    
    // DOM読み込みを確実に待つ
    if (document.readyState === 'loading') {
      console.log('DOCUMENTがまだ読み込み中です。DOMContentLoadedを待機...');
      document.addEventListener('DOMContentLoaded', () => {
        console.log('DOMContentLoaded後に初期化を実行');
        this.performInit();
      });
    } else {
      console.log('DOMは既に読み込み済み。即座に初期化を実行');
      this.performInit();
    }
  }

  async performInit() {
    console.log('実際の初期化処理を開始...');
    this.setupEditor();
    this.setupToolbar();
    this.setupEventListeners();

    // URLパラメータによるファイル読み込みを追加
    this.handleURLFileParameter();

    // バージョン管理機能を初期化
    try {
      this.versionIntegration = new VersionIntegration(this);
      await this.versionIntegration.init();
      console.log('バージョン管理機能の初期化完了');
    } catch (error) {
      console.error('バージョン管理機能の初期化に失敗:', error);
      // エラーがあってもエディター自体は動作させる
    }

    // ローカル履歴機能を初期化
    try {
      this.localHistoryIntegration = new LocalHistoryIntegration(this);
      await this.localHistoryIntegration.init();
      console.log('ローカル履歴機能の初期化完了');
    } catch (error) {
      console.error('ローカル履歴機能の初期化に失敗:', error);
      // エラーがあってもエディター自体は動作させる
    }

    // DOM要素が確実に存在することを確認してからボタンをセットアップ
    setTimeout(() => {
      console.log('DOM要素の存在確認:');
      console.log('- settings-btn:', !!document.getElementById('settings-btn'));
      console.log('- settings-overlay:', !!document.getElementById('settings-overlay'));
      console.log('- settings-save:', !!document.getElementById('settings-save'));
      console.log('- gemini-test-btn:', !!document.getElementById('gemini-test-btn'));
      console.log('- claude-test-btn:', !!document.getElementById('claude-test-btn'));

      this.setupHeaderButtons();
      this.updateWordCount();
      console.log('エディターの初期化が完了しました');
    }, 200);
  }

  setupEditor() {
    const editorElement = document.getElementById('editor');
    if (editorElement) {
      // WYSIWYGエディターの代わりにcontentEditableを使用
      editorElement.innerHTML = '<div contenteditable="true" class="ProseMirror" id="wysiwyg-content"></div>';

      const content = document.getElementById('wysiwyg-content');

      // 入力時の処理：履歴記録＋文字数更新
      content.addEventListener('input', () => {
        this.saveToHistory();
        this.updateWordCount();
      });

      // 貼り付け時の処理
      content.addEventListener('paste', (e) => {
        console.log('[WYSIWYG] Paste event triggered');
        e.preventDefault();

        // クリップボードからテキストを取得
        const text = e.clipboardData.getData('text/plain');
        console.log('[WYSIWYG] Clipboard text:', text);

        // 選択範囲に挿入
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();

          // テキストノードとして挿入（HTMLとしてではなくプレーンテキストとして）
          const textNode = document.createTextNode(text);
          range.insertNode(textNode);

          // カーソルを挿入したテキストの後ろに移動
          range.setStartAfter(textNode);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);

          console.log('[WYSIWYG] Text inserted successfully');
        } else {
          console.log('[WYSIWYG] No selection range available');
        }

        this.saveToHistory();
        this.updateWordCount();
      });

      // Ctrl+Z / Ctrl+Shift+Z のキーボードショートカット
      content.addEventListener('keydown', (e) => {
        if (e.ctrlKey && !e.shiftKey && e.key === 'z') {
          e.preventDefault();
          this.undo();
        } else if (e.ctrlKey && e.shiftKey && e.key === 'z') {
          e.preventDefault();
          this.redo();
        }
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
      bold: () => this.wrapText('**', '**', 'strong'),
      italic: () => this.wrapText('*', '*', 'em'),
      strike: () => this.wrapText('~~', '~~', 'del'),
      code: () => this.wrapText('`', '`', 'code'),
      bulletList: () => this.insertAtLineStart('- '),
      orderedList: () => this.insertNumberedList(),
      blockquote: () => this.insertAtLineStart('> '),
      codeBlock: () => this.wrapText('```\n', '\n```', 'pre'),
      horizontalRule: () => this.insertText('\n---\n'),
      link: () => this.insertLink(),
      image: () => this.insertImage(),
      table: () => this.insertTable(),
      undo: () => this.undo(),
      redo: () => this.redo()
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
          if (this.isSourceMode) {
            // ソースモード: Markdown記号を挿入
            const prefix = '#'.repeat(level) + ' ';
            this.insertAtLineStart(prefix);
          } else {
            // WYSIWYGモード: HTMLタグを挿入
            const content = document.getElementById('wysiwyg-content');
            const selection = window.getSelection();

            if (selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              const selectedText = range.toString() || '見出し';

              const heading = document.createElement(`h${level}`);
              heading.textContent = selectedText;

              range.deleteContents();
              range.insertNode(heading);
              range.setStartAfter(heading);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);
            }

            content.focus();
            this.updateWordCount();
          }
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

  setupHeaderButtons() {
    console.log('ヘッダーボタンのセットアップを開始...');
    
    // 設定ボタン（全般設定ダイアログを表示）
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
      console.log('settings-btn要素が見つかりました');
      settingsBtn.addEventListener('click', () => {
        console.log('設定ボタンがクリックされました');
        this.showSettings();
      });
      console.log('設定ボタンのイベントリスナーを設定しました');
    } else {
      console.error('settings-btn要素が見つかりません');
    }

    // 設定ダイアログのイベントリスナー
    this.setupSettingsEventListeners();
  }

  setupSettingsEventListeners() {
    console.log('設定イベントリスナーをセットアップ中...');
    
    // APIキーフィールドのリアルタイム保存
    const geminiApiKeyField = document.getElementById('gemini-api-key');
    const claudeApiKeyField = document.getElementById('claude-api-key');
    
    if (geminiApiKeyField) {
      // 複数のイベントで確実にキャプチャ
      ['input', 'change', 'keyup', 'paste'].forEach(eventType => {
        geminiApiKeyField.addEventListener(eventType, () => {
          console.log(`Gemini APIキー${eventType}イベント発生、保存中...`);
          console.log('フィールド値:', geminiApiKeyField.value);
          if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.sync.set({
              geminiApiKey: geminiApiKeyField.value
            }, () => {
              console.log('Gemini APIキーをChrome Storageに保存しました');
            });
          }
        });
      });
      console.log('Gemini APIキーフィールドのリアルタイム保存を設定しました');
    }
    
    if (claudeApiKeyField) {
      // 複数のイベントで確実にキャプチャ
      ['input', 'change', 'keyup', 'paste'].forEach(eventType => {
        claudeApiKeyField.addEventListener(eventType, () => {
          console.log(`Claude APIキー${eventType}イベント発生、保存中...`);
          console.log('フィールド値:', claudeApiKeyField.value);
          if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.sync.set({
              claudeApiKey: claudeApiKeyField.value
            }, () => {
              console.log('Claude APIキーをChrome Storageに保存しました');
            });
          }
        });
      });
      console.log('Claude APIキーフィールドのリアルタイム保存を設定しました');
    }
    
    // 閉じるボタン
    const closeBtn = document.getElementById('settings-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        console.log('設定閉じるボタンがクリックされました');
        this.hideSettings();
      });
      console.log('設定閉じるボタンのイベントリスナーを設定しました');
    } else {
      console.error('settings-close要素が見つかりません');
    }

    // オーバーレイクリックで閉じる
    const overlay = document.getElementById('settings-overlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          console.log('設定オーバーレイがクリックされました');
          this.hideSettings();
        }
      });
      console.log('設定オーバーレイのイベントリスナーを設定しました');
    } else {
      console.error('settings-overlay要素が見つかりません');
    }

    // 設定タブの切り替え
    const settingsTabs = document.querySelectorAll('.settings-tab');
    settingsTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        this.switchSettingsTab(tabName);
      });
    });

    // プロバイダータブの切り替え
    const providerTabs = document.querySelectorAll('.ai-provider-tab');
    providerTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const provider = tab.dataset.provider;
        this.switchAIProvider(provider);
      });
    });

    // パスワード表示切り替え
    const geminiToggle = document.getElementById('gemini-password-toggle');
    const claudeToggle = document.getElementById('claude-password-toggle');
    
    if (geminiToggle) {
      geminiToggle.addEventListener('click', () => {
        this.togglePassword('gemini-api-key', 'gemini-password-toggle');
      });
    }
    
    if (claudeToggle) {
      claudeToggle.addEventListener('click', () => {
        this.togglePassword('claude-api-key', 'claude-password-toggle');
      });
    }

    // 保存ボタン
    const saveBtn = document.getElementById('settings-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        console.log('設定保存ボタンがクリックされました');
        this.saveAllSettings();
      });
      console.log('設定保存ボタンのイベントリスナーを設定しました');
    } else {
      console.error('settings-save要素が見つかりません');
    }

    // 接続テストボタン
    const geminiTestBtn = document.getElementById('gemini-test-btn');
    const claudeTestBtn = document.getElementById('claude-test-btn');
    
    if (geminiTestBtn) {
      geminiTestBtn.addEventListener('click', () => {
        console.log('Gemini接続テストボタンがクリックされました');
        this.testConnection('gemini');
      });
      console.log('Gemini接続テストボタンのイベントリスナーを設定しました');
    } else {
      console.error('gemini-test-btn要素が見つかりません');
    }
    
    if (claudeTestBtn) {
      claudeTestBtn.addEventListener('click', () => {
        console.log('Claude接続テストボタンがクリックされました');
        this.testConnection('claude');
      });
      console.log('Claude接続テストボタンのイベントリスナーを設定しました');
    } else {
      console.error('claude-test-btn要素が見つかりません');
    }
  }

  showSettings() {
    console.log('設定ダイアログの表示を開始...');
    
    // 設定ダイアログを表示
    const overlay = document.getElementById('settings-overlay');
    if (overlay) {
      console.log('settings-overlay要素が見つかりました');
      overlay.style.display = 'flex';
      console.log('設定ダイアログを表示しました');
      this.loadAllSettings();
    } else {
      console.error('settings-overlay要素が見つかりません');
    }
  }

  showAISettings() {
    // AI設定ダイアログを表示（旧関数、互換性のため残す）
    this.showSettings();
    // AI設定タブをアクティブにする
    this.switchSettingsTab('ai');
  }


  // AI設定機能
  loadAISettings() {
    // Chrome Storage APIから設定を読み込み
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.get(['geminiApiKey', 'geminiModel', 'claudeApiKey', 'claudeModel'], (result) => {
        // Gemini設定を復元
        const geminiKey = document.getElementById('gemini-api-key');
        const geminiModel = document.getElementById('gemini-model');
        if (geminiKey) geminiKey.value = result.geminiApiKey || '';
        if (geminiModel) geminiModel.value = result.geminiModel || 'gemini-2.5-pro';

        // Claude設定を復元
        const claudeKey = document.getElementById('claude-api-key');
        const claudeModel = document.getElementById('claude-model');
        if (claudeKey) claudeKey.value = result.claudeApiKey || '';
        if (claudeModel) claudeModel.value = result.claudeModel || 'claude-3-5-sonnet-20241022';
      });
    }
  }

  async saveAISettings() {
    // フォームから設定を取得
    const geminiKey = document.getElementById('gemini-api-key')?.value || '';
    const geminiModel = document.getElementById('gemini-model')?.value || 'gemini-2.5-pro';
    const claudeKey = document.getElementById('claude-api-key')?.value || '';
    const claudeModel = document.getElementById('claude-model')?.value || 'claude-3-5-sonnet-20241022';

    // Chrome Storage APIに保存
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.set({
        geminiApiKey: geminiKey,
        geminiModel: geminiModel,
        claudeApiKey: claudeKey,
        claudeModel: claudeModel
      }, async () => {
        this.showAIMessage('設定を保存しました', 'success');
        
        // AICommandManagerの設定を再読み込み
        if (window.aiCommandUI && window.aiCommandUI.commandManager) {
          await window.aiCommandUI.commandManager.loadSettings();
        }
      });
    } else {
      this.showAIMessage('Chrome拡張機能でのみ設定を保存できます', 'error');
    }
  }

  hideSettings() {
    const overlay = document.getElementById('settings-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  }

  hideAISettings() {
    // 互換性のため残す
    this.hideSettings();
  }

  switchSettingsTab(tabName) {
    // タブの切り替え
    const tabs = document.querySelectorAll('.settings-tab');
    const contents = document.querySelectorAll('.settings-tab-content');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    contents.forEach(content => content.classList.remove('active'));
    
    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    const activeContent = document.getElementById(`${tabName}-tab`);
    
    if (activeTab) activeTab.classList.add('active');
    if (activeContent) activeContent.classList.add('active');
  }

  loadAllSettings() {
    // すべての設定を読み込み
    this.loadAISettings();
    this.loadEditorSettings();
    this.loadExportSettings();
  }

  loadEditorSettings() {
    // エディター設定を読み込み（将来実装）
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.get(['autoSave', 'wordWrap'], (result) => {
        const autoSave = document.getElementById('auto-save');
        const wordWrap = document.getElementById('word-wrap');
        
        if (autoSave) autoSave.checked = result.autoSave !== false; // デフォルトtrue
        if (wordWrap) wordWrap.checked = result.wordWrap !== false; // デフォルトtrue
      });
    }
  }

  loadExportSettings() {
    // エクスポート設定を読み込み（将来実装）
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.get(['defaultExportFormat'], (result) => {
        const defaultFormat = document.getElementById('default-export-format');
        if (defaultFormat) defaultFormat.value = result.defaultExportFormat || 'markdown';
      });
    }
  }

  async saveAllSettings() {
    console.log('すべての設定を保存開始...');
    
    try {
      // すべての設定を保存
      await this.saveAISettings();
      console.log('AI設定の保存完了');
      
      this.saveEditorSettings();
      console.log('エディター設定の保存完了');
      
      this.saveExportSettings();
      console.log('エクスポート設定の保存完了');
      
      this.showSettingsMessage('すべての設定を保存しました', 'success');
      console.log('設定保存完了、メッセージを表示');
    } catch (error) {
      console.error('設定保存中にエラーが発生:', error);
      this.showSettingsMessage('設定保存中にエラーが発生しました: ' + error.message, 'error');
    }
  }

  saveEditorSettings() {
    // エディター設定を保存
    const autoSave = document.getElementById('auto-save')?.checked || false;
    const wordWrap = document.getElementById('word-wrap')?.checked || false;

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.set({
        autoSave: autoSave,
        wordWrap: wordWrap
      });
    }
  }

  saveExportSettings() {
    // エクスポート設定を保存
    const defaultFormat = document.getElementById('default-export-format')?.value || 'markdown';

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.set({
        defaultExportFormat: defaultFormat
      });
    }
  }

  showSettingsMessage(text, type = 'info') {
    console.log(`設定メッセージを表示: "${text}" (${type})`);
    
    // 既存のメッセージを削除
    const existing = document.querySelector('.settings-message');
    if (existing) {
      existing.remove();
      console.log('既存のメッセージを削除しました');
    }

    const messageContainer = document.querySelector('.settings-body');
    if (!messageContainer) {
      console.error('.settings-body要素が見つかりません');
      return;
    }

    const message = document.createElement('div');
    message.className = `settings-message ${type}`;
    message.innerHTML = `
      <span>${this.getMessageIcon(type)}</span>
      <span>${text}</span>
    `;

    messageContainer.insertBefore(message, messageContainer.firstChild);
    console.log('メッセージを挿入しました:', message);

    // 3秒後に自動削除
    setTimeout(() => {
      if (message.parentNode) {
        message.remove();
        console.log('メッセージを自動削除しました');
      }
    }, 3000);
  }

  switchAIProvider(provider) {
    // タブの切り替え
    const tabs = document.querySelectorAll('.ai-provider-tab');
    const contents = document.querySelectorAll('.ai-provider-content');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    contents.forEach(content => content.classList.remove('active'));
    
    const activeTab = document.querySelector(`[data-provider="${provider}"]`);
    const activeContent = document.getElementById(`${provider}-settings`);
    
    if (activeTab) activeTab.classList.add('active');
    if (activeContent) activeContent.classList.add('active');
  }

  togglePassword(inputId, buttonId) {
    const input = document.getElementById(inputId);
    const button = document.getElementById(buttonId);
    
    if (input && button) {
      if (input.type === 'password') {
        input.type = 'text';
        button.textContent = '🙈';
      } else {
        input.type = 'password';
        button.textContent = '👁️';
      }
    }
  }

  async testConnection(provider) {
    console.log(`${provider}の接続テストを開始...`);
    
    const button = document.getElementById(`${provider}-test-btn`);
    if (!button) {
      console.error(`${provider}-test-btn要素が見つかりません`);
      return;
    }

    console.log('ローディング状態に変更...');
    // ローディング状態に変更
    button.classList.add('loading');
    button.disabled = true;

    try {
      // APIキーフィールドの詳細な検証
      const apiKeyField = document.getElementById(`${provider}-api-key`);
      const modelField = document.getElementById(`${provider}-model`);
      
      console.log(`${provider}-api-key要素:`, !!apiKeyField);
      console.log(`${provider}-model要素:`, !!modelField);
      console.log(`要素の値:`, apiKeyField?.value);
      console.log(`要素のtypeプロパティ:`, apiKeyField?.type);
      console.log(`要素の表示状態:`, apiKeyField?.style.display);
      console.log(`親要素の表示状態:`, apiKeyField?.parentElement?.style.display);
      
      // パスワードフィールドの値取得を強制する
      if (apiKeyField?.type === 'password') {
        console.log('パスワードフィールドを一時的にtextタイプに変更して値を取得します');
        const originalType = apiKeyField.type;
        apiKeyField.type = 'text';
        const valueAfterTypeChange = apiKeyField.value;
        apiKeyField.type = originalType;
        console.log('タイプ変更後の値:', valueAfterTypeChange);
      }
      
      if (!apiKeyField) {
        console.error(`${provider}-api-key要素が見つかりません`);
        this.showSettingsMessage('入力フィールドが見つかりません', 'error');
        return;
      }
      
      // APIキーの値を複数の方法で取得を試行
      let apiKey = apiKeyField.value?.trim();
      
      // パスワードフィールドで値が空の場合の対処
      if (!apiKey && apiKeyField?.type === 'password') {
        console.log('パスワードフィールドから直接値を取得できません。代替方法を試行...');
        // フィールドのvalueプロパティを直接読み取り
        apiKey = apiKeyField.getAttribute('value') || '';
        console.log('getAttribute()で取得した値:', apiKey);
        
        if (!apiKey) {
          // ChromeのStorage APIから取得を試行
          if (typeof chrome !== 'undefined' && chrome.storage) {
            try {
              const result = await new Promise((resolve) => {
                chrome.storage.sync.get([`${provider}ApiKey`], resolve);
              });
              apiKey = result[`${provider}ApiKey`] || '';
              console.log('Chrome Storageから取得した値:', apiKey);
            } catch (error) {
              console.error('Chrome Storageからの取得エラー:', error);
            }
          }
        }
      } else {
        // パスワードフィールドでない場合でも、Chrome Storageから取得を試行
        if (!apiKey && typeof chrome !== 'undefined' && chrome.storage) {
          try {
            const result = await new Promise((resolve) => {
              chrome.storage.sync.get([`${provider}ApiKey`], resolve);
            });
            const storedKey = result[`${provider}ApiKey`] || '';
            if (storedKey) {
              apiKey = storedKey;
              console.log('Chrome Storageから補完取得した値:', apiKey);
            }
          } catch (error) {
            console.error('Chrome Storage補完取得エラー:', error);
          }
        }
      }
      
      const model = modelField?.value || '';
      
      console.log(`最終的に取得したAPIキー長さ: ${apiKey?.length || 0}, 値の先頭: ${apiKey?.substring(0, 10)}...`);
      console.log(`モデル: ${model}`);
      
      if (!apiKey || apiKey.length < 10) {
        console.log('APIキーが空または短すぎます');
        this.showSettingsMessage('有効なAPIキーを入力してください', 'error');
        return;
      }

      console.log('実際の接続テストを実行中...');
      
      // 実際のAPI接続テストを実行
      let testResult = false;
      
      if (provider === 'gemini') {
        testResult = await this.testGeminiConnection(apiKey, model);
      } else if (provider === 'claude') {
        testResult = await this.testClaudeConnection(apiKey, model);
      }
      
      if (testResult) {
        this.showSettingsMessage(`${provider.toUpperCase()}への接続テストに成功しました`, 'success');
        console.log('接続テスト成功');
      } else {
        this.showSettingsMessage(`${provider.toUpperCase()}への接続テストに失敗しました`, 'error');
        console.log('接続テスト失敗');
      }

    } catch (error) {
      console.error('接続テストエラー:', error);
      this.showSettingsMessage(`接続テストに失敗しました: ${error.message}`, 'error');
    } finally {
      console.log('ローディング状態を解除...');
      // ローディング状態を解除
      button.classList.remove('loading');
      button.disabled = false;
    }
  }

  showAIMessage(text, type = 'info') {
    // 既存のメッセージを削除
    const existing = document.querySelector('.ai-message');
    if (existing) {
      existing.remove();
    }

    const messageContainer = document.querySelector('.ai-settings-body');
    if (!messageContainer) return;

    const message = document.createElement('div');
    message.className = `ai-message ${type}`;
    message.innerHTML = `
      <span>${this.getMessageIcon(type)}</span>
      <span>${text}</span>
    `;

    messageContainer.insertBefore(message, messageContainer.firstChild);

    // 3秒後に自動削除
    setTimeout(() => {
      if (message.parentNode) {
        message.remove();
      }
    }, 3000);
  }

  getMessageIcon(type) {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'info': return 'ℹ️';
      default: return 'ℹ️';
    }
  }

  wrapText(before, after, htmlTag = null) {
    if (this.isSourceMode) {
      // ソースモード: textareaにMarkdown記号を挿入
      const sourceEditor = document.getElementById('source-editor');
      const start = sourceEditor.selectionStart;
      const end = sourceEditor.selectionEnd;
      const selectedText = sourceEditor.value.substring(start, end);
      const wrappedText = before + selectedText + after;

      sourceEditor.value =
        sourceEditor.value.substring(0, start) +
        wrappedText +
        sourceEditor.value.substring(end);

      // カーソル位置を調整
      const newCursorPos = start + before.length + selectedText.length;
      sourceEditor.selectionStart = newCursorPos;
      sourceEditor.selectionEnd = newCursorPos;
      sourceEditor.focus();
    } else {
      // WYSIWYGモード: HTMLタグを使用
      const content = document.getElementById('wysiwyg-content');
      const selection = window.getSelection();

      if (selection.rangeCount > 0 && htmlTag) {
        const range = selection.getRangeAt(0);
        const selectedText = range.toString();

        // HTMLタグを作成して選択範囲を囲む
        const element = document.createElement(htmlTag);
        element.textContent = selectedText;

        range.deleteContents();
        range.insertNode(element);

        // カーソルを要素の後ろに配置
        range.setStartAfter(element);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }

      content.focus();
    }

    this.updateWordCount();
  }

  insertAtLineStart(prefix) {
    if (this.isSourceMode) {
      // ソースモード: textareaに挿入
      const sourceEditor = document.getElementById('source-editor');
      const cursorPos = sourceEditor.selectionStart;
      const text = sourceEditor.value;
      const lineStart = text.lastIndexOf('\n', cursorPos - 1) + 1;

      // プレフィックスを挿入
      const beforeText = text.substring(0, lineStart);
      const afterText = text.substring(lineStart);
      sourceEditor.value = beforeText + prefix + afterText;

      // カーソル位置を調整
      sourceEditor.selectionStart = lineStart + prefix.length;
      sourceEditor.selectionEnd = lineStart + prefix.length;
      sourceEditor.focus();
    } else {
      // WYSIWYGモード: カーソル位置にテキストを挿入
      const content = document.getElementById('wysiwyg-content');
      const selection = window.getSelection();

      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);

        // 現在の行の先頭に移動
        let node = range.startContainer;
        while (node && node !== content) {
          if (node.previousSibling) {
            node = node.previousSibling;
            while (node.lastChild) {
              node = node.lastChild;
            }
          } else {
            node = node.parentNode;
          }
          if (node && node.nodeType === Node.TEXT_NODE && node.textContent.includes('\n')) {
            const lastNewline = node.textContent.lastIndexOf('\n');
            range.setStart(node, lastNewline + 1);
            break;
          }
          if (node === content) {
            range.setStart(content, 0);
            break;
          }
        }

        // プレフィックスを挿入
        const textNode = document.createTextNode(prefix);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }

      content.focus();
    }

    this.updateWordCount();
  }

  insertNumberedList() {
    if (this.isSourceMode) {
      const sourceEditor = document.getElementById('source-editor');
      const text = sourceEditor.value;
      const cursorPos = sourceEditor.selectionStart;

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
    } else {
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
  }

  insertText(text) {
    if (this.isSourceMode) {
      // ソースモード: textareaに挿入
      const sourceEditor = document.getElementById('source-editor');
      const start = sourceEditor.selectionStart;
      const end = sourceEditor.selectionEnd;

      sourceEditor.value =
        sourceEditor.value.substring(0, start) +
        text +
        sourceEditor.value.substring(end);

      // カーソル位置を調整
      sourceEditor.selectionStart = start + text.length;
      sourceEditor.selectionEnd = start + text.length;
      sourceEditor.focus();
    } else {
      // WYSIWYGモード
      const content = document.getElementById('wysiwyg-content');
      const selection = window.getSelection();

      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
        range.collapse(false);
      }

      content.focus();
    }

    this.updateWordCount();
  }

  insertLink() {
    const url = prompt('リンクURLを入力してください:');
    const text = prompt('リンクテキストを入力してください:', 'リンク');

    if (url && text) {
      if (this.isSourceMode) {
        this.insertText(`[${text}](${url})`);
      } else {
        // WYSIWYGモード: <a>タグを挿入
        const content = document.getElementById('wysiwyg-content');
        const selection = window.getSelection();

        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const link = document.createElement('a');
          link.href = url;
          link.textContent = text;
          link.className = 'editable-link';

          range.deleteContents();
          range.insertNode(link);
          range.setStartAfter(link);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }

        content.focus();
        this.updateWordCount();
      }
    }
  }

  insertImage() {
    console.log('[DEBUG] insertImage() called');
    // Google Driveピッカーを開く
    const picker = getDriveImagePicker();
    console.log('[DEBUG] picker instance:', picker);

    picker.onSelect((imageData) => {
      console.log('[DEBUG] Image selected:', imageData);
      const url = imageData.url;
      const alt = imageData.fileName;

      if (url && alt) {
        if (this.isSourceMode) {
          this.insertText(`![${alt}](${url})`);
        } else {
          // WYSIWYGモード: <img>タグを挿入
          const content = document.getElementById('wysiwyg-content');
          const selection = window.getSelection();

          if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const img = document.createElement('img');
            img.src = url;
            img.alt = alt;
            img.className = 'editable-image';
            img.style.maxWidth = '100%';
            img.style.height = 'auto';

            range.deleteContents();
            range.insertNode(img);
            range.setStartAfter(img);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
          }

          content.focus();
          this.updateWordCount();
        }
      }
    });

    console.log('[DEBUG] Calling picker.open()');
    picker.open();
    console.log('[DEBUG] picker.open() completed');
  }

  insertTable() {
    if (this.isSourceMode) {
      const tableMarkdown = `\n| ヘッダー1 | ヘッダー2 | ヘッダー3 |\n|-----------|-----------|-----------|\n| セル1     | セル2     | セル3     |\n| セル4     | セル5     | セル6     |\n`;
      this.insertText(tableMarkdown);
    } else {
      // WYSIWYGモード: HTMLテーブルを挿入
      const content = document.getElementById('wysiwyg-content');
      const selection = window.getSelection();

      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);

        const table = document.createElement('table');
        table.innerHTML = `
          <thead>
            <tr>
              <th>ヘッダー1</th>
              <th>ヘッダー2</th>
              <th>ヘッダー3</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>セル1</td>
              <td>セル2</td>
              <td>セル3</td>
            </tr>
            <tr>
              <td>セル4</td>
              <td>セル5</td>
              <td>セル6</td>
            </tr>
          </tbody>
        `;

        range.deleteContents();
        range.insertNode(table);
        range.setStartAfter(table);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }

      content.focus();
      this.updateWordCount();
    }
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

  // バージョン管理機能のためのエイリアス
  getMarkdownContent() {
    return this.getCurrentContent();
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
          <button id="openInNewTabBtn" class="edit-dialog-btn edit-dialog-btn-primary" style="margin-right: auto;">新しいタブで開く</button>
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

    // 新しいタブで開くボタン
    dialog.querySelector('#openInNewTabBtn').onclick = () => {
      const url = urlInput.value.trim();
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
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

  async saveFile() {
    const content = this.getCurrentContent();

    // バージョン履歴に保存
    if (this.versionIntegration) {
      try {
        await this.versionIntegration.showSaveDialog();
      } catch (error) {
        console.error('バージョン保存エラー:', error);
      }
    }

    // ローカルファイルとして保存
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
    // ソースエディタのイベントリスナー
    const sourceEditor = document.getElementById('source-editor');
    if (sourceEditor) {
      // 入力時の処理：履歴記録＋文字数更新
      ['input', 'change', 'keyup', 'paste'].forEach(eventType => {
        sourceEditor.addEventListener(eventType, () => {
          this.saveToHistory();
        });
      });

      // Ctrl+Z / Ctrl+Shift+Z のキーボードショートカット
      sourceEditor.addEventListener('keydown', (e) => {
        if (e.ctrlKey && !e.shiftKey && e.key === 'z') {
          e.preventDefault();
          this.undo();
        } else if (e.ctrlKey && e.shiftKey && e.key === 'z') {
          e.preventDefault();
          this.redo();
        }
      });
    }

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

  // URLパラメータ処理
  handleURLFileParameter() {
    const urlParams = new URLSearchParams(window.location.search);
    const fileUrl = urlParams.get('file');
    
    if (fileUrl) {
      // セキュリティチェック: localhostのみ許可
      if (!fileUrl.startsWith('http://localhost:') && !fileUrl.startsWith('https://localhost:')) {
        console.warn('セキュリティ警告: localhost以外のURLは許可されていません:', fileUrl);
        this.showModal('セキュリティエラー', 
          'セキュリティ上の理由により、localhost以外のURLからのファイル読み込みは許可されていません。');
        return;
      }
      
      // URLの妥当性検証
      try {
        new URL(fileUrl);
      } catch (error) {
        console.error('無効なURL形式:', fileUrl);
        this.showModal('URLエラー', 
          '無効なURL形式です。正しいURLを指定してください。');
        return;
      }
      
      console.log('外部ファイルURLが指定されました:', fileUrl);
      this.loadFileFromURL(fileUrl);
    }
  }

  // HTTP経由でのファイル取得
  async loadFileFromURL(fileUrl) {
    try {
      console.log('ファイルを取得中:', fileUrl);
      
      // タイムアウト設定付きfetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒タイムアウト
      
      // CORS対応のfetchオプション
      const response = await fetch(fileUrl, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        signal: controller.signal,
        headers: {
          'Accept': 'text/plain,text/markdown,text/*,*/*'
        }
      });
      
      clearTimeout(timeoutId);
      
      // HTTPステータスチェック
      if (!response.ok) {
        let statusMessage = '';
        switch (response.status) {
          case 404:
            statusMessage = 'ファイルが見つかりません（404）';
            break;
          case 403:
            statusMessage = 'ファイルへのアクセスが拒否されました（403）';
            break;
          case 500:
            statusMessage = 'サーバー内部エラーが発生しました（500）';
            break;
          case 502:
          case 503:
            statusMessage = 'サーバーが一時的に利用できません';
            break;
          default:
            statusMessage = `サーバーエラー: ${response.status} ${response.statusText}`;
        }
        throw new Error(statusMessage);
      }
      
      // Content-Typeチェック
      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.includes('text/') && !contentType.includes('application/')) {
        console.warn('警告: テキストファイル以外の可能性があります:', contentType);
      }
      
      const content = await response.text();
      console.log('ファイル取得成功、コンテンツ長:', content.length);
      
      // コンテンツサイズの検証
      const maxSize = await this.getMaxFileSize();
      if (content.length > maxSize) {
        const sizeMB = Math.round(content.length / 1024 / 1024 * 10) / 10;
        const limitMB = Math.round(maxSize / 1024 / 1024);
        throw new Error(`ファイルサイズが大きすぎます（${sizeMB}MB > ${limitMB}MB制限）`);
      }
      
      // 空ファイルチェック
      if (content.length === 0) {
        console.warn('警告: 空のファイルです');
        this.showModal('ファイル読み込み警告', 
          'ファイルは空です。内容がないファイルが読み込まれました。');
      }
      
      // エディターにコンテンツを設定
      if (this.isSourceMode) {
        const sourceEditor = document.getElementById('source-editor');
        sourceEditor.value = content;
      } else {
        const wysiwygContent = document.getElementById('wysiwyg-content');
        if (wysiwygContent) {
          wysiwygContent.innerHTML = this.markdownToHtml(content);
          setupTaskListEvents();
        }
      }
      
      // ファイル名を推定して設定
      const filename = this.extractFilenameFromURL(fileUrl);
      this.currentFileName = filename;
      this.updateWordCount();
      
      console.log('外部ファイルの読み込み完了:', filename);
      
      // 成功メッセージを表示（オプション）
      const statusElement = document.getElementById('word-count');
      if (statusElement) {
        const originalText = statusElement.textContent;
        statusElement.textContent = `✅ ${filename} を読み込み完了`;
        setTimeout(() => {
          this.updateWordCount(); // 元の表示に戻す
        }, 3000);
      }
      
    } catch (error) {
      // 詳細なエラーメッセージとユーザー向けガイダンス
      let errorMessage = '';
      let userGuidance = '';
      
      if (error.name === 'AbortError') {
        errorMessage = 'ファイル読み込みがタイムアウトしました（30秒）';
        userGuidance = '• 中継アプリが起動しているか確認してください<br>• ネットワーク接続を確認してください';
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'ネットワークエラー: 中継アプリが起動していない可能性があります';
        userGuidance = '• SightEditRelay.exeが起動しているか確認してください<br>• ポート8080が使用可能か確認してください';
      } else if (error.message.includes('CORS')) {
        errorMessage = 'CORS エラー: 中継アプリのCORS設定を確認してください';
        userGuidance = '• 中継アプリの設定でCORSが有効になっているか確認してください';
      } else if (error.message.includes('ファイルが見つかりません')) {
        errorMessage = error.message;
        userGuidance = '• ファイルパスが正しいか確認してください<br>• ファイルが存在するか確認してください';
      } else {
        errorMessage = error.message;
        userGuidance = '• 中継アプリとの接続を確認してください<br>• ファイルパスとファイル形式を確認してください';
      }
      
      console.error('外部ファイル読み込みエラー:', error);
      this.showModal('ファイル読み込みエラー', 
        `<div style="margin-bottom: 15px;"><strong>${errorMessage}</strong></div>
         <div style="color: #666; font-size: 14px;">
           <strong>解決方法:</strong><br>
           ${userGuidance}
         </div>`);
    }
  }

  // URLからファイル名を抽出
  extractFilenameFromURL(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop();
      return filename || 'external-file.md';
    } catch {
      return 'external-file.md';
    }
  }

  // ファイルサイズ制限を取得
  async getMaxFileSize() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      try {
        const result = await new Promise((resolve) => {
          chrome.storage.sync.get(['maxFileSize'], resolve);
        });
        
        const maxSize = result.maxFileSize;
        if (maxSize && typeof maxSize === 'number' && maxSize > 0) {
          // 最小1MB、最大100MBに制限
          return Math.max(1024 * 1024, Math.min(maxSize, 100 * 1024 * 1024));
        }
      } catch (error) {
        console.warn('ファイルサイズ制限の設定取得に失敗:', error);
      }
    }
    
    // デフォルト10MB
    return 10 * 1024 * 1024;
  }

  // ファイルサイズ制限を設定
  async setMaxFileSize(sizeInMB) {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const sizeInBytes = Math.max(1, Math.min(sizeInMB, 100)) * 1024 * 1024;
      try {
        await new Promise((resolve) => {
          chrome.storage.sync.set({ maxFileSize: sizeInBytes }, resolve);
        });
        console.log(`ファイルサイズ制限を${sizeInMB}MBに設定しました`);
        return true;
      } catch (error) {
        console.error('ファイルサイズ制限の設定に失敗:', error);
        return false;
      }
    }
    return false;
  }

  // クリーンアップメソッド
  cleanup() {
    console.log('エディターのクリーンアップを開始...');

    // バージョン管理機能のクリーンアップ
    if (this.versionIntegration) {
      try {
        this.versionIntegration.cleanup();
        console.log('バージョン管理機能のクリーンアップ完了');
      } catch (error) {
        console.error('バージョン管理機能のクリーンアップエラー:', error);
      }
    }

    // ローカル履歴機能のクリーンアップ
    if (this.localHistoryIntegration) {
      try {
        this.localHistoryIntegration.cleanup();
        console.log('ローカル履歴機能のクリーンアップ完了');
      } catch (error) {
        console.error('ローカル履歴機能のクリーンアップエラー:', error);
      }
    }

    console.log('エディターのクリーンアップが完了しました');
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

// AIコマンド機能の追加
class AICommandUI {
  constructor(editor) {
    this.editor = editor;
    this.commandManager = null;
    this.currentSelectedText = '';
    this.init();
  }

  async init() {
    // AICommandManagerを動的にインポート
    try {
      const { getAICommandManager } = await import('../lib/ai-command-manager.js');
      this.commandManager = getAICommandManager();
      this.setupEventListeners();
      this.renderCommandPanel();
    } catch (error) {
      console.error('AIコマンドマネージャーの読み込みに失敗しました:', error);
    }
  }

  setupEventListeners() {
    // AIコマンドボタンのクリックイベント
    const aiCommandBtn = document.getElementById('ai-command-btn');
    const modal = document.getElementById('ai-command-modal');
    const closeBtn = document.getElementById('ai-command-close');

    if (aiCommandBtn) {
      aiCommandBtn.addEventListener('click', () => {
        this.showCommandPanel();
      });
    }

    // モーダルを閉じる
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hideCommandPanel();
      });
    }

    // モーダル背景クリックで閉じる
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.hideCommandPanel();
        }
      });
    }

    // 入力ダイアログのイベント
    const inputCancel = document.getElementById('command-input-cancel');
    const inputConfirm = document.getElementById('command-input-confirm');

    if (inputCancel) {
      inputCancel.addEventListener('click', () => {
        this.hideInputDialog();
      });
    }

    if (inputConfirm) {
      inputConfirm.addEventListener('click', () => {
        this.confirmInput();
      });
    }
  }

  showCommandPanel() {
    // 選択されたテキストを取得
    this.currentSelectedText = this.getSelectedText();
    
    const modal = document.getElementById('ai-command-modal');
    const preview = document.getElementById('selected-text-preview');
    const content = document.getElementById('selected-text-content');

    if (this.currentSelectedText) {
      preview.style.display = 'block';
      content.textContent = this.currentSelectedText;
    } else {
      preview.style.display = 'none';
      this.currentSelectedText = this.editor.getCurrentContent();
    }

    modal.style.display = 'flex';
  }

  hideCommandPanel() {
    const modal = document.getElementById('ai-command-modal');
    modal.style.display = 'none';
  }

  renderCommandPanel() {
    if (!this.commandManager) return;

    const container = document.getElementById('ai-command-panel-content');
    if (container) {
      container.innerHTML = this.commandManager.generateCommandPanelHTML();
      this.attachCommandListeners();
    }
  }

  attachCommandListeners() {
    const commandButtons = document.querySelectorAll('.command-button');
    commandButtons.forEach(button => {
      button.addEventListener('click', () => {
        const commandId = button.dataset.commandId;
        this.executeCommand(commandId);
      });
    });
  }

  async executeCommand(commandId) {
    if (!this.commandManager) return;

    const command = this.commandManager.commands[commandId];
    if (!command) return;

    try {
      let params = {};

      // 入力が必要な場合
      if (command.requiresInput) {
        const inputValue = await this.showInputDialog(command.inputField);
        if (inputValue === null) return; // キャンセルされた
        params[command.inputField.name] = inputValue;
      }

      // ローディング表示
      this.showLoading(true);

      // コマンド実行
      const result = await this.commandManager.executeCommand(
        commandId, 
        this.currentSelectedText, 
        params
      );

      this.showLoading(false);

      if (result.success) {
        // 結果をエディターに反映
        this.applyResult(result.result);
        this.hideCommandPanel();
      } else {
        alert('エラーが発生しました: ' + result.error);
      }

    } catch (error) {
      this.showLoading(false);
      console.error('コマンド実行エラー:', error);
      alert('コマンドの実行に失敗しました: ' + error.message);
    }
  }

  showInputDialog(inputField) {
    return new Promise((resolve) => {
      const dialog = document.getElementById('command-input-dialog');
      const title = document.getElementById('command-input-title');
      const field = document.getElementById('command-input-field');

      title.textContent = inputField.label;
      field.value = inputField.default || '';
      field.type = inputField.type || 'text';
      field.placeholder = inputField.placeholder || '値を入力してください';

      dialog.style.display = 'block';
      field.focus();

      this.inputResolve = resolve;
    });
  }

  hideInputDialog() {
    const dialog = document.getElementById('command-input-dialog');
    dialog.style.display = 'none';
    if (this.inputResolve) {
      this.inputResolve(null);
    }
  }

  confirmInput() {
    const field = document.getElementById('command-input-field');
    const value = field.value.trim();
    
    this.hideInputDialog();
    if (this.inputResolve) {
      this.inputResolve(value || null);
    }
  }

  showLoading(show) {
    const loading = document.getElementById('ai-command-loading');
    if (loading) {
      loading.style.display = show ? 'flex' : 'none';
    }
  }

  getSelectedText() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      return selection.toString().trim();
    }
    return '';
  }

  applyResult(result) {
    if (this.editor.isSourceMode) {
      // ソースモードの場合
      const sourceEditor = document.getElementById('source-editor');
      if (this.currentSelectedText && sourceEditor.value.includes(this.currentSelectedText)) {
        sourceEditor.value = sourceEditor.value.replace(this.currentSelectedText, result);
      } else {
        sourceEditor.value = result;
      }
    } else {
      // WYSIWYGモードの場合
      const wysiwygContent = document.getElementById('wysiwyg-content');
      if (this.currentSelectedText) {
        // 選択されたテキストを置換
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          const textNode = document.createTextNode(result);
          range.insertNode(textNode);
          range.collapse(false);
        }
      } else {
        // 全体を置換
        wysiwygContent.innerHTML = this.editor.markdownToHtml(result);
      }
    }
    
    this.editor.updateWordCount();
  }
}

// エクスポート機能の追加
class ExportUI {
  constructor(editor) {
    this.editor = editor;
    this.exportManager = null;
    this.init();
  }

  async init() {
    try {
      const { getExportManager } = await import('../lib/export-manager.js');
      this.exportManager = getExportManager();
      this.setupEventListeners();
      this.renderExportMenu();
    } catch (error) {
      console.error('エクスポートマネージャーの読み込みに失敗しました:', error);
    }
  }

  setupEventListeners() {
    const exportBtn = document.getElementById('export-btn');
    const menu = document.getElementById('export-menu');
    const closeBtn = document.getElementById('export-menu-close');

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.showExportMenu();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hideExportMenu();
      });
    }

    if (menu) {
      menu.addEventListener('click', (e) => {
        if (e.target === menu) {
          this.hideExportMenu();
        }
      });
    }
  }

  showExportMenu() {
    const menu = document.getElementById('export-menu');
    menu.style.display = 'flex';
  }

  hideExportMenu() {
    const menu = document.getElementById('export-menu');
    menu.style.display = 'none';
  }

  renderExportMenu() {
    if (!this.exportManager) return;

    this.renderServiceCategories();
  }

  renderServiceCategories() {
    const clipboardContainer = document.getElementById('clipboard-buttons');
    const downloadContainer = document.getElementById('download-buttons');
    
    if (!clipboardContainer || !downloadContainer) return;

    const serviceFormats = this.exportManager.getServiceOptimizedFormats();
    
    // クリップボード用（コピー&ペースト）
    const clipboardServices = [];
    const downloadServices = [];
    
    Object.values(serviceFormats).forEach(category => {
      category.services.forEach(service => {
        if (service.type === 'clipboard') {
          clipboardServices.push({ ...service, categoryName: category.name });
        } else if (service.type === 'download') {
          downloadServices.push({ ...service, categoryName: category.name });
        }
      });
    });

    // クリップボード用サービス表示
    clipboardContainer.innerHTML = this.generateServiceButtons(clipboardServices, 'clipboard');
    
    // ダウンロード用サービス表示
    downloadContainer.innerHTML = this.generateServiceButtons(downloadServices, 'download');
    
    // イベントリスナーを追加
    this.attachServiceEventListeners();
  }

  generateServiceButtons(services, type) {
    return services.map(service => `
      <button class="export-button" data-service-id="${service.id}" data-type="${type}" title="${service.description}">
        <span class="export-button-icon">${service.icon}</span>
        <div class="export-button-content">
          <div class="export-button-name">${service.name}</div>
          <div class="export-button-description">${service.description}</div>
        </div>
      </button>
    `).join('');
  }

  attachServiceEventListeners() {
    const allButtons = document.querySelectorAll('.export-button[data-service-id]');
    allButtons.forEach(button => {
      button.addEventListener('click', () => {
        const serviceId = button.dataset.serviceId;
        const type = button.dataset.type;
        if (type === 'clipboard') {
          this.executeServiceExport(serviceId);
        } else if (type === 'download') {
          this.executeServiceDownload(serviceId);
        }
      });
    });
  }

  async executeServiceExport(serviceId) {
    if (!this.exportManager) return;

    const content = this.editor.getCurrentContent();
    const serviceFormats = this.exportManager.getServiceOptimizedFormats();
    
    // サービスを検索
    let targetService = null;
    Object.values(serviceFormats).forEach(category => {
      const found = category.services.find(s => s.id === serviceId);
      if (found) targetService = found;
    });

    if (!targetService) return;

    try {
      const success = await targetService.action(content);
      if (success) {
        this.showMessage(`${targetService.name}向けにクリップボードにコピーしました`, 'success');
        this.hideExportMenu();
      } else {
        this.showMessage('クリップボードへのコピーに失敗しました', 'error');
      }
    } catch (error) {
      console.error('サービスエクスポートエラー:', error);
      this.showMessage('エクスポートに失敗しました: ' + error.message, 'error');
    }
  }

  async executeServiceDownload(serviceId) {
    if (!this.exportManager) return;

    const content = this.editor.getCurrentContent();
    const serviceFormats = this.exportManager.getServiceOptimizedFormats();
    
    // サービスを検索
    let targetService = null;
    Object.values(serviceFormats).forEach(category => {
      const found = category.services.find(s => s.id === serviceId);
      if (found) targetService = found;
    });

    if (!targetService) return;

    try {
      const filename = this.generateFilename(targetService.format);
      await targetService.action(content, filename);
      this.showMessage(`${targetService.name}をダウンロードしました`, 'success');
      this.hideExportMenu();
    } catch (error) {
      console.error('ダウンロードエクスポートエラー:', error);
      this.showMessage('ダウンロードに失敗しました: ' + error.message, 'error');
    }
  }

  generateFilename(format) {
    const baseName = this.editor.currentFileName || 'document';
    const nameWithoutExt = baseName.replace(/\.[^/.]+$/, '');
    
    const extensions = {
      'markdown': '.md',
      'html': '.html',
      'pdf': '.pdf',
      'text': '.txt'
    };

    return nameWithoutExt + (extensions[format] || '.txt');
  }

  showMessage(text, type = 'success') {
    const existing = document.querySelector('.export-message');
    if (existing) {
      existing.remove();
    }

    const message = document.createElement('div');
    message.className = `export-message ${type}`;
    message.textContent = text;
    document.body.appendChild(message);

    setTimeout(() => {
      message.remove();
    }, 3000);
  }
}

// グローバルにUI機能を初期化
let aiCommandUI = null;
let exportUI = null;
let chatPanel = null;
let chatManager = null;

// エディター初期化後に機能を追加
document.addEventListener('DOMContentLoaded', () => {
  const editor = new SimpleMarkdownEditor();

  // グローバルアクセス用
  window.editorManager = editor;

  // 機能の初期化
  setTimeout(async () => {
    aiCommandUI = new AICommandUI(editor);
    exportUI = new ExportUI(editor);

    // グローバルアクセス用
    window.aiCommandUI = aiCommandUI;
    window.exportUI = exportUI;

    // AICommandManager を aiManager として公開（AICommandManager は AIManager を拡張）
    if (aiCommandUI.commandManager) {
      window.aiManager = aiCommandUI.commandManager;
    }

    // AI チャット機能の初期化
    await initChatFeature(editor);

    // キーボードショートカットの設定
    setupKeyboardShortcuts();
  }, 100);
});

// AI チャット機能の初期化
async function initChatFeature(editor) {
  try {
    // ChatStorage の初期化
    const chatStorage = new ChatStorage();
    await chatStorage.initDB();
    console.log('ChatStorage initialized');

    // PromptManager の初期化
    const promptManager = getPromptManager();
    await promptManager.init();
    console.log('PromptManager initialized');

    // PromptLibrary の初期化
    const promptLibrary = new PromptLibrary(promptManager);

    // StyleController の初期化
    const styleController = getStyleController();
    await styleController.init();
    console.log('StyleController initialized');

    // StructuredGenerator の初期化
    const structuredGenerator = getStructuredGenerator();
    console.log('StructuredGenerator initialized');

    // AIChatManager の初期化（aiManagerが設定されるまで待つ）
    const waitForAIManager = setInterval(() => {
      if (window.aiManager) {
        clearInterval(waitForAIManager);

        chatManager = new AIChatManager(window.aiManager, promptManager, chatStorage);

        // StructuredGenerationModal の初期化
        const structuredGenerationModal = new StructuredGenerationModal(structuredGenerator, chatManager);

        // ExportImportManager の初期化
        const exportImportManager = new ExportImportManager();

        // ChatPanel の初期化（structuredGenerator, structuredGenerationModal, exportImportManagerを追加）
        chatPanel = new ChatPanel(chatManager, promptManager, promptLibrary, styleController, structuredGenerator, structuredGenerationModal, exportImportManager);
        chatPanel.render();

        // グローバルアクセス用
        window.chatPanel = chatPanel;
        window.chatManager = chatManager;
        window.chatStorage = chatStorage;
        window.promptManager = promptManager;
        window.promptLibrary = promptLibrary;
        window.styleController = styleController;
        window.structuredGenerator = structuredGenerator;
        window.structuredGenerationModal = structuredGenerationModal;
        window.exportImportManager = exportImportManager;

        // チャットトグルボタンのイベントリスナー
        const chatToggleBtn = document.getElementById('chat-toggle-btn');
        if (chatToggleBtn) {
          chatToggleBtn.addEventListener('click', () => {
            chatPanel.toggle();
          });
        }

        console.log('Chat feature initialized');
      }
    }, 50);

    // タイムアウト（5秒後）
    setTimeout(() => {
      clearInterval(waitForAIManager);
      if (!window.aiManager) {
        console.error('AIManager not available after timeout');
      }
    }, 5000);

  } catch (error) {
    console.error('Failed to initialize chat feature:', error);
  }
}

// キーボードショートカットの設定
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl+K: チャットパネルのトグル
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (chatPanel) {
        chatPanel.toggle();
      }
    }

    // Ctrl+L: 会話クリア
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
      e.preventDefault();
      if (chatPanel && chatPanel.isVisible) {
        if (confirm('会話をクリアしますか？')) {
          chatPanel.clearMessages();
          if (chatManager) {
            chatManager.currentSession = null;
          }
        }
      }
    }

    // Ctrl+P: プロンプトライブラリ
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
      if (chatPanel && chatPanel.isVisible) {
        chatPanel.showPromptLibrary();
      }
    }
  });
}

// API接続テスト関数をSimpleMarkdownEditorクラスに追加
SimpleMarkdownEditor.prototype.testGeminiConnection = async function(apiKey, model) {
  try {
    console.log('Gemini API接続テスト開始...');
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: "こんにちは"
          }]
        }]
      })
    });

    console.log('Gemini APIレスポンス状態:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Gemini API接続成功:', data);
      return true;
    } else {
      console.error('Gemini API接続失敗:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('Gemini API接続エラー:', error);
    return false;
  }
};

SimpleMarkdownEditor.prototype.testClaudeConnection = async function(apiKey, model) {
  try {
    console.log('Claude API接続テスト開始...');
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 10,
        messages: [{
          role: 'user',
          content: 'こんにちは'
        }]
      })
    });

    console.log('Claude APIレスポンス状態:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Claude API接続成功:', data);
      return true;
    } else {
      console.error('Claude API接続失敗:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('Claude API接続エラー:', error);
    return false;
  }
};

// Undo/Redo履歴管理メソッド
SimpleMarkdownEditor.prototype.saveToHistory = function() {
  if (this.isSourceMode) {
    // ソースモード：テキストエリアの内容を保存
    const textarea = document.getElementById('source-editor');
    if (!textarea) return;

    const content = textarea.value;

    // 最後の履歴と同じ内容なら保存しない
    if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === content) {
      return;
    }

    // 履歴スタックに保存
    this.undoStack.push(content);

    // 最大履歴数を超えたら古いものを削除
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }

    // 新しい変更が加わったらredoスタックをクリア
    this.redoStack = [];
  } else {
    // WYSIWYGモード：HTMLコンテンツを保存
    const content = document.getElementById('wysiwyg-content');
    if (!content) return;

    const html = content.innerHTML;

    // 最後の履歴と同じ内容なら保存しない
    if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === html) {
      return;
    }

    // 履歴スタックに保存
    this.undoStack.push(html);

    // 最大履歴数を超えたら古いものを削除
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }

    // 新しい変更が加わったらredoスタックをクリア
    this.redoStack = [];
  }
};

SimpleMarkdownEditor.prototype.undo = function() {
  if (this.undoStack.length <= 1) {
    console.log('これ以上元に戻せません');
    return;
  }

  if (this.isSourceMode) {
    // ソースモード
    const textarea = document.getElementById('source-editor');
    if (!textarea) return;

    // 現在の状態をredoスタックに保存
    const currentContent = textarea.value;
    this.redoStack.push(currentContent);

    // undoスタックから1つ前の状態を復元
    this.undoStack.pop(); // 現在の状態を削除
    const previousContent = this.undoStack[this.undoStack.length - 1];
    textarea.value = previousContent;

    this.updateWordCount();
  } else {
    // WYSIWYGモード
    const content = document.getElementById('wysiwyg-content');
    if (!content) return;

    // 現在の状態をredoスタックに保存
    const currentHtml = content.innerHTML;
    this.redoStack.push(currentHtml);

    // undoスタックから1つ前の状態を復元
    this.undoStack.pop(); // 現在の状態を削除
    const previousHtml = this.undoStack[this.undoStack.length - 1];
    content.innerHTML = previousHtml;

    this.updateWordCount();
  }
};

SimpleMarkdownEditor.prototype.redo = function() {
  if (this.redoStack.length === 0) {
    console.log('これ以上やり直せません');
    return;
  }

  if (this.isSourceMode) {
    // ソースモード
    const textarea = document.getElementById('source-editor');
    if (!textarea) return;

    // 現在の状態をundoスタックに保存
    const currentContent = textarea.value;
    this.undoStack.push(currentContent);

    // redoスタックから次の状態を復元
    const nextContent = this.redoStack.pop();
    textarea.value = nextContent;

    this.updateWordCount();
  } else {
    // WYSIWYGモード
    const content = document.getElementById('wysiwyg-content');
    if (!content) return;

    // 現在の状態をundoスタックに保存
    const currentHtml = content.innerHTML;
    this.undoStack.push(currentHtml);

    // redoスタックから次の状態を復元
    const nextHtml = this.redoStack.pop();
    content.innerHTML = nextHtml;

    this.updateWordCount();
  }
};

export default SimpleMarkdownEditor;