# SightEdit Chrome Extension

Chrome拡張版SightEdit - TipTapベースのWYSIWYG Markdownエディター with AI機能

## 🚀 機能

### ✨ エディター機能
- **WYSIWYG Markdownエディター**: TipTapベースの高機能エディター
- **リアルタイムプレビュー**: 入力と同時にフォーマットを確認
- **豊富な編集機能**: 見出し、リスト、引用、コードブロック、表などをサポート
- **ツールバー**: 直感的な操作でMarkdown要素を挿入

### 🤖 AI機能
- **マルチプロバイダー対応**: Gemini（デフォルト）& Claude
- **Geminiモデル**:
  - Gemini 2.5 Pro（推奨・無料枠あり）
  - Gemini 2.0 Flash（最新・無料枠あり）
  - Gemini 1.5 Flash（高速・無料枠あり）
- **Claudeモデル**:
  - Claude 3.5 Sonnet（最新・2024年10月版）
  - Claude 3.5 Haiku（高速・2024年10月版）
  - Claude 3 Opus（高性能）

### 🎯 AI機能一覧
- 📝 **要約**: テキストの要約生成
- ✏️ **校正**: 誤字脱字・文法チェック
- 🌐 **翻訳**: 多言語翻訳
- 📋 **タイトル生成**: 適切なタイトル提案
- 📑 **見出し生成**: 構造化された見出し提案
- 🏷️ **キーワード抽出**: 重要キーワードの抽出

### 📤 エクスポート機能
- Markdown形式
- HTML形式
- プレーンテキスト形式

## 🛠️ インストール

### 開発版セットアップ

1. **リポジトリをクローン**
```bash
git clone https://github.com/mike2mike45/SightEdit.git
cd SightEdit
```

2. **依存関係をインストール**
```bash
npm install
```

3. **ビルド**
```bash
npm run build
```

4. **Chrome拡張として読み込み**
   - Chrome で `chrome://extensions/` を開く
   - 「デベロッパーモード」を有効にする
   - 「パッケージ化されていない拡張機能を読み込む」をクリック
   - プロジェクトフォルダを選択

## 🔧 開発

### スクリプト
```bash
# 開発ビルド（ファイル監視）
npm run dev

# 本番ビルド
npm run build

# distフォルダをクリア
npm run clean
```

### プロジェクト構造
```
src/
├── background/         # バックグラウンドスクリプト
├── content/           # コンテンツスクリプト
├── editor/            # メインエディター
├── lib/               # 共通ライブラリ
│   └── ai-manager.js  # AI機能管理
└── popup/             # ポップアップUI
```

## ⚙️ AI設定

### Gemini API
1. [Google AI Studio](https://aistudio.google.com/app/apikey) でAPIキーを取得
2. 拡張機能の設定からAPIキーを入力
3. AIza...で始まるAPIキーを使用

### Claude API
1. [Anthropic Console](https://console.anthropic.com/account/keys) でAPIキーを取得
2. 拡張機能の設定からAPIキーを入力
3. sk-ant-...で始まるAPIキーを使用

## 📋 使用方法

### エディターの起動
1. **拡張機能アイコンをクリック** → 「エディターを開く」
2. **ポップアップから** → メインボタンをクリック
3. **ページ内のフローティングボタン** → 📝アイコンをクリック

### AI機能の使用
1. テキストを選択
2. 🤖 AIボタンをクリック
3. 実行したい機能を選択
4. 結果を確認・コピー・挿入

### エクスポート
1. 📤 エクスポートボタンをクリック
2. 形式を選択（Markdown/HTML/テキスト）
3. ファイルがダウンロードされます

## 🔒 セキュリティ

- APIキーはローカルストレージに暗号化されて保存
- 外部サーバーへのデータ送信なし（AI API除く）
- ユーザーの同意なしにデータを収集しません

## Features

