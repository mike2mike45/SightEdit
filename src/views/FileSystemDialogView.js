/**
 * FileSystemDialogView - File System Access API Integration
 * ES2024対応のファイルシステムダイアログ
 */
import { BaseView } from './BaseView.js';
import { EVENTS } from '../core/EventBus.js';

export class FileSystemDialogView extends BaseView {
  #fileFilters = [];
  #defaultDirectory = null;

  constructor(config = {}) {
    super(config);
    
    this.#fileFilters = config.fileFilters || this.#getDefaultFileFilters();
    this.#defaultDirectory = config.defaultDirectory || null;
  }

  /**
   * デフォルトファイルフィルターを取得
   * @private
   * @returns {Array} ファイルフィルター
   */
  #getDefaultFileFilters() {
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
      },
      {
        description: 'All supported files',
        accept: {
          'text/markdown': ['.md', '.markdown'],
          'text/plain': ['.txt'],
          'text/html': ['.html', '.htm']
        }
      }
    ];
  }

  /**
   * File System Access APIがサポートされているかチェック
   * @returns {boolean} サポートされているかどうか
   */
  isSupported() {
    return 'showOpenFilePicker' in window && 'showSaveFilePicker' in window;
  }

  /**
   * ファイルオープンダイアログを表示
   * @param {Object} options - オプション
   * @returns {Promise<FileSystemFileHandle[]>} ファイルハンドル
   */
  async showOpenFilePicker(options = {}) {
    if (!this.isSupported()) {
      throw new Error('File System Access API is not supported');
    }

    const pickerOptions = {
      types: options.types || this.#fileFilters,
      excludeAcceptAllOption: options.excludeAcceptAllOption || false,
      multiple: options.multiple || false,
      startIn: options.startIn || this.#defaultDirectory || 'documents'
    };

    try {
      this.emit(EVENTS.FILE_DIALOG_OPENING, {
        type: 'open',
        options: pickerOptions
      });

      const fileHandles = await window.showOpenFilePicker(pickerOptions);

      this.emit(EVENTS.FILE_DIALOG_SUCCESS, {
        type: 'open',
        fileHandles,
        count: fileHandles.length
      });

      return fileHandles;

    } catch (error) {
      if (error.name === 'AbortError') {
        this.emit(EVENTS.FILE_DIALOG_CANCELLED, {
          type: 'open'
        });
        return null;
      }

      this.emit(EVENTS.FILE_ERROR, {
        type: 'open_dialog_error',
        error: error.message,
        originalError: error
      });

      throw error;
    }
  }

  /**
   * ファイル保存ダイアログを表示
   * @param {Object} options - オプション
   * @returns {Promise<FileSystemFileHandle>} ファイルハンドル
   */
  async showSaveFilePicker(options = {}) {
    if (!this.isSupported()) {
      throw new Error('File System Access API is not supported');
    }

    const pickerOptions = {
      suggestedName: options.suggestedName || 'document.md',
      types: options.types || this.#fileFilters,
      excludeAcceptAllOption: options.excludeAcceptAllOption || false,
      startIn: options.startIn || this.#defaultDirectory || 'documents'
    };

    try {
      this.emit(EVENTS.FILE_DIALOG_OPENING, {
        type: 'save',
        options: pickerOptions
      });

      const fileHandle = await window.showSaveFilePicker(pickerOptions);

      this.emit(EVENTS.FILE_DIALOG_SUCCESS, {
        type: 'save',
        fileHandle,
        fileName: fileHandle.name
      });

      return fileHandle;

    } catch (error) {
      if (error.name === 'AbortError') {
        this.emit(EVENTS.FILE_DIALOG_CANCELLED, {
          type: 'save'
        });
        return null;
      }

      this.emit(EVENTS.FILE_ERROR, {
        type: 'save_dialog_error',
        error: error.message,
        originalError: error
      });

      throw error;
    }
  }

  /**
   * ディレクトリ選択ダイアログを表示
   * @param {Object} options - オプション
   * @returns {Promise<FileSystemDirectoryHandle>} ディレクトリハンドル
   */
  async showDirectoryPicker(options = {}) {
    if (!('showDirectoryPicker' in window)) {
      throw new Error('Directory picker is not supported');
    }

    const pickerOptions = {
      mode: options.mode || 'read',
      startIn: options.startIn || this.#defaultDirectory || 'documents'
    };

    try {
      this.emit(EVENTS.FILE_DIALOG_OPENING, {
        type: 'directory',
        options: pickerOptions
      });

      const dirHandle = await window.showDirectoryPicker(pickerOptions);

      this.emit(EVENTS.FILE_DIALOG_SUCCESS, {
        type: 'directory',
        dirHandle,
        dirName: dirHandle.name
      });

      return dirHandle;

    } catch (error) {
      if (error.name === 'AbortError') {
        this.emit(EVENTS.FILE_DIALOG_CANCELLED, {
          type: 'directory'
        });
        return null;
      }

      this.emit(EVENTS.FILE_ERROR, {
        type: 'directory_dialog_error',
        error: error.message,
        originalError: error
      });

      throw error;
    }
  }

  /**
   * ファイルを読み取り
   * @param {FileSystemFileHandle} fileHandle - ファイルハンドル
   * @returns {Promise<Object>} ファイル情報
   */
  async readFile(fileHandle) {
    try {
      const file = await fileHandle.getFile();
      const content = await file.text();

      return {
        handle: fileHandle,
        file,
        name: file.name,
        size: file.size,
        lastModified: file.lastModified,
        type: file.type,
        content
      };

    } catch (error) {
      this.emit(EVENTS.FILE_ERROR, {
        type: 'read_error',
        fileName: fileHandle.name,
        error: error.message,
        originalError: error
      });

      throw error;
    }
  }

  /**
   * ファイルに書き込み
   * @param {FileSystemFileHandle} fileHandle - ファイルハンドル
   * @param {string} content - コンテンツ
   * @returns {Promise<void>}
   */
  async writeFile(fileHandle, content) {
    try {
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();

      this.emit(EVENTS.FILE_SAVED, {
        fileName: fileHandle.name,
        size: content.length,
        handle: fileHandle
      });

    } catch (error) {
      this.emit(EVENTS.FILE_ERROR, {
        type: 'write_error',
        fileName: fileHandle.name,
        error: error.message,
        originalError: error
      });

      throw error;
    }
  }

  /**
   * ファイル権限をチェック
   * @param {FileSystemFileHandle} fileHandle - ファイルハンドル
   * @param {string} mode - モード ('read' | 'readwrite')
   * @returns {Promise<boolean>} 権限があるかどうか
   */
  async checkPermission(fileHandle, mode = 'read') {
    try {
      const permission = await fileHandle.queryPermission({ mode });
      return permission === 'granted';
    } catch (error) {
      console.warn('[FileSystemDialogView] Permission check failed:', error);
      return false;
    }
  }

  /**
   * ファイル権限をリクエスト
   * @param {FileSystemFileHandle} fileHandle - ファイルハンドル
   * @param {string} mode - モード ('read' | 'readwrite')
   * @returns {Promise<boolean>} 権限が付与されたかどうか
   */
  async requestPermission(fileHandle, mode = 'readwrite') {
    try {
      const permission = await fileHandle.requestPermission({ mode });
      return permission === 'granted';
    } catch (error) {
      console.warn('[FileSystemDialogView] Permission request failed:', error);
      return false;
    }
  }

  /**
   * レガシーファイル選択（input要素）のフォールバック
   * @param {Object} options - オプション
   * @returns {Promise<File[]>} ファイル一覧
   */
  async showLegacyFilePicker(options = {}) {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = options.multiple || false;
      
      // Accept属性を設定
      if (options.accept) {
        input.accept = options.accept;
      } else {
        // デフォルトのaccept設定
        const extensions = ['.md', '.markdown', '.txt', '.html', '.htm'];
        input.accept = extensions.join(',');
      }

      input.onchange = (e) => {
        const files = Array.from(e.target.files || []);
        
        this.emit(EVENTS.FILE_DIALOG_SUCCESS, {
          type: 'legacy_open',
          files,
          count: files.length
        });

        resolve(files);
      };

      input.oncancel = () => {
        this.emit(EVENTS.FILE_DIALOG_CANCELLED, {
          type: 'legacy_open'
        });
        resolve(null);
      };

      input.click();
    });
  }

  /**
   * レガシー保存（ダウンロード）のフォールバック
   * @param {string} content - コンテンツ
   * @param {string} fileName - ファイル名
   * @param {string} mimeType - MIMEタイプ
   */
  downloadFile(content, fileName, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    
    URL.revokeObjectURL(url);

    this.emit(EVENTS.FILE_SAVED, {
      fileName,
      size: content.length,
      method: 'download'
    });
  }

  /**
   * ファイルフィルターを設定
   * @param {Array} filters - ファイルフィルター
   */
  setFileFilters(filters) {
    this.#fileFilters = filters;
  }

  /**
   * デフォルトディレクトリを設定
   * @param {string} directory - ディレクトリ
   */
  setDefaultDirectory(directory) {
    this.#defaultDirectory = directory;
  }

  /**
   * 機能検出結果を取得
   * @returns {Object} 機能検出結果
   */
  getCapabilities() {
    return {
      fileSystemAccess: this.isSupported(),
      directoryPicker: 'showDirectoryPicker' in window,
      fileHandles: 'FileSystemFileHandle' in window,
      writableStreams: 'FileSystemWritableFileStream' in window
    };
  }

  /**
   * 統計情報を取得
   * @returns {Object} 統計情報
   */
  getStatistics() {
    return {
      capabilities: this.getCapabilities(),
      fileFilters: this.#fileFilters.length,
      defaultDirectory: this.#defaultDirectory,
      supportedTypes: this.#fileFilters.map(f => f.description)
    };
  }
}

// イベント定数を追加
export const FILE_DIALOG_EVENTS = {
  OPENING: 'fileDialog:opening',
  SUCCESS: 'fileDialog:success', 
  CANCELLED: 'fileDialog:cancelled',
  ERROR: 'fileDialog:error'
};