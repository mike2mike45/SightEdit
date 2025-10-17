// AIコマンド選択ツール管理クラス
import { AIManager } from './ai-manager.js';

export class AICommandManager extends AIManager {
    constructor() {
        super();
        
        // コマンド定義
        this.commands = {
            // 文書作成・編集系
            'summary': {
                name: '要約作成',
                category: 'document',
                description: '長文を要点抽出して要約',
                prompt: '以下のテキストを簡潔に要約してください。重要なポイントを箇条書きで示し、最後に2-3文で全体をまとめてください：\n\n{text}',
                icon: '📝'
            },
            'summary_length': {
                name: '指定文字数で要約',
                category: 'document',
                description: '文字数を指定して要約',
                prompt: '以下のテキストを{length}文字以内で要約してください：\n\n{text}',
                requiresInput: true,
                inputField: { name: 'length', label: '文字数', type: 'number', default: 200 },
                icon: '📏'
            },
            'proofread': {
                name: '校正・推敲',
                category: 'document',
                description: '誤字脱字・文体統一',
                prompt: '以下のテキストの誤字脱字、誤変換を修正し、文体を統一してください。修正箇所は【修正前→修正後】の形式で示してから、修正後の全文を提示してください：\n\n{text}',
                icon: '✏️'
            },
            'translate_en': {
                name: '英語に翻訳',
                category: 'document',
                description: '日本語→英語翻訳',
                prompt: '以下の日本語テキストを自然な英語に翻訳してください。専門用語は適切に翻訳し、文化的な文脈も考慮してください：\n\n{text}',
                icon: '🌐'
            },
            'translate_ja': {
                name: '日本語に翻訳',
                category: 'document',
                description: '英語→日本語翻訳',
                prompt: '以下の英語テキストを自然な日本語に翻訳してください。専門用語は適切に翻訳し、読みやすい日本語にしてください：\n\n{text}',
                icon: '🇯🇵'
            },
            
            // 文体変更系
            'style_formal': {
                name: '敬語・フォーマルに変更',
                category: 'style',
                description: 'ビジネス文書向けの丁寧な文体',
                prompt: '以下のテキストを敬語を使った丁寧でフォーマルな文体に変更してください：\n\n{text}',
                icon: '👔'
            },
            'style_casual': {
                name: 'カジュアルに変更',
                category: 'style',
                description: '親しみやすい文体',
                prompt: '以下のテキストをカジュアルで親しみやすい文体に変更してください。硬い表現を避け、読みやすくしてください：\n\n{text}',
                icon: '😊'
            },
            'style_simple': {
                name: '簡潔に変更',
                category: 'style',
                description: '冗長な表現を削除',
                prompt: '以下のテキストを簡潔で分かりやすい文体に変更してください。冗長な表現を削除し、要点を明確にしてください：\n\n{text}',
                icon: '✂️'
            },
            'style_detailed': {
                name: '詳細に変更',
                category: 'style',
                description: '詳しい説明を追加',
                prompt: '以下のテキストをより詳細で説明的な文体に変更してください。必要に応じて背景情報や例を追加してください：\n\n{text}',
                icon: '📚'
            },
            
            // ビジネス文書生成
            'email_thanks': {
                name: 'お礼メール作成',
                category: 'business',
                description: 'ビジネス向けお礼メール',
                prompt: '以下の内容を基に、ビジネス向けの丁寧なお礼メールを作成してください。件名、宛名、本文、署名の形式で作成してください：\n\n{text}',
                icon: '💌'
            },
            'email_request': {
                name: '依頼メール作成',
                category: 'business',
                description: 'ビジネス向け依頼メール',
                prompt: '以下の内容を基に、ビジネス向けの丁寧な依頼メールを作成してください。相手に負担をかけない配慮をしつつ、要件を明確に伝えてください：\n\n{text}',
                icon: '📧'
            },
            'proposal': {
                name: '提案書作成',
                category: 'business',
                description: '企画・提案書の作成',
                prompt: '以下の内容を基に、説得力のある提案書を作成してください。背景、目的、提案内容、期待効果、スケジュール、予算の順で構成してください：\n\n{text}',
                icon: '📑'
            },
            'report': {
                name: '報告書作成',
                category: 'business',
                description: 'ビジネス報告書の作成',
                prompt: '以下の内容を基に、構造化された報告書を作成してください。概要、詳細、結果、今後の対応の順で整理してください：\n\n{text}',
                icon: '📊'
            },
            
            // マーケティング・コンテンツ系
            'sns_twitter': {
                name: 'Twitter投稿文作成',
                category: 'marketing',
                description: '140文字以内のツイート',
                prompt: '以下の内容を基に、魅力的なTwitter投稿文を作成してください。140文字以内で、ハッシュタグも含めてください：\n\n{text}',
                icon: '🐦'
            },
            'blog_intro': {
                name: 'ブログ導入文作成',
                category: 'marketing',
                description: '読者を引き込む導入文',
                prompt: '以下の内容を基に、読者の興味を引くブログ記事の導入文を作成してください。問題提起から始めて、記事を読む価値を伝えてください：\n\n{text}',
                icon: '✍️'
            },
            'catchcopy': {
                name: 'キャッチコピー生成',
                category: 'marketing',
                description: '印象的なキャッチコピー',
                prompt: '以下の内容を基に、印象的で記憶に残るキャッチコピーを5つ提案してください。短く、インパクトがあり、価値を伝えるものにしてください：\n\n{text}',
                icon: '💡'
            },
            
            // クリエイティブ系
            'novel_synopsis': {
                name: '小説のあらすじ作成',
                category: 'creative',
                description: '指定文字数で魅力的な小説あらすじを生成',
                prompt: '以下の内容を基に、{length}文字以内で魅力的な小説のあらすじを作成してください。読み手が「面白そう！」と思わせるように、以下の要素を含めて最適化してください：\n\n【あらすじ作成のポイント】\n1. 主人公の魅力的な設定と動機\n2. 興味深い世界観や状況設定\n3. 読者の好奇心を刺激する謎や対立\n4. 物語の核となる魅力的な要素\n5. 続きが気になる引きのある結び\n\n【元となる内容】\n{text}',
                requiresInput: true,
                inputField: { name: 'length', label: '最大文字数', type: 'number', default: 400, placeholder: '例: 400' },
                icon: '📖'
            },
            'story_outline': {
                name: '物語の構成案作成',
                category: 'creative',
                description: '起承転結の物語構成を提案',
                prompt: '以下の内容を基に、魅力的な物語の構成案を起承転結形式で作成してください。各部分で読者を引きつける要素を盛り込んでください：\n\n【構成案の形式】\n■起（導入）: 主人公と世界観の魅力的な提示\n■承（展開）: 事件の発生と謎の深まり\n■転（クライマックス）: 意外な展開と最大の危機\n■結（結末）: 感動的な解決と余韻\n\n【元となる内容】\n{text}',
                icon: '📚'
            },
            'character_profile': {
                name: 'キャラクター設定作成',
                category: 'creative',
                description: '魅力的なキャラクター設定を生成',
                prompt: '以下の内容を基に、魅力的なキャラクター設定を作成してください。読者が感情移入しやすく、記憶に残るキャラクターにしてください：\n\n【キャラクター設定項目】\n・名前と年齢\n・外見的特徴\n・性格（長所と短所）\n・背景・過去\n・動機・目標\n・特技・能力\n・口癖・特徴的な行動\n・他キャラとの関係性\n\n【元となる内容】\n{text}',
                icon: '👤'
            },
            'dialogue_improve': {
                name: '会話文の改善',
                category: 'creative',
                description: '自然で魅力的な会話文に変換',
                prompt: '以下の会話文をより自然で魅力的に改善してください。キャラクターの個性が伝わり、読者が引き込まれるような会話にしてください：\n\n【改善のポイント】\n1. キャラクターらしい話し方\n2. 自然な会話のテンポ\n3. 感情が伝わる表現\n4. 適切な方言や口癖\n5. 状況に応じた敬語・タメ口の使い分け\n\n【改善前の会話文】\n{text}',
                icon: '💬'
            },
            
            // データ分析・業務効率化
            'analyze': {
                name: 'データ分析',
                category: 'analysis',
                description: 'データから洞察を抽出',
                prompt: '以下のデータを分析し、重要な洞察、傾向、パターンを特定してください。また、改善提案も含めてください：\n\n{text}',
                icon: '📈'
            },
            'todo': {
                name: 'タスクリスト作成',
                category: 'analysis',
                description: 'やることリストの生成',
                prompt: '以下の内容から、実行可能なタスクリストを作成してください。優先順位を付け、期限の目安も含めてください：\n\n{text}',
                icon: '✅'
            }
        };
        
        // カテゴリ定義
        this.categories = {
            'document': { name: '文書編集', icon: '📝' },
            'style': { name: '文体変更', icon: '✨' },
            'business': { name: 'ビジネス', icon: '💼' },
            'marketing': { name: 'マーケティング', icon: '📢' },
            'creative': { name: 'クリエイティブ', icon: '🎨' },
            'analysis': { name: '分析・効率化', icon: '📊' }
        };
    }
    
    /**
     * コマンドを実行
     * @param {string} commandId - コマンドID
     * @param {string} text - 処理対象テキスト
     * @param {Object} params - 追加パラメータ
     */
    async executeCommand(commandId, text, params = {}) {
        const command = this.commands[commandId];
        if (!command) {
            throw new Error(`コマンドが見つかりません: ${commandId}`);
        }
        
        // プロンプトの構築
        let prompt = command.prompt.replace('{text}', text);
        
        // 追加パラメータの処理
        if (command.requiresInput && params[command.inputField.name]) {
            prompt = prompt.replace(`{${command.inputField.name}}`, params[command.inputField.name]);
        }
        
        // AI呼び出し
        try {
            const result = await this.callAI(prompt);
            return {
                success: true,
                command: command.name,
                result: result
            };
        } catch (error) {
            return {
                success: false,
                command: command.name,
                error: error.message
            };
        }
    }
    
    /**
     * カテゴリ別にコマンドを取得
     * @param {string} category - カテゴリID
     */
    getCommandsByCategory(category) {
        const commands = [];
        for (const [id, command] of Object.entries(this.commands)) {
            if (command.category === category) {
                commands.push({ id, ...command });
            }
        }
        return commands;
    }
    
    /**
     * すべてのカテゴリとコマンドを取得
     */
    getAllCommandsGrouped() {
        const grouped = {};
        for (const [categoryId, categoryInfo] of Object.entries(this.categories)) {
            grouped[categoryId] = {
                ...categoryInfo,
                commands: this.getCommandsByCategory(categoryId)
            };
        }
        return grouped;
    }
    
    /**
     * コマンドパネルのHTMLを生成
     */
    generateCommandPanelHTML() {
        const grouped = this.getAllCommandsGrouped();
        let html = '<div class="ai-command-panel">';
        
        for (const [categoryId, category] of Object.entries(grouped)) {
            html += `
                <div class="command-category">
                    <div class="category-header">
                        <span class="category-icon">${category.icon}</span>
                        <span class="category-name">${category.name}</span>
                    </div>
                    <div class="command-list">
            `;
            
            for (const command of category.commands) {
                html += `
                    <button class="command-button" data-command-id="${command.id}" title="${command.description}">
                        <span class="command-icon">${command.icon}</span>
                        <span class="command-name">${command.name}</span>
                    </button>
                `;
            }
            
            html += `
                    </div>
                </div>
            `;
        }
        
        html += '</div>';
        return html;
    }
}

// シングルトンインスタンス
let commandManager = null;

export function getAICommandManager() {
    if (!commandManager) {
        commandManager = new AICommandManager();
    }
    return commandManager;
}