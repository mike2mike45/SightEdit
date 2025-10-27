/**
 * StructuredGenerator - 構造化文書生成マネージャー
 *
 * ブログ記事、技術文書、プレゼン、論文などの構造化された文書を
 * セクション別に生成するための機能を提供します。
 */

export class StructuredGenerator {
    constructor() {
        this.templates = this.getTemplateDefinitions();
    }

    /**
     * 構造化テンプレート定義
     */
    getTemplateDefinitions() {
        return {
            'blog-post': {
                id: 'blog-post',
                name: 'ブログ記事',
                description: 'SEO最適化されたブログ記事を構造的に生成',
                icon: '📝',
                sections: [
                    {
                        id: 'title',
                        name: 'タイトル',
                        description: 'キャッチーで検索エンジンに最適化されたタイトル',
                        prompt: '以下のトピックについて、魅力的でSEOに最適化されたブログ記事のタイトルを5つ提案してください:\n\nトピック: {{topic}}\nターゲット読者: {{audience}}\nキーワード: {{keywords}}',
                        variables: ['topic', 'audience', 'keywords']
                    },
                    {
                        id: 'intro',
                        name: '導入部',
                        description: '読者を引き込む導入文',
                        prompt: '以下のタイトルとトピックについて、読者を引き込む導入部（200-300文字）を書いてください:\n\nタイトル: {{title}}\nトピック: {{topic}}\nターゲット読者: {{audience}}\n\n読者の興味を引き、記事を読み続けたくなるような導入にしてください。',
                        variables: ['title', 'topic', 'audience'],
                        dependsOn: ['title']
                    },
                    {
                        id: 'main-sections',
                        name: '本文（複数セクション）',
                        description: '詳細な本文を複数のセクションに分けて',
                        prompt: '以下のトピックについて、{{sections}}つのセクションに分けて詳細な本文を書いてください:\n\nタイトル: {{title}}\nトピック: {{topic}}\n導入部: {{intro}}\n\n各セクションには見出し（##）をつけ、具体例や詳細を含めてください。全体で{{word_count}}文字程度を目安にしてください。',
                        variables: ['title', 'topic', 'intro', 'sections', 'word_count'],
                        dependsOn: ['title', 'intro']
                    },
                    {
                        id: 'conclusion',
                        name: 'まとめ',
                        description: '記事の要約とCTA',
                        prompt: '以下のブログ記事のまとめを書いてください:\n\nタイトル: {{title}}\n本文の要約: {{main_content_summary}}\n\n記事の要点をまとめ、読者に行動を促すCTA（Call to Action）を含めてください（200文字程度）。',
                        variables: ['title', 'main_content_summary'],
                        dependsOn: ['main-sections']
                    }
                ],
                defaultVariables: {
                    audience: '一般読者',
                    sections: '3',
                    word_count: '2000',
                    keywords: ''
                }
            },
            'technical-doc': {
                id: 'technical-doc',
                name: '技術文書',
                description: '技術仕様書やAPIドキュメントを体系的に生成',
                icon: '📘',
                sections: [
                    {
                        id: 'overview',
                        name: '概要',
                        description: '技術の概要と目的',
                        prompt: '以下の技術について、概要セクションを書いてください:\n\n技術名: {{tech_name}}\n目的: {{purpose}}\nターゲット読者: {{audience}}\n\n概要には以下を含めてください:\n- 技術の説明\n- 主な目的と利点\n- 対象ユーザー\n- 前提知識',
                        variables: ['tech_name', 'purpose', 'audience']
                    },
                    {
                        id: 'requirements',
                        name: '要件',
                        description: 'システム要件と前提条件',
                        prompt: '以下の技術の要件セクションを書いてください:\n\n技術名: {{tech_name}}\n\n以下を明確に記述してください:\n- システム要件（OS、言語バージョンなど）\n- 必要なソフトウェア/ライブラリ\n- 前提条件\n- 推奨環境',
                        variables: ['tech_name'],
                        dependsOn: ['overview']
                    },
                    {
                        id: 'installation',
                        name: 'インストール',
                        description: 'インストール手順',
                        prompt: '以下の技術のインストール手順を詳細に書いてください:\n\n技術名: {{tech_name}}\n環境: {{environment}}\n\nステップバイステップで、コマンド例やコード例を含めて説明してください。',
                        variables: ['tech_name', 'environment'],
                        dependsOn: ['requirements']
                    },
                    {
                        id: 'usage',
                        name: '使用方法',
                        description: '基本的な使用方法と例',
                        prompt: '以下の技術の基本的な使用方法を、実例を交えて説明してください:\n\n技術名: {{tech_name}}\n\n以下を含めてください:\n- 基本的な使い方\n- コード例（最低3つ）\n- よくある使用パターン\n- 注意事項',
                        variables: ['tech_name'],
                        dependsOn: ['installation']
                    },
                    {
                        id: 'api-reference',
                        name: 'APIリファレンス',
                        description: 'API仕様の詳細',
                        prompt: '以下の技術のAPIリファレンスを作成してください:\n\n技術名: {{tech_name}}\n主要な機能: {{main_features}}\n\n各API/関数について以下を含めてください:\n- 関数名/エンドポイント\n- パラメータ\n- 戻り値\n- 使用例\n- 注意事項',
                        variables: ['tech_name', 'main_features'],
                        dependsOn: ['usage']
                    },
                    {
                        id: 'troubleshooting',
                        name: 'トラブルシューティング',
                        description: 'よくある問題と解決方法',
                        prompt: '以下の技術について、よくある問題とその解決方法を書いてください:\n\n技術名: {{tech_name}}\n\n一般的なエラーとその対処法を、具体的な手順とともに説明してください。',
                        variables: ['tech_name'],
                        dependsOn: ['api-reference']
                    }
                ],
                defaultVariables: {
                    audience: '開発者',
                    environment: 'Linux/macOS',
                    main_features: ''
                }
            },
            'presentation': {
                id: 'presentation',
                name: 'プレゼンテーション',
                description: 'スライド形式のプレゼン資料を生成',
                icon: '🎤',
                sections: [
                    {
                        id: 'title-slide',
                        name: 'タイトルスライド',
                        description: 'プレゼンのタイトルとサブタイトル',
                        prompt: '以下のテーマについて、プレゼンテーションのタイトルスライドを作成してください:\n\nテーマ: {{theme}}\n対象者: {{audience}}\n目的: {{purpose}}\n\n以下を含めてください:\n- メインタイトル（キャッチー）\n- サブタイトル（補足説明）\n- 発表者情報（プレースホルダー）',
                        variables: ['theme', 'audience', 'purpose']
                    },
                    {
                        id: 'agenda',
                        name: 'アジェンダ',
                        description: 'プレゼンの流れ',
                        prompt: '以下のプレゼンテーションのアジェンダスライドを作成してください:\n\nタイトル: {{title}}\nテーマ: {{theme}}\n想定時間: {{duration}}分\n\n{{sections}}つの主要セクションに分けて、各セクションのタイトルと概要を箇条書きで示してください。',
                        variables: ['title', 'theme', 'duration', 'sections'],
                        dependsOn: ['title-slide']
                    },
                    {
                        id: 'content-slides',
                        name: 'コンテンツスライド',
                        description: '本編のスライド群',
                        prompt: '以下のプレゼンテーションの本編スライドを{{sections}}枚作成してください:\n\nテーマ: {{theme}}\nアジェンダ: {{agenda}}\n対象者: {{audience}}\n\n各スライドは以下の形式で:\n\n# スライド[番号]: [タイトル]\n\n- ポイント1\n- ポイント2\n- ポイント3\n\n[補足説明]\n\nビジュアルやデータを含める場合は[図表: 説明]のように示してください。',
                        variables: ['theme', 'agenda', 'audience', 'sections'],
                        dependsOn: ['agenda']
                    },
                    {
                        id: 'conclusion',
                        name: 'まとめ',
                        description: '要点のまとめ',
                        prompt: 'プレゼンテーションのまとめスライドを作成してください:\n\nタイトル: {{title}}\nテーマ: {{theme}}\n\n以下を含めてください:\n- 主要なポイントの要約（3-5点）\n- 重要なメッセージ\n- 今後のアクション',
                        variables: ['title', 'theme'],
                        dependsOn: ['content-slides']
                    },
                    {
                        id: 'qa',
                        name: 'Q&A',
                        description: '質疑応答スライド',
                        prompt: 'Q&Aスライドを作成してください:\n\nテーマ: {{theme}}\n\nよくある質問を{{qa_count}}つ予想し、それぞれに対する簡潔な回答を用意してください。',
                        variables: ['theme', 'qa_count'],
                        dependsOn: ['conclusion']
                    }
                ],
                defaultVariables: {
                    duration: '30',
                    sections: '5',
                    qa_count: '5'
                }
            },
            'academic-paper': {
                id: 'academic-paper',
                name: '学術論文',
                description: '学術論文形式の文書を生成',
                icon: '🎓',
                sections: [
                    {
                        id: 'abstract',
                        name: 'アブストラクト',
                        description: '研究の要約',
                        prompt: '以下の研究についてアブストラクトを書いてください（200-250語）:\n\n研究テーマ: {{topic}}\n研究目的: {{purpose}}\n手法: {{methodology}}\n主な発見: {{findings}}\n\nアブストラクトには以下を含めてください:\n- 背景\n- 目的\n- 方法\n- 結果\n- 結論',
                        variables: ['topic', 'purpose', 'methodology', 'findings']
                    },
                    {
                        id: 'introduction',
                        name: '序論',
                        description: '研究の背景と目的',
                        prompt: '以下の研究の序論を書いてください:\n\n研究テーマ: {{topic}}\n研究目的: {{purpose}}\n研究の意義: {{significance}}\n\n序論には以下を含めてください:\n- 研究分野の背景\n- 先行研究のレビュー\n- 研究の必要性\n- 本研究の目的と貢献',
                        variables: ['topic', 'purpose', 'significance'],
                        dependsOn: ['abstract']
                    },
                    {
                        id: 'methodology',
                        name: '研究方法',
                        description: '研究手法の詳細',
                        prompt: '以下の研究の方法論セクションを書いてください:\n\n研究テーマ: {{topic}}\n研究手法: {{methodology}}\nデータ: {{data_description}}\n\n以下を明確に記述してください:\n- 研究デザイン\n- データ収集方法\n- 分析手法\n- 使用したツール/技術',
                        variables: ['topic', 'methodology', 'data_description'],
                        dependsOn: ['introduction']
                    },
                    {
                        id: 'results',
                        name: '結果',
                        description: '研究結果の提示',
                        prompt: '以下の研究の結果セクションを書いてください:\n\n研究テーマ: {{topic}}\n主な発見: {{findings}}\n\n結果を明確に提示してください:\n- 主要な発見（データ/統計を含む）\n- 図表の説明\n- 観察された傾向やパターン',
                        variables: ['topic', 'findings'],
                        dependsOn: ['methodology']
                    },
                    {
                        id: 'discussion',
                        name: '考察',
                        description: '結果の解釈と議論',
                        prompt: '以下の研究の考察セクションを書いてください:\n\n研究テーマ: {{topic}}\n結果の要約: {{results_summary}}\n\n以下を含めてください:\n- 結果の解釈\n- 先行研究との比較\n- 研究の限界\n- 今後の研究課題',
                        variables: ['topic', 'results_summary'],
                        dependsOn: ['results']
                    },
                    {
                        id: 'conclusion',
                        name: '結論',
                        description: '研究の総括',
                        prompt: '以下の研究の結論を書いてください:\n\n研究テーマ: {{topic}}\n主な発見: {{findings}}\n研究の意義: {{significance}}\n\n以下を簡潔にまとめてください:\n- 研究の要約\n- 主要な貢献\n- 実践的な示唆\n- 今後の展望',
                        variables: ['topic', 'findings', 'significance'],
                        dependsOn: ['discussion']
                    }
                ],
                defaultVariables: {
                    significance: '',
                    data_description: '',
                    results_summary: ''
                }
            }
        };
    }

    /**
     * 利用可能なテンプレート一覧を取得
     */
    getAvailableTemplates() {
        return Object.values(this.templates).map(template => ({
            id: template.id,
            name: template.name,
            description: template.description,
            icon: template.icon,
            sectionCount: template.sections.length
        }));
    }

    /**
     * 特定のテンプレートを取得
     */
    getTemplate(templateId) {
        return this.templates[templateId] || null;
    }

    /**
     * テンプレートのセクション一覧を取得
     */
    getTemplateSections(templateId) {
        const template = this.getTemplate(templateId);
        return template ? template.sections : [];
    }

    /**
     * セクションのプロンプトを生成
     */
    generateSectionPrompt(templateId, sectionId, variables = {}) {
        const template = this.getTemplate(templateId);
        if (!template) {
            throw new Error(`Template not found: ${templateId}`);
        }

        const section = template.sections.find(s => s.id === sectionId);
        if (!section) {
            throw new Error(`Section not found: ${sectionId}`);
        }

        // デフォルト変数とマージ
        const allVariables = {
            ...template.defaultVariables,
            ...variables
        };

        // プロンプトの変数を置換
        let prompt = section.prompt;
        for (const [key, value] of Object.entries(allVariables)) {
            const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
            prompt = prompt.replace(regex, value || `[${key}]`);
        }

        return prompt;
    }

    /**
     * 全セクションのプロンプトを一度に生成（一括生成モード）
     */
    generateFullDocumentPrompt(templateId, variables = {}) {
        const template = this.getTemplate(templateId);
        if (!template) {
            throw new Error(`Template not found: ${templateId}`);
        }

        const allVariables = {
            ...template.defaultVariables,
            ...variables
        };

        const prompts = [];

        prompts.push(`以下の構造で「${template.name}」を作成してください:\n`);

        template.sections.forEach((section, index) => {
            prompts.push(`\n## ${index + 1}. ${section.name}`);
            prompts.push(section.description);
        });

        prompts.push('\n\n---\n\n入力情報:');

        for (const [key, value] of Object.entries(allVariables)) {
            if (value) {
                prompts.push(`- ${key}: ${value}`);
            }
        }

        prompts.push('\n\n各セクションを順番に、見出しを付けて生成してください。');

        return prompts.join('\n');
    }

    /**
     * セクションの依存関係をチェック
     */
    checkSectionDependencies(templateId, sectionId, generatedSections = []) {
        const template = this.getTemplate(templateId);
        if (!template) return { satisfied: false, missing: [] };

        const section = template.sections.find(s => s.id === sectionId);
        if (!section) return { satisfied: false, missing: [] };

        if (!section.dependsOn || section.dependsOn.length === 0) {
            return { satisfied: true, missing: [] };
        }

        const missing = section.dependsOn.filter(dep => !generatedSections.includes(dep));

        return {
            satisfied: missing.length === 0,
            missing
        };
    }

    /**
     * 次に生成可能なセクションを取得
     */
    getNextAvailableSections(templateId, generatedSections = []) {
        const template = this.getTemplate(templateId);
        if (!template) return [];

        return template.sections.filter(section => {
            // 既に生成済みのセクションは除外
            if (generatedSections.includes(section.id)) {
                return false;
            }

            // 依存関係をチェック
            const deps = this.checkSectionDependencies(templateId, section.id, generatedSections);
            return deps.satisfied;
        });
    }
}

// シングルトンインスタンス
let structuredGeneratorInstance = null;

/**
 * StructuredGenerator のシングルトンインスタンスを取得
 */
export function getStructuredGenerator() {
    if (!structuredGeneratorInstance) {
        structuredGeneratorInstance = new StructuredGenerator();
    }
    return structuredGeneratorInstance;
}
