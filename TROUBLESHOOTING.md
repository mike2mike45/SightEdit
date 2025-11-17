# トラブルシューティング

## バージョン保存エラー: "Failed to fetch"

### 症状
バージョンを保存しようとすると、以下のようなエラーが表示される：
```
バージョン保存エラー: TypeError: Failed to fetch
```

### 原因
SightEditRelay.exe（C#で作成された中継サーバー）が起動していないため、拡張機能がサーバーに接続できません。

### 解決方法

1. **SightEditRelay.exeを起動する**
   - `SightEdit用C#中継アプリケーション\bin\Release\net48\SightEditRelay.exe` を実行
   - サーバーがポート8080で起動することを確認
   - "HTTPサーバーを開始しました: http://127.0.0.1:8080/" というメッセージが表示される

2. **拡張機能を再読み込み**
   - Chrome拡張機能の管理ページ（chrome://extensions/）を開く
   - SightEditの拡張機能を探し、更新ボタンをクリック

3. **ファイルを開く**
   - SightEditRelay.exeを使用してMarkdownファイルを開く
   - または拡張機能から新規ファイルを作成

### 改善された機能（v1.0.3以降）
- サーバー接続エラー時に、より詳細なエラーメッセージが表示されるようになりました
- エラーメッセージには、SightEditRelay.exeの起動を促す内容が含まれます

### 関連ファイル
- `/src/lib/version-manager.js` - エラーハンドリングの改善
- `/src/editor/version-integration.js` - エラーダイアログの表示

### 技術的詳細
拡張機能は `http://127.0.0.1:8080` でローカルサーバーと通信しようとします。
以下のAPIエンドポイントが使用されます：
- `POST /api/versions` - バージョンの保存
- `GET /api/versions` - バージョン一覧の取得
- `GET /api/versions/{id}/content` - バージョン内容の取得
- `POST /api/versions/{id}/restore` - バージョンの復元

CORSヘッダーは適切に設定されているため、拡張機能からのアクセスは許可されています。