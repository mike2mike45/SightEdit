/**
 * ロギングシステム
 * Documentation System Logger
 */

const LogLevel = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

class Logger {
  constructor(context = 'DocumentationSystem') {
    this.context = context;
    this.logHistory = [];
    this.maxHistorySize = 100;
  }

  /**
   * エラーログ
   * @param {string} code - エラーコード
   * @param {Error} error - エラーオブジェクト
   * @param {Object} context - コンテキスト情報
   */
  error(code, error, context = {}) {
    const logEntry = this.createLogEntry(LogLevel.ERROR, error.message, { code, ...context, stack: error.stack });
    console.error(`[${this.context}] [${code}]`, error.message, context);
    this.addToHistory(logEntry);
    this.saveToStorage(logEntry);
  }

  /**
   * 警告ログ
   * @param {string} message - メッセージ
   * @param {Object} context - コンテキスト情報
   */
  warn(message, context = {}) {
    const logEntry = this.createLogEntry(LogLevel.WARN, message, context);
    console.warn(`[${this.context}]`, message, context);
    this.addToHistory(logEntry);
  }

  /**
   * 情報ログ
   * @param {string} message - メッセージ
   * @param {Object} context - コンテキスト情報
   */
  info(message, context = {}) {
    const logEntry = this.createLogEntry(LogLevel.INFO, message, context);
    console.log(`[${this.context}]`, message, context);
    this.addToHistory(logEntry);
  }

  /**
   * デバッグログ
   * @param {string} message - メッセージ
   * @param {Object} context - コンテキスト情報
   */
  debug(message, context = {}) {
    const logEntry = this.createLogEntry(LogLevel.DEBUG, message, context);
    console.debug(`[${this.context}]`, message, context);
    this.addToHistory(logEntry);
  }

  /**
   * ログエントリを作成
   * @private
   */
  createLogEntry(level, message, context) {
    return {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      source: this.context
    };
  }

  /**
   * ログ履歴に追加
   * @private
   */
  addToHistory(logEntry) {
    this.logHistory.push(logEntry);

    // 履歴サイズを制限
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }
  }

  /**
   * エラーログをChrome Storageに保存
   * @private
   */
  async saveToStorage(logEntry) {
    if (logEntry.level === LogLevel.ERROR) {
      try {
        const errorLogs = await chrome.storage.local.get('errorLogs') || { errorLogs: [] };
        errorLogs.errorLogs.push(logEntry);

        // 最大100件まで保存
        if (errorLogs.errorLogs.length > 100) {
          errorLogs.errorLogs = errorLogs.errorLogs.slice(-100);
        }

        await chrome.storage.local.set({ errorLogs: errorLogs.errorLogs });
      } catch (error) {
        console.error('Failed to save error log to storage:', error);
      }
    }
  }

  /**
   * ログ履歴を取得
   * @returns {Array} ログエントリの配列
   */
  getHistory() {
    return [...this.logHistory];
  }

  /**
   * ログ履歴をクリア
   */
  clearHistory() {
    this.logHistory = [];
  }

  /**
   * 保存されたエラーログを取得
   * @returns {Promise<Array>}
   */
  static async getSavedErrorLogs() {
    try {
      const result = await chrome.storage.local.get('errorLogs');
      return result.errorLogs || [];
    } catch (error) {
      console.error('Failed to get saved error logs:', error);
      return [];
    }
  }

  /**
   * 保存されたエラーログをクリア
   * @returns {Promise<void>}
   */
  static async clearSavedErrorLogs() {
    try {
      await chrome.storage.local.remove('errorLogs');
    } catch (error) {
      console.error('Failed to clear saved error logs:', error);
    }
  }
}

export { Logger, LogLevel };
