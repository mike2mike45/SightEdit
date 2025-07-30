const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ファイル操作
  openFile: () => ipcRenderer.invoke('file:open'),
  saveFile: (data) => ipcRenderer.invoke('file:save', data),
  saveAsFile: (data) => ipcRenderer.invoke('file:saveAs', data),
  
  // PDF出力
  exportPDF: (options) => ipcRenderer.invoke('export:pdf', options),
  
  // テーマ
  changeTheme: (theme) => ipcRenderer.invoke('theme:change', theme),
  
  // 外部リンク
  openExternalLink: (url) => ipcRenderer.send('open-external-link', url),
  
  // ウィンドウ終了確認
  confirmClose: () => ipcRenderer.send('close-confirmed'),
  
  // メニューアクション
  onMenuAction: (channel, callback) => {
    ipcRenderer.on(channel, (event, ...args) => callback(...args));
  },
  
  // アプリケーション情報
  getAppInfo: () => ipcRenderer.invoke('app:getInfo'),
  
  // Git関連のAPI
  git: {
    // 基本操作
    checkGitAvailability: () => ipcRenderer.invoke('git:checkAvailability'),
    findRepositoryRoot: (targetPath) => ipcRenderer.invoke('git:findRepositoryRoot', targetPath),
    selectDirectory: () => ipcRenderer.invoke('git:selectDirectory'),
    initRepository: (dirPath) => ipcRenderer.invoke('git:initRepository', dirPath),
    getRepositoryStatus: (repoPath) => ipcRenderer.invoke('git:getStatus', repoPath),
    
    // ステージング操作
    stageFile: (filePath, repoPath) => ipcRenderer.invoke('git:stageFile', filePath, repoPath),
    unstageFile: (filePath, repoPath) => ipcRenderer.invoke('git:unstageFile', filePath, repoPath),
    stageAllChanges: (repoPath) => ipcRenderer.invoke('git:stageAllChanges', repoPath),
    getStagedFiles: (repoPath) => ipcRenderer.invoke('git:getStagedFiles', repoPath),
    
    // コミット操作
    createCommit: (message, repoPath) => ipcRenderer.invoke('git:createCommit', message, repoPath),
    getCommitHistory: (limit, repoPath) => ipcRenderer.invoke('git:getCommitHistory', limit, repoPath),
    getCommitFiles: (commitHash, repoPath) => ipcRenderer.invoke('git:getCommitFiles', commitHash, repoPath),
    getFileFromCommit: (commitHash, filePath, repoPath) => ipcRenderer.invoke('git:getFileFromCommit', commitHash, filePath, repoPath),
    
    // ユーザー設定
    getUserConfig: (repoPath) => ipcRenderer.invoke('git:getUserConfig', repoPath),
    setUserConfiguration: (name, email, isGlobal, repoPath) => ipcRenderer.invoke('git:setUserConfiguration', name, email, isGlobal, repoPath),
    getAllGitAccounts: () => ipcRenderer.invoke('git:getAllGitAccounts'),
    selectAccount: (account, targetType, repoPath) => ipcRenderer.invoke('git:selectAccount', account, targetType, repoPath),
    removeAccount: (accountType, repoPath) => ipcRenderer.invoke('git:removeAccount', accountType, repoPath),
    
    // リモート操作
    addRemoteRepository: (remoteUrl, remoteName, repoPath) => ipcRenderer.invoke('git:addRemoteRepository', remoteUrl, remoteName, repoPath),
    pushToRemote: (remoteName, branchName, repoPath) => ipcRenderer.invoke('git:pushToRemote', remoteName, branchName, repoPath),
    pullFromRemote: (remoteName, branchName, repoPath) => ipcRenderer.invoke('git:pullFromRemote', remoteName, branchName, repoPath),
    
    // ブランチ操作
    getBranches: (repoPath) => ipcRenderer.invoke('git:getBranches', repoPath),
    createBranch: (branchName, repoPath) => ipcRenderer.invoke('git:createBranch', branchName, repoPath),
    switchBranch: (branchName, repoPath) => ipcRenderer.invoke('git:switchBranch', branchName, repoPath),
    deleteBranch: (branchName, repoPath) => ipcRenderer.invoke('git:deleteBranch', branchName, repoPath),
    
    // ファイル差分
    getFileDiff: (filePath, repoPath) => ipcRenderer.invoke('git:getFileDiff', filePath, repoPath),
    
    // 設定管理（新規追加）
    getRecentRepositories: () => ipcRenderer.invoke('git:getRecentRepositories'),
    getDefaultSettings: () => ipcRenderer.invoke('git:getDefaultSettings'),
    setDefaultSettings: (settings) => ipcRenderer.invoke('git:setDefaultSettings', settings)
  },
  
  // 更新関連のAPI
  update: {
    checkForUpdates: () => ipcRenderer.invoke('update:checkForUpdates'),
    downloadUpdate: () => ipcRenderer.invoke('update:downloadUpdate'),
    installUpdate: () => ipcRenderer.invoke('update:installUpdate'),
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