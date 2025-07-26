const fs = require('fs').promises;
const path = require('path');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class GitManager {
  constructor() {
    this.currentRepository = null;
    this.isGitAvailable = false;
  }

  // Gitの利用可能性をチェック
  async checkGitAvailability() {
    try {
      await execAsync('git --version');
      this.isGitAvailable = true;
      return true;
    } catch (error) {
      this.isGitAvailable = false;
      return false;
    }
  }

  // 現在のファイルパスからリポジトリルートを検索
  async findRepositoryRoot(filePath) {
    if (!filePath) return null;
    
    let currentDir = path.dirname(filePath);
    
    while (currentDir !== path.dirname(currentDir)) {
      try {
        const gitDir = path.join(currentDir, '.git');
        await fs.access(gitDir);
        return currentDir;
      } catch {
        currentDir = path.dirname(currentDir);
      }
    }
    
    return null;
  }

  // リポジトリの初期化
  async initializeRepository(dirPath) {
    if (!this.isGitAvailable) {
      throw new Error('Gitがインストールされていません');
    }

    try {
      // .gitignoreファイルを作成
      const gitignoreContent = `# SightEdit用 .gitignore
node_modules/
.DS_Store
Thumbs.db
*.log
*.tmp
.env
.vscode/settings.json
dist/
build/

# SightEdit設定ファイル
sightedit-config.json
`;
      
      await fs.writeFile(path.join(dirPath, '.gitignore'), gitignoreContent, 'utf8');
      
      // Gitリポジトリを初期化（mainブランチで開始）
      await execAsync('git init --initial-branch=main', { cwd: dirPath });
      
      // Git 2.28未満の場合のフォールバック
      try {
        // mainブランチに切り替え（既に存在する場合はスキップ）
        await execAsync('git checkout -b main', { cwd: dirPath });
      } catch (error) {
        // 既にmainブランチの場合やその他のエラーは無視
        console.log('Main branch setup:', error.message);
      }
      
      // Gitの文字コード設定を追加（UTF-8に統一）
      await execAsync('git config core.quotepath false', { cwd: dirPath });
      await execAsync('git config core.autocrlf false', { cwd: dirPath });
      await execAsync('git config core.safecrlf false', { cwd: dirPath });
      await execAsync('git config i18n.commitencoding utf-8', { cwd: dirPath });
      await execAsync('git config i18n.logoutputencoding utf-8', { cwd: dirPath });
      
      // デフォルトブランチ名をmainに設定
      await execAsync('git config init.defaultBranch main', { cwd: dirPath });
      
      // 初期コミット用のREADMEを作成
      const readmeContent = `# ${path.basename(dirPath)}

このプロジェクトはSightEditで管理されています。

## 概要
ここにプロジェクトの説明を記述してください。

## 使い方
ここに使い方を記述してください。
`;
      
      await fs.writeFile(path.join(dirPath, 'README.md'), readmeContent, 'utf8');
      
      this.currentRepository = dirPath;
      
      return {
        success: true,
        message: 'Gitリポジトリを初期化しました（mainブランチ）'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // リポジトリの状態を取得
  async getRepositoryStatus(repoPath = this.currentRepository) {
    if (!repoPath || !this.isGitAvailable) {
      return null;
    }

    try {
      // UTF-8環境でGitコマンドを実行するための設定
      const execOptions = {
        cwd: repoPath,
        env: {
          ...process.env,
          LC_ALL: 'C.UTF-8',
          LANG: 'C.UTF-8'
        },
        encoding: 'utf8'
      };

      // ブランチ情報を取得
      const { stdout: branchOutput } = await execAsync('git branch --show-current', execOptions);
      const currentBranch = branchOutput.trim();

      // ステータス情報を取得（UTF-8で正しく表示されるようにオプション追加）
      const { stdout: statusOutput } = await execAsync('git status --porcelain -z', execOptions);
      
      // リモートリポジトリ情報を取得
      let remoteUrl = null;
      try {
        const { stdout: remoteOutput } = await execAsync('git remote get-url origin', execOptions);
        remoteUrl = remoteOutput.trim();
      } catch {
        // リモートが設定されていない場合
      }

      // コミット履歴を取得（最新10件）
      let commits = [];
      try {
        const { stdout: logOutput } = await execAsync(
          'git log --oneline -10 --pretty=format:"%h|%an|%ar|%s"', 
          execOptions
        );
        commits = logOutput.split('\n').filter(line => line).map(line => {
          const [hash, author, date, message] = line.split('|');
          return { hash, author, date, message };
        });
      } catch {
        // コミットがない場合
      }

      // 変更ファイルの詳細を解析（null区切りで処理）
      const changes = this.parseGitStatusZ(statusOutput);

      return {
        currentBranch,
        remoteUrl,
        changes,
        commits,
        hasChanges: changes.length > 0,
        hasRemote: !!remoteUrl
      };
    } catch (error) {
      console.error('Git status error:', error);
      return null;
    }
  }

  // 特定のコミットからファイル内容を取得
  async getFileFromCommit(commitHash, filePath, repoPath = this.currentRepository) {
    if (!repoPath || !this.isGitAvailable) {
      return { success: false, error: 'リポジトリが見つかりません' };
    }

    if (!commitHash || !filePath) {
      return { success: false, error: 'コミットハッシュとファイルパスが必要です' };
    }

    try {
      const execOptions = {
        cwd: repoPath,
        env: {
          ...process.env,
          LC_ALL: 'C.UTF-8',
          LANG: 'C.UTF-8'
        },
        encoding: 'utf8'
      };

      // 指定されたコミットからファイル内容を取得
      const { stdout: fileContent } = await execAsync(
        `git show "${commitHash}:${filePath}"`,
        execOptions
      );

      // コミット情報も取得
      const { stdout: commitInfo } = await execAsync(
        `git show --pretty=format:"%h|%an|%ar|%s" --no-patch "${commitHash}"`,
        execOptions
      );

      const [hash, author, date, message] = commitInfo.split('|');

      return {
        success: true,
        content: fileContent,
        filePath,
        fileName: path.basename(filePath),
        commitInfo: {
          hash,
          author,
          date,
          message
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `ファイルの取得に失敗しました: ${error.message}`
      };
    }
  }

  // 特定のコミットのファイル一覧を取得
  async getCommitFiles(commitHash, repoPath = this.currentRepository) {
    if (!repoPath || !this.isGitAvailable) {
      return { success: false, error: 'リポジトリが見つかりません' };
    }

    if (!commitHash) {
      return { success: false, error: 'コミットハッシュが必要です' };
    }

    try {
      const execOptions = {
        cwd: repoPath,
        env: {
          ...process.env,
          LC_ALL: 'C.UTF-8',
          LANG: 'C.UTF-8'
        },
        encoding: 'utf8'
      };

      // 指定されたコミットに含まれるファイル一覧を取得
      const { stdout: filesOutput } = await execAsync(
        `git diff-tree --no-commit-id --name-only -r "${commitHash}"`,
        execOptions
      );

      const files = filesOutput.split('\n').filter(file => file.trim());

      // コミット情報も取得
      const { stdout: commitInfo } = await execAsync(
        `git show --pretty=format:"%h|%an|%ar|%s" --no-patch "${commitHash}"`,
        execOptions
      );

      const [hash, author, date, message] = commitInfo.split('|');

      return {
        success: true,
        files,
        commitInfo: {
          hash,
          author,
          date,
          message
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `ファイル一覧の取得に失敗しました: ${error.message}`
      };
    }
  }

  // Gitステータスの出力を解析（null区切り版）
  parseGitStatusZ(statusOutput) {
    const changes = [];
    if (!statusOutput) return changes;
    
    // null区切りで分割（最後の空要素を除去）
    const entries = statusOutput.split('\0').filter(entry => entry);

    for (const entry of entries) {
      if (entry.length < 3) continue;
      
      const status = entry.substring(0, 2);
      const filePath = entry.substring(3);
      
      let changeType = 'modified';
      if (status.includes('A')) changeType = 'added';
      else if (status.includes('D')) changeType = 'deleted';
      else if (status.includes('R')) changeType = 'renamed';
      else if (status.includes('??')) changeType = 'untracked';

      changes.push({
        filePath,
        changeType,
        staged: status[0] !== ' ' && status[0] !== '?'
      });
    }

    return changes;
  }

  // Gitステータスの出力を解析（従来版 - フォールバック用）
  parseGitStatus(statusOutput) {
    const changes = [];
    const lines = statusOutput.split('\n').filter(line => line);

    for (const line of lines) {
      const status = line.substring(0, 2);
      const filePath = line.substring(3);
      
      let changeType = 'modified';
      if (status.includes('A')) changeType = 'added';
      else if (status.includes('D')) changeType = 'deleted';
      else if (status.includes('R')) changeType = 'renamed';
      else if (status.includes('??')) changeType = 'untracked';

      changes.push({
        filePath,
        changeType,
        staged: status[0] !== ' ' && status[0] !== '?'
      });
    }

    return changes;
  }

  // ファイルをステージングエリアに追加
  async stageFile(filePath, repoPath = this.currentRepository) {
    if (!repoPath || !this.isGitAvailable) {
      return { success: false, error: 'リポジトリが見つかりません' };
    }

    try {
      const execOptions = {
        cwd: repoPath,
        env: {
          ...process.env,
          LC_ALL: 'C.UTF-8',
          LANG: 'C.UTF-8'
        }
      };
      
      await execAsync(`git add "${filePath}"`, execOptions);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ファイルをステージングエリアから除外
  async unstageFile(filePath, repoPath = this.currentRepository) {
    if (!repoPath || !this.isGitAvailable) {
      return { success: false, error: 'リポジトリが見つかりません' };
    }

    try {
      const execOptions = {
        cwd: repoPath,
        env: {
          ...process.env,
          LC_ALL: 'C.UTF-8',
          LANG: 'C.UTF-8'
        }
      };
      
      await execAsync(`git reset HEAD "${filePath}"`, execOptions);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // すべての変更をステージング
  async stageAllChanges(repoPath = this.currentRepository) {
    if (!repoPath || !this.isGitAvailable) {
      return { success: false, error: 'リポジトリが見つかりません' };
    }

    try {
      const execOptions = {
        cwd: repoPath,
        env: {
          ...process.env,
          LC_ALL: 'C.UTF-8',
          LANG: 'C.UTF-8'
        }
      };
      
      await execAsync('git add .', execOptions);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // コミットを作成
  async createCommit(message, repoPath = this.currentRepository) {
    if (!repoPath || !this.isGitAvailable) {
      return { success: false, error: 'リポジトリが見つかりません' };
    }

    if (!message || !message.trim()) {
      return { success: false, error: 'コミットメッセージが必要です' };
    }

    try {
      // Gitユーザー設定を確認
      const userConfig = await this.checkUserConfiguration(repoPath);
      if (!userConfig.isConfigured) {
        return { 
          success: false, 
          error: 'Gitユーザー設定が必要です',
          needsUserConfig: true 
        };
      }

      await execAsync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { cwd: repoPath });
      return { success: true, message: 'コミットを作成しました' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Gitユーザー設定をチェック
  async checkUserConfiguration(repoPath = this.currentRepository) {
    try {
      const { stdout: nameOutput } = await execAsync('git config user.name', { cwd: repoPath });
      const { stdout: emailOutput } = await execAsync('git config user.email', { cwd: repoPath });
      
      const name = nameOutput.trim();
      const email = emailOutput.trim();
      
      return {
        isConfigured: !!(name && email),
        name,
        email
      };
    } catch {
      return {
        isConfigured: false,
        name: '',
        email: ''
      };
    }
  }

  // すべての設定されたGitアカウントを取得
  async getAllGitAccounts() {
    const accounts = [];
    
    try {
      // グローバル設定を取得
      try {
        const { stdout: globalName } = await execAsync('git config --global user.name');
        const { stdout: globalEmail } = await execAsync('git config --global user.email');
        
        if (globalName.trim() && globalEmail.trim()) {
          accounts.push({
            type: 'global',
            name: globalName.trim(),
            email: globalEmail.trim(),
            displayName: `${globalName.trim()} <${globalEmail.trim()}> (グローバル)`
          });
        }
      } catch {
        // グローバル設定がない場合
      }

      // ローカル設定を取得（現在のリポジトリがある場合）
      if (this.currentRepository) {
        try {
          const { stdout: localName } = await execAsync('git config --local user.name', { cwd: this.currentRepository });
          const { stdout: localEmail } = await execAsync('git config --local user.email', { cwd: this.currentRepository });
          
          if (localName.trim() && localEmail.trim()) {
            accounts.push({
              type: 'local',
              name: localName.trim(),
              email: localEmail.trim(),
              displayName: `${localName.trim()} <${localEmail.trim()}> (ローカル)`,
              repoPath: this.currentRepository
            });
          }
        } catch {
          // ローカル設定がない場合
        }
      }

      return accounts;
    } catch (error) {
      console.error('Error getting git accounts:', error);
      return [];
    }
  }

  // Gitアカウントを削除
  async removeGitAccount(type, repoPath = null) {
    try {
      const execOptions = repoPath ? { cwd: repoPath } : {};
      
      if (type === 'global') {
        await execAsync('git config --global --unset user.name', execOptions);
        await execAsync('git config --global --unset user.email', execOptions);
        return { success: true, message: 'グローバルアカウントを削除しました' };
      } else if (type === 'local' && repoPath) {
        await execAsync('git config --local --unset user.name', execOptions);
        await execAsync('git config --local --unset user.email', execOptions);
        return { success: true, message: 'ローカルアカウントを削除しました' };
      } else {
        return { success: false, error: '削除対象が不正です' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 既存アカウントを選択して適用
  async selectExistingAccount(account, targetType, targetRepoPath = null) {
    try {
      if (targetType === 'global') {
        await execAsync(`git config --global user.name "${account.name}"`);
        await execAsync(`git config --global user.email "${account.email}"`);
        return { success: true, message: 'グローバル設定を更新しました' };
      } else if (targetType === 'local' && targetRepoPath) {
        await execAsync(`git config --local user.name "${account.name}"`, { cwd: targetRepoPath });
        await execAsync(`git config --local user.email "${account.email}"`, { cwd: targetRepoPath });
        return { success: true, message: 'ローカル設定を更新しました' };
      } else {
        return { success: false, error: '設定対象が不正です' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Gitユーザー設定を行う
  async setUserConfiguration(name, email, isGlobal = false, repoPath = this.currentRepository) {
    if (!this.isGitAvailable) {
      return { success: false, error: 'Gitがインストールされていません' };
    }

    try {
      const scope = isGlobal ? '--global' : '';
      const cwd = isGlobal ? undefined : repoPath;
      
      await execAsync(`git config ${scope} user.name "${name}"`, { cwd });
      await execAsync(`git config ${scope} user.email "${email}"`, { cwd });
      
      return { 
        success: true, 
        message: `Gitユーザー設定を${isGlobal ? 'グローバルに' : 'このリポジトリに'}保存しました` 
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // リモートリポジトリを追加
  async addRemoteRepository(remoteUrl, remoteName = 'origin', repoPath = this.currentRepository) {
    if (!repoPath || !this.isGitAvailable) {
      return { success: false, error: 'リポジトリが見つかりません' };
    }

    // URLの検証
    if (!remoteUrl || !remoteUrl.trim()) {
      return { success: false, error: 'リモートURLが必要です' };
    }

    // 基本的なURL形式チェック
    const urlPattern = /^(https?:\/\/|git@)/;
    if (!urlPattern.test(remoteUrl.trim())) {
      return { success: false, error: '有効なGitリポジトリURLを入力してください' };
    }

    try {
      const execOptions = {
        cwd: repoPath,
        env: {
          ...process.env,
          LC_ALL: 'C.UTF-8',
          LANG: 'C.UTF-8'
        }
      };

      // 既存のリモートをチェック
      let hasExistingRemote = false;
      try {
        await execAsync(`git remote get-url ${remoteName}`, execOptions);
        hasExistingRemote = true;
      } catch {
        // リモートが存在しない場合
      }

      if (hasExistingRemote) {
        // 既存のリモートがある場合は更新
        await execAsync(`git remote set-url ${remoteName} "${remoteUrl.trim()}"`, execOptions);
      } else {
        // 新規追加
        await execAsync(`git remote add ${remoteName} "${remoteUrl.trim()}"`, execOptions);
      }

      // リモートの設定が正しく行われたかテスト
      try {
        await execAsync(`git remote get-url ${remoteName}`, execOptions);
      } catch (error) {
        return { success: false, error: 'リモートリポジトリの設定に失敗しました' };
      }
      
      return { 
        success: true, 
        message: hasExistingRemote 
          ? `リモートリポジトリ "${remoteName}" を更新しました` 
          : `リモートリポジトリ "${remoteName}" を設定しました` 
      };
    } catch (error) {
      // エラーメッセージを分かりやすく
      let errorMessage = error.message;
      
      if (error.message.includes('not a git repository')) {
        errorMessage = 'Gitリポジトリが初期化されていません';
      } else if (error.message.includes('Invalid URL')) {
        errorMessage = '無効なURLです。正しいGitリポジトリURLを入力してください';
      } else if (error.message.includes('Permission denied')) {
        errorMessage = 'アクセス権限がありません。URLとアクセス権限を確認してください';
      }
      
      return { success: false, error: errorMessage };
    }
  }

  // リモートリポジトリにプッシュ
  async pushToRemote(remoteName = 'origin', branchName = null, repoPath = this.currentRepository) {
    if (!repoPath || !this.isGitAvailable) {
      return { success: false, error: 'リポジトリが見つかりません' };
    }

    try {
      const execOptions = {
        cwd: repoPath,
        env: {
          ...process.env,
          LC_ALL: 'C.UTF-8',
          LANG: 'C.UTF-8'
        }
      };

      // 現在のブランチ名を取得
      if (!branchName) {
        const { stdout } = await execAsync('git branch --show-current', execOptions);
        branchName = stdout.trim();
        
        if (!branchName) {
          return { success: false, error: 'ブランチが見つかりません。先にコミットを作成してください。' };
        }
      }

      // リモートの存在確認
      try {
        await execAsync(`git remote get-url ${remoteName}`, execOptions);
      } catch {
        return { success: false, error: `リモート "${remoteName}" が設定されていません。先にリモートリポジトリを設定してください。` };
      }

      // 初回プッシュかどうかチェック
      let isFirstPush = false;
      try {
        await execAsync(`git rev-parse --verify ${remoteName}/${branchName}`, execOptions);
      } catch {
        isFirstPush = true;
      }

      if (isFirstPush) {
        // 初回プッシュの場合は upstream を設定
        await execAsync(`git push -u ${remoteName} ${branchName}`, execOptions);
        return { success: true, message: `リモートリポジトリに初回プッシュしました（${branchName} → ${remoteName}）` };
      } else {
        // 通常のプッシュ
        await execAsync(`git push ${remoteName} ${branchName}`, execOptions);
        return { success: true, message: `リモートリポジトリにプッシュしました（${branchName} → ${remoteName}）` };
      }
    } catch (error) {
      // エラーメッセージを分かりやすく
      let errorMessage = error.message;
      
      if (error.message.includes('failed to push some refs')) {
        errorMessage = 'プッシュに失敗しました。リモートリポジトリに新しい変更がある可能性があります。先にプルを実行してください。';
      } else if (error.message.includes('Permission denied')) {
        errorMessage = 'アクセス権限がありません。認証情報を確認してください。';
      } else if (error.message.includes('Could not read from remote repository')) {
        errorMessage = 'リモートリポジトリにアクセスできません。URLとネットワーク接続を確認してください。';
      } else if (error.message.includes('Everything up-to-date')) {
        return { success: true, message: 'リモートリポジトリは最新の状態です' };
      }
      
      return { success: false, error: errorMessage };
    }
  }

  // リモートリポジトリからプル
  async pullFromRemote(remoteName = 'origin', branchName = null, repoPath = this.currentRepository) {
    if (!repoPath || !this.isGitAvailable) {
      return { success: false, error: 'リポジトリが見つかりません' };
    }

    try {
      const execOptions = {
        cwd: repoPath,
        env: {
          ...process.env,
          LC_ALL: 'C.UTF-8',
          LANG: 'C.UTF-8'
        }
      };

      // 現在のブランチ名を取得
      if (!branchName) {
        const { stdout } = await execAsync('git branch --show-current', execOptions);
        branchName = stdout.trim();
        
        if (!branchName) {
          return { success: false, error: 'ブランチが見つかりません' };
        }
      }

      // リモートの存在確認
      try {
        await execAsync(`git remote get-url ${remoteName}`, execOptions);
      } catch {
        return { success: false, error: `リモート "${remoteName}" が設定されていません。先にリモートリポジトリを設定してください。` };
      }

      // プル実行
      await execAsync(`git pull ${remoteName} ${branchName}`, execOptions);
      return { success: true, message: `リモートリポジトリからプルしました（${remoteName}/${branchName}）` };
    } catch (error) {
      // エラーメッセージを分かりやすく
      let errorMessage = error.message;
      
      if (error.message.includes('merge conflict')) {
        errorMessage = 'マージコンフリクトが発生しました。ファイルを手動で修正してからコミットしてください。';
      } else if (error.message.includes('Your local changes to the following files would be overwritten')) {
        errorMessage = 'ローカルの変更がコンフリクトします。先にコミットまたはスタッシュしてください。';
      } else if (error.message.includes('Could not read from remote repository')) {
        errorMessage = 'リモートリポジトリにアクセスできません。URLとネットワーク接続を確認してください。';
      } else if (error.message.includes('Already up to date')) {
        return { success: true, message: 'ローカルリポジトリは最新の状態です' };
      }
      
      return { success: false, error: errorMessage };
    }
  }

  // 差分を取得
  async getFileDiff(filePath, repoPath = this.currentRepository) {
    if (!repoPath || !this.isGitAvailable) {
      return null;
    }

    try {
      const { stdout } = await execAsync(`git diff "${filePath}"`, { cwd: repoPath });
      return this.parseDiff(stdout);
    } catch (error) {
      console.error('Diff error:', error);
      return null;
    }
  }

  // 差分を解析
  parseDiff(diffOutput) {
    const lines = diffOutput.split('\n');
    const changes = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('@@')) {
        // 変更箇所のヘッダー
        const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
        if (match) {
          changes.push({
            type: 'header',
            oldLine: parseInt(match[1]),
            newLine: parseInt(match[2]),
            content: line
          });
        }
      } else if (line.startsWith('-')) {
        changes.push({ type: 'removed', content: line.substring(1) });
      } else if (line.startsWith('+')) {
        changes.push({ type: 'added', content: line.substring(1) });
      } else if (!line.startsWith('\\')) {
        changes.push({ type: 'unchanged', content: line });
      }
    }
    
    return changes;
  }

  // ブランチ一覧を取得
  async getBranches(repoPath = this.currentRepository) {
    if (!repoPath || !this.isGitAvailable) {
      return [];
    }

    try {
      const { stdout } = await execAsync('git branch -a', { cwd: repoPath });
      return stdout.split('\n')
        .map(line => line.trim())
        .filter(line => line)
        .map(line => ({
          name: line.replace(/^\*\s*/, '').replace(/^remotes\//, ''),
          isCurrent: line.startsWith('*'),
          isRemote: line.includes('remotes/')
        }));
    } catch (error) {
      return [];
    }
  }

  // 新しいブランチを作成
  async createBranch(branchName, repoPath = this.currentRepository) {
    if (!repoPath || !this.isGitAvailable) {
      return { success: false, error: 'リポジトリが見つかりません' };
    }

    // リポジトリの存在確認
    try {
      await fs.access(path.join(repoPath, '.git'));
    } catch {
      return { 
        success: false, 
        error: 'Gitリポジトリが初期化されていません。先にリポジトリを初期化してください。' 
      };
    }

    try {
      await execAsync(`git checkout -b "${branchName}"`, { cwd: repoPath });
      return { success: true, message: `ブランチ "${branchName}" を作成しました` };
    } catch (error) {
      // エラーメッセージをより分かりやすく
      let errorMessage = error.message;
      
      if (error.message.includes('fatal: A branch named')) {
        errorMessage = `ブランチ "${branchName}" は既に存在します`;
      } else if (error.message.includes('not a git repository')) {
        errorMessage = 'Gitリポジトリが初期化されていません';
      } else if (error.message.includes('invalid reference name')) {
        errorMessage = 'ブランチ名が無効です。英数字、ハイフン、アンダースコアのみ使用可能です';
      }
      
      return { success: false, error: errorMessage };
    }
  }

  // ブランチを切り替え
  async switchBranch(branchName, repoPath = this.currentRepository) {
    if (!repoPath || !this.isGitAvailable) {
      return { success: false, error: 'リポジトリが見つかりません' };
    }

    // リポジトリの存在確認
    try {
      await fs.access(path.join(repoPath, '.git'));
    } catch {
      return { 
        success: false, 
        error: 'Gitリポジトリが初期化されていません。先にリポジトリを初期化してください。' 
      };
    }

    try {
      await execAsync(`git checkout "${branchName}"`, { cwd: repoPath });
      return { success: true, message: `ブランチ "${branchName}" に切り替えました` };
    } catch (error) {
      // エラーメッセージをより分かりやすく
      let errorMessage = error.message;
      
      if (error.message.includes('pathspec') && error.message.includes('did not match')) {
        errorMessage = `ブランチ "${branchName}" が見つかりません`;
      } else if (error.message.includes('not a git repository')) {
        errorMessage = 'Gitリポジトリが初期化されていません';
      } else if (error.message.includes('Please commit your changes')) {
        errorMessage = '未保存の変更があります。先にコミットまたはステージングを行ってください';
      }
      
      return { success: false, error: errorMessage };
    }
  }

  // ブランチを削除
  async deleteBranch(branchName, repoPath = this.currentRepository) {
    if (!repoPath || !this.isGitAvailable) {
      return { success: false, error: 'リポジトリが見つかりません' };
    }

    // リポジトリの存在確認
    try {
      await fs.access(path.join(repoPath, '.git'));
    } catch {
      return { 
        success: false, 
        error: 'Gitリポジトリが初期化されていません。先にリポジトリを初期化してください。' 
      };
    }

    try {
      const execOptions = {
        cwd: repoPath,
        env: {
          ...process.env,
          LC_ALL: 'C.UTF-8',
          LANG: 'C.UTF-8'
        }
      };

      // 現在のブランチをチェック
      const { stdout: currentBranch } = await execAsync('git branch --show-current', execOptions);
      if (currentBranch.trim() === branchName) {
        return { success: false, error: '現在使用中のブランチは削除できません。別のブランチに切り替えてから削除してください。' };
      }

      // mainブランチまたはmasterブランチの削除を防ぐ
      if (branchName === 'main' || branchName === 'master') {
        return { success: false, error: 'メインブランチ（main/master）は削除できません。' };
      }

      // ブランチを削除（強制削除）
      await execAsync(`git branch -D "${branchName}"`, execOptions);
      return { success: true, message: `ブランチ "${branchName}" を削除しました` };
    } catch (error) {
      // エラーメッセージをより分かりやすく
      let errorMessage = error.message;
      
      if (error.message.includes('not found')) {
        errorMessage = `ブランチ "${branchName}" が見つかりません`;
      } else if (error.message.includes('not a git repository')) {
        errorMessage = 'Gitリポジトリが初期化されていません';
      } else if (error.message.includes('Cannot delete branch')) {
        errorMessage = 'ブランチを削除できません。未マージの変更がある可能性があります。';
      }
      
      return { success: false, error: errorMessage };
    }
  }
}

module.exports = GitManager;