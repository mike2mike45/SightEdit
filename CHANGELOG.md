# Changelog

All notable changes to SightEdit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Phase 1.0 - AI Chat Feature (2025-10-24)

#### Added

**コア機能**
- ✨ リアルタイムAIチャット機能
  - ストリーミング応答のサポート（Gemini、Claude）
  - Markdown形式での応答表示
  - XSS保護（DOMPurify統合）
  - コンテキスト連携（なし/選択範囲/ドキュメント全体）

**会話履歴管理**
- 💾 IndexedDB による会話データの永続化
  - 自動保存機能
  - セッション管理（作成、読み込み、削除）
  - お気に入り機能
  - タグ付け機能

**UI コンポーネント**
- 🎨 統合チャットパネル
  - レスポンシブデザイン
  - ダークモード対応
  - 位置調整可能（右/下/フローティング）
  - アニメーション効果

**セッション管理**
- 📋 会話履歴モーダル
  - リアルタイム検索機能
  - フィルター（すべて/お気に入り/今日/今週）
  - プレビュー表示
  - 相対的な日時表示

**キーボードショートカット**
- ⌨️ `Ctrl+K`: チャットパネルのトグル
- ⌨️ `Ctrl+L`: 会話クリア
- ⌨️ `Ctrl+Enter`: メッセージ送信

**技術実装**
- 🔧 新規モジュール
  - `src/lib/chat-storage.js`: IndexedDB ストレージ管理
  - `src/lib/streaming-handler.js`: SSE ストリーミング処理
  - `src/lib/ai-chat-manager.js`: チャット機能のコア管理
  - `src/editor/chat-panel.js`: チャット UI コンポーネント
  - `src/editor/chat-panel.css`: チャットパネルスタイル

- 🔧 拡張モジュール
  - `src/lib/ai-manager.js`: ストリーミング API サポート追加
  - `src/editor/simple-editor.js`: チャット機能統合
  - `src/editor/editor.html`: チャットボタン追加

**テスト & ドキュメント**
- ✅ 統合テストスイート（`tests/integration/chat-e2e.test.js`）
- 📚 AIチャット機能ガイド（`docs/AI_CHAT_FEATURE.md`）
- 📝 CHANGELOG.md 追加

#### Technical Details

**Dependencies**
- Added: `dompurify@^3.0.8` - XSS protection
- Added: `marked@^14.1.2` - Markdown parsing (existing)

**Architecture**
- IndexedDB database: `SightEditChatDB`
  - Object stores: `sessions`, `messages`, `promptTemplates`
  - Indexes: `createdAt`, `updatedAt`, `title`, `tags`, `isFavorite`

**API Support**
- Google Gemini: Streaming via `?alt=sse`
- Anthropic Claude: Streaming via `stream: true`

**Performance**
- Message rendering: < 1000ms for 100 messages
- IndexedDB write: < 3000ms for 50 sessions
- IndexedDB read: < 500ms for all sessions

#### Security

- ✅ All AI responses sanitized with DOMPurify
- ✅ API keys stored securely in Chrome Storage
- ✅ Local-only data storage (IndexedDB)
- ✅ No third-party data transmission

#### Known Limitations

- Phase 2機能（カスタムプロンプト）は未実装
- Phase 3機能（構造化生成、エクスポート）は未実装
- プロンプトライブラリは今後実装予定
- 文章生成モードは今後実装予定

---

## [1.0.0] - 2025-10-23

### Initial Release

**基本機能**
- Markdown エディター（WYSIWYG/ソースモード）
- AI コマンド機能（要約、校正、翻訳など）
- エクスポート機能（HTML、PDF、DOCX）
- バージョン管理・ローカル履歴
- Chrome 拡張機能として動作

**AI プロバイダー**
- Google Gemini サポート
- Anthropic Claude サポート

**エディター機能**
- シンタックスハイライト
- 目次自動生成
- タスクリスト
- テーブル編集
- リンク・画像挿入

---

## Development Roadmap

### Phase 2: 拡張機能（予定）
- カスタムプロンプトテンプレート管理
- プロンプトライブラリ UI
- 文章生成モード
  - 続きを書く
  - 書き直す
  - 展開する
  - 要約する
- スタイル制御（トーン、長さ、対象読者）

### Phase 3: 高度な機能（予定）
- 構造化生成
  - ブログ記事
  - 技術文書
  - プレゼンテーション
- エクスポート/インポート機能
- パフォーマンス最適化
- マルチ言語対応

---

[Unreleased]: https://github.com/mike2mike45/SightEdit/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/mike2mike45/SightEdit/releases/tag/v1.0.0
