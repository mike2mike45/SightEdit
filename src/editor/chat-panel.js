/**
 * ChatPanel - AI チャットパネル UI コンポーネント
 *
 * エディター内にチャットインターフェースを表示します。
 */

import { marked } from 'marked';
import DOMPurify from 'dompurify';

export class ChatPanel {
    constructor(chatManager, promptManager, promptLibrary = null, styleController = null, structuredGenerator = null, structuredGenerationModal = null) {
        this.chatManager = chatManager;
        this.promptManager = promptManager;
        this.promptLibrary = promptLibrary;
        this.styleController = styleController;
        this.structuredGenerator = structuredGenerator;
        this.structuredGenerationModal = structuredGenerationModal;
        this.element = null;
        this.isVisible = false;
        this.position = 'right'; // 'right' | 'bottom' | 'floating'
        this.currentStreamingMessageId = null;
    }

    /**
     * プロンプトライブラリを設定
     * @param {PromptLibrary} promptLibrary - プロンプトライブラリインスタンス
     */
    setPromptLibrary(promptLibrary) {
        this.promptLibrary = promptLibrary;

        // プロンプトボタンを表示
        if (this.element) {
            const promptsBtn = this.element.querySelector('#chat-prompts');
            if (promptsBtn) {
                promptsBtn.style.display = 'flex';
            }
        }
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
                    <button class="btn-icon" id="chat-prompts" title="プロンプトライブラリ (Ctrl+P)">
                        <span class="icon">📝</span>
                        <span class="label">プロンプト</span>
                    </button>
                    <button class="btn-icon" id="chat-structured" title="構造化生成">
                        <span class="icon">📋</span>
                        <span class="label">構造化</span>
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

            <div class="style-control">
                <div class="style-header">
                    <label class="style-toggle">
                        <input type="checkbox" id="style-enabled">
                        <span>スタイル制御</span>
                    </label>
                    <button class="btn-link" id="style-settings" title="スタイル設定">
                        <span class="icon">⚙️</span>
                    </button>
                </div>
                <div class="style-summary" id="style-summary">スタイル制御: オフ</div>
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
            const rawHtml = marked.parse(content);

            // DOMPurify でサニタイズ（XSS対策）
            const cleanHtml = DOMPurify.sanitize(rawHtml, {
                ALLOWED_TAGS: [
                    'p', 'br', 'strong', 'em', 'code', 'pre',
                    'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                    'a', 'blockquote', 'table', 'tr', 'td', 'th', 'thead', 'tbody',
                    'img', 'hr', 'del', 'span', 'div'
                ],
                ALLOWED_ATTR: ['href', 'class', 'src', 'alt', 'title', 'target'],
                ALLOW_DATA_ATTR: false
            });

            container.innerHTML = cleanHtml;

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

        // プロンプトライブラリボタン
        const promptsBtn = this.element.querySelector('#chat-prompts');
        promptsBtn.addEventListener('click', () => this.showPromptLibrary());

        // 構造化生成ボタン
        const structuredBtn = this.element.querySelector('#chat-structured');
        if (structuredBtn) {
            structuredBtn.addEventListener('click', () => this.showStructuredGeneration());
        }

        // スタイル制御有効化トグル
        const styleEnabled = this.element.querySelector('#style-enabled');
        if (styleEnabled && this.styleController) {
            styleEnabled.checked = this.styleController.isEnabled();
            styleEnabled.addEventListener('change', async (e) => {
                await this.styleController.setEnabled(e.target.checked);
                this.updateStyleSummary();
            });
        }

        // スタイル設定ボタン
        const styleSettings = this.element.querySelector('#style-settings');
        if (styleSettings) {
            styleSettings.addEventListener('click', () => this.showStyleSettings());
        }

        // テキストエリアで Ctrl+Enter で送信
        const input = this.element.querySelector('#chat-input');
        input.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                this.onSendMessage();
            }
        });

        // スタイルサマリーを初期化
        this.updateStyleSummary();
    }

    /**
     * メッセージ送信時の処理
     */
    async onSendMessage() {
        const input = this.element.querySelector('#chat-input');
        const originalContent = input.value.trim();

        if (!originalContent) {
            return;
        }

        // 入力欄をクリア
        input.value = '';

        // ユーザーメッセージを表示（元のメッセージのみ表示）
        this.addMessage('user', originalContent);

        // スタイル制御が有効な場合、スタイル情報を適用してAIに送信
        let content = originalContent;
        if (this.styleController && this.styleController.isEnabled()) {
            content = this.styleController.applyStyleToPrompt(originalContent);
        }

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
     * プロンプトライブラリを表示
     */
    showPromptLibrary() {
        if (!this.promptLibrary) {
            this.showNotification('プロンプトライブラリが利用できません', 'error');
            return;
        }

        // プロンプト実行のコールバック
        const onExecute = (prompt, template) => {
            console.log('Executing prompt:', template.name);
            console.log('Generated prompt:', prompt);

            // チャット入力欄にプロンプトを設定
            const input = this.element.querySelector('#chat-input');
            if (input) {
                input.value = prompt;
                input.focus();

                // 自動的に送信（オプション）
                // this.onSendMessage();
            }

            this.showNotification(`プロンプト「${template.name}」を適用しました`, 'success');
        };

        // プロンプトライブラリを表示
        this.promptLibrary.show(onExecute);
    }

    /**
     * 構造化生成を表示
     */
    showStructuredGeneration() {
        if (!this.structuredGenerator || !this.structuredGenerationModal) {
            this.showNotification('構造化生成が利用できません', 'error');
            return;
        }

        this.structuredGenerationModal.show();
    }

    /**
     * セッション一覧を表示
     */
    async showSessionList() {
        // 既存のモーダルがあれば削除
        const existingModal = document.getElementById('session-list-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // セッション取得
        const sessions = await this.chatManager.getSessions({
            sortBy: 'updatedAt',
            order: 'desc'
        });

        // モーダルを作成
        const modal = this.createSessionListModal(sessions);
        document.body.appendChild(modal);

        // イベントリスナー設定
        this.setupSessionListEventListeners(modal, sessions);
    }

    /**
     * セッション一覧モーダルのHTML構造を作成
     * @param {Array} sessions - セッション一覧
     * @returns {HTMLElement} モーダル要素
     */
    createSessionListModal(sessions) {
        const modal = document.createElement('div');
        modal.id = 'session-list-modal';
        modal.className = 'session-list-modal';

        modal.innerHTML = `
            <div class="session-list-overlay"></div>
            <div class="session-list-container">
                <div class="session-list-header">
                    <h3>会話履歴</h3>
                    <button class="close-btn" id="session-list-close">×</button>
                </div>

                <div class="session-list-controls">
                    <input
                        type="search"
                        id="session-search"
                        placeholder="セッションを検索..."
                        class="session-search"
                    >
                    <select id="session-filter" class="session-filter">
                        <option value="all">すべて</option>
                        <option value="favorites">お気に入り</option>
                        <option value="today">今日</option>
                        <option value="week">今週</option>
                    </select>
                </div>

                <div class="session-list-items" id="session-list-items">
                    ${this.renderSessionItems(sessions)}
                </div>
            </div>
        `;

        return modal;
    }

    /**
     * セッションアイテムのHTMLをレンダリング
     * @param {Array} sessions - セッション一覧
     * @param {string} filter - フィルタータイプ
     * @param {string} searchQuery - 検索クエリ
     * @returns {string} HTML文字列
     */
    renderSessionItems(sessions, filter = 'all', searchQuery = '') {
        if (!sessions || sessions.length === 0) {
            return '<div class="session-empty">会話履歴がありません</div>';
        }

        // フィルタリング
        let filteredSessions = this.filterSessions(sessions, filter, searchQuery);

        if (filteredSessions.length === 0) {
            return '<div class="session-empty">該当するセッションがありません</div>';
        }

        return filteredSessions.map(session => {
            const date = new Date(session.updatedAt);
            const dateStr = this.formatDate(date);
            const preview = this.getSessionPreview(session);
            const favoriteIcon = session.isFavorite ? '⭐' : '☆';

            return `
                <div class="session-item" data-session-id="${session.id}">
                    <div class="session-item-header">
                        <span class="session-title">${this.escapeHtml(session.title)}</span>
                        <button class="session-favorite" data-session-id="${session.id}" title="お気に入り">
                            ${favoriteIcon}
                        </button>
                    </div>
                    <div class="session-preview">${this.escapeHtml(preview)}</div>
                    <div class="session-meta">
                        <span class="session-date">${dateStr}</span>
                        <span class="session-count">${session.messages.length} メッセージ</span>
                    </div>
                    <div class="session-actions">
                        <button class="session-open" data-session-id="${session.id}">開く</button>
                        <button class="session-delete" data-session-id="${session.id}">削除</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * セッションをフィルタリング
     * @param {Array} sessions - セッション一覧
     * @param {string} filter - フィルタータイプ
     * @param {string} searchQuery - 検索クエリ
     * @returns {Array} フィルタリングされたセッション
     */
    filterSessions(sessions, filter, searchQuery) {
        let filtered = sessions;

        // フィルター適用
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        switch (filter) {
            case 'favorites':
                filtered = filtered.filter(s => s.isFavorite);
                break;
            case 'today':
                filtered = filtered.filter(s => new Date(s.updatedAt) >= today);
                break;
            case 'week':
                filtered = filtered.filter(s => new Date(s.updatedAt) >= weekAgo);
                break;
        }

        // 検索クエリ適用
        if (searchQuery && searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(session => {
                const titleMatch = session.title.toLowerCase().includes(query);
                const messageMatch = session.messages.some(msg =>
                    msg.content.toLowerCase().includes(query)
                );
                return titleMatch || messageMatch;
            });
        }

        return filtered;
    }

    /**
     * セッション一覧モーダルのイベントリスナー設定
     * @param {HTMLElement} modal - モーダル要素
     * @param {Array} sessions - セッション一覧
     */
    setupSessionListEventListeners(modal, sessions) {
        // 閉じるボタン
        const closeBtn = modal.querySelector('#session-list-close');
        const overlay = modal.querySelector('.session-list-overlay');

        closeBtn.addEventListener('click', () => modal.remove());
        overlay.addEventListener('click', () => modal.remove());

        // 検索
        const searchInput = modal.querySelector('#session-search');
        const filterSelect = modal.querySelector('#session-filter');
        const itemsContainer = modal.querySelector('#session-list-items');

        const updateList = () => {
            const filter = filterSelect.value;
            const query = searchInput.value;
            itemsContainer.innerHTML = this.renderSessionItems(sessions, filter, query);

            // 再度イベントリスナーを設定
            this.setupSessionItemListeners(modal, sessions);
        };

        searchInput.addEventListener('input', updateList);
        filterSelect.addEventListener('change', updateList);

        // セッションアイテムのイベントリスナー
        this.setupSessionItemListeners(modal, sessions);
    }

    /**
     * セッションアイテムのイベントリスナー設定
     * @param {HTMLElement} modal - モーダル要素
     * @param {Array} sessions - セッション一覧
     */
    setupSessionItemListeners(modal, sessions) {
        // 開くボタン
        modal.querySelectorAll('.session-open').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const sessionId = e.target.dataset.sessionId;
                await this.loadSession(sessionId);
                modal.remove();
            });
        });

        // お気に入りボタン
        modal.querySelectorAll('.session-favorite').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const sessionId = e.target.dataset.sessionId;
                await this.toggleSessionFavorite(sessionId, sessions);

                // UI更新
                const filter = modal.querySelector('#session-filter').value;
                const query = modal.querySelector('#session-search').value;
                const updatedSessions = await this.chatManager.getSessions({
                    sortBy: 'updatedAt',
                    order: 'desc'
                });
                modal.querySelector('#session-list-items').innerHTML =
                    this.renderSessionItems(updatedSessions, filter, query);
                this.setupSessionItemListeners(modal, updatedSessions);
            });
        });

        // 削除ボタン
        modal.querySelectorAll('.session-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const sessionId = e.target.dataset.sessionId;
                if (confirm('このセッションを削除しますか？')) {
                    await this.deleteSession(sessionId);

                    // UI更新
                    const filter = modal.querySelector('#session-filter').value;
                    const query = modal.querySelector('#session-search').value;
                    const updatedSessions = await this.chatManager.getSessions({
                        sortBy: 'updatedAt',
                        order: 'desc'
                    });
                    modal.querySelector('#session-list-items').innerHTML =
                        this.renderSessionItems(updatedSessions, filter, query);
                    this.setupSessionItemListeners(modal, updatedSessions);
                }
            });
        });
    }

    /**
     * セッションを読み込む
     * @param {string} sessionId - セッションID
     */
    async loadSession(sessionId) {
        try {
            const session = await this.chatManager.chatStorage.getSession(sessionId);
            if (!session) {
                this.showNotification('セッションが見つかりません', 'error');
                return;
            }

            // 現在のセッションを設定
            this.chatManager.currentSession = session;

            // メッセージを表示
            this.clearMessages();
            session.messages.forEach(msg => {
                this.addMessage(msg.role, msg.content);
            });

            // タイトル更新
            this.updateSessionTitle(session.title);

            this.showNotification('セッションを読み込みました', 'success');
        } catch (error) {
            console.error('Failed to load session:', error);
            this.showNotification('セッションの読み込みに失敗しました', 'error');
        }
    }

    /**
     * セッションを削除
     * @param {string} sessionId - セッションID
     */
    async deleteSession(sessionId) {
        try {
            await this.chatManager.chatStorage.deleteSession(sessionId);

            // 現在のセッションと同じ場合はクリア
            if (this.chatManager.currentSession?.id === sessionId) {
                this.chatManager.currentSession = null;
                this.clearMessages();
            }

            this.showNotification('セッションを削除しました', 'success');
        } catch (error) {
            console.error('Failed to delete session:', error);
            this.showNotification('セッションの削除に失敗しました', 'error');
        }
    }

    /**
     * セッションのお気に入りをトグル
     * @param {string} sessionId - セッションID
     * @param {Array} sessions - セッション一覧
     */
    async toggleSessionFavorite(sessionId, sessions) {
        try {
            const session = sessions.find(s => s.id === sessionId);
            if (!session) return;

            session.isFavorite = !session.isFavorite;
            await this.chatManager.chatStorage.saveSession(session);

            this.showNotification(
                session.isFavorite ? 'お気に入りに追加しました' : 'お気に入りから削除しました',
                'success'
            );
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
            this.showNotification('お気に入りの更新に失敗しました', 'error');
        }
    }

    /**
     * セッションのプレビューテキストを取得
     * @param {object} session - セッション
     * @returns {string} プレビューテキスト
     */
    getSessionPreview(session) {
        if (!session.messages || session.messages.length === 0) {
            return 'メッセージなし';
        }

        const firstUserMessage = session.messages.find(m => m.role === 'user');
        if (firstUserMessage) {
            return firstUserMessage.content.substring(0, 100);
        }

        return session.messages[0].content.substring(0, 100);
    }

    /**
     * 日時をフォーマット
     * @param {Date} date - 日時
     * @returns {string} フォーマットされた日時
     */
    formatDate(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'たった今';
        if (minutes < 60) return `${minutes}分前`;
        if (hours < 24) return `${hours}時間前`;
        if (days < 7) return `${days}日前`;

        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    /**
     * HTMLエスケープ
     * @param {string} text - テキスト
     * @returns {string} エスケープされたテキスト
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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

    // ========================================
    // スタイル制御
    // ========================================

    /**
     * スタイル設定ダイアログを表示
     */
    showStyleSettings() {
        if (!this.styleController) {
            this.showNotification('スタイル制御が利用できません', 'error');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'style-settings-modal';

        const definitions = this.styleController.getStyleDefinitions();
        const currentStyle = this.styleController.getStyle();
        const presets = this.styleController.getPresets();

        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-container">
                <div class="modal-header">
                    <h3>スタイル制御設定</h3>
                    <button class="btn-icon close-modal" title="閉じる">×</button>
                </div>
                <div class="modal-content">
                    <!-- プリセット選択 -->
                    <div class="form-section">
                        <label class="form-label">プリセット</label>
                        <select id="style-preset" class="form-control">
                            <option value="">カスタム設定</option>
                            ${presets.map(preset => `
                                <option value="${preset.id}">${preset.name} - ${preset.description}</option>
                            `).join('')}
                        </select>
                    </div>

                    <!-- トーン -->
                    <div class="form-section">
                        <label class="form-label">${definitions.tone.label}</label>
                        <select id="style-tone" class="form-control">
                            ${definitions.tone.options.map(opt => `
                                <option value="${opt.value}" ${currentStyle.tone === opt.value ? 'selected' : ''}>
                                    ${opt.label} - ${opt.description}
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <!-- 長さ -->
                    <div class="form-section">
                        <label class="form-label">${definitions.length.label}</label>
                        <select id="style-length" class="form-control">
                            ${definitions.length.options.map(opt => `
                                <option value="${opt.value}" ${currentStyle.length === opt.value ? 'selected' : ''}>
                                    ${opt.label} - ${opt.description}
                                </option>
                            `).join('')}
                        </select>
                        <input type="number"
                               id="style-custom-length"
                               class="form-control"
                               placeholder="カスタム文字数"
                               value="${currentStyle.customLength || ''}"
                               style="margin-top: 8px; display: ${currentStyle.length === 'custom' ? 'block' : 'none'};">
                    </div>

                    <!-- 対象読者 -->
                    <div class="form-section">
                        <label class="form-label">${definitions.audience.label}</label>
                        <select id="style-audience" class="form-control">
                            ${definitions.audience.options.map(opt => `
                                <option value="${opt.value}" ${currentStyle.audience === opt.value ? 'selected' : ''}>
                                    ${opt.label} - ${opt.description}
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <!-- 言語 -->
                    <div class="form-section">
                        <label class="form-label">${definitions.language.label}</label>
                        <select id="style-language" class="form-control">
                            ${definitions.language.options.map(opt => `
                                <option value="${opt.value}" ${currentStyle.language === opt.value ? 'selected' : ''}>
                                    ${opt.label} - ${opt.description}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary cancel-modal">キャンセル</button>
                    <button class="btn-primary save-style">保存</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // イベントリスナー
        const presetSelect = modal.querySelector('#style-preset');
        const lengthSelect = modal.querySelector('#style-length');
        const customLengthInput = modal.querySelector('#style-custom-length');
        const closeBtn = modal.querySelector('.close-modal');
        const cancelBtn = modal.querySelector('.cancel-modal');
        const saveBtn = modal.querySelector('.save-style');
        const overlay = modal.querySelector('.modal-overlay');

        // プリセット選択
        presetSelect.addEventListener('change', async (e) => {
            if (e.target.value) {
                const preset = presets.find(p => p.id === e.target.value);
                if (preset) {
                    modal.querySelector('#style-tone').value = preset.style.tone;
                    modal.querySelector('#style-length').value = preset.style.length;
                    modal.querySelector('#style-audience').value = preset.style.audience;
                    modal.querySelector('#style-language').value = preset.style.language;
                }
            }
        });

        // 長さ選択時のカスタム入力表示切り替え
        lengthSelect.addEventListener('change', (e) => {
            customLengthInput.style.display = e.target.value === 'custom' ? 'block' : 'none';
        });

        // 閉じる
        const closeModal = () => modal.remove();
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', closeModal);

        // 保存
        saveBtn.addEventListener('click', async () => {
            const newStyle = {
                tone: modal.querySelector('#style-tone').value,
                length: modal.querySelector('#style-length').value,
                audience: modal.querySelector('#style-audience').value,
                language: modal.querySelector('#style-language').value,
                customLength: modal.querySelector('#style-custom-length').value || null
            };

            await this.styleController.setStyle(newStyle);
            this.updateStyleSummary();
            this.showNotification('スタイル設定を保存しました', 'success');
            closeModal();
        });
    }

    /**
     * スタイルサマリーを更新
     */
    updateStyleSummary() {
        if (!this.styleController) {
            return;
        }

        const summaryElement = this.element?.querySelector('#style-summary');
        if (summaryElement) {
            summaryElement.textContent = this.styleController.getStyleSummary();
        }
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
