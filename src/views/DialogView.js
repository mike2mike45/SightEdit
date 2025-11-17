/**
 * DialogView - Unified Dialog System
 * ES2024対応の統一ダイアログシステム
 */
import { BaseView } from './BaseView.js';
import { EVENTS } from '../core/EventBus.js';

export class DialogView extends BaseView {
  #isOpen = false;
  #dialogConfig = {};
  #onConfirm = null;
  #onCancel = null;
  #focusTrap = null;

  constructor(config = {}) {
    super({
      ...config,
      template: config.template || DialogView.getDefaultTemplate()
    });

    this.#dialogConfig = config.dialogConfig || {};
  }

  /**
   * デフォルトテンプレートを取得
   * @static
   * @returns {string} テンプレート
   */
  static getDefaultTemplate() {
    return `
      <div class="dialog-overlay" style="display: none;">
        <div class="dialog-container">
          <div class="dialog-header">
            <h3 class="dialog-title">{{title}}</h3>
            <button type="button" class="dialog-close" aria-label="閉じる">&times;</button>
          </div>
          <div class="dialog-body">
            {{#if message}}
              <p class="dialog-message">{{message}}</p>
            {{/if}}
            {{#if html}}
              <div class="dialog-content">{{{html}}}</div>
            {{/if}}
          </div>
          <div class="dialog-footer">
            {{#if showCancel}}
              <button type="button" class="btn btn-secondary dialog-cancel">{{cancelText}}</button>
            {{/if}}
            {{#if showConfirm}}
              <button type="button" class="btn btn-primary dialog-confirm">{{confirmText}}</button>
            {{/if}}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 初期化
   */
  init() {
    if (!this.element) {
      this.element = document.createElement('div');
      this.element.className = 'dialog-wrapper';
      document.body.appendChild(this.element);
    }
    
    super.init();
    this.#setupEventListeners();
    this.#setupAccessibility();
  }

  /**
   * イベントリスナーをセットアップ
   * @private
   */
  #setupEventListeners() {
    // オーバーレイクリックで閉じる
    this.addEventListener('click', '.dialog-overlay', this.#handleOverlayClick);
    
    // 閉じるボタン
    this.addEventListener('click', '.dialog-close', this.#handleClose);
    
    // 確認ボタン
    this.addEventListener('click', '.dialog-confirm', this.#handleConfirm);
    
    // キャンセルボタン
    this.addEventListener('click', '.dialog-cancel', this.#handleCancel);
    
    // キーボードイベント
    document.addEventListener('keydown', this.#handleKeydown);
  }

  /**
   * アクセシビリティをセットアップ
   * @private
   */
  #setupAccessibility() {
    const overlay = this.find('.dialog-overlay');
    if (overlay) {
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-hidden', 'true');
    }
  }

  /**
   * オーバーレイクリックハンドラー
   * @private
   * @param {Event} e - イベント
   */
  #handleOverlayClick = (e) => {
    if (e.target.classList.contains('dialog-overlay')) {
      if (this.#dialogConfig.closeOnOverlay !== false) {
        this.close(false);
      }
    }
  }

  /**
   * 閉じるボタンハンドラー
   * @private
   */
  #handleClose = () => {
    this.close(false);
  }

  /**
   * 確認ボタンハンドラー
   * @private
   */
  #handleConfirm = () => {
    this.close(true);
  }

  /**
   * キャンセルボタンハンドラー
   * @private
   */
  #handleCancel = () => {
    this.close(false);
  }

  /**
   * キーボードイベントハンドラー
   * @private
   * @param {Event} e - イベント
   */
  #handleKeydown = (e) => {
    if (!this.#isOpen) return;

    switch (e.key) {
      case 'Escape':
        if (this.#dialogConfig.closeOnEscape !== false) {
          e.preventDefault();
          this.close(false);
        }
        break;
        
      case 'Enter':
        if (this.#dialogConfig.confirmOnEnter === true) {
          e.preventDefault();
          this.close(true);
        }
        break;
        
      case 'Tab':
        this.#handleTabKey(e);
        break;
    }
  }

  /**
   * Tabキーハンドリング（フォーカストラップ）
   * @private
   * @param {Event} e - イベント
   */
  #handleTabKey(e) {
    const focusableElements = this.findAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }

  /**
   * ダイアログを開く
   * @param {Object} options - オプション
   * @returns {Promise<boolean>} 確認結果
   */
  open(options = {}) {
    return new Promise((resolve) => {
      // 設定をマージ
      this.#dialogConfig = {
        title: 'ダイアログ',
        message: '',
        html: '',
        confirmText: 'OK',
        cancelText: 'キャンセル',
        showConfirm: true,
        showCancel: false,
        closeOnOverlay: true,
        closeOnEscape: true,
        confirmOnEnter: false,
        ...options
      };

      // コールバックを設定
      this.#onConfirm = () => resolve(true);
      this.#onCancel = () => resolve(false);

      // データを設定してレンダリング
      this.data = this.#dialogConfig;
      this.render();

      // ダイアログを表示
      this.#show();

      // イベント発火
      this.emit(EVENTS.UI_DIALOG_OPEN, {
        type: options.type || 'custom',
        config: this.#dialogConfig
      });
    });
  }

  /**
   * ダイアログを表示
   * @private
   */
  #show() {
    const overlay = this.find('.dialog-overlay');
    if (!overlay) return;

    // 前のフォーカスを記録
    this.#focusTrap = document.activeElement;

    // 表示
    overlay.style.display = 'flex';
    overlay.setAttribute('aria-hidden', 'false');
    this.#isOpen = true;

    // アニメーション
    requestAnimationFrame(() => {
      overlay.classList.add('show');
    });

    // 最初のフォーカス可能要素にフォーカス
    setTimeout(() => {
      const firstFocusable = this.find('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }, 100);

    // body のスクロールを無効化
    document.body.style.overflow = 'hidden';
  }

  /**
   * ダイアログを閉じる
   * @param {boolean} confirmed - 確認されたかどうか
   */
  close(confirmed = false) {
    if (!this.#isOpen) return;

    const overlay = this.find('.dialog-overlay');
    if (!overlay) return;

    // アニメーション
    overlay.classList.remove('show');

    setTimeout(() => {
      overlay.style.display = 'none';
      overlay.setAttribute('aria-hidden', 'true');
      this.#isOpen = false;

      // フォーカスを戻す
      if (this.#focusTrap) {
        this.#focusTrap.focus();
        this.#focusTrap = null;
      }

      // body のスクロールを復元
      document.body.style.overflow = '';

      // コールバック実行
      if (confirmed && this.#onConfirm) {
        this.#onConfirm();
      } else if (!confirmed && this.#onCancel) {
        this.#onCancel();
      }

      // イベント発火
      this.emit(EVENTS.UI_DIALOG_CLOSE, {
        confirmed,
        config: this.#dialogConfig
      });

      // クリーンアップ
      this.#onConfirm = null;
      this.#onCancel = null;
    }, 200);
  }

  /**
   * アラートダイアログを表示
   * @static
   * @param {string} message - メッセージ
   * @param {string} title - タイトル
   * @returns {Promise<boolean>} 結果
   */
  static alert(message, title = 'お知らせ') {
    const dialog = new DialogView();
    dialog.init();

    return dialog.open({
      type: 'alert',
      title,
      message,
      showConfirm: true,
      showCancel: false,
      confirmText: 'OK'
    }).finally(() => {
      dialog.destroy();
    });
  }

  /**
   * 確認ダイアログを表示
   * @static
   * @param {string} message - メッセージ
   * @param {string} title - タイトル
   * @returns {Promise<boolean>} 確認結果
   */
  static confirm(message, title = '確認') {
    const dialog = new DialogView();
    dialog.init();

    return dialog.open({
      type: 'confirm',
      title,
      message,
      showConfirm: true,
      showCancel: true,
      confirmText: 'OK',
      cancelText: 'キャンセル'
    }).finally(() => {
      dialog.destroy();
    });
  }

  /**
   * カスタムダイアログを表示
   * @static
   * @param {Object} options - オプション
   * @returns {Promise<boolean>} 結果
   */
  static custom(options) {
    const dialog = new DialogView();
    dialog.init();

    return dialog.open({
      type: 'custom',
      ...options
    }).finally(() => {
      dialog.destroy();
    });
  }

  /**
   * プロンプトダイアログを表示
   * @static
   * @param {string} message - メッセージ
   * @param {string} defaultValue - デフォルト値
   * @param {string} title - タイトル
   * @returns {Promise<string|null>} 入力値またはnull
   */
  static prompt(message, defaultValue = '', title = '入力') {
    const inputId = 'prompt-input-' + Date.now();
    const html = `
      <p class="dialog-message">${message}</p>
      <input type="text" id="${inputId}" class="form-control" value="${defaultValue}" style="margin-top: 10px;">
    `;

    const dialog = new DialogView();
    dialog.init();

    return dialog.open({
      type: 'prompt',
      title,
      html,
      showConfirm: true,
      showCancel: true,
      confirmText: 'OK',
      cancelText: 'キャンセル',
      confirmOnEnter: true
    }).then(confirmed => {
      if (confirmed) {
        const input = dialog.find(`#${inputId}`);
        return input ? input.value : null;
      }
      return null;
    }).finally(() => {
      dialog.destroy();
    });
  }

  /**
   * 破棄処理
   */
  destroy() {
    document.removeEventListener('keydown', this.#handleKeydown);
    
    if (this.#isOpen) {
      this.close(false);
    }
    
    // body のスクロールを復元
    document.body.style.overflow = '';
    
    this.#dialogConfig = {};
    this.#onConfirm = null;
    this.#onCancel = null;
    this.#focusTrap = null;
    
    super.destroy();
  }
}

/**
 * グローバル関数として提供
 */
export const dialog = {
  alert: DialogView.alert,
  confirm: DialogView.confirm,
  prompt: DialogView.prompt,
  custom: DialogView.custom
};