/**
 * バージョン管理機能統合
 * SimpleMarkdownEditorにバージョン履歴機能を追加
 */

import { VersionPanel } from './version-panel.js';
import { getVersionManager } from '../lib/version-manager.js';

export class VersionIntegration {
    constructor(editor) {
        this.editor = editor;
        this.versionManager = getVersionManager();
        this.versionPanel = null;
        this.autoSaveInterval = null;
        this.autoSaveEnabled = false;
        this.autoSaveIntervalSeconds = 300; // 5分
        this.lastSavedContent = '';
    }

    /**
     * バージョン管理機能を初期化
     */
    async init() {
        try {
            // バージョンマネージャーが利用可能かチェック
            const available = await this.versionManager.checkAvailability();

            if (!available) {
                console.log('バージョン履歴機能は利用できません');
                return;
            }

            // バージョンパネルを作成
            const container = document.body;
            this.versionPanel = new VersionPanel(container);
            this.versionPanel.initialize();

            // 復元時のコールバック設定
            this.versionPanel.onRestore((content) => {
                this.restoreContent(content);
            });

            // ツールバーにボタンを追加
            this.addVersionButton();

            // 自動保存を設定
            this.setupAutoSave();

            console.log('バージョン管理機能の初期化完了');
        } catch (error) {
            console.error('バージョン管理機能の初期化エラー:', error);
        }
    }

    /**
     * ツールバーにバージョン履歴ボタンを追加
     */
    addVersionButton() {
        const toolbar = document.querySelector('.toolbar');
        if (!toolbar) return;

        // バージョン履歴ボタンを作成
        const versionButton = document.createElement('button');
        versionButton.className = 'toolbar-btn';
        versionButton.title = 'バージョン履歴';
        versionButton.innerHTML = '📋';
        versionButton.addEventListener('click', () => {
            this.toggleVersionPanel();
        });

        // ツールバーの右側に追加
        const rightSection = toolbar.querySelector('.toolbar-right') || toolbar;
        rightSection.appendChild(versionButton);
    }

    /**
     * バージョンパネルをトグル
     */
    toggleVersionPanel() {
        if (this.versionPanel) {
            this.versionPanel.toggle();
        }
    }

    /**
     * 現在のコンテンツをバージョンとして保存
     */
    async saveVersion(message = '') {
        try {
            const content = this.editor.getMarkdownContent();

            // ファイルパスを設定（現在のファイル名から取得）
            if (this.editor.currentFileName) {
                this.versionManager.setFilePath(this.editor.currentFileName);
            }

            // バージョンを保存
            const result = await this.versionManager.saveVersion(content, message);

            // バージョンパネルを更新
            if (this.versionPanel && this.versionPanel.isOpen) {
                await this.versionPanel.loadVersions();
            }

            // 最後に保存した内容を記録
            this.lastSavedContent = content;

            console.log('バージョン保存成功:', result.version_id);
            return result;
        } catch (error) {
            console.error('バージョン保存エラー:', error);
            throw error;
        }
    }

    /**
     * バージョンを復元
     */
    restoreContent(content) {
        // エディタの内容を更新
        const editorContent = document.getElementById('wysiwyg-content');
        if (editorContent) {
            // Markdown → HTMLに変換してエディタに設定
            const html = this.editor.markdownToHtml(content);
            editorContent.innerHTML = html;

            // ワードカウントを更新
            this.editor.updateWordCount();

            console.log('バージョンを復元しました');
        }
    }

    /**
     * 自動保存を設定
     */
    setupAutoSave() {
        // 自動保存の有効/無効をチェック
        chrome.storage.local.get(['autoSaveEnabled', 'autoSaveInterval'], (result) => {
            this.autoSaveEnabled = result.autoSaveEnabled !== false; // デフォルトtrue
            this.autoSaveIntervalSeconds = result.autoSaveInterval || 300;

            if (this.autoSaveEnabled) {
                this.startAutoSave();
            }
        });
    }

    /**
     * 自動保存を開始
     */
    startAutoSave() {
        // 既存のタイマーをクリア
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }

        // 新しいタイマーを設定
        this.autoSaveInterval = setInterval(() => {
            this.performAutoSave();
        }, this.autoSaveIntervalSeconds * 1000);

        console.log(`自動保存を開始（${this.autoSaveIntervalSeconds}秒間隔）`);
    }

    /**
     * 自動保存を停止
     */
    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
            console.log('自動保存を停止');
        }
    }

    /**
     * 自動保存を実行
     */
    async performAutoSave() {
        try {
            const currentContent = this.editor.getMarkdownContent();

            // 内容が変更されていない場合はスキップ
            if (currentContent === this.lastSavedContent) {
                console.log('自動保存スキップ（変更なし）');
                return;
            }

            // 内容が空の場合はスキップ
            if (!currentContent || currentContent.trim().length === 0) {
                console.log('自動保存スキップ（空の内容）');
                return;
            }

            // バージョンを保存
            await this.saveVersion('自動保存');
            console.log('自動保存完了');

            // 通知を表示（オプション）
            this.showSaveNotification('自動保存しました');
        } catch (error) {
            console.error('自動保存エラー:', error);
        }
    }

    /**
     * 保存通知を表示
     */
    showSaveNotification(message) {
        // 既存の通知を削除
        const existingNotification = document.querySelector('.save-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // 通知を作成
        const notification = document.createElement('div');
        notification.className = 'save-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #4caf50;
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);

        // 3秒後に削除
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * バージョン保存ダイアログを表示
     */
    async showSaveDialog() {
        return new Promise((resolve) => {
            // ダイアログを作成
            const dialog = document.createElement('div');
            dialog.className = 'version-save-dialog';
            dialog.innerHTML = `
                <div class="dialog-overlay"></div>
                <div class="dialog-content">
                    <h3>バージョンを保存</h3>
                    <p>このバージョンに説明をつけますか？</p>
                    <textarea
                        id="version-message"
                        placeholder="例: 導入部分をリライト"
                        rows="3"
                        style="width: 100%; padding: 8px; margin: 12px 0; border: 1px solid #ddd; border-radius: 4px;"
                    ></textarea>
                    <div class="dialog-buttons">
                        <button id="save-cancel-btn" class="btn btn-secondary">キャンセル</button>
                        <button id="save-confirm-btn" class="btn btn-primary">保存</button>
                    </div>
                </div>
            `;

            // スタイルを追加
            const style = document.createElement('style');
            style.textContent = `
                .version-save-dialog .dialog-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.5);
                    z-index: 9998;
                }
                .version-save-dialog .dialog-content {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: white;
                    padding: 24px;
                    border-radius: 8px;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
                    z-index: 9999;
                    min-width: 400px;
                }
                .version-save-dialog h3 {
                    margin: 0 0 16px 0;
                    font-size: 20px;
                    color: #333;
                }
                .version-save-dialog p {
                    margin: 0 0 8px 0;
                    color: #666;
                }
                .version-save-dialog .dialog-buttons {
                    display: flex;
                    justify-content: flex-end;
                    gap: 8px;
                    margin-top: 16px;
                }
                .version-save-dialog .btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                }
                .version-save-dialog .btn-primary {
                    background: #2196f3;
                    color: white;
                }
                .version-save-dialog .btn-secondary {
                    background: #e0e0e0;
                    color: #333;
                }
                @keyframes slideIn {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateY(0); opacity: 1; }
                    to { transform: translateY(20px); opacity: 0; }
                }
            `;
            document.head.appendChild(style);

            document.body.appendChild(dialog);

            // イベントリスナーを設定
            const messageInput = document.getElementById('version-message');
            const cancelBtn = document.getElementById('save-cancel-btn');
            const confirmBtn = document.getElementById('save-confirm-btn');

            messageInput.focus();

            cancelBtn.addEventListener('click', () => {
                dialog.remove();
                style.remove();
                resolve(null);
            });

            confirmBtn.addEventListener('click', async () => {
                const message = messageInput.value.trim();
                dialog.remove();
                style.remove();

                try {
                    const result = await this.saveVersion(message);
                    this.showSaveNotification('バージョンを保存しました');
                    resolve(result);
                } catch (error) {
                    alert(`エラー: ${error.message}`);
                    resolve(null);
                }
            });

            // オーバーレイクリックで閉じる
            dialog.querySelector('.dialog-overlay').addEventListener('click', () => {
                dialog.remove();
                style.remove();
                resolve(null);
            });
        });
    }

    /**
     * クリーンアップ
     */
    cleanup() {
        this.stopAutoSave();
    }
}
