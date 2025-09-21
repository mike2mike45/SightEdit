// カスタムAI命令ダイアログモジュール（UI専用・簡略化版）
// - 重複するAI機能ロジックを削除
// - index.jsの統合されたAI機能を使用
// - UIの作成とイベント処理のみに特化

export function createAICustomDialog() {
  const dialogHTML = `
    <div id="ai-custom-dialog" class="dialog-overlay" style="display: none;">
      <div class="dialog-content ai-custom-dialog-content">
        <div class="dialog-header">
          <h2>カスタムAI命令</h2>
          <button id="ai-custom-close" class="dialog-close">&times;</button>
        </div>
        <div class="ai-custom-content">
          <div class="instruction-section">
            <label for="ai-custom-instruction">実行したい命令を入力してください：</label>
            <textarea 
              id="ai-custom-instruction" 
              placeholder="例：この文章をより読みやすく書き直して
例：専門用語を分かりやすく説明して
例：この内容を箇条書きでまとめて
例：この文章をビジネスメール調に変換して
例：誤字脱字をチェックして修正箇所を教えて"
              rows="6"
            ></textarea>
            <div class="instruction-tips">
              <small>💡 ヒント: 具体的な指示をすると、より良い結果が得られます</small>
            </div>
          </div>
          
          <div class="button-section">
            <button id="ai-custom-execute" class="primary-button">実行 (Ctrl+Enter)</button>
            <button id="ai-custom-cancel" class="secondary-button">キャンセル</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // DOMに追加
  document.body.insertAdjacentHTML('beforeend', dialogHTML);
  
  // イベントリスナーの設定
  setupAICustomDialogEvents();
  
  return {
    show: () => {
      const dialog = document.getElementById('ai-custom-dialog');
      const textarea = document.getElementById('ai-custom-instruction');
      if (dialog) {
        dialog.style.display = 'flex';
        // フォーカスを当てる
        setTimeout(() => {
          if (textarea) textarea.focus();
        }, 100);
      }
    },
    hide: () => {
      const dialog = document.getElementById('ai-custom-dialog');
      const textarea = document.getElementById('ai-custom-instruction');
      if (dialog) {
        dialog.style.display = 'none';
        // テキストエリアをクリア
        if (textarea) textarea.value = '';
      }
    }
  };
}

// カスタムAI命令ダイアログのイベント設定
function setupAICustomDialogEvents() {
  const dialog = document.getElementById('ai-custom-dialog');
  const closeBtn = document.getElementById('ai-custom-close');
  const executeBtn = document.getElementById('ai-custom-execute');
  const cancelBtn = document.getElementById('ai-custom-cancel');
  const textarea = document.getElementById('ai-custom-instruction');
  
  // 閉じるボタン
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      const dialog = document.getElementById('ai-custom-dialog');
      if (dialog) dialog.style.display = 'none';
    });
  }
  
  // キャンセルボタン
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      const dialog = document.getElementById('ai-custom-dialog');
      if (dialog) dialog.style.display = 'none';
    });
  }
  
  // 実行ボタン
  if (executeBtn) {
    executeBtn.addEventListener('click', () => {
      const instruction = textarea?.value.trim();
      if (instruction) {
        // カスタム命令を実行（index.jsの関数を使用）
        executeCustomAICommand(instruction);
        // ダイアログを閉じる
        const dialog = document.getElementById('ai-custom-dialog');
        if (dialog) dialog.style.display = 'none';
      }
    });
  }
  
  // オーバーレイクリックで閉じる
  if (dialog) {
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        dialog.style.display = 'none';
      }
    });
  }
  
  // ESCキーで閉じる
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const dialog = document.getElementById('ai-custom-dialog');
      if (dialog && dialog.style.display === 'flex') {
        dialog.style.display = 'none';
      }
    }
  });
  
  // Enterキー（Ctrl+Enter）で実行
  if (textarea) {
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const instruction = textarea.value.trim();
        if (instruction) {
          executeCustomAICommand(instruction);
          const dialog = document.getElementById('ai-custom-dialog');
          if (dialog) dialog.style.display = 'none';
        }
      }
    });
  }
}

// カスタムAI命令を実行（index.jsの関数を使用）
function executeCustomAICommand(instruction) {
  console.log('Executing custom AI command:', instruction);
  
  // index.jsの統合されたgetSelectedTextを使用
  const selectedText = window.getSelectedText ? window.getSelectedText() : '';
  
  if (!selectedText) {
    if (window.showMessage) {
      window.showMessage('テキストを選択してから実行してください', 'warning');
    }
    return;
  }
  
  // index.jsの統合されたexecuteAIFunctionを使用
  // customInstructionを第3引数として渡す
  if (window.executeAIFunction) {
    window.executeAIFunction('custom', null, instruction);
  } else {
    console.error('AI processing function not available');
    if (window.showMessage) {
      window.showMessage('AI機能が利用できません', 'error');
    }
  }
}

// カスタムダイアログ用のスタイル
export function addAICustomStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .ai-custom-dialog-content {
      width: 90%;
      max-width: 600px;
      background: white;
      border-radius: 12px;
      padding: 0;
      max-height: 80vh;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
      animation: fadeInScale 0.3s ease;
    }

    .ai-custom-content {
      padding: 24px;
    }

    .instruction-section {
      margin-bottom: 24px;
    }

    .instruction-section label {
      display: block;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
      font-size: 14px;
    }

    .instruction-section textarea {
      width: 100%;
      min-height: 120px;
      padding: 12px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      resize: vertical;
      transition: border-color 0.2s ease;
      box-sizing: border-box;
    }

    .instruction-section textarea:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .instruction-section textarea::placeholder {
      color: #9ca3af;
      line-height: 1.4;
    }

    .instruction-tips {
      margin-top: 8px;
      padding: 8px 12px;
      background: #f3f4f6;
      border-radius: 6px;
      border-left: 3px solid #3b82f6;
    }

    .instruction-tips small {
      color: #6b7280;
      font-size: 12px;
    }

    .button-section {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    .primary-button {
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s ease;
      box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
    }

    .primary-button:hover {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
      transform: translateY(-1px);
    }

    .primary-button:active {
      transform: translateY(0);
      box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
    }

    .secondary-button {
      background: #f3f4f6;
      color: #374151;
      border: 1px solid #d1d5db;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s ease;
    }

    .secondary-button:hover {
      background: #e5e7eb;
      border-color: #9ca3af;
    }

    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(4px);
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid #e5e7eb;
      background: #f9fafb;
      border-radius: 12px 12px 0 0;
    }

    .dialog-header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #111827;
    }

    .dialog-close {
      background: none;
      border: none;
      font-size: 24px;
      color: #6b7280;
      cursor: pointer;
      padding: 4px;
      line-height: 1;
      transition: color 0.2s ease;
    }

    .dialog-close:hover {
      color: #374151;
    }

    @keyframes fadeInScale {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    @media (max-width: 640px) {
      .ai-custom-dialog-content {
        width: 95%;
        margin: 20px;
      }
      
      .button-section {
        flex-direction: column;
      }
      
      .primary-button,
      .secondary-button {
        width: 100%;
      }
    }
  `;
  
  document.head.appendChild(style);
}