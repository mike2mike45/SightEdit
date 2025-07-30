import simpleGit from 'simple-git';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

// ESMでの__dirname代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class GitManager {
  constructor() {
    this.isGitAvailable = false;
    this.currentRepository = null;
    this.git = null; // simple-gitインスタンス
    this.init();
  }

  async init() {
    await this.checkGitInstallation();
  }

  // Gitインストール確認
  async checkGitInstallation() {
    try {
      // グローバルなsimple-gitインスタンスでバージョンチェック
      const tempGit = simpleGit();
      const version = await tempGit.raw(['--version']);
      console.log('Git version:', version.trim());
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

  // リポジトリ用のsimple-gitインスタンスを作成
  getGitInstance(repoPath) {
    if (!repoPath) {
      throw new Error('リポジトリパスが指定されていません');
    }
    
    // Windows環境でのパス処理を改善
    const options = {
      baseDir: repoPath,
      binary: 'git',
      maxConcurrentProcesses: 6,
      trimmed: false
    };
    
    return simpleGit(options);
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
      
      // simple-gitでリポジトリを初期化
      const git = this.getGitInstance(dirPath);
      
      // Git 2.28以降のinitial-branchオプションをサポート
      try {
        await git.init(['--initial-branch=main']);
      } catch (error) {
        // 古いGitバージョンの場合は通常のinitを実行
        await git.init();
        try {
          await git.checkoutLocalBranch('main');
        } catch (e) {
          console.log('Main branch setup:', e.message);
        }
      }
      
      // .gitignoreを追加してコミット
      await git.add('.gitignore');
      await git.commit('初期コミット: .gitignoreを追加');
      
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

  // ローカルとリモートの差分を取得
  async getLocalRemoteDiff(repoPath) {
    if (!repoPath || !this.isGitAvailable) {
      return { ahead: 0, behind: 0 };
    }

    try {
      const git = this.getGitInstance(repoPath);
      
      // 現在のブランチを取得
      const branch = await git.branch();
      const currentBranch = branch.current;
      
      // リモートブランチが存在するか確認
      try {
        // fetch実行して最新の情報を取得（--dry-runで実際のダウンロードはしない）
        await git.fetch(['--dry-run']);
        
        // ローカルとリモートの差分を取得
        const status = await git.status();
        
        return {
          ahead: status.ahead || 0,
          behind: status.behind || 0,
          tracking: status.tracking || null
        };
      } catch (error) {
        console.log('No remote tracking branch:', error.message);
        return { ahead: 0, behind: 0, tracking: null };
      }
    } catch (error) {
      console.error('Get local/remote diff error:', error);
      return { ahead: 0, behind: 0 };
    }
  }

  // リポジトリの状態を取得
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
      const git = this.getGitInstance(repoPath);
      
      // 現在のブランチを取得
      let currentBranch = 'unknown';
      try {
        const branch = await git.branch();
        currentBranch = branch.current || 'unknown';
      } catch (error) {
        console.log('Branch detection failed:', error.message);
      }

      // リモートURLを取得
      let remoteUrl = null;
      let hasRemote = false;
      try {
        const remotes = await git.getRemotes(true);
        const origin = remotes.find(r => r.name === 'origin');
        if (origin) {
          remoteUrl = origin.refs.fetch || origin.refs.push;
          hasRemote = true;
        }
      } catch {
        hasRemote = false;
      }

      // ローカルとリモートの差分を取得
      const diffInfo = await this.getLocalRemoteDiff(repoPath);

      // 変更ファイルの一覧を取得
      const status = await git.status();
      const changes = [];
      
      // ステージされたファイル
      for (const file of status.staged) {
        changes.push({
          filePath: file,
          changeType: this.getChangeTypeFromStatus(status.files[file]),
          staged: true,
          statusCode: status.files[file].index + status.files[file].working_dir
        });
      }
      
      // ステージされていない変更
      for (const file of status.modified) {
        if (!status.staged.includes(file)) {
          changes.push({
            filePath: file,
            changeType: 'modified',
            staged: false,
            statusCode: ' M'
          });
        }
      }
      
      // 削除されたファイル
      for (const file of status.deleted) {
        if (!status.staged.includes(file)) {
          changes.push({
            filePath: file,
            changeType: 'deleted',
            staged: false,
            statusCode: ' D'
          });
        }
      }
      
      // 未追跡ファイル
      for (const file of status.not_added) {
        changes.push({
          filePath: file,
          changeType: 'untracked',
          staged: false,
          statusCode: '??'
        });
      }

      // 最近のコミット履歴を取得（プッシュ状態も含める）
      let commits = [];
      let unpushedCommits = 0;
      try {
        const log = await git.log({ n: 10 });
        
        // リモートブランチが存在する場合、プッシュ済みのコミットを確認
        if (hasRemote && diffInfo.tracking) {
          try {
            // リモートブランチのコミットハッシュを取得
            const remoteLog = await git.log([diffInfo.tracking, '-1']);
            const lastPushedHash = remoteLog.latest ? remoteLog.latest.hash : null;
            
            commits = log.all.map(commit => {
              const isPushed = lastPushedHash && 
                             (commit.hash === lastPushedHash || 
                              log.all.findIndex(c => c.hash === lastPushedHash) > 
                              log.all.findIndex(c => c.hash === commit.hash));
              
              if (!isPushed) unpushedCommits++;
              
              return {
                hash: commit.hash.substring(0, 7),
                author: commit.author_name,
                message: commit.message,
                date: new Date(commit.date).toLocaleString('ja-JP'),
                isPushed: isPushed
              };
            });
          } catch (error) {
            // リモート情報の取得に失敗した場合は全てを未プッシュとして扱う
            unpushedCommits = log.all.length;
            commits = log.all.map(commit => ({
              hash: commit.hash.substring(0, 7),
              author: commit.author_name,
              message: commit.message,
              date: new Date(commit.date).toLocaleString('ja-JP'),
              isPushed: false
            }));
          }
        } else {
          // リモートがない場合は全て未プッシュ
          unpushedCommits = log.all.length;
          commits = log.all.map(commit => ({
            hash: commit.hash.substring(0, 7),
            author: commit.author_name,
            message: commit.message,
            date: new Date(commit.date).toLocaleString('ja-JP'),
            isPushed: false
          }));
        }
      } catch (error) {
        console.log('No commits yet:', error.message);
      }

      // コミット数を取得
      let totalCommits = 0;
      try {
        const log = await git.log();
        totalCommits = log.total;
      } catch {
        totalCommits = 0;
      }

      return {
        success: true,
        status: {
          currentBranch,
          remoteUrl,
          hasRemote,
          changes,
          commits,
          totalCommits,
          unpushedCommits,
          localRemoteDiff: diffInfo,
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

  // simple-gitのステータスから変更タイプを判定
  getChangeTypeFromStatus(fileStatus) {
    if (fileStatus.index === 'A' || fileStatus.working_dir === 'A') return 'added';
    if (fileStatus.index === 'D' || fileStatus.working_dir === 'D') return 'deleted';
    if (fileStatus.index === 'R' || fileStatus.working_dir === 'R') return 'renamed';
    if (fileStatus.index === 'M' || fileStatus.working_dir === 'M') return 'modified';
    return 'modified';
  }

  // ファイルをステージングエリアに追加
  async stageFiles(files, repoPath = this.currentRepository) {
    if (!repoPath || !this.isGitAvailable) {
      return { success: false, error: 'リポジトリが見つかりません' };
    }

    try {
      const git = this.getGitInstance(repoPath);
      
      if (files === '*' || files.length === 0) {
        // 全ファイルを追加
        await git.add('.');
        return { success: true, message: '全ての変更をインデックスに追加しました' };
      } else {
        // 特定のファイルを追加
        const fileList = Array.isArray(files) ? files : [files];
        await git.add(fileList);
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
      const git = this.getGitInstance(repoPath);
      
      // ユーザー設定の確認
      try {
        const config = await git.listConfig();
        const hasUserName = config.all['user.name'];
        const hasUserEmail = config.all['user.email'];
        
        if (!hasUserName || !hasUserEmail) {
          return { 
            success: false, 
            error: 'Gitユーザー情報が設定されていません',
            needsUserConfig: true 
          };
        }
      } catch {
        return { 
          success: false, 
          error: 'Gitユーザー情報が設定されていません',
          needsUserConfig: true 
        };
      }

      // コミット実行
      const commitResult = await git.commit(message);
      
      if (commitResult.commit) {
        return { success: true, message: 'コミットを作成しました' };
      } else {
        return { success: false, error: 'コミットする変更がありません' };
      }
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

    try {
      // simple-gitはグローバル設定の取得が複雑なので、一時的なgitインスタンスを使用
      const tempGit = simpleGit();
      
      // グローバル設定
      try {
        const globalName = await tempGit.raw(['config', '--global', 'user.name']);
        config.global.name = globalName.trim();
      } catch (error) {
        console.log('Global user.name not set');
      }

      try {
        const globalEmail = await tempGit.raw(['config', '--global', 'user.email']);
        config.global.email = globalEmail.trim();
      } catch (error) {
        console.log('Global user.email not set');
      }

      // ローカル設定
      if (repoPath) {
        const git = this.getGitInstance(repoPath);
        const localConfig = await git.listConfig();
        
        config.local.name = localConfig.all['user.name'] || null;
        config.local.email = localConfig.all['user.email'] || null;
      }
    } catch (error) {
      console.log('Error getting user config:', error);
    }

    return { success: true, config };
  }

  // Gitユーザー設定を保存
  async setUserConfig(configData, repoPath = this.currentRepository) {
    const { name, email, isGlobal } = configData;
    
    if (!name || !email) {
      return { success: false, error: '名前とメールアドレスは必須です' };
    }

    try {
      if (isGlobal) {
        // グローバル設定
        const tempGit = simpleGit();
        await tempGit.raw(['config', '--global', 'user.name', name]);
        await tempGit.raw(['config', '--global', 'user.email', email]);
      } else {
        // ローカル設定
        if (!repoPath) {
          return { success: false, error: 'リポジトリパスが必要です' };
        }
        const git = this.getGitInstance(repoPath);
        await git.addConfig('user.name', name);
        await git.addConfig('user.email', email);
      }
      
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
      const git = this.getGitInstance(repoPath);
      
      // 既存のリモートをチェック
      const remotes = await git.getRemotes();
      const existingRemote = remotes.find(r => r.name === remoteName);
      
      if (existingRemote) {
        // 既存のリモートがある場合は変更
        await git.remote(['set-url', remoteName, remoteUrl]);
        return { success: true, message: `リモート '${remoteName}' のURLを更新しました` };
      } else {
        // リモートが存在しない場合は追加
        await git.addRemote(remoteName, remoteUrl);
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
      const git = this.getGitInstance(repoPath);
      
      // コミット数を確認
      const log = await git.log();
      if (log.total === 0) {
        return { 
          success: false, 
          error: 'プッシュするコミットがありません。先にコミットを作成してください。' 
        };
      }

      // ブランチ名が指定されていない場合は現在のブランチを使用
      if (!branchName) {
        const branch = await git.branch();
        branchName = branch.current;
      }

      // ローカルとリモートの差分を確認
      const diffInfo = await this.getLocalRemoteDiff(repoPath);
      if (diffInfo.ahead === 0) {
        return { 
          success: false, 
          error: 'プッシュする新しいコミットがありません。' 
        };
      }

      // プッシュ実行
      await git.push(remoteName, branchName, ['--set-upstream']);
      
      return { 
        success: true, 
        message: `'${branchName}' ブランチを '${remoteName}' にプッシュしました（${diffInfo.ahead}個のコミット）` 
      };
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
      const git = this.getGitInstance(repoPath);
      
      // ブランチ名が指定されていない場合は現在のブランチを使用
      if (!branchName) {
        const branch = await git.branch();
        branchName = branch.current;
      }

      // プル実行
      await git.pull(remoteName, branchName);
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
      const git = this.getGitInstance(repoPath);
      const diff = await git.diff([filePath]);
      
      return { 
        success: true, 
        diff: diff,
        isEmpty: diff.trim().length === 0
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
      const git = this.getGitInstance(repoPath);
      const branchSummary = await git.branch(['-a']);
      
      const branches = [];
      
      // ローカルブランチ
      for (const branchName of Object.keys(branchSummary.branches)) {
        const branch = branchSummary.branches[branchName];
        if (!branchName.startsWith('remotes/')) {
          branches.push({
            name: branchName,
            fullName: branchName,
            isRemote: false,
            isCurrent: branch.current
          });
        }
      }
      
      return { 
        success: true, 
        branches,
        currentBranch: branchSummary.current
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
      const git = this.getGitInstance(repoPath);
      
      // ブランチを作成して切り替え
      await git.checkoutBranch(branchName, 'HEAD');
      
      return { success: true, message: `ブランチ '${branchName}' を作成して切り替えました` };
    } catch (error) {
      console.error('Create branch error:', error);
      
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

    try {
      const git = this.getGitInstance(repoPath);
      
      // ブランチの存在を確認
      const branchSummary = await git.branch();
      const branchExists = Object.keys(branchSummary.branches).includes(branchName);
      
      if (!branchExists) {
        return { 
          success: false, 
          error: `ブランチ '${branchName}' が見つかりません` 
        };
      }

      // ブランチを切り替え
      await git.checkout(branchName);
      return { success: true, message: `ブランチ '${branchName}' に切り替えました` };
    } catch (error) {
      console.error('Switch branch error:', error);
      
      // エラーメッセージをより分かりやすく
      let errorMessage = error.message;
      
      if (error.message.includes('Please commit your changes')) {
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

    try {
      const git = this.getGitInstance(repoPath);
      
      // 現在のブランチをチェック
      const branchSummary = await git.branch();
      if (branchSummary.current === branchName) {
        return { success: false, error: '現在使用中のブランチは削除できません。別のブランチに切り替えてから削除してください。' };
      }

      // mainブランチまたはmasterブランチの削除を防ぐ
      if (branchName === 'main' || branchName === 'master') {
        return { success: false, error: 'メインブランチ（main/master）は削除できません。' };
      }

      // ブランチを削除（強制削除）
      await git.deleteLocalBranch(branchName, true);
      return { success: true, message: `ブランチ "${branchName}" を削除しました` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // コミット履歴を取得
  async getCommitHistory(limit = 50, repoPath = this.currentRepository) {
    if (!repoPath || !this.isGitAvailable) {
      return { success: false, commits: [], error: 'リポジトリが見つかりません' };
    }

    try {
      const git = this.getGitInstance(repoPath);
      const log = await git.log({ n: limit, '--name-status': null });
      
      const commits = log.all.map(commit => ({
        hash: commit.hash.substring(0, 7),
        author: commit.author_name,
        email: commit.author_email,
        message: commit.message,
        date: new Date(commit.date).toLocaleString('ja-JP'),
        parent: commit.parent || '',
        files: [] // simple-gitでは別途取得が必要
      }));

      return { success: true, commits };
    } catch (error) {
      console.error('Get commit history error:', error);
      return { success: false, commits: [], error: error.message };
    }
  }

  // インデックスに追加されたファイル一覧を取得
  async getStagedFiles(repoPath = this.currentRepository) {
    if (!repoPath || !this.isGitAvailable) {
      return { success: false, files: [], error: 'リポジトリが見つかりません' };
    }

    try {
      const git = this.getGitInstance(repoPath);
      const status = await git.status();
      
      const files = status.staged.map(fileName => ({
        fileName,
        status: 'A', // simple-gitでは詳細な状態が取得しにくい
        changeType: 'added'
      }));

      return { success: true, files };
    } catch (error) {
      console.error('Get staged files error:', error);
      return { success: false, files: [], error: error.message };
    }
  }

  // ファイルをインデックスから除外
  async unstageFile(filePath, repoPath = this.currentRepository) {
    if (!repoPath || !this.isGitAvailable) {
      return { success: false, error: 'リポジトリが見つかりません' };
    }

    try {
      const git = this.getGitInstance(repoPath);
      
      // git restore --staged <file> に相当
      await git.reset(['HEAD', '--', filePath]);
      
      return { 
        success: true, 
        message: 'ファイルをインデックスから除外しました' 
      };
    } catch (error) {
      console.error('Unstage file error:', error);
      return { success: false, error: error.message };
    }
  }

  // 特定のコミットからファイル内容を取得
  async getFileContentFromCommit(filePath, commitHash, repoPath = this.currentRepository) {
    if (!repoPath || !this.isGitAvailable) {
      return { success: false, error: 'リポジトリが見つかりません' };
    }

    try {
      const git = this.getGitInstance(repoPath);
      const content = await git.show([`${commitHash}:${filePath}`]);

      return { 
        success: true, 
        content: content,
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