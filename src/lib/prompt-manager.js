/**
 * PromptManager - プロンプトテンプレート管理
 *
 * Chrome Storageを使用してカスタムプロンプトテンプレートを管理します。
 */

export class PromptManager {
    constructor() {
        this.storageKey = 'sightedit_prompt_templates';
        this.templates = [];
        this.initialized = false;
    }

    // ========================================
    // 初期化
    // ========================================

    /**
     * プロンプトマネージャーを初期化
     */
    async init() {
        if (this.initialized) return;

        try {
            await this.loadTemplates();
            this.initialized = true;
            console.log('PromptManager initialized');
        } catch (error) {
            console.error('Failed to initialize PromptManager:', error);
            throw error;
        }
    }

    /**
     * テンプレートを読み込み
     */
    async loadTemplates() {
        try {
            const result = await chrome.storage.local.get(this.storageKey);
            const stored = result[this.storageKey];

            if (stored && Array.isArray(stored)) {
                this.templates = stored;
            } else {
                // 初回起動時はデフォルトテンプレートを読み込む
                this.templates = this.getDefaultTemplates();
                await this.saveAllTemplates();
            }

            console.log(`Loaded ${this.templates.length} prompt templates`);
        } catch (error) {
            console.error('Failed to load templates:', error);
            this.templates = this.getDefaultTemplates();
        }
    }

    /**
     * すべてのテンプレートを保存
     */
    async saveAllTemplates() {
        try {
            await chrome.storage.local.set({
                [this.storageKey]: this.templates
            });
        } catch (error) {
            console.error('Failed to save templates:', error);
            throw error;
        }
    }

    // ========================================
    // CRUD操作
    // ========================================

    /**
     * 新しいテンプレートを作成
     * @param {object} template - テンプレートデータ
     * @returns {object} 作成されたテンプレート
     */
    async createTemplate(template) {
        const newTemplate = {
            id: this.generateId(),
            name: template.name || '新規プロンプト',
            description: template.description || '',
            category: template.category || 'その他',
            prompt: template.prompt || '',
            variables: template.variables || [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            lastUsed: 0,
            usageCount: 0,
            isFavorite: template.isFavorite || false
        };

        this.templates.push(newTemplate);
        await this.saveAllTemplates();

        return newTemplate;
    }

    /**
     * テンプレートを取得
     * @param {string} id - テンプレートID
     * @returns {object|null} テンプレート
     */
    getTemplate(id) {
        return this.templates.find(t => t.id === id) || null;
    }

    /**
     * すべてのテンプレートを取得
     * @param {object} options - フィルターオプション
     * @returns {Array} テンプレート一覧
     */
    getAllTemplates(options = {}) {
        let results = [...this.templates];

        // カテゴリーフィルター
        if (options.category) {
            results = results.filter(t => t.category === options.category);
        }

        // お気に入りフィルター
        if (options.favoritesOnly) {
            results = results.filter(t => t.isFavorite);
        }

        // 検索
        if (options.query) {
            const query = options.query.toLowerCase();
            results = results.filter(t =>
                t.name.toLowerCase().includes(query) ||
                t.description.toLowerCase().includes(query) ||
                t.prompt.toLowerCase().includes(query)
            );
        }

        // ソート
        if (options.sortBy === 'name') {
            results.sort((a, b) => a.name.localeCompare(b.name));
        } else if (options.sortBy === 'usageCount') {
            results.sort((a, b) => b.usageCount - a.usageCount);
        } else if (options.sortBy === 'lastUsed') {
            results.sort((a, b) => b.lastUsed - a.lastUsed);
        } else {
            // デフォルト: 更新日時でソート
            results.sort((a, b) => b.updatedAt - a.updatedAt);
        }

        return results;
    }

    /**
     * テンプレートを更新
     * @param {string} id - テンプレートID
     * @param {object} updates - 更新データ
     * @returns {object|null} 更新されたテンプレート
     */
    async updateTemplate(id, updates) {
        const index = this.templates.findIndex(t => t.id === id);
        if (index === -1) return null;

        this.templates[index] = {
            ...this.templates[index],
            ...updates,
            id, // IDは変更不可
            updatedAt: Date.now()
        };

        await this.saveAllTemplates();
        return this.templates[index];
    }

    /**
     * テンプレートを削除
     * @param {string} id - テンプレートID
     * @returns {boolean} 削除成功
     */
    async deleteTemplate(id) {
        const index = this.templates.findIndex(t => t.id === id);
        if (index === -1) return false;

        this.templates.splice(index, 1);
        await this.saveAllTemplates();
        return true;
    }

    // ========================================
    // カテゴリー管理
    // ========================================

    /**
     * すべてのカテゴリーを取得
     * @returns {Array<string>} カテゴリー一覧
     */
    getCategories() {
        const categories = new Set(this.templates.map(t => t.category));
        return Array.from(categories).sort();
    }

    /**
     * カテゴリー別テンプレート取得
     * @param {string} category - カテゴリー名
     * @returns {Array} テンプレート一覧
     */
    getTemplatesByCategory(category) {
        return this.templates.filter(t => t.category === category);
    }

    /**
     * お気に入りテンプレートを取得
     * @returns {Array} テンプレート一覧
     */
    getFavorites() {
        return this.templates.filter(t => t.isFavorite);
    }

    // ========================================
    // 変数処理
    // ========================================

    /**
     * プロンプトから変数を抽出
     * @param {string} prompt - プロンプトテキスト
     * @returns {Array<string>} 変数名の配列
     */
    parseVariables(prompt) {
        const regex = /\{\{([^}]+)\}\}/g;
        const variables = [];
        let match;

        while ((match = regex.exec(prompt)) !== null) {
            const varName = match[1].trim();
            if (!variables.includes(varName)) {
                variables.push(varName);
            }
        }

        return variables;
    }

    /**
     * テンプレートに変数を適用
     * @param {string} templateId - テンプレートID
     * @param {object} values - 変数の値 { varName: value }
     * @returns {string} 変数置換後のプロンプト
     */
    applyTemplate(templateId, values = {}) {
        const template = this.getTemplate(templateId);
        if (!template) {
            throw new Error(`Template not found: ${templateId}`);
        }

        let result = template.prompt;

        // 変数を置換
        for (const [key, value] of Object.entries(values)) {
            const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
            result = result.replace(regex, value);
        }

        // 使用統計を更新
        this.updateUsageStats(templateId);

        return result;
    }

    /**
     * 使用統計を更新
     * @param {string} templateId - テンプレートID
     */
    async updateUsageStats(templateId) {
        const template = this.getTemplate(templateId);
        if (!template) return;

        template.usageCount = (template.usageCount || 0) + 1;
        template.lastUsed = Date.now();

        await this.saveAllTemplates();
    }

    /**
     * テンプレートの変数情報を取得
     * @param {string} templateId - テンプレートID
     * @returns {Array} 変数定義の配列
     */
    getTemplateVariables(templateId) {
        const template = this.getTemplate(templateId);
        if (!template) return [];

        return template.variables || [];
    }

    // ========================================
    // インポート/エクスポート
    // ========================================

    /**
     * テンプレートをJSON形式でエクスポート
     * @param {Array<string>} templateIds - エクスポートするテンプレートID（省略時は全て）
     * @returns {string} JSON文字列
     */
    exportTemplates(templateIds = null) {
        let templates;

        if (templateIds && templateIds.length > 0) {
            templates = this.templates.filter(t => templateIds.includes(t.id));
        } else {
            templates = this.templates;
        }

        const exportData = {
            version: '1.0',
            exportedAt: Date.now(),
            templates: templates
        };

        return JSON.stringify(exportData, null, 2);
    }

    /**
     * JSON形式のテンプレートをインポート
     * @param {string} jsonString - JSON文字列
     * @param {boolean} merge - 既存テンプレートとマージするか（falseの場合は置き換え）
     * @returns {object} インポート結果 { imported: number, skipped: number }
     */
    async importTemplates(jsonString, merge = true) {
        try {
            const data = JSON.parse(jsonString);

            if (!data.templates || !Array.isArray(data.templates)) {
                throw new Error('Invalid format: templates array not found');
            }

            let imported = 0;
            let skipped = 0;

            for (const template of data.templates) {
                // IDの重複チェック
                const existing = this.getTemplate(template.id);

                if (existing && merge) {
                    // マージモード: 既存のテンプレートをスキップ
                    skipped++;
                    continue;
                }

                if (!merge && existing) {
                    // 置き換えモード: 既存のテンプレートを削除
                    await this.deleteTemplate(template.id);
                }

                // 新しいIDを生成（衝突を避けるため）
                const newTemplate = {
                    ...template,
                    id: this.generateId(),
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };

                this.templates.push(newTemplate);
                imported++;
            }

            await this.saveAllTemplates();

            return { imported, skipped };
        } catch (error) {
            console.error('Failed to import templates:', error);
            throw error;
        }
    }

    // ========================================
    // デフォルトテンプレート
    // ========================================

    /**
     * デフォルトプロンプトテンプレートを取得
     * @returns {Array} デフォルトテンプレート一覧
     */
    getDefaultTemplates() {
        return [
            // 執筆支援
            {
                id: 'default-blog-post',
                name: 'ブログ記事作成',
                description: 'トピックから構造化されたブログ記事を生成',
                category: '執筆支援',
                prompt: `{{topic}}について、以下の構成でブログ記事を書いてください:

1. 導入（読者の興味を引く）
2. 本文（詳細な説明と具体例）
3. まとめ（要点の再確認と行動喚起）

対象読者: {{audience}}
文字数: {{length}}文字程度
トーン: {{tone}}`,
                variables: [
                    { name: 'topic', type: 'text', description: 'ブログのトピック', required: true },
                    { name: 'audience', type: 'select', description: '対象読者', options: ['一般', '専門家', '初心者'], defaultValue: '一般' },
                    { name: 'length', type: 'number', description: '文字数', defaultValue: '1000' },
                    { name: 'tone', type: 'select', description: '文章のトーン', options: ['カジュアル', 'フォーマル', '親しみやすい'], defaultValue: 'カジュアル' }
                ],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastUsed: 0,
                usageCount: 0,
                isFavorite: false
            },
            {
                id: 'default-seo-optimize',
                name: 'SEO最適化',
                description: 'コンテンツをSEOに最適化',
                category: '執筆支援',
                prompt: `以下の文章をSEO最適化してください:

{{text}}

ターゲットキーワード: {{keywords}}
メタディスクリプション（120-160文字）も提案してください。`,
                variables: [
                    { name: 'text', type: 'textarea', description: '最適化する文章', required: true },
                    { name: 'keywords', type: 'text', description: 'ターゲットキーワード（カンマ区切り）', required: true }
                ],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastUsed: 0,
                usageCount: 0,
                isFavorite: false
            },
            {
                id: 'default-outline',
                name: 'アウトライン生成',
                description: 'トピックから詳細なアウトラインを生成',
                category: '執筆支援',
                prompt: `{{topic}}について、{{sections}}つのセクションに分けた詳細なアウトラインを生成してください。

各セクションには:
- 見出し
- 主要ポイント3つ
- 推奨される文字数

を含めてください。`,
                variables: [
                    { name: 'topic', type: 'text', description: 'トピック', required: true },
                    { name: 'sections', type: 'number', description: 'セクション数', defaultValue: '5' }
                ],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastUsed: 0,
                usageCount: 0,
                isFavorite: false
            },
            {
                id: 'default-rewrite',
                name: '文章書き直し',
                description: '文章を指定したスタイルで書き直す',
                category: '執筆支援',
                prompt: `以下の文章を{{style}}なスタイルで書き直してください:

{{text}}

長さ: {{length}}`,
                variables: [
                    { name: 'text', type: 'textarea', description: '書き直す文章', required: true },
                    { name: 'style', type: 'select', description: 'スタイル', options: ['簡潔', '詳細', 'カジュアル', 'フォーマル', '説得力のある'], defaultValue: '簡潔' },
                    { name: 'length', type: 'select', description: '長さ', options: ['短く', '同じくらい', '長く'], defaultValue: '同じくらい' }
                ],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastUsed: 0,
                usageCount: 0,
                isFavorite: false
            },
            {
                id: 'default-expand',
                name: '文章展開',
                description: 'アイデアを詳細な文章に展開',
                category: '執筆支援',
                prompt: `以下のアイデアを{{length}}文字程度の詳細な文章に展開してください:

{{idea}}

具体例や説明を追加して、読者が理解しやすいように書いてください。`,
                variables: [
                    { name: 'idea', type: 'textarea', description: '展開するアイデア', required: true },
                    { name: 'length', type: 'number', description: '目標文字数', defaultValue: '500' }
                ],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastUsed: 0,
                usageCount: 0,
                isFavorite: false
            },
            {
                id: 'default-summarize',
                name: '要約',
                description: '文章を簡潔に要約',
                category: '執筆支援',
                prompt: `以下の文章を{{length}}で要約してください:

{{text}}

重要なポイントを押さえた要約を作成してください。`,
                variables: [
                    { name: 'text', type: 'textarea', description: '要約する文章', required: true },
                    { name: 'length', type: 'select', description: '要約の長さ', options: ['1文', '3文', '1段落', '複数段落'], defaultValue: '3文' }
                ],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastUsed: 0,
                usageCount: 0,
                isFavorite: false
            },
            {
                id: 'default-email',
                name: 'メール作成',
                description: '目的に応じたメールを作成',
                category: '執筆支援',
                prompt: `以下の情報を元に{{tone}}なメールを作成してください:

宛先: {{recipient}}
件名: {{subject}}
本文の要点: {{points}}

適切な挨拶と締めの言葉を含めてください。`,
                variables: [
                    { name: 'recipient', type: 'text', description: '宛先（役職や関係性）', required: true },
                    { name: 'subject', type: 'text', description: '件名', required: true },
                    { name: 'points', type: 'textarea', description: '本文の要点', required: true },
                    { name: 'tone', type: 'select', description: 'トーン', options: ['フォーマル', 'ビジネスカジュアル', '親しみやすい'], defaultValue: 'ビジネスカジュアル' }
                ],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastUsed: 0,
                usageCount: 0,
                isFavorite: false
            },
            {
                id: 'default-social-post',
                name: 'SNS投稿作成',
                description: 'SNS用の魅力的な投稿を作成',
                category: '執筆支援',
                prompt: `{{platform}}用の投稿を作成してください:

トピック: {{topic}}
目的: {{goal}}
文字数制限: {{limit}}文字

ハッシュタグや絵文字も適切に含めてください。`,
                variables: [
                    { name: 'platform', type: 'select', description: 'プラットフォーム', options: ['Twitter/X', 'Facebook', 'Instagram', 'LinkedIn'], defaultValue: 'Twitter/X' },
                    { name: 'topic', type: 'text', description: 'トピック', required: true },
                    { name: 'goal', type: 'select', description: '目的', options: ['情報共有', 'エンゲージメント', 'プロモーション', '教育'], defaultValue: '情報共有' },
                    { name: 'limit', type: 'number', description: '文字数制限', defaultValue: '280' }
                ],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastUsed: 0,
                usageCount: 0,
                isFavorite: false
            },
            {
                id: 'default-improve',
                name: '文章改善',
                description: '文章の質を向上させる',
                category: '執筆支援',
                prompt: `以下の文章を改善してください:

{{text}}

改善点:
- 文法と表現の修正
- 読みやすさの向上
- 論理的な流れの改善
- 冗長な部分の削除

元の意味は保ちながら、より良い文章にしてください。`,
                variables: [
                    { name: 'text', type: 'textarea', description: '改善する文章', required: true }
                ],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastUsed: 0,
                usageCount: 0,
                isFavorite: false
            },
            {
                id: 'default-brainstorm',
                name: 'アイデア出し',
                description: 'トピックについてアイデアをブレインストーミング',
                category: '執筆支援',
                prompt: `{{topic}}について、{{count}}個のユニークなアイデアを提案してください。

各アイデアには:
- タイトル
- 簡単な説明（2-3文）
- 実現可能性

を含めてください。`,
                variables: [
                    { name: 'topic', type: 'text', description: 'トピック', required: true },
                    { name: 'count', type: 'number', description: 'アイデアの数', defaultValue: '10' }
                ],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastUsed: 0,
                usageCount: 0,
                isFavorite: false
            },

            // コーディング
            {
                id: 'default-code-review',
                name: 'コードレビュー',
                description: 'コードをレビューし改善点を提案',
                category: 'コーディング',
                prompt: `以下の{{language}}コードをレビューし、改善点を提案してください:

\`\`\`{{language}}
{{code}}
\`\`\`

レビューポイント:
- コードの品質
- パフォーマンス
- セキュリティ
- 保守性
- ベストプラクティス`,
                variables: [
                    { name: 'language', type: 'text', description: 'プログラミング言語', defaultValue: 'javascript' },
                    { name: 'code', type: 'textarea', description: 'レビューするコード', required: true }
                ],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastUsed: 0,
                usageCount: 0,
                isFavorite: false
            },
            {
                id: 'default-bug-fix',
                name: 'バグ修正提案',
                description: 'バグを特定し修正方法を提案',
                category: 'コーディング',
                prompt: `以下のコードのバグを特定し、修正方法を提案してください:

\`\`\`{{language}}
{{code}}
\`\`\`

エラー: {{error}}

期待される動作: {{expected}}

バグの原因と修正後のコードを提示してください。`,
                variables: [
                    { name: 'language', type: 'text', description: 'プログラミング言語', defaultValue: 'javascript' },
                    { name: 'code', type: 'textarea', description: 'バグのあるコード', required: true },
                    { name: 'error', type: 'text', description: 'エラーメッセージ', required: true },
                    { name: 'expected', type: 'text', description: '期待される動作', required: true }
                ],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastUsed: 0,
                usageCount: 0,
                isFavorite: false
            },
            {
                id: 'default-refactor',
                name: 'リファクタリング',
                description: 'コードをリファクタリング',
                category: 'コーディング',
                prompt: `以下の{{language}}コードをリファクタリングしてください:

\`\`\`{{language}}
{{code}}
\`\`\`

目標:
- 読みやすさの向上
- 保守性の向上
- パフォーマンスの最適化
- ベストプラクティスの適用

変更点の説明も含めてください。`,
                variables: [
                    { name: 'language', type: 'text', description: 'プログラミング言語', defaultValue: 'javascript' },
                    { name: 'code', type: 'textarea', description: 'リファクタリングするコード', required: true }
                ],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastUsed: 0,
                usageCount: 0,
                isFavorite: false
            },
            {
                id: 'default-test-generate',
                name: 'テストコード生成',
                description: 'ユニットテストを生成',
                category: 'コーディング',
                prompt: `以下の{{language}}コードに対するユニットテストを{{framework}}フレームワークで生成してください:

\`\`\`{{language}}
{{code}}
\`\`\`

以下をカバーするテストケースを作成してください:
- 正常系
- 異常系
- エッジケース`,
                variables: [
                    { name: 'language', type: 'text', description: 'プログラミング言語', defaultValue: 'javascript' },
                    { name: 'framework', type: 'text', description: 'テストフレームワーク', defaultValue: 'Jest' },
                    { name: 'code', type: 'textarea', description: 'テスト対象のコード', required: true }
                ],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastUsed: 0,
                usageCount: 0,
                isFavorite: false
            },
            {
                id: 'default-document-code',
                name: 'コードドキュメント生成',
                description: 'コードのドキュメントを生成',
                category: 'コーディング',
                prompt: `以下の{{language}}コードに対する詳細なドキュメントを生成してください:

\`\`\`{{language}}
{{code}}
\`\`\`

以下を含めてください:
- 関数/クラスの説明
- パラメーターの説明
- 戻り値の説明
- 使用例
- 注意事項`,
                variables: [
                    { name: 'language', type: 'text', description: 'プログラミング言語', defaultValue: 'javascript' },
                    { name: 'code', type: 'textarea', description: 'ドキュメント化するコード', required: true }
                ],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastUsed: 0,
                usageCount: 0,
                isFavorite: false
            },

            // 翻訳
            {
                id: 'default-translate-ja-en',
                name: '日本語→英語翻訳',
                description: '日本語を自然な英語に翻訳',
                category: '翻訳',
                prompt: `以下の日本語を自然な英語に翻訳してください:

{{text}}

翻訳スタイル: {{style}}`,
                variables: [
                    { name: 'text', type: 'textarea', description: '翻訳する日本語テキスト', required: true },
                    { name: 'style', type: 'select', description: '翻訳スタイル', options: ['カジュアル', 'ビジネス', 'アカデミック'], defaultValue: 'カジュアル' }
                ],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastUsed: 0,
                usageCount: 0,
                isFavorite: false
            },
            {
                id: 'default-translate-en-ja',
                name: '英語→日本語翻訳',
                description: '英語を自然な日本語に翻訳',
                category: '翻訳',
                prompt: `以下の英語を自然な日本語に翻訳してください:

{{text}}

翻訳スタイル: {{style}}`,
                variables: [
                    { name: 'text', type: 'textarea', description: '翻訳する英語テキスト', required: true },
                    { name: 'style', type: 'select', description: '翻訳スタイル', options: ['カジュアル', 'ビジネス', 'アカデミック'], defaultValue: 'カジュアル' }
                ],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastUsed: 0,
                usageCount: 0,
                isFavorite: false
            },
            {
                id: 'default-localize',
                name: 'ローカライゼーション',
                description: 'コンテンツを文化的に適切にローカライズ',
                category: '翻訳',
                prompt: `以下のコンテンツを{{target}}向けにローカライズしてください:

{{text}}

文化的な違いや慣習を考慮して、適切に調整してください。`,
                variables: [
                    { name: 'text', type: 'textarea', description: 'ローカライズするテキスト', required: true },
                    { name: 'target', type: 'text', description: 'ターゲット言語/地域', required: true }
                ],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastUsed: 0,
                usageCount: 0,
                isFavorite: false
            },
            {
                id: 'default-multilingual',
                name: '多言語翻訳',
                description: 'テキストを複数の言語に翻訳',
                category: '翻訳',
                prompt: `以下のテキストを{{languages}}に翻訳してください:

{{text}}

各言語での翻訳を明確に分けて表示してください。`,
                variables: [
                    { name: 'text', type: 'textarea', description: '翻訳するテキスト', required: true },
                    { name: 'languages', type: 'text', description: '翻訳先の言語（カンマ区切り）', defaultValue: '英語, 中国語, 韓国語' }
                ],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastUsed: 0,
                usageCount: 0,
                isFavorite: false
            },
            {
                id: 'default-simplify-language',
                name: '言語簡素化',
                description: '複雑な文章を簡単な言葉で説明',
                category: '翻訳',
                prompt: `以下の文章を{{level}}レベルの言葉で書き直してください:

{{text}}

専門用語は避けて、誰でも理解できるように説明してください。`,
                variables: [
                    { name: 'text', type: 'textarea', description: '簡素化する文章', required: true },
                    { name: 'level', type: 'select', description: '対象レベル', options: ['小学生', '中学生', '一般'], defaultValue: '一般' }
                ],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastUsed: 0,
                usageCount: 0,
                isFavorite: false
            },

            // その他
            {
                id: 'default-analyze',
                name: 'テキスト分析',
                description: 'テキストを分析し洞察を提供',
                category: 'その他',
                prompt: `以下のテキストを分析してください:

{{text}}

以下の観点から分析してください:
- 主要なテーマ
- トーン・感情
- 対象読者
- 強みと弱み
- 改善提案`,
                variables: [
                    { name: 'text', type: 'textarea', description: '分析するテキスト', required: true }
                ],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastUsed: 0,
                usageCount: 0,
                isFavorite: false
            },
            {
                id: 'default-qa',
                name: 'Q&A生成',
                description: 'コンテンツからQ&Aを生成',
                category: 'その他',
                prompt: `以下のコンテンツに基づいて、{{count}}個の質問と回答を生成してください:

{{text}}

よくある質問（FAQ）形式で作成してください。`,
                variables: [
                    { name: 'text', type: 'textarea', description: '元となるコンテンツ', required: true },
                    { name: 'count', type: 'number', description: 'Q&Aの数', defaultValue: '5' }
                ],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastUsed: 0,
                usageCount: 0,
                isFavorite: false
            },
            {
                id: 'default-meeting-notes',
                name: '議事録作成',
                description: 'メモから議事録を作成',
                category: 'その他',
                prompt: `以下のミーティングメモから議事録を作成してください:

{{notes}}

以下の形式で整理してください:
- 日時と参加者
- 議題
- 決定事項
- アクションアイテム（担当者と期限）
- 次回予定`,
                variables: [
                    { name: 'notes', type: 'textarea', description: 'ミーティングメモ', required: true }
                ],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastUsed: 0,
                usageCount: 0,
                isFavorite: false
            },
            {
                id: 'default-presentation',
                name: 'プレゼン構成',
                description: 'プレゼンテーションの構成を作成',
                category: 'その他',
                prompt: `{{topic}}についてのプレゼンテーション構成を作成してください:

発表時間: {{duration}}分
対象者: {{audience}}

以下を含めてください:
- 各スライドのタイトル
- スライドの内容概要
- 推奨される所要時間`,
                variables: [
                    { name: 'topic', type: 'text', description: 'プレゼンテーマ', required: true },
                    { name: 'duration', type: 'number', description: '発表時間（分）', defaultValue: '10' },
                    { name: 'audience', type: 'text', description: '対象者', defaultValue: '一般' }
                ],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastUsed: 0,
                usageCount: 0,
                isFavorite: false
            },
            {
                id: 'default-comparison',
                name: '比較表作成',
                description: '項目を比較する表を作成',
                category: 'その他',
                prompt: `{{items}}を以下の観点から比較した表を作成してください:

比較項目: {{criteria}}

各項目について:
- 特徴
- メリット
- デメリット
- 適用シーン

をMarkdown表形式で作成してください。`,
                variables: [
                    { name: 'items', type: 'text', description: '比較する項目（カンマ区切り）', required: true },
                    { name: 'criteria', type: 'text', description: '比較基準（カンマ区切り）', defaultValue: '価格, 機能, 使いやすさ' }
                ],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastUsed: 0,
                usageCount: 0,
                isFavorite: false
            }
        ];
    }

    // ========================================
    // ユーティリティ
    // ========================================

    /**
     * ユニークIDを生成
     * @returns {string} UUID
     */
    generateId() {
        return 'prompt-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
}

// シングルトンインスタンス
let promptManagerInstance = null;

/**
 * PromptManagerのシングルトンインスタンスを取得
 * @returns {PromptManager}
 */
export function getPromptManager() {
    if (!promptManagerInstance) {
        promptManagerInstance = new PromptManager();
    }
    return promptManagerInstance;
}
