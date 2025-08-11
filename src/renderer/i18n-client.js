// レンダラープロセス用の多言語対応クライアント
class I18nClient {
  constructor() {
    this.currentLanguage = 'ja';
    this.translations = {};
    this.fallbackLanguage = 'ja';
    this.initialized = false;
  }

  async init() {
    if (!window.electronAPI) {
      console.warn('ElectronAPI not available, i18n client disabled');
      return;
    }

    try {
      // 現在の言語を取得
      this.currentLanguage = await window.electronAPI.invoke('i18n:getCurrentLanguage');
      
      // 初期化完了
      this.initialized = true;

      // 言語変更イベントを監視
      window.electronAPI.onMenuAction('language-changed', (language) => {
        this.currentLanguage = language;
        this.onLanguageChanged(language);
      });

      console.log('I18nClient initialized, language:', this.currentLanguage);
    } catch (error) {
      console.error('Failed to initialize I18nClient:', error);
    }
  }

  // 翻訳テキストを取得
  async t(key, interpolations = {}) {
    if (!this.initialized || !window.electronAPI) {
      return key;
    }

    try {
      return await window.electronAPI.invoke('i18n:translate', key, interpolations);
    } catch (error) {
      console.error('Translation failed for key:', key, error);
      return key;
    }
  }

  // 同期版翻訳（キャッシュされた翻訳のみ）
  tSync(key, interpolations = {}) {
    if (!this.translations[this.currentLanguage]) {
      return key;
    }

    const keys = key.split('.');
    let translation = this.translations[this.currentLanguage];
    
    for (const k of keys) {
      if (translation && translation[k] !== undefined) {
        translation = translation[k];
      } else {
        return key;
      }
    }

    return this.interpolate(translation, interpolations);
  }

  // プレースホルダー補間
  interpolate(text, interpolations) {
    if (typeof text !== 'string' || !interpolations) {
      return text;
    }
    
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return interpolations[key] !== undefined ? interpolations[key] : match;
    });
  }

  // 言語を設定
  async setLanguage(language) {
    if (!this.initialized || !window.electronAPI) {
      return false;
    }

    try {
      const result = await window.electronAPI.invoke('i18n:setLanguage', language);
      if (result.success) {
        this.currentLanguage = language;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to set language:', error);
      return false;
    }
  }

  getCurrentLanguage() {
    return this.currentLanguage;
  }

  // 利用可能な言語一覧を取得
  async getAvailableLanguages() {
    if (!this.initialized || !window.electronAPI) {
      return ['ja', 'en'];
    }

    try {
      return await window.electronAPI.invoke('i18n:getAvailableLanguages');
    } catch (error) {
      console.error('Failed to get available languages:', error);
      return ['ja', 'en'];
    }
  }

  // 言語変更時のコールバック（オーバーライド可能）
  onLanguageChanged(language) {
    console.log('Language changed to:', language);
    // UIの更新など、必要に応じて処理を追加
    this.updateUI();
  }

  // UI要素を更新（フォールバック実装）
  async updateUI() {
    // data-i18n属性を持つ要素を自動的に更新
    const elements = document.querySelectorAll('[data-i18n]');
    
    for (const element of elements) {
      const key = element.getAttribute('data-i18n');
      if (key) {
        const interpolationData = {};
        
        // data-i18n-*属性から補間データを取得
        Array.from(element.attributes).forEach(attr => {
          if (attr.name.startsWith('data-i18n-')) {
            const paramName = attr.name.replace('data-i18n-', '');
            interpolationData[paramName] = attr.value;
          }
        });
        
        try {
          const translatedText = await this.t(key, interpolationData);
          
          // プレースホルダー属性であれば placeholder を更新
          if (element.getAttribute('data-i18n-target') === 'placeholder') {
            element.placeholder = translatedText;
          } else if (element.getAttribute('data-i18n-target') === 'title') {
            element.title = translatedText;
          } else {
            // デフォルトはテキストコンテンツを更新
            element.textContent = translatedText;
          }
        } catch (error) {
          console.error('Failed to update element with key:', key, error);
        }
      }
    }

    // カスタムUIコンポーネントの更新
    this.updateCustomComponents();
  }

  // カスタムコンポーネントの更新（拡張可能）
  updateCustomComponents() {
    // Git パネルの更新
    if (window.gitPanel) {
      window.gitPanel.updateLanguage?.();
    }

    // エディターのプレースホルダー更新
    this.updateEditorPlaceholder();
    
    // その他のコンポーネント更新
    this.updateStatusBar();
    this.updateDialogs();
  }

  // エディターのプレースホルダー更新
  async updateEditorPlaceholder() {
    try {
      const placeholder = await this.t('editor.placeholder');
      if (window.editor && window.editor.extensionManager) {
        const placeholderExtension = window.editor.extensionManager.extensions.find(
          ext => ext.name === 'placeholder'
        );
        if (placeholderExtension) {
          window.editor.commands.focus();
          // TipTapのプレースホルダーの更新方法は実装によって異なる
          // 必要に応じて実装を調整
        }
      }
    } catch (error) {
      console.error('Failed to update editor placeholder:', error);
    }
  }

  // ステータスバーの更新
  async updateStatusBar() {
    try {
      const statusElement = document.getElementById('file-status');
      if (statusElement) {
        const currentStatus = statusElement.textContent;
        let newStatus;
        
        if (currentStatus === '保存済み' || currentStatus === 'Saved') {
          newStatus = await this.t('status.saved');
        } else if (currentStatus === '編集中' || currentStatus === 'Editing') {
          newStatus = await this.t('status.editing');
        }
        
        if (newStatus) {
          statusElement.textContent = newStatus;
        }
      }

      const fileNameElement = document.getElementById('file-name');
      if (fileNameElement && fileNameElement.textContent === '無題のドキュメント') {
        fileNameElement.textContent = await this.t('status.untitled');
      }
    } catch (error) {
      console.error('Failed to update status bar:', error);
    }
  }

  // ダイアログの更新
  updateDialogs() {
    // 既存のダイアログの文言を更新
    // 実装は必要に応じて追加
  }
}

// グローバルインスタンスを作成
window.i18n = new I18nClient();

export default window.i18n;