# SightEdit Chrome Extension

**Chrome拡張版SightEdit** - WYSIWYG Markdownエディター with AI機能 + 図生成機能

**SightEdit Chrome Extension** - WYSIWYG Markdown Editor with AI Features + Diagram Generation

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green.svg)](https://chrome.google.com/webstore)

---

## ✨ 主要機能 | Main Features

### 📝 高機能Markdownエディター | Advanced Markdown Editor

**日本語:**
- **WYSIWYGモード**: 見たままの編集体験
- **ソースモード**: Markdown記法の直接編集
- **リアルタイムプレビュー**: 入力と同時にフォーマットを確認
- **豊富な編集機能**: 見出し、リスト、引用、コードブロック、表、リンク、画像

**English:**
- **WYSIWYG Mode**: What-you-see-is-what-you-get editing experience
- **Source Mode**: Direct Markdown syntax editing
- **Real-time Preview**: Format confirmation as you type
- **Rich Editing Features**: Headings, lists, quotes, code blocks, tables, links, images

---

### 🤖 AI統合機能 | AI Integration

**日本語:**
- **マルチプロバイダー対応**: Google Gemini & Anthropic Claude
- **AIチャット**: リアルタイムストリーミング会話、会話履歴管理、コンテキスト連携
- **AI編集機能**: 要約、校正、翻訳、文体変換（20+種類）
- **キーボードショートカット**: `Ctrl+K` (チャット), `Ctrl+L` (クリア), `Ctrl+Enter` (送信)

**English:**
- **Multi-provider Support**: Google Gemini & Anthropic Claude
- **AI Chat**: Real-time streaming conversations, chat history management, context integration
- **AI Editing Features**: Summarization, proofreading, translation, style conversion (20+ types)
- **Keyboard Shortcuts**: `Ctrl+K` (chat), `Ctrl+L` (clear), `Ctrl+Enter` (send)

---

### 📊 AI図生成機能（NEW!）| AI Diagram Generation (NEW!)

**日本語:**
- **自然言語から図を生成**: テキストから自動的に図を作成
- **3種類の図形式サポート**:
  - **Mermaid**: フローチャート、シーケンス図、クラス図、ER図、ガントチャート、状態図、円グラフ
  - **Chart.js**: 棒グラフ、折れ線グラフ、円グラフ、ドーナツグラフ、レーダーチャート、散布図
  - **SVG**: カスタムSVG図形（アイコン、図形、イラスト）
- **プロンプトテンプレート**: よく使う図のタイプを選択可能
- **リアルタイムプレビュー**: 生成前に図を確認
- **エディター統合**: WYSIWYGモードとソースモードの両方に対応

**English:**
- **Generate Diagrams from Natural Language**: Automatically create diagrams from text descriptions
- **3 Diagram Format Support**:
  - **Mermaid**: Flowcharts, sequence diagrams, class diagrams, ER diagrams, Gantt charts, state diagrams, pie charts
  - **Chart.js**: Bar charts, line charts, pie charts, doughnut charts, radar charts, scatter plots
  - **SVG**: Custom SVG graphics (icons, shapes, illustrations)
- **Prompt Templates**: Select frequently used diagram types
- **Real-time Preview**: Preview diagrams before insertion
- **Editor Integration**: Support for both WYSIWYG and Source modes

---

### 🖼️ 画像機能 | Image Features

**日本語:**
- **Google Drive統合**: OAuth認証、共有リンク対応、画像読み込み
- **ネット画像URL**: 任意のURLから画像を直接挿入
- **ローカルファイル**: PNG, JPG, GIF, SVG, WebP対応

**English:**
- **Google Drive Integration**: OAuth authentication, shared link support, image loading
- **Web Image URLs**: Insert images directly from any URL
- **Local Files**: Support for PNG, JPG, GIF, SVG, WebP

---

### 📤 エクスポート機能 | Export Features

**日本語:**
- **対応形式**: Markdown, HTML, PDF, DOCX, プレーンテキスト
- **サービス別最適化**: WordPress, note, Medium, Zenn, Qiita他

**English:**
- **Supported Formats**: Markdown, HTML, PDF, DOCX, Plain Text
- **Service-specific Optimization**: WordPress, note, Medium, Zenn, Qiita, and more

---

## 🚀 クイックスタート | Quick Start

### インストール | Installation

**日本語:**

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

**English:**

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Build**
   ```bash
   npm run build
   ```

3. **Load as Chrome Extension**
   - Open `chrome://extensions/` in Chrome
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

---

### AI機能の設定 | AI Configuration

#### Google Gemini API

**日本語:**
1. [Google AI Studio](https://aistudio.google.com/app/apikey) でAPIキーを取得
2. 拡張機能の設定（⚙️アイコン）から「AI設定」タブを開く
3. Gemini APIキーを入力
4. モデルを選択（推奨: Gemini 2.5 Pro）

**English:**
1. Get API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Open "AI Settings" tab from extension settings (⚙️ icon)
3. Enter Gemini API key
4. Select model (recommended: Gemini 2.5 Pro)

---

#### Anthropic Claude API

**日本語:**
1. [Anthropic Console](https://console.anthropic.com/account/keys) でAPIキーを取得
2. 拡張機能の設定から「AI設定」タブを開く
3. Claude APIキーを入力（認証不要モデルも利用可能）

**English:**
1. Get API key from [Anthropic Console](https://console.anthropic.com/account/keys)
2. Open "AI Settings" tab from extension settings
3. Enter Claude API key (authentication-free models also available)

---

## 📋 使用方法 | Usage

### エディターの起動 | Launching the Editor

**日本語:**
1. 拡張機能アイコンをクリック → 「エディターを開く」
2. または、`.md`ファイルをダブルクリック（ファイル関連付け設定後）

**English:**
1. Click extension icon → "Open Editor"
2. Or double-click `.md` files (after file association setup)

---

### AI図生成機能の使い方 | How to Use AI Diagram Generation

#### 自然言語から図を生成 | Generate Diagrams from Natural Language

**日本語:**
1. ツールバーの📊アイコンをクリック
2. 「Mermaid」「Chart.js」「SVG」タブから図の種類を選択
3. 自然言語で図の内容を説明（例: 「ユーザー登録からログインまでのフロー図を作成して」）
4. テンプレートを選択（オプション）
5. 「🤖 AIで生成」ボタンをクリック
6. プレビューを確認
7. 「挿入」ボタンでエディターに挿入

**English:**
1. Click the 📊 icon in the toolbar
2. Select diagram type from "Mermaid", "Chart.js", or "SVG" tabs
3. Describe the diagram content in natural language (e.g., "Create a flow diagram from user registration to login")
4. Select a template (optional)
5. Click "🤖 Generate with AI" button
6. Review the preview
7. Click "Insert" button to add to editor

---

#### 対応する図のタイプ | Supported Diagram Types

**Mermaid図 | Mermaid Diagrams:**

**日本語:**
- フローチャート（処理の流れ）
- シーケンス図（処理の順序）
- クラス図（クラスの関係）
- ER図（データベース設計）
- ガントチャート（スケジュール）
- 状態遷移図（状態の変化）
- 円グラフ（割合）

**English:**
- Flowcharts (process flow)
- Sequence diagrams (process order)
- Class diagrams (class relationships)
- ER diagrams (database design)
- Gantt charts (schedules)
- State diagrams (state changes)
- Pie charts (proportions)

---

**Chart.js グラフ | Chart.js Graphs:**

**日本語:**
- 棒グラフ（比較）
- 折れ線グラフ（推移）
- 円グラフ（割合）
- ドーナツグラフ（割合）
- レーダーチャート（多角的評価）
- 散布図（相関関係）

**English:**
- Bar charts (comparison)
- Line charts (trends)
- Pie charts (proportions)
- Doughnut charts (proportions)
- Radar charts (multi-dimensional evaluation)
- Scatter plots (correlations)

---

**SVG図形 | SVG Graphics:**

**日本語:**
- アイコン・ロゴ
- 基本図形
- カスタムイラスト

**English:**
- Icons and logos
- Basic shapes
- Custom illustrations

---

### AIチャット機能 | AI Chat Features

**日本語:**
1. 💬アイコンをクリック、または `Ctrl+K` を押す
2. コンテキストを選択（なし/選択範囲/ドキュメント全体）
3. メッセージを入力して送信
4. AIの応答がリアルタイムで表示
5. 📋履歴ボタンで過去の会話を管理

**English:**
1. Click 💬 icon or press `Ctrl+K`
2. Select context (none/selection/entire document)
3. Enter and send message
4. AI responses display in real-time
5. Manage past conversations with 📋 history button

---

### 画像挿入 | Image Insertion

**日本語:**
1. ツールバーの🖼️アイコンをクリック
2. 「URL」「Google Drive」「ローカル」タブから選択
3. 画像を選択またはURLを入力
4. プレビューで確認して「挿入」

**English:**
1. Click 🖼️ icon in toolbar
2. Select from "URL", "Google Drive", or "Local" tabs
3. Select image or enter URL
4. Preview and click "Insert"

---

## 🏗️ プロジェクト構造 | Project Structure

```
SightEdit/
├── src/
│   ├── background/         # バックグラウンドスクリプト | Background scripts
│   ├── editor/             # エディター本体 | Editor core
│   │   ├── simple-editor.js    # エディタコア | Editor core
│   │   ├── diagram-generator.js # 図生成機能 | Diagram generation
│   │   ├── chat-panel.js       # チャットUI | Chat UI
│   │   └── editor.html         # UI定義 | UI definition
│   ├── lib/                # 共通ライブラリ | Common libraries
│   │   ├── ai-manager.js       # AI機能管理 | AI features management
│   │   ├── ai-chat-manager.js  # チャット機能 | Chat features
│   │   └── chat-storage.js     # 会話履歴管理 | Conversation history
│   └── popup/              # 拡張機能ポップアップ | Extension popup
├── dist/                   # ビルド出力 | Build output
├── assets/                 # アイコン等のリソース | Icons and resources
├── manifest.json           # Chrome拡張機能マニフェスト | Chrome extension manifest
├── webpack.config.js       # ビルド設定 | Build configuration
└── package.json            # 依存関係 | Dependencies
```

---

## 🛠️ 開発 | Development

### スクリプト | Scripts

```bash
# 開発ビルド（ファイル監視）| Development build (file watching)
npm run dev

# 本番ビルド | Production build
npm run build

# distフォルダをクリア | Clean dist folder
npm run clean

# テスト実行 | Run tests
npm test
```

---

### 技術スタック | Tech Stack

**日本語:**
- **Chrome Extension API**: Manifest V3
- **AI統合**: Google Gemini API, Anthropic Claude API
- **図生成**: Mermaid.js, Chart.js
- **Markdown処理**: marked, DOMPurify（XSS保護）
- **ビルドツール**: Webpack 5
- **ストレージ**: Chrome Storage API, IndexedDB（会話履歴）

**English:**
- **Chrome Extension API**: Manifest V3
- **AI Integration**: Google Gemini API, Anthropic Claude API
- **Diagram Generation**: Mermaid.js, Chart.js
- **Markdown Processing**: marked, DOMPurify (XSS protection)
- **Build Tool**: Webpack 5
- **Storage**: Chrome Storage API, IndexedDB (conversation history)

---

## 🔒 セキュリティ | Security

**日本語:**
- ✅ APIキーはChrome Storage APIで安全に保存
- ✅ AI応答は DOMPurify でサニタイズ
- ✅ XSS攻撃からの保護
- ✅ ローカルデータのみ保存（外部送信なし）
- ✅ ユーザーの同意なしにデータを収集しません

**English:**
- ✅ API keys securely stored in Chrome Storage API
- ✅ AI responses sanitized with DOMPurify
- ✅ Protection against XSS attacks
- ✅ Local data storage only (no external transmission)
- ✅ No data collection without user consent

---

## 📚 ドキュメント | Documentation

**日本語:**
- [機能詳細](FEATURES.md) - 全機能の詳細説明
- [変更履歴](CHANGELOG.md) - バージョン履歴
- [AIチャット機能ガイド](docs/AI_CHAT_FEATURE.md) - チャット機能の詳細
- [技術仕様](TECHNICAL_SPECIFICATION.md) - アーキテクチャとAPI仕様
- [開発者向けガイド](CONTRIBUTING.md) - コントリビューション方法

**English:**
- [Feature Details](FEATURES.md) - Detailed feature descriptions
- [Changelog](CHANGELOG.md) - Version history
- [AI Chat Feature Guide](docs/AI_CHAT_FEATURE.md) - Chat feature details
- [Technical Specification](TECHNICAL_SPECIFICATION.md) - Architecture and API specs
- [Contributor Guide](CONTRIBUTING.md) - Contribution guidelines

---

## 🐛 トラブルシューティング | Troubleshooting

### 図が挿入されない | Diagrams Not Inserting

**日本語:**
- ブラウザのコンソールログを確認（F12 → Console）
- APIキーが正しく設定されているか確認
- プレビューが正常に表示されているか確認

**English:**
- Check browser console log (F12 → Console)
- Verify API key is correctly configured
- Confirm preview displays correctly

---

### APIキーが保存されない | API Keys Not Saving

**日本語:**
- 設定画面を開き直す
- Chrome拡張機能を再読み込み（chrome://extensions/ → 再読み込み）
- ブラウザを再起動

**English:**
- Reopen settings screen
- Reload Chrome extension (chrome://extensions/ → Reload)
- Restart browser

---

### 画像が表示されない | Images Not Displaying

**日本語:**
- Google Driveリンクが「リンクを知っている全員」で共有されているか確認
- ネット画像URLが有効か確認
- CORS問題の可能性（画像サーバーの設定を確認）

**English:**
- Verify Google Drive link is shared as "Anyone with the link"
- Confirm web image URL is valid
- Possible CORS issue (check image server settings)

---

## 🤝 コントリビューション | Contribution

**日本語:**
プルリクエストを歓迎します！大きな変更の場合は、まずissueを開いて変更内容を議論してください。

**English:**
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## 📝 ライセンス | License

MIT License - 詳細は [LICENSE](LICENSE) を参照

MIT License - See [LICENSE](LICENSE) for details

---

## 🙏 謝辞 | Acknowledgments

- [Mermaid.js](https://mermaid.js.org/) - 図表示ライブラリ | Diagram rendering library
- [Chart.js](https://www.chartjs.org/) - グラフライブラリ | Chart library
- [marked](https://marked.js.org/) - Markdownパーサー | Markdown parser
- [DOMPurify](https://github.com/cure53/DOMPurify) - XSS保護 | XSS protection
- Google Gemini API & Anthropic Claude API - AI機能 | AI features

---

**開発 | Development**: DuckEngine LLC
**バージョン | Version**: 3.0.0
**最終更新 | Last Updated**: 2025年1月 | January 2025
