import { app, BrowserWindow, Menu, dialog, ipcMain, shell, clipboard, nativeImage } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';

// UTF-8エンコーディングの設定（Windows対応）
if (process.platform === 'win32') {
  process.env.LANG = 'ja_JP.UTF-8';
  process.env.LC_ALL = 'ja_JP.UTF-8';
  // Windows コンソール出力でUTF-8を強制
  if (process.stdout && process.stdout._handle && process.stdout._handle.setBlocking) {
    process.stdout._handle.setBlocking(true);
  }
}
import ConfigManager from './config-manager.js';
import GitManager from './git-manager.js';
import UpdateManager from './update-manager.js';
import I18nManager from './i18n-manager.js';
import { createMenuTemplate } from './menu-template.js';

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
let i18nManager;
let openFilePath = null; // 起動時に開くファイルパス


// ===== Security helpers (main process) =====
function hasNullByte(str) {
  return typeof str === 'string' && str.indexOf('\x00') !== -1;
}

function isSupportedExt(filePath, allowed = ['.md','.markdown','.txt']) {
  try {
    const ext = path.extname(filePath || '').toLowerCase();
    return allowed.includes(ext);
  } catch { return false; }
}

function validatePathMain(filePath, { requireAbsolute = true, allowedExts = null } = {}) {
  if (!filePath || typeof filePath !== 'string') {
    return { ok: false, reason: 'empty' };
  }
  if (hasNullByte(filePath)) {
    return { ok: false, reason: 'null-byte' };
  }
  let isAbs = path.isAbsolute(filePath);
  if (requireAbsolute && !isAbs) {
    return { ok: false, reason: 'not-absolute' };
  }
  // path traversal is effectively resolved by path.resolve (no base restriction here)
  const normalized = isAbs ? path.normalize(filePath) : path.normalize(path.resolve(filePath));
  if (allowedExts && !isSupportedExt(normalized, allowedExts)) {
    return { ok: false, reason: 'bad-ext' };
  }
  return { ok: true, normalized };
}

function isAllowedUrl(raw) {
  try {
    const u = new URL(raw);
    const ok = ['http:', 'https:', 'mailto:'].includes(u.protocol);
    return ok;
  } catch {
    return false;
  }
}
// ===========================================


// アプリケーションの準備ができてから実行
app.whenReady().then(async () => {
  // Windows: ファイルの関連付けから起動された場合のチェック
  if (process.platform === 'win32' && process.argv.length >= 2) {
    const filePath = process.argv[1];
    // 拡張子で判定 + 絶対パスのみ受け付け
    if (filePath && !filePath.startsWith('--') && isSupportedExt(filePath) && path.isAbsolute(filePath)) {
      openFilePath = filePath;
      console.log('File to open:', openFilePath);
    }
  }
  
  configManager = new ConfigManager();
  await configManager.load();
  
  // 多言語機能を初期化
  i18nManager = new I18nManager();
  await i18nManager.init();
  
  // 設定から言語を読み込み
  const savedLanguage = configManager.get('language') || 'ja';
  i18nManager.setLanguage(savedLanguage);
  
  // Git機能を初期化
  gitManager = new GitManager();
  
  // 更新機能を初期化
  updateManager = new UpdateManager();
  
  createMainWindow();
  createApplicationMenu();
  setupIPCHandlers();
  setupGitIPCHandlers();
  setupUpdateIPCHandlers();
  setupI18nIPCHandlers();
  
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
  // 許可拡張子 & 絶対パスのみ
  if (isSupportedExt(filePath) && path.isAbsolute(filePath)) {
    openFilePath = filePath;
    if (mainWindow && mainWindow.webContents) {
      openFileInWindow(filePath);
    }
  } else {
    console.warn('Blocked opening file from open-file event:', filePath);
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

  // 右クリックメニューを有効化
  mainWindow.webContents.on('context-menu', (event, params) => {
    const { Menu } = require('electron');
    const menu = Menu.buildFromTemplate([
      {
        label: '切り取り',
        role: 'cut',
        enabled: params.editFlags.canCut
      },
      {
        label: 'コピー',
        role: 'copy',
        enabled: params.editFlags.canCopy
      },
      {
        label: '貼り付け',
        role: 'paste',
        enabled: params.editFlags.canPaste
      },
      { type: 'separator' },
      {
        label: 'すべて選択',
        role: 'selectAll',
        enabled: params.editFlags.canSelectAll
      }
    ]);
    menu.popup();
  });

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
  
  // クリップボード操作
  ipcMain.handle('clipboard:writeText', async (event, text) => {
    try {
      clipboard.writeText(text);
      return { success: true };
    } catch (error) {
      console.error('Failed to write to clipboard:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('clipboard:readText', async () => {
    try {
      const text = clipboard.readText();
      return { success: true, text };
    } catch (error) {
      console.error('Failed to read from clipboard:', error);
      return { success: false, error: error.message };
    }
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
      const vp = validatePathMain(filePath, { requireAbsolute: true, allowedExts: ['.md','.markdown','.txt'] });
      if (!vp.ok) {
        console.warn('Blocked opening invalid path:', vp.reason, filePath);
        return { success: false, error: 'invalid-path' };
      }
      try {
        const content = await fs.promises.readFile(vp.normalized, 'utf8');
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
      const saveDialog = await dialog.showSaveDialog({
        filters: [
          { name: 'Markdown', extensions: ['md'] },
          { name: 'Text', extensions: ['txt'] }
        ],
        defaultPath: 'Untitled.md'
      });

      if (!saveDialog.canceled && saveDialog.filePath) {
        const vp = validatePathMain(saveDialog.filePath, { requireAbsolute: true, allowedExts: ['.md','.txt'] });
        if (!vp.ok) {
          console.warn('Blocked saveAs to invalid path:', vp.reason, saveDialog.filePath);
          return { success: false, error: 'invalid-path' };
        }
        try {
          await fs.promises.writeFile(vp.normalized, content, 'utf8');
          return { 
            success: true, 
            filePath: saveDialog.filePath,
            fileName: path.basename(saveDialog.filePath)
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
    }
    const vp = validatePathMain(filePath, { requireAbsolute: true, allowedExts: ['.md','.markdown','.txt'] });
    if (!vp.ok) {
      console.warn('Blocked save to invalid path:', vp.reason, filePath);
      return { success: false, error: 'invalid-path' };
    }
    try {
      await fs.promises.writeFile(vp.normalized, content, 'utf8');
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
      const vp = validatePathMain(result.filePath, { requireAbsolute: true, allowedExts: ['.md','.txt'] });
      if (!vp.ok) {
        console.warn('Blocked saveAs to invalid path:', vp.reason, result.filePath);
        return { success: false, error: 'invalid-path' };
      }
      try {
        await fs.promises.writeFile(vp.normalized, content, 'utf8');
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
      const vp = validatePathMain(result.filePath, { requireAbsolute: true, allowedExts: ['.pdf'] });
      if (!vp.ok) {
        console.warn('Blocked PDF export to invalid path:', vp.reason, result.filePath);
        return { success: false, error: 'invalid-path' };
      }
      try {
        const pdfData = await mainWindow.webContents.printToPDF({
          marginsType: 0,
          pageSize: 'A4',
          printBackground: true,
          landscape: false
        });
        
        await fs.promises.writeFile(vp.normalized, pdfData);
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
    if (isAllowedUrl(url)) {
      shell.openExternal(url);
    } else {
      console.warn('Blocked external URL:', url);
    }
  });
}

// ファイルをウィンドウで開く
async function openFileInWindow(filePath) {
  const vp = validatePathMain(filePath, { requireAbsolute: true, allowedExts: ['.md','.markdown','.txt'] });
  if (!vp.ok) { console.warn('Blocked openFileInWindow invalid path:', vp.reason, filePath); return; }
  try {
    const content = await fs.promises.readFile(vp.normalized, 'utf8');
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
  const currentLanguage = i18nManager ? i18nManager.getCurrentLanguage() : 'ja';
  const t = (key) => i18nManager ? i18nManager.t(key) : key;
  
  // 直接言語変更関数を定義
  const changeLanguageDirectly = async (language) => {
    console.log('Direct menu language change to:', language);
    const success = i18nManager.setLanguage(language);
    if (success) {
      try {
        await configManager.updateLanguage(language);
        console.log('Language saved to config:', language);
        
        // メニューを再構築（即座に反映）
        createApplicationMenu();
        console.log('Menu recreated with new language');
        
        // レンダラープロセスに通知
        mainWindow?.webContents.send('language-changed', language);
        console.log('Language change notification sent to renderer');
        
        // 成功メッセージを表示
        const message = language === 'ja' 
          ? '言語を日本語に変更しました'
          : 'Language changed to English';
        
        // 少し遅延してメッセージを表示（メニューが更新されてから）
        setTimeout(() => {
          mainWindow?.webContents.send('show-message', message, 'success');
        }, 100);
        
      } catch (error) {
        console.error('Failed to save language:', error);
      }
    } else {
      console.error('Failed to set language:', language);
    }
  };
  
  const template = createMenuTemplate(t, currentTheme, mainWindow, changeLanguageDirectly);
  
  // 言語メニューの選択状態を動的に設定
  const viewMenu = template.find(menu => menu.label === t('menu.view'));
  if (viewMenu) {
    const languageMenu = viewMenu.submenu.find(item => item.label === t('menu.language'));
    if (languageMenu) {
      languageMenu.submenu.forEach(langItem => {
        if (langItem.label === t('menu.japanese')) {
          langItem.checked = currentLanguage === 'ja';
        } else if (langItem.label === t('menu.english')) {
          langItem.checked = currentLanguage === 'en';
        }
      });
    }
  }

  
  // AI メニューを追加（Gemini用）
  {
    try {
      template.push({
        label:'AI',
        submenu:[
          { label: 'テキストを要約 (Gemini)', click: () => {
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('menu-ai-summarize');
              }
            }
          },
          { type:'separator' },
          { label: 'Gemini API 設定…', click: () => { 
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('menu-ai-setup');
              }
            } 
          }
        ]
      });
      const menu = Menu.buildFromTemplate(template);
      Menu.setApplicationMenu(menu);
    } catch (e) {
      console.error('Failed to create AI menu:', e);
    }
  }
}

// I18n関連のIPCハンドラー設定
function setupI18nIPCHandlers() {
  // 現在の言語を取得
  ipcMain.handle('i18n:getCurrentLanguage', () => {
    return i18nManager.getCurrentLanguage();
  });

  // 利用可能な言語一覧を取得
  ipcMain.handle('i18n:getAvailableLanguages', () => {
    return i18nManager.getAvailableLanguages();
  });

  // 翻訳テキストを取得
  ipcMain.handle('i18n:translate', (event, key, interpolations) => {
    return i18nManager.t(key, interpolations);
  });

  // 言語を変更
  ipcMain.handle('i18n:setLanguage', async (event, language) => {
    const success = i18nManager.setLanguage(language);
    if (success) {
      // 設定に保存
      await configManager.updateLanguage(language);
      // メニューを再構築
      createApplicationMenu();
      // レンダラープロセスに通知
      mainWindow?.webContents.send('language-changed', language);
      return { success: true };
    }
    return { success: false };
  });

  // メニューからの言語変更
  ipcMain.on('menu-change-language', async (event, language) => {
    const success = i18nManager.setLanguage(language);
    if (success) {
      await configManager.updateLanguage(language);
      createApplicationMenu();
      mainWindow?.webContents.send('language-changed', language);
    }
  });
}




// ================= Gemini AI Configuration =================
// Gemini API設定の管理
ipcMain.handle('config:get', async (event, key) => {
  try {
    return configManager.get(key) || {};
  } catch (e) {
    console.error('Failed to get config:', e);
    return {};
  }
});

ipcMain.handle('config:set', async (event, key, value) => {
  try {
    configManager.set(key, value);
    await configManager.save();
    return { success: true };
  } catch (e) {
    console.error('Failed to set config:', e);
    return { success: false, error: e.message };
  }
});

