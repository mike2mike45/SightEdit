// Git関連のダイアログ管理
export class GitDialogs {
  constructor() {
    this.currentDialog = null;
  }

  // コミット履歴ダイアログを作成
  createCommitHistoryDialog() {
    const dialogHTML = `
      <div id="git-commit-history-dialog" class="git-dialog-overlay" style="display: none;">
        <div class="git-dialog-content">
          <div class="git-dialog-header">
            <h3>📜 コミット履歴</h3>
            <button class="git-dialog-close">&times;</button>
          </div>
          <div class="git-dialog-body">
            <div id="git-commit-history-list" class="git-history-list">
              <div class="git-loading">履歴を読み込んでいます...</div>
            </div>
          </div>
          <div class="git-dialog-footer">
            <button class="git-dialog-ok">閉じる</button>
          </div>
        </div>
      </div>
    `;

    const dialogDiv = document.createElement('div');
    dialogDiv.innerHTML = dialogHTML;
    document.body.appendChild(dialogDiv.firstElementChild);

    const dialog = document.getElementById('git-commit-history-dialog');
    const closeBtn = dialog.querySelector('.git-dialog-close');
    const okBtn = dialog.querySelector('.git-dialog-ok');

    closeBtn.addEventListener('click', () => this.hideCommitHistoryDialog());
    okBtn.addEventListener('click', () => this.hideCommitHistoryDialog());

    // 背景クリックで閉じる
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        this.hideCommitHistoryDialog();
      }
    });

    console.log('Commit history dialog created');
    return dialog;
  }

  // コミット履歴ダイアログを表示
  async showCommitHistoryDialog(repoPath) {
    console.log('showCommitHistoryDialog called with:', repoPath);
    
    let dialog = document.getElementById('git-commit-history-dialog');
    if (!dialog) {
      console.log('Creating new commit history dialog');
      dialog = this.createCommitHistoryDialog();
    }

    // ダイアログを先に表示
    dialog.style.display = 'flex';
    this.currentDialog = dialog;

    const historyList = document.getElementById('git-commit-history-list');
    
    // 履歴を取得して表示
    try {
      console.log('Fetching repository status...');
      historyList.innerHTML = '<div class="git-loading">履歴を読み込んでいます...</div>';
      
      const result = await window.electronAPI.git.getRepositoryStatus(repoPath);
      console.log('Repository status result:', result);
      
      if (result.success && result.status) {
        console.log('Repository status:', result.status);
        
        if (result.status.commits && Array.isArray(result.status.commits)) {
          console.log('Found commits:', result.status.commits.length);
          historyList.innerHTML = '';

          if (result.status.commits.length === 0) {
            historyList.innerHTML = '<p class="git-no-history">コミット履歴はありません</p>';
          } else {
            result.status.commits.forEach((commit, index) => {
              console.log(`Processing commit ${index}:`, commit);
              const commitItem = document.createElement('div');
              commitItem.className = 'git-commit-item';
              commitItem.innerHTML = `
                <div class="git-commit-header">
                  <span class="git-commit-hash">${commit.hash || 'unknown'}</span>
                  <span class="git-commit-date">${commit.date || 'unknown date'}</span>
                </div>
                <div class="git-commit-message">${commit.message || 'No message'}</div>
                <div class="git-commit-author">by ${commit.author || 'unknown'}</div>
                <div class="git-commit-actions">
                  <button class="git-btn-small" onclick="gitDialogs.openFileFromCommit('${commit.hash}', '${repoPath}')">
                    📄 ファイルを開く
                  </button>
                </div>
              `;
              historyList.appendChild(commitItem);
            });
          }
        } else {
          console.log('No commits array found in status');
          historyList.innerHTML = '<p class="git-no-history">コミット履歴を取得できませんでした</p>';
        }
      } else {
        console.error('Failed to get repository status:', result);
        historyList.innerHTML = '<p class="git-error">リポジトリの状態を取得できませんでした</p>';
      }
    } catch (error) {
      console.error('Error in showCommitHistoryDialog:', error);
      historyList.innerHTML = '<p class="git-error">履歴の読み込みに失敗しました</p>';
    }
  }

  // コミット履歴ダイアログを非表示
  hideCommitHistoryDialog() {
    const dialog = document.getElementById('git-commit-history-dialog');
    if (dialog) {
      dialog.style.display = 'none';
    }
    this.currentDialog = null;
  }

  // 指定コミットからファイルを開く
  async openFileFromCommit(commitHash, repoPath) {
    try {
      // コミットに含まれるファイル一覧を取得
      const result = await window.electronAPI.git.getCommitFiles(commitHash, repoPath);
      
      if (!result.success) {
        window.showMessage(`ファイル一覧の取得に失敗しました: ${result.error}`, 'error');
        return;
      }

      if (result.files.length === 0) {
        window.showMessage('このコミットにはファイルが含まれていません', 'warning');
        return;
      }

      // ファイル選択ダイアログを表示
      this.showFileSelectionDialog(commitHash, result.files, result.commitInfo, repoPath);
    } catch (error) {
      console.error('Error opening file from commit:', error);
      window.showMessage('ファイルの取得中にエラーが発生しました', 'error');
    }
  }

  // ファイル選択ダイアログを作成・表示
  showFileSelectionDialog(commitHash, files, commitInfo, repoPath) {
    // 既存のダイアログがあれば削除
    const existingDialog = document.getElementById('git-file-selection-dialog');
    if (existingDialog) {
      existingDialog.remove();
    }

    const dialogHTML = `
      <div id="git-file-selection-dialog" class="git-dialog-overlay" style="display: flex;">
        <div class="git-dialog-content">
          <div class="git-dialog-header">
            <h3>📄 ファイルを選択</h3>
            <button class="git-dialog-close">&times;</button>
          </div>
          <div class="git-dialog-body">
            <div class="git-commit-details">
              <h4>コミット情報</h4>
              <p><strong>ハッシュ:</strong> ${commitInfo.hash}</p>
              <p><strong>作成者:</strong> ${commitInfo.author}</p>
              <p><strong>日時:</strong> ${commitInfo.date}</p>
              <p><strong>メッセージ:</strong> ${commitInfo.message}</p>
            </div>
            <div class="git-file-list">
              <h4>含まれるファイル (${files.length}個)</h4>
              <div class="git-file-items">
                ${files.map(file => `
                  <div class="git-file-item" data-file-path="${file}">
                    <span class="git-file-name">📄 ${file}</span>
                    <button class="git-btn-small" onclick="gitDialogs.loadFileFromCommit('${commitHash}', '${file}', '${repoPath}')">
                      開く
                    </button>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
          <div class="git-dialog-footer">
            <button class="git-dialog-cancel">キャンセル</button>
          </div>
        </div>
      </div>
    `;

    const dialogDiv = document.createElement('div');
    dialogDiv.innerHTML = dialogHTML;
    document.body.appendChild(dialogDiv.firstElementChild);

    const dialog = document.getElementById('git-file-selection-dialog');
    const closeBtn = dialog.querySelector('.git-dialog-close');
    const cancelBtn = dialog.querySelector('.git-dialog-cancel');

    const closeDialog = () => {
      dialog.remove();
    };

    closeBtn.addEventListener('click', closeDialog);
    cancelBtn.addEventListener('click', closeDialog);

    // 背景クリックで閉じる
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        closeDialog();
      }
    });
  }

  // 指定コミットの指定ファイルを編集画面に読み込む
  async loadFileFromCommit(commitHash, filePath, repoPath) {
    try {
      // ファイル内容を取得
      const result = await window.electronAPI.git.getFileFromCommit(commitHash, filePath, repoPath);
      
      if (!result.success) {
        window.showMessage(`ファイルの読み込みに失敗しました: ${result.error}`, 'error');
        return;
      }

      // 編集画面にファイルを読み込む
      if (window.loadFileContent) {
        // ファイル名にコミット情報を付加
        const displayName = `${result.fileName} (${result.commitInfo.hash})`;
        
        window.loadFileContent({
          content: result.content,
          fileName: displayName,
          filePath: null, // コミットからのファイルなので実際のパスはnull
          isFromCommit: true,
          commitInfo: result.commitInfo,
          originalFilePath: result.filePath
        });

        // ダイアログを閉じる
        const fileSelectionDialog = document.getElementById('git-file-selection-dialog');
        if (fileSelectionDialog) {
          fileSelectionDialog.remove();
        }

        this.hideCommitHistoryDialog();

        window.showMessage(`コミット ${result.commitInfo.hash} からファイルを読み込みました`, 'success');
      } else {
        window.showMessage('ファイル読み込み機能が利用できません', 'error');
      }
    } catch (error) {
      console.error('Error loading file from commit:', error);
      window.showMessage('ファイルの読み込み中にエラーが発生しました', 'error');
    }
  }

  // コミット作成ダイアログを作成
  createCommitDialog() {
    const dialogHTML = `
      <div id="git-commit-dialog" class="git-dialog-overlay" style="display: none;">
        <div class="git-dialog-content">
          <div class="git-dialog-header">
            <h3>💾 コミット作成</h3>
            <button class="git-dialog-close">&times;</button>
          </div>
          <div class="git-dialog-body">
            <div class="git-commit-info">
              <div class="git-form-group">
                <label>対象ファイル:</label>
                <div id="git-commit-files" class="git-commit-files-list">
                  <!-- ステージされたファイル一覧 -->
                </div>
              </div>
              <div class="git-form-group">
                <label for="git-commit-dialog-message">コミットメッセージ:</label>
                <textarea id="git-commit-dialog-message" placeholder="変更内容を説明してください..." rows="3" style="resize: vertical; font-family: inherit; background: white !important; color: #495057 !important; border: 1px solid #ced4da; padding: 8px; border-radius: 4px; width: 100%; box-sizing: border-box;"></textarea>
              </div>
              <div class="git-form-group">
                <label>
                  <input type="checkbox" id="git-save-before-commit-dialog" checked>
                  コミット前に現在のファイルを保存する
                </label>
              </div>
            </div>
          </div>
          <div class="git-dialog-footer">
            <button id="git-commit-dialog-cancel" class="git-dialog-cancel">キャンセル</button>
            <button id="git-commit-dialog-ok" class="git-dialog-ok">コミット実行</button>
          </div>
        </div>
      </div>
    `;

    const dialogDiv = document.createElement('div');
    dialogDiv.innerHTML = dialogHTML;
    document.body.appendChild(dialogDiv.firstElementChild);

    const dialog = document.getElementById('git-commit-dialog');
    const closeBtn = dialog.querySelector('.git-dialog-close');
    const cancelBtn = dialog.querySelector('#git-commit-dialog-cancel');
    const okBtn = dialog.querySelector('#git-commit-dialog-ok');

    closeBtn.addEventListener('click', () => this.hideCommitDialog());
    cancelBtn.addEventListener('click', () => this.hideCommitDialog());
    okBtn.addEventListener('click', () => this.executeCommitFromDialog());

    // 背景クリックで閉じる
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        this.hideCommitDialog();
      }
    });

    return dialog;
  }

  // コミット作成ダイアログを表示
  async showCommitDialog(repoPath) {
    let dialog = document.getElementById('git-commit-dialog');
    if (!dialog) {
      dialog = this.createCommitDialog();
    }

    // ステージされたファイル情報を取得
    try {
      const result = await window.electronAPI.git.getRepositoryStatus(repoPath);
      if (result.success && result.status.changes) {
        const stagedFiles = result.status.changes.filter(change => change.staged);
        
        if (stagedFiles.length === 0) {
          window.showMessage('ステージングされたファイルがありません。先に変更をステージングしてください。', 'warning');
          return;
        }

        // ファイル一覧を表示
        const filesList = document.getElementById('git-commit-files');
        filesList.innerHTML = '';
        stagedFiles.forEach(file => {
          const fileItem = document.createElement('div');
          fileItem.className = 'git-commit-file-item';
          fileItem.innerHTML = `
            <span class="git-status-${file.changeType}">${this.getChangeIcon(file.changeType)} ${file.filePath}</span>
          `;
          filesList.appendChild(fileItem);
        });

        // コミットメッセージを初期化
        const messageInput = document.getElementById('git-commit-dialog-message');
        messageInput.value = '';
        
        dialog.style.display = 'flex';
        this.currentDialog = dialog;
        this.currentRepoPath = repoPath;
        
        setTimeout(() => {
          messageInput.focus();
          messageInput.setSelectionRange(0, 0); // カーソルを先頭に配置
        }, 200);
      }
    } catch (error) {
      console.error('Failed to load staged files:', error);
      window.showMessage('ステージングファイルの読み込みに失敗しました', 'error');
    }
  }

  // コミット作成ダイアログを非表示
  hideCommitDialog() {
    const dialog = document.getElementById('git-commit-dialog');
    if (dialog) {
      dialog.style.display = 'none';
    }
    this.currentDialog = null;
    this.currentRepoPath = null;
  }

  // ダイアログからコミット実行
  async executeCommitFromDialog() {
    const message = document.getElementById('git-commit-dialog-message').value.trim();
    if (!message) {
      window.showMessage('コミットメッセージが必要です', 'warning');
      return;
    }

    const saveBeforeCommit = document.getElementById('git-save-before-commit-dialog').checked;

    // 現在のファイルを保存するか確認
    if (saveBeforeCommit && window.getCurrentFile && window.getCurrentFile().name !== '無題のドキュメント') {
      try {
        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) {
          saveBtn.click();
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error('Save before commit failed:', error);
      }
    }

    try {
      const result = await window.electronAPI.git.createCommit(message, this.currentRepoPath);
      if (result.success) {
        window.showMessage(result.message, 'success');
        this.hideCommitDialog();
        
        // Git パネルが開いている場合は状態を更新
        if (window.gitPanel && window.gitPanel.isOpen()) {
          await window.gitPanel.refreshStatus();
        }
      } else if (result.needsUserConfig) {
        window.showMessage('ユーザー設定が必要です', 'warning');
        this.hideCommitDialog();
        if (window.gitPanel) {
          window.gitPanel.showUserConfigView();
        }
      } else {
        window.showMessage(`コミットに失敗: ${result.error}`, 'error');
      }
    } catch (error) {
      window.showMessage('コミットエラー', 'error');
    }
  }

  // ブランチ管理ダイアログを作成
  createBranchDialog() {
    const dialogHTML = `
      <div id="git-branch-dialog" class="git-dialog-overlay" style="display: none;">
        <div class="git-dialog-content">
          <div class="git-dialog-header">
            <h3>🌿 ブランチ管理</h3>
            <button class="git-dialog-close">&times;</button>
          </div>
          <div class="git-dialog-body">
            <div class="git-branch-management">
              <div class="git-form-group">
                <label>現在のブランチ一覧:</label>
                <div id="git-branch-dialog-list" class="git-branch-list">
                  <!-- ブランチ一覧 -->
                </div>
              </div>
              <div class="git-form-group">
                <label for="git-new-branch-dialog-name">新しいブランチを作成:</label>
                <div class="git-form-inline">
                  <input type="text" id="git-new-branch-dialog-name" placeholder="新しいブランチ名">
                  <button id="git-create-branch-dialog" class="git-btn">作成</button>
                </div>
              </div>
            </div>
          </div>
          <div class="git-dialog-footer">
            <button class="git-dialog-ok">閉じる</button>
          </div>
        </div>
      </div>
    `;

    const dialogDiv = document.createElement('div');
    dialogDiv.innerHTML = dialogHTML;
    document.body.appendChild(dialogDiv.firstElementChild);

    const dialog = document.getElementById('git-branch-dialog');
    const closeBtn = dialog.querySelector('.git-dialog-close');
    const okBtn = dialog.querySelector('.git-dialog-ok');
    const createBtn = dialog.querySelector('#git-create-branch-dialog');

    closeBtn.addEventListener('click', () => this.hideBranchDialog());
    okBtn.addEventListener('click', () => this.hideBranchDialog());
    createBtn.addEventListener('click', () => this.createBranchFromDialog());

    // 背景クリックで閉じる
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        this.hideBranchDialog();
      }
    });

    return dialog;
  }

  // ブランチ管理ダイアログを表示
  async showBranchDialog(repoPath) {
    let dialog = document.getElementById('git-branch-dialog');
    if (!dialog) {
      dialog = this.createBranchDialog();
    }

    try {
      const result = await window.electronAPI.git.getBranches(repoPath);
      if (result.success && result.branches) {
        const branchList = document.getElementById('git-branch-dialog-list');
        branchList.innerHTML = '';
        
        const localBranches = result.branches.filter(branch => !branch.isRemote);
        localBranches.forEach(branch => {
          const branchItem = document.createElement('div');
          branchItem.className = `git-branch-item ${branch.isCurrent ? 'current' : ''}`;
          branchItem.innerHTML = `
            <span class="git-branch-name">${branch.isCurrent ? '● ' : '○ '}${branch.name}</span>
            <div class="git-branch-actions">
              ${!branch.isCurrent ? 
                `<button class="git-btn-small" onclick="gitDialogs.switchToBranch('${branch.name}', '${repoPath}')">切り替え</button>` :
                ''
              }
              ${!branch.isCurrent && branch.name !== 'main' && branch.name !== 'master' ? 
                `<button class="git-btn-small git-btn-danger" onclick="gitDialogs.deleteBranch('${branch.name}', '${repoPath}')">削除</button>` :
                ''
              }
            </div>
          `;
          branchList.appendChild(branchItem);
        });

        dialog.style.display = 'flex';
        this.currentDialog = dialog;
        this.currentRepoPath = repoPath;
      }
    } catch (error) {
      console.error('Failed to load branches:', error);
      window.showMessage('ブランチ一覧の取得に失敗しました', 'error');
    }
  }

  // ブランチ管理ダイアログを非表示
  hideBranchDialog() {
    const dialog = document.getElementById('git-branch-dialog');
    if (dialog) {
      dialog.style.display = 'none';
    }
    this.currentDialog = null;
    this.currentRepoPath = null;
  }

  // ダイアログからブランチ作成
  async createBranchFromDialog() {
    const branchName = document.getElementById('git-new-branch-dialog-name').value.trim();
    if (!branchName) {
      window.showMessage('ブランチ名が必要です', 'warning');
      return;
    }

    if (!/^[a-zA-Z0-9/_-]+$/.test(branchName)) {
      window.showMessage('ブランチ名に使用できない文字が含まれています', 'warning');
      return;
    }

    try {
      const result = await window.electronAPI.git.createBranch(branchName, this.currentRepoPath);
      if (result.success) {
        window.showMessage(result.message, 'success');
        document.getElementById('git-new-branch-dialog-name').value = '';
        
        // ブランチ一覧を更新
        await this.showBranchDialog(this.currentRepoPath);
        
        // Git パネルが開いている場合は状態を更新
        if (window.gitPanel && window.gitPanel.isOpen()) {
          await window.gitPanel.refreshStatus();
        }
      } else {
        window.showMessage(`ブランチ作成に失敗: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Branch creation error:', error);
      window.showMessage('ブランチ作成エラー', 'error');
    }
  }

  // ブランチ切り替え
  async switchToBranch(branchName, repoPath) {
    try {
      const result = await window.electronAPI.git.switchBranch(branchName, repoPath);
      if (result.success) {
        window.showMessage(result.message, 'success');
        
        // ブランチ一覧を更新
        await this.showBranchDialog(repoPath);
        
        // Git パネルが開いている場合は状態を更新
        if (window.gitPanel && window.gitPanel.isOpen()) {
          await window.gitPanel.refreshStatus();
        }
      } else {
        window.showMessage(`ブランチ切り替えに失敗: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Branch switch error:', error);
      window.showMessage('ブランチ切り替えエラー', 'error');
    }
  }

  // ブランチ削除（確認ダイアログ付き）
  async deleteBranch(branchName, repoPath) {
    // 確認ダイアログを表示
    const confirmMessage = `ブランチ "${branchName}" を削除しますか？

⚠️ 注意：この操作は取り消すことができません。
削除されるブランチにコミットされていない変更がある場合、それらの変更は失われます。

本当に削除しますか？`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const result = await window.electronAPI.git.deleteBranch(branchName, repoPath);
      if (result.success) {
        window.showMessage(result.message, 'success');
        
        // ブランチ一覧を更新
        await this.showBranchDialog(repoPath);
        
        // Git パネルが開いている場合は状態を更新
        if (window.gitPanel && window.gitPanel.isOpen()) {
          await window.gitPanel.refreshStatus();
        }
      } else {
        window.showMessage(`ブランチ削除に失敗: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Branch deletion error:', error);
      window.showMessage('ブランチ削除エラー', 'error');
    }
  }

  // 変更タイプのアイコンを取得
  getChangeIcon(changeType) {
    switch (changeType) {
      case 'added': return '📄';
      case 'modified': return '📝';
      case 'deleted': return '🗑️';
      case 'renamed': return '📄→';
      case 'untracked': return '❓';
      default: return '📄';
    }
  }
}

// グローバルに公開
window.GitDialogs = GitDialogs;
window.gitDialogs = new GitDialogs();