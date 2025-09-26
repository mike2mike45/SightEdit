# SightEdit Structure & Code Standards

## 📁 ファイル構造規約

### ディレクトリ命名規則
```
src/
├── background/         # Chrome Extension Service Worker
├── popup/             # 拡張機能ポップアップUI
├── editor/            # メインエディター機能
├── content/           # Content Scripts (ページ連携)
├── common/            # 共通ユーティリティ
├── lib/               # 独立ライブラリモジュール
└── i18n/              # 国際化リソース
```

### ファイル命名パターン
- **スクリプトファイル**: `kebab-case.js`
  - ✅ `simple-editor.js`, `ai-manager.js`
  - ❌ `SimpleEditor.js`, `aiManager.js`

- **HTMLファイル**: `kebab-case.html`
  - ✅ `popup.html`, `editor.html`

- **設定ファイル**: `kebab-case.config.js`
  - ✅ `webpack.config.js`, `jest.config.js`

### 機能別モジュール配置
```
src/editor/
├── editor.html          # エディターレイアウト
└── simple-editor.js     # エディターコア実装

src/lib/
└── ai-manager.js        # AI機能管理（独立モジュール）

src/common/
└── error-handler.js     # 共通エラーハンドリング
```

## 🎯 コード規約

### JavaScript スタイルガイド

#### 1. 変数・関数命名
```javascript
// ✅ Good: camelCase
const editorContent = '';
const isSourceMode = false;
function loadLanguageSettings() {}
function updateWordCount() {}

// ❌ Bad: snake_case, PascalCase
const editor_content = '';
const IsSourceMode = false;
function load_language_settings() {}
```

#### 2. 定数定義
```javascript
// ✅ Good: UPPER_SNAKE_CASE
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_LANGUAGE = 'ja';
const API_ENDPOINTS = {
  GEMINI: 'https://generativelanguage.googleapis.com/v1beta',
  CLAUDE: 'https://api.anthropic.com/v1'
};

// ❌ Bad
const maxFileSize = 10000000;
const apiEndpoints = {...};
```

#### 3. クラス設計パターン
```javascript
// ✅ Good: ES6 Class with clear structure
export class AIManager {
  constructor() {
    this.settings = {
      geminiApiKey: '',
      claudeApiKey: '',
      selectedModel: 'gemini-2.5-pro'
    };
  }

  async loadSettings() {
    const result = await chrome.storage.local.get(['aiSettings']);
    // ...
  }

  async saveSettings() {
    await chrome.storage.local.set({ aiSettings: this.settings });
  }
}
```

#### 4. 非同期処理パターン
```javascript
// ✅ Good: async/await with error handling
async function callAI(prompt) {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('AI API Error:', error);
    throw error;
  }
}

// ❌ Bad: Promise chains, no error handling
function callAI(prompt) {
  return fetch(endpoint).then(res => res.json());
}
```

### Chrome Extension パターン

#### 1. Background Script (Service Worker)
```javascript
// ✅ Good: Event-driven pattern
chrome.runtime.onInstalled.addListener(() => {
  console.log('SightEdit Chrome Extension installed');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStorageData') {
    chrome.storage.local.get(request.keys || null, sendResponse);
    return true; // 非同期レスポンス
  }
});
```

#### 2. Storage API使用パターン
```javascript
// ✅ Good: Consistent storage pattern
// 読み込み
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['language'], (result) => {
      resolve(result.language || 'ja');
    });
  });
}

// 保存
async function saveSettings(settings) {
  return new Promise((resolve) => {
    chrome.storage.sync.set(settings, resolve);
  });
}
```

#### 3. Message Passing パターン
```javascript
// ✅ Good: Structured message format
const message = {
  action: 'getStorageData',
  keys: ['aiSettings'],
  timestamp: Date.now()
};

chrome.runtime.sendMessage(message, (response) => {
  if (chrome.runtime.lastError) {
    console.error('Message error:', chrome.runtime.lastError);
    return;
  }
  handleResponse(response);
});
```

## 🧩 モジュール設計原則

### 1. 単一責任原則
```javascript
// ✅ Good: Single responsibility
class MarkdownConverter {
  markdownToHtml(markdown) { /* ... */ }
  htmlToMarkdown(html) { /* ... */ }
}

class FileManager {
  openFile() { /* ... */ }
  saveFile() { /* ... */ }
}

// ❌ Bad: Multiple responsibilities
class EditorManager {
  convertMarkdown() { /* ... */ }
  saveFile() { /* ... */ }
  callAI() { /* ... */ }
  updateUI() { /* ... */ }
}
```

### 2. エラーハンドリング統一
```javascript
// common/error-handler.js
export const ErrorCodes = {
  FILE_READ_ERROR: 'FILE_READ_ERROR',
  AI_API_ERROR: 'AI_API_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR'
};

export function handleError(errorCode, error, userMessage) {
  console.error(`[${errorCode}]`, error);

  // ユーザー向けメッセージ表示
  if (userMessage) {
    showNotification(userMessage, 'error');
  }
}
```

### 3. 国際化対応パターン
```javascript
// ✅ Good: i18n structure
const texts = {
  ja: {
    openEditor: 'エディターを開く',
    saveFile: 'ファイルを保存'
  },
  en: {
    openEditor: 'Open Editor',
    saveFile: 'Save File'
  }
};

function getText(key, language = 'ja') {
  return texts[language]?.[key] || texts.ja[key] || key;
}
```

## 📋 HTML/CSS規約

### HTML構造パターン
```html
<!-- ✅ Good: Semantic structure -->
<div class="editor-container">
  <header class="editor-header">
    <h1 class="editor-title">SightEdit</h1>
    <nav class="editor-nav">
      <button class="btn btn-primary" id="save-btn">保存</button>
    </nav>
  </header>

  <main class="editor-main">
    <div class="editor-content" id="editor-content"></div>
  </main>
</div>
```

### CSS命名規則（BEM風）
```css
/* ✅ Good: Block-Element-Modifier pattern */
.editor-container { }
.editor-header { }
.editor-header__title { }
.editor-header__nav { }

.btn { }
.btn--primary { }
.btn--secondary { }
.btn--disabled { }

/* ❌ Bad: Inconsistent naming */
.editorContainer { }
.header_title { }
.button-primary { }
```

## 🔄 Git規約

### ブランチ命名
```
main                    # メインブランチ
feature/ai-integration  # 新機能開発
fix/editor-bug          # バグ修正
refactor/simple-editor  # リファクタリング
docs/api-documentation  # ドキュメント更新
```

### コミットメッセージ
```
feat: Add Gemini API integration
fix: Resolve markdown table rendering issue
refactor: Extract AI manager to separate module
docs: Update technical specification
chore: Update webpack configuration
```

## 🧪 テスト規約

### テストファイル配置
```
tests/
├── unit/
│   ├── editor.test.js
│   ├── ai-manager.test.js
│   └── file-validation.test.cjs
└── integration/
    └── extension.test.js
```

### テスト命名パターン
```javascript
// ✅ Good: Descriptive test names
describe('AIManager', () => {
  describe('loadSettings', () => {
    test('should load settings from Chrome storage', async () => {
      // ...
    });

    test('should return default settings when storage is empty', async () => {
      // ...
    });
  });
});
```

## 📚 ドキュメント規約

### JSDoc コメント
```javascript
/**
 * MarkdownテキストをHTMLに変換
 * @param {string} markdown - 変換するMarkdownテキスト
 * @returns {string} 変換されたHTML
 * @throws {Error} 変換エラー時
 */
markdownToHtml(markdown) {
  // ...
}
```

### README構造
```markdown
# プロジェクト名
簡潔な説明

## インストール
手順

## 使用方法
基本的な使い方

## 開発
開発環境セットアップ

## ライセンス
MIT
```