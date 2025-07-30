import { app, BrowserWindow, Menu, dialog, ipcMain, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import ConfigManager from './config-manager.js';
import GitManager from './git-manager.js';
import UpdateManager from './update-manager.js';

// ESMでの__dirname代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// package.jsonから情報を取得
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const packageInfo = require('../../package.json');

let mainWindow;
let configManager;
let gitManager;
let updateManager;
let openFilePath = null; // 起動時に開くファイルパス

// アプリケーションの準備ができてから実行
app.whenReady().then(async () => {
  // Windows: ファイルの関連付けから起動された場合のチェック
  if (process.platform === 'win32' && process.argv.length >= 2) {
    const filePath = process.argv[1];
    // 拡張子で判定（fs.existsSyncを使わない）
    if (filePath && !filePath.startsWith('--') && 
        (filePath.endsWith('.md') || filePath.endsWith('.markdown') || filePath.endsWith('.txt'))) {
      openFilePath = filePath;
      console.log('File to open:', openFilePath);
    }
  }
  
  configManager = new ConfigManager();
  await configManager.load();
  
  // Git機能を初期化
  gitManager = new GitManager();
  
  // 更新機能を初期化
  updateManager = new UpdateManager();
  
  createMainWindow();
  createApplicationMenu();
  setupIPCHandlers();
  setupGitIPCHandlers();
  setupUpdateIPCHandlers();
  
  // 更新機能にメインウィンドウを設定
  updateManager.setMainWindow(mainWindow);
  
  // 自動更新チェックを開始（起動時）
  updateManager.checkForUpdatesAutomatically();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// macOS/Linux: open-fileイベント
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  openFilePath = filePath;
  
  if (mainWindow && mainWindow.webContents) {
    // 既にウィンドウが開いている場合
    openFileInWindow(filePath);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function createMainWindow() {
  const windowConfig = configManager.get('window');
  
  mainWindow = new BrowserWindow({
    title: `SightEdit v${packageInfo.version}`,
    width: windowConfig.width,
    height: windowConfig.height,
    x: windowConfig.x,
    y: windowConfig.y,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, '../../assets/icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: true
    },
    show: false
  });

  if (windowConfig.maximized) {
    mainWindow.maximize();
  }

  mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.webContents.send('set-initial-theme', configManager.get('theme'));
    
    // 更新機能にメインウィンドウを設定
    if (updateManager) {
      updateManager.setMainWindow(mainWindow);
    }
    
    // 起動時にファイルを開く
    if (openFilePath) {
      setTimeout(() => {
        openFileInWindow(openFilePath);
      }, 1000); // レンダラープロセスの初期化を確実に待つ
    }
  });

  // ウィンドウ状態の保存
  let saveTimer = null;
  const saveWindowState = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      if (!mainWindow.isDestroyed()) {
        const bounds = mainWindow.getBounds();
        const windowState = {
          width: bounds.width,
          height: bounds.height,
          x: bounds.x,
          y: bounds.y,
          maximized: mainWindow.isMaximized()
        };
        await configManager.updateWindowState(windowState);
      }
    }, 500);
  };

  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);
  mainWindow.on('maximize', saveWindowState);
  mainWindow.on('unmaximize', saveWindowState);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // ウィンドウを閉じる前の確認
  let isClosing = false;
  mainWindow.on('close', (event) => {
    // 既に閉じる処理中の場合はスキップ
    if (isClosing) return;
    
    // レンダラープロセスに確認を要求
    if (mainWindow && !mainWindow.isDestroyed()) {
      event.preventDefault();
      mainWindow.webContents.send('before-close');
    }
  });
  
  // ウィンドウを閉じる確認の応答
  ipcMain.on('close-confirmed', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      isClosing = true;
      mainWindow.destroy();
    }
  });
}

function setupIPCHandlers() {
  // アプリケーション情報
  ipcMain.handle('app:getInfo', async () => {
    return {
      version: packageInfo.version,
      name: packageInfo.name || 'SightEdit',
      description: packageInfo.description || ''
    };
  });
  
  // ファイル操作
  ipcMain.handle('file:new', async () => {
    return { 
      success: true, 
      content: '', 
      filePath: null 
    };
  });

  ipcMain.handle('file:open', async () => {
    const result = await dialog.showOpenDialog({
      filters: [
        { name: 'Markdown', extensions: ['md', 'markdown'] },
        { name: 'Text', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      try {
        const content = await fs.promises.readFile(filePath, 'utf8');
        return { 
          success: true, 
          content, 
          filePath,
          fileName: path.basename(filePath)
        };
      } catch (error) {
        console.error('Failed to read file:', error);
        return { 
          success: false, 
          error: error.message 
        };
      }
    }

    return { 
      success: false, 
      canceled: true 
    };
  });

  ipcMain.handle('file:save', async (event, data) => {
    const { filePath, content } = data;
    
    if (!filePath) {
      // 新規ファイルの場合は「名前を付けて保存」
      return ipcMain.handle('file:saveAs', event, data);
    }
    
    try {
      await fs.promises.writeFile(filePath, content, 'utf8');
      return { 
        success: true, 
        filePath,
        fileName: path.basename(filePath)
      };
    } catch (error) {
      console.error('Failed to save file:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  });

  ipcMain.handle('file:saveAs', async (event, data) => {
    const { content } = data;
    
    const result = await dialog.showSaveDialog({
      filters: [
        { name: 'Markdown', extensions: ['md'] },
        { name: 'Text', extensions: ['txt'] }
      ],
      defaultPath: 'Untitled.md'
    });

    if (!result.canceled && result.filePath) {
      try {
        await fs.promises.writeFile(result.filePath, content, 'utf8');
        return { 
          success: true, 
          filePath: result.filePath,
          fileName: path.basename(result.filePath)
        };
      } catch (error) {
        console.error('Failed to save file:', error);
        return { 
          success: false, 
          error: error.message 
        };
      }
    }

    return { 
      success: false, 
      canceled: true 
    };
  });

  // PDF出力
  ipcMain.handle('export:pdf', async (event, options) => {
    if (!mainWindow) return { success: false, error: 'Window not found' };

    const result = await dialog.showSaveDialog({
      filters: [
        { name: 'PDF', extensions: ['pdf'] }
      ],
      defaultPath: 'document.pdf'
    });

    if (!result.canceled && result.filePath) {
      try {
        const pdfData = await mainWindow.webContents.printToPDF({
          marginsType: 0,
          pageSize: 'A4',
          printBackground: true,
          landscape: false
        });
        
        await fs.promises.writeFile(result.filePath, pdfData);
        return { success: true };
      } catch (error) {
        console.error('Failed to export PDF:', error);
        return { success: false, error: error.message };
      }
    }

    return { success: false, canceled: true };
  });

  // テーマ変更
  ipcMain.handle('theme:change', async (event, theme) => {
    await configManager.updateTheme(theme);
    return { success: true };
  });

  // 外部リンクを開く
  ipcMain.on('open-external-link', (event, url) => {
    shell.openExternal(url);
  });
}

// ファイルをウィンドウで開く
async function openFileInWindow(filePath) {
  try {
    const content = await fs.promises.readFile(filePath, 'utf8');
    mainWindow.webContents.send('open-file-from-args', {
      content,
      filePath,
      fileName: path.basename(filePath)
    });
  } catch (error) {
    console.error('Failed to open file:', error);
  }
}

// Git関連のIPCハンドラー設定
function setupGitIPCHandlers() {
  // Git利用可能性チェック
  ipcMain.handle('git:checkAvailability', async () => {
    return gitManager.checkGitAvailability();
  });

  // リポジトリルートを検索（追加）
  ipcMain.handle('git:findRepositoryRoot', async (event, targetPath) => {
    try {
      const repoRoot = await gitManager.findRepositoryRoot(targetPath);
      return { 
        success: true, 
        repoRoot: repoRoot 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.message 
      };
    }
  });

  // ディレクトリ選択ダイアログ（追加）
  ipcMain.handle('git:selectDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Gitリポジトリフォルダを選択'
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return { 
        success: true, 
        selectedPath: result.filePaths[0],
        canceled: false
      };
    }

    return { 
      success: false, 
      canceled: true 
    };
  });

  // リポジトリ初期化（修正: パスを受け取るように）
  ipcMain.handle('git:initRepository', async (event, dirPath) => {
    // dirPathが指定されていない場合はディレクトリ選択ダイアログを表示
    if (!dirPath) {
      const selectResult = await dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory'],
        title: '新規Gitリポジトリを作成するフォルダを選択',
        buttonLabel: 'ここに作成'
      });

      if (selectResult.canceled || selectResult.filePaths.length === 0) {
        return { 
          success: false, 
          canceled: true,
          message: 'フォルダ選択がキャンセルされました'
        };
      }

      dirPath = selectResult.filePaths[0];
    }

    try {
      const result = await gitManager.initializeRepository(dirPath);
      
      // リポジトリを最近使用したリポジトリに追加
      await configManager.addRecentRepository(dirPath);
      
      return { 
        success: true, 
        message: result.message,
        repoPath: dirPath,
        canceled: false
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        canceled: false
      };
    }
  });

  // リポジトリ状態取得（Git設定も含める）
  ipcMain.handle('git:getStatus', async (event, repoPath) => {
    const result = await gitManager.getRepositoryStatus(repoPath);
    
    if (result.success) {
      // 設定ファイルからリポジトリ固有の設定を取得
      const repoConfig = await configManager.getGitRepositoryConfig(repoPath);
      if (repoConfig) {
        result.status.savedConfig = repoConfig;
      }
      
      // 最近使用したリポジトリに追加
      await configManager.addRecentRepository(repoPath);
    }
    
    return result;
  });

  // ファイルをインデックスに追加
  ipcMain.handle('git:stageFiles', async (event, files, repoPath) => {
    const result = await gitManager.stageFiles(files, repoPath);
    return result;
  });

  // 単一ファイルをインデックスに追加
  ipcMain.handle('git:stageFile', async (event, filePath, repoPath) => {
    const result = await gitManager.stageFiles([filePath], repoPath);
    return result;
  });

  // ファイルをインデックスから除外（simple-git対応版）
  ipcMain.handle('git:unstageFile', async (event, filePath, repoPath) => {
    const result = await gitManager.unstageFile(filePath, repoPath);
    return result;
  });

  // 全ての変更をインデックスに追加
  ipcMain.handle('git:stageAllChanges', async (event, repoPath) => {
    const result = await gitManager.stageFiles('*', repoPath);
    if (result.success) {
      // ステージングされたファイル数を含める
      const statusResult = await gitManager.getRepositoryStatus(repoPath);
      const stagedCount = statusResult.success ? 
        statusResult.status.changes.filter(c => c.staged).length : 0;
      
      return {
        success: true,
        message: result.message,
        stagedCount: stagedCount
      };
    }
    return result;
  });

  // コミット作成
  ipcMain.handle('git:createCommit', async (event, message, repoPath) => {
    const result = await gitManager.createCommit(message, repoPath);
    return result;
  });

  // Gitユーザー設定取得（設定ファイルからも読み込む）
  ipcMain.handle('git:getUserConfig', async (event, repoPath) => {
    const result = await gitManager.getUserConfig(repoPath);
    
    // 設定ファイルから保存されたグローバル設定を読み込む
    const savedGlobalUser = await configManager.getGitGlobalUser();
    if (savedGlobalUser.name && savedGlobalUser.email) {
      if (!result.config.global.name) {
        result.config.global.name = savedGlobalUser.name;
      }
      if (!result.config.global.email) {
        result.config.global.email = savedGlobalUser.email;
      }
    }
    
    return result;
  });

  // Gitユーザー設定保存
  ipcMain.handle('git:setUserConfig', async (event, config, repoPath) => {
    const result = await gitManager.setUserConfig(config, repoPath);
    
    // グローバル設定の場合は設定ファイルにも保存
    if (config.isGlobal && result.success) {
      await configManager.setGitGlobalUser(config.name, config.email);
    }
    
    // ローカル設定の場合はリポジトリ設定として保存
    if (!config.isGlobal && repoPath && result.success) {
      await configManager.setGitRepositoryConfig(repoPath, {
        localUser: {
          name: config.name,
          email: config.email
        }
      });
    }
    
    return result;
  });

  // Gitユーザー設定（名前とメールを別々に）
  ipcMain.handle('git:setUserConfiguration', async (event, name, email, isGlobal, repoPath) => {
    const config = {
      name: name,
      email: email,
      isGlobal: isGlobal
    };
    const result = await gitManager.setUserConfig(config, repoPath);
    
    // グローバル設定の場合は設定ファイルにも保存
    if (isGlobal && result.success) {
      await configManager.setGitGlobalUser(name, email);
    }
    
    // ローカル設定の場合はリポジトリ設定として保存
    if (!isGlobal && repoPath && result.success) {
      await configManager.setGitRepositoryConfig(repoPath, {
        localUser: {
          name: name,
          email: email
        }
      });
    }
    
    return result;
  });

  // 全てのGitアカウントを取得（設定ファイルからも読み込む）
  ipcMain.handle('git:getAllGitAccounts', async () => {
    try {
      const globalConfig = await gitManager.getUserConfig(null);
      const accounts = [];
      
      // 設定ファイルから保存されたグローバル設定を読み込む
      const savedGlobalUser = await configManager.getGitGlobalUser();
      
      // Gitコマンドで取得した設定と保存された設定をマージ
      const globalName = globalConfig.config.global.name || savedGlobalUser.name;
      const globalEmail = globalConfig.config.global.email || savedGlobalUser.email;
      
      if (globalName && globalEmail) {
        accounts.push({
          type: 'global',
          name: globalName,
          email: globalEmail,
          displayName: `${globalName} <${globalEmail}> (グローバル)`
        });
      }
      
      return { success: true, accounts };
    } catch (error) {
      console.error('Get all accounts error:', error);
      return { success: false, error: error.message, accounts: [] };
    }
  });

  // アカウント選択
  ipcMain.handle('git:selectAccount', async (event, account, targetType, repoPath) => {
    const config = {
      name: account.name,
      email: account.email,
      isGlobal: targetType === 'global'
    };
    
    const result = await gitManager.setUserConfig(config, repoPath);
    
    // 設定ファイルにも保存
    if (targetType === 'global' && result.success) {
      await configManager.setGitGlobalUser(account.name, account.email);
    } else if (targetType === 'local' && repoPath && result.success) {
      await configManager.setGitRepositoryConfig(repoPath, {
        localUser: {
          name: account.name,
          email: account.email
        }
      });
    }
    
    return result;
  });

  // アカウント削除（simple-git対応版）
  ipcMain.handle('git:removeAccount', async (event, accountType, repoPath) => {
    try {
      if (accountType === 'global') {
        // グローバル設定の削除は特別な処理が必要
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        
        await execAsync('git config --global --unset user.name');
        await execAsync('git config --global --unset user.email');
      } else if (repoPath) {
        // ローカル設定の削除
        const git = gitManager.getGitInstance(repoPath);
        await git.raw(['config', '--unset', 'user.name']);
        await git.raw(['config', '--unset', 'user.email']);
      }
      
      // 設定ファイルからも削除
      if (accountType === 'global') {
        await configManager.setGitGlobalUser(null, null);
      } else if (repoPath) {
        await configManager.setGitRepositoryConfig(repoPath, {
          localUser: null
        });
      }
      
      return { 
        success: true, 
        message: 'アカウント設定を削除しました' 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.message 
      };
    }
  });

  // リモートリポジトリ追加
  ipcMain.handle('git:addRemote', async (event, remoteUrl, remoteName, repoPath) => {
    const result = await gitManager.addRemoteRepository(remoteUrl, remoteName, repoPath);
    
    // 成功時は設定ファイルに保存
    if (result.success && repoPath) {
      await configManager.setGitRepositoryConfig(repoPath, {
        remoteUrl: remoteUrl,
        remoteName: remoteName
      });
    }
    
    return result;
  });

  ipcMain.handle('git:addRemoteRepository', async (event, remoteUrl, remoteName, repoPath) => {
    const result = await gitManager.addRemoteRepository(remoteUrl, remoteName, repoPath);
    
    // 成功時は設定ファイルに保存
    if (result.success && repoPath) {
      await configManager.setGitRepositoryConfig(repoPath, {
        remoteUrl: remoteUrl,
        remoteName: remoteName
      });
    }
    
    return result;
  });

  // プッシュ
  ipcMain.handle('git:push', async (event, remoteName, branchName, repoPath) => {
    const result = await gitManager.pushToRemote(remoteName, branchName, repoPath);
    return result;
  });

  ipcMain.handle('git:pushToRemote', async (event, remoteName, branchName, repoPath) => {
    const result = await gitManager.pushToRemote(remoteName, branchName, repoPath);
    return result;
  });

  // プル
  ipcMain.handle('git:pull', async (event, remoteName, branchName, repoPath) => {
    const result = await gitManager.pullFromRemote(remoteName, branchName, repoPath);
    return result;
  });

  ipcMain.handle('git:pullFromRemote', async (event, remoteName, branchName, repoPath) => {
    const result = await gitManager.pullFromRemote(remoteName, branchName, repoPath);
    return result;
  });

  // ファイル差分取得
  ipcMain.handle('git:getFileDiff', async (event, filePath, repoPath) => {
    const result = await gitManager.getFileDiff(filePath, repoPath);
    return result;
  });

  // ブランチ一覧取得
  ipcMain.handle('git:getBranches', async (event, repoPath) => {
    const result = await gitManager.getBranches(repoPath);
    return result;
  });

  // ブランチ作成
  ipcMain.handle('git:createBranch', async (event, branchName, repoPath) => {
    const result = await gitManager.createBranch(branchName, repoPath);
    return result;
  });

  // ブランチ切り替え
  ipcMain.handle('git:switchBranch', async (event, branchName, repoPath) => {
    const result = await gitManager.switchBranch(branchName, repoPath);
    return result;
  });

  // ブランチ削除
  ipcMain.handle('git:deleteBranch', async (event, branchName, repoPath) => {
    const result = await gitManager.deleteBranch(branchName, repoPath);
    return result;
  });

  // コミット履歴取得
  ipcMain.handle('git:getCommitHistory', async (event, limit, repoPath) => {
    const result = await gitManager.getCommitHistory(limit, repoPath);
    return result;
  });

  // インデックスファイル取得
  ipcMain.handle('git:getStagedFiles', async (event, repoPath) => {
    const result = await gitManager.getStagedFiles(repoPath);
    return result;
  });

  // コミットのファイル一覧取得（simple-git対応版）
  ipcMain.handle('git:getCommitFiles', async (event, commitHash, repoPath) => {
    try {
      const git = gitManager.getGitInstance(repoPath);
      
      // コミット情報を取得
      const log = await git.log(['-1', commitHash, '--name-only']);
      const commit = log.latest;
      
      // ファイル一覧を取得
      const files = await git.raw(['diff-tree', '--no-commit-id', '--name-only', '-r', commitHash]);
      const fileList = files.trim().split('\n').filter(f => f);
      
      return {
        success: true,
        files: fileList,
        commitInfo: {
          hash: commit.hash.substring(0, 7),
          author: commit.author_name,
          message: commit.message,
          date: new Date(commit.date).toLocaleString('ja-JP')
        }
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        files: []
      };
    }
  });

  // コミットからファイル内容を取得
  ipcMain.handle('git:getFileFromCommit', async (event, commitHash, filePath, repoPath) => {
    const result = await gitManager.getFileContentFromCommit(filePath, commitHash, repoPath);
    if (result.success) {
      // コミット情報も追加
      try {
        const git = gitManager.getGitInstance(repoPath);
        const log = await git.log(['-1', commitHash]);
        const commit = log.latest;
        
        return {
          success: true,
          content: result.content,
          fileName: path.basename(filePath),
          filePath: filePath,
          commitInfo: {
            hash: commit.hash.substring(0, 7),
            author: commit.author_name,
            message: commit.message,
            date: new Date(commit.date).toLocaleString('ja-JP')
          }
        };
      } catch (error) {
        // コミット情報取得に失敗してもファイル内容は返す
        return {
          success: true,
          content: result.content,
          fileName: path.basename(filePath),
          filePath: filePath,
          commitInfo: {
            hash: commitHash,
            author: 'unknown',
            message: 'unknown',
            date: 'unknown'
          }
        };
      }
    }
    return result;
  });

  // 最近使用したリポジトリを取得
  ipcMain.handle('git:getRecentRepositories', async () => {
    try {
      const recentRepos = await configManager.getRecentRepositories();
      return { success: true, repositories: recentRepos };
    } catch (error) {
      return { success: false, error: error.message, repositories: [] };
    }
  });

  // Git設定の取得
  ipcMain.handle('git:getDefaultSettings', async () => {
    try {
      const settings = await configManager.getGitDefaultSettings();
      return { success: true, settings };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Git設定の保存
  ipcMain.handle('git:setDefaultSettings', async (event, settings) => {
    try {
      await configManager.setGitDefaultSettings(settings);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

// 更新関連のIPCハンドラー設定
function setupUpdateIPCHandlers() {
  // 更新チェック
  ipcMain.handle('update:checkForUpdates', async () => {
    return updateManager.checkForUpdates();
  });

  // 更新ダウンロード
  ipcMain.handle('update:downloadUpdate', async () => {
    return updateManager.downloadUpdate();
  });

  // 更新インストール
  ipcMain.handle('update:installUpdate', async () => {
    return updateManager.installUpdate();
  });

  // 更新状態取得
  ipcMain.handle('update:getStatus', async () => {
    if (updateManager) {
      const status = updateManager.getStatus();
      return { success: true, status };
    } else {
      return { 
        success: false, 
        status: {
          updateAvailable: false,
          updateDownloaded: false,
          isChecking: false,
          version: packageInfo.version || 'unknown'
        }
      };
    }
  });

  // 再起動準備完了
  ipcMain.on('update:readyForRestart', () => {
    console.log('Ready for restart signal received');
    // 必要に応じて再起動前の処理を実行
  });
}

function createApplicationMenu() {
  const currentTheme = configManager ? configManager.get('theme') : 'light';
  
  const template = [
    {
      label: 'ファイル',
      submenu: [
        {
          label: '新規ファイル',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu-new-file')
        },
        {
          label: 'ファイルを開く',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('menu-open-file')
        },
        { type: 'separator' },
        {
          label: '保存',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('menu-save-file')
        },
        {
          label: '名前を付けて保存',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow?.webContents.send('menu-save-as-file')
        },
        { type: 'separator' },
        {
          label: 'エクスポート',
          submenu: [
            {
              label: 'PDFとして出力',
              accelerator: 'CmdOrCtrl+P',
              click: () => mainWindow?.webContents.send('menu-export-pdf')
            },
            { type: 'separator' },
            {
              label: '他の形式にエクスポート...',
              accelerator: 'CmdOrCtrl+E',
              click: () => mainWindow?.webContents.send('menu-export-formats')
            }
          ]
        },
        { type: 'separator' },
        {
          label: '終了',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            // ウィンドウを閉じる前の確認を発火
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('before-close');
            }
          }
        }
      ]
    },
    {
      label: '編集',
      submenu: [
        {
          label: '元に戻す',
          accelerator: 'CmdOrCtrl+Z',
          role: 'undo'
        },
        {
          label: 'やり直し',
          accelerator: 'CmdOrCtrl+Y',
          role: 'redo'
        },
        { type: 'separator' },
        {
          label: '切り取り',
          accelerator: 'CmdOrCtrl+X',
          role: 'cut'
        },
        {
          label: 'コピー',
          accelerator: 'CmdOrCtrl+C',
          role: 'copy'
        },
        {
          label: '貼り付け',
          accelerator: 'CmdOrCtrl+V',
          role: 'paste'
        },
        {
          label: 'すべて選択',
          accelerator: 'CmdOrCtrl+A',
          role: 'selectall'
        },
        { type: 'separator' },
        {
          label: '検索と置換',
          accelerator: 'CmdOrCtrl+F',
          click: () => mainWindow?.webContents.send('menu-search-replace')
        }
      ]
    },
    {
      label: '書式',
      submenu: [
        {
          label: '太字',
          accelerator: 'CmdOrCtrl+B',
          click: () => mainWindow?.webContents.send('menu-format-bold')
        },
        {
          label: '斜体',
          accelerator: 'CmdOrCtrl+I',
          click: () => mainWindow?.webContents.send('menu-format-italic')
        },
        {
          label: '取り消し線',
          accelerator: 'CmdOrCtrl+Shift+X',
          click: () => mainWindow?.webContents.send('menu-format-strikethrough')
        },
        { type: 'separator' },
        {
          label: '書式をクリア',
          accelerator: 'CmdOrCtrl+\\',
          click: () => mainWindow?.webContents.send('menu-format-clear')
        },
        { type: 'separator' },
        {
          label: '見出し',
          submenu: [
            {
              label: '見出し1',
              accelerator: 'CmdOrCtrl+1',
              click: () => mainWindow?.webContents.send('menu-insert-heading', 1)
            },
            {
              label: '見出し2',
              accelerator: 'CmdOrCtrl+2',
              click: () => mainWindow?.webContents.send('menu-insert-heading', 2)
            },
            {
              label: '見出し3',
              accelerator: 'CmdOrCtrl+3',
              click: () => mainWindow?.webContents.send('menu-insert-heading', 3)
            },
            {
              label: '見出し4',
              accelerator: 'CmdOrCtrl+4',
              click: () => mainWindow?.webContents.send('menu-insert-heading', 4)
            },
            {
              label: '見出し5',
              accelerator: 'CmdOrCtrl+5',
              click: () => mainWindow?.webContents.send('menu-insert-heading', 5)
            },
            {
              label: '見出し6',
              accelerator: 'CmdOrCtrl+6',
              click: () => mainWindow?.webContents.send('menu-insert-heading', 6)
            }
          ]
        }
      ]
    },
    {
      label: '挿入',
      submenu: [
        {
          label: 'リンク',
          accelerator: 'CmdOrCtrl+K',
          click: () => mainWindow?.webContents.send('menu-insert-link')
        },
        {
          label: '画像',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => mainWindow?.webContents.send('menu-insert-image')
        },
        { type: 'separator' },
        {
          label: 'テーブル',
          accelerator: 'CmdOrCtrl+T',
          click: () => mainWindow?.webContents.send('menu-insert-table')
        },
        {
          label: '水平線',
          click: () => mainWindow?.webContents.send('menu-insert-horizontal-rule')
        },
        {
          label: 'コードブロック',
          click: () => mainWindow?.webContents.send('menu-insert-code-block')
        },
        { type: 'separator' },
        {
          label: '目次生成',
          accelerator: 'CmdOrCtrl+Shift+T',
          click: () => mainWindow?.webContents.send('menu-insert-toc')
        }
      ]
    },
    {
      label: '表示',
      submenu: [
        {
          label: 'モード',
          submenu: [
            {
              label: 'WYSIWYG',
              type: 'radio',
              checked: true,
              click: () => mainWindow?.webContents.send('menu-switch-mode', 'wysiwyg')
            },
            {
              label: 'ソース',
              type: 'radio',
              click: () => mainWindow?.webContents.send('menu-switch-mode', 'source')
            }
          ]
        },
        { type: 'separator' },
        {
          label: 'テーマ',
          submenu: [
            {
              label: 'ライト',
              type: 'radio',
              checked: currentTheme === 'light',
              click: () => mainWindow?.webContents.send('menu-set-theme', 'light')
            },
            {
              label: 'ダーク',
              type: 'radio',
              checked: currentTheme === 'dark',
              click: () => mainWindow?.webContents.send('menu-set-theme', 'dark')
            }
          ]
        },
        { type: 'separator' },
        {
          label: '開発者ツール',
          accelerator: 'F12',
          click: () => mainWindow?.webContents.toggleDevTools()
        }
      ]
    },
    // 整理されたGitメニュー
    {
      label: 'Git',
      submenu: [
        {
          label: 'Git パネルを表示',
          accelerator: 'CmdOrCtrl+G',
          click: () => mainWindow?.webContents.send('menu-show-git')
        },
        { type: 'separator' },
        {
          label: 'リポジトリを初期化',
          click: () => mainWindow?.webContents.send('menu-git-init')
        },
        {
          label: 'リポジトリを開く',
          click: () => mainWindow?.webContents.send('menu-git-open-repo')
        },
        { type: 'separator' },
        {
          label: '全ての変更をインデックスに追加',
          accelerator: 'CmdOrCtrl+Shift+A',
          click: () => mainWindow?.webContents.send('menu-git-stage-all')
        },
        {
          label: 'コミット',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => mainWindow?.webContents.send('menu-git-commit')
        },
        { type: 'separator' },
        {
          label: 'プッシュ',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => mainWindow?.webContents.send('menu-git-push')
        },
        {
          label: 'プル',
          accelerator: 'CmdOrCtrl+Shift+L',
          click: () => mainWindow?.webContents.send('menu-git-pull')
        },
        { type: 'separator' },
        {
          label: 'ブランチ',
          submenu: [
            {
              label: '新規ブランチ作成',
              click: () => mainWindow?.webContents.send('menu-git-create-branch')
            },
            {
              label: 'ブランチを切り替え',
              click: () => mainWindow?.webContents.send('menu-git-switch-branch')
            }
          ]
        },
        { type: 'separator' },
        {
          label: 'リモート設定',
          click: () => mainWindow?.webContents.send('menu-git-setup-remote')
        },
        {
          label: 'ユーザー設定',
          click: () => mainWindow?.webContents.send('menu-git-config')
        },
        { type: 'separator' },
        {
          label: 'コミット履歴',
          click: () => mainWindow?.webContents.send('menu-git-show-history')
        }
      ]
    },
    {
      label: 'ヘルプ',
      submenu: [
        {
          label: 'ヘルプを表示',
          accelerator: 'F1',
          click: () => mainWindow?.webContents.send('menu-show-help')
        },
        {
          label: 'バージョン情報',
          click: () => mainWindow?.webContents.send('menu-show-about')
        },
        { type: 'separator' },
        {
          label: '更新をチェック',
          click: () => mainWindow?.webContents.send('menu-check-updates')
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}