/**
 * ローカル履歴機能統合
 * SimpleMarkdownEditorにローカル履歴機能を追加
 */

import { LocalHistoryPanel } from './local-history-panel.js';
import { getLocalHistoryManager } from '../lib/local-history-manager.js';

export class LocalHistoryIntegration {
    constructor(editor) {
        this.editor = editor;
        this.historyManager = getLocalHistoryManager();
        this.historyPanel = null;
        this.autoSaveInterval = null;
        this.autoSaveEnabled = false;
        this.autoSaveIntervalSeconds = 300; // 5分
        this.lastSavedContent = '';
    }

    /**
     * ローカル履歴機能を初期化
     */
    async init() {
        try {
            // 履歴パネルを作成
            const container = document.body;
            this.historyPanel = new LocalHistoryPanel(container);
            this.historyPanel.initialize();

            // 復元時のコールバック設定
            this.historyPanel.onRestore((content) => {
                this.restoreContent(content);
            });

            // ツールバーにボタンを追加
            this.addHistoryButton();

            // 自動保存を設定
            await this.setupAutoSave();

            console.log('ローカル履歴機能の初期化完了');
        } catch (error) {
            console.error('ローカル履歴機能の初期化エラー:', error);
        }
    }

    /**
     * ツールバーに履歴ボタンを追加
     */
    addHistoryButton() {
        const toolbar = document.querySelector('.toolbar');
        if (!toolbar) return;

        // 履歴ボタンを作成
        const historyButton = document.createElement('button');
        historyButton.className = 'toolbar-btn';
        historyButton.title = '編集履歴を表示';
        historyButton.innerHTML = '📋 履歴';
        historyButton.addEventListener('click', () => {
            this.toggleHistoryPanel();
        });

        // ツールバーの右側に追加
        const rightSection = toolbar.querySelector('.toolbar-right') || toolbar;
        rightSection.appendChild(historyButton);
    }

    /**
     * 履歴パネルをトグル
     */
    toggleHistoryPanel() {
        if (this.historyPanel) {
            this.historyPanel.toggle();
        }
    }

    /**
     * 現在のコンテンツを履歴として保存
     */
    async saveHistory(autoSave = false) {
        try {
            const content = this.getEditorContent();

            // 内容が変更されていない場合はスキップ
            if (content === this.lastSavedContent) {
                console.log('履歴保存スキップ（変更なし）');
                return null;
            }

            // 内容が空の場合はスキップ
            if (!content || content.trim().length === 0) {
                console.log('履歴保存スキップ（空の内容）');
                return null;
            }

            // ファイル名を取得
            const fileName = this.getFileName();

            // 履歴を保存
            const result = await this.historyManager.saveHistory(content, fileName);

            // 最後に保存した内容を記録
            this.lastSavedContent = content;

            // 通知を表示（自動保存の場合は控えめに）
            if (!autoSave) {
                this.showNotification('履歴を保存しました');
            }

            console.log('履歴保存成功:', result.id);
            return result;
        } catch (error) {
            console.error('履歴保存エラー:', error);
            throw error;
        }
    }

    /**
     * エディターの内容を取得
     */
    getEditorContent() {
        if (this.editor && typeof this.editor.getMarkdownContent === 'function') {
            return this.editor.getMarkdownContent();
        }

        // フォールバック: エディター要素から直接取得
        const editorContent = document.getElementById('wysiwyg-content');
        if (editorContent) {
            return editorContent.textContent || editorContent.innerText || '';
        }

        return '';
    }

    /**
     * ファイル名を取得
     */
    getFileName() {
        if (this.editor && this.editor.currentFileName) {
            return this.editor.currentFileName;
        }
        return 'Untitled';
    }

    /**
     * 履歴を復元
     */
    restoreContent(content) {
        try {
            // エディタの内容を更新
            const editorContent = document.getElementById('wysiwyg-content');
            if (editorContent && this.editor) {
                // Markdown → HTMLに変換してエディタに設定
                if (typeof this.editor.markdownToHtml === 'function') {
                    const html = this.editor.markdownToHtml(content);
                    editorContent.innerHTML = html;
                } else {
                    // フォールバック: プレーンテキストとして設定
                    editorContent.textContent = content;
                }

                // ワードカウントを更新
                if (typeof this.editor.updateWordCount === 'function') {
                    this.editor.updateWordCount();
                }

                console.log('履歴を復元しました');
            }
        } catch (error) {
            console.error('履歴復元エラー:', error);
            alert('履歴の復元に失敗しました');
        }
    }

    /**
     * 自動保存を設定
     */
    async setupAutoSave() {
        try {
            // 自動保存の設定を取得
            const settings = await this.historyManager.getAutoSaveSettings();
            this.autoSaveEnabled = settings.enabled;
            this.autoSaveIntervalSeconds = settings.interval;

            if (this.autoSaveEnabled) {
                this.startAutoSave();
            }
        } catch (error) {
            console.error('自動保存設定エラー:', error);
        }
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
            const result = await this.saveHistory(true);
            if (result) {
                console.log('自動保存完了');
                // 控えめな通知
                this.showNotification('自動保存しました', 2000);
            }
        } catch (error) {
            console.error('自動保存エラー:', error);
        }
    }

    /**
     * 通知を表示
     */
    showNotification(message, duration = 3000) {
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

        // 指定時間後に削除
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }

    /**
     * クリーンアップ
     */
    cleanup() {
        this.stopAutoSave();
        if (this.historyPanel) {
            this.historyPanel.cleanup();
        }
    }
}
