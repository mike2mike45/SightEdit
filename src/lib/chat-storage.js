/**
 * ChatStorage - IndexedDB を使用した会話履歴管理
 *
 * SightEdit の AI チャット機能の会話履歴を永続化します。
 * Chrome Storage の容量制限を回避するため IndexedDB を使用。
 */

import { getPerformanceOptimizer } from './performance-optimizer.js';

export class ChatStorage {
    constructor() {
        this.dbName = 'SightEditChatDB';
        this.dbVersion = 1;
        this.db = null;
        this.performanceOptimizer = getPerformanceOptimizer();
    }

    /**
     * IndexedDB を初期化
     * @returns {Promise<IDBDatabase>}
     */
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('IndexedDB 初期化エラー:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB 初期化成功');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // sessions オブジェクトストア
                if (!db.objectStoreNames.contains('sessions')) {
                    const sessionsStore = db.createObjectStore('sessions', { keyPath: 'id' });
                    sessionsStore.createIndex('createdAt', 'createdAt', { unique: false });
                    sessionsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                    sessionsStore.createIndex('title', 'title', { unique: false });
                    sessionsStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
                    sessionsStore.createIndex('isFavorite', 'isFavorite', { unique: false });
                }

                // messages オブジェクトストア
                if (!db.objectStoreNames.contains('messages')) {
                    const messagesStore = db.createObjectStore('messages', { keyPath: 'id' });
                    messagesStore.createIndex('sessionId', 'sessionId', { unique: false });
                    messagesStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // promptTemplates オブジェクトストア
                if (!db.objectStoreNames.contains('promptTemplates')) {
                    const templatesStore = db.createObjectStore('promptTemplates', { keyPath: 'id' });
                    templatesStore.createIndex('category', 'category', { unique: false });
                    templatesStore.createIndex('lastUsed', 'lastUsed', { unique: false });
                    templatesStore.createIndex('usageCount', 'usageCount', { unique: false });
                    templatesStore.createIndex('isFavorite', 'isFavorite', { unique: false });
                }

                console.log('IndexedDB スキーマ作成完了');
            };
        });
    }

    /**
     * データベース接続を確認、必要に応じて再接続
     * @private
     */
    async ensureDB() {
        if (!this.db) {
            await this.initDB();
        }
    }

    // ========================================
    // セッション操作
    // ========================================

    /**
     * セッションを保存
     * @param {Object} session - セッションオブジェクト
     * @returns {Promise<string>} セッションID
     */
    async saveSession(session) {
        await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sessions'], 'readwrite');
            const store = transaction.objectStore('sessions');

            // デフォルト値の設定
            const sessionData = {
                id: session.id || this.generateId(),
                title: session.title || '新しい会話',
                createdAt: session.createdAt || Date.now(),
                updatedAt: Date.now(),
                messages: session.messages || [],
                model: session.model || '',
                provider: session.provider || '',
                tags: session.tags || [],
                isFavorite: session.isFavorite || false,
                contextType: session.contextType || 'none'
            };

            const request = store.put(sessionData);

            request.onsuccess = () => {
                resolve(sessionData.id);
            };

            request.onerror = () => {
                console.error('セッション保存エラー:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * セッションを取得
     * @param {string} sessionId - セッションID
     * @returns {Promise<Object|null>} セッションオブジェクト
     */
    async getSession(sessionId) {
        await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sessions'], 'readonly');
            const store = transaction.objectStore('sessions');
            const request = store.get(sessionId);

            request.onsuccess = () => {
                resolve(request.result || null);
            };

            request.onerror = () => {
                console.error('セッション取得エラー:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * すべてのセッションを取得
     * @param {Object} options - オプション { limit, offset, sortBy, order }
     * @returns {Promise<Array>} セッション配列
     */
    async getAllSessions(options = {}) {
        await this.ensureDB();

        const {
            limit = 100,
            offset = 0,
            sortBy = 'updatedAt',
            order = 'desc'
        } = options;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sessions'], 'readonly');
            const store = transaction.objectStore('sessions');

            // インデックスを使用してソート
            let request;
            if (store.indexNames.contains(sortBy)) {
                const index = store.index(sortBy);
                request = index.openCursor(null, order === 'desc' ? 'prev' : 'next');
            } else {
                request = store.openCursor();
            }

            const sessions = [];
            let count = 0;

            request.onsuccess = (event) => {
                const cursor = event.target.result;

                if (cursor) {
                    // オフセット処理
                    if (count >= offset && sessions.length < limit) {
                        sessions.push(cursor.value);
                    }
                    count++;
                    cursor.continue();
                } else {
                    resolve(sessions);
                }
            };

            request.onerror = () => {
                console.error('セッション一覧取得エラー:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * セッションを更新
     * @param {string} sessionId - セッションID
     * @param {Object} updates - 更新データ
     * @returns {Promise<void>}
     */
    async updateSession(sessionId, updates) {
        await this.ensureDB();

        const session = await this.getSession(sessionId);
        if (!session) {
            throw new Error(`セッションが見つかりません: ${sessionId}`);
        }

        const updatedSession = {
            ...session,
            ...updates,
            updatedAt: Date.now()
        };

        return this.saveSession(updatedSession);
    }

    /**
     * セッションを削除
     * @param {string} sessionId - セッションID
     * @returns {Promise<void>}
     */
    async deleteSession(sessionId) {
        await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sessions', 'messages'], 'readwrite');

            // セッションを削除
            const sessionsStore = transaction.objectStore('sessions');
            const deleteSessionRequest = sessionsStore.delete(sessionId);

            deleteSessionRequest.onerror = () => {
                console.error('セッション削除エラー:', deleteSessionRequest.error);
                reject(deleteSessionRequest.error);
            };

            // 関連するメッセージも削除
            const messagesStore = transaction.objectStore('messages');
            const index = messagesStore.index('sessionId');
            const messagesRequest = index.openCursor(IDBKeyRange.only(sessionId));

            messagesRequest.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };

            transaction.oncomplete = () => {
                resolve();
            };

            transaction.onerror = () => {
                console.error('削除トランザクションエラー:', transaction.error);
                reject(transaction.error);
            };
        });
    }

    // ========================================
    // メッセージ操作
    // ========================================

    /**
     * メッセージを追加
     * @param {string} sessionId - セッションID
     * @param {Object} message - メッセージオブジェクト
     * @returns {Promise<string>} メッセージID
     */
    async addMessage(sessionId, message) {
        await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['messages', 'sessions'], 'readwrite');

            // メッセージを保存
            const messagesStore = transaction.objectStore('messages');
            const messageData = {
                id: message.id || this.generateId(),
                sessionId: sessionId,
                role: message.role,
                content: message.content,
                timestamp: message.timestamp || Date.now(),
                metadata: message.metadata || {}
            };

            const addMessageRequest = messagesStore.add(messageData);

            addMessageRequest.onerror = () => {
                console.error('メッセージ追加エラー:', addMessageRequest.error);
                reject(addMessageRequest.error);
            };

            // セッションの updatedAt を更新
            const sessionsStore = transaction.objectStore('sessions');
            const getSessionRequest = sessionsStore.get(sessionId);

            getSessionRequest.onsuccess = () => {
                const session = getSessionRequest.result;
                if (session) {
                    session.updatedAt = Date.now();
                    sessionsStore.put(session);
                }
            };

            transaction.oncomplete = () => {
                resolve(messageData.id);
            };

            transaction.onerror = () => {
                console.error('メッセージ追加トランザクションエラー:', transaction.error);
                reject(transaction.error);
            };
        });
    }

    /**
     * セッションのメッセージを取得
     * @param {string} sessionId - セッションID
     * @returns {Promise<Array>} メッセージ配列
     */
    async getMessages(sessionId) {
        await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['messages'], 'readonly');
            const store = transaction.objectStore('messages');
            const index = store.index('sessionId');
            const request = index.getAll(IDBKeyRange.only(sessionId));

            request.onsuccess = () => {
                // timestamp でソート
                const messages = request.result.sort((a, b) => a.timestamp - b.timestamp);
                resolve(messages);
            };

            request.onerror = () => {
                console.error('メッセージ取得エラー:', request.error);
                reject(request.error);
            };
        });
    }

    // ========================================
    // 検索機能
    // ========================================

    /**
     * セッションを検索
     * @param {string} query - 検索クエリ
     * @returns {Promise<Array>} 検索結果
     */
    async searchSessions(query) {
        await this.ensureDB();

        const allSessions = await this.getAllSessions({ limit: 1000 });
        const lowerQuery = query.toLowerCase();

        // タイトルとタグで検索
        return allSessions.filter(session => {
            const titleMatch = session.title.toLowerCase().includes(lowerQuery);
            const tagsMatch = session.tags.some(tag => tag.toLowerCase().includes(lowerQuery));
            return titleMatch || tagsMatch;
        });
    }

    /**
     * お気に入りセッションを取得
     * @returns {Promise<Array>} お気に入りセッション配列
     */
    async getFavoriteSessions() {
        await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sessions'], 'readonly');
            const store = transaction.objectStore('sessions');
            const index = store.index('isFavorite');
            const request = index.getAll(IDBKeyRange.only(true));

            request.onsuccess = () => {
                // updatedAt でソート（降順）
                const sessions = request.result.sort((a, b) => b.updatedAt - a.updatedAt);
                resolve(sessions);
            };

            request.onerror = () => {
                console.error('お気に入り取得エラー:', request.error);
                reject(request.error);
            };
        });
    }

    // ========================================
    // ストレージ管理
    // ========================================

    /**
     * 使用中のストレージサイズを取得（概算）
     * @returns {Promise<number>} バイト数
     */
    async getStorageSize() {
        await this.ensureDB();

        const sessions = await this.getAllSessions({ limit: 10000 });
        const jsonString = JSON.stringify(sessions);
        return new Blob([jsonString]).size;
    }

    /**
     * 古いセッションを削除してストレージを最適化
     * @param {number} maxSessions - 保持する最大セッション数
     * @returns {Promise<number>} 削除したセッション数
     */
    async cleanup(maxSessions = 100) {
        await this.ensureDB();

        const sessions = await this.getAllSessions({
            limit: 10000,
            sortBy: 'updatedAt',
            order: 'desc'
        });

        if (sessions.length <= maxSessions) {
            return 0; // 削除不要
        }

        // お気に入り以外の古いセッションを削除
        const sessionsToDelete = sessions
            .slice(maxSessions)
            .filter(s => !s.isFavorite);

        for (const session of sessionsToDelete) {
            await this.deleteSession(session.id);
        }

        return sessionsToDelete.length;
    }

    /**
     * セッションをエクスポート
     * @param {string} sessionId - セッションID
     * @param {string} format - 形式 ('json' | 'markdown')
     * @returns {Promise<string>} エクスポートデータ
     */
    async exportSession(sessionId, format = 'json') {
        await this.ensureDB();

        const session = await this.getSession(sessionId);
        if (!session) {
            throw new Error(`セッションが見つかりません: ${sessionId}`);
        }

        const messages = await this.getMessages(sessionId);
        session.messages = messages;

        if (format === 'json') {
            return JSON.stringify(session, null, 2);
        } else if (format === 'markdown') {
            return this.sessionToMarkdown(session);
        } else {
            throw new Error(`サポートされていない形式: ${format}`);
        }
    }

    /**
     * セッションを Markdown 形式に変換
     * @private
     * @param {Object} session - セッションオブジェクト
     * @returns {string} Markdown テキスト
     */
    sessionToMarkdown(session) {
        let markdown = `# ${session.title}\n\n`;
        markdown += `**作成日時**: ${new Date(session.createdAt).toLocaleString()}\n`;
        markdown += `**更新日時**: ${new Date(session.updatedAt).toLocaleString()}\n`;
        markdown += `**モデル**: ${session.model}\n`;
        markdown += `**プロバイダー**: ${session.provider}\n\n`;

        if (session.tags.length > 0) {
            markdown += `**タグ**: ${session.tags.join(', ')}\n\n`;
        }

        markdown += `---\n\n`;

        for (const message of session.messages) {
            const role = message.role === 'user' ? '👤 ユーザー' : '🤖 AI';
            const time = new Date(message.timestamp).toLocaleString();
            markdown += `## ${role} (${time})\n\n`;
            markdown += `${message.content}\n\n`;
            markdown += `---\n\n`;
        }

        return markdown;
    }

    // ========================================
    // ユーティリティ
    // ========================================

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
     * データベースを閉じる
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }

    /**
     * データベースを完全に削除（テスト用）
     * @returns {Promise<void>}
     */
    async deleteDatabase() {
        this.close();

        return new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(this.dbName);

            request.onsuccess = () => {
                console.log('データベース削除成功');
                resolve();
            };

            request.onerror = () => {
                console.error('データベース削除エラー:', request.error);
                reject(request.error);
            };

            request.onblocked = () => {
                console.warn('データベース削除がブロックされました');
            };
        });
    }

    /**
     * 複数のセッションを一括保存（バッチ操作）
     * @param {Array} sessions - セッション配列
     * @param {number} batchSize - バッチサイズ
     * @returns {Promise<Array<string>>} 保存されたセッションIDの配列
     */
    async batchSaveSessions(sessions, batchSize = 50) {
        await this.ensureDB();

        const results = [];

        for (let i = 0; i < sessions.length; i += batchSize) {
            const batch = sessions.slice(i, i + batchSize);

            const transaction = this.db.transaction(['sessions'], 'readwrite');
            const store = transaction.objectStore('sessions');

            const batchPromises = batch.map(session => {
                return new Promise((resolve, reject) => {
                    const request = store.put(session);
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
            });

            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);

            // UIブロッキング防止
            if (i + batchSize < sessions.length) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        return results;
    }

    /**
     * 複数のセッションを一括削除（バッチ操作）
     * @param {Array<string>} sessionIds - セッションIDの配列
     * @param {number} batchSize - バッチサイズ
     * @returns {Promise<void>}
     */
    async batchDeleteSessions(sessionIds, batchSize = 50) {
        await this.ensureDB();

        for (let i = 0; i < sessionIds.length; i += batchSize) {
            const batch = sessionIds.slice(i, i + batchSize);

            const transaction = this.db.transaction(['sessions', 'messages'], 'readwrite');
            const sessionsStore = transaction.objectStore('sessions');
            const messagesStore = transaction.objectStore('messages');

            const batchPromises = batch.map(async sessionId => {
                // セッションを削除
                await new Promise((resolve, reject) => {
                    const request = sessionsStore.delete(sessionId);
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });

                // 関連メッセージを削除
                const messagesIndex = messagesStore.index('sessionId');
                const messagesRequest = messagesIndex.openCursor(IDBKeyRange.only(sessionId));

                await new Promise((resolve, reject) => {
                    messagesRequest.onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (cursor) {
                            cursor.delete();
                            cursor.continue();
                        } else {
                            resolve();
                        }
                    };
                    messagesRequest.onerror = () => reject(messagesRequest.error);
                });
            });

            await Promise.all(batchPromises);

            // UIブロッキング防止
            if (i + batchSize < sessionIds.length) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
    }

    /**
     * 古いセッションをアーカイブ（メモリ管理）
     * @param {number} maxSessions - 保持する最大セッション数
     * @returns {Promise<Object>} アーカイブ結果
     */
    async archiveOldSessions(maxSessions = 100) {
        await this.ensureDB();

        // すべてのセッションを取得（更新日時でソート）
        const sessions = await this.getSessions({
            sortBy: 'updatedAt',
            order: 'desc'
        });

        if (sessions.length <= maxSessions) {
            return {
                archived: 0,
                remaining: sessions.length
            };
        }

        // アーカイブ対象（古いセッション）を選択
        const toArchive = sessions.slice(maxSessions);

        // お気に入りは除外
        const archiveIds = toArchive
            .filter(s => !s.isFavorite)
            .map(s => s.id);

        // バッチ削除
        if (archiveIds.length > 0) {
            await this.batchDeleteSessions(archiveIds);
        }

        return {
            archived: archiveIds.length,
            remaining: sessions.length - archiveIds.length
        };
    }

    /**
     * メモリ使用量を最適化
     * @returns {Promise<Object>} 最適化結果
     */
    async optimizeMemory() {
        const sessions = await this.getSessions({
            sortBy: 'updatedAt',
            order: 'desc'
        });

        const result = await this.performanceOptimizer.checkMemoryAndArchive(
            sessions,
            async (sessionsToArchive) => {
                const archiveIds = sessionsToArchive.map(s => s.id);
                await this.batchDeleteSessions(archiveIds);
            }
        );

        return result;
    }
}
