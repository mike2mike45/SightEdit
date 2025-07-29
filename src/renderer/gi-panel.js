// 改善されたGit操作パネルの実装（修正版）
import { GitUIManager } from './git-ui-manager.js';

export class GitPanel {
  constructor() {
    this.currentRepository = null;
    this.gitStatus = null;
    this.isGitAvailable = false;
    this.panel = null;
    this.isVisible = false;
    this.currentView = 'main';
    this.collapsedSections = new Set();
    this.uiManager = new GitUIManager(this);
    
    this.init();
  }

  async init() {
    // Git利用可能性をチェック
    const result = await window.electronAPI.git.checkGitAvailability();
    this.isGitAvailable = result.isAvailable;
    
    this.createPanel();
    this.setupEventListeners();
    
    if (!this.isGitAvailable) {
      this.showGitNotAvailableMessage();
    }
  }

  createPanel() {
    // UIManagerからHTMLを取得
    const panelHTML = this.uiManager.createMainPanelHTML();
    
    // パネルをbodyに追加
    const panelDiv = document.createElement('div');
    panelDiv.innerHTML = panelHTML;
    document.body.appendChild(panelDiv.firstElementChild);
    
    this.panel = document.getElementById('git-panel');
    
    // 画面サイズ変更時の調整
    window.addEventListener('resize', () => {
      this.uiManager.adjustPanelSize();
    });
  }

  setupEventListeners() {
    if (!this.panel) return;

    // パネルを閉じる
    this.panel.querySelector('.git-panel-close').addEventListener('click', () => {
      this.hide();
    });

    // ナビゲーション
    document.getElementById('git-nav-back')?.addEventListener('click', () => {
      this.uiManager.showMainView();
    });

    // 折りたたみ機能の設定
    this.setupCollapsibleSections();

    // 入力フィールドの右クリックメニュー設定
    this.setupInputContextMenus();

    // リポジトリ初期化（確認ダイアログ付き）
    document.getElementById('git-init-here')?.addEventListener('click', () => {
      this.initializeRepositoryWithConfirm();
    });

    document.getElementById('git-select-folder')?.addEventListener('click', () => {
      this.selectRepositoryFolder();
    });

    // ユーザー設定画面を開く
    document.getElementById('git-open-user-config')?.addEventListener('click', () => {
      this.uiManager.showUserConfigView();
      this.loadUserAccounts();
    });

    // 最初にすべきこと画面を開く
    document.getElementById('git-open-getting-started')?.addEventListener('click', () => {
      this.uiManager.showGettingStartedView();
    });

    // 最初にすべきこと画面からユーザー設定へ
    document.getElementById('git-goto-user-config')?.addEventListener('click', () => {
      this.uiManager.showUserConfigView();
      this.loadUserAccounts();
    });

    // 新しいアカウント追加ボタン
    document.getElementById('git-add-new-account')?.addEventListener('click', () => {
      this.showUserConfigForm();
    });

    // ユーザー設定保存
    document.getElementById('git-save-user-config')?.addEventListener('click', () => {
      this.saveUserConfiguration();
    });

    // キャンセルボタン
    document.getElementById('git-cancel-user-config')?.addEventListener('click', () => {
      this.hideUserConfigForm();
    });

    // リモート設定のOK/キャンセル
    document.getElementById('remote-setup-ok')?.addEventListener('click', () => {
      this.handleRemoteSetup();
    });

    document.getElementById('remote-setup-cancel')?.addEventListener('click', () => {
      this.hide(); // パネルを閉じる
    });

    // ステージング（確認ダイアログ付き）
    document.getElementById('git-stage-all')?.addEventListener('click', () => {
      this.stageAllChangesWithConfirm();
    });

    // ステータス更新
    document.getElementById('git-refresh-status')?.addEventListener('click', () => {
      this.refreshStatus();
    });

    // プッシュ・プル（確認ダイアログ付き）
    document.getElementById('git-push')?.addEventListener('click', () => {
      this.pushToRemoteWithConfirm();
    });

    document.getElementById('git-pull')?.addEventListener('click', () => {
      this.pullFromRemoteWithConfirm();
    });

    // ブランチ作成
    document.getElementById('git-create-branch')?.addEventListener('click', () => {
      this.createNewBranch();
    });

    // 外部リンククリック
    this.panel.addEventListener('click', (e) => {
      if (e.target.classList.contains('external-link')) {
        e.preventDefault();
        const url = e.target.dataset.url;
        if (url && window.electronAPI) {
          window.electronAPI.openExternalLink(url);
        }
      }
    });

    // 右クリックメニュー（リモートURL入力）
    const remoteUrlInput = document.getElementById('remote-url-input');
    if (remoteUrlInput) {
      remoteUrlInput.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.showInputContextMenu(e, remoteUrlInput);
      });
    }
  }

  // メニューからのアクション処理（修正版）
  handleMenuAction(action, ...args) {
    switch (action) {
      case 'show':
        this.show();
        break;
      case 'init-repository':
        this.initializeRepositoryWithConfirm();
        break;
      case 'open-repository':
        this.selectRepositoryFolder();
        break;
      case 'show-status':
        this.showWithStatus();
        break;
      case 'stage-all':
        this.stageAllChangesWithConfirm();
        break;
      case 'commit':
        // コミットダイアログを表示
        if (window.gitDialogs && this.currentRepository) {
          window.gitDialogs.showCommitDialog(this.currentRepository);
        }
        break;
      case 'push':
        this.pushToRemoteWithConfirm();
        break;
      case 'pull':
        this.pullFromRemoteWithConfirm();
        break;
      case 'create-branch':
        // ブランチダイアログを表示
        if (window.gitDialogs && this.currentRepository) {
          window.gitDialogs.showBranchDialog(this.currentRepository);
        }
        break;
      case 'switch-branch':
        // ブランチダイアログを表示
        if (window.gitDialogs && this.currentRepository) {
          window.gitDialogs.showBranchDialog(this.currentRepository);
        }
        break;
      case 'setup-remote':
        this.uiManager.showRemoteSetupView();
        break;
      case 'user-config':
        this.uiManager.showUserConfigView();
        this.loadUserAccounts();
        break;
      case 'show-history':
        // コミット履歴ダイアログを表示
        if (window.gitDialogs && this.currentRepository) {
          console.log('Showing commit history for:', this.currentRepository);
          window.gitDialogs.showCommitHistoryDialog(this.currentRepository);
        } else {
          console.error('GitDialogs not available or no repository');
          window.showMessage('リポジトリが初期化されていません', 'error');
        }
        break;
      default:
        console.warn('Unknown git menu action:', action);
    }
  }

  // 確認付きリポジトリ初期化
  async initializeRepositoryWithConfirm() {
    const targetDirectory = this.currentRepository || this.getDirectoryFromPath(this.getCurrentFilePath());
    
    if (!targetDirectory) {
      window.showMessage('ファイルを保存するか、フォルダを明示的に選択してください', 'warning');
      return;
    }

    try {
      const result = await window.electronAPI.git.initRepository(targetDirectory);
      if (result.success && !result.canceled) {
        this.currentRepository = targetDirectory;
        window.showMessage(result.message, 'success');
        await this.updatePanelContent();
      }
    } catch (error) {
      console.error('Repository initialization error:', error);
      window.showMessage('初期化エラー', 'error');
    }
  }

  // ステータスと共にパネルを表示
  async showWithStatus() {
    await this.show();
    if (this.currentRepository) {
      await this.refreshStatus();
    }
  }

  // 確認ダイアログ付き全ステージング（修正版 - リポジトリ状態チェック強化）
  async stageAllChangesWithConfirm() {
    if (!this.currentRepository) {
      window.showMessage('Gitリポジトリが初期化されていません', 'error');
      return;
    }

    // リポジトリの存在を確認
    try {
      const statusResult = await window.electronAPI.git.getRepositoryStatus(this.currentRepository);
      if (!statusResult.success || !statusResult.status) {
        window.showMessage('Gitリポジトリの状態を確認できません。リポジトリが正しく初期化されているか確認してください。', 'error');
        return;
      }
    } catch (error) {
      console.error('Repository status check error:', error);
      window.showMessage('Gitリポジトリにアクセスできません', 'error');
      return;
    }

    const confirmed = confirm('全ての変更をステージングエリアに追加しますか？\n\nこの操作により、変更されたファイルがコミット対象になります。');
    if (!confirmed) return;

    try {
      const result = await window.electronAPI.git.stageAllChanges(this.currentRepository);
      if (result.success) {
        await this.refreshStatus();
        window.showMessage('全ての変更をステージングしました', 'success');
      } else {
        window.showMessage(`ステージングに失敗: ${result.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Stage all error:', error);
      window.showMessage('ステージングエラー', 'error');
    }
  }

  // 確認ダイアログ付きプッシュ
  async pushToRemoteWithConfirm() {
    if (!this.currentRepository) {
      window.showMessage('Gitリポジトリが初期化されていません', 'error');
      return;
    }

    const confirmed = confirm('リモートリポジトリにプッシュしますか？\n\nローカルのコミットがリモートリポジトリに送信されます。');
    if (!confirmed) return;

    try {
      const result = await window.electronAPI.git.pushToRemote('origin', null, this.currentRepository);
      if (result.success) {
        window.showMessage(result.message, 'success');
      } else {
        window.showMessage(`プッシュに失敗: ${result.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Push error:', error);
      window.showMessage('プッシュエラー', 'error');
    }
  }

  // 確認ダイアログ付きプル
  async pullFromRemoteWithConfirm() {
    if (!this.currentRepository) {
      window.showMessage('Gitリポジトリが初期化されていません', 'error');
      return;
    }

    const confirmed = confirm('リモートリポジトリからプルしますか？\n\nリモートの最新変更がローカルリポジトリに取り込まれます。');
    if (!confirmed) return;

    try {
      const result = await window.electronAPI.git.pullFromRemote('origin', null, this.currentRepository);
      if (result.success) {
        window.showMessage(result.message, 'success');
        await this.refreshStatus();
      } else {
        window.showMessage(`プルに失敗: ${result.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Pull error:', error);
      window.showMessage('プルエラー', 'error');
    }
  }

  // 折りたたみ機能の設定
  setupCollapsibleSections() {
    const headers = this.panel.querySelectorAll('.git-section-header');
    headers.forEach(header => {
      header.addEventListener('click', () => {
        const section = header.dataset.section;
        const collapsible = header.closest('.git-section-collapsible');
        
        if (collapsible.classList.contains('collapsed')) {
          collapsible.classList.remove('collapsed');
          this.collapsedSections.delete(section);
        } else {
          collapsible.classList.add('collapsed');
          this.collapsedSections.add(section);
        }
      });
    });
  }

  async show(currentFilePath = null) {
    if (!this.isGitAvailable) {
      this.showGitNotAvailableMessage();
      this.panel.style.display = 'block';
      this.isVisible = true;
      return;
    }

    this.panel.style.display = 'block';
    this.isVisible = true;
    this.uiManager.showMainView();
    this.uiManager.adjustPanelSize();

    // 現在のファイルからリポジトリを検索
    if (currentFilePath) {
      const result = await window.electronAPI.git.findRepositoryRoot(currentFilePath);
      if (result.success && result.repoRoot) {
        this.currentRepository = result.repoRoot;
      } else {
        this.currentRepository = this.getDirectoryFromPath(currentFilePath);
      }
    } else {
      const detectedPath = this.getCurrentFilePath();
      if (detectedPath) {
        const result = await window.electronAPI.git.findRepositoryRoot(detectedPath);
        if (result.success && result.repoRoot) {
          this.currentRepository = result.repoRoot;
        } else {
          this.currentRepository = this.getDirectoryFromPath(detectedPath);
        }
      }
    }

    await this.updatePanelContent();
  }

  hide() {
    this.panel.style.display = 'none';
    this.isVisible = false;
    this.uiManager.showMainView();
  }

  isOpen() {
    return this.isVisible;
  }

  showGitNotAvailableMessage() {
    this.uiManager.hideAllSections();
    document.getElementById('git-not-available').style.display = 'block';
  }

  async updatePanelContent() {
    this.uiManager.hideAllSections();

    if (!this.currentRepository) {
      document.getElementById('git-no-repo').style.display = 'block';
      return;
    }

    // クイック設定ボタンを表示
    document.getElementById('git-quick-settings').style.display = 'block';

    // リポジトリ状態を取得
    await this.refreshStatus();
  }

  async refreshStatus() {
    if (!this.currentRepository) return;

    try {
      const result = await window.electronAPI.git.getRepositoryStatus(this.currentRepository);
      console.log('Git status result:', result);
      
      if (result.success && result.status) {
        this.gitStatus = result.status;
        await this.updateRepositoryInfo();
        await this.updateChangesList();
        await this.updateBranchList();
        this.updateCountDisplays();
      } else {
        // result.statusがnullまたはresult.successがfalseの場合
        const errorMsg = result.error || 'リポジトリの状態を取得できませんでした';
        console.error('Git status failed:', errorMsg);
        window.showMessage(`Git状態の取得に失敗: ${errorMsg}`, 'error');
      }
    } catch (error) {
      console.error('Git status error:', error);
      const errorMsg = error?.message || error?.toString() || 'Unknown error';
      window.showMessage(`Git状態の取得に失敗: ${errorMsg}`, 'error');
    }
  }

  async updateRepositoryInfo() {
    if (!this.gitStatus) return;

    const repoInfo = document.getElementById('git-repo-info');
    const repoName = document.getElementById('git-repo-name');
    const currentBranch = document.getElementById('git-current-branch');
    const remoteUrl = document.getElementById('git-remote-url');

    repoName.textContent = this.currentRepository.split('/').pop() || this.currentRepository.split('\\').pop();
    currentBranch.textContent = this.gitStatus.currentBranch || 'unknown';
    remoteUrl.textContent = this.gitStatus.remoteUrl || '未設定';

    repoInfo.style.display = 'block';

    // リモート操作セクションの表示制御
    const remoteSection = document.getElementById('git-remote-section');
    if (this.gitStatus.hasRemote) {
      remoteSection.style.display = 'block';
      if (this.collapsedSections.has('remote')) {
        remoteSection.classList.add('collapsed');
      }
    }
  }

  async updateChangesList() {
    if (!this.gitStatus) return;

    const changesList = document.getElementById('git-changes-list');
    const changesSection = document.getElementById('git-changes');

    if (this.gitStatus.changes.length === 0) {
      changesList.innerHTML = '<p class="git-no-changes">変更はありません</p>';
      changesSection.style.display = 'block';
      if (this.collapsedSections.has('changes')) {
        changesSection.classList.add('collapsed');
      }
      return;
    }

    changesSection.style.display = 'block';
    if (this.collapsedSections.has('changes')) {
      changesSection.classList.add('collapsed');
    }

    // 変更ファイル一覧を生成
    changesList.innerHTML = '';
    this.gitStatus.changes.forEach((change, index) => {
      const changeItem = document.createElement('div');
      changeItem.className = 'git-change-item';
      
      const statusIcon = this.getChangeIcon(change.changeType);
      const statusClass = `git-status-${change.changeType}`;
      
      changeItem.innerHTML = `
        <div class="git-change-header">
          <span class="${statusClass}">${statusIcon} ${change.filePath}</span>
          <div class="git-change-actions">
            ${!change.staged ? 
              `<button class="git-btn-small" onclick="gitPanel.stageFile('${change.filePath}', ${index})">+</button>` :
              `<button class="git-btn-small" onclick="gitPanel.unstageFile('${change.filePath}', ${index})">-</button>`
            }
          </div>
        </div>
      `;
      
      changesList.appendChild(changeItem);
    });
  }

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

  async updateBranchList() {
    // ブランチセクションは削除されたため、この関数は空にする
    return;
  }

  // 数字表示を更新
  updateCountDisplays() {
    const changesCount = document.getElementById('git-changes-count');
    if (changesCount && this.gitStatus) {
      changesCount.textContent = this.gitStatus.changes.length;
    }
  }

  async loadUserAccounts() {
    try {
      const accountsResult = await window.electronAPI.git.getAllGitAccounts();
      const existingAccounts = accountsResult.success ? accountsResult.accounts : [];
      
      if (existingAccounts.length > 0) {
        this.showExistingAccounts(existingAccounts);
      } else {
        document.getElementById('git-existing-accounts').style.display = 'none';
      }
      
      this.existingAccounts = existingAccounts;
    } catch (error) {
      console.error('User accounts load error:', error);
    }
  }

  showExistingAccounts(accounts) {
    const existingAccountsDiv = document.getElementById('git-existing-accounts');
    const accountsList = document.getElementById('git-accounts-list');
    
    accountsList.innerHTML = '';
    
    accounts.forEach((account, index) => {
      const accountItem = document.createElement('div');
      accountItem.className = 'git-account-item';
      
      accountItem.innerHTML = `
        <div class="git-account-info">
          <div class="git-account-name">${account.displayName}</div>
        </div>
        <div class="git-account-actions">
          <button class="git-btn-small" onclick="gitPanel.selectAccount(${index}, 'global')">グローバル設定</button>
          <button class="git-btn-small" onclick="gitPanel.selectAccount(${index}, 'local')">ローカル設定</button>
          <button class="git-btn-small git-btn-danger" onclick="gitPanel.removeAccount(${index})">削除</button>
        </div>
      `;
      
      accountsList.appendChild(accountItem);
    });
    
    existingAccountsDiv.style.display = 'block';
  }

  showUserConfigForm() {
    document.getElementById('git-existing-accounts').style.display = 'none';
    document.getElementById('git-account-buttons').style.display = 'none';
    document.getElementById('git-account-form').style.display = 'block';
    
    const nameInput = document.getElementById('git-user-name');
    const emailInput = document.getElementById('git-user-email');
    
    if (nameInput) {
      nameInput.value = '';
      nameInput.disabled = false;
    }
    if (emailInput) {
      emailInput.value = '';
      emailInput.disabled = false;
    }
    
    const globalRadio = document.querySelector('input[name="git-config-scope"][value="global"]');
    if (globalRadio) {
      globalRadio.checked = true;
    }
    
    setTimeout(() => {
      if (nameInput) {
        nameInput.focus();
      }
    }, 100);
    
    this.setupInputContextMenus();
  }

  setupInputContextMenus() {
    const nameInput = document.getElementById('git-user-name');
    const emailInput = document.getElementById('git-user-email');
    const remoteUrlInput = document.getElementById('remote-url-input');
    
    if (nameInput) {
      nameInput.removeEventListener('contextmenu', this.nameInputContextHandler);
      this.nameInputContextHandler = (e) => {
        e.preventDefault();
        this.showInputContextMenu(e, nameInput);
      };
      nameInput.addEventListener('contextmenu', this.nameInputContextHandler);
    }
    
    if (emailInput) {
      emailInput.removeEventListener('contextmenu', this.emailInputContextHandler);
      this.emailInputContextHandler = (e) => {
        e.preventDefault();
        this.showInputContextMenu(e, emailInput);
      };
      emailInput.addEventListener('contextmenu', this.emailInputContextHandler);
    }
    
    if (remoteUrlInput) {
      remoteUrlInput.removeEventListener('contextmenu', this.remoteUrlContextHandler);
      this.remoteUrlContextHandler = (e) => {
        e.preventDefault();
        this.showInputContextMenu(e, remoteUrlInput);
      };
      remoteUrlInput.addEventListener('contextmenu', this.remoteUrlContextHandler);
    }
  }

  hideUserConfigForm() {
    document.getElementById('git-account-form').style.display = 'none';
    
    if (this.existingAccounts && this.existingAccounts.length > 0) {
      document.getElementById('git-existing-accounts').style.display = 'block';
    }
    document.getElementById('git-account-buttons').style.display = 'block';
  }

  async selectAccount(accountIndex, targetType) {
    if (!this.existingAccounts || !this.existingAccounts[accountIndex]) {
      window.showMessage('アカウント情報が見つかりません', 'error');
      return;
    }

    const account = this.existingAccounts[accountIndex];
    const targetRepoPath = targetType === 'local' ? this.currentRepository : null;

    try {
      const result = await window.electronAPI.git.selectAccount(account, targetType, targetRepoPath);
      if (result.success) {
        window.showMessage(result.message, 'success');
        this.uiManager.showMainView();
      } else {
        window.showMessage(`設定に失敗: ${result.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Account selection error:', error);
      window.showMessage('アカウント設定エラー', 'error');
    }
  }

  async removeAccount(accountIndex) {
    if (!this.existingAccounts || !this.existingAccounts[accountIndex]) {
      window.showMessage('アカウント情報が見つかりません', 'error');
      return;
    }

    const account = this.existingAccounts[accountIndex];
    const confirmMessage = `以下のアカウントを削除しますか？\n\n${account.displayName}`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const repoPath = account.type === 'local' ? account.repoPath : null;
      const result = await window.electronAPI.git.removeAccount(account.type, repoPath);
      
      if (result.success) {
        window.showMessage(result.message, 'success');
        await this.loadUserAccounts();
      } else {
        window.showMessage(`削除に失敗: ${result.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Account removal error:', error);
      window.showMessage('アカウント削除エラー', 'error');
    }
  }

  getCurrentFilePath() {
    if (window.currentFile && window.currentFile.path) {
      return window.currentFile.path;
    }
    
    if (window.getCurrentFile && typeof window.getCurrentFile === 'function') {
      const currentFile = window.getCurrentFile();
      if (currentFile && currentFile.path) {
        return currentFile.path;
      }
    }
    
    const fileNameElement = document.getElementById('file-name');
    if (fileNameElement && fileNameElement.textContent !== '無題のドキュメント') {
      if (this.currentRepository) {
        return this.currentRepository + '/' + fileNameElement.textContent;
      }
    }
    
    return null;
  }

  getDirectoryFromPath(filePath) {
    if (!filePath) return null;
    
    const lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
    if (lastSlash > 0) {
      return filePath.substring(0, lastSlash);
    }
    
    return filePath;
  }

  async selectRepositoryFolder() {
    try {
      const result = await window.electronAPI.git.selectDirectory();
      if (result.success && !result.canceled) {
        this.currentRepository = result.selectedPath;
        await this.updatePanelContent();
      }
    } catch (error) {
      console.error('Repository folder selection error:', error);
      window.showMessage('フォルダー選択エラー', 'error');
    }
  }

  async saveUserConfiguration() {
    const name = document.getElementById('git-user-name').value.trim();
    const email = document.getElementById('git-user-email').value.trim();
    const isGlobal = document.querySelector('input[name="git-config-scope"]:checked').value === 'global';

    if (!name || !email) {
      window.showMessage('名前とメールアドレスは必須です', 'warning');
      return;
    }

    try {
      const result = await window.electronAPI.git.setUserConfiguration(
        name, email, isGlobal, this.currentRepository
      );
      if (result.success) {
        window.showMessage(result.message, 'success');
        this.hideUserConfigForm();
        await this.loadUserAccounts();
      } else {
        window.showMessage(`設定に失敗: ${result.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('User configuration save error:', error);
      window.showMessage('設定エラー', 'error');
    }
  }

  async handleRemoteSetup() {
    const trimmedUrl = document.getElementById('remote-url-input').value.trim();
    
    if (!trimmedUrl) {
      window.showMessage('URLが入力されていません', 'warning');
      return;
    }

    const validUrlPattern = /^(https?:\/\/|git@)/;
    if (!validUrlPattern.test(trimmedUrl)) {
      window.showMessage('有効なGitリポジトリURLを入力してください', 'warning');
      return;
    }

    try {
      const result = await window.electronAPI.git.addRemoteRepository(
        trimmedUrl, 'origin', this.currentRepository
      );
      
      if (result.success) {
        window.showMessage(result.message, 'success');
        this.uiManager.showMainView();
        await this.refreshStatus();
      } else {
        window.showMessage(`リモート設定に失敗: ${result.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Remote setup error:', error);
      window.showMessage('リモート設定エラー', 'error');
    }
  }

  showInputContextMenu(e, inputElement) {
    const existingMenu = document.querySelector('.git-input-context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }

    const contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu git-input-context-menu visible';
    contextMenu.style.left = e.pageX + 'px';
    contextMenu.style.top = e.pageY + 'px';

    const hasSelection = inputElement.selectionStart !== inputElement.selectionEnd;
    
    const menuItems = [
      { label: 'コピー', action: 'copy', enabled: hasSelection },
      { label: '切り取り', action: 'cut', enabled: hasSelection },
      { label: '貼り付け', action: 'paste', enabled: true },
      { type: 'separator' },
      { label: 'すべて選択', action: 'selectAll', enabled: true }
    ];

    menuItems.forEach(item => {
      if (item.type === 'separator') {
        const separator = document.createElement('div');
        separator.className = 'context-menu-separator';
        contextMenu.appendChild(separator);
      } else {
        const menuItem = document.createElement('div');
        menuItem.className = 'context-menu-item';
        if (!item.enabled) {
          menuItem.classList.add('disabled');
        }
        menuItem.textContent = item.label;
        
        if (item.enabled) {
          menuItem.addEventListener('click', async () => {
            await this.handleInputContextMenuAction(item.action, inputElement);
            contextMenu.remove();
          });
        }
        
        contextMenu.appendChild(menuItem);
      }
    });

    document.body.appendChild(contextMenu);

    setTimeout(() => {
      const rect = contextMenu.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      let newLeft = parseFloat(contextMenu.style.left);
      let newTop = parseFloat(contextMenu.style.top);
      
      if (rect.right > windowWidth) {
        newLeft = Math.max(10, windowWidth - rect.width - 10);
      }
      if (newLeft < 10) {
        newLeft = 10;
      }
      if (rect.bottom > windowHeight) {
        newTop = Math.max(10, windowHeight - rect.height - 10);
      }
      if (newTop < 10) {
        newTop = 10;
      }
      
      contextMenu.style.left = newLeft + 'px';
      contextMenu.style.top = newTop + 'px';
    }, 0);

    setTimeout(() => {
      document.addEventListener('click', function closeMenu() {
        if (document.body.contains(contextMenu)) {
          contextMenu.remove();
        }
        document.removeEventListener('click', closeMenu);
      });
    }, 100);
  }

  async handleInputContextMenuAction(action, inputElement) {
    switch(action) {
      case 'copy':
        const selectedText = inputElement.value.substring(
          inputElement.selectionStart,
          inputElement.selectionEnd
        );
        if (selectedText) {
          try {
            await navigator.clipboard.writeText(selectedText);
          } catch {
            inputElement.focus();
            document.execCommand('copy');
          }
        }
        break;
        
      case 'cut':
        const textToCut = inputElement.value.substring(
          inputElement.selectionStart,
          inputElement.selectionEnd
        );
        if (textToCut) {
          try {
            await navigator.clipboard.writeText(textToCut);
            const start = inputElement.selectionStart;
            const end = inputElement.selectionEnd;
            const value = inputElement.value;
            inputElement.value = value.substring(0, start) + value.substring(end);
            inputElement.setSelectionRange(start, start);
          } catch {
            inputElement.focus();
            document.execCommand('cut');
          }
        }
        break;
        
      case 'paste':
        try {
          const text = await navigator.clipboard.readText();
          const start = inputElement.selectionStart;
          const end = inputElement.selectionEnd;
          const value = inputElement.value;
          inputElement.value = value.substring(0, start) + text + value.substring(end);
          inputElement.setSelectionRange(start + text.length, start + text.length);
        } catch {
          document.execCommand('paste');
        }
        break;
        
      case 'selectAll':
        inputElement.select();
        break;
    }
  }

  async stageFile(filePath, index) {
    try {
      const result = await window.electronAPI.git.stageFile(filePath, this.currentRepository);
      if (result.success) {
        await this.refreshStatus();
      } else {
        window.showMessage(`ステージングに失敗: ${result.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Stage file error:', error);
      window.showMessage('ステージングエラー', 'error');
    }
  }

  async unstageFile(filePath, index) {
    try {
      const result = await window.electronAPI.git.unstageFile(filePath, this.currentRepository);
      if (result.success) {
        await this.refreshStatus();
      } else {
        window.showMessage(`アンステージングに失敗: ${result.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Unstage file error:', error);
      window.showMessage('アンステージングエラー', 'error');
    }
  }

  async createNewBranch() {
    // ブランチ作成はダイアログで行うため、この関数は空にする
    if (window.gitDialogs && this.currentRepository) {
      window.gitDialogs.showBranchDialog(this.currentRepository);
    }
    return;
  }

  async switchToBranch(branchName) {
    if (!this.currentRepository) {
      window.showMessage('Gitリポジトリが初期化されていません', 'error');
      return;
    }

    try {
      const result = await window.electronAPI.git.switchBranch(branchName, this.currentRepository);
      if (result.success) {
        window.showMessage(result.message, 'success');
        await this.refreshStatus();
      } else {
        window.showMessage(`ブランチ切り替えに失敗: ${result.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Branch switch error:', error);
      window.showMessage('ブランチ切り替えエラー', 'error');
    }
  }
}

// グローバルに公開
window.GitPanel = GitPanel;

// メニューからのアクションを処理するためのラッパー関数
window.handleGitMenuAction = function(action, ...args) {
  if (window.gitPanel) {
    window.gitPanel.handleMenuAction(action, ...args);
  } else {
    console.error('GitPanel not initialized');
  }
};