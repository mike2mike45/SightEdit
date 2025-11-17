# Pandoc DOCX変換セットアップガイド

## 概要
SightEditでPandocを使用したDOCX変換を利用するためのセットアップ手順です。
Google Docsと互換性の高いDOCXファイルを生成できます。

## Pandocのインストール

### Windows
```bash
# WinGet (推奨)
winget install pandoc

# または Chocolatey
choco install pandoc

# または手動インストール
# https://pandoc.org/installing.html からダウンロード
```

### macOS
```bash
# Homebrew (推奨)
brew install pandoc

# または MacPorts
sudo port install pandoc
```

### Linux (Ubuntu/Debian)
```bash
# APT
sudo apt update
sudo apt install pandoc

# または最新版を手動インストール
wget https://github.com/jgm/pandoc/releases/latest/download/pandoc-3.8.2.1-linux-amd64.tar.gz
tar xvzf pandoc-*-linux-amd64.tar.gz
sudo cp pandoc-*/bin/pandoc /usr/local/bin/
```

## インストール確認

```bash
# Pandocバージョン確認
pandoc --version

# npmスクリプトでも確認可能
npm run pandoc-check
```

## 使用方法

### 1. サーバー起動
```bash
npm run server
```

### 2. アプリケーション起動
- Chrome Extensionとして: 通常通り使用
- ブラウザで: http://localhost:8080 にアクセス

### 3. DOCX出力
- エディタでDOCXエクスポートを選択
- 自動的にPandocが使用されます
- Pandocが利用できない場合は従来のhtml-docx-jsにフォールバック

## 機能

### Pandoc使用時の利点
- ✅ Google Docs完全互換
- ✅ Office標準準拠のDOCX
- ✅ 高品質なレイアウト保持
- ✅ 複雑なテーブル・リスト対応
- ✅ 自動目次生成（見出しを検出した場合）
- ✅ 日本語フォント最適化
- ✅ カスタムスタイルテンプレート対応

### 新機能（v2.0）
- **3段階フォールバック**: Pandoc → 改良docxライブラリ → 従来実装
- **コンテンツ分析**: 見出し・テーブルを自動検出して最適化
- **リファレンステンプレート**: assets/reference.docxでスタイルカスタマイズ可能

### フォールバック機能
- Pandocが利用できない場合、html-docx-jsが自動使用
- エラー発生時の安全な動作保証

## API エンドポイント

### DOCX変換API
```
POST /api/convert/docx
Content-Type: application/json

{
  "html": "<html>...</html>",
  "filename": "document.docx"
}
```

### Pandoc状態確認
```
GET /api/pandoc/version
```

## カスタムスタイルテンプレート

### リファレンステンプレートの作成
1. デフォルトテンプレートを生成:
```bash
pandoc --print-default-data-file reference.docx > assets/reference.docx
```

2. Microsoft Wordでカスタマイズ:
   - フォント: 游ゴシック、MS明朝など
   - 見出しスタイル
   - 段落書式
   - テーブルスタイル

3. assets/reference.docxとして保存

### テンプレート要素
- **見出し1-6**: h1-h6のスタイル設定
- **Body Text**: 本文のフォント・行間
- **Table**: テーブルのボーダー・背景色
- **Code**: コードブロックの書式

## トラブルシューティング

### Pandocが見つからない場合
1. PATHにPandocが設定されているか確認
2. コマンドラインで `pandoc --version` が動作するか確認
3. サーバーを再起動

### 変換エラーの場合
1. ブラウザコンソールでエラーログ確認
2. サーバーログで詳細エラー確認
3. 一時ファイル（temp/）の権限確認

### フォールバック動作
- **第1段階**: Pandoc変換（最高品質）
- **第2段階**: 改良docxライブラリ（テーブル・リスト対応）
- **第3段階**: 従来html-docx-js（基本対応）
- 各段階でエラーが発生すると自動的に次の段階にフォールバックします

## 技術仕様

- **Pandoc**: CLI経由でHTML → DOCX変換
- **一時ファイル**: temp/ディレクトリ（自動クリーンアップ）
- **フォールバック**: html-docx-js使用
- **互換性**: Google Docs, Microsoft Word, LibreOffice

## セキュリティ

- 一時ファイルは処理後自動削除
- サーバーローカル実行（外部通信なし）
- 入力HTMLのサニタイズ実装済み