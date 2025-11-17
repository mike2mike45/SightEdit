/**
 * StyleController - AIレスポンスのスタイル制御
 *
 * トーン、長さ、対象読者、言語などのスタイルパラメータを管理し、
 * プロンプトに適切なスタイル指示を追加します。
 */

export class StyleController {
    constructor() {
        this.storageKey = 'sightedit_style_settings';
        this.currentStyle = this.getDefaultStyle();
        this.initialized = false;
    }

    /**
     * 初期化
     */
    async init() {
        await this.loadSettings();
        this.initialized = true;
    }

    /**
     * デフォルトスタイル設定
     */
    getDefaultStyle() {
        return {
            tone: 'casual',           // フォーマル/カジュアル/技術的/クリエイティブ
            length: 'standard',       // 短い/標準/長い/カスタム
            audience: 'general',      // 一般/専門家/初心者/子供向け
            language: 'ja',           // 日本語/英語/多言語
            customLength: null,       // カスタム文字数
            enabled: false            // スタイル制御の有効/無効
        };
    }

    /**
     * スタイル定義
     */
    getStyleDefinitions() {
        return {
            tone: {
                label: 'トーン',
                options: [
                    { value: 'formal', label: 'フォーマル', description: '丁寧で礼儀正しい、ビジネス向けの文体' },
                    { value: 'casual', label: 'カジュアル', description: '親しみやすく、会話的な文体' },
                    { value: 'technical', label: '技術的', description: '正確で専門的な、技術文書向けの文体' },
                    { value: 'creative', label: 'クリエイティブ', description: '表現豊かで独創的な文体' }
                ]
            },
            length: {
                label: '長さ',
                options: [
                    { value: 'short', label: '短い', description: '簡潔に要点をまとめた回答' },
                    { value: 'standard', label: '標準', description: 'バランスの取れた適度な長さ' },
                    { value: 'long', label: '長い', description: '詳細で網羅的な回答' },
                    { value: 'custom', label: 'カスタム', description: '文字数を指定' }
                ]
            },
            audience: {
                label: '対象読者',
                options: [
                    { value: 'general', label: '一般', description: '一般的な読者向け' },
                    { value: 'expert', label: '専門家', description: '専門知識を持つ読者向け' },
                    { value: 'beginner', label: '初心者', description: '初学者向け、基礎から説明' },
                    { value: 'child', label: '子供向け', description: '子供にも理解できる易しい表現' }
                ]
            },
            language: {
                label: '言語',
                options: [
                    { value: 'ja', label: '日本語', description: '日本語で回答' },
                    { value: 'en', label: '英語', description: '英語で回答' },
                    { value: 'bilingual', label: 'バイリンガル', description: '日本語と英語の両方' }
                ]
            }
        };
    }

    /**
     * 現在のスタイル設定を取得
     */
    getStyle() {
        return { ...this.currentStyle };
    }

    /**
     * スタイル設定を更新
     * @param {Object} style - スタイル設定
     */
    async setStyle(style) {
        this.currentStyle = {
            ...this.currentStyle,
            ...style
        };
        await this.saveSettings();
    }

    /**
     * スタイルの有効/無効を切り替え
     * @param {boolean} enabled - 有効フラグ
     */
    async setEnabled(enabled) {
        this.currentStyle.enabled = enabled;
        await this.saveSettings();
    }

    /**
     * スタイル制御が有効か確認
     */
    isEnabled() {
        return this.currentStyle.enabled;
    }

    /**
     * スタイルプロンプトを生成
     * @param {string} userPrompt - ユーザープロンプト
     * @returns {string} スタイル指示付きプロンプト
     */
    applyStyleToPrompt(userPrompt) {
        if (!this.currentStyle.enabled) {
            return userPrompt;
        }

        const styleInstructions = this.buildStyleInstructions();

        if (!styleInstructions) {
            return userPrompt;
        }

        // スタイル指示を追加
        return `${userPrompt}\n\n---\n【応答スタイル指定】\n${styleInstructions}`;
    }

    /**
     * スタイル指示文を構築
     * @returns {string} スタイル指示
     */
    buildStyleInstructions() {
        const instructions = [];
        const style = this.currentStyle;

        // トーン指示
        const toneInstructions = {
            formal: '丁寧で礼儀正しい、ビジネス向けのフォーマルな文体で回答してください。',
            casual: '親しみやすく、会話的なカジュアルな文体で回答してください。',
            technical: '正確で専門的な、技術文書向けの文体で回答してください。専門用語を適切に使用してください。',
            creative: '表現豊かで独創的な、クリエイティブな文体で回答してください。比喩や例えを活用してください。'
        };

        if (style.tone && toneInstructions[style.tone]) {
            instructions.push(toneInstructions[style.tone]);
        }

        // 長さ指示
        const lengthInstructions = {
            short: '簡潔に要点をまとめて回答してください。不要な説明は省略してください。',
            standard: 'バランスの取れた適度な長さで回答してください。',
            long: '詳細で網羅的に回答してください。関連する情報や背景も含めて説明してください。',
            custom: style.customLength
                ? `約${style.customLength}文字程度で回答してください。`
                : null
        };

        if (style.length && lengthInstructions[style.length]) {
            instructions.push(lengthInstructions[style.length]);
        }

        // 対象読者指示
        const audienceInstructions = {
            general: '一般的な読者を対象として、わかりやすく回答してください。',
            expert: '専門知識を持つ読者を対象として、高度な内容も含めて回答してください。',
            beginner: '初学者向けに、基礎から丁寧に説明してください。専門用語は噛み砕いて説明してください。',
            child: '子供にも理解できるように、易しい言葉で説明してください。'
        };

        if (style.audience && audienceInstructions[style.audience]) {
            instructions.push(audienceInstructions[style.audience]);
        }

        // 言語指示
        const languageInstructions = {
            ja: '日本語で回答してください。',
            en: '英語で回答してください。Please respond in English.',
            bilingual: '日本語と英語の両方で回答してください。まず日本語で回答し、その後に英語訳を付けてください。'
        };

        if (style.language && languageInstructions[style.language]) {
            instructions.push(languageInstructions[style.language]);
        }

        return instructions.join('\n');
    }

    /**
     * スタイルプリセットを取得
     */
    getPresets() {
        return [
            {
                id: 'blog-post',
                name: 'ブログ記事',
                description: 'カジュアルで読みやすいブログ記事向け',
                style: {
                    tone: 'casual',
                    length: 'long',
                    audience: 'general',
                    language: 'ja',
                    enabled: true
                }
            },
            {
                id: 'technical-doc',
                name: '技術文書',
                description: '正確で詳細な技術ドキュメント向け',
                style: {
                    tone: 'technical',
                    length: 'long',
                    audience: 'expert',
                    language: 'ja',
                    enabled: true
                }
            },
            {
                id: 'business-email',
                name: 'ビジネスメール',
                description: 'フォーマルで簡潔なビジネスメール向け',
                style: {
                    tone: 'formal',
                    length: 'short',
                    audience: 'general',
                    language: 'ja',
                    enabled: true
                }
            },
            {
                id: 'tutorial',
                name: 'チュートリアル',
                description: '初心者向けのわかりやすい解説',
                style: {
                    tone: 'casual',
                    length: 'standard',
                    audience: 'beginner',
                    language: 'ja',
                    enabled: true
                }
            },
            {
                id: 'creative-writing',
                name: 'クリエイティブライティング',
                description: '表現豊かな創作文章向け',
                style: {
                    tone: 'creative',
                    length: 'long',
                    audience: 'general',
                    language: 'ja',
                    enabled: true
                }
            }
        ];
    }

    /**
     * プリセットを適用
     * @param {string} presetId - プリセットID
     */
    async applyPreset(presetId) {
        const preset = this.getPresets().find(p => p.id === presetId);
        if (preset) {
            await this.setStyle(preset.style);
        }
    }

    /**
     * スタイル設定を保存
     */
    async saveSettings() {
        try {
            // Feature detection: Chrome Extension環境かチェック
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                // Chrome Extension環境
                await chrome.storage.local.set({
                    [this.storageKey]: this.currentStyle
                });
            } else {
                // スタンドアロン環境: localStorage を使用
                localStorage.setItem(this.storageKey, JSON.stringify(this.currentStyle));
            }
        } catch (error) {
            console.error('Failed to save style settings:', error);
        }
    }

    /**
     * スタイル設定を読み込み
     */
    async loadSettings() {
        try {
            let result = {};
            
            // Feature detection: Chrome Extension環境かチェック
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                // Chrome Extension環境
                result = await chrome.storage.local.get(this.storageKey);
            } else {
                // スタンドアロン環境: localStorage を使用
                const stored = localStorage.getItem(this.storageKey);
                if (stored) {
                    result[this.storageKey] = JSON.parse(stored);
                }
            }
            
            if (result[this.storageKey]) {
                this.currentStyle = {
                    ...this.getDefaultStyle(),
                    ...result[this.storageKey]
                };
            }
        } catch (error) {
            console.error('Failed to load style settings:', error);
            this.currentStyle = this.getDefaultStyle();
        }
    }

    /**
     * 設定をリセット
     */
    async resetSettings() {
        this.currentStyle = this.getDefaultStyle();
        await this.saveSettings();
    }

    /**
     * スタイルサマリーを取得（表示用）
     * @returns {string} スタイルサマリー
     */
    getStyleSummary() {
        if (!this.currentStyle.enabled) {
            return 'スタイル制御: オフ';
        }

        const definitions = this.getStyleDefinitions();
        const parts = [];

        // トーン
        const toneOption = definitions.tone.options.find(o => o.value === this.currentStyle.tone);
        if (toneOption) parts.push(toneOption.label);

        // 長さ
        const lengthOption = definitions.length.options.find(o => o.value === this.currentStyle.length);
        if (lengthOption) {
            if (this.currentStyle.length === 'custom' && this.currentStyle.customLength) {
                parts.push(`${this.currentStyle.customLength}文字`);
            } else {
                parts.push(lengthOption.label);
            }
        }

        // 対象読者
        const audienceOption = definitions.audience.options.find(o => o.value === this.currentStyle.audience);
        if (audienceOption) parts.push(audienceOption.label);

        // 言語
        const languageOption = definitions.language.options.find(o => o.value === this.currentStyle.language);
        if (languageOption) parts.push(languageOption.label);

        return `スタイル: ${parts.join(' / ')}`;
    }
}

// シングルトンインスタンスを作成
let styleControllerInstance = null;

/**
 * StyleController のシングルトンインスタンスを取得
 * @returns {StyleController}
 */
export function getStyleController() {
    if (!styleControllerInstance) {
        styleControllerInstance = new StyleController();
    }
    return styleControllerInstance;
}
