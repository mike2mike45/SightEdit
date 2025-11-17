/**
 * ComponentFactory - Modern Component Creation Pattern
 * ES2024対応のコンポーネントファクトリー
 */
import { getServiceLocator, SERVICES } from './ServiceLocator.js';
import { getEventBus } from './EventBus.js';

export class ComponentFactory {
  #serviceLocator;
  #eventBus;
  #componentRegistry = new Map();

  constructor() {
    this.#serviceLocator = getServiceLocator();
    this.#eventBus = getEventBus();
    this.#componentRegistry = new Map();
  }

  /**
   * コンポーネントクラスを登録
   * @param {string} name - コンポーネント名
   * @param {Function} componentClass - コンポーネントクラス
   * @param {Object} options - オプション
   */
  register(name, componentClass, options = {}) {
    if (typeof componentClass !== 'function') {
      throw new Error('Component class must be a constructor function');
    }

    this.#componentRegistry.set(name, {
      class: componentClass,
      singleton: options.singleton ?? false,
      dependencies: options.dependencies ?? [],
      lifecycle: options.lifecycle ?? 'manual'
    });

    console.log(`[ComponentFactory] Component '${name}' registered`);
  }

  /**
   * コンポーネントを作成
   * @param {string} name - コンポーネント名
   * @param {Object} config - 設定オプション
   * @returns {*} コンポーネントインスタンス
   */
  create(name, config = {}) {
    if (!this.#componentRegistry.has(name)) {
      throw new Error(`Component '${name}' not registered`);
    }

    const componentInfo = this.#componentRegistry.get(name);
    const { class: ComponentClass, dependencies } = componentInfo;

    // 依存関係を解決
    const resolvedDependencies = this.#resolveDependencies(dependencies);

    // インスタンス作成
    const instance = new ComponentClass(config, ...resolvedDependencies);

    // ライフサイクルイベントをセットアップ
    this.#setupLifecycle(instance, componentInfo.lifecycle);

    // EventBusとの統合
    this.#integrateWithEventBus(instance, name);

    return instance;
  }

  /**
   * 依存関係を解決
   * @private
   * @param {string[]} dependencies - 依存関係
   * @returns {Array} 解決済み依存関係
   */
  #resolveDependencies(dependencies) {
    return dependencies.map(dep => {
      try {
        return this.#serviceLocator.resolve(dep);
      } catch (error) {
        console.warn(`[ComponentFactory] Could not resolve dependency '${dep}':`, error.message);
        return null;
      }
    });
  }

  /**
   * ライフサイクルをセットアップ
   * @private
   * @param {*} instance - コンポーネントインスタンス
   * @param {string} lifecycle - ライフサイクルタイプ
   */
  #setupLifecycle(instance, lifecycle) {
    if (lifecycle === 'auto' && typeof instance.init === 'function') {
      // 自動初期化
      Promise.resolve().then(() => {
        try {
          instance.init();
        } catch (error) {
          console.error('[ComponentFactory] Component initialization failed:', error);
        }
      });
    }
  }

  /**
   * EventBusとの統合
   * @private
   * @param {*} instance - コンポーネントインスタンス
   * @param {string} name - コンポーネント名
   */
  #integrateWithEventBus(instance, name) {
    // コンポーネントがEventBus対応の場合
    if (typeof instance.setEventBus === 'function') {
      instance.setEventBus(this.#eventBus);
    }

    // コンポーネント作成イベントを発火
    this.#eventBus.emit('component:created', {
      name,
      instance,
      timestamp: Date.now()
    });
  }

  /**
   * コンポーネント破棄
   * @param {*} instance - コンポーネントインスタンス
   * @param {string} name - コンポーネント名
   */
  destroy(instance, name) {
    // 破棄メソッドを呼び出し
    if (typeof instance.destroy === 'function') {
      try {
        instance.destroy();
      } catch (error) {
        console.error(`[ComponentFactory] Error destroying component '${name}':`, error);
      }
    }

    // 破棄イベントを発火
    this.#eventBus.emit('component:destroyed', {
      name,
      instance,
      timestamp: Date.now()
    });
  }

  /**
   * 登録済みコンポーネント一覧を取得
   * @returns {string[]} コンポーネント名の配列
   */
  getRegisteredComponents() {
    return Array.from(this.#componentRegistry.keys());
  }

  /**
   * コンポーネントが登録されているかチェック
   * @param {string} name - コンポーネント名
   * @returns {boolean} 登録されているかどうか
   */
  isRegistered(name) {
    return this.#componentRegistry.has(name);
  }
}

// グローバルファクトリーインスタンス
let globalComponentFactory = null;

/**
 * グローバルComponentFactoryインスタンスを取得
 * @returns {ComponentFactory} ComponentFactoryインスタンス
 */
export function getComponentFactory() {
  if (!globalComponentFactory) {
    globalComponentFactory = new ComponentFactory();
  }
  return globalComponentFactory;
}

/**
 * コンポーネント基底クラス
 */
export class BaseComponent {
  #eventBus = null;
  #config = {};
  #destroyed = false;

  constructor(config = {}) {
    this.#config = { ...config };
    this.#eventBus = getEventBus();
  }

  /**
   * EventBusを設定
   * @param {EventBus} eventBus - EventBusインスタンス
   */
  setEventBus(eventBus) {
    this.#eventBus = eventBus;
  }

  /**
   * EventBusを取得
   * @returns {EventBus} EventBusインスタンス
   */
  get eventBus() {
    return this.#eventBus;
  }

  /**
   * 設定を取得
   * @returns {Object} 設定オブジェクト
   */
  get config() {
    return { ...this.#config };
  }

  /**
   * 破棄されているかチェック
   * @returns {boolean} 破棄されているかどうか
   */
  get isDestroyed() {
    return this.#destroyed;
  }

  /**
   * 初期化（子クラスでオーバーライド）
   */
  init() {
    // Override in child classes
  }

  /**
   * 破棄処理（子クラスでオーバーライド）
   */
  destroy() {
    this.#destroyed = true;
    this.#eventBus = null;
    this.#config = {};
  }

  /**
   * イベント発火
   * @param {string} event - イベント名
   * @param {*} data - イベントデータ
   */
  emit(event, data) {
    if (this.#eventBus && !this.#destroyed) {
      this.#eventBus.emit(event, data);
    }
  }

  /**
   * イベントリスナー登録
   * @param {string} event - イベント名
   * @param {Function} callback - コールバック関数
   * @returns {Function} アンサブスクライブ関数
   */
  on(event, callback) {
    if (this.#eventBus && !this.#destroyed) {
      return this.#eventBus.on(event, callback);
    }
    return () => {}; // No-op unsubscribe function
  }

  /**
   * 一度だけのイベントリスナー登録
   * @param {string} event - イベント名
   * @param {Function} callback - コールバック関数
   */
  once(event, callback) {
    if (this.#eventBus && !this.#destroyed) {
      this.#eventBus.once(event, callback);
    }
  }

  /**
   * イベントリスナー削除
   * @param {string} event - イベント名
   * @param {Function} callback - コールバック関数
   */
  off(event, callback) {
    if (this.#eventBus) {
      this.#eventBus.off(event, callback);
    }
  }
}

// 共通コンポーネント名
export const COMPONENTS = {
  EDITOR_VIEW: 'editorView',
  TOOLBAR_VIEW: 'toolbarView',
  STATUS_BAR_VIEW: 'statusBarView',
  DIALOG_VIEW: 'dialogView',
  SETTINGS_VIEW: 'settingsView',
  SAVE_DIALOG: 'saveDialog',
  OPEN_DIALOG: 'openDialog',
  AI_PANEL: 'aiPanel',
  CHAT_PANEL: 'chatPanel',
  VERSION_PANEL: 'versionPanel'
};