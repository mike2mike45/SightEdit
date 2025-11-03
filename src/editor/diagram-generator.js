/**
 * Diagram Generator
 * Mermaid, Chart.js, SVGを使った図の生成と管理
 */

import mermaid from 'mermaid';

export class DiagramGenerator {
  constructor() {
    this.modal = null;
    this.currentTab = 'mermaid';
    this.currentSVG = null;
    this.onInsertCallback = null;

    // Mermaidを初期化
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
    });

    this.init();
  }

  init() {
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

    // Mermaidプレビュー生成ボタン
    const mermaidGenerateBtn = document.getElementById('mermaid-generate-btn');
    mermaidGenerateBtn?.addEventListener('click', () => this.generateMermaidPreview());

    // Mermaidコード入力（リアルタイムプレビューは負荷が高いので手動生成）
    const mermaidCodeInput = document.getElementById('mermaid-code');
    mermaidCodeInput?.addEventListener('input', () => {
      // コードが変更されたら挿入ボタンを無効化（再生成が必要）
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
