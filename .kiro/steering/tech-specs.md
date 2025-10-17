<!-- Inclusion Mode: Always -->

# SightEdit Chrome Extension - 技術仕様書

## プロジェクト概要

**プロジェクト名**: SightEdit Chrome Extension  
**タイプ**: Chrome Extension (Manifest V3)  
**バージョン**: 3.0.0  
**主要機能**: Visual Markdown Editor with AI機能  
**開発会社**: DuckEngine LLC  
**ライセンス**: MIT  

### 製品概要
Chrome拡張版SightEdit - TipTapベースのWYSIWYG Markdownエディターに AI機能を統合したビジュアルエディター

## アーキテクチャ概要

### Chrome Extension Architecture (Manifest V3)

```
SightEdit Extension
├── Background Service Worker    # background.js
├── Popup UI                    # popup.html/js
├── Content Scripts            # content.js  
├── Editor Page               # editor.html/js
└── AI Integration            # ai-manager.js
```

### 主要コンポーネント
- **Background Service Worker**: 拡張機能のメインロジック、API通信管理
- **Popup Interface**: 拡張機能のメインUI、設定とエディター起動
- **Content Scripts**: Webページとの相互作用
- **Editor Module**: メインMarkdownエディター機能
- **AI Manager**: Gemini/Claude API統合とAI機能管理

## 技術スタック詳細

### フロントエンド技術
- **JavaScript**: ES6+ (Babel transpilation)
- **Editor Engine**: Custom ContentEditable-based WYSIWYG
- **Markdown Parser**: カスタム実装 (marked.js依存)
- **Styling**: Pure CSS (CSS Modules未使用)

### ビルドツール・開発環境
- **Build System**: Webpack 5.101.3
- **Transpiler**: Babel 7.25.8 (@babel/preset-env)
- **Testing**: Jest 30.1.3 + jsdom 27.0.0
- **Package Manager**: npm
- **Linting**: 未設定（要検討）

### Chrome Extension仕様
- **Manifest Version**: 3
- **Permissions**: `storage`, `activeTab`
- **Host Permissions**: 
  - `https://generativelanguage.googleapis.com/*` (Gemini API)
  - `https://api.anthropic.com/*` (Claude API)
- **CSP**: `script-src 'self'; object-src 'self'`

### AI統合技術
- **Google Gemini**: 5モデル対応 (2.0 Flash, 2.5 Pro, 1.5 Flash/Pro)
- **Anthropic Claude**: 5モデル対応 (3.5 Sonnet/Haiku, 3 Opus/Sonnet/Haiku)
- **API通信**: Fetch API, 非同期処理
- **ストレージ**: Chrome Storage API (設定保存)

## ディレクトリ構造

```
src/
├── background/
│   └── background.js          # Service Worker
├── popup/
│   ├── popup.html            # ポップアップUI
│   └── popup.js              # ポップアップロジック
├── editor/
│   ├── editor.html           # エディターページ
│   └── simple-editor.js      # メインエディター
├── content/
│   └── content.js            # コンテンツスクリプト
├── lib/
│   └── ai-manager.js         # AI機能管理
├── common/
│   └── error-handler.js      # 共通エラーハンドリング
└── i18n/
    ├── en.json              # 英語リソース
    └── ja.json              # 日本語リソース

dist/                        # ビルド出力
assets/                      # 静的アセット
```

## 主要コンポーネント詳細

### 1. Editor Engine (simple-editor.js)
- **Base**: ContentEditable-based WYSIWYG
- **Features**: 
  - Bidirectional Markdown ↔ HTML conversion
  - Real-time preview
  - Source/WYSIWYG mode toggle
  - Table support
  - Task lists with checkboxes
  - Syntax highlighting (basic)
- **File Operations**: Open, Save, Save As, New
- **Extensions**: TOC generation, Help system

### 2. AI Manager (ai-manager.js)
- **Provider Support**: Gemini, Claude
- **Model Management**: Dynamic model selection
- **Features**:
  - Text summarization (short/normal/long)
  - Proofreading and correction
  - Translation (JP ↔ EN)
  - Title/heading generation
  - Keyword extraction
  - Style conversion (formal/casual)
  - Custom AI prompts
- **UI**: Modal dialogs, result preview, editor integration

### 3. Markdown Processing
- **Parser**: Custom implementation
- **Supported Syntax**:
  - Headers (h1-h6)
  - Text formatting (bold, italic, strike)
  - Lists (ordered, unordered, tasks)
  - Tables with alignment
  - Code blocks with syntax highlighting
  - Links and images (editable)
  - Blockquotes, horizontal rules
- **HTML Conversion**: Bidirectional with content preservation

## 開発パターンとベストプラクティス

### コード構造パターン
- **Module Pattern**: ES6 modules with explicit exports
- **Class-based Architecture**: OOP approach for main components
- **Event-driven**: DOM event listeners, Chrome Extension messaging
- **Async/Await**: Promise-based API calls

### エラーハンドリング
- **API Errors**: Try-catch with user-friendly messages
- **File Operations**: Graceful degradation
- **Chrome API**: Permission validation, fallback strategies

### 設定管理
- **Storage**: Chrome Storage API (local)
- **Configuration**: JSON-based settings
- **Defaults**: Fallback values for missing configurations

### 国際化 (i18n)
- **Structure**: JSON resource files
- **Languages**: English (en.json), Japanese (ja.json)
- **Implementation**: Manual resource loading

## ビルドシステム (Webpack)

### Entry Points
```javascript
entry: {
  background: './src/background/background.js',
  popup: './src/popup/popup.js', 
  editor: './src/editor/simple-editor.js'
}
```

### Output Configuration
- **Directory**: `dist/`
- **Filename Pattern**: `[name].js`
- **Clean**: Automatic cleanup on build

### Loaders & Processing
- **JavaScript**: Babel loader with ES6+ preset
- **CSS**: style-loader + css-loader
- **HTML**: HtmlWebpackPlugin for popup.html, editor.html

### Plugin Configuration
- **HTML Generation**: Popup and editor pages
- **Asset Copying**: Static assets to dist
- **Source Maps**: Development support

### Build Commands
- **Development**: `npm run dev` (watch mode)
- **Production**: `npm run build`
- **Testing**: `npm test` (Jest)
- **Clean**: `npm run clean`

## API設計パターン

### Chrome Extension APIs
- **Storage**: Configuration persistence
- **Runtime**: Message passing between components
- **ActiveTab**: Content access permissions

### External API Integration
- **Gemini API**:
  - Endpoint pattern: `/v1beta/models/{model}:generateContent`
  - Auth: API key in query parameter
  - Request: JSON with contents array
  - Response: candidates array with content

- **Claude API**:
  - Endpoint: `/v1/messages`
  - Auth: API key in header
  - Request: JSON with model, messages, max_tokens
  - Response: content array with text

### Error Handling Strategy
- **Network Errors**: Retry logic, timeout handling
- **API Errors**: Status code validation, error message parsing
- **User Feedback**: Alert dialogs, status indicators

## セキュリティ考慮事項

### Chrome Extension Security
- **CSP**: Strict content security policy
- **Permissions**: Minimal required permissions
- **Host Permissions**: Limited to required API domains

### API Key Management
- **Storage**: Chrome Storage API (local, encrypted)
- **Validation**: Format validation for API keys
- **Scope**: Per-provider key management

### Content Security
- **Sanitization**: HTML content filtering
- **XSS Prevention**: Content validation in editor

## パフォーマンス最適化

### Build Optimization
- **Code Splitting**: Entry point separation
- **Tree Shaking**: Unused code elimination
- **Minification**: Production build optimization

### Runtime Performance
- **Lazy Loading**: Module loading on demand
- **Memory Management**: Event listener cleanup
- **DOM Operations**: Minimal direct manipulation

## テスト戦略

### Test Framework
- **Unit Testing**: Jest with jsdom
- **Environment**: Browser environment simulation
- **Coverage**: 基本的なテストカバレッジ

### Test Structure
```
tests/
└── unit/
    └── file-validation.test.cjs
```

### テスト対象
- ファイル操作バリデーション
- Markdownパーサー機能
- AI API通信
- UI相互作用

## デプロイメント

### Chrome Web Store公開
1. **ビルド**: `npm run build`
2. **パッケージング**: dist/フォルダのzip化
3. **マニフェスト**: manifest.json検証
4. **アセット**: アイコン、説明文の準備
5. **レビュー**: Chrome Web Storeレビュープロセス

### バージョン管理
- **Semantic Versioning**: Major.Minor.Patch
- **Manifest Version**: manifest.jsonで管理
- **Package Version**: package.jsonと同期

## 今後の開発方針

### 技術債務
- **TypeScript導入**: 型安全性向上
- **Linting Setup**: ESLint/Prettier設定
- **Test Coverage**: テストカバレッジ拡大
- **Bundle Analysis**: Webpack bundle analyzer導入

### 機能拡張
- **TipTap Integration**: より強力なエディターエンジン
- **Plugin System**: 拡張可能な機能アーキテクチャ
- **Cloud Sync**: 設定・ドキュメント同期
- **Collaborative Editing**: リアルタイム共同編集

### パフォーマンス改善
- **Code Splitting**: 動的インポート
- **Service Worker Optimization**: バックグラウンド処理最適化
- **Memory Usage**: メモリリーク対策
- **API Caching**: レスポンス時間短縮

## 開発環境セットアップ

### 必要要件
- **Node.js**: 16+ (ES6+ support)
- **npm**: Package management
- **Chrome Browser**: 拡張機能テスト用
- **VSCode**: 推奨IDE

### セットアップ手順
1. `npm install` - 依存関係インストール
2. `npm run dev` - 開発モード起動
3. Chrome拡張機能管理画面で「デベロッパーモード」有効化
4. `dist/`フォルダを「パッケージ化されていない拡張機能を読み込む」

### 開発ワークフロー
1. ソースコード編集
2. `npm run dev`でウォッチモード
3. Chrome拡張機能でリロード
4. 機能テスト・デバッグ
5. `npm test`でテスト実行
6. `npm run build`で本番ビルド