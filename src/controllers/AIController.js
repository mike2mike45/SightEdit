/**
 * AIController - AI Integration Business Logic
 * ES2024対応のAI統合ビジネスロジック
 */
import { BaseComponent } from '../core/ComponentFactory.js';
import { EVENTS } from '../core/EventBus.js';

export class AIController extends BaseComponent {
  #settingsModel = null;
  #documentModel = null;
  #statusBarView = null;
  #dialogView = null;
  #isInitialized = false;
  #isProcessing = false;
  #aiProvider = null;
  #apiKey = null;
  #requestQueue = [];

  constructor(services) {
    super();
    
    this.#settingsModel = services.settingsModel;
    this.#documentModel = services.documentModel;
    this.#statusBarView = services.statusBarView;
    this.#dialogView = services.dialogView;
  }

  /**
   * 初期化
   */
  async init() {
    if (this.#isInitialized) return;

    await this.#setupEventListeners();
    await this.#loadAISettings();
    
    this.#isInitialized = true;
    
    this.emit(EVENTS.AI_CONTROLLER_READY);
  }

  /**
   * イベントリスナーをセットアップ
   * @private
   */
  async #setupEventListeners() {
    // AI関連イベント
    this.on(EVENTS.AI_PROCESS_REQUEST, this.#handleAIProcessRequest);
    this.on(EVENTS.AI_TRANSLATE_REQUEST, this.#handleTranslateRequest);
    this.on(EVENTS.AI_SUMMARIZE_REQUEST, this.#handleSummarizeRequest);
    this.on(EVENTS.AI_IMPROVE_REQUEST, this.#handleImproveRequest);
    this.on(EVENTS.AI_CONTINUE_REQUEST, this.#handleContinueRequest);
    this.on(EVENTS.AI_CUSTOM_REQUEST, this.#handleCustomRequest);
    this.on(EVENTS.AI_SETTINGS_UPDATE, this.#handleSettingsUpdate);

    // UI関連イベント
    this.on(EVENTS.AI_BUTTON_CLICKED, this.#handleAIButtonClicked);
    this.on(EVENTS.AI_PROMPT_SUBMITTED, this.#handlePromptSubmitted);
  }

  /**
   * AI設定を読み込み
   * @private
   */
  async #loadAISettings() {
    try {
      const settings = await this.#settingsModel.getSettings();
      const aiSettings = settings.ai || {};
      
      this.#aiProvider = aiSettings.provider || 'claude';
      this.#apiKey = aiSettings.apiKey || null;
      
      this.emit(EVENTS.AI_SETTINGS_LOADED, { 
        provider: this.#aiProvider, 
        hasApiKey: !!this.#apiKey 
      });

    } catch (error) {
      console.error('[AIController] Load AI settings error:', error);
    }
  }

  /**
   * AI処理要求ハンドラー
   * @private
   * @param {Object} data - 処理データ
   */
  #handleAIProcessRequest = async (data) => {
    const { type, content, options = {} } = data;
    
    try {
      await this.#validateAIConfiguration();
      
      this.#setProcessingState(true);
      this.#statusBarView.updateStatus('ai_thinking');
      
      const result = await this.#processAIRequest(type, content, options);
      
      this.emit(EVENTS.AI_PROCESS_COMPLETED, {
        type,
        originalContent: content,
        result: result,
        options
      });

    } catch (error) {
      console.error(`[AIController] AI process error (${type}):`, error);
      this.#statusBarView.addNotification(`AI処理エラー: ${error.message}`, 'error');
      
      this.emit(EVENTS.AI_PROCESS_FAILED, {
        type,
        error: error.message,
        originalContent: content
      });
      
    } finally {
      this.#setProcessingState(false);
      this.#statusBarView.updateStatus('ready');
    }
  }

  /**
   * 翻訳要求ハンドラー
   * @private
   * @param {Object} data - 翻訳データ
   */
  #handleTranslateRequest = async (data) => {
    const { content, targetLanguage = 'en', sourceLanguage = 'auto' } = data;
    
    const prompt = this.#buildTranslatePrompt(content, sourceLanguage, targetLanguage);
    
    await this.#handleAIProcessRequest({
      type: 'translate',
      content: prompt,
      options: { targetLanguage, sourceLanguage }
    });
  }

  /**
   * 要約要求ハンドラー
   * @private
   * @param {Object} data - 要約データ
   */
  #handleSummarizeRequest = async (data) => {
    const { content, maxLength = 200, style = 'standard' } = data;
    
    const prompt = this.#buildSummarizePrompt(content, maxLength, style);
    
    await this.#handleAIProcessRequest({
      type: 'summarize',
      content: prompt,
      options: { maxLength, style }
    });
  }

  /**
   * 改善要求ハンドラー
   * @private
   * @param {Object} data - 改善データ
   */
  #handleImproveRequest = async (data) => {
    const { content, improvementType = 'general' } = data;
    
    const prompt = this.#buildImprovePrompt(content, improvementType);
    
    await this.#handleAIProcessRequest({
      type: 'improve',
      content: prompt,
      options: { improvementType }
    });
  }

  /**
   * 続き書き要求ハンドラー
   * @private
   * @param {Object} data - 続き書きデータ
   */
  #handleContinueRequest = async (data) => {
    const { content, tone = 'neutral', length = 'medium' } = data;
    
    const prompt = this.#buildContinuePrompt(content, tone, length);
    
    await this.#handleAIProcessRequest({
      type: 'continue',
      content: prompt,
      options: { tone, length }
    });
  }

  /**
   * カスタム要求ハンドラー
   * @private
   * @param {Object} data - カスタムデータ
   */
  #handleCustomRequest = async (data) => {
    const { prompt, content, options = {} } = data;
    
    const fullPrompt = this.#buildCustomPrompt(prompt, content);
    
    await this.#handleAIProcessRequest({
      type: 'custom',
      content: fullPrompt,
      options: { ...options, customPrompt: prompt }
    });
  }

  /**
   * 設定更新ハンドラー
   * @private
   * @param {Object} data - 設定データ
   */
  #handleSettingsUpdate = async (data) => {
    const { provider, apiKey } = data;
    
    try {
      await this.#settingsModel.updateSettings({
        ai: { provider, apiKey }
      });
      
      this.#aiProvider = provider;
      this.#apiKey = apiKey;
      
      this.#statusBarView.addNotification('AI設定を更新しました', 'success', 2000);
      
      this.emit(EVENTS.AI_SETTINGS_UPDATED, { provider, hasApiKey: !!apiKey });

    } catch (error) {
      console.error('[AIController] Settings update error:', error);
      this.#statusBarView.addNotification('AI設定の更新に失敗しました', 'error');
    }
  }

  /**
   * AIボタンクリックハンドラー
   * @private
   * @param {Object} data - クリックデータ
   */
  #handleAIButtonClicked = async (data) => {
    const { actionType, selectedText } = data;
    
    try {
      await this.#validateAIConfiguration();
      
      const content = selectedText || this.#documentModel.getContent();
      
      if (!content.trim()) {
        this.#statusBarView.addNotification('処理するテキストがありません', 'warning');
        return;
      }

      switch (actionType) {
        case 'translate':
          await this.#showTranslateDialog(content);
          break;
        case 'summarize':
          await this.#showSummarizeDialog(content);
          break;
        case 'improve':
          await this.#showImproveDialog(content);
          break;
        case 'continue':
          await this.#handleContinueRequest({ content });
          break;
        case 'custom':
          await this.#showCustomDialog(content);
          break;
        default:
          console.warn(`[AIController] Unknown action type: ${actionType}`);
      }

    } catch (error) {
      if (error.message === 'AI_NOT_CONFIGURED') {
        await this.#showConfigurationDialog();
      } else {
        this.#statusBarView.addNotification(`AI操作エラー: ${error.message}`, 'error');
      }
    }
  }

  /**
   * プロンプト送信ハンドラー
   * @private
   * @param {Object} data - プロンプトデータ
   */
  #handlePromptSubmitted = async (data) => {
    const { prompt, content } = data;
    
    await this.#handleCustomRequest({
      prompt,
      content: content || this.#documentModel.getContent()
    });
  }

  /**
   * AI設定を検証
   * @private
   */
  async #validateAIConfiguration() {
    if (!this.#aiProvider || !this.#apiKey) {
      throw new Error('AI_NOT_CONFIGURED');
    }
  }

  /**
   * 処理状態を設定
   * @private
   * @param {boolean} processing - 処理中かどうか
   */
  #setProcessingState(processing) {
    this.#isProcessing = processing;
    
    this.emit(EVENTS.AI_PROCESSING_STATE_CHANGED, {
      isProcessing: processing
    });
  }

  /**
   * AI要求を処理
   * @private
   * @param {string} type - 処理タイプ
   * @param {string} content - コンテンツ
   * @param {Object} options - オプション
   * @returns {Promise<Object>} 処理結果
   */
  async #processAIRequest(type, content, options) {
    // キューに追加
    const requestId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const request = { id: requestId, type, content, options, timestamp: Date.now() };
    
    this.#requestQueue.push(request);
    
    try {
      // 実際のAI APIコール（ここでは模擬実装）
      const result = await this.#callAIAPI(content, type, options);
      
      return {
        id: requestId,
        success: true,
        content: result.content,
        metadata: result.metadata || {},
        processingTime: Date.now() - request.timestamp
      };

    } catch (error) {
      throw new Error(`AI API エラー: ${error.message}`);
    } finally {
      // キューから削除
      this.#requestQueue = this.#requestQueue.filter(req => req.id !== requestId);
    }
  }

  /**
   * AI APIを呼び出し（模擬実装）
   * @private
   * @param {string} content - コンテンツ
   * @param {string} type - 処理タイプ
   * @param {Object} options - オプション
   * @returns {Promise<Object>} API結果
   */
  async #callAIAPI(content, type, options) {
    // 実際の実装では、選択されたAIプロバイダー（Claude、GPT等）のAPIを呼び出す
    // ここでは模擬実装
    
    await new Promise(resolve => setTimeout(resolve, 1500)); // 模擬遅延
    
    switch (type) {
      case 'translate':
        return {
          content: `[翻訳結果] ${content.substring(0, 100)}... (模擬)`,
          metadata: { targetLanguage: options.targetLanguage }
        };
        
      case 'summarize':
        return {
          content: `[要約] ${content.substring(0, 50)}... (模擬)`,
          metadata: { originalLength: content.length }
        };
        
      case 'improve':
        return {
          content: `[改善版] ${content} (模擬改善)`,
          metadata: { improvementType: options.improvementType }
        };
        
      case 'continue':
        return {
          content: `${content}\n\n[続き] さらに詳しく説明すると... (模擬)`,
          metadata: { tone: options.tone }
        };
        
      case 'custom':
        return {
          content: `[カスタム処理結果] ${content.substring(0, 100)}... (模擬)`,
          metadata: { customPrompt: options.customPrompt }
        };
        
      default:
        throw new Error(`未対応の処理タイプ: ${type}`);
    }
  }

  /**
   * 翻訳プロンプトを構築
   * @private
   * @param {string} content - コンテンツ
   * @param {string} sourceLanguage - 元言語
   * @param {string} targetLanguage - 対象言語
   * @returns {string} プロンプト
   */
  #buildTranslatePrompt(content, sourceLanguage, targetLanguage) {
    const languageNames = {
      'en': '英語',
      'ja': '日本語',
      'ko': '韓国語',
      'zh': '中国語',
      'auto': '自動検出'
    };
    
    return `以下の文章を${languageNames[targetLanguage] || targetLanguage}に翻訳してください：\n\n${content}`;
  }

  /**
   * 要約プロンプトを構築
   * @private
   * @param {string} content - コンテンツ
   * @param {number} maxLength - 最大長
   * @param {string} style - スタイル
   * @returns {string} プロンプト
   */
  #buildSummarizePrompt(content, maxLength, style) {
    const styleTexts = {
      'standard': '標準的な',
      'bullet': '箇条書きの',
      'executive': 'エグゼクティブサマリー形式の',
      'academic': '学術的な'
    };
    
    return `以下の文章を${maxLength}文字以内で${styleTexts[style] || ''}要約してください：\n\n${content}`;
  }

  /**
   * 改善プロンプトを構築
   * @private
   * @param {string} content - コンテンツ
   * @param {string} improvementType - 改善タイプ
   * @returns {string} プロンプト
   */
  #buildImprovePrompt(content, improvementType) {
    const improvementTypes = {
      'general': '全般的に',
      'clarity': '分かりやすさを',
      'grammar': '文法を',
      'style': '文体を',
      'structure': '構造を'
    };
    
    return `以下の文章の${improvementTypes[improvementType] || ''}改善してください：\n\n${content}`;
  }

  /**
   * 続き書きプロンプトを構築
   * @private
   * @param {string} content - コンテンツ
   * @param {string} tone - トーン
   * @param {string} length - 長さ
   * @returns {string} プロンプト
   */
  #buildContinuePrompt(content, tone, length) {
    const tones = {
      'neutral': '中立的な',
      'formal': 'フォーマルな',
      'casual': 'カジュアルな',
      'creative': '創造的な'
    };
    
    const lengths = {
      'short': '短く',
      'medium': '中程度で',
      'long': '詳しく'
    };
    
    return `以下の文章の続きを${tones[tone] || ''}トーンで${lengths[length] || ''}書いてください：\n\n${content}`;
  }

  /**
   * カスタムプロンプトを構築
   * @private
   * @param {string} prompt - プロンプト
   * @param {string} content - コンテンツ
   * @returns {string} 完全なプロンプト
   */
  #buildCustomPrompt(prompt, content) {
    return `${prompt}\n\n対象テキスト：\n${content}`;
  }

  /**
   * 翻訳ダイアログを表示
   * @private
   * @param {string} content - コンテンツ
   */
  async #showTranslateDialog(content) {
    // 実装は DialogView を使用
    // 翻訳言語選択のUIを提供
    this.#statusBarView.addNotification('翻訳機能はまだ実装中です', 'info');
  }

  /**
   * 要約ダイアログを表示
   * @private
   * @param {string} content - コンテンツ
   */
  async #showSummarizeDialog(content) {
    // 実装は DialogView を使用
    // 要約オプション選択のUIを提供
    this.#statusBarView.addNotification('要約機能はまだ実装中です', 'info');
  }

  /**
   * 改善ダイアログを表示
   * @private
   * @param {string} content - コンテンツ
   */
  async #showImproveDialog(content) {
    // 実装は DialogView を使用
    // 改善オプション選択のUIを提供
    this.#statusBarView.addNotification('改善機能はまだ実装中です', 'info');
  }

  /**
   * カスタムダイアログを表示
   * @private
   * @param {string} content - コンテンツ
   */
  async #showCustomDialog(content) {
    // 実装は DialogView を使用
    // カスタムプロンプト入力のUIを提供
    this.#statusBarView.addNotification('カスタム機能はまだ実装中です', 'info');
  }

  /**
   * 設定ダイアログを表示
   * @private
   */
  async #showConfigurationDialog() {
    this.#statusBarView.addNotification('AI設定が必要です。設定画面で API キーを設定してください。', 'warning');
  }

  // Public API Methods

  /**
   * AI処理を実行
   * @param {string} type - 処理タイプ
   * @param {string} content - コンテンツ
   * @param {Object} options - オプション
   */
  async processWithAI(type, content, options = {}) {
    this.emit(EVENTS.AI_PROCESS_REQUEST, { type, content, options });
  }

  /**
   * AIが利用可能かチェック
   * @returns {boolean} 利用可能かどうか
   */
  isAIAvailable() {
    return !!(this.#aiProvider && this.#apiKey && !this.#isProcessing);
  }

  /**
   * 処理中かどうか
   * @returns {boolean} 処理中かどうか
   */
  isProcessing() {
    return this.#isProcessing;
  }

  /**
   * キューの状態を取得
   * @returns {Object} キューの状態
   */
  getQueueStatus() {
    return {
      length: this.#requestQueue.length,
      requests: this.#requestQueue.map(req => ({
        id: req.id,
        type: req.type,
        timestamp: req.timestamp
      }))
    };
  }

  /**
   * AI設定を取得
   * @returns {Object} AI設定
   */
  getAISettings() {
    return {
      provider: this.#aiProvider,
      hasApiKey: !!this.#apiKey,
      isConfigured: !!(this.#aiProvider && this.#apiKey)
    };
  }

  /**
   * デバッグ情報を取得
   * @returns {Object} デバッグ情報
   */
  getDebugInfo() {
    return {
      isInitialized: this.#isInitialized,
      isProcessing: this.#isProcessing,
      provider: this.#aiProvider,
      hasApiKey: !!this.#apiKey,
      queueLength: this.#requestQueue.length
    };
  }

  /**
   * 破棄処理
   */
  destroy() {
    this.#requestQueue = [];
    this.#isProcessing = false;
    this.#aiProvider = null;
    this.#apiKey = null;
    this.#settingsModel = null;
    this.#documentModel = null;
    this.#statusBarView = null;
    this.#dialogView = null;
    this.#isInitialized = false;
    
    super.destroy();
  }
}