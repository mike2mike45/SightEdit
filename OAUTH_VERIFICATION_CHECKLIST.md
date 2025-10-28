# OAuth設定確認チェックリスト

このチェックリストに従って、Google Cloud Consoleの設定を確認してください。

## 1. 正しいプロジェクトを選択しているか

- Google Cloud Console (https://console.cloud.google.com/) を開く
- 画面上部のプロジェクト選択ドロップダウンを確認
- プロジェクトID: **260879732198** が選択されているか確認

## 2. OAuth 2.0 クライアントIDの設定

### 確認場所
1. Google Cloud Console → 「APIとサービス」→ 「認証情報」
2. クライアントID: `260879732198-2iel5qgjgfsen4uaimu4sjf0iv26qhhe.apps.googleusercontent.com` を見つける
3. クライアントIDをクリックして詳細を開く

### 確認項目

#### ✅ アプリケーションの種類
- [ ] **「ウェブ アプリケーション」**になっているか確認
  - 「Chrome拡張機能」ではなく「ウェブ アプリケーション」である必要があります

#### ✅ 承認済みのリダイレクトURI
- [ ] 以下のURIが**正確に**登録されているか確認（スペースや余分な文字がないこと）:
  ```
  https://chibfgpnajlchhljdojcpmamhplnogcp.chromiumapp.org/
  ```

**重要**:
- 末尾のスラッシュ `/` が必要です
- `https://` で始まる必要があります
- 拡張機能ID `chibfgpnajlchhljdojcpmamhplnogcp` が正確に含まれている必要があります
- `.chromiumapp.org` ドメインである必要があります

#### ✅ 承認済みのJavaScript生成元
- [ ] **空欄**または**削除**されているか確認
  - Chrome拡張機能では JavaScript生成元は使用しません
  - `chrome-extension://` のURIは無効なので削除してください

## 3. Google Drive API の有効化

- [ ] 「APIとサービス」→ 「ライブラリ」
- [ ] 「Google Drive API」を検索
- [ ] **「有効」**になっているか確認

## 4. OAuth同意画面の設定

### 確認場所
「APIとサービス」→ 「OAuth同意画面」

### 確認項目
- [ ] **公開ステータス**: 「本番環境」または「テスト中」
- [ ] **スコープ**に以下が含まれているか:
  ```
  https://www.googleapis.com/auth/drive
  ```

## 5. もし上記すべてが正しい場合

### クライアントIDの再作成を試す

現在のクライアントIDが何らかの理由で破損している可能性があります：

1. **現在のクライアントIDを削除**
   - 「認証情報」→ クライアントIDの横のゴミ箱アイコンをクリック

2. **新しいクライアントIDを作成**
   - 「認証情報を作成」→ 「OAuth 2.0 クライアントID」
   - **アプリケーションの種類**: 「ウェブ アプリケーション」
   - **名前**: 「SightEdit Chrome Extension」（任意）
   - **承認済みのリダイレクトURI**: `https://chibfgpnajlchhljdojcpmamhplnogcp.chromiumapp.org/`
   - 作成後、新しいクライアントIDをコピー

3. **manifest.jsonを更新**
   - 新しいクライアントIDを `manifest.json` の `oauth2.client_id` に設定

4. **バージョンを上げる**
   - `manifest.json` の `version` を `1.0.5` に変更（Chromeに強制的にリロードさせる）

5. **ビルドして再読み込み**
   ```powershell
   npm run build
   ```
   - chrome://extensions/ で拡張機能を再読み込み

## トラブルシューティング

### 設定変更後も動かない場合

1. **Chromeの認証キャッシュをクリア**
   - chrome://identity-internals/ が使えない場合
   - Chrome設定 → プライバシーとセキュリティ → 閲覧履歴データの削除
   - 「Cookieと他のサイトデータ」をクリア
   - Chromeを再起動

2. **拡張機能を完全に削除して再インストール**
   - chrome://extensions/ で削除
   - Chromeを再起動
   - 拡張機能を再度読み込み

## デバッグ情報の確認

拡張機能を実行して、以下のログを確認：

```
[DEBUG] Manifest oauth2 config: Object
[DEBUG] Client ID being used: <クライアントIDが表示される>
```

このクライアントIDが manifest.json の内容と一致していることを確認してください。
