// Chrome Extension用のAI管理クラス
import { marked } from 'marked';

export class AIManager {
    constructor() {
        this.settings = {
            geminiApiKey: '',
            claudeApiKey: '',
            aiProvider: 'gemini',
            selectedModel: 'gemini-2.5-pro'
        };

        // AI モデル設定
        this.aiModels = {
            gemini: {
                'gemini-2.0-flash-exp': {
                    name: 'Gemini 2.0 Flash (実験版・最新・無料枠あり)',
                    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
                    maxTokens: 8192
                },
                'gemini-2.0-flash': {
                    name: 'Gemini 2.0 Flash (無料枠あり)',
                    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
                    maxTokens: 8192
                },
                'gemini-2.5-pro': {
                    name: 'Gemini 2.5 Pro (無料枠あり・推奨)',
                    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent',
                    maxTokens: 8192
                },
                'gemini-1.5-flash': {
                    name: 'Gemini 1.5 Flash (無料枠あり・高速)',
                    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
                    maxTokens: 8192
                },
                'gemini-1.5-pro': {
                    name: 'Gemini 1.5 Pro (無料枠あり)',
                    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent',
                    maxTokens: 8192
                }
            },
            claude: {
                'claude-sonnet-4-5-20250929': {
                    name: 'Claude Sonnet 4.5 (最新・2025年9月版)',
                    endpoint: 'https://api.anthropic.com/v1/messages',
                    maxTokens: 8192
                },
                'claude-haiku-4-5-20251015': {
                    name: 'Claude Haiku 4.5 (最新・高速・2025年10月版)',
                    endpoint: 'https://api.anthropic.com/v1/messages',
                    maxTokens: 64000
                },
                'claude-opus-4-1-20250801': {
                    name: 'Claude Opus 4.1 (高性能・2025年8月版)',
                    endpoint: 'https://api.anthropic.com/v1/messages',
                    maxTokens: 8192
                },
                'claude-3-5-sonnet-20241022': {
                    name: 'Claude 3.5 Sonnet (2024年10月版)',
                    endpoint: 'https://api.anthropic.com/v1/messages',
                    maxTokens: 8192
                },
                'claude-3-5-haiku-20241022': {
                    name: 'Claude 3.5 Haiku (高速・2024年10月版)',
                    endpoint: 'https://api.anthropic.com/v1/messages',
                    maxTokens: 8192
                }
            }
        };
    }

    async loadSettings() {
        try {
            // Chrome Storage APIから設定を読み込み（AI設定ダイアログ用）
            const result = await this.getChromeStorageSettings();
            if (result) {
                this.settings = { ...this.settings, ...result };
            }

            // selectedModelが設定されていない場合や、現在のプロバイダーに対応していない場合はデフォルトを設定
            if (!this.settings.selectedModel || !this.aiModels[this.settings.aiProvider][this.settings.selectedModel]) {
                this.settings.selectedModel = this.settings.aiProvider === 'gemini' ? 'gemini-2.5-pro' : 'claude-sonnet-4-5-20250929';
            }

            this.updateAIButton();
        } catch (error) {
            console.error('AI設定の読み込みに失敗:', error);
        }
    }

    async getChromeStorageSettings() {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            return new Promise((resolve) => {
                chrome.storage.sync.get(['geminiApiKey', 'geminiModel', 'claudeApiKey', 'claudeModel'], (result) => {
                    const settings = {};
                    
                    if (result.geminiApiKey) {
                        settings.geminiApiKey = result.geminiApiKey;
                    }
                    if (result.claudeApiKey) {
                        settings.claudeApiKey = result.claudeApiKey;
                    }
                    
                    // プロバイダーの判定
                    if (result.geminiApiKey && !result.claudeApiKey) {
                        settings.aiProvider = 'gemini';
                        settings.selectedModel = result.geminiModel || 'gemini-2.5-pro';
                    } else if (!result.geminiApiKey && result.claudeApiKey) {
                        settings.aiProvider = 'claude';
                        settings.selectedModel = result.claudeModel || 'claude-sonnet-4-5-20250929';
                    } else if (result.geminiApiKey && result.claudeApiKey) {
                        // 両方設定されている場合はGeminiを優先（デフォルト）
                        settings.aiProvider = 'gemini';
                        settings.selectedModel = result.geminiModel || 'gemini-2.5-pro';
                    }
                    
                    resolve(settings);
                });
            });
        }
        return null;
    }

    async saveSettings(externalSettings = null) {
        try {
            // 外部から設定が渡された場合は、それで内部設定を更新
            if (externalSettings) {
                this.settings = {
                    ...this.settings,
                    aiProvider: externalSettings.aiProvider || this.settings.aiProvider,
                    selectedModel: externalSettings.selectedModel || this.settings.selectedModel,
                    geminiApiKey: externalSettings.geminiApiKey || this.settings.geminiApiKey,
                    claudeApiKey: externalSettings.claudeApiKey || this.settings.claudeApiKey
                };

                // selectedModelが新しいプロバイダーに対応していない場合はデフォルトを設定
                if (!this.aiModels[this.settings.aiProvider][this.settings.selectedModel]) {
                    this.settings.selectedModel = this.settings.aiProvider === 'gemini' ? 'gemini-2.5-pro' : 'claude-sonnet-4-5-20250929';
                }
            }

            await chrome.storage.local.set({ aiSettings: this.settings });
            this.updateAIButton();
        } catch (error) {
            console.error('AI設定の保存に失敗:', error);
        }
    }

    updateAIButton() {
        // AI表示ボタンは削除されたため、この機能は無効化
        // 設定は正常に保存・読み込みされるが、UIの更新は行わない
        console.log('AI設定更新:', { 
            provider: this.settings.aiProvider, 
            selectedModel: this.settings.selectedModel,
            hasGeminiKey: !!this.settings.geminiApiKey,
            hasClaudeKey: !!this.settings.claudeApiKey
        });
    }

    getCurrentModel() {
        const provider = this.settings.aiProvider;
        const modelId = this.settings.selectedModel;

        if (this.aiModels[provider] && this.aiModels[provider][modelId]) {
            return this.aiModels[provider][modelId];
        }

        // デフォルト
        return this.aiModels.gemini['gemini-2.5-pro'];
    }

    getShortModelName(fullName) {
        // モデル名を短縮して表示用にする
        const shortNames = {
            'Gemini 2.0 Flash (実験版・最新・無料枠あり)': '2.0 Flash実験',
            'Gemini 2.0 Flash (無料枠あり)': '2.0 Flash',
            'Gemini 2.5 Pro (無料枠あり・推奨)': '2.5 Pro',
            'Gemini 1.5 Flash (無料枠あり・高速)': '1.5 Flash',
            'Gemini 1.5 Pro (無料枠あり)': '1.5 Pro',
            'Claude Sonnet 4.5 (最新・2025年9月版)': 'Sonnet 4.5',
            'Claude Haiku 4.5 (最新・高速・2025年10月版)': 'Haiku 4.5',
            'Claude Opus 4.1 (高性能・2025年8月版)': 'Opus 4.1',
            'Claude 3.5 Sonnet (2024年10月版)': '3.5 Sonnet',
            'Claude 3.5 Haiku (高速・2024年10月版)': '3.5 Haiku'
        };

        return shortNames[fullName] || fullName;
    }

    getModelPricing(provider, modelId) {
        const pricingInfo = {
            gemini: {
                'gemini-2.0-flash-exp': '無料枠あり（実験版）',
                'gemini-2.0-flash': '無料枠あり',
                'gemini-2.5-pro': '無料枠あり・推奨',
                'gemini-1.5-flash': '無料枠あり・高速',
                'gemini-1.5-pro': '無料枠あり'
            },
            claude: {
                'claude-sonnet-4-5-20250929': '$3/$15 per 1M tokens',
                'claude-haiku-4-5-20251015': '$1/$5 per 1M tokens',
                'claude-opus-4-1-20250801': '$15/$75 per 1M tokens',
                'claude-3-5-sonnet-20241022': '$3/$15 per 1M tokens',
                'claude-3-5-haiku-20241022': '$1/$5 per 1M tokens'
            }
        };

        return pricingInfo[provider]?.[modelId] || '料金情報不明';
    }

    showSettings() {
        const existingModal = document.querySelector('.ai-settings-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.className = 'ai-settings-modal';
        modal.innerHTML = `
            <div class="ai-settings-panel">
                <div class="ai-settings-header">
                    <h3>AI設定</h3>
                    <button class="close-btn" data-action="close">×</button>
                </div>
                <div class="ai-settings-content">
                    <div class="ai-provider-section">
                        <label>AIプロバイダー:</label>
                        <select id="ai-provider-select">
                            <option value="gemini" ${this.settings.aiProvider === 'gemini' ? 'selected' : ''}>Google Gemini</option>
                            <option value="claude" ${this.settings.aiProvider === 'claude' ? 'selected' : ''}>Anthropic Claude</option>
                        </select>
                    </div>

                    <div class="ai-model-section">
                        <label>モデル:</label>
                        <select id="ai-model-select">
                            ${this.generateModelOptions()}
                        </select>
                    </div>

                    <div class="api-key-section" id="gemini-section" style="display: ${this.settings.aiProvider === 'gemini' ? 'block' : 'none'}">
                        <label>Gemini API キー:</label>
                        <input type="password" id="gemini-api-key" value="${this.settings.geminiApiKey}" placeholder="AIza...で始まるAPIキー">
                        <small>
                            <a href="https://aistudio.google.com/app/apikey" target="_blank">Google AI Studioで取得</a>
                        </small>
                    </div>

                    <div class="api-key-section" id="claude-section" style="display: ${this.settings.aiProvider === 'claude' ? 'block' : 'none'}">
                        <label>Claude API キー:</label>
                        <input type="password" id="claude-api-key" value="${this.settings.claudeApiKey}" placeholder="sk-ant-...で始まるAPIキー">
                        <small>
                            <a href="https://console.anthropic.com/account/keys" target="_blank">Anthropic Consoleで取得</a>
                        </small>
                    </div>
                </div>
                <div class="ai-settings-actions">
                    <button class="btn secondary" data-action="cancel">キャンセル</button>
                    <button class="btn primary" data-action="save">保存</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // イベントリスナー
        modal.querySelector('[data-action="close"]').addEventListener('click', () => modal.remove());
        modal.querySelector('[data-action="cancel"]').addEventListener('click', () => modal.remove());
        modal.querySelector('[data-action="save"]').addEventListener('click', () => this.saveSettingsFromModal(modal));

        // プロバイダー変更時の処理
        const providerSelect = modal.querySelector('#ai-provider-select');
        providerSelect.addEventListener('change', (e) => {
            this.updateProviderSections(modal, e.target.value);
            this.updateModelSelect(modal, e.target.value);
        });

        // モーダル外クリックで閉じる
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    generateModelOptions() {
        const provider = this.settings.aiProvider;
        const models = this.aiModels[provider] || {};

        // 現在選択されているモデルが現在のプロバイダーにない場合はデフォルトを使用
        const currentSelectedModel = models[this.settings.selectedModel] ?
            this.settings.selectedModel :
            (provider === 'gemini' ? 'gemini-2.5-pro' : 'claude-sonnet-4-5-20250929');

        return Object.entries(models).map(([id, model]) =>
            `<option value="${id}" ${currentSelectedModel === id ? 'selected' : ''}>${model.name}</option>`
        ).join('');
    }

    updateProviderSections(modal, provider) {
        const geminiSection = modal.querySelector('#gemini-section');
        const claudeSection = modal.querySelector('#claude-section');

        geminiSection.style.display = provider === 'gemini' ? 'block' : 'none';
        claudeSection.style.display = provider === 'claude' ? 'block' : 'none';
    }

    updateModelSelect(modal, provider) {
        const modelSelect = modal.querySelector('#ai-model-select');
        const models = this.aiModels[provider] || {};

        modelSelect.innerHTML = Object.entries(models).map(([id, model]) =>
            `<option value="${id}">${model.name}</option>`
        ).join('');

        // 現在の設定プロバイダーと一致する場合は現在のモデルを選択、そうでなければデフォルト
        let selectedModel;
        if (provider === this.settings.aiProvider && this.settings.selectedModel && models[this.settings.selectedModel]) {
            selectedModel = this.settings.selectedModel;
        } else {
            selectedModel = provider === 'gemini' ? 'gemini-2.5-pro' : 'claude-sonnet-4-5-20250929';
        }

        modelSelect.value = selectedModel;
    }

    async saveSettingsFromModal(modal) {
        const provider = modal.querySelector('#ai-provider-select').value;
        const model = modal.querySelector('#ai-model-select').value;
        const geminiKey = modal.querySelector('#gemini-api-key').value.trim();
        const claudeKey = modal.querySelector('#claude-api-key').value.trim();

        // APIキーの検証
        if (provider === 'gemini' && !geminiKey) {
            alert('Gemini APIキーを入力してください');
            return;
        }
        if (provider === 'claude' && !claudeKey) {
            alert('Claude APIキーを入力してください');
            return;
        }

        this.settings.aiProvider = provider;
        this.settings.selectedModel = model;
        this.settings.geminiApiKey = geminiKey;
        this.settings.claudeApiKey = claudeKey;

        await this.saveSettings();
        modal.remove();
        alert('設定を保存しました');
    }

    // AI機能の実行
    async processAI(aiFunction, option = null) {
        // AI設定機能の場合
        if (aiFunction === 'settings') {
            this.showSettings();
            return;
        }

        // APIキーの確認
        const provider = this.settings.aiProvider;
        const apiKey = provider === 'gemini' ? this.settings.geminiApiKey : this.settings.claudeApiKey;

        if (!apiKey) {
            alert('AIを使用するにはAPIキーの設定が必要です');
            this.showSettings();
            return;
        }

        // カスタム命令の場合
        if (aiFunction === 'custom') {
            const customPrompt = prompt('AIに対するカスタム命令を入力してください:');
            if (!customPrompt) return;

            const selectedText = this.getSelectedText();
            const fullPrompt = selectedText ?
                `${customPrompt}\n\n対象テキスト:\n${selectedText}` :
                customPrompt;

            await this.callAI(fullPrompt);
            return;
        }

        // 選択テキストの確認
        const selectedText = this.getSelectedText();
        if (!selectedText) {
            alert('テキストを選択してください');
            return;
        }

        // AIプロンプトの構築
        const prompt = this.buildPrompt(aiFunction, selectedText, option);
        await this.callAI(prompt);
    }

    getSelectedText() {
        // TipTapエディターから選択テキストを取得
        if (window.editorManager && window.editorManager.editor) {
            const { from, to } = window.editorManager.editor.state.selection;
            const selectedText = window.editorManager.editor.state.doc.textBetween(from, to, ' ');
            if (selectedText) return selectedText;
        }

        // 通常の選択テキスト
        const selection = window.getSelection();
        return selection ? selection.toString() : '';
    }

    buildPrompt(aiFunction, text, option) {
        const prompts = {
            // 要約機能
            'summarize': {
                'short': `以下のテキストを50-100文字で要約してください：\n\n${text}`,
                'normal': `以下のテキストを100-200文字で要約してください：\n\n${text}`,
                'long': `以下のテキストを200-400文字で詳しく要約してください：\n\n${text}`,
                'default': `以下のテキストを要約してください：\n\n${text}`
            },

            // 校正機能
            'proofread': `以下のテキストの誤字脱字、文法、表現を校正してください：\n\n${text}`,

            // 翻訳機能
            'translate': {
                'en': `以下の日本語テキストを自然な英語に翻訳してください：\n\n${text}`,
                'ja': `以下の英語テキストを自然な日本語に翻訳してください：\n\n${text}`,
                'default': `以下のテキストを適切な言語に翻訳してください：\n\n${text}`
            },

            // タイトル生成
            'generate-title': `以下のテキストに適したタイトルを5個提案してください：\n\n${text}`,

            // 見出し生成
            'generate-heading': `以下のテキストに適した見出しを生成してください：\n\n${text}`,

            // キーワード抽出
            'extract-keywords': `以下のテキストから重要なキーワードを抽出してください：\n\n${text}`,

            // 文体変換
            'convert-style': {
                'formal': `以下のテキストを丁寧語・敬語を使った文体に変換してください：\n\n${text}`,
                'casual': `以下のテキストをカジュアルな文体に変換してください：\n\n${text}`,
                'default': `以下のテキストの文体を変換してください：\n\n${text}`
            }
        };

        if (typeof prompts[aiFunction] === 'object') {
            return prompts[aiFunction][option] || prompts[aiFunction]['default'];
        }

        return prompts[aiFunction] || `以下のテキストを処理してください：\n\n${text}`;
    }

    async callAI(prompt) {
        const provider = this.settings.aiProvider;
        const providerName = provider === 'gemini' ? 'Google Gemini' : 'Anthropic Claude';
        const loadingElement = this.showLoading(`${providerName}で処理中...`);

        try {
            let response;
            if (provider === 'gemini') {
                response = await this.callGemini(prompt);
            } else if (provider === 'claude') {
                response = await this.callClaude(prompt);
            } else {
                throw new Error('サポートされていないAIプロバイダーです');
            }

            this.hideLoading(loadingElement);
            this.showResult(response, providerName);
        } catch (error) {
            this.hideLoading(loadingElement);
            this.showError(error, providerName);
        }
    }

    async callGemini(prompt) {
        const model = this.getCurrentModel();
        const apiKey = this.settings.geminiApiKey;

        const requestBody = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: model.maxTokens,
            }
        };

        let response;
        try {
            response = await fetch(`${model.endpoint}?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });
        } catch (error) {
            throw new Error(`接続エラー: Gemini APIに接続できませんでした。ネットワーク接続を確認してください。`);
        }

        if (!response.ok) {
            const errorText = await response.text();
            if (response.status === 401) {
                throw new Error(`認証エラー: Gemini APIキーが無効です。設定を確認してください。`);
            } else if (response.status === 429) {
                throw new Error(`レート制限エラー: Gemini APIの使用量制限に達しました。しばらく待ってから再試行してください。`);
            } else {
                throw new Error(`Gemini APIエラー (${response.status}): ${errorText}`);
            }
        }

        const data = await response.json();

        if (data.candidates && data.candidates[0]) {
            const candidate = data.candidates[0];
            if (candidate.content && candidate.content.parts && candidate.content.parts[0]) {
                return candidate.content.parts[0].text;
            }
        }

        throw new Error('Gemini APIからの応答が空です');
    }

    async callClaude(prompt) {
        const model = this.getCurrentModel();
        const apiKey = this.settings.claudeApiKey;

        const requestBody = {
            model: this.settings.selectedModel,
            max_tokens: model.maxTokens,
            messages: [{
                role: 'user',
                content: prompt
            }]
        };

        let response;
        try {
            response = await fetch(model.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify(requestBody)
            });
        } catch (error) {
            throw new Error(`接続エラー: Claude APIに接続できませんでした。ネットワーク接続を確認してください。`);
        }

        if (!response.ok) {
            const errorText = await response.text();
            if (response.status === 401) {
                throw new Error(`認証エラー: Claude APIキーが無効です。設定を確認してください。`);
            } else if (response.status === 429) {
                throw new Error(`レート制限エラー: Claude APIの使用量制限に達しました。しばらく待ってから再試行してください。`);
            } else {
                throw new Error(`Claude APIエラー (${response.status}): ${errorText}`);
            }
        }

        const data = await response.json();

        if (data.content && data.content[0] && data.content[0].text) {
            return data.content[0].text;
        }

        throw new Error('Claude APIからの応答が空です');
    }

    showLoading(message = 'AI処理中...') {
        const existing = document.querySelector('.ai-loading-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.className = 'ai-loading-overlay';
        overlay.innerHTML = `
            <div class="ai-loading-content">
                <div class="ai-spinner"></div>
                <p>${message}</p>
            </div>
        `;
        document.body.appendChild(overlay);
        return overlay;
    }

    hideLoading(loadingElement) {
        if (loadingElement) {
            loadingElement.remove();
        }
    }

    showError(error, providerName = 'AI') {
        const existing = document.querySelector('.ai-error-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.className = 'ai-error-modal';
        modal.innerHTML = `
            <div class="ai-error-panel">
                <div class="ai-error-header">
                    <h3>❌ ${providerName} エラー</h3>
                    <button class="close-btn" data-action="close">×</button>
                </div>
                <div class="ai-error-content">
                    <p class="error-message">${error.message}</p>
                    <div class="error-actions">
                        <p class="error-hint">解決方法：</p>
                        <ul class="error-hints">
                            ${this.generateErrorHints(error.message)}
                        </ul>
                    </div>
                </div>
                <div class="ai-error-footer">
                    <button class="btn secondary" data-action="settings">設定を開く</button>
                    <button class="btn primary" data-action="close">閉じる</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // イベントリスナー
        modal.querySelectorAll('[data-action="close"]').forEach(btn => {
            btn.addEventListener('click', () => modal.remove());
        });

        modal.querySelector('[data-action="settings"]').addEventListener('click', () => {
            modal.remove();
            this.showSettings();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    generateErrorHints(errorMessage) {
        const hints = [];

        if (errorMessage.includes('接続エラー')) {
            hints.push('インターネット接続を確認してください');
            hints.push('ファイアウォールやプロキシ設定を確認してください');
        } else if (errorMessage.includes('認証エラー')) {
            hints.push('APIキーが正しいか確認してください');
            hints.push('APIキーの有効期限を確認してください');
            hints.push('設定画面からAPIキーを再入力してください');
        } else if (errorMessage.includes('レート制限')) {
            hints.push('しばらく時間をおいてから再試行してください');
            hints.push('別のAIプロバイダーに切り替えてみてください');
        } else {
            hints.push('設定を確認してください');
            hints.push('しばらく時間をおいてから再試行してください');
        }

        return hints.map(hint => `<li>${hint}</li>`).join('');
    }

    showResult(text, providerName = 'AI') {
        const existing = document.querySelector('.ai-result-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.className = 'ai-result-modal';
        modal.innerHTML = `
            <div class="ai-result-panel">
                <div class="ai-result-header">
                    <h3>AI処理結果 (${providerName})</h3>
                    <button class="close-btn" data-action="close">×</button>
                </div>
                <div class="ai-result-content"></div>
                <div class="ai-result-actions">
                    <button class="btn secondary" data-action="copy">コピー</button>
                    <button class="btn secondary" data-action="copy-rich">リッチテキストコピー</button>
                    <button class="btn secondary" data-action="insert">エディターに挿入</button>
                    <button class="btn primary" data-action="close">閉じる</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Markdownをレンダリング
        const resultContent = modal.querySelector('.ai-result-content');
        this.renderMarkdown(text, resultContent);

        // イベントリスナー
        modal.querySelectorAll('[data-action="close"]').forEach(btn => {
            btn.addEventListener('click', () => modal.remove());
        });

        modal.querySelector('[data-action="copy"]').addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(text);
                alert('プレーンテキストでコピーしました');
            } catch (error) {
                console.error('コピーに失敗:', error);
            }
        });

        modal.querySelector('[data-action="copy-rich"]').addEventListener('click', async () => {
            try {
                await this.copyRichText(text);
                alert('リッチテキストでコピーしました');
            } catch (error) {
                console.error('リッチテキストコピーに失敗:', error);
            }
        });

        modal.querySelector('[data-action="insert"]').addEventListener('click', () => {
            try {
                this.insertToEditor(text);
                alert('エディターに挿入しました');
                modal.remove();
            } catch (error) {
                console.error('エディターへの挿入に失敗:', error);
            }
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // Markdownをレンダリングしてコンテンツに表示
    renderMarkdown(text, container) {
        try {
            // markedでMarkdownをHTMLに変換
            const html = marked.parse(text);
            container.innerHTML = html;
        } catch (error) {
            console.error('Markdownレンダリングエラー:', error);
            // エラーの場合はプレーンテキストで表示
            container.textContent = text;
        }
    }

    // リッチテキスト（HTML）でクリップボードにコピー
    async copyRichText(markdownText) {
        try {
            const html = marked.parse(markdownText);
            const blob = new Blob([html], { type: 'text/html' });
            const data = [new ClipboardItem({
                'text/html': blob,
                'text/plain': new Blob([markdownText], { type: 'text/plain' })
            })];
            await navigator.clipboard.write(data);
        } catch (error) {
            console.error('リッチテキストコピーエラー:', error);
            // フォールバック: プレーンテキストでコピー
            await navigator.clipboard.writeText(markdownText);
            throw new Error('リッチテキストコピーに失敗したため、プレーンテキストでコピーしました');
        }
    }

    // エディターにMarkdownコンテンツを挿入
    insertToEditor(markdownText) {
        try {
            const editor = window.editorManager;
            if (!editor || !editor.editor) {
                throw new Error('エディターが見つかりません');
            }

            // 現在のカーソル位置に挿入
            const currentPos = editor.editor.state.selection.from;

            // MarkdownをTipTapのコンテンツとしてパース
            const html = marked.parse(markdownText);

            // TipTapのinsertContentでHTMLを挿入
            editor.editor.chain().focus().setTextSelection(currentPos).insertContent(html).run();

        } catch (error) {
            console.error('エディター挿入エラー:', error);
            throw error;
        }
    }
}