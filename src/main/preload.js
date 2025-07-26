const { contextBridge, ipcRenderer } = require('electron');

// 有効なメニューチャンネルのリスト
const validMenuChannels = [
  'menu-new-file',
  'menu-open-file',
  'menu-save-file',
  'menu-save-as-file',
  'menu-export-pdf',
  'menu-switch-mode',
  'menu-set-theme',
  'menu-format-bold',
  'menu-format-italic',
  'menu-format-strikethrough',
  'menu-format-clear',
  'menu-insert-heading',
  'menu-insert-table',
  'menu-insert-link',
  'menu-insert-image',
  'menu-insert-code-block',
  'menu-insert-horizontal-rule',
  'menu-insert-toc',
  'set-initial-theme',
  'menu-show-help',
  'menu-show-about',
  'open-file-from-args',
  'before-close',
  'menu-search-replace',
  // Git関連メニューチャンネル
  'menu-show-git',
  'menu-git-init',
  'menu-git-open-repo',
  'menu-git-status',
  'menu-git-stage-all',
  'menu-git-commit',
  'menu-git-push',
  'menu-git-pull',
  'menu-git-create-branch',
  'menu-git-switch-branch',
  'menu-git-setup-remote',
  'menu-git-config',
  'menu-git-show-history'
];

// Git機能API
const gitAPI = {
  // Git利用可能性チェック
  checkGitAvailability: () => ipcRenderer.invoke('git:checkAvailability'),
  
  // リポジトリ初期化
  initRepository: (dirPath) => ipcRenderer.invoke('git:initRepository', dirPath),
  
  // リポジトリ状態取得
  getRepositoryStatus: (repoPath) => ipcRenderer.invoke('git:getStatus', repoPath),
  
  // リポジトリルート検索
  findRepositoryRoot: (filePath) => ipcRenderer.invoke('git:findRepositoryRoot', filePath),
  
  // 特定コミットからファイル内容を取得
  getFileFromCommit: (commitHash, filePath, repoPath) => 
    ipcRenderer.invoke('git:getFileFromCommit', commitHash, filePath, repoPath),
  
  // 特定コミットのファイル一覧を取得
  getCommitFiles: (commitHash, repoPath) => 
    ipcRenderer.invoke('git:getCommitFiles', commitHash, repoPath),
  
  // ファイルステージング
  stageFile: (filePath, repoPath) => ipcRenderer.invoke('git:stageFile', filePath, repoPath),
  
  // ファイルアンステージング
  unstageFile: (filePath, repoPath) => ipcRenderer.invoke('git:unstageFile', filePath, repoPath),
  
  // 全変更ステージング
  stageAllChanges: (repoPath) => ipcRenderer.invoke('git:stageAllChanges', repoPath),
  
  // コミット作成
  createCommit: (message, repoPath) => ipcRenderer.invoke('git:createCommit', message, repoPath),
  
  // ユーザー設定チェック
  checkUserConfiguration: (repoPath) => ipcRenderer.invoke('git:checkUserConfig', repoPath),
  
  // ユーザー設定
  setUserConfiguration: (name, email, isGlobal, repoPath) => 
    ipcRenderer.invoke('git:setUserConfig', name, email, isGlobal, repoPath),
  
  // 全てのGitアカウントを取得
  getAllGitAccounts: () => ipcRenderer.invoke('git:getAllAccounts'),
  
  // Gitアカウントを削除
  removeGitAccount: (type, repoPath) => ipcRenderer.invoke('git:removeAccount', type, repoPath),
  
  // 既存アカウントを選択
  selectExistingAccount: (account, targetType, targetRepoPath) => 
    ipcRenderer.invoke('git:selectAccount', account, targetType, targetRepoPath),
  
  // リモートリポジトリ追加
  addRemoteRepository: (remoteUrl, remoteName, repoPath) => 
    ipcRenderer.invoke('git:addRemote', remoteUrl, remoteName, repoPath),
  
  // プッシュ
  pushToRemote: (remoteName, branchName, repoPath) => 
    ipcRenderer.invoke('git:push', remoteName, branchName, repoPath),
  
  // プル
  pullFromRemote: (remoteName, branchName, repoPath) => 
    ipcRenderer.invoke('git:pull', remoteName, branchName, repoPath),
  
  // ファイル差分取得
  getFileDiff: (filePath, repoPath) => ipcRenderer.invoke('git:getFileDiff', filePath, repoPath),
  
  // ブランチ一覧取得
  getBranches: (repoPath) => ipcRenderer.invoke('git:getBranches', repoPath),
  
  // ブランチ作成
  createBranch: (branchName, repoPath) => ipcRenderer.invoke('git:createBranch', branchName, repoPath),
  
  // ブランチ切り替え
  switchBranch: (branchName, repoPath) => ipcRenderer.invoke('git:switchBranch', branchName, repoPath),
  
  // ブランチ削除
  deleteBranch: (branchName, repoPath) => ipcRenderer.invoke('git:deleteBranch', branchName, repoPath),
  
  // ディレクトリ選択
  selectDirectory: () => ipcRenderer.invoke('git:selectDirectory')
};

// ElectronAPIを公開
contextBridge.exposeInMainWorld('electronAPI', {
  // アプリケーション情報
  getAppInfo: () => ipcRenderer.invoke('app:getInfo'),
  
  // ファイル操作
  newFile: () => ipcRenderer.invoke('file:new'),
  openFile: () => ipcRenderer.invoke('file:open'),
  saveFile: (data) => ipcRenderer.invoke('file:save', data),
  saveAsFile: (data) => ipcRenderer.invoke('file:saveAs', data),
  
  // PDF出力
  exportPDF: (options) => ipcRenderer.invoke('export:pdf', options),
  
  // テーマ変更
  changeTheme: (theme) => ipcRenderer.invoke('theme:change', theme),
  
  // 外部リンクを開く
  openExternalLink: (url) => ipcRenderer.send('open-external-link', url),
  
  // Git機能
  git: gitAPI,
  
  // メニューアクション用のリスナー設定
  onMenuAction: (channel, callback) => {
    if (!validMenuChannels.includes(channel)) {
      console.error('Invalid menu channel:', channel);
      return;
    }
    
    ipcRenderer.removeAllListeners(channel);
    ipcRenderer.on(channel, (event, ...args) => callback(...args));
  },
  
  // リスナーの削除
  removeMenuAction: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
  
  // ウィンドウを閉じる確認
  confirmClose: () => {
    ipcRenderer.send('close-confirmed');
  }
});