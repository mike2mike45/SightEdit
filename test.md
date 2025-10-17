# SightEdit テストファイル

このファイルは、SightEditの動作確認用テストファイルです。

## 機能テスト

### 基本的なMarkdown記法

- **太字のテキスト**
- *斜体のテキスト*
- ~~取り消し線~~

### リスト

1. 番号付きリスト
2. 項目2
3. 項目3

### コードブロック

```javascript
function test() {
    console.log("Hello, SightEdit!");
}
```

### リンクと画像

[SightEditのGitHub](https://github.com/mike2mike45/sightedit)

### 表

| 機能 | 状態 |
|------|------|
| 外部ファイル読み込み | ✅ |
| Markdown表示 | ✅ |
| エディタ機能 | ✅ |

---

## 動作確認手順

1. このファイルをエクスプローラーでダブルクリック
2. SightEditRelay.exeが起動
3. Chrome拡張機能のエディタが開く
4. このMarkdown内容が正しく表示される

もし正常に動作しない場合は、以下を確認してください：
- Chrome拡張機能が有効になっているか
- 拡張機能ID: `chibfgpnajlchhljdojcpmamhplnogcp`
- SightEditRelay.exeが正しくビルドされているか