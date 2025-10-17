# SightEdit 機能追加実装計画

## 概要
3つの機能追加仕様を統合し、段階的に実装を進める計画書

## 機能一覧と優先順位

### 🎯 優先順位の判断基準
1. **ユーザー価値**: 即座に使える機能を優先
2. **技術的依存関係**: 基盤機能を先に実装
3. **実装難易度**: 簡単な機能から着手
4. **既存機能との統合**: 既存のAI機能をベースに拡張

## 実装優先順位

### Phase 1: AIコマンド選択ツール（優先度: 高）
**期間**: 2週間  
**理由**: 既存のAI機能（Gemini/Claude統合）を活用でき、ユーザー価値が最も高い

#### 実装ステップ
1. **Week 1**: UI設計・コマンドパネル実装
   - コマンド選択UI（ドロップダウン/ボタン形式）
   - カテゴリ分類（文書編集、ビジネス、マーケティング等）
   - プロンプトテンプレート管理システム

2. **Week 2**: AI統合・テスト
   - 既存のAIManager拡張
   - 構造化プロンプトの実装
   - 多言語対応処理

#### 対象ファイル
- `src/lib/ai-manager.js` - コマンド処理ロジック追加
- `src/editor/editor.html` - コマンドパネルUI追加
- `src/editor/simple-editor.js` - エディター統合

### Phase 2: エクスポート機能拡張（優先度: 中）
**期間**: 1週間  
**理由**: CDNライブラリ統合で実装が比較的容易、即座に価値提供可能

#### 実装ステップ
1. **Day 1-2**: CDNライブラリ統合
   - jsDelivrからのライブラリ読み込み
   - marked.js、turndown、pdf-lib統合

2. **Day 3-4**: エクスポート機能実装
   - クリップボード出力（HTML/Markdown/Text）
   - ダウンロード出力（PDF/DOCX）

3. **Day 5**: テスト・最適化
   - 各フォーマット変換テスト
   - UI統合

#### 対象ファイル
- 新規作成: `src/lib/export-manager.js`
- `src/editor/editor.html` - エクスポートメニュー追加
- `webpack.config.js` - CDN設定追加

### Phase 3: Git UI機能（優先度: 低）
**期間**: 3週間  
**理由**: 最も複雑な実装、Chrome Extension APIとGit統合が必要

#### 実装ステップ
1. **Week 1**: 基本Git操作の実装
   - Git状態管理システム
   - ファイル変更追跡

2. **Week 2**: UI実装
   - 初心者向けUI構築
   - 二重表記システム実装

3. **Week 3**: GitHub連携
   - OAuth認証
   - Push/Pull操作

#### 対象ファイル
- 新規作成: `src/lib/git-manager.js`
- 新規作成: `src/components/git-panel.js`
- `manifest.json` - Git権限追加

## 実装アプローチ

### 1. AIコマンド選択ツール - 詳細設計

```javascript
// ai-manager.js への追加機能
class AICommandManager extends AIManager {
  constructor() {
    super();
    this.commands = {
      'summary': {
        name: '要約作成',
        prompt: '以下のテキストを簡潔に要約してください：\n\n{text}',
        category: 'document'
      },
      'proofread': {
        name: '校正・推敲',
        prompt: '以下のテキストの誤字脱字を修正し、文体を統一してください：\n\n{text}',
        category: 'document'
      },
      // ... 他のコマンド
    };
  }

  async executeCommand(commandId, text) {
    const command = this.commands[commandId];
    const prompt = command.prompt.replace('{text}', text);
    return await this.callAI(prompt);
  }
}
```

### 2. エクスポート機能 - 実装方法

```html
<!-- editor.html への追加 -->
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/turndown/dist/turndown.js"></script>
<script src="https://cdn.jsdelivr.net/npm/pdf-lib/dist/pdf-lib.min.js"></script>
```

```javascript
// export-manager.js 新規作成
class ExportManager {
  async exportToHTML(markdown) {
    return marked.parse(markdown);
  }

  async exportToPDF(markdown) {
    const html = marked.parse(markdown);
    // pdf-lib を使用してPDF生成
  }

  async exportToDOCX(markdown) {
    // html-docx-js を使用してDOCX生成
  }

  async copyToClipboard(content, format) {
    // クリップボードAPI使用
  }
}
```

### 3. Git UI - 段階的実装

```javascript
// git-manager.js 新規作成（簡易版）
class SimpleGitManager {
  constructor() {
    this.status = {
      modified: [],
      staged: [],
      untracked: []
    };
  }

  // Phase 3で実装
  async getStatus() {
    // ローカルファイルシステムの変更を追跡
  }

  async commit(message) {
    // コミット処理（初期はローカルのみ）
  }
}
```

## テスト計画

### Unit Tests
- 各コマンドのプロンプト生成テスト
- エクスポート形式変換テスト
- Git状態管理テスト

### Integration Tests  
- AI API連携テスト
- CDNライブラリ読み込みテスト
- Chrome Extension API統合テスト

### User Acceptance Tests
- 初心者ユーザーによるGit UI操作テスト
- エクスポート品質確認
- AIコマンド結果の品質確認

## リスクと対策

### 技術的リスク
1. **CDN依存**: jsDelivrダウン時の対策 → ローカルフォールバック
2. **AI API制限**: レート制限対策 → キャッシュ機構実装
3. **Git統合複雑性**: 段階的実装で対応

### セキュリティ考慮事項
1. **APIキー管理**: 既存のChrome Storage暗号化を活用
2. **CSP対応**: CDN読み込みをmanifest.jsonで許可
3. **データプライバシー**: ローカル処理優先

## 成功指標

### Phase 1 (AIコマンド)
- 10種類以上のコマンド実装
- 応答時間 < 3秒
- ユーザー満足度 > 80%

### Phase 2 (エクスポート)
- 5形式以上の出力対応
- 変換精度 > 95%
- エクスポート時間 < 5秒

### Phase 3 (Git UI)
- 基本操作の成功率 > 95%
- 初心者テスター理解度 > 90%
- GitHub連携成功率 > 98%

## まとめ

6週間で3つの主要機能を段階的に実装：
1. **Weeks 1-2**: AIコマンド選択ツール（最優先）
2. **Week 3**: エクスポート機能拡張
3. **Weeks 4-6**: Git UI機能

各フェーズで動作する機能をリリースし、ユーザーフィードバックを収集しながら改善を進める。