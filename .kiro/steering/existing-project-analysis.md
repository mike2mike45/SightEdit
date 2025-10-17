<!-- Inclusion Mode: Manual -->

# 既存プロジェクト分析結果 - SightEdit Chrome Extension

## 分析実行日時
2025年9月22日

## 1. 技術スタック分析

### 主要技術構成
- **プラットフォーム**: Chrome Extension (Manifest V3)
- **JavaScript**: ES6+ (Babel transpilation)
- **ビルドシステム**: Webpack 5.101.3
- **テストフレームワーク**: Jest 30.1.3 + jsdom
- **依存関係**: minimal (marked.jsのみ)

### 設定ファイル詳細
```yaml
webpack.config.js:
  - Entry points: background, popup, editor
  - Babel preset: @babel/preset-env
  - Output: dist/ directory
  - HtmlWebpackPlugin for UI generation

jest.config.js:
  - Test environment: node
  - Test patterns: tests/unit/**/*.test.{js,cjs}
  - Coverage: src/**/*.js excluding tests
  - Setup: tests/setup.cjs

manifest.json:
  - Version: 3.0.0
  - Permissions: storage, activeTab
  - Host permissions: Gemini/Claude APIs
  - CSP: strict script-src 'self'
```

### ライブラリ使用状況
- **marked**: 14.1.2 (Markdown parsing)
- **Build dependencies**: 11個 (Webpack, Babel, Jest関連)
- **Runtime dependencies**: 1個のみ（非常にミニマル）

## 2. フォルダ構造とアーキテクチャパターン

### ディレクトリ構造
```
src/
├── background/          # Service Worker
│   └── background.js    # Chrome Extension background script
├── popup/              # Extension popup UI
│   ├── popup.html      # Popup interface
│   └── popup.js        # Popup logic + i18n
├── editor/             # Main editor functionality
│   ├── editor.html     # Editor UI
│   └── simple-editor.js # ContentEditable-based editor
├── content/            # Content script
│   └── content.js      # Web page interaction
├── lib/                # Shared libraries
│   └── ai-manager.js   # AI functionality (Gemini + Claude)
├── common/             # Common utilities
│   └── error-handler.js # Centralized error handling
└── i18n/               # Internationalization
    ├── en.json         # English resources
    └── ja.json         # Japanese resources
```

### アーキテクチャパターン
- **Modular Chrome Extension**: 機能別分離
- **Layer-based Structure**: UI層, Logic層, Data層の分離
- **Event-driven Architecture**: Chrome Extension messaging
- **Singleton Pattern**: ErrorHandler, AIManager

## 3. API endpoints分析

### 外部API統合
```yaml
Google Gemini API:
  - Base URL: https://generativelanguage.googleapis.com/v1beta/
  - Models: 5種類 (2.0 Flash, 2.5 Pro, 1.5 Flash/Pro)
  - Auth: API key in query parameter
  - Content: JSON request/response

Anthropic Claude API:
  - Base URL: https://api.anthropic.com/v1/
  - Models: 5種類 (3.5 Sonnet/Haiku, 3 Opus/Sonnet/Haiku)
  - Auth: API key in header (x-api-key)
  - Content: Messages format
```

### 内部API通信
- **Chrome Storage API**: 設定データ保存
- **Chrome Runtime API**: メッセージング
- **Chrome Tabs API**: エディター開始
- **Fetch API**: AI API通信

## 4. データ構造（ストレージ）

### Chrome Storage使用パターン
```yaml
chrome.storage.sync:
  - language: "ja" | "en"  # UI言語設定

chrome.storage.local:
  - aiSettings:
      aiProvider: "gemini" | "claude"
      selectedModel: string
      geminiApiKey: string (encrypted)
      claudeApiKey: string (encrypted)
```

### データベース
- **なし**: データベースシステム未使用
- **ストレージ**: Chrome Extension Storage APIのみ
- **永続化**: ブラウザ内ローカルストレージ

## 5. 既存コード規約・パターン分析

### 命名規則
```yaml
Variables:
  - camelCase: currentFileName, isSourceMode
  - Constants: UPPER_SNAKE_CASE (ErrorCodes)
  - Functions: camelCase with descriptive names
  - CSS Classes: kebab-case, BEM-style

Files:
  - kebab-case: simple-editor.js
  - descriptive: error-handler.js, ai-manager.js
```

### コーディングパターン
```javascript
// クラスベース設計
class SimpleMarkdownEditor {
  constructor() {
    this.currentFileName = null;
    this.isSourceMode = false;
    this.init();
  }
}

// ES6 モジュール
export class AIManager {
  // 機能実装
}

// 統一エラーハンドリング
export class AppError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

// 設定管理パターン
async loadSettings() {
  const result = await chrome.storage.local.get(['aiSettings']);
  if (result.aiSettings) {
    this.settings = { ...this.settings, ...result.aiSettings };
  }
}
```

### 国際化パターン
```javascript
const texts = {
  ja: {
    openEditor: 'エディターを開く',
    subtitle: 'Visual Markdown Editor'
  },
  en: {
    openEditor: 'Open Editor',
    subtitle: 'Visual Markdown Editor'
  }
};
```

### エラーハンドリング戦略
- **AppError**: カスタムエラークラス
- **ErrorCodes**: エラーコード定数
- **多言語対応**: ja/en エラーメッセージ
- **ログ機能**: 開発環境でのコンソール出力
- **graceful degradation**: APIエラー時のユーザーフィードバック

## 6. 技術債務・改善点

### 技術債務
```yaml
高優先度:
  - TypeScript未導入: 型安全性の欠如
  - Linting未設定: コード品質管理不足
  - テストカバレッジ低い: basic.test.cjs程度

中優先度:
  - Bundle分析未実装: パフォーマンス最適化不足
  - CDN最適化なし: ライブラリ読み込み非効率
  - ServiceWorker最適化不足: バックグラウンド処理改善余地

低優先度:
  - CSS pre-processor未使用: スタイル管理の改善
  - PWA features未対応: オフライン機能なし
```

### セキュリティ分析
```yaml
Good practices:
  - CSP設定済み: script-src 'self'
  - API key encryption: Chrome Storage使用
  - Permission management: 最小権限の原則

Improvement areas:
  - API key validation: フォーマット検証強化
  - Input sanitization: XSS対策をMarkdownパーサーで
  - HTTPS enforcement: 既に実装済み
```

### パフォーマンス分析
```yaml
Strengths:
  - Minimal dependencies: marked.jsのみ
  - Module-based: 必要時読み込み
  - ContentEditable: 軽量エディター

Bottlenecks:
  - AI API calls: ネットワーク依存
  - Large HTML conversion: Markdownパーサー処理
  - DOM manipulation: エディター操作時
```

## 7. 開発パターン推奨事項

### 新機能開発時の遵守事項
```yaml
Architecture:
  - ES6 modules with explicit exports
  - Class-based components
  - Event-driven messaging
  - Singleton pattern for managers

Error Handling:
  - AppError with structured codes
  - Multilingual error messages
  - Graceful degradation
  - User feedback loops

Testing:
  - Jest unit tests in tests/unit/
  - .test.cjs naming convention
  - Coverage tracking
  - Mock Chrome APIs

Build Process:
  - Webpack development watch
  - Production optimization
  - Babel transpilation
  - Asset copying
```

### 設定管理ベストプラクティス
```yaml
Chrome Storage Pattern:
  - Use chrome.storage.local for settings
  - Use chrome.storage.sync for user preferences
  - Implement default values fallback
  - Validate stored data format

API Integration:
  - Environment-based endpoint configuration
  - API key validation and encryption
  - Rate limiting awareness
  - Error response handling
```

### UI/UX開発ガイドライン
```yaml
Internationalization:
  - Resource-based text management
  - Dynamic language switching
  - Fallback to default language
  - Context-aware translations

Accessibility:
  - Keyboard navigation support
  - Screen reader compatibility
  - High contrast mode
  - Focus management
```

## 8. 今後の発展方向性

### 技術強化ロードマップ
```yaml
Phase 1 (基盤強化):
  - TypeScript migration
  - ESLint + Prettier setup
  - Test coverage expansion
  - Bundle analysis implementation

Phase 2 (機能拡張):
  - TipTap editor integration
  - Plugin system architecture
  - Cloud synchronization
  - Collaborative editing

Phase 3 (スケーラビリティ):
  - Micro-frontend architecture
  - Service Worker optimization
  - PWA capabilities
  - Performance monitoring
```

### アーキテクチャ進化
```yaml
Current: Monolithic Chrome Extension
Target: Modular Plugin-based Architecture

Benefits:
  - Feature isolation
  - Independent testing
  - Gradual migration
  - Third-party extensions
```

## 9. 使用推奨パターン

新しい機能を追加する際は、既存のパターンに従って開発を行うこと：

1. **クラスベース設計**: 機能をクラスでカプセル化
2. **統一エラーハンドリング**: AppError + ErrorCodesを使用
3. **設定管理**: Chrome Storage API + デフォルト値フォールバック
4. **国際化対応**: リソースファイル + 動的言語切り替え
5. **テスト駆動**: Jest unit tests + .test.cjs命名規則

このパターンを遵守することで、コードベースの一貫性と保守性を維持できる。