# SightEdit Technical Steering

## 技術アーキテクチャ

### 🏗️ 技術スタック

#### コア技術
- **プラットフォーム**: Chrome Extension (Manifest V3)
- **開発言語**: JavaScript ES6+
- **ビルドツール**: Webpack 5.101.3
- **トランスパイラ**: Babel 7.25.8
- **テストフレームワーク**: Jest 30.1.3

#### 依存関係
```json
{
  "dependencies": {
    "marked": "^14.1.2"  // Markdown parser
  },
  "devDependencies": {
    "@babel/core": "^7.25.8",
    "@babel/preset-env": "^7.25.8",
    "webpack": "^5.101.3",
    "jest": "^30.1.3"
  }
}
```

### 📁 アーキテクチャパターン

#### Chrome Extension Architecture
```
┌─────────────┐    ┌─────────────────┐    ┌─────────────┐
│   Popup     │    │ Background      │    │   Editor    │
│  (UI管理)    │◄──►│ Service Worker  │◄──►│  (編集画面)  │
│             │    │  (永続処理)      │    │             │
└─────────────┘    └─────────────────┘    └─────────────┘
       │                     │                     │
       └─────────────────────┼─────────────────────┘
                             ▼
                   ┌─────────────────┐
                   │ Chrome Storage  │
                   │    (データ保存)   │
                   └─────────────────┘
```

#### ディレクトリ構造
```
src/
├── background/         # Service Worker
│   └── background.js   # Chrome拡張バックグラウンド処理
├── popup/             # 拡張機能ポップアップ
│   ├── popup.html     # ポップアップUI
│   └── popup.js       # 言語設定、エディター起動
├── editor/            # エディター本体
│   ├── editor.html    # エディターレイアウト
│   └── simple-editor.js # 独自Markdownエンジン
├── content/           # Content Script
│   └── content.js     # ページ連携機能
├── common/            # 共通モジュール
│   └── error-handler.js # 統一エラーハンドリング
├── lib/               # ライブラリ
│   └── ai-manager.js  # AI API統合管理
└── i18n/              # 国際化リソース
    ├── ja.json        # 日本語
    └── en.json        # 英語
```

## 🔧 技術的決定事項

### 1. TipTap → 独自エンジン移行
**決定**: TipTapの代わりに`simple-editor.js`を使用

**理由**:
- Chrome拡張の制約（CSP、バンドルサイズ）
- TipTapの過剰な機能とパフォーマンス負荷
- 完全制御とカスタマイズ性

**実装**: 35KB独立エンジン、完全Markdown変換対応

### 2. AI統合アーキテクチャ
**API統合**:
```javascript
// Gemini API
https://generativelanguage.googleapis.com/v1beta/models/
// Claude API
https://api.anthropic.com/v1/messages
```

**設計原則**:
- APIキー安全管理（Chrome Storage暗号化）
- マルチプロバイダー対応
- レート制限対応
- エラーハンドリング統一

### 3. ストレージ戦略
```javascript
chrome.storage.sync: {
  language: 'ja|en',        // 言語設定
  theme: 'light|dark'       // テーマ設定
}

chrome.storage.local: {
  aiSettings: {             // AI設定
    geminiApiKey: string,
    claudeApiKey: string,
    selectedModel: string
  },
  editorContent: string,    // 一時保存内容
  recentFiles: Array        // 最近使用ファイル
}
```

## 🛡️ セキュリティ要件

### Content Security Policy
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

### API セキュリティ
- **APIキー暗号化**: Chrome Storage安全保存
- **リクエスト検証**: 不正呼び出し防止
- **エラー情報制限**: APIキー漏洩防止
- **レート制限**: 過度な使用制御

### 権限最小化
```json
{
  "permissions": ["storage", "activeTab"],
  "host_permissions": [
    "https://generativelanguage.googleapis.com/*",
    "https://api.anthropic.com/*"
  ]
}
```

## ⚡ パフォーマンス要件

### バンドルサイズ制約
- **エディターコア**: 35KB (simple-editor.js)
- **総バンドル**: <100KB目標
- **依存関係**: 最小限（markedのみ）

### 応答性能
- **起動時間**: <1秒
- **Markdown変換**: <100ms
- **ファイル処理**: 10MBまで
- **メモリ使用**: <50MB

## 🔄 開発ワークフロー

### ビルドプロセス
```bash
npm run dev     # 開発モード（watch）
npm run build   # 本番ビルド
npm run test    # Jest テスト実行
npm run clean   # ビルド成果物削除
```

### Webpack設定
```javascript
entry: {
  background: './src/background/background.js',
  popup: './src/popup/popup.js',
  editor: './src/editor/simple-editor.js'
}
```

### テスト戦略
```javascript
// jest.config.js
{
  testEnvironment: 'node',
  testMatch: ['**/tests/unit/**/*.test.{js,cjs}'],
  collectCoverageFrom: ['src/**/*.js']
}
```

## 🚀 デプロイメント

### Chrome Web Store
1. `npm run build` で dist/ 生成
2. manifest.json バージョン更新
3. Chrome Developer Dashboard アップロード
4. 審査・公開プロセス

### 環境管理
- **Development**: ローカル開発環境
- **Testing**: Jest + Manual Testing
- **Production**: Chrome Web Store

## 🔮 技術的展望

### 短期改善
- [ ] TypeScript導入検討
- [ ] E2Eテスト追加
- [ ] Performance監視

### 中長期展望
- [ ] WebAssembly活用
- [ ] Service Worker最適化
- [ ] Progressive Web App化検討