# 開発者がOAuth 2.0クライアントIDの登録がなぜ必要か？

## はじめに

Chrome拡張機能でGoogle Drive APIを使おうとすると、必ず「OAuth 2.0クライアントID」の登録が必要になります。しかし、この「クライアントID」という用語が非常に混乱を招きます。

**多くの開発者が疑問に思うこと：**
- 「クライアント」= ユーザー（顧客）のこと？
- なぜ開発者が登録するの？ユーザーが認証するだけじゃないの？
- フリーウェアなのに、なぜ開発者がGoogle Cloud Consoleで設定が必要？
- 開発者のAPIクォータを消費するなら、コスト負担が発生するのでは？

この記事では、実際の開発中に生じた疑問と、その答えを記録します。

---

## OAuth 2.0の「クライアント」とは何か？

### ❌ よくある誤解

```
クライアント = ユーザー（顧客、Client）
```

「Client」という英単語から、「顧客」や「ユーザー」を連想してしまいがちです。

### ✅ 正しい理解

```
クライアント = アプリケーション
```

OAuth 2.0における「クライアント」とは、**APIにアクセスするアプリケーション**のことです。

---

## OAuth 2.0の登場人物

OAuth 2.0には、4つの役割があります：

### 1. Resource Owner（リソース所有者）
**= ユーザー**

Google Driveのデータを持っている人。自分のデータへのアクセスを許可する権限を持つ。

### 2. Client（クライアント）
**= アプリケーション（例：SightEdit）**

ユーザーのデータにアクセスしたいアプリケーション。

### 3. Authorization Server（認可サーバー）
**= Google**

認証・認可を管理するサーバー。ユーザーがログインして許可を与える画面を提供。

### 4. Resource Server（リソースサーバー）
**= Google Drive API**

実際のデータを提供するサーバー。

---

## 「OAuth 2.0クライアントID」の意味

### これは何のID？

**「SightEdit（アプリケーション）」を識別するID**

- ❌ ユーザーのID
- ❌ 開発者のID
- ✅ **アプリ（SightEdit）そのもののID**

### 具体例：Slackの場合

- **クライアント** = Slackアプリ
- **クライアントID** = Slackアプリを識別するID（Slack社が作成）
- **リソース所有者** = Slackを使う人（各自がGoogle認証で許可を与える）

ユーザーが「SlackにGoogleカレンダーへのアクセスを許可する」とき、Googleは：
1. このアプリは「Slack」である（クライアントIDで識別）
2. ユーザーが「許可」をクリックした
3. SlackにGoogleカレンダーへのアクセストークンを発行

という流れになります。

---

## なぜ開発者が登録する必要があるのか？

### 疑問：個人使用でも必要？

**Q: 自分専用のアプリなのに、なぜGoogle Cloud Consoleで登録が必要？**

A: Googleの仕組み上、**個人使用でも登録が必須**です。

### Googleが知りたいこと

ユーザーが認証するとき、Googleは以下を確認します：

1. **どのアプリケーションに許可を与えるのか？**
   - アプリ名、開発者情報

2. **このアプリは信頼できるか？**
   - OAuth同意画面の設定
   - スコープの確認

3. **問題があった場合、誰に連絡するか？**
   - 開発者の連絡先

4. **API使用量の追跡**
   - 1日何回呼び出されたか
   - 異常なアクセスの検知
   - クォータ管理

**たとえ1人しか使わなくても、Googleはアプリを識別する必要があります。**

---

## フリーウェアの場合のコスト問題

### 疑問：開発者がコスト負担する？

**Q: 全ユーザーのAPI呼び出しが開発者のクォータを消費する？フリーウェアなのにコスト負担が発生する？**

### 答え：Google Drive APIは完全無料

[Google公式ドキュメント](https://developers.google.com/drive/api/guides/limits)によると：

> All use of the Google Drive API is available at **no additional cost**.

#### デフォルトクォータ
- **1,000,000,000 リクエスト/日**（10億回）
- ユーザーごとの制限: 1000リクエスト/100秒

#### 超過した場合
- **課金なし**
- 403エラーが返される
- クォータ増加申請も無料

**つまり、コスト負担の心配は不要です。**

---

## 一般的なChrome拡張機能の実装

### 標準的なフロー

多くのフリーウェアChrome拡張機能は、以下の方法を採用しています：

1. **開発者がOAuth 2.0クライアントIDを作成**
   - Google Cloud Consoleでプロジェクト作成
   - client_idを取得

2. **client_idをmanifest.jsonに含める**
   - 公開情報なので問題なし
   - ソースコードにハードコード

3. **ユーザーは認証するだけ**
   - 初回起動時にGoogle認証画面
   - 「許可」をクリック
   - 完了

### よく見る誤解：ユーザーに設定させる？

**❌ ユーザー設定式（見たことがない）**
```
ユーザーが自分でGoogle Cloud Consoleでプロジェクト作成
→ SightEditの設定画面でclient_idを入力
```

このようなアプリは存在しません。なぜなら、一般ユーザーにこの作業を要求するのは非現実的だからです。

**✅ 開発者設定式（標準的）**
```
開発者がclient_idを作成
→ manifest.jsonに含める
→ ユーザーは認証するだけ
```

これが一般的な実装方法です。

---

## Chrome拡張機能特有の問題：拡張機能IDの固定

### 問題

Chrome拡張機能には「拡張機能ID」があります（例: `abcdefghijklmnopqrstuvwxyz123456`）。

開発モードで読み込むと、この**IDがランダムに変わる**可能性があります。

### OAuth設定への影響

Google Cloud ConsoleのOAuth設定では、**拡張機能IDを指定する必要**があります。

### 解決策：manifest.jsonに`key`を追加

```json
{
  "manifest_version": 3,
  "name": "SightEdit",
  "key": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKC...",
  "oauth2": {
    "client_id": "123456789-abc.apps.googleusercontent.com",
    "scopes": ["https://www.googleapis.com/auth/drive.readonly"]
  }
}
```

`key`を追加することで、どの環境でも同じ拡張機能IDになります。

---

## 実装手順（開発者向け）

### 1. 拡張機能のkeyを生成

```bash
# Chrome拡張機能をパッケージ化すると.pemファイルが生成される
# .pemファイルから公開鍵（key）を抽出してmanifest.jsonに追加
```

### 2. Google Cloud Console設定

1. **プロジェクト作成**
   - https://console.cloud.google.com/

2. **Google Drive APIを有効化**
   - 「APIとサービス」→「ライブラリ」
   - 「Google Drive API」を検索して有効化

3. **OAuth同意画面を設定**
   - アプリ名、スコープなどを設定

4. **OAuth 2.0クライアントIDを作成**
   - アプリケーションの種類: **Chrome アプリ**
   - アプリケーションID: 拡張機能のID

5. **client_idを取得**
   - 例: `123456789-abc.apps.googleusercontent.com`

### 3. manifest.jsonに追加

```json
{
  "oauth2": {
    "client_id": "123456789-abc.apps.googleusercontent.com",
    "scopes": [
      "https://www.googleapis.com/auth/drive.readonly"
    ]
  },
  "permissions": [
    "identity"
  ],
  "host_permissions": [
    "https://www.googleapis.com/*"
  ]
}
```

### 4. chrome.identity APIで認証

```javascript
chrome.identity.getAuthToken({ interactive: true }, (token) => {
  if (chrome.runtime.lastError) {
    console.error('Auth error:', chrome.runtime.lastError);
    return;
  }

  // tokenを使ってGoogle Drive APIを呼び出す
  fetch('https://www.googleapis.com/drive/v3/files', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
});
```

---

## まとめ

### OAuth 2.0クライアントIDとは

- **アプリケーション（SightEdit）を識別するID**
- ユーザーのIDでも、開発者のIDでもない

### なぜ開発者が登録するのか

- Googleがアプリケーションを識別・管理するため
- 個人使用でも必須

### コストは？

- **Google Drive APIは完全無料**
- クォータ超過しても課金なし

### フリーウェアでも問題ない

- 標準的な実装方法
- 他の多くのChrome拡張機能も同じ方法を採用

### ユーザーの作業

- **認証画面で「許可」をクリックするだけ**
- Google Cloud Console設定は不要

---

## 参考リンク

- [Google Drive API - Usage Limits](https://developers.google.com/drive/api/guides/limits)
- [Chrome Extensions - User Authentication](https://developer.chrome.com/docs/extensions/reference/api/identity)
- [Using OAuth 2.0 to Access Google APIs](https://developers.google.com/identity/protocols/oauth2)

---

## 補足：なぜこの記事を書いたか

Chrome拡張機能でGoogle Drive APIを実装する際、「OAuth 2.0クライアントID」という用語が非常に混乱を招きました。

特に：
- 「クライアント」という用語が「ユーザー」を連想させる
- フリーウェアなのに開発者が設定する理由が不明確
- コスト負担の懸念

これらの疑問は、実装中に実際に生じたものです。同じ疑問を持つ開発者の助けになれば幸いです。

---

**記事作成日**: 2025年10月27日
**プロジェクト**: [SightEdit](https://github.com/mike2mike45/SightEdit)
**ライセンス**: MIT
