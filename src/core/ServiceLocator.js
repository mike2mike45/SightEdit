/**
 * ServiceLocator - Modern Dependency Injection Container
 * ES2024 対応の依存性注入システム
 */
export class ServiceLocator {
  #services = new Map();
  #factories = new Map();
  #singletons = new Map();
  #dependencies = new Map();

  constructor() {
    this.#services = new Map();
    this.#factories = new Map();
    this.#singletons = new Map();
    this.#dependencies = new Map();
  }

  /**
   * サービスを登録（インスタンス）
   * @param {string} name - サービス名
   * @param {*} instance - サービスインスタンス
   */
  register(name, instance) {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error('Service name must be a non-empty string');
    }

    this.#services.set(name, instance);
    console.log(`[ServiceLocator] Service '${name}' registered`);
  }

  /**
   * ファクトリー関数を登録（遅延インスタンス化）
   * @param {string} name - サービス名
   * @param {Function} factory - ファクトリー関数
   * @param {boolean} singleton - シングルトンかどうか
   * @param {string[]} dependencies - 依存関係
   */
  registerFactory(name, factory, singleton = true, dependencies = []) {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error('Service name must be a non-empty string');
    }

    if (typeof factory !== 'function') {
      throw new Error('Factory must be a function');
    }

    this.#factories.set(name, {
      factory,
      singleton,
      dependencies
    });

    if (dependencies.length > 0) {
      this.#dependencies.set(name, dependencies);
    }

    console.log(`[ServiceLocator] Factory '${name}' registered ${singleton ? '(singleton)' : '(transient)'}`);
  }

  /**
   * サービスを解決（取得）
   * @param {string} name - サービス名
   * @returns {*} サービスインスタンス
   */
  resolve(name) {
    // 直接登録されたサービス
    if (this.#services.has(name)) {
      return this.#services.get(name);
    }

    // シングルトンキャッシュ
    if (this.#singletons.has(name)) {
      return this.#singletons.get(name);
    }

    // ファクトリーから作成
    if (this.#factories.has(name)) {
      return this.#createFromFactory(name);
    }

    throw new Error(`Service '${name}' not found`);
  }

  /**
   * ファクトリーからサービスを作成
   * @private
   * @param {string} name - サービス名
   * @returns {*} サービスインスタンス
   */
  #createFromFactory(name) {
    const factoryInfo = this.#factories.get(name);
    const { factory, singleton, dependencies } = factoryInfo;

    // 循環依存チェック
    this.#checkCircularDependency(name, new Set());

    // 依存関係を解決
    const resolvedDependencies = dependencies.map(dep => this.resolve(dep));

    // インスタンス作成
    const instance = factory(...resolvedDependencies);

    // シングルトンの場合はキャッシュ
    if (singleton) {
      this.#singletons.set(name, instance);
    }

    return instance;
  }

  /**
   * 循環依存をチェック
   * @private
   * @param {string} name - サービス名
   * @param {Set} visited - 訪問済みサービス
   */
  #checkCircularDependency(name, visited) {
    if (visited.has(name)) {
      throw new Error(`Circular dependency detected: ${Array.from(visited).join(' -> ')} -> ${name}`);
    }

    visited.add(name);

    const dependencies = this.#dependencies.get(name) || [];
    for (const dep of dependencies) {
      this.#checkCircularDependency(dep, new Set(visited));
    }

    visited.delete(name);
  }

  /**
   * サービスが登録されているかチェック
   * @param {string} name - サービス名
   * @returns {boolean} 登録されているかどうか
   */
  has(name) {
    return this.#services.has(name) || 
           this.#factories.has(name) || 
           this.#singletons.has(name);
  }

  /**
   * サービスを削除
   * @param {string} name - サービス名
   */
  remove(name) {
    this.#services.delete(name);
    this.#factories.delete(name);
    this.#singletons.delete(name);
    this.#dependencies.delete(name);
    console.log(`[ServiceLocator] Service '${name}' removed`);
  }

  /**
   * 全てのサービスをクリア
   */
  clear() {
    this.#services.clear();
    this.#factories.clear();
    this.#singletons.clear();
    this.#dependencies.clear();
    console.log('[ServiceLocator] All services cleared');
  }

  /**
   * 登録されているサービス一覧を取得
   * @returns {string[]} サービス名の配列
   */
  getServices() {
    const services = new Set([
      ...this.#services.keys(),
      ...this.#factories.keys(),
      ...this.#singletons.keys()
    ]);
    return Array.from(services);
  }

  /**
   * デバッグ情報を取得
   * @returns {Object} デバッグ情報
   */
  getDebugInfo() {
    return {
      services: Array.from(this.#services.keys()),
      factories: Array.from(this.#factories.keys()),
      singletons: Array.from(this.#singletons.keys()),
      dependencies: Object.fromEntries(this.#dependencies)
    };
  }

  /**
   * 非同期でサービスを解決（Promise対応）
   * @param {string} name - サービス名
   * @returns {Promise<*>} サービスインスタンス
   */
  async resolveAsync(name) {
    const instance = this.resolve(name);
    
    // Promiseの場合は待つ
    if (instance instanceof Promise) {
      return await instance;
    }
    
    return instance;
  }

  /**
   * 複数のサービスを一括解決
   * @param {string[]} names - サービス名の配列
   * @returns {Object} サービスインスタンスのオブジェクト
   */
  resolveMany(names) {
    const result = {};
    for (const name of names) {
      result[name] = this.resolve(name);
    }
    return result;
  }
}

// グローバルサービスロケーター
let globalServiceLocator = null;

/**
 * グローバルServiceLocatorインスタンスを取得
 * @returns {ServiceLocator} ServiceLocatorインスタンス
 */
export function getServiceLocator() {
  if (!globalServiceLocator) {
    globalServiceLocator = new ServiceLocator();
  }
  return globalServiceLocator;
}

/**
 * サービス登録用デコレータ関数
 * @param {string} name - サービス名
 * @param {boolean} singleton - シングルトンかどうか
 * @returns {Function} デコレータ関数
 */
export function injectable(name, singleton = true) {
  return function(target) {
    const serviceLocator = getServiceLocator();
    serviceLocator.registerFactory(name, () => new target(), singleton);
    return target;
  };
}

/**
 * 依存性注入用デコレータ関数
 * @param {...string} dependencies - 依存するサービス名
 * @returns {Function} デコレータ関数
 */
export function inject(...dependencies) {
  return function(target, propertyKey, parameterIndex) {
    if (!target.__dependencies) {
      target.__dependencies = [];
    }
    target.__dependencies[parameterIndex] = dependencies[parameterIndex];
  };
}

// 共通サービス名定数
export const SERVICES = {
  EVENT_BUS: 'eventBus',
  STORAGE_SERVICE: 'storageService',
  FILE_SYSTEM_SERVICE: 'fileSystemService',
  AI_SERVICE: 'aiService',
  DOCUMENT_MODEL: 'documentModel',
  FILE_MODEL: 'fileModel',
  SETTINGS_MODEL: 'settingsModel',
  EDITOR_CONTROLLER: 'editorController',
  FILE_CONTROLLER: 'fileController',
  AI_CONTROLLER: 'aiController',
  EDITOR_VIEW: 'editorView',
  TOOLBAR_VIEW: 'toolbarView',
  DIALOG_VIEW: 'dialogView'
};