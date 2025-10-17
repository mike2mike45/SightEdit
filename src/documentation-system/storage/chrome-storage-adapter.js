/**
 * Chrome Storage API Adapter
 * Chrome Storage APIを使用したデータ保存・取得機能
 */

class ChromeStorageAdapter {
  constructor() {
    this.storage = chrome.storage.local;
  }

  /**
   * データを保存
   * @param {string} key - ストレージキー
   * @param {any} value - 保存する値
   * @returns {Promise<void>}
   */
  async set(key, value) {
    try {
      await this.storage.set({ [key]: value });
      console.log(`[ChromeStorage] Saved: ${key}`);
    } catch (error) {
      console.error(`[ChromeStorage] Error saving ${key}:`, error);
      throw new Error(`Failed to save data: ${error.message}`);
    }
  }

  /**
   * データを取得
   * @param {string} key - ストレージキー
   * @returns {Promise<any>}
   */
  async get(key) {
    try {
      const result = await this.storage.get(key);
      return result[key];
    } catch (error) {
      console.error(`[ChromeStorage] Error getting ${key}:`, error);
      throw new Error(`Failed to get data: ${error.message}`);
    }
  }

  /**
   * データを削除
   * @param {string} key - ストレージキー
   * @returns {Promise<void>}
   */
  async remove(key) {
    try {
      await this.storage.remove(key);
      console.log(`[ChromeStorage] Removed: ${key}`);
    } catch (error) {
      console.error(`[ChromeStorage] Error removing ${key}:`, error);
      throw new Error(`Failed to remove data: ${error.message}`);
    }
  }

  /**
   * すべてのデータをクリア
   * @returns {Promise<void>}
   */
  async clear() {
    try {
      await this.storage.clear();
      console.log('[ChromeStorage] Cleared all data');
    } catch (error) {
      console.error('[ChromeStorage] Error clearing data:', error);
      throw new Error(`Failed to clear data: ${error.message}`);
    }
  }

  /**
   * ストレージ使用量を取得
   * @returns {Promise<number>} 使用バイト数
   */
  async getBytesInUse() {
    try {
      const bytes = await this.storage.getBytesInUse();
      return bytes;
    } catch (error) {
      console.error('[ChromeStorage] Error getting bytes in use:', error);
      return 0;
    }
  }
}

export default ChromeStorageAdapter;
