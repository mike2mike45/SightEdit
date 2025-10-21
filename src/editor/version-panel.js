/**
 * バージョン履歴パネルUI
 */

import { getVersionManager } from '../lib/version-manager.js';

export class VersionPanel {
    constructor(container) {
        this.container = container;
        this.versionManager = getVersionManager();
        this.isOpen = false;
        this.panel = null;
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
     * パネルHTMLを作成
     */
    createPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'version-history-panel';
        this.panel.className = 'version-panel hidden';
        this.panel.innerHTML = `
            <div class="version-panel-header">
                <h3>📋 バージョン履歴</h3>
                <button class="panel-close-btn" title="閉じる">×</button>
            </div>
            <div class="version-panel-content">
                <div class="version-sync-status">
                    <span id="sync-status-icon">🔄</span>
                    <span id="sync-status-text">読み込み中...</span>
                </div>
                <div class="version-list" id="version-list">
                    <!-- バージョン一覧がここに表示される -->
                </div>
            </div>
        `;

        this.container.appendChild(this.panel);

        // CSSを追加
        this.injectStyles();
    }

    /**
     * スタイルを追加
     */
    injectStyles() {
        if (document.getElementById('version-panel-styles')) return;

        const style = document.createElement('style');
        style.id = 'version-panel-styles';
        style.textContent = `
            .version-panel {
                position: fixed;
                right: 0;
                top: 0;
                width: 350px;
                height: 100vh;
                background: #ffffff;
                border-left: 1px solid #e0e0e0;
                box-shadow: -2px 0 8px rgba(0,0,0,0.1);
                display: flex;
                flex-direction: column;
                z-index: 1000;
                transition: transform 0.3s ease;
            }

            .version-panel.hidden {
                transform: translateX(100%);
            }

            .version-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px;
                border-bottom: 1px solid #e0e0e0;
                background: #f8f9fa;
            }

            .version-panel-header h3 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                color: #333;
            }

            .panel-close-btn {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #666;
                padding: 0;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: background 0.2s;
            }

            .panel-close-btn:hover {
                background: #e0e0e0;
            }

            .version-panel-content {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
            }

            .version-sync-status {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px;
                background: #e3f2fd;
                border-radius: 8px;
                margin-bottom: 16px;
                font-size: 14px;
                color: #1976d2;
            }

            .version-sync-status.success {
                background: #e8f5e9;
                color: #388e3c;
            }

            .version-sync-status.error {
                background: #ffebee;
                color: #d32f2f;
            }

            .version-list {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .version-item {
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                padding: 12px;
                background: #ffffff;
                transition: box-shadow 0.2s, border-color 0.2s;
            }

            .version-item:hover {
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                border-color: #2196f3;
            }

            .version-item.current {
                background: #e3f2fd;
                border-color: #2196f3;
            }

            .version-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }

            .version-icon {
                font-size: 18px;
            }

            .version-timestamp {
                font-size: 14px;
                font-weight: 600;
                color: #333;
            }

            .version-message {
                font-size: 13px;
                color: #666;
                margin-bottom: 8px;
                line-height: 1.4;
            }

            .version-meta {
                display: flex;
                gap: 12px;
                font-size: 12px;
                color: #999;
                margin-bottom: 8px;
            }

            .version-actions {
                display: flex;
                gap: 8px;
            }

            .version-btn {
                flex: 1;
                padding: 6px 12px;
                border: 1px solid #e0e0e0;
                border-radius: 4px;
                background: #ffffff;
                color: #333;
                font-size: 13px;
                cursor: pointer;
                transition: all 0.2s;
            }

            .version-btn:hover {
                background: #f5f5f5;
                border-color: #2196f3;
                color: #2196f3;
            }

            .version-btn.primary {
                background: #2196f3;
                color: #ffffff;
                border-color: #2196f3;
            }

            .version-btn.primary:hover {
                background: #1976d2;
                border-color: #1976d2;
            }

            .version-btn.danger {
                color: #d32f2f;
            }

            .version-btn.danger:hover {
                background: #ffebee;
                border-color: #d32f2f;
            }

            .empty-state {
                text-align: center;
                padding: 32px 16px;
                color: #999;
            }

            .empty-state-icon {
                font-size: 48px;
                margin-bottom: 16px;
            }

            .empty-state-text {
                font-size: 14px;
                line-height: 1.6;
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * イベントリスナーを設定
     */
    attachEventListeners() {
        // 閉じるボタン
        const closeBtn = this.panel.querySelector('.panel-close-btn');
        closeBtn.addEventListener('click', () => this.close());
    }

    /**
     * パネルを開く
     */
    async open() {
        this.isOpen = true;
        this.panel.classList.remove('hidden');
        await this.loadVersions();
    }

    /**
     * パネルを閉じる
     */
    close() {
        this.isOpen = false;
        this.panel.classList.add('hidden');
    }

    /**
     * パネルをトグル
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    /**
     * バージョン一覧を読み込み
     */
    async loadVersions() {
        const statusIcon = document.getElementById('sync-status-icon');
        const statusText = document.getElementById('sync-status-text');
        const versionList = document.getElementById('version-list');

        try {
            statusIcon.textContent = '🔄';
            statusText.textContent = '読み込み中...';

            const versions = await this.versionManager.getVersions();

            if (versions.length === 0) {
                this.renderEmptyState(versionList);
            } else {
                this.renderVersionList(versionList, versions);
            }

            statusIcon.textContent = '✅';
            statusText.textContent = '最新';
            document.querySelector('.version-sync-status').className = 'version-sync-status success';
        } catch (error) {
            console.error('バージョン読み込みエラー:', error);
            statusIcon.textContent = '❌';
            statusText.textContent = 'エラー: バージョン履歴を読み込めません';
            document.querySelector('.version-sync-status').className = 'version-sync-status error';

            this.renderEmptyState(versionList, true);
        }
    }

    /**
     * 空の状態を表示
     */
    renderEmptyState(container, isError = false) {
        if (isError) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⚠️</div>
                    <div class="empty-state-text">
                        バージョン履歴を読み込めませんでした。<br>
                        Google Drive連携が正しく設定されているか確認してください。
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <div class="empty-state-text">
                        まだバージョンがありません。<br>
                        「保存」ボタンで最初のバージョンを作成しましょう。
                    </div>
                </div>
            `;
        }
    }

    /**
     * バージョン一覧を表示
     */
    renderVersionList(container, versions) {
        container.innerHTML = '';

        versions.forEach((version, index) => {
            const versionItem = this.createVersionItem(version, index === 0);
            container.appendChild(versionItem);
        });
    }

    /**
     * バージョンアイテムを作成
     */
    createVersionItem(version, isCurrent) {
        const item = document.createElement('div');
        item.className = `version-item ${isCurrent ? 'current' : ''}`;
        item.innerHTML = `
            <div class="version-header">
                <span class="version-icon">${isCurrent ? '✓' : '○'}</span>
                <span class="version-timestamp">${this.versionManager.formatTimestamp(version.timestamp)}</span>
            </div>
            ${version.message ? `<div class="version-message">${this.escapeHtml(version.message)}</div>` : ''}
            <div class="version-meta">
                <span>サイズ: ${this.versionManager.formatFileSize(version.file_size)}</span>
                <span>作成者: ${version.created_by}</span>
            </div>
            <div class="version-actions">
                <button class="version-btn" data-action="view" data-version-id="${version.version_id}">
                    詳細
                </button>
                ${!isCurrent ? `
                    <button class="version-btn primary" data-action="restore" data-version-id="${version.version_id}">
                        復元
                    </button>
                ` : ''}
            </div>
        `;

        // イベントリスナーを設定
        const viewBtn = item.querySelector('[data-action="view"]');
        const restoreBtn = item.querySelector('[data-action="restore"]');

        if (viewBtn) {
            viewBtn.addEventListener('click', () => this.handleView(version.version_id));
        }

        if (restoreBtn) {
            restoreBtn.addEventListener('click', () => this.handleRestore(version.version_id));
        }

        return item;
    }

    /**
     * バージョン詳細表示
     */
    async handleView(versionId) {
        try {
            const content = await this.versionManager.getVersionContent(versionId);

            // モーダルまたは別タブで内容を表示
            // TODO: 実装
            console.log('バージョン内容:', content);
            alert(`バージョン ${versionId} の内容:\n\n${content.substring(0, 200)}...`);
        } catch (error) {
            alert(`エラー: ${error.message}`);
        }
    }

    /**
     * バージョン復元
     */
    async handleRestore(versionId) {
        const confirmed = confirm(
            'このバージョンに戻しますか？\n現在の内容は上書きされます。'
        );

        if (!confirmed) return;

        try {
            await this.versionManager.restoreVersion(versionId);

            // 復元成功後、エディタの内容を更新
            if (this.onRestoreCallback) {
                const content = await this.versionManager.getVersionContent(versionId);
                this.onRestoreCallback(content);
            }

            // バージョン一覧を再読み込み
            await this.loadVersions();

            alert('バージョンを復元しました');
        } catch (error) {
            alert(`エラー: ${error.message}`);
        }
    }

    /**
     * 復元時のコールバックを設定
     */
    onRestore(callback) {
        this.onRestoreCallback = callback;
    }

    /**
     * HTMLエスケープ
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
