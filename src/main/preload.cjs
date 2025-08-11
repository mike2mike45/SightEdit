const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // アプリケーション情報
  getAppInfo: () => ipcRenderer.invoke('app:getInfo'),
  
  // ファイル操作
  newFile: () => ipcRenderer.invoke('file:new'),
  openFile: () => ipcRenderer.invoke('file:open'),
  saveFile: (data) => ipcRenderer.invoke('file:save', data),
  saveAsFile: (data) => ipcRenderer.invoke('file:saveAs', data),
  readFile: (filePath) => ipcRenderer.invoke('file:read', filePath),
  
  // フォルダ選択（修正）
  selectFolder: () => ipcRenderer.invoke('git:selectDirectory'),
  
  // PDF出力
  exportPDF: () => ipcRenderer.invoke('export:pdf'),
  
  // テーマ
  changeTheme: (theme) => ipcRenderer.invoke('theme:change', theme),
  onThemeChanged: (callback) => ipcRenderer.on('theme-changed', callback),
  
  // 外部リンク（修正：openExternalを追加）
  openExternal: (url) => ipcRenderer.send('open-external-link', url),
  openExternalLink: (url) => ipcRenderer.send('open-external-link', url),
  
  // メニューアクション
  onMenuAction: (channel, callback) => {
    ipcRenderer.on(channel, (event, ...args) => callback(...args));
  },
  
  // 多言語機能
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  
  // クリップボード機能
  clipboard: {
    writeText: (text) => ipcRenderer.invoke('clipboard:writeText', text),
    readText: () => ipcRenderer.invoke('clipboard:readText')
  },
  
  // ウィンドウ終了関連
  closeConfirmed: () => ipcRenderer.send('close-confirmed'),
  
  // Git機能（修正版 - git-panel.jsと一致させる）
  git: {
    // 基本機能（メソッド名を修正）
    checkGitAvailability: () => ipcRenderer.invoke('git:checkAvailability'),
    checkAvailability: () => ipcRenderer.invoke('git:checkAvailability'), // 互換性のため両方
    
    // リポジトリ検索
    findRepository: (targetPath) => ipcRenderer.invoke('git:findRepository', targetPath),
    findRepositoryRoot: (targetPath) => ipcRenderer.invoke('git:findRepositoryRoot', targetPath),
    
    // リポジトリ初期化（引数なしでも呼べるように）
    initRepository: (dirPath) => {
      if (dirPath === undefined) {
        return ipcRenderer.invoke('git:initRepository');
      }
      return ipcRenderer.invoke('git:initRepository', dirPath);
    },
    
    // リポジトリを開く
    openRepository: (repoPath) => ipcRenderer.invoke('git:openRepository', repoPath),
    
    // リポジトリ状態（両方のメソッド名をサポート）
    getStatus: (repoPath) => ipcRenderer.invoke('git:getStatus', repoPath),
    getRepositoryStatus: (repoPath) => ipcRenderer.invoke('git:getStatus', repoPath), // エイリアス
    
    // ステージング（引数順序を修正）
    stageFile: (filePath, repoPath) => ipcRenderer.invoke('git:stageFile', filePath, repoPath),
    unstageFile: (filePath, repoPath) => ipcRenderer.invoke('git:unstageFile', filePath, repoPath),
    stageFiles: (files, repoPath) => ipcRenderer.invoke('git:stageFiles', files, repoPath),
    
    // 全ファイルのステージング（両方のメソッド名をサポート）
    stageAll: (repoPath) => ipcRenderer.invoke('git:stageAllChanges', repoPath),
    stageAllChanges: (repoPath) => ipcRenderer.invoke('git:stageAllChanges', repoPath), // エイリアス
    unstageAll: (repoPath) => ipcRenderer.invoke('git:unstageAll', repoPath),
    
    // ステージ済みファイル取得
    getStagedFiles: (repoPath) => ipcRenderer.invoke('git:getStagedFiles', repoPath),
    
    // コミット
    commit: (repoPath, message, options) => ipcRenderer.invoke('git:commit', repoPath, message, options),
    createCommit: (message, repoPath) => ipcRenderer.invoke('git:createCommit', message, repoPath),
    
    // コミット履歴
    getCommitHistory: (limit, repoPath) => ipcRenderer.invoke('git:getCommitHistory', limit, repoPath),
    getCommitFiles: (commitHash, repoPath) => ipcRenderer.invoke('git:getCommitFiles', commitHash, repoPath),
    
    // ブランチ操作
    getBranches: (repoPath) => ipcRenderer.invoke('git:getBranches', repoPath),
    createBranch: (branchName, repoPath) => ipcRenderer.invoke('git:createBranch', branchName, repoPath),
    switchBranch: (branchName, repoPath) => ipcRenderer.invoke('git:switchBranch', branchName, repoPath),
    deleteBranch: (branchName, repoPath) => ipcRenderer.invoke('git:deleteBranch', branchName, repoPath),
    
    // リモート操作（両方のメソッド名をサポート）
    addRemote: (url, name, repoPath) => ipcRenderer.invoke('git:addRemote', url, name, repoPath),
    addRemoteRepository: (url, name, repoPath) => ipcRenderer.invoke('git:addRemote', url, name, repoPath), // エイリアス
    removeRemote: (repoPath, remoteName) => ipcRenderer.invoke('git:removeRemote', repoPath, remoteName),
    getRemotes: (repoPath) => ipcRenderer.invoke('git:getRemotes', repoPath),
    
    // プッシュ・プル
    push: (repoPath, remote, branch, options) => ipcRenderer.invoke('git:push', repoPath, remote, branch, options),
    pushToRemote: (remoteName, branchName, repoPath) => ipcRenderer.invoke('git:pushToRemote', remoteName, branchName, repoPath),
    pull: (repoPath, remote, branch, options) => ipcRenderer.invoke('git:pull', repoPath, remote, branch, options),
    pullFromRemote: (remoteName, branchName, repoPath) => ipcRenderer.invoke('git:pullFromRemote', remoteName, branchName, repoPath),
    fetch: (repoPath, remote) => ipcRenderer.invoke('git:fetch', repoPath, remote),
    
    // 差分
    getDiff: (repoPath, filePath) => ipcRenderer.invoke('git:getDiff', repoPath, filePath),
    getFileDiff: (filePath, repoPath) => ipcRenderer.invoke('git:getFileDiff', filePath, repoPath),
    
    // ファイル内容取得
    getFileContent: (repoPath, filePath, revision) => ipcRenderer.invoke('git:getFileContent', repoPath, filePath, revision),
    
    // 最近使用したリポジトリ
    getRecentRepositories: () => ipcRenderer.invoke('git:getRecentRepositories'),
    
    // Git設定
    getDefaultSettings: () => ipcRenderer.invoke('git:getDefaultSettings'),
    setDefaultSettings: (settings) => ipcRenderer.invoke('git:setDefaultSettings', settings),
    
    // ユーザー設定
    getUserConfig: (repoPath) => ipcRenderer.invoke('git:getUserConfig', repoPath),
    setUserConfig: (config, repoPath) => ipcRenderer.invoke('git:setUserConfig', config, repoPath),
    setUserConfiguration: (name, email, isGlobal, repoPath) => 
      ipcRenderer.invoke('git:setUserConfiguration', name, email, isGlobal, repoPath),
    
    // ディレクトリ選択
    selectDirectory: () => ipcRenderer.invoke('git:selectDirectory'),
    
    // リポジトリ設定
    getRepoSettings: (repoPath) => ipcRenderer.invoke('git:getRepoSettings', repoPath),
    setRepoSettings: (repoPath, settings) => ipcRenderer.invoke('git:setRepoSettings', repoPath, settings)
  },
  
  // 更新機能
  update: {
    checkForUpdates: () => ipcRenderer.invoke('update:checkForUpdates'),
    downloadUpdate: () => ipcRenderer.invoke('update:downloadUpdate'),
    installUpdate: () => ipcRenderer.invoke('update:installUpdate'),
    quitAndInstall: () => ipcRenderer.invoke('update:quitAndInstall'),
    getStatus: () => ipcRenderer.invoke('update:getStatus'),
    onUpdateStatus: (callback) => {
      ipcRenderer.on('update-status', (event, statusData) => callback(statusData));
    },
    onPrepareForRestart: (callback) => {
      ipcRenderer.on('prepare-for-restart', callback);
    },
    readyForRestart: () => ipcRenderer.send('update:readyForRestart')
  }
});

// Expose showMessage to renderer (posts a message the renderer can handle)
try {
  contextBridge.exposeInMainWorld('showMessage', (text, type = 'info') => {
    try { window.postMessage({ __SE__: 'show-message', text, type }); }
    catch (e) { /* no-op */ }
  });
} catch (e) {
  // contextIsolation disabled; fallback to global
  try { window.showMessage = (text, type = 'info') => window.postMessage({ __SE__: 'show-message', text, type }); } catch (_) {}
}

// ---- lifecycle exposure (window.lifecycle) ----
try {
  contextBridge.exposeInMainWorld('lifecycle', {
    onBeforeClose: (cb) => { try { ipcRenderer.on('before-close', () => cb && cb()); } catch {} },
    confirmClose: () => { try { ipcRenderer.send('close-confirmed'); } catch {} },
  });
} catch (e) {
  try {
    // Fallback when contextIsolation is disabled
    window.lifecycle = {
      onBeforeClose: (cb) => { try { require('electron').ipcRenderer.on('before-close', () => cb && cb()); } catch {} },
      confirmClose: () => { try { require('electron').ipcRenderer.send('close-confirmed'); } catch {} },
    };
  } catch {}
}
// -----------------------------------------------


