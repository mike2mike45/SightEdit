/**
 * ChatPanel - AI チャットパネル UI コンポーネント
 *
 * エディター内にチャットインターフェースを表示します。
 */

import { marked } from 'marked';

export class ChatPanel {
    constructor(chatManager, promptManager) {
        this.chatManager = chatManager;
        this.promptManager = promptManager;
        this.element = null;
        this.isVisible = false;
        this.position = 'right'; // 'right' | 'bottom' | 'floating'
        this.currentStreamingMessageId = null;
    }

    // ========================================
    // UI 初期化
    // ========================================

    /**
     * チャットパネルをレンダリング
     */
    render() {
        if (this.element) {
            return; // 既にレンダリング済み
        }

        // HTML構造を生成
        this.element = document.createElement('div');
        this.element.className = 'chat-panel';
        this.element.setAttribute('data-position', this.position);
        this.element.style.display = 'none'; // 初期は非表示

        this.element.innerHTML = `
            <div class="chat-panel-header">
                <div class="header-left">
                    <button class="btn-icon" id="chat-sessions" title="会話履歴">
                        <span class="icon">📋</span>
                        <span class="label">履歴</span>
                    </button>
                    <button class="btn-icon" id="chat-prompts" title="プロンプトライブラリ" style="display: none;">
                        <span class="icon">📝</span>
                        <span class="label">プロンプト</span>
                    </button>
                </div>
                <div class="header-center">
                    <span class="session-title">AI Chat</span>
                </div>
                <div class="header-right">
                    <button class="btn-icon" id="chat-new" title="新しい会話">
                        <span class="icon">➕</span>
                    </button>
                    <button class="btn-icon" id="chat-settings" title="AI設定">
                        <span class="icon">⚙️</span>
                    </button>
                    <button class="btn-icon" id="chat-minimize" title="最小化">
                        <span class="icon">−</span>
                    </button>
                    <button class="btn-icon" id="chat-close" title="閉じる">
                        <span class="icon">×</span>
                    </button>
                </div>
            </div>

            <div class="context-options">
                <label class="context-option">
                    <input type="radio" name="context" value="none" checked>
                    <span>コンテキストなし</span>
                </label>
                <label class="context-option">
                    <input type="radio" name="context" value="selection">
                    <span>選択範囲</span>
                </label>
                <label class="context-option">
                    <input type="radio" name="context" value="full">
                    <span>ドキュメント全体</span>
                </label>
            </div>

            <div class="chat-messages" id="chat-messages"></div>

            <div class="chat-input-area">
                <textarea
                    id="chat-input"
                    placeholder="メッセージを入力... (Ctrl+Enter で送信)"
                    rows="3"
                ></textarea>
                <div class="input-actions">
                    <button class="btn-secondary" id="chat-clear">クリア</button>
                    <button class="btn-primary" id="chat-send">送信</button>
                </div>
            </div>
        `;

        // DOMに追加
        document.body.appendChild(this.element);

        // CSSを読み込み
        this.loadCSS();

        // イベントリスナーを設定
        this.setupEventListeners();

        console.log('ChatPanel レンダリング完了');
    }

    /**
     * CSSを動的に読み込み
     */
    loadCSS() {
        // CSS がまだ読み込まれていない場合
        if (!document.getElementById('chat-panel-styles')) {
            const link = document.createElement('link');
            link.id = 'chat-panel-styles';
            link.rel = 'stylesheet';
            link.href = 'chat-panel.css'; // webpack でバンドルする場合は調整
            document.head.appendChild(link);
        }
    }

    // ========================================
    // 表示制御
    // ========================================

    /**
     * パネルを表示
     */
    show() {
        if (!this.element) {
            this.render();
        }

        this.element.style.display = 'flex';
        this.isVisible = true;

        // フォーカスを入力欄に
        const input = this.element.querySelector('#chat-input');
        if (input) {
            input.focus();
        }

        console.log('ChatPanel 表示');
    }

    /**
     * パネルを非表示
     */
    hide() {
        if (this.element) {
            this.element.style.display = 'none';
            this.isVisible = false;
        }

        console.log('ChatPanel 非表示');
    }

    /**
     * パネルの表示/非表示を切り替え
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * パネルの位置を変更
     * @param {string} position - 'right' | 'bottom' | 'floating'
     */
    setPosition(position) {
        this.position = position;
        if (this.element) {
            this.element.setAttribute('data-position', position);
        }
    }

    // ========================================
    // メッセージ表示
    // ========================================

    /**
     * メッセージを追加表示
     * @param {string} role - 'user' | 'assistant'
     * @param {string} content - メッセージ内容
     * @param {Object} options - { streaming, messageId }
     * @returns {HTMLElement} メッセージ要素
     */
    addMessage(role, content, options = {}) {
        const messagesContainer = this.element.querySelector('#chat-messages');

        const messageElement = document.createElement('div');
        messageElement.className = `message message-${role}`;

        if (options.messageId) {
            messageElement.setAttribute('data-message-id', options.messageId);
        }

        if (options.streaming) {
            messageElement.classList.add('streaming');
        }

        const time = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
        const roleLabel = role === 'user' ? '👤 あなた' : '🤖 AI';

        messageElement.innerHTML = `
            <div class="message-header">
                <span class="message-role">${roleLabel}</span>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-content markdown-content"></div>
            <div class="message-actions"></div>
        `;

        // メッセージ内容をレンダリング
        const contentElement = messageElement.querySelector('.message-content');
        this.renderMessageContent(content, contentElement, options.streaming);

        // アクションボタンを追加
        if (role === 'assistant' && !options.streaming) {
            this.addMessageActions(messageElement);
        }

        // ストリーミング中のインジケーター
        if (options.streaming) {
            const actionsElement = messageElement.querySelector('.message-actions');
            actionsElement.innerHTML = `
                <button class="btn-icon" data-action="stop">
                    <span class="icon">⏹️</span>
                    <span>停止</span>
                </button>
            `;
        }

        messagesContainer.appendChild(messageElement);
        this.scrollToBottom();

        return messageElement;
    }

    /**
     * メッセージ内容をレンダリング
     * @param {string} content - Markdown コンテンツ
     * @param {HTMLElement} container - コンテナ要素
     * @param {boolean} streaming - ストリーミング中かどうか
     */
    renderMessageContent(content, container, streaming = false) {
        try {
            // Markdown を HTML に変換
            const html = marked.parse(content);
            container.innerHTML = html;

            // ストリーミング中はカーソルを表示
            if (streaming) {
                const cursor = document.createElement('span');
                cursor.className = 'typing-indicator';
                cursor.textContent = '▊';
                container.appendChild(cursor);
            }
        } catch (error) {
            console.error('Markdown レンダリングエラー:', error);
            container.textContent = content;
        }
    }

    /**
     * ストリーミング中のメッセージを更新
     * @param {string} content - 更新されたコンテンツ
     */
    updateStreamingMessage(content) {
        if (!this.currentStreamingMessageId) {
            return;
        }

        const messageElement = this.element.querySelector(
            `.message[data-message-id="${this.currentStreamingMessageId}"]`
        );

        if (messageElement) {
            const contentElement = messageElement.querySelector('.message-content');
            this.renderMessageContent(content, contentElement, true);
            this.scrollToBottom();
        }
    }

    /**
     * ストリーミングを完了してメッセージを確定
     * @param {string} finalContent - 最終コンテンツ
     */
    finalizeStreamingMessage(finalContent) {
        if (!this.currentStreamingMessageId) {
            return;
        }

        const messageElement = this.element.querySelector(
            `.message[data-message-id="${this.currentStreamingMessageId}"]`
        );

        if (messageElement) {
            // streaming クラスを削除
            messageElement.classList.remove('streaming');

            // 最終コンテンツをレンダリング
            const contentElement = messageElement.querySelector('.message-content');
            this.renderMessageContent(finalContent, contentElement, false);

            // アクションボタンを追加
            this.addMessageActions(messageElement);
        }

        this.currentStreamingMessageId = null;
    }

    /**
     * メッセージにアクションボタンを追加
     * @param {HTMLElement} messageElement - メッセージ要素
     */
    addMessageActions(messageElement) {
        const actionsElement = messageElement.querySelector('.message-actions');
        actionsElement.innerHTML = `
            <button class="btn-icon" data-action="copy">
                <span class="icon">📋</span>
                <span>コピー</span>
            </button>
            <button class="btn-icon" data-action="insert">
                <span class="icon">➕</span>
                <span>挿入</span>
            </button>
            <button class="btn-icon" data-action="regenerate">
                <span class="icon">🔄</span>
                <span>再生成</span>
            </button>
        `;

        // アクションボタンのイベントリスナー
        actionsElement.querySelectorAll('[data-action]').forEach(button => {
            button.addEventListener('click', (e) => {
                const action = button.getAttribute('data-action');
                this.handleMessageAction(action, messageElement);
            });
        });
    }

    /**
     * メッセージアクションを処理
     * @param {string} action - アクション種別
     * @param {HTMLElement} messageElement - メッセージ要素
     */
    async handleMessageAction(action, messageElement) {
        const contentElement = messageElement.querySelector('.message-content');
        const content = contentElement.textContent;

        switch (action) {
            case 'copy':
                try {
                    await navigator.clipboard.writeText(content);
                    this.showNotification('コピーしました');
                } catch (error) {
                    console.error('コピーエラー:', error);
                    this.showNotification('コピーに失敗しました', 'error');
                }
                break;

            case 'insert':
                try {
                    if (window.aiManager) {
                        // Markdown として挿入
                        window.aiManager.insertToEditor(content);
                        this.showNotification('エディターに挿入しました');
                    }
                } catch (error) {
                    console.error('挿入エラー:', error);
                    this.showNotification('挿入に失敗しました', 'error');
                }
                break;

            case 'regenerate':
                // 再生成（未実装）
                this.showNotification('再生成機能は未実装です');
                break;

            case 'stop':
                // ストリーミング停止（未実装）
                this.showNotification('停止機能は未実装です');
                break;
        }
    }

    /**
     * 最下部にスクロール
     */
    scrollToBottom() {
        const messagesContainer = this.element.querySelector('#chat-messages');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    /**
     * メッセージをクリア
     */
    clearMessages() {
        const messagesContainer = this.element.querySelector('#chat-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }
    }

    // ========================================
    // イベントハンドラー
    // ========================================

    /**
     * イベントリスナーを設定
     */
    setupEventListeners() {
        // 送信ボタン
        const sendBtn = this.element.querySelector('#chat-send');
        sendBtn.addEventListener('click', () => this.onSendMessage());

        // クリアボタン
        const clearBtn = this.element.querySelector('#chat-clear');
        clearBtn.addEventListener('click', () => this.onClearChat());

        // 閉じるボタン
        const closeBtn = this.element.querySelector('#chat-close');
        closeBtn.addEventListener('click', () => this.hide());

        // 最小化ボタン
        const minimizeBtn = this.element.querySelector('#chat-minimize');
        minimizeBtn.addEventListener('click', () => this.hide());

        // 新しい会話ボタン
        const newBtn = this.element.querySelector('#chat-new');
        newBtn.addEventListener('click', () => this.onNewChat());

        // 履歴ボタン
        const sessionsBtn = this.element.querySelector('#chat-sessions');
        sessionsBtn.addEventListener('click', () => this.showSessionList());

        // AI設定ボタン
        const settingsBtn = this.element.querySelector('#chat-settings');
        settingsBtn.addEventListener('click', () => {
            if (window.aiManager) {
                window.aiManager.showSettings();
            }
        });

        // テキストエリアで Ctrl+Enter で送信
        const input = this.element.querySelector('#chat-input');
        input.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                this.onSendMessage();
            }
        });
    }

    /**
     * メッセージ送信時の処理
     */
    async onSendMessage() {
        const input = this.element.querySelector('#chat-input');
        const content = input.value.trim();

        if (!content) {
            return;
        }

        // 入力欄をクリア
        input.value = '';

        // ユーザーメッセージを表示
        this.addMessage('user', content);

        // コンテキスト設定を取得
        const contextType = this.element.querySelector('input[name="context"]:checked').value;

        // ストリーミングメッセージ用のIDを生成
        this.currentStreamingMessageId = this.generateId();

        // AI メッセージのプレースホルダーを追加
        this.addMessage('assistant', '', {
            streaming: true,
            messageId: this.currentStreamingMessageId
        });

        // チャットマネージャーでメッセージ送信
        let accumulatedContent = '';

        try {
            await this.chatManager.sendMessageWithStreaming(
                content,
                {
                    includeContext: contextType !== 'none',
                    contextType: contextType
                },
                // onChunk
                (chunk) => {
                    accumulatedContent += chunk;
                    this.updateStreamingMessage(accumulatedContent);
                },
                // onComplete
                (fullResponse) => {
                    this.finalizeStreamingMessage(fullResponse);
                    this.updateSessionTitle();
                },
                // onError
                (error) => {
                    this.finalizeStreamingMessage(`エラーが発生しました: ${error.message}`);
                    this.showNotification('エラーが発生しました', 'error');
                }
            );
        } catch (error) {
            console.error('メッセージ送信エラー:', error);
            this.showNotification('メッセージの送信に失敗しました', 'error');
        }
    }

    /**
     * チャットをクリア
     */
    async onClearChat() {
        if (confirm('会話をクリアしますか？')) {
            this.clearMessages();
            this.chatManager.clearCurrentSession();
            this.updateSessionTitle();
        }
    }

    /**
     * 新しい会話を開始
     */
    async onNewChat() {
        if (confirm('新しい会話を開始しますか？現在の会話は保存されます。')) {
            this.clearMessages();
            await this.chatManager.createNewSession();
            this.updateSessionTitle();
        }
    }

    /**
     * セッションタイトルを更新
     */
    updateSessionTitle() {
        const titleElement = this.element.querySelector('.session-title');
        const session = this.chatManager.getCurrentSession();

        if (session) {
            titleElement.textContent = session.title;
        } else {
            titleElement.textContent = 'AI Chat';
        }
    }

    /**
     * セッション一覧を表示（未実装）
     */
    showSessionList() {
        this.showNotification('セッション一覧機能は次のタスクで実装されます');
    }

    // ========================================
    // ユーティリティ
    // ========================================

    /**
     * 通知を表示
     * @param {string} message - メッセージ
     * @param {string} type - 'info' | 'error' | 'success'
     */
    showNotification(message, type = 'info') {
        // 簡易的な通知（後で改善）
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4caf50' : '#2196f3'};
            color: white;
            border-radius: 4px;
            z-index: 10000;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    /**
     * ユニークIDを生成
     * @private
     * @returns {string} UUID
     */
    generateId() {
        return 'msg-' + Math.random().toString(36).substr(2, 9);
    }
}
