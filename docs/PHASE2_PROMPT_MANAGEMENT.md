# Prompt Management Feature - User Guide (Phase 2)
# プロンプト管理機能 - ユーザーガイド（Phase 2）

## 📋 Overview / 概要

Phase 2 introduces a custom prompt template management system. This allows you to save frequently used prompts as templates and reuse them flexibly with variables.

Phase 2では、カスタムプロンプトテンプレート管理システムを導入しました。これにより、よく使うプロンプトをテンプレートとして保存し、変数を使って柔軟に再利用できます。

## ✨ Key Features / 主要機能

### 1. Prompt Template Management / プロンプトテンプレート管理
- **CRUD Operations / CRUD操作**: Create, Read, Update, Delete templates / テンプレートの作成、読み込み、更新、削除
- **Variable Support / 変数サポート**: Embed dynamic values with `{{variable}}` format / `{{変数名}}` 形式で動的な値を埋め込み
- **Category Classification / カテゴリー分類**: Writing assistance, Coding, Translation, Others / 執筆支援、コーディング、翻訳、その他
- **Favorites Feature / お気に入り機能**: Quick access to frequently used templates / よく使うテンプレートを素早くアクセス

### 2. Default Template Library / デフォルトテンプレートライブラリ
Provides 25 ready-to-use templates: / 25種類の即使えるテンプレートを提供：
- **Writing Assistance / 執筆支援** (12): Blog posts, SEO optimization, headline generation, rewriting, expansion, summary, continue writing, paraphrasing, etc. / ブログ記事、SEO最適化、見出し生成、書き直し、展開、要約、続きを書く、パラフレーズなど
- **Coding / コーディング** (5): Code review, bug fixing, refactoring, documentation generation, test code generation / コードレビュー、バグ修正、リファクタリング、ドキュメント生成、テストコード生成
- **Translation / 翻訳** (5): English-Japanese, Japanese-English, localization, technical translation, summary translation / 英日翻訳、日英翻訳、ローカライゼーション、技術翻訳、要約翻訳
- **Others / その他** (5): Data analysis, Q&A generation, meeting minutes, email composition, presentation structure / データ分析、Q&A生成、議事録作成、メール作成、プレゼン構成

### 3. Prompt Library UI / プロンプトライブラリUI
- **Category Sidebar / カテゴリーサイドバー**: Organize templates by category / カテゴリー別にテンプレートを整理
- **Search Function / 検索機能**: Quickly search templates by keywords / キーワードでテンプレートを素早く検索
- **Card-Based Grid Layout / カードベースのグリッドレイアウト**: Visually appealing design / 視覚的に見やすいデザイン
- **Dark Mode Support / ダークモード対応**: Automatically adapts to system settings / システム設定に自動対応

### 4. Variable Input System / 変数入力システム
- **Dynamic Form Generation / 動的フォーム生成**: Automatically generates forms based on template variables / テンプレートの変数に基づいてフォームを自動生成
- **Variable Type Support / 変数タイプサポート**: text, textarea, number, select
- **Required/Optional / 必須/オプション**: Set required or optional for each variable / 変数ごとに必須・オプションを設定可能
- **Validation / バリデーション**: Input check for required variables / 必須変数の入力チェック

### 5. Import/Export / インポート/エクスポート
- **JSON Format / JSON形式**: Export templates in JSON format / テンプレートをJSON形式でエクスポート
- **Backup / バックアップ**: Backup and restore templates / テンプレートのバックアップと復元
- **Sharing / 共有**: Share templates with other users / テンプレートを他のユーザーと共有可能

## 🚀 How to Use / 使い方

### Opening the Prompt Library / プロンプトライブラリを開く

Three ways to open the prompt library: / 3つの方法でプロンプトライブラリを開けます：

1. **Chat Panel Button / チャットパネルボタン**: Click the "📝 Prompt" button in the chat panel header / チャットパネルヘッダーの「📝 プロンプト」ボタンをクリック
2. **Keyboard Shortcut / キーボードショートカット**: `Ctrl+P` (Mac: `Cmd+P`) - only when chat panel is displayed / `Ctrl+P`（Mac: `Cmd+P`）※チャットパネルが表示されている時のみ
3. **Programmatically / プログラム**: `window.promptLibrary.show()`

### Using Templates / テンプレートを使用する

#### Basic Usage / 基本的な使い方

1. Open the prompt library / プロンプトライブラリを開く
2. Find templates by category or search / カテゴリーまたは検索でテンプレートを見つける
3. Click on the template card / テンプレートカードをクリック
4. If there are variables, enter values in the variable input dialog / 変数がある場合は、変数入力ダイアログで値を入力
5. Click "Confirm" to apply the template / 「確認」ボタンでテンプレートを適用
6. The prompt is inserted into the chat input field / チャット入力欄にプロンプトが挿入される

#### Templates with Variables / 変数を使ったテンプレート

Example: "Blog Article Creation" template / 例: 「ブログ記事作成」テンプレート

```
Please create an engaging blog article about the following topic:

Topic: {{topic}}
Target Audience: {{audience}}
Word Count: Approximately {{word_count}} words

Include the following in the article:
- Catchy headline
- Introduction
- Body (multiple sections)
- Conclusion

---

以下のトピックについて、魅力的なブログ記事を作成してください:

トピック: {{topic}}
対象読者: {{audience}}
文字数: {{word_count}}文字程度

記事には以下を含めてください:
- キャッチーな見出し
- 導入部分
- 本文（複数のセクション）
- まとめ
```

Variable Input / 変数入力：
- `topic`: "AI for Productivity" / "AIによる生産性向上"
- `audience`: "Business Professionals" / "ビジネスパーソン"
- `word_count`: "2000"

Result: The prompt with embedded variables is inserted into the chat input field. / 結果：変数が埋め込まれたプロンプトがチャット入力欄に挿入されます。

### Creating New Templates / 新しいテンプレートを作成

1. Open the prompt library / プロンプトライブラリを開く
2. Click the "+ New" button / 「+ 新規作成」ボタンをクリック
3. Enter template information / テンプレート情報を入力：
   - **Name / 名前**: Template name / テンプレートの名前
   - **Description / 説明**: Template description / テンプレートの説明
   - **Category / カテゴリー**: Writing assistance, Coding, Translation, Others / 執筆支援、コーディング、翻訳、その他
   - **Prompt / プロンプト**: Actual prompt text (define variables with `{{variable}}`) / 実際のプロンプト文（`{{変数名}}` で変数を定義）
4. Variables are automatically detected / 変数が自動的に検出される
5. Set type and description for each variable / 各変数のタイプと説明を設定
6. Click "Save" button / 「保存」ボタンをクリック

### Editing Templates / テンプレートを編集

1. Display the template card in the prompt library / プロンプトライブラリでテンプレートカードを表示
2. Click the "✏️ Edit" button on the card / カードの「✏️ 編集」ボタンをクリック
3. Edit the information / 情報を編集
4. Click "Save" button / 「保存」ボタンをクリック

### Deleting Templates / テンプレートを削除

1. Display the template card in the prompt library / プロンプトライブラリでテンプレートカードを表示
2. Click the "🗑️ Delete" button on the card / カードの「🗑️ 削除」ボタンをクリック
3. Select "Delete" in the confirmation dialog / 確認ダイアログで「削除」を選択

### Adding Templates to Favorites / テンプレートをお気に入りに追加

1. Display the template card in the prompt library / プロンプトライブラリでテンプレートカードを表示
2. Click the "☆" button on the card (add to favorites) / カードの「☆」ボタンをクリック（お気に入りに追加）
3. Click again to change to "⭐" and remove from favorites / もう一度クリックすると「⭐」になり、お気に入り解除

### Searching Templates / テンプレートを検索

1. Enter keywords in the search box of the prompt library / プロンプトライブラリの検索ボックスにキーワードを入力
2. Search from template name, description, and prompt content / テンプレート名、説明、プロンプト内容から検索
3. Filtered in real-time / リアルタイムでフィルタリングされる

### Filtering by Category / カテゴリーでフィルター

1. Click a category in the sidebar / サイドバーのカテゴリーをクリック
2. Display only templates in that category / そのカテゴリーのテンプレートのみ表示
3. Click "All" to display all templates / 「すべて」をクリックするとすべてのテンプレートを表示

### Exporting Templates / テンプレートをエクスポート

#### Export All / すべてエクスポート

1. Open the prompt library / プロンプトライブラリを開く
2. Click the "↓ Export All" button / 「↓ すべてエクスポート」ボタンをクリック
3. A JSON format file is downloaded / JSON形式のファイルがダウンロードされる

#### Selective Export / 選択してエクスポート

1. Open the prompt library / プロンプトライブラリを開く
2. Enable "Select for Export" mode (to be implemented) / 「選択してエクスポート」モードを有効化（今後実装予定）
3. Select templates to export / エクスポートしたいテンプレートを選択
4. Click "Export" button / 「エクスポート」ボタンをクリック

### Importing Templates / テンプレートをインポート

1. Open the prompt library / プロンプトライブラリを開く
2. Click the "↑ Import" button / 「↑ インポート」ボタンをクリック
3. Select a JSON format file / JSON形式のファイルを選択
4. Import results are displayed / インポート結果が表示される
5. Templates with duplicate IDs are added with new IDs / 重複するIDのテンプレートは新しいIDで追加される

## 🎨 Variable Usage / 変数の使い方

### Variable Definition / 変数の定義

Define variables within prompts using the `{{variable_name}}` format: / プロンプト内で `{{変数名}}` の形式で変数を定義します：

```
Hello {{name}}, the weather today is {{weather}}.
こんにちは{{name}}さん、今日は{{weather}}ですね。
```

### Variable Types / 変数タイプ

- **text**: Single-line text input (names, keywords, etc.) / 1行のテキスト入力（名前、キーワードなど）
- **textarea**: Multi-line text input (sentences, code, etc.) / 複数行のテキスト入力（文章、コードなど）
- **number**: Numeric input (word count, age, etc.) / 数値入力（文字数、年齢など）
- **select**: Dropdown selection (specify options) / ドロップダウン選択（オプションを指定）

### Variable Configuration Example / 変数の設定例

```javascript
variables: [
  {
    name: 'name',
    type: 'text',
    description: 'Your name / あなたの名前',
    required: true
  },
  {
    name: 'content',
    type: 'textarea',
    description: 'Text to improve / 改善したい文章',
    required: true
  },
  {
    name: 'word_count',
    type: 'number',
    description: 'Target word count / 目標文字数',
    required: false,
    default: '1000'
  },
  {
    name: 'tone',
    type: 'select',
    description: 'Writing tone / 文章のトーン',
    options: ['Casual/カジュアル', 'Formal/フォーマル', 'Professional/専門的'],
    required: true
  }
]
```

## ⌨️ Keyboard Shortcuts / キーボードショートカット

| Shortcut / ショートカット | Function / 機能 |
|--------------|------|
| `Ctrl+P` / `Cmd+P` | Open prompt library (when chat panel is displayed) / プロンプトライブラリを開く（チャットパネル表示時） |
| `Esc` | Close prompt library / プロンプトライブラリを閉じる |

## 💡 Usage Examples / 使用例

### Example 1: Creating a Blog Article / 例1: ブログ記事を作成

1. Open prompt library with `Ctrl+P` / `Ctrl+P` でプロンプトライブラリを開く
2. Select "Blog Article Creation" template / 「ブログ記事作成」テンプレートを選択
3. Enter variables / 変数を入力：
   - Topic / トピック: "Remote Work Productivity" / "リモートワークの生産性"
   - Target Audience / 対象読者: "Business Professionals" / "ビジネスパーソン"
   - Word Count / 文字数: "2000"
4. Prompt is inserted into chat input field / プロンプトがチャット入力欄に挿入される
5. Submit to have AI generate the article / 送信してAIに記事を生成させる

### Example 2: Requesting Code Review / 例2: コードレビューを依頼

1. Select code in the editor / エディターでコードを選択
2. Set context to "Selection" in chat panel / チャットパネルでコンテキストを「選択範囲」に設定
3. Open prompt library with `Ctrl+P` / `Ctrl+P` でプロンプトライブラリを開く
4. Select "Code Review" template / 「コードレビュー」テンプレートを選択
5. Enter programming language (e.g., "JavaScript") / プログラミング言語を入力（例: "JavaScript"）
6. Submit for AI review / 送信してAIにレビューさせる

### Example 3: Creating Custom Template / 例3: カスタムテンプレートを作成

1. Find frequently used prompt patterns / よく使うプロンプトパターンを見つける
2. Click "+ New" in prompt library / プロンプトライブラリで「+ 新規作成」
3. Enter template information / テンプレート情報を入力：
   ```
   Name/名前: Technical Article Title Ideas / 技術記事のタイトル案
   Category/カテゴリー: Writing Assistance / 執筆支援
   Prompt/プロンプト:
   Please suggest 5 attractive article titles for the following technology:

   Technology: {{technology}}
   Target Audience: {{audience}}

   Titles should include:
   - Specific numbers and results
   - Keywords that attract reader interest
   - SEO-conscious keywords

   ---

   以下の技術について、魅力的な記事タイトルを5つ提案してください:

   技術: {{technology}}
   対象読者: {{audience}}

   タイトルは以下の要素を含めてください:
   - 具体的な数値や成果
   - 読者の興味を引くキーワード
   - SEOを意識したキーワード
   ```
4. Variables are automatically detected (technology, audience) / 変数が自動検出される（technology, audience）
5. Set type for each variable (both text, required: true) / 各変数のタイプを設定（両方 text, required: true）
6. Save / 保存

### Example 4: Backing Up Templates / 例4: テンプレートをバックアップ

1. Click "↓ Export All" in prompt library / プロンプトライブラリで「↓ すべてエクスポート」
2. `prompt-templates-backup.json` is downloaded / `prompt-templates-backup.json` がダウンロードされる
3. Save in a safe location / 安全な場所に保存
4. Restore with "↑ Import" when needed / 必要に応じて「↑ インポート」で復元

### Example 5: Continue Writing / 例5: 文章を続きを書く

1. Select text in the editor / エディターで文章を選択
2. Set context to "Selection" in chat panel / チャットパネルでコンテキストを「選択範囲」に設定
3. Open prompt library with `Ctrl+P` / `Ctrl+P` でプロンプトライブラリを開く
4. Select "Continue Writing" template / 「続きを書く」テンプレートを選択
5. Selected text is automatically filled in the variable / 選択した文章が変数に自動入力される
6. Submit for AI to continue writing / 送信してAIに続きを書かせる

## 🔧 Advanced Usage / 高度な使い方

### Programmatic Operations / プログラムからの操作

#### PromptManager API

```javascript
// Create template / テンプレート作成
const template = await window.promptManager.createTemplate({
  name: 'My Template / マイテンプレート',
  description: 'Description / 説明',
  category: 'Writing Assistance / 執筆支援',
  prompt: 'This is {{variable}} / これは{{variable}}です',
  variables: [
    { name: 'variable', type: 'text', required: true }
  ]
});

// Get all templates / すべてのテンプレート取得
const templates = await window.promptManager.getAllTemplates();

// Filter by category / カテゴリーでフィルター
const writingTemplates = window.promptManager.getTemplatesByCategory('執筆支援');

// Search / 検索
const results = window.promptManager.searchTemplates('blog / ブログ');

// Apply template / テンプレート適用
const prompt = window.promptManager.applyTemplate(templateId, {
  variable: 'value / 値'
});

// Update template / テンプレート更新
await window.promptManager.updateTemplate(templateId, {
  name: 'New Name / 新しい名前'
});

// Delete template / テンプレート削除
await window.promptManager.deleteTemplate(templateId);

// Toggle favorite / お気に入り切り替え
await window.promptManager.toggleFavorite(templateId);

// Recently used templates / 最近使用したテンプレート
const recent = window.promptManager.getRecentlyUsed(5);

// Export / エクスポート
const exported = window.promptManager.exportTemplates([id1, id2]);

// Import / インポート
const result = await window.promptManager.importTemplates(exportedData);
```

#### PromptLibrary API

```javascript
// Show library / ライブラリを表示
window.promptLibrary.show((prompt, template) => {
  console.log('Selected prompt / 選択されたプロンプト:', prompt);
  console.log('Template / テンプレート:', template.name);
});

// Hide library / ライブラリを非表示
window.promptLibrary.hide();
```

### Custom Variable Validation / カスタム変数バリデーション

Add validation logic when creating templates: / テンプレート作成時に、変数の検証ロジックを追加できます：

```javascript
const template = await window.promptManager.createTemplate({
  name: 'Custom Validation / カスタム検証',
  prompt: 'Email address / メールアドレス: {{email}}',
  variables: [
    {
      name: 'email',
      type: 'text',
      required: true,
      description: 'Email address / メールアドレス',
      // Custom validation to be implemented / カスタム検証は今後実装予定
      validate: (value) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      }
    }
  ]
});
```

## 📊 Integration Tests / 統合テスト

### Testing in Browser Console / ブラウザコンソールでのテスト

Open the editor page and run in console: / エディターページを開いて、コンソールで以下を実行：

```javascript
// Run all Phase 2 tests / すべてのPhase 2テストを実行
await runAllPhase2Tests()

// Integration tests only / 統合テストのみ
await runPhase2IntegrationTest()

// Performance tests only / パフォーマンステストのみ
await runPromptPerformanceTest()

// UI tests only / UI テストのみ
await runPromptUITest()
```

### Test Items / テスト項目

#### Integration Tests / 統合テスト
- ✅ PromptManager initialization check / PromptManager 初期化確認
- ✅ Default template loading / デフォルトテンプレート読み込み
- ✅ Template CRUD operations / テンプレート CRUD 操作
- ✅ Variable parsing feature / 変数パース機能
- ✅ Template application and variable substitution / テンプレート適用と変数置換
- ✅ Category filtering / カテゴリーフィルタリング
- ✅ Search feature / 検索機能
- ✅ Favorites feature / お気に入り機能
- ✅ Export/Import feature / エクスポート/インポート機能
- ✅ Recently used templates / 最近使用したテンプレート

#### Performance Tests / パフォーマンステスト
- ✅ Mass template creation (100 items) / 大量テンプレート作成（100件）
- ✅ All template loading / 全テンプレート読み込み
- ✅ Category filtering speed / カテゴリーフィルタリング速度
- ✅ Search speed / 検索速度
- ✅ Template application speed (50 times) / テンプレート適用速度（50回）
- ✅ Export speed (100 items) / エクスポート速度（100件）
- ✅ Import speed (100 items) / インポート速度（100件）

#### UI Tests / UI テスト
- ✅ PromptLibrary initialization check / PromptLibrary 初期化確認
- ✅ ChatPanel integration check / ChatPanel との統合確認
- ✅ Modal display / モーダル表示
- ✅ Category display / カテゴリー表示
- ✅ Prompt card display / プロンプトカード表示
- ✅ Search feature / 検索機能

### Performance Benchmarks / パフォーマンス基準

| Operation / 操作 | Target Time / 目標時間 |
|------|---------|
| Create 100 templates / 100件のテンプレート作成 | < 5s / < 5秒 |
| Load all templates / 全テンプレート読み込み | < 100ms |
| Category filtering / カテゴリーフィルタリング | < 50ms |
| Search (5 times) / 検索（5回） | < 100ms |
| Template application (50 times) / テンプレート適用（50回） | < 500ms |
| Export (100 items) / エクスポート（100件） | < 100ms |
| Import (100 items) / インポート（100件） | < 3s / < 3秒 |

## 🔒 Privacy and Security / プライバシーとセキュリティ

- **Local Storage / ローカル保存**: All templates are saved in local Chrome Storage / すべてのテンプレートはローカルのChrome Storageに保存されます
- **Offline Usage / オフライン利用**: Template management possible without internet connection / インターネット接続なしでテンプレート管理が可能
- **Data Encryption / データ暗号化**: Automatic encryption by Chrome Storage API / Chrome Storage APIによる自動暗号化
- **Export Control / エクスポート制御**: Data only goes external when explicitly exported by user / ユーザーが明示的にエクスポートした場合のみデータが外部に出る

## 🐛 Troubleshooting / トラブルシューティング

### Prompt library not displaying / プロンプトライブラリが表示されない

1. Check if chat panel is displayed / チャットパネルが表示されているか確認してください
2. Check browser console for errors / ブラウザのコンソールでエラーを確認してください
3. Verify `window.promptManager` and `window.promptLibrary` exist / `window.promptManager` と `window.promptLibrary` が存在するか確認してください
4. Reload the page / ページを再読み込みしてください

### Templates not saving / テンプレートが保存されない

1. Check Chrome Storage capacity / Chrome Storageの容量を確認してください
2. Run `chrome.storage.local.get()` in console to check storage status / コンソールで `chrome.storage.local.get()` を実行して保存状況を確認
3. Check if storage is enabled in browser settings / ブラウザの設定でストレージが有効か確認してください

### Variables not being replaced / 変数が置換されない

1. Verify variable name is in exact `{{variable_name}}` format / 変数名が正確に `{{変数名}}` の形式になっているか確認
2. Check variable name doesn't contain spaces or special characters / 変数名にスペースや特殊文字が含まれていないか確認
3. Verify values were correctly entered in variable input dialog / 変数入力ダイアログで値を正しく入力したか確認

### Import fails / インポートに失敗する

1. Verify JSON file format is correct / JSONファイルの形式が正しいか確認してください
2. Check file is not corrupted / ファイルが破損していないか確認してください
3. Verify using same version of SightEdit as when exported / エクスポート時と同じバージョンのSightEditを使用しているか確認してください

## 🚧 Future Features (Phase 3) / 今後の機能（Phase 3）

### Advanced Features / 高度な機能
- Structured generation templates (blog articles, technical docs, presentations) / 構造化生成テンプレート（ブログ記事、技術文書、プレゼン）
- Template version control / テンプレートのバージョン管理
- Template sharing (community) / テンプレート共有（コミュニティ）
- AI-powered automatic template suggestions / AI による自動テンプレート提案
- Custom validation rules for variables / 変数のカスタム検証ルール
- Template preview feature / テンプレートのプレビュー機能
- Template tagging / テンプレートのタグ付け
- Usage statistics and recommended templates / 使用統計とおすすめテンプレート

## 📝 Feedback / フィードバック

Please report issues or suggestions on GitHub Issues. / 問題や改善提案がある場合は、GitHubのIssueでお知らせください。

---

**Version / バージョン**: Phase 2.0
**Last Updated / 最終更新**: 2025-10-24