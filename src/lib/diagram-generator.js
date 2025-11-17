/**
 * AI図表生成マネージャー
 * 自然言語から様々な図表を生成
 */

class DiagramGenerator {
  constructor() {
    this.initialized = false;
    this.mermaidLoaded = false;
    this.chartJsLoaded = false;
    
    // 図表タイプ定義（20種類）
    this.diagramTypes = {
      // フローチャート系
      flowchart: {
        name: 'フローチャート',
        icon: '🔄',
        category: 'flow',
        engine: 'mermaid',
        template: 'graph TD\n  A[開始] --> B{条件}\n  B -->|Yes| C[処理1]\n  B -->|No| D[処理2]\n  C --> E[終了]\n  D --> E',
        prompt: 'フローチャートを生成: '
      },
      sequence: {
        name: 'シーケンス図',
        icon: '📊',
        category: 'flow',
        engine: 'mermaid',
        template: 'sequenceDiagram\n  participant A as ユーザー\n  participant B as システム\n  A->>B: リクエスト\n  B-->>A: レスポンス',
        prompt: 'シーケンス図を生成: '
      },
      gantt: {
        name: 'ガントチャート',
        icon: '📅',
        category: 'project',
        engine: 'mermaid',
        template: 'gantt\n  title プロジェクト計画\n  dateFormat YYYY-MM-DD\n  section タスク\n  タスク1: 2024-01-01, 30d\n  タスク2: 2024-02-01, 20d',
        prompt: 'ガントチャートを生成: '
      },
      
      // ダイアグラム系
      er: {
        name: 'ER図',
        icon: '🗂️',
        category: 'diagram',
        engine: 'mermaid',
        template: 'erDiagram\n  USER ||--o{ ORDER : places\n  ORDER ||--|{ ITEM : contains',
        prompt: 'ER図を生成: '
      },
      classDiagram: {
        name: 'クラス図',
        icon: '📦',
        category: 'diagram',
        engine: 'mermaid',
        template: 'classDiagram\n  class Animal{\n    +String name\n    +int age\n    +void eat()\n  }',
        prompt: 'クラス図を生成: '
      },
      stateDiagram: {
        name: '状態遷移図',
        icon: '🔀',
        category: 'diagram',
        engine: 'mermaid',
        template: 'stateDiagram-v2\n  [*] --> 待機\n  待機 --> 実行中\n  実行中 --> 完了\n  完了 --> [*]',
        prompt: '状態遷移図を生成: '
      },
      
      // グラフ・チャート系
      pieChart: {
        name: '円グラフ',
        icon: '🥧',
        category: 'chart',
        engine: 'mermaid',
        template: 'pie title 売上構成\n  "製品A" : 45\n  "製品B" : 30\n  "製品C" : 25',
        prompt: '円グラフを生成: '
      },
      barChart: {
        name: '棒グラフ',
        icon: '📊',
        category: 'chart',
        engine: 'chartjs',
        template: {
          type: 'bar',
          data: {
            labels: ['1月', '2月', '3月', '4月', '5月'],
            datasets: [{
              label: '売上',
              data: [12, 19, 3, 5, 2],
              backgroundColor: 'rgba(75, 192, 192, 0.6)'
            }]
          }
        },
        prompt: '棒グラフを生成: '
      },
      lineChart: {
        name: '折れ線グラフ',
        icon: '📈',
        category: 'chart',
        engine: 'chartjs',
        template: {
          type: 'line',
          data: {
            labels: ['1月', '2月', '3月', '4月', '5月'],
            datasets: [{
              label: '推移',
              data: [65, 59, 80, 81, 56],
              borderColor: 'rgba(255, 99, 132, 1)',
              tension: 0.1
            }]
          }
        },
        prompt: '折れ線グラフを生成: '
      },
      radarChart: {
        name: 'レーダーチャート',
        icon: '🕸️',
        category: 'chart',
        engine: 'chartjs',
        template: {
          type: 'radar',
          data: {
            labels: ['項目A', '項目B', '項目C', '項目D', '項目E'],
            datasets: [{
              label: 'スキル',
              data: [85, 70, 90, 75, 80],
              backgroundColor: 'rgba(54, 162, 235, 0.2)'
            }]
          }
        },
        prompt: 'レーダーチャートを生成: '
      },
      
      // ビジネス系
      mindmap: {
        name: 'マインドマップ',
        icon: '🧠',
        category: 'business',
        engine: 'mermaid',
        template: 'mindmap\n  root((中心))\n    分岐1\n      子1\n      子2\n    分岐2\n      子3',
        prompt: 'マインドマップを生成: '
      },
      journey: {
        name: 'カスタマージャーニー',
        icon: '🗺️',
        category: 'business',
        engine: 'mermaid',
        template: 'journey\n  title ユーザージャーニー\n  section 発見\n    検索: 5: ユーザー\n    広告: 3: ユーザー\n  section 検討\n    比較: 4: ユーザー',
        prompt: 'カスタマージャーニーを生成: '
      },
      timeline: {
        name: 'タイムライン',
        icon: '⏰',
        category: 'business',
        engine: 'mermaid',
        template: 'timeline\n  title プロジェクトタイムライン\n  2024-01: 計画\n  2024-02: 開発\n  2024-03: リリース',
        prompt: 'タイムラインを生成: '
      },
      
      // アイコン・図形系
      icon: {
        name: 'アイコン',
        icon: '🎨',
        category: 'visual',
        engine: 'svg',
        template: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#667eea"/></svg>',
        prompt: 'SVGアイコンを生成: '
      },
      badge: {
        name: 'バッジ',
        icon: '🏷️',
        category: 'visual',
        engine: 'svg',
        template: '<svg viewBox="0 0 100 50"><rect width="100" height="50" rx="25" fill="#764ba2"/><text x="50" y="30" text-anchor="middle" fill="white">BADGE</text></svg>',
        prompt: 'バッジを生成: '
      },
      logo: {
        name: 'ロゴ',
        icon: '🎯',
        category: 'visual',
        engine: 'svg',
        template: '<svg viewBox="0 0 200 100"><text x="100" y="60" text-anchor="middle" font-size="30" font-weight="bold" fill="#333">LOGO</text></svg>',
        prompt: 'ロゴを生成: '
      },
      
      // ネットワーク系
      network: {
        name: 'ネットワーク図',
        icon: '🌐',
        category: 'technical',
        engine: 'mermaid',
        template: 'graph LR\n  A[PC] --> B[Router]\n  B --> C[Internet]\n  B --> D[Server]',
        prompt: 'ネットワーク図を生成: '
      },
      architecture: {
        name: 'アーキテクチャ図',
        icon: '🏗️',
        category: 'technical',
        engine: 'mermaid',
        template: 'graph TB\n  subgraph Frontend\n    A[Web]\n    B[Mobile]\n  end\n  subgraph Backend\n    C[API]\n    D[DB]\n  end\n  A --> C\n  B --> C\n  C --> D',
        prompt: 'アーキテクチャ図を生成: '
      },
      gitGraph: {
        name: 'Gitグラフ',
        icon: '🌳',
        category: 'technical',
        engine: 'mermaid',
        template: 'gitGraph\n  commit\n  branch develop\n  checkout develop\n  commit\n  checkout main\n  merge develop',
        prompt: 'Gitグラフを生成: '
      },
      
      // データ可視化系
      scatterChart: {
        name: '散布図',
        icon: '📈',
        category: 'chart',
        engine: 'chartjs',
        template: {
          type: 'scatter',
          data: {
            datasets: [{
              label: 'データポイント',
              data: [{x: 10, y: 20}, {x: 15, y: 25}, {x: 20, y: 30}, {x: 25, y: 28}],
              backgroundColor: 'rgba(255, 99, 132, 0.6)'
            }]
          }
        },
        prompt: '散布図を生成: '
      },
      doughnutChart: {
        name: 'ドーナツグラフ',
        icon: '🍩',
        category: 'chart',
        engine: 'chartjs',
        template: {
          type: 'doughnut',
          data: {
            labels: ['A', 'B', 'C', 'D'],
            datasets: [{
              data: [30, 25, 20, 25],
              backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0']
            }]
          }
        },
        prompt: 'ドーナツグラフを生成: '
      },
      polarChart: {
        name: 'ポーラエリアチャート',
        icon: '🔴',
        category: 'chart',
        engine: 'chartjs',
        template: {
          type: 'polarArea',
          data: {
            labels: ['項目1', '項目2', '項目3', '項目4'],
            datasets: [{
              data: [11, 16, 7, 3],
              backgroundColor: ['#FF6384', '#4BC0C0', '#FFCE56', '#E7E9ED']
            }]
          }
        },
        prompt: 'ポーラエリアチャートを生成: '
      },
      
      // ワイヤーフレーム・UI系
      wireframe: {
        name: 'ワイヤーフレーム',
        icon: '📱',
        category: 'design',
        engine: 'svg',
        template: '<svg viewBox="0 0 300 400"><rect x="10" y="10" width="280" height="60" fill="#f0f0f0" stroke="#ccc"/><text x="150" y="45" text-anchor="middle">ヘッダー</text><rect x="10" y="80" width="280" height="250" fill="white" stroke="#ccc"/><text x="150" y="210" text-anchor="middle">メインコンテンツ</text><rect x="10" y="340" width="280" height="50" fill="#f0f0f0" stroke="#ccc"/><text x="150" y="370" text-anchor="middle">フッター</text></svg>',
        prompt: 'ワイヤーフレームを生成: '
      },
      mockup: {
        name: 'モックアップ',
        icon: '🎨',
        category: 'design',
        engine: 'svg',
        template: '<svg viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8f9fa" stroke="#dee2e6"/><rect x="20" y="20" width="260" height="40" fill="#007bff"/><text x="150" y="45" text-anchor="middle" fill="white">タイトル</text><rect x="20" y="80" width="120" height="100" fill="white" stroke="#ccc"/><rect x="160" y="80" width="120" height="100" fill="white" stroke="#ccc"/></svg>',
        prompt: 'モックアップを生成: '
      },
      
      // 組織・人事系
      orgChart: {
        name: '組織図',
        icon: '🏢',
        category: 'business',
        engine: 'mermaid',
        template: 'graph TB\n  CEO[CEO]\n  CTO[CTO]\n  CFO[CFO]\n  DEV1[開発者1]\n  DEV2[開発者2]\n  ACC[経理]\n  CEO --> CTO\n  CEO --> CFO\n  CTO --> DEV1\n  CTO --> DEV2\n  CFO --> ACC',
        prompt: '組織図を生成: '
      },
      userPersona: {
        name: 'ユーザーペルソナ',
        icon: '👤',
        category: 'business',
        engine: 'svg',
        template: '<svg viewBox="0 0 300 400"><circle cx="150" cy="80" r="50" fill="#ddd"/><text x="150" y="150" text-anchor="middle" font-size="18" font-weight="bold">田中太郎</text><text x="150" y="170" text-anchor="middle">30歳 会社員</text><rect x="20" y="200" width="260" height="180" fill="#f8f9fa" stroke="#ccc"/><text x="30" y="225" font-size="14">目標: 効率的な作業</text><text x="30" y="250" font-size="14">課題: 時間不足</text><text x="30" y="275" font-size="14">利用シーン: 通勤時</text></svg>',
        prompt: 'ユーザーペルソナを生成: '
      },
      
      // プロセス・フロー系
      swimlane: {
        name: 'スイムレーン図',
        icon: '🏊',
        category: 'flow',
        engine: 'mermaid',
        template: 'graph TD\n  subgraph 部署A\n    A1[タスク1]\n    A2[タスク2]\n  end\n  subgraph 部署B\n    B1[承認]\n    B2[実行]\n  end\n  A1 --> B1\n  B1 --> A2\n  A2 --> B2',
        prompt: 'スイムレーン図を生成: '
      },
      kanban: {
        name: 'かんばんボード',
        icon: '📋',
        category: 'project',
        engine: 'svg',
        template: '<svg viewBox="0 0 400 300"><rect x="10" y="10" width="120" height="280" fill="#f8f9fa" stroke="#ccc"/><text x="70" y="35" text-anchor="middle" font-weight="bold">TODO</text><rect x="20" y="50" width="100" height="60" fill="white" stroke="#ddd"/><text x="70" y="85" text-anchor="middle">タスク1</text><rect x="140" y="10" width="120" height="280" fill="#fff3cd" stroke="#ccc"/><text x="200" y="35" text-anchor="middle" font-weight="bold">進行中</text><rect x="150" y="50" width="100" height="60" fill="white" stroke="#ddd"/><text x="200" y="85" text-anchor="middle">タスク2</text><rect x="270" y="10" width="120" height="280" fill="#d4edda" stroke="#ccc"/><text x="330" y="35" text-anchor="middle" font-weight="bold">完了</text></svg>',
        prompt: 'かんばんボードを生成: '
      },
      
      // テクニカル系追加
      database: {
        name: 'データベース設計',
        icon: '🗄️',
        category: 'technical',
        engine: 'mermaid',
        template: 'graph LR\n  A[アプリ] --> B[API]\n  B --> C[データベース]\n  C --> D[テーブル1]\n  C --> E[テーブル2]\n  D --> F[カラム1]\n  D --> G[カラム2]',
        prompt: 'データベース設計図を生成: '
      },
      deployment: {
        name: 'デプロイ図',
        icon: '🚀',
        category: 'technical',
        engine: 'mermaid',
        template: 'graph LR\n  A[開発環境] --> B[ステージング]\n  B --> C[本番環境]\n  D[Git] --> A\n  E[CI/CD] --> B\n  F[監視] --> C',
        prompt: 'デプロイ図を生成: '
      },
      
      // その他・ユーティリティ
      qrcode: {
        name: 'QRコード',
        icon: '📱',
        category: 'utility',
        engine: 'svg',
        template: '<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="white" stroke="#000"/><rect x="10" y="10" width="20" height="20" fill="#000"/><rect x="70" y="10" width="20" height="20" fill="#000"/><rect x="10" y="70" width="20" height="20" fill="#000"/><rect x="45" y="45" width="10" height="10" fill="#000"/></svg>',
        prompt: 'QRコードを生成: '
      },
      infographic: {
        name: 'インフォグラフィック',
        icon: '📊',
        category: 'visual',
        engine: 'svg',
        template: '<svg viewBox="0 0 300 400"><rect width="300" height="400" fill="#f8f9fa"/><text x="150" y="40" text-anchor="middle" font-size="24" font-weight="bold">統計データ</text><circle cx="150" cy="120" r="40" fill="#007bff"/><text x="150" y="125" text-anchor="middle" fill="white" font-size="18">75%</text><rect x="50" y="200" width="200" height="20" fill="#ddd"/><rect x="50" y="200" width="150" height="20" fill="#28a745"/><text x="50" y="245" font-size="14">進捗: 75%</text></svg>',
        prompt: 'インフォグラフィックを生成: '
      }
    };
  }

  /**
   * 初期化
   */
  async init() {
    if (this.initialized) return;
    
    // Mermaidの初期化
    await this.loadMermaid();
    
    // Chart.jsの初期化
    await this.loadChartJs();
    
    this.initialized = true;
  }

  /**
   * Mermaidライブラリの読み込み
   */
  async loadMermaid() {
    if (this.mermaidLoaded) return;
    
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
      script.onload = () => {
        window.mermaid.initialize({ 
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose'
        });
        this.mermaidLoaded = true;
        resolve();
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Chart.jsライブラリの読み込み
   */
  async loadChartJs() {
    if (this.chartJsLoaded) return;
    
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4';
      script.onload = () => {
        this.chartJsLoaded = true;
        resolve();
      };
      document.head.appendChild(script);
    });
  }

  /**
   * AIで図表コードを生成
   */
  async generateDiagramCode(type, description, options = {}) {
    const diagramType = this.diagramTypes[type];
    if (!diagramType) {
      throw new Error(`Unknown diagram type: ${type}`);
    }

    // AI APIの準備確認
    const aiManager = window.aiManager;
    if (!aiManager || !aiManager.isConfigured()) {
      // AIが設定されていない場合はテンプレートを返す
      return this.getTemplateCode(type, description);
    }

    try {
      // プロンプト生成
      const prompt = this.createGenerationPrompt(type, description, options);
      
      // AI生成
      const response = await aiManager.generateContent(prompt, {
        maxTokens: 2000,
        temperature: 0.7
      });

      // レスポンスからコードを抽出
      return this.extractDiagramCode(response, diagramType.engine);
      
    } catch (error) {
      console.error('AI generation failed:', error);
      // エラー時はテンプレートベースで生成
      return this.getTemplateCode(type, description);
    }
  }

  /**
   * プロンプト生成
   */
  createGenerationPrompt(type, description, options) {
    const diagramType = this.diagramTypes[type];
    const { width = 800, height = 600 } = options;

    let prompt = `以下の要件で${diagramType.name}を生成してください。\n\n`;
    prompt += `要件: ${description}\n\n`;
    
    if (diagramType.engine === 'mermaid') {
      prompt += 'Mermaid記法で出力してください。コードブロックのみ返してください。\n';
      prompt += `サンプル:\n\`\`\`mermaid\n${diagramType.template}\n\`\`\``;
    } else if (diagramType.engine === 'chartjs') {
      prompt += 'Chart.jsの設定オブジェクトをJSON形式で出力してください。\n';
      prompt += `サンプル:\n\`\`\`json\n${JSON.stringify(diagramType.template, null, 2)}\n\`\`\``;
    } else if (diagramType.engine === 'svg') {
      prompt += `SVGコードを生成してください。サイズは${width}x${height}にしてください。\n`;
      prompt += `サンプル:\n\`\`\`svg\n${diagramType.template}\n\`\`\``;
    }

    return prompt;
  }

  /**
   * レスポンスからコードを抽出
   */
  extractDiagramCode(response, engine) {
    // コードブロックを抽出
    const codeBlockRegex = /```(?:mermaid|json|svg)?\n?([\s\S]*?)```/;
    const match = response.match(codeBlockRegex);
    
    if (match) {
      return match[1].trim();
    }
    
    // コードブロックがない場合はそのまま返す
    return response.trim();
  }

  /**
   * テンプレートベースのコード生成
   */
  getTemplateCode(type, description) {
    const diagramType = this.diagramTypes[type];
    
    if (diagramType.engine === 'chartjs') {
      // Chart.jsの場合はJSONを調整
      const template = JSON.parse(JSON.stringify(diagramType.template));
      
      // 説明文からラベルやデータを簡易的に抽出
      const words = description.split(/[、,\s]+/).filter(w => w.length > 0);
      if (words.length > 0 && template.data) {
        if (words.length > 3) {
          template.data.labels = words.slice(0, 5);
        }
      }
      
      return JSON.stringify(template, null, 2);
    }
    
    // Mermaid/SVGの場合はテンプレートをそのまま返す
    return diagramType.template;
  }

  /**
   * 図表をレンダリング
   */
  async renderDiagram(type, code, container, options = {}) {
    const diagramType = this.diagramTypes[type];
    if (!diagramType) {
      throw new Error(`Unknown diagram type: ${type}`);
    }

    const { width = 800, height = 600 } = options;

    // コンテナのクリア
    container.innerHTML = '';
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;

    if (diagramType.engine === 'mermaid') {
      return await this.renderMermaid(code, container);
    } else if (diagramType.engine === 'chartjs') {
      return await this.renderChartJs(code, container, { width, height });
    } else if (diagramType.engine === 'svg') {
      return this.renderSvg(code, container, { width, height });
    }
  }

  /**
   * Mermaid図表のレンダリング
   */
  async renderMermaid(code, container) {
    if (!this.mermaidLoaded) {
      await this.loadMermaid();
    }

    const id = `mermaid-${Date.now()}`;
    container.innerHTML = `<div id="${id}" class="mermaid">${code}</div>`;
    
    try {
      await window.mermaid.run({
        querySelector: `#${id}`
      });
    } catch (error) {
      console.error('Mermaid rendering error:', error);
      container.innerHTML = `<div class="error">レンダリングエラー: ${error.message}</div>`;
    }
  }

  /**
   * Chart.js図表のレンダリング
   */
  async renderChartJs(code, container, options) {
    if (!this.chartJsLoaded) {
      await this.loadChartJs();
    }

    // JSONパース
    let config;
    try {
      config = typeof code === 'string' ? JSON.parse(code) : code;
    } catch (error) {
      container.innerHTML = `<div class="error">JSONパースエラー: ${error.message}</div>`;
      return;
    }

    // Canvas要素を作成
    const canvas = document.createElement('canvas');
    canvas.width = options.width;
    canvas.height = options.height;
    container.appendChild(canvas);

    // Chart.jsでレンダリング
    try {
      new window.Chart(canvas, config);
    } catch (error) {
      console.error('Chart.js rendering error:', error);
      container.innerHTML = `<div class="error">レンダリングエラー: ${error.message}</div>`;
    }
  }

  /**
   * SVG図表のレンダリング
   */
  renderSvg(code, container, options) {
    try {
      // SVGコードを調整
      let svgCode = code.trim();
      
      // 基本的なSVG構造チェック
      if (!svgCode.includes('<svg')) {
        throw new Error('Invalid SVG code');
      }
      
      // viewBoxがない場合は追加
      if (!svgCode.includes('viewBox')) {
        svgCode = svgCode.replace('<svg', `<svg viewBox="0 0 ${options.width} ${options.height}"`);
      }
      
      // サイズ属性を設定
      if (!svgCode.includes('width=')) {
        svgCode = svgCode.replace('<svg', `<svg width="${options.width}"`);
      }
      if (!svgCode.includes('height=')) {
        svgCode = svgCode.replace('<svg', `<svg height="${options.height}"`);
      }
      
      // スタイルを追加（レスポンシブ対応）
      svgCode = svgCode.replace('<svg', '<svg style="max-width: 100%; height: auto;"');
      
      container.innerHTML = svgCode;
      
    } catch (error) {
      console.error('SVG rendering error:', error);
      container.innerHTML = `<div class="error">SVGレンダリングエラー: ${error.message}</div>`;
    }
  }

  /**
   * 図表をMarkdownに変換
   */
  convertToMarkdown(type, code) {
    const diagramType = this.diagramTypes[type];
    
    if (diagramType.engine === 'mermaid') {
      return `\`\`\`mermaid\n${code}\n\`\`\``;
    } else if (diagramType.engine === 'svg') {
      // SVGは画像として埋め込み
      const dataUri = `data:image/svg+xml;base64,${btoa(code)}`;
      return `![${diagramType.name}](${dataUri})`;
    } else if (diagramType.engine === 'chartjs') {
      // Chart.jsは説明テキストとして出力
      return `\`\`\`json\n${code}\n\`\`\``;
    }
    
    return code;
  }

  /**
   * 図表を画像としてエクスポート
   */
  async exportAsImage(type, code, format = 'png', options = {}) {
    const { width = 800, height = 600 } = options;
    
    // 一時コンテナを作成
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    document.body.appendChild(tempContainer);
    
    try {
      // 図表をレンダリング
      await this.renderDiagram(type, code, tempContainer, { width, height });
      
      // html2canvasを使用して画像化
      const canvas = await this.captureElement(tempContainer);
      
      // 画像データを取得
      const dataUrl = canvas.toDataURL(`image/${format}`);
      
      return dataUrl;
      
    } finally {
      // 一時コンテナを削除
      document.body.removeChild(tempContainer);
    }
  }

  /**
   * 要素をキャプチャ
   */
  async captureElement(element) {
    // html2canvasライブラリを動的に読み込み
    if (!window.html2canvas) {
      await new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1';
        script.onload = resolve;
        document.head.appendChild(script);
      });
    }
    
    return await window.html2canvas(element);
  }
}

// グローバルに公開
window.DiagramGenerator = DiagramGenerator;