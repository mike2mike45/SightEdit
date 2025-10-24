/**
 * ExportImportManager - セッション/データのエクスポート/インポート管理
 *
 * チャットセッションをJSON/Markdown形式でエクスポート/インポートする機能を提供します。
 * オプションで暗号化もサポートします。
 */

export class ExportImportManager {
    constructor() {
        this.version = '1.0.0';
    }

    /**
     * セッションをJSON形式でエクスポート
     * @param {Object} session - エクスポートするセッション
     * @param {Object} options - エクスポートオプション
     * @returns {Object} エクスポートデータ
     */
    exportSessionToJSON(session, options = {}) {
        const exportData = {
            version: this.version,
            exportedAt: new Date().toISOString(),
            type: 'chat-session',
            session: {
                id: session.id,
                title: session.title || 'Untitled Session',
                createdAt: session.createdAt,
                updatedAt: session.updatedAt,
                messages: session.messages.map(msg => ({
                    role: msg.role,
                    content: msg.content,
                    timestamp: msg.timestamp
                })),
                metadata: {
                    messageCount: session.messages.length,
                    tags: session.tags || [],
                    isFavorite: session.isFavorite || false
                }
            }
        };

        if (options.includeStats) {
            exportData.stats = this.calculateSessionStats(session);
        }

        return exportData;
    }

    /**
     * 複数セッションをJSON形式でエクスポート
     * @param {Array} sessions - エクスポートするセッション配列
     * @returns {Object} エクスポートデータ
     */
    exportMultipleSessionsToJSON(sessions) {
        return {
            version: this.version,
            exportedAt: new Date().toISOString(),
            type: 'chat-sessions-batch',
            count: sessions.length,
            sessions: sessions.map(session => this.exportSessionToJSON(session, { includeStats: false }).session)
        };
    }

    /**
     * セッションをMarkdown形式でエクスポート
     * @param {Object} session - エクスポートするセッション
     * @returns {string} Markdown形式のテキスト
     */
    exportSessionToMarkdown(session) {
        let markdown = '';

        // ヘッダー
        markdown += `# ${session.title || 'Untitled Session'}\n\n`;
        markdown += `**作成日時**: ${new Date(session.createdAt).toLocaleString('ja-JP')}\n`;
        markdown += `**更新日時**: ${new Date(session.updatedAt).toLocaleString('ja-JP')}\n`;
        markdown += `**メッセージ数**: ${session.messages.length}\n\n`;

        if (session.tags && session.tags.length > 0) {
            markdown += `**タグ**: ${session.tags.join(', ')}\n\n`;
        }

        markdown += '---\n\n';

        // メッセージ
        session.messages.forEach((msg, index) => {
            const roleLabel = msg.role === 'user' ? '👤 ユーザー' : '🤖 AI';
            const timestamp = new Date(msg.timestamp).toLocaleTimeString('ja-JP');

            markdown += `## ${roleLabel} (${timestamp})\n\n`;
            markdown += `${msg.content}\n\n`;

            if (index < session.messages.length - 1) {
                markdown += '---\n\n';
            }
        });

        // フッター
        markdown += '\n---\n\n';
        markdown += `*Exported from SightEdit on ${new Date().toLocaleString('ja-JP')}*\n`;

        return markdown;
    }

    /**
     * セッションをファイルとしてダウンロード
     * @param {Object} session - セッション
     * @param {string} format - 'json' | 'markdown'
     * @param {Object} options - オプション
     */
    async downloadSession(session, format = 'json', options = {}) {
        let content, filename, mimeType;

        if (format === 'json') {
            const exportData = this.exportSessionToJSON(session, options);

            // 暗号化オプション
            if (options.encrypt && options.password) {
                const encrypted = await this.encryptData(JSON.stringify(exportData), options.password);
                content = JSON.stringify(encrypted, null, 2);
                filename = `${this.sanitizeFilename(session.title)}_encrypted.json`;
            } else {
                content = JSON.stringify(exportData, null, 2);
                filename = `${this.sanitizeFilename(session.title)}.json`;
            }
            mimeType = 'application/json';
        } else if (format === 'markdown') {
            content = this.exportSessionToMarkdown(session);
            filename = `${this.sanitizeFilename(session.title)}.md`;
            mimeType = 'text/markdown';
        } else {
            throw new Error(`Unsupported format: ${format}`);
        }

        // ダウンロード
        this.triggerDownload(content, filename, mimeType);
    }

    /**
     * 複数セッションをバッチダウンロード
     * @param {Array} sessions - セッション配列
     * @param {string} format - 'json' | 'markdown'
     */
    downloadMultipleSessions(sessions, format = 'json') {
        if (format === 'json') {
            const exportData = this.exportMultipleSessionsToJSON(sessions);
            const content = JSON.stringify(exportData, null, 2);
            const filename = `sightedit_sessions_${Date.now()}.json`;
            this.triggerDownload(content, filename, 'application/json');
        } else if (format === 'markdown') {
            // 各セッションを個別のMarkdownとして連結
            let content = '# SightEdit Chat Sessions Export\n\n';
            content += `Exported: ${new Date().toLocaleString('ja-JP')}\n`;
            content += `Total Sessions: ${sessions.length}\n\n`;
            content += '---\n\n';

            sessions.forEach((session, index) => {
                content += this.exportSessionToMarkdown(session);
                if (index < sessions.length - 1) {
                    content += '\n\n===\n\n';
                }
            });

            const filename = `sightedit_sessions_${Date.now()}.md`;
            this.triggerDownload(content, filename, 'text/markdown');
        }
    }

    /**
     * JSONファイルからセッションをインポート
     * @param {File} file - インポートするファイル
     * @param {Object} options - オプション
     * @returns {Promise<Object>} インポート結果
     */
    async importSessionFromJSON(file, options = {}) {
        try {
            const text = await file.text();
            let data = JSON.parse(text);

            // 暗号化されている場合
            if (data.encrypted && options.password) {
                const decrypted = await this.decryptData(data, options.password);
                data = JSON.parse(decrypted);
            }

            // バージョンチェック
            if (!data.version) {
                throw new Error('Invalid export file: missing version');
            }

            // タイプチェック
            if (data.type === 'chat-session') {
                return {
                    success: true,
                    type: 'single',
                    session: this.processImportedSession(data.session)
                };
            } else if (data.type === 'chat-sessions-batch') {
                return {
                    success: true,
                    type: 'batch',
                    sessions: data.sessions.map(s => this.processImportedSession(s)),
                    count: data.count
                };
            } else {
                throw new Error(`Unsupported export type: ${data.type}`);
            }
        } catch (error) {
            console.error('Import error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * インポートされたセッションを処理
     * @param {Object} session - インポートされたセッション
     * @returns {Object} 処理済みセッション
     */
    processImportedSession(session) {
        // 新しいIDを生成（衝突を避けるため）
        return {
            ...session,
            id: this.generateId(),
            importedAt: Date.now(),
            originalId: session.id
        };
    }

    /**
     * データを暗号化（Web Crypto API使用）
     * @param {string} data - 暗号化するデータ
     * @param {string} password - パスワード
     * @returns {Promise<Object>} 暗号化データ
     */
    async encryptData(data, password) {
        try {
            // パスワードから鍵を導出
            const encoder = new TextEncoder();
            const passwordBuffer = encoder.encode(password);

            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                passwordBuffer,
                { name: 'PBKDF2' },
                false,
                ['deriveBits', 'deriveKey']
            );

            // Salt生成
            const salt = crypto.getRandomValues(new Uint8Array(16));

            // 鍵導出
            const key = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt', 'decrypt']
            );

            // IV生成
            const iv = crypto.getRandomValues(new Uint8Array(12));

            // 暗号化
            const dataBuffer = encoder.encode(data);
            const encryptedBuffer = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                dataBuffer
            );

            // Base64エンコード
            return {
                encrypted: true,
                algorithm: 'AES-GCM',
                salt: Array.from(salt),
                iv: Array.from(iv),
                data: Array.from(new Uint8Array(encryptedBuffer))
            };
        } catch (error) {
            console.error('Encryption error:', error);
            throw new Error('暗号化に失敗しました');
        }
    }

    /**
     * データを復号化
     * @param {Object} encryptedData - 暗号化データ
     * @param {string} password - パスワード
     * @returns {Promise<string>} 復号化データ
     */
    async decryptData(encryptedData, password) {
        try {
            const encoder = new TextEncoder();
            const decoder = new TextDecoder();
            const passwordBuffer = encoder.encode(password);

            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                passwordBuffer,
                { name: 'PBKDF2' },
                false,
                ['deriveBits', 'deriveKey']
            );

            const salt = new Uint8Array(encryptedData.salt);

            const key = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt', 'decrypt']
            );

            const iv = new Uint8Array(encryptedData.iv);
            const dataBuffer = new Uint8Array(encryptedData.data);

            const decryptedBuffer = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                dataBuffer
            );

            return decoder.decode(decryptedBuffer);
        } catch (error) {
            console.error('Decryption error:', error);
            throw new Error('復号化に失敗しました（パスワードが正しくない可能性があります）');
        }
    }

    /**
     * セッション統計を計算
     * @param {Object} session - セッション
     * @returns {Object} 統計情報
     */
    calculateSessionStats(session) {
        const userMessages = session.messages.filter(m => m.role === 'user');
        const aiMessages = session.messages.filter(m => m.role === 'assistant');

        const totalChars = session.messages.reduce((sum, m) => sum + m.content.length, 0);
        const avgMessageLength = session.messages.length > 0
            ? Math.round(totalChars / session.messages.length)
            : 0;

        return {
            totalMessages: session.messages.length,
            userMessages: userMessages.length,
            aiMessages: aiMessages.length,
            totalCharacters: totalChars,
            averageMessageLength: avgMessageLength,
            duration: session.updatedAt - session.createdAt
        };
    }

    /**
     * ファイル名をサニタイズ
     * @param {string} filename - ファイル名
     * @returns {string} サニタイズされたファイル名
     */
    sanitizeFilename(filename) {
        if (!filename) return 'untitled';

        return filename
            .replace(/[<>:"/\\|?*]/g, '_')
            .replace(/\s+/g, '_')
            .substring(0, 100);
    }

    /**
     * ファイルダウンロードをトリガー
     * @param {string} content - コンテンツ
     * @param {string} filename - ファイル名
     * @param {string} mimeType - MIMEタイプ
     */
    triggerDownload(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';

        document.body.appendChild(a);
        a.click();

        // クリーンアップ
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }

    /**
     * ユニークIDを生成
     * @returns {string} UUID
     */
    generateId() {
        return 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
}

// シングルトンインスタンス
let exportImportManagerInstance = null;

/**
 * ExportImportManager のシングルトンインスタンスを取得
 */
export function getExportImportManager() {
    if (!exportImportManagerInstance) {
        exportImportManagerInstance = new ExportImportManager();
    }
    return exportImportManagerInstance;
}
