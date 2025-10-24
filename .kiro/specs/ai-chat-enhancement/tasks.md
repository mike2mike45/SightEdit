# AI機能強化 - タスク分解書

## 📋 タスク概要

このドキュメントは、AI機能強化の実装を具体的なタスクに分解し、実装順序と依存関係を明確にします。

### 開発フェーズ

- **Phase 1**: コア機能（必須）- チャット基本機能
- **Phase 2**: 拡張機能（重要）- プロンプト管理
- **Phase 3**: 高度な機能（推奨）- 高度な生成機能

---

## 🎯 Phase 1: コア機能（必須）

### タスク 1.1: IndexedDB ストレージ基盤の構築

**優先度**: 🔴 最高
**見積もり**: 3-4時間
**依存**: なし

#### 実装内容
1. `src/lib/chat-storage.js` を新規作成
2. IndexedDB初期化処理
   - データベース名: `SightEditChatDB`
   - バージョン: 1
   - Object Stores: `sessions`, `messages`, `promptTemplates`
3. CRUD操作の実装
   - セッション: 作成、取得、更新、削除
   - メッセージ: 追加、取得
4. インデックス設定
   - sessions: `createdAt`, `updatedAt`, `title`, `tags`
   - messages: `sessionId`, `timestamp`

#### 成果物
- `src/lib/chat-storage.js` (約300行)
- テストファイル: `tests/unit/chat-storage.test.js`

#### 検証方法
```javascript
const storage = new ChatStorage();
await storage.initDB();

// セッション作成
const session = await storage.saveSession({
    id: 'test-1',
    title: 'Test Session',
    messages: []
});

// セッション取得
const retrieved = await storage.getSession('test-1');
console.assert(retrieved.title === 'Test Session');
```

#### チェックリスト
- [ ] IndexedDB初期化処理
- [ ] セッションCRUD操作
- [ ] メッセージ追加・取得
- [ ] エラーハンドリング
- [ ] ユニットテスト

---

### タスク 1.2: ストリーミングハンドラーの実装

**優先度**: 🔴 最高
**見積もり**: 4-5時間
**依存**: なし

#### 実装内容
1. `src/lib/streaming-handler.js` を新規作成
2. Gemini ストリーミング実装
   - エンドポイント: `?alt=sse` パラメータ
   - SSE形式のパース
   - チャンク単位でのコールバック
3. Claude ストリーミング実装
   - `stream: true` パラメータ
   - Server-Sent Events処理
   - イベント種別のハンドリング
4. 共通機能
   - AbortController による中断処理
   - エラーハンドリング
   - リトライロジック

#### 成果物
- `src/lib/streaming-handler.js` (約250行)
- テストファイル: `tests/unit/streaming-handler.test.js`

#### API仕様

**Gemini SSE応答例**:
```
data: {"candidates":[{"content":{"parts":[{"text":"こんにちは"}]}}]}
data: {"candidates":[{"content":{"parts":[{"text":"！"}]}}]}
data: [DONE]
```

**Claude SSE応答例**:
```
event: content_block_delta
data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"こんにちは"}}

event: message_stop
data: {"type":"message_stop"}
```

#### チェックリスト
- [ ] Gemini ストリーミング実装
- [ ] Claude ストリーミング実装
- [ ] SSEパーサー
- [ ] AbortController統合
- [ ] エラーハンドリング
- [ ] ユニットテスト

---

### タスク 1.3: AIManager のストリーミング対応拡張

**優先度**: 🔴 最高
**見積もり**: 3-4時間
**依存**: タスク 1.2

#### 実装内容
1. `src/lib/ai-manager.js` に新メソッド追加
2. `callAIWithStreaming()` メソッド
   - StreamingHandlerを使用
   - プロバイダー別の分岐
   - コールバック処理
3. `buildChatMessages()` メソッド
   - マルチターン会話用のメッセージ配列構築
   - Gemini形式とClaude形式の変換
4. `manageTokenLimit()` メソッド
   - トークン数の概算
   - 古いメッセージの削除

#### 成果物
- `src/lib/ai-manager.js` の拡張（+150行）
- テストファイル: `tests/unit/ai-manager-streaming.test.js`

#### 実装例
```javascript
async callAIWithStreaming(messages, onChunk, onComplete, onError) {
    const provider = this.settings.aiProvider;
    const streamingHandler = new StreamingHandler();

    const requestBody = this.buildRequestBody(messages);

    if (provider === 'gemini') {
        await streamingHandler.streamGemini(
            this.getCurrentModel().endpoint,
            this.settings.geminiApiKey,
            requestBody,
            onChunk,
            onComplete,
            onError
        );
    } else if (provider === 'claude') {
        await streamingHandler.streamClaude(
            this.getCurrentModel().endpoint,
            this.settings.claudeApiKey,
            requestBody,
            onChunk,
            onComplete,
            onError
        );
    }
}
```

#### チェックリスト
- [ ] callAIWithStreaming() 実装
- [ ] buildChatMessages() 実装
- [ ] manageTokenLimit() 実装
- [ ] 既存機能との互換性確認
- [ ] ユニットテスト

---

### タスク 1.4: AI チャットマネージャーの実装

**優先度**: 🔴 最高
**見積もり**: 4-5時間
**依存**: タスク 1.1, 1.3

#### 実装内容
1. `src/lib/ai-chat-manager.js` を新規作成
2. セッション管理
   - `createNewSession()`: 新規セッション作成
   - `loadSession()`: 既存セッション読み込み
   - `saveSession()`: セッション保存
   - `deleteSession()`: セッション削除
3. メッセージ送信
   - `sendMessage()`: 通常送信
   - `sendMessageWithStreaming()`: ストリーミング送信
4. コンテキスト管理
   - `getEditorContext()`: エディター内容の取得
   - `buildMessages()`: APIメッセージ構築
5. 履歴管理
   - `getSessions()`: セッション一覧取得
   - `searchSessions()`: セッション検索

#### 成果物
- `src/lib/ai-chat-manager.js` (約400行)
- テストファイル: `tests/unit/ai-chat-manager.test.js`

#### データフロー
```
User Input
    ↓
sendMessageWithStreaming()
    ↓
buildMessages() → [user messages + context]
    ↓
aiManager.callAIWithStreaming()
    ↓
onChunk callback → UI更新
    ↓
onComplete callback → chatStorage.saveSession()
```

#### チェックリスト
- [ ] セッション管理機能
- [ ] メッセージ送信機能
- [ ] コンテキスト取得機能
- [ ] 履歴管理機能
- [ ] エラーハンドリング
- [ ] ユニットテスト

---

### タスク 1.5: チャットパネル UI の基本実装

**優先度**: 🔴 最高
**見積もり**: 6-8時間
**依存**: タスク 1.4

#### 実装内容
1. `src/editor/chat-panel.js` を新規作成
2. HTML構造の生成
   - ヘッダー（セッション、プロンプト、設定ボタン）
   - コンテキストオプション（なし/選択/全体）
   - メッセージコンテナ
   - 入力エリア
3. CSS スタイリング
   - `src/editor/chat-panel.css` を新規作成
   - レスポンシブレイアウト
   - パネル位置の制御（right/bottom/floating）
4. 基本機能
   - `render()`: UI生成
   - `show()` / `hide()` / `toggle()`: 表示制御
   - `addMessage()`: メッセージ追加
   - `updateStreamingMessage()`: ストリーミング更新
5. イベントハンドラー
   - 送信ボタンクリック
   - Ctrl+Enter でメッセージ送信
   - パネルリサイズ

#### 成果物
- `src/editor/chat-panel.js` (約500行)
- `src/editor/chat-panel.css` (約300行)
- テストファイル: `tests/integration/chat-panel.test.js`

#### UI構造
```html
<div class="chat-panel" data-position="right">
    <div class="chat-panel-header">
        <button id="chat-sessions">📋 履歴</button>
        <button id="chat-prompts">📝 プロンプト</button>
        <button id="chat-settings">⚙️</button>
        <button id="chat-close">×</button>
    </div>

    <div class="context-options">
        <label><input type="radio" name="context" value="none" checked> なし</label>
        <label><input type="radio" name="context" value="selection"> 選択</label>
        <label><input type="radio" name="context" value="full"> 全体</label>
    </div>

    <div class="chat-messages" id="chat-messages"></div>

    <div class="chat-input-area">
        <textarea id="chat-input" placeholder="メッセージを入力..."></textarea>
        <button id="chat-send">送信</button>
    </div>
</div>
```

#### チェックリスト
- [ ] HTML構造生成
- [ ] CSS スタイリング
- [ ] 表示制御機能
- [ ] メッセージ表示機能
- [ ] 入力エリア実装
- [ ] イベントハンドラー
- [ ] レスポンシブ対応

---

### タスク 1.6: Markdown レンダリング統合

**優先度**: 🟡 高
**見積もり**: 2-3時間
**依存**: タスク 1.5

#### 実装内容
1. `marked` ライブラリの設定
   - シンタックスハイライト対応
   - テーブルサポート
   - コードブロックの言語指定
2. XSS対策
   - DOMPurify の追加（依存関係）
   - サニタイズ処理の実装
3. Markdownレンダリング関数
   - `renderMarkdown()`: Markdown → HTML変換
   - `renderSafeMarkdown()`: サニタイズ付き変換

#### 成果物
- ChatPanel の `renderMessage()` メソッド拡張
- XSS対策実装

#### 実装例
```javascript
import { marked } from 'marked';
import DOMPurify from 'dompurify';

renderMessage(message) {
    const html = marked.parse(message.content);
    const safe = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', 'pre',
                       'ul', 'ol', 'li', 'h1', 'h2', 'h3',
                       'a', 'blockquote', 'table', 'tr', 'td', 'th'],
        ALLOWED_ATTR: ['href', 'class', 'language']
    });

    const div = document.createElement('div');
    div.className = 'message-content markdown-content';
    div.innerHTML = safe;

    return div;
}
```

#### チェックリスト
- [ ] marked 設定
- [ ] DOMPurify 導入
- [ ] renderMarkdown() 実装
- [ ] XSS対策テスト
- [ ] シンタックスハイライト確認

---

### タスク 1.7: エディター統合とツールバー追加

**優先度**: 🟡 高
**見積もり**: 3-4時間
**依存**: タスク 1.5

#### 実装内容
1. `src/editor/editor.html` の更新
   - チャットパネルコンテナ追加
   - スクリプト読み込み追加
2. `src/editor/simple-editor.js` または新規 `editor-init.js` の更新
   - ChatStorage, AIChatManager, ChatPanel の初期化
   - グローバルオブジェクトの設定
3. ツールバーにチャットボタン追加
   - アイコン: 💬
   - ラベル: "AI Chat"
   - クリックで `chatPanel.toggle()`
4. キーボードショートカット
   - Ctrl+K: チャットパネル トグル
   - Ctrl+L: 会話クリア

#### 成果物
- `src/editor/editor.html` 更新
- `src/editor/editor-init.js` 新規作成（または simple-editor.js 更新）
- ツールバーボタン追加

#### 初期化コード
```javascript
// editor-init.js
import { ChatStorage } from '../lib/chat-storage.js';
import { AIChatManager } from '../lib/ai-chat-manager.js';
import { ChatPanel } from './chat-panel.js';

async function initChatFeature() {
    // ストレージ初期化
    const chatStorage = new ChatStorage();
    await chatStorage.initDB();

    // チャットマネージャー初期化
    const chatManager = new AIChatManager(
        window.aiManager,  // 既存のAIManager
        null,              // PromptManager (Phase 2で追加)
        chatStorage
    );

    // チャットパネル初期化
    const chatPanel = new ChatPanel(chatManager, null);
    chatPanel.render();

    // グローバルアクセス
    window.chatPanel = chatPanel;
    window.chatManager = chatManager;

    // ツールバーボタン追加
    addChatButtonToToolbar();
}

function addChatButtonToToolbar() {
    const toolbar = document.querySelector('.editor-toolbar');
    const chatBtn = document.createElement('button');
    chatBtn.className = 'toolbar-btn';
    chatBtn.innerHTML = '💬 AI Chat';
    chatBtn.addEventListener('click', () => window.chatPanel.toggle());
    toolbar.appendChild(chatBtn);
}

// キーボードショートカット
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        window.chatPanel.toggle();
    }
});

// 初期化実行
initChatFeature();
```

#### チェックリスト
- [ ] editor.html 更新
- [ ] 初期化コード実装
- [ ] ツールバーボタン追加
- [ ] キーボードショートカット
- [ ] 動作確認

---

### タスク 1.8: セッション一覧 UI の実装

**優先度**: 🟡 高
**見積もり**: 4-5時間
**依存**: タスク 1.5, 1.4

#### 実装内容
1. セッション一覧モーダルの実装
   - `showSessionList()` メソッド
   - セッション検索機能
   - フィルター機能（すべて/お気に入り/今日/今週）
2. セッション操作
   - 開く: セッション読み込み
   - お気に入り: isFavoriteトグル
   - 削除: 確認ダイアログ付き削除
3. UI表示
   - セッションタイトル
   - プレビュー（最初のメッセージ）
   - 日時表示
   - タグ表示

#### 成果物
- ChatPanel の `showSessionList()` メソッド
- セッション一覧のCSS

#### UI例
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
            </select>
        </div>
        <div class="session-items">
            <!-- セッションアイテムがここに表示 -->
        </div>
    </div>
</div>
```

#### チェックリスト
- [ ] セッション一覧モーダル
- [ ] 検索機能
- [ ] フィルター機能
- [ ] セッション操作（開く/お気に入り/削除）
- [ ] CSS スタイリング

---

### タスク 1.9: 統合テストと Phase 1 完成

**優先度**: 🔴 最高
**見積もり**: 3-4時間
**依存**: タスク 1.1 〜 1.8

#### 実装内容
1. 統合テストの実施
   - エンドツーエンドのチャットフロー
   - セッション作成 → メッセージ送信 → 保存 → 復元
   - ストリーミング応答の確認
2. パフォーマンステスト
   - 大量メッセージの表示
   - IndexedDB操作の速度
3. バグフィックス
4. ドキュメント更新
   - README.md に使用方法追加
   - CHANGELOG.md 更新

#### 成果物
- 統合テストレポート
- バグフィックス
- ドキュメント更新

#### テストシナリオ
```javascript
// E2E テスト
describe('Chat Feature E2E', () => {
    test('complete chat flow', async () => {
        // 1. チャットパネルを開く
        window.chatPanel.show();

        // 2. メッセージを送信
        await window.chatManager.sendMessageWithStreaming(
            'こんにちは',
            (chunk) => console.log('Chunk:', chunk),
            (fullResponse) => console.log('Complete:', fullResponse)
        );

        // 3. セッションが保存されているか確認
        const sessions = await window.chatManager.getSessions();
        expect(sessions.length).toBeGreaterThan(0);

        // 4. セッションを読み込み
        await window.chatManager.loadSession(sessions[0].id);
        expect(window.chatManager.currentSession.messages.length).toBe(2);
    });
});
```

#### チェックリスト
- [ ] E2Eテスト実施
- [ ] パフォーマンステスト
- [ ] バグフィックス
- [ ] ドキュメント更新
- [ ] Phase 1 完成確認

---

## 🎨 Phase 2: 拡張機能（重要）

### タスク 2.1: プロンプトマネージャーの実装

**優先度**: 🟡 高
**見積もり**: 4-5時間
**依存**: Phase 1 完成

#### 実装内容
1. `src/lib/prompt-manager.js` を新規作成
2. プロンプトテンプレートのCRUD
   - `loadTemplates()`: Chrome Storageから読み込み
   - `saveTemplate()`: テンプレート保存
   - `updateTemplate()`: 更新
   - `deleteTemplate()`: 削除
3. 変数処理
   - `parseVariables()`: `{{variable}}` の抽出
   - `applyTemplate()`: 変数置換
4. カテゴリー管理
   - `getTemplatesByCategory()`
   - `getFavorites()`
5. インポート/エクスポート
   - `exportTemplates()`: JSON形式
   - `importTemplates()`: JSON読み込み
6. デフォルトテンプレート
   - `getDefaultTemplates()`: デフォルトライブラリ

#### 成果物
- `src/lib/prompt-manager.js` (約350行)
- テストファイル: `tests/unit/prompt-manager.test.js`

#### データ構造
```javascript
const promptTemplate = {
    id: 'prompt-001',
    name: 'ブログ記事作成',
    description: 'トピックからブログ記事を生成',
    category: '執筆支援',
    prompt: '{{topic}}について、{{length}}文字程度のブログ記事を書いてください。対象読者は{{audience}}です。',
    variables: [
        {
            name: 'topic',
            type: 'text',
            description: 'ブログのトピック',
            required: true
        },
        {
            name: 'length',
            type: 'number',
            description: '文字数',
            defaultValue: '1000'
        },
        {
            name: 'audience',
            type: 'select',
            description: '対象読者',
            options: ['一般', '専門家', '初心者'],
            defaultValue: '一般'
        }
    ],
    createdAt: Date.now(),
    lastUsed: 0,
    usageCount: 0,
    isFavorite: false
};
```

#### チェックリスト
- [ ] CRUD操作実装
- [ ] 変数パース・置換
- [ ] カテゴリー管理
- [ ] インポート/エクスポート
- [ ] デフォルトテンプレート
- [ ] ユニットテスト

---

### タスク 2.2: デフォルトプロンプトライブラリの作成

**優先度**: 🟡 高
**見積もり**: 2-3時間
**依存**: タスク 2.1

#### 実装内容
1. デフォルトプロンプトの定義
   - 執筆支援（10個）
   - コーディング（5個）
   - 翻訳（5個）
   - その他（5個）

#### 成果物
- PromptManager の `getDefaultTemplates()` 実装

#### デフォルトプロンプト例
```javascript
const defaultTemplates = [
    // 執筆支援
    {
        id: 'default-blog-post',
        name: 'ブログ記事作成',
        category: '執筆支援',
        prompt: '{{topic}}について、以下の構成でブログ記事を書いてください:\n1. 導入\n2. 本文\n3. まとめ\n\n対象読者: {{audience}}\n文字数: {{length}}文字程度',
        variables: [/*...*/]
    },
    {
        id: 'default-seo-optimize',
        name: 'SEO最適化',
        category: '執筆支援',
        prompt: '以下の文章をSEO最適化してください:\n\n{{text}}\n\nターゲットキーワード: {{keywords}}',
        variables: [/*...*/]
    },
    {
        id: 'default-outline',
        name: 'アウトライン生成',
        category: '執筆支援',
        prompt: '{{topic}}について、{{sections}}つのセクションに分けたアウトラインを生成してください。',
        variables: [/*...*/]
    },

    // コーディング
    {
        id: 'default-code-review',
        name: 'コードレビュー',
        category: 'コーディング',
        prompt: '以下のコードをレビューし、改善点を提案してください:\n\n```{{language}}\n{{code}}\n```',
        variables: [/*...*/]
    },
    {
        id: 'default-bug-fix',
        name: 'バグ修正提案',
        category: 'コーディング',
        prompt: '以下のコードのバグを特定し、修正方法を提案してください:\n\n```{{language}}\n{{code}}\n```\n\nエラー: {{error}}',
        variables: [/*...*/]
    },

    // 翻訳
    {
        id: 'default-translate-ja-en',
        name: '日本語→英語翻訳',
        category: '翻訳',
        prompt: '以下の日本語を自然な英語に翻訳してください:\n\n{{text}}',
        variables: [/*...*/]
    },
    {
        id: 'default-translate-en-ja',
        name: '英語→日本語翻訳',
        category: '翻訳',
        prompt: '以下の英語を自然な日本語に翻訳してください:\n\n{{text}}',
        variables: [/*...*/]
    }
];
```

#### チェックリスト
- [ ] 執筆支援プロンプト（10個）
- [ ] コーディングプロンプト（5個）
- [ ] 翻訳プロンプト（5個）
- [ ] その他プロンプト（5個）
- [ ] 変数定義の完成

---

### タスク 2.3: プロンプトライブラリ UI の実装

**優先度**: 🟡 高
**見積もり**: 5-6時間
**依存**: タスク 2.1

#### 実装内容
1. `src/editor/prompt-library.js` を新規作成
2. プロンプトライブラリモーダル
   - カテゴリー別表示
   - 検索機能
   - お気に入りフィルター
3. プロンプトカード表示
   - タイトル、説明、カテゴリー
   - 使用回数、最終使用日時
   - アクション（実行/編集/削除）
4. プロンプト編集ダイアログ
   - 基本情報入力
   - 変数定義エディター
   - プレビュー機能
5. 変数入力ダイアログ
   - 動的フォーム生成
   - バリデーション
   - デフォルト値設定

#### 成果物
- `src/editor/prompt-library.js` (約450行)
- `src/editor/prompt-library.css` (約200行)

#### UI構造
```html
<div class="prompt-library-modal">
    <div class="modal-header">
        <h3>プロンプトライブラリ</h3>
        <button class="btn-primary" id="new-prompt">+ 新規</button>
        <button class="close-btn">×</button>
    </div>
    <div class="modal-content">
        <div class="prompt-sidebar">
            <ul class="category-list">
                <li class="active">すべて</li>
                <li>⭐ お気に入り</li>
                <li>執筆支援</li>
                <li>コーディング</li>
                <li>翻訳</li>
                <li>その他</li>
            </ul>
        </div>
        <div class="prompt-main">
            <input type="search" placeholder="プロンプトを検索...">
            <div class="prompt-grid">
                <!-- プロンプトカード -->
            </div>
        </div>
    </div>
</div>
```

#### チェックリスト
- [ ] プロンプトライブラリモーダル
- [ ] カテゴリー別表示
- [ ] 検索機能
- [ ] プロンプトカード表示
- [ ] 編集ダイアログ
- [ ] 変数入力ダイアログ
- [ ] CSS スタイリング

---

### タスク 2.4: プロンプト実行機能の統合

**優先度**: 🟡 高
**見積もり**: 3-4時間
**依存**: タスク 2.3

#### 実装内容
1. ChatPanel にプロンプトボタン追加
2. プロンプトライブラリ表示
3. プロンプト実行フロー
   - テンプレート選択
   - 変数入力
   - プロンプト生成
   - チャットに送信
4. 使用回数・最終使用日時の更新

#### 成果物
- ChatPanel と PromptLibrary の統合

#### 実行フロー
```javascript
// プロンプト実行
async function executePrompt(templateId) {
    // 1. テンプレート取得
    const template = await promptManager.getTemplate(templateId);

    // 2. 変数入力ダイアログ表示
    const variables = await showVariableInputDialog(template.variables);

    // 3. プロンプト生成
    const prompt = promptManager.applyTemplate(templateId, variables);

    // 4. チャットに送信
    await chatManager.sendMessageWithStreaming(prompt, onChunk, onComplete);

    // 5. 使用回数更新
    await promptManager.updateTemplate(templateId, {
        lastUsed: Date.now(),
        usageCount: template.usageCount + 1
    });
}
```

#### チェックリスト
- [ ] プロンプトボタン追加
- [ ] プロンプトライブラリ表示
- [ ] 実行フロー実装
- [ ] 使用統計更新
- [ ] 動作確認

---

### タスク 2.5: 文章生成モードの実装

**優先度**: 🟢 中
**見積もり**: 4-5時間
**依存**: タスク 2.1

#### 実装内容
1. 文章生成モードの追加
   - 続きを書く
   - 書き直す
   - 展開する
   - 要約する
   - アウトライン生成
   - パラフレーズ
2. 各モードのプロンプトテンプレート
3. コンテキストメニュー統合
   - エディターでテキスト選択時に表示
   - 生成モード選択

#### 成果物
- 文章生成モードの実装
- コンテキストメニューUI

#### プロンプト例
```javascript
const generationModes = {
    continue: {
        name: '続きを書く',
        prompt: '以下の文章の続きを自然に書いてください:\n\n{{text}}'
    },
    rewrite: {
        name: '書き直す',
        prompt: '以下の文章をより良く書き直してください:\n\n{{text}}\n\n改善点: {{focus}}'
    },
    expand: {
        name: '展開する',
        prompt: '以下の文章を詳細に展開してください:\n\n{{text}}'
    },
    summarize: {
        name: '要約する',
        prompt: '以下の文章を{{length}}文字程度で要約してください:\n\n{{text}}'
    },
    outline: {
        name: 'アウトライン生成',
        prompt: '以下のトピックについて、構造化されたアウトラインを生成してください:\n\n{{topic}}'
    },
    paraphrase: {
        name: 'パラフレーズ',
        prompt: '以下の文章を別の表現で書き直してください:\n\n{{text}}'
    }
};
```

#### チェックリスト
- [ ] 生成モード定義
- [ ] プロンプトテンプレート
- [ ] コンテキストメニューUI
- [ ] 各モードの実装
- [ ] 動作確認

---

### タスク 2.6: Phase 2 統合テストと完成

**優先度**: 🟡 高
**見積もり**: 2-3時間
**依存**: タスク 2.1 〜 2.5

#### 実装内容
1. 統合テスト
   - プロンプト管理のフルフロー
   - 変数置換の確認
   - 文章生成モードのテスト
2. ドキュメント更新

#### チェックリスト
- [ ] 統合テスト実施
- [ ] バグフィックス
- [ ] ドキュメント更新
- [ ] Phase 2 完成確認

---

## 🚀 Phase 3: 高度な機能（推奨）

### タスク 3.1: スタイル制御機能の実装

**優先度**: 🟢 中
**見積もり**: 3-4時間
**依存**: Phase 2 完成

#### 実装内容
1. スタイルパラメータの追加
   - トーン（フォーマル/カジュアル/技術的/クリエイティブ）
   - 長さ（短い/標準/長い/カスタム）
   - 対象読者（一般/専門家/初心者/子供向け）
   - 言語（日本語/英語/多言語）
2. スタイル設定UI
3. プロンプトへのスタイル情報追加

#### チェックリスト
- [ ] スタイルパラメータ定義
- [ ] 設定UI実装
- [ ] プロンプト統合

---

### タスク 3.2: 構造化生成機能の実装

**優先度**: 🟢 中
**見積もり**: 4-5時間
**依存**: Phase 2 完成

#### 実装内容
1. 構造化テンプレート
   - ブログ記事
   - 技術文書
   - プレゼン
   - 論文
2. セクション別生成
3. テンプレート選択UI

#### チェックリスト
- [ ] 構造化テンプレート定義
- [ ] セクション別生成
- [ ] UI実装

---

### タスク 3.3: エクスポート/インポート機能

**優先度**: 🟢 中
**見積もり**: 3-4時間
**依存**: Phase 2 完成

#### 実装内容
1. セッションエクスポート
   - JSON形式
   - Markdown形式
2. プロンプトテンプレートのエクスポート/インポート
3. 暗号化オプション（Web Crypto API）

#### チェックリスト
- [ ] JSON エクスポート
- [ ] Markdown エクスポート
- [ ] インポート機能
- [ ] 暗号化オプション

---

### タスク 3.4: パフォーマンス最適化

**優先度**: 🟢 中
**見積もり**: 4-5時間
**依存**: Phase 1, 2 完成

#### 実装内容
1. 仮想スクロール実装（大量メッセージ）
2. ストリーミングバッファリング最適化
3. IndexedDB バッチ操作
4. メモリ管理（メッセージ制限、自動アーカイブ）

#### チェックリスト
- [ ] 仮想スクロール
- [ ] ストリーミング最適化
- [ ] IndexedDB最適化
- [ ] メモリ管理

---

### タスク 3.5: Phase 3 統合テストと最終完成

**優先度**: 🟢 中
**見積もり**: 2-3時間
**依存**: タスク 3.1 〜 3.4

#### 実装内容
1. 全機能の統合テスト
2. パフォーマンステスト
3. 最終ドキュメント作成

#### チェックリスト
- [ ] 統合テスト実施
- [ ] パフォーマンステスト
- [ ] ドキュメント完成
- [ ] Phase 3 完成

---

## 📊 実装進捗管理

### Phase 1 進捗 (0/9)
- [ ] タスク 1.1: IndexedDB ストレージ基盤
- [ ] タスク 1.2: ストリーミングハンドラー
- [ ] タスク 1.3: AIManager 拡張
- [ ] タスク 1.4: AI チャットマネージャー
- [ ] タスク 1.5: チャットパネル UI
- [ ] タスク 1.6: Markdown レンダリング
- [ ] タスク 1.7: エディター統合
- [ ] タスク 1.8: セッション一覧 UI
- [ ] タスク 1.9: 統合テスト

### Phase 2 進捗 (0/6)
- [ ] タスク 2.1: プロンプトマネージャー
- [ ] タスク 2.2: デフォルトプロンプトライブラリ
- [ ] タスク 2.3: プロンプトライブラリ UI
- [ ] タスク 2.4: プロンプト実行機能統合
- [ ] タスク 2.5: 文章生成モード
- [ ] タスク 2.6: 統合テスト

### Phase 3 進捗 (0/5)
- [ ] タスク 3.1: スタイル制御
- [ ] タスク 3.2: 構造化生成
- [ ] タスク 3.3: エクスポート/インポート
- [ ] タスク 3.4: パフォーマンス最適化
- [ ] タスク 3.5: 統合テスト

---

## 📝 実装順序まとめ

### 推奨実装順序
1. **Phase 1 基盤構築** (タスク 1.1 → 1.2 → 1.3)
2. **Phase 1 コア機能** (タスク 1.4 → 1.5 → 1.6)
3. **Phase 1 統合** (タスク 1.7 → 1.8 → 1.9)
4. **Phase 2 プロンプト** (タスク 2.1 → 2.2 → 2.3 → 2.4)
5. **Phase 2 生成機能** (タスク 2.5 → 2.6)
6. **Phase 3 高度機能** (タスク 3.1 〜 3.5)

### 見積もり総計
- **Phase 1**: 32-40時間
- **Phase 2**: 20-26時間
- **Phase 3**: 16-21時間
- **合計**: 68-87時間

---

## 🎯 次のステップ

タスク分解書承認後、Phase 1 から順次実装を開始します。
