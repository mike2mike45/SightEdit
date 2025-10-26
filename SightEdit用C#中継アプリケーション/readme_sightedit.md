# SightEdit Relay

Markdownファイルを**ダブルクリック**するだけでSightEdit Chrome拡張機能が自動で開くようになる中継アプリケーションです。

## ✨ 機能

- **ワンクリック起動**: .mdファイルのダブルクリックでSightEdit拡張機能が自動オープン
- **バックグラウンド動作**: コマンドプロンプト画面を開かずに起動
- **完全統合**: ローカルHTTPサーバー経由でファイル内容を安全に転送
- **CORS対応**: Chrome拡張機能からの安全なアクセス
- **自動終了**: ファイル転送後60秒で自動終了
- **システムトレイ**: 動作状況を視覚的に確認（タスクトレイアイコン）
- **エラーハンドリング**: 詳細なログとエラー情報

## 🚀 動作フロー

```
1. .mdファイルをダブルクリック
   ↓
2. SightEditRelay.exe が起動
   ↓
3. localhost:8080 でHTTPサーバー開始
   ↓
4. SightEdit拡張機能が自動で開く
   ↓
5. 拡張機能がHTTP経由でファイル内容を取得
   ↓
6. マークダウンエディターでファイル表示
```

## 🔨 ビルド方法

### 前提条件
- **Visual Studio 2022** または **.NET SDK** がインストール済み
- **OS**: Windows 10/11

### 方法1: Visual Studio でビルド
1. `SightEditRelay.sln` を Visual Studio で開く
2. メニューから **ビルド → ソリューションのリビルド**
3. 出力先: `bin\Release\net48\SightEditRelay.exe`

### 方法2: コマンドラインでビルド

**実行場所**: リポジトリルート
**使用シェル**: PowerShell、コマンドプロンプト、Windows Terminal

```powershell
# リポジトリルートで実行
.\build-relay.bat
```

**出力ファイル**:
```
SightEdit\
└── SightEditRelay.exe  ← リポジトリルートに生成
```

**重要**:
- ✅ 最新版は**コマンドプロンプト画面を表示しません**
- ✅ バックグラウンドで動作し、システムトレイアイコンのみ表示
- ⚠️ コマンドプロンプトが開く場合は古いビルドです → 再ビルドしてください

---

## 📦 インストール

### 1. ファイル配置
ビルド後、以下の構成で配置:
```
C:\Program Files\SightEditRelay\
├── SightEditRelay.exe          (ビルドで生成)
├── setup_sendto.bat
└── uninstall_sightedit.bat
```

### 2. セットアップ実行

1. `setup_sendto.bat` を右クリック
2. 「管理者として実行」を選択

### 3. 完了確認
- ✅ `.mdファイルをダブルクリック → SightEditが開く`
- ✅ `ファイル右クリック → 送る → SightEdit`

## 🛠️ システム要件

- **OS**: Windows 10/11
- **Framework**: .NET Framework 4.8
- **ブラウザ**: Chrome/Edge (Chromium系)
- **拡張機能**: SightEdit Chrome Extension

## 📁 ファイル説明

| ファイル | 説明 |
|---------|------|
| `SightEditRelay.exe` | メインアプリケーション |
| `setup_sendto.bat` | インストール用バッチファイル |
| `uninstall_sightedit.bat` | アンインストール用（自動生成） |

## 🔧 設定

### App.config設定項目
```xml
<!-- HTTPサーバー設定 -->
<add key="DefaultPort" value="8080" />
<add key="ServerTimeout" value="60000" />

<!-- SightEdit拡張機能設定 -->
<add key="ExtensionId" value="lpnfpnohklemjbohfljjkcmnpbaekiao" />
```

### ポート設定
デフォルトは8080番ポートを使用。使用中の場合、自動で8081-8090番を試行します。

## 🔍 トラブルシューティング

### ファイルが開かない
1. **拡張機能ID確認**
   - `chrome://extensions/` でSightEditのIDを確認
   - App.configの `ExtensionId` を更新

2. **ファイル関連付け確認**
   ```cmd
   # 現在の関連付けを確認
   assoc .md
   ```

3. **ログファイル確認**
   ```
   %TEMP%\SightEditRelay.log
   ```

### セキュリティソフトが削除する
1. **Windows Defender除外設定**
   - Windows設定 → 更新とセキュリティ → Windows セキュリティ
   - ウイルスと脅威の防止 → 除外設定
   - フォルダー除外: `C:\Program Files\SightEditRelay`

2. **他のセキュリティソフト**
   - 各ソフトの除外設定でフォルダを指定

### 権限エラー
```cmd
# 管理者権限でコマンドプロンプト起動
# Windows + X → "コマンドプロンプト（管理者）"
setup_sendto.bat
```

## 🗑️ アンインストール

```cmd
# 自動生成されたファイルを実行
uninstall_sightedit.bat
```

または手動で:
```cmd
# ファイル関連付け削除
reg delete "HKCU\Software\Classes\.md" /f
reg delete "HKCU\Software\Classes\SightEditRelay.Document" /f

# SendToショートカット削除
del "%APPDATA%\Microsoft\Windows\SendTo\SightEdit.lnk"
```

## 🔐 セキュリティ

- **localhost限定**: 外部アクセス不可
- **CORS対応**: 拡張機能からのみアクセス可能
- **自動終了**: 60秒で自動終了
- **ファイルサイズ制限**: 10MB以下

## 📝 ログ

アプリケーションの動作ログは以下に保存されます:
```
%TEMP%\SightEditRelay.log
```

ログ内容:
- 起動・終了時刻
- HTTPリクエスト情報
- エラー詳細
- システムトレイ操作

## 🤝 サポート

### よくある質問

**Q: SightEdit拡張機能が開かない**
A: Extension IDが正しいか確認してください。`chrome://extensions/`でSightEditのIDをコピーし、App.configを更新してください。

**Q: "アクセスが拒否されました"エラー**
A: 管理者権限でsetup_sendto.batを実行してください。

**Q: セキュリティソフトに削除される**
A: フォルダ除外設定を行ってください。これは新しいプログラムでよくある誤検知です。

### バージョン情報
- **Version**: 1.0.0
- **Build Date**: 2025年9月
- **Target Framework**: .NET Framework 4.8
- **Extension ID**: lpnfpnohklemjbohfljjkcmnpbaekiao

---

**💡 Tips**: システムトレイのアイコンを右クリックすると手動終了できます。