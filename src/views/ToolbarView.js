/**
 * ToolbarView - Editor Toolbar Component
 * ES2024対応のツールバービュー
 */
import { BaseView } from './BaseView.js';
import { EVENTS } from '../core/EventBus.js';

export class ToolbarView extends BaseView {
  #buttons = new Map();
  #buttonGroups = new Map();

  constructor(config = {}) {
    super({
      ...config,
      template: config.template || ToolbarView.getDefaultTemplate()
    });

    this.#initializeButtons();
  }

  /**
   * デフォルトテンプレートを取得
   * @static
   * @returns {string} テンプレート
   */
  static getDefaultTemplate() {
    return `
      <div class="toolbar">
        <!-- ファイル操作グループ -->
        <div class="toolbar-group" data-group="file">
          <button type="button" class="toolbar-btn" data-action="new" title="新規ファイル">
            <span class="icon">📄</span>
            <span class="text">新規</span>
          </button>
          <button type="button" class="toolbar-btn" data-action="open" title="ファイルを開く">
            <span class="icon">📂</span>
            <span class="text">開く</span>
          </button>
          <button type="button" class="toolbar-btn" data-action="save" title="保存">
            <span class="icon">💾</span>
            <span class="text">保存</span>
          </button>
          <button type="button" class="toolbar-btn" data-action="saveAs" title="名前を付けて保存">
            <span class="icon">💾</span>
            <span class="text">名前付き保存</span>
          </button>
        </div>

        <!-- 編集グループ -->
        <div class="toolbar-group" data-group="edit">
          <button type="button" class="toolbar-btn" data-action="undo" title="元に戻す" disabled>
            <span class="icon">↶</span>
          </button>
          <button type="button" class="toolbar-btn" data-action="redo" title="やり直し" disabled>
            <span class="icon">↷</span>
          </button>
        </div>

        <!-- フォーマットグループ -->
        <div class="toolbar-group" data-group="format">
          <button type="button" class="toolbar-btn" data-action="bold" title="太字">
            <span class="icon"><strong>B</strong></span>
          </button>
          <button type="button" class="toolbar-btn" data-action="italic" title="斜体">
            <span class="icon"><em>I</em></span>
          </button>
          <button type="button" class="toolbar-btn" data-action="strike" title="取り消し線">
            <span class="icon"><s>S</s></span>
          </button>
          <button type="button" class="toolbar-btn" data-action="code" title="インラインコード">
            <span class="icon">&lt;/&gt;</span>
          </button>
        </div>

        <!-- 見出しグループ -->
        <div class="toolbar-group" data-group="heading">
          <select class="toolbar-select" data-action="heading" title="見出し">
            <option value="">見出し</option>
            <option value="h1">見出し1 (H1)</option>
            <option value="h2">見出し2 (H2)</option>
            <option value="h3">見出し3 (H3)</option>
            <option value="h4">見出し4 (H4)</option>
            <option value="h5">見出し5 (H5)</option>
            <option value="h6">見出し6 (H6)</option>
          </select>
        </div>

        <!-- リストグループ -->
        <div class="toolbar-group" data-group="list">
          <button type="button" class="toolbar-btn" data-action="bulletList" title="箇条書きリスト">
            <span class="icon">• リスト</span>
          </button>
          <button type="button" class="toolbar-btn" data-action="orderedList" title="番号付きリスト">
            <span class="icon">1. リスト</span>
          </button>
          <button type="button" class="toolbar-btn" data-action="blockquote" title="引用">
            <span class="icon">❝ 引用</span>
          </button>
        </div>

        <!-- 挿入グループ -->
        <div class="toolbar-group" data-group="insert">
          <button type="button" class="toolbar-btn" data-action="link" title="リンク">
            <span class="icon">🔗</span>
            <span class="text">リンク</span>
          </button>
          <button type="button" class="toolbar-btn" data-action="image" title="画像">
            <span class="icon">🖼️</span>
            <span class="text">画像</span>
          </button>
          <button type="button" class="toolbar-btn" data-action="table" title="表">
            <span class="icon">📊</span>
            <span class="text">表</span>
          </button>
          <button type="button" class="toolbar-btn" data-action="codeBlock" title="コードブロック">
            <span class="icon">{ }</span>
            <span class="text">コード</span>
          </button>
        </div>

        <!-- ツールグループ -->
        <div class="toolbar-group" data-group="tools">
          <button type="button" class="toolbar-btn" data-action="ai" title="AIアシスタント">
            <span class="icon">🤖</span>
            <span class="text">AI</span>
          </button>
          <button type="button" class="toolbar-btn" data-action="chat" title="AIチャット">
            <span class="icon">💬</span>
            <span class="text">チャット</span>
          </button>
          <button type="button" class="toolbar-btn" data-action="toc" title="目次生成">
            <span class="icon">📋</span>
            <span class="text">目次</span>
          </button>
        </div>

        <!-- エクスポートグループ -->
        <div class="toolbar-group" data-group="export">
          <button type="button" class="toolbar-btn" data-action="export" title="エクスポート">
            <span class="icon">📤</span>
            <span class="text">エクスポート</span>
          </button>
        </div>

        <!-- 設定グループ -->
        <div class="toolbar-group" data-group="settings">
          <button type="button" class="toolbar-btn" data-action="settings" title="設定">
            <span class="icon">⚙️</span>
            <span class="text">設定</span>
          </button>
          <button type="button" class="toolbar-btn" data-action="help" title="ヘルプ">
            <span class="icon">❓</span>
            <span class="text">ヘルプ</span>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * ボタンを初期化
   * @private
   */
  #initializeButtons() {
    // ボタン設定
    const buttonConfigs = [
      // ファイル操作
      { action: 'new', group: 'file', icon: '📄', text: '新規', title: '新規ファイル' },
      { action: 'open', group: 'file', icon: '📂', text: '開く', title: 'ファイルを開く' },
      { action: 'save', group: 'file', icon: '💾', text: '保存', title: '保存' },
      { action: 'saveAs', group: 'file', icon: '💾', text: '名前付き保存', title: '名前を付けて保存' },
      
      // 編集
      { action: 'undo', group: 'edit', icon: '↶', title: '元に戻す', disabled: true },
      { action: 'redo', group: 'edit', icon: '↷', title: 'やり直し', disabled: true },
      
      // フォーマット
      { action: 'bold', group: 'format', icon: 'B', title: '太字' },
      { action: 'italic', group: 'format', icon: 'I', title: '斜体' },
      { action: 'strike', group: 'format', icon: 'S', title: '取り消し線' },
      { action: 'code', group: 'format', icon: '</>', title: 'インラインコード' },
      
      // リスト
      { action: 'bulletList', group: 'list', icon: '•', text: 'リスト', title: '箇条書きリスト' },
      { action: 'orderedList', group: 'list', icon: '1.', text: 'リスト', title: '番号付きリスト' },
      { action: 'blockquote', group: 'list', icon: '❝', text: '引用', title: '引用' },
      
      // 挿入
      { action: 'link', group: 'insert', icon: '🔗', text: 'リンク', title: 'リンク' },
      { action: 'image', group: 'insert', icon: '🖼️', text: '画像', title: '画像' },
      { action: 'table', group: 'insert', icon: '📊', text: '表', title: '表' },
      { action: 'codeBlock', group: 'insert', icon: '{}', text: 'コード', title: 'コードブロック' },
      
      // ツール
      { action: 'ai', group: 'tools', icon: '🤖', text: 'AI', title: 'AIアシスタント' },
      { action: 'chat', group: 'tools', icon: '💬', text: 'チャット', title: 'AIチャット' },
      { action: 'toc', group: 'tools', icon: '📋', text: '目次', title: '目次生成' },
      
      // エクスポート
      { action: 'export', group: 'export', icon: '📤', text: 'エクスポート', title: 'エクスポート' },
      
      // 設定
      { action: 'settings', group: 'settings', icon: '⚙️', text: '設定', title: '設定' },
      { action: 'help', group: 'settings', icon: '❓', text: 'ヘルプ', title: 'ヘルプ' }
    ];

    buttonConfigs.forEach(config => {
      this.#buttons.set(config.action, config);
      
      if (!this.#buttonGroups.has(config.group)) {
        this.#buttonGroups.set(config.group, []);
      }
      this.#buttonGroups.get(config.group).push(config.action);
    });
  }

  /**
   * 初期化
   */
  init() {
    super.init();
    this.#setupEventListeners();
  }

  /**
   * イベントリスナーをセットアップ
   * @private
   */
  #setupEventListeners() {
    // ツールバーボタンのクリック
    this.addEventListener('click', '.toolbar-btn', this.#handleButtonClick);
    
    // セレクト要素の変更
    this.addEventListener('change', '.toolbar-select', this.#handleSelectChange);
    
    // キーボードショートカット
    document.addEventListener('keydown', this.#handleKeydown);
  }

  /**
   * ボタンクリックハンドラー
   * @private
   * @param {Event} e - イベント
   * @param {HTMLElement} button - ボタン要素
   */
  #handleButtonClick = (e, button) => {
    e.preventDefault();
    
    const action = button.dataset.action;
    if (!action) return;

    // ボタンの状態を更新
    button.classList.add('active');
    setTimeout(() => button.classList.remove('active'), 150);

    // アクションイベントを発火
    this.emit(EVENTS.TOOLBAR_ACTION, {
      action,
      button,
      timestamp: Date.now()
    });

    // 具体的なアクションイベントも発火
    this.emit(`toolbar:${action}`, {
      button,
      timestamp: Date.now()
    });
  }

  /**
   * セレクト変更ハンドラー
   * @private
   * @param {Event} e - イベント
   * @param {HTMLElement} select - セレクト要素
   */
  #handleSelectChange = (e, select) => {
    const action = select.dataset.action;
    const value = select.value;
    
    if (!action || !value) return;

    // アクションイベントを発火
    this.emit(EVENTS.TOOLBAR_ACTION, {
      action,
      value,
      select,
      timestamp: Date.now()
    });

    // セレクトを元に戻す
    setTimeout(() => {
      select.value = '';
    }, 100);
  }

  /**
   * キーボードショートカットハンドラー
   * @private
   * @param {Event} e - イベント
   */
  #handleKeydown = (e) => {
    if (!e.ctrlKey && !e.metaKey) return;

    const shortcuts = {
      'n': 'new',
      'o': 'open',
      's': 'save',
      'z': e.shiftKey ? 'redo' : 'undo',
      'y': 'redo',
      'b': 'bold',
      'i': 'italic',
      'u': 'strike',
      'k': 'link',
      'e': 'export',
      ',': 'settings'
    };

    const action = shortcuts[e.key.toLowerCase()];
    if (action) {
      e.preventDefault();
      this.#triggerAction(action);
    }
  }

  /**
   * アクションを実行
   * @private
   * @param {string} action - アクション
   */
  #triggerAction(action) {
    const button = this.find(`[data-action="${action}"]`);
    if (button && !button.disabled) {
      // 視覚的フィードバック
      button.classList.add('active');
      setTimeout(() => button.classList.remove('active'), 150);

      // イベント発火
      this.emit(EVENTS.TOOLBAR_ACTION, {
        action,
        button,
        triggered: 'keyboard',
        timestamp: Date.now()
      });
    }
  }

  /**
   * ボタンの有効/無効を設定
   * @param {string} action - アクション名
   * @param {boolean} enabled - 有効かどうか
   */
  setButtonEnabled(action, enabled) {
    const button = this.find(`[data-action="${action}"]`);
    if (button) {
      button.disabled = !enabled;
      button.classList.toggle('disabled', !enabled);
    }
  }

  /**
   * ボタンの表示/非表示を設定
   * @param {string} action - アクション名
   * @param {boolean} visible - 表示するかどうか
   */
  setButtonVisible(action, visible) {
    const button = this.find(`[data-action="${action}"]`);
    if (button) {
      button.style.display = visible ? '' : 'none';
    }
  }

  /**
   * グループの表示/非表示を設定
   * @param {string} group - グループ名
   * @param {boolean} visible - 表示するかどうか
   */
  setGroupVisible(group, visible) {
    const groupElement = this.find(`[data-group="${group}"]`);
    if (groupElement) {
      groupElement.style.display = visible ? '' : 'none';
    }
  }

  /**
   * ボタンのアクティブ状態を設定
   * @param {string} action - アクション名
   * @param {boolean} active - アクティブかどうか
   */
  setButtonActive(action, active) {
    const button = this.find(`[data-action="${action}"]`);
    if (button) {
      button.classList.toggle('selected', active);
    }
  }

  /**
   * Undo/Redoボタンの状態を更新
   * @param {boolean} canUndo - Undo可能かどうか
   * @param {boolean} canRedo - Redo可能かどうか
   */
  updateUndoRedoState(canUndo, canRedo) {
    this.setButtonEnabled('undo', canUndo);
    this.setButtonEnabled('redo', canRedo);
  }

  /**
   * ツールバーをコンパクトモードに設定
   * @param {boolean} compact - コンパクトモードかどうか
   */
  setCompactMode(compact) {
    this.toggleClass('compact', compact);
    
    // テキストラベルの表示/非表示
    const textElements = this.findAll('.text');
    textElements.forEach(el => {
      el.style.display = compact ? 'none' : '';
    });
  }

  /**
   * カスタムボタンを追加
   * @param {Object} config - ボタン設定
   */
  addButton(config) {
    const { action, group, icon, text, title, position } = config;
    
    if (!action || !group) {
      throw new Error('Action and group are required');
    }

    // ボタン設定を保存
    this.#buttons.set(action, config);
    
    // グループに追加
    if (!this.#buttonGroups.has(group)) {
      this.#buttonGroups.set(group, []);
    }
    this.#buttonGroups.get(group).push(action);

    // DOM要素を作成
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'toolbar-btn';
    button.dataset.action = action;
    button.title = title || '';

    if (icon) {
      const iconEl = document.createElement('span');
      iconEl.className = 'icon';
      iconEl.textContent = icon;
      button.appendChild(iconEl);
    }

    if (text) {
      const textEl = document.createElement('span');
      textEl.className = 'text';
      textEl.textContent = text;
      button.appendChild(textEl);
    }

    // グループに挿入
    const groupElement = this.find(`[data-group="${group}"]`);
    if (groupElement) {
      if (typeof position === 'number') {
        const children = Array.from(groupElement.children);
        if (position < children.length) {
          groupElement.insertBefore(button, children[position]);
        } else {
          groupElement.appendChild(button);
        }
      } else {
        groupElement.appendChild(button);
      }
    }
  }

  /**
   * ボタンを削除
   * @param {string} action - アクション名
   */
  removeButton(action) {
    const button = this.find(`[data-action="${action}"]`);
    if (button && button.parentNode) {
      button.parentNode.removeChild(button);
    }

    this.#buttons.delete(action);

    // グループからも削除
    for (const [group, actions] of this.#buttonGroups) {
      const index = actions.indexOf(action);
      if (index !== -1) {
        actions.splice(index, 1);
        break;
      }
    }
  }

  /**
   * ツールバー設定を取得
   * @returns {Object} 設定
   */
  getConfiguration() {
    return {
      buttons: Object.fromEntries(this.#buttons),
      groups: Object.fromEntries(this.#buttonGroups)
    };
  }

  /**
   * 破棄処理
   */
  destroy() {
    document.removeEventListener('keydown', this.#handleKeydown);
    this.#buttons.clear();
    this.#buttonGroups.clear();
    
    super.destroy();
  }
}