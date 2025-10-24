/**
 * StructuredGenerationModal - 構造化生成モーダル UI
 *
 * 構造化文書（ブログ、技術文書、プレゼン、論文）を
 * ステップバイステップで生成するUIを提供します。
 */

export class StructuredGenerationModal {
    constructor(structuredGenerator, chatManager) {
        this.structuredGenerator = structuredGenerator;
        this.chatManager = chatManager;
        this.modal = null;
        this.currentTemplate = null;
        this.variables = {};
        this.generatedSections = [];
        this.sectionContents = {};
    }

    /**
     * モーダルを表示
     */
    show() {
        if (this.modal) {
            this.modal.remove();
        }

        this.modal = this.createModal();
        document.body.appendChild(this.modal);

        this.showTemplateSelection();
    }

    /**
     * モーダルを閉じる
     */
    hide() {
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }

        // 状態をリセット
        this.currentTemplate = null;
        this.variables = {};
        this.generatedSections = [];
        this.sectionContents = {};
    }

    /**
     * モーダル要素を作成
     */
    createModal() {
        const modal = document.createElement('div');
        modal.className = 'structured-gen-modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-container">
                <div class="modal-header">
                    <h3>📋 構造化文書生成</h3>
                    <button class="btn-icon close-modal" title="閉じる">×</button>
                </div>
                <div class="modal-content" id="structured-gen-content">
                    <!-- コンテンツはJSで動的に生成 -->
                </div>
            </div>
        `;

        // イベントリスナー
        const closeBtn = modal.querySelector('.close-modal');
        const overlay = modal.querySelector('.modal-overlay');

        closeBtn.addEventListener('click', () => this.hide());
        overlay.addEventListener('click', () => this.hide());

        return modal;
    }

    /**
     * テンプレート選択画面を表示
     */
    showTemplateSelection() {
        const templates = this.structuredGenerator.getAvailableTemplates();

        const content = this.modal.querySelector('#structured-gen-content');
        content.innerHTML = `
            <div class="template-selection">
                <h4>文書の種類を選択してください</h4>
                <div class="template-grid">
                    ${templates.map(template => `
                        <div class="template-card" data-template-id="${template.id}">
                            <div class="template-icon">${template.icon}</div>
                            <h5>${template.name}</h5>
                            <p>${template.description}</p>
                            <div class="template-meta">
                                <span>${template.sectionCount}セクション</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        // テンプレートカードのクリックイベント
        const cards = content.querySelectorAll('.template-card');
        cards.forEach(card => {
            card.addEventListener('click', () => {
                const templateId = card.getAttribute('data-template-id');
                this.selectTemplate(templateId);
            });
        });
    }

    /**
     * テンプレートを選択
     */
    selectTemplate(templateId) {
        this.currentTemplate = this.structuredGenerator.getTemplate(templateId);
        if (!this.currentTemplate) {
            alert('テンプレートが見つかりません');
            return;
        }

        // デフォルト変数をコピー
        this.variables = { ...this.currentTemplate.defaultVariables };

        this.showVariableInput();
    }

    /**
     * 変数入力画面を表示
     */
    showVariableInput() {
        const content = this.modal.querySelector('#structured-gen-content');

        // テンプレートから必要な変数を収集
        const requiredVars = new Set();
        this.currentTemplate.sections.forEach(section => {
            section.variables.forEach(v => requiredVars.add(v));
        });

        const varsArray = Array.from(requiredVars);

        content.innerHTML = `
            <div class="variable-input-step">
                <div class="step-header">
                    <button class="btn-secondary back-btn">← 戻る</button>
                    <h4>${this.currentTemplate.icon} ${this.currentTemplate.name} - 基本情報入力</h4>
                </div>
                <div class="variable-form">
                    ${varsArray.map(varName => this.createVariableInput(varName)).join('')}
                </div>
                <div class="step-footer">
                    <button class="btn-secondary" id="cancel-btn">キャンセル</button>
                    <button class="btn-primary" id="next-btn">次へ →</button>
                </div>
            </div>
        `;

        // イベントリスナー
        const backBtn = content.querySelector('.back-btn');
        const cancelBtn = content.querySelector('#cancel-btn');
        const nextBtn = content.querySelector('#next-btn');

        backBtn.addEventListener('click', () => this.showTemplateSelection());
        cancelBtn.addEventListener('click', () => this.hide());
        nextBtn.addEventListener('click', () => {
            this.collectVariables();
            this.showGenerationMode();
        });
    }

    /**
     * 変数入力フォームを作成
     */
    createVariableInput(varName) {
        const currentValue = this.variables[varName] || '';
        const label = this.getVariableLabel(varName);

        return `
            <div class="form-group">
                <label class="form-label">${label}</label>
                <input type="text"
                       class="form-control"
                       name="${varName}"
                       value="${this.escapeHtml(currentValue)}"
                       placeholder="${label}を入力">
            </div>
        `;
    }

    /**
     * 変数名からラベルを生成
     */
    getVariableLabel(varName) {
        const labels = {
            'topic': 'トピック/テーマ',
            'title': 'タイトル',
            'audience': '対象読者',
            'keywords': 'キーワード',
            'sections': 'セクション数',
            'word_count': '目標文字数',
            'intro': '導入部',
            'main_content_summary': '本文の要約',
            'tech_name': '技術名',
            'purpose': '目的',
            'environment': '環境',
            'main_features': '主な機能',
            'theme': 'テーマ',
            'duration': '想定時間（分）',
            'qa_count': 'Q&A数',
            'agenda': 'アジェンダ',
            'methodology': '研究手法',
            'findings': '主な発見',
            'significance': '研究の意義',
            'data_description': 'データの説明',
            'results_summary': '結果の要約'
        };

        return labels[varName] || varName;
    }

    /**
     * フォームから変数を収集
     */
    collectVariables() {
        const form = this.modal.querySelector('.variable-form');
        const inputs = form.querySelectorAll('input, textarea, select');

        inputs.forEach(input => {
            this.variables[input.name] = input.value;
        });
    }

    /**
     * 生成モード選択画面を表示
     */
    showGenerationMode() {
        const content = this.modal.querySelector('#structured-gen-content');

        content.innerHTML = `
            <div class="generation-mode-step">
                <div class="step-header">
                    <button class="btn-secondary back-btn">← 戻る</button>
                    <h4>生成方法を選択</h4>
                </div>
                <div class="mode-selection">
                    <div class="mode-card" data-mode="section-by-section">
                        <div class="mode-icon">🔢</div>
                        <h5>セクション別生成</h5>
                        <p>各セクションを順番に生成し、確認しながら進めます。細かく制御したい場合に最適です。</p>
                        <button class="btn-primary select-mode-btn">この方法で生成</button>
                    </div>
                    <div class="mode-card" data-mode="full-document">
                        <div class="mode-icon">📄</div>
                        <h5>一括生成</h5>
                        <p>すべてのセクションを一度に生成します。素早く全体を作成したい場合に最適です。</p>
                        <button class="btn-primary select-mode-btn">この方法で生成</button>
                    </div>
                </div>
            </div>
        `;

        // イベントリスナー
        const backBtn = content.querySelector('.back-btn');
        const modeCards = content.querySelectorAll('.mode-card');

        backBtn.addEventListener('click', () => this.showVariableInput());

        modeCards.forEach(card => {
            const btn = card.querySelector('.select-mode-btn');
            const mode = card.getAttribute('data-mode');

            btn.addEventListener('click', () => {
                if (mode === 'section-by-section') {
                    this.startSectionBySection();
                } else {
                    this.startFullDocument();
                }
            });
        });
    }

    /**
     * セクション別生成を開始
     */
    startSectionBySection() {
        this.showSectionGeneration();
    }

    /**
     * セクション生成画面を表示
     */
    showSectionGeneration() {
        const availableSections = this.structuredGenerator.getNextAvailableSections(
            this.currentTemplate.id,
            this.generatedSections
        );

        if (availableSections.length === 0) {
            this.showCompletionScreen();
            return;
        }

        const content = this.modal.querySelector('#structured-gen-content');

        content.innerHTML = `
            <div class="section-generation-step">
                <div class="step-header">
                    <h4>${this.currentTemplate.icon} ${this.currentTemplate.name}</h4>
                    <div class="progress">
                        <span>${this.generatedSections.length} / ${this.currentTemplate.sections.length} セクション完了</span>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${(this.generatedSections.length / this.currentTemplate.sections.length) * 100}%"></div>
                        </div>
                    </div>
                </div>
                <div class="section-list">
                    <h5>次に生成可能なセクション:</h5>
                    ${availableSections.map(section => `
                        <div class="section-item" data-section-id="${section.id}">
                            <div class="section-info">
                                <h6>${section.name}</h6>
                                <p>${section.description}</p>
                            </div>
                            <button class="btn-primary generate-section-btn">生成 →</button>
                        </div>
                    `).join('')}
                </div>
                <div class="generated-sections">
                    <h5>生成済みセクション:</h5>
                    ${this.generatedSections.length === 0 ? '<p class="empty-message">まだ生成されていません</p>' : ''}
                    ${this.generatedSections.map(sectionId => {
                        const section = this.currentTemplate.sections.find(s => s.id === sectionId);
                        return `
                            <div class="completed-section">
                                <div class="section-header">
                                    <span>✅ ${section.name}</span>
                                    <button class="btn-link view-section-btn" data-section-id="${sectionId}">表示</button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="step-footer">
                    <button class="btn-secondary" id="cancel-btn">キャンセル</button>
                    ${this.generatedSections.length > 0 ? '<button class="btn-primary" id="finish-btn">完了</button>' : ''}
                </div>
            </div>
        `;

        // イベントリスナー
        const generateBtns = content.querySelectorAll('.generate-section-btn');
        const viewBtns = content.querySelectorAll('.view-section-btn');
        const cancelBtn = content.querySelector('#cancel-btn');
        const finishBtn = content.querySelector('#finish-btn');

        generateBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sectionItem = e.target.closest('.section-item');
                const sectionId = sectionItem.getAttribute('data-section-id');
                this.generateSection(sectionId);
            });
        });

        viewBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sectionId = e.target.getAttribute('data-section-id');
                this.viewSection(sectionId);
            });
        });

        cancelBtn.addEventListener('click', () => this.hide());

        if (finishBtn) {
            finishBtn.addEventListener('click', () => this.showCompletionScreen());
        }
    }

    /**
     * セクションを生成
     */
    async generateSection(sectionId) {
        const section = this.currentTemplate.sections.find(s => s.id === sectionId);
        if (!section) return;

        // 変数を更新（生成済みセクションの内容を含める）
        const vars = {
            ...this.variables,
            ...this.sectionContents
        };

        // プロンプトを生成
        const prompt = this.structuredGenerator.generateSectionPrompt(
            this.currentTemplate.id,
            sectionId,
            vars
        );

        // モーダルを閉じてチャットで生成
        this.hide();

        // チャットにメッセージを送信（chatManagerを使用）
        if (this.chatManager && this.chatManager.sendMessageWithStreaming) {
            let generatedContent = '';

            await this.chatManager.sendMessageWithStreaming(
                prompt,
                { includeContext: false, contextType: 'none' },
                (chunk) => {
                    generatedContent += chunk;
                },
                (fullResponse) => {
                    // 生成完了時、セクション内容を保存
                    this.sectionContents[sectionId] = fullResponse;
                    this.generatedSections.push(sectionId);

                    // 変数を更新（次のセクションで使用できるように）
                    this.variables[sectionId] = fullResponse;

                    // 通知を表示
                    this.showNotification(`セクション「${section.name}」を生成しました`, 'success');

                    // 次のセクションの生成を促す
                    setTimeout(() => {
                        if (confirm('次のセクションの生成に進みますか？')) {
                            this.show();
                            this.showSectionGeneration();
                        }
                    }, 1000);
                },
                (error) => {
                    console.error('Section generation error:', error);
                    alert(`セクションの生成に失敗しました: ${error.message}`);
                }
            );
        }
    }

    /**
     * セクション内容を表示
     */
    viewSection(sectionId) {
        const section = this.currentTemplate.sections.find(s => s.id === sectionId);
        const content = this.sectionContents[sectionId] || '';

        if (!content) {
            alert('セクション内容が見つかりません');
            return;
        }

        const viewModal = document.createElement('div');
        viewModal.className = 'section-view-modal';
        viewModal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-container">
                <div class="modal-header">
                    <h3>${section.name}</h3>
                    <button class="btn-icon close-modal">×</button>
                </div>
                <div class="modal-content">
                    <div class="section-content">${this.escapeHtml(content)}</div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary close-btn">閉じる</button>
                </div>
            </div>
        `;

        document.body.appendChild(viewModal);

        const closeBtn = viewModal.querySelector('.close-modal');
        const closeBtn2 = viewModal.querySelector('.close-btn');
        const overlay = viewModal.querySelector('.modal-overlay');

        const closeModal = () => viewModal.remove();
        closeBtn.addEventListener('click', closeModal);
        closeBtn2.addEventListener('click', closeModal);
        overlay.addEventListener('click', closeModal);
    }

    /**
     * 一括生成を開始
     */
    async startFullDocument() {
        const prompt = this.structuredGenerator.generateFullDocumentPrompt(
            this.currentTemplate.id,
            this.variables
        );

        // モーダルを閉じてチャットで生成
        this.hide();

        if (this.chatManager && this.chatManager.sendMessageWithStreaming) {
            await this.chatManager.sendMessageWithStreaming(
                prompt,
                { includeContext: false, contextType: 'none' },
                (chunk) => {
                    // ストリーミング中
                },
                (fullResponse) => {
                    this.showNotification('文書の生成が完了しました', 'success');
                },
                (error) => {
                    console.error('Full document generation error:', error);
                    alert(`文書の生成に失敗しました: ${error.message}`);
                }
            );
        }
    }

    /**
     * 完了画面を表示
     */
    showCompletionScreen() {
        const content = this.modal.querySelector('#structured-gen-content');

        content.innerHTML = `
            <div class="completion-screen">
                <div class="completion-icon">✅</div>
                <h4>文書の生成が完了しました！</h4>
                <p>${this.currentTemplate.name}のすべてのセクションが生成されました。</p>
                <div class="completion-stats">
                    <div class="stat">
                        <span class="stat-value">${this.generatedSections.length}</span>
                        <span class="stat-label">セクション</span>
                    </div>
                </div>
                <div class="completion-actions">
                    <button class="btn-secondary" id="close-btn">閉じる</button>
                    <button class="btn-primary" id="new-doc-btn">新しい文書を作成</button>
                </div>
            </div>
        `;

        const closeBtn = content.querySelector('#close-btn');
        const newDocBtn = content.querySelector('#new-doc-btn');

        closeBtn.addEventListener('click', () => this.hide());
        newDocBtn.addEventListener('click', () => {
            this.generatedSections = [];
            this.sectionContents = {};
            this.variables = {};
            this.currentTemplate = null;
            this.showTemplateSelection();
        });
    }

    /**
     * 通知を表示
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
            z-index: 10001;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
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
}
