# SightEdit Chrome拡張版 技術仕様書

## 1. プロジェクト概要

### 1.1 基本情報
- **プロジェクト名**: SightEdit Chrome Extension
- **バージョン**: 3.0.0
- **開発元**: DuckEngine LLC
- **ライセンス**: MIT
- **リポジトリ**: https://github.com/mike2mike45/sightedit.git

### 1.2 プロダクト説明
SightEditは、Chrome拡張機能として動作するWYSIWYG Markdownエディターです。ブラウザ環境で高度なMarkdown編集機能を提供し、AI機能統合により執筆支援も実現します。

## 2. 技術アーキテクチャ

### 2.1 技術スタック
| カテゴリ | 技術 | バージョン | 用途 |
|---------|------|-----------|------|
| **プラットフォーム** | Chrome Extension | Manifest V3 | 拡張機能実装 |
| **開発言語** | JavaScript | ES6+ | メイン言語 |
| **ビルドツール** | Webpack | 5.101.3 | バンドル生成 |
| **トランスパイラ** | Babel | 7.25.8 | ES6→ES5変換 |
| **テストフレームワーク** | Jest | 30.1.3 | 単体テスト |
| **Markdownパーサー** | marked | 14.1.2 | Markdown処理 |

### 2.2 開発環境依存関係
```json
{
  "@babel/core": "^7.25.8",
  "@babel/preset-env": "^7.25.8",
  "babel-loader": "^9.2.1",
  "copy-webpack-plugin": "^13.0.1",
  "css-loader": "^7.1.2",
  "html-webpack-plugin": "^5.6.4",
  "jest": "^30.1.3",
  "jest-environment-jsdom": "^30.1.2",
  "@types/chrome": "^0.0.278",
  "jsdom": "^27.0.0",
  "rimraf": "^6.0.1",
  "style-loader": "^4.0.0",
  "webpack": "^5.101.3",
  "webpack-cli": "^5.1.4"
}
```

## 3. プロジェクト構造

### 3.1 ディレクトリ構成
```
SightEdit/
├── src/                    # ソースコード
│   ├── background/         # Service Worker
│   │   └── background.js   # バックグラウンド処理
│   ├── popup/             # 拡張機能ポップアップ
│   │   ├── popup.html     # ポップアップUI
│   │   └── popup.js       # ポップアップロジック
│   ├── editor/            # エディター本体
│   │   ├── editor.html    # エディターUI
│   │   └── simple-editor.js # エディターコア実装
│   ├── content/           # Content Script
│   │   └── content.js     # ページ連携機能
│   ├── common/            # 共通モジュール
│   │   └── error-handler.js # エラー処理
│   ├── lib/               # ライブラリ
│   │   └── ai-manager.js  # AI機能管理
│   └── i18n/              # 国際化リソース
├── dist/                  # ビルド出力
├── assets/                # 静的リソース
├── tests/                 # テストコード
├── manifest.json          # Chrome拡張マニフェスト
├── webpack.config.js      # Webpack設定
├── package.json           # プロジェクト設定
└── README.md             # ドキュメント
```

### 3.2 ビルド構成
```javascript
// webpack.config.js
{
  entry: {
    background: './src/background/background.js',
    popup: './src/popup/popup.js',
    editor: './src/editor/simple-editor.js'
  },
  output: {
    path: 'dist/',
    filename: '[name].js'
  }
}
```

## 4. Chrome拡張機能アーキテクチャ

### 4.1 マニフェスト構成
```json
{
  "manifest_version": 3,
  "name": "SightEdit - Visual Markdown Editor",
  "version": "3.0.0",
  "permissions": ["storage", "activeTab"],
  "host_permissions": [
    "https://generativelanguage.googleapis.com/*",
    "https://api.anthropic.com/*"
  ],
  "background": {
    "service_worker": "dist/background.js"
  },
  "action": {
    "default_popup": "dist/popup.html"
  },
  "web_accessible_resources": [{
    "resources": ["dist/editor.html", "dist/*"],
    "matches": ["<all_urls>"]
  }]
}
```

### 4.2 コンポーネント間通信
```
[Popup] ←→ [Background Service Worker] ←→ [Editor Tab]
                    ↓
              [Chrome Storage API]
```

## 5. 主要機能仕様

### 5.1 エディター機能（simple-editor.js）

#### Markdown変換機能
- **Markdown→HTML変換**: リアルタイムレンダリング
- **HTML→Markdown逆変換**: WYSIWYG編集対応
- **双方向同期**: ソースモード/WYSIWYGモード切替

#### サポートするMarkdown記法
| 記法 | 機能 | 実装状況 |
|-----|------|----------|
| 見出し | h1-h6 | ✅ |
| 太字/斜体 | **bold**, *italic* | ✅ |
| 取り消し線 | ~~strike~~ | ✅ |
| コードブロック | ```code``` | ✅ |
| インラインコード | `code` | ✅ |
| リスト | 順序付き/順序なし | ✅ |
| タスクリスト | - [ ] checkbox | ✅ |
| テーブル | \|table\| | ✅ |
| 引用 | > quote | ✅ |
| 水平線 | --- | ✅ |
| リンク | [text](url) | ✅ |
| 画像 | ![alt](url) | ✅ |

#### エディター機能
- ツールバー操作（各種フォーマット）
- キーボードショートカット（Ctrl+S保存等）
- 文字数/単語数カウント
- 目次自動生成
- ファイル操作（新規/開く/保存）

### 5.2 ストレージ管理
```javascript
// Chrome Storage API使用
chrome.storage.sync: 設定データ（言語設定等）
chrome.storage.local: 一時データ（エディター内容等）
```

### 5.3 AI機能統合（予定）
- **Gemini API**: Google AI統合
- **Claude API**: Anthropic AI統合
- **機能**: 文章校正、要約、翻訳、執筆支援

## 6. セキュリティ仕様

### 6.1 Content Security Policy
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

### 6.2 権限管理
- **storage**: 設定とデータの永続化
- **activeTab**: 現在のタブとの連携
- **host_permissions**: AI APIアクセス

## 7. パフォーマンス仕様

### 7.1 バンドルサイズ
- **エディターコア**: ~35KB (simple-editor.js)
- **総バンドルサイズ**: <100KB（目標）

### 7.2 応答性能
- **起動時間**: <1秒
- **Markdown変換**: リアルタイム（<100ms）
- **ファイル処理**: 10MBまで対応

## 8. 開発・運用

### 8.1 開発コマンド
```bash
npm run dev    # 開発モード（watch付き）
npm run build  # 本番ビルド
npm run clean  # ビルドクリーン
npm test       # テスト実行
```

### 8.2 デプロイフロー
1. `npm run build` で本番ビルド生成
2. `dist/`フォルダを Chrome Web Store にアップロード
3. マニフェストバージョン更新

## 9. 今後の拡張計画

### 9.1 機能追加予定
- [ ] AI機能の完全実装
- [ ] クラウド同期機能
- [ ] テーマカスタマイズ
- [ ] プラグインシステム
- [ ] エクスポート機能拡充

### 9.2 技術的改善
- [ ] TypeScript移行
- [ ] React/Vue統合検討
- [ ] WebAssembly活用
- [ ] PWA対応

## 10. 制約事項

### 10.1 Chrome拡張の制約
- Manifest V3による制限
- Service Workerのライフサイクル管理
- CSP制約による外部リソース制限

### 10.2 ブラウザ互換性
- Chrome/Edge: 完全対応
- Firefox: 未対応（Manifest V3差異）
- Safari: 未対応

---

**更新日**: 2024年9月22日
**ドキュメントバージョン**: 1.0.0