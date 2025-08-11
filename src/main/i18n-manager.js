import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class I18nManager {
  constructor() {
    this.currentLanguage = 'ja';
    this.translations = {};
    this.fallbackLanguage = 'ja';
    this.availableLanguages = ['ja', 'en'];
  }

  async init() {
    // 利用可能な言語ファイルを読み込み
    for (const lang of this.availableLanguages) {
      try {
        const langPath = path.join(__dirname, '../i18n', `${lang}.json`);
        const data = await fs.readFile(langPath, 'utf8');
        this.translations[lang] = JSON.parse(data);
      } catch (error) {
        console.error(`Failed to load language file ${lang}:`, error.message || error);
        if (lang === this.fallbackLanguage) {
          // フォールバック言語が読み込めない場合はデフォルト値を使用
          this.translations[lang] = {};
        }
      }
    }
  }

  setLanguage(language) {
    if (this.availableLanguages.includes(language)) {
      this.currentLanguage = language;
      return true;
    }
    return false;
  }

  getCurrentLanguage() {
    return this.currentLanguage;
  }

  getAvailableLanguages() {
    return this.availableLanguages;
  }

  // キーによる翻訳テキストの取得
  t(key, interpolations = {}) {
    const translation = this.getTranslation(key);
    return this.interpolate(translation, interpolations);
  }

  getTranslation(key) {
    const keys = key.split('.');
    let translation = this.translations[this.currentLanguage];
    
    // 現在の言語での翻訳を探す
    for (const k of keys) {
      if (translation && translation[k] !== undefined) {
        translation = translation[k];
      } else {
        translation = undefined;
        break;
      }
    }
    
    // 翻訳が見つからない場合はフォールバック言語を試す
    if (translation === undefined && this.currentLanguage !== this.fallbackLanguage) {
      let fallbackTranslation = this.translations[this.fallbackLanguage];
      for (const k of keys) {
        if (fallbackTranslation && fallbackTranslation[k] !== undefined) {
          fallbackTranslation = fallbackTranslation[k];
        } else {
          fallbackTranslation = undefined;
          break;
        }
      }
      translation = fallbackTranslation;
    }
    
    // それでも見つからない場合はキー自体を返す
    return translation !== undefined ? translation : key;
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

  // 複数形対応
  plural(key, count, interpolations = {}) {
    const pluralKey = count === 1 ? `${key}.singular` : `${key}.plural`;
    return this.t(pluralKey, { ...interpolations, count });
  }
}

export default I18nManager;