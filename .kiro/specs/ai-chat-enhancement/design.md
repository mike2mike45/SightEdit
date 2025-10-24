# AI機能強化 - 設計書

## 📐 アーキテクチャ概要

### 全体構成

```
┌─────────────────────────────────────────────────────────┐
│                    SightEdit Editor                      │
├─────────────────────────────────┬───────────────────────┤
│                                 │                       │
│  Editor Core                    │  AI Chat Panel        │
│  (simple-editor.js)             │  (chat-panel.js)      │
│                                 │                       │
│  ┌───────────────────────────┐  │  ┌─────────────────┐ │
│  │ Markdown Editor           │  │  │ Chat History    │ │
│  │                           │  │  │                 │ │
│  │                           │  │  │ ● User: ...     │ │
│  │                           │  │  │ ○ AI: ...       │ │
│  │                           │  │  │                 │ │
│  └───────────────────────────┘  │  └─────────────────┘ │
│                                 │  ┌─────────────────┐ │
│                                 │  │ Input Box       │ │
│                                 │  └─────────────────┘ │
└─────────────────────────────────┴───────────────────────┘
                    │                        │
        ┌───────────┴────────────────────────┴─────────┐
        │                                              │
        ▼                                              ▼
┌───────────────────┐                    ┌─────────────────────┐
│   AI Manager      │                    │  Prompt Manager     │
│ (ai-manager.js)   │◄──────────────────►│ (prompt-manager.js) │
└───────────────────┘                    └─────────────────────┘
        │                                              │
        ▼                                              ▼
┌───────────────────┐                    ┌─────────────────────┐
│ Streaming Handler │                    │  Chat Storage       │
│(streaming-handler)│                    │ (chat-storage.js)   │
└───────────────────┘                    └─────────────────────┘
        │                                              │
        ▼                                              ▼
┌───────────────────────────────────────────────────────────────┐
│              Chrome Extension APIs                             │
│  • Chrome Storage (sync/local)  • IndexedDB  • Fetch API      │
└───────────────────────────────────────────────────────────────┘
```

### データフロー

```
User Input
    │
    ▼
Chat Panel ──► Prompt Manager (テンプレート適用)
    │               │
    ▼               ▼
AI Manager ◄───────┘
    │
    ├──► Streaming Handler (リアルタイム表示)
    │         │
    │         ▼
    │    Chat Panel (表示更新)
    │
    ▼
Chat Storage (履歴保存)
    │
    ├──► Chrome Storage (最近の履歴)
    └──► IndexedDB (全履歴)
```

## 🏗️ モジュール設計

### 1. AI Chat Manager (`src/lib/ai-chat-manager.js`)

チャット機能の中核を管理するクラス。

```javascript
export class AIChatManager {
    constructor(aiManager, promptManager, chatStorage) {
        this.aiManager = aiManager;
        this.promptManager = promptManager;
        this.chatStorage = chatStorage;
        this.currentSession = null;
        this.isStreaming = false;
    }

    // セッション管理
    async createNewSession(title = null) {
        // 新しい会話セッションを作成
    }

    async loadSession(sessionId) {
        // 既存のセッションを読み込み
    }

    async saveSession() {
        // 現在のセッションを保存
    }

    // メッセージ送信
    async sendMessage(content, options = {}) {
        // ユーザーメッセージを送信し、AI応答を取得
        // options: { includeContext, contextType, streaming }
    }

    async sendMessageWithStreaming(content, onChunk, onComplete) {
        // ストリーミングでメッセージを送信
    }

    // コンテキスト管理
    getEditorContext(type = 'full') {
        // エディターの内容をコンテキストとして取得
        // type: 'full' | 'selection' | 'none'
    }

    buildMessages(userContent, includeContext) {
        // APIに送信するメッセージ配列を構築
    }

    // 履歴管理
    async getSessions() {
        // すべてのセッションを取得
    }

    async deleteSession(sessionId) {
        // セッションを削除
    }

    async searchSessions(query) {
        // セッションを検索
    }
}
```

### 2. Prompt Manager (`src/lib/prompt-manager.js`)

カスタムプロンプトテンプレートを管理。

```javascript
export class PromptManager {
    constructor() {
        this.templates = [];
        this.categories = ['執筆支援', 'コーディング', '翻訳', 'その他'];
    }

    // CRUD操作
    async loadTemplates() {
        // Chrome Storageからテンプレートを読み込み
    }

    async saveTemplate(template) {
        // テンプレートを保存
    }

    async updateTemplate(id, updates) {
        // テンプレートを更新
    }

    async deleteTemplate(id) {
        // テンプレートを削除
    }

    // 検索・フィルタリング
    getTemplatesByCategory(category) {
        // カテゴリー別にテンプレートを取得
    }

    getFavorites() {
        // お気に入りテンプレートを取得
    }

    searchTemplates(query) {
        // テンプレートを検索
    }

    // テンプレート実行
    applyTemplate(templateId, variables = {}) {
        // テンプレートに変数を適用してプロンプトを生成
        // 例: "{{text}}を要約して" → "こんにちはを要約して"
    }

    parseVariables(promptText) {
        // プロンプトから変数を抽出
        // 例: "{{text}}" → ['text']
    }

    // インポート/エクスポート
    async exportTemplates() {
        // JSON形式でエクスポート
    }

    async importTemplates(jsonData) {
        // JSON形式でインポート
    }

    // デフォルトテンプレート
    getDefaultTemplates() {
        // デフォルトのプロンプトライブラリを返す
    }
}
```

### 3. Chat Storage (`src/lib/chat-storage.js`)

IndexedDBを使用した会話履歴の永続化。

```javascript
export class ChatStorage {
    constructor() {
        this.dbName = 'SightEditChatDB';
        this.dbVersion = 1;
        this.db = null;
    }

    // データベース初期化
    async initDB() {
        // IndexedDBを初期化
        // Object Stores: sessions, messages
    }

    // セッション操作
    async saveSession(session) {
        // セッションを保存
    }

    async getSession(sessionId) {
        // セッションを取得
    }

    async getAllSessions() {
        // すべてのセッションを取得（ページネーション対応）
    }

    async deleteSession(sessionId) {
        // セッションを削除
    }

    async updateSession(sessionId, updates) {
        // セッションを更新（タイトル、タグなど）
    }

    // メッセージ操作
    async addMessage(sessionId, message) {
        // メッセージを追加
    }

    async getMessages(sessionId) {
        // セッションのメッセージを取得
    }

    // 検索
    async searchSessions(query) {
        // タイトル、タグ、メッセージ内容で検索
    }

    // ストレージ管理
    async getStorageSize() {
        // 使用中のストレージサイズを取得
    }

    async cleanup(maxSessions = 100) {
        // 古いセッションを削除してストレージを最適化
    }

    // エクスポート
    async exportSession(sessionId, format = 'json') {
        // セッションをエクスポート（JSON/Markdown）
    }
}
```

### 4. Streaming Handler (`src/lib/streaming-handler.js`)

Server-Sent Eventsスタイルのストリーミング応答処理。

```javascript
export class StreamingHandler {
    constructor() {
        this.abortController = null;
    }

    // Gemini ストリーミング
    async streamGemini(endpoint, apiKey, requestBody, onChunk, onComplete, onError) {
        // Gemini API のストリーミングエンドポイントを使用
        // ?alt=sse パラメータでSSE形式の応答を取得
    }

    // Claude ストリーミング
    async streamClaude(endpoint, apiKey, requestBody, onChunk, onComplete, onError) {
        // Claude API の streaming: true パラメータを使用
        // Server-Sent Events形式で応答を受信
    }

    // 共通ストリーミング処理
    async processStream(reader, onChunk, onComplete, onError) {
        // ReadableStreamからチャンクを読み取り
        // デコードして onChunk コールバックを呼び出し
    }

    // ストリーミング中断
    abort() {
        // 進行中のストリーミングを中断
    }

    // SSE パーサー
    parseSSE(chunk) {
        // Server-Sent Events形式のデータをパース
    }
}
```

### 5. Chat Panel UI (`src/editor/chat-panel.js`)

チャットUIコンポーネント。

```javascript
export class ChatPanel {
    constructor(chatManager, promptManager) {
        this.chatManager = chatManager;
        this.promptManager = promptManager;
        this.element = null;
        this.isVisible = false;
        this.position = 'right'; // 'right' | 'bottom' | 'floating'
    }

    // UI初期化
    render() {
        // チャットパネルのHTMLを生成
    }

    // 表示制御
    show() {}
    hide() {}
    toggle() {}

    // レイアウト
    setPosition(position) {
        // パネルの位置を変更
    }

    resize(width, height) {
        // パネルのサイズ変更
    }

    // メッセージ表示
    addMessage(role, content, streaming = false) {
        // メッセージを追加表示
    }

    updateStreamingMessage(content) {
        // ストリーミング中のメッセージを更新
    }

    renderMessage(message) {
        // Markdown形式のメッセージをHTMLにレンダリング
    }

    // セッション管理UI
    showSessionList() {
        // セッション一覧を表示
    }

    loadSession(sessionId) {
        // セッションを読み込んで表示
    }

    clearChat() {
        // チャット履歴をクリア
    }

    // イベントハンドラー
    setupEventListeners() {
        // 送信ボタン、キーボードショートカットなど
    }

    onSendMessage() {
        // メッセージ送信時の処理
    }

    onCopyMessage(messageElement) {
        // メッセージのコピー
    }

    onInsertToEditor(messageElement) {
        // エディターへの挿入
    }
}
```

### 6. Prompt Library UI (`src/editor/prompt-library.js`)

プロンプトライブラリのUI。

```javascript
export class PromptLibrary {
    constructor(promptManager) {
        this.promptManager = promptManager;
        this.element = null;
    }

    // UI表示
    show() {
        // モーダルでプロンプトライブラリを表示
    }

    render() {
        // プロンプトリストのHTMLを生成
    }

    // カテゴリー別表示
    renderByCategory() {}

    // お気に入り表示
    renderFavorites() {}

    // プロンプト編集
    showEditDialog(templateId = null) {
        // プロンプト作成/編集ダイアログ
    }

    // プロンプト実行
    executePrompt(templateId) {
        // プロンプトを実行してチャットに送信
    }

    // 変数入力ダイアログ
    showVariableInputDialog(variables) {
        // テンプレート変数の入力ダイアログ
    }
}
```

### 7. AI Manager拡張 (`src/lib/ai-manager.js`)

既存のAIManagerクラスにストリーミング機能を追加。

```javascript
// 追加メソッド

async callAIWithStreaming(messages, onChunk, onComplete, onError) {
    // ストリーミングでAIを呼び出し
    const provider = this.settings.aiProvider;
    const streamingHandler = new StreamingHandler();

    if (provider === 'gemini') {
        await streamingHandler.streamGemini(/*...*/);
    } else if (provider === 'claude') {
        await streamingHandler.streamClaude(/*...*/);
    }
}

buildChatMessages(messages) {
    // マルチターン会話用のメッセージ配列を構築
    // Gemini形式: [{role: 'user', parts: [{text: '...'}]}]
    // Claude形式: [{role: 'user', content: '...'}]
}

manageTokenLimit(messages, maxTokens) {
    // トークン制限を超えないようにメッセージを調整
    // 古いメッセージを削除または要約
}
```

## 📊 データモデル設計

### Chat Session

```typescript
interface ChatSession {
    id: string;                  // UUID
    title: string;               // セッションタイトル
    createdAt: number;           // 作成日時（Unix timestamp）
    updatedAt: number;           // 更新日時
    messages: ChatMessage[];     // メッセージ配列
    model: string;               // 使用したモデル
    provider: 'gemini' | 'claude'; // AIプロバイダー
    tags: string[];              // タグ
    isFavorite: boolean;         // お気に入り
    contextType: 'full' | 'selection' | 'none'; // コンテキストタイプ
}
```

### Chat Message

```typescript
interface ChatMessage {
    id: string;                  // UUID
    role: 'user' | 'assistant';  // 送信者
    content: string;             // メッセージ内容
    timestamp: number;           // タイムスタンプ
    metadata?: {
        tokens?: number;         // トークン数
        model?: string;          // 使用モデル
        context?: string;        // 含まれていたコンテキスト
    };
}
```

### Prompt Template

```typescript
interface PromptTemplate {
    id: string;                  // UUID
    name: string;                // テンプレート名
    description: string;         // 説明
    category: string;            // カテゴリー
    prompt: string;              // プロンプトテキスト（{{variable}}形式）
    variables: PromptVariable[]; // 変数定義
    createdAt: number;           // 作成日時
    lastUsed: number;            // 最終使用日時
    usageCount: number;          // 使用回数
    isFavorite: boolean;         // お気に入り
}
```

### Prompt Variable

```typescript
interface PromptVariable {
    name: string;                // 変数名
    type: 'text' | 'number' | 'select'; // 型
    description: string;         // 説明
    defaultValue?: string;       // デフォルト値
    options?: string[];          // selectの選択肢
    required: boolean;           // 必須フラグ
}
```

## 🎨 UI/UX設計

### Chat Panel レイアウト

```html
<div class="chat-panel" data-position="right">
    <!-- Header -->
    <div class="chat-panel-header">
        <div class="header-left">
            <button class="btn-icon" id="chat-sessions">
                <span class="icon">📋</span>
                <span>履歴</span>
            </button>
            <button class="btn-icon" id="chat-prompts">
                <span class="icon">📝</span>
                <span>プロンプト</span>
            </button>
        </div>
        <div class="header-right">
            <button class="btn-icon" id="chat-settings">⚙️</button>
            <button class="btn-icon" id="chat-minimize">−</button>
            <button class="btn-icon" id="chat-close">×</button>
        </div>
    </div>

    <!-- Context Options -->
    <div class="context-options">
        <label>
            <input type="radio" name="context" value="none" checked>
            コンテキストなし
        </label>
        <label>
            <input type="radio" name="context" value="selection">
            選択範囲
        </label>
        <label>
            <input type="radio" name="context" value="full">
            ドキュメント全体
        </label>
    </div>

    <!-- Messages Container -->
    <div class="chat-messages" id="chat-messages">
        <!-- メッセージがここに表示される -->
    </div>

    <!-- Input Area -->
    <div class="chat-input-area">
        <textarea
            id="chat-input"
            placeholder="メッセージを入力... (Ctrl+Enter で送信)"
            rows="3"
        ></textarea>
        <div class="input-actions">
            <button class="btn-secondary" id="chat-clear">クリア</button>
            <button class="btn-primary" id="chat-send">送信</button>
        </div>
    </div>
</div>
```

### Message Component

```html
<!-- User Message -->
<div class="message message-user">
    <div class="message-header">
        <span class="message-role">あなた</span>
        <span class="message-time">14:30</span>
    </div>
    <div class="message-content">
        <p>この文章を要約してください</p>
    </div>
</div>

<!-- AI Message -->
<div class="message message-assistant">
    <div class="message-header">
        <span class="message-role">AI (Gemini 2.5 Pro)</span>
        <span class="message-time">14:30</span>
    </div>
    <div class="message-content markdown-content">
        <!-- Markdownレンダリングされたコンテンツ -->
    </div>
    <div class="message-actions">
        <button class="btn-icon" data-action="copy">📋 コピー</button>
        <button class="btn-icon" data-action="insert">➕ 挿入</button>
        <button class="btn-icon" data-action="regenerate">🔄 再生成</button>
    </div>
</div>

<!-- Streaming Message -->
<div class="message message-assistant streaming">
    <div class="message-header">
        <span class="message-role">AI (Claude 3.5 Sonnet)</span>
        <span class="message-time">14:31</span>
    </div>
    <div class="message-content markdown-content">
        <!-- リアルタイムで更新されるコンテンツ -->
        <span class="typing-indicator">▊</span>
    </div>
    <div class="message-actions">
        <button class="btn-icon" data-action="stop">⏹️ 停止</button>
    </div>
</div>
```

### Session List

```html
<div class="session-list-modal">
    <div class="modal-header">
        <h3>会話履歴</h3>
        <button class="close-btn">×</button>
    </div>
    <div class="modal-content">
        <div class="session-filters">
            <input type="search" placeholder="検索...">
            <select>
                <option value="all">すべて</option>
                <option value="favorites">お気に入り</option>
                <option value="today">今日</option>
                <option value="week">今週</option>
            </select>
        </div>
        <div class="session-items">
            <div class="session-item" data-session-id="xxx">
                <div class="session-info">
                    <h4 class="session-title">文章の要約について</h4>
                    <p class="session-preview">この文章を要約してください...</p>
                    <span class="session-date">2024-01-15 14:30</span>
                </div>
                <div class="session-actions">
                    <button data-action="load">開く</button>
                    <button data-action="favorite">⭐</button>
                    <button data-action="delete">🗑️</button>
                </div>
            </div>
        </div>
    </div>
</div>
```

### Prompt Library

```html
<div class="prompt-library-modal">
    <div class="modal-header">
        <h3>プロンプトライブラリ</h3>
        <button class="btn-primary" id="new-prompt">+ 新規作成</button>
        <button class="close-btn">×</button>
    </div>
    <div class="modal-content">
        <div class="prompt-sidebar">
            <ul class="category-list">
                <li class="active">すべて</li>
                <li>お気に入り</li>
                <li>執筆支援</li>
                <li>コーディング</li>
                <li>翻訳</li>
                <li>その他</li>
            </ul>
        </div>
        <div class="prompt-main">
            <input type="search" placeholder="プロンプトを検索...">
            <div class="prompt-grid">
                <div class="prompt-card">
                    <div class="prompt-header">
                        <h4>ブログ記事作成</h4>
                        <span class="favorite">⭐</span>
                    </div>
                    <p class="prompt-description">
                        トピックからブログ記事を生成
                    </p>
                    <div class="prompt-meta">
                        <span>📂 執筆支援</span>
                        <span>🔢 使用: 25回</span>
                    </div>
                    <div class="prompt-actions">
                        <button data-action="execute">実行</button>
                        <button data-action="edit">編集</button>
                        <button data-action="delete">削除</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
```

## 🔌 API設計

### Gemini Streaming API

```javascript
// エンドポイント
const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;

// リクエスト
const requestBody = {
    contents: [
        {
            role: 'user',
            parts: [{ text: 'こんにちは' }]
        },
        {
            role: 'model',
            parts: [{ text: 'こんにちは！' }]
        },
        {
            role: 'user',
            parts: [{ text: '元気ですか？' }]
        }
    ],
    generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192
    }
};

// SSE応答形式
// data: {"candidates":[{"content":{"parts":[{"text":"元気"}]}}]}
// data: {"candidates":[{"content":{"parts":[{"text":"です"}]}}]}
// data: [DONE]
```

### Claude Streaming API

```javascript
// エンドポイント
const endpoint = 'https://api.anthropic.com/v1/messages';

// リクエスト
const requestBody = {
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 8192,
    stream: true,  // ストリーミング有効化
    messages: [
        {
            role: 'user',
            content: 'こんにちは'
        },
        {
            role: 'assistant',
            content: 'こんにちは！'
        },
        {
            role: 'user',
            content: '元気ですか？'
        }
    ]
};

// ヘッダー
const headers = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01'
};

// SSE応答形式
// event: message_start
// data: {"type":"message_start","message":{"id":"msg_xxx"}}
//
// event: content_block_delta
// data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"元気"}}
//
// event: content_block_delta
// data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"です"}}
//
// event: message_stop
// data: {"type":"message_stop"}
```

## 💾 ストレージ設計

### Chrome Storage (sync)

```javascript
// プロンプトテンプレート（同期）
chrome.storage.sync.set({
    promptTemplates: [
        {
            id: 'template-1',
            name: 'ブログ記事作成',
            prompt: '{{topic}}についてブログ記事を書いてください',
            // ...
        }
    ]
});

// 制限: 最大100KB
```

### Chrome Storage (local)

```javascript
// 最近のセッション（ローカル）
chrome.storage.local.set({
    recentSessions: [
        {
            id: 'session-1',
            title: '文章の要約',
            updatedAt: 1705308600000,
            // 最新10メッセージのみ
            messages: [/* ... */]
        }
    ]
});

// 制限: 最大10MB
```

### IndexedDB

```javascript
// データベース構造
const dbSchema = {
    name: 'SightEditChatDB',
    version: 1,
    stores: [
        {
            name: 'sessions',
            keyPath: 'id',
            indexes: [
                { name: 'createdAt', keyPath: 'createdAt' },
                { name: 'updatedAt', keyPath: 'updatedAt' },
                { name: 'title', keyPath: 'title' },
                { name: 'tags', keyPath: 'tags', multiEntry: true }
            ]
        },
        {
            name: 'messages',
            keyPath: 'id',
            indexes: [
                { name: 'sessionId', keyPath: 'sessionId' },
                { name: 'timestamp', keyPath: 'timestamp' }
            ]
        },
        {
            name: 'promptTemplates',
            keyPath: 'id',
            indexes: [
                { name: 'category', keyPath: 'category' },
                { name: 'lastUsed', keyPath: 'lastUsed' },
                { name: 'usageCount', keyPath: 'usageCount' }
            ]
        }
    ]
};

// 制限: ブラウザ依存（通常50MB〜無制限）
```

### ストレージ優先順位

```javascript
// データ配置戦略
const storageStrategy = {
    // Chrome Storage Sync: 小さい、重要、同期が必要
    sync: [
        'promptTemplates',  // プロンプトテンプレート
        'favorites',        // お気に入り
        'settings'          // 設定
    ],

    // Chrome Storage Local: 中程度、高速アクセス必要
    local: [
        'recentSessions',   // 最近のセッション（10件）
        'aiSettings',       // AI設定
        'uiState'           // UI状態
    ],

    // IndexedDB: 大きい、全履歴
    indexedDB: [
        'allSessions',      // すべてのセッション
        'allMessages',      // すべてのメッセージ
        'backupTemplates'   // プロンプトテンプレートのバックアップ
    ]
};
```

## 🔄 既存コードとの統合

### Editor統合ポイント

```javascript
// editor.html に追加
<div id="chat-panel-container"></div>

// simple-editor.js または新しい editor-init.js
import { ChatPanel } from './chat-panel.js';
import { AIChatManager } from '../lib/ai-chat-manager.js';
import { PromptManager } from '../lib/prompt-manager.js';
import { ChatStorage } from '../lib/chat-storage.js';

// 初期化
const chatStorage = new ChatStorage();
await chatStorage.initDB();

const promptManager = new PromptManager();
await promptManager.loadTemplates();

const chatManager = new AIChatManager(
    window.aiManager,  // 既存のAIManager
    promptManager,
    chatStorage
);

const chatPanel = new ChatPanel(chatManager, promptManager);
chatPanel.render();

// グローバルアクセス用
window.chatPanel = chatPanel;
window.chatManager = chatManager;
```

### ツールバー統合

```javascript
// エディターツールバーにチャットボタンを追加
const chatButton = document.createElement('button');
chatButton.className = 'toolbar-btn';
chatButton.innerHTML = '💬 AI Chat';
chatButton.addEventListener('click', () => {
    window.chatPanel.toggle();
});

toolbar.appendChild(chatButton);
```

### キーボードショートカット

```javascript
// グローバルショートカット
document.addEventListener('keydown', (e) => {
    // Ctrl+K: チャットパネル トグル
    if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        window.chatPanel.toggle();
    }

    // Ctrl+P: プロンプトライブラリ
    if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        window.promptLibrary.show();
    }

    // Ctrl+H: 履歴
    if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        window.chatPanel.showSessionList();
    }
});
```

## ⚡ パフォーマンス最適化

### 1. レンダリング最適化

```javascript
// 仮想スクロール（大量のメッセージ表示）
class VirtualScrollMessages {
    constructor(container, messages) {
        this.container = container;
        this.messages = messages;
        this.visibleRange = { start: 0, end: 20 };
    }

    render() {
        // 表示範囲内のメッセージのみレンダリング
        const visibleMessages = this.messages.slice(
            this.visibleRange.start,
            this.visibleRange.end
        );
        // ...
    }
}
```

### 2. ストリーミング最適化

```javascript
// バッファリングしてバッチ更新
class StreamBuffer {
    constructor(onFlush, flushInterval = 50) {
        this.buffer = '';
        this.onFlush = onFlush;
        this.timer = null;
        this.flushInterval = flushInterval;
    }

    add(chunk) {
        this.buffer += chunk;

        if (!this.timer) {
            this.timer = setTimeout(() => {
                this.flush();
            }, this.flushInterval);
        }
    }

    flush() {
        if (this.buffer) {
            this.onFlush(this.buffer);
            this.buffer = '';
        }
        this.timer = null;
    }
}
```

### 3. IndexedDB最適化

```javascript
// バッチ書き込み
async function batchWrite(store, items) {
    const transaction = db.transaction([store], 'readwrite');
    const objectStore = transaction.objectStore(store);

    const promises = items.map(item => {
        return new Promise((resolve, reject) => {
            const request = objectStore.add(item);
            request.onsuccess = resolve;
            request.onerror = reject;
        });
    });

    await Promise.all(promises);
}

// インデックス活用
async function searchByDate(startDate, endDate) {
    const index = objectStore.index('createdAt');
    const range = IDBKeyRange.bound(startDate, endDate);
    return index.getAll(range);
}
```

### 4. メモリ管理

```javascript
// メッセージ履歴の制限
const MAX_MESSAGES_IN_MEMORY = 100;

function trimMessages(messages) {
    if (messages.length > MAX_MESSAGES_IN_MEMORY) {
        // 最新100件のみメモリに保持
        return messages.slice(-MAX_MESSAGES_IN_MEMORY);
    }
    return messages;
}

// 古いセッションの自動アーカイブ
async function archiveOldSessions() {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const sessions = await chatStorage.getAllSessions();

    const oldSessions = sessions.filter(s =>
        s.updatedAt < thirtyDaysAgo && !s.isFavorite
    );

    // IndexedDBからChrome Storageを削除
    for (const session of oldSessions) {
        await removeFromLocalStorage(session.id);
    }
}
```

## 🔒 セキュリティ設計

### 1. XSS対策

```javascript
// Markdown レンダリング時のサニタイズ
import { marked } from 'marked';
import DOMPurify from 'dompurify';  // 追加依存関係

function renderSafeMarkdown(markdown) {
    const html = marked.parse(markdown);
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', 'pre', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'blockquote'],
        ALLOWED_ATTR: ['href', 'class']
    });
}
```

### 2. データ暗号化（オプション）

```javascript
// 敏感な会話のエクスポート時に暗号化
async function exportEncrypted(sessionId, password) {
    const session = await chatStorage.getSession(sessionId);
    const json = JSON.stringify(session);

    // Web Crypto API で暗号化
    const encrypted = await encryptData(json, password);
    return encrypted;
}

async function encryptData(data, password) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    // パスワードからキーを生成
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: encoder.encode('sightedit-salt'),
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
    );

    // データを暗号化
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        dataBuffer
    );

    return { encrypted, iv };
}
```

### 3. レート制限

```javascript
// API呼び出しのレート制限
class RateLimiter {
    constructor(maxRequests, windowMs) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = [];
    }

    canMakeRequest() {
        const now = Date.now();
        this.requests = this.requests.filter(time =>
            now - time < this.windowMs
        );

        return this.requests.length < this.maxRequests;
    }

    recordRequest() {
        this.requests.push(Date.now());
    }
}

// 使用例
const geminiLimiter = new RateLimiter(60, 60000); // 60req/min
const claudeLimiter = new RateLimiter(50, 60000); // 50req/min
```

## 📦 ビルド設定更新

### webpack.config.js

```javascript
module.exports = {
    entry: {
        background: './src/background/background.js',
        popup: './src/popup/popup.js',
        editor: './src/editor/simple-editor.js',
        'chat-panel': './src/editor/chat-panel.js',  // 追加
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js'
    },
    // ...
};
```

### manifest.json 更新

```json
{
    "manifest_version": 3,
    "permissions": [
        "storage",
        "activeTab"
    ],
    "host_permissions": [
        "https://generativelanguage.googleapis.com/*",
        "https://api.anthropic.com/*"
    ],
    "content_security_policy": {
        "extension_pages": "script-src 'self'; object-src 'self'"
    }
}
```

## 🧪 テスト戦略

### Unit Tests

```javascript
// tests/unit/chat-storage.test.js
describe('ChatStorage', () => {
    test('should save and retrieve session', async () => {
        const storage = new ChatStorage();
        await storage.initDB();

        const session = {
            id: 'test-1',
            title: 'Test Session',
            messages: []
        };

        await storage.saveSession(session);
        const retrieved = await storage.getSession('test-1');

        expect(retrieved.title).toBe('Test Session');
    });
});

// tests/unit/prompt-manager.test.js
describe('PromptManager', () => {
    test('should apply variables to template', () => {
        const manager = new PromptManager();
        const result = manager.applyTemplate(
            '{{topic}}について説明してください',
            { topic: 'AI' }
        );

        expect(result).toBe('AIについて説明してください');
    });
});
```

### Integration Tests

```javascript
// tests/integration/chat-flow.test.js
describe('Chat Flow', () => {
    test('should send message and receive response', async () => {
        const chatManager = new AIChatManager(/*...*/);
        await chatManager.createNewSession();

        const response = await chatManager.sendMessage('こんにちは');

        expect(response).toBeDefined();
        expect(chatManager.currentSession.messages.length).toBe(2);
    });
});
```

## 📝 開発チェックリスト

### Phase 1: コア機能
- [ ] ChatStorage (IndexedDB) 実装
- [ ] AIChatManager 実装
- [ ] StreamingHandler 実装
- [ ] AIManager 拡張（ストリーミング対応）
- [ ] ChatPanel UI 実装
- [ ] 基本的なメッセージ送受信
- [ ] 会話履歴の保存・復元
- [ ] ストリーミング応答表示

### Phase 2: 拡張機能
- [ ] PromptManager 実装
- [ ] PromptLibrary UI 実装
- [ ] カスタムプロンプト作成・編集
- [ ] 文章生成モード実装
- [ ] セッション検索機能
- [ ] タグ付け機能

### Phase 3: 高度な機能
- [ ] コンテキスト管理
- [ ] スタイル制御
- [ ] 構造化生成
- [ ] エクスポート/インポート
- [ ] 暗号化オプション
- [ ] パフォーマンス最適化

## 🔗 次のステップ

設計書承認後、`tasks.md`でタスク分解を行い、実装に移ります。
