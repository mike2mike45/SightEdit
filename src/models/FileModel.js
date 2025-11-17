/**
 * FileModel - File Management Data Model
 * ES2024対応のファイル管理データモデル
 */
import { BaseComponent } from '../core/ComponentFactory.js';
import { EVENTS } from '../core/EventBus.js';

export class FileModel extends BaseComponent {
  #recentFiles = [];
  #maxRecentFiles = 10;
  #supportedExtensions = new Set(['.md', '.markdown', '.txt', '.html', '.htm']);
  #currentFileHandle = null;

  constructor(config = {}) {
    super(config);
    
    this.#maxRecentFiles = config.maxRecentFiles || 10;
    this.#supportedExtensions = new Set(config.supportedExtensions || ['.md', '.markdown', '.txt', '.html', '.htm']);
    this.#recentFiles = [];
    
    this.#loadRecentFiles();
  }

  /**
   * 最近のファイル一覧を読み込み
   * @private
   */
  async #loadRecentFiles() {
    try {
      const stored = localStorage.getItem('sightedit_recent_files');
      if (stored) {
        this.#recentFiles = JSON.parse(stored).filter(file => 
          file && file.name && file.lastModified
        );
      }
    } catch (error) {
      console.error('[FileModel] Failed to load recent files:', error);
      this.#recentFiles = [];
    }
  }

  /**
   * 最近のファイル一覧を保存
   * @private
   */
  #saveRecentFiles() {
    try {
      localStorage.setItem('sightedit_recent_files', JSON.stringify(this.#recentFiles));
    } catch (error) {
      console.error('[FileModel] Failed to save recent files:', error);
    }
  }

  /**
   * ファイル情報を最近のファイルに追加
   * @param {Object} fileInfo - ファイル情報
   */
  addToRecentFiles(fileInfo) {
    if (!fileInfo || !fileInfo.name) {
      return;
    }

    const fileRecord = {
      name: fileInfo.name,
      path: fileInfo.path || null,
      size: fileInfo.size || 0,
      lastModified: Date.now(),
      type: this.#getFileType(fileInfo.name),
      handle: null // File handleは永続化しない
    };

    // 既存のエントリを削除
    this.#recentFiles = this.#recentFiles.filter(f => f.name !== fileRecord.name);

    // 先頭に追加
    this.#recentFiles.unshift(fileRecord);

    // 最大数を超えた場合は古いものを削除
    if (this.#recentFiles.length > this.#maxRecentFiles) {
      this.#recentFiles = this.#recentFiles.slice(0, this.#maxRecentFiles);
    }

    this.#saveRecentFiles();

    this.emit(EVENTS.FILE_OPENED, {
      file: fileRecord,
      recentFiles: [...this.#recentFiles]
    });
  }

  /**
   * 最近のファイル一覧を取得
   * @returns {Array} 最近のファイル一覧
   */
  getRecentFiles() {
    return [...this.#recentFiles];
  }

  /**
   * 最近のファイルから削除
   * @param {string} fileName - ファイル名
   */
  removeFromRecentFiles(fileName) {
    this.#recentFiles = this.#recentFiles.filter(f => f.name !== fileName);
    this.#saveRecentFiles();

    this.emit('recentFiles:updated', {
      recentFiles: [...this.#recentFiles]
    });
  }

  /**
   * 最近のファイル一覧をクリア
   */
  clearRecentFiles() {
    this.#recentFiles = [];
    this.#saveRecentFiles();

    this.emit('recentFiles:cleared', {
      recentFiles: []
    });
  }

  /**
   * ファイルタイプを取得
   * @private
   * @param {string} fileName - ファイル名
   * @returns {string} ファイルタイプ
   */
  #getFileType(fileName) {
    const extension = this.#getFileExtension(fileName);
    
    switch (extension) {
      case '.md':
      case '.markdown':
        return 'markdown';
      case '.txt':
        return 'text';
      case '.html':
      case '.htm':
        return 'html';
      default:
        return 'unknown';
    }
  }

  /**
   * ファイル拡張子を取得
   * @private
   * @param {string} fileName - ファイル名
   * @returns {string} ファイル拡張子
   */
  #getFileExtension(fileName) {
    if (!fileName) return '';
    const lastDot = fileName.lastIndexOf('.');
    return lastDot === -1 ? '' : fileName.slice(lastDot).toLowerCase();
  }

  /**
   * ファイルがサポートされているかチェック
   * @param {string} fileName - ファイル名
   * @returns {boolean} サポートされているかどうか
   */
  isSupportedFile(fileName) {
    const extension = this.#getFileExtension(fileName);
    return this.#supportedExtensions.has(extension);
  }

  /**
   * サポートされているファイル拡張子一覧を取得
   * @returns {string[]} 拡張子一覧
   */
  getSupportedExtensions() {
    return Array.from(this.#supportedExtensions);
  }

  /**
   * ファイルサイズを人間読みやすい形式に変換
   * @param {number} bytes - バイト数
   * @returns {string} 読みやすいファイルサイズ
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * ファイル情報を検証
   * @param {File} file - ファイルオブジェクト
   * @returns {Object} 検証結果
   */
  validateFile(file) {
    const result = {
      valid: true,
      errors: [],
      warnings: []
    };

    if (!file) {
      result.valid = false;
      result.errors.push('ファイルが選択されていません');
      return result;
    }

    // ファイル名チェック
    if (!file.name) {
      result.valid = false;
      result.errors.push('ファイル名が無効です');
    }

    // 拡張子チェック
    if (!this.isSupportedFile(file.name)) {
      result.valid = false;
      result.errors.push(`サポートされていないファイル形式です: ${this.#getFileExtension(file.name)}`);
    }

    // ファイルサイズチェック（10MB制限）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      result.valid = false;
      result.errors.push(`ファイルサイズが大きすぎます: ${this.formatFileSize(file.size)} (最大: ${this.formatFileSize(maxSize)})`);
    }

    // 警告チェック
    const warningSize = 1024 * 1024; // 1MB
    if (file.size > warningSize) {
      result.warnings.push(`大きなファイルです: ${this.formatFileSize(file.size)}`);
    }

    return result;
  }

  /**
   * 現在のファイルハンドルを設定
   * @param {FileSystemFileHandle} fileHandle - ファイルハンドル
   */
  setCurrentFileHandle(fileHandle) {
    this.#currentFileHandle = fileHandle;
  }

  /**
   * 現在のファイルハンドルを取得
   * @returns {FileSystemFileHandle|null} ファイルハンドル
   */
  getCurrentFileHandle() {
    return this.#currentFileHandle;
  }

  /**
   * File System Access API が使用可能かチェック
   * @returns {boolean} 使用可能かどうか
   */
  isFileSystemAccessSupported() {
    return 'showOpenFilePicker' in window && 'showSaveFilePicker' in window;
  }

  /**
   * ファイル保存用の拡張子フィルターを生成
   * @returns {Array} ファイル形式フィルター
   */
  getFileFilters() {
    return [
      {
        description: 'Markdown files',
        accept: {
          'text/markdown': ['.md', '.markdown']
        }
      },
      {
        description: 'Text files',
        accept: {
          'text/plain': ['.txt']
        }
      },
      {
        description: 'HTML files',
        accept: {
          'text/html': ['.html', '.htm']
        }
      }
    ];
  }

  /**
   * ファイル統計情報を取得
   * @returns {Object} 統計情報
   */
  getStatistics() {
    const fileTypes = Object.groupBy(this.#recentFiles, file => file.type);
    
    return {
      totalRecentFiles: this.#recentFiles.length,
      fileTypes,
      supportedExtensions: this.getSupportedExtensions(),
      hasFileSystemAccess: this.isFileSystemAccessSupported(),
      lastUsedFile: this.#recentFiles[0] || null
    };
  }

  /**
   * エクスポート用データを生成
   * @returns {Object} エクスポートデータ
   */
  exportData() {
    return {
      recentFiles: this.#recentFiles.map(file => ({
        name: file.name,
        path: file.path,
        size: file.size,
        lastModified: file.lastModified,
        type: file.type
      })),
      settings: {
        maxRecentFiles: this.#maxRecentFiles,
        supportedExtensions: Array.from(this.#supportedExtensions)
      },
      timestamp: Date.now()
    };
  }

  /**
   * データをインポート
   * @param {Object} data - インポートデータ
   */
  importData(data) {
    if (data.recentFiles && Array.isArray(data.recentFiles)) {
      this.#recentFiles = data.recentFiles.slice(0, this.#maxRecentFiles);
      this.#saveRecentFiles();
    }

    if (data.settings) {
      if (data.settings.maxRecentFiles) {
        this.#maxRecentFiles = data.settings.maxRecentFiles;
      }
      if (data.settings.supportedExtensions) {
        this.#supportedExtensions = new Set(data.settings.supportedExtensions);
      }
    }

    this.emit('fileModel:imported', {
      recentFiles: [...this.#recentFiles],
      settings: {
        maxRecentFiles: this.#maxRecentFiles,
        supportedExtensions: Array.from(this.#supportedExtensions)
      }
    });
  }

  /**
   * 破棄処理
   */
  destroy() {
    this.#recentFiles = [];
    this.#currentFileHandle = null;
    super.destroy();
  }
}