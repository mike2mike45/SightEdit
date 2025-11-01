/**
 * Google Drive画像ピッカーUI
 * chrome.identity APIを使用してGoogle Driveから直接画像を取得
 */

import { getGoogleDriveAPI } from '../lib/google-drive-api.js';

export class DriveImagePicker {
    constructor() {
        this.isOpen = false;
        this.modal = null;
        this.items = [];  // フォルダと画像の両方を含む
        this.onSelectCallback = null;
        this.selectedImage = null;
        this.driveAPI = getGoogleDriveAPI();
        this.currentFolderId = null;  // null = ルート（マイドライブ）
        this.folderPath = [];  // パンくずリスト用: [{id: null, name: 'マイドライブ'}]
        this.currentUserEmail = null;
    }

    /**
     * モーダルを初期化
     */
    initialize() {
        this.createModal();
        this.attachEventListeners();
    }

    /**
     * モーダルHTMLを作成
     */
    createModal() {
        this.modal = document.createElement('div');
        this.modal.id = 'drive-image-picker-modal';
        this.modal.className = 'drive-picker-modal hidden';
        this.modal.innerHTML = `
            <div class="drive-picker-overlay"></div>
            <div class="drive-picker-content">
                <div class="drive-picker-header">
                    <div class="header-left">
                        <h3>📁 Google Drive画像を選択</h3>
                        <div class="account-info" id="account-info">
                            <span class="account-email" id="account-email"></span>
                        </div>
                    </div>
                    <button class="drive-picker-close-btn" title="閉じる">×</button>
                </div>
                <div class="url-input-section">
                    <input
                        type="text"
                        id="drive-url-input"
                        class="drive-url-input"
                        placeholder="Google DriveのURLを直接入力 / Enter Google Drive URL directly"
                    />
                    <button id="load-from-url-btn" class="load-from-url-btn" title="URLから読み込み / Load from URL">
                        🔗 読み込み
                    </button>
                </div>
                <div class="drive-picker-toolbar">
                    <div class="breadcrumb" id="breadcrumb">
                        <span class="breadcrumb-item">📂 マイドライブ</span>
                    </div>
                </div>
                <div class="drive-picker-body">
                    <div class="drive-picker-error hidden" id="drive-picker-error">
                        <p class="error-message"></p>
                        <button class="retry-btn">再試行</button>
                    </div>
                    <div class="drive-picker-grid" id="drive-picker-grid">
                        <!-- フォルダと画像がここに表示される -->
                    </div>
                </div>
                <div class="drive-picker-footer">
                    <div class="drive-picker-info">
                        <span id="selected-image-name">画像を選択してください</span>
                    </div>
                    <div class="drive-picker-actions">
                        <button class="btn-cancel">キャンセル</button>
                        <button class="btn-select" id="btn-select" disabled>選択</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);

        // CSSを追加
        this.injectStyles();
    }

    /**
     * スタイルを追加
     */
    injectStyles() {
        if (document.getElementById('drive-picker-styles')) return;

        const style = document.createElement('style');
        style.id = 'drive-picker-styles';
        style.textContent = `
            .drive-picker-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .drive-picker-modal.hidden {
                display: none;
            }

            .drive-picker-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(2px);
            }

            .drive-picker-content {
                position: relative;
                width: 90%;
                max-width: 800px;
                height: 80vh;
                max-height: 700px;
                background: #ffffff;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                animation: modalFadeIn 0.2s ease;
            }

            @keyframes modalFadeIn {
                from {
                    opacity: 0;
                    transform: scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }

            .drive-picker-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                padding: 20px 24px;
                border-bottom: 1px solid #e0e0e0;
                background: #f8f9fa;
            }

            .header-left {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .drive-picker-header h3 {
                margin: 0;
                font-size: 20px;
                font-weight: 600;
                color: #333;
            }

            .account-info {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 13px;
                color: #666;
            }

            .account-email {
                padding: 4px 8px;
                background: #fff;
                border: 1px solid #e0e0e0;
                border-radius: 4px;
            }

            .url-input-section {
                display: flex;
                gap: 8px;
                padding: 12px 16px;
                background: #f8f9fa;
                border-bottom: 1px solid #e0e0e0;
            }

            .drive-url-input {
                flex: 1;
                padding: 8px 12px;
                border: 1px solid #d0d0d0;
                border-radius: 4px;
                font-size: 13px;
                outline: none;
                transition: border-color 0.2s;
            }

            .drive-url-input:focus {
                border-color: #4285f4;
                box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.1);
            }

            .load-from-url-btn {
                padding: 8px 16px;
                background: #4285f4;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 500;
                transition: background-color 0.2s;
                white-space: nowrap;
            }

            .load-from-url-btn:hover {
                background: #3367d6;
            }

            .load-from-url-btn:active {
                background: #2b56c4;
            }

            .drive-picker-toolbar {
                display: flex;
                align-items: center;
                padding: 12px 24px;
                background: #fff;
                border-bottom: 1px solid #e0e0e0;
                min-height: 48px;
            }

            .breadcrumb {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-wrap: wrap;
                font-size: 14px;
            }

            .breadcrumb-item {
                display: flex;
                align-items: center;
                color: #666;
                cursor: default;
            }

            .breadcrumb-item.clickable {
                color: #4285f4;
                cursor: pointer;
                transition: all 0.2s;
            }

            .breadcrumb-item.clickable:hover {
                color: #3367d6;
                text-decoration: underline;
            }

            .breadcrumb-separator {
                color: #999;
                margin: 0 4px;
            }

            .drive-picker-close-btn {
                background: none;
                border: none;
                font-size: 28px;
                color: #666;
                cursor: pointer;
                padding: 0;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: all 0.2s;
            }

            .drive-picker-close-btn:hover {
                background: #e0e0e0;
                color: #333;
            }

            .drive-picker-body {
                flex: 1;
                overflow-y: auto;
                padding: 24px;
                position: relative;
            }

            .drive-picker-error {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100%;
                text-align: center;
                color: #d32f2f;
            }

            .drive-picker-error.hidden {
                display: none;
            }

            .error-message {
                margin-bottom: 16px;
                font-size: 16px;
            }

            .retry-btn {
                padding: 10px 24px;
                background: #4285f4;
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                cursor: pointer;
                transition: background 0.2s;
            }

            .retry-btn:hover {
                background: #3367d6;
            }

            .drive-picker-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
                gap: 16px;
            }

            .drive-picker-grid.hidden {
                display: none;
            }

            .drive-item {
                position: relative;
                aspect-ratio: 1;
                border: 2px solid transparent;
                border-radius: 8px;
                overflow: hidden;
                cursor: pointer;
                transition: all 0.2s;
                background: #f5f5f5;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }

            .drive-item:hover {
                border-color: #4285f4;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(66, 133, 244, 0.2);
            }

            .drive-item.selected {
                border-color: #4285f4;
                box-shadow: 0 4px 16px rgba(66, 133, 244, 0.3);
            }

            .drive-item.folder {
                background: #fff;
            }

            .drive-item.folder .folder-icon {
                font-size: 48px;
                margin-bottom: 8px;
            }

            .drive-item.image img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                position: absolute;
                top: 0;
                left: 0;
            }

            .drive-item .item-name {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                padding: 8px;
                background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
                color: white;
                font-size: 12px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                z-index: 1;
            }

            .drive-item.folder .item-name {
                position: static;
                background: none;
                color: #333;
                padding: 0;
                margin-top: 8px;
                text-align: center;
            }

            .drive-item .selected-check {
                position: absolute;
                top: 8px;
                right: 8px;
                width: 24px;
                height: 24px;
                background: #4285f4;
                border-radius: 50%;
                display: none;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 14px;
                z-index: 2;
            }

            .drive-item.selected .selected-check {
                display: flex;
            }

            .drive-picker-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 24px;
                border-top: 1px solid #e0e0e0;
                background: #f8f9fa;
            }

            .drive-picker-info {
                font-size: 14px;
                color: #666;
            }

            .drive-picker-actions {
                display: flex;
                gap: 12px;
            }

            .drive-picker-actions button {
                padding: 10px 20px;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.2s;
            }

            .btn-cancel {
                background: #f5f5f5;
                color: #333;
            }

            .btn-cancel:hover {
                background: #e0e0e0;
            }

            .btn-select {
                background: #4285f4;
                color: white;
            }

            .btn-select:hover:not(:disabled) {
                background: #3367d6;
            }

            .btn-select:disabled {
                background: #ccc;
                cursor: not-allowed;
                opacity: 0.6;
            }

            /* カスタム確認ダイアログ */
            .custom-confirm-dialog {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .custom-confirm-dialog .dialog-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
            }

            .custom-confirm-dialog .dialog-content {
                position: relative;
                background: white;
                border-radius: 12px;
                padding: 24px;
                max-width: 480px;
                width: 90%;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
                z-index: 1;
            }

            .custom-confirm-dialog .dialog-title {
                margin: 0 0 16px 0;
                font-size: 20px;
                font-weight: 600;
                color: #202124;
            }

            .custom-confirm-dialog .dialog-message {
                margin: 0 0 24px 0;
                font-size: 14px;
                line-height: 1.6;
                color: #5f6368;
                white-space: pre-wrap;
            }

            .custom-confirm-dialog .dialog-buttons {
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            }

            .custom-confirm-dialog .dialog-btn {
                padding: 10px 24px;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
            }

            .custom-confirm-dialog .dialog-btn-cancel {
                background: #f1f3f4;
                color: #202124;
            }

            .custom-confirm-dialog .dialog-btn-cancel:hover {
                background: #e8eaed;
            }

            .custom-confirm-dialog .dialog-btn-confirm {
                background: #4285f4;
                color: white;
            }

            .custom-confirm-dialog .dialog-btn-confirm:hover {
                background: #3367d6;
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * イベントリスナーを設定
     */
    attachEventListeners() {
        // 閉じるボタン
        const closeBtn = this.modal.querySelector('.drive-picker-close-btn');
        closeBtn.addEventListener('click', () => this.close());

        // オーバーレイクリックで閉じる
        const overlay = this.modal.querySelector('.drive-picker-overlay');
        overlay.addEventListener('click', () => this.close());

        // キャンセルボタン
        const cancelBtn = this.modal.querySelector('.btn-cancel');
        cancelBtn.addEventListener('click', () => this.close());

        // 選択ボタン
        const selectBtn = this.modal.querySelector('.btn-select');
        selectBtn.addEventListener('click', () => this.selectImage());

        // 再試行ボタン
        const retryBtn = this.modal.querySelector('.retry-btn');
        retryBtn.addEventListener('click', () => this.loadInitialData());

        // URL入力からの読み込みボタン
        const loadFromUrlBtn = this.modal.querySelector('#load-from-url-btn');
        loadFromUrlBtn.addEventListener('click', () => this.loadFromUrl());

        // ESCキーで閉じる
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    /**
     * モーダルを開く
     */
    async open() {
        console.log('[DEBUG] DriveImagePicker.open() called');
        console.log('[DEBUG] this.isOpen:', this.isOpen);
        console.log('[DEBUG] this.modal:', this.modal);

        if (this.isOpen) return;

        this.isOpen = true;
        this.modal.classList.remove('hidden');
        this.selectedImage = null;
        console.log('[DEBUG] Modal should be visible now');

        // 一時的な対策：初回のみ、すべてのキャッシュされたトークンをクリア
        // 古いクライアントIDのトークンを削除するため
        if (!this._tokensClearedOnce) {
            console.log('[DEBUG] Clearing all cached tokens (first time only)...');
            try {
                await this.driveAPI.logout();
                this._tokensClearedOnce = true;
                console.log('[DEBUG] All tokens cleared successfully');
            } catch (error) {
                console.error('[DEBUG] Failed to clear tokens:', error);
            }
        }

        // 初期データを読み込み（ユーザー情報、フォルダ、画像）
        await this.loadInitialData();
    }

    /**
     * モーダルを閉じる
     */
    close() {
        this.isOpen = false;
        this.modal.classList.add('hidden');
        this.selectedImage = null;
    }

    /**
     * 初期データを読み込み（ユーザー情報とルートフォルダ）
     */
    async loadInitialData() {
        const errorEl = this.modal.querySelector('#drive-picker-error');
        const gridEl = this.modal.querySelector('#drive-picker-grid');

        // エラー表示をリセット
        errorEl.classList.add('hidden');
        gridEl.classList.remove('hidden');

        try {
            // ユーザー情報を取得
            await this.loadUserInfo();

            // ルートフォルダ（マイドライブ）を表示
            this.currentFolderId = null;
            this.folderPath = [{ id: null, name: 'マイドライブ' }];
            this.updateBreadcrumb();

            // フォルダと画像を取得
            await this.loadFolderContents(this.currentFolderId);

        } catch (error) {
            console.error('Failed to load initial data:', error);

            gridEl.classList.add('hidden');
            errorEl.classList.remove('hidden');

            const errorMessage = errorEl.querySelector('.error-message');
            errorMessage.textContent = `エラー: ${error.message}`;
        }
    }

    /**
     * ユーザー情報を取得して表示
     */
    async loadUserInfo() {
        try {
            const userInfo = await this.driveAPI.getUserInfo();
            this.currentUserEmail = userInfo.emailAddress;

            const emailEl = this.modal.querySelector('#account-email');
            emailEl.textContent = this.currentUserEmail;

            console.log('[DEBUG] User email:', this.currentUserEmail);
        } catch (error) {
            console.error('Failed to load user info:', error);
            const emailEl = this.modal.querySelector('#account-email');
            emailEl.textContent = 'エラー';
        }
    }

    /**
     * フォルダの内容を読み込み（フォルダと画像の両方）
     */
    async loadFolderContents(folderId) {
        console.log('[DEBUG] loadFolderContents() called, folderId:', folderId);

        try {
            // フォルダと画像を取得
            this.items = await this.driveAPI.getFolderContents(folderId);
            console.log('[DEBUG] Retrieved items:', this.items.length);

            // グリッドを表示
            this.renderGrid();

        } catch (error) {
            console.error('Failed to load folder contents:', error);
            throw error;
        }
    }

    /**
     * パンくずリストを更新
     */
    updateBreadcrumb() {
        const breadcrumbEl = this.modal.querySelector('#breadcrumb');
        breadcrumbEl.innerHTML = '';

        this.folderPath.forEach((folder, index) => {
            // パンくずアイテム
            const item = document.createElement('span');
            item.className = 'breadcrumb-item';

            // 最後のアイテム以外はクリック可能
            if (index < this.folderPath.length - 1) {
                item.classList.add('clickable');
                item.addEventListener('click', () => this.navigateToFolder(folder.id, index));
            }

            item.textContent = index === 0 ? `📂 ${folder.name}` : folder.name;
            breadcrumbEl.appendChild(item);

            // セパレーター（最後以外）
            if (index < this.folderPath.length - 1) {
                const separator = document.createElement('span');
                separator.className = 'breadcrumb-separator';
                separator.textContent = '›';
                breadcrumbEl.appendChild(separator);
            }
        });
    }

    /**
     * フォルダに移動
     */
    async navigateToFolder(folderId, pathIndex = null) {
        console.log('[DEBUG] Navigating to folder:', folderId);

        try {
            // パンくずリストを更新
            if (pathIndex !== null) {
                // パンくずからクリックした場合、そこまで戻る
                this.folderPath = this.folderPath.slice(0, pathIndex + 1);
            }

            this.currentFolderId = folderId;
            this.updateBreadcrumb();

            // フォルダ内容を読み込み
            await this.loadFolderContents(folderId);

        } catch (error) {
            console.error('Failed to navigate to folder:', error);
            this.showConfirmDialog(
                'Error / エラー',
                `フォルダの読み込みに失敗しました / Failed to load folder: ${error.message}`,
                'OK',
                null
            );
        }
    }

    /**
     * フォルダを開く（ダブルクリック時）
     */
    async openFolder(folder) {
        console.log('[DEBUG] Opening folder:', folder.name);

        // フォルダパスに追加
        this.folderPath.push({ id: folder.id, name: folder.name });

        // フォルダに移動
        await this.navigateToFolder(folder.id);
    }

    /**
     * カスタム確認ダイアログを表示（日本語・英語対応）
     */
    showConfirmDialog(title, message, confirmText, cancelText) {
        return new Promise((resolve) => {
            // ダイアログHTMLを作成
            const dialog = document.createElement('div');
            dialog.className = 'custom-confirm-dialog';
            dialog.innerHTML = `
                <div class="dialog-overlay"></div>
                <div class="dialog-content">
                    <h3 class="dialog-title">${title}</h3>
                    <p class="dialog-message">${message}</p>
                    <div class="dialog-buttons">
                        ${cancelText ? `<button class="dialog-btn dialog-btn-cancel">${cancelText}</button>` : ''}
                        <button class="dialog-btn dialog-btn-confirm">${confirmText}</button>
                    </div>
                </div>
            `;

            document.body.appendChild(dialog);

            // ボタンのイベントリスナー
            const confirmBtn = dialog.querySelector('.dialog-btn-confirm');
            const cancelBtn = dialog.querySelector('.dialog-btn-cancel');

            const cleanup = () => {
                dialog.remove();
            };

            confirmBtn.addEventListener('click', () => {
                cleanup();
                resolve(true);
            });

            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    cleanup();
                    resolve(false);
                });
            }

            // オーバーレイクリックで閉じる（キャンセル扱い）
            const overlay = dialog.querySelector('.dialog-overlay');
            overlay.addEventListener('click', () => {
                cleanup();
                resolve(false);
            });
        });
    }

    /**
     * URLからファイルIDを抽出して読み込み
     */
    async loadFromUrl() {
        const inputEl = this.modal.querySelector('#drive-url-input');
        const url = inputEl.value.trim();

        if (!url) {
            await this.showConfirmDialog(
                'Error / エラー',
                'URLを入力してください / Please enter a URL',
                'OK',
                null
            );
            return;
        }

        try {
            // Google DriveのURLからファイルIDを抽出
            const fileId = this.extractFileIdFromUrl(url);

            if (!fileId) {
                await this.showConfirmDialog(
                    'Error / エラー',
                    '有効なGoogle Drive URLではありません / Invalid Google Drive URL',
                    'OK',
                    null
                );
                return;
            }

            console.log('[DEBUG] Extracted file ID:', fileId);

            // ファイル情報を取得
            const fileInfo = await this.driveAPI.getFileMetadata(fileId);
            console.log('[DEBUG] File info:', fileInfo);

            // 画像ファイルかチェック
            if (!fileInfo.mimeType.startsWith('image/')) {
                await this.showConfirmDialog(
                    'Error / エラー',
                    'このファイルは画像ではありません / This file is not an image',
                    'OK',
                    null
                );
                return;
            }

            // 選択状態にする
            this.selectedItem = {
                id: fileId,
                name: fileInfo.name,
                type: 'image',
                thumbnailLink: fileInfo.thumbnailLink,
                mimeType: fileInfo.mimeType
            };

            // プレビューを更新
            const previewEl = this.modal.querySelector('#selected-image-preview');
            const nameEl = this.modal.querySelector('#selected-image-name');

            if (fileInfo.thumbnailLink) {
                previewEl.src = fileInfo.thumbnailLink;
                previewEl.classList.remove('hidden');
            } else {
                previewEl.classList.add('hidden');
            }
            nameEl.textContent = fileInfo.name;

            // 選択ボタンを有効化
            const selectBtn = this.modal.querySelector('.btn-select');
            selectBtn.disabled = false;

            // 入力フィールドをクリア
            inputEl.value = '';

            await this.showConfirmDialog(
                'Success / 成功',
                `画像が選択されました / Image selected: ${fileInfo.name}`,
                'OK',
                null
            );

        } catch (error) {
            console.error('Failed to load from URL:', error);
            await this.showConfirmDialog(
                'Error / エラー',
                `URLからの読み込みに失敗しました / Failed to load from URL: ${error.message}`,
                'OK',
                null
            );
        }
    }

    /**
     * Google DriveのURLからファイルIDを抽出
     * @param {string} url - Google Drive URL
     * @returns {string|null} ファイルID
     */
    extractFileIdFromUrl(url) {
        // パターン1: https://drive.google.com/file/d/{fileId}/view
        let match = url.match(/\/file\/d\/([^\/]+)/);
        if (match) return match[1];

        // パターン2: https://drive.google.com/open?id={fileId}
        match = url.match(/[?&]id=([^&]+)/);
        if (match) return match[1];

        // パターン3: https://drive.google.com/uc?id={fileId}
        match = url.match(/\/uc\?id=([^&]+)/);
        if (match) return match[1];

        // パターン4: ファイルIDそのもの
        if (/^[a-zA-Z0-9_-]{25,}$/.test(url)) {
            return url;
        }

        return null;
    }

    /**
     * グリッドを描画（フォルダと画像）
     */
    renderGrid() {
        const gridEl = this.modal.querySelector('#drive-picker-grid');
        gridEl.innerHTML = '';

        if (this.items.length === 0) {
            gridEl.innerHTML = '<p style="text-align: center; color: #666;">フォルダも画像も見つかりませんでした</p>';
            return;
        }

        // フォルダと画像を分けてソート（フォルダが先）
        const folders = this.items.filter(item => item.type === 'folder');
        const images = this.items.filter(item => item.type === 'image');

        // フォルダを描画
        folders.forEach(folder => {
            const itemEl = document.createElement('div');
            itemEl.className = 'drive-item folder';
            itemEl.dataset.folderId = folder.id;

            itemEl.innerHTML = `
                <div class="folder-icon">📁</div>
                <div class="item-name">${folder.name}</div>
            `;

            // ダブルクリックでフォルダを開く
            itemEl.addEventListener('dblclick', () => this.openFolder(folder));

            gridEl.appendChild(itemEl);
        });

        // 画像を描画
        images.forEach(image => {
            const itemEl = document.createElement('div');
            itemEl.className = 'drive-item image';
            itemEl.dataset.fileId = image.file_id;

            // サムネイルまたはアイコンを表示
            const thumbnailUrl = image.thumbnail_link || this.getFileIcon(image.mime_type);

            itemEl.innerHTML = `
                <img src="${thumbnailUrl}" alt="${image.file_name}" loading="lazy">
                <div class="item-name">${image.file_name}</div>
                <div class="selected-check">✓</div>
            `;

            // シングルクリックで選択
            itemEl.addEventListener('click', () => this.selectImageItem(image, itemEl));

            gridEl.appendChild(itemEl);
        });
    }

    /**
     * ファイルアイコンを取得
     */
    getFileIcon(mimeType) {
        // 簡易的なアイコン（データURL）
        return 'data:image/svg+xml,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                <rect fill="#4285f4" width="100" height="100"/>
                <text x="50" y="55" font-size="14" fill="white" text-anchor="middle" font-family="sans-serif">IMAGE</text>
            </svg>
        `);
    }

    /**
     * 画像アイテムを選択
     */
    selectImageItem(image, itemEl) {
        // 他の選択を解除
        const allItems = this.modal.querySelectorAll('.drive-item');
        allItems.forEach(item => item.classList.remove('selected'));

        // 選択状態にする
        itemEl.classList.add('selected');
        this.selectedImage = image;

        // UI更新
        const selectedNameEl = this.modal.querySelector('#selected-image-name');
        selectedNameEl.textContent = image.file_name;

        const selectBtn = this.modal.querySelector('#btn-select');
        selectBtn.disabled = false;
    }

    /**
     * 選択した画像を確定
     */
    async selectImage() {
        if (!this.selectedImage) return;

        try {
            console.log('[DEBUG] Getting file metadata...');
            const metadata = await this.driveAPI.getFileMetadata(this.selectedImage.file_id);

            // webContentLinkがあるかチェック
            if (metadata.webContentLink) {
                console.log('[DEBUG] File has webContentLink:', metadata.webContentLink);

                // URLにアクセスできるかテスト
                try {
                    const testResponse = await fetch(metadata.webContentLink, { method: 'HEAD' });

                    if (testResponse.ok) {
                        // アクセス可能 - 公開URLを使用
                        console.log('[DEBUG] File is publicly accessible');
                        this.returnImageUrl(metadata.webContentLink);
                        return;
                    }
                } catch (e) {
                    console.log('[DEBUG] File is not publicly accessible');
                }
            }

            // ファイルが非公開 - ユーザーに公開するか確認
            const makePublic = confirm(
                `「${this.selectedImage.file_name}」は非公開ファイルです。\n\n` +
                `Markdownファイルに埋め込むには、このファイルを公開設定にする必要があります。\n` +
                `（リンクを知っている全員が閲覧可能になります）\n\n` +
                `公開設定にしますか？`
            );

            if (!makePublic) {
                console.log('[DEBUG] User declined to make file public');
                return;
            }

            // 権限を更新
            console.log('[DEBUG] Updating file permissions...');
            const success = await this.driveAPI.updateFilePermissions(this.selectedImage.file_id);

            if (!success) {
                alert('ファイルの公開設定に失敗しました。');
                return;
            }

            // 再度メタデータを取得してwebContentLinkを確認
            console.log('[DEBUG] Getting updated metadata...');
            const updatedMetadata = await this.driveAPI.getFileMetadata(this.selectedImage.file_id);

            if (updatedMetadata.webContentLink) {
                console.log('[DEBUG] File is now public, using webContentLink');
                this.returnImageUrl(updatedMetadata.webContentLink);
            } else {
                throw new Error('公開設定後もwebContentLinkが取得できませんでした');
            }

        } catch (error) {
            console.error('Failed to get image:', error);
            alert(`画像の取得に失敗しました: ${error.message}`);
        }
    }

    /**
     * 画像URLを返す（コールバック呼び出し）
     */
    returnImageUrl(url) {
        if (this.onSelectCallback) {
            this.onSelectCallback({
                url: url,
                fileName: this.selectedImage.file_name,
                fileId: this.selectedImage.file_id,
                isBlob: false  // 公開URLを使用
            });
        }
        this.close();
    }

    /**
     * 選択時のコールバックを設定
     */
    onSelect(callback) {
        this.onSelectCallback = callback;
    }
}

// シングルトンインスタンス
let pickerInstance = null;

export function getDriveImagePicker() {
    console.log('[DEBUG] getDriveImagePicker() called');
    console.log('[DEBUG] pickerInstance exists:', !!pickerInstance);
    if (!pickerInstance) {
        console.log('[DEBUG] Creating new DriveImagePicker instance');
        pickerInstance = new DriveImagePicker();
        pickerInstance.initialize();
        console.log('[DEBUG] DriveImagePicker initialized');
    }
    return pickerInstance;
}
