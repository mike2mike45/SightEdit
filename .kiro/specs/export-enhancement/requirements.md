# SightEdit対応 CDNライブラリ変換ツール・エクスポート先一覧

## 🎯 仕様条件
- **画像**: GoogleDrive内の共有ファイルリンクのみ
- **変換ツール**: JavaScriptから呼び出せるCDNライブラリ限定
- **エクスポート方法**: クリップボード出力のみ
- **対象サービス**: リッチテキストまたはMarkdownソース貼り付け対応

---

## 🔧 推奨無料CDN：jsDelivr

**単一CDN推奨**: jsDelivr（https://www.jsdelivr.com/）
- **パフォーマンス**: 無料CDNで2位の高速性、99.99%稼働率
- **対応ライブラリ**: marked.js、turndown、pdf-lib、docx関連等すべて対応
- **セキュリティ**: SRI（Subresource Integrity）対応、改ざんチェック可能
- **キャッシュ**: グローバル配信、ユーザー数が多いため高いキャッシュヒット率

### **推奨ライブラリ構成（jsDelivrのみ）**

```html
<!-- 基本変換 -->
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/turndown/dist/turndown.js"></script>

<!-- PDF出力 -->
<script src="https://cdn.jsdelivr.net/npm/pdf-lib/dist/pdf-lib.min.js"></script>

<!-- DOCX出力（どちらか選択推奨：html-docx-js） -->
<script src="https://cdn.jsdelivr.net/npm/html-docx-js/dist/html-docx.js"></script>
<!-- 高度な制御が必要な場合 -->
<script src="https://cdn.jsdelivr.net/npm/docx/build/index.js"></script>

<!-- DOCX読み込み -->
<script src="https://cdn.jsdelivr.net/npm/mammoth/mammoth.browser.min.js"></script>

<!-- ZIP作成（ウェブページ出力用） -->
<script src="https://cdn.jsdelivr.net/npm/jszip/dist/jszip.min.js"></script>
```

---

## 📊 対応形式一覧（出力方法別分類）

### 📋 **クリップボード出力対応（貼り付け用）**

| 形式 | 拡張子 | インポート | クリップボード出力 | ライブラリ | 評価 | 用途 |
|------|--------|------------|-------------------|------------|------|------|
| **HTML** | .html | ✅ | ✅ | marked.js | ⭐⭐⭐⭐⭐ | ブログ、CMS貼り付け |
| **Markdown** | .md | ✅ | ✅ | turndown.js | ⭐⭐⭐⭐⭐ | GitHub、技術記事 |
| **プレーンテキスト** | .txt | ✅ | ✅ | 標準API | ⭐⭐⭐⭐⭐ | 一般テキスト貼り付け |

### 💾 **ダウンロード出力対応（ファイル保存用）**

| 形式 | 拡張子 | インポート | ダウンロード出力 | ライブラリ | 評価 | 用途 |
|------|--------|------------|------------------|------------|------|------|
| **Microsoft Word** | .docx | ✅ | ✅ | mammoth.js + html-docx-js | ⭐⭐⭐⭐ | Office文書作成 |
| **PDF** | .pdf | ❌ | ✅ | pdf-lib | ⭐⭐⭐⭐ | 印刷・配布用 |
| **ウェブページ（ZIP）** | .zip | ❌ | ✅ | JSZip + marked.js | ⭐⭐⭐ | サイト公開用 |
| **プレーンテキスト** | .txt | ✅ | ✅ | 標準API | ⭐⭐⭐⭐⭐ | テキストファイル保存 |
| **HTML** | .html | ✅ | ✅ | marked.js | ⭐⭐⭐⭐⭐ | HTMLファイル保存 |
| **Markdown** | .md | ✅ | ✅ | turndown.js | ⭐⭐⭐⭐⭐ | Markdownファイル保存 |

### 🔶 **部分対応（制限あり）**

| 形式 | 拡張子 | インポート | 出力方法 | 制限事項 | 評価 |
|------|--------|------------|----------|----------|------|
| **リッチテキスト** | .rtf | 🔶 | 🔶 ダウンロード | HTML経由での変換のみ | ⭐⭐ |

### ❌ **対応困難（無料CDNでは実現不可）**

| 形式 | 拡張子 | 理由 | 代替案 |
|------|--------|------|--------|
| **一太郎** | .jtd | JavaScriptライブラリが存在しない | 一太郎ビューア使用 |
| **OpenDocument** | .odt | 複雑なODF仕様、ブラウザ対応なし | LibreOffice使用 |
| **EPUB** | .epub | ZIP+XML複合構造、専用ツール必要 | Pandoc等使用 |

### 📋 **対応形式詳細（出力方法別）**

#### **📋 クリップボード出力形式**

**HTML（リッチテキスト貼り付け）** ⭐⭐⭐⭐⭐
- **出力方法**: クリップボード（HTML + プレーンテキスト）
- **用途**: ブログ投稿、CMS、メールエディタ
- **対象サービス**: note、Medium、WordPress、Notion等
- **CDN**: `https://cdn.jsdelivr.net/npm/marked/marked.min.js`

**Markdown（ソース貼り付け）** ⭐⭐⭐⭐⭐
- **出力方法**: クリップボード（プレーンテキスト）
- **用途**: GitHub、技術記事、開発ドキュメント
- **対象サービス**: GitHub、Qiita、Zenn、Stack Overflow等
- **CDN**: `https://cdn.jsdelivr.net/npm/turndown/dist/turndown.js`

**プレーンテキスト（テキスト貼り付け）** ⭐⭐⭐⭐⭐
- **出力方法**: クリップボード（プレーンテキスト）
- **用途**: メモ帳、チャット、簡易エディタ
- **対象サービス**: 全般的なテキスト入力欄
- **CDN**: 標準API（ライブラリ不要）

#### **💾 ダウンロード出力形式**

**Microsoft Word（.docx）** ⭐⭐⭐⭐
- **出力方法**: ファイルダウンロード
- **インポート**: mammoth.js（DOCX → HTML → SightEdit WYSIWYG）
- **エクスポート**: html-docx-js（SightEdit WYSIWYG HTML → DOCX）
- **用途**: Office文書作成、公式文書、レポート
- **CDN**: `https://cdn.jsdelivr.net/npm/mammoth/mammoth.browser.min.js`
- **CDN**: `https://cdn.jsdelivr.net/npm/html-docx-js/dist/html-docx.js`
- **制限**: 複雑なレイアウトは一部精度低下

**PDF（.pdf）** ⭐⭐⭐⭐
- **出力方法**: ファイルダウンロード
- **エクスポート**: pdf-lib（SightEdit HTML → PDF）
- **用途**: 印刷用、配布用、アーカイブ
- **CDN**: `https://cdn.jsdelivr.net/npm/pdf-lib/dist/pdf-lib.min.js`
- **制限**: 基本的なテキスト出力のみ、レイアウト制限あり

**ウェブページ（.zip）** ⭐⭐⭐
- **出力方法**: ファイルダウンロード
- **エクスポート**: JSZip + marked.js（HTML + CSS → ZIP）
- **用途**: サイト公開、ポートフォリオ、デモページ
- **CDN**: `https://cdn.jsdelivr.net/npm/jszip/dist/jszip.min.js`

**HTMLファイル（.html）** ⭐⭐⭐⭐⭐
- **出力方法**: ファイルダウンロード
- **エクスポート**: marked.js変換後、HTMLファイルとして保存
- **用途**: ウェブページ、ローカル表示、アーカイブ

**Markdownファイル（.md）** ⭐⭐⭐⭐⭐
- **出力方法**: ファイルダウンロード
- **エクスポート**: turndown.js変換またはソース保存
- **用途**: GitHub投稿、技術ドキュメント、バックアップ

**テキストファイル（.txt）** ⭐⭐⭐⭐⭐
- **出力方法**: ファイルダウンロード
- **エクスポート**: HTMLからテキスト抽出
- **用途**: プレーンテキスト保存、テキスト処理

---

## 📝 対応エクスポート先サービス（独自フォーマット注釈付き）

### 🇯🇵 **日本語圏サービス**

#### **小説・創作プラットフォーム**
- **小説家になろう**: テキストエディタ（リッチテキスト対応）
  - *独自記法: `|漢字《ふりがな》`、`漢字(かんじ)`、傍点`|文字《・》`*
- **カクヨム**: テキストエディタ（リッチテキスト対応）
  - *独自記法: `|漢字《ふりがな》`、傍点`《《文字》》`*
- **pixiv小説**: テキスト入力+特殊タグ（リッチテキスト一部対応）
  - *独自記法: `[[rb:漢字 > ふりがな]]`、`[newpage]`、`[chapter:章題]`*
- **アルファポリス**: テキストエディタ（リッチテキスト対応）
  - *独自記法: `__漢字__ふりがな`（旧形式）、現在は`|漢字《ふりがな》`対応*
- **エブリスタ**: Webエディタ（リッチテキスト対応）
  - *独自記法: `|漢字《ふりがな》`*

#### **技術記事・ブログサービス**
- **Qiita**: エディタでHTML貼り付け → 自動Markdown変換
- **Zenn**: Webエディタのリッチテキストペースト
  - *独自記法: 数式`$...$`、コードブロック、メッセージボックス*
- **はてなブログ**: 見たまま編集モード
  - *独自記法: `[tex:数式]`、はてな記法*
- **note**: リッチエディタ（豊富な埋め込み対応）

#### **Markdownソース貼り付け対応**
- **Qiita**: Markdownモード直接貼り付け
- **Zenn**: GitHubリポジトリ連携時
- **はてなブログ**: Markdownモード設定時
- **Backlog**: Wiki・課題説明（Markdown記法）

### 🌍 **英語圏サービス**

#### **技術記事・ブログプラットフォーム**
- **Medium**: エディタのペースト機能
- **Dev.to**: リッチエディタ
  - *独自記法: `{% コンテンツ埋め込み %}`、Liquid Tags*
- **Hashnode**: 記事エディタ（Markdown対応）
- **Substack**: ニュースレターエディタ（リッチテキスト対応）

#### **開発・技術プラットフォーム**
- **GitHub Issues/Discussions**: リッチテキストペースト
  - *独自記法: GitHub Flavored Markdown、`@mention`、`#issue`*
- **GitLab**: Web IDE
  - *独自記法: GitLab Flavored Markdown、`~label`、`&epic`*
- **Stack Overflow**: 質問・回答エディタ（Markdown対応）

#### **コンテンツ管理システム**
- **WordPress**: ビジュアルエディタ
  - *独自記法: ショートコード`[shortcode]`、ブロックエディタ*
- **Ghost**: エディタ（Markdown対応）
  - *独自記法: カード`{{#card}}`、ギャラリー`{{#gallery}}`*
- **Drupal**: CKEditor（リッチテキスト対応）

#### **Markdownソース貼り付け対応**
- **GitHub**: README.md等の直接編集
- **GitLab**: Markdownファイル編集
- **Dev.to**: Markdownエディタモード
- **Stack Overflow**: Markdownエディタ
- **Hashnode**: Markdownエディタ

### 💼 **ビジネス・ドキュメンテーションツール**

#### **リッチテキスト貼り付け対応**
- **Notion**: ブロックエディタ
  - *独自記法: `@mention`、`/コマンド`、データベース参照*
- **Confluence**: リッチテキストエディタ
  - *独自記法: `{マクロ}`、`@mention`、ページリンク*
- **Obsidian**: ノートエディタ（Markdown対応）
  - *独自記法: `[[内部リンク]]`、`![[埋め込み]]`、タグ`#tag`*
- **Roam Research**: ブロックエディタ
  - *独自記法: `[[ページリンク]]`、`((ブロック参照))`、`#タグ`*
- **Logseq**: ブロックエディタ（Markdown対応）
  - *独自記法: `[[ページ]]`、`((ref))`、ブロック`- 項目`*

#### **Markdownソース貼り付け対応**
- **Notion**: コードブロック内
- **Confluence**: マークアップエディタ（一部）
- **Obsidian**: Markdownエディタ
- **Logseq**: Markdownエディタ
- **GitHub Projects**: プロジェクト説明
- **GitLab Issues**: Markdownエディタ

---

## 🎯 用途別推奨設定（jsDelivr単一CDN）

### **小説・創作投稿（小説家になろう/カクヨム/pixiv）**
- **使用ライブラリ**: marked.js
- **出力形式**: リッチテキスト（HTML）
- **特徴**: ルビや改ページ対応、長文処理
- **独自記法対応**: 後処理でルビ記法変換

### **技術記事投稿（Qiita/Zenn/Dev.to）**
- **使用ライブラリ**: marked.js
- **出力形式**: Markdownソース
- **特徴**: GitHub Flavored Markdown完全対応

### **一般ブログ（はてな/Medium/note）**
- **使用ライブラリ**: marked.js
- **出力形式**: リッチテキスト（HTML）
- **特徴**: レイアウト重視、画像埋め込み

### **ドキュメンテーション（Notion/Confluence/Obsidian）**
- **使用ライブラリ**: marked.js + turndown.js（逆変換時）
- **出力形式**: 両対応（切り替え可能）
- **特徴**: 表・リスト構造の保持

### **開発プラットフォーム（GitHub/GitLab）**
- **使用ライブラリ**: marked.js
- **出力形式**: Markdownソース
- **特徴**: GitHub Flavored Markdown完全対応

### **CMS（WordPress/Ghost/Drupal）**
- **使用ライブラリ**: marked.js
- **出力形式**: リッチテキスト（HTML）
- **特徴**: ブロックエディタ対応

### **Office文書（Word/PDF）**
- **使用ライブラリ**: html-docx-js、pdf-lib
- **出力形式**: DOCX、PDF
- **特徴**: SightEditのWYSIWYG HTML活用

---

## 🛠️ 実装例：SightEdit統合変換ツール（jsDelivr単一CDN版）

### **基本構成**
```html
<!-- jsDelivr CDNからのライブラリ読み込み -->
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/turndown/dist/turndown.js"></script>
<script src="https://cdn.jsdelivr.net/npm/pdf-lib/dist/pdf-lib.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/html-docx-js/dist/html-docx.js"></script>
<script src="https://cdn.jsdelivr.net/npm/mammoth/mammoth.browser.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/jszip/dist/jszip.min.js"></script>
```

### **万能インポート・エクスポーター（出力方法別実装）**
```javascript
class SightEditUniversalConverter {
  constructor() {
    this.marked = marked;
    this.turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced'
    });
  }
  
  // ========== クリップボード出力機能 ==========
  
  // HTML（リッチテキスト貼り付け用）
  async copyAsHTML(markdownContent) {
    try {
      const processedMarkdown = this.processSpecialFormats(markdownContent);
      const html = this.marked.parse(processedMarkdown);
      await this.copyToClipboard(html, 'text/html');
      return { success: true, format: 'HTML', method: 'clipboard' };
    } catch (error) {
      return { success: false, error };
    }
  }
  
  // Markdown（ソース貼り付け用）
  async copyAsMarkdown(markdownContent) {
    try {
      const processedMarkdown = this.processSpecialFormats(markdownContent);
      await this.copyToClipboard(processedMarkdown, 'text/plain');
      return { success: true, format: 'Markdown', method: 'clipboard' };
    } catch (error) {
      return { success: false, error };
    }
  }
  
  // プレーンテキスト（テキスト貼り付け用）
  async copyAsText(markdownContent) {
    try {
      const html = this.marked.parse(markdownContent);
      const text = this.extractTextFromHTML(html);
      await this.copyToClipboard(text, 'text/plain');
      return { success: true, format: 'Text', method: 'clipboard' };
    } catch (error) {
      return { success: false, error };
    }
  }
  
  // ========== ダウンロード出力機能 ==========
  
  // DOCX（ファイルダウンロード）
  async downloadAsDOCX(wysiwygHTML, filename = 'document.docx') {
    try {
      if (typeof htmlDocx !== 'undefined') {
        const converted = htmlDocx.asBlob(wysiwygHTML);
        this.downloadBlob(converted, filename);
        return { success: true, format: 'DOCX', method: 'download' };
      } else {
        throw new Error('html-docx-js library not loaded');
      }
    } catch (error) {
      return { success: false, error };
    }
  }
  
  // PDF（ファイルダウンロード）
  async downloadAsPDF(wysiwygHTML, filename = 'document.pdf') {
    try {
      const pdfDoc = await PDFLib.PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4サイズ
      
      const textContent = this.extractTextFromHTML(wysiwygHTML);
      const { width, height } = page.getSize();
      
      page.drawText(textContent, {
        x: 50,
        y: height - 50,
        size: 12,
        maxWidth: width - 100,
      });
      
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      this.downloadBlob(blob, filename);
      
      return { success: true, format: 'PDF', method: 'download' };
    } catch (error) {
      return { success: false, error };
    }
  }
  
  // ウェブページZIP（ファイルダウンロード）
  async downloadAsWebPage(markdownContent, filename = 'webpage.zip') {
    try {
      const zip = new JSZip();
      const html = this.marked.parse(markdownContent);
      
      const fullHTML = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SightEdit Export</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 40px; line-height: 1.6; }
        h1, h2, h3 { color: #333; }
        code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
        pre { background: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; }
        blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 20px; color: #666; }
    </style>
</head>
<body>
${html}
</body>
</html>`;
      
      zip.file("index.html", fullHTML);
      
      const zipBlob = await zip.generateAsync({type: "blob"});
      this.downloadBlob(zipBlob, filename);
      
      return { success: true, format: 'ZIP', method: 'download' };
    } catch (error) {
      return { success: false, error };
    }
  }
  
  // HTMLファイル（ファイルダウンロード）
  async downloadAsHTML(markdownContent, filename = 'document.html') {
    try {
      const html = this.marked.parse(markdownContent);
      const blob = new Blob([html], { type: 'text/html' });
      this.downloadBlob(blob, filename);
      return { success: true, format: 'HTML', method: 'download' };
    } catch (error) {
      return { success: false, error };
    }
  }
  
  // Markdownファイル（ファイルダウンロード）
  async downloadAsMarkdown(markdownContent, filename = 'document.md') {
    try {
      const blob = new Blob([markdownContent], { type: 'text/markdown' });
      this.downloadBlob(blob, filename);
      return { success: true, format: 'Markdown', method: 'download' };
    } catch (error) {
      return { success: false, error };
    }
  }
  
  // テキストファイル（ファイルダウンロード）
  async downloadAsText(markdownContent, filename = 'document.txt') {
    try {
      const html = this.marked.parse(markdownContent);
      const text = this.extractTextFromHTML(html);
      const blob = new Blob([text], { type: 'text/plain' });
      this.downloadBlob(blob, filename);
      return { success: true, format: 'Text', method: 'download' };
    } catch (error) {
      return { success: false, error };
    }
  }
  
  // ========== インポート機能 ==========
  
  // DOCXインポート
  async importFromDOCX(file) {
    try {
      if (typeof mammoth === 'undefined') {
        throw new Error('mammoth library not loaded');
      }
      
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      
      return {
        success: true,
        html: result.value,
        messages: result.messages,
        format: 'DOCX'
      };
    } catch (error) {
      return { success: false, error };
    }
  }
  
  // HTMLファイルインポート
  async importFromHTML(file) {
    try {
      const html = await file.text();
      return {
        success: true,
        html: html,
        format: 'HTML'
      };
    } catch (error) {
      return { success: false, error };
    }
  }
  
  // Markdownファイルインポート
  async importFromMarkdown(file) {
    try {
      const markdown = await file.text();
      const html = this.marked.parse(markdown);
      return {
        success: true,
        html: html,
        markdown: markdown,
        format: 'Markdown'
      };
    } catch (error) {
      return { success: false, error };
    }
  }
  
  // テキストファイルインポート
  async importFromText(file) {
    try {
      const text = await file.text();
      const html = text.split(/\n\s*\n/).map(para => 
        para.trim() ? `<p>${para.replace(/\n/g, '<br>')}</p>` : ''
      ).join('');
      
      return {
        success: true,
        html: html,
        text: text,
        format: 'Text'
      };
    } catch (error) {
      return { success: false, error };
    }
  }
  
  // ========== ユーティリティ関数 ==========
  
  // 特殊フォーマット対応
  processSpecialFormats(markdown) {
    let processed = markdown.replace(
      /https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\/[^)]*\?[^)]*/g,
      'https://drive.google.com/uc?export=view&id=$1'
    );
    
    processed = this.convertRubyNotation(processed);
    return processed;
  }
  
  // ルビ記法変換
  convertRubyNotation(text) {
    return text.replace(/\|([^《]+)《([^》]+)》/g, (match, kanji, ruby) => {
      return `${kanji}（${ruby}）`;
    });
  }
  
  // HTMLからテキスト抽出
  extractTextFromHTML(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  }
  
  // ファイルダウンロード
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  // クリップボードコピー
  async copyToClipboard(content, type = 'text/plain') {
    try {
      if (type === 'text/html') {
        const data = [new ClipboardItem({
          'text/html': new Blob([content], { type: 'text/html' }),
          'text/plain': new Blob([content], { type: 'text/plain' })
        })];
        await navigator.clipboard.write(data);
      } else {
        await navigator.clipboard.writeText(content);
      }
    } catch (err) {
      this.fallbackCopy(content);
    }
  }
  
  // 古いブラウザ対応
  fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

// SightEdit実装用の使用例
const converter = new SightEditUniversalConverter();

// ========== クリップボード出力（貼り付け用） ==========
// ブログ投稿やCMSへの貼り付け
converter.copyAsHTML(markdownContent);

// GitHub、技術記事への貼り付け
converter.copyAsMarkdown(markdownContent);

// 一般テキストエディタへの貼り付け
converter.copyAsText(markdownContent);

// ========== ダウンロード出力（ファイル保存用） ==========
// Office文書として保存
converter.downloadAsDOCX(wysiwygHTML, 'myDocument.docx');

// PDF文書として保存
converter.downloadAsPDF(wysiwygHTML, 'myDocument.pdf');

// ウェブサイトとして保存
converter.downloadAsWebPage(markdownContent, 'myWebsite.zip');

// 各種ファイル形式で保存
converter.downloadAsHTML(markdownContent, 'myDocument.html');
converter.downloadAsMarkdown(markdownContent, 'myDocument.md');
converter.downloadAsText(markdownContent, 'myDocument.txt');
```

---

## ⚠️ 重要な制約事項

### **セキュリティ制限**
- **HTTPS必須**: Clipboard APIはHTTPS環境でのみ動作
- **ユーザー操作必須**: ボタンクリック等のユーザーアクション必要
- **権限許可**: 初回実行時にブラウザの許可が必要
- **ファイルアップロード**: ローカルファイル読み込みはユーザー選択必須

### **ブラウザ対応**
- **モダンブラウザ**: Chrome 76+, Firefox 63+, Safari 13.1+
- **フォールバック**: 古いブラウザには`document.execCommand`使用
- **ファイルAPI**: File API、ArrayBuffer対応必須

### **ファイル形式制限**
- **DOCX**: 複雑なレイアウトは一部変換精度低下
- **PDF出力**: 基本的なテキスト出力のみ（高度なレイアウト制限）
- **一太郎・ODT・EPUB**: 無料CDNでは技術的に対応不可
- **GoogleDrive画像**: 「リンクを知っている全員」に設定必須

### **パフォーマンス制限**
- **大容量ファイル**: ブラウザメモリ制限に依存
- **PDF変換**: クライアントサイド処理のため比較的低速
- **DOCX変換**: 複雑な文書ほど処理時間増加

---

## 🚀 まとめ

この構成により、SightEditで作成したMarkdown文書を：

1. **CDNライブラリ**で軽量に変換
2. **クリップボード**経由で安全に転送
3. **主要サービス**で直接貼り付け
4. **Office形式**でダウンロード保存

が可能になり、Webアプリやコマンドラインツールに依存しない、ブラウザ完結型のワークフローを実現できます。

特に、添付画像の形式のうち**DOCX、PDF、HTML、TXT、Markdown**は高品質な無料CDNで完全対応可能です。