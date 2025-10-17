/**
 * IndexedDB Adapter
 * 大規模データ保存用のIndexedDB実装
 */

const DB_NAME = 'SightEditDocumentationDB';
const DB_VERSION = 1;

const STORES = {
  analysisReports: { keyPath: 'id', indexes: [{ name: 'createdAt', unique: false }, { name: 'type', unique: false }] },
  documents: { keyPath: 'id', indexes: [{ name: 'featureId', unique: false }, { name: 'createdAt', unique: false }] },
  exportData: { keyPath: 'id', indexes: [{ name: 'exportedAt', unique: false }] }
};

class IndexedDBAdapter {
  constructor() {
    this.db = null;
  }

  /**
   * データベースを初期化
   * @returns {Promise<IDBDatabase>}
   */
  async init() {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        console.log('[IndexedDB] Database opened successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Object Storesを作成
        Object.entries(STORES).forEach(([storeName, config]) => {
          if (!db.objectStoreNames.contains(storeName)) {
            const objectStore = db.createObjectStore(storeName, { keyPath: config.keyPath });

            // インデックスを作成
            config.indexes.forEach(index => {
              objectStore.createIndex(index.name, index.name, { unique: index.unique });
            });

            console.log(`[IndexedDB] Created object store: ${storeName}`);
          }
        });
      };
    });
  }

  /**
   * データを保存
   * @param {string} storeName - ストア名
   * @param {Object} data - 保存するデータ
   * @returns {Promise<string>} 保存されたデータのID
   */
  async save(storeName, data) {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      // IDが存在しない場合は生成
      if (!data.id) {
        data.id = this.generateId();
      }

      const request = store.put(data);

      request.onsuccess = () => {
        console.log(`[IndexedDB] Saved data to ${storeName}: ${data.id}`);
        resolve(data.id);
      };

      request.onerror = () => {
        reject(new Error(`Failed to save data to ${storeName}`));
      };
    });
  }

  /**
   * データを取得
   * @param {string} storeName - ストア名
   * @param {string} id - データID
   * @returns {Promise<Object|null>}
   */
  async get(storeName, id) {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = (event) => {
        resolve(event.target.result || null);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get data from ${storeName}`));
      };
    });
  }

  /**
   * すべてのデータを取得
   * @param {string} storeName - ストア名
   * @returns {Promise<Object[]>}
   */
  async getAll(storeName) {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = (event) => {
        resolve(event.target.result || []);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get all data from ${storeName}`));
      };
    });
  }

  /**
   * インデックスでデータを検索
   * @param {string} storeName - ストア名
   * @param {string} indexName - インデックス名
   * @param {any} value - 検索値
   * @returns {Promise<Object[]>}
   */
  async getByIndex(storeName, indexName, value) {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = (event) => {
        resolve(event.target.result || []);
      };

      request.onerror = () => {
        reject(new Error(`Failed to search by index ${indexName} in ${storeName}`));
      };
    });
  }

  /**
   * データを削除
   * @param {string} storeName - ストア名
   * @param {string} id - データID
   * @returns {Promise<void>}
   */
  async delete(storeName, id) {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log(`[IndexedDB] Deleted data from ${storeName}: ${id}`);
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to delete data from ${storeName}`));
      };
    });
  }

  /**
   * ストア内のすべてのデータを削除
   * @param {string} storeName - ストア名
   * @returns {Promise<void>}
   */
  async clear(storeName) {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => {
        console.log(`[IndexedDB] Cleared all data from ${storeName}`);
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to clear ${storeName}`));
      };
    });
  }

  /**
   * ユニークIDを生成
   * @returns {string}
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  /**
   * データベースを閉じる
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('[IndexedDB] Database closed');
    }
  }
}

export default IndexedDBAdapter;
