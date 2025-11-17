/**
 * ThemeService - Theme Management Service
 * ES2024対応のテーマ管理サービス
 */
import { BaseComponent } from '../core/ComponentFactory.js';

export class ThemeService extends BaseComponent {
  #themes = new Map();
  #currentTheme = null;
  #customThemes = new Map();
  #themeCache = new Map();
  #mediaQuery = null;
  #prefersDark = false;

  constructor() {
    super();
    
    this.#setupDefaultThemes();
    this.#setupMediaQuery();
  }

  /**
   * 初期化
   */
  async init() {
    await this.#loadSystemPreferences();
    await this.#loadCustomThemes();
    await this.#loadUserPreference();
    
    console.log(`[ThemeService] Initialized with ${this.#themes.size} themes`);
  }

  /**
   * デフォルトテーマをセットアップ
   * @private
   */
  #setupDefaultThemes() {
    // Light Theme
    this.#themes.set('light', {
      id: 'light',
      name: 'Light',
      description: 'Clean light theme',
      type: 'built-in',
      variables: {
        // Colors
        '--color-primary': '#1976d2',
        '--color-primary-dark': '#1565c0',
        '--color-primary-light': '#42a5f5',
        '--color-secondary': '#dc004e',
        '--color-success': '#4caf50',
        '--color-warning': '#ff9800',
        '--color-error': '#f44336',
        '--color-info': '#2196f3',
        
        // Background
        '--bg-primary': '#ffffff',
        '--bg-secondary': '#f5f5f5',
        '--bg-tertiary': '#fafafa',
        '--bg-editor': '#ffffff',
        '--bg-sidebar': '#f8f9fa',
        '--bg-toolbar': '#ffffff',
        '--bg-modal': '#ffffff',
        
        // Text
        '--text-primary': '#212121',
        '--text-secondary': '#757575',
        '--text-disabled': '#bdbdbd',
        '--text-inverse': '#ffffff',
        
        // Border
        '--border-color': '#e0e0e0',
        '--border-color-dark': '#bdbdbd',
        '--border-radius': '4px',
        '--border-radius-large': '8px',
        
        // Shadow
        '--shadow-sm': '0 1px 3px rgba(0,0,0,0.12)',
        '--shadow-md': '0 4px 6px rgba(0,0,0,0.16)',
        '--shadow-lg': '0 10px 20px rgba(0,0,0,0.19)',
        
        // Editor specific
        '--editor-bg': '#ffffff',
        '--editor-text': '#212121',
        '--editor-selection': '#e3f2fd',
        '--editor-line-number': '#9e9e9e',
        '--editor-gutter': '#f5f5f5'
      },
      mediaQuery: '(prefers-color-scheme: light)'
    });

    // Dark Theme
    this.#themes.set('dark', {
      id: 'dark',
      name: 'Dark',
      description: 'Modern dark theme',
      type: 'built-in',
      variables: {
        '--color-primary': '#90caf9',
        '--color-primary-dark': '#64b5f6',
        '--color-primary-light': '#bbdefb',
        '--color-secondary': '#f06292',
        '--color-success': '#81c784',
        '--color-warning': '#ffb74d',
        '--color-error': '#e57373',
        '--color-info': '#64b5f6',
        
        '--bg-primary': '#121212',
        '--bg-secondary': '#1e1e1e',
        '--bg-tertiary': '#2d2d2d',
        '--bg-editor': '#1e1e1e',
        '--bg-sidebar': '#181818',
        '--bg-toolbar': '#2d2d2d',
        '--bg-modal': '#2d2d2d',
        
        '--text-primary': '#ffffff',
        '--text-secondary': '#b3b3b3',
        '--text-disabled': '#666666',
        '--text-inverse': '#121212',
        
        '--border-color': '#404040',
        '--border-color-dark': '#666666',
        '--border-radius': '4px',
        '--border-radius-large': '8px',
        
        '--shadow-sm': '0 1px 3px rgba(0,0,0,0.5)',
        '--shadow-md': '0 4px 6px rgba(0,0,0,0.6)',
        '--shadow-lg': '0 10px 20px rgba(0,0,0,0.7)',
        
        '--editor-bg': '#1e1e1e',
        '--editor-text': '#ffffff',
        '--editor-selection': '#264f78',
        '--editor-line-number': '#858585',
        '--editor-gutter': '#2d2d2d'
      },
      mediaQuery: '(prefers-color-scheme: dark)'
    });

    // High Contrast Theme
    this.#themes.set('high-contrast', {
      id: 'high-contrast',
      name: 'High Contrast',
      description: 'High contrast theme for accessibility',
      type: 'built-in',
      variables: {
        '--color-primary': '#ffff00',
        '--color-primary-dark': '#cccc00',
        '--color-primary-light': '#ffff99',
        '--color-secondary': '#ff00ff',
        '--color-success': '#00ff00',
        '--color-warning': '#ffaa00',
        '--color-error': '#ff0000',
        '--color-info': '#00ffff',
        
        '--bg-primary': '#000000',
        '--bg-secondary': '#000000',
        '--bg-tertiary': '#333333',
        '--bg-editor': '#000000',
        '--bg-sidebar': '#000000',
        '--bg-toolbar': '#000000',
        '--bg-modal': '#000000',
        
        '--text-primary': '#ffffff',
        '--text-secondary': '#ffffff',
        '--text-disabled': '#cccccc',
        '--text-inverse': '#000000',
        
        '--border-color': '#ffffff',
        '--border-color-dark': '#ffffff',
        '--border-radius': '2px',
        '--border-radius-large': '4px',
        
        '--shadow-sm': 'none',
        '--shadow-md': 'none',
        '--shadow-lg': 'none',
        
        '--editor-bg': '#000000',
        '--editor-text': '#ffffff',
        '--editor-selection': '#0000ff',
        '--editor-line-number': '#ffffff',
        '--editor-gutter': '#333333'
      },
      mediaQuery: '(prefers-contrast: high)'
    });

    // Blue Theme
    this.#themes.set('blue', {
      id: 'blue',
      name: 'Ocean Blue',
      description: 'Calm blue theme',
      type: 'built-in',
      variables: {
        '--color-primary': '#0277bd',
        '--color-primary-dark': '#01579b',
        '--color-primary-light': '#0288d1',
        
        '--bg-primary': '#e3f2fd',
        '--bg-secondary': '#bbdefb',
        '--bg-tertiary': '#90caf9',
        '--bg-editor': '#f3f9ff',
        '--bg-sidebar': '#e1f5fe',
        '--bg-toolbar': '#e3f2fd',
        
        '--text-primary': '#01579b',
        '--text-secondary': '#0277bd',
        '--text-disabled': '#81d4fa',
        
        '--border-color': '#81d4fa',
        '--border-color-dark': '#29b6f6',
        
        '--editor-bg': '#f3f9ff',
        '--editor-text': '#01579b',
        '--editor-selection': '#b3e5fc',
        '--editor-line-number': '#0288d1',
        '--editor-gutter': '#e1f5fe'
      }
    });

    // Green Theme
    this.#themes.set('green', {
      id: 'green',
      name: 'Forest Green',
      description: 'Natural green theme',
      type: 'built-in',
      variables: {
        '--color-primary': '#2e7d32',
        '--color-primary-dark': '#1b5e20',
        '--color-primary-light': '#4caf50',
        
        '--bg-primary': '#e8f5e8',
        '--bg-secondary': '#c8e6c9',
        '--bg-tertiary': '#a5d6a7',
        '--bg-editor': '#f1f8e9',
        '--bg-sidebar': '#e8f5e8',
        '--bg-toolbar': '#e8f5e8',
        
        '--text-primary': '#1b5e20',
        '--text-secondary': '#2e7d32',
        '--text-disabled': '#81c784',
        
        '--border-color': '#81c784',
        '--border-color-dark': '#66bb6a',
        
        '--editor-bg': '#f1f8e9',
        '--editor-text': '#1b5e20',
        '--editor-selection': '#c8e6c9',
        '--editor-line-number': '#4caf50',
        '--editor-gutter': '#e8f5e8'
      }
    });
  }

  /**
   * メディアクエリをセットアップ
   * @private
   */
  #setupMediaQuery() {
    if (window.matchMedia) {
      this.#mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.#prefersDark = this.#mediaQuery.matches;
      
      this.#mediaQuery.addEventListener('change', this.#handleSystemThemeChange);
    }
  }

  /**
   * システム設定を読み込み
   * @private
   */
  async #loadSystemPreferences() {
    // システムのカラースキーム設定を確認
    if (this.#mediaQuery) {
      this.#prefersDark = this.#mediaQuery.matches;
    }

    // システムのコントラスト設定を確認
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.emit('systemPreferencesLoaded', {
      prefersDark: this.#prefersDark,
      prefersHighContrast,
      prefersReducedMotion
    });
  }

  /**
   * カスタムテーマを読み込み
   * @private
   */
  async #loadCustomThemes() {
    try {
      // ローカルストレージからカスタムテーマを読み込み
      const storedThemes = localStorage.getItem('sightEdit_customThemes');
      if (storedThemes) {
        const themes = JSON.parse(storedThemes);
        
        for (const [id, theme] of Object.entries(themes)) {
          this.#customThemes.set(id, {
            ...theme,
            type: 'custom',
            createdAt: theme.createdAt || Date.now()
          });
          
          // メインテーマリストに追加
          this.#themes.set(id, this.#customThemes.get(id));
        }
      }
    } catch (error) {
      console.error('[ThemeService] Load custom themes error:', error);
    }
  }

  /**
   * ユーザー設定を読み込み
   * @private
   */
  async #loadUserPreference() {
    try {
      const savedTheme = localStorage.getItem('sightEdit_currentTheme');
      
      if (savedTheme && this.#themes.has(savedTheme)) {
        await this.setTheme(savedTheme);
      } else {
        // システム設定に基づいてデフォルトテーマを選択
        const defaultTheme = this.#prefersDark ? 'dark' : 'light';
        await this.setTheme(defaultTheme);
      }
    } catch (error) {
      console.error('[ThemeService] Load user preference error:', error);
      await this.setTheme('light');
    }
  }

  /**
   * システムテーマ変更ハンドラー
   * @private
   */
  #handleSystemThemeChange = (event) => {
    this.#prefersDark = event.matches;
    
    // 自動テーマ切り替えが有効な場合
    if (this.#currentTheme?.id === 'auto') {
      const newTheme = this.#prefersDark ? 'dark' : 'light';
      this.setTheme(newTheme);
    }

    this.emit('systemThemeChanged', {
      prefersDark: this.#prefersDark
    });
  }

  /**
   * テーマを設定
   * @param {string} themeId - テーマID
   */
  async setTheme(themeId) {
    try {
      if (themeId === 'auto') {
        const actualThemeId = this.#prefersDark ? 'dark' : 'light';
        return await this.setTheme(actualThemeId);
      }

      const theme = this.#themes.get(themeId);
      if (!theme) {
        throw new Error(`Theme not found: ${themeId}`);
      }

      // CSS変数を適用
      await this.#applyCSSVariables(theme.variables);
      
      // body要素にテーマクラスを設定
      this.#applyThemeClass(themeId);
      
      // カスタムスタイル適用
      if (theme.customCSS) {
        this.#applyCustomCSS(theme.customCSS);
      }

      this.#currentTheme = theme;
      
      // ユーザー設定を保存
      localStorage.setItem('sightEdit_currentTheme', themeId);
      
      this.emit('themeChanged', {
        themeId,
        theme: { ...theme },
        previousTheme: this.#currentTheme
      });

      console.log(`[ThemeService] Theme applied: ${theme.name}`);

    } catch (error) {
      console.error('[ThemeService] Set theme error:', error);
      throw new Error(`Failed to apply theme: ${error.message}`);
    }
  }

  /**
   * CSS変数を適用
   * @private
   */
  async #applyCSSVariables(variables) {
    const root = document.documentElement;
    
    for (const [property, value] of Object.entries(variables)) {
      root.style.setProperty(property, value);
    }
  }

  /**
   * テーマクラスを適用
   * @private
   */
  #applyThemeClass(themeId) {
    const body = document.body;
    
    // 既存のテーマクラスを削除
    body.classList.forEach(className => {
      if (className.startsWith('theme-')) {
        body.classList.remove(className);
      }
    });
    
    // 新しいテーマクラスを追加
    body.classList.add(`theme-${themeId}`);
    
    // data属性も設定
    body.setAttribute('data-theme', themeId);
  }

  /**
   * カスタムCSSを適用
   * @private
   */
  #applyCustomCSS(customCSS) {
    // 既存のカスタムスタイルを削除
    const existingStyle = document.getElementById('theme-custom-css');
    if (existingStyle) {
      existingStyle.remove();
    }

    // 新しいカスタムスタイルを追加
    if (customCSS) {
      const style = document.createElement('style');
      style.id = 'theme-custom-css';
      style.textContent = customCSS;
      document.head.appendChild(style);
    }
  }

  /**
   * カスタムテーマを作成
   * @param {Object} themeData - テーマデータ
   * @returns {string} 作成されたテーマID
   */
  async createCustomTheme(themeData) {
    try {
      const themeId = themeData.id || `custom-${Date.now()}`;
      
      const customTheme = {
        id: themeId,
        name: themeData.name || 'Custom Theme',
        description: themeData.description || 'User created theme',
        type: 'custom',
        variables: { ...themeData.variables },
        customCSS: themeData.customCSS || '',
        createdAt: Date.now(),
        modifiedAt: Date.now()
      };

      // 検証
      this.#validateTheme(customTheme);

      // 保存
      this.#customThemes.set(themeId, customTheme);
      this.#themes.set(themeId, customTheme);
      
      await this.#saveCustomThemes();

      this.emit('themeCreated', {
        themeId,
        theme: { ...customTheme }
      });

      console.log(`[ThemeService] Custom theme created: ${customTheme.name}`);
      return themeId;

    } catch (error) {
      console.error('[ThemeService] Create custom theme error:', error);
      throw new Error(`Failed to create theme: ${error.message}`);
    }
  }

  /**
   * カスタムテーマを更新
   * @param {string} themeId - テーマID
   * @param {Object} updates - 更新内容
   */
  async updateCustomTheme(themeId, updates) {
    try {
      const theme = this.#customThemes.get(themeId);
      if (!theme) {
        throw new Error(`Custom theme not found: ${themeId}`);
      }

      const updatedTheme = {
        ...theme,
        ...updates,
        modifiedAt: Date.now()
      };

      // 検証
      this.#validateTheme(updatedTheme);

      // 更新
      this.#customThemes.set(themeId, updatedTheme);
      this.#themes.set(themeId, updatedTheme);
      
      await this.#saveCustomThemes();

      // 現在のテーマが更新されたテーマの場合は再適用
      if (this.#currentTheme?.id === themeId) {
        await this.setTheme(themeId);
      }

      this.emit('themeUpdated', {
        themeId,
        theme: { ...updatedTheme }
      });

      console.log(`[ThemeService] Custom theme updated: ${updatedTheme.name}`);

    } catch (error) {
      console.error('[ThemeService] Update custom theme error:', error);
      throw new Error(`Failed to update theme: ${error.message}`);
    }
  }

  /**
   * カスタムテーマを削除
   * @param {string} themeId - テーマID
   */
  async deleteCustomTheme(themeId) {
    try {
      const theme = this.#customThemes.get(themeId);
      if (!theme) {
        throw new Error(`Custom theme not found: ${themeId}`);
      }

      // 現在のテーマが削除対象の場合はデフォルトに変更
      if (this.#currentTheme?.id === themeId) {
        await this.setTheme('light');
      }

      // 削除
      this.#customThemes.delete(themeId);
      this.#themes.delete(themeId);
      
      await this.#saveCustomThemes();

      this.emit('themeDeleted', {
        themeId,
        themeName: theme.name
      });

      console.log(`[ThemeService] Custom theme deleted: ${theme.name}`);

    } catch (error) {
      console.error('[ThemeService] Delete custom theme error:', error);
      throw new Error(`Failed to delete theme: ${error.message}`);
    }
  }

  /**
   * テーマをインポート
   * @param {Object} themeData - インポートするテーマデータ
   * @returns {string} インポートされたテーマID
   */
  async importTheme(themeData) {
    try {
      // バージョン互換性チェック
      if (themeData.version && themeData.version > 1.0) {
        console.warn('[ThemeService] Theme version may not be fully compatible');
      }

      const importedThemeId = await this.createCustomTheme({
        ...themeData,
        id: `imported-${Date.now()}`
      });

      this.emit('themeImported', {
        themeId: importedThemeId,
        originalId: themeData.id
      });

      return importedThemeId;

    } catch (error) {
      console.error('[ThemeService] Import theme error:', error);
      throw new Error(`Failed to import theme: ${error.message}`);
    }
  }

  /**
   * テーマをエクスポート
   * @param {string} themeId - テーマID
   * @returns {Object} エクスポートデータ
   */
  exportTheme(themeId) {
    try {
      const theme = this.#themes.get(themeId);
      if (!theme) {
        throw new Error(`Theme not found: ${themeId}`);
      }

      const exportData = {
        version: 1.0,
        exportedAt: Date.now(),
        ...theme
      };

      this.emit('themeExported', {
        themeId,
        themeName: theme.name
      });

      return exportData;

    } catch (error) {
      console.error('[ThemeService] Export theme error:', error);
      throw new Error(`Failed to export theme: ${error.message}`);
    }
  }

  /**
   * テーマ一覧を取得
   * @param {Object} options - オプション
   * @returns {Object} テーマ一覧
   */
  getThemes(options = {}) {
    const { type = null, includeBuiltIn = true, includeCustom = true } = options;
    
    const themes = {};
    
    for (const [id, theme] of this.#themes) {
      const shouldInclude = (
        (!type || theme.type === type) &&
        ((theme.type === 'built-in' && includeBuiltIn) ||
         (theme.type === 'custom' && includeCustom))
      );

      if (shouldInclude) {
        themes[id] = {
          id: theme.id,
          name: theme.name,
          description: theme.description,
          type: theme.type,
          createdAt: theme.createdAt,
          modifiedAt: theme.modifiedAt
        };
      }
    }

    return themes;
  }

  /**
   * 現在のテーマを取得
   * @returns {Object} 現在のテーマ
   */
  getCurrentTheme() {
    return this.#currentTheme ? { ...this.#currentTheme } : null;
  }

  /**
   * テーマプレビューを生成
   * @param {string} themeId - テーマID
   * @returns {Object} プレビューデータ
   */
  generateThemePreview(themeId) {
    const theme = this.#themes.get(themeId);
    if (!theme) {
      throw new Error(`Theme not found: ${themeId}`);
    }

    return {
      id: themeId,
      name: theme.name,
      colors: {
        primary: theme.variables['--color-primary'],
        background: theme.variables['--bg-primary'],
        text: theme.variables['--text-primary'],
        border: theme.variables['--border-color']
      },
      preview: this.#generatePreviewHTML(theme)
    };
  }

  /**
   * プレビューHTMLを生成
   * @private
   */
  #generatePreviewHTML(theme) {
    const vars = theme.variables;
    return `
      <div style="
        background: ${vars['--bg-primary']};
        color: ${vars['--text-primary']};
        border: 1px solid ${vars['--border-color']};
        border-radius: ${vars['--border-radius']};
        padding: 16px;
        font-family: system-ui;
      ">
        <h3 style="color: ${vars['--color-primary']}; margin: 0 0 8px 0;">
          ${theme.name}
        </h3>
        <p style="color: ${vars['--text-secondary']}; margin: 0;">
          Sample text content
        </p>
      </div>
    `;
  }

  /**
   * テーマを検証
   * @private
   */
  #validateTheme(theme) {
    if (!theme.id || !theme.name) {
      throw new Error('Theme must have id and name');
    }

    if (!theme.variables || typeof theme.variables !== 'object') {
      throw new Error('Theme must have variables object');
    }

    // 必須CSS変数をチェック
    const requiredVars = [
      '--bg-primary',
      '--text-primary',
      '--color-primary'
    ];

    for (const varName of requiredVars) {
      if (!theme.variables[varName]) {
        throw new Error(`Theme missing required variable: ${varName}`);
      }
    }
  }

  /**
   * カスタムテーマを保存
   * @private
   */
  async #saveCustomThemes() {
    try {
      const themesToSave = {};
      
      for (const [id, theme] of this.#customThemes) {
        themesToSave[id] = theme;
      }

      localStorage.setItem('sightEdit_customThemes', JSON.stringify(themesToSave));
      
    } catch (error) {
      console.error('[ThemeService] Save custom themes error:', error);
      throw new Error('Failed to save custom themes');
    }
  }

  /**
   * システム設定に基づく推奨テーマを取得
   * @returns {string} 推奨テーマID
   */
  getRecommendedTheme() {
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      return 'high-contrast';
    }
    
    if (this.#prefersDark) {
      return 'dark';
    }
    
    return 'light';
  }

  /**
   * テーマ適用状況を取得
   * @returns {Object} 適用状況
   */
  getThemeStatus() {
    return {
      current: this.#currentTheme?.id || null,
      systemPreference: this.#prefersDark ? 'dark' : 'light',
      totalThemes: this.#themes.size,
      customThemes: this.#customThemes.size,
      isSystemTheme: this.#currentTheme?.type === 'built-in'
    };
  }

  /**
   * 破棄処理
   */
  destroy() {
    if (this.#mediaQuery) {
      this.#mediaQuery.removeEventListener('change', this.#handleSystemThemeChange);
    }
    
    this.#themes.clear();
    this.#customThemes.clear();
    this.#themeCache.clear();
    this.#currentTheme = null;
    this.#mediaQuery = null;
    
    super.destroy();
  }
}