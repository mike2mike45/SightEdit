/**
 * FileController - File Operations Business Logic
 * ES2024対応のファイル操作ビジネスロジック
 */
import { BaseComponent } from '../core/ComponentFactory.js';
import { EVENTS } from '../core/EventBus.js';

export class FileController extends BaseComponent {
  #fileModel = null;
  #documentModel = null;
  #fileSystemDialogView = null;
  #statusBarView = null;
  #isInitialized = false;
  #currentFileHandle = null;
  #recentFiles = [];

  constructor(services) {
    super();
    
    this.#fileModel = services.fileModel;
    this.#documentModel = services.documentModel;
    this.#fileSystemDialogView = services.fileSystemDialogView;
    this.#statusBarView = services.statusBarView;
  }

  /**
   * 初期化
   */
  async init() {
    if (this.#isInitialized) return;

    await this.#setupEventListeners();
    await this.#loadRecentFiles();
    
    this.#isInitialized = true;
    
    this.emit(EVENTS.FILE_CONTROLLER_READY);
  }

  /**
   * イベントリスナーをセットアップ
   * @private
   */
  async #setupEventListeners() {
    // ファイルダイアログからのイベント
    this.#fileSystemDialogView.on(EVENTS.FILE_DIALOG_SUCCESS, this.#handleFileDialogSuccess);
    this.#fileSystemDialogView.on(EVENTS.FILE_DIALOG_CANCELLED, this.#handleFileDialogCancelled);
    this.#fileSystemDialogView.on(EVENTS.FILE_ERROR, this.#handleFileError);
    this.#fileSystemDialogView.on(EVENTS.FILE_SAVED, this.#handleFileSaved);

    // ファイルモデルからのイベント
    this.#fileModel.on(EVENTS.FILE_VALIDATION_FAILED, this.#handleFileValidationFailed);

    // アプリケーション全体のイベント
    this.on(EVENTS.FILE_OPEN_REQUEST, this.#handleFileOpenRequest);
    this.on(EVENTS.FILE_SAVE_REQUEST, this.#handleFileSaveRequest);
    this.on(EVENTS.FILE_SAVE_AS_REQUEST, this.#handleFileSaveAsRequest);
    this.on(EVENTS.FILE_NEW_REQUEST, this.#handleFileNewRequest);
    this.on(EVENTS.FILE_LOAD_REQUEST, this.#handleFileLoadRequest);
    this.on(EVENTS.AUTO_SAVE_REQUEST, this.#handleAutoSaveRequest);
    this.on(EVENTS.RECENT_FILE_REQUEST, this.#handleRecentFileRequest);
  }

  /**
   * 最近のファイルを読み込み
   * @private
   */
  async #loadRecentFiles() {
    try {
      this.#recentFiles = await this.#fileModel.getRecentFiles();
      this.emit(EVENTS.RECENT_FILES_LOADED, { files: this.#recentFiles });
    } catch (error) {
      console.error('[FileController] Load recent files error:', error);
    }
  }

  /**
   * ファイルダイアログ成功ハンドラー
   * @private
   * @param {Object} data - イベントデータ
   */
  #handleFileDialogSuccess = async (data) => {
    const { type, fileHandles, fileHandle, files } = data;

    try {
      switch (type) {
        case 'open':
          if (fileHandles && fileHandles.length > 0) {
            await this.#processOpenFile(fileHandles[0]);
          }
          break;
          
        case 'save':
          if (fileHandle) {
            await this.#processSaveFile(fileHandle);
          }
          break;

        case 'legacy_open':
          if (files && files.length > 0) {
            await this.#processLegacyOpenFile(files[0]);
          }
          break;

        default:
          console.warn(`[FileController] Unknown dialog type: ${type}`);
      }
    } catch (error) {
      console.error('[FileController] File dialog success handling error:', error);
      this.#statusBarView.addNotification('ファイル操作中にエラーが発生しました', 'error');
    }
  }

  /**
   * ファイルダイアログキャンセルハンドラー
   * @private
   * @param {Object} data - イベントデータ
   */
  #handleFileDialogCancelled = (data) => {
    const { type } = data;
    this.#statusBarView.showTemporaryStatus(`${type === 'open' ? 'ファイルを開く' : 'ファイル保存'}をキャンセルしました`, 1500);
  }

  /**
   * ファイルエラーハンドラー
   * @private
   * @param {Object} data - エラーデータ
   */
  #handleFileError = (data) => {
    const { type, error, fileName } = data;
    
    let errorMessage = 'ファイル操作エラー';
    switch (type) {
      case 'read_error':
        errorMessage = `ファイル読み込みエラー: ${fileName}`;
        break;
      case 'write_error':
        errorMessage = `ファイル書き込みエラー: ${fileName}`;
        break;
      case 'permission_error':
        errorMessage = `ファイルアクセス権限がありません: ${fileName}`;
        break;
      default:
        errorMessage = `${type}: ${error}`;
    }

    this.#statusBarView.addNotification(errorMessage, 'error');
    console.error('[FileController] File error:', data);
  }

  /**
   * ファイル保存完了ハンドラー
   * @private
   * @param {Object} data - 保存データ
   */
  #handleFileSaved = async (data) => {
    const { fileName, handle, method } = data;
    
    try {
      // 最近のファイルリストに追加
      if (handle) {
        await this.#fileModel.addToRecentFiles({
          name: fileName,
          handle: handle,
          lastAccessed: Date.now()
        });
        this.#recentFiles = await this.#fileModel.getRecentFiles();
      }

      // ドキュメントモデルを更新
      if (fileName) {
        this.#documentModel.setFileName(fileName);
        this.#documentModel.markAsSaved();
      }

      this.emit(EVENTS.FILE_SAVED_SUCCESSFULLY, {
        fileName,
        method: method || 'filesystem'
      });

    } catch (error) {
      console.error('[FileController] File saved handling error:', error);
    }
  }

  /**
   * ファイル検証失敗ハンドラー
   * @private
   * @param {Object} data - 検証データ
   */
  #handleFileValidationFailed = (data) => {
    const { fileName, errors } = data;
    this.#statusBarView.addNotification(`ファイル検証エラー: ${fileName}`, 'warning');
    console.warn('[FileController] File validation failed:', errors);
  }

  /**
   * ファイルオープン要求ハンドラー
   * @private
   */
  #handleFileOpenRequest = async () => {
    try {
      this.#statusBarView.updateStatus('loading');

      if (this.#fileSystemDialogView.isSupported()) {
        await this.#fileSystemDialogView.showOpenFilePicker({
          multiple: false,
          excludeAcceptAllOption: false
        });
      } else {
        // レガシーブラウザ対応
        const files = await this.#fileSystemDialogView.showLegacyFilePicker({
          multiple: false
        });
        
        if (files && files.length > 0) {
          await this.#processLegacyOpenFile(files[0]);
        }
      }
    } catch (error) {
      console.error('[FileController] File open request error:', error);
      this.#statusBarView.addNotification('ファイルを開く処理でエラーが発生しました', 'error');
    } finally {
      this.#statusBarView.updateStatus('ready');
    }
  }

  /**
   * ファイル保存要求ハンドラー
   * @private
   */
  #handleFileSaveRequest = async () => {
    try {
      this.#statusBarView.updateStatus('saving');

      if (this.#currentFileHandle) {
        // 既存ファイルに上書き保存
        await this.#processSaveFile(this.#currentFileHandle);
      } else {
        // 名前を付けて保存
        await this.#handleFileSaveAsRequest();
      }
    } catch (error) {
      console.error('[FileController] File save request error:', error);
      this.#statusBarView.addNotification('ファイル保存処理でエラーが発生しました', 'error');
    } finally {
      this.#statusBarView.updateStatus('ready');
    }
  }

  /**
   * ファイル名前を付けて保存要求ハンドラー
   * @private
   */
  #handleFileSaveAsRequest = async () => {
    try {
      this.#statusBarView.updateStatus('saving');

      const currentFileName = this.#documentModel.getFileName();
      const suggestedName = currentFileName || 'document.md';

      if (this.#fileSystemDialogView.isSupported()) {
        await this.#fileSystemDialogView.showSaveFilePicker({
          suggestedName: suggestedName,
          excludeAcceptAllOption: false
        });
      } else {
        // レガシーブラウザ対応：ダウンロード
        const content = this.#documentModel.getContent();
        this.#fileSystemDialogView.downloadFile(content, suggestedName, 'text/markdown');
      }
    } catch (error) {
      console.error('[FileController] File save as request error:', error);
      this.#statusBarView.addNotification('名前を付けて保存処理でエラーが発生しました', 'error');
    } finally {
      this.#statusBarView.updateStatus('ready');
    }
  }

  /**
   * 新規ファイル要求ハンドラー
   * @private
   */
  #handleFileNewRequest = async () => {
    try {
      // 未保存の変更がある場合は確認
      if (this.#documentModel.isModified()) {
        const shouldContinue = await this.#confirmUnsavedChanges();
        if (!shouldContinue) return;
      }

      // ドキュメントをクリア
      await this.#documentModel.clear();
      this.#currentFileHandle = null;

      this.emit(EVENTS.FILE_NEW_CREATED);
      this.#statusBarView.addNotification('新しいドキュメントを作成しました', 'success', 2000);

    } catch (error) {
      console.error('[FileController] File new request error:', error);
      this.#statusBarView.addNotification('新規ファイル作成でエラーが発生しました', 'error');
    }
  }

  /**
   * ファイル読み込み要求ハンドラー
   * @private
   * @param {Object} data - ファイルデータ
   */
  #handleFileLoadRequest = async (data) => {
    const { fileName, content, source } = data;

    try {
      this.#statusBarView.updateStatus('loading');

      // ファイル検証
      const validationResult = await this.#fileModel.validateFileContent(content, fileName);
      if (!validationResult.isValid) {
        this.#statusBarView.addNotification(`ファイル検証エラー: ${validationResult.errors.join(', ')}`, 'warning');
      }

      // ドキュメントモデルを更新
      await this.#documentModel.loadFromContent(content, fileName);

      this.emit(EVENTS.FILE_OPENED, { fileName, content, source });

    } catch (error) {
      console.error('[FileController] File load request error:', error);
      this.#statusBarView.addNotification('ファイル読み込み処理でエラーが発生しました', 'error');
    } finally {
      this.#statusBarView.updateStatus('ready');
    }
  }

  /**
   * 自動保存要求ハンドラー
   * @private
   */
  #handleAutoSaveRequest = async () => {
    try {
      if (this.#currentFileHandle && this.#documentModel.isModified()) {
        await this.#processSaveFile(this.#currentFileHandle, true);
        this.#statusBarView.showTemporaryStatus('自動保存完了', 1000);
      }
    } catch (error) {
      console.error('[FileController] Auto save error:', error);
      // 自動保存のエラーは通知しない（ユーザーの操作を妨げないため）
    }
  }

  /**
   * 最近のファイル要求ハンドラー
   * @private
   * @param {Object} data - ファイル情報
   */
  #handleRecentFileRequest = async (data) => {
    const { fileInfo } = data;

    try {
      // 未保存の変更がある場合は確認
      if (this.#documentModel.isModified()) {
        const shouldContinue = await this.#confirmUnsavedChanges();
        if (!shouldContinue) return;
      }

      // FileSystem Access APIでファイルを再度開く
      if (fileInfo.handle) {
        await this.#processOpenFile(fileInfo.handle);
      } else {
        this.#statusBarView.addNotification('ファイルハンドルが見つかりません', 'warning');
      }

    } catch (error) {
      console.error('[FileController] Recent file request error:', error);
      this.#statusBarView.addNotification('最近のファイルを開く際にエラーが発生しました', 'error');
    }
  }

  /**
   * ファイルを処理（File System Access API）
   * @private
   * @param {FileSystemFileHandle} fileHandle - ファイルハンドル
   */
  async #processOpenFile(fileHandle) {
    try {
      // 権限確認
      const hasPermission = await this.#fileSystemDialogView.checkPermission(fileHandle, 'read');
      if (!hasPermission) {
        const granted = await this.#fileSystemDialogView.requestPermission(fileHandle, 'read');
        if (!granted) {
          throw new Error('ファイル読み取り権限が拒否されました');
        }
      }

      // ファイル読み込み
      const fileData = await this.#fileSystemDialogView.readFile(fileHandle);
      
      // ファイル情報を更新
      this.#currentFileHandle = fileHandle;
      
      // 最近のファイルに追加
      await this.#fileModel.addToRecentFiles({
        name: fileData.name,
        handle: fileHandle,
        lastAccessed: Date.now(),
        size: fileData.size,
        type: fileData.type
      });

      this.emit(EVENTS.FILE_LOAD_REQUEST, {
        fileName: fileData.name,
        content: fileData.content,
        source: 'filesystem'
      });

    } catch (error) {
      console.error('[FileController] Process open file error:', error);
      throw error;
    }
  }

  /**
   * レガシーファイルを処理
   * @private
   * @param {File} file - ファイル
   */
  async #processLegacyOpenFile(file) {
    try {
      const content = await file.text();
      
      this.emit(EVENTS.FILE_LOAD_REQUEST, {
        fileName: file.name,
        content: content,
        source: 'legacy'
      });

    } catch (error) {
      console.error('[FileController] Process legacy open file error:', error);
      throw error;
    }
  }

  /**
   * ファイル保存を処理
   * @private
   * @param {FileSystemFileHandle} fileHandle - ファイルハンドル
   * @param {boolean} isAutoSave - 自動保存かどうか
   */
  async #processSaveFile(fileHandle, isAutoSave = false) {
    try {
      // 書き込み権限確認
      const hasPermission = await this.#fileSystemDialogView.checkPermission(fileHandle, 'readwrite');
      if (!hasPermission) {
        const granted = await this.#fileSystemDialogView.requestPermission(fileHandle, 'readwrite');
        if (!granted) {
          throw new Error('ファイル書き込み権限が拒否されました');
        }
      }

      // ファイル書き込み
      const content = this.#documentModel.getContent();
      await this.#fileSystemDialogView.writeFile(fileHandle, content);
      
      // 自動保存でなければファイルハンドルを更新
      if (!isAutoSave) {
        this.#currentFileHandle = fileHandle;
      }

    } catch (error) {
      console.error('[FileController] Process save file error:', error);
      throw error;
    }
  }

  /**
   * 未保存の変更を確認
   * @private
   * @returns {Promise<boolean>} 続行するかどうか
   */
  async #confirmUnsavedChanges() {
    // DialogViewを使用した確認ダイアログの実装は
    // 実際のプロジェクト要件に応じてカスタマイズ
    return new Promise((resolve) => {
      const confirmed = confirm('未保存の変更があります。続行しますか？');
      resolve(confirmed);
    });
  }

  // Public API Methods

  /**
   * ファイルを開く
   */
  async openFile() {
    this.emit(EVENTS.FILE_OPEN_REQUEST);
  }

  /**
   * ファイルを保存
   */
  async saveFile() {
    this.emit(EVENTS.FILE_SAVE_REQUEST);
  }

  /**
   * ファイルに名前を付けて保存
   */
  async saveFileAs() {
    this.emit(EVENTS.FILE_SAVE_AS_REQUEST);
  }

  /**
   * 新規ファイル
   */
  async newFile() {
    this.emit(EVENTS.FILE_NEW_REQUEST);
  }

  /**
   * 最近のファイルを取得
   * @returns {Array} 最近のファイルリスト
   */
  getRecentFiles() {
    return this.#recentFiles;
  }

  /**
   * 最近のファイルを開く
   * @param {Object} fileInfo - ファイル情報
   */
  async openRecentFile(fileInfo) {
    this.emit(EVENTS.RECENT_FILE_REQUEST, { fileInfo });
  }

  /**
   * 現在のファイル情報を取得
   * @returns {Object} ファイル情報
   */
  getCurrentFileInfo() {
    return {
      hasFile: !!this.#currentFileHandle,
      fileName: this.#documentModel.getFileName(),
      isModified: this.#documentModel.isModified(),
      handle: this.#currentFileHandle
    };
  }

  /**
   * ファイルシステム機能の対応状況を取得
   * @returns {Object} 機能対応状況
   */
  getCapabilities() {
    return this.#fileSystemDialogView.getCapabilities();
  }

  /**
   * デバッグ情報を取得
   * @returns {Object} デバッグ情報
   */
  getDebugInfo() {
    return {
      isInitialized: this.#isInitialized,
      hasCurrentFile: !!this.#currentFileHandle,
      recentFilesCount: this.#recentFiles.length,
      capabilities: this.getCapabilities(),
      currentFile: this.getCurrentFileInfo()
    };
  }

  /**
   * 破棄処理
   */
  destroy() {
    this.#currentFileHandle = null;
    this.#recentFiles = [];
    this.#fileModel = null;
    this.#documentModel = null;
    this.#fileSystemDialogView = null;
    this.#statusBarView = null;
    this.#isInitialized = false;
    
    super.destroy();
  }
}