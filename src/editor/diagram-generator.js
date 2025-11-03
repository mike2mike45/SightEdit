/**
 * Diagram Generator
 * Mermaid, Chart.js, SVGを使った図の生成と管理
 * AI統合による自然言語からの図生成
 */

import mermaid from 'mermaid';
import { Chart, registerables } from 'chart.js';
import { AIManager } from '../lib/ai-manager.js';

// Chart.jsの全コンポーネントを登録
Chart.register(...registerables);

export class DiagramGenerator {
  constructor() {
    this.modal = null;
    this.currentTab = 'mermaid';
    this.currentSVG = null;
    this.onInsertCallback = null;
    this.aiManager = new AIManager();

    // Mermaidを初期化
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
    });

    this.init();
  }

  async init() {
    // AI設定を読み込み
    await this.aiManager.loadSettings();

    // モーダル要素を取得
    this.modal = document.getElementById('diagram-modal');
    if (!this.modal) {
      console.error('[DiagramGenerator] Modal element not found');
      return;
    }

    // イベントリスナーを設定
    this.setupEventListeners();
  }

  setupEventListeners() {
    // 閉じるボタン
    const closeBtn = document.getElementById('diagram-modal-close');
    closeBtn?.addEventListener('click', () => this.close());

    const cancelBtn = document.getElementById('diagram-cancel-btn');
    cancelBtn?.addEventListener('click', () => this.close());

    // タブ切り替え
    const tabs = document.querySelectorAll('.diagram-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabName = e.target.dataset.tab;
        this.switchTab(tabName);
      });
    });

    // MermaidのAI生成ボタン
    const mermaidAIGenerateBtn = document.getElementById('mermaid-ai-generate-btn');
    mermaidAIGenerateBtn?.addEventListener('click', () => this.generateMermaidWithAI());

    // Mermaidプレビュー更新ボタン
    const mermaidPreviewBtn = document.getElementById('mermaid-preview-btn');
    mermaidPreviewBtn?.addEventListener('click', () => this.generateMermaidPreview());

    // Mermaidコード入力（変更時は挿入ボタンを無効化）
    const mermaidCodeInput = document.getElementById('mermaid-code');
    mermaidCodeInput?.addEventListener('input', () => {
      this.disableInsertButton();
    });

    // ChartのAI生成ボタン
    const chartAIGenerateBtn = document.getElementById('chart-ai-generate-btn');
    chartAIGenerateBtn?.addEventListener('click', () => this.generateChartWithAI());

    // Chartプレビュー更新ボタン
    const chartPreviewBtn = document.getElementById('chart-preview-btn');
    chartPreviewBtn?.addEventListener('click', () => this.generateChartPreview());

    // Chartコード入力（変更時は挿入ボタンを無効化）
    const chartConfigInput = document.getElementById('chart-config');
    chartConfigInput?.addEventListener('input', () => {
      this.disableInsertButton();
    });

    // SVGのAI生成ボタン
    const svgAIGenerateBtn = document.getElementById('svg-ai-generate-btn');
    svgAIGenerateBtn?.addEventListener('click', () => this.generateSVGWithAI());

    // SVGプレビュー更新ボタン
    const svgPreviewBtn = document.getElementById('svg-preview-btn');
    svgPreviewBtn?.addEventListener('click', () => this.generateSVGPreview());

    // SVGコード入力（変更時は挿入ボタンを無効化）
    const svgCodeInput = document.getElementById('svg-code');
    svgCodeInput?.addEventListener('input', () => {
      this.disableInsertButton();
    });

    // 挿入ボタン
    const insertBtn = document.getElementById('diagram-insert-btn');
    insertBtn?.addEventListener('click', () => this.insertDiagram());

    // モーダル外クリックで閉じる
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });
  }

  switchTab(tabName) {
    // タブボタンのアクティブ状態を切り替え
    const tabs = document.querySelectorAll('.diagram-tab');
    tabs.forEach(tab => {
      if (tab.dataset.tab === tabName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    // タブコンテンツを切り替え
    const tabContents = document.querySelectorAll('.diagram-tab-content');
    tabContents.forEach(content => {
      if (content.id === `${tabName}-tab`) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });

    this.currentTab = tabName;
    this.disableInsertButton();
  }

  /**
   * 自然言語からMermaidコードをAI生成
   */
  async generateMermaidWithAI() {
    const descriptionInput = document.getElementById('mermaid-description');
    const codeInput = document.getElementById('mermaid-code');

    if (!descriptionInput || !codeInput) {
      console.error('[DiagramGenerator] Mermaid input elements not found');
      return;
    }

    const description = descriptionInput.value.trim();
    if (!description) {
      alert('図の説明を入力してください');
      return;
    }

    // AI生成用のプロンプトを作成
    const prompt = this.buildMermaidPrompt(description);

    try {
      // ローディング表示
      codeInput.value = '// AIで生成中...';
      codeInput.disabled = true;

      console.log('[DiagramGenerator] Generating Mermaid code with AI...');

      // AIを呼び出し（非ストリーミング）
      const generatedCode = await this.callAIForDiagram(prompt);

      // 生成されたコードを抽出（マークダウンのコードブロックから抽出）
      const extractedCode = this.extractMermaidCode(generatedCode);

      // コードエディタに挿入
      codeInput.value = extractedCode;
      codeInput.disabled = false;

      console.log('[DiagramGenerator] Mermaid code generated successfully');

      // 自動的にプレビューを生成
      await this.generateMermaidPreview();

    } catch (error) {
      console.error('[DiagramGenerator] Failed to generate Mermaid code:', error);
      alert(`AI生成エラー: ${error.message}`);
      codeInput.value = '';
      codeInput.disabled = false;
    }
  }

  /**
   * Mermaid生成用のプロンプトを構築
   */
  buildMermaidPrompt(description) {
    return `以下の説明に基づいて、Mermaid記法で図を生成してください。

【要件】
1. Mermaid.js v10 の構文を使用してください
2. 日本語ラベルを使用してください
3. 図は分かりやすく、適切な構造にしてください
4. コードブロックのマークダウン記法（\`\`\`mermaid）で囲んで出力してください
5. コメントや説明文は不要です。Mermaidコードのみを出力してください

【図の説明】
${description}

【出力形式の例】
\`\`\`mermaid
graph TD
    A[開始] --> B[処理]
    B --> C[終了]
\`\`\`

それでは、上記の説明に基づいてMermaid図を生成してください：`;
  }

  /**
   * AIから生成されたテキストからMermaidコードを抽出
   */
  extractMermaidCode(text) {
    // ```mermaid と ``` で囲まれたコードを抽出
    const mermaidBlockMatch = text.match(/```mermaid\s*\n([\s\S]*?)\n```/);
    if (mermaidBlockMatch) {
      return mermaidBlockMatch[1].trim();
    }

    // ```だけで囲まれている場合
    const genericBlockMatch = text.match(/```\s*\n([\s\S]*?)\n```/);
    if (genericBlockMatch) {
      return genericBlockMatch[1].trim();
    }

    // コードブロックがない場合はそのまま返す
    return text.trim();
  }

  /**
   * AIを呼び出して図のコードを生成
   */
  async callAIForDiagram(prompt) {
    const provider = this.aiManager.settings.aiProvider;

    if (provider === 'gemini') {
      return await this.callGeminiForDiagram(prompt);
    } else if (provider === 'claude') {
      return await this.callClaudeForDiagram(prompt);
    } else {
      throw new Error('サポートされていないAIプロバイダーです');
    }
  }

  /**
   * Gemini APIを呼び出し
   */
  async callGeminiForDiagram(prompt) {
    const apiKey = this.aiManager.settings.geminiApiKey;
    if (!apiKey) {
      throw new Error('Gemini APIキーが設定されていません。設定画面で APIキーを入力してください。');
    }

    const model = this.aiManager.getCurrentModel();
    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    };

    const endpoint = `${model.endpoint}?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // レスポンスからテキストを抽出
    if (data.candidates && data.candidates[0]) {
      const candidate = data.candidates[0];
      if (candidate.content && candidate.content.parts) {
        return candidate.content.parts.map(part => part.text).join('');
      }
    }

    throw new Error('Gemini APIからの応答が不正です');
  }

  /**
   * Claude APIを呼び出し
   */
  async callClaudeForDiagram(prompt) {
    // Claude Sonnet 4 は認証不要（Artifacts経由）
    const model = this.aiManager.getCurrentModel();

    const requestBody = {
      model: 'claude-sonnet-4-20250514',
      messages: [{
        role: 'user',
        content: prompt
      }],
      max_tokens: 2048
    };

    const response = await fetch(model.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // レスポンスからテキストを抽出
    if (data.content && data.content[0]) {
      return data.content[0].text;
    }

    throw new Error('Claude APIからの応答が不正です');
  }

  async generateMermaidPreview() {
    const codeInput = document.getElementById('mermaid-code');
    const preview = document.getElementById('mermaid-preview');

    if (!codeInput || !preview) {
      console.error('[DiagramGenerator] Mermaid elements not found');
      return;
    }

    const code = codeInput.value.trim();
    if (!code) {
      preview.innerHTML = '<p style="color: #6c757d;">コードを入力してください</p>';
      this.disableInsertButton();
      return;
    }

    try {
      // プレビューをクリア
      preview.innerHTML = '<p style="color: #6c757d;">生成中...</p>';

      // Mermaidで図を生成
      const { svg } = await mermaid.render('mermaid-preview-svg', code);

      // SVGをプレビューに表示
      preview.innerHTML = svg;

      // SVGを保存
      this.currentSVG = svg;

      // 挿入ボタンを有効化
      this.enableInsertButton();

      console.log('[DiagramGenerator] Mermaid diagram generated successfully');
    } catch (error) {
      console.error('[DiagramGenerator] Failed to generate Mermaid diagram:', error);
      preview.innerHTML = `<p style="color: #dc3545;">エラー: ${error.message}</p>`;
      this.disableInsertButton();
    }
  }

  enableInsertButton() {
    const insertBtn = document.getElementById('diagram-insert-btn');
    if (insertBtn) {
      insertBtn.disabled = false;
    }
  }

  disableInsertButton() {
    const insertBtn = document.getElementById('diagram-insert-btn');
    if (insertBtn) {
      insertBtn.disabled = true;
    }
    this.currentSVG = null;
  }

  insertDiagram() {
    if (!this.currentSVG) {
      console.error('[DiagramGenerator] No SVG to insert');
      return;
    }

    // コールバックを呼び出してSVGを挿入
    if (this.onInsertCallback) {
      this.onInsertCallback(this.currentSVG);
    }

    this.close();
  }

  /**
   * Chart.jsをAI生成
   */
  async generateChartWithAI() {
    const descriptionInput = document.getElementById('chart-description');
    const configInput = document.getElementById('chart-config');
    const templateSelect = document.getElementById('chart-template');

    if (!descriptionInput || !configInput) {
      console.error('[DiagramGenerator] Chart input elements not found');
      return;
    }

    const description = descriptionInput.value.trim();
    if (!description) {
      alert('グラフの説明を入力してください');
      return;
    }

    const template = templateSelect?.value || '';
    const prompt = this.buildChartPrompt(description, template);

    try {
      configInput.value = '// AIで生成中...';
      configInput.disabled = true;

      console.log('[DiagramGenerator] Generating Chart.js config with AI...');

      const generatedConfig = await this.callAIForDiagram(prompt);
      const extractedConfig = this.extractJSONCode(generatedConfig);

      configInput.value = extractedConfig;
      configInput.disabled = false;

      console.log('[DiagramGenerator] Chart.js config generated successfully');

      await this.generateChartPreview();

    } catch (error) {
      console.error('[DiagramGenerator] Failed to generate Chart.js config:', error);
      alert(`AI生成エラー: ${error.message}`);
      configInput.value = '';
      configInput.disabled = false;
    }
  }

  /**
   * Chart.js生成用のプロンプトを構築
   */
  buildChartPrompt(description, template) {
    const templateHint = template ? `\n【グラフの種類】: ${template}` : '';

    return `以下の説明に基づいて、Chart.js用の設定（JSON形式）を生成してください。

【要件】
1. Chart.js v4 の構文を使用してください
2. 日本語ラベルを使用してください
3. データは適切なサンプル値を入れてください
4. レスポンシブ設定を含めてください
5. コードブロックのマークダウン記法（\`\`\`json）で囲んで出力してください
6. コメントや説明文は不要です。JSON設定のみを出力してください${templateHint}

【グラフの説明】
${description}

【出力形式の例】
\`\`\`json
{
  "type": "bar",
  "data": {
    "labels": ["2020年", "2021年", "2022年"],
    "datasets": [{
      "label": "売上",
      "data": [100, 150, 200],
      "backgroundColor": "rgba(54, 162, 235, 0.5)"
    }]
  },
  "options": {
    "responsive": true,
    "maintainAspectRatio": false
  }
}
\`\`\`

それでは、上記の説明に基づいてChart.js設定を生成してください：`;
  }

  /**
   * Chart.jsプレビュー生成
   */
  async generateChartPreview() {
    const configInput = document.getElementById('chart-config');
    const preview = document.getElementById('chart-preview');

    if (!configInput || !preview) {
      console.error('[DiagramGenerator] Chart elements not found');
      return;
    }

    const configStr = configInput.value.trim();
    if (!configStr) {
      preview.innerHTML = '<p style="color: #6c757d;">設定を入力してください</p>';
      this.disableInsertButton();
      return;
    }

    try {
      preview.innerHTML = '<p style="color: #6c757d;">生成中...</p>';

      // JSONをパース
      const config = JSON.parse(configStr);

      // 既存のCanvasがあればクリア
      preview.innerHTML = '<canvas id="chart-canvas"></canvas>';

      const canvas = document.getElementById('chart-canvas');
      if (!canvas) {
        throw new Error('Canvasが作成できませんでした');
      }

      // Chart.jsでグラフを描画
      const chart = new Chart(canvas, config);

      // CanvasをSVGに変換
      const chartCanvas = chart.canvas;
      const svgStr = this.canvasToSVG(chartCanvas);

      this.currentSVG = svgStr;
      this.enableInsertButton();

      console.log('[DiagramGenerator] Chart generated successfully');
    } catch (error) {
      console.error('[DiagramGenerator] Failed to generate Chart:', error);
      preview.innerHTML = `<p style="color: #dc3545;">エラー: ${error.message}</p>`;
      this.disableInsertButton();
    }
  }

  /**
   * CanvasをSVGに変換
   */
  canvasToSVG(canvas) {
    const dataURL = canvas.toDataURL('image/png');
    const width = canvas.width;
    const height = canvas.height;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <image href="${dataURL}" width="${width}" height="${height}"/>
</svg>`;
  }

  /**
   * SVGをAI生成
   */
  async generateSVGWithAI() {
    const descriptionInput = document.getElementById('svg-description');
    const codeInput = document.getElementById('svg-code');
    const templateSelect = document.getElementById('svg-template');

    if (!descriptionInput || !codeInput) {
      console.error('[DiagramGenerator] SVG input elements not found');
      return;
    }

    const description = descriptionInput.value.trim();
    if (!description) {
      alert('SVG図形の説明を入力してください');
      return;
    }

    const template = templateSelect?.value || '';
    const prompt = this.buildSVGPrompt(description, template);

    try {
      codeInput.value = '<!-- AIで生成中... -->';
      codeInput.disabled = true;

      console.log('[DiagramGenerator] Generating SVG with AI...');

      const generatedSVG = await this.callAIForDiagram(prompt);
      const extractedSVG = this.extractSVGCode(generatedSVG);

      codeInput.value = extractedSVG;
      codeInput.disabled = false;

      console.log('[DiagramGenerator] SVG generated successfully');

      await this.generateSVGPreview();

    } catch (error) {
      console.error('[DiagramGenerator] Failed to generate SVG:', error);
      alert(`AI生成エラー: ${error.message}`);
      codeInput.value = '';
      codeInput.disabled = false;
    }
  }

  /**
   * SVG生成用のプロンプトを構築
   */
  buildSVGPrompt(description, template) {
    const templateHint = template ? `\n【図形の種類】: ${template}` : '';

    return `以下の説明に基づいて、SVGコードを生成してください。

【要件】
1. 標準SVG 1.1の構文を使用してください
2. widthとheightを適切に設定してください（例: 400x300）
3. viewBoxを設定してレスポンシブ対応してください
4. 日本語テキストを含む場合は適切なフォント設定を行ってください
5. コードブロックのマークダウン記法（\`\`\`svg）で囲んで出力してください
6. コメントや説明文は不要です。SVGコードのみを出力してください${templateHint}

【図形の説明】
${description}

【出力形式の例】
\`\`\`svg
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <circle cx="100" cy="100" r="50" fill="#3498db"/>
  <rect x="200" y="50" width="100" height="100" fill="#e74c3c"/>
</svg>
\`\`\`

それでは、上記の説明に基づいてSVGコードを生成してください：`;
  }

  /**
   * SVGプレビュー生成
   */
  async generateSVGPreview() {
    const codeInput = document.getElementById('svg-code');
    const preview = document.getElementById('svg-preview');

    if (!codeInput || !preview) {
      console.error('[DiagramGenerator] SVG elements not found');
      return;
    }

    const code = codeInput.value.trim();
    if (!code) {
      preview.innerHTML = '<p style="color: #6c757d;">コードを入力してください</p>';
      this.disableInsertButton();
      return;
    }

    try {
      preview.innerHTML = '<p style="color: #6c757d;">生成中...</p>';

      // SVGコードをそのまま表示
      preview.innerHTML = code;

      // SVGを保存
      this.currentSVG = code;

      this.enableInsertButton();

      console.log('[DiagramGenerator] SVG preview generated successfully');
    } catch (error) {
      console.error('[DiagramGenerator] Failed to generate SVG preview:', error);
      preview.innerHTML = `<p style="color: #dc3545;">エラー: ${error.message}</p>`;
      this.disableInsertButton();
    }
  }

  /**
   * JSONコードを抽出
   */
  extractJSONCode(text) {
    // ```json と ``` で囲まれたコードを抽出
    const jsonBlockMatch = text.match(/```json\s*\n([\s\S]*?)\n```/);
    if (jsonBlockMatch) {
      return jsonBlockMatch[1].trim();
    }

    // ```だけで囲まれている場合
    const genericBlockMatch = text.match(/```\s*\n([\s\S]*?)\n```/);
    if (genericBlockMatch) {
      return genericBlockMatch[1].trim();
    }

    // { で始まる場合はそのまま返す
    if (text.trim().startsWith('{')) {
      return text.trim();
    }

    return text.trim();
  }

  /**
   * SVGコードを抽出
   */
  extractSVGCode(text) {
    // ```svg と ``` で囲まれたコードを抽出
    const svgBlockMatch = text.match(/```svg\s*\n([\s\S]*?)\n```/);
    if (svgBlockMatch) {
      return svgBlockMatch[1].trim();
    }

    // ```xml と ``` で囲まれている場合
    const xmlBlockMatch = text.match(/```xml\s*\n([\s\S]*?)\n```/);
    if (xmlBlockMatch) {
      return xmlBlockMatch[1].trim();
    }

    // ```だけで囲まれている場合
    const genericBlockMatch = text.match(/```\s*\n([\s\S]*?)\n```/);
    if (genericBlockMatch) {
      return genericBlockMatch[1].trim();
    }

    // <svg で始まる場合はそのまま返す
    if (text.trim().startsWith('<svg')) {
      return text.trim();
    }

    return text.trim();
  }

  open(onInsert) {
    this.onInsertCallback = onInsert;
    this.modal.style.display = 'flex';

    // 初期化
    this.currentSVG = null;
    this.disableInsertButton();

    // Mermaidタブを選択
    this.switchTab('mermaid');

    // サンプルコードを設定（空の場合）
    const mermaidCodeInput = document.getElementById('mermaid-code');
    if (mermaidCodeInput && !mermaidCodeInput.value.trim()) {
      mermaidCodeInput.value = `graph TD
    A[開始] --> B[処理]
    B --> C{判定}
    C -->|Yes| D[成功]
    C -->|No| E[失敗]
    D --> F[終了]
    E --> F`;
    }
  }

  close() {
    this.modal.style.display = 'none';
    this.currentSVG = null;
    this.onInsertCallback = null;

    // プレビューをクリア
    const preview = document.getElementById('mermaid-preview');
    if (preview) {
      preview.innerHTML = '';
      preview.classList.add('empty');
    }
  }
}

// シングルトンインスタンス
let diagramGeneratorInstance = null;

export function getDiagramGenerator() {
  if (!diagramGeneratorInstance) {
    diagramGeneratorInstance = new DiagramGenerator();
  }
  return diagramGeneratorInstance;
}
