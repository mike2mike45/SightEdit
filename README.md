# SightEdit Chrome Extension

Chrome拡張版SightEdit - TipTapベースのWYSIWYG Markdownエディター with AI機能 + Google Driveバージョン履歴

## 📁 プロジェクト構成

```
SightEdit/
├── src/                      # ソースコード
│   ├── background/          # バックグラウンドスクリプト
│   ├── editor/              # エディタ本体
│   ├── lib/                 # 共通ライブラリ
│   │   ├── ai-manager.js    # AI機能管理
│   │   └── version-manager.js # バージョン履歴管理
│   └── popup/               # 拡張機能ポップアップ
├── dist/                    # ビルド出力（Chrome拡張機能）
├── SightEdit用C#中継アプリケーション/  # ファイル関連付け用中継アプリ
│   ├── SightEditRelay.cs    # C#中継アプリソース（Google Drive API統合）
│   ├── SightEditRelay.csproj # プロジェクトファイル
│   ├── config/              # 設定とOAuth認証情報
│   │   ├── client_secret.json (ユーザー配置)
│   │   ├── token.json (自動生成)
│   │   └── settings.json (自動生成)
│   └── logs/                # 操作ログ
├── assets/                  # アイコン等のリソース
├── manifest.json            # Chrome拡張機能マニフェスト
├── package.json             # Node.js依存関係
├── webpack.config.js        # ビルド設定
├── build-relay.bat          # C#アプリビルドスクリプト
├── setup-file-association.bat # ファイル関連付け設定（.md/.markdown）
└── test.md                  # 動作確認用テストファイル
```

## 🚀 機能

### ✨ エディター機能
- **WYSIWYG Markdownエディター**: TipTapベースの高機能エディター
- **リアルタイムプレビュー**: 入力と同時にフォーマットを確認
- **豊富な編集機能**: 見出し、リスト、引用、コードブロック、表などをサポート
- **ツールバー**: 直感的な操作でMarkdown要素を挿入

### 📚 バージョン履歴機能 (Google Drive連携)
- **自動バージョン保存**: 保存時に自動的にGoogle Driveにスナップショット作成
- **タイムスタンプ管理**: v_YYYYMMDD_HHMM形式で履歴を管理
- **簡単復元**: 過去のバージョンをワンクリックで復元
- **説明メッセージ**: 各バージョンに説明を付けて管理
- **クラウド同期**: 複数デバイス間でバージョン履歴を共有

### 🤖 AI機能
- **マルチプロバイダー対応**: Gemini（デフォルト）& Claude
- **Geminiモデル**:
  - Gemini 2.0 Flash (実験版) - 最新・無料枠あり
  - Gemini 2.0 Flash - 無料枠あり
  - Gemini 2.5 Pro - 無料枠あり・推奨 ⭐
  - Gemini 1.5 Flash - 無料枠あり・高速
  - Gemini 1.5 Pro - 無料枠あり
- **Claudeモデル**:
  - Claude 3.5 Sonnet (2024年10月版) - 最新
  - Claude 3.5 Haiku (2024年10月版) - 最新・高速
  - Claude 3 Opus - 高性能
  - Claude 3 Sonnet
  - Claude 3 Haiku - 高速

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
- PDF形式
- DOCX形式
- プレーンテキスト形式

## 🛠️ インストール

### 1. プロジェクトのセットアップ

```bash
# 依存関係をインストール
npm install

# ビルド
npm run build
```

### 2. Chrome拡張として読み込み
1. Chrome で `chrome://extensions/` を開く
2. 「デベロッパーモード」を有効にする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `dist`フォルダを選択
5. 拡張機能IDをメモ（例: `chibfgpnajlchhljdojcpmamhplnogcp`）

### 3. Google Drive連携のセットアップ

#### ステップ1: Google Cloud プロジェクト作成

1. [Google Cloud Console](https://console.cloud.google.com/projectcreate) にアクセス
2. プロジェクト名を入力: 例「SightEdit」
3. 「作成」をクリック
4. プロジェクトIDをメモ

#### ステップ2: API有効化

1. [Google Cloud Console - APIライブラリ](https://console.cloud.google.com/apis/library)
2. 「Google Drive API」を検索して有効化
3. （オプション）「Google Sheets API」も有効化

#### ステップ3: OAuth認証情報取得

1. [認証情報ページ](https://console.cloud.google.com/apis/credentials)
2. 「認証情報を作成」→「OAuth クライアント ID」
3. アプリケーションの種類: 「デスクトップアプリケーション」
4. 名前: 「SightEdit Version Manager」
5. 「JSONをダウンロード」をクリック
6. ダウンロードしたファイルを `client_secret.json` にリネーム
7. `C:\Program Files\SightEditRelay\config\` にコピー

#### ステップ4: C#中継アプリのビルドとインストール

```bash
# C#中継アプリをビルド
.\build-relay.bat
```

#### ステップ5: ファイル関連付け設定（Windows）

**実行場所**: `C:\Users\mscat\OneDrive\ドキュメント\GitHub\SightEdit` (インストールしたフォルダ)
**使用シェル**: コマンドプロンプト または PowerShell

```cmd
# 1. コマンドプロンプトを「管理者として実行」で起動
#    （スタートメニュー → cmd → 右クリック → 管理者として実行）

# 2. ディレクトリに移動（インストールしたフォルダ）
cd C:\Users\mscat\OneDrive\ドキュメント\GitHub\SightEdit

# 3. バッチファイルを実行
setup-file-association.bat
```

これで`.md`ファイルをダブルクリックするとSightEditで開きます。

#### ステップ6: 初回認証

1. `.md`ファイルをダブルクリックしてSightEditを起動
2. 初回起動時にブラウザでGoogleアカウント認証画面が開く
3. 「SightEditを許可」をクリック
4. 以降は自動的にGoogle Driveと連携

## 🔧 開発

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

### プロジェクト構造
```
src/
├── background/         # バックグラウンドスクリプト
├── content/           # コンテンツスクリプト
├── editor/            # メインエディター
├── lib/               # 共通ライブラリ
│   ├── ai-manager.js  # AI機能管理
│   ├── export-manager.js # エクスポート機能
│   └── version-manager.js # バージョン履歴管理
└── popup/             # ポップアップUI
```

## ⚙️ 設定

### AI API設定

#### Gemini API
1. [Google AI Studio](https://aistudio.google.com/app/apikey) でAPIキーを取得
2. 拡張機能の設定からAPIキーを入力
3. AIza...で始まるAPIキーを使用

#### Claude API
1. [Anthropic Console](https://console.anthropic.com/account/keys) でAPIキーを取得
2. 拡張機能の設定からAPIキーを入力
3. sk-ant-...で始まるAPIキーを使用

### バージョン履歴設定

設定は `C:\Program Files\SightEditRelay\config\settings.json` で管理されます。

```json
{
  "version_history": {
    "enabled": true,
    "auto_save_enabled": true,
    "auto_save_interval_seconds": 300,
    "max_local_versions": 10,
    "drive_folder_name": "SightEdit Version History"
  },
  "google_api": {
    "retry_attempts": 3,
    "request_timeout_seconds": 30,
    "rate_limit_per_hour": 1000
  },
  "ui": {
    "show_version_panel": true,
    "confirm_restore": true,
    "show_diff_on_restore": true
  }
}
```

## 📋 使用方法

### エディターの起動
1. **拡張機能アイコンをクリック** → 「エディターを開く」
2. **ポップアップから** → メインボタンをクリック
3. **ページ内のフローティングボタン** → 📝アイコンをクリック
4. **.mdファイルをダブルクリック** → 自動的にSightEditで開く

### バージョン履歴の使用

#### バージョンの保存
1. ファイルを編集
2. 「保存」ボタンをクリック
3. バージョン説明を入力（オプション）
4. 自動的にGoogle Driveにバージョンが保存される

#### バージョンの復元
1. 右側のバージョンパネルを開く
2. 復元したいバージョンの「復元」ボタンをクリック
3. 確認ダイアログで「復元」を選択
4. ファイルが選択したバージョンに戻る

### AI機能の使用
1. テキストを選択
2. 🤖 AIボタンをクリック
3. 実行したい機能を選択
4. 結果を確認・コピー・挿入

### エクスポート
1. 📤 エクスポートボタンをクリック
2. 形式を選択（Markdown/HTML/PDF/DOCX/テキスト）
3. ファイルがダウンロードされます

## 🔒 セキュリティ

- APIキーはローカルストレージに暗号化されて保存
- Google Drive OAuth認証情報は `config/` フォルダに安全に保存
- ファイルアクセス権は所有者のみ読み取り可能
- 外部サーバーへのデータ送信なし（AI API、Google Drive API除く）
- ユーザーの同意なしにデータを収集しません

## 🐛 トラブルシューティング

### バージョン履歴が機能しない

1. `client_secret.json` が正しい場所に配置されているか確認
2. Google Drive APIが有効になっているか確認
3. `logs/sightedit_relay.log` でエラーを確認

### OAuth認証エラー

1. ブラウザでGoogle認証ダイアログが開かない
   → ポップアップブロッカーを無効化

2. 認証後もエラーが出る
   → `config/token.json` を削除して再認証

### ファイルが開かない

1. `.md`ファイルの関連付けを確認
2. `setup-file-association.bat` を管理者権限で再実行

## 📝 ライセンス

MIT License

## 🙏 謝辞

- TipTap - リッチテキストエディター
- Google Drive API - バージョン管理
- Gemini API & Claude API - AI機能
