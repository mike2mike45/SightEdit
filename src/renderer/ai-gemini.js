// Gemini AI統合
(function() {
  if (typeof window === 'undefined') return;

  // 最新のGemini 2.5 Pro（最高性能）を使用
  const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent';

  // エディタにフォーカスを戻す関数
  function restoreEditorFocus() {
    // TipTapエディタのフォーカスを復帰
    setTimeout(() => {
      const editor = document.querySelector('.ProseMirror');
      if (editor) {
        editor.focus();
      } else {
        // フォールバック：他の可能なエディタ要素
        const textarea = document.querySelector('textarea, input[type="text"], .editor-content, [contenteditable="true"]');
        if (textarea) {
          textarea.focus();
        }
      }
    }, 100);
  }

  // スタイルを追加
  function ensureStyles() {
    if (document.getElementById('ai-gemini-styles')) return;
    const style = document.createElement('style');
    style.id = 'ai-gemini-styles';
    style.textContent = `
      .ai-toolbar-group { display: flex; gap: 6px; align-items: center; margin-left: 8px; }
      .ai-toolbar-group .btn { 
        border: 0; 
        border-radius: 6px; 
        padding: 6px 10px; 
        cursor: pointer; 
        background: #2b2b2b; 
        color: #fff; 
        font-size: 14px;
        transition: background 0.2s;
      }
      .ai-toolbar-group .btn:hover { background: #3a3a3a; }
      
      /* API キー登録ダイアログ */
      .ai-setup-modal {
        position: fixed;
        inset: 0;
        display: none;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10000;
      }
      .ai-setup-modal.active { display: flex; }
      .ai-setup-panel {
        background: #fff;
        color: #333;
        border-radius: 12px;
        padding: 24px;
        width: 480px;
        max-width: 90vw;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      }
      body.dark-theme .ai-setup-panel {
        background: #1f2937;
        color: #fff;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      }
      .ai-setup-title {
        font-size: 20px;
        font-weight: bold;
        margin-bottom: 16px;
      }
      .ai-setup-description {
        color: #666;
        margin-bottom: 20px;
        line-height: 1.5;
      }
      body.dark-theme .ai-setup-description {
        color: #9ca3af;
      }
      .ai-setup-input {
        width: 100%;
        padding: 10px;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        background: #fff;
        color: #333;
        font-size: 14px;
        margin-bottom: 20px;
      }
      body.dark-theme .ai-setup-input {
        border: 1px solid #374151;
        background: #111827;
        color: #fff;
      }
      .ai-setup-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }
      .ai-setup-btn {
        padding: 8px 20px;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        transition: opacity 0.2s;
      }
      .ai-setup-btn:hover { opacity: 0.8; }
      .ai-setup-btn.primary {
        background: #007bff;
        color: #fff;
        border-color: #007bff;
      }
      .ai-setup-btn.secondary {
        background: #f8f9fa;
        color: #333;
        border-color: #dee2e6;
      }
      body.dark-theme .ai-setup-btn.primary {
        background: #2563eb;
        border-color: #2563eb;
      }
      body.dark-theme .ai-setup-btn.secondary {
        background: #374151;
        color: #fff;
        border-color: #374151;
      }
      
      /* 結果表示ウィンドウ */
      .ai-result-modal {
        position: fixed;
        inset: 0;
        display: none;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10001;
      }
      .ai-result-modal.active { display: flex; }
      .ai-result-panel {
        background: #fff;
        color: #333;
        border-radius: 12px;
        padding: 24px;
        width: 600px;
        max-width: 90vw;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      }
      body.dark-theme .ai-result-panel {
        background: #1f2937;
        color: #fff;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      }
      .ai-result-title {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 16px;
        color: #333;
      }
      body.dark-theme .ai-result-title {
        color: #f3f4f6;
      }
      .ai-result-content {
        flex: 1;
        overflow-y: auto;
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 16px;
        white-space: pre-wrap;
        word-wrap: break-word;
        line-height: 1.6;
        user-select: text;
        color: #333;
      }
      body.dark-theme .ai-result-content {
        background: #111827;
        border: 1px solid #374151;
        color: #fff;
      }
      .ai-result-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }
      .ai-result-btn {
        padding: 8px 20px;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        transition: opacity 0.2s;
      }
      .ai-result-btn:hover { opacity: 0.8; }
      .ai-result-btn.primary {
        background: #007bff;
        color: #fff;
        border-color: #007bff;
      }
      .ai-result-btn.secondary {
        background: #f8f9fa;
        color: #333;
        border-color: #dee2e6;
      }
      body.dark-theme .ai-result-btn.primary {
        background: #2563eb;
        border-color: #2563eb;
      }
      body.dark-theme .ai-result-btn.secondary {
        background: #374151;
        color: #fff;
        border-color: #374151;
      }
      
      /* ローディング表示 */
      .ai-loading {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 3px solid #374151;
        border-top-color: #2563eb;
        border-radius: 50%;
        animation: ai-spin 1s linear infinite;
        margin-left: 8px;
      }
      @keyframes ai-spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  // 設定を読み込み
  async function loadConfig() {
    try {
      const response = await window.electronAPI.invoke('config:get', 'gemini');
      return response || {};
    } catch (e) {
      console.error('Failed to load config:', e);
      return {};
    }
  }

  // 設定を保存
  async function saveConfig(config) {
    try {
      await window.electronAPI.invoke('config:set', 'gemini', config);
      return true;
    } catch (e) {
      console.error('Failed to save config:', e);
      return false;
    }
  }

  // APIキー設定ダイアログを表示
  function showSetupDialog() {
    let modal = document.querySelector('.ai-setup-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'ai-setup-modal';
      modal.innerHTML = `
        <div class="ai-setup-panel">
          <div class="ai-setup-title">Gemini AI セットアップ</div>
          <div class="ai-setup-description">
            Google AI Studio から取得した Gemini API キーを入力してください。<br>
            <a href="#" class="api-key-link" style="color: #60a5fa;">API キーを取得</a>
            <small style="display: block; margin-top: 8px; color: #9ca3af;">
              ※ システムのデフォルトブラウザで開きます
            </small>
          </div>
          <input type="password" class="ai-setup-input" placeholder="AIza...で始まるAPIキー" />
          <div class="ai-setup-actions">
            <button class="ai-setup-btn secondary" data-action="cancel">キャンセル</button>
            <button class="ai-setup-btn primary" data-action="save">保存</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      // APIキー取得リンクのクリック処理
      modal.querySelector('.api-key-link').addEventListener('click', (e) => {
        e.preventDefault();
        
        const url = 'https://aistudio.google.com/app/apikey';
        
        // システムのデフォルトブラウザで開く
        if (window.electronAPI && window.electronAPI.openExternal) {
          window.electronAPI.openExternal(url);
        } else {
          // フォールバック：新しいウィンドウで開く
          window.open(url, '_blank');
        }
      });

      // イベントリスナー
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
      });

      modal.querySelector('[data-action="cancel"]').addEventListener('click', () => {
        modal.classList.remove('active');
      });

      const saveBtn = modal.querySelector('[data-action="save"]');
      saveBtn.addEventListener('click', async () => {
        const inputEl = modal.querySelector('input');
        let apiKey = inputEl.value.trim();
        
        if (!apiKey) {
          alert('APIキーを入力してください');
          return;
        }
        
        // APIキーのバリデーション（基本的な形式チェック）
        if (!apiKey.startsWith('AIza') || apiKey.length < 30) {
          alert('正しいGemini APIキーを入力してください（AIzaで始まる39文字のキー）');
          return;
        }

        const config = await loadConfig();
        config.apiKey = apiKey;
        
        if (await saveConfig(config)) {
          modal.classList.remove('active');
          updateToolbar();
        } else {
          alert('設定の保存に失敗しました');
        }
      });
    }

    // APIキー入力欄の設定
    const inputElement = modal.querySelector('input');

    // 既存のAPIキーがあれば表示（セキュリティのため一部をマスク）
    loadConfig().then(config => {
      if (config.apiKey) {
        const maskedKey = config.apiKey.substring(0, 8) + '*'.repeat(config.apiKey.length - 12) + config.apiKey.substring(config.apiKey.length - 4);
        inputElement.placeholder = `現在のキー: ${maskedKey}`;
      }
    });

    modal.classList.add('active');
  }

  // 結果表示ウィンドウ
  function showResultWindow(text) {
    let modal = document.querySelector('.ai-result-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'ai-result-modal';
      modal.innerHTML = `
        <div class="ai-result-panel">
          <div class="ai-result-title">Gemini AI の回答</div>
          <div class="ai-result-content"></div>
          <div class="ai-result-actions">
            <button class="ai-result-btn secondary" data-action="copy">コピー</button>
            <button class="ai-result-btn primary" data-action="close">閉じる</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      // イベントリスナー
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
          // エディタにフォーカスを戻す
          restoreEditorFocus();
        }
      });

      modal.querySelector('[data-action="close"]').addEventListener('click', () => {
        modal.classList.remove('active');
        // エディタにフォーカスを戻す
        restoreEditorFocus();
      });

      modal.querySelector('[data-action="copy"]').addEventListener('click', async () => {
        const content = modal.querySelector('.ai-result-content').textContent;
        const btn = modal.querySelector('[data-action="copy"]');
        const originalText = btn.textContent;
        
        try {
          // 方法1: Electron APIを使用（推奨）
          if (window.electronAPI && window.electronAPI.clipboard) {
            const result = await window.electronAPI.clipboard.writeText(content);
            if (result.success) {
              btn.textContent = 'コピーしました！';
            } else {
              throw new Error(result.error || 'Electron clipboard API failed');
            }
          }
          // 方法2: モーダルにフォーカスを当ててからクリップボードAPI使用
          else {
            // モーダル内の要素にフォーカスを当てる
            modal.focus();
            await navigator.clipboard.writeText(content);
            btn.textContent = 'コピーしました！';
          }
          
          setTimeout(() => {
            btn.textContent = originalText;
          }, 2000);
        } catch (e) {
          console.error('Failed to copy:', e);
          
          // 方法3: フォールバック - テキストエリア経由でコピー
          try {
            const textarea = document.createElement('textarea');
            textarea.value = content;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            
            btn.textContent = 'コピーしました！';
            setTimeout(() => {
              btn.textContent = originalText;
            }, 2000);
          } catch (fallbackError) {
            console.error('Fallback copy failed:', fallbackError);
            btn.textContent = 'コピー失敗';
            setTimeout(() => {
              btn.textContent = originalText;
            }, 2000);
          }
        }
      });

      // 右クリックメニュー
      const contentDiv = modal.querySelector('.ai-result-content');
      contentDiv.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const selection = window.getSelection().toString();
        if (selection) {
          navigator.clipboard.writeText(selection);
        }
      });
    }

    modal.querySelector('.ai-result-content').textContent = text;
    modal.classList.add('active');
  }

  // 選択テキストを取得
  function getSelectedText() {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      return selection.toString();
    }
    
    // エディタ内の選択テキストを取得
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT')) {
      const start = activeElement.selectionStart;
      const end = activeElement.selectionEnd;
      return activeElement.value.substring(start, end);
    }
    
    return '';
  }

  // Gemini APIを呼び出し
  async function callGeminiAPI(text, apiKey) {
    const prompt = `以下のテキストを要約してください：\n\n${text}`;
    
    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
      systemInstruction: {
        parts: [{
          text: "あなたは日本語でテキストを要約するアシスタントです。思考プロセスは表示せず、直接結果のみを出力してください。"
        }]
      }
    };

    try {
      const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // デバッグ用：レスポンス構造をログ出力
      console.log('Gemini API Response:', JSON.stringify(data, null, 2));
      
      // 複数のレスポンス形式に対応
      if (data.candidates && data.candidates[0]) {
        const candidate = data.candidates[0];
        
        // 新形式: content.parts[].text
        if (candidate.content && candidate.content.parts && candidate.content.parts[0] && candidate.content.parts[0].text) {
          return candidate.content.parts[0].text;
        }
        
        // Gemini 2.5 Pro の思考モード対応: text フィールドを直接確認
        if (candidate.content && candidate.content.text) {
          return candidate.content.text;
        }
        
        // 旧形式: output.text
        if (candidate.output && candidate.output.text) {
          return candidate.output.text;
        }
        
        // 直接テキスト形式
        if (candidate.text) {
          return candidate.text;
        }
        
        // Gemini 2.5 Proの思考プロセスでレスポンスが空の場合の特別処理
        if (candidate.finishReason === 'STOP' && data.usageMetadata && data.usageMetadata.thoughtsTokenCount > 0) {
          // 思考プロセスを使用したが結果が出力されなかった場合
          throw new Error('AIが思考プロセスを実行しましたが、結果の出力に失敗しました。より具体的な質問をしてください。');
        }
        
        // その他のエラーケース
        if (candidate.finishReason === 'MAX_TOKENS') {
          throw new Error('レスポンスが最大トークン数に達しました。より短いテキストで試してください。');
        } else if (candidate.finishReason === 'SAFETY') {
          throw new Error('安全性フィルターによりレスポンスがブロックされました。');
        } else if (candidate.finishReason === 'RECITATION') {
          throw new Error('レスポンスが既存のコンテンツの引用として検出されました。');
        } else {
          throw new Error('AIからのレスポンスが空です。');
        }
      }
      
      // エラーレスポンスの確認
      if (data.error) {
        throw new Error(`Gemini API Error: ${data.error.message || JSON.stringify(data.error)}`);
      }
      
      console.error('Invalid response format:', data);
      throw new Error('レスポンス形式が無効です');
    } catch (error) {
      console.error('Gemini API Error:', error);
      throw error;
    }
  }

  // AIボタンのクリック処理
  async function handleAIButtonClick() {
    const config = await loadConfig();
    
    // APIキーが設定されていない場合はセットアップダイアログを表示
    if (!config.apiKey) {
      showSetupDialog();
      return;
    }

    // 選択テキストを取得
    const selectedText = getSelectedText();
    if (!selectedText) {
      alert('テキストを選択してください');
      return;
    }

    // ローディング表示
    const btn = document.querySelector('.ai-toolbar-group .ai-btn');
    const originalContent = btn.innerHTML;
    btn.innerHTML = '処理中<span class="ai-loading"></span>';
    btn.disabled = true;

    try {
      // Gemini APIを呼び出し
      const result = await callGeminiAPI(selectedText, config.apiKey);
      
      // 結果を表示
      showResultWindow(result);
    } catch (error) {
      let errorMessage = 'エラーが発生しました: ';
      if (error.message.includes('401') || error.message.includes('403')) {
        errorMessage += 'APIキーが無効です。設定を確認してください。';
      } else if (error.message.includes('404')) {
        errorMessage += 'APIエンドポイントが見つかりません。';
      } else {
        errorMessage += error.message;
      }
      alert(errorMessage);
    } finally {
      // ボタンを元に戻す
      btn.innerHTML = originalContent;
      btn.disabled = false;
    }
  }

  // ツールバーを更新
  async function updateToolbar() {
    ensureStyles();
    
    const toolbar = document.querySelector('.toolbar');
    if (!toolbar) return;

    let group = document.querySelector('.ai-toolbar-group');
    if (!group) {
      group = document.createElement('div');
      group.className = 'toolbar-group ai-toolbar-group';
      toolbar.appendChild(group);
    }

    const config = await loadConfig();
    const hasApiKey = !!config.apiKey;

    group.innerHTML = `
      <button class="btn ai-btn" title="${hasApiKey ? 'テキストを要約' : 'APIキーを設定してください'}">
        AI: Gemini ${hasApiKey ? '' : '(未設定)'}
      </button>
      <button class="btn gear-btn" title="API設定">⚙</button>
    `;

    // イベントリスナー
    group.querySelector('.ai-btn').addEventListener('click', handleAIButtonClick);
    group.querySelector('.gear-btn').addEventListener('click', showSetupDialog);
  }

  // 初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateToolbar);
  } else {
    updateToolbar();
  }

  // メニューからの呼び出しに対応
  if (window.electronAPI) {
    window.electronAPI.onMenuAction('menu-ai-summarize', handleAIButtonClick);
    window.electronAPI.onMenuAction('menu-ai-setup', showSetupDialog);
  }
})();