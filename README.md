# SightEdit Chrome Extension

**Chrome拡張版SightEdit** - WYSIWYG Markdownエディター with AI機能 + 図生成機能

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green.svg)](https://chrome.google.com/webstore)

## ✨ 主要機能

### 📝 高機能Markdownエディター
- **WYSIWYGモード**: 見たままの編集体験
- **ソースモード**: Markdown記法の直接編集
- **リアルタイムプレビュー**: 入力と同時にフォーマットを確認
- **豊富な編集機能**: 見出し、リスト、引用、コードブロック、表、リンク、画像

### 🤖 AI統合機能
- **マルチプロバイダー対応**: Google Gemini & Anthropic Claude
- **AIチャット**: リアルタイムストリーミング会話、会話履歴管理、コンテキスト連携
- **AI編集機能**: 要約、校正、翻訳、文体変換（20+種類）
- **キーボードショートカット**: `Ctrl+K` (チャット), `Ctrl+L` (クリア), `Ctrl+Enter` (送信)

### 📊 AI図生成機能（NEW!）
- **自然言語から図を生成**: テキストから自動的に図を作成
- **3種類の図形式サポート**:
  - **Mermaid**: フローチャート、シーケンス図、クラス図、ER図、ガントチャート、状態図、円グラフ
  - **Chart.js**: 棒グラフ、折れ線グラフ、円グラフ、ドーナツグラフ、レーダーチャート、散布図
  - **SVG**: カスタムSVG図形（アイコン、図形、イラスト）
- **プロンプトテンプレート**: よく使う図のタイプを選択可能
- **リアルタイムプレビュー**: 生成前に図を確認
- **エディター統合**: WYSIWYGモードとソースモードの両方に対応

### 🖼️ 画像機能
- **Google Drive統合**: OAuth認証、共有リンク対応、画像読み込み
- **ネット画像URL**: 任意のURLから画像を直接挿入
- **ローカルファイル**: PNG, JPG, GIF, SVG, WebP対応

### 📤 エクスポート機能
- **対応形式**: Markdown, HTML, PDF, DOCX, プレーンテキスト
- **サービス別最適化**: WordPress, note, Medium, Zenn, Qiita他

## 🚀 クイックスタート

### インストール

1. **依存関係のインストール**
   ```bash
   npm install
   ```

2. **ビルド**
   ```bash
   npm run build
   ```

3. **Chrome拡張機能として読み込み**
   - Chrome で `chrome://extensions/` を開く
   - 「デベロッパーモード」を有効化
   - 「パッケージ化されていない拡張機能を読み込む」をクリック
   - `dist` フォルダを選択

### AI機能の設定

#### Google Gemini API
1. [Google AI Studio](https://aistudio.google.com/app/apikey) でAPIキーを取得
2. 拡張機能の設定（⚙️アイコン）から「AI設定」タブを開く
3. Gemini APIキーを入力
4. モデルを選択（推奨: Gemini 2.5 Pro）

#### Anthropic Claude API
1. [Anthropic Console](https://console.anthropic.com/account/keys) でAPIキーを取得
2. 拡張機能の設定から「AI設定」タブを開く
3. Claude APIキーを入力（認証不要モデルも利用可能）

## 📋 使用方法

### エディターの起動
1. 拡張機能アイコンをクリック → 「エディターを開く」
2. または、`.md`ファイルをダブルクリック（ファイル関連付け設定後）

### AI図生成機能の使い方

#### 自然言語から図を生成
1. ツールバーの📊アイコンをクリック
2. 「Mermaid」「Chart.js」「SVG」タブから図の種類を選択
3. 自然言語で図の内容を説明（例: 「ユーザー登録からログインまでのフロー図を作成して」）
4. テンプレートを選択（オプション）
5. 「🤖 AIで生成」ボタンをクリック
6. プレビューを確認
7. 「挿入」ボタンでエディターに挿入

#### 対応する図のタイプ

**Mermaid図**:
- フローチャート（処理の流れ）
- シーケンス図（処理の順序）
- クラス図（クラスの関係）
- ER図（データベース設計）
- ガントチャート（スケジュール）
- 状態遷移図（状態の変化）
- 円グラフ（割合）

**Chart.js グラフ**:
- 棒グラフ（比較）
- 折れ線グラフ（推移）
- 円グラフ（割合）
- ドーナツグラフ（割合）
- レーダーチャート（多角的評価）
- 散布図（相関関係）

**SVG図形**:
- アイコン・ロゴ
- 基本図形
- カスタムイラスト

### AIチャット機能
1. 💬アイコンをクリック、または `Ctrl+K` を押す
2. コンテキストを選択（なし/選択範囲/ドキュメント全体）
3. メッセージを入力して送信
4. AIの応答がリアルタイムで表示
5. 📋履歴ボタンで過去の会話を管理

### 画像挿入
1. ツールバーの🖼️アイコンをクリック
2. 「URL」「Google Drive」「ローカル」タブから選択
3. 画像を選択またはURLを入力
4. プレビューで確認して「挿入」

## 🏗️ プロジェクト構造

```
SightEdit/
├── src/
│   ├── background/         # バックグラウンドスクリプト
│   ├── editor/             # エディター本体
│   │   ├── simple-editor.js    # エディタコア
│   │   ├── diagram-generator.js # 図生成機能
│   │   ├── chat-panel.js       # チャットUI
│   │   └── editor.html         # UI定義
│   ├── lib/                # 共通ライブラリ
│   │   ├── ai-manager.js       # AI機能管理
│   │   ├── ai-chat-manager.js  # チャット機能
│   │   └── chat-storage.js     # 会話履歴管理
│   └── popup/              # 拡張機能ポップアップ
├── dist/                   # ビルド出力（Chrome拡張機能）
├── assets/                 # アイコン等のリソース
├── manifest.json           # Chrome拡張機能マニフェスト
├── webpack.config.js       # ビルド設定
└── package.json            # 依存関係

```

## 🛠️ 開発

### スクリプト
```bash
# 開発ビルド（ファイル監視）
npm run dev

# 本番ビルド
npm run build

# distフォルダをクリア
npm run clean

# テスト実行
npm test
```

### 技術スタック
- **Chrome Extension API**: Manifest V3
- **AI統合**: Google Gemini API, Anthropic Claude API
- **図生成**: Mermaid.js, Chart.js
- **Markdown処理**: marked, DOMPurify（XSS保護）
- **ビルドツール**: Webpack 5
- **ストレージ**: Chrome Storage API, IndexedDB（会話履歴）

## 🔒 セキュリティ

- ✅ APIキーはChrome Storage APIで安全に保存
- ✅ AI応答は DOMPurify でサニタイズ
- ✅ XSS攻撃からの保護
- ✅ ローカルデータのみ保存（外部送信なし）
- ✅ ユーザーの同意なしにデータを収集しません

## 📚 ドキュメント

- [機能詳細](FEATURES.md) - 全機能の詳細説明
- [変更履歴](CHANGELOG.md) - バージョン履歴
- [AIチャット機能ガイド](docs/AI_CHAT_FEATURE.md) - チャット機能の詳細
- [技術仕様](TECHNICAL_SPECIFICATION.md) - アーキテクチャとAPI仕様
- [開発者向けガイド](CONTRIBUTING.md) - コントリビューション方法

## 🐛 トラブルシューティング

### 図が挿入されない
- ブラウザのコンソールログを確認（F12 → Console）
- APIキーが正しく設定されているか確認
- プレビューが正常に表示されているか確認

### APIキーが保存されない
- 設定画面を開き直す
- Chrome拡張機能を再読み込み（chrome://extensions/ → 再読み込み）
- ブラウザを再起動

### 画像が表示されない
- Google Driveリンクが「リンクを知っている全員」で共有されているか確認
- ネット画像URLが有効か確認
- CORS問題の可能性（画像サーバーの設定を確認）

## 🤝 コントリビューション

プルリクエストを歓迎します！大きな変更の場合は、まずissueを開いて変更内容を議論してください。

## 📝 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) を参照

## 🙏 謝辞

- [Mermaid.js](https://mermaid.js.org/) - 図表示ライブラリ
- [Chart.js](https://www.chartjs.org/) - グラフライブラリ
- [marked](https://marked.js.org/) - Markdownパーサー
- [DOMPurify](https://github.com/cure53/DOMPurify) - XSS保護
- Google Gemini API & Anthropic Claude API - AI機能

---

**開発**: DuckEngine LLC
**バージョン**: 3.0.0
**最終更新**: 2025年1月
