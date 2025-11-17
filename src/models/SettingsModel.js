/**
 * SettingsModel - Application Settings Management
 * ES2024対応の設定管理データモデル
 */
import { BaseComponent } from '../core/ComponentFactory.js';
import { EVENTS } from '../core/EventBus.js';

export class SettingsModel extends BaseComponent {
  #settings = new Map();
  #defaultSettings = new Map();
  #validators = new Map();
  #storageKey = 'sightedit_settings';

  constructor(config = {}) {
    super(config);
    
    this.#storageKey = config.storageKey || 'sightedit_settings';
    this.#initializeDefaultSettings();
    this.#loadSettings();
  }

  /**
   * デフォルト設定を初期化
   * @private
   */
  #initializeDefaultSettings() {
    // エディタ設定
    this.#setDefault('editor.theme', 'light');
    this.#setDefault('editor.fontSize', 14);
    this.#setDefault('editor.fontFamily', 'Consolas, "Courier New", monospace');
    this.#setDefault('editor.lineHeight', 1.5);
    this.#setDefault('editor.tabSize', 2);
    this.#setDefault('editor.wordWrap', true);
    this.#setDefault('editor.showLineNumbers', false);
    this.#setDefault('editor.autoSave', true);
    this.#setDefault('editor.autoSaveInterval', 30000); // 30秒

    // ファイル設定
    this.#setDefault('file.maxRecentFiles', 10);
    this.#setDefault('file.defaultExtension', '.md');
    this.#setDefault('file.autoBackup', true);

    // UI設定
    this.#setDefault('ui.language', 'ja');
    this.#setDefault('ui.showToolbar', true);
    this.#setDefault('ui.showStatusBar', true);
    this.#setDefault('ui.compactMode', false);

    // AI設定
    this.#setDefault('ai.enabled', true);
    this.#setDefault('ai.provider', 'gemini');
    this.#setDefault('ai.apiKey', '');
    this.#setDefault('ai.model', 'gemini-pro');
    this.#setDefault('ai.temperature', 0.7);
    this.#setDefault('ai.maxTokens', 1000);

    // エクスポート設定
    this.#setDefault('export.includeMetadata', true);
    this.#setDefault('export.defaultFormat', 'markdown');

    // バリデーター設定
    this.#setupValidators();
  }

  /**
   * デフォルト値を設定
   * @private
   * @param {string} key - 設定キー
   * @param {*} value - デフォルト値
   */
  #setDefault(key, value) {
    this.#defaultSettings.set(key, value);
    if (!this.#settings.has(key)) {
      this.#settings.set(key, value);
    }
  }

  /**
   * バリデーターをセットアップ
   * @private
   */
  #setupValidators() {
    // エディタ設定のバリデーター
    this.#validators.set('editor.theme', (value) => {
      const themes = ['light', 'dark', 'auto'];
      return themes.includes(value) ? null : `テーマは ${themes.join(', ')} のいずれかを選択してください`;
    });

    this.#validators.set('editor.fontSize', (value) => {
      const num = Number(value);
      return num >= 8 && num <= 72 ? null : 'フォントサイズは8～72の範囲で設定してください';
    });

    this.#validators.set('editor.lineHeight', (value) => {
      const num = Number(value);
      return num >= 1.0 && num <= 3.0 ? null : '行間は1.0～3.0の範囲で設定してください';
    });

    this.#validators.set('editor.tabSize', (value) => {
      const num = Number(value);
      return num >= 1 && num <= 8 ? null : 'タブサイズは1～8の範囲で設定してください';
    });

    this.#validators.set('editor.autoSaveInterval', (value) => {
      const num = Number(value);
      return num >= 5000 && num <= 300000 ? null : '自動保存間隔は5秒～5分の範囲で設定してください';
    });

    // AI設定のバリデーター
    this.#validators.set('ai.provider', (value) => {
      const providers = ['gemini', 'claude', 'openai', 'custom'];
      return providers.includes(value) ? null : `AIプロバイダーは ${providers.join(', ')} のいずれかを選択してください`;
    });

    this.#validators.set('ai.temperature', (value) => {
      const num = Number(value);
      return num >= 0 && num <= 2 ? null : '温度パラメータは0～2の範囲で設定してください';
    });

    this.#validators.set('ai.maxTokens', (value) => {
      const num = Number(value);
      return num >= 1 && num <= 10000 ? null : '最大トークン数は1～10000の範囲で設定してください';
    });
  }

  /**
   * 設定をローカルストレージから読み込み
   * @private
   */
  #loadSettings() {
    try {
      const stored = localStorage.getItem(this.#storageKey);
      if (stored) {
        const settings = JSON.parse(stored);
        for (const [key, value] of Object.entries(settings)) {
          if (this.#defaultSettings.has(key)) {
            this.#settings.set(key, value);
          }
        }
      }
    } catch (error) {
      console.error('[SettingsModel] Failed to load settings:', error);
    }

    this.emit(EVENTS.SETTINGS_LOADED, {
      settings: this.getAllSettings()
    });
  }

  /**
   * 設定をローカルストレージに保存
   * @private
   */
  #saveSettings() {
    try {
      const settings = Object.fromEntries(this.#settings);
      localStorage.setItem(this.#storageKey, JSON.stringify(settings));
    } catch (error) {
      console.error('[SettingsModel] Failed to save settings:', error);
    }
  }

  /**
   * 設定値を取得
   * @param {string} key - 設定キー
   * @returns {*} 設定値
   */
  get(key) {
    return this.#settings.get(key);
  }

  /**
   * 設定値を設定
   * @param {string} key - 設定キー
   * @param {*} value - 設定値
   * @returns {boolean} 設定が成功したかどうか
   */
  set(key, value) {
    // バリデーション
    const validator = this.#validators.get(key);
    if (validator) {
      const error = validator(value);
      if (error) {
        console.warn(`[SettingsModel] Validation failed for ${key}: ${error}`);
        return false;
      }
    }

    const oldValue = this.#settings.get(key);
    this.#settings.set(key, value);
    this.#saveSettings();

    this.emit(EVENTS.SETTINGS_CHANGED, {
      key,
      oldValue,
      newValue: value
    });

    return true;
  }

  /**
   * 複数の設定を一括設定
   * @param {Object} settings - 設定オブジェクト
   * @returns {Object} 設定結果
   */
  setMany(settings) {
    const results = {};
    const changes = [];

    for (const [key, value] of Object.entries(settings)) {
      const oldValue = this.#settings.get(key);
      const success = this.set(key, value);
      results[key] = success;

      if (success) {
        changes.push({ key, oldValue, newValue: value });
      }
    }

    if (changes.length > 0) {
      this.emit('settings:batchChanged', {
        changes
      });
    }

    return results;
  }

  /**
   * 設定値をデフォルトにリセット
   * @param {string} key - 設定キー
   * @returns {boolean} リセットが成功したかどうか
   */
  reset(key) {
    if (!this.#defaultSettings.has(key)) {
      return false;
    }

    const defaultValue = this.#defaultSettings.get(key);
    return this.set(key, defaultValue);
  }

  /**
   * 全設定をデフォルトにリセット
   */
  resetAll() {
    const changes = [];

    for (const [key, defaultValue] of this.#defaultSettings) {
      const oldValue = this.#settings.get(key);
      this.#settings.set(key, defaultValue);
      changes.push({ key, oldValue, newValue: defaultValue });
    }

    this.#saveSettings();

    this.emit('settings:resetAll', {
      changes
    });
  }

  /**
   * 全設定を取得
   * @returns {Object} 全設定
   */
  getAllSettings() {
    return Object.fromEntries(this.#settings);
  }

  /**
   * デフォルト設定を取得
   * @returns {Object} デフォルト設定
   */
  getDefaultSettings() {
    return Object.fromEntries(this.#defaultSettings);
  }

  /**
   * カテゴリ別設定を取得
   * @param {string} category - カテゴリ名
   * @returns {Object} カテゴリ別設定
   */
  getCategory(category) {
    const categorySettings = {};
    const prefix = `${category}.`;

    for (const [key, value] of this.#settings) {
      if (key.startsWith(prefix)) {
        const subKey = key.slice(prefix.length);
        categorySettings[subKey] = value;
      }
    }

    return categorySettings;
  }

  /**
   * 設定の変更を監視
   * @param {string} key - 監視する設定キー
   * @param {Function} callback - コールバック関数
   * @returns {Function} 監視解除関数
   */
  watch(key, callback) {
    return this.on(EVENTS.SETTINGS_CHANGED, (event) => {
      if (event.data.key === key) {
        callback(event.data.newValue, event.data.oldValue);
      }
    });
  }

  /**
   * 設定をエクスポート
   * @returns {Object} エクスポートデータ
   */
  export() {
    return {
      settings: this.getAllSettings(),
      timestamp: Date.now(),
      version: '1.0.0'
    };
  }

  /**
   * 設定をインポート
   * @param {Object} data - インポートデータ
   * @returns {boolean} インポートが成功したかどうか
   */
  import(data) {
    if (!data || !data.settings) {
      return false;
    }

    try {
      const results = this.setMany(data.settings);
      const successCount = Object.values(results).filter(Boolean).length;
      
      this.emit('settings:imported', {
        total: Object.keys(data.settings).length,
        success: successCount,
        results
      });

      return successCount > 0;
    } catch (error) {
      console.error('[SettingsModel] Import failed:', error);
      return false;
    }
  }

  /**
   * 設定の検証
   * @returns {Object} 検証結果
   */
  validate() {
    const errors = [];
    const warnings = [];

    for (const [key, value] of this.#settings) {
      const validator = this.#validators.get(key);
      if (validator) {
        const error = validator(value);
        if (error) {
          errors.push({ key, value, error });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 破棄処理
   */
  destroy() {
    this.#settings.clear();
    this.#defaultSettings.clear();
    this.#validators.clear();
    super.destroy();
  }
}