/**
 * EditorController - Main Editor Business Logic
 * ES2024対応のエディタービジネスロジック
 */
import { BaseComponent } from '../core/ComponentFactory.js';
import { EVENTS } from '../core/EventBus.js';

export class EditorController extends BaseComponent {
  #documentModel = null;
  #settingsModel = null;
  #editorView = null;
  #statusBarView = null;
  #isInitialized = false;
  #autoSaveTimer = null;
  #historyPosition = 0;

  constructor(services) {
    super();
    
    this.#documentModel = services.documentModel;
    this.#settingsModel = services.settingsModel;
    this.#editorView = services.editorView;
    this.#statusBarView = services.statusBarView;
  }

  /**
   * 初期化
   */
  async init() {
    if (this.#isInitialized) return;

    await this.#setupEventListeners();
    await this.#setupAutoSave();
    await this.#loadSettings();
    
    this.#isInitialized = true;
    
    this.emit(EVENTS.EDITOR_READY);
  }

  /**
   * イベントリスナーをセットアップ
   * @private
   */
  async #setupEventListeners() {
    // エディタービューからのイベント
    this.#editorView.on(EVENTS.EDITOR_CONTENT_CHANGED, this.#handleContentChange);
    this.#editorView.on(EVENTS.EDITOR_MODE_CHANGED, this.#handleModeChange);
    this.#editorView.on(EVENTS.EDITOR_UNDO, this.#handleUndo);
    this.#editorView.on(EVENTS.EDITOR_REDO, this.#handleRedo);
    this.#editorView.on(EVENTS.FILE_DROP, this.#handleFileDrop);

    // ドキュメントモデルからのイベント
    this.#documentModel.on(EVENTS.DOCUMENT_CHANGED, this.#handleDocumentChange);
    this.#documentModel.on(EVENTS.DOCUMENT_SAVED, this.#handleDocumentSaved);
    this.#documentModel.on(EVENTS.DOCUMENT_STATS_UPDATED, this.#handleStatsUpdate);

    // アプリケーション全体のイベント
    this.on(EVENTS.EDITOR_COMMAND, this.#handleEditorCommand);
    this.on(EVENTS.FILE_OPENED, this.#handleFileOpened);
    this.on(EVENTS.KEYBOARD_SHORTCUT, this.#handleKeyboardShortcut);
  }

  /**
   * 自動保存をセットアップ
   * @private
   */
  async #setupAutoSave() {
    const settings = await this.#settingsModel.getSettings();
    
    if (settings.editor.autoSave.enabled) {
      this.#startAutoSave(settings.editor.autoSave.interval);
    }
  }

  /**
   * 設定を読み込み
   * @private
   */
  async #loadSettings() {
    const settings = await this.#settingsModel.getSettings();
    
    // エディター設定を適用
    this.#applyEditorSettings(settings.editor);
    
    this.emit(EVENTS.EDITOR_SETTINGS_LOADED, { settings });
  }

  /**
   * エディター設定を適用
   * @private
   * @param {Object} editorSettings - エディター設定
   */
  #applyEditorSettings(editorSettings) {
    // フォント設定
    if (editorSettings.fontSize) {
      document.documentElement.style.setProperty('--editor-font-size', `${editorSettings.fontSize}px`);
    }

    // テーマ設定
    if (editorSettings.theme) {
      document.documentElement.setAttribute('data-theme', editorSettings.theme);
    }

    // タブサイズ設定
    if (editorSettings.tabSize) {
      document.documentElement.style.setProperty('--editor-tab-size', editorSettings.tabSize);
    }

    // ワードラップ設定
    if (editorSettings.wordWrap !== undefined) {
      document.documentElement.style.setProperty('--editor-word-wrap', editorSettings.wordWrap ? 'break-word' : 'normal');
    }
  }

  /**
   * コンテンツ変更ハンドラー
   * @private
   * @param {Object} data - イベントデータ
   */
  #handleContentChange = async (data) => {
    const { content, mode } = data;
    
    try {
      // ドキュメントモデルを更新
      await this.#documentModel.setContent(content, 'edit');
      
      // 統計情報を更新
      const stats = this.#calculateStats(content);
      this.#statusBarView.updateStats(stats);
      
      // 変更状態を更新
      this.#editorView.updateModifiedStatus(this.#documentModel.isModified());
      this.#statusBarView.updateFileInfo(
        this.#documentModel.getFileName(),
        this.#documentModel.isModified()
      );

    } catch (error) {
      console.error('[EditorController] Content change error:', error);
      this.#statusBarView.addNotification('コンテンツの更新中にエラーが発生しました', 'error');
    }
  }

  /**
   * モード変更ハンドラー
   * @private
   * @param {Object} data - イベントデータ
   */
  #handleModeChange = async (data) => {
    const { oldMode, newMode } = data;
    
    try {
      // 設定を保存
      await this.#settingsModel.updateSetting('editor.defaultMode', newMode);
      
      // ステータスバーを更新
      this.#statusBarView.updateMode(newMode);
      this.#statusBarView.addNotification(`${newMode}モードに切り替えました`, 'info', 2000);

      this.emit(EVENTS.EDITOR_MODE_CHANGED, { oldMode, newMode });

    } catch (error) {
      console.error('[EditorController] Mode change error:', error);
    }
  }

  /**
   * Undoハンドラー
   * @private
   */
  #handleUndo = async () => {
    try {
      const result = await this.#documentModel.undo();
      
      if (result.success) {
        this.#editorView.setContent(result.content);
        this.#statusBarView.showTemporaryStatus('元に戻しました', 1500);
        
        this.emit(EVENTS.EDITOR_UNDO_EXECUTED, { 
          content: result.content,
          canUndo: result.canUndo,
          canRedo: result.canRedo
        });
      } else {
        this.#statusBarView.addNotification('これ以上元に戻せません', 'warning', 2000);
      }

    } catch (error) {
      console.error('[EditorController] Undo error:', error);
      this.#statusBarView.addNotification('元に戻す操作でエラーが発生しました', 'error');
    }
  }

  /**
   * Redoハンドラー
   * @private
   */
  #handleRedo = async () => {
    try {
      const result = await this.#documentModel.redo();
      
      if (result.success) {
        this.#editorView.setContent(result.content);
        this.#statusBarView.showTemporaryStatus('やり直しました', 1500);
        
        this.emit(EVENTS.EDITOR_REDO_EXECUTED, { 
          content: result.content,
          canUndo: result.canUndo,
          canRedo: result.canRedo
        });
      } else {
        this.#statusBarView.addNotification('これ以上やり直せません', 'warning', 2000);
      }

    } catch (error) {
      console.error('[EditorController] Redo error:', error);
      this.#statusBarView.addNotification('やり直し操作でエラーが発生しました', 'error');
    }
  }

  /**
   * ファイルドロップハンドラー
   * @private
   * @param {Object} data - イベントデータ
   */
  #handleFileDrop = async (data) => {
    const { files } = data;
    
    try {
      // テキストファイルのみを処理
      const textFiles = files.filter(file => 
        file.type.startsWith('text/') || 
        file.name.endsWith('.md') ||
        file.name.endsWith('.txt')
      );

      if (textFiles.length === 0) {
        this.#statusBarView.addNotification('サポートされていないファイル形式です', 'warning');
        return;
      }

      // 最初のファイルを開く
      const file = textFiles[0];
      const content = await file.text();
      
      this.emit(EVENTS.FILE_LOAD_REQUEST, {
        fileName: file.name,
        content,
        source: 'drop'
      });

    } catch (error) {
      console.error('[EditorController] File drop error:', error);
      this.#statusBarView.addNotification('ファイルの読み込み中にエラーが発生しました', 'error');
    }
  }

  /**
   * ドキュメント変更ハンドラー
   * @private
   * @param {Object} data - イベントデータ
   */
  #handleDocumentChange = (data) => {
    const { content, action } = data;
    
    // エディタービューに反映（循環参照を避ける）
    if (action !== 'edit') {
      this.#editorView.setContent(content);
    }
    
    // 統計情報を更新
    const stats = this.#calculateStats(content);
    this.#statusBarView.updateStats(stats);
  }

  /**
   * ドキュメント保存完了ハンドラー
   * @private
   */
  #handleDocumentSaved = () => {
    this.#editorView.updateModifiedStatus(false);
    this.#statusBarView.updateFileInfo(
      this.#documentModel.getFileName(),
      false
    );
    this.#statusBarView.showTemporaryStatus('保存完了', 1500);
  }

  /**
   * 統計更新ハンドラー
   * @private
   * @param {Object} data - 統計データ
   */
  #handleStatsUpdate = (data) => {
    this.#statusBarView.updateStats(data.stats);
  }

  /**
   * エディターコマンドハンドラー
   * @private
   * @param {Object} data - コマンドデータ
   */
  #handleEditorCommand = async (data) => {
    const { command, params } = data;
    
    try {
      switch (command) {
        case 'insert_text':
          await this.insertText(params.text);
          break;
        case 'format_bold':
          await this.formatBold();
          break;
        case 'format_italic':
          await this.formatItalic();
          break;
        case 'insert_link':
          await this.insertLink(params.url, params.text);
          break;
        case 'insert_image':
          await this.insertImage(params.src, params.alt);
          break;
        case 'clear_formatting':
          await this.clearFormatting();
          break;
        default:
          console.warn(`[EditorController] Unknown command: ${command}`);
      }
    } catch (error) {
      console.error(`[EditorController] Command execution error: ${command}`, error);
      this.#statusBarView.addNotification(`コマンド実行エラー: ${command}`, 'error');
    }
  }

  /**
   * ファイル開いたハンドラー
   * @private
   * @param {Object} data - ファイルデータ
   */
  #handleFileOpened = async (data) => {
    const { fileName, content } = data;
    
    try {
      // ドキュメントモデルを更新
      await this.#documentModel.loadFromContent(content, fileName);
      
      // エディタービューを更新
      this.#editorView.setContent(content);
      this.#editorView.updateFileName(fileName);
      this.#editorView.updateModifiedStatus(false);
      
      // ステータスバーを更新
      this.#statusBarView.updateFileInfo(fileName, false);
      this.#statusBarView.addNotification(`${fileName} を開きました`, 'success', 3000);
      
      // フォーカスを設定
      this.#editorView.focus();

    } catch (error) {
      console.error('[EditorController] File open error:', error);
      this.#statusBarView.addNotification('ファイルを開く際にエラーが発生しました', 'error');
    }
  }

  /**
   * キーボードショートカットハンドラー
   * @private
   * @param {Object} data - ショートカットデータ
   */
  #handleKeyboardShortcut = async (data) => {
    const { shortcut, event } = data;
    
    try {
      switch (shortcut) {
        case 'ctrl+b':
          event.preventDefault();
          await this.formatBold();
          break;
        case 'ctrl+i':
          event.preventDefault();
          await this.formatItalic();
          break;
        case 'ctrl+k':
          event.preventDefault();
          await this.insertLink();
          break;
        case 'ctrl+shift+m':
          event.preventDefault();
          this.#editorView.toggleMode();
          break;
        default:
          return false; // 処理されなかった
      }
      return true;
    } catch (error) {
      console.error('[EditorController] Keyboard shortcut error:', error);
      return false;
    }
  }

  /**
   * 自動保存を開始
   * @private
   * @param {number} interval - 間隔（ミリ秒）
   */
  #startAutoSave(interval) {
    if (this.#autoSaveTimer) {
      clearInterval(this.#autoSaveTimer);
    }

    this.#autoSaveTimer = setInterval(() => {
      if (this.#documentModel.isModified()) {
        this.emit(EVENTS.AUTO_SAVE_REQUEST);
      }
    }, interval);
  }

  /**
   * 自動保存を停止
   * @private
   */
  #stopAutoSave() {
    if (this.#autoSaveTimer) {
      clearInterval(this.#autoSaveTimer);
      this.#autoSaveTimer = null;
    }
  }

  /**
   * 統計情報を計算
   * @private
   * @param {string} content - コンテンツ
   * @returns {Object} 統計情報
   */
  #calculateStats(content) {
    return this.#statusBarView.calculateStats(content);
  }

  // Public API Methods

  /**
   * テキストを挿入
   * @param {string} text - 挿入するテキスト
   */
  async insertText(text) {
    this.#editorView.insertText(text);
  }

  /**
   * 太字フォーマット
   */
  async formatBold() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const text = selection.toString();
      if (text) {
        const boldText = `**${text}**`;
        this.#editorView.insertText(boldText);
      } else {
        this.#editorView.insertText('****');
        // カーソルを太字マーカーの間に移動
      }
    }
  }

  /**
   * イタリックフォーマット
   */
  async formatItalic() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const text = selection.toString();
      if (text) {
        const italicText = `*${text}*`;
        this.#editorView.insertText(italicText);
      } else {
        this.#editorView.insertText('**');
      }
    }
  }

  /**
   * リンクを挿入
   * @param {string} url - URL
   * @param {string} text - リンクテキスト
   */
  async insertLink(url = '', text = '') {
    const selection = window.getSelection();
    const selectedText = selection.toString();
    
    const linkText = text || selectedText || 'リンクテキスト';
    const linkUrl = url || 'https://example.com';
    
    const markdown = `[${linkText}](${linkUrl})`;
    this.#editorView.insertText(markdown);
  }

  /**
   * 画像を挿入
   * @param {string} src - 画像URL
   * @param {string} alt - 代替テキスト
   */
  async insertImage(src = '', alt = '') {
    const imageSrc = src || 'image.jpg';
    const imageAlt = alt || '画像';
    
    const markdown = `![${imageAlt}](${imageSrc})`;
    this.#editorView.insertText(markdown);
  }

  /**
   * フォーマットをクリア
   */
  async clearFormatting() {
    // 選択テキストからMarkdownフォーマットを除去
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const text = selection.toString();
      if (text) {
        // 基本的なMarkdown記号を除去
        const plainText = text
          .replace(/\*\*(.*?)\*\*/g, '$1')  // 太字
          .replace(/\*(.*?)\*/g, '$1')      // イタリック
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // リンク
          .replace(/#{1,6}\s/g, '')         // ヘッダー
          .replace(/`(.*?)`/g, '$1');       // インラインコード

        this.#editorView.insertText(plainText);
      }
    }
  }

  /**
   * エディターをクリア
   */
  async clearEditor() {
    await this.#documentModel.clear();
    this.#editorView.setContent('');
    this.#editorView.updateFileName('');
    this.#editorView.updateModifiedStatus(false);
    this.#statusBarView.updateFileInfo('無題', false);
  }

  /**
   * 現在のコンテンツを取得
   * @returns {string} コンテンツ
   */
  getCurrentContent() {
    return this.#editorView.getContent();
  }

  /**
   * 設定を更新
   * @param {Object} settings - 新しい設定
   */
  async updateSettings(settings) {
    await this.#settingsModel.updateSettings(settings);
    
    if (settings.editor) {
      this.#applyEditorSettings(settings.editor);
    }
    
    if (settings.editor?.autoSave) {
      if (settings.editor.autoSave.enabled) {
        this.#startAutoSave(settings.editor.autoSave.interval);
      } else {
        this.#stopAutoSave();
      }
    }
  }

  /**
   * デバッグ情報を取得
   * @returns {Object} デバッグ情報
   */
  getDebugInfo() {
    return {
      isInitialized: this.#isInitialized,
      hasAutoSave: !!this.#autoSaveTimer,
      documentInfo: this.#documentModel.getDebugInfo(),
      currentContent: this.getCurrentContent().substring(0, 100) + '...',
      historyPosition: this.#historyPosition
    };
  }

  /**
   * 破棄処理
   */
  destroy() {
    this.#stopAutoSave();
    
    this.#documentModel = null;
    this.#settingsModel = null;
    this.#editorView = null;
    this.#statusBarView = null;
    this.#isInitialized = false;
    
    super.destroy();
  }
}