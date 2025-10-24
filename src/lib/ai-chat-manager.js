/**
 * AIChatManager - AI チャット機能の中核管理クラス
 *
 * ChatStorage と AIManager を統合し、チャット機能を提供します。
 */

export class AIChatManager {
    constructor(aiManager, promptManager, chatStorage) {
        this.aiManager = aiManager;
        this.promptManager = promptManager;
        this.chatStorage = chatStorage;
        this.currentSession = null;
        this.isStreaming = false;
    }

    // ========================================
    // セッション管理
    // ========================================

    /**
     * 新しい会話セッションを作成
     * @param {string} title - セッションタイトル（省略時は自動生成）
     * @param {Object} options - オプション { contextType, tags }
     * @returns {Promise<Object>} 作成されたセッション
     */
    async createNewSession(title = null, options = {}) {
        const session = {
            id: this.generateId(),
            title: title || '新しい会話',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messages: [],
            model: this.aiManager.settings.selectedModel,
            provider: this.aiManager.settings.aiProvider,
            tags: options.tags || [],
            isFavorite: false,
            contextType: options.contextType || 'none'
        };

        // IndexedDB に保存
        await this.chatStorage.saveSession(session);

        // 現在のセッションとして設定
        this.currentSession = session;

        console.log('新しいセッション作成:', session.id);
        return session;
    }

    /**
     * 既存のセッションを読み込み
     * @param {string} sessionId - セッションID
     * @returns {Promise<Object>} セッション
     */
    async loadSession(sessionId) {
        const session = await this.chatStorage.getSession(sessionId);

        if (!session) {
            throw new Error(`セッションが見つかりません: ${sessionId}`);
        }

        // メッセージも読み込み
        const messages = await this.chatStorage.getMessages(sessionId);
        session.messages = messages;

        this.currentSession = session;

        console.log('セッション読み込み:', sessionId, `(${messages.length} messages)`);
        return session;
    }

    /**
     * 現在のセッションを保存
     * @returns {Promise<void>}
     */
    async saveSession() {
        if (!this.currentSession) {
            throw new Error('保存するセッションがありません');
        }

        // セッション本体を保存（メッセージは別途保存済み）
        await this.chatStorage.saveSession(this.currentSession);

        console.log('セッション保存:', this.currentSession.id);
    }

    /**
     * セッションを削除
     * @param {string} sessionId - セッションID
     * @returns {Promise<void>}
     */
    async deleteSession(sessionId) {
        await this.chatStorage.deleteSession(sessionId);

        // 現在のセッションを削除した場合はクリア
        if (this.currentSession && this.currentSession.id === sessionId) {
            this.currentSession = null;
        }

        console.log('セッション削除:', sessionId);
    }

    /**
     * セッションのタイトルを更新
     * @param {string} sessionId - セッションID
     * @param {string} title - 新しいタイトル
     * @returns {Promise<void>}
     */
    async updateSessionTitle(sessionId, title) {
        await this.chatStorage.updateSession(sessionId, { title });

        if (this.currentSession && this.currentSession.id === sessionId) {
            this.currentSession.title = title;
        }

        console.log('セッションタイトル更新:', sessionId, title);
    }

    /**
     * セッションをお気に入りに設定/解除
     * @param {string} sessionId - セッションID
     * @param {boolean} isFavorite - お気に入りフラグ
     * @returns {Promise<void>}
     */
    async toggleFavorite(sessionId, isFavorite) {
        await this.chatStorage.updateSession(sessionId, { isFavorite });

        if (this.currentSession && this.currentSession.id === sessionId) {
            this.currentSession.isFavorite = isFavorite;
        }

        console.log('お気に入り設定:', sessionId, isFavorite);
    }

    // ========================================
    // メッセージ送信
    // ========================================

    /**
     * メッセージを送信（ストリーミング）
     * @param {string} content - メッセージ内容
     * @param {Object} options - オプション { includeContext, contextType }
     * @param {Function} onChunk - チャンク受信コールバック
     * @param {Function} onComplete - 完了コールバック
     * @param {Function} onError - エラーコールバック
     * @returns {Promise<void>}
     */
    async sendMessageWithStreaming(content, options, onChunk, onComplete, onError) {
        // セッションがなければ作成
        if (!this.currentSession) {
            await this.createNewSession();
        }

        // ストリーミング中フラグ
        this.isStreaming = true;

        try {
            // ユーザーメッセージを追加
            const userMessage = this.aiManager.createMessage('user', content);
            await this.chatStorage.addMessage(this.currentSession.id, userMessage);
            this.currentSession.messages.push(userMessage);

            // タイトルが「新しい会話」なら最初のメッセージから生成
            if (this.currentSession.title === '新しい会話' && this.currentSession.messages.length === 1) {
                const autoTitle = this.generateTitleFromMessage(content);
                await this.updateSessionTitle(this.currentSession.id, autoTitle);
            }

            // コンテキストを取得（オプション）
            let contextContent = '';
            if (options.includeContext) {
                contextContent = this.getEditorContext(options.contextType || 'full');
            }

            // API送信用のメッセージ配列を構築
            const messages = this.buildMessagesForAPI(content, contextContent);

            // トークン制限を適用
            const managedMessages = this.aiManager.manageTokenLimit(messages);

            // AI応答を一時保存する変数
            let fullResponse = '';

            // ストリーミングで送信
            await this.aiManager.callAIWithStreaming(
                managedMessages,
                // onChunk: チャンク受信時
                (chunk) => {
                    fullResponse += chunk;
                    onChunk(chunk);
                },
                // onComplete: 完了時
                async (completeResponse) => {
                    fullResponse = completeResponse || fullResponse;

                    // AI応答をメッセージとして保存
                    const assistantMessage = this.aiManager.createMessage('assistant', fullResponse);
                    await this.chatStorage.addMessage(this.currentSession.id, assistantMessage);
                    this.currentSession.messages.push(assistantMessage);

                    // セッション保存
                    await this.saveSession();

                    this.isStreaming = false;
                    onComplete(fullResponse);
                },
                // onError: エラー時
                (error) => {
                    this.isStreaming = false;
                    onError(error);
                }
            );

        } catch (error) {
            this.isStreaming = false;
            console.error('メッセージ送信エラー:', error);
            onError(error);
        }
    }

    /**
     * メッセージを送信（非ストリーミング、既存AI機能用）
     * @param {string} content - メッセージ内容
     * @param {Object} options - オプション
     * @returns {Promise<string>} AI応答
     */
    async sendMessage(content, options = {}) {
        return new Promise((resolve, reject) => {
            let fullResponse = '';

            this.sendMessageWithStreaming(
                content,
                options,
                (chunk) => {
                    fullResponse += chunk;
                },
                (response) => {
                    resolve(response);
                },
                (error) => {
                    reject(error);
                }
            );
        });
    }

    // ========================================
    // コンテキスト管理
    // ========================================

    /**
     * エディターの内容をコンテキストとして取得
     * @param {string} type - 'full' | 'selection' | 'none'
     * @returns {string} コンテキスト内容
     */
    getEditorContext(type = 'full') {
        if (type === 'none') {
            return '';
        }

        // エディターマネージャーが存在するか確認
        if (typeof window === 'undefined' || !window.editorManager) {
            console.warn('エディターマネージャーが見つかりません');
            return '';
        }

        const editor = window.editorManager.editor;
        if (!editor) {
            return '';
        }

        try {
            if (type === 'selection') {
                // 選択範囲のテキストを取得
                const { from, to } = editor.state.selection;
                const selectedText = editor.state.doc.textBetween(from, to, ' ');
                return selectedText || '';
            } else if (type === 'full') {
                // ドキュメント全体を取得
                const fullText = editor.state.doc.textContent;
                return fullText || '';
            }
        } catch (error) {
            console.error('コンテキスト取得エラー:', error);
            return '';
        }

        return '';
    }

    /**
     * API送信用のメッセージ配列を構築
     * @private
     * @param {string} userContent - ユーザーメッセージ
     * @param {string} contextContent - コンテキスト（オプション）
     * @returns {Array} メッセージ配列
     */
    buildMessagesForAPI(userContent, contextContent = '') {
        const messages = [];

        // 過去のメッセージを含める（現在のセッションから）
        if (this.currentSession && this.currentSession.messages.length > 0) {
            // 最後の数メッセージを含める（トークン制限考慮）
            const recentMessages = this.currentSession.messages.slice(-10);
            for (const msg of recentMessages) {
                messages.push({
                    role: msg.role,
                    content: msg.content
                });
            }
        }

        // 新しいユーザーメッセージを追加
        let finalUserContent = userContent;

        // コンテキストがあれば追加
        if (contextContent) {
            finalUserContent = `[コンテキスト]\n${contextContent}\n\n[ユーザーの質問]\n${userContent}`;
        }

        messages.push({
            role: 'user',
            content: finalUserContent
        });

        return messages;
    }

    /**
     * メッセージからタイトルを生成
     * @private
     * @param {string} message - メッセージ内容
     * @returns {string} タイトル
     */
    generateTitleFromMessage(message) {
        // 最初の30文字を使用
        let title = message.substring(0, 30);

        // 改行があれば最初の行のみ
        const firstLine = message.split('\n')[0];
        if (firstLine.length < title.length) {
            title = firstLine;
        }

        // 30文字を超える場合は省略記号を追加
        if (message.length > 30) {
            title += '...';
        }

        return title;
    }

    // ========================================
    // 履歴管理
    // ========================================

    /**
     * すべてのセッションを取得
     * @param {Object} options - オプション { limit, offset, sortBy, order }
     * @returns {Promise<Array>} セッション配列
     */
    async getSessions(options = {}) {
        return await this.chatStorage.getAllSessions(options);
    }

    /**
     * セッションを検索
     * @param {string} query - 検索クエリ
     * @returns {Promise<Array>} 検索結果
     */
    async searchSessions(query) {
        return await this.chatStorage.searchSessions(query);
    }

    /**
     * お気に入りセッションを取得
     * @returns {Promise<Array>} お気に入りセッション配列
     */
    async getFavoriteSessions() {
        return await this.chatStorage.getFavoriteSessions();
    }

    /**
     * 今日のセッションを取得
     * @returns {Promise<Array>} 今日のセッション配列
     */
    async getTodaySessions() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = today.getTime();

        const allSessions = await this.getSessions({ limit: 1000 });
        return allSessions.filter(session => session.createdAt >= todayTimestamp);
    }

    /**
     * 今週のセッションを取得
     * @returns {Promise<Array>} 今週のセッション配列
     */
    async getThisWeekSessions() {
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

        const allSessions = await this.getSessions({ limit: 1000 });
        return allSessions.filter(session => session.createdAt >= weekAgo);
    }

    /**
     * セッションをエクスポート
     * @param {string} sessionId - セッションID
     * @param {string} format - 形式 ('json' | 'markdown')
     * @returns {Promise<string>} エクスポートデータ
     */
    async exportSession(sessionId, format = 'json') {
        return await this.chatStorage.exportSession(sessionId, format);
    }

    // ========================================
    // ユーティリティ
    // ========================================

    /**
     * 現在のセッションを取得
     * @returns {Object|null} 現在のセッション
     */
    getCurrentSession() {
        return this.currentSession;
    }

    /**
     * 現在ストリーミング中かどうか
     * @returns {boolean}
     */
    getIsStreaming() {
        return this.isStreaming;
    }

    /**
     * 現在のセッションをクリア（新規会話を開始）
     */
    clearCurrentSession() {
        this.currentSession = null;
        console.log('現在のセッションをクリア');
    }

    /**
     * 統計情報を取得
     * @returns {Promise<Object>} 統計データ
     */
    async getStatistics() {
        const allSessions = await this.getSessions({ limit: 10000 });

        const totalSessions = allSessions.length;
        const totalMessages = allSessions.reduce((sum, session) => {
            return sum + (session.messages ? session.messages.length : 0);
        }, 0);
        const favoriteSessions = allSessions.filter(s => s.isFavorite).length;

        // プロバイダー別の集計
        const byProvider = {};
        allSessions.forEach(session => {
            byProvider[session.provider] = (byProvider[session.provider] || 0) + 1;
        });

        return {
            totalSessions,
            totalMessages,
            favoriteSessions,
            byProvider,
            storageSize: await this.chatStorage.getStorageSize()
        };
    }

    /**
     * ユニークIDを生成
     * @private
     * @returns {string} UUID
     */
    generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * ストレージのクリーンアップ
     * @param {number} maxSessions - 保持する最大セッション数
     * @returns {Promise<number>} 削除したセッション数
     */
    async cleanup(maxSessions = 100) {
        return await this.chatStorage.cleanup(maxSessions);
    }

    /**
     * メモリ最適化を実行
     * @returns {Promise<Object>} 最適化結果
     */
    async optimizeMemory() {
        try {
            const result = await this.chatStorage.optimizeMemory();
            console.log('メモリ最適化完了:', result);
            return result;
        } catch (error) {
            console.error('メモリ最適化エラー:', error);
            throw error;
        }
    }

    /**
     * 古いセッションをアーカイブ
     * @param {number} maxSessions - 保持する最大セッション数
     * @returns {Promise<Object>} アーカイブ結果
     */
    async archiveOldSessions(maxSessions = 100) {
        try {
            const result = await this.chatStorage.archiveOldSessions(maxSessions);
            console.log('セッションアーカイブ完了:', result);
            return result;
        } catch (error) {
            console.error('セッションアーカイブエラー:', error);
            throw error;
        }
    }

    /**
     * パフォーマンス統計を取得
     * @returns {Object} 統計情報
     */
    getPerformanceStats() {
        return {
            currentSession: this.currentSession?.id || null,
            isStreaming: this.isStreaming,
            storageStats: this.chatStorage.performanceOptimizer.getStats()
        };
    }
}
