/**
 * EventBus - Modern ES2024 Observer Pattern Implementation
 * グローバルイベント管理システム
 */
export class EventBus {
  #listeners = new Map();
  #onceListeners = new Map();
  #debugging = false;

  constructor() {
    this.#listeners = new Map();
    this.#onceListeners = new Map();
  }

  /**
   * イベントリスナーを登録
   * @param {string} event - イベント名
   * @param {Function} callback - コールバック関数
   * @param {Object} options - オプション
   */
  on(event, callback, options = {}) {
    if (typeof callback !== 'function') {
      throw new TypeError('Callback must be a function');
    }

    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set());
    }

    const listener = { callback, ...options };
    this.#listeners.get(event).add(listener);

    if (this.#debugging) {
      console.log(`[EventBus] Listener registered for '${event}'`);
    }

    // Unsubscribe function を返す
    return () => this.off(event, callback);
  }

  /**
   * 一度だけ実行されるイベントリスナーを登録
   * @param {string} event - イベント名
   * @param {Function} callback - コールバック関数
   */
  once(event, callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('Callback must be a function');
    }

    if (!this.#onceListeners.has(event)) {
      this.#onceListeners.set(event, new Set());
    }

    this.#onceListeners.get(event).add(callback);

    if (this.#debugging) {
      console.log(`[EventBus] Once listener registered for '${event}'`);
    }
  }

  /**
   * イベントリスナーを削除
   * @param {string} event - イベント名
   * @param {Function} callback - コールバック関数
   */
  off(event, callback) {
    if (this.#listeners.has(event)) {
      const listeners = this.#listeners.get(event);
      for (const listener of listeners) {
        if (listener.callback === callback) {
          listeners.delete(listener);
          break;
        }
      }

      if (listeners.size === 0) {
        this.#listeners.delete(event);
      }
    }

    if (this.#onceListeners.has(event)) {
      this.#onceListeners.get(event).delete(callback);
      if (this.#onceListeners.get(event).size === 0) {
        this.#onceListeners.delete(event);
      }
    }

    if (this.#debugging) {
      console.log(`[EventBus] Listener removed for '${event}'`);
    }
  }

  /**
   * イベントを発火
   * @param {string} event - イベント名
   * @param {*} data - イベントデータ
   */
  async emit(event, data = null) {
    const eventData = {
      type: event,
      data,
      timestamp: Date.now(),
      source: 'EventBus'
    };

    if (this.#debugging) {
      console.log(`[EventBus] Emitting '${event}'`, eventData);
    }

    // 通常のリスナーを実行
    if (this.#listeners.has(event)) {
      const listeners = this.#listeners.get(event);
      const promises = [];

      for (const listener of listeners) {
        try {
          const result = listener.callback(eventData);
          if (result instanceof Promise) {
            promises.push(result);
          }
        } catch (error) {
          console.error(`[EventBus] Error in listener for '${event}':`, error);
        }
      }

      // 非同期リスナーの完了を待つ
      if (promises.length > 0) {
        await Promise.allSettled(promises);
      }
    }

    // Once リスナーを実行
    if (this.#onceListeners.has(event)) {
      const onceListeners = this.#onceListeners.get(event);
      const promises = [];

      for (const callback of onceListeners) {
        try {
          const result = callback(eventData);
          if (result instanceof Promise) {
            promises.push(result);
          }
        } catch (error) {
          console.error(`[EventBus] Error in once listener for '${event}':`, error);
        }
      }

      // Once リスナーをクリア
      this.#onceListeners.delete(event);

      // 非同期リスナーの完了を待つ
      if (promises.length > 0) {
        await Promise.allSettled(promises);
      }
    }
  }

  /**
   * 全てのリスナーをクリア
   */
  clear() {
    this.#listeners.clear();
    this.#onceListeners.clear();

    if (this.#debugging) {
      console.log('[EventBus] All listeners cleared');
    }
  }

  /**
   * 特定のイベントの全リスナーをクリア
   * @param {string} event - イベント名
   */
  clearEvent(event) {
    this.#listeners.delete(event);
    this.#onceListeners.delete(event);

    if (this.#debugging) {
      console.log(`[EventBus] All listeners cleared for '${event}'`);
    }
  }

  /**
   * デバッグモードの切り替え
   * @param {boolean} enabled - デバッグ有効/無効
   */
  setDebug(enabled) {
    this.#debugging = enabled;
  }

  /**
   * 登録されているイベント一覧を取得
   * @returns {string[]} イベント名の配列
   */
  getEvents() {
    const events = new Set([
      ...this.#listeners.keys(),
      ...this.#onceListeners.keys()
    ]);
    return Array.from(events);
  }

  /**
   * 特定のイベントのリスナー数を取得
   * @param {string} event - イベント名
   * @returns {number} リスナー数
   */
  getListenerCount(event) {
    const regularCount = this.#listeners.has(event) ? this.#listeners.get(event).size : 0;
    const onceCount = this.#onceListeners.has(event) ? this.#onceListeners.get(event).size : 0;
    return regularCount + onceCount;
  }
}

// シングルトンインスタンス
let globalEventBus = null;

/**
 * グローバルEventBusインスタンスを取得
 * @returns {EventBus} EventBusインスタンス
 */
export function getEventBus() {
  if (!globalEventBus) {
    globalEventBus = new EventBus();
  }
  return globalEventBus;
}

// 共通イベント定数
export const EVENTS = {
  // Application events
  APPLICATION_READY: 'application:ready',
  APPLICATION_ERROR: 'application:error',
  APPLICATION_SHUTDOWN_STARTED: 'application:shutdownStarted',
  APPLICATION_HIDDEN: 'application:hidden',
  APPLICATION_VISIBLE: 'application:visible',
  NETWORK_STATE_CHANGED: 'application:networkStateChanged',
  COMPONENT_ERROR: 'application:componentError',
  USER_IDLE: 'application:userIdle',
  USER_ACTIVE: 'application:userActive',
  KEYBOARD_SHORTCUT: 'application:keyboardShortcut',

  // Document events
  DOCUMENT_CHANGED: 'document:changed',
  DOCUMENT_SAVED: 'document:saved',
  DOCUMENT_LOADED: 'document:loaded',
  DOCUMENT_NEW: 'document:new',
  DOCUMENT_STATS_UPDATED: 'document:statsUpdated',

  // File events
  FILE_OPENED: 'file:opened',
  FILE_SAVED: 'file:saved',
  FILE_SAVED_SUCCESSFULLY: 'file:savedSuccessfully',
  FILE_SAVE_AS: 'file:saveAs',
  FILE_ERROR: 'file:error',
  FILE_DROP: 'file:drop',
  FILE_NEW_CREATED: 'file:newCreated',
  FILE_OPEN_REQUEST: 'file:openRequest',
  FILE_SAVE_REQUEST: 'file:saveRequest',
  FILE_SAVE_AS_REQUEST: 'file:saveAsRequest',
  FILE_NEW_REQUEST: 'file:newRequest',
  FILE_LOAD_REQUEST: 'file:loadRequest',
  FILE_VALIDATION_FAILED: 'file:validationFailed',
  AUTO_SAVE_REQUEST: 'file:autoSaveRequest',
  RECENT_FILE_REQUEST: 'file:recentFileRequest',
  RECENT_FILES_LOADED: 'file:recentFilesLoaded',
  FILE_CONTROLLER_READY: 'file:controllerReady',

  // File Dialog events
  FILE_DIALOG_OPENING: 'fileDialog:opening',
  FILE_DIALOG_SUCCESS: 'fileDialog:success',
  FILE_DIALOG_CANCELLED: 'fileDialog:cancelled',

  // Editor events
  EDITOR_READY: 'editor:ready',
  EDITOR_CONTENT_CHANGED: 'editor:contentChanged',
  EDITOR_SELECTION_CHANGED: 'editor:selectionChanged',
  EDITOR_MODE_CHANGED: 'editor:modeChanged',
  EDITOR_SETTINGS_LOADED: 'editor:settingsLoaded',
  EDITOR_UNDO: 'editor:undo',
  EDITOR_REDO: 'editor:redo',
  EDITOR_UNDO_EXECUTED: 'editor:undoExecuted',
  EDITOR_REDO_EXECUTED: 'editor:redoExecuted',
  EDITOR_COMMAND: 'editor:command',

  // UI events
  UI_DIALOG_OPEN: 'ui:dialogOpen',
  UI_DIALOG_CLOSE: 'ui:dialogClose',
  UI_NOTIFICATION: 'ui:notification',

  // Settings events
  SETTINGS_CHANGED: 'settings:changed',
  SETTINGS_LOADED: 'settings:loaded',

  // AI events
  AI_CONTROLLER_READY: 'ai:controllerReady',
  AI_PROCESS_REQUEST: 'ai:processRequest',
  AI_PROCESS_COMPLETED: 'ai:processCompleted',
  AI_PROCESS_FAILED: 'ai:processFailed',
  AI_TRANSLATE_REQUEST: 'ai:translateRequest',
  AI_SUMMARIZE_REQUEST: 'ai:summarizeRequest',
  AI_IMPROVE_REQUEST: 'ai:improveRequest',
  AI_CONTINUE_REQUEST: 'ai:continueRequest',
  AI_CUSTOM_REQUEST: 'ai:customRequest',
  AI_SETTINGS_UPDATE: 'ai:settingsUpdate',
  AI_SETTINGS_LOADED: 'ai:settingsLoaded',
  AI_SETTINGS_UPDATED: 'ai:settingsUpdated',
  AI_BUTTON_CLICKED: 'ai:buttonClicked',
  AI_PROMPT_SUBMITTED: 'ai:promptSubmitted',
  AI_PROCESSING_STATE_CHANGED: 'ai:processingStateChanged',
  AI_REQUEST_START: 'ai:requestStart',
  AI_REQUEST_END: 'ai:requestEnd',
  AI_ERROR: 'ai:error'
};