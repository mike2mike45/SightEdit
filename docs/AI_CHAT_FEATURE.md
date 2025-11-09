# AI チャット機能 - ユーザーガイド | AI Chat Feature - User Guide

## 📋 概要 | Overview

**日本語:**
SightEditのAIチャット機能は、エディター内でAIとリアルタイムに対話できる統合チャットシステムです。文章作成のアシスタントとして、アイデアのブレインストーミング、文章の改善提案、翻訳など、様々なタスクをサポートします。

**English:**
SightEdit's AI chat feature is an integrated chat system that enables real-time conversations with AI within the editor. As a writing assistant, it supports various tasks including brainstorming ideas, suggesting text improvements, translation, and more.

---

## ✨ 主要機能 | Main Features

### 1. リアルタイムチャット | Real-time Chat

**日本語:**
- **ストリーミング応答**: AIの応答をリアルタイムで表示
- **Markdown対応**: 応答内容をリッチテキストで表示
- **XSS保護**: DOMPurifyによる安全なHTML表示

**English:**
- **Streaming responses**: Display AI responses in real-time
- **Markdown support**: Display response content as rich text
- **XSS protection**: Safe HTML display with DOMPurify

---

### 2. コンテキスト連携 | Context Integration

**日本語:**
チャット時にエディターのコンテンツをコンテキストとして送信できます：
- **なし**: コンテキストなしの一般的な会話
- **選択範囲**: エディターで選択したテキストを含める
- **ドキュメント全体**: 編集中のドキュメント全体を含める

**English:**
You can send editor content as context during chat:
- **None**: General conversation without context
- **Selection**: Include selected text in editor
- **Entire document**: Include the entire document being edited

---

### 3. 会話履歴管理 | Conversation History Management

**日本語:**
- **自動保存**: すべての会話を自動的にIndexedDBに保存
- **セッション検索**: キーワードでセッションを検索
- **フィルター機能**: すべて/お気に入り/今日/今週でフィルタリング
- **セッション操作**: 開く/お気に入り/削除

**English:**
- **Auto-save**: Automatically save all conversations to IndexedDB
- **Session search**: Search sessions by keyword
- **Filter function**: Filter by all/favorites/today/this week
- **Session operations**: Open/favorite/delete

---

### 4. マルチAIプロバイダー対応 | Multi-AI Provider Support

**日本語:**
- Google Gemini
- Anthropic Claude
- 設定から簡単に切り替え可能

**English:**
- Google Gemini
- Anthropic Claude
- Easy switching from settings

---

## 🚀 使い方 | How to Use

### チャットパネルを開く | Opening the Chat Panel

**日本語:**
3つの方法でチャットパネルを開けます：

1. **ツールバーボタン**: エディター上部の「💬 Chat」ボタンをクリック
2. **キーボードショートカット**: `Ctrl+K`（Mac: `Cmd+K`）
3. **プログラム**: `window.chatPanel.show()`

**English:**
You can open the chat panel in 3 ways:

1. **Toolbar button**: Click the "💬 Chat" button at the top of the editor
2. **Keyboard shortcut**: `Ctrl+K` (Mac: `Cmd+K`)
3. **Programmatically**: `window.chatPanel.show()`

---

### メッセージを送信 | Sending Messages

**日本語:**
1. チャットパネルの入力欄にメッセージを入力
2. 「送信」ボタンをクリック、または `Ctrl+Enter` で送信
3. AIの応答がリアルタイムで表示されます

**English:**
1. Enter a message in the chat panel input field
2. Click the "Send" button or press `Ctrl+Enter` to send
3. AI responses will be displayed in real-time

---

### コンテキストを選択 | Selecting Context

**日本語:**
チャットパネル上部のオプションから選択：
- ⚪ **コンテキストなし**: 一般的な会話
- ⚪ **選択範囲**: エディターで選択したテキストを含める
- ⚪ **ドキュメント全体**: 編集中のドキュメント全体を含める

**English:**
Select from options at the top of the chat panel:
- ⚪ **No context**: General conversation
- ⚪ **Selection**: Include selected text in editor
- ⚪ **Entire document**: Include the entire document being edited

---

### 会話履歴を管理 | Managing Conversation History

#### セッション一覧を開く | Opening Session List

**日本語:**
- チャットパネルヘッダーの「📋 履歴」ボタンをクリック
- またはキーボードショートカット: `Ctrl+H`

**English:**
- Click the "📋 History" button in the chat panel header
- Or use keyboard shortcut: `Ctrl+H`

---

#### セッションを検索 | Searching Sessions

**日本語:**
- 検索ボックスにキーワードを入力
- タイトルまたはメッセージ内容で検索

**English:**
- Enter a keyword in the search box
- Search by title or message content

---

#### セッションをフィルター | Filtering Sessions

**日本語:**
- **すべて**: すべてのセッションを表示
- **お気に入り**: お気に入りに追加したセッションのみ
- **今日**: 今日更新されたセッション
- **今週**: 過去7日間に更新されたセッション

**English:**
- **All**: Display all sessions
- **Favorites**: Only sessions added to favorites
- **Today**: Sessions updated today
- **This week**: Sessions updated in the past 7 days

---

#### セッション操作 | Session Operations

**日本語:**
- **開く**: セッションを読み込んで会話を再開
- **⭐/☆**: お気に入りに追加/削除
- **削除**: セッションを完全に削除（確認ダイアログあり）

**English:**
- **Open**: Load session and resume conversation
- **⭐/☆**: Add to/remove from favorites
- **Delete**: Completely delete session (with confirmation dialog)

---

### 新しい会話を開始 | Starting a New Conversation

**日本語:**
- チャットパネルヘッダーの「➕」ボタンをクリック
- または「クリア」ボタンで現在の会話をクリア
- キーボードショートカット: `Ctrl+L`（確認ダイアログあり）

**English:**
- Click the "➕" button in the chat panel header
- Or click the "Clear" button to clear the current conversation
- Keyboard shortcut: `Ctrl+L` (with confirmation dialog)

---

### メッセージアクション | Message Actions

**日本語:**
各AIメッセージには以下のアクションがあります：
- **📋 コピー**: メッセージをクリップボードにコピー
- **📝 挿入**: メッセージをエディターに挿入
- **🔄 再生成**: メッセージを再生成（未実装）

**English:**
Each AI message has the following actions:
- **📋 Copy**: Copy message to clipboard
- **📝 Insert**: Insert message into editor
- **🔄 Regenerate**: Regenerate message (not implemented)

---

## ⌨️ キーボードショートカット | Keyboard Shortcuts

| ショートカット / Shortcut | 機能 / Function |
|--------------|------|
| `Ctrl+K` / `Cmd+K` | チャットパネルのトグル（開く/閉じる） / Toggle chat panel (open/close) |
| `Ctrl+L` / `Cmd+L` | 会話をクリア / Clear conversation |
| `Ctrl+H` / `Cmd+H` | 会話履歴を開く（Phase 1.8で実装） / Open conversation history (Phase 1.8) |
| `Ctrl+P` / `Cmd+P` | プロンプトライブラリを開く（Phase 2で実装） / Open prompt library (Phase 2) |
| `Ctrl+Enter` | メッセージを送信 / Send message |

---

## 🔧 設定 | Settings

### AI プロバイダーの設定 | AI Provider Settings

**日本語:**
1. チャットパネルヘッダーの「⚙️」ボタンをクリック
2. AIプロバイダーを選択（Gemini または Claude）
3. APIキーとモデルを設定
4. 「保存」をクリック

**English:**
1. Click the "⚙️" button in the chat panel header
2. Select AI provider (Gemini or Claude)
3. Configure API key and model
4. Click "Save"

---

### ストレージ管理 | Storage Management

**日本語:**
会話データは以下に保存されます：
- **IndexedDB**: すべての会話履歴（無制限）
- **Chrome Storage (local)**: 最近の設定とセッション情報

**English:**
Conversation data is saved to:
- **IndexedDB**: All conversation history (unlimited)
- **Chrome Storage (local)**: Recent settings and session information

---

## 💡 使用例 | Usage Examples

### 例1: 文章の改善を依頼 | Example 1: Requesting Text Improvement

**日本語:**
1. エディターで改善したい文章を選択
2. コンテキストオプションで「選択範囲」を選択
3. チャットで「この文章をもっと分かりやすく書き直してください」と送信
4. AIの提案を確認し、気に入ったら「📝 挿入」ボタンでエディターに挿入

**English:**
1. Select the text you want to improve in the editor
2. Select "Selection" in context options
3. Send "Please rewrite this text to make it clearer" in chat
4. Review AI's suggestions and click "📝 Insert" button to insert into editor if you like it

---

### 例2: ブログ記事のアイデア出し | Example 2: Brainstorming Blog Post Ideas

**日本語:**
1. コンテキストオプションで「コンテキストなし」を選択
2. 「〇〇についてのブログ記事のアイデアを5つ提案してください」と送信
3. 気に入ったアイデアをエディターに挿入

**English:**
1. Select "No context" in context options
2. Send "Please suggest 5 blog post ideas about XX"
3. Insert ideas you like into the editor

---

### 例3: 技術文書の作成 | Example 3: Creating Technical Documentation

**日本語:**
1. コンテキストオプションで「ドキュメント全体」を選択
2. 「現在の内容を元に、API仕様書を作成してください」と送信
3. AIが現在のドキュメント全体を理解して仕様書を生成

**English:**
1. Select "Entire document" in context options
2. Send "Please create an API specification based on the current content"
3. AI understands the entire current document and generates specifications

---

### 例4: 過去の会話を再開 | Example 4: Resuming Past Conversations

**日本語:**
1. 「📋 履歴」ボタンで会話履歴を開く
2. 検索またはフィルターで目的のセッションを見つける
3. 「開く」ボタンでセッションを読み込む
4. 会話の続きを開始

**English:**
1. Open conversation history with the "📋 History" button
2. Find the desired session using search or filter
3. Load the session with the "Open" button
4. Start continuing the conversation

---

## 🔒 プライバシーとセキュリティ | Privacy and Security

**日本語:**
- **ローカル保存**: すべての会話データはローカルのIndexedDBに保存されます
- **APIキーの安全性**: APIキーはChrome Storageに暗号化されて保存されます
- **XSS保護**: DOMPurifyによりすべてのHTML出力を自動的にサニタイズ
- **データ削除**: 不要なセッションはいつでも完全に削除できます

**English:**
- **Local storage**: All conversation data is stored in local IndexedDB
- **API key security**: API keys are encrypted and stored in Chrome Storage
- **XSS protection**: All HTML output is automatically sanitized with DOMPurify
- **Data deletion**: Unnecessary sessions can be completely deleted at any time

---

## 🐛 トラブルシューティング | Troubleshooting

### チャットパネルが表示されない | Chat Panel Not Displaying

**日本語:**
1. ページを再読み込みしてください
2. ブラウザのコンソールでエラーを確認してください
3. `window.chatPanel` が存在するか確認してください

**English:**
1. Reload the page
2. Check for errors in the browser console
3. Verify that `window.chatPanel` exists

---

### メッセージが送信できない | Cannot Send Messages

**日本語:**
1. AI設定を確認してください（⚙️ボタン）
2. APIキーが正しく設定されているか確認してください
3. ネットワーク接続を確認してください
4. コンソールでエラーメッセージを確認してください

**English:**
1. Check AI settings (⚙️ button)
2. Verify that the API key is correctly configured
3. Check network connection
4. Check error messages in the console

---

### 会話履歴が表示されない | Conversation History Not Displaying

**日本語:**
1. IndexedDBが有効か確認してください
2. ブラウザのストレージ容量を確認してください
3. コンソールで `await window.chatStorage.getAllSessions()` を実行してセッション数を確認してください

**English:**
1. Verify that IndexedDB is enabled
2. Check browser storage capacity
3. Run `await window.chatStorage.getAllSessions()` in console to check session count

---

### ストリーミングが動作しない | Streaming Not Working

**日本語:**
1. 選択したAIプロバイダーがストリーミングをサポートしているか確認してください
2. ネットワーク接続が安定しているか確認してください
3. APIキーの権限を確認してください

**English:**
1. Verify that the selected AI provider supports streaming
2. Ensure network connection is stable
3. Check API key permissions

---

## 📊 統合テスト | Integration Testing

### ブラウザコンソールでのテスト | Testing in Browser Console

**日本語:**
エディターページを開いて、コンソールで以下を実行：

**English:**
Open the editor page and run the following in the console:

```javascript
// すべてのテストを実行 / Run all tests
await runAllTests()

// 統合テストのみ / Integration tests only
await runPhase1IntegrationTest()

// パフォーマンステストのみ / Performance tests only
await runPerformanceTest()
```

---

### テスト項目 | Test Items

**日本語:**
- ✅ 初期化確認
- ✅ IndexedDB接続
- ✅ セッション作成・保存・読み込み
- ✅ セッション検索
- ✅ UI コンポーネント
- ✅ Markdown レンダリング
- ✅ XSS保護
- ✅ パフォーマンス（メッセージ表示、DB操作）

**English:**
- ✅ Initialization verification
- ✅ IndexedDB connection
- ✅ Session create/save/load
- ✅ Session search
- ✅ UI components
- ✅ Markdown rendering
- ✅ XSS protection
- ✅ Performance (message display, DB operations)

---

## ✅ Phase 2: プロンプト管理機能（完了） | Phase 2: Prompt Management Features (Completed)

**日本語:**
Phase 2の機能がすべて実装されました！詳細は [Phase 2 プロンプト管理機能ガイド](./PHASE2_PROMPT_MANAGEMENT.md) をご覧ください。

**English:**
All Phase 2 features have been implemented! See [Phase 2 Prompt Management Feature Guide](./PHASE2_PROMPT_MANAGEMENT.md) for details.

---

### 実装済み機能 | Implemented Features

**日本語:**
- ✅ カスタムプロンプトテンプレート管理（CRUD操作）
- ✅ プロンプトライブラリUI（検索、フィルター、カテゴリー分類）
- ✅ 25種類のデフォルトテンプレート
- ✅ 変数システム（`{{変数名}}` 形式）
- ✅ 文章生成モード（続きを書く、書き直す、展開する、要約する、パラフレーズ、アウトライン生成）
- ✅ インポート/エクスポート機能（JSON形式）
- ✅ お気に入り機能
- ✅ 最近使用したテンプレート
- ✅ ダークモード対応

**English:**
- ✅ Custom prompt template management (CRUD operations)
- ✅ Prompt library UI (search, filter, category classification)
- ✅ 25 default templates
- ✅ Variable system (`{{variable}}` format)
- ✅ Writing generation modes (continue, rewrite, expand, summarize, paraphrase, outline generation)
- ✅ Import/export functionality (JSON format)
- ✅ Favorites feature
- ✅ Recently used templates
- ✅ Dark mode support

---

## 🚧 今後の機能（Phase 3） | Future Features (Phase 3)

### Phase 3: 高度な機能 | Advanced Features

**日本語:**
- スタイル制御（トーン、長さ、対象読者）
- 構造化生成（ブログ記事、技術文書、プレゼン）
- テンプレートのバージョン管理とコミュニティ共有
- AI による自動テンプレート提案
- パフォーマンス最適化
- マルチ言語対応

**English:**
- Style control (tone, length, target audience)
- Structured generation (blog posts, technical documents, presentations)
- Template version control and community sharing
- AI-powered automatic template suggestions
- Performance optimization
- Multi-language support

---

## 📝 フィードバック | Feedback

**日本語:**
問題や改善提案がある場合は、GitHubのIssueでお知らせください。

**English:**
If you have any issues or suggestions for improvement, please let us know via GitHub Issues.

---

**バージョン | Version**: Phase 2.0

**最終更新 | Last Updated**: 2025-10-24
