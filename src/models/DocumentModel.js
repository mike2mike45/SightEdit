/**
 * DocumentModel - Document Data Management
 * ES2024対応のドキュメントデータモデル
 */
import { BaseComponent } from '../core/ComponentFactory.js';
import { EVENTS } from '../core/EventBus.js';

export class DocumentModel extends BaseComponent {
  #content = '';
  #fileName = null;
  #isModified = false;
  #history = [];
  #historyIndex = -1;
  #maxHistorySize = 100;
  #metadata = {};

  constructor(config = {}) {
    super(config);
    
    this.#content = config.content || '';
    this.#fileName = config.fileName || null;
    this.#maxHistorySize = config.maxHistorySize || 100;
    this.#metadata = config.metadata || {};
    
    this.#initializeHistory();
  }

  /**
   * 履歴を初期化
   * @private
   */
  #initializeHistory() {
    this.#history = [{
      content: this.#content,
      timestamp: Date.now(),
      action: 'initial'
    }];
    this.#historyIndex = 0;
  }

  /**
   * コンテンツを取得
   * @returns {string} ドキュメントコンテンツ
   */
  get content() {
    return this.#content;
  }

  /**
   * コンテンツを設定
   * @param {string} content - 新しいコンテンツ
   * @param {string} action - 変更アクション
   */
  setContent(content, action = 'edit') {
    if (typeof content !== 'string') {
      throw new TypeError('Content must be a string');
    }

    const oldContent = this.#content;
    this.#content = content;
    this.#isModified = true;

    // 履歴に追加
    this.#addToHistory(content, action);

    // イベント発火
    this.emit(EVENTS.DOCUMENT_CHANGED, {
      oldContent,
      newContent: content,
      action,
      fileName: this.#fileName,
      isModified: this.#isModified
    });
  }

  /**
   * ファイル名を取得
   * @returns {string|null} ファイル名
   */
  get fileName() {
    return this.#fileName;
  }

  /**
   * ファイル名を設定
   * @param {string|null} fileName - ファイル名
   */
  setFileName(fileName) {
    const oldFileName = this.#fileName;
    this.#fileName = fileName;

    this.emit(EVENTS.DOCUMENT_CHANGED, {
      oldFileName,
      newFileName: fileName,
      action: 'rename'
    });
  }

  /**
   * 変更されているかチェック
   * @returns {boolean} 変更されているかどうか
   */
  get isModified() {
    return this.#isModified;
  }

  /**
   * 変更フラグをクリア
   */
  markAsSaved() {
    this.#isModified = false;
    this.emit(EVENTS.DOCUMENT_SAVED, {
      fileName: this.#fileName,
      content: this.#content,
      timestamp: Date.now()
    });
  }

  /**
   * 履歴に追加
   * @private
   * @param {string} content - コンテンツ
   * @param {string} action - アクション
   */
  #addToHistory(content, action) {
    // 現在位置以降の履歴を削除（redo履歴をクリア）
    if (this.#historyIndex < this.#history.length - 1) {
      this.#history = this.#history.slice(0, this.#historyIndex + 1);
    }

    // 新しい履歴を追加
    this.#history.push({
      content,
      timestamp: Date.now(),
      action
    });

    // 履歴サイズ制限
    if (this.#history.length > this.#maxHistorySize) {
      this.#history.shift();
    } else {
      this.#historyIndex++;
    }
  }

  /**
   * Undo実行
   * @returns {boolean} Undoが実行されたかどうか
   */
  undo() {
    if (!this.canUndo()) {
      return false;
    }

    this.#historyIndex--;
    const historyEntry = this.#history[this.#historyIndex];
    
    const oldContent = this.#content;
    this.#content = historyEntry.content;
    this.#isModified = this.#historyIndex > 0; // 初期状態でない場合は変更済み

    this.emit(EVENTS.DOCUMENT_CHANGED, {
      oldContent,
      newContent: this.#content,
      action: 'undo'
    });

    return true;
  }

  /**
   * Redo実行
   * @returns {boolean} Redoが実行されたかどうか
   */
  redo() {
    if (!this.canRedo()) {
      return false;
    }

    this.#historyIndex++;
    const historyEntry = this.#history[this.#historyIndex];
    
    const oldContent = this.#content;
    this.#content = historyEntry.content;
    this.#isModified = this.#historyIndex > 0;

    this.emit(EVENTS.DOCUMENT_CHANGED, {
      oldContent,
      newContent: this.#content,
      action: 'redo'
    });

    return true;
  }

  /**
   * Undoが可能かチェック
   * @returns {boolean} Undoが可能かどうか
   */
  canUndo() {
    return this.#historyIndex > 0;
  }

  /**
   * Redoが可能かチェック
   * @returns {boolean} Redoが可能かどうか
   */
  canRedo() {
    return this.#historyIndex < this.#history.length - 1;
  }

  /**
   * 新規ドキュメント作成
   * @param {string} content - 初期コンテンツ
   */
  newDocument(content = '') {
    this.#content = content;
    this.#fileName = null;
    this.#isModified = false;
    this.#metadata = {};
    
    this.#initializeHistory();

    this.emit(EVENTS.DOCUMENT_NEW, {
      content: this.#content
    });
  }

  /**
   * ドキュメント読み込み
   * @param {string} content - コンテンツ
   * @param {string} fileName - ファイル名
   * @param {Object} metadata - メタデータ
   */
  loadDocument(content, fileName = null, metadata = {}) {
    this.#content = content;
    this.#fileName = fileName;
    this.#isModified = false;
    this.#metadata = { ...metadata };
    
    this.#initializeHistory();

    this.emit(EVENTS.DOCUMENT_LOADED, {
      content: this.#content,
      fileName: this.#fileName,
      metadata: this.#metadata
    });
  }

  /**
   * 文字数を取得
   * @returns {number} 文字数
   */
  getCharacterCount() {
    return this.#content.length;
  }

  /**
   * 単語数を取得
   * @returns {number} 単語数
   */
  getWordCount() {
    if (!this.#content.trim()) {
      return 0;
    }
    return this.#content.trim().split(/\s+/).length;
  }

  /**
   * 行数を取得
   * @returns {number} 行数
   */
  getLineCount() {
    return this.#content.split('\n').length;
  }

  /**
   * メタデータを取得
   * @returns {Object} メタデータ
   */
  get metadata() {
    return { ...this.#metadata };
  }

  /**
   * メタデータを設定
   * @param {string} key - キー
   * @param {*} value - 値
   */
  setMetadata(key, value) {
    this.#metadata[key] = value;
  }

  /**
   * 統計情報を取得
   * @returns {Object} 統計情報
   */
  getStatistics() {
    return {
      characterCount: this.getCharacterCount(),
      wordCount: this.getWordCount(),
      lineCount: this.getLineCount(),
      isModified: this.#isModified,
      fileName: this.#fileName,
      historyLength: this.#history.length,
      canUndo: this.canUndo(),
      canRedo: this.canRedo()
    };
  }

  /**
   * ドキュメントをJSON形式で出力
   * @returns {Object} JSON形式のドキュメントデータ
   */
  toJSON() {
    return {
      content: this.#content,
      fileName: this.#fileName,
      isModified: this.#isModified,
      metadata: this.#metadata,
      statistics: this.getStatistics(),
      timestamp: Date.now()
    };
  }

  /**
   * JSONからドキュメントを復元
   * @param {Object} data - JSON形式のドキュメントデータ
   */
  fromJSON(data) {
    this.#content = data.content || '';
    this.#fileName = data.fileName || null;
    this.#isModified = data.isModified || false;
    this.#metadata = data.metadata || {};
    
    this.#initializeHistory();

    this.emit(EVENTS.DOCUMENT_LOADED, {
      content: this.#content,
      fileName: this.#fileName,
      metadata: this.#metadata,
      restored: true
    });
  }

  /**
   * 破棄処理
   */
  destroy() {
    this.#history = [];
    this.#metadata = {};
    super.destroy();
  }
}