/**
 * StatusBarView - Status Bar Component
 * ES2024対応のステータスバービュー
 */
import { BaseView } from './BaseView.js';
import { EVENTS } from '../core/EventBus.js';

export class StatusBarView extends BaseView {
  #stats = {
    words: 0,
    characters: 0,
    lines: 0,
    charactersNoSpaces: 0
  };
  #status = 'ready';
  #fileName = '';
  #isModified = false;
  #currentMode = 'wysiwyg';
  #notifications = [];

  constructor(config = {}) {
    super({
      ...config,
      template: config.template || StatusBarView.getDefaultTemplate()
    });
  }

  /**
   * デフォルトテンプレートを取得
   * @static
   * @returns {string} テンプレート
   */
  static getDefaultTemplate() {
    return `
      <div class="status-bar">
        <!-- 左側: ファイル情報 -->
        <div class="status-left">
          <span class="file-info">
            <span class="file-name">{{fileName}}</span>
            {{#if isModified}}
              <span class="modified-indicator" title="未保存の変更があります">●</span>
            {{/if}}
          </span>
          <span class="status-text">{{statusText}}</span>
        </div>

        <!-- 中央: 通知エリア -->
        <div class="status-center">
          <div class="notifications">
            {{#each notifications}}
              <div class="notification notification-{{type}}" data-id="{{id}}">
                <span class="notification-icon">{{icon}}</span>
                <span class="notification-text">{{message}}</span>
                <button class="notification-close" data-id="{{id}}">&times;</button>
              </div>
            {{/each}}
          </div>
        </div>

        <!-- 右側: 統計情報とモード -->
        <div class="status-right">
          <div class="document-stats">
            <span class="stat-item" title="文字数（スペース含む）">
              <span class="stat-label">文字:</span>
              <span class="stat-value">{{stats.characters}}</span>
            </span>
            <span class="stat-separator">|</span>
            <span class="stat-item" title="文字数（スペース除く）">
              <span class="stat-label">文字(除空白):</span>
              <span class="stat-value">{{stats.charactersNoSpaces}}</span>
            </span>
            <span class="stat-separator">|</span>
            <span class="stat-item" title="単語数">
              <span class="stat-label">単語:</span>
              <span class="stat-value">{{stats.words}}</span>
            </span>
            <span class="stat-separator">|</span>
            <span class="stat-item" title="行数">
              <span class="stat-label">行:</span>
              <span class="stat-value">{{stats.lines}}</span>
            </span>
          </div>
          
          <div class="mode-indicator">
            <span class="current-mode" title="現在の編集モード">{{modeText}}</span>
          </div>
          
          <div class="connection-status">
            <span class="connection-indicator {{connectionClass}}" title="{{connectionTitle}}">
              {{connectionIcon}}
            </span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 初期化
   */
  init() {
    super.init();
    this.#setupEventListeners();
    this.#updateDisplay();
  }

  /**
   * イベントリスナーをセットアップ
   * @private
   */
  #setupEventListeners() {
    // 通知の閉じるボタン
    this.addEventListener('click', '.notification-close', this.#handleNotificationClose);
    
    // 統計エリアのクリック（詳細表示）
    this.addEventListener('click', '.document-stats', this.#handleStatsClick);
    
    // モードインジケーターのクリック（モード切り替え）
    this.addEventListener('click', '.mode-indicator', this.#handleModeClick);
  }

  /**
   * 通知の閉じるボタンハンドラー
   * @private
   * @param {Event} e - イベント
   * @param {HTMLElement} button - ボタン要素
   */
  #handleNotificationClose = (e, button) => {
    e.stopPropagation();
    const notificationId = button.dataset.id;
    this.removeNotification(notificationId);
  }

  /**
   * 統計クリックハンドラー
   * @private
   */
  #handleStatsClick = () => {
    this.emit('statusBar:statsClick', {
      stats: { ...this.#stats }
    });
  }

  /**
   * モードクリックハンドラー
   * @private
   */
  #handleModeClick = () => {
    this.emit('statusBar:modeClick', {
      currentMode: this.#currentMode
    });
  }

  /**
   * 表示を更新
   * @private
   */
  #updateDisplay() {
    const data = {
      fileName: this.#fileName || '無題',
      isModified: this.#isModified,
      statusText: this.#getStatusText(),
      notifications: this.#notifications,
      stats: this.#stats,
      modeText: this.#getModeText(),
      connectionClass: this.#getConnectionClass(),
      connectionTitle: this.#getConnectionTitle(),
      connectionIcon: this.#getConnectionIcon()
    };

    this.data = data;
    this.render();
  }

  /**
   * ステータステキストを取得
   * @private
   * @returns {string} ステータステキスト
   */
  #getStatusText() {
    switch (this.#status) {
      case 'ready':
        return '準備完了';
      case 'saving':
        return '保存中...';
      case 'loading':
        return '読み込み中...';
      case 'error':
        return 'エラー';
      case 'ai_thinking':
        return 'AI処理中...';
      default:
        return this.#status;
    }
  }

  /**
   * モードテキストを取得
   * @private
   * @returns {string} モードテキスト
   */
  #getModeText() {
    switch (this.#currentMode) {
      case 'wysiwyg':
        return 'WYSIWYG';
      case 'source':
        return 'ソース';
      case 'preview':
        return 'プレビュー';
      default:
        return this.#currentMode;
    }
  }

  /**
   * 接続クラスを取得
   * @private
   * @returns {string} 接続クラス
   */
  #getConnectionClass() {
    // AI接続状態などに応じて変更
    return 'connected';
  }

  /**
   * 接続タイトルを取得
   * @private
   * @returns {string} 接続タイトル
   */
  #getConnectionTitle() {
    return 'オンライン';
  }

  /**
   * 接続アイコンを取得
   * @private
   * @returns {string} 接続アイコン
   */
  #getConnectionIcon() {
    return '🟢';
  }

  /**
   * 統計情報を更新
   * @param {Object} stats - 統計情報
   */
  updateStats(stats) {
    this.#stats = {
      words: stats.words || 0,
      characters: stats.characters || 0,
      lines: stats.lines || 0,
      charactersNoSpaces: stats.charactersNoSpaces || stats.characters || 0,
      ...stats
    };
    this.#updateDisplay();
  }

  /**
   * ファイル情報を更新
   * @param {string} fileName - ファイル名
   * @param {boolean} isModified - 変更されているかどうか
   */
  updateFileInfo(fileName, isModified = false) {
    this.#fileName = fileName;
    this.#isModified = isModified;
    this.#updateDisplay();
  }

  /**
   * ステータスを更新
   * @param {string} status - ステータス
   */
  updateStatus(status) {
    this.#status = status;
    this.#updateDisplay();
  }

  /**
   * モードを更新
   * @param {string} mode - モード
   */
  updateMode(mode) {
    this.#currentMode = mode;
    this.#updateDisplay();
  }

  /**
   * 通知を追加
   * @param {string} message - メッセージ
   * @param {string} type - タイプ ('info', 'success', 'warning', 'error')
   * @param {number} duration - 表示時間（ミリ秒、0で永続）
   * @returns {string} 通知ID
   */
  addNotification(message, type = 'info', duration = 5000) {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const notification = {
      id,
      message,
      type,
      timestamp: Date.now(),
      icon: this.#getNotificationIcon(type)
    };

    this.#notifications.push(notification);
    this.#updateDisplay();

    // 自動削除
    if (duration > 0) {
      setTimeout(() => {
        this.removeNotification(id);
      }, duration);
    }

    this.emit(EVENTS.UI_NOTIFICATION, {
      action: 'add',
      notification
    });

    return id;
  }

  /**
   * 通知を削除
   * @param {string} id - 通知ID
   */
  removeNotification(id) {
    const index = this.#notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      const notification = this.#notifications[index];
      this.#notifications.splice(index, 1);
      this.#updateDisplay();

      this.emit(EVENTS.UI_NOTIFICATION, {
        action: 'remove',
        notification
      });
    }
  }

  /**
   * 全通知をクリア
   */
  clearNotifications() {
    const count = this.#notifications.length;
    this.#notifications = [];
    this.#updateDisplay();

    this.emit(EVENTS.UI_NOTIFICATION, {
      action: 'clear',
      count
    });
  }

  /**
   * 通知アイコンを取得
   * @private
   * @param {string} type - 通知タイプ
   * @returns {string} アイコン
   */
  #getNotificationIcon(type) {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };
    return icons[type] || icons.info;
  }

  /**
   * 一時的なステータスメッセージを表示
   * @param {string} message - メッセージ
   * @param {number} duration - 表示時間（ミリ秒）
   */
  showTemporaryStatus(message, duration = 3000) {
    const originalStatus = this.#status;
    this.#status = message;
    this.#updateDisplay();

    setTimeout(() => {
      this.#status = originalStatus;
      this.#updateDisplay();
    }, duration);
  }

  /**
   * プログレスバーを表示
   * @param {number} progress - 進捗（0-100）
   * @param {string} message - メッセージ
   */
  showProgress(progress, message = '') {
    // 実装はプロジェクトの要件に応じて拡張
    const statusText = message ? `${message} (${Math.round(progress)}%)` : `${Math.round(progress)}%`;
    this.updateStatus(statusText);
  }

  /**
   * プログレスバーを隠す
   */
  hideProgress() {
    this.updateStatus('ready');
  }

  /**
   * 統計情報を計算
   * @param {string} content - コンテンツ
   * @returns {Object} 統計情報
   */
  calculateStats(content) {
    if (!content) {
      return {
        words: 0,
        characters: 0,
        lines: 1,
        charactersNoSpaces: 0
      };
    }

    const lines = content.split('\n').length;
    const characters = content.length;
    const charactersNoSpaces = content.replace(/\s/g, '').length;
    
    // 単語数計算（日本語対応）
    let words = 0;
    const text = content.trim();
    if (text) {
      // 英語の単語
      const englishWords = text.match(/[a-zA-Z]+/g) || [];
      // 日本語の文字（ひらがな、カタカナ、漢字）
      const japaneseChars = text.match(/[ぁ-んァ-ヶー一-龯]/g) || [];
      
      words = englishWords.length + japaneseChars.length;
    }

    return {
      words,
      characters,
      lines,
      charactersNoSpaces
    };
  }

  /**
   * デバッグ情報を取得
   * @returns {Object} デバッグ情報
   */
  getDebugInfo() {
    return {
      stats: { ...this.#stats },
      status: this.#status,
      fileName: this.#fileName,
      isModified: this.#isModified,
      currentMode: this.#currentMode,
      notifications: this.#notifications.length
    };
  }

  /**
   * 破棄処理
   */
  destroy() {
    this.#notifications = [];
    this.#stats = {
      words: 0,
      characters: 0,
      lines: 0,
      charactersNoSpaces: 0
    };
    
    super.destroy();
  }
}