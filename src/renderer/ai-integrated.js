// AI統合（Gemini & Claude）
(function() {
  if (typeof window === 'undefined') return;
  
  // ファイル出力用のディレクトリパス（ダウンロードフォルダ）
  const getDownloadPath = () => {
    const os = require('os');
    const path = require('path');
    return path.join(os.homedir(), 'Downloads');
  };
  
  // i18n設定を取得
  async function getTranslation(key) {
    try {
      const lang = await window.electronAPI?.invoke('config:get', 'language') || 'ja';
      const translations = {
        ja: {
          title: 'AI セットアップ',
          provider: 'AIプロバイダー',
          setupDescription: '使用するAIプロバイダーを選択してください。既存のAPIキーがある場合、プロバイダーの切り替えのみ行えます。',
          geminiDescription: 'Google AI Studio から取得した Gemini API キーを入力してください。既に設定済みの場合、空白のままでも保存できます。',
          claudeDescription: 'Anthropic Console から取得した Claude API キーを入力してください。既に設定済みの場合、空白のままでも保存できます。',
          geminiFreeNote: '✨ Gemini APIは無料で利用できます（制限あり）',
          systemNote: '※ システムのデフォルトブラウザで開きます',
          cancel: 'キャンセル',
          save: '保存',
          geminiKeyPlaceholder: 'AIza...で始まるAPIキー（空白可）',
          claudeKeyPlaceholder: 'sk-ant-...で始まるAPIキー（空白可）',
          geminiApiKey: 'Gemini API キーを取得',
          claudeApiKey: 'Claude API キーを取得'
        },
        en: {
          title: 'AI Setup',
          provider: 'AI Provider',
          setupDescription: 'Select your AI provider. If you have existing API keys, you can switch providers without re-entering keys.',
          geminiDescription: 'Enter your Gemini API key from Google AI Studio. If already configured, you can leave this blank.',
          claudeDescription: 'Enter your Claude API key from Anthropic Console. If already configured, you can leave this blank.',
          geminiFreeNote: '✨ Gemini API is free to use (with limits)',
          systemNote: '※ Opens in your default browser',
          cancel: 'Cancel',
          save: 'Save',
          geminiKeyPlaceholder: 'API key starting with AIza... (optional if set)',
          claudeKeyPlaceholder: 'API key starting with sk-ant-... (optional if set)',
          geminiApiKey: 'Get Gemini API Key',
          claudeApiKey: 'Get Claude API Key'
        }
      };
      return translations[lang] || translations.ja;
    } catch (e) {
      // デフォルトは日本語
      return {
        title: 'AI セットアップ',
        provider: 'AIプロバイダー',
        setupDescription: '使用するAIプロバイダーを選択してください。既存のAPIキーがある場合、プロバイダーの切り替えのみ行えます。',
        geminiDescription: 'Google AI Studio から取得した Gemini API キーを入力してください。既に設定済みの場合、空白のままでも保存できます。',
        claudeDescription: 'Anthropic Console から取得した Claude API キーを入力してください。既に設定済みの場合、空白のままでも保存できます。',
        geminiFreeNote: '✨ Gemini APIは無料で利用できます（制限あり）',
        systemNote: '※ システムのデフォルトブラウザで開きます',
        cancel: 'キャンセル',
        save: '保存',
        geminiKeyPlaceholder: 'AIza...で始まるAPIキー（空白可）',
        claudeKeyPlaceholder: 'sk-ant-...で始まるAPIキー（空白可）',
        geminiApiKey: 'Gemini API キーを取得',
        claudeApiKey: 'Claude API キーを取得'
      };
    }
  }

  // API エンドポイント設定
  const GEMINI_API_ENDPOINT_PRO = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent';
  const GEMINI_API_ENDPOINT_FLASH = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
  const GEMINI_FILE_UPLOAD_API = 'https://generativelanguage.googleapis.com/upload/v1beta/files';
  const GEMINI_FILE_API = 'https://generativelanguage.googleapis.com/v1beta/files';
  const CLAUDE_API_ENDPOINT = 'https://api.anthropic.com/v1/messages';
  const CLAUDE_API_VERSION = '2023-06-01';
  const CLAUDE_MODEL = 'claude-3-5-sonnet-20241022';

  // エディタにフォーカスを戻す関数
  function restoreEditorFocus() {
    setTimeout(() => {
      const editor = document.querySelector('.ProseMirror');
      if (editor) {
        editor.focus();
      } else {
        const textarea = document.querySelector('textarea, input[type="text"], .editor-content, [contenteditable="true"]');
        if (textarea) {
          textarea.focus();
        }
      }
    }, 100);
  }

  // スタイルを追加
  function ensureStyles() {
    if (document.getElementById('ai-integrated-styles')) return;
    const style = document.createElement('style');
    style.id = 'ai-integrated-styles';
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
      
      /* 拡張された結果表示モーダルのスタイル */
      .ai-result-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 25px 0;
      }
      
      .ai-result-title {
        font-size: 18px;
        font-weight: 600;
        color: #2d3748;
      }
      
      .ai-result-provider {
        font-size: 12px;
        color: #666;
        background: #f1f5f9;
        padding: 4px 8px;
        border-radius: 12px;
      }
      
      .ai-result-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 25px;
        border-top: 1px solid #e2e8f0;
      }
      
      .ai-result-actions-left,
      .ai-result-actions-right {
        display: flex;
        gap: 10px;
      }
      
      .ai-result-btn {
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        border: 1px solid;
      }
      
      .ai-result-btn.primary {
        background: #3b82f6;
        color: white;
        border-color: #3b82f6;
      }
      
      .ai-result-btn.primary:hover {
        background: #2563eb;
        border-color: #2563eb;
      }
      
      .ai-result-btn.secondary {
        background: white;
        color: #374151;
        border-color: #d1d5db;
      }
      
      .ai-result-btn.secondary:hover {
        background: #f9fafb;
        border-color: #9ca3af;
      }
      
      .ai-result-btn.tertiary {
        background: #f8fafc;
        color: #475569;
        border-color: #cbd5e1;
      }
      
      .ai-result-btn.tertiary:hover {
        background: #e2e8f0;
        border-color: #94a3b8;
      }
      
      /* ダークモード対応 */
      body.dark-mode .ai-result-title {
        color: #f1f5f9;
      }
      
      body.dark-mode .ai-result-provider {
        background: #374151;
        color: #9ca3af;
      }
      
      body.dark-mode .ai-result-actions {
        border-top-color: #374151;
      }
      
      body.dark-mode .ai-result-btn.secondary {
        background: #374151;
        color: #e5e7eb;
        border-color: #4b5563;
      }
      
      body.dark-mode .ai-result-btn.secondary:hover {
        background: #4b5563;
        border-color: #6b7280;
      }
      
      body.dark-mode .ai-result-btn.tertiary {
        background: #4b5563;
        color: #d1d5db;
        border-color: #6b7280;
      }
      
      body.dark-mode .ai-result-btn.tertiary:hover {
        background: #6b7280;
        border-color: #9ca3af;
      }
      
      /* ローディングモーダルのスタイル */
      .ai-loading-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 9999;
      }
      
      .ai-loading-modal.active {
        display: flex;
      }
      
      .ai-loading-content {
        background: white;
        padding: 40px;
        border-radius: 16px;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      }
      
      .ai-loading-spinner {
        width: 50px;
        height: 50px;
        border: 4px solid #e5e7eb;
        border-top-color: #3b82f6;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      .ai-loading-text {
        font-size: 18px;
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 8px;
      }
      
      .ai-loading-subtext {
        font-size: 14px;
        color: #6b7280;
      }
      
      /* ダークモード対応 */
      body.dark-mode .ai-loading-content {
        background: #374151;
      }
      
      body.dark-mode .ai-loading-spinner {
        border-color: #4b5563;
        border-top-color: #60a5fa;
      }
      
      body.dark-mode .ai-loading-text {
        color: #f3f4f6;
      }
      
      body.dark-mode .ai-loading-subtext {
        color: #9ca3af;
      }
      
      /* リッチテキスト対応ボタンのスタイル */
      .ai-append-group {
        display: flex;
        gap: 4px;
        margin-right: 8px;
      }
      
      .ai-append-group .ai-result-btn {
        padding: 6px 12px;
        font-size: 12px;
        border-radius: 4px;
      }
      
      .ai-result-actions-left {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      /* 結果表示の長文対応 */
      .ai-result-content {
        max-height: 60vh;
        overflow-y: auto;
        padding: 20px 25px;
        line-height: 1.6;
        white-space: pre-wrap;
        word-wrap: break-word;
      }
      
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
        width: 520px;
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
      .ai-provider-select {
        width: 100%;
        padding: 10px;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        background: #fff;
        color: #333;
        font-size: 14px;
        margin-bottom: 20px;
      }
      body.dark-theme .ai-provider-select {
        border: 1px solid #374151;
        background: #111827;
        color: #fff;
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
      .provider-config {
        margin-bottom: 16px;
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
      const geminiConfig = await window.electronAPI.invoke('config:get', 'gemini') || {};
      const claudeConfig = await window.electronAPI.invoke('config:get', 'claude') || {};
      const aiSettings = await window.electronAPI.invoke('config:get', 'ai') || {};
      return {
        gemini: geminiConfig,
        claude: claudeConfig,
        provider: aiSettings.provider || 'gemini'
      };
    } catch (e) {
      console.error('Failed to load config:', e);
      return { gemini: {}, claude: {}, provider: 'gemini' };
    }
  }

  // 設定を保存
  async function saveConfig(provider, config) {
    try {
      if (provider === 'gemini') {
        await window.electronAPI.invoke('config:set', 'gemini', config);
      } else if (provider === 'claude') {
        await window.electronAPI.invoke('config:set', 'claude', config);
      }
      return true;
    } catch (e) {
      console.error('Failed to save config:', e);
      return false;
    }
  }

  // AIプロバイダー設定を保存
  async function saveAISettings(settings) {
    try {
      await window.electronAPI.invoke('config:set', 'ai', settings);
      return true;
    } catch (e) {
      console.error('Failed to save AI settings:', e);
      return false;
    }
  }

  // APIキー設定ダイアログを表示
  async function showSetupDialog() {
    const t = await getTranslation();
    
    let modal = document.querySelector('.ai-setup-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'ai-setup-modal';
      modal.innerHTML = `
        <div class="ai-setup-panel">
          <div class="ai-setup-title">${t.title}</div>
          <div class="ai-setup-description">
            ${t.setupDescription}
          </div>
          
          <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 8px; font-weight: bold;">${t.provider}:</label>
            <select class="ai-provider-select">
              <option value="gemini">Google Gemini</option>
              <option value="claude">Anthropic Claude</option>
            </select>
          </div>
          
          <div class="provider-config" data-provider="gemini">
            <div class="ai-setup-description">
              ${t.geminiDescription}<br>
              <a href="#" class="api-key-link gemini-link" style="color: #60a5fa;">${t.geminiApiKey}</a>
              <div style="margin-top: 10px; padding: 10px; background: #e8f5e9; border-radius: 6px; font-size: 13px; color: #2e7d32;">
                ${t.geminiFreeNote}
              </div>
            </div>
            <input type="password" class="ai-setup-input gemini-input" placeholder="${t.geminiKeyPlaceholder}" />
          </div>
          
          <div class="provider-config" data-provider="claude" style="display: none;">
            <div class="ai-setup-description">
              ${t.claudeDescription}<br>
              <a href="#" class="api-key-link claude-link" style="color: #60a5fa;">${t.claudeApiKey}</a>
            </div>
            <input type="password" class="ai-setup-input claude-input" placeholder="${t.claudeKeyPlaceholder}" />
          </div>
          
          <small style="display: block; margin-top: 8px; color: #9ca3af;">
            ${t.systemNote}
          </small>
          
          <div class="ai-setup-actions">
            <button class="ai-setup-btn secondary" data-action="cancel">${t.cancel}</button>
            <button class="ai-setup-btn primary" data-action="save">${t.save}</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      // プロバイダー選択の変更処理
      const providerSelect = modal.querySelector('.ai-provider-select');
      providerSelect.addEventListener('change', (e) => {
        const provider = e.target.value;
        modal.querySelectorAll('.provider-config').forEach(el => {
          el.style.display = el.dataset.provider === provider ? 'block' : 'none';
        });
      });

      // APIキー取得リンクのクリック処理
      modal.querySelector('.gemini-link').addEventListener('click', (e) => {
        e.preventDefault();
        const url = 'https://aistudio.google.com/app/apikey';
        if (window.electronAPI && window.electronAPI.openExternal) {
          window.electronAPI.openExternal(url);
        } else {
          window.open(url, '_blank');
        }
      });

      modal.querySelector('.claude-link').addEventListener('click', (e) => {
        e.preventDefault();
        const url = 'https://console.anthropic.com/dashboard';
        if (window.electronAPI && window.electronAPI.openExternal) {
          window.electronAPI.openExternal(url);
        } else {
          window.open(url, '_blank');
        }
      });

      // イベントリスナー
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
          restoreEditorFocus();
        }
      });

      modal.querySelector('[data-action="cancel"]').addEventListener('click', () => {
        modal.classList.remove('active');
        restoreEditorFocus();
      });

      const saveBtn = modal.querySelector('[data-action="save"]');
      saveBtn.addEventListener('click', async () => {
        const provider = providerSelect.value;
        const inputEl = modal.querySelector(`.${provider}-input`);
        let apiKey = inputEl.value.trim();
        
        // 既存のAPIキーを確認
        const currentConfig = await loadConfig();
        const existingApiKey = provider === 'claude' ? currentConfig.claude.apiKey : currentConfig.gemini.apiKey;
        
        // APIキーが入力されていない場合、既存のものを使用
        if (!apiKey && existingApiKey) {
          apiKey = existingApiKey;
        }
        
        // 新しいAPIキーが入力された場合のバリデーション
        if (apiKey && apiKey !== existingApiKey) {
          if (provider === 'gemini') {
            if (!apiKey.startsWith('AIza') || apiKey.length < 30) {
              alert('正しいGemini APIキーを入力してください（AIzaで始まる39文字のキー）');
              return;
            }
          } else if (provider === 'claude') {
            if (!apiKey.startsWith('sk-ant-') || apiKey.length < 50) {
              alert('正しいClaude APIキーを入力してください（sk-ant-で始まるキー）');
              return;
            }
          }
        }
        
        // APIキーがない場合はエラー
        if (!apiKey) {
          alert('APIキーを入力してください');
          return;
        }

        const config = { apiKey: apiKey };
        
        // APIキーを保存（新しいものか既存のものかに関わらず）
        if (await saveConfig(provider, config)) {
          // プロバイダー設定を保存
          await saveAISettings({ provider: provider });
          modal.classList.remove('active');
          updateToolbar();
          
          // エディタにフォーカスを戻す
          restoreEditorFocus();
        } else {
          alert('設定の保存に失敗しました');
        }
      });
    }

    // 設定を読み込んで反映
    loadConfig().then(config => {
      const providerSelect = modal.querySelector('.ai-provider-select');
      providerSelect.value = config.provider;
      providerSelect.dispatchEvent(new Event('change'));
      
      // Gemini APIキーがあれば表示
      if (config.gemini.apiKey) {
        const geminiInput = modal.querySelector('.gemini-input');
        const maskedKey = config.gemini.apiKey.substring(0, 8) + '*'.repeat(config.gemini.apiKey.length - 12) + config.gemini.apiKey.substring(config.gemini.apiKey.length - 4);
        geminiInput.placeholder = `現在のキー: ${maskedKey}`;
      }
      
      // Claude APIキーがあれば表示
      if (config.claude.apiKey) {
        const claudeInput = modal.querySelector('.claude-input');
        const maskedKey = config.claude.apiKey.substring(0, 10) + '*'.repeat(config.claude.apiKey.length - 14) + config.claude.apiKey.substring(config.claude.apiKey.length - 4);
        claudeInput.placeholder = `現在のキー: ${maskedKey}`;
      }
    });

    modal.classList.add('active');
  }

  // ファイルパス表示ダイアログ
  function showFilePathDialog(filepath, filename) {
    const modal = document.createElement('div');
    modal.className = 'ai-file-path-modal';
    modal.innerHTML = `
      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10002;">
        <div style="background: white; padding: 30px; border-radius: 12px; max-width: 600px; width: 90%; text-align: center;">
          <h3 style="margin: 0 0 15px; color: #2563eb;">🗂️ AI出力をファイルに保存しました</h3>
          <p style="color: #666; margin-bottom: 20px;">出力が大きいため、ファイルに保存されました。</p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: left; font-family: monospace; font-size: 14px;">
            <div style="margin-bottom: 8px;"><strong>ファイル名:</strong> ${filename}</div>
            <div style="word-break: break-all;"><strong>パス:</strong> ${filepath}</div>
          </div>
          <div style="display: flex; gap: 10px; justify-content: center;">
            <button onclick="this.closest('.ai-file-path-modal').remove()" 
                    style="background: #6b7280; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
              閉じる
            </button>
            <button onclick="navigator.clipboard.writeText('${filepath.replace(/\\/g, '\\\\')}'); this.innerText='コピーしました！'; setTimeout(() => this.innerText='パスをコピー', 2000);" 
                    style="background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
              パスをコピー
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal.firstElementChild);
  }

  // 結果表示ウィンドウ（拡張版）
  function showResultWindow(text, provider, originalText = '', functionType = '', option = '') {
    let modal = document.querySelector('.ai-result-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'ai-result-modal';
      modal.innerHTML = `
        <div class="ai-result-panel">
          <div class="ai-result-header">
            <div class="ai-result-title">AI の回答</div>
            <div class="ai-result-provider">${provider} AI</div>
          </div>
          <div class="ai-result-content"></div>
          <div class="ai-result-actions">
            <div class="ai-result-actions-left">
              <div class="ai-append-group" style="display: flex; gap: 4px;">
                <button class="ai-result-btn secondary" data-action="insert" title="カーソル位置に挿入">挿入</button>
                <button class="ai-result-btn secondary" data-action="append" title="末尾に追加">追加</button>
              </div>
              <button class="ai-result-btn secondary" data-action="copy">コピー</button>
            </div>
            <div class="ai-result-actions-right">
              <button class="ai-result-btn tertiary" data-action="rerun">再実行</button>
              <button class="ai-result-btn primary" data-action="close">閉じる</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      // イベントリスナー
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
          restoreEditorFocus();
        }
      });

      modal.querySelector('[data-action="close"]').addEventListener('click', () => {
        modal.classList.remove('active');
        restoreEditorFocus();
      });

      // 各ボタンのイベントリスナー
      modal.querySelector('[data-action="insert"]').addEventListener('click', async () => {
        const content = modal.querySelector('.ai-result-content').textContent;
        const originalPrompt = modal.dataset.originalPrompt || '';
        const actionType = detectAIActionType(originalPrompt);
        const processedContent = processAIResponse(content, actionType);
        await insertProcessedAIContent(processedContent); // 処理済みコンテンツ専用関数
        modal.classList.remove('active');
        restoreEditorFocus();
      });

      modal.querySelector('[data-action="append"]').addEventListener('click', async () => {
        const content = modal.querySelector('.ai-result-content').textContent;
        const originalPrompt = modal.dataset.originalPrompt || '';
        const actionType = detectAIActionType(originalPrompt);
        const processedContent = processAIResponse(content, actionType);
        await appendProcessedAIContent(processedContent); // 処理済みコンテンツ専用関数
        modal.classList.remove('active');
        restoreEditorFocus();
      });

      modal.querySelector('[data-action="copy"]').addEventListener('click', async () => {
        const content = modal.querySelector('.ai-result-content').textContent;
        const btn = modal.querySelector('[data-action="copy"]');
        const originalText = btn.textContent;
        
        try {
          if (window.electronAPI && window.electronAPI.clipboard) {
            const result = await window.electronAPI.clipboard.writeText(content);
            if (result.success) {
              btn.textContent = 'コピーしました！';
            } else {
              throw new Error(result.error || 'Electron clipboard API failed');
            }
          } else {
            modal.focus();
            await navigator.clipboard.writeText(content);
            btn.textContent = 'コピーしました！';
          }
          
          setTimeout(() => {
            btn.textContent = originalText;
          }, 2000);
        } catch (e) {
          console.error('Failed to copy:', e);
          
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

      modal.querySelector('[data-action="rerun"]').addEventListener('click', () => {
        modal.classList.remove('active');
        // 同じ処理を再実行
        if (modal.currentFunction && modal.currentOriginalText) {
          if (window.processAIRequest) {
            const prompt = window.getAIPrompt ? window.getAIPrompt(modal.currentFunction, modal.currentOriginalText, modal.currentOption) : '';
            if (window.showMessage) {
              window.showMessage('AI処理を再実行しています...', 'info');
            }
            window.processAIRequest(prompt, modal.currentOriginalText, modal.currentFunction, modal.currentOption);
          }
        }
      });

      const contentDiv = modal.querySelector('.ai-result-content');
      contentDiv.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const selection = window.getSelection().toString();
        if (selection) {
          navigator.clipboard.writeText(selection);
        }
      });
    }

    // モーダルの内容を更新
    const title = modal.querySelector('.ai-result-title');
    title.textContent = provider === 'claude' ? 'Claude AI の回答' : 'Gemini AI の回答';
    
    // 長文対応：innerHTMLで改行を<br>に変換して表示
    const contentDiv = modal.querySelector('.ai-result-content');
    // テキストをHTMLエスケープしてから改行を<br>に変換
    const escapedText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/\n/g, '<br>');
    contentDiv.innerHTML = escapedText;
    
    // 再実行用のデータを保存
    modal.currentFunction = functionType;
    modal.currentOriginalText = originalText;
    modal.currentOption = option;
    
    // プロンプト情報をdata属性に保存（処理タイプ判定用）
    const prompt = window.getAIPrompt ? window.getAIPrompt(functionType, originalText, option) : functionType;
    modal.dataset.originalPrompt = prompt || functionType || '';
    
    modal.classList.add('active');
  }

  // WYSIWYG画面のカーソル位置をソース画面の文字位置に変換する関数
  function convertWysiwygPositionToSourcePosition(wysiwygPosition) {
    try {
      if (!window.editor || !window.editor.state) {
        return 0;
      }

      // WYSIWYG画面の内容をHTML形式で取得
      const htmlContent = window.editor.getHTML();
      
      // wysiwygPositionまでのコンテンツを取得
      const docSlice = window.editor.state.doc.cut(0, wysiwygPosition);
      let partialHtml = '';
      
      // TipTapの内部構造からHTMLを生成
      if (docSlice && docSlice.content) {
        // ドキュメントの一部をHTMLに変換
        const tempDiv = document.createElement('div');
        
        // 簡易的な変換: TipTapのノードをHTMLに変換
        try {
          // ProseMirrorの内容を直接HTMLに変換する方法
          const serializer = window.editor.view.state.schema.getSerializer ? 
                            window.editor.view.state.schema.getSerializer() : null;
          
          if (serializer) {
            partialHtml = serializer.serializeFragment(docSlice.content);
          } else {
            // フォールバック: 全体HTMLから推測
            const totalLength = window.editor.state.doc.content.size;
            const ratio = wysiwygPosition / totalLength;
            partialHtml = htmlContent.substring(0, Math.floor(htmlContent.length * ratio));
          }
        } catch (e) {
          // より簡易的なフォールバック
          const totalLength = window.editor.state.doc.content.size;
          const ratio = wysiwygPosition / totalLength;
          partialHtml = htmlContent.substring(0, Math.floor(htmlContent.length * ratio));
        }
      }
      
      // HTMLをプレーンテキスト長に変換して、ソース位置を概算
      return partialHtml.length;
      
    } catch (error) {
      console.error('Failed to convert WYSIWYG position to source position:', error);
      return 0;
    }
  }

  // 改善されたソースエディター検索機能
  function findSourceEditor() {
    // より広範囲なセレクターで探す
    const selectors = [
      // 従来のセレクター
      'textarea[data-source-editor]', 'textarea.source-editor', 'textarea#source-content',
      // 拡張セレクター
      'textarea[data-mode="source"]', 'textarea[class*="source"]', 'textarea[id*="source"]',
      '.source-editor textarea', '.source-view textarea', '.editor-source textarea',
      '.source-panel textarea', '.code-editor textarea', '.raw-editor textarea',
      // contenteditable要素
      '[contenteditable="true"][data-source]', '[contenteditable="true"][class*="source"]',
      '[contenteditable="true"][data-mode="source"]',
      // 特殊エディター
      '.monaco-editor textarea', '.CodeMirror textarea', '.ace_editor textarea',
      '.cm-editor textarea', '.codemirror textarea',
      // 汎用パターン
      'textarea[placeholder*="source"]', 'textarea[placeholder*="HTML"]', 'textarea[placeholder*="code"]',
      // SightEdit特有（推測）
      'textarea.editor', 'textarea#editor', '.editor textarea',
      '#sourceEditor', '#source-editor', '#htmlEditor', '#raw-editor'
    ];
    
    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (element && (element.tagName === 'TEXTAREA' || element.contentEditable === 'true')) {
          return element;
        }
      } catch (e) {
        // セレクターエラーを無視して続行
        continue;
      }
    }
    
    // フォールバック: すべてのtextareaから推測
    const allTextareas = document.querySelectorAll('textarea');
    if (allTextareas.length > 0) {
      // 最後のtextarea（通常ソースエディターが後に配置される）
      return allTextareas[allTextareas.length - 1];
    }
    
    // 最終フォールバック: contenteditable要素
    const editableElements = document.querySelectorAll('[contenteditable="true"]');
    if (editableElements.length > 0) {
      return editableElements[editableElements.length - 1];
    }
    
    return null;
  }

  // エディタータイプ検出機能
  function detectEditorType() {
    // Monaco Editor
    if (window.monaco || document.querySelector('.monaco-editor')) {
      return 'monaco';
    }
    // CodeMirror v6
    if (window.CodeMirror || document.querySelector('.cm-editor')) {
      return 'codemirror6';
    }
    // CodeMirror v5
    if (document.querySelector('.CodeMirror')) {
      return 'codemirror5';
    }
    // Ace Editor
    if (window.ace || document.querySelector('.ace_editor')) {
      return 'ace';
    }
    // TinyMCE
    if (window.tinymce) {
      return 'tinymce';
    }
    // Quill
    if (window.Quill || document.querySelector('.ql-editor')) {
      return 'quill';
    }
    return 'textarea';
  }

  // デバッグ機能：エディター検出状況をログ出力
  function debugEditorDetection() {
    if (window.debugMode || localStorage.getItem('ai_debug') === 'true') {
      console.log('=== Source Editor Detection Debug ===');
      
      // エディタータイプ検出
      const editorType = detectEditorType();
      console.log('Detected editor type:', editorType);
      
      // ソースエディター検索結果
      const sourceEditor = findSourceEditor();
      console.log('Found source editor:', sourceEditor);
      
      if (sourceEditor) {
        console.log('Source editor details:', {
          tagName: sourceEditor.tagName,
          id: sourceEditor.id,
          className: sourceEditor.className,
          contentEditable: sourceEditor.contentEditable,
          placeholder: sourceEditor.placeholder,
          value: sourceEditor.value ? sourceEditor.value.substring(0, 100) + '...' : 'N/A'
        });
      }
      
      // 利用可能な全てのtextarea要素
      const allTextareas = document.querySelectorAll('textarea');
      console.log('All textareas found:', allTextareas.length);
      allTextareas.forEach((textarea, index) => {
        console.log(`Textarea ${index}:`, {
          id: textarea.id,
          className: textarea.className,
          placeholder: textarea.placeholder
        });
      });
      
      // 利用可能な全てのcontenteditable要素
      const editableElements = document.querySelectorAll('[contenteditable="true"]');
      console.log('All contenteditable elements found:', editableElements.length);
      editableElements.forEach((element, index) => {
        console.log(`Editable ${index}:`, {
          tagName: element.tagName,
          id: element.id,
          className: element.className
        });
      });
      
      console.log('======================================');
    }
  }

  // 待機機能付き要素検索
  async function waitForSourceEditor(timeout = 5000) {
    const startTime = Date.now();
    let lastAttempt = 0;
    
    while (Date.now() - startTime < timeout) {
      const editor = findSourceEditor();
      if (editor) {
        if (window.debugMode || localStorage.getItem('ai_debug') === 'true') {
          console.log(`Source editor found after ${Date.now() - startTime}ms`);
        }
        return editor;
      }
      
      // デバッグ：1秒おきに検索状況をログ出力
      if (Date.now() - lastAttempt > 1000 && (window.debugMode || localStorage.getItem('ai_debug') === 'true')) {
        console.log(`Still searching for source editor... (${Math.floor((Date.now() - startTime) / 1000)}s elapsed)`);
        lastAttempt = Date.now();
      }
      
      // 100ms待機
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (window.debugMode || localStorage.getItem('ai_debug') === 'true') {
      console.log(`Source editor not found after ${timeout}ms timeout`);
    }
    return null;
  }

  // DOM変更監視付きエディター検索
  function waitForSourceEditorWithObserver(timeout = 5000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      // 最初の検索
      const initialEditor = findSourceEditor();
      if (initialEditor) {
        resolve(initialEditor);
        return;
      }
      
      // DOM変更監視
      const observer = new MutationObserver(() => {
        if (Date.now() - startTime > timeout) {
          observer.disconnect();
          resolve(null);
          return;
        }
        
        const editor = findSourceEditor();
        if (editor) {
          observer.disconnect();
          if (window.debugMode || localStorage.getItem('ai_debug') === 'true') {
            console.log(`Source editor found via mutation observer after ${Date.now() - startTime}ms`);
          }
          resolve(editor);
        }
      });
      
      // DOM全体を監視
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['id', 'class', 'data-mode', 'contenteditable']
      });
      
      // タイムアウト処理
      setTimeout(() => {
        observer.disconnect();
        if (window.debugMode || localStorage.getItem('ai_debug') === 'true') {
          console.log(`Source editor not found with observer after ${timeout}ms timeout`);
        }
        resolve(null);
      }, timeout);
    });
  }

  // エディター特化型テキスト挿入機能
  function insertToSpecificEditor(editor, text, position = null) {
    try {
      const editorType = detectEditorType();
      
      if (window.debugMode || localStorage.getItem('ai_debug') === 'true') {
        console.log(`Attempting to insert text to ${editorType} editor:`, {
          element: editor,
          textLength: text.length,
          position: position
        });
      }
      
      // Monaco Editor
      if (editorType === 'monaco' && window.monaco) {
        // Monaco Editorは特殊な処理が必要
        const monacoEditor = window.monaco.editor.getModels()[0];
        if (monacoEditor) {
          const currentValue = monacoEditor.getValue();
          const insertPos = position || currentValue.length;
          const newValue = currentValue.slice(0, insertPos) + '\n' + text + currentValue.slice(insertPos);
          monacoEditor.setValue(newValue);
          return true;
        }
      }
      
      // CodeMirror v6
      if (editorType === 'codemirror6') {
        // CodeMirror v6の処理
        if (editor.cmView && editor.cmView.dispatch) {
          const doc = editor.cmView.state.doc;
          const insertPos = position || doc.length;
          editor.cmView.dispatch({
            changes: { from: insertPos, insert: '\n' + text }
          });
          return true;
        }
      }
      
      // CodeMirror v5
      if (editorType === 'codemirror5') {
        const cm = editor.CodeMirror;
        if (cm) {
          const doc = cm.getDoc();
          const cursor = position ? doc.posFromIndex(position) : doc.getCursor();
          doc.replaceRange('\n' + text, cursor);
          return true;
        }
      }
      
      // 標準的なtextarea/contenteditable要素
      if (editor.tagName === 'TEXTAREA') {
        const currentValue = editor.value || '';
        const insertPos = position !== null ? position : 
                          (editor.selectionStart !== undefined ? editor.selectionStart : currentValue.length);
        
        const beforeText = currentValue.substring(0, insertPos);
        const afterText = currentValue.substring(insertPos);
        editor.value = beforeText + '\n' + text + afterText;
        
        // カーソル位置を更新
        const newPosition = insertPos + text.length + 1;
        editor.selectionStart = editor.selectionEnd = newPosition;
        
        // イベント発火
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        editor.dispatchEvent(new Event('change', { bubbles: true }));
        
        return true;
      }
      
      // contenteditable要素
      if (editor.contentEditable === 'true') {
        const currentText = editor.textContent || '';
        const insertPos = position !== null ? position : currentText.length;
        
        const beforeText = currentText.substring(0, insertPos);
        const afterText = currentText.substring(insertPos);
        editor.textContent = beforeText + '\n' + text + afterText;
        
        // イベント発火
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        editor.dispatchEvent(new Event('change', { bubbles: true }));
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error inserting to specific editor:', error);
      return false;
    }
  }

  // クリップボード経由でのテキスト挿入
  async function insertViaClipboard(text) {
    try {
      // 現在のクリップボード内容を保存
      let originalClipboard = '';
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          originalClipboard = await navigator.clipboard.readText();
        }
      } catch (e) {
        // クリップボード読み取り失敗は無視
      }
      
      // テキストをクリップボードに設定
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        
        // フォーカスされた要素にCtrl+Vイベントを送信
        const focusedElement = document.activeElement;
        if (focusedElement && (focusedElement.tagName === 'TEXTAREA' || focusedElement.contentEditable === 'true')) {
          const pasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: new DataTransfer()
          });
          pasteEvent.clipboardData.setData('text/plain', text);
          
          focusedElement.dispatchEvent(pasteEvent);
          
          // 元のクリップボード内容を復元
          if (originalClipboard) {
            setTimeout(() => {
              navigator.clipboard.writeText(originalClipboard).catch(() => {});
            }, 100);
          }
          
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error inserting via clipboard:', error);
      return false;
    }
  }

  // キーボードイベント経由でのテキスト挿入
  function insertViaKeyboardEvent(text) {
    try {
      const focusedElement = document.activeElement;
      if (!focusedElement || (focusedElement.tagName !== 'TEXTAREA' && focusedElement.contentEditable !== 'true')) {
        return false;
      }
      
      // 文字を一つずつ入力イベントとして送信
      for (let char of text) {
        const inputEvent = new InputEvent('input', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: char
        });
        
        focusedElement.dispatchEvent(inputEvent);
        
        // textareaの場合、値を直接更新
        if (focusedElement.tagName === 'TEXTAREA') {
          const start = focusedElement.selectionStart || 0;
          const value = focusedElement.value || '';
          focusedElement.value = value.slice(0, start) + char + value.slice(start);
          focusedElement.selectionStart = focusedElement.selectionEnd = start + 1;
        }
      }
      
      // 改行を追加
      const enterEvent = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'Enter',
        code: 'Enter'
      });
      focusedElement.dispatchEvent(enterEvent);
      
      return true;
    } catch (error) {
      console.error('Error inserting via keyboard event:', error);
      return false;
    }
  }

  // 統合フォールバック挿入機能
  async function insertToSourceWithFallback(text, position = null) {
    if (window.debugMode || localStorage.getItem('ai_debug') === 'true') {
      console.log('=== Starting Source Insert with Fallback ===');
      debugEditorDetection();
    }
    
    try {
      // 1. 直接的なエディター検索
      let sourceEditor = findSourceEditor();
      if (sourceEditor && insertToSpecificEditor(sourceEditor, text, position)) {
        if (window.debugMode || localStorage.getItem('ai_debug') === 'true') {
          console.log('✓ Successfully inserted via direct editor search');
        }
        return true;
      }
      
      // 2. 待機機能付きエディター検索
      if (window.debugMode || localStorage.getItem('ai_debug') === 'true') {
        console.log('Direct search failed, trying with wait...');
      }
      sourceEditor = await waitForSourceEditor(3000);
      if (sourceEditor && insertToSpecificEditor(sourceEditor, text, position)) {
        if (window.debugMode || localStorage.getItem('ai_debug') === 'true') {
          console.log('✓ Successfully inserted via wait function');
        }
        return true;
      }
      
      // 3. DOM変更監視付きエディター検索
      if (window.debugMode || localStorage.getItem('ai_debug') === 'true') {
        console.log('Wait function failed, trying with observer...');
      }
      sourceEditor = await waitForSourceEditorWithObserver(3000);
      if (sourceEditor && insertToSpecificEditor(sourceEditor, text, position)) {
        if (window.debugMode || localStorage.getItem('ai_debug') === 'true') {
          console.log('✓ Successfully inserted via observer');
        }
        return true;
      }
      
      // 4. クリップボード経由
      if (window.debugMode || localStorage.getItem('ai_debug') === 'true') {
        console.log('Observer failed, trying clipboard method...');
      }
      if (await insertViaClipboard(text)) {
        if (window.debugMode || localStorage.getItem('ai_debug') === 'true') {
          console.log('✓ Successfully inserted via clipboard');
        }
        return true;
      }
      
      // 5. キーボードイベント経由
      if (window.debugMode || localStorage.getItem('ai_debug') === 'true') {
        console.log('Clipboard failed, trying keyboard events...');
      }
      if (insertViaKeyboardEvent(text)) {
        if (window.debugMode || localStorage.getItem('ai_debug') === 'true') {
          console.log('✓ Successfully inserted via keyboard events');
        }
        return true;
      }
      
      // 6. 全て失敗
      if (window.debugMode || localStorage.getItem('ai_debug') === 'true') {
        console.log('✗ All insertion methods failed');
      }
      return false;
      
    } finally {
      if (window.debugMode || localStorage.getItem('ai_debug') === 'true') {
        console.log('=== Source Insert with Fallback Complete ===');
      }
    }
  }

  // ソース画面のカーソル位置をWYSIWYG画面の位置に変換する関数
  function convertSourcePositionToWysiwygPosition(sourcePosition) {
    try {
      if (!window.editor || !window.editor.state) {
        return 0;
      }

      // ソース画面の内容を取得
      const sourceTextarea = document.querySelector('textarea[data-source-editor], textarea.source-editor, textarea#source-content');
      if (!sourceTextarea) {
        return 0;
      }

      const sourceContent = sourceTextarea.value;
      const targetText = sourceContent.substring(0, sourcePosition);
      
      // HTMLをパースしてテキスト長を計算
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = targetText;
      const plainTextLength = tempDiv.textContent.length;
      
      // WYSIWYG画面での対応位置を概算
      const totalSourceLength = sourceContent.length;
      const totalWysiwygLength = window.editor.state.doc.content.size;
      
      if (totalSourceLength === 0) return 0;
      
      const ratio = plainTextLength / tempDiv.textContent.length || 0;
      return Math.min(Math.floor(totalWysiwygLength * ratio), totalWysiwygLength);
      
    } catch (error) {
      console.error('Failed to convert source position to WYSIWYG position:', error);
      return 0;
    }
  }

  // リッチテキスト形式の変換関数
  function convertToRichText(text) {
    if (!text) return text;
    
    // Markdown形式をHTMLに変換
    let richText = text
      // 見出し
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // 太字
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.*?)__/g, '<strong>$1</strong>')
      // 斜体
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      // コードブロック（複数行）
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      // インラインコード
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // リスト項目
      .replace(/^[\s]*[-*+] (.+$)/gim, '<li>$1</li>')
      // 番号付きリスト
      .replace(/^[\s]*\d+\. (.+$)/gim, '<li>$1</li>')
      // 改行を<br>に変換（ただし、HTMLタグの直後は除く）
      .replace(/\n(?![<\/])/g, '<br>');
    
    // リスト項目をグループ化して<ul>で囲む
    richText = richText.replace(/(<li>.*?<\/li>(?:\s*<li>.*?<\/li>)*)/gs, (match) => {
      if (!match.includes('<ol>') && !match.includes('<ul>')) {
        return '<ul>' + match + '</ul>';
      }
      return match;
    });
    
    return richText;
  }

  // カーソル位置以降のソースに挿入する関数（改善版フォールバック対応）
  async function insertTextAtCursor(text, asRichText = true) {
    try {
      const contentToAdd = asRichText ? convertToRichText(text) : text;
      
      // WYSIWYGエディターのカーソル位置を取得してソース位置に変換
      let insertPosition = null;
      if (window.editor && window.editor.state && window.editor.view) {
        const { selection } = window.editor.state;
        const wysiwygPosition = selection.to || 0;
        insertPosition = convertWysiwygPositionToSourcePosition(wysiwygPosition);
      }
      
      // 新しいフォールバック機能を使用してテキストを挿入
      const success = await insertToSourceWithFallback(contentToAdd, insertPosition);
      
      if (success) {
        // WYSIWYGエディターを更新
        if (window.editor && window.editor.commands) {
          setTimeout(async () => {
            try {
              // ソース内容を取得して更新
              const sourceEditor = findSourceEditor() || await waitForSourceEditor(1000);
              if (sourceEditor) {
                const sourceContent = sourceEditor.value || sourceEditor.textContent;
                window.editor.commands.setContent(sourceContent, false);
                window.editor.view.updateState(window.editor.state);
                
                setTimeout(() => {
                  window.editor.commands.focus('end');
                }, 50);
              }
            } catch (error) {
              console.error('Failed to update WYSIWYG after insert:', error);
            }
          }, 100);
        }
        
        return true;
      }
      
      // ソースエディターが見つからない場合は、最初のtextareaを使用
      const firstTextarea = document.querySelector('textarea');
      if (firstTextarea) {
        const start = firstTextarea.selectionStart || 0;
        const currentValue = firstTextarea.value;
        const contentToAdd = asRichText ? convertToRichText(text) : text;
        
        const beforeText = currentValue.substring(0, start);
        const afterText = currentValue.substring(start);
        firstTextarea.value = beforeText + '\n' + contentToAdd + afterText;
        
        const newPosition = start + contentToAdd.length + 1;
        firstTextarea.selectionStart = firstTextarea.selectionEnd = newPosition;
        firstTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        firstTextarea.dispatchEvent(new Event('change', { bubbles: true }));
        
        // ソース内容をWYSIWYGエディターに反映
        if (window.editor && window.editor.commands) {
          setTimeout(() => {
            window.editor.commands.setContent(firstTextarea.value, false);
            setTimeout(() => {
              window.editor.commands.focus('end');
            }, 50);
          }, 100);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to insert text:', error);
      return false;
    }
  }

  // 選択テキスト置換機能（リッチテキスト対応 + 双方向同期）
  function replaceSelectedText(text, asRichText = true) {
    try {
      if (window.editor && window.editor.state && window.editor.view) {
        // TipTap エディター（WYSIWYG）
        const { from, to } = window.editor.state.selection;
        if (from !== to) {
          if (asRichText) {
            // リッチテキスト形式で置換
            const richText = convertToRichText(text);
            window.editor.chain().focus().deleteSelection().insertContent(richText).run();
          } else {
            // プレーンテキストで置換
            window.editor.chain().focus().deleteSelection().insertContent(text).run();
          }
          
          // ソース画面にも同期
          syncToSourceEditor();
          return true;
        }
      }
      
      // ソースエディター（textarea）
      const activeElement = document.activeElement;
      if (activeElement && activeElement.tagName === 'TEXTAREA') {
        const start = activeElement.selectionStart;
        const end = activeElement.selectionEnd;
        const value = activeElement.value;
        activeElement.value = value.substring(0, start) + text + value.substring(end);
        activeElement.selectionStart = activeElement.selectionEnd = start + text.length;
        
        // WYSIWYG画面にも同期
        syncToWysiwygEditor();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to replace text:', error);
      return false;
    }
  }

  // 選択テキストを取得（書式情報も含む）
  function getSelectedText() {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      return selection.toString();
    }
    
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT')) {
      const start = activeElement.selectionStart;
      const end = activeElement.selectionEnd;
      return activeElement.value.substring(start, end);
    }
    
    return '';
  }

  // 選択範囲の書式付きHTMLを取得
  function getSelectedHTML() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return null;
    
    try {
      // TipTapエディターの場合
      if (window.editor && window.editor.state && window.editor.view) {
        const { from, to } = window.editor.state.selection;
        if (from !== to) {
          // 選択範囲のHTMLを取得
          const selectedNode = window.editor.state.doc.cut(from, to);
          const serializer = window.editor.schema.serializers?.toDOM || window.editor.schema.serializer;
          
          if (serializer) {
            const dom = serializer.serializeFragment(selectedNode.content);
            const div = document.createElement('div');
            div.appendChild(dom);
            return div.innerHTML;
          }
        }
      }
      
      // 通常のブラウザ選択の場合
      const range = selection.getRangeAt(0);
      const clonedSelection = range.cloneContents();
      const div = document.createElement('div');
      div.appendChild(clonedSelection);
      return div.innerHTML;
    } catch (error) {
      console.warn('Failed to get HTML selection:', error);
      return null;
    }
  }

  // 選択テキストの書式情報を分析
  function analyzeTextFormatting() {
    try {
      // TipTapエディターの場合
      if (window.editor && window.editor.state && window.editor.view) {
        const { from, to } = window.editor.state.selection;
        if (from !== to) {
          const selectedNode = window.editor.state.doc.cut(from, to);
          const formatting = {
            hasFormatting: false,
            elements: []
          };
          
          // ノード構造を解析
          selectedNode.content.forEach(node => {
            if (node.type.name !== 'text') {
              formatting.hasFormatting = true;
              formatting.elements.push(node.type.name);
            }
            if (node.marks && node.marks.length > 0) {
              formatting.hasFormatting = true;
              node.marks.forEach(mark => {
                formatting.elements.push(mark.type.name);
              });
            }
          });
          
          return formatting;
        }
      }
      
      // 通常の選択の場合
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        
        // 親要素をチェック
        let element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
        const formatting = {
          hasFormatting: false,
          elements: []
        };
        
        while (element && element !== document.body) {
          const tagName = element.tagName?.toLowerCase();
          if (tagName && ['strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'div'].includes(tagName)) {
            formatting.hasFormatting = true;
            formatting.elements.push(tagName);
          }
          element = element.parentElement;
        }
        
        return formatting;
      }
    } catch (error) {
      console.warn('Failed to analyze formatting:', error);
    }
    
    return { hasFormatting: false, elements: [] };
  }

  // WYSIWYG → ソース画面の同期関数
  function syncToSourceEditor() {
    try {
      if (window.editor && window.editor.getHTML) {
        const htmlContent = window.editor.getHTML();
        
        // ソーステキストエリアを検索
        const sourceTextarea = document.querySelector('textarea[data-source-editor], textarea.source-editor, textarea#source-content');
        
        if (sourceTextarea) {
          sourceTextarea.value = htmlContent;
          
          // 変更イベントを発火
          sourceTextarea.dispatchEvent(new Event('input', { bubbles: true }));
          sourceTextarea.dispatchEvent(new Event('change', { bubbles: true }));
          
        } else {
          // 他のソースエディターパターンを試す
          const potentialSources = document.querySelectorAll('textarea');
          for (let textarea of potentialSources) {
            if (textarea.classList.contains('source') || 
                textarea.id.includes('source') || 
                textarea.getAttribute('data-mode') === 'source') {
              textarea.value = htmlContent;
              textarea.dispatchEvent(new Event('input', { bubbles: true }));
              textarea.dispatchEvent(new Event('change', { bubbles: true }));
              break;
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to sync to source editor:', error);
    }
  }
  
  // ソース → WYSIWYG画面の同期関数
  function syncToWysiwygEditor() {
    try {
      const activeElement = document.activeElement;
      if (activeElement && activeElement.tagName === 'TEXTAREA' && window.editor && window.editor.commands) {
        const htmlContent = activeElement.value;
        
        // WYSIWYGエディターの内容を更新
        window.editor.commands.setContent(htmlContent);
        
      }
    } catch (error) {
      console.warn('Failed to sync to WYSIWYG editor:', error);
    }
  }

  // コンテンツがHTMLかMarkdownかを判定する関数
  function isHTMLContent(content) {
    // HTMLタグの存在をチェック
    const htmlTagRegex = /<\/?[a-z][\s\S]*>/i;
    return htmlTagRegex.test(content.trim());
  }

  // HTMLコンテンツをクリーンアップする関数
  function cleanHTMLContent(htmlContent) {
    // 危険なタグやスクリプトを除去
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    // script, style タグを削除
    const dangerousTags = tempDiv.querySelectorAll('script, style');
    dangerousTags.forEach(tag => tag.remove());
    
    return tempDiv.innerHTML;
  }

  // AI回答から不要な定型句を除去し、適切なヘッダーを追加する関数
  function processAIResponse(aiContent, actionType = 'unknown') {
    console.log('Original AI content:', aiContent);
    
    // より安全で精密な前処理
    let cleanContent = aiContent;

    // 段階的に不要な部分を除去
    const cleanupSteps = [
      // Step 1: 「はい、承知いたしました」から始まる前置き文を完全に除去
      /^はい、承知いたしました。.*?(?=\n[^\n]|\n*$)/gs,
      
      // Step 2: 処理結果マーカーとコードブロック記法を除去
      /---\*\*\*?\*?処理結果\*?\*?\*?---/g,
      /---###\s*\*\*処理結果\*\*/g,
      /`html/g,
      /```html\s*/g,
      /```\s*/g,
      /^---\s*/gm,
      
      // Step 3: 添付ファイル関連の前置き
      /^添付されたファイルの内容に基づき[^\n]*\n*/gm,
      /^処理を実行します[^\n]*\n*/gm,
      
      // Step 4: 区切り文字の除去
      /^\*\*\*\s*/gm,
      /^---\s*/gm
    ];

    // 段階的にクリーンアップ
    cleanupSteps.forEach((pattern, index) => {
      const beforeCleanup = cleanContent;
      cleanContent = cleanContent.replace(pattern, '');
      console.log(`Step ${index + 1} cleanup:`, beforeCleanup !== cleanContent ? 'applied' : 'no change');
    });

    // 先頭と末尾の空白・改行を整理
    cleanContent = cleanContent.trim();
    
    // 連続する改行を整理（最大2つまで）
    cleanContent = cleanContent.replace(/\n{3,}/g, '\n\n');

    console.log('Cleaned content:', cleanContent);

    // 空のコンテンツまたは過剰に削除された場合の安全策
    if (cleanContent.length === 0 || cleanContent.length < aiContent.length * 0.1) {
      console.warn('Content was over-cleaned, using fallback approach');
      // より安全なフォールバック：HTMLタグを含む実際のコンテンツを探す
      const htmlMatch = aiContent.match(/<[^>]+>.*<\/[^>]+>/s);
      if (htmlMatch) {
        cleanContent = htmlMatch[0];
      } else {
        // 最後の手段：元のコンテンツの後半部分を使用
        const lines = aiContent.split('\n');
        const contentStart = lines.findIndex(line => 
          line.includes('<') || line.trim().length > 50
        );
        if (contentStart >= 0) {
          cleanContent = lines.slice(contentStart).join('\n');
        } else {
          cleanContent = aiContent;
        }
      }
    }

    // 処理内容に応じたヘッダーを生成
    const actionHeaders = {
      translate: '翻訳',
      summarize: '要約', 
      proofread: '校正',
      improve: '改善',
      generate: '生成',
      analyze: '分析',
      explain: '説明',
      unknown: '処理'
    };

    const headerText = actionHeaders[actionType] || actionHeaders.unknown;
    const header = `# AIによる${headerText}\n\n`;

    const result = header + cleanContent;
    console.log('Final processed content:', result);
    return result;
  }

  // AI処理タイプを判定する関数
  function detectAIActionType(originalPrompt = '') {
    const prompt = originalPrompt.toLowerCase();
    
    if (prompt.includes('翻訳') || prompt.includes('translate')) return 'translate';
    if (prompt.includes('要約') || prompt.includes('summarize')) return 'summarize';
    if (prompt.includes('校正') || prompt.includes('proofread')) return 'proofread';
    if (prompt.includes('改善') || prompt.includes('improve')) return 'improve';
    if (prompt.includes('生成') || prompt.includes('generate')) return 'generate';
    if (prompt.includes('分析') || prompt.includes('analyze')) return 'analyze';
    if (prompt.includes('説明') || prompt.includes('explain')) return 'explain';
    
    return 'unknown';
  }

  // 処理済みAIコンテンツをカーソル位置に挿入する関数
  async function insertProcessedAIContent(processedContent) {
    console.log('insertProcessedAIContent called with:', processedContent);
    
    const currentMode = window.currentMode || window.getCurrentMode?.() || 'wysiwyg';
    console.log('Current editor mode:', currentMode);
    
    try {
      if (currentMode === 'source') {
        // ソースモードの場合、選択テキストの直後に挿入
        await insertTextAfterSelection(processedContent, false);
      } else {
        // WYSIWYGモードの場合、選択テキストの直後にHTMLとして挿入
        if (window.editor) {
          const { from, to } = window.editor.state.selection;
          console.log('Selection range:', from, to);
          
          // 選択範囲がある場合は、その直後に移動してから挿入
          if (from !== to) {
            // 選択テキストは保持し、選択範囲の終端に移動
            window.editor.chain().focus().setTextSelection(to).run();
          }
          
          // 改行を追加
          window.editor.chain().insertContent('<p></p>').run();
          
          if (window.markdownToHtml) {
            const htmlContent = window.markdownToHtml(processedContent);
            console.log('Converted HTML content:', htmlContent);
            
            // HTMLコンテンツを挿入
            window.editor.chain().insertContent(htmlContent).run();
          } else {
            // フォールバック: 基本的なMarkdown → HTML変換
            let htmlContent = processedContent
              .replace(/^# (.+)$/gm, '<h1>$1</h1>')
              .replace(/^## (.+)$/gm, '<h2>$1</h2>')
              .replace(/^### (.+)$/gm, '<h3>$1</h3>')
              .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
              .replace(/\*(.+?)\*/g, '<em>$1</em>')
              .replace(/\n\n/g, '</p><p>')
              .replace(/\n/g, '<br>');
            
            // 段落で囲む
            if (!htmlContent.startsWith('<h') && !htmlContent.startsWith('<p>')) {
              htmlContent = '<p>' + htmlContent;
            }
            if (!htmlContent.endsWith('</p>') && !htmlContent.endsWith('</h1>') && !htmlContent.endsWith('</h2>') && !htmlContent.endsWith('</h3>')) {
              htmlContent += '</p>';
            }
            
            console.log('Fallback HTML content:', htmlContent);
            window.editor.chain().insertContent(htmlContent).run();
          }
        }
      }
      
      window.showMessage('AI回答を挿入しました', 'success');
    } catch (error) {
      console.error('Failed to insert processed content:', error);
      window.showMessage('AI回答の挿入に失敗しました', 'error');
    }
  }

  // 選択テキストの直後に内容を挿入する関数（ソースモード用）
  async function insertTextAfterSelection(content, asRichText = false) {
    try {
      // ソースエディターを取得
      const sourceEditor = findSourceEditor() || await waitForSourceEditor(1000);
      if (!sourceEditor) {
        console.warn('Source editor not found');
        return false;
      }

      const { selectionStart, selectionEnd } = sourceEditor;
      const currentContent = sourceEditor.value;
      
      console.log('Selection:', selectionStart, selectionEnd);
      
      // 選択範囲の直後に改行とコンテンツを挿入
      const beforeSelection = currentContent.substring(0, selectionEnd);
      const afterSelection = currentContent.substring(selectionEnd);
      
      const insertText = '\n\n' + content;
      const newContent = beforeSelection + insertText + afterSelection;
      
      // テキストエリアの内容を更新
      sourceEditor.value = newContent;
      
      // カーソルを挿入されたテキストの末尾に移動
      const newCursorPos = selectionEnd + insertText.length;
      sourceEditor.selectionStart = newCursorPos;
      sourceEditor.selectionEnd = newCursorPos;
      
      // 変更イベントを発火
      sourceEditor.dispatchEvent(new Event('input', { bubbles: true }));
      sourceEditor.dispatchEvent(new Event('change', { bubbles: true }));
      
      return true;
    } catch (error) {
      console.error('Failed to insert text after selection:', error);
      return false;
    }
  }

  // 処理済みAIコンテンツを文書末尾に追加する関数
  async function appendProcessedAIContent(processedContent) {
    console.log('appendProcessedAIContent called with:', processedContent);
    
    const currentMode = window.currentMode || window.getCurrentMode?.() || 'wysiwyg';
    console.log('Current editor mode for append:', currentMode);
    
    try {
      if (currentMode === 'source') {
        // ソースモードの場合、Markdownとしてそのまま追加
        await appendToDocument(processedContent, false);
      } else {
        // WYSIWYGモードの場合、MarkdownをHTMLに変換してから追加
        if (window.editor) {
          // 末尾に移動
          window.editor.chain().focus('end').run();
          
          if (window.markdownToHtml) {
            const htmlContent = window.markdownToHtml(processedContent);
            console.log('Converted HTML content for append:', htmlContent);
            
            // 改行を追加してからHTMLコンテンツを挿入
            window.editor.chain()
              .insertContent('<p></p>')  // 改行
              .insertContent(htmlContent)
              .run();
          } else {
            // フォールバック: 基本的なMarkdown → HTML変換
            let htmlContent = processedContent
              .replace(/^# (.+)$/gm, '<h1>$1</h1>')
              .replace(/^## (.+)$/gm, '<h2>$1</h2>')
              .replace(/^### (.+)$/gm, '<h3>$1</h3>')
              .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
              .replace(/\*(.+?)\*/g, '<em>$1</em>')
              .replace(/\n\n/g, '</p><p>')
              .replace(/\n/g, '<br>');
            
            // 段落で囲む
            if (!htmlContent.startsWith('<h') && !htmlContent.startsWith('<p>')) {
              htmlContent = '<p>' + htmlContent;
            }
            if (!htmlContent.endsWith('</p>') && !htmlContent.endsWith('</h1>') && !htmlContent.endsWith('</h2>') && !htmlContent.endsWith('</h3>')) {
              htmlContent += '</p>';
            }
            
            console.log('Fallback HTML content for append:', htmlContent);
            
            window.editor.chain()
              .insertContent('<p></p>')  // 改行
              .insertContent(htmlContent)
              .run();
          }
        }
      }
      
      window.showMessage('AI回答を追加しました', 'success');
    } catch (error) {
      console.error('Failed to append processed content:', error);
      window.showMessage('AI回答の追加に失敗しました', 'error');
    }
  }

  // AI回答をカーソル位置に挿入する関数（モード対応版）
  async function insertAIContentAtCursor(aiContent) {
    const currentMode = window.currentMode || window.getCurrentMode?.() || 'wysiwyg';
    const isHTML = isHTMLContent(aiContent);
    
    if (currentMode === 'source') {
      // ソースモードの場合、HTMLもMarkdownもそのまま挿入
      if (isHTML) {
        // HTMLの場合はMarkdownに変換してから挿入
        if (window.htmlToMarkdown) {
          try {
            const markdownContent = window.htmlToMarkdown(aiContent);
            await insertTextAtCursor(markdownContent, false);
          } catch (error) {
            console.error('Failed to convert HTML to Markdown:', error);
            await insertTextAtCursor(aiContent, false);
          }
        } else {
          await insertTextAtCursor(aiContent, false);
        }
      } else {
        await insertTextAtCursor(aiContent, false);
      }
    } else {
      // WYSIWYGモードの場合、HTML/Markdownを適切に処理
      if (window.editor) {
        try {
          let htmlContent;
          
          if (isHTML) {
            // HTMLの場合はクリーンアップして直接使用
            htmlContent = cleanHTMLContent(aiContent);
          } else if (window.markdownToHtml) {
            // Markdownの場合はHTMLに変換
            htmlContent = window.markdownToHtml(aiContent);
          } else {
            // フォールバック: プレーンテキストとして処理
            htmlContent = aiContent.replace(/\n/g, '<br>');
          }
          
          // TipTapエディターのカーソル位置に挿入
          window.editor.chain()
            .focus()
            .insertContent(htmlContent, {
              parseOptions: {
                preserveWhitespace: false
              }
            })
            .run();
            
          window.showMessage('AI回答を挿入しました', 'success');
        } catch (error) {
          console.error('Failed to insert AI content:', error);
          // フォールバック: プレーンテキストとして挿入
          window.editor.chain()
            .focus()
            .insertContent(aiContent.replace(/</g, '&lt;').replace(/>/g, '&gt;'))
            .run();
          window.showMessage('AI回答を挿入しました（テキスト形式）', 'success');
        }
      } else {
        console.warn('Editor not available');
      }
    }
  }

  // AI回答を文書末尾に追加する関数（モード対応版）
  async function appendAIContentToDocument(aiContent) {
    const currentMode = window.currentMode || window.getCurrentMode?.() || 'wysiwyg';
    const isHTML = isHTMLContent(aiContent);
    
    if (currentMode === 'source') {
      // ソースモードの場合、内容をそのまま追加
      await appendToDocument(aiContent, false);
    } else {
      // WYSIWYGモードの場合
      if (window.editor) {
        try {
          let contentToInsert;
          
          if (isHTML) {
            // HTMLコンテンツの場合、クリーンアップして直接使用
            contentToInsert = cleanHTMLContent(aiContent);
          } else {
            // Markdownコンテンツの場合、HTMLに変換
            if (window.markdownToHtml) {
              contentToInsert = window.markdownToHtml(aiContent);
            } else {
              // フォールバック: プレーンテキストとして扱う
              contentToInsert = aiContent.replace(/\n/g, '<br>');
            }
          }
          
          // TipTapエディターの末尾に追加
          window.editor.chain()
            .focus('end')
            .insertContent('<p></p>') // 改行を追加
            .insertContent(contentToInsert, {
              parseOptions: {
                preserveWhitespace: false
              }
            })
            .run();
            
          window.showMessage('AI回答を追加しました', 'success');
        } catch (error) {
          console.error('Failed to process AI content:', error);
          // フォールバック: プレーンテキストとして追加
          window.editor.chain()
            .focus('end')
            .insertContent('<p></p>')
            .insertContent(aiContent)
            .run();
          window.showMessage('AI回答を追加しました（テキスト形式）', 'success');
        }
      } else {
        console.warn('Editor not available');
      }
    }
  }

  // 文書末尾に追加する関数（改善版フォールバック対応）
  async function appendToDocument(text, asRichText = true) {
    try {
      const contentToAdd = asRichText ? convertToRichText(text) : text;
      
      // 末尾位置を指定（null = 末尾）
      const success = await insertToSourceWithFallback(contentToAdd, null);
      
      if (success) {
        // WYSIWYGエディターを更新
        if (window.editor && window.editor.commands) {
          setTimeout(async () => {
            try {
              // ソース内容を取得して更新
              const sourceEditor = findSourceEditor() || await waitForSourceEditor(1000);
              if (sourceEditor) {
                const sourceContent = sourceEditor.value || sourceEditor.textContent;
                window.editor.commands.setContent(sourceContent, false);
                window.editor.view.updateState(window.editor.state);
                
                setTimeout(() => {
                  window.editor.commands.focus('end');
                }, 50);
              }
            } catch (error) {
              console.error('Failed to update WYSIWYG after append:', error);
            }
          }, 100);
        }
        
        return true;
      }
      
      // ソースエディターが見つからない場合は、最初のtextareaを使用
      const firstTextarea = document.querySelector('textarea');
      if (firstTextarea) {
        const currentValue = firstTextarea.value;
        const separator = currentValue.endsWith('\n') ? '' : '\n';
        const contentToAdd = asRichText ? convertToRichText(text) : text;
        firstTextarea.value = currentValue + separator + contentToAdd;
        
        firstTextarea.selectionStart = firstTextarea.selectionEnd = firstTextarea.value.length;
        firstTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        firstTextarea.dispatchEvent(new Event('change', { bubbles: true }));
        
        // ソース内容をWYSIWYGエディターに反映
        if (window.editor && window.editor.commands) {
          setTimeout(() => {
            window.editor.commands.setContent(firstTextarea.value, false);
            setTimeout(() => {
              window.editor.commands.focus('end');
            }, 50);
          }, 100);
        }
        
        return true;
      }
      
      
      return false;
    } catch (error) {
      console.error('Failed to append to document:', error);
      return false;
    }
  }

  // ソースコンテンツを取得する関数
  function getSourceContent() {
    try {
      // ソーステキストエリアを検索
      const sourceTextarea = document.querySelector('textarea[data-source-editor], textarea.source-editor, textarea#source-content');
      
      if (sourceTextarea) {
        return sourceTextarea.value;
      }
      
      // 他のソースエディターパターンを試す
      const potentialSources = document.querySelectorAll('textarea');
      for (let textarea of potentialSources) {
        if (textarea.classList.contains('source') || 
            textarea.id.includes('source') || 
            textarea.getAttribute('data-mode') === 'source') {
          return textarea.value;
        }
      }
      
      // まだ見つからない場合、最初のテキストエリアを使用
      if (potentialSources.length > 0) {
        return potentialSources[0].value;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get source content:', error);
      return null;
    }
  }

  // ファイル作成関数（書式情報付き）
  function createProcessingFile(prompt, selectedText, type, option, selectedHTML = null, formatting = null) {
    const timestamp = new Date().toISOString();
    const optionText = option ? ` (${option})` : '';
    
    // 書式情報がある場合はHTML形式で処理
    if (selectedHTML && formatting?.hasFormatting) {
      return `# AI処理依頼（書式付きテキスト）

## 処理タイプ
${type}${optionText}

## 命令内容
${prompt}

**重要**: 以下のテキストは書式付きHTML形式です。処理後も同等の書式を保持してHTML形式で回答してください。

## 書式情報
- 検出された要素: ${formatting.elements.join(', ')}
- 書式タグ: ${formatting.hasFormatting ? 'あり' : 'なし'}

## 対象テキスト（HTML形式）
\`\`\`html
${selectedHTML}
\`\`\`

## プレーンテキスト版（参考）
\`\`\`
${selectedText}
\`\`\`

---
処理日時: ${timestamp}
ファイル形式: HTML + Markdown
文字数: ${selectedText.length}文字
HTML長: ${selectedHTML.length}文字
`;
    } else {
      // 通常のプレーンテキスト処理
      return `# AI処理依頼

## 処理タイプ
${type}${optionText}

## 命令内容
${prompt}

## 対象テキスト
\`\`\`
${selectedText}
\`\`\`

---
処理日時: ${timestamp}
ファイル形式: Markdown
文字数: ${selectedText.length}文字
`;
    }
  }

  // ファイルサイズ検証関数
  function validateFileSize(content, maxSizeMB = 4) {
    const sizeInBytes = new Blob([content]).size;
    const maxSize = maxSizeMB * 1024 * 1024;
    
    if (sizeInBytes > maxSize) {
      throw new Error(`ファイルサイズが制限を超えています: ${(sizeInBytes / 1024 / 1024).toFixed(2)} MB (最大: ${maxSizeMB} MB)`);
    }
    return sizeInBytes;
  }

  // デバッグ用ログ関数
  function logAPIResponse(provider, response, type, option) {
    if (window.debugMode || localStorage.getItem('ai_debug') === 'true') {
      console.log(`=== ${provider} API Response ===`);
      console.log('Processing type:', type);
      console.log('Option:', option);
      console.log('Response status:', response.status || 'success');
      console.log('Response data:', JSON.stringify(response, null, 2));
      console.log('========================');
    }
  }

  // Gemini ファイルアップロード関数（公式ドキュメント準拠）
  async function uploadFileToGemini(fileContent, apiKey) {
    try {
      const fileBytes = new TextEncoder().encode(fileContent);
      const fileSizeBytes = fileBytes.length;
      const mimeType = 'text/plain';
      
      if (window.debugMode || localStorage.getItem('ai_debug') === 'true') {
        console.log(`Starting Gemini file upload: ${fileSizeBytes} bytes`);
      }
      
      // Step 1: Resumable uploadセッションを開始
      const metadata = {
        file: {
          display_name: 'ai_processing_request.txt'
        }
      };

      const initResponse = await fetch(`${GEMINI_FILE_UPLOAD_API}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'X-Goog-Upload-Protocol': 'resumable',
          'X-Goog-Upload-Command': 'start',
          'X-Goog-Upload-Header-Content-Length': fileSizeBytes.toString(),
          'X-Goog-Upload-Header-Content-Type': mimeType,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata)
      });

      if (!initResponse.ok) {
        const errorText = await initResponse.text();
        console.error('Init response error:', errorText);
        throw new Error(`Upload initialization failed: ${initResponse.status} - ${errorText}`);
      }

      // Step 2: Upload URLを取得
      const uploadUrl = initResponse.headers.get('X-Goog-Upload-URL');
      if (!uploadUrl) {
        throw new Error('No upload URL received from Gemini Files API');
      }
      
      console.log('Upload URL received:', uploadUrl);

      // Step 3: ファイルデータをアップロード
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Length': fileSizeBytes.toString(),
          'X-Goog-Upload-Offset': '0',
          'X-Goog-Upload-Command': 'upload, finalize'
        },
        body: fileBytes
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Upload response error:', errorText);
        throw new Error(`File upload failed: ${uploadResponse.status} - ${errorText}`);
      }

      const uploadData = await uploadResponse.json();
      if (window.debugMode || localStorage.getItem('ai_debug') === 'true') {
        console.log('Gemini file uploaded successfully:', JSON.stringify(uploadData, null, 2));
      }
      
      // ファイルURIを取得
      const fileUri = uploadData.file?.uri || uploadData.uri || uploadData.name;
      
      if (!fileUri) {
        console.error('Upload response structure:', uploadData);
        throw new Error('No file URI returned from upload response');
      }
      
      if (window.debugMode || localStorage.getItem('ai_debug') === 'true') {
        console.log('File uploaded successfully with URI:', fileUri);
      }
      
      // ファイルの処理状態を確認（必要に応じて）
      if (uploadData.file?.state && uploadData.file.state !== 'ACTIVE') {
        console.log(`File initial state: ${uploadData.file.state}`);
        
        let fileReady = false;
        let retries = 0;
        const maxRetries = 10;
        
        while (!fileReady && retries < maxRetries) {
          // ファイルIDを抽出してステータスチェック
          const fileId = fileUri.split('/').pop();
          
          try {
            const statusResponse = await fetch(`${GEMINI_FILE_API}/${fileId}?key=${apiKey}`, {
              method: 'GET'
            });
            
            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              console.log(`File status check ${retries + 1}: ${statusData.state}`);
              
              if (statusData.state === 'ACTIVE') {
                fileReady = true;
                console.log('File is now active and ready for processing');
              } else if (statusData.state === 'FAILED') {
                throw new Error('File processing failed during status check');
              } else {
                // PROCESSING状態の場合は待機
                await new Promise(resolve => setTimeout(resolve, 1000));
                retries++;
              }
            } else {
              console.warn('Status check failed, assuming file is ready');
              fileReady = true;
            }
          } catch (statusError) {
            console.warn('Status check error (non-critical):', statusError.message);
            fileReady = true; // エラーの場合は準備完了として扱う
          }
        }
        
        if (!fileReady) {
          console.warn('File processing timeout, continuing anyway');
        }
      }

      return uploadData;
    } catch (error) {
      console.error('Gemini file upload error:', error);
      throw error;
    }
  }

  // Gemini ファイル削除関数
  async function deleteGeminiFile(fileUri, apiKey) {
    try {
      // ファイルIDを抽出
      const fileId = fileUri.split('/').pop();
      const response = await fetch(`${GEMINI_FILE_API}/${fileId}?key=${apiKey}`, {
        method: 'DELETE'
      });

      if (!response.ok && response.status !== 404) {
        console.warn(`Failed to delete Gemini file (${response.status}):`, response.statusText);
        // 403エラーの場合、ファイルが自動で期限切れになるので警告レベルに下げる
        if (response.status === 403) {
          console.info('File will expire automatically in 2 days');
        }
      } else {
        if (window.debugMode || localStorage.getItem('ai_debug') === 'true') {
          console.log('Gemini file deleted successfully or not found');
        }
      }
    } catch (error) {
      console.warn('Gemini file deletion error (non-critical):', error.message);
    }
  }

  // Claude APIを呼び出し（ファイル対応版）
  async function callClaudeAPI(prompt, selectedText, apiKey, type, option, outputToFile = false) {
    const systemPrompt = 'あなたは専門的なAIアシスタントです。添付されたファイルの処理依頼に従って作業を実行してください。';
    

    try {
      // ファイル作成
      const fileContent = createProcessingFile(prompt, selectedText, type, option);
      
      // ファイルサイズ検証（Claude: 5MB制限）
      const fileSize = validateFileSize(fileContent, 5);
      if (window.debugMode || localStorage.getItem('ai_debug') === 'true') {
        console.log('Claude file size:', fileSize, 'bytes');
      }
      
      // Base64エンコード
      const base64Content = btoa(unescape(encodeURIComponent(fileContent)));
      
      // デバッグログ
      if (window.debugMode || localStorage.getItem('ai_debug') === 'true') {
        console.log('File size:', fileSize, 'bytes');
        console.log('Processing type:', type, 'Option:', option);
      }
      
      const requestBody = {
        model: CLAUDE_MODEL,
        max_tokens: outputToFile ? 32768 : 4096,  // ファイル出力時はトークン数を増加
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: '添付されたファイルの処理依頼に従って作業を実行してください。'
              },
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'text/markdown',
                  data: base64Content
                }
              }
            ]
          }
        ]
      };

      const response = await fetch(CLAUDE_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
          'anthropic-version': CLAUDE_API_VERSION
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      
      if (data.content && data.content[0] && data.content[0].text) {
        return data.content[0].text;
      }
      
      if (data.error) {
        throw new Error(`Claude API Error: ${data.error.message || JSON.stringify(data.error)}`);
      }
      
      console.error('Invalid response format:', data);
      throw new Error('レスポンス形式が無効です');
    } catch (error) {
      console.error('Claude API Error:', error);
      throw error;
    }
  }

  // Gemini APIを呼び出し（Files APIアップロード専用・書式対応）
  async function callGeminiAPI(prompt, selectedText, apiKey, type, option, outputToFile = false, useFlash = false) {
    let fileUri = null;
    
    try {
      // 選択範囲の書式情報を取得
      const selectedHTML = getSelectedHTML();
      const formatting = analyzeTextFormatting();
      
      if (window.debugMode || localStorage.getItem('ai_debug') === 'true') {
        console.log('Formatting analysis:', formatting);
        if (selectedHTML) {
          console.log('Selected HTML:', selectedHTML);
        }
      }
      
      // ファイル作成（書式情報付き）
      const fileContent = createProcessingFile(prompt, selectedText, type, option, selectedHTML, formatting);
      
      // ファイルサイズ検証（Gemini: 20MB制限）
      const fileSize = validateFileSize(fileContent, 20);
      if (window.debugMode || localStorage.getItem('ai_debug') === 'true') {
        console.log('Gemini file size:', fileSize, 'bytes');
      }
      
      // デバッグログ
      if (window.debugMode || localStorage.getItem('ai_debug') === 'true') {
        console.log('File size:', fileSize, 'bytes');
        console.log('Processing type:', type, 'Option:', option);
      }
      
      // 書式維持を最優先として、常にファイルアップロード方式を使用
      
      // 必ずファイルアップロードを使用
      const uploadResponse = await uploadFileToGemini(fileContent, apiKey);
      fileUri = uploadResponse.file?.uri || uploadResponse.uri;
      
      if (!fileUri) {
        throw new Error('Failed to get file URI from upload response');
      }
      
      // 書式情報に基づいて適切な指示を作成（シンプル化）
      const hasFormatting = formatting && formatting.hasFormatting;
      const instructionText = "添付されたファイルの処理依頼を実行してください。ファイルの指示内容に従い、適切に処理結果を出力してください。";
      
      // Files APIを使用したリクエストボディ（公式ドキュメント準拠）
      const requestBody = {
        contents: [{
          parts: [
            { text: instructionText },
            { 
              fileData: { 
                mimeType: "text/plain",  // アップロードファイルと一致させる
                fileUri: fileUri 
              } 
            }
          ]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: outputToFile ? 32768 : Math.max(8192, 2048)  // 最小2048トークンを確保
        },
        systemInstruction: {
          parts: [{
            text: "あなたは専門的なAIアシスタントです。添付されたファイルを読み取って、その中の処理依頼に従って作業を実行し、結果を出力してください。"
          }]
        }
      };
      
      // 使用するモデルを決定
      const apiEndpoint = useFlash ? GEMINI_API_ENDPOINT_FLASH : GEMINI_API_ENDPOINT_PRO;
      const modelName = useFlash ? 'gemini-2.5-flash' : 'gemini-2.5-pro';
      
      if (window.debugMode || localStorage.getItem('ai_debug') === 'true') {
        console.log(`Using model: ${modelName}`);
        console.log('Sending request to Gemini API:', JSON.stringify(requestBody, null, 2));
      }

      const response = await fetch(`${apiEndpoint}?key=${apiKey}`, {
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
      
      
      // ファイル削除（成功時）
      if (fileUri) {
        await deleteGeminiFile(fileUri, apiKey);
      }
      
      if (data.candidates && data.candidates[0]) {
        const candidate = data.candidates[0];
        
        if (candidate.content && candidate.content.parts && candidate.content.parts[0] && candidate.content.parts[0].text) {
          return candidate.content.parts[0].text;
        }
        
        if (candidate.content && candidate.content.text) {
          return candidate.content.text;
        }
        
        if (candidate.output && candidate.output.text) {
          return candidate.output.text;
        }
        
        if (candidate.text) {
          return candidate.text;
        }
        
        // レスポンスが空の場合のより詳細なエラー処理とデバッグ情報
        if (window.debugMode || localStorage.getItem('ai_debug') === 'true') {
          console.log('Empty response candidate:', candidate);
          console.log('Full API response:', data);
        }
        
        // 候補の状態を詳細にログ出力
        if (candidate.finishReason) {
          console.log('finishReason:', candidate.finishReason);
        }
        if (candidate.safetyRatings) {
          console.log('safetyRatings:', candidate.safetyRatings);
        }
        
        if (candidate.finishReason === 'STOP') {
          // 安全性フィルターをチェック
          const safetyBlocked = candidate.safetyRatings?.some(rating => 
            rating.probability === 'HIGH' || rating.blocked === true
          );
          
          if (safetyBlocked) {
            throw new Error('安全性フィルターによってレスポンスがブロックされました。内容を見直してください。');
          } else {
            // 空レスポンス問題: gemini-2.5-pro → gemini-2.5-flash に切り替え
            throw new Error('EMPTY_RESPONSE_FALLBACK_TO_FLASH');
          }
        }
        
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
      
      if (data.error) {
        throw new Error(`Gemini API Error: ${data.error.message || JSON.stringify(data.error)}`);
      }
      
      console.error('Invalid response format:', data);
      throw new Error('レスポンス形式が無効です');
    } catch (error) {
      console.error('Gemini API Error:', error);
      
      // エラー時もファイル削除を試みる
      if (fileUri) {
        await deleteGeminiFile(fileUri, apiKey);
      }
      
      // 空レスポンス問題の場合、flashモデルにフォールバック
      if (error.message === 'EMPTY_RESPONSE_FALLBACK_TO_FLASH' && !useFlash) {
        console.warn('Empty response from gemini-2.5-pro, falling back to gemini-2.5-flash');
        return await callGeminiAPI(prompt, selectedText, apiKey, type, option, outputToFile, true);
      }
      
      // HTTP 500 サーバーエラーの場合もflashモデルにフォールバック
      if (error.message.includes('500') && error.message.includes('INTERNAL') && !useFlash) {
        console.warn('HTTP 500 server error from gemini-2.5-pro, falling back to gemini-2.5-flash');
        return await callGeminiAPI(prompt, selectedText, apiKey, type, option, outputToFile, true);
      }
      
      throw error;
    }
  }

  // AIボタンのクリック処理
  async function handleAIButtonClick() {
    const config = await loadConfig();
    const provider = config.provider;
    
    // APIキーが設定されているか確認
    const apiKey = provider === 'claude' ? config.claude.apiKey : config.gemini.apiKey;
    
    if (!apiKey) {
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
      // デフォルトのプロンプトとタイプ
      const prompt = '以下のテキストを処理してください：';
      const type = 'general';
      const option = null;
      
      // 出力トークン数を推定（handleAIButtonClick用）
      const buttonInputTokens = estimateTokenCount(prompt + selectedText);
      const buttonEstimatedOutputTokens = estimateOutputTokens(buttonInputTokens, type, option);
      const buttonOutputToFile = shouldOutputToFile(buttonEstimatedOutputTokens);
      
      // APIを呼び出し（新しいシグネチャ）
      const result = provider === 'claude' 
        ? await callClaudeAPI(prompt, selectedText, apiKey, type, option, buttonOutputToFile)
        : await callGeminiAPI(prompt, selectedText, apiKey, type, option, buttonOutputToFile);
      
      // 出力が大きい場合はファイルに保存、そうでなければ通常表示
      if (buttonOutputToFile) {
        const saveResult = await saveToFile(result, type, option);
        
        if (saveResult.success) {
          showFilePathDialog(saveResult.filepath, saveResult.filename);
        } else {
          // ファイル保存に失敗した場合は通常通り表示
          console.warn('File save failed, showing in dialog:', saveResult.error);
          showResultWindow(result, provider, selectedText, type, option);
        }
      } else {
        // 結果を表示（拡張版）
        showResultWindow(result, provider, selectedText, type, option);
      }
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
      btn.innerHTML = originalContent;
      btn.disabled = false;
    }
  }

  // ツールバーを更新（黒いボタンを削除）
  async function updateToolbar() {
    ensureStyles();
    
    // 既存のAIツールバーグループを削除
    const existingGroup = document.querySelector('.ai-toolbar-group');
    if (existingGroup) {
      existingGroup.remove();
    }
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

  // AI設定ダイアログをグローバルに公開
  window.showSetupDialog = showSetupDialog;

  // リトライ処理を行うヘルパー関数
  async function retryWithBackoff(apiCall, maxRetries = 3) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await apiCall();
      } catch (error) {
        lastError = error;
        
        // 529 Overloaded エラーの場合はリトライ
        if (error.message.includes('529') || error.message.includes('overloaded') || error.message.includes('Overloaded')) {
          const waitTime = Math.pow(2, i) * 1000 + Math.random() * 1000; // 指数バックオフ + ジッタ
          if (window.debugMode || localStorage.getItem('ai_debug') === 'true') {
            console.log(`API overloaded, retrying in ${waitTime}ms... (attempt ${i + 1}/${maxRetries})`);
          }
          
          if (i < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
        }
        
        // その他のエラーやリトライ上限に達した場合は即座に失敗
        throw error;
      }
    }
    throw lastError;
  }

  // AI処理リクエスト関数をグローバルに公開
  window.processAIRequest = async function(prompt, selectedText, type, option = null) {
    // ローディング表示を作成
    let loadingModal = document.querySelector('.ai-loading-modal');
    if (!loadingModal) {
      loadingModal = document.createElement('div');
      loadingModal.className = 'ai-loading-modal';
      loadingModal.innerHTML = `
        <div class="ai-loading-content">
          <div class="ai-loading-spinner"></div>
          <div class="ai-loading-text">AI処理を実行中...</div>
          <div class="ai-loading-subtext">しばらくお待ちください</div>
        </div>
      `;
      document.body.appendChild(loadingModal);
    }
    
    // ローディング表示を開始
    loadingModal.classList.add('active');
    
    // タイムアウト設定（180秒に延長、Files API対応）
    const timeoutDuration = 180000;
    let timeoutId = null;
    let isTimeout = false;
    const startTime = Date.now(); // 処理開始時刻を記録
    
    try {
      const config = await loadConfig();
      const provider = config.provider;
      const apiKey = provider === 'claude' ? config.claude.apiKey : config.gemini.apiKey;
      
      if (!apiKey) {
        loadingModal.classList.remove('active');
        if (window.showMessage) {
          window.showMessage('APIキーが設定されていません。AI設定を確認してください。', 'error');
        }
        return;
      }
      
      // 入力量の制限チェック
      const inputTokens = estimateTokenCount(prompt);
      const inputLimit = provider === 'claude' ? 200000 : 1000000; // Claude: ~200K, Gemini: ~1M tokens
      
      if (inputTokens > inputLimit) {
        loadingModal.classList.remove('active');
        const inputSizeKB = Math.round((prompt.length) / 1024);
        if (window.showMessage) {
          window.showMessage(`入力量が多すぎます（約${inputTokens.toLocaleString()}トークン、${inputSizeKB}KB）。制限: ${inputLimit.toLocaleString()}トークン`, 'error');
        }
        return;
      }

      // タイムアウト処理を設定
      timeoutId = setTimeout(() => {
        if (isTimeout) return; // 既にタイムアウト処理済みの場合は何もしない
        
        isTimeout = true;
        loadingModal.classList.remove('active');
        
        const elapsedTime = Date.now() - startTime;
        console.warn(`AI処理がタイムアウトしました（${elapsedTime}ms / ${timeoutDuration}ms経過）`);
        
        // タイムアウトダイアログを表示
        const timeoutDialog = document.createElement('div');
        timeoutDialog.className = 'ai-timeout-dialog';
        timeoutDialog.innerHTML = `
          <div class="dialog-overlay" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;">
            <div class="dialog-content" style="background: white; padding: 30px; border-radius: 12px; max-width: 400px; text-align: center;">
              <h3 style="margin: 0 0 15px; color: #ef4444;">処理がタイムアウトしました</h3>
              <p style="color: #666; margin-bottom: 20px;">AI処理に時間がかかりすぎています（180秒経過）。<br>サーバーが混雑している可能性があります。しばらく待ってから再試行してください。</p>
              <button onclick="this.closest('.dialog-overlay').remove()" style="background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">閉じる</button>
            </div>
          </div>
        `;
        document.body.appendChild(timeoutDialog.firstElementChild);
      }, timeoutDuration);
      
      // 出力トークン数を推定
      const totalInputTokens = estimateTokenCount(prompt + selectedText);
      const estimatedOutputTokens = estimateOutputTokens(totalInputTokens, type, option);
      const outputToFile = shouldOutputToFile(estimatedOutputTokens);
      
      if (window.debugMode || localStorage.getItem('ai_debug') === 'true') {
        console.log(`Token estimation: input=${totalInputTokens}, estimated output=${estimatedOutputTokens}, output to file=${outputToFile}`);
      }
      
      // API呼び出し（リトライ付き、新しいシグネチャ）
      const apiCallWithRetry = () => {
        return provider === 'claude' 
          ? callClaudeAPI(prompt, selectedText, apiKey, type, option, outputToFile)
          : callGeminiAPI(prompt, selectedText, apiKey, type, option, outputToFile);
      };
      
      const result = await retryWithBackoff(apiCallWithRetry);
      
      // タイムアウトをクリア
      if (timeoutId) clearTimeout(timeoutId);
      
      // ローディングを非表示
      loadingModal.classList.remove('active');
      
      if (!isTimeout) {
        // 出力が大きい場合はファイルに保存
        if (outputToFile) {
          const saveResult = await saveToFile(result, type, option);
          
          if (saveResult.success) {
            showFilePathDialog(saveResult.filepath, saveResult.filename);
          } else {
            // ファイル保存に失敗した場合は通常通り表示
            console.warn('File save failed, showing in dialog:', saveResult.error);
            showResultWindow(result, provider, selectedText, type, option);
          }
        } else {
          // 通常サイズの場合は結果を表示（拡張版）
          showResultWindow(result, provider, selectedText, type, option);
        }
      }
      
    } catch (error) {
      // タイムアウトをクリア
      if (timeoutId) clearTimeout(timeoutId);
      
      // ローディングを非表示
      loadingModal.classList.remove('active');
      
      if (!isTimeout) {
        const elapsedTime = Date.now() - startTime;
        console.error(`AI processing error after ${elapsedTime}ms:`, error);
        let errorMessage = 'エラーが発生しました: ';
        
        // 詳細なエラー処理
        if (error.message.includes('401') || error.message.includes('403')) {
          errorMessage += 'APIキーが無効です。設定を確認してください。';
        } else if (error.message.includes('404')) {
          errorMessage += 'APIエンドポイントが見つかりません。';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'AI処理がタイムアウトしました';
        } else if (error.message.includes('500')) {
          errorMessage += 'AIサーバーで内部エラーが発生しました。しばらく待ってから再試行してください。';
        } else if (error.message.includes('529') || error.message.includes('overloaded') || error.message.includes('Overloaded')) {
          errorMessage += 'AIサーバーが過負荷状態です。しばらく待ってから再試行してください。';
        } else if (error.message.includes('400')) {
          // 入力/出力制限エラーのチェック
          if (error.message.includes('too long') || error.message.includes('token limit') || error.message.includes('maximum')) {
            const isInputError = error.message.includes('input') || error.message.includes('request');
            const isOutputError = error.message.includes('output') || error.message.includes('response');
            
            if (isInputError) {
              const inputSizeKB = Math.round((prompt.length) / 1024);
              errorMessage += `入力データが大きすぎます（${inputSizeKB}KB）。テキストを短くして再試行してください。`;
            } else if (isOutputError) {
              errorMessage += 'AI応答が長すぎて処理できませんでした。より簡潔な指示で再試行してください。';
            } else {
              errorMessage += 'データサイズが制限を超えています。';
            }
          } else {
            errorMessage += 'リクエストが無効です。';
          }
        } else {
          errorMessage += error.message;
        }
        
        if (window.showMessage) {
          window.showMessage(errorMessage, 'error');
        } else {
          alert(errorMessage);
        }
      }
    }
  };

  // 現在のAI設定を取得する関数
  window.getCurrentAIProvider = async function() {
    try {
      const config = await loadConfig();
      const provider = config.provider;
      const hasApiKey = provider === 'claude' ? !!config.claude.apiKey : !!config.gemini.apiKey;
      const providerName = provider === 'claude' ? 'Claude' : 'Gemini';
      
      return {
        provider: provider,
        name: providerName,
        configured: hasApiKey,
        displayName: `${providerName}${hasApiKey ? '' : '（未設定）'}`
      };
    } catch (error) {
      console.error('Failed to get AI provider:', error);
      return {
        provider: 'gemini',
        name: 'Gemini',
        configured: false,
        displayName: 'Gemini（未設定）'
      };
    }
  };

  // トークン数の概算関数
  function estimateTokenCount(text) {
    // 日本語: 1文字 ≈ 1トークン、英語: 4文字 ≈ 1トークン の概算
    const japaneseChars = (text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length;
    const otherChars = text.length - japaneseChars;
    return japaneseChars + Math.ceil(otherChars / 4);
  }
  
  // 出力トークン数推定関数
  function estimateOutputTokens(inputTokens, type, option) {
    let baseOutputTokens = inputTokens * 1.2; // 基本的には入力の1.2倍程度
    
    // 処理タイプに基づく調整
    if (type === 'rewrite' || type === 'correct') {
      baseOutputTokens = inputTokens * 1.5; // 書き換えや校正は長くなりがち
    } else if (type === 'translate') {
      baseOutputTokens = inputTokens * 1.3; // 翻訳は多少長くなる
    } else if (type === 'summary') {
      baseOutputTokens = inputTokens * 0.5; // 要約は短くなる
    }
    
    // オプションに基づく調整
    if (option && option.includes('詳細') || option && option.includes('詳しく')) {
      baseOutputTokens *= 1.5;
    } else if (option && option.includes('併記') || option && option.includes('比較')) {
      baseOutputTokens *= 2.0; // 併記は2倍になる
    }
    
    return Math.round(baseOutputTokens);
  }
  
  // 容量オーバー判定（8192トークン以上でファイル出力）
  function shouldOutputToFile(estimatedOutputTokens) {
    return estimatedOutputTokens >= 8192;
  }
  
  // 継続リクエスト関数は削除（モデル切り替えに変更）
  
  // コンテンツの複雑さを判定
  function estimateContentComplexity(fileContent, selectedHTML) {
    const hasHTML = selectedHTML && selectedHTML.length > 0;
    const contentLines = fileContent.split('\n').length;
    const contentSize = fileContent.length;
    
    // 複雑な構造を持つ場合
    const hasComplexStructure = hasHTML && (
      selectedHTML.includes('<h1>') || 
      selectedHTML.includes('<ol>') || 
      selectedHTML.includes('<ul>') ||
      selectedHTML.includes('<strong>')
    );
    
    // ファイルが大きく複雑な場合は直接テキスト送信を推奨
    const shouldUseDirectText = (
      (contentLines > 200 && hasComplexStructure) ||
      (contentSize > 25000 && hasHTML) ||
      (contentLines > 500)
    );
    
    return {
      hasHTML,
      contentLines,
      contentSize,
      hasComplexStructure,
      shouldUseDirectText
    };
  }
  
  // Gemini API直接テキスト送信（ファイルアップロードの代替）
  async function callGeminiDirectText(prompt, selectedText, apiKey, type, option, outputToFile = false) {
    try {
      // 選択範囲の書式情報を取得
      const selectedHTML = getSelectedHTML();
      const formatting = analyzeTextFormatting();
      
      // 書式保持を優先した直接プロンプトを作成
      let directPrompt = prompt;
      if (formatting && formatting.hasFormatting && selectedHTML) {
        directPrompt = `${prompt}\n\n以下は書式付きテキストです。書式を保持して処理してください：\n\nHTML形式：\n${selectedHTML}\n\nプレーンテキスト版（参考）：\n${selectedText}\n\n重要：処理結果も可能な限り元の書式を保持してください。`;
      } else {
        directPrompt = `${prompt}\n\n対象テキスト：\n${selectedText}`;
      }
      
      const requestBody = {
        contents: [{
          parts: [
            { text: directPrompt }
          ]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: outputToFile ? 32768 : 8192
        },
        systemInstruction: {
          parts: [{
            text: "あなたは専門的なAIアシスタントです。与えられたテキストに対して、指示に従って適切に処理を実行してください。HTML書式が含まれている場合は、その書式を可能な限り保持して処理結果を出力してください。"
          }]
        }
      };
      
      if (window.debugMode || localStorage.getItem('ai_debug') === 'true') {
        console.log('Sending direct text request to Gemini API');
      }
      
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
      
      
      if (data.candidates && data.candidates[0]) {
        const candidate = data.candidates[0];
        
        if (candidate.content && candidate.content.parts && candidate.content.parts[0] && candidate.content.parts[0].text) {
          return candidate.content.parts[0].text;
        }
        
        // 通常のレスポンス処理と同じエラーハンドリング
        if (candidate.finishReason === 'MAX_TOKENS') {
          throw new Error('レスポンスが最大トークン数に達しました。より短いテキストで試してください。');
        } else if (candidate.finishReason === 'SAFETY') {
          throw new Error('安全性フィルターによりレスポンスがブロックされました。');
        } else {
          throw new Error('AIからのレスポンスが空です。');
        }
      }
      
      if (data.error) {
        throw new Error(`Gemini API Error: ${data.error.message || JSON.stringify(data.error)}`);
      }
      
      throw new Error('レスポンス形式が無効です');
      
    } catch (error) {
      console.error('Gemini Direct Text API Error:', error);
      throw error;
    }
  }
  
  // ファイルに出力する関数
  async function saveToFile(content, type, option) {
    try {
      // ダウンロードフォルダのパスを取得
      let downloadDir;
      if (window.electronAPI && window.electronAPI.getDownloadPath) {
        // ElectronのAPIがある場合
        downloadDir = await window.electronAPI.getDownloadPath();
      } else if (typeof require !== 'undefined') {
        // Node.jsモジュールが利用可能な場合
        downloadDir = getDownloadPath();
      } else {
        // フォールバック: デフォルトパス
        const userProfile = process.env.USERPROFILE || process.env.HOME || '';
        downloadDir = userProfile ? `${userProfile}\\Downloads` : 'C:\\Users\\Downloads';
      }
      
      // ディレクトリの作成（必要な場合）
      if (window.electronAPI && window.electronAPI.fs) {
        await window.electronAPI.fs.ensureDir(downloadDir);
      }
      
      // ファイル名を生成
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
      const typePrefix = type || 'ai_output';
      const optionSuffix = option ? `_${option.replace(/[^a-zA-Z0-9]/g, '')}` : '';
      const filename = `${typePrefix}${optionSuffix}_${timestamp}.txt`;
      const filepath = `${downloadDir}\\${filename}`;
      
      // ファイルに保存
      if (window.electronAPI && window.electronAPI.fs) {
        await window.electronAPI.fs.writeFile(filepath, content, 'utf-8');
        return { success: true, filepath, filename };
      } else {
        // Electronが利用できない場合の fallback
        throw new Error('File system access not available');
      }
    } catch (error) {
      console.error('File save error:', error);
      return { success: false, error: error.message };
    }
  }
})();