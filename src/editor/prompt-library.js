/**
 * PromptLibrary - プロンプトライブラリ UI
 *
 * プロンプトテンプレートの管理と実行のためのUIコンポーネント
 */

export class PromptLibrary {
    constructor(promptManager) {
        this.promptManager = promptManager;
        this.modalElement = null;
        this.currentCategory = 'all';
        this.searchQuery = '';
        this.onExecuteCallback = null;
    }

    // ========================================
    // UI初期化
    // ========================================

    /**
     * プロンプトライブラリモーダルを表示
     * @param {Function} onExecute - プロンプト実行時のコールバック
     */
    async show(onExecute = null) {
        this.onExecuteCallback = onExecute;

        // 既存のモーダルを削除
        if (this.modalElement) {
            this.modalElement.remove();
        }

        // モーダルを作成
        this.modalElement = this.createModal();
        document.body.appendChild(this.modalElement);

        // イベントリスナーを設定
        this.setupEventListeners();

        // プロンプトを表示
        await this.renderPrompts();
    }

    /**
     * モーダルを非表示
     */
    hide() {
        if (this.modalElement) {
            this.modalElement.remove();
            this.modalElement = null;
        }
    }

    /**
     * モーダルHTML構造を作成
     * @returns {HTMLElement} モーダル要素
     */
    createModal() {
        const modal = document.createElement('div');
        modal.className = 'prompt-library-modal';
        modal.id = 'prompt-library-modal';

        modal.innerHTML = `
            <div class="prompt-library-overlay"></div>
            <div class="prompt-library-container">
                <div class="prompt-library-header">
                    <h3>📝 プロンプトライブラリ</h3>
                    <div class="header-actions">
                        <button class="btn-primary" id="new-prompt-btn">
                            <span class="icon">+</span>
                            <span>新規作成</span>
                        </button>
                        <button class="btn-icon" id="import-prompt-btn" title="インポート">
                            <span class="icon">📥</span>
                        </button>
                        <button class="btn-icon" id="export-prompt-btn" title="エクスポート">
                            <span class="icon">📤</span>
                        </button>
                        <button class="btn-close" id="close-prompt-library">×</button>
                    </div>
                </div>

                <div class="prompt-library-content">
                    <div class="prompt-sidebar">
                        <div class="sidebar-header">カテゴリー</div>
                        <ul class="category-list" id="category-list">
                            <li class="category-item active" data-category="all">
                                <span class="icon">📚</span>
                                <span>すべて</span>
                            </li>
                            <li class="category-item" data-category="favorites">
                                <span class="icon">⭐</span>
                                <span>お気に入り</span>
                            </li>
                            <li class="category-divider"></li>
                            <!-- カテゴリーはここに動的に追加 -->
                        </ul>
                    </div>

                    <div class="prompt-main">
                        <div class="prompt-search-bar">
                            <input
                                type="search"
                                id="prompt-search"
                                placeholder="プロンプトを検索..."
                                class="prompt-search-input"
                            >
                            <select id="sort-by" class="sort-select">
                                <option value="updated">更新日時</option>
                                <option value="name">名前順</option>
                                <option value="usage">使用回数</option>
                            </select>
                        </div>

                        <div class="prompt-grid" id="prompt-grid">
                            <!-- プロンプトカードはここに動的に追加 -->
                        </div>

                        <div class="prompt-empty" id="prompt-empty" style="display: none;">
                            <div class="empty-icon">📝</div>
                            <div class="empty-text">プロンプトが見つかりません</div>
                            <button class="btn-secondary" id="empty-new-prompt">新規作成</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return modal;
    }

    /**
     * イベントリスナーを設定
     */
    setupEventListeners() {
        // 閉じるボタン
        const closeBtn = this.modalElement.querySelector('#close-prompt-library');
        const overlay = this.modalElement.querySelector('.prompt-library-overlay');
        closeBtn.addEventListener('click', () => this.hide());
        overlay.addEventListener('click', () => this.hide());

        // 新規作成ボタン
        const newBtn = this.modalElement.querySelector('#new-prompt-btn');
        const emptyNewBtn = this.modalElement.querySelector('#empty-new-prompt');
        newBtn.addEventListener('click', () => this.showEditDialog(null));
        if (emptyNewBtn) {
            emptyNewBtn.addEventListener('click', () => this.showEditDialog(null));
        }

        // インポート/エクスポートボタン
        const importBtn = this.modalElement.querySelector('#import-prompt-btn');
        const exportBtn = this.modalElement.querySelector('#export-prompt-btn');
        importBtn.addEventListener('click', () => this.importPrompts());
        exportBtn.addEventListener('click', () => this.exportPrompts());

        // 検索
        const searchInput = this.modalElement.querySelector('#prompt-search');
        searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.renderPrompts();
        });

        // ソート
        const sortSelect = this.modalElement.querySelector('#sort-by');
        sortSelect.addEventListener('change', () => this.renderPrompts());

        // カテゴリークリック（delegated event）
        const categoryList = this.modalElement.querySelector('#category-list');
        categoryList.addEventListener('click', (e) => {
            const categoryItem = e.target.closest('.category-item');
            if (categoryItem) {
                // アクティブ状態を更新
                categoryList.querySelectorAll('.category-item').forEach(item => {
                    item.classList.remove('active');
                });
                categoryItem.classList.add('active');

                // カテゴリーを変更
                this.currentCategory = categoryItem.dataset.category;
                this.renderPrompts();
            }
        });
    }

    // ========================================
    // プロンプト表示
    // ========================================

    /**
     * プロンプトをレンダリング
     */
    async renderPrompts() {
        // カテゴリーを更新
        this.renderCategories();

        // プロンプトを取得
        const sortBy = this.modalElement.querySelector('#sort-by').value;
        const templates = this.promptManager.getAllTemplates({
            category: this.currentCategory === 'all' ? null :
                      this.currentCategory === 'favorites' ? null : this.currentCategory,
            favoritesOnly: this.currentCategory === 'favorites',
            query: this.searchQuery,
            sortBy: sortBy === 'updated' ? 'updatedAt' :
                    sortBy === 'name' ? 'name' : 'usageCount'
        });

        const grid = this.modalElement.querySelector('#prompt-grid');
        const empty = this.modalElement.querySelector('#prompt-empty');

        if (templates.length === 0) {
            grid.style.display = 'none';
            empty.style.display = 'flex';
        } else {
            grid.style.display = 'grid';
            empty.style.display = 'none';
            grid.innerHTML = templates.map(template => this.createPromptCard(template)).join('');

            // カードのイベントリスナーを設定
            this.setupCardEventListeners();
        }
    }

    /**
     * カテゴリーをレンダリング
     */
    renderCategories() {
        const categories = this.promptManager.getCategories();
        const categoryList = this.modalElement.querySelector('#category-list');

        // 既存のカテゴリー項目を削除（デフォルト項目は保持）
        const dynamicCategories = categoryList.querySelectorAll('.category-item[data-category]:not([data-category="all"]):not([data-category="favorites"])');
        dynamicCategories.forEach(item => item.remove());

        // 新しいカテゴリーを追加
        const divider = categoryList.querySelector('.category-divider');
        categories.forEach(category => {
            const li = document.createElement('li');
            li.className = 'category-item';
            li.dataset.category = category;
            li.innerHTML = `
                <span class="icon">${this.getCategoryIcon(category)}</span>
                <span>${category}</span>
            `;
            categoryList.insertBefore(li, divider.nextSibling);
        });
    }

    /**
     * カテゴリーアイコンを取得
     * @param {string} category - カテゴリー名
     * @returns {string} アイコン
     */
    getCategoryIcon(category) {
        const icons = {
            '執筆支援': '✍️',
            'コーディング': '💻',
            '翻訳': '🌐',
            'その他': '📌'
        };
        return icons[category] || '📁';
    }

    /**
     * プロンプトカードHTMLを作成
     * @param {object} template - プロンプトテンプレート
     * @returns {string} カードHTML
     */
    createPromptCard(template) {
        const lastUsed = template.lastUsed ? this.formatDate(new Date(template.lastUsed)) : '未使用';
        const favoriteClass = template.isFavorite ? 'favorite-active' : '';

        return `
            <div class="prompt-card" data-id="${template.id}">
                <div class="prompt-card-header">
                    <div class="prompt-category">${template.category}</div>
                    <button class="btn-favorite ${favoriteClass}" data-id="${template.id}">
                        ${template.isFavorite ? '⭐' : '☆'}
                    </button>
                </div>

                <div class="prompt-card-body">
                    <h4 class="prompt-title">${this.escapeHtml(template.name)}</h4>
                    <p class="prompt-description">${this.escapeHtml(template.description)}</p>

                    <div class="prompt-variables">
                        ${template.variables && template.variables.length > 0 ?
                            `<span class="variable-badge">変数: ${template.variables.length}個</span>` : ''
                        }
                    </div>
                </div>

                <div class="prompt-card-footer">
                    <div class="prompt-stats">
                        <span class="stat">使用: ${template.usageCount || 0}回</span>
                        <span class="stat">最終: ${lastUsed}</span>
                    </div>
                    <div class="prompt-actions">
                        <button class="btn-icon btn-execute" data-id="${template.id}" title="実行">
                            <span>▶</span>
                        </button>
                        <button class="btn-icon btn-edit" data-id="${template.id}" title="編集">
                            <span>✏️</span>
                        </button>
                        <button class="btn-icon btn-delete" data-id="${template.id}" title="削除">
                            <span>🗑️</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * カードのイベントリスナーを設定
     */
    setupCardEventListeners() {
        const grid = this.modalElement.querySelector('#prompt-grid');

        // 実行ボタン
        grid.querySelectorAll('.btn-execute').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                this.executePrompt(id);
            });
        });

        // 編集ボタン
        grid.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                this.showEditDialog(id);
            });
        });

        // 削除ボタン
        grid.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                this.deletePrompt(id);
            });
        });

        // お気に入りボタン
        grid.querySelectorAll('.btn-favorite').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                this.toggleFavorite(id);
            });
        });
    }

    // ========================================
    // プロンプト操作
    // ========================================

    /**
     * プロンプトを実行
     * @param {string} templateId - テンプレートID
     */
    async executePrompt(templateId) {
        const template = this.promptManager.getTemplate(templateId);
        if (!template) {
            this.showNotification('プロンプトが見つかりません', 'error');
            return;
        }

        // 変数があれば入力ダイアログを表示
        let variables = {};
        if (template.variables && template.variables.length > 0) {
            variables = await this.showVariableInputDialog(template);
            if (variables === null) {
                // キャンセルされた
                return;
            }
        }

        // プロンプトを生成
        const prompt = this.promptManager.applyTemplate(templateId, variables);

        // コールバック実行
        if (this.onExecuteCallback) {
            this.onExecuteCallback(prompt, template);
        }

        // モーダルを閉じる
        this.hide();
    }

    /**
     * プロンプトを削除
     * @param {string} templateId - テンプレートID
     */
    async deletePrompt(templateId) {
        const template = this.promptManager.getTemplate(templateId);
        if (!template) return;

        if (confirm(`「${template.name}」を削除しますか？`)) {
            await this.promptManager.deleteTemplate(templateId);
            this.showNotification('プロンプトを削除しました', 'success');
            await this.renderPrompts();
        }
    }

    /**
     * お気に入りをトグル
     * @param {string} templateId - テンプレートID
     */
    async toggleFavorite(templateId) {
        const template = this.promptManager.getTemplate(templateId);
        if (!template) return;

        await this.promptManager.updateTemplate(templateId, {
            isFavorite: !template.isFavorite
        });

        await this.renderPrompts();
    }

    // ========================================
    // 編集ダイアログ
    // ========================================

    /**
     * プロンプト編集ダイアログを表示
     * @param {string|null} templateId - テンプレートID（nullの場合は新規作成）
     */
    showEditDialog(templateId) {
        const template = templateId ? this.promptManager.getTemplate(templateId) : null;
        const isNew = !template;

        const dialog = document.createElement('div');
        dialog.className = 'prompt-edit-dialog';
        dialog.innerHTML = `
            <div class="dialog-overlay"></div>
            <div class="dialog-container">
                <div class="dialog-header">
                    <h3>${isNew ? '新規プロンプト作成' : 'プロンプト編集'}</h3>
                    <button class="btn-close" id="close-edit-dialog">×</button>
                </div>

                <div class="dialog-content">
                    <div class="form-group">
                        <label>プロンプト名 *</label>
                        <input type="text" id="edit-name" class="form-input"
                            value="${template ? this.escapeHtml(template.name) : ''}"
                            placeholder="例: ブログ記事作成">
                    </div>

                    <div class="form-group">
                        <label>説明</label>
                        <input type="text" id="edit-description" class="form-input"
                            value="${template ? this.escapeHtml(template.description) : ''}"
                            placeholder="プロンプトの説明">
                    </div>

                    <div class="form-group">
                        <label>カテゴリー *</label>
                        <select id="edit-category" class="form-select">
                            <option value="執筆支援" ${template?.category === '執筆支援' ? 'selected' : ''}>執筆支援</option>
                            <option value="コーディング" ${template?.category === 'コーディング' ? 'selected' : ''}>コーディング</option>
                            <option value="翻訳" ${template?.category === '翻訳' ? 'selected' : ''}>翻訳</option>
                            <option value="その他" ${template?.category === 'その他' ? 'selected' : ''}>その他</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>プロンプトテンプレート *</label>
                        <textarea id="edit-prompt" class="form-textarea" rows="8"
                            placeholder="プロンプトを入力... 変数は {{variable}} の形式で指定">${template ? this.escapeHtml(template.prompt) : ''}</textarea>
                        <div class="form-hint">変数を使う場合は {{変数名}} の形式で記述してください</div>
                    </div>

                    <div class="form-group">
                        <label>変数定義</label>
                        <div id="variables-list" class="variables-list">
                            <!-- 変数定義はここに表示 -->
                        </div>
                        <button class="btn-secondary" id="add-variable-btn">+ 変数を追加</button>
                    </div>
                </div>

                <div class="dialog-footer">
                    <button class="btn-secondary" id="cancel-edit">キャンセル</button>
                    <button class="btn-primary" id="save-prompt">${isNew ? '作成' : '保存'}</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // イベントリスナー
        const overlay = dialog.querySelector('.dialog-overlay');
        const closeBtn = dialog.querySelector('#close-edit-dialog');
        const cancelBtn = dialog.querySelector('#cancel-edit');
        const saveBtn = dialog.querySelector('#save-prompt');

        const close = () => dialog.remove();
        overlay.addEventListener('click', close);
        closeBtn.addEventListener('click', close);
        cancelBtn.addEventListener('click', close);

        saveBtn.addEventListener('click', async () => {
            const name = dialog.querySelector('#edit-name').value.trim();
            const description = dialog.querySelector('#edit-description').value.trim();
            const category = dialog.querySelector('#edit-category').value;
            const prompt = dialog.querySelector('#edit-prompt').value.trim();

            if (!name || !prompt) {
                this.showNotification('名前とプロンプトは必須です', 'error');
                return;
            }

            const data = {
                name,
                description,
                category,
                prompt,
                variables: [] // TODO: 変数定義の実装
            };

            try {
                if (isNew) {
                    await this.promptManager.createTemplate(data);
                    this.showNotification('プロンプトを作成しました', 'success');
                } else {
                    await this.promptManager.updateTemplate(templateId, data);
                    this.showNotification('プロンプトを更新しました', 'success');
                }

                close();
                await this.renderPrompts();
            } catch (error) {
                console.error('Failed to save prompt:', error);
                this.showNotification('保存に失敗しました', 'error');
            }
        });
    }

    // ========================================
    // 変数入力ダイアログ
    // ========================================

    /**
     * 変数入力ダイアログを表示
     * @param {object} template - プロンプトテンプレート
     * @returns {Promise<object|null>} 変数値のオブジェクト（キャンセル時はnull）
     */
    async showVariableInputDialog(template) {
        return new Promise((resolve) => {
            const dialog = document.createElement('div');
            dialog.className = 'variable-input-dialog';
            dialog.innerHTML = `
                <div class="dialog-overlay"></div>
                <div class="dialog-container">
                    <div class="dialog-header">
                        <h3>変数を入力</h3>
                        <div class="dialog-subtitle">${this.escapeHtml(template.name)}</div>
                    </div>

                    <div class="dialog-content">
                        <form id="variable-form">
                            ${template.variables.map(v => this.createVariableInput(v)).join('')}
                        </form>
                    </div>

                    <div class="dialog-footer">
                        <button class="btn-secondary" id="cancel-variables">キャンセル</button>
                        <button class="btn-primary" id="confirm-variables">実行</button>
                    </div>
                </div>
            `;

            document.body.appendChild(dialog);

            // イベントリスナー
            const cancelBtn = dialog.querySelector('#cancel-variables');
            const confirmBtn = dialog.querySelector('#confirm-variables');
            const form = dialog.querySelector('#variable-form');

            cancelBtn.addEventListener('click', () => {
                dialog.remove();
                resolve(null);
            });

            confirmBtn.addEventListener('click', () => {
                const values = {};
                template.variables.forEach(v => {
                    const input = form.querySelector(`[name="${v.name}"]`);
                    values[v.name] = input.value || v.defaultValue || '';
                });

                dialog.remove();
                resolve(values);
            });

            // Enterキーでsubmit防止
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                confirmBtn.click();
            });
        });
    }

    /**
     * 変数入力フィールドを作成
     * @param {object} variable - 変数定義
     * @returns {string} HTML
     */
    createVariableInput(variable) {
        const required = variable.required ? '*' : '';
        const defaultValue = variable.defaultValue || '';

        let inputHtml = '';

        switch (variable.type) {
            case 'textarea':
                inputHtml = `<textarea name="${variable.name}" class="form-textarea" rows="4"
                    ${variable.required ? 'required' : ''}>${defaultValue}</textarea>`;
                break;

            case 'number':
                inputHtml = `<input type="number" name="${variable.name}" class="form-input"
                    value="${defaultValue}" ${variable.required ? 'required' : ''}>`;
                break;

            case 'select':
                const options = variable.options || [];
                inputHtml = `<select name="${variable.name}" class="form-select"
                    ${variable.required ? 'required' : ''}>
                    ${options.map(opt =>
                        `<option value="${opt}" ${opt === defaultValue ? 'selected' : ''}>${opt}</option>`
                    ).join('')}
                </select>`;
                break;

            default: // text
                inputHtml = `<input type="text" name="${variable.name}" class="form-input"
                    value="${defaultValue}" ${variable.required ? 'required' : ''}>`;
                break;
        }

        return `
            <div class="form-group">
                <label>${this.escapeHtml(variable.description || variable.name)} ${required}</label>
                ${inputHtml}
            </div>
        `;
    }

    // ========================================
    // インポート/エクスポート
    // ========================================

    /**
     * プロンプトをエクスポート
     */
    async exportPrompts() {
        try {
            const json = this.promptManager.exportTemplates();
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `sightedit-prompts-${Date.now()}.json`;
            a.click();

            URL.revokeObjectURL(url);
            this.showNotification('プロンプトをエクスポートしました', 'success');
        } catch (error) {
            console.error('Failed to export prompts:', error);
            this.showNotification('エクスポートに失敗しました', 'error');
        }
    }

    /**
     * プロンプトをインポート
     */
    async importPrompts() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const result = await this.promptManager.importTemplates(text, true);

                this.showNotification(
                    `${result.imported}個のプロンプトをインポートしました（${result.skipped}個スキップ）`,
                    'success'
                );
                await this.renderPrompts();
            } catch (error) {
                console.error('Failed to import prompts:', error);
                this.showNotification('インポートに失敗しました', 'error');
            }
        });

        input.click();
    }

    // ========================================
    // ユーティリティ
    // ========================================

    /**
     * 日時をフォーマット
     * @param {Date} date - 日時
     * @returns {string} フォーマットされた日時
     */
    formatDate(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'たった今';
        if (minutes < 60) return `${minutes}分前`;
        if (hours < 24) return `${hours}時間前`;
        if (days < 7) return `${days}日前`;

        return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
    }

    /**
     * HTMLエスケープ
     * @param {string} text - テキスト
     * @returns {string} エスケープされたテキスト
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 通知を表示
     * @param {string} message - メッセージ
     * @param {string} type - 'info' | 'error' | 'success'
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4caf50' : '#2196f3'};
            color: white;
            border-radius: 4px;
            z-index: 100000;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}
