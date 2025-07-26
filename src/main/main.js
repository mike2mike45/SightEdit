const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const ConfigManager = require('./config-manager');
const GitManager = require('./git-manager');

// package.jsonから情報を取得
const packageInfo = require('../../package.json');

let mainWindow;
let configManager;
let gitManager;
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
  
  createMainWindow();
  createApplicationMenu();
  setupIPCHandlers();
  setupGitIPCHandlers();
  
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
      preload: path.join(__dirname, 'preload.js'),
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
    return { success: true };
  });

  ipcMain.handle('file:open', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'ファイルを開く',
        filters: [
          { name: 'Markdown', extensions: ['md'] },
          { name: 'テキスト', extensions: ['txt'] },
          { name: 'すべてのファイル', extensions: ['*'] }
        ],
        properties: ['openFile']
      });

      if (result.canceled || !result.filePaths.length) {
        return { success: false, canceled: true };
      }

      const filePath = result.filePaths[0];
      const content = await fs.promises.readFile(filePath, 'utf8');
      
      return {
        success: true,
        filePath,
        content,
        fileName: path.basename(filePath)
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('file:save', async (event, data) => {
    try {
      const { filePath, content } = data;
      
      if (!filePath) {
        throw new Error('File path is required');
      }

      // 内容が空でないことを確認
      if (content === undefined || content === null) {
        throw new Error('File content is required');
      }

      await fs.promises.writeFile(filePath, content, 'utf8');
      
      return {
        success: true,
        filePath,
        fileName: path.basename(filePath)
      };
    } catch (error) {
      console.error('Save error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('file:saveAs', async (event, data) => {
    try {
      const { content, suggestedName } = data;
      
      // 内容が空でないことを確認
      if (content === undefined || content === null) {
        throw new Error('File content is required');
      }
      
      const result = await dialog.showSaveDialog(mainWindow, {
        title: '名前を付けて保存',
        defaultPath: suggestedName || 'untitled.md',
        filters: [
          { name: 'Markdown', extensions: ['md'] },
          { name: 'テキスト', extensions: ['txt'] },
          { name: 'すべてのファイル', extensions: ['*'] }
        ]
      });

      if (result.canceled || !result.filePath) {
        return { success: false, canceled: true };
      }

      await fs.promises.writeFile(result.filePath, content, 'utf8');
      
      return {
        success: true,
        filePath: result.filePath,
        fileName: path.basename(result.filePath)
      };
    } catch (error) {
      console.error('SaveAs error:', error);
      return { success: false, error: error.message };
    }
  });

  // PDF出力
  ipcMain.handle('export:pdf', async (event, options) => {
    try {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'PDFとして出力',
        defaultPath: (options.title || 'untitled') + '.pdf',
        filters: [
          { name: 'PDF', extensions: ['pdf'] }
        ]
      });

      if (result.canceled || !result.filePath) {
        return { success: false, canceled: true };
      }

      // PDF出力前に印刷プレビューを準備
      await mainWindow.webContents.executeJavaScript(`
        // ソースモードの場合はWYSIWYGモードに切り替え
        const sourceEditor = document.getElementById('source-editor');
        const wysiwygEditor = document.getElementById('wysiwyg-editor');
        if (sourceEditor && sourceEditor.style.display !== 'none') {
          document.getElementById('wysiwyg-btn').click();
        }
      `);

      // 少し待機してレンダリングを完了させる
      await new Promise(resolve => setTimeout(resolve, 500));

      const pdfData = await mainWindow.webContents.printToPDF({
        printBackground: true,
        landscape: false,
        margin: {
          marginType: 'custom',
          top: 1,
          bottom: 1,
          left: 1,
          right: 1
        },
        pageSize: 'A4',
        displayHeaderFooter: false,
        preferCSSPageSize: false,
        scale: 0.8
      });

      await fs.promises.writeFile(result.filePath, pdfData);

      return {
        success: true,
        filePath: result.filePath
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // テーマ変更
  ipcMain.handle('theme:change', async (event, theme) => {
    try {
      await configManager.updateTheme(theme);
      createApplicationMenu();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 外部リンク
  ipcMain.on('open-external-link', (event, url) => {
    shell.openExternal(url);
  });
}

function setupGitIPCHandlers() {
  // Git利用可能性チェック
  ipcMain.handle('git:checkAvailability', async () => {
    try {
      const isAvailable = await gitManager.checkGitAvailability();
      return { success: true, isAvailable };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // リポジトリ初期化（確認ダイアログ付き）
  ipcMain.handle('git:initRepository', async (event, dirPath) => {
    try {
      // 確認ダイアログを表示
      const result = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        buttons: ['初期化する', 'キャンセル'],
        defaultId: 0,
        cancelId: 1,
        title: 'Gitリポジトリの初期化',
        message: `Gitリポジトリを初期化しますか？`,
        detail: `以下の場所にGitリポジトリを初期化します:\n\n${dirPath}\n\n※この操作により、.gitフォルダと初期ファイルが作成されます。`
      });

      if (result.response !== 0) {
        return { success: false, canceled: true };
      }

      return await gitManager.initializeRepository(dirPath);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // リポジトリ状態取得（修正版）
  ipcMain.handle('git:getStatus', async (event, repoPath) => {
    try {
      const result = await gitManager.getRepositoryStatus(repoPath);
      
      // getRepositoryStatusは既にsuccessフィールドを含むオブジェクトを返すように修正されているため、
      // そのまま返す
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // リポジトリルート検索
  ipcMain.handle('git:findRepositoryRoot', async (event, filePath) => {
    try {
      const repoRoot = await gitManager.findRepositoryRoot(filePath);
      return { success: true, repoRoot };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 特定コミットからファイル内容を取得
  ipcMain.handle('git:getFileFromCommit', async (event, commitHash, filePath, repoPath) => {
    try {
      return await gitManager.getFileFromCommit(commitHash, filePath, repoPath);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 特定コミットのファイル一覧を取得
  ipcMain.handle('git:getCommitFiles', async (event, commitHash, repoPath) => {
    try {
      return await gitManager.getCommitFiles(commitHash, repoPath);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ファイルステージング
  ipcMain.handle('git:stageFile', async (event, filePath, repoPath) => {
    try {
      return await gitManager.stageFile(filePath, repoPath);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ファイルアンステージング
  ipcMain.handle('git:unstageFile', async (event, filePath, repoPath) => {
    try {
      return await gitManager.unstageFile(filePath, repoPath);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 全変更ステージング
  ipcMain.handle('git:stageAllChanges', async (event, repoPath) => {
    try {
      return await gitManager.stageAllChanges(repoPath);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // コミット作成
  ipcMain.handle('git:createCommit', async (event, message, repoPath) => {
    try {
      return await gitManager.createCommit(message, repoPath);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ユーザー設定チェック
  ipcMain.handle('git:checkUserConfig', async (event, repoPath) => {
    try {
      const config = await gitManager.checkUserConfiguration(repoPath);
      return { success: true, config };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ユーザー設定
  ipcMain.handle('git:setUserConfig', async (event, name, email, isGlobal, repoPath) => {
    try {
      return await gitManager.setUserConfiguration(name, email, isGlobal, repoPath);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 全てのGitアカウントを取得
  ipcMain.handle('git:getAllAccounts', async () => {
    try {
      const accounts = await gitManager.getAllGitAccounts();
      return { success: true, accounts };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Gitアカウントを削除
  ipcMain.handle('git:removeAccount', async (event, type, repoPath) => {
    try {
      return await gitManager.removeGitAccount(type, repoPath);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // 既存アカウントを選択
  ipcMain.handle('git:selectAccount', async (event, account, targetType, targetRepoPath) => {
    try {
      return await gitManager.selectExistingAccount(account, targetType, targetRepoPath);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // リモートリポジトリ追加
  ipcMain.handle('git:addRemote', async (event, remoteUrl, remoteName, repoPath) => {
    try {
      return await gitManager.addRemoteRepository(remoteUrl, remoteName, repoPath);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // プッシュ
  ipcMain.handle('git:push', async (event, remoteName, branchName, repoPath) => {
    try {
      return await gitManager.pushToRemote(remoteName, branchName, repoPath);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // プル
  ipcMain.handle('git:pull', async (event, remoteName, branchName, repoPath) => {
    try {
      return await gitManager.pullFromRemote(remoteName, branchName, repoPath);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ファイル差分取得
  ipcMain.handle('git:getFileDiff', async (event, filePath, repoPath) => {
    try {
      const diff = await gitManager.getFileDiff(filePath, repoPath);
      return { success: true, diff };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ブランチ一覧取得
  ipcMain.handle('git:getBranches', async (event, repoPath) => {
    try {
      const branches = await gitManager.getBranches(repoPath);
      return { success: true, branches };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ブランチ作成
  ipcMain.handle('git:createBranch', async (event, branchName, repoPath) => {
    try {
      return await gitManager.createBranch(branchName, repoPath);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ブランチ切り替え
  ipcMain.handle('git:switchBranch', async (event, branchName, repoPath) => {
    try {
      return await gitManager.switchBranch(branchName, repoPath);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ブランチ削除
  ipcMain.handle('git:deleteBranch', async (event, branchName, repoPath) => {
    try {
      return await gitManager.deleteBranch(branchName, repoPath);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ディレクトリ選択ダイアログ
  ipcMain.handle('git:selectDirectory', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'リポジトリ用フォルダーを選択',
        properties: ['openDirectory', 'createDirectory']
      });

      if (result.canceled || !result.filePaths.length) {
        return { success: false, canceled: true };
      }

      return { success: true, selectedPath: result.filePaths[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
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
          label: 'PDFとして出力',
          accelerator: 'CmdOrCtrl+P',
          click: () => mainWindow?.webContents.send('menu-export-pdf')
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
        },
        { type: 'separator' },
        {
          label: '書式解除',
          accelerator: 'CmdOrCtrl+\\',
          click: () => mainWindow?.webContents.send('menu-format-clear')
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
        {
          label: 'テーブル',
          accelerator: 'CmdOrCtrl+T',
          click: () => mainWindow?.webContents.send('menu-insert-table')
        },
        {
          label: '水平線',
          click: () => mainWindow?.webContents.send('menu-insert-horizontal-rule')
        },
        { type: 'separator' },
        {
          label: 'コードブロック',
          click: () => mainWindow?.webContents.send('menu-insert-code-block')
        },
        { type: 'separator' },
        {
          label: '目次を生成',
          accelerator: 'CmdOrCtrl+Shift+T',
          click: () => mainWindow?.webContents.send('menu-insert-toc')
        }
      ]
    },
    {
      label: '表示',
      submenu: [
        {
          label: 'エディターモード',
          submenu: [
            {
              label: 'WYSIWYGモード',
              type: 'radio',
              checked: true,
              click: () => mainWindow?.webContents.send('menu-switch-mode', 'wysiwyg')
            },
            {
              label: 'ソースモード',
              type: 'radio',
              checked: false,
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
          label: '全ての変更をステージング',
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
          label: 'ブランチを作成',
          click: () => mainWindow?.webContents.send('menu-git-create-branch')
        },
        {
          label: 'ブランチを切り替え',
          click: () => mainWindow?.webContents.send('menu-git-switch-branch')
        },
        { type: 'separator' },
        {
          label: 'リモートリポジトリを設定',
          click: () => mainWindow?.webContents.send('menu-git-setup-remote')
        },
        {
          label: 'Git設定',
          click: () => mainWindow?.webContents.send('menu-git-config')
        },
        { type: 'separator' },
        {
          label: 'コミット履歴を表示',
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
        { type: 'separator' },
        {
          label: 'SightEditについて',
          click: () => mainWindow?.webContents.send('menu-show-about')
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ファイルを開く関数
async function openFileInWindow(filePath) {
  if (!mainWindow || !filePath) return;
  
  try {
    const content = await fs.promises.readFile(filePath, 'utf8');
    mainWindow.webContents.send('open-file-from-args', {
      filePath,
      content,
      fileName: path.basename(filePath)
    });
  } catch (error) {
    console.error('Failed to open file:', error);
    dialog.showErrorBox('ファイルを開けません', `ファイルを開く際にエラーが発生しました:\n${error.message}`);
  }
}