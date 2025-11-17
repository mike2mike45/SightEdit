/**
 * SightEdit Application Entry Point
 * ES2024対応のモダンアーキテクチャメインエントリー
 */

// Core Infrastructure
import { ServiceLocator } from './core/ServiceLocator.js';
import { ComponentFactory } from './core/ComponentFactory.js';
import { getEventBus } from './core/EventBus.js';

// Models
import { DocumentModel } from './models/DocumentModel.js';
import { FileModel } from './models/FileModel.js';
import { SettingsModel } from './models/SettingsModel.js';

// Views
import { BaseView } from './views/BaseView.js';
import { EditorView } from './views/EditorView.js';
import { ToolbarView } from './views/ToolbarView.js';
import { StatusBarView } from './views/StatusBarView.js';
import { DialogView } from './views/DialogView.js';
import { FileSystemDialogView } from './views/FileSystemDialogView.js';

// Controllers
import { ApplicationController } from './controllers/ApplicationController.js';
import { EditorController } from './controllers/EditorController.js';
import { FileController } from './controllers/FileController.js';
import { AIController } from './controllers/AIController.js';

// Services
import { AIService } from './services/AIService.js';
import { StorageService } from './services/StorageService.js';
import { ExportService } from './services/ExportService.js';
import { ThemeService } from './services/ThemeService.js';

/**
 * SightEdit Application Class
 */
class SightEditApp {
  #serviceLocator = null;
  #applicationController = null;
  #isInitialized = false;
  #startupTime = null;

  constructor() {
    this.#startupTime = Date.now();
    this.#serviceLocator = new ServiceLocator();
  }

  /**
   * アプリケーションを初期化
   */
  async init() {
    try {
      console.log('[SightEditApp] Starting initialization...');
      
      // サービスと依存関係を登録
      await this.#registerServices();
      
      // アプリケーションコントローラーを初期化
      this.#applicationController = new ApplicationController(this.#serviceLocator);
      await this.#applicationController.init();
      
      this.#isInitialized = true;
      
      const initTime = Date.now() - this.#startupTime;
      console.log(`[SightEditApp] Application initialized successfully in ${initTime}ms`);
      
      // 初期化完了イベント
      const eventBus = getEventBus();
      eventBus.emit('app:initialized', {
        initTime,
        timestamp: Date.now()
      });

      return true;

    } catch (error) {
      console.error('[SightEditApp] Initialization failed:', error);
      await this.#handleInitializationError(error);
      throw error;
    }
  }

  /**
   * サービスと依存関係を登録
   * @private
   */
  async #registerServices() {
    const serviceLocator = this.#serviceLocator;

    // Core Services
    serviceLocator.registerFactory('eventBus', () => getEventBus(), true);
    serviceLocator.registerFactory('componentFactory', () => new ComponentFactory(), true);

    // Storage and External Services
    serviceLocator.registerFactory('storageService', async () => {
      const service = new StorageService();
      await service.init();
      return service;
    }, true);

    serviceLocator.registerFactory('aiService', async () => {
      const service = new AIService();
      await service.init();
      return service;
    }, true);

    serviceLocator.registerFactory('exportService', async () => {
      const service = new ExportService();
      await service.init();
      return service;
    }, true);

    serviceLocator.registerFactory('themeService', async () => {
      const service = new ThemeService();
      await service.init();
      return service;
    }, true);

    // Models
    serviceLocator.registerFactory('documentModel', async () => {
      const eventBus = await serviceLocator.get('eventBus');
      const model = new DocumentModel();
      model.setEventBus(eventBus);
      await model.init();
      return model;
    }, true);

    serviceLocator.registerFactory('fileModel', async () => {
      const eventBus = await serviceLocator.get('eventBus');
      const storageService = await serviceLocator.get('storageService');
      const model = new FileModel();
      model.setEventBus(eventBus);
      model.setStorageService(storageService);
      await model.init();
      return model;
    }, true);

    serviceLocator.registerFactory('settingsModel', async () => {
      const eventBus = await serviceLocator.get('eventBus');
      const storageService = await serviceLocator.get('storageService');
      const model = new SettingsModel();
      model.setEventBus(eventBus);
      model.setStorageService(storageService);
      await model.init();
      return model;
    }, true);

    // Views - DOM elements must exist
    serviceLocator.registerFactory('editorView', async () => {
      const eventBus = await serviceLocator.get('eventBus');
      const element = document.getElementById('editor-container') || document.body;
      const view = new EditorView({ element });
      view.setEventBus(eventBus);
      await view.init();
      return view;
    }, true);

    serviceLocator.registerFactory('toolbarView', async () => {
      const eventBus = await serviceLocator.get('eventBus');
      const element = document.getElementById('toolbar-container') || this.#createToolbarElement();
      const view = new ToolbarView({ element });
      view.setEventBus(eventBus);
      await view.init();
      return view;
    }, true);

    serviceLocator.registerFactory('statusBarView', async () => {
      const eventBus = await serviceLocator.get('eventBus');
      const element = document.getElementById('status-bar-container') || this.#createStatusBarElement();
      const view = new StatusBarView({ element });
      view.setEventBus(eventBus);
      await view.init();
      return view;
    }, true);

    serviceLocator.registerFactory('dialogView', async () => {
      const eventBus = await serviceLocator.get('eventBus');
      const view = new DialogView();
      view.setEventBus(eventBus);
      await view.init();
      return view;
    }, true);

    serviceLocator.registerFactory('fileSystemDialogView', async () => {
      const eventBus = await serviceLocator.get('eventBus');
      const view = new FileSystemDialogView();
      view.setEventBus(eventBus);
      await view.init();
      return view;
    }, true);

    // Controllers - Services injection
    serviceLocator.registerFactory('editorController', async () => {
      const services = {
        documentModel: await serviceLocator.get('documentModel'),
        settingsModel: await serviceLocator.get('settingsModel'),
        editorView: await serviceLocator.get('editorView'),
        statusBarView: await serviceLocator.get('statusBarView')
      };
      
      const eventBus = await serviceLocator.get('eventBus');
      const controller = new EditorController(services);
      controller.setEventBus(eventBus);
      return controller;
    }, true);

    serviceLocator.registerFactory('fileController', async () => {
      const services = {
        fileModel: await serviceLocator.get('fileModel'),
        documentModel: await serviceLocator.get('documentModel'),
        fileSystemDialogView: await serviceLocator.get('fileSystemDialogView'),
        statusBarView: await serviceLocator.get('statusBarView')
      };
      
      const eventBus = await serviceLocator.get('eventBus');
      const controller = new FileController(services);
      controller.setEventBus(eventBus);
      return controller;
    }, true);

    serviceLocator.registerFactory('aiController', async () => {
      const services = {
        settingsModel: await serviceLocator.get('settingsModel'),
        documentModel: await serviceLocator.get('documentModel'),
        statusBarView: await serviceLocator.get('statusBarView'),
        dialogView: await serviceLocator.get('dialogView')
      };
      
      const eventBus = await serviceLocator.get('eventBus');
      const controller = new AIController(services);
      controller.setEventBus(eventBus);
      return controller;
    }, true);

    console.log('[SightEditApp] All services registered successfully');
  }

  /**
   * DOM要素を作成（フォールバック）
   * @private
   */
  #createToolbarElement() {
    const element = document.createElement('div');
    element.id = 'toolbar-container';
    element.className = 'toolbar-container';
    document.body.insertBefore(element, document.body.firstChild);
    return element;
  }

  /**
   * ステータスバー要素を作成（フォールバック）
   * @private
   */
  #createStatusBarElement() {
    const element = document.createElement('div');
    element.id = 'status-bar-container';
    element.className = 'status-bar-container';
    document.body.appendChild(element);
    return element;
  }

  /**
   * 初期化エラーハンドラー
   * @private
   */
  async #handleInitializationError(error) {
    console.error('[SightEditApp] Critical initialization error:', error);
    
    // 最低限のエラー表示UI
    document.body.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        font-family: system-ui, -apple-system, sans-serif;
        background: #f5f5f5;
        color: #333;
        padding: 20px;
        text-align: center;
      ">
        <h1 style="color: #d32f2f; margin-bottom: 20px;">
          SightEdit 初期化エラー
        </h1>
        <p style="margin-bottom: 20px; max-width: 600px; line-height: 1.5;">
          アプリケーションの初期化中にエラーが発生しました。<br>
          ページを再読み込みするか、ブラウザのキャッシュをクリアしてください。
        </p>
        <div style="background: #fff; padding: 15px; border-radius: 5px; border: 1px solid #ddd; margin-bottom: 20px; font-family: monospace; text-align: left;">
          <strong>エラー詳細:</strong><br>
          ${error.message}
        </div>
        <button onclick="location.reload()" style="
          padding: 12px 24px;
          background: #1976d2;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
        ">
          ページを再読み込み
        </button>
      </div>
    `;
  }

  /**
   * アプリケーションを正常に終了
   */
  async shutdown() {
    try {
      console.log('[SightEditApp] Starting shutdown...');
      
      if (this.#applicationController) {
        await this.#applicationController.shutdown();
      }
      
      if (this.#serviceLocator) {
        // 全サービスを破棄
        const services = [
          'aiController', 'fileController', 'editorController',
          'fileSystemDialogView', 'dialogView', 'statusBarView', 'toolbarView', 'editorView',
          'settingsModel', 'fileModel', 'documentModel',
          'themeService', 'exportService', 'aiService', 'storageService'
        ];
        
        for (const serviceName of services) {
          try {
            const service = await this.#serviceLocator.get(serviceName);
            if (service && service.destroy) {
              await service.destroy();
            }
          } catch (error) {
            console.warn(`[SightEditApp] Error destroying service ${serviceName}:`, error);
          }
        }
      }
      
      this.#isInitialized = false;
      this.#applicationController = null;
      this.#serviceLocator = null;
      
      console.log('[SightEditApp] Shutdown complete');

    } catch (error) {
      console.error('[SightEditApp] Shutdown error:', error);
    }
  }

  /**
   * アプリケーション情報を取得
   * @returns {Object} アプリケーション情報
   */
  getAppInfo() {
    return {
      name: 'SightEdit',
      version: '2.0.0',
      architecture: 'Modern ES2024 MVC',
      isInitialized: this.#isInitialized,
      uptime: this.#isInitialized ? Date.now() - this.#startupTime : 0,
      services: this.#serviceLocator ? Object.keys(this.#serviceLocator.getRegisteredServices()) : []
    };
  }

  /**
   * デバッグ情報を取得
   * @returns {Object} デバッグ情報
   */
  async getDebugInfo() {
    if (!this.#isInitialized || !this.#applicationController) {
      return { error: 'Application not initialized' };
    }

    try {
      const appInfo = this.getAppInfo();
      const appStatus = this.#applicationController.getStatus();
      const healthCheck = await this.#applicationController.performHealthCheck();

      return {
        app: appInfo,
        status: appStatus,
        health: healthCheck,
        timestamp: Date.now()
      };

    } catch (error) {
      return {
        error: `Debug info error: ${error.message}`,
        timestamp: Date.now()
      };
    }
  }

  /**
   * サービスを取得（デバッグ用）
   * @param {string} serviceName - サービス名
   * @returns {Object} サービスインスタンス
   */
  async getService(serviceName) {
    if (!this.#serviceLocator) {
      throw new Error('ServiceLocator not available');
    }

    return await this.#serviceLocator.get(serviceName);
  }
}

/**
 * グローバルアプリケーションインスタンス
 */
let globalApp = null;

/**
 * アプリケーションを開始
 * @param {Object} options - 開始オプション
 * @returns {Promise<SightEditApp>} アプリケーションインスタンス
 */
export async function startSightEdit(options = {}) {
  if (globalApp) {
    console.warn('[SightEditApp] Application already started');
    return globalApp;
  }

  try {
    globalApp = new SightEditApp();
    await globalApp.init();
    
    // グローバルアクセス（デバッグ用）
    if (options.exposeGlobal !== false) {
      window.SightEditApp = globalApp;
      console.log('[SightEditApp] Global access available via window.SightEditApp');
    }

    return globalApp;

  } catch (error) {
    globalApp = null;
    console.error('[SightEditApp] Startup failed:', error);
    throw error;
  }
}

/**
 * アプリケーションを停止
 */
export async function stopSightEdit() {
  if (!globalApp) {
    console.warn('[SightEditApp] Application not running');
    return;
  }

  try {
    await globalApp.shutdown();
    globalApp = null;
    
    if (window.SightEditApp) {
      delete window.SightEditApp;
    }

  } catch (error) {
    console.error('[SightEditApp] Stop failed:', error);
    throw error;
  }
}

/**
 * アプリケーションインスタンスを取得
 * @returns {SightEditApp|null} アプリケーションインスタンス
 */
export function getSightEditApp() {
  return globalApp;
}

// DOM読み込み完了時の自動開始
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      await startSightEdit();
      console.log('[SightEditApp] Auto-started on DOM ready');
    } catch (error) {
      console.error('[SightEditApp] Auto-start failed:', error);
    }
  });
} else {
  // 既に読み込み完了している場合は即座に開始
  setTimeout(async () => {
    try {
      await startSightEdit();
      console.log('[SightEditApp] Auto-started immediately');
    } catch (error) {
      console.error('[SightEditApp] Auto-start failed:', error);
    }
  }, 0);
}

// Export classes for advanced usage
export {
  SightEditApp,
  ServiceLocator,
  ComponentFactory,
  getEventBus
};