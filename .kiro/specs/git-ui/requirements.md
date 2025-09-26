# SightEdit Git機能 初心者向けUI仕様書

## コンセプト
「GitHubを初めて使う人でも、直感的に操作できるシンプルなバージョン管理UI」  
※ 経験者向けに正式なGit用語も併記し、専門性を保持

## 基本方針

### 1. 二重表記システム
- **初心者向け**: 分かりやすい日本語
- **エンジニア向け**: 正式なGit用語を併記
- 例: 「保存 (Commit)」「復元 (Restore)」

### 2. 操作を3つに集約
1. **保存 (Commit)** - ファイルの変更を記録
2. **復元 (Restore)** - ファイルを元に戻す
3. **同期 (Push/Pull)** - GitHubとの連携

### 3. 視覚的で分かりやすいUI
- アイコン中心の操作
- 色分けで状態を表現
- 確認ダイアログで安全性確保

---

## UI構成

### メインパネル「プロジェクト管理 (Git Repository)」

```
┌─────────────────────────────────────┐
│ 📁 プロジェクト管理 (Git Repository)  [×] │
├─────────────────────────────────────┤
│ 現在のプロジェクト: MyWebsite        │
│ ブランチ (Branch): main             │
│ 最後の保存 (Last Commit): 2時間前    │
│ GitHub同期 (Remote): ✅ 最新         │
└─────────────────────────────────────┘
```

### セクション1: ファイルの状態 (Working Directory & Staging)

```
┌─────────────────────────────────────┐
│ 📝 変更されたファイル (Modified Files)  │
├─────────────────────────────────────┤
│ 🟡 index.html        [元に戻す(Restore)] [ステージ(Stage)] │
│ 🟢 style.css         [元に戻す(Restore)] [アンステージ(Unstage)] │
│ 🔵 newfile.js        [元に戻す(Restore)] [ステージ(Stage)] │
│                                     │
│ [📋 全てステージ(Stage All)] [🔄 状態を更新(Refresh)]  │
└─────────────────────────────────────┘
```

### セクション2: 保存操作 (Commit)

```
┌─────────────────────────────────────┐
│ 💾 変更を保存 (Commit Changes)        │
├─────────────────────────────────────┤
│ コミットメッセージ (Commit Message):   │
│ ┌─────────────────────────────────┐   │
│ │ ホームページのデザインを更新      │   │
│ └─────────────────────────────────┘   │
│                                     │
│ [💾 変更を保存する(Commit)]            │
└─────────────────────────────────────┘
```

### セクション3: GitHub同期 (Remote Operations)

```
┌─────────────────────────────────────┐
│ ☁️ GitHubとの同期 (Remote Sync)       │
├─────────────────────────────────────┤
│ 📤 アップロード待ち (Ahead): 2 commits │
│ 📥 ダウンロード可能 (Behind): 0 commits│
│                                     │
│ [📤 GitHubにプッシュ(Push)] [📥 GitHubからプル(Pull)] │
└─────────────────────────────────────┘
```

---

## 詳細仕様

### 1. ファイル状態の表示 (File Status)

#### ファイル状態の色分け
- 🟡 **黄色 (Modified)**: 変更されたファイル（Unstaged）
- 🟢 **緑色 (Staged)**: ステージング済みのファイル
- 🔵 **青色 (Untracked)**: 新しく作成されたファイル
- 🔴 **赤色 (Deleted)**: 削除されたファイル

#### ファイル操作ボタン
- **[元に戻す(Restore)]**: `git restore <file>`
- **[ステージ(Stage)]**: `git add <file>`
- **[アンステージ(Unstage)]**: `git restore --staged <file>`

#### 状態表示の詳細
```html
<div class="file-item modified">
  <span class="file-icon">🟡</span>
  <span class="file-path">src/index.html</span>
  <span class="file-status-label">変更済み (Modified)</span>
  <div class="file-actions">
    <button class="restore-btn">元に戻す (Restore)</button>
    <button class="stage-btn">ステージ (Stage)</button>
  </div>
</div>
```

### 2. 保存機能 (Commit Operation)

#### UI要素
```html
<div class="commit-section">
  <h3>💾 変更を保存 (Commit Changes)</h3>
  <label for="commit-message">コミットメッセージ (Commit Message):</label>
  <textarea id="commit-message" 
            placeholder="例: feat: ホームページのデザインを青系に変更&#10;&#10;- ヘッダーの背景色を変更&#10;- ナビゲーションのスタイル調整"></textarea>
  <div class="commit-help">
    <small>💡 ヒント: 変更内容を分かりやすく記述してください (What you changed and why)</small>
  </div>
  <button class="commit-btn">💾 変更を保存する (Commit)</button>
</div>
```

#### Git操作仕様
```javascript
// 内部実装 - 正式なGitコマンド使用
async commitChanges(message) {
  // git commit -m "message"
  await git.commit(message);
  
  // UI更新
  await refreshRepositoryStatus();
  showSuccessMessage("✅ 変更を保存しました (Committed successfully)");
}
```

### 3. 復元機能 (Restore Operations)

#### 個別ファイル復元
```javascript
// git restore <file> の実装
async restoreFile(filePath) {
  const confirmed = await showConfirmDialog({
    title: "⚠️ ファイルを元に戻しますか？ (Restore File?)",
    message: `${filePath}の変更が失われます。\nChanges to this file will be lost.\n\n実行するGitコマンド: git restore ${filePath}`,
    okText: "元に戻す (Restore)",
    cancelText: "キャンセル (Cancel)"
  });
  
  if (confirmed) {
    await git.raw(['restore', filePath]);
    await refreshFileStatus();
    showSuccessMessage(`✅ ${filePath} を元に戻しました (Restored successfully)`);
  }
}
```

#### ステージング解除
```javascript
// git restore --staged <file> の実装
async unstageFile(filePath) {
  await git.raw(['restore', '--staged', filePath]);
  showSuccessMessage(`✅ ${filePath} をアンステージしました (Unstaged successfully)`);
}
```

### 4. ブランチ操作 (Branch Operations)

#### ブランチ切り替えUI
```html
<div class="branch-section">
  <h4>🌿 作業ブランチ (Current Branch)</h4>
  <div class="current-branch">
    <span class="branch-icon">🌿</span>
    <span class="branch-name">main</span>
    <button class="branch-switch-btn">ブランチを切り替え (Switch Branch)</button>
  </div>
</div>
```

#### Git Switch操作
```javascript
// git switch <branch> の実装
async switchBranch(branchName) {
  try {
    await git.raw(['switch', branchName]);
    showSuccessMessage(`✅ ブランチ「${branchName}」に切り替えました (Switched to branch)`);
  } catch (error) {
    showErrorMessage(`❌ ブランチ切り替えに失敗: ${error.message}`);
  }
}

// git switch -c <new-branch> の実装
async createAndSwitchBranch(branchName) {
  await git.raw(['switch', '-c', branchName]);
  showSuccessMessage(`✅ 新しいブランチ「${branchName}」を作成し切り替えました (Created and switched to new branch)`);
}
```

### 5. GitHub同期機能 (Remote Operations)

#### プッシュ操作
```html
<button class="push-btn" onclick="pushToGitHub()">
  📤 GitHubにプッシュ (Push to GitHub)
  <span class="commit-count">2件のコミット (2 commits ahead)</span>
</button>
```

#### プル操作
```html
<button class="pull-btn" onclick="pullFromGitHub()">
  📥 GitHubからプル (Pull from GitHub)
  <span class="commit-count">最新 (Up to date)</span>
</button>
```

---

## メッセージ・ダイアログ仕様

### 1. 確認ダイアログ (Confirmation Dialogs)

#### ファイル復元時
```
┌─────────────────────────────────────┐
│ ⚠️ ファイルを元に戻しますか？         │
│    (Restore File?)               │
├─────────────────────────────────────┤
│ index.htmlの変更が失われます。      │
│ Changes to this file will be lost.  │
│                                     │
│ 実行されるコマンド:                  │
│ git restore index.html              │
│                                     │
│   [元に戻す(Restore)]  [キャンセル(Cancel)]  │
└─────────────────────────────────────┘
```

#### 危険な操作時（全変更破棄）
```
┌─────────────────────────────────────┐
│ ⚠️ 全ての変更を破棄しますか？         │
│    (Discard All Changes?)        │
├─────────────────────────────────────┤
│ 3個のファイルの変更が失われます。    │
│ Changes to 3 files will be lost.    │
│                                     │
│ 実行されるコマンド:                  │
│ git restore .                       │
│                                     │
│ 本当に実行する場合は「DISCARD」と   │
│ 入力してください:                   │
│ ┌─────────────────────────────────┐   │
│ │                             │   │
│ └─────────────────────────────────┘   │
│                                     │
│     [実行する(Execute)]  [キャンセル(Cancel)]    │
└─────────────────────────────────────┘
```

### 2. 操作完了メッセージ
```javascript
const Messages = {
  COMMIT_SUCCESS: "✅ 変更を保存しました (Committed successfully)",
  RESTORE_SUCCESS: "✅ ファイルを元に戻しました (File restored)",
  PUSH_SUCCESS: "✅ GitHubにプッシュしました (Pushed to GitHub)",
  PULL_SUCCESS: "✅ GitHubからプルしました (Pulled from GitHub)",
  STAGE_SUCCESS: "✅ ステージングしました (Staged successfully)",
  UNSTAGE_SUCCESS: "✅ アンステージしました (Unstaged successfully)"
};
```

### 3. エラーメッセージ（専門的な詳細付き）
```javascript
const ErrorMessages = {
  NETWORK_ERROR: "❌ GitHubに接続できません (Network connection failed)\n詳細: リモートリポジトリへの接続がタイムアウトしました",
  AUTH_ERROR: "❌ GitHubの認証が必要です (Authentication required)\n詳細: Personal Access Tokenまたは SSH Key を設定してください",
  MERGE_CONFLICT: "⚠️ マージコンフリクトが発生しました (Merge conflict detected)\n詳細: 手動で競合を解決してから再度実行してください",
  NOTHING_TO_COMMIT: "ℹ️ 保存する変更がありません (Nothing to commit)\n詳細: ステージングされたファイルがありません"
};
```

---

## 初期設定ウィザード

### ステップ1: GitHubアカウント連携
```
┌─────────────────────────────────────┐
│ 🚀 GitHubと連携しよう                │
│    (Connect to GitHub)            │
├─────────────────────────────────────┤
│ GitHubアカウントを持っていますか？   │
│ Do you have a GitHub account?       │
│                                     │
│ [✅ 持っている(Yes)] [❌ 持っていない(No)]  │
│                                     │
│ 持っていない場合:                   │
│ [🌐 GitHubアカウントを作る(Create Account)] │
│                                     │
│ 💡 ヒント: GitHubは無料で使用できる  │
│    世界最大のソースコード管理サービス │
│    です (Git hosting service)       │
└─────────────────────────────────────┘
```

### ステップ2: リポジトリ初期化
```
┌─────────────────────────────────────┐
│ 📁 プロジェクトを設定しよう           │
│    (Initialize Repository)        │
├─────────────────────────────────────┤
│ リポジトリ名 (Repository Name):      │
│ ┌─────────────────────────────────┐   │
│ │ my-website                  │   │
│ └─────────────────────────────────┘   │
│                                     │
│ 説明 (Description, 任意):            │
│ ┌─────────────────────────────────┐   │
│ │ 私のウェブサイト                │   │
│ └─────────────────────────────────┘   │
│                                     │
│ 実行されるコマンド:                  │
│ git init --initial-branch=main      │
│ git remote add origin <repo-url>    │
│                                     │
│ [🚀 プロジェクトを開始する(Initialize)]    │
└─────────────────────────────────────┘
```

---

## 技術仕様 (Technical Specifications)

### 1. 使用するGitコマンド
```javascript
const GitCommands = {
  // ブランチ操作 (Branch Operations)
  SWITCH_BRANCH: ['switch', branchName],
  CREATE_BRANCH: ['switch', '-c', newBranchName],
  
  // ファイル操作 (File Operations)  
  RESTORE_FILE: ['restore', filePath],
  RESTORE_STAGED: ['restore', '--staged', filePath],
  STAGE_FILE: ['add', filePath],
  
  // コミット操作 (Commit Operations)
  COMMIT: ['commit', '-m', message],
  
  // リモート操作 (Remote Operations)
  PUSH: ['push', 'origin', branchName],
  PULL: ['pull', 'origin', branchName],
  FETCH: ['fetch', 'origin']
};
```

### 2. ファイル状態管理
```javascript
const FileStatus = {
  MODIFIED: {
    key: 'modified',
    label: '変更済み (Modified)',
    color: '#ffc107',
    icon: '🟡'
  },
  STAGED: {
    key: 'staged', 
    label: 'ステージ済み (Staged)',
    color: '#28a745',
    icon: '🟢'
  },
  UNTRACKED: {
    key: 'untracked',
    label: '新規作成 (Untracked)', 
    color: '#17a2b8',
    icon: '🔵'
  },
  DELETED: {
    key: 'deleted',
    label: '削除済み (Deleted)',
    color: '#dc3545', 
    icon: '🔴'
  }
};
```

### 3. エラーハンドリング（Git専門用語対応）
```javascript
class GitErrorHandler {
  static handleError(error) {
    if (error.message.includes('fatal: not a git repository')) {
      return "❌ Gitリポジトリではありません (Not a git repository)";
    }
    
    if (error.message.includes('nothing to commit')) {
      return "ℹ️ コミットする変更がありません (Nothing to commit, working tree clean)";
    }
    
    if (error.message.includes('merge conflict')) {
      return "⚠️ マージコンフリクト (Merge conflict in files)";
    }
    
    // 原文も併記
    return `❌ Git操作エラー: ${error.message}`;
  }
}
```

---

## 開発者向け情報表示

### デバッグモード
設定で「開発者モード」をONにすると、実行されるGitコマンドをコンソールに表示：

```javascript
// 開発者モード時の追加表示
if (isDeveloperMode) {
  console.log(`[SightEdit Git] Executing: git ${command.join(' ')}`);
  
  // UI上にも小さく表示
  showCommandTooltip(`git ${command.join(' ')}`);
}
```

### Git履歴表示
```html
<div class="git-history" style="display: none;" data-developer-mode="true">
  <h4>📋 Git操作履歴 (Command History)</h4>
  <div class="command-log">
    <div class="command-item">git add src/index.html</div>
    <div class="command-item">git commit -m "feat: ヘッダーデザイン更新"</div>
    <div class="command-item">git push origin main</div>
  </div>
</div>
```

---

## アクセシビリティ対応

### 1. キーボード操作
- `Tab`: フォーカス移動
- `Enter`: ボタン実行  
- `Escape`: ダイアログを閉じる
- `Ctrl+S`: クイック保存（コミット）

### 2. スクリーンリーダー対応
```html
<button aria-label="ファイルを元に戻す。Git restore コマンドを実行します">
  元に戻す (Restore)
</button>
```

---

この仕様により、初心者には分かりやすく、エンジニアには「ちゃんとGitを理解している」と評価される両立したUIが実現できます。