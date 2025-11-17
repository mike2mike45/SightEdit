/**
 * StorageService - Local Storage Management Service
 * ES2024対応のローカルストレージ管理サービス
 */
import { BaseComponent } from '../core/ComponentFactory.js';

export class StorageService extends BaseComponent {
  #storage = new Map();
  #storageBackends = new Map();
  #currentBackend = null;
  #encryption = null;
  #compressionEnabled = false;
  #maxStorageSize = 5 * 1024 * 1024; // 5MB

  constructor() {
    super();
    
    this.#setupStorageBackends();
    this.#encryption = new SimpleEncryption();
  }

  /**
   * 初期化
   */
  async init() {
    await this.#detectBestBackend();
    await this.#loadStoredData();
    await this.#setupStorageMonitoring();
  }

  /**
   * ストレージバックエンドをセットアップ
   * @private
   */
  #setupStorageBackends() {
    // LocalStorage backend
    this.#storageBackends.set('localStorage', new LocalStorageBackend());
    
    // IndexedDB backend
    this.#storageBackends.set('indexedDB', new IndexedDBBackend());
    
    // OPFS backend (Chrome 102+)
    this.#storageBackends.set('opfs', new OPFSBackend());
    
    // Memory backend (fallback)
    this.#storageBackends.set('memory', new MemoryBackend());
  }

  /**
   * 最適なバックエンドを検出
   * @private
   */
  async #detectBestBackend() {
    const preferences = ['opfs', 'indexedDB', 'localStorage', 'memory'];
    
    for (const backend of preferences) {
      const storageBackend = this.#storageBackends.get(backend);
      if (await storageBackend.isSupported()) {
        this.#currentBackend = storageBackend;
        await this.#currentBackend.init();
        console.log(`[StorageService] Using ${backend} backend`);
        break;
      }
    }

    if (!this.#currentBackend) {
      throw new Error('No storage backend available');
    }
  }

  /**
   * 保存されたデータを読み込み
   * @private
   */
  async #loadStoredData() {
    try {
      const keys = await this.#currentBackend.getAllKeys();
      
      for (const key of keys) {
        if (key.startsWith('se_')) { // SightEdit prefix
          const data = await this.#currentBackend.getItem(key);
          this.#storage.set(key, data);
        }
      }

      console.log(`[StorageService] Loaded ${this.#storage.size} items from storage`);
      
    } catch (error) {
      console.error('[StorageService] Load stored data error:', error);
    }
  }

  /**
   * ストレージ監視をセットアップ
   * @private
   */
  async #setupStorageMonitoring() {
    // ストレージ使用量監視
    this.#startStorageUsageMonitoring();
    
    // ストレージ変更監視
    if (this.#currentBackend.supportsChangeEvents) {
      this.#currentBackend.on('change', this.#handleStorageChange);
    }
  }

  /**
   * データを保存
   * @param {string} key - キー
   * @param {*} value - 値
   * @param {Object} options - オプション
   */
  async setItem(key, value, options = {}) {
    const {
      encrypt = false,
      compress = this.#compressionEnabled,
      ttl = null, // Time to live in milliseconds
      namespace = 'default'
    } = options;

    const fullKey = this.#buildKey(key, namespace);
    
    try {
      let processedValue = value;

      // TTL設定
      if (ttl) {
        processedValue = {
          value: processedValue,
          expires: Date.now() + ttl
        };
      }

      // 圧縮
      if (compress && typeof processedValue === 'string') {
        processedValue = await this.#compress(processedValue);
      }

      // 暗号化
      if (encrypt) {
        processedValue = await this.#encryption.encrypt(JSON.stringify(processedValue));
      }

      // ストレージサイズチェック
      const serializedSize = this.#calculateSize(processedValue);
      await this.#checkStorageCapacity(serializedSize);

      // 保存
      await this.#currentBackend.setItem(fullKey, processedValue);
      this.#storage.set(fullKey, processedValue);

      this.emit('storageChanged', {
        action: 'set',
        key: fullKey,
        size: serializedSize
      });

    } catch (error) {
      console.error('[StorageService] Set item error:', error);
      throw new Error(`Failed to save ${key}: ${error.message}`);
    }
  }

  /**
   * データを取得
   * @param {string} key - キー
   * @param {Object} options - オプション
   * @returns {*} 値
   */
  async getItem(key, options = {}) {
    const {
      decrypt = false,
      decompress = this.#compressionEnabled,
      namespace = 'default',
      defaultValue = null
    } = options;

    const fullKey = this.#buildKey(key, namespace);

    try {
      let value = this.#storage.get(fullKey);
      
      if (value === undefined) {
        value = await this.#currentBackend.getItem(fullKey);
        if (value !== null) {
          this.#storage.set(fullKey, value);
        }
      }

      if (value === null || value === undefined) {
        return defaultValue;
      }

      // 復号化
      if (decrypt) {
        value = JSON.parse(await this.#encryption.decrypt(value));
      }

      // 展開
      if (decompress && this.#isCompressed(value)) {
        value = await this.#decompress(value);
      }

      // TTLチェック
      if (value && typeof value === 'object' && value.expires) {
        if (Date.now() > value.expires) {
          await this.removeItem(key, { namespace });
          return defaultValue;
        }
        value = value.value;
      }

      return value;

    } catch (error) {
      console.error('[StorageService] Get item error:', error);
      return defaultValue;
    }
  }

  /**
   * データを削除
   * @param {string} key - キー
   * @param {Object} options - オプション
   */
  async removeItem(key, options = {}) {
    const { namespace = 'default' } = options;
    const fullKey = this.#buildKey(key, namespace);

    try {
      await this.#currentBackend.removeItem(fullKey);
      this.#storage.delete(fullKey);

      this.emit('storageChanged', {
        action: 'remove',
        key: fullKey
      });

    } catch (error) {
      console.error('[StorageService] Remove item error:', error);
      throw new Error(`Failed to remove ${key}: ${error.message}`);
    }
  }

  /**
   * キーの存在確認
   * @param {string} key - キー
   * @param {Object} options - オプション
   * @returns {boolean} 存在するかどうか
   */
  async hasItem(key, options = {}) {
    const { namespace = 'default' } = options;
    const fullKey = this.#buildKey(key, namespace);

    return this.#storage.has(fullKey) || await this.#currentBackend.hasItem(fullKey);
  }

  /**
   * 全キーを取得
   * @param {Object} options - オプション
   * @returns {string[]} キー一覧
   */
  async getAllKeys(options = {}) {
    const { namespace = null, prefix = '' } = options;

    let keys = Array.from(this.#storage.keys());
    
    // バックエンドからも取得
    const backendKeys = await this.#currentBackend.getAllKeys();
    keys = [...new Set([...keys, ...backendKeys])];

    // フィルタリング
    keys = keys.filter(key => key.startsWith('se_'));
    
    if (namespace) {
      const namespacePrefix = `se_${namespace}_`;
      keys = keys.filter(key => key.startsWith(namespacePrefix));
    }
    
    if (prefix) {
      keys = keys.filter(key => {
        const actualKey = this.#extractKeyFromFull(key);
        return actualKey.startsWith(prefix);
      });
    }

    return keys.map(key => this.#extractKeyFromFull(key));
  }

  /**
   * ストレージをクリア
   * @param {Object} options - オプション
   */
  async clear(options = {}) {
    const { namespace = null } = options;

    try {
      if (namespace) {
        const keys = await this.getAllKeys({ namespace });
        for (const key of keys) {
          await this.removeItem(key, { namespace });
        }
      } else {
        const allKeys = await this.#currentBackend.getAllKeys();
        for (const key of allKeys) {
          if (key.startsWith('se_')) {
            await this.#currentBackend.removeItem(key);
            this.#storage.delete(key);
          }
        }
      }

      this.emit('storageChanged', {
        action: 'clear',
        namespace
      });

    } catch (error) {
      console.error('[StorageService] Clear error:', error);
      throw new Error(`Failed to clear storage: ${error.message}`);
    }
  }

  /**
   * ストレージ使用量を取得
   * @returns {Object} 使用量情報
   */
  async getStorageUsage() {
    try {
      let totalSize = 0;
      let itemCount = 0;
      
      const keys = await this.getAllKeys();
      for (const key of keys) {
        const value = await this.getItem(key);
        totalSize += this.#calculateSize(value);
        itemCount++;
      }

      const backendInfo = await this.#currentBackend.getStorageInfo();
      
      return {
        totalSize,
        itemCount,
        maxSize: this.#maxStorageSize,
        usage: totalSize / this.#maxStorageSize,
        backend: this.#currentBackend.constructor.name,
        backendInfo
      };

    } catch (error) {
      console.error('[StorageService] Get storage usage error:', error);
      return {
        totalSize: 0,
        itemCount: 0,
        maxSize: this.#maxStorageSize,
        usage: 0,
        backend: 'unknown',
        error: error.message
      };
    }
  }

  /**
   * バックアップを作成
   * @param {Object} options - オプション
   * @returns {Object} バックアップデータ
   */
  async createBackup(options = {}) {
    const { namespace = null, includeMetadata = true } = options;

    try {
      const backup = {
        version: '1.0',
        timestamp: Date.now(),
        backend: this.#currentBackend.constructor.name,
        data: {}
      };

      const keys = await this.getAllKeys({ namespace });
      
      for (const key of keys) {
        const value = await this.getItem(key, { namespace });
        backup.data[key] = value;
      }

      if (includeMetadata) {
        backup.metadata = await this.getStorageUsage();
      }

      return backup;

    } catch (error) {
      console.error('[StorageService] Create backup error:', error);
      throw new Error(`Failed to create backup: ${error.message}`);
    }
  }

  /**
   * バックアップを復元
   * @param {Object} backupData - バックアップデータ
   * @param {Object} options - オプション
   */
  async restoreBackup(backupData, options = {}) {
    const { overwrite = false, namespace = null } = options;

    try {
      if (!backupData.version || !backupData.data) {
        throw new Error('Invalid backup data format');
      }

      const keys = Object.keys(backupData.data);
      let restoredCount = 0;

      for (const key of keys) {
        const shouldRestore = overwrite || !(await this.hasItem(key, { namespace }));
        
        if (shouldRestore) {
          await this.setItem(key, backupData.data[key], { namespace });
          restoredCount++;
        }
      }

      this.emit('storageChanged', {
        action: 'restore',
        restoredCount,
        totalItems: keys.length
      });

      return {
        restoredCount,
        totalItems: keys.length,
        skippedItems: keys.length - restoredCount
      };

    } catch (error) {
      console.error('[StorageService] Restore backup error:', error);
      throw new Error(`Failed to restore backup: ${error.message}`);
    }
  }

  /**
   * 期限切れアイテムをクリーンアップ
   */
  async cleanupExpiredItems() {
    try {
      const keys = await this.getAllKeys();
      let cleanedCount = 0;

      for (const key of keys) {
        const value = await this.getItem(key);
        // TTLチェック時に期限切れアイテムは自動削除される
        if (value === null) {
          cleanedCount++;
        }
      }

      console.log(`[StorageService] Cleaned ${cleanedCount} expired items`);
      return cleanedCount;

    } catch (error) {
      console.error('[StorageService] Cleanup expired items error:', error);
      return 0;
    }
  }

  /**
   * フルキーを構築
   * @private
   */
  #buildKey(key, namespace) {
    return `se_${namespace}_${key}`;
  }

  /**
   * フルキーから実際のキーを抽出
   * @private
   */
  #extractKeyFromFull(fullKey) {
    const parts = fullKey.split('_');
    return parts.slice(2).join('_');
  }

  /**
   * データサイズを計算
   * @private
   */
  #calculateSize(value) {
    return new Blob([JSON.stringify(value)]).size;
  }

  /**
   * ストレージ容量をチェック
   * @private
   */
  async #checkStorageCapacity(newItemSize) {
    const usage = await this.getStorageUsage();
    
    if (usage.totalSize + newItemSize > this.#maxStorageSize) {
      // 古いアイテムを削除してスペースを確保
      await this.#freeUpSpace(newItemSize);
    }
  }

  /**
   * スペースを確保
   * @private
   */
  async #freeUpSpace(requiredSpace) {
    // LRU方式で古いアイテムを削除
    // 実装は簡略化
    console.warn('[StorageService] Storage capacity reached, cleanup required');
  }

  /**
   * データを圧縮
   * @private
   */
  async #compress(data) {
    if (typeof CompressionStream !== 'undefined') {
      const stream = new CompressionStream('gzip');
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();
      
      writer.write(new TextEncoder().encode(data));
      writer.close();
      
      const chunks = [];
      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) chunks.push(value);
      }
      
      return {
        compressed: true,
        data: Array.from(new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], [])))
      };
    }
    
    return data; // フォールバック：圧縮なし
  }

  /**
   * データを展開
   * @private
   */
  async #decompress(compressedData) {
    if (compressedData.compressed && typeof DecompressionStream !== 'undefined') {
      const stream = new DecompressionStream('gzip');
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();
      
      writer.write(new Uint8Array(compressedData.data));
      writer.close();
      
      const chunks = [];
      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) chunks.push(value);
      }
      
      const decompressed = new TextDecoder().decode(
        new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], []))
      );
      
      return decompressed;
    }
    
    return compressedData.data || compressedData;
  }

  /**
   * 圧縮されたデータかどうかをチェック
   * @private
   */
  #isCompressed(value) {
    return value && typeof value === 'object' && value.compressed === true;
  }

  /**
   * ストレージ使用量監視を開始
   * @private
   */
  #startStorageUsageMonitoring() {
    setInterval(async () => {
      const usage = await this.getStorageUsage();
      
      if (usage.usage > 0.9) { // 90%以上使用
        console.warn('[StorageService] Storage usage high:', usage);
        this.emit('storageWarning', { type: 'high_usage', usage });
      }
    }, 60000); // 1分ごと
  }

  /**
   * ストレージ変更ハンドラー
   * @private
   */
  #handleStorageChange = (event) => {
    this.emit('storageExternalChange', event);
  }

  /**
   * ストレージバックエンドを取得
   * @returns {string} バックエンド名
   */
  getCurrentBackend() {
    return this.#currentBackend?.constructor.name || 'none';
  }

  /**
   * 設定を更新
   * @param {Object} config - 設定
   */
  updateConfig(config) {
    if (config.maxStorageSize !== undefined) {
      this.#maxStorageSize = config.maxStorageSize;
    }
    
    if (config.compressionEnabled !== undefined) {
      this.#compressionEnabled = config.compressionEnabled;
    }

    console.log('[StorageService] Configuration updated:', config);
  }

  /**
   * 破棄処理
   */
  destroy() {
    this.#storage.clear();
    this.#storageBackends.clear();
    this.#currentBackend = null;
    this.#encryption = null;
    
    super.destroy();
  }
}

/**
 * 簡単な暗号化クラス
 */
class SimpleEncryption {
  async encrypt(data) {
    // 実際の実装では Web Crypto API を使用
    return btoa(data);
  }

  async decrypt(encryptedData) {
    // 実際の実装では Web Crypto API を使用
    return atob(encryptedData);
  }
}

/**
 * LocalStorageバックエンド
 */
class LocalStorageBackend {
  async isSupported() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  async init() {
    // LocalStorageは初期化不要
  }

  async setItem(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  async getItem(key) {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  }

  async removeItem(key) {
    localStorage.removeItem(key);
  }

  async hasItem(key) {
    return localStorage.getItem(key) !== null;
  }

  async getAllKeys() {
    return Object.keys(localStorage);
  }

  async getStorageInfo() {
    return {
      type: 'localStorage',
      available: true,
      quotaBytes: 5 * 1024 * 1024 // 概算5MB
    };
  }

  get supportsChangeEvents() {
    return true;
  }

  on(event, callback) {
    if (event === 'change') {
      window.addEventListener('storage', callback);
    }
  }
}

/**
 * IndexedDBバックエンド
 */
class IndexedDBBackend {
  #db = null;
  #dbName = 'SightEditStorage';
  #storeName = 'keyValueStore';

  async isSupported() {
    return 'indexedDB' in window;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.#dbName, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.#db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.#storeName)) {
          db.createObjectStore(this.#storeName);
        }
      };
    });
  }

  async setItem(key, value) {
    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction([this.#storeName], 'readwrite');
      const store = transaction.objectStore(this.#storeName);
      const request = store.put(value, key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getItem(key) {
    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction([this.#storeName], 'readonly');
      const store = transaction.objectStore(this.#storeName);
      const request = store.get(key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async removeItem(key) {
    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction([this.#storeName], 'readwrite');
      const store = transaction.objectStore(this.#storeName);
      const request = store.delete(key);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async hasItem(key) {
    const value = await this.getItem(key);
    return value !== null;
  }

  async getAllKeys() {
    return new Promise((resolve, reject) => {
      const transaction = this.#db.transaction([this.#storeName], 'readonly');
      const store = transaction.objectStore(this.#storeName);
      const request = store.getAllKeys();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async getStorageInfo() {
    let quota = 0;
    let usage = 0;
    
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      quota = estimate.quota;
      usage = estimate.usage;
    }

    return {
      type: 'indexedDB',
      available: true,
      quotaBytes: quota,
      usageBytes: usage
    };
  }

  get supportsChangeEvents() {
    return false;
  }
}

/**
 * OPFS (Origin Private File System) バックエンド
 */
class OPFSBackend {
  #rootDirectory = null;

  async isSupported() {
    return 'storage' in navigator && 'getDirectory' in navigator.storage;
  }

  async init() {
    this.#rootDirectory = await navigator.storage.getDirectory();
  }

  async setItem(key, value) {
    const fileHandle = await this.#rootDirectory.getFileHandle(`${key}.json`, {
      create: true
    });
    
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(value));
    await writable.close();
  }

  async getItem(key) {
    try {
      const fileHandle = await this.#rootDirectory.getFileHandle(`${key}.json`);
      const file = await fileHandle.getFile();
      const content = await file.text();
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async removeItem(key) {
    try {
      await this.#rootDirectory.removeEntry(`${key}.json`);
    } catch {
      // ファイルが存在しない場合は無視
    }
  }

  async hasItem(key) {
    try {
      await this.#rootDirectory.getFileHandle(`${key}.json`);
      return true;
    } catch {
      return false;
    }
  }

  async getAllKeys() {
    const keys = [];
    
    for await (const [name, handle] of this.#rootDirectory.entries()) {
      if (name.endsWith('.json')) {
        keys.push(name.replace('.json', ''));
      }
    }
    
    return keys;
  }

  async getStorageInfo() {
    const estimate = await navigator.storage.estimate();
    
    return {
      type: 'opfs',
      available: true,
      quotaBytes: estimate.quota,
      usageBytes: estimate.usage
    };
  }

  get supportsChangeEvents() {
    return false;
  }
}

/**
 * Memoryバックエンド（フォールバック）
 */
class MemoryBackend {
  #storage = new Map();

  async isSupported() {
    return true;
  }

  async init() {
    // メモリストレージは初期化不要
  }

  async setItem(key, value) {
    this.#storage.set(key, value);
  }

  async getItem(key) {
    return this.#storage.get(key) || null;
  }

  async removeItem(key) {
    this.#storage.delete(key);
  }

  async hasItem(key) {
    return this.#storage.has(key);
  }

  async getAllKeys() {
    return Array.from(this.#storage.keys());
  }

  async getStorageInfo() {
    const usage = JSON.stringify(Array.from(this.#storage.entries())).length;
    
    return {
      type: 'memory',
      available: true,
      quotaBytes: 0, // 無制限（メモリによる）
      usageBytes: usage
    };
  }

  get supportsChangeEvents() {
    return false;
  }
}