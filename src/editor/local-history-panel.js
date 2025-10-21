/**
 * ローカル履歴パネル
 * Chrome拡張単独で動作する履歴表示UI
 */

import { getLocalHistoryManager } from '../lib/local-history-manager.js';

export class LocalHistoryPanel {
    constructor(container) {
        this.container = container;
        this.historyManager = getLocalHistoryManager();
        this.panel = null;
        this.isOpen = false;
        this.onRestoreCallback = null;
    }

    /**
     * パネルを初期化
     */
    initialize() {
        this.createPanel();
        this.attachEventListeners();
    }

    /**
     * パネル要素を作成
     */
    createPanel() {
        this.panel = document.createElement('div');
        this.panel.className = 'local-history-panel';
        this.panel.innerHTML = `
            <div class="history-panel-header">
                <h3>📝 編集履歴</h3>
                <div class="history-panel-actions">
                    <button class="btn-icon" id="refresh-history" title="更新">
                        🔄
                    </button>
                    <button class="btn-icon" id="clear-history" title="すべてクリア">
                        🗑️
                    </button>
                    <button class="btn-icon" id="close-history-panel" title="閉じる">
                        ×
                    </button>
                </div>
            </div>
            <div class="history-panel-content">
                <div class="history-info">
                    <p class="storage-info">読み込み中...</p>
                </div>
                <div class="history-list" id="history-list">
                    <div class="loading">読み込み中...</div>
                </div>
            </div>
        `;

        // スタイルを追加
        this.addStyles();

        // コンテナに追加
        this.container.appendChild(this.panel);

        // 初期状態は非表示
        this.panel.style.display = 'none';
    }

    /**
     * スタイルを追加
     */
    addStyles() {
        if (document.getElementById('local-history-panel-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'local-history-panel-styles';
        style.textContent = `
            .local-history-panel {
                position: fixed;
                right: 0;
                top: 0;
                bottom: 0;
                width: 350px;
                background: #ffffff;
                border-left: 1px solid #e0e0e0;
                box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
                display: flex;
                flex-direction: column;
                z-index: 1000;
            }

            .history-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px;
                border-bottom: 1px solid #e0e0e0;
                background: #f8f9fa;
            }

            .history-panel-header h3 {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
                color: #333;
            }

            .history-panel-actions {
                display: flex;
                gap: 8px;
            }

            .btn-icon {
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                padding: 4px 8px;
                border-radius: 4px;
                transition: background 0.2s;
            }

            .btn-icon:hover {
                background: #e0e0e0;
            }

            .history-panel-content {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
            }

            .history-info {
                margin-bottom: 16px;
                padding: 12px;
                background: #f0f4ff;
                border-radius: 6px;
                font-size: 13px;
                color: #555;
            }

            .storage-info {
                margin: 0;
            }

            .history-list {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .loading {
                text-align: center;
                padding: 20px;
                color: #999;
            }

            .history-item {
                background: #f8f9fa;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                padding: 12px;
                cursor: pointer;
                transition: all 0.2s;
            }

            .history-item:hover {
                background: #e9ecef;
                border-color: #667eea;
                transform: translateX(-2px);
            }

            .history-item-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }

            .history-item-title {
                font-weight: 600;
                font-size: 14px;
                color: #333;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .history-item-actions {
                display: flex;
                gap: 4px;
            }

            .history-item-actions button {
                background: none;
                border: none;
                font-size: 16px;
                cursor: pointer;
                padding: 2px 6px;
                border-radius: 4px;
                transition: background 0.2s;
            }

            .history-item-actions button:hover {
                background: #dee2e6;
            }

            .history-item-meta {
                display: flex;
                justify-content: space-between;
                font-size: 12px;
                color: #666;
                margin-bottom: 8px;
            }

            .history-item-preview {
                font-size: 13px;
                color: #555;
                line-height: 1.4;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .empty-history {
                text-align: center;
                padding: 40px 20px;
                color: #999;
            }

            .empty-history-icon {
                font-size: 48px;
                margin-bottom: 16px;
            }

            .empty-history p {
                margin: 0;
                font-size: 14px;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * イベントリスナーをアタッチ
     */
    attachEventListeners() {
        // 閉じるボタン
        const closeBtn = this.panel.querySelector('#close-history-panel');
        closeBtn.addEventListener('click', () => {
            this.close();
        });

        // 更新ボタン
        const refreshBtn = this.panel.querySelector('#refresh-history');
        refreshBtn.addEventListener('click', () => {
            this.loadHistory();
        });

        // すべてクリアボタン
        const clearBtn = this.panel.querySelector('#clear-history');
        clearBtn.addEventListener('click', async () => {
            if (confirm('すべての履歴を削除してもよろしいですか？\nこの操作は取り消せません。')) {
                await this.historyManager.clearHistory();
                await this.loadHistory();
            }
        });
    }

    /**
     * 履歴を読み込んで表示
     */
    async loadHistory() {
        const historyList = this.panel.querySelector('#history-list');

        try {
            // ストレージ情報を更新
            const storageInfo = await this.historyManager.getStorageInfo();
            const history = await this.historyManager.getHistory();

            const storageInfoElement = this.panel.querySelector('.storage-info');
            storageInfoElement.textContent = `履歴: ${history.length}件 / ストレージ使用量: ${storageInfo.formatted}`;

            // 履歴がない場合
            if (history.length === 0) {
                historyList.innerHTML = `
                    <div class="empty-history">
                        <div class="empty-history-icon">📝</div>
                        <p>まだ履歴がありません</p>
                        <p style="font-size: 12px; margin-top: 8px; color: #999;">
                            編集内容は自動的に保存されます
                        </p>
                    </div>
                `;
                return;
            }

            // 履歴アイテムを表示
            historyList.innerHTML = history.map(item => this.createHistoryItemHTML(item)).join('');

            // 各アイテムのイベントリスナーを設定
            history.forEach(item => {
                // 復元ボタン
                const restoreBtn = this.panel.querySelector(`#restore-${item.id}`);
                if (restoreBtn) {
                    restoreBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.restoreHistoryItem(item);
                    });
                }

                // 削除ボタン
                const deleteBtn = this.panel.querySelector(`#delete-${item.id}`);
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        if (confirm('この履歴を削除してもよろしいですか？')) {
                            await this.historyManager.deleteHistoryItem(item.id);
                            await this.loadHistory();
                        }
                    });
                }

                // アイテム全体のクリック
                const itemElement = this.panel.querySelector(`#item-${item.id}`);
                if (itemElement) {
                    itemElement.addEventListener('click', () => {
                        this.restoreHistoryItem(item);
                    });
                }
            });

        } catch (error) {
            console.error('履歴の読み込みエラー:', error);
            historyList.innerHTML = `
                <div class="empty-history">
                    <p>履歴の読み込みに失敗しました</p>
                </div>
            `;
        }
    }

    /**
     * 履歴アイテムのHTMLを生成
     */
    createHistoryItemHTML(item) {
        const timestamp = this.historyManager.formatTimestamp(item.timestamp);
        const fileSize = this.historyManager.formatFileSize(item.contentLength);

        return `
            <div class="history-item" id="item-${item.id}">
                <div class="history-item-header">
                    <div class="history-item-title">
                        📄 ${this.escapeHtml(item.fileName)}
                    </div>
                    <div class="history-item-actions">
                        <button id="restore-${item.id}" title="復元">↩️</button>
                        <button id="delete-${item.id}" title="削除">🗑️</button>
                    </div>
                </div>
                <div class="history-item-meta">
                    <span>${timestamp}</span>
                    <span>${fileSize}</span>
                </div>
                <div class="history-item-preview">
                    ${this.escapeHtml(item.preview)}
                </div>
            </div>
        `;
    }

    /**
     * 履歴アイテムを復元
     */
    async restoreHistoryItem(item) {
        if (this.onRestoreCallback) {
            this.onRestoreCallback(item.content);
            this.showNotification('履歴を復元しました');
        }
    }

    /**
     * 復元時のコールバックを設定
     */
    onRestore(callback) {
        this.onRestoreCallback = callback;
    }

    /**
     * 通知を表示
     */
    showNotification(message) {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 380px;
            background: #4caf50;
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * HTMLエスケープ
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * パネルを開く
     */
    async open() {
        this.panel.style.display = 'flex';
        this.isOpen = true;
        await this.loadHistory();
    }

    /**
     * パネルを閉じる
     */
    close() {
        this.panel.style.display = 'none';
        this.isOpen = false;
    }

    /**
     * パネルをトグル
     */
    async toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            await this.open();
        }
    }

    /**
     * クリーンアップ
     */
    cleanup() {
        if (this.panel) {
            this.panel.remove();
        }
    }
}
