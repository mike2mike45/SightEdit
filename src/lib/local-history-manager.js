/**
 * ローカル履歴管理マネージャー
 * Chrome拡張単独で動作する簡易履歴保存機能
 * chrome.storage.localを使用してブラウザ内にデータを保存
 */

export class LocalHistoryManager {
    constructor() {
        this.maxHistoryItems = 50; // 最大保存件数
        this.storageKey = 'sightedit_history';
    }

    /**
     * 履歴アイテムを保存
     */
    async saveHistory(content, fileName = 'Untitled') {
        try {
            const historyItem = {
                id: this.generateId(),
                fileName: fileName,
                content: content,
                timestamp: new Date().toISOString(),
                contentLength: content.length,
                preview: this.generatePreview(content)
            };

            // 既存の履歴を取得
            const history = await this.getHistory();

            // 新しいアイテムを先頭に追加
            history.unshift(historyItem);

            // 最大件数を超えた場合は古いものを削除
            if (history.length > this.maxHistoryItems) {
                history.splice(this.maxHistoryItems);
            }

            // 保存
            await this.saveToStorage(history);

            console.log('履歴を保存しました:', historyItem.id);
            return historyItem;
        } catch (error) {
            console.error('履歴保存エラー:', error);
            throw error;
        }
    }

    /**
     * 履歴一覧を取得
     */
    async getHistory() {
        try {
            // Feature detection: Chrome Extension環境かチェック
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                // Chrome Extension環境
                return new Promise((resolve) => {
                    chrome.storage.local.get([this.storageKey], (result) => {
                        const history = result[this.storageKey] || [];
                        resolve(history);
                    });
                });
            } else {
                // スタンドアロン環境: localStorage を使用
                const stored = localStorage.getItem(this.storageKey);
                return stored ? JSON.parse(stored) : [];
            }
        } catch (error) {
            console.error('履歴取得エラー:', error);
            return [];
        }
    }

    /**
     * 特定の履歴アイテムを取得
     */
    async getHistoryItem(id) {
        try {
            const history = await this.getHistory();
            return history.find(item => item.id === id);
        } catch (error) {
            console.error('履歴アイテム取得エラー:', error);
            return null;
        }
    }

    /**
     * 履歴アイテムを削除
     */
    async deleteHistoryItem(id) {
        try {
            const history = await this.getHistory();
            const filteredHistory = history.filter(item => item.id !== id);
            await this.saveToStorage(filteredHistory);
            console.log('履歴を削除しました:', id);
            return true;
        } catch (error) {
            console.error('履歴削除エラー:', error);
            return false;
        }
    }

    /**
     * すべての履歴をクリア
     */
    async clearHistory() {
        try {
            await this.saveToStorage([]);
            console.log('すべての履歴をクリアしました');
            return true;
        } catch (error) {
            console.error('履歴クリアエラー:', error);
            return false;
        }
    }

    /**
     * ストレージに保存
     */
    async saveToStorage(history) {
        try {
            // Feature detection: Chrome Extension環境かチェック
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                // Chrome Extension環境
                return new Promise((resolve, reject) => {
                    const data = {};
                    data[this.storageKey] = history;
                    chrome.storage.local.set(data, () => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve();
                        }
                    });
                });
            } else {
                // スタンドアロン環境: localStorage を使用
                localStorage.setItem(this.storageKey, JSON.stringify(history));
                return Promise.resolve();
            }
        } catch (error) {
            return Promise.reject(error);
        }
    }

    /**
     * ユニークIDを生成
     */
    generateId() {
        return `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * プレビューテキストを生成
     */
    generatePreview(content, maxLength = 100) {
        if (!content) return '';

        // 改行を削除して最初の数文字を取得
        const preview = content.replace(/\n/g, ' ').trim();

        if (preview.length > maxLength) {
            return preview.substring(0, maxLength) + '...';
        }

        return preview;
    }

    /**
     * タイムスタンプをフォーマット
     */
    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        // 1分未満
        if (diff < 60000) {
            return 'たった今';
        }

        // 1時間未満
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `${minutes}分前`;
        }

        // 24時間未満
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `${hours}時間前`;
        }

        // それ以外は日時を表示
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${year}/${month}/${day} ${hours}:${minutes}`;
    }

    /**
     * ファイルサイズをフォーマット
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';

        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * ストレージ使用状況を取得
     */
    async getStorageInfo() {
        try {
            // Feature detection: Chrome Extension環境かチェック
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                // Chrome Extension環境
                return new Promise((resolve) => {
                    chrome.storage.local.getBytesInUse([this.storageKey], (bytes) => {
                        resolve({
                            bytesInUse: bytes,
                            formatted: this.formatFileSize(bytes)
                        });
                    });
                });
            } else {
                // スタンドアロン環境: localStorage サイズを推定
                const stored = localStorage.getItem(this.storageKey);
                const bytes = stored ? new Blob([stored]).size : 0;
                return Promise.resolve({
                    bytesInUse: bytes,
                    formatted: this.formatFileSize(bytes)
                });
            }
        } catch (error) {
            return Promise.resolve({ bytesInUse: 0, formatted: '0 B' });
        }
    }

    /**
     * 自動保存機能の有効/無効を設定
     */
    async setAutoSaveEnabled(enabled) {
        try {
            // Feature detection: Chrome Extension環境かチェック
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                // Chrome Extension環境
                return new Promise((resolve) => {
                    chrome.storage.local.set({ autoSaveEnabled: enabled }, () => {
                        resolve();
                    });
                });
            } else {
                // スタンドアロン環境: localStorage を使用
                localStorage.setItem('sightedit_autoSaveEnabled', JSON.stringify(enabled));
                return Promise.resolve();
            }
        } catch (error) {
            return Promise.resolve();
        }
    }

    /**
     * 自動保存の設定を取得
     */
    async getAutoSaveSettings() {
        try {
            // Feature detection: Chrome Extension環境かチェック
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                // Chrome Extension環境
                return new Promise((resolve) => {
                    chrome.storage.local.get(['autoSaveEnabled', 'autoSaveInterval'], (result) => {
                        resolve({
                            enabled: result.autoSaveEnabled !== false, // デフォルトtrue
                            interval: result.autoSaveInterval || 300 // デフォルト5分
                        });
                    });
                });
            } else {
                // スタンドアロン環境: localStorage を使用
                const enabled = localStorage.getItem('sightedit_autoSaveEnabled');
                const interval = localStorage.getItem('sightedit_autoSaveInterval');
                return Promise.resolve({
                    enabled: enabled !== null ? JSON.parse(enabled) : true, // デフォルトtrue
                    interval: interval ? JSON.parse(interval) : 300 // デフォルト5分
                });
            }
        } catch (error) {
            return Promise.resolve({ enabled: true, interval: 300 });
        }
    }
}

// シングルトンインスタンス
let localHistoryManagerInstance = null;

export function getLocalHistoryManager() {
    if (!localHistoryManagerInstance) {
        localHistoryManagerInstance = new LocalHistoryManager();
    }
    return localHistoryManagerInstance;
}
