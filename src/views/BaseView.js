/**
 * BaseView - Base View Component for All UI Elements
 * ES2024対応の基底ビュークラス
 */
import { BaseComponent } from '../core/ComponentFactory.js';

export class BaseView extends BaseComponent {
  #element = null;
  #template = '';
  #data = {};
  #isRendered = false;
  #eventListeners = new Map();

  constructor(config = {}) {
    super(config);
    
    this.#template = config.template || '';
    this.#data = config.data || {};
    
    if (config.element) {
      this.#element = config.element;
    } else if (config.selector) {
      this.#element = document.querySelector(config.selector);
    }
  }

  /**
   * DOM要素を取得
   * @returns {HTMLElement|null} DOM要素
   */
  get element() {
    return this.#element;
  }

  /**
   * DOM要素を設定
   * @param {HTMLElement|string} element - DOM要素またはセレクタ
   */
  set element(element) {
    if (typeof element === 'string') {
      this.#element = document.querySelector(element);
    } else {
      this.#element = element;
    }
  }

  /**
   * テンプレートを取得
   * @returns {string} テンプレート
   */
  get template() {
    return this.#template;
  }

  /**
   * テンプレートを設定
   * @param {string} template - テンプレート
   */
  set template(template) {
    this.#template = template;
    if (this.#isRendered) {
      this.render();
    }
  }

  /**
   * データを取得
   * @returns {Object} データ
   */
  get data() {
    return { ...this.#data };
  }

  /**
   * データを設定
   * @param {Object} data - データ
   */
  set data(data) {
    this.#data = { ...data };
    if (this.#isRendered) {
      this.render();
    }
  }

  /**
   * データの一部を更新
   * @param {string} key - データキー
   * @param {*} value - データ値
   */
  setData(key, value) {
    this.#data[key] = value;
    if (this.#isRendered) {
      this.render();
    }
  }

  /**
   * データを取得
   * @param {string} key - データキー
   * @returns {*} データ値
   */
  getData(key) {
    return this.#data[key];
  }

  /**
   * テンプレートをレンダリング
   * @protected
   * @param {string} template - テンプレート
   * @param {Object} data - データ
   * @returns {string} レンダリング済みHTML
   */
  renderTemplate(template = this.#template, data = this.#data) {
    if (!template) {
      return '';
    }

    // シンプルなテンプレートエンジン
    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const value = this.#getNestedValue(data, key.trim());
      return value !== undefined ? String(value) : '';
    });
  }

  /**
   * ネストされた値を取得
   * @private
   * @param {Object} obj - オブジェクト
   * @param {string} path - パス
   * @returns {*} 値
   */
  #getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * ビューをレンダリング
   * @returns {this} チェーン用
   */
  render() {
    if (!this.#element) {
      console.warn('[BaseView] No element to render to');
      return this;
    }

    const html = this.renderTemplate();
    this.#element.innerHTML = html;
    this.#isRendered = true;

    // レンダリング後処理
    this.afterRender();

    return this;
  }

  /**
   * レンダリング後処理（サブクラスでオーバーライド）
   * @protected
   */
  afterRender() {
    // Override in subclasses
  }

  /**
   * イベントリスナーを追加
   * @param {string} event - イベント名
   * @param {string} selector - セレクタ
   * @param {Function} handler - ハンドラー関数
   * @param {Object} options - オプション
   */
  addEventListener(event, selector, handler, options = {}) {
    if (!this.#element) {
      return;
    }

    const wrappedHandler = (e) => {
      const target = e.target.closest(selector);
      if (target && this.#element.contains(target)) {
        handler.call(this, e, target);
      }
    };

    this.#element.addEventListener(event, wrappedHandler, options);

    // 後で削除するためにリスナーを記録
    const key = `${event}:${selector}`;
    if (!this.#eventListeners.has(key)) {
      this.#eventListeners.set(key, []);
    }
    this.#eventListeners.get(key).push({ handler, wrappedHandler, options });
  }

  /**
   * イベントリスナーを削除
   * @param {string} event - イベント名
   * @param {string} selector - セレクタ
   * @param {Function} handler - ハンドラー関数（省略時は全て削除）
   */
  removeEventListener(event, selector, handler = null) {
    if (!this.#element) {
      return;
    }

    const key = `${event}:${selector}`;
    const listeners = this.#eventListeners.get(key);
    
    if (!listeners) {
      return;
    }

    if (handler) {
      const index = listeners.findIndex(l => l.handler === handler);
      if (index !== -1) {
        const listener = listeners[index];
        this.#element.removeEventListener(event, listener.wrappedHandler, listener.options);
        listeners.splice(index, 1);
      }
    } else {
      // 全てのリスナーを削除
      listeners.forEach(listener => {
        this.#element.removeEventListener(event, listener.wrappedHandler, listener.options);
      });
      listeners.length = 0;
    }

    if (listeners.length === 0) {
      this.#eventListeners.delete(key);
    }
  }

  /**
   * 全てのイベントリスナーを削除
   */
  removeAllEventListeners() {
    for (const [key, listeners] of this.#eventListeners) {
      const [event] = key.split(':');
      listeners.forEach(listener => {
        if (this.#element) {
          this.#element.removeEventListener(event, listener.wrappedHandler, listener.options);
        }
      });
    }
    this.#eventListeners.clear();
  }

  /**
   * 要素を表示
   * @returns {this} チェーン用
   */
  show() {
    if (this.#element) {
      this.#element.style.display = '';
      this.#element.removeAttribute('hidden');
    }
    return this;
  }

  /**
   * 要素を非表示
   * @returns {this} チェーン用
   */
  hide() {
    if (this.#element) {
      this.#element.style.display = 'none';
    }
    return this;
  }

  /**
   * 要素の表示/非表示を切り替え
   * @param {boolean} visible - 表示するかどうか（省略時は切り替え）
   * @returns {this} チェーン用
   */
  toggle(visible = null) {
    if (visible === null) {
      visible = this.#element && this.#element.style.display === 'none';
    }
    
    return visible ? this.show() : this.hide();
  }

  /**
   * 要素が表示されているかチェック
   * @returns {boolean} 表示されているかどうか
   */
  isVisible() {
    return this.#element && this.#element.style.display !== 'none' && !this.#element.hasAttribute('hidden');
  }

  /**
   * CSSクラスを追加
   * @param {string} className - クラス名
   * @returns {this} チェーン用
   */
  addClass(className) {
    if (this.#element) {
      this.#element.classList.add(className);
    }
    return this;
  }

  /**
   * CSSクラスを削除
   * @param {string} className - クラス名
   * @returns {this} チェーン用
   */
  removeClass(className) {
    if (this.#element) {
      this.#element.classList.remove(className);
    }
    return this;
  }

  /**
   * CSSクラスを切り替え
   * @param {string} className - クラス名
   * @param {boolean} force - 強制的に追加/削除するかどうか
   * @returns {this} チェーン用
   */
  toggleClass(className, force = null) {
    if (this.#element) {
      if (force !== null) {
        this.#element.classList.toggle(className, force);
      } else {
        this.#element.classList.toggle(className);
      }
    }
    return this;
  }

  /**
   * CSSクラスが存在するかチェック
   * @param {string} className - クラス名
   * @returns {boolean} クラスが存在するかどうか
   */
  hasClass(className) {
    return this.#element && this.#element.classList.contains(className);
  }

  /**
   * 子要素を検索
   * @param {string} selector - セレクタ
   * @returns {HTMLElement|null} 見つかった要素
   */
  find(selector) {
    return this.#element ? this.#element.querySelector(selector) : null;
  }

  /**
   * 複数の子要素を検索
   * @param {string} selector - セレクタ
   * @returns {NodeList} 見つかった要素のリスト
   */
  findAll(selector) {
    return this.#element ? this.#element.querySelectorAll(selector) : [];
  }

  /**
   * ビューを破棄
   */
  destroy() {
    this.removeAllEventListeners();
    
    if (this.#element && this.#element.parentNode) {
      this.#element.parentNode.removeChild(this.#element);
    }
    
    this.#element = null;
    this.#template = '';
    this.#data = {};
    this.#isRendered = false;
    
    super.destroy();
  }

  /**
   * 初期化（オーバーライド用）
   */
  init() {
    if (this.#element && this.#template) {
      this.render();
    }
  }
}