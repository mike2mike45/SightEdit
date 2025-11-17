# SightEdit - Visual Markdown Editor

![SightEdit Logo](assets/icon128.png)

**SightEdit**は、AI統合型のWYSIWYG Markdownエディターです。Chrome拡張機能として動作し、図表生成、チャット機能、バージョン管理など豊富な機能を提供します。

## 🚀 主な機能

### ✨ WYSIWYG Markdownエディター
- **リアルタイム変換**: HTML⇄Markdown双方向変換
- **モード切替**: WYSIWYG/ソースモード
- **豊富なフォーマット**: 見出し、太字、斜体、コード、リスト、テーブルなど完全対応
- **直感的ツールバー**: ワンクリックでフォーマット適用
- **ドラッグ&ドロップ**: ファイル直接読み込み対応

### 🤖 AI統合機能
- **複数AI対応**: Gemini API、Claude API対応
- **AIコマンド**: 校正、要約、翻訳、執筆支援
- **リアルタイムチャット**: AI との対話型支援
- **コンテキスト理解**: ドキュメント内容を考慮した支援
- **プロンプトライブラリ**: 頻用プロンプトの管理

### 📊 AI図表生成（20種類）
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

### 📁 バージョン管理・履歴
- **ローカル履歴**: 自動スナップショット、差分表示、復元機能
- **タイムスタンプ管理**: 編集履歴の詳細管理
- **検索機能**: 日時・内容での履歴検索
- **Git統合**: ローカルリポジトリ連携（オプション）

### 📤 エクスポート・インポート
- **エクスポート**: Markdown、HTML、PDF、Word、画像
- **インポート**: Markdown、Word、テキストファイル
- **一括エクスポート**: 複数形式での同時出力

### 🔍 高度な検索・置換
- **インクリメンタル検索**: リアルタイム検索
- **正規表現サポート**: パターンマッチング
- **大文字小文字区別**: 設定可能な検索オプション
- **一括置換**: 全件置換機能

### 🎨 モダンなUI
- **グラデーションヘッダー**: 視覚的に魅力的なデザイン
- **アイコンベース操作**: 直感的なアイコン操作
- **レスポンシブ対応**: 各種画面サイズ対応
- **ツールチップ**: 機能説明の表示

## 🛠 技術スタック

- **プラットフォーム**: Chrome Extension (Manifest V3)
- **言語**: JavaScript (ES6+)
- **エディター**: contentEditable API
- **Markdown**: TurndownService, marked
- **AI図表**: Mermaid.js, Chart.js, SVG
- **ビルド**: Webpack 5, Babel
- **テスト**: Jest

## 📥 インストール

### Chrome Web Store（推奨）
1. [Chrome Web Store](https://chrome.google.com/webstore)でSightEditを検索
2. 「Chromeに追加」をクリック

### 開発版インストール
```bash
# リポジトリをクローン
git clone https://github.com/mike2mike45/sightedit.git
cd sightedit

# 依存関係をインストール
npm install

# ビルド
npm run build

# Chromeで拡張機能をロード
# 1. chrome://extensions/ を開く
# 2. デベロッパーモードを有効化
# 3. 「パッケージ化されていない拡張機能を読み込む」
# 4. dist/ フォルダを選択
```

## 📋 プロジェクト構造

```
SightEdit/
├── src/                    # ソースコード
│   ├── editor/             # エディター本体
│   │   ├── editor.html     # メインエディターUI
│   │   ├── simple-editor.js # エディターコア実装
│   │   ├── chat-panel.js   # AIチャット機能
│   │   └── local-history-panel.js # ローカル履歴
│   ├── lib/                # ライブラリ
│   │   ├── ai-manager.js   # AI機能管理
│   │   ├── diagram-generator.js # 図表生成
│   │   ├── export-manager.js # エクスポート管理
│   │   ├── prompt-manager.js # プロンプト管理
│   │   ├── version-manager.js # バージョン管理
│   │   └── local-history-manager.js # 履歴管理
│   ├── i18n/               # 国際化リソース
│   │   └── ja.json         # 日本語リソース
│   └── core/               # コアシステム
├── dist/                   # ビルド出力
├── assets/                 # 静的リソース
├── tests/                  # テストコード
├── manifest.json           # Chrome拡張マニフェスト
├── webpack.config.js       # Webpack設定
└── package.json            # プロジェクト設定
```

## 🚀 使い方

### 基本操作
1. Chrome拡張アイコンをクリック
2. 「エディターを開く」を選択
3. WYSIWYG/ソースモードで編集
4. ツールバーで書式設定

### AI機能の設定
1. 「⚙️ 設定」ボタンをクリック
2. AI設定タブを選択
3. APIキーを設定
   - **Gemini API**: [Google AI Studio](https://aistudio.google.com/app/apikey)
   - **Claude API**: [Anthropic Console](https://console.anthropic.com/account/keys)
4. モデルを選択して保存

### 図表生成
1. 「📊 図表」ボタンをクリック
2. 20種類から図表タイプを選択
3. 自然言語で説明を入力
4. サイズを調整（200px〜2000px）
5. 「🎨 生成」→プレビュー→挿入

### AIチャット
1. 「💬 Chat」ボタンをクリック、または `Ctrl+K`
2. コンテキストオプションを選択
3. メッセージを入力して送信
4. リアルタイムでAI応答を確認

### バージョン履歴
1. 自動でスナップショット作成
2. 履歴パネルでタイムライン表示
3. 差分確認、復元可能

### エクスポート
1. 「📤 エクスポート」ボタンをクリック
2. 形式を選択（Markdown/HTML/PDF/DOCX/画像）
3. ダウンロード開始

## ⌨️ キーボードショートカット

- `Ctrl+S`: 保存
- `Ctrl+F`: 検索
- `Ctrl+H`: 置換
- `Ctrl+K`: AIチャット
- `Ctrl+L`: 会話クリア
- `F3`: 次を検索
- `Shift+F3`: 前を検索
- `Escape`: モーダルを閉じる

## 🔧 開発

### 開発環境セットアップ
```bash
# 依存関係をインストール
npm install

# 開発モード（ウォッチ付き）
npm run dev

# 本番ビルド
npm run build

# テスト実行
npm test

# ビルドクリーン
npm run clean
```

### 開発コマンド詳細
- `npm run dev`: 開発モードでWebpackをウォッチ
- `npm run build`: 本番用にビルド
- `npm test`: Jestでテスト実行
- `npm test:watch`: テストをウォッチモードで実行
- `npm run clean`: distディレクトリをクリーン

## ⚙️ 設定

### AI設定
```javascript
{
  provider: 'gemini|claude',
  apiKey: 'your-api-key',
  model: 'model-name',
  maxTokens: 2000,
  temperature: 0.7
}
```

### エディター設定
```javascript
{
  autoSave: true,
  autoSaveInterval: 30000,
  wordWrap: true,
  fontSize: 16,
  theme: 'default',
  language: 'ja'
}
```

### エクスポート設定
```javascript
{
  defaultFormat: 'markdown',
  pdfOptions: {
    pageSize: 'A4',
    margin: 20,
    orientation: 'portrait'
  }
}
```

## 📊 パフォーマンス

- **起動時間**: <2秒
- **レンダリング**: <100ms
- **ファイル処理**: 10MBまで対応
- **メモリ使用量**: <50MB
- **対応ブラウザ**: Chrome 88+, Edge 88+

## 🔒 セキュリティ

- **ローカル保存**: 機密データはローカル保存
- **HTTPS強制**: API通信の暗号化
- **XSS対策**: DOMPurifyでサニタイゼーション
- **最小権限**: 必要最小限の権限要求
- **APIキー保護**: ローカルストレージで暗号化保存

## 🌍 対応言語

- 日本語 🇯🇵
- English 🇺🇸

## 📝 ライセンス

MIT License - 詳細は[LICENSE](LICENSE)ファイルを参照

## 🤝 コントリビュート

1. フォークしてブランチ作成
2. 機能追加・バグ修正
3. テスト追加・実行
4. プルリクエスト作成

詳細は[CONTRIBUTING.md](CONTRIBUTING.md)を参照

## 🐛 バグ報告・機能要望

[GitHub Issues](https://github.com/mike2mike45/sightedit/issues)で報告してください。

## 🆘 トラブルシューティング

### よくある問題

**図表ボタンが動作しない**
- ブラウザのコンソール（F12）でエラーを確認
- 拡張機能を再読み込み

**AI機能が動作しない**
- APIキーが正しく設定されているか確認
- ネットワーク接続を確認
- API制限に達していないか確認

**エクスポートできない**
- ポップアップブロッカーを無効化
- ダウンロード権限を確認

## 📞 サポート

- **公式サイト**: https://duckengine.com
- **GitHub**: https://github.com/mike2mike45/sightedit
- **Issues**: バグ報告・機能要望
- **Discussions**: 質問・議論

## 🎯 ロードマップ

### v1.1.0（予定）
- [ ] リアルタイム共同編集
- [ ] クラウド同期機能
- [ ] カスタムテーマエディター

### v1.2.0（予定）
- [ ] プラグインシステム
- [ ] Webブック出版機能
- [ ] TypeScript移行

### 今後の予定
- [ ] PWA対応
- [ ] Firefox/Safari対応
- [ ] WebAssembly活用

## 📈 統計

- **対応図表**: 20種類
- **サポートAI**: 2プロバイダー（Gemini, Claude）
- **エクスポート形式**: 5形式
- **対応言語**: 2言語（日本語, 英語）
- **対応ブラウザ**: Chrome/Edge

## 🙏 謝辞

- **TurndownService** - HTML→Markdown変換
- **marked** - Markdown→HTMLパース
- **Mermaid.js** - ダイアグラム生成
- **Chart.js** - チャート生成
- **DOMPurify** - XSS対策

---

**開発**: DuckEngine LLC  
**バージョン**: 1.0.0  
**更新日**: 2025年1月14日

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Download-brightgreen)](https://chrome.google.com/webstore)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/Version-1.0.0-blue.svg)](https://github.com/mike2mike45/sightedit)