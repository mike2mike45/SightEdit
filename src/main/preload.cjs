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
  'menu-git-show-history',
  // 更新関連メニューチャンネル
  'menu-check-updates',
  'update-status',
  'prepare-for-restart'
];

// Git機能API（エラーハンドリング強化）
const gitAPI = {
  // Git利用可能性チェック
  checkGitAvailability: () => {
    return ipcRenderer.invoke('git:checkAvailability').catch(error => {
      console.error('Git availability check failed:', error);
      return { success: false, isAvailable: false, error: error.message };
    });
  },
  
  // リポジトリ初期化
  initRepository: (dirPath) => {
    return ipcRenderer.invoke('git:initRepository', dirPath).catch(error => {
      console.error('Git init failed:', error);
      return { success: false, error: error.message };
    });
  },
  
  // リポジトリ状態取得（エラーハンドリング強化）
  getRepositoryStatus: (repoPath) => {
    return ipcRenderer.invoke('git:getStatus', repoPath).then(result => {
      // レスポンスの正規化
      if (result && result.success && result.status) {
        // statusオブジェクトの必須プロパティを確保
        const normalizedStatus = {
          currentBranch: result.status.currentBranch || 'unknown',
          remoteUrl: result.status.remoteUrl || null,
          changes: Array.isArray(result.status.changes) ? result.status.changes : [],
          commits: Array.isArray(result.status.commits) ? result.status.commits : [],
          hasChanges: Boolean(result.status.hasChanges),
          hasRemote: Boolean(result.status.hasRemote)
        };
        
        return {
          success: true,
          status: normalizedStatus
        };
      } else {
        return {
          success: false,
          error: result?.error || 'リポジトリの状態を取得できませんでした',
          status: null
        };
      }
    }).catch(error => {
      console.error('Git status failed:', error);
      return { 
        success: false, 
        error: error.message || 'Unknown error',
        status: null
      };
    });
  },
  
  // リポジトリルート検索
  findRepositoryRoot: (filePath) => {
    return ipcRenderer.invoke('git:findRepositoryRoot', filePath).catch(error => {
      console.error('Find repository root failed:', error);
      return { success: false, error: error.message };
    });
  },
  
  // 特定コミットからファイル内容を取得
  getFileFromCommit: (commitHash, filePath, repoPath) => {
    return ipcRenderer.invoke('git:getFileFromCommit', commitHash, filePath, repoPath).catch(error => {
      console.error('Get file from commit failed:', error);
      return { success: false, error: error.message };
    });
  },
  
  // 特定コミットのファイル一覧を取得
  getCommitFiles: (commitHash, repoPath) => {
    return ipcRenderer.invoke('git:getCommitFiles', commitHash, repoPath).catch(error => {
      console.error('Get commit files failed:', error);
      return { success: false, error: error.message };
    });
  },
  
  // ファイルステージング
  stageFile: (filePath, repoPath) => {
    return ipcRenderer.invoke('git:stageFile', filePath, repoPath).catch(error => {
      console.error('Stage file failed:', error);
      return { success: false, error: error.message };
    });
  },
  
  // ファイルアンステージング
  unstageFile: (filePath, repoPath) => {
    return ipcRenderer.invoke('git:unstageFile', filePath, repoPath).catch(error => {
      console.error('Unstage file failed:', error);
      return { success: false, error: error.message };
    });
  },
  
  // 全変更ステージング
  stageAllChanges: (repoPath) => {
    return ipcRenderer.invoke('git:stageAllChanges', repoPath).catch(error => {
      console.error('Stage all changes failed:', error);
      return { success: false, error: error.message };
    });
  },
  
  // コミット作成
  createCommit: (message, repoPath) => {
    return ipcRenderer.invoke('git:createCommit', message, repoPath).catch(error => {
      console.error('Create commit failed:', error);
      return { success: false, error: error.message };
    });
  },
  
  // ユーザー設定チェック（関数名修正 - 両方対応）
  checkUserConfig: (repoPath) => {
    return ipcRenderer.invoke('git:checkUserConfig', repoPath).catch(error => {
      console.error('Check user config failed:', error);
      return { success: false, error: error.message };
    });
  },
  
  checkUserConfiguration: (repoPath) => {
    return ipcRenderer.invoke('git:checkUserConfig', repoPath).catch(error => {
      console.error('Check user configuration failed:', error);
      return { success: false, error: error.message };
    });
  },
  
  // ユーザー設定
  setUserConfiguration: (name, email, isGlobal, repoPath) => {
    return ipcRenderer.invoke('git:setUserConfig', name, email, isGlobal, repoPath).catch(error => {
      console.error('Set user configuration failed:', error);
      return { success: false, error: error.message };
    });
  },
  
  // 全てのGitアカウントを取得（関数名修正 - 両方対応）
  getAllAccounts: () => {
    return ipcRenderer.invoke('git:getAllAccounts').catch(error => {
      console.error('Get all accounts failed:', error);
      return { success: false, accounts: [], error: error.message };
    });
  },
  
  getAllGitAccounts: () => {
    return ipcRenderer.invoke('git:getAllAccounts').catch(error => {
      console.error('Get all git accounts failed:', error);
      return { success: false, accounts: [], error: error.message };
    });
  },
  
  // Gitアカウントを削除
  removeAccount: (type, repoPath) => {
    return ipcRenderer.invoke('git:removeAccount', type, repoPath).catch(error => {
      console.error('Remove account failed:', error);
      return { success: false, error: error.message };
    });
  },
  
  // 既存アカウントを選択
  selectAccount: (account, targetType, targetRepoPath) => {
    return ipcRenderer.invoke('git:selectAccount', account, targetType, targetRepoPath).catch(error => {
      console.error('Select account failed:', error);
      return { success: false, error: error.message };
    });
  },
  
  // リモートリポジトリ追加
  addRemoteRepository: (remoteUrl, remoteName, repoPath) => {
    return ipcRenderer.invoke('git:addRemote', remoteUrl, remoteName, repoPath).catch(error => {
      console.error('Add remote repository failed:', error);
      return { success: false, error: error.message };
    });
  },
  
  // プッシュ
  pushToRemote: (remoteName, branchName, repoPath) => {
    return ipcRenderer.invoke('git:push', remoteName, branchName, repoPath).catch(error => {
      console.error('Push to remote failed:', error);
      return { success: false, error: error.message };
    });
  },
  
  // プル
  pullFromRemote: (remoteName, branchName, repoPath) => {
    return ipcRenderer.invoke('git:pull', remoteName, branchName, repoPath).catch(error => {
      console.error('Pull from remote failed:', error);
      return { success: false, error: error.message };
    });
  },
  
  // ファイル差分取得
  getFileDiff: (filePath, repoPath) => {
    return ipcRenderer.invoke('git:getFileDiff', filePath, repoPath).catch(error => {
      console.error('Get file diff failed:', error);
      return { success: false, error: error.message };
    });
  },
  
  // ブランチ一覧取得
  getBranches: (repoPath) => {
    return ipcRenderer.invoke('git:getBranches', repoPath).catch(error => {
      console.error('Get branches failed:', error);
      return { success: false, branches: [], error: error.message };
    });
  },
  
  // ブランチ作成
  createBranch: (branchName, repoPath) => {
    return ipcRenderer.invoke('git:createBranch', branchName, repoPath).catch(error => {
      console.error('Create branch failed:', error);
      return { success: false, error: error.message };
    });
  },
  
  // ブランチ切り替え
  switchBranch: (branchName, repoPath) => {
    return ipcRenderer.invoke('git:switchBranch', branchName, repoPath).catch(error => {
      console.error('Switch branch failed:', error);
      return { success: false, error: error.message };
    });
  },
  
  // ブランチ削除
  deleteBranch: (branchName, repoPath) => {
    return ipcRenderer.invoke('git:deleteBranch', branchName, repoPath).catch(error => {
      console.error('Delete branch failed:', error);
      return { success: false, error: error.message };
    });
  },
  
  // ディレクトリ選択
  selectDirectory: () => {
    return ipcRenderer.invoke('git:selectDirectory').catch(error => {
      console.error('Select directory failed:', error);
      return { success: false, error: error.message };
    });
  }
};

// 更新機能API（エラーハンドリング修正）
const updateAPI = {
  // 更新チェック（手動）
  checkForUpdates: () => {
    if (typeof ipcRenderer.invoke === 'function') {
      return ipcRenderer.invoke('update:checkForUpdates').catch(error => {
        console.warn('Update check failed:', error);
        return { success: false, error: 'Update API not available', reason: 'api_error' };
      });
    } else {
      console.warn('Update API not available - ipcRenderer.invoke not found');
      return Promise.resolve({ success: false, error: 'Update API not available', reason: 'no_api' });
    }
  },
  
  // 更新ダウンロード
  downloadUpdate: () => {
    if (typeof ipcRenderer.invoke === 'function') {
      return ipcRenderer.invoke('update:downloadUpdate').catch(error => {
        console.warn('Update download failed:', error);
        return { success: false, error: 'Update download failed', reason: 'api_error' };
      });
    } else {
      return Promise.resolve({ success: false, error: 'Update API not available', reason: 'no_api' });
    }
  },
  
  // 更新インストール（再起動）
  installUpdate: () => {
    if (typeof ipcRenderer.invoke === 'function') {
      return ipcRenderer.invoke('update:installUpdate').catch(error => {
        console.warn('Update install failed:', error);
        return { success: false, error: 'Update install failed', reason: 'api_error' };
      });
    } else {
      return Promise.resolve({ success: false, error: 'Update API not available', reason: 'no_api' });
    }
  },
  
  // 更新状態取得
  getStatus: () => {
    if (typeof ipcRenderer.invoke === 'function') {
      return ipcRenderer.invoke('update:getStatus').catch(error => {
        console.warn('Update status failed:', error);
        return { success: false, error: 'Update status failed', reason: 'api_error' };
      });
    } else {
      return Promise.resolve({ success: false, error: 'Update API not available', reason: 'no_api' });
    }
  },
  
  // 再起動準備完了通知
  readyForRestart: () => {
    if (typeof ipcRenderer.send === 'function') {
      try {
        ipcRenderer.send('update:readyForRestart');
      } catch (error) {
        console.warn('Ready for restart failed:', error);
      }
    } else {
      console.warn('Update API not available - ipcRenderer.send not found');
    }
  },
  
  // 更新状態リスナー
  onUpdateStatus: (callback) => {
    if (typeof ipcRenderer.on === 'function') {
      try {
        ipcRenderer.removeAllListeners('update-status');
        ipcRenderer.on('update-status', (event, statusData) => callback(statusData));
      } catch (error) {
        console.warn('Update status listener setup failed:', error);
      }
    } else {
      console.warn('Update API not available - ipcRenderer.on not found');
    }
  },
  
  // 再起動準備リスナー
  onPrepareForRestart: (callback) => {
    if (typeof ipcRenderer.on === 'function') {
      try {
        ipcRenderer.removeAllListeners('prepare-for-restart');
        ipcRenderer.on('prepare-for-restart', callback);
      } catch (error) {
        console.warn('Prepare for restart listener setup failed:', error);
      }
    } else {
      console.warn('Update API not available - ipcRenderer.on not found');
    }
  }
};

// ElectronAPIを公開
contextBridge.exposeInMainWorld('electronAPI', {
  // アプリケーション情報
  getAppInfo: () => {
    return ipcRenderer.invoke('app:getInfo').catch(error => {
      console.error('Get app info failed:', error);
      return { success: false, error: error.message };
    });
  },
  
  // ファイル操作
  newFile: () => {
    return ipcRenderer.invoke('file:new').catch(error => {
      console.error('New file failed:', error);
      return { success: false, error: error.message };
    });
  },
  
  openFile: () => {
    return ipcRenderer.invoke('file:open').catch(error => {
      console.error('Open file failed:', error);
      return { success: false, error: error.message };
    });
  },
  
  saveFile: (data) => {
    return ipcRenderer.invoke('file:save', data).catch(error => {
      console.error('Save file failed:', error);
      return { success: false, error: error.message };
    });
  },
  
  saveAsFile: (data) => {
    return ipcRenderer.invoke('file:saveAs', data).catch(error => {
      console.error('Save as file failed:', error);
      return { success: false, error: error.message };
    });
  },
  
  // PDF出力
  exportPDF: (options) => {
    return ipcRenderer.invoke('export:pdf', options).catch(error => {
      console.error('Export PDF failed:', error);
      return { success: false, error: error.message };
    });
  },
  
  // テーマ変更
  changeTheme: (theme) => {
    return ipcRenderer.invoke('theme:change', theme).catch(error => {
      console.error('Change theme failed:', error);
      return { success: false, error: error.message };
    });
  },
  
  // 外部リンクを開く
  openExternalLink: (url) => {
    try {
      ipcRenderer.send('open-external-link', url);
    } catch (error) {
      console.error('Open external link failed:', error);
    }
  },
  
  // Git機能
  git: gitAPI,
  
  // 更新機能
  update: updateAPI,
  
  // メニューアクション用のリスナー設定
  onMenuAction: (channel, callback) => {
    if (!validMenuChannels.includes(channel)) {
      console.error('Invalid menu channel:', channel);
      return;
    }
    
    try {
      ipcRenderer.removeAllListeners(channel);
      ipcRenderer.on(channel, (event, ...args) => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Menu action callback failed for ${channel}:`, error);
        }
      });
    } catch (error) {
      console.error(`Failed to set up menu action listener for ${channel}:`, error);
    }
  },
  
  // リスナーの削除
  removeMenuAction: (channel) => {
    try {
      ipcRenderer.removeAllListeners(channel);
    } catch (error) {
      console.error(`Failed to remove menu action listener for ${channel}:`, error);
    }
  },
  
  // ウィンドウを閉じる確認
  confirmClose: () => {
    try {
      ipcRenderer.send('close-confirmed');
    } catch (error) {
      console.error('Confirm close failed:', error);
    }
  }
});