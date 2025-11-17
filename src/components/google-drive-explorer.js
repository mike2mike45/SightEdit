/**
 * Google Drive File Explorer Component
 * ファイルエクスプローラー風のGoogle Driveブラウザ
 */

class GoogleDriveExplorer {
    constructor() {
        this.currentFolderId = 'root';
        this.currentPath = ['マイドライブ'];
        this.selectedFileId = null;
        this.selectedFileName = null;
        this.onFileSelected = null;
        this.baseUrl = 'http://127.0.0.1:8080';
        
        this.modal = null;
        this.breadcrumbEl = null;
        this.folderTreeEl = null;
        this.fileGridEl = null;
        this.selectedFileInfo = null;
    }

    /**
     * エクスプローラーを表示
     */
    async show(onFileSelectedCallback) {
        this.onFileSelected = onFileSelectedCallback;
        
        // 接続確認
        const isConnected = await this.checkConnection();
        if (!isConnected) {
            alert('Google Driveサービスに接続できません。\nSightEditRelay.exeが起動していることを確認してください。');
            return;
        }

        this.createModal();
        await this.loadCurrentFolder();
    }

    /**
     * 接続確認
     */
    async checkConnection() {
        try {
            const response = await fetch(`${this.baseUrl}/api/status`);
            const data = await response.json();
            return data.status === 'running' && data.driveServiceAvailable;
        } catch (error) {
            console.error('Google Drive connection check failed:', error);
            return false;
        }
    }

    /**
     * モーダルダイアログを作成
     */
    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'google-drive-modal';
        this.modal.innerHTML = `
            <div class="google-drive-explorer">
                <div class="explorer-header">
                    <h3>📁 Google Drive - 画像を選択</h3>
                    <button class="close-btn" id="closeDriveExplorer">✕</button>
                </div>
                
                <div class="explorer-toolbar">
                    <nav class="breadcrumb" id="driveBreadcrumb">
                        <span class="breadcrumb-item">📂 マイドライブ</span>
                    </nav>
                </div>

                <div class="explorer-content">
                    <div class="folder-tree" id="folderTree">
                        <div class="tree-loading">📁 フォルダを読み込み中...</div>
                    </div>
                    
                    <div class="file-grid-container">
                        <div class="grid-header">
                            <div class="view-controls">
                                <button class="view-btn active" data-view="grid">📊 グリッド</button>
                                <button class="view-btn" data-view="list">📋 リスト</button>
                            </div>
                            <div class="file-count" id="fileCount">-</div>
                        </div>
                        
                        <div class="file-grid" id="fileGrid">
                            <div class="grid-loading">🖼️ 画像を読み込み中...</div>
                        </div>
                    </div>
                </div>

                <div class="selected-file-info" id="selectedFileInfo" style="display: none;">
                    <div class="file-preview">
                        <img id="filePreview" src="" alt="プレビュー" style="display: none;">
                    </div>
                    <div class="file-details">
                        <div class="file-name" id="selectedFileName">-</div>
                        <div class="file-meta">
                            <span id="selectedFileSize">-</span> • 
                            <span id="selectedFileDate">-</span>
                        </div>
                    </div>
                </div>
                
                <div class="explorer-footer">
                    <button class="btn btn-secondary" id="cancelSelect">キャンセル</button>
                    <button class="btn btn-primary" id="selectFile" disabled>この画像を選択</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);

        // イベントリスナー設定
        this.setupEventListeners();

        // 要素参照を保存
        this.breadcrumbEl = this.modal.querySelector('#driveBreadcrumb');
        this.folderTreeEl = this.modal.querySelector('#folderTree');
        this.fileGridEl = this.modal.querySelector('#fileGrid');
        this.selectedFileInfo = this.modal.querySelector('#selectedFileInfo');
    }

    /**
     * イベントリスナー設定
     */
    setupEventListeners() {
        // 閉じるボタン
        this.modal.querySelector('#closeDriveExplorer').addEventListener('click', () => {
            this.close();
        });

        // キャンセルボタン
        this.modal.querySelector('#cancelSelect').addEventListener('click', () => {
            this.close();
        });

        // 選択ボタン
        this.modal.querySelector('#selectFile').addEventListener('click', async () => {
            if (this.selectedFileId) {
                await this.selectFile();
            }
        });

        // 表示切り替えボタン
        this.modal.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const viewType = e.target.dataset.view;
                this.switchView(viewType);
            });
        });

        // モーダル背景クリックで閉じる
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });
    }

    /**
     * 現在のフォルダを読み込み
     */
    async loadCurrentFolder() {
        try {
            // フォルダツリーを更新
            await this.updateFolderTree();
            
            // ファイルグリッドを更新
            await this.updateFileGrid();
            
            // パンくずを更新
            this.updateBreadcrumb();
        } catch (error) {
            console.error('フォルダ読み込みエラー:', error);
            this.showError('フォルダの読み込みに失敗しました');
        }
    }

    /**
     * フォルダツリーを更新
     */
    async updateFolderTree() {
        this.folderTreeEl.innerHTML = '<div class="tree-loading">📁 読み込み中...</div>';

        try {
            const response = await fetch(`${this.baseUrl}/api/drive/folders?parentId=${this.currentFolderId}`);
            const data = await response.json();

            if (data.folders) {
                this.renderFolderTree(data.folders);
            }
        } catch (error) {
            this.folderTreeEl.innerHTML = '<div class="tree-error">❌ フォルダの読み込みに失敗</div>';
            throw error;
        }
    }

    /**
     * フォルダツリーを描画
     */
    renderFolderTree(folders) {
        if (folders.length === 0) {
            this.folderTreeEl.innerHTML = '<div class="tree-empty">📁 サブフォルダはありません</div>';
            return;
        }

        const html = folders.map(folder => `
            <div class="folder-item" data-folder-id="${folder.id}" data-folder-name="${folder.name}">
                📁 <span class="folder-name">${this.escapeHtml(folder.name)}</span>
            </div>
        `).join('');

        this.folderTreeEl.innerHTML = html;

        // フォルダクリックイベント
        this.folderTreeEl.querySelectorAll('.folder-item').forEach(item => {
            item.addEventListener('click', () => {
                const folderId = item.dataset.folderId;
                const folderName = item.dataset.folderName;
                this.navigateToFolder(folderId, folderName);
            });
        });
    }

    /**
     * ファイルグリッドを更新
     */
    async updateFileGrid() {
        this.fileGridEl.innerHTML = '<div class="grid-loading">🖼️ 読み込み中...</div>';

        try {
            const response = await fetch(`${this.baseUrl}/api/drive/images?parentId=${this.currentFolderId}`);
            const data = await response.json();

            if (data.images) {
                this.renderFileGrid(data.images);
                this.updateFileCount(data.images.length);
            }
        } catch (error) {
            this.fileGridEl.innerHTML = '<div class="grid-error">❌ 画像の読み込みに失敗</div>';
            throw error;
        }
    }

    /**
     * ファイルグリッドを描画
     */
    renderFileGrid(images) {
        if (images.length === 0) {
            this.fileGridEl.innerHTML = '<div class="grid-empty">🖼️ このフォルダに画像はありません</div>';
            return;
        }

        const html = images.map(image => `
            <div class="file-item ${this.selectedFileId === image.id ? 'selected' : ''}" 
                 data-file-id="${image.id}" 
                 data-file-name="${image.name}"
                 data-file-size="${image.size}"
                 data-file-date="${image.modifiedTimeFormatted}"
                 data-thumbnail="${image.thumbnailLink || ''}">
                
                <div class="file-thumbnail">
                    ${image.thumbnailLink ? 
                        `<img src="${image.thumbnailLink}" alt="${this.escapeHtml(image.name)}" loading="lazy">` :
                        '<div class="thumbnail-placeholder">🖼️</div>'
                    }
                </div>
                
                <div class="file-info">
                    <div class="file-name" title="${this.escapeHtml(image.name)}">
                        ${this.escapeHtml(this.truncateFileName(image.name))}
                    </div>
                    <div class="file-meta">
                        ${image.sizeFormatted} • ${image.modifiedTimeFormatted}
                    </div>
                </div>
            </div>
        `).join('');

        this.fileGridEl.innerHTML = html;

        // ファイルクリックイベント
        this.fileGridEl.querySelectorAll('.file-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectFileItem(item);
            });
            
            // ダブルクリックで即座に選択
            item.addEventListener('dblclick', async () => {
                this.selectFileItem(item);
                await this.selectFile();
            });
        });
    }

    /**
     * フォルダに移動
     */
    async navigateToFolder(folderId, folderName) {
        // パスを更新
        if (folderId === 'root') {
            this.currentPath = ['マイドライブ'];
        } else {
            this.currentPath.push(folderName);
        }
        
        this.currentFolderId = folderId;
        this.clearSelection();
        
        await this.loadCurrentFolder();
    }

    /**
     * 親フォルダに戻る
     */
    async navigateUp() {
        if (this.currentPath.length > 1) {
            this.currentPath.pop();
            // 実装: 親フォルダIDの取得が必要
            this.currentFolderId = 'root'; // 簡易実装
            this.clearSelection();
            await this.loadCurrentFolder();
        }
    }

    /**
     * ファイルアイテムを選択
     */
    selectFileItem(item) {
        // 既存の選択を解除
        this.fileGridEl.querySelectorAll('.file-item').forEach(el => {
            el.classList.remove('selected');
        });

        // 新しいアイテムを選択
        item.classList.add('selected');
        
        this.selectedFileId = item.dataset.fileId;
        this.selectedFileName = item.dataset.fileName;
        
        // 選択情報を表示
        this.showSelectedFileInfo({
            name: item.dataset.fileName,
            size: item.dataset.fileSize,
            date: item.dataset.fileDate,
            thumbnail: item.dataset.thumbnail
        });

        // 選択ボタンを有効化
        this.modal.querySelector('#selectFile').disabled = false;
    }

    /**
     * 選択したファイル情報を表示
     */
    showSelectedFileInfo(fileInfo) {
        this.selectedFileInfo.style.display = 'flex';
        
        const previewImg = this.selectedFileInfo.querySelector('#filePreview');
        if (fileInfo.thumbnail) {
            previewImg.src = fileInfo.thumbnail;
            previewImg.style.display = 'block';
        } else {
            previewImg.style.display = 'none';
        }

        this.selectedFileInfo.querySelector('#selectedFileName').textContent = fileInfo.name;
        this.selectedFileInfo.querySelector('#selectedFileSize').textContent = fileInfo.size || '-';
        this.selectedFileInfo.querySelector('#selectedFileDate').textContent = fileInfo.date || '-';
    }

    /**
     * ファイルを選択して親に通知
     */
    async selectFile() {
        if (!this.selectedFileId || !this.onFileSelected) {
            return;
        }

        try {
            // 共有リンクを取得
            const response = await fetch(`${this.baseUrl}/api/drive/share/${this.selectedFileId}`);
            const data = await response.json();

            if (data.shareLink) {
                // 画像用の直接アクセスURLに変換
                const imageUrl = this.convertToDirectImageUrl(data.shareLink);
                
                // 親コールバックに通知
                this.onFileSelected({
                    url: imageUrl,
                    name: this.selectedFileName,
                    alt: this.selectedFileName.replace(/\.[^/.]+$/, '') // 拡張子を除去
                });

                this.close();
            } else {
                throw new Error('共有リンクの取得に失敗しました');
            }
        } catch (error) {
            console.error('File selection error:', error);
            alert('ファイルの選択に失敗しました: ' + error.message);
        }
    }

    /**
     * Google DriveのリンクをMarkdown埋め込み用の直接アクセスURLに変換
     */
    convertToDirectImageUrl(shareLink) {
        // webContentLinkの場合はそのまま使用
        if (shareLink.includes('googleusercontent.com')) {
            return shareLink;
        }
        
        // webViewLinkの場合は直接アクセス用に変換
        if (shareLink.includes('/file/d/')) {
            const fileIdMatch = shareLink.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
            if (fileIdMatch) {
                return `https://drive.google.com/uc?id=${fileIdMatch[1]}`;
            }
        }
        
        return shareLink;
    }

    /**
     * 選択をクリア
     */
    clearSelection() {
        this.selectedFileId = null;
        this.selectedFileName = null;
        this.selectedFileInfo.style.display = 'none';
        this.modal.querySelector('#selectFile').disabled = true;
    }

    /**
     * パンくずを更新
     */
    updateBreadcrumb() {
        const breadcrumbHtml = this.currentPath.map((pathItem, index) => {
            const isLast = index === this.currentPath.length - 1;
            const icon = index === 0 ? '📂' : '📁';
            
            if (isLast) {
                return `<span class="breadcrumb-item current">${icon} ${this.escapeHtml(pathItem)}</span>`;
            } else {
                return `<span class="breadcrumb-item clickable" data-path-index="${index}">${icon} ${this.escapeHtml(pathItem)}</span>`;
            }
        }).join(' › ');

        this.breadcrumbEl.innerHTML = breadcrumbHtml;

        // パンくずクリックイベント
        this.breadcrumbEl.querySelectorAll('.breadcrumb-item.clickable').forEach(item => {
            item.addEventListener('click', async () => {
                const pathIndex = parseInt(item.dataset.pathIndex);
                await this.navigateToBreadcrumb(pathIndex);
            });
        });
    }

    /**
     * パンくずから移動
     */
    async navigateToBreadcrumb(pathIndex) {
        this.currentPath = this.currentPath.slice(0, pathIndex + 1);
        this.currentFolderId = pathIndex === 0 ? 'root' : 'root'; // 簡易実装
        this.clearSelection();
        await this.loadCurrentFolder();
    }

    /**
     * 表示モードを切り替え
     */
    switchView(viewType) {
        this.modal.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewType);
        });

        this.fileGridEl.setAttribute('data-view', viewType);
    }

    /**
     * ファイル数を更新
     */
    updateFileCount(count) {
        this.modal.querySelector('#fileCount').textContent = `${count}個の画像`;
    }

    /**
     * エラーを表示
     */
    showError(message) {
        alert(message);
    }

    /**
     * ファイル名を切り詰め
     */
    truncateFileName(filename, maxLength = 20) {
        if (filename.length <= maxLength) {
            return filename;
        }
        
        const ext = filename.substring(filename.lastIndexOf('.'));
        const name = filename.substring(0, filename.lastIndexOf('.'));
        const truncatedName = name.substring(0, maxLength - ext.length - 3) + '...';
        
        return truncatedName + ext;
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
     * モーダルを閉じる
     */
    close() {
        if (this.modal) {
            document.body.removeChild(this.modal);
            this.modal = null;
        }
    }
}

export default GoogleDriveExplorer;