import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);

// ESMでの__dirname代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class GitManager {
  constructor() {
    this.isGitAvailable = false;
    this.currentRepository = null;
    this.init();
  }

  async init() {
    await this.checkGitInstallation();
  }

  // Gitインストール確認
  async checkGitInstallation() {
    try {
      const { stdout } = await execAsync('git --version');
      console.log('Git version:', stdout.trim());
      this.isGitAvailable = true;
    } catch (error) {
      console.error('Git is not installed or not in PATH:', error.message);
      this.isGitAvailable = false;
    }
  }

  // Git利用可能性チェック
  checkGitAvailability() {
    return {
      success: true,
      isAvailable: this.isGitAvailable
    };
  }

  // リポジトリルートを検索（ファイルパスから上方向に探索）
  async findRepositoryRoot(targetPath) {
    if (!targetPath) return null;
    
    try {
      let currentDir = path.dirname(targetPath);
      
      // ルートディレクトリまで探索
      while (currentDir !== path.dirname(currentDir)) {
        try {
          const gitDir = path.join(currentDir, '.git');
          const stats = await fs.stat(gitDir);
          
          if (stats.isDirectory()) {
            // 通常の.gitディレクトリ
            console.log(`Git repository found at: ${currentDir}`);
            return currentDir;
          } else if (stats.isFile()) {
            // サブモジュールまたはワークツリーの場合
            try {
              const gitFileContent = await fs.readFile(gitDir, 'utf8');
              const match = gitFileContent.match(/^gitdir:\s*(.+)$/m);
              if (match) {
                const gitDirPath = path.resolve(currentDir, match[1].trim());
                console.log(`Git worktree detected, actual git dir: ${gitDirPath}`);
                return currentDir;
              }
            } catch (error) {
              console.log(`Error reading .git file: ${error.message}`);
            }
          }
        } catch (error) {
          // .gitが見つからない場合は上のディレクトリに移動
          console.log(`No .git found in ${currentDir}, moving up...`);
        }
        
        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) {
          // ルートディレクトリに到達
          break;
        }
        currentDir = parentDir;
      }
      
      console.log(`No Git repository found for path: ${targetPath}`);
      return null;
    } catch (error) {
      console.error(`Error in findRepositoryRoot: ${error.message}`);
      return null;
    }
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
      
      // 初期コミット
      await execAsync('git add .gitignore', { cwd: dirPath });
      await execAsync('git commit -m "初期コミット: .gitignoreを追加"', { cwd: dirPath });
      
      this.currentRepository = dirPath;
      return { 
        success: true, 
        message: 'Gitリポジトリを初期化しました' 
      };
    } catch (error) {
      console.error('Repository initialization error:', error);
      throw error;
    }
  }

  // リポジトリの状態を取得（改善版）
  async getRepositoryStatus(repoPath) {
    if (!repoPath || !this.isGitAvailable) {
      return { 
        success: false, 
        error: 'リポジトリが見つかりません' 
      };
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

      // 現在のブランチを取得
      let currentBranch = 'unknown';
      try {
        const { stdout } = await execAsync('git branch --show-current', execOptions);
        currentBranch = stdout.trim() || 'unknown';
      } catch (error) {
        console.log('Branch detection failed:', error.message);
      }

      // リモートURLを取得
      let remoteUrl = null;
      let hasRemote = false;
      try {
        const { stdout } = await execAsync('git remote get-url origin', execOptions);
        remoteUrl = stdout.trim();
        hasRemote = true;
      } catch {
        // リモートが設定されていない場合
        hasRemote = false;
      }

      // 変更ファイルの一覧を取得（より詳細な情報）
      const { stdout: statusOutput } = await execAsync('git status --porcelain', execOptions);
      const changes = [];
      
      if (statusOutput) {
        const lines = statusOutput.split('\n').filter(line => line);
        for (const line of lines) {
          const status = line.substring(0, 2);
          const filePath = line.substring(3);
          
          let changeType = 'modified';
          let staged = false;
          
          // ステータスコードの解析
          const indexStatus = status[0];
          const workTreeStatus = status[1];
          
          if (indexStatus !== ' ' && indexStatus !== '?') {
            staged = true;
          }
          
          if (status === '??') {
            changeType = 'untracked';
          } else if (indexStatus === 'A' || workTreeStatus === 'A') {
            changeType = 'added';
          } else if (indexStatus === 'D' || workTreeStatus === 'D') {
            changeType = 'deleted';
          } else if (indexStatus === 'R' || workTreeStatus === 'R') {
            changeType = 'renamed';
          } else if (indexStatus === 'C' || workTreeStatus === 'C') {
            changeType = 'copied';
          }
          
          changes.push({
            filePath,
            changeType,
            staged,
            statusCode: status
          });
        }
      }

      // 最近のコミット履歴を取得（5件）
      let commits = [];
      try {
        const { stdout: logOutput } = await execAsync(
          'git log --oneline -5 --pretty=format:"%H|%an|%s|%ad" --date=relative',
          execOptions
        );
        
        if (logOutput) {
          commits = logOutput.split('\n').filter(line => line).map(line => {
            const [hash, author, message, date] = line.split('|');
            return { hash, author, message, date };
          });
        }
      } catch (error) {
        // コミットがまだない場合
        console.log('No commits yet:', error.message);
      }

      return {
        success: true,
        status: {
          currentBranch,
          remoteUrl,
          hasRemote,
          changes,
          commits,
          totalChanges: changes.length,
          stagedChanges: changes.filter(c => c.staged).length,
          unstagedChanges: changes.filter(c => !c.staged && c.changeType !== 'untracked').length,
          untrackedFiles: changes.filter(c => c.changeType === 'untracked').length
        }
      };
    } catch (error) {
      console.error('Repository status error:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // ファイルをステージングエリアに追加
  async stageFiles(files, repoPath = this.currentRepository) {
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

      if (files === '*' || files.length === 0) {
        // 全ファイルを追加
        await execAsync('git add .', execOptions);
        return { success: true, message: '全ての変更をインデックスに追加しました' };
      } else {
        // 特定のファイルを追加
        const fileList = Array.isArray(files) ? files : [files];
        for (const file of fileList) {
          await execAsync(`git add "${file}"`, execOptions);
        }
        return { success: true, message: `${fileList.length}個のファイルをインデックスに追加しました` };
      }
    } catch (error) {
      console.error('Stage files error:', error);
      return { success: false, error: error.message };
    }
  }

  // コミットを作成
  async createCommit(message, repoPath = this.currentRepository) {
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

      // ユーザー設定の確認
      try {
        await execAsync('git config user.name', execOptions);
        await execAsync('git config user.email', execOptions);
      } catch {
        return { 
          success: false, 
          error: 'Gitユーザー情報が設定されていません',
          needsUserConfig: true 
        };
      }

      // コミットメッセージのエスケープ
      const escapedMessage = message.replace(/"/g, '\\"');
      
      await execAsync(`git commit -m "${escapedMessage}"`, execOptions);
      return { success: true, message: 'コミットを作成しました' };
    } catch (error) {
      console.error('Create commit error:', error);
      
      if (error.message.includes('nothing to commit')) {
        return { success: false, error: 'コミットする変更がありません' };
      }
      
      return { success: false, error: error.message };
    }
  }

  // Gitユーザー設定を取得
  async getUserConfig(repoPath = this.currentRepository) {
    const config = {
      global: { name: null, email: null },
      local: { name: null, email: null }
    };

    const execOptions = {
      env: {
        ...process.env,
        LC_ALL: 'C.UTF-8',
        LANG: 'C.UTF-8'
      }
    };

    // グローバル設定を取得
    try {
      const { stdout: globalName } = await execAsync('git config --global user.name', execOptions);
      config.global.name = globalName.trim();
    } catch (error) {
      console.log('Global user.name not set');
    }

    try {
      const { stdout: globalEmail } = await execAsync('git config --global user.email', execOptions);
      config.global.email = globalEmail.trim();
    } catch (error) {
      console.log('Global user.email not set');
    }

    // ローカル設定を取得
    if (repoPath) {
      const localExecOptions = { ...execOptions, cwd: repoPath };
      
      try {
        const { stdout: localName } = await execAsync('git config --local user.name', localExecOptions);
        config.local.name = localName.trim();
      } catch (error) {
        console.log('Local user.name not set');
      }

      try {
        const { stdout: localEmail } = await execAsync('git config --local user.email', localExecOptions);
        config.local.email = localEmail.trim();
      } catch (error) {
        console.log('Local user.email not set');
      }
    }

    return { success: true, config };
  }

  // Gitユーザー設定を保存
  async setUserConfig(configData, repoPath = this.currentRepository) {
    const { name, email, isGlobal } = configData;
    
    if (!name || !email) {
      return { success: false, error: '名前とメールアドレスは必須です' };
    }

    const execOptions = repoPath && !isGlobal ? { 
      cwd: repoPath,
      env: {
        ...process.env,
        LC_ALL: 'C.UTF-8',
        LANG: 'C.UTF-8'
      }
    } : {
      env: {
        ...process.env,
        LC_ALL: 'C.UTF-8',
        LANG: 'C.UTF-8'
      }
    };
    
    const scope = isGlobal ? '--global' : '--local';

    try {
      await execAsync(`git config ${scope} user.name "${name}"`, execOptions);
      await execAsync(`git config ${scope} user.email "${email}"`, execOptions);
      
      return { 
        success: true, 
        message: `Git ${isGlobal ? 'グローバル' : 'ローカル'}設定を保存しました` 
      };
    } catch (error) {
      console.error('Set user config error:', error);
      return { success: false, error: error.message };
    }
  }

  // アカウント選択（ローカル設定として保存）
  async selectAccount(accountInfo, repoPath = this.currentRepository) {
    if (!repoPath) {
      return { success: false, error: 'リポジトリが見つかりません' };
    }

    return this.setUserConfig({
      name: accountInfo.name,
      email: accountInfo.email,
      isGlobal: false
    }, repoPath);
  }

  // リモートリポジトリを追加
  async addRemoteRepository(remoteUrl, remoteName = 'origin', repoPath = this.currentRepository) {
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

      // 既存のリモートをチェック
      try {
        await execAsync(`git remote get-url ${remoteName}`, execOptions);
        // 既存のリモートがある場合は変更
        await execAsync(`git remote set-url ${remoteName} "${remoteUrl}"`, execOptions);
        return { success: true, message: `リモート '${remoteName}' のURLを更新しました` };
      } catch {
        // リモートが存在しない場合は追加
        await execAsync(`git remote add ${remoteName} "${remoteUrl}"`, execOptions);
        return { success: true, message: `リモート '${remoteName}' を追加しました` };
      }
    } catch (error) {
      console.error('Add remote error:', error);
      return { success: false, error: error.message };
    }
  }

  // リモートにプッシュ
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
          LANG: 'C.UTF-8',
          GIT_TERMINAL_PROMPT: '0'
        }
      };

      // ブランチ名が指定されていない場合は現在のブランチを使用
      if (!branchName) {
        const { stdout } = await execAsync('git branch --show-current', execOptions);
        branchName = stdout.trim();
      }

      // プッシュ実行
      await execAsync(`git push -u ${remoteName} ${branchName}`, execOptions);
      return { success: true, message: `'${branchName}' ブランチを '${remoteName}' にプッシュしました` };
    } catch (error) {
      console.error('Push error:', error);
      
      // エラーメッセージをより分かりやすく
      if (error.message.includes('could not read Username')) {
        return { success: false, error: '認証が必要です。GitHubなどの認証情報を設定してください。' };
      } else if (error.message.includes('rejected')) {
        return { success: false, error: 'プッシュが拒否されました。先にプルしてから再度プッシュしてください。' };
      } else if (error.message.includes('does not appear to be a git repository')) {
        return { success: false, error: 'リモートリポジトリが見つかりません。リモート設定を確認してください。' };
      }
      
      return { success: false, error: error.message };
    }
  }

  // リモートからプル
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
          LANG: 'C.UTF-8',
          GIT_TERMINAL_PROMPT: '0'
        }
      };

      // ブランチ名が指定されていない場合は現在のブランチを使用
      if (!branchName) {
        const { stdout } = await execAsync('git branch --show-current', execOptions);
        branchName = stdout.trim();
      }

      // プル実行
      await execAsync(`git pull ${remoteName} ${branchName}`, execOptions);
      return { success: true, message: `'${remoteName}' から '${branchName}' ブランチをプルしました` };
    } catch (error) {
      console.error('Pull error:', error);
      
      // エラーメッセージをより分かりやすく
      if (error.message.includes('could not read Username')) {
        return { success: false, error: '認証が必要です。GitHubなどの認証情報を設定してください。' };
      } else if (error.message.includes('merge')) {
        return { success: false, error: 'マージコンフリクトが発生しました。手動で解決してください。' };
      }
      
      return { success: false, error: error.message };
    }
  }

  // ファイルの差分を取得
  async getFileDiff(filePath, repoPath = this.currentRepository) {
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

      // ファイルの差分を取得
      const { stdout } = await execAsync(`git diff "${filePath}"`, execOptions);
      
      return { 
        success: true, 
        diff: stdout,
        isEmpty: stdout.trim().length === 0
      };
    } catch (error) {
      console.error('Get file diff error:', error);
      return { success: false, error: error.message };
    }
  }

  // ブランチ一覧を取得
  async getBranches(repoPath = this.currentRepository) {
    if (!repoPath || !this.isGitAvailable) {
      return { success: false, branches: [], error: 'リポジトリが見つかりません' };
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

      // 現在のブランチを取得
      const { stdout: currentBranchOutput } = await execAsync('git branch --show-current', execOptions);
      const currentBranch = currentBranchOutput.trim();

      // 全ブランチを取得
      const { stdout: branchesOutput } = await execAsync('git branch -a', execOptions);
      const branches = branchesOutput
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          const branch = line.trim().replace(/^\*\s*/, '');
          const isRemote = branch.startsWith('remotes/');
          const isCurrent = line.startsWith('*');
          
          return {
            name: isRemote ? branch.replace(/^remotes\/[^\/]+\//, '') : branch,
            fullName: branch,
            isRemote,
            isCurrent
          };
        })
        // 重複を除去（ローカルとリモートで同じ名前のブランチがある場合）
        .filter((branch, index, self) => 
          index === self.findIndex(b => b.name === branch.name && !b.isRemote)
        );

      return { 
        success: true, 
        branches,
        currentBranch
      };
    } catch (error) {
      console.error('Get branches error:', error);
      return { success: false, branches: [], error: error.message };
    }
  }

  // ブランチを作成
  async createBranch(branchName, repoPath = this.currentRepository) {
    if (!repoPath || !this.isGitAvailable) {
      return { success: false, error: 'リポジトリが見つかりません' };
    }

    // ブランチ名の検証
    if (!branchName || branchName.trim() === '') {
      return { success: false, error: 'ブランチ名を入力してください' };
    }

    // 不正な文字のチェック
    const invalidChars = /[\s~^:?*\[\]\\]/;
    if (invalidChars.test(branchName)) {
      return { success: false, error: 'ブランチ名に使用できない文字が含まれています（スペース、~、^、:、?、*、[、]、\\）' };
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

      // ブランチを作成して切り替え
      await execAsync(`git checkout -b "${branchName}"`, execOptions);
      return { success: true, message: `ブランチ '${branchName}' を作成して切り替えました` };
    } catch (error) {
      console.error('Create branch error:', error);
      
      // エラーメッセージをより分かりやすく
      if (error.message.includes('already exists')) {
        return { success: false, error: `ブランチ '${branchName}' は既に存在します` };
      }
      
      return { success: false, error: error.message };
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
      const execOptions = {
        cwd: repoPath,
        env: {
          ...process.env,
          LC_ALL: 'C.UTF-8',
          LANG: 'C.UTF-8'
        }
      };

      // ブランチを切り替え
      await execAsync(`git checkout "${branchName}"`, execOptions);
      return { success: true, message: `ブランチ '${branchName}' に切り替えました` };
    } catch (error) {
      // エラーメッセージをより分かりやすく
      let errorMessage = error.message;
      
      if (error.message.includes('did not match any file')) {
        errorMessage = `ブランチ "${branchName}" が見つかりません`;
      } else if (error.message.includes('not a git repository')) {
        errorMessage = 'Gitリポジトリが初期化されていません';
      } else if (error.message.includes('Please commit your changes')) {
        errorMessage = '未保存の変更があります。先にコミットまたはインデックスに追加してください';
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

  // コミット履歴を取得
  async getCommitHistory(limit = 50, repoPath = this.currentRepository) {
    if (!repoPath || !this.isGitAvailable) {
      return { success: false, commits: [], error: 'リポジトリが見つかりません' };
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

      // コミット履歴を取得（ファイル一覧も含む）
      const { stdout } = await execAsync(
        `git log -${limit} --pretty=format:"%H|%an|%ae|%s|%ad|%P" --date=iso-strict --name-status`,
        execOptions
      );

      if (!stdout.trim()) {
        return { success: true, commits: [] };
      }

      const commits = [];
      const entries = stdout.split('\n\n');
      
      for (const entry of entries) {
        const lines = entry.split('\n');
        const [hash, author, email, message, date, parent] = lines[0].split('|');
        
        // 変更されたファイルを解析
        const files = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line) {
            const match = line.match(/^([MADRCU])\t(.+)$/);
            if (match) {
              const [, status, fileName] = match;
              files.push({
                status,
                fileName,
                changeType: this.getChangeTypeFromStatus(status)
              });
            }
          }
        }

        commits.push({
          hash: hash.trim(),
          author: author.trim(),
          email: email.trim(),
          message: message.trim(),
          date: new Date(date.trim()).toLocaleString('ja-JP'),
          parent: parent.trim(),
          files
        });
      }

      return { success: true, commits };
    } catch (error) {
      console.error('Get commit history error:', error);
      return { success: false, commits: [], error: error.message };
    }
  }

  // ステータスコードから変更タイプを取得
  getChangeTypeFromStatus(status) {
    switch (status) {
      case 'M': return 'modified';
      case 'A': return 'added';
      case 'D': return 'deleted';
      case 'R': return 'renamed';
      case 'C': return 'copied';
      case 'U': return 'unmerged';
      default: return 'unknown';
    }
  }

  // インデックスに追加されたファイル一覧を取得
  async getStagedFiles(repoPath = this.currentRepository) {
    if (!repoPath || !this.isGitAvailable) {
      return { success: false, files: [], error: 'リポジトリが見つかりません' };
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

      // インデックスに追加されたファイルを取得
      const { stdout } = await execAsync('git diff --cached --name-status', execOptions);
      
      if (!stdout.trim()) {
        return { success: true, files: [] };
      }

      const files = stdout.trim().split('\n').map(line => {
        const [status, ...fileNameParts] = line.split('\t');
        const fileName = fileNameParts.join('\t');
        
        return {
          fileName,
          status,
          changeType: this.getChangeTypeFromStatus(status)
        };
      });

      return { success: true, files };
    } catch (error) {
      console.error('Get staged files error:', error);
      return { success: false, files: [], error: error.message };
    }
  }

  // 特定のコミットからファイル内容を取得
  async getFileContentFromCommit(filePath, commitHash, repoPath = this.currentRepository) {
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
        },
        maxBuffer: 10 * 1024 * 1024 // 10MB
      };

      // コミットからファイル内容を取得
      const { stdout } = await execAsync(
        `git show "${commitHash}:${filePath}"`,
        execOptions
      );

      return { 
        success: true, 
        content: stdout,
        filePath,
        commitHash
      };
    } catch (error) {
      console.error('Get file content error:', error);
      
      if (error.message.includes('does not exist')) {
        return { success: false, error: 'ファイルが見つかりません' };
      }
      
      return { success: false, error: error.message };
    }
  }
}

export default GitManager;