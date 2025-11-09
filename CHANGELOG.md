# Changelog | 変更履歴

**日本語:** SightEditの主な変更内容を記録します。

**English:** All notable changes to SightEdit are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] | [未リリース]

### Phase 2.0 - AI図生成機能 (2025-01-09) | AI Diagram Generation (2025-01-09)

#### Added | 追加

**AI図生成機能 | AI Diagram Generation Features**

**日本語:**
- ✨ 自然言語からMermaid図を生成
  - フローチャート、シーケンス図、クラス図、ER図、ガントチャート、状態図、円グラフ
  - AIプロンプトテンプレートによる図タイプ選択
  - リアルタイムプレビュー機能
- ✨ Chart.js統合によるグラフ生成
  - 棒グラフ、折れ線グラフ、円グラフ、ドーナツグラフ、レーダーチャート、散布図
  - AI生成設定からグラフを自動作成
  - Canvas to SVG変換機能
- ✨ SVG図形の直接生成
  - カスタムSVGコードの自動生成
  - アイコン、ロゴ、基本図形、イラストに対応

**English:**
- ✨ Generate Mermaid diagrams from natural language
  - Flowcharts, sequence diagrams, class diagrams, ER diagrams, Gantt charts, state diagrams, pie charts
  - Diagram type selection via AI prompt templates
  - Real-time preview functionality
- ✨ Chart.js integration for graph generation
  - Bar charts, line charts, pie charts, doughnut charts, radar charts, scatter plots
  - Auto-generate graphs from AI-generated configs
  - Canvas to SVG conversion
- ✨ Direct SVG graphic generation
  - Auto-generate custom SVG code
  - Support for icons, logos, basic shapes, illustrations

---

**図挿入機能の改善 | Diagram Insertion Improvements**

**日本語:**
- 🐛 Blob URLからdata URIへの変更（永続性の向上）
- 🐛 WYSIWYGモードでの挿入処理の改善
- 🐛 詳細なデバッグログの追加
- 🐛 エラーハンドリングの強化

**English:**
- 🐛 Changed from Blob URL to data URI (improved persistence)
- 🐛 Improved insertion process in WYSIWYG mode
- 🐛 Added detailed debug logging
- 🐛 Enhanced error handling

---

**UI/UX改善 | UI/UX Improvements**

**日本語:**
- 🎨 図生成ダイアログの追加（Mermaid/Chart/SVGタブ）
- 🎨 テンプレート選択機能
- 🎨 プレビュー更新ボタン
- 🎨 挿入ボタンの有効/無効状態管理

**English:**
- 🎨 Added diagram generation dialog (Mermaid/Chart/SVG tabs)
- 🎨 Template selection feature
- 🎨 Preview update button
- 🎨 Insert button enable/disable state management

---

#### Fixed | 修正

**日本語:**
- 🐛 APIキー設定の重複ID問題を修正
  - 古いai-settings-modalダイアログを削除
  - ID重複によるAPIキー取得失敗の解消
- 🐛 図挿入時の画像が表示されない問題を修正
  - Blob URLの問題を解決
  - data URI方式に変更して永続性を確保
- 🐛 カーソル位置外への挿入処理の改善

**English:**
- 🐛 Fixed duplicate ID issue in API key settings
  - Removed old ai-settings-modal dialog
  - Resolved API key retrieval failure due to ID duplication
- 🐛 Fixed issue where diagrams weren't displaying after insertion
  - Resolved Blob URL issues
  - Changed to data URI method for persistence
- 🐛 Improved insertion handling outside cursor position

---

#### Technical Details | 技術的詳細

**Dependencies | 依存関係**

**日本語:**
- Added: `mermaid@^10.x` - Mermaid図レンダリング
- Added: `chart.js@^4.5.1` - Chart.jsグラフ生成

**English:**
- Added: `mermaid@^10.x` - Mermaid diagram rendering
- Added: `chart.js@^4.5.1` - Chart.js graph generation

---

**New Modules | 新規モジュール**

**日本語:**
- `src/editor/diagram-generator.js` - 図生成コアロジック（727行）
  - Mermaid AI生成機能
  - Chart.js AI生成機能
  - SVG AI生成機能
  - プレビュー機能
  - コード抽出機能

**English:**
- `src/editor/diagram-generator.js` - Diagram generation core logic (727 lines)
  - Mermaid AI generation
  - Chart.js AI generation
  - SVG AI generation
  - Preview functionality
  - Code extraction

---

**Updated Modules | 更新モジュール**

**日本語:**
- `src/editor/simple-editor.js` - 図生成機能統合
- `src/editor/editor.html` - 図生成UIの追加
- `src/lib/ai-manager.js` - AI図生成プロンプト対応

**English:**
- `src/editor/simple-editor.js` - Diagram generation integration
- `src/editor/editor.html` - Added diagram generation UI
- `src/lib/ai-manager.js` - AI diagram generation prompt support

---

### Phase 1.0 - AIチャット機能 | AI Chat Feature

#### Added | 追加

**コア機能 | Core Features**

**日本語:**
- ✨ リアルタイムAIチャット機能
  - ストリーミング応答のサポート（Gemini、Claude）
  - Markdown形式での応答表示
  - XSS保護（DOMPurify統合）
  - コンテキスト連携（なし/選択範囲/ドキュメント全体）

**English:**
- ✨ Real-time AI chat functionality
  - Streaming response support (Gemini, Claude)
  - Markdown-formatted response display
  - XSS protection (DOMPurify integration)
  - Context integration (none/selection/entire document)

---

**会話履歴管理 | Conversation History Management**

**日本語:**
- 💾 IndexedDB による会話データの永続化
  - 自動保存機能
  - セッション管理（作成、読み込み、削除）
  - お気に入り機能
  - タグ付け機能

**English:**
- 💾 Conversation data persistence via IndexedDB
  - Auto-save functionality
  - Session management (create, load, delete)
  - Favorite functionality
  - Tagging feature

---

**UI コンポーネント | UI Components**

**日本語:**
- 🎨 統合チャットパネル
  - レスポンシブデザイン
  - ダークモード対応
  - 位置調整可能（右/下/フローティング）
  - アニメーション効果

**English:**
- 🎨 Integrated chat panel
  - Responsive design
  - Dark mode support
  - Adjustable position (right/bottom/floating)
  - Animation effects

---

**セッション管理 | Session Management**

**日本語:**
- 📋 会話履歴モーダル
  - リアルタイム検索機能
  - フィルター（すべて/お気に入り/今日/今週）
  - プレビュー表示
  - 相対的な日時表示

**English:**
- 📋 Conversation history modal
  - Real-time search functionality
  - Filters (all/favorites/today/this week)
  - Preview display
  - Relative date/time display

---

**キーボードショートカット | Keyboard Shortcuts**

**日本語:**
- ⌨️ `Ctrl+K`: チャットパネルのトグル
- ⌨️ `Ctrl+L`: 会話クリア
- ⌨️ `Ctrl+Enter`: メッセージ送信

**English:**
- ⌨️ `Ctrl+K`: Toggle chat panel
- ⌨️ `Ctrl+L`: Clear conversation
- ⌨️ `Ctrl+Enter`: Send message

---

**技術実装 | Technical Implementation**

**新規モジュール | New Modules**

**日本語:**
- 🔧 新規モジュール
  - `src/lib/chat-storage.js`: IndexedDB ストレージ管理
  - `src/lib/streaming-handler.js`: SSE ストリーミング処理
  - `src/lib/ai-chat-manager.js`: チャット機能のコア管理
  - `src/editor/chat-panel.js`: チャット UI コンポーネント
  - `src/editor/chat-panel.css`: チャットパネルスタイル

**English:**
- 🔧 New modules
  - `src/lib/chat-storage.js`: IndexedDB storage management
  - `src/lib/streaming-handler.js`: SSE streaming handler
  - `src/lib/ai-chat-manager.js`: Chat functionality core management
  - `src/editor/chat-panel.js`: Chat UI component
  - `src/editor/chat-panel.css`: Chat panel styles

---

**拡張モジュール | Extended Modules**

**日本語:**
- 🔧 拡張モジュール
  - `src/lib/ai-manager.js`: ストリーミング API サポート追加
  - `src/editor/simple-editor.js`: チャット機能統合
  - `src/editor/editor.html`: チャットボタン追加

**English:**
- 🔧 Extended modules
  - `src/lib/ai-manager.js`: Added streaming API support
  - `src/editor/simple-editor.js`: Chat functionality integration
  - `src/editor/editor.html`: Added chat button

---

**テスト & ドキュメント | Tests & Documentation**

**日本語:**
- ✅ 統合テストスイート（`tests/integration/chat-e2e.test.js`）
- 📚 AIチャット機能ガイド（`docs/AI_CHAT_FEATURE.md`）
- 📝 CHANGELOG.md 追加

**English:**
- ✅ Integration test suite (`tests/integration/chat-e2e.test.js`)
- 📚 AI chat feature guide (`docs/AI_CHAT_FEATURE.md`)
- 📝 Added CHANGELOG.md

---

#### Technical Details | 技術的詳細

**依存関係 | Dependencies**

**日本語:**
- Added: `dompurify@^3.0.8` - XSS保護
- Added: `marked@^14.1.2` - Markdownパース（既存）

**English:**
- Added: `dompurify@^3.0.8` - XSS protection
- Added: `marked@^14.1.2` - Markdown parsing (existing)

---

**アーキテクチャ | Architecture**

**日本語:**
- IndexedDBデータベース: `SightEditChatDB`
  - オブジェクトストア: `sessions`, `messages`, `promptTemplates`
  - インデックス: `createdAt`, `updatedAt`, `title`, `tags`, `isFavorite`

**English:**
- IndexedDB database: `SightEditChatDB`
  - Object stores: `sessions`, `messages`, `promptTemplates`
  - Indexes: `createdAt`, `updatedAt`, `title`, `tags`, `isFavorite`

---

**API サポート | API Support**

**日本語:**
- Google Gemini: `?alt=sse`によるストリーミング
- Anthropic Claude: `stream: true`によるストリーミング

**English:**
- Google Gemini: Streaming via `?alt=sse`
- Anthropic Claude: Streaming via `stream: true`

---

**パフォーマンス | Performance**

**日本語:**
- メッセージレンダリング: 100メッセージで1000ms未満
- IndexedDB書き込み: 50セッションで3000ms未満
- IndexedDB読み込み: 全セッションで500ms未満

**English:**
- Message rendering: < 1000ms for 100 messages
- IndexedDB write: < 3000ms for 50 sessions
- IndexedDB read: < 500ms for all sessions

---

#### Security | セキュリティ

**日本語:**
- ✅ すべてのAI応答をDOMPurifyでサニタイズ
- ✅ APIキーはChrome Storageに安全に保存
- ✅ ローカル専用データストレージ（IndexedDB）
- ✅ サードパーティへのデータ送信なし

**English:**
- ✅ All AI responses sanitized with DOMPurify
- ✅ API keys stored securely in Chrome Storage
- ✅ Local-only data storage (IndexedDB)
- ✅ No third-party data transmission

---

#### Known Limitations | 既知の制限事項

**日本語:**
- Phase 2機能（カスタムプロンプト）は未実装
- Phase 3機能（構造化生成、エクスポート）は未実装
- プロンプトライブラリは今後実装予定
- 文章生成モードは今後実装予定

**English:**
- Phase 2 features (custom prompts) not yet implemented
- Phase 3 features (structured generation, export) not yet implemented
- Prompt library planned for future implementation
- Writing generation mode planned for future implementation

---

## [1.0.0] - 2025-10-23

### Initial Release | 初回リリース

**基本機能 | Basic Features**

**日本語:**
- Markdown エディター（WYSIWYG/ソースモード）
- AI コマンド機能（要約、校正、翻訳など）
- エクスポート機能（HTML、PDF、DOCX）
- バージョン管理・ローカル履歴
- Chrome 拡張機能として動作

**English:**
- Markdown editor (WYSIWYG/Source mode)
- AI command functions (summarize, proofread, translate, etc.)
- Export functionality (HTML, PDF, DOCX)
- Version control and local history
- Works as Chrome extension

---

**AI プロバイダー | AI Providers**

**日本語:**
- Google Gemini サポート
- Anthropic Claude サポート

**English:**
- Google Gemini support
- Anthropic Claude support

---

**エディター機能 | Editor Features**

**日本語:**
- シンタックスハイライト
- 目次自動生成
- タスクリスト
- テーブル編集
- リンク・画像挿入

**English:**
- Syntax highlighting
- Auto-generated table of contents
- Task lists
- Table editing
- Link and image insertion

---

## Development Roadmap | 開発ロードマップ

### Phase 2: 拡張機能（予定） | Extended Features (Planned)

**日本語:**
- カスタムプロンプトテンプレート管理
- プロンプトライブラリ UI
- 文章生成モード
  - 続きを書く
  - 書き直す
  - 展開する
  - 要約する
- スタイル制御（トーン、長さ、対象読者）

**English:**
- Custom prompt template management
- Prompt library UI
- Writing generation mode
  - Continue writing
  - Rewrite
  - Expand
  - Summarize
- Style control (tone, length, target audience)

---

### Phase 3: 高度な機能（予定） | Advanced Features (Planned)

**日本語:**
- 構造化生成
  - ブログ記事
  - 技術文書
  - プレゼンテーション
- エクスポート/インポート機能
- パフォーマンス最適化
- マルチ言語対応

**English:**
- Structured generation
  - Blog posts
  - Technical documentation
  - Presentations
- Export/import functionality
- Performance optimization
- Multi-language support

---

[Unreleased]: https://github.com/mike2mike45/SightEdit/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/mike2mike45/SightEdit/releases/tag/v1.0.0
