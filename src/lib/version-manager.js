/**
 * バージョン履歴管理マネージャー
 * Google Drive連携によるバージョン管理
 */

export class VersionManager {
    constructor() {
        this.relayUrl = 'http://127.0.0.1:8080';
        this.versions = [];
        this.currentFilePath = null;
    }

    /**
     * ファイルパスを設定
     */
    setFilePath(filePath) {
        this.currentFilePath = filePath;
    }

    /**
     * バージョン一覧を取得
     */
    async getVersions() {
        try {
            const response = await fetch(`${this.relayUrl}/api/versions`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('バージョン一覧の取得に失敗しました');
            }

            const data = await response.json();

            if (data.success) {
                this.versions = data.versions || [];
                return this.versions;
            } else {
                throw new Error(data.error || 'バージョン一覧の取得に失敗しました');
            }
        } catch (error) {
            console.error('バージョン一覧取得エラー:', error);
            throw error;
        }
    }

    /**
     * 新しいバージョンを保存
     */
    async saveVersion(content, message = '') {
        try {
            const response = await fetch(`${this.relayUrl}/api/versions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    file_path: this.currentFilePath,
                    content: content,
                    message: message
                })
            });

            if (!response.ok) {
                throw new Error('バージョンの保存に失敗しました');
            }

            const data = await response.json();

            if (data.success) {
                // バージョン一覧を更新
                await this.getVersions();
                return data;
            } else {
                throw new Error(data.error || 'バージョンの保存に失敗しました');
            }
        } catch (error) {
            // ネットワークエラーの場合はより詳細なメッセージを表示
            if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
                const serverError = new Error('SightEditRelayサーバーに接続できません。\n\nSightEditRelay.exeが起動していることを確認してください。\n\nサーバーはポート8080で実行されている必要があります。');
                serverError.isServerConnectionError = true;
                console.error('サーバー接続エラー:', serverError.message);
                throw serverError;
            }
            console.error('バージョン保存エラー:', error);
            throw error;
        }
    }

    /**
     * 特定バージョンの内容を取得
     */
    async getVersionContent(versionId) {
        try {
            const response = await fetch(`${this.relayUrl}/api/versions/${versionId}/content`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('バージョン内容の取得に失敗しました');
            }

            const data = await response.json();

            if (data.success) {
                return data.content;
            } else {
                throw new Error(data.error || 'バージョン内容の取得に失敗しました');
            }
        } catch (error) {
            console.error('バージョン内容取得エラー:', error);
            throw error;
        }
    }

    /**
     * バージョンを復元
     */
    async restoreVersion(versionId) {
        try {
            const response = await fetch(`${this.relayUrl}/api/versions/${versionId}/restore`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('バージョンの復元に失敗しました');
            }

            const data = await response.json();

            if (data.success) {
                return data;
            } else {
                throw new Error(data.error || 'バージョンの復元に失敗しました');
            }
        } catch (error) {
            console.error('バージョン復元エラー:', error);
            throw error;
        }
    }

    /**
     * バージョン履歴が利用可能かチェック
     */
    async checkAvailability() {
        try {
            const response = await fetch(`${this.relayUrl}/api/versions`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            return response.ok;
        } catch (error) {
            return false;
        }
    }

    /**
     * タイムスタンプをフォーマット
     */
    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
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
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
}

// シングルトンインスタンス
let versionManagerInstance = null;

export function getVersionManager() {
    if (!versionManagerInstance) {
        versionManagerInstance = new VersionManager();
    }
    return versionManagerInstance;
}
