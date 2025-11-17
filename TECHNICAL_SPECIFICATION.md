# SightEdit Chrome拡張版 技術仕様書

## 1. プロジェクト概要

### 1.1 基本情報
- **プロジェクト名**: SightEdit Chrome Extension
- **バージョン**: 1.0.0
- **開発元**: DuckEngine LLC
- **ライセンス**: MIT
- **リポジトリ**: https://github.com/mike2mike45/sightedit.git

### 1.2 プロダクト説明
SightEditは、Chrome拡張機能として動作するWYSIWYG Markdownエディターです。AI統合図表生成、チャット機能、バージョン管理など高度な機能を提供するモダンなMarkdown執筆環境です。

## 2. 技術アーキテクチャ

### 2.1 技術スタック
| カテゴリ | 技術 | バージョン | 用途 |
|---------|------|-----------|------|
| **プラットフォーム** | Chrome Extension | Manifest V3 | 拡張機能実装 |
| **開発言語** | JavaScript | ES6+ | メイン言語 |
| **エディター** | contentEditable API | - | WYSIWYG実装 |
| **Markdown変換** | TurndownService | 7.2.1 | HTML→Markdown |
| **Markdownパース** | marked | 14.1.2 | Markdown→HTML |
| **ビルドツール** | Webpack | 5.101.3 | バンドル生成 |
| **トランスパイラ** | Babel | 7.25.8 | ES6→ES5変換 |
| **テストフレームワーク** | Jest | 30.1.3 | 単体テスト |
| **図表生成** | Mermaid.js + Chart.js + SVG | 最新 | AI図表生成 |

### 2.2 依存関係
```json
{
  "dependencies": {
    "docx": "^9.5.1",
    "dompurify": "^3.0.8",
    "html-docx-js": "^0.3.1",
    "html2canvas": "^1.4.1",
    "jspdf": "^3.0.3",
    "mammoth": "^1.11.0",
    "marked": "^14.1.2",
    "markdown-docx": "^1.0.6",
    "turndown": "^7.2.1",
    "unified": "^11.0.4",
    "remark-parse": "^11.0.0",
    "remark-docx": "^0.2.0"
  }
}
```

## 3. プロジェクト構造

### 3.1 ディレクトリ構成
```
SightEdit/
├── src/                    # ソースコード
│   ├── editor/             # エディター本体
│   │   ├── editor.html     # メインエディターUI
│   │   ├── simple-editor.js # エディターコア実装
│   │   ├── chat-panel.js   # AIチャット機能
│   │   ├── local-history-panel.js # ローカル履歴
│   │   └── version-integration.js # バージョン管理
│   ├── lib/                # ライブラリ
│   │   ├── ai-manager.js   # AI機能管理
│   │   ├── diagram-generator.js # 図表生成
│   │   ├── export-manager.js # エクスポート管理
│   │   ├── prompt-manager.js # プロンプト管理
│   │   ├── style-controller.js # スタイル制御
│   │   ├── version-manager.js # バージョン管理
│   │   └── local-history-manager.js # 履歴管理
│   ├── i18n/               # 国際化リソース
│   │   └── ja.json         # 日本語リソース
│   ├── controllers/        # MVC Controllers
│   ├── models/             # データモデル
│   ├── views/              # ビューレイヤー
│   ├── services/           # サービスレイヤー
│   └── core/               # コアシステム
├── dist/                   # ビルド出力
├── assets/                 # 静的リソース
├── tests/                  # テストコード
├── manifest.json           # Chrome拡張マニフェスト
├── webpack.config.js       # Webpack設定
└── package.json            # プロジェクト設定
```

## 4. 主要機能仕様

### 4.1 エディター機能

#### WYSIWYG Markdownエディター
- **リアルタイム変換**: HTML⇄Markdown双方向変換
- **モード切替**: WYSIWYG/ソースモード
- **書式サポート**: 見出し、太字、斜体、取り消し線、コード、リスト、テーブル、引用、リンク、画像
- **ツールバー**: 直感的なフォーマット操作
- **キーボードショートカット**: 効率的な編集操作

#### ファイル操作
- **新規作成**: 空のドキュメントから開始
- **ファイル読み込み**: テキスト/Markdownファイルサポート
- **保存機能**: ローカル/ダウンロード保存
- **ドラッグ&ドロップ**: ファイル直接読み込み
- **自動保存**: 設定可能な自動保存機能

### 4.2 AI統合機能

#### AI APIサポート
- **Gemini API**: Google AI統合（複数モデル対応）
  - gemini-2.0-flash-exp (実験版)
  - gemini-2.5-pro (推奨)
  - gemini-1.5-flash/pro
- **Claude API**: Anthropic AI統合
  - claude-sonnet-4-20250514 (Artifacts対応)

#### AIコマンド機能
- **文書校正**: 誤字脱字、文法チェック
- **要約生成**: 文章の要点抽出
- **翻訳機能**: 多言語翻訳サポート
- **執筆支援**: アイデア展開、文章改善
- **カスタムコマンド**: ユーザー定義プロンプト

#### AIチャット機能
- **リアルタイムチャット**: AI との対話型支援
- **コンテキスト理解**: ドキュメント内容を考慮した回答
- **セッション管理**: 会話履歴の保存・復元
- **プロンプトライブラリ**: 頻用プロンプトの管理

### 4.3 図表生成機能

#### 20種類の図表タイプ
**フローチャート系**
- 🔄 フローチャート (Mermaid)
- 📊 シーケンス図 (Mermaid)
- 📅 ガントチャート (Mermaid)
- 🏊 スイムレーン図 (Mermaid)

**チャート系**
- 📊 棒グラフ (Chart.js)
- 📈 折れ線グラフ (Chart.js)
- 🥧 円グラフ (Mermaid)
- 🍩 ドーナツグラフ (Chart.js)
- 📈 散布図 (Chart.js)

**ビジネス系**
- 🏢 組織図 (Mermaid)
- 🧠 マインドマップ (Mermaid)
- 📋 かんばんボード (SVG)

**UI/デザイン系**
- 📱 ワイヤーフレーム (SVG)
- 🎨 モックアップ (SVG)
- 🎨 アイコン (SVG)

**テクニカル系**
- 🌐 ネットワーク図 (Mermaid)
- 🗄️ データベース設計 (Mermaid)
- 🏗️ アーキテクチャ図 (Mermaid)

**その他**
- 👤 ユーザーペルソナ (SVG)
- 📊 インフォグラフィック (SVG)

#### AI図表生成
- **自然言語入力**: 説明文から図表を自動生成
- **サイズ指定**: 200px〜2000px可変サイズ
- **プレビュー機能**: 生成結果の即座確認
- **エクスポート**: PNG画像/Markdown埋め込み

### 4.4 バージョン管理・履歴機能

#### ローカル履歴管理
- **自動履歴保存**: 編集時の自動スナップショット
- **履歴一覧表示**: タイムスタンプ付き履歴
- **差分表示**: 変更内容のハイライト
- **復元機能**: 任意時点への復元
- **履歴検索**: 日時・内容での検索

#### バージョン管理統合
- **Git連携**: ローカルリポジトリとの統合
- **コミット機能**: エディターから直接コミット
- **ブランチ管理**: 作業ブランチの切り替え
- **マージ機能**: ブランチのマージ操作

### 4.5 エクスポート・インポート機能

#### エクスポート形式
- **Markdown**: 標準Markdown形式
- **HTML**: スタンドアロンHTML
- **PDF**: レイアウト調整済みPDF
- **Word**: .docx形式
- **画像**: PNG/JPEG (html2canvas使用)

#### インポート形式
- **Markdown**: .md/.txt ファイル
- **Word**: .docx ファイル (mammoth.js使用)
- **テキスト**: プレーンテキスト

### 4.6 検索・置換機能

#### 高度な検索機能
- **インクリメンタル検索**: リアルタイム検索
- **正規表現サポート**: パターンマッチング
- **大文字小文字区別**: 設定可能
- **全単語マッチ**: 完全一致検索
- **一括置換**: 全件置換機能

### 4.7 ユーザーインターフェース

#### モダンなデザイン
- **グラデーションヘッダー**: 視覚的に魅力的なヘッダー
- **アイコンベース操作**: 直感的なアイコン操作
- **レスポンシブ対応**: 各種画面サイズ対応
- **ツールチップ**: 機能説明の表示
- **ローディング表示**: 処理状況の可視化

#### 国際化対応
- **多言語サポート**: 日本語/英語対応
- **動的言語切り替え**: リアルタイム言語変更
- **ローカライズ**: UI要素の完全日本語化

## 5. API仕様

### 5.1 AIManager API
```javascript
class AIManager {
  async generateContent(prompt, options = {})
  async testConnection(provider, apiKey, model)
  isConfigured()
  getCurrentProvider()
  setProvider(provider, apiKey, model)
}
```

### 5.2 DiagramGenerator API
```javascript
class DiagramGenerator {
  async generateDiagramCode(type, description, options = {})
  async renderDiagram(type, code, container, options = {})
  convertToMarkdown(type, code)
  async exportAsImage(type, code, format = 'png', options = {})
}
```

### 5.3 VersionManager API
```javascript
class VersionManager {
  saveVersion(content, metadata = {})
  getVersionHistory()
  getVersion(versionId)
  deleteVersion(versionId)
  restoreVersion(versionId)
}
```

### 5.4 ExportManager API
```javascript
class ExportManager {
  async exportAsHTML(content, title = 'Document')
  async exportAsPDF(content, options = {})
  async exportAsWord(content, title = 'Document')
  async exportAsImage(element, format = 'png')
}
```

## 6. 設定・カスタマイズ

### 6.1 AI設定
```javascript
{
  provider: 'gemini|claude',
  apiKey: 'string',
  model: 'string',
  maxTokens: 'number',
  temperature: 'number'
}
```

### 6.2 エディター設定
```javascript
{
  autoSave: 'boolean',
  autoSaveInterval: 'number',
  wordWrap: 'boolean',
  fontSize: 'number',
  theme: 'string',
  language: 'string'
}
```

### 6.3 エクスポート設定
```javascript
{
  defaultFormat: 'markdown|html|pdf|docx',
  pdfOptions: {
    pageSize: 'A4|Letter',
    margin: 'number',
    orientation: 'portrait|landscape'
  }
}
```

## 7. セキュリティ

### 7.1 データセキュリティ
- **ローカル保存**: 機密データはローカルに保存
- **API通信**: HTTPS強制、APIキー暗号化
- **サニタイゼーション**: DOMPurifyによるXSS対策
- **CSP**: Content Security Policy適用

### 7.2 権限管理
- **最小権限**: 必要最小限の権限要求
- **ユーザー制御**: APIキー等はユーザー管理
- **透明性**: データ使用方法の明示

## 8. パフォーマンス

### 8.1 最適化
- **遅延読み込み**: 大型ライブラリの動的読み込み
- **バンドル分割**: 機能別バンドル分離
- **キャッシュ戦略**: ブラウザキャッシュ活用
- **メモリ管理**: イベントリスナーの適切な削除

### 8.2 ベンチマーク
- **起動時間**: <2秒
- **レンダリング**: <100ms
- **ファイル処理**: 10MBまで対応
- **メモリ使用量**: <50MB

## 9. 開発・運用

### 9.1 開発環境
```bash
# 開発サーバー起動
npm run dev

# 本番ビルド
npm run build

# テスト実行
npm test

# ビルドクリーン
npm run clean
```

### 9.2 デプロイ
1. バージョン番号更新 (manifest.json, package.json)
2. `npm run build` で本番ビルド
3. `dist/` フォルダをChrome Web Storeにアップロード
4. リリースノート作成

## 10. 今後の拡張予定

### 10.1 機能拡張
- [ ] リアルタイム共同編集
- [ ] クラウド同期機能
- [ ] プラグインシステム
- [ ] カスタムテーマエディター
- [ ] Webブック出版機能

### 10.2 技術改善
- [ ] TypeScript移行
- [ ] Service Worker最適化
- [ ] WebAssembly活用
- [ ] PWA対応
- [ ] 他ブラウザ対応

---

**更新日**: 2025年1月14日  
**ドキュメントバージョン**: 2.0.0  
**対応ソフトウェアバージョン**: SightEdit v1.0.0