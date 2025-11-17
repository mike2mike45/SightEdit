/**
 * AIService - AI Integration Service
 * ES2024対応のAI統合サービス
 */
import { BaseComponent } from '../core/ComponentFactory.js';

export class AIService extends BaseComponent {
  #providers = new Map();
  #currentProvider = null;
  #rateLimiter = null;
  #cache = new Map();
  #requestHistory = [];
  #maxHistorySize = 100;

  constructor() {
    super();
    
    this.#rateLimiter = new RateLimiter({
      maxRequests: 10,
      windowMs: 60000 // 1分間に10リクエスト
    });
  }

  /**
   * 初期化
   */
  async init() {
    await this.#setupProviders();
    await this.#loadConfiguration();
  }

  /**
   * プロバイダーをセットアップ
   * @private
   */
  async #setupProviders() {
    // Claude API プロバイダー
    this.#providers.set('claude', new ClaudeProvider());
    
    // OpenAI API プロバイダー
    this.#providers.set('openai', new OpenAIProvider());
    
    // Gemini API プロバイダー
    this.#providers.set('gemini', new GeminiProvider());
    
    // ローカル AI プロバイダー（Ollama等）
    this.#providers.set('local', new LocalAIProvider());
  }

  /**
   * 設定を読み込み
   * @private
   */
  async #loadConfiguration() {
    // デフォルト設定
    this.#currentProvider = this.#providers.get('claude');
  }

  /**
   * AI処理を実行
   * @param {string} prompt - プロンプト
   * @param {Object} options - オプション
   * @returns {Promise<Object>} AI応答
   */
  async processRequest(prompt, options = {}) {
    const requestId = this.#generateRequestId();
    
    try {
      // レート制限チェック
      await this.#rateLimiter.checkLimit();
      
      // キャッシュチェック
      const cacheKey = this.#generateCacheKey(prompt, options);
      if (options.useCache !== false && this.#cache.has(cacheKey)) {
        const cachedResult = this.#cache.get(cacheKey);
        return {
          ...cachedResult,
          fromCache: true,
          requestId
        };
      }

      // AI処理実行
      const startTime = Date.now();
      const result = await this.#currentProvider.process(prompt, options);
      const processingTime = Date.now() - startTime;

      // 結果を整形
      const response = {
        id: requestId,
        content: result.content,
        metadata: {
          provider: this.#currentProvider.getName(),
          model: result.model || 'unknown',
          processingTime,
          tokenUsage: result.tokenUsage,
          ...result.metadata
        },
        timestamp: Date.now(),
        fromCache: false
      };

      // キャッシュに保存
      if (options.useCache !== false) {
        this.#cache.set(cacheKey, {
          content: response.content,
          metadata: response.metadata
        });
      }

      // 履歴に追加
      this.#addToHistory({
        requestId,
        prompt: prompt.substring(0, 200) + '...',
        response: response.content.substring(0, 200) + '...',
        processingTime,
        provider: response.metadata.provider,
        timestamp: response.timestamp
      });

      return response;

    } catch (error) {
      console.error('[AIService] Process request error:', error);
      
      this.#addToHistory({
        requestId,
        prompt: prompt.substring(0, 200) + '...',
        error: error.message,
        timestamp: Date.now()
      });

      throw new Error(`AI処理エラー: ${error.message}`);
    }
  }

  /**
   * 翻訳を実行
   * @param {string} text - 翻訳対象テキスト
   * @param {string} targetLanguage - 対象言語
   * @param {string} sourceLanguage - 元言語
   * @returns {Promise<Object>} 翻訳結果
   */
  async translate(text, targetLanguage, sourceLanguage = 'auto') {
    const prompt = this.#buildTranslatePrompt(text, sourceLanguage, targetLanguage);
    
    return await this.processRequest(prompt, {
      type: 'translation',
      targetLanguage,
      sourceLanguage,
      temperature: 0.3 // 翻訳は一貫性を重視
    });
  }

  /**
   * 要約を実行
   * @param {string} text - 要約対象テキスト
   * @param {Object} options - 要約オプション
   * @returns {Promise<Object>} 要約結果
   */
  async summarize(text, options = {}) {
    const {
      maxLength = 200,
      style = 'standard',
      focus = 'general'
    } = options;

    const prompt = this.#buildSummarizePrompt(text, maxLength, style, focus);
    
    return await this.processRequest(prompt, {
      type: 'summarization',
      maxLength,
      style,
      focus,
      temperature: 0.5
    });
  }

  /**
   * 文章改善を実行
   * @param {string} text - 改善対象テキスト
   * @param {Object} options - 改善オプション
   * @returns {Promise<Object>} 改善結果
   */
  async improveText(text, options = {}) {
    const {
      improvementType = 'general',
      tone = 'neutral',
      audience = 'general'
    } = options;

    const prompt = this.#buildImprovePrompt(text, improvementType, tone, audience);
    
    return await this.processRequest(prompt, {
      type: 'improvement',
      improvementType,
      tone,
      audience,
      temperature: 0.7
    });
  }

  /**
   * 続き書きを実行
   * @param {string} text - 続きを書く対象テキスト
   * @param {Object} options - 続き書きオプション
   * @returns {Promise<Object>} 続き書き結果
   */
  async continueText(text, options = {}) {
    const {
      length = 'medium',
      tone = 'neutral',
      style = 'continue'
    } = options;

    const prompt = this.#buildContinuePrompt(text, length, tone, style);
    
    return await this.processRequest(prompt, {
      type: 'continuation',
      length,
      tone,
      style,
      temperature: 0.8
    });
  }

  /**
   * カスタムプロンプト処理を実行
   * @param {string} prompt - カスタムプロンプト
   * @param {string} text - 対象テキスト
   * @param {Object} options - オプション
   * @returns {Promise<Object>} 処理結果
   */
  async customProcess(prompt, text, options = {}) {
    const fullPrompt = `${prompt}\n\n対象テキスト：\n${text}`;
    
    return await this.processRequest(fullPrompt, {
      type: 'custom',
      customPrompt: prompt,
      temperature: options.temperature || 0.7,
      ...options
    });
  }

  /**
   * プロバイダーを設定
   * @param {string} providerName - プロバイダー名
   * @param {Object} config - 設定
   */
  async setProvider(providerName, config = {}) {
    if (!this.#providers.has(providerName)) {
      throw new Error(`Unknown AI provider: ${providerName}`);
    }

    const provider = this.#providers.get(providerName);
    await provider.configure(config);
    this.#currentProvider = provider;

    console.log(`[AIService] Provider set to: ${providerName}`);
  }

  /**
   * プロバイダーの状態を取得
   * @returns {Object} プロバイダー状態
   */
  getProviderStatus() {
    return {
      current: this.#currentProvider?.getName() || 'none',
      available: Array.from(this.#providers.keys()),
      configured: this.#currentProvider?.isConfigured() || false
    };
  }

  /**
   * 翻訳プロンプトを構築
   * @private
   */
  #buildTranslatePrompt(text, sourceLanguage, targetLanguage) {
    const languageMap = {
      'en': '英語', 'ja': '日本語', 'ko': '韓国語', 
      'zh': '中国語', 'fr': 'フランス語', 'de': 'ドイツ語',
      'es': 'スペイン語', 'pt': 'ポルトガル語', 'it': 'イタリア語',
      'ru': 'ロシア語', 'ar': 'アラビア語', 'hi': 'ヒンディー語'
    };

    const sourceName = languageMap[sourceLanguage] || sourceLanguage;
    const targetName = languageMap[targetLanguage] || targetLanguage;

    return `以下の文章を${targetName}に翻訳してください。自然で読みやすい翻訳を心がけ、原文の意図とニュアンスを保持してください。

原文${sourceLanguage !== 'auto' ? `（${sourceName}）` : ''}：
${text}

翻訳（${targetName}）：`;
  }

  /**
   * 要約プロンプトを構築
   * @private
   */
  #buildSummarizePrompt(text, maxLength, style, focus) {
    const styleMap = {
      'standard': '標準的な要約',
      'bullet': '箇条書きでの要約',
      'executive': 'エグゼクティブサマリー',
      'academic': '学術的な要約',
      'creative': '創造的な要約'
    };

    const focusMap = {
      'general': '全般的な内容',
      'key_points': '重要なポイント',
      'conclusions': '結論部分',
      'actions': '実行可能な項目',
      'insights': '洞察と分析'
    };

    return `以下の文章を${maxLength}文字以内で${styleMap[style] || '要約'}してください。
${focusMap[focus] || '全般的な内容'}を中心にまとめてください。

文章：
${text}

要約：`;
  }

  /**
   * 改善プロンプトを構築
   * @private
   */
  #buildImprovePrompt(text, improvementType, tone, audience) {
    const typeMap = {
      'general': '全般的な改善',
      'clarity': '明確性の向上',
      'grammar': '文法の修正',
      'style': '文体の改善',
      'structure': '構造の整理',
      'vocabulary': '語彙の向上',
      'flow': '文章の流れの改善'
    };

    const toneMap = {
      'formal': '正式',
      'casual': 'カジュアル',
      'professional': 'プロフェッショナル',
      'friendly': 'フレンドリー',
      'academic': '学術的',
      'creative': '創造的'
    };

    return `以下の文章の${typeMap[improvementType] || '改善'}を行ってください。
対象読者：${audience}
文体：${toneMap[tone] || tone}

元の文章：
${text}

改善された文章：`;
  }

  /**
   * 続き書きプロンプトを構築
   * @private
   */
  #buildContinuePrompt(text, length, tone, style) {
    const lengthMap = {
      'short': '短く（100-200文字）',
      'medium': '中程度（300-500文字）',
      'long': '詳しく（500-800文字）'
    };

    const toneMap = {
      'neutral': '中立的',
      'formal': '正式',
      'casual': 'カジュアル',
      'creative': '創造的',
      'analytical': '分析的'
    };

    return `以下の文章の続きを${lengthMap[length] || 'medium'}で書いてください。
文体は${toneMap[tone] || tone}なトーンで、文章の流れと一貫性を保持してください。

既存の文章：
${text}

続き：`;
  }

  /**
   * リクエストIDを生成
   * @private
   */
  #generateRequestId() {
    return `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * キャッシュキーを生成
   * @private
   */
  #generateCacheKey(prompt, options) {
    const key = JSON.stringify({ prompt, options });
    return btoa(key).substring(0, 32);
  }

  /**
   * 履歴に追加
   * @private
   */
  #addToHistory(entry) {
    this.#requestHistory.unshift(entry);
    
    if (this.#requestHistory.length > this.#maxHistorySize) {
      this.#requestHistory = this.#requestHistory.slice(0, this.#maxHistorySize);
    }
  }

  /**
   * 履歴を取得
   * @param {number} limit - 取得件数上限
   * @returns {Array} 履歴一覧
   */
  getHistory(limit = 20) {
    return this.#requestHistory.slice(0, limit);
  }

  /**
   * キャッシュをクリア
   */
  clearCache() {
    this.#cache.clear();
    console.log('[AIService] Cache cleared');
  }

  /**
   * 統計情報を取得
   * @returns {Object} 統計情報
   */
  getStatistics() {
    const history = this.#requestHistory;
    const totalRequests = history.length;
    const successfulRequests = history.filter(h => !h.error).length;
    const averageProcessingTime = history
      .filter(h => h.processingTime)
      .reduce((sum, h) => sum + h.processingTime, 0) / (successfulRequests || 1);

    return {
      totalRequests,
      successfulRequests,
      errorRate: totalRequests > 0 ? (totalRequests - successfulRequests) / totalRequests : 0,
      averageProcessingTime: Math.round(averageProcessingTime),
      cacheSize: this.#cache.size,
      currentProvider: this.#currentProvider?.getName(),
      rateLimitStatus: this.#rateLimiter.getStatus()
    };
  }

  /**
   * 破棄処理
   */
  destroy() {
    this.clearCache();
    this.#requestHistory = [];
    this.#providers.clear();
    this.#currentProvider = null;
    this.#rateLimiter = null;
    
    super.destroy();
  }
}

/**
 * レート制限クラス
 */
class RateLimiter {
  #requests = [];
  #maxRequests;
  #windowMs;

  constructor(options) {
    this.#maxRequests = options.maxRequests || 10;
    this.#windowMs = options.windowMs || 60000;
  }

  async checkLimit() {
    const now = Date.now();
    
    // 古いリクエストを削除
    this.#requests = this.#requests.filter(
      time => now - time < this.#windowMs
    );

    if (this.#requests.length >= this.#maxRequests) {
      const oldestRequest = Math.min(...this.#requests);
      const waitTime = this.#windowMs - (now - oldestRequest);
      throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }

    this.#requests.push(now);
  }

  getStatus() {
    const now = Date.now();
    const recentRequests = this.#requests.filter(
      time => now - time < this.#windowMs
    );

    return {
      current: recentRequests.length,
      max: this.#maxRequests,
      windowMs: this.#windowMs,
      remaining: Math.max(0, this.#maxRequests - recentRequests.length)
    };
  }
}

/**
 * ベースAIプロバイダー
 */
class BaseAIProvider {
  #name = '';
  #config = {};
  #isConfigured = false;

  constructor(name) {
    this.#name = name;
  }

  getName() {
    return this.#name;
  }

  isConfigured() {
    return this.#isConfigured;
  }

  async configure(config) {
    this.#config = { ...this.#config, ...config };
    this.#isConfigured = this.#validateConfig();
  }

  #validateConfig() {
    return !!(this.#config.apiKey || this.#config.endpoint);
  }

  async process(prompt, options) {
    throw new Error('process method must be implemented by subclass');
  }
}

/**
 * Claude APIプロバイダー
 */
class ClaudeProvider extends BaseAIProvider {
  constructor() {
    super('claude');
  }

  async process(prompt, options) {
    // 実際のClaude API実装
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.#config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: options.model || 'claude-3-sonnet-20240229',
        max_tokens: options.maxTokens || 4000,
        temperature: options.temperature || 0.7,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: data.content[0].text,
      model: data.model,
      tokenUsage: data.usage,
      metadata: {
        stopReason: data.stop_reason
      }
    };
  }
}

/**
 * OpenAI APIプロバイダー
 */
class OpenAIProvider extends BaseAIProvider {
  constructor() {
    super('openai');
  }

  async process(prompt, options) {
    // 実際のOpenAI API実装
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.#config.apiKey}`
      },
      body: JSON.stringify({
        model: options.model || 'gpt-4',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: options.maxTokens || 4000,
        temperature: options.temperature || 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: data.choices[0].message.content,
      model: data.model,
      tokenUsage: data.usage,
      metadata: {
        finishReason: data.choices[0].finish_reason
      }
    };
  }
}

/**
 * Gemini APIプロバイダー
 */
class GeminiProvider extends BaseAIProvider {
  constructor() {
    super('gemini');
  }

  async process(prompt, options) {
    // 実際のGemini API実装
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.#config.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens || 4000
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: data.candidates[0].content.parts[0].text,
      model: 'gemini-pro',
      tokenUsage: data.usageMetadata,
      metadata: {
        finishReason: data.candidates[0].finishReason
      }
    };
  }
}

/**
 * ローカルAIプロバイダー（Ollama等）
 */
class LocalAIProvider extends BaseAIProvider {
  constructor() {
    super('local');
  }

  async process(prompt, options) {
    // Ollama等のローカルAI実装
    const endpoint = this.#config.endpoint || 'http://localhost:11434/api/generate';
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model || 'llama2',
        prompt: prompt,
        options: {
          temperature: options.temperature || 0.7,
          num_predict: options.maxTokens || 4000
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Local AI error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: data.response,
      model: data.model,
      tokenUsage: {
        prompt_tokens: data.prompt_eval_count,
        completion_tokens: data.eval_count,
        total_tokens: data.prompt_eval_count + data.eval_count
      },
      metadata: {
        evalDuration: data.eval_duration,
        loadDuration: data.load_duration
      }
    };
  }
}