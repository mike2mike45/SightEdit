/**
 * ApplicationController - Main Application Orchestrator
 * ES2024対応のメインアプリケーション制御
 */
import { BaseComponent } from '../core/ComponentFactory.js';
import { EVENTS } from '../core/EventBus.js';

export class ApplicationController extends BaseComponent {
  #serviceLocator = null;
  #controllers = new Map();
  #views = new Map();
  #models = new Map();
  #isInitialized = false;
  #startupTime = null;
  #errorCount = 0;

  constructor(serviceLocator) {
    super();
    this.#serviceLocator = serviceLocator;
    this.#startupTime = Date.now();
  }

  /**
   * アプリケーションを初期化
   */
  async init() {
    if (this.#isInitialized) return;

    try {
      console.log('[ApplicationController] Starting application initialization...');
      
      await this.#setupGlobalErrorHandling();
      await this.#initializeComponents();
      await this.#setupGlobalEventListeners();
      await this.#setupKeyboardShortcuts();
      await this.#loadUserPreferences();
      
      this.#isInitialized = true;
      
      const initTime = Date.now() - this.#startupTime;
      console.log(`[ApplicationController] Application initialized in ${initTime}ms`);
      
      this.emit(EVENTS.APPLICATION_READY, {
        initTime,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('[ApplicationController] Initialization error:', error);
      await this.#handleInitializationError(error);
      throw error;
    }
  }

  /**
   * グローバルエラーハンドリングをセットアップ
   * @private
   */
  async #setupGlobalErrorHandling() {
    window.addEventListener('error', this.#handleGlobalError);
    window.addEventListener('unhandledrejection', this.#handleUnhandledRejection);
    
    // React/Vue等のフレームワークエラー境界も必要に応じて設定
  }

  /**
   * コンポーネントを初期化
   * @private
   */
  async #initializeComponents() {
    // Models
    this.#models.set('document', await this.#serviceLocator.get('documentModel'));
    this.#models.set('file', await this.#serviceLocator.get('fileModel'));
    this.#models.set('settings', await this.#serviceLocator.get('settingsModel'));

    // Views
    this.#views.set('editor', await this.#serviceLocator.get('editorView'));
    this.#views.set('toolbar', await this.#serviceLocator.get('toolbarView'));
    this.#views.set('statusBar', await this.#serviceLocator.get('statusBarView'));
    this.#views.set('dialog', await this.#serviceLocator.get('dialogView'));
    this.#views.set('fileSystemDialog', await this.#serviceLocator.get('fileSystemDialogView'));

    // Controllers
    this.#controllers.set('editor', await this.#serviceLocator.get('editorController'));
    this.#controllers.set('file', await this.#serviceLocator.get('fileController'));
    this.#controllers.set('ai', await this.#serviceLocator.get('aiController'));

    // 各コンポーネントを初期化
    for (const [name, model] of this.#models) {
      try {
        if (model.init) await model.init();
        console.log(`[ApplicationController] Model initialized: ${name}`);
      } catch (error) {
        console.error(`[ApplicationController] Model init error (${name}):`, error);
        throw error;
      }
    }

    for (const [name, view] of this.#views) {
      try {
        if (view.init) await view.init();
        console.log(`[ApplicationController] View initialized: ${name}`);
      } catch (error) {
        console.error(`[ApplicationController] View init error (${name}):`, error);
        throw error;
      }
    }

    for (const [name, controller] of this.#controllers) {
      try {
        if (controller.init) await controller.init();
        console.log(`[ApplicationController] Controller initialized: ${name}`);
      } catch (error) {
        console.error(`[ApplicationController] Controller init error (${name}):`, error);
        throw error;
      }
    }
  }

  /**
   * グローバルイベントリスナーをセットアップ
   * @private
   */
  async #setupGlobalEventListeners() {
    // ページ離脱時の未保存変更チェック
    window.addEventListener('beforeunload', this.#handleBeforeUnload);
    
    // ページの可視性変更
    document.addEventListener('visibilitychange', this.#handleVisibilityChange);
    
    // オンライン/オフライン状態
    window.addEventListener('online', this.#handleOnlineStateChange);
    window.addEventListener('offline', this.#handleOnlineStateChange);

    // アプリケーション全体のイベント
    this.on(EVENTS.APPLICATION_ERROR, this.#handleApplicationError);
    this.on(EVENTS.COMPONENT_ERROR, this.#handleComponentError);
    this.on(EVENTS.USER_IDLE, this.#handleUserIdle);
    this.on(EVENTS.USER_ACTIVE, this.#handleUserActive);
  }

  /**
   * キーボードショートカットをセットアップ
   * @private
   */
  async #setupKeyboardShortcuts() {
    document.addEventListener('keydown', this.#handleGlobalKeydown);
  }

  /**
   * ユーザー設定を読み込み
   * @private
   */
  async #loadUserPreferences() {
    try {
      const settings = await this.#models.get('settings').getSettings();
      
      // テーマ適用
      if (settings.appearance.theme) {
        this.#applyTheme(settings.appearance.theme);
      }
      
      // 言語設定適用
      if (settings.appearance.language) {
        this.#applyLanguage(settings.appearance.language);
      }
      
      console.log('[ApplicationController] User preferences loaded');

    } catch (error) {
      console.error('[ApplicationController] Load user preferences error:', error);
      // 設定の読み込みエラーはアプリケーション開始を止めない
    }
  }

  /**
   * グローバルエラーハンドラー
   * @private
   * @param {ErrorEvent} event - エラーイベント
   */
  #handleGlobalError = (event) => {
    this.#errorCount++;
    console.error('[ApplicationController] Global error:', event.error);
    
    this.emit(EVENTS.APPLICATION_ERROR, {
      type: 'global_error',
      error: event.error,
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      count: this.#errorCount
    });
  }

  /**
   * 未処理Promise拒否ハンドラー
   * @private
   * @param {PromiseRejectionEvent} event - Promise拒否イベント
   */
  #handleUnhandledRejection = (event) => {
    this.#errorCount++;
    console.error('[ApplicationController] Unhandled Promise rejection:', event.reason);
    
    this.emit(EVENTS.APPLICATION_ERROR, {
      type: 'unhandled_rejection',
      error: event.reason,
      promise: event.promise,
      count: this.#errorCount
    });
  }

  /**
   * ページ離脱ハンドラー
   * @private
   * @param {BeforeUnloadEvent} event - 離脱イベント
   */
  #handleBeforeUnload = (event) => {
    const documentModel = this.#models.get('document');
    
    if (documentModel && documentModel.isModified()) {
      event.preventDefault();
      event.returnValue = ''; // Chrome requires returnValue to be set
      return '未保存の変更があります。本当にページを離れますか？';
    }
  }

  /**
   * ページ可視性変更ハンドラー
   * @private
   */
  #handleVisibilityChange = () => {
    if (document.hidden) {
      this.emit(EVENTS.APPLICATION_HIDDEN);
    } else {
      this.emit(EVENTS.APPLICATION_VISIBLE);
    }
  }

  /**
   * オンライン状態変更ハンドラー
   * @private
   */
  #handleOnlineStateChange = () => {
    const isOnline = navigator.onLine;
    
    this.emit(EVENTS.NETWORK_STATE_CHANGED, {
      isOnline,
      timestamp: Date.now()
    });
    
    const statusBarView = this.#views.get('statusBar');
    if (statusBarView) {
      statusBarView.addNotification(
        isOnline ? 'オンラインに復旧しました' : 'オフラインになりました',
        isOnline ? 'success' : 'warning',
        3000
      );
    }
  }

  /**
   * グローバルキーボードハンドラー
   * @private
   * @param {KeyboardEvent} event - キーボードイベント
   */
  #handleGlobalKeydown = (event) => {
    const shortcut = this.#getKeyboardShortcut(event);
    
    if (shortcut) {
      // ショートカットを関連コントローラーに委譲
      this.emit(EVENTS.KEYBOARD_SHORTCUT, {
        shortcut,
        event,
        timestamp: Date.now()
      });
    }
  }

  /**
   * キーボードショートカットを取得
   * @private
   * @param {KeyboardEvent} event - キーボードイベント
   * @returns {string|null} ショートカット文字列
   */
  #getKeyboardShortcut(event) {
    const modifiers = [];
    
    if (event.ctrlKey || event.metaKey) modifiers.push('ctrl');
    if (event.shiftKey) modifiers.push('shift');
    if (event.altKey) modifiers.push('alt');
    
    if (modifiers.length === 0) return null;
    
    const key = event.key.toLowerCase();
    return [...modifiers, key].join('+');
  }

  /**
   * 初期化エラーハンドラー
   * @private
   * @param {Error} error - エラー
   */
  async #handleInitializationError(error) {
    console.error('[ApplicationController] Initialization failed:', error);
    
    // 最低限のUI表示
    document.body.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: system-ui;">
        <h1 style="color: #d32f2f;">アプリケーションの初期化に失敗しました</h1>
        <p style="color: #666; margin: 20px 0;">エラー: ${error.message}</p>
        <button onclick="location.reload()" style="padding: 10px 20px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">
          再読み込み
        </button>
      </div>
    `;
  }

  /**
   * アプリケーションエラーハンドラー
   * @private
   * @param {Object} data - エラーデータ
   */
  #handleApplicationError = (data) => {
    const { type, error, count } = data;
    
    console.error(`[ApplicationController] Application error (${type}):`, error);
    
    const statusBarView = this.#views.get('statusBar');
    if (statusBarView) {
      statusBarView.addNotification(
        `システムエラーが発生しました (${count})`,
        'error',
        5000
      );
    }
    
    // エラーが頻発する場合の対策
    if (count > 10) {
      this.#handleCriticalError();
    }
  }

  /**
   * コンポーネントエラーハンドラー
   * @private
   * @param {Object} data - エラーデータ
   */
  #handleComponentError = (data) => {
    const { component, error, action } = data;
    
    console.error(`[ApplicationController] Component error (${component}):`, error);
    
    const statusBarView = this.#views.get('statusBar');
    if (statusBarView) {
      statusBarView.addNotification(
        `${component}でエラーが発生しました`,
        'error'
      );
    }
  }

  /**
   * ユーザーアイドルハンドラー
   * @private
   */
  #handleUserIdle = () => {
    console.log('[ApplicationController] User idle detected');
    // 必要に応じて自動保存やリソース節約処理
  }

  /**
   * ユーザーアクティブハンドラー
   * @private
   */
  #handleUserActive = () => {
    console.log('[ApplicationController] User activity detected');
    // アイドル状態からの復帰処理
  }

  /**
   * 致命的エラーハンドラー
   * @private
   */
  #handleCriticalError() {
    console.error('[ApplicationController] Critical error threshold reached');
    
    // アプリケーションの安全な停止
    const confirmed = confirm(
      'システムエラーが頻発しています。アプリケーションを再起動しますか？'
    );
    
    if (confirmed) {
      this.#restart();
    }
  }

  /**
   * テーマを適用
   * @private
   * @param {string} theme - テーマ名
   */
  #applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    console.log(`[ApplicationController] Theme applied: ${theme}`);
  }

  /**
   * 言語を適用
   * @private
   * @param {string} language - 言語コード
   */
  #applyLanguage(language) {
    document.documentElement.setAttribute('lang', language);
    console.log(`[ApplicationController] Language applied: ${language}`);
  }

  /**
   * アプリケーションを再起動
   * @private
   */
  #restart() {
    this.destroy();
    location.reload();
  }

  // Public API Methods

  /**
   * コンポーネントを取得
   * @param {string} type - コンポーネントタイプ ('model', 'view', 'controller')
   * @param {string} name - コンポーネント名
   * @returns {Object|null} コンポーネント
   */
  getComponent(type, name) {
    switch (type) {
      case 'model':
        return this.#models.get(name);
      case 'view':
        return this.#views.get(name);
      case 'controller':
        return this.#controllers.get(name);
      default:
        console.warn(`[ApplicationController] Unknown component type: ${type}`);
        return null;
    }
  }

  /**
   * すべてのコンポーネント名を取得
   * @returns {Object} コンポーネント名リスト
   */
  getComponentNames() {
    return {
      models: Array.from(this.#models.keys()),
      views: Array.from(this.#views.keys()),
      controllers: Array.from(this.#controllers.keys())
    };
  }

  /**
   * アプリケーションステータスを取得
   * @returns {Object} ステータス
   */
  getStatus() {
    return {
      isInitialized: this.#isInitialized,
      uptime: Date.now() - this.#startupTime,
      errorCount: this.#errorCount,
      componentCount: {
        models: this.#models.size,
        views: this.#views.size,
        controllers: this.#controllers.size
      }
    };
  }

  /**
   * ヘルスチェックを実行
   * @returns {Object} ヘルスチェック結果
   */
  async performHealthCheck() {
    const results = {
      overall: 'healthy',
      components: {},
      errors: [],
      timestamp: Date.now()
    };

    // 各コンポーネントのヘルスチェック
    for (const [name, model] of this.#models) {
      try {
        if (model.getDebugInfo) {
          const debugInfo = model.getDebugInfo();
          results.components[`model_${name}`] = {
            status: 'healthy',
            debugInfo
          };
        } else {
          results.components[`model_${name}`] = {
            status: 'unknown'
          };
        }
      } catch (error) {
        results.components[`model_${name}`] = {
          status: 'error',
          error: error.message
        };
        results.errors.push(`Model ${name}: ${error.message}`);
      }
    }

    // エラーがある場合は全体ステータスを変更
    if (results.errors.length > 0) {
      results.overall = results.errors.length > 3 ? 'critical' : 'warning';
    }

    return results;
  }

  /**
   * デバッグ情報を取得
   * @returns {Object} デバッグ情報
   */
  getDebugInfo() {
    return {
      isInitialized: this.#isInitialized,
      startupTime: this.#startupTime,
      uptime: Date.now() - this.#startupTime,
      errorCount: this.#errorCount,
      components: this.getComponentNames(),
      memory: performance.memory ? {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
      } : null
    };
  }

  /**
   * アプリケーションを正常に終了
   */
  async shutdown() {
    try {
      console.log('[ApplicationController] Starting application shutdown...');

      // 未保存の変更をチェック
      const documentModel = this.#models.get('document');
      if (documentModel && documentModel.isModified()) {
        const shouldSave = confirm('未保存の変更があります。保存しますか？');
        if (shouldSave) {
          // 保存処理
          const fileController = this.#controllers.get('file');
          if (fileController) {
            await fileController.saveFile();
          }
        }
      }

      this.emit(EVENTS.APPLICATION_SHUTDOWN_STARTED);
      
      await this.destroy();
      
      console.log('[ApplicationController] Application shutdown complete');

    } catch (error) {
      console.error('[ApplicationController] Shutdown error:', error);
    }
  }

  /**
   * 破棄処理
   */
  async destroy() {
    // イベントリスナーを削除
    window.removeEventListener('error', this.#handleGlobalError);
    window.removeEventListener('unhandledrejection', this.#handleUnhandledRejection);
    window.removeEventListener('beforeunload', this.#handleBeforeUnload);
    document.removeEventListener('visibilitychange', this.#handleVisibilityChange);
    window.removeEventListener('online', this.#handleOnlineStateChange);
    window.removeEventListener('offline', this.#handleOnlineStateChange);
    document.removeEventListener('keydown', this.#handleGlobalKeydown);

    // コンポーネントを破棄
    for (const [name, controller] of this.#controllers) {
      try {
        if (controller.destroy) await controller.destroy();
        console.log(`[ApplicationController] Controller destroyed: ${name}`);
      } catch (error) {
        console.error(`[ApplicationController] Controller destroy error (${name}):`, error);
      }
    }

    for (const [name, view] of this.#views) {
      try {
        if (view.destroy) await view.destroy();
        console.log(`[ApplicationController] View destroyed: ${name}`);
      } catch (error) {
        console.error(`[ApplicationController] View destroy error (${name}):`, error);
      }
    }

    for (const [name, model] of this.#models) {
      try {
        if (model.destroy) await model.destroy();
        console.log(`[ApplicationController] Model destroyed: ${name}`);
      } catch (error) {
        console.error(`[ApplicationController] Model destroy error (${name}):`, error);
      }
    }

    this.#controllers.clear();
    this.#views.clear();
    this.#models.clear();
    
    this.#isInitialized = false;
    this.#serviceLocator = null;
    
    super.destroy();
  }
}