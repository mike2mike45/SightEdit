import './styles.css';
import './git-styles.css';
import { createEditor, setupToolbar, getMarkdownContent, setMarkdownContent, generateTableOfContents } from './editor';
import { setupFileOperations } from './file-operations';
import { setupContextMenu, setupSourceEditorContextMenu } from './context-menu';
import { createHelpDialog, addHelpStyles } from './help-dialog';
import { createSearchReplaceDialog, addSearchReplaceStyles } from './search-replace';
import { GitPanel } from './git-panel';
import './git-ui-manager';
import './git-dialogs';

let editor = null;
let currentFile = {
  path: null,
  name: '無題のドキュメント',
  saved: true
};
let isModified = false;
let currentMode = 'wysiwyg';
let helpDialog = null;
let fileOps = null;
let searchReplaceDialog = null;
let gitPanel = null;
let updateStatus = null;

// 統計更新用のタイマー（デバウンス用）
let statsUpdateTimer = null;

document.addEventListener('DOMContentLoaded', async () => {
  // アプリケーション情報を取得してタイトルに設定
  if (window.electronAPI) {
    try {
      const appInfo = await window.electronAPI.getAppInfo();
      document.title = `SightEdit v${appInfo.version} - WYSIWYGマークダウンエディター`;
    } catch (error) {
      console.error('Failed to get app info:', error);
    }
  }
  
  // ヘルプダイアログの初期化
  addHelpStyles();
  helpDialog = createHelpDialog();
  
  // 検索・置換ダイアログの初期化
  addSearchReplaceStyles();
  searchReplaceDialog = createSearchReplaceDialog();
  
  // Git機能の初期化
  await initializeGitFeatures();
  
  // 更新機能の初期化
  await initializeUpdateFeatures();
  
  initializeEditor();
  setupEventListeners();
  setupMenuListeners();
  setupModeSwitch();
  setupKeyboardShortcuts();
  
  // 初期統計の更新
  setTimeout(performStatsUpdate, 100);
});

// Git機能の初期化
async function initializeGitFeatures() {
  try {
    // GitPanelを初期化
    gitPanel = new GitPanel();
    
    // ツールバーにGitボタンを追加
    addGitButtonToToolbar();
    
    // Gitパネルをグローバルに公開（デバッグ用）
    window.gitPanel = gitPanel;
    
  } catch (error) {
    console.error('Git features initialization failed:', error);
  }
}

// 更新機能の初期化
async function initializeUpdateFeatures() {
  try {
    if (!window.electronAPI || !window.electronAPI.update) {
      console.log('Update API not available');
      return;
    }
    
    // 更新状態リスナーを設定
    window.electronAPI.update.onUpdateStatus((statusData) => {
      handleUpdateStatus(statusData);
    });
    
    // 再起動準備リスナーを設定
    window.electronAPI.update.onPrepareForRestart(() => {
      handlePrepareForRestart();
    });
    
    // 初期状態を取得
    const statusResult = await window.electronAPI.update.getStatus();
    if (statusResult.success) {
      updateStatus = statusResult.status;
    }
    
    console.log('Update features initialized');
  } catch (error) {
    console.error('Update features initialization failed:', error);
  }
}

// 更新状態の処理
function handleUpdateStatus(statusData) {
  const { status, data } = statusData;
  
  switch (status) {
    case 'checking':
      console.log('Checking for updates...');
      break;
      
    case 'available':
      console.log('Update available:', data.version);
      showUpdateNotification(data);
      break;
      
    case 'not-available':
      console.log('No updates available');
      break;
      
    case 'downloading':
      console.log('Downloading update:', Math.round(data.percent) + '%');
      showDownloadProgress(data);
      break;
      
    case 'downloaded':
      console.log('Update downloaded:', data.version);
      showUpdateReadyNotification(data);
      break;
      
    case 'error':
      console.error('Update error:', data.message);
      break;
  }
}

// 更新通知を表示
function showUpdateNotification(updateInfo) {
  // すでに通知が表示されている場合は重複を避ける
  if (document.getElementById('update-notification')) {
    return;
  }
  
  const notification = document.createElement('div');
  notification.id = 'update-notification';
  notification.className = 'update-notification';
  notification.innerHTML = `
    <div class="update-notification-content">
      <div class="update-notification-icon">🆙</div>
      <div class="update-notification-text">
        <div class="update-notification-title">新しいバージョンが利用可能です</div>
        <div class="update-notification-version">v${updateInfo.version}</div>
      </div>
      <div class="update-notification-actions">
        <button id="update-download-btn" class="update-btn update-btn-primary">ダウンロード</button>
        <button id="update-dismiss-btn" class="update-btn">後で</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // アニメーション表示
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);
  
  // イベントリスナー
  document.getElementById('update-download-btn').addEventListener('click', async () => {
    await window.electronAPI.update.downloadUpdate();
    hideUpdateNotification();
  });
  
  document.getElementById('update-dismiss-btn').addEventListener('click', () => {
    hideUpdateNotification();
  });
  
  // 10秒後に自動で消す
  setTimeout(() => {
    if (document.getElementById('update-notification')) {
      hideUpdateNotification();
    }
  }, 10000);
}

// ダウンロード進行状況を表示
function showDownloadProgress(progressData) {
  let progressNotification = document.getElementById('download-progress-notification');
  
  if (!progressNotification) {
    progressNotification = document.createElement('div');
    progressNotification.id = 'download-progress-notification';
    progressNotification.className = 'update-notification progress-notification';
    progressNotification.innerHTML = `
      <div class="update-notification-content">
        <div class="update-notification-icon">⬇️</div>
        <div class="update-notification-text">
          <div class="update-notification-title">更新をダウンロード中...</div>
          <div class="progress-bar">
            <div id="progress-bar-fill" class="progress-bar-fill"></div>
          </div>
          <div id="progress-text" class="progress-text">0%</div>
        </div>
      </div>
    `;
    
    document.body.appendChild(progressNotification);
    
    setTimeout(() => {
      progressNotification.classList.add('show');
    }, 100);
  }
  
  // 進行状況を更新
  const progressFill = document.getElementById('progress-bar-fill');
  const progressText = document.getElementById('progress-text');
  
  if (progressFill && progressText) {
    const percent = Math.round(progressData.percent);
    progressFill.style.width = percent + '%';
    progressText.textContent = `${percent}%`;
  }
}

// 更新準備完了通知を表示
function showUpdateReadyNotification(updateInfo) {
  // ダウンロード進行状況通知を削除
  const progressNotification = document.getElementById('download-progress-notification');
  if (progressNotification) {
    progressNotification.remove();
  }
  
  // すでに通知が表示されている場合は重複を避ける
  if (document.getElementById('update-ready-notification')) {
    return;
  }
  
  const notification = document.createElement('div');
  notification.id = 'update-ready-notification';
  notification.className = 'update-notification ready-notification';
  notification.innerHTML = `
    <div class="update-notification-content">
      <div class="update-notification-icon">✅</div>
      <div class="update-notification-text">
        <div class="update-notification-title">更新の準備が完了しました</div>
        <div class="update-notification-version">v${updateInfo.version}</div>
      </div>
      <div class="update-notification-actions">
        <button id="update-install-btn" class="update-btn update-btn-primary">今すぐ再起動</button>
        <button id="update-later-btn" class="update-btn">後で</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // アニメーション表示
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);
  
  // イベントリスナー
  document.getElementById('update-install-btn').addEventListener('click', () => {
    installUpdateAfterSave();
  });
  
  document.getElementById('update-later-btn').addEventListener('click', () => {
    hideUpdateReadyNotification();
  });
}

// 再起動準備処理
function handlePrepareForRestart() {
  // ファイルが変更されている場合は保存を促す
  if (isModified) {
    const shouldSave = confirm('変更されたファイルを保存してから再起動しますか？');
    if (shouldSave && fileOps) {
      fileOps.saveFile().then(() => {
        window.electronAPI.update.readyForRestart();
      });
    } else {
      window.electronAPI.update.readyForRestart();
    }
  } else {
    window.electronAPI.update.readyForRestart();
  }
}

// 保存後に更新をインストール
async function installUpdateAfterSave() {
  try {
    // 変更がある場合は保存
    if (isModified && fileOps) {
      const saveResult = await fileOps.saveFile();
      if (!saveResult.success) {
        // 保存に失敗した場合
        const forceUpdate = confirm('保存に失敗しました。保存せずに更新を適用しますか？');
        if (!forceUpdate) {
          return;
        }
      }
    }
    
    // 更新をインストール
    await window.electronAPI.update.installUpdate();
  } catch (error) {
    console.error('Install update error:', error);
    window.showMessage('更新のインストールに失敗しました', 'error');
  }
}

// 通知を非表示
function hideUpdateNotification() {
  const notification = document.getElementById('update-notification');
  if (notification) {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }
}

function hideUpdateReadyNotification() {
  const notification = document.getElementById('update-ready-notification');
  if (notification) {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }
}

// ツールバーにGitボタンを追加
function addGitButtonToToolbar() {
  const toolbar = document.querySelector('.toolbar');
  if (!toolbar) return;
  
  // 新しいツールバーグループを作成
  const gitGroup = document.createElement('div');
  gitGroup.className = 'toolbar-group';
  
  // Gitボタンを作成
  const gitButton = document.createElement('button');
  gitButton.id = 'git-btn';
  gitButton.title = 'Git バージョン管理 (Ctrl+G)';
  gitButton.innerHTML = '🌿';
  gitButton.addEventListener('click', toggleGitPanel);
  
  gitGroup.appendChild(gitButton);
  
  // 最後のツールバーグループの前に挿入
  const lastGroup = toolbar.querySelector('.toolbar-group:last-child');
  if (lastGroup) {
    toolbar.insertBefore(gitGroup, lastGroup);
  } else {
    toolbar.appendChild(gitGroup);
  }
}

// Gitパネルの表示/非表示を切り替え
function toggleGitPanel() {
  if (!gitPanel) return;
  
  if (gitPanel.isOpen()) {
    gitPanel.hide();
  } else {
    // 現在のファイルパスを取得
    const currentFilePath = currentFile?.path || null;
    gitPanel.show(currentFilePath);
  }
}

// ファイル保存時にGitステータスを更新
function updateGitStatusOnFileSave() {
  if (gitPanel && gitPanel.isOpen()) {
    // 少し遅延させてからステータスを更新
    setTimeout(() => {
      gitPanel.refreshStatus();
    }, 500);
  }
}

function initializeEditor() {
  const editorElement = document.getElementById('wysiwyg-editor');
  editor = createEditor(editorElement);
  
  const commands = setupToolbar(editor);
  
  // ツールバーボタンのイベント設定
  document.getElementById('bold-btn').addEventListener('click', commands.bold);
  document.getElementById('italic-btn').addEventListener('click', commands.italic);
  document.getElementById('strike-btn').addEventListener('click', commands.strike);
  document.getElementById('clear-format-btn').addEventListener('click', commands.clearFormat);
  
  document.getElementById('h1-btn').addEventListener('click', commands.h1);
  document.getElementById('h2-btn').addEventListener('click', commands.h2);
  document.getElementById('h3-btn').addEventListener('click', commands.h3);
  document.getElementById('h4-btn').addEventListener('click', commands.h4);
  document.getElementById('h5-btn').addEventListener('click', commands.h5);
  document.getElementById('h6-btn').addEventListener('click', commands.h6);
  
  document.getElementById('ul-btn').addEventListener('click', commands.bulletList);
  document.getElementById('ol-btn').addEventListener('click', commands.orderedList);
  document.getElementById('task-btn').addEventListener('click', commands.taskList);
  document.getElementById('quote-btn').addEventListener('click', commands.blockquote);
  document.getElementById('hr-btn').addEventListener('click', commands.horizontalRule);
  
  document.getElementById('table-btn').addEventListener('click', commands.insertTable);
  document.getElementById('link-btn').addEventListener('click', async () => {
    await commands.addLink();
  });
  document.getElementById('image-btn').addEventListener('click', async () => {
    await commands.addImage();
  });
  document.getElementById('code-btn').addEventListener('click', commands.codeBlock);
  
  document.getElementById('undo-btn').addEventListener('click', commands.undo);
  document.getElementById('redo-btn').addEventListener('click', commands.redo);
  
  // 目次生成ボタン
  document.getElementById('toc-btn').addEventListener('click', () => {
    generateTableOfContents(editor);
  });
  
  // エディターの変更監視（デバウンス付き）
  editor.on('update', () => {
    setModified(true);
    updateStats(); // デバウンス機能付き
  });
  
  // コンテキストメニューの設定
  setupContextMenu(editor);
  setupSourceEditorContextMenu();
}

function setupEventListeners() {
  // ファイル操作を初期化（一度だけ）
  fileOps = setupFileOperations(editor, currentFile, isModified);
  
  document.getElementById('new-btn').addEventListener('click', async () => {
    const result = await fileOps.newFile();
    if (result.success) {
      currentFile = result.file;
      window.currentFile = currentFile; // グローバル変数更新
      setModified(false);
      performStatsUpdate(); // 即座に実行
    }
  });
  
  document.getElementById('open-btn').addEventListener('click', async () => {
    const result = await fileOps.openFile();
    if (result.success) {
      currentFile = result.file;
      window.currentFile = currentFile; // グローバル変数更新
      setModified(false);
      performStatsUpdate(); // 即座に実行
    }
  });
  
  document.getElementById('save-btn').addEventListener('click', async () => {
    const result = await fileOps.saveFile();
    if (result.success) {
      currentFile = result.file;
      window.currentFile = currentFile; // グローバル変数更新
      setModified(false);
      
      // Git状態を更新
      updateGitStatusOnFileSave();
    }
  });
}

// Git関連メニューハンドラー（修正版）
function setupGitMenuHandlers() {
  // Git パネル表示（このメニューのみパネルを表示）
  window.electronAPI.onMenuAction('menu-show-git', () => {
    toggleGitPanel();
  });

  // Git リポジトリ初期化（確認ダイアログを表示）
  window.electronAPI.onMenuAction('menu-git-init', async () => {
    if (!gitPanel) {
      window.showMessage('Git機能が初期化されていません', 'error');
      return;
    }
    
    await gitPanel.handleMenuAction('init-repository');
  });

  // Git リポジトリを開く
  window.electronAPI.onMenuAction('menu-git-open-repo', async () => {
    if (!gitPanel) {
      window.showMessage('Git機能が初期化されていません', 'error');
      return;
    }
    
    await gitPanel.handleMenuAction('open-repository');
  });

  // Git 全ての変更をステージング（確認ダイアログ付き）
  window.electronAPI.onMenuAction('menu-git-stage-all', async () => {
    if (!gitPanel) {
      window.showMessage('Git機能が初期化されていません', 'error');
      return;
    }
    
    await gitPanel.handleMenuAction('stage-all');
  });

  // コミット（コミット確認画面を表示）
  window.electronAPI.onMenuAction('menu-git-commit', async () => {
    if (!gitPanel) {
      window.showMessage('Git機能が初期化されていません', 'error');
      return;
    }
    
    await gitPanel.handleMenuAction('commit');
  });

  // プッシュ（確認ダイアログ付き）
  window.electronAPI.onMenuAction('menu-git-push', async () => {
    if (!gitPanel) {
      window.showMessage('Git機能が初期化されていません', 'error');
      return;
    }
    
    await gitPanel.handleMenuAction('push');
  });

  // プル（確認ダイアログ付き）
  window.electronAPI.onMenuAction('menu-git-pull', async () => {
    if (!gitPanel) {
      window.showMessage('Git機能が初期化されていません', 'error');
      return;
    }
    
    await gitPanel.handleMenuAction('pull');
  });

  // ブランチ作成（ブランチダイアログを表示）
  window.electronAPI.onMenuAction('menu-git-create-branch', async () => {
    if (!gitPanel) {
      window.showMessage('Git機能が初期化されていません', 'error');
      return;
    }
    
    await gitPanel.handleMenuAction('create-branch');
  });

  // ブランチ切り替え（ブランチダイアログを表示）
  window.electronAPI.onMenuAction('menu-git-switch-branch', async () => {
    if (!gitPanel) {
      window.showMessage('Git機能が初期化されていません', 'error');
      return;
    }
    
    await gitPanel.handleMenuAction('switch-branch');
  });

  // リモートリポジトリ設定（専用画面表示）
  window.electronAPI.onMenuAction('menu-git-setup-remote', async () => {
    if (!gitPanel) {
      window.showMessage('Git機能が初期化されていません', 'error');
      return;
    }
    
    if (!gitPanel.isOpen()) {
      const currentFilePath = currentFile?.path || null;
      await gitPanel.show(currentFilePath);
    }
    
    await gitPanel.handleMenuAction('setup-remote');
  });

  // Git設定（ユーザー設定画面表示）
  window.electronAPI.onMenuAction('menu-git-config', async () => {
    if (!gitPanel) {
      window.showMessage('Git機能が初期化されていません', 'error');
      return;
    }
    
    if (!gitPanel.isOpen()) {
      const currentFilePath = currentFile?.path || null;
      await gitPanel.show(currentFilePath);
    }
    
    await gitPanel.handleMenuAction('user-config');
  });

  // コミット履歴表示（専用ダイアログ）
  window.electronAPI.onMenuAction('menu-git-show-history', async () => {
    console.log('=== Menu git show history triggered ===');
    
    if (!window.gitDialogs) {
      console.error('GitDialogs not available');
      window.showMessage('Git機能が初期化されていません', 'error');
      return;
    }
    
    // 現在のリポジトリパスを確認
    const currentFilePath = currentFile?.path || null;
    console.log('Current file path:', currentFilePath);
    
    if (currentFilePath) {
      try {
        console.log('Finding repository root...');
        const result = await window.electronAPI.git.findRepositoryRoot(currentFilePath);
        console.log('Repository root result:', result);
        
        if (result.success && result.repoRoot) {
          console.log('Found repository:', result.repoRoot);
          await window.gitDialogs.showCommitHistoryDialog(result.repoRoot);
        } else {
          console.log('No repository found, checking if gitPanel has repository');
          if (gitPanel && gitPanel.currentRepository) {
            console.log('Using gitPanel repository:', gitPanel.currentRepository);
            await window.gitDialogs.showCommitHistoryDialog(gitPanel.currentRepository);
          } else {
            window.showMessage('Gitリポジトリが見つかりません。先にリポジトリを初期化してください。', 'warning');
          }
        }
      } catch (error) {
        console.error('Error finding repository:', error);
        window.showMessage('リポジトリの検索に失敗しました', 'error');
      }
    } else {
      console.log('No current file, checking gitPanel');
      if (gitPanel && gitPanel.currentRepository) {
        console.log('Using gitPanel repository:', gitPanel.currentRepository);
        await window.gitDialogs.showCommitHistoryDialog(gitPanel.currentRepository);
      } else {
        window.showMessage('ファイルを開くかリポジトリを初期化してください', 'warning');
      }
    }
  });
}

// 更新関連メニューハンドラー
function setupUpdateMenuHandlers() {
  // 手動更新チェック
  window.electronAPI.onMenuAction('menu-check-updates', async () => {
    try {
      if (!window.electronAPI.update) {
        window.showMessage('更新機能が利用できません', 'error');
        return;
      }
      
      console.log('Manual update check triggered');
      window.showMessage('更新をチェックしています...', 'info');
      
      const result = await window.electronAPI.update.checkForUpdates();
      console.log('Update check result:', result);
      
      if (!result.success) {
        if (result.reason === 'development_mode') {
          window.showMessage('開発モードでは更新機能は無効です', 'warning');
        } else if (result.reason === 'already_checking') {
          window.showMessage('既に更新をチェック中です', 'warning');
        } else {
          window.showMessage('更新チェックに失敗しました', 'error');
        }
      }
    } catch (error) {
      console.error('Update check error:', error);
      window.showMessage('更新チェックエラー', 'error');
    }
  });
}

function setupMenuListeners() {
  if (!window.electronAPI) return;
  
  // 起動時のファイルオープン処理
  window.electronAPI.onMenuAction('open-file-from-args', (fileData) => {
    console.log('Opening file from args:', fileData.fileName);
    if (fileData && fileData.content) {
      setMarkdownContent(editor, fileData.content);
      currentFile = {
        path: fileData.filePath,
        name: fileData.fileName,
        saved: true
      };
      window.currentFile = currentFile; // グローバル変数更新
      setModified(false);
      performStatsUpdate(); // ファイル読み込み後に統計更新
      window.showMessage(`ファイルを開きました: ${fileData.fileName}`, 'success');
    }
  });
  
  // ファイルメニュー
  window.electronAPI.onMenuAction('menu-new-file', async () => {
    document.getElementById('new-btn').click();
  });
  
  window.electronAPI.onMenuAction('menu-open-file', () => {
    document.getElementById('open-btn').click();
  });
  
  window.electronAPI.onMenuAction('menu-save-file', async () => {
    const result = await fileOps.saveFile();
    if (result.success) {
      currentFile = result.file;
      window.currentFile = currentFile; // グローバル変数更新
      setModified(false);
      updateGitStatusOnFileSave();
    }
  });
  
  window.electronAPI.onMenuAction('menu-save-as-file', async () => {
    const result = await fileOps.saveAsFile();
    if (result.success) {
      currentFile = result.file;
      window.currentFile = currentFile; // グローバル変数更新
      setModified(false);
      updateGitStatusOnFileSave();
    }
  });
  
  window.electronAPI.onMenuAction('menu-export-pdf', async () => {
    await fileOps.exportPDF();
  });
  
  // 編集メニュー - 検索・置換
  window.electronAPI.onMenuAction('menu-search-replace', () => {
    console.log('Search replace menu clicked');
    if (searchReplaceDialog) {
      if (currentMode === 'source') {
        const sourceEditor = document.getElementById('source-editor');
        if (sourceEditor) {
          searchReplaceDialog.show(sourceEditor, false);
        }
      } else if (currentMode === 'wysiwyg') {
        if (editor) {
          searchReplaceDialog.show(editor, true);
        }
      }
    } else {
      console.error('Search replace dialog is not initialized');
    }
  });
  
  // 書式メニュー
  window.electronAPI.onMenuAction('menu-format-bold', () => {
    document.getElementById('bold-btn').click();
  });
  
  window.electronAPI.onMenuAction('menu-format-italic', () => {
    document.getElementById('italic-btn').click();
  });
  
  window.electronAPI.onMenuAction('menu-format-strikethrough', () => {
    document.getElementById('strike-btn').click();
  });
  
  window.electronAPI.onMenuAction('menu-format-clear', () => {
    document.getElementById('clear-format-btn').click();
  });
  
  window.electronAPI.onMenuAction('menu-insert-heading', (level) => {
    const btnId = `h${level}-btn`;
    const btn = document.getElementById(btnId);
    if (btn) btn.click();
  });
  
  // 挿入メニュー
  window.electronAPI.onMenuAction('menu-insert-link', () => {
    document.getElementById('link-btn').click();
  });
  
  window.electronAPI.onMenuAction('menu-insert-image', () => {
    document.getElementById('image-btn').click();
  });
  
  window.electronAPI.onMenuAction('menu-insert-table', () => {
    document.getElementById('table-btn').click();
  });
  
  window.electronAPI.onMenuAction('menu-insert-horizontal-rule', () => {
    document.getElementById('hr-btn').click();
  });
  
  window.electronAPI.onMenuAction('menu-insert-code-block', () => {
    document.getElementById('code-btn').click();
  });
  
  // 目次生成メニュー
  window.electronAPI.onMenuAction('menu-insert-toc', () => {
    generateTableOfContents(editor);
  });
  
  // 表示メニュー
  window.electronAPI.onMenuAction('menu-switch-mode', (mode) => {
    if (mode === 'wysiwyg') {
      document.getElementById('wysiwyg-btn').click();
    } else {
      document.getElementById('source-btn').click();
    }
  });
  
  window.electronAPI.onMenuAction('menu-set-theme', (theme) => {
    applyTheme(theme);
    window.electronAPI.changeTheme(theme);
  });
  
  // 初期テーマ設定
  window.electronAPI.onMenuAction('set-initial-theme', (theme) => {
    applyTheme(theme);
  });
  
  // ヘルプメニュー
  window.electronAPI.onMenuAction('menu-show-help', () => {
    console.log('Help menu clicked');
    if (helpDialog) {
      helpDialog.show();
    } else {
      console.error('Help dialog is not initialized');
    }
  });
  
  window.electronAPI.onMenuAction('menu-show-about', () => {
    console.log('About menu clicked');
    if (helpDialog) {
      helpDialog.show();
      // バージョン情報タブを表示
      setTimeout(() => {
        const aboutTab = document.querySelector('[data-tab="about"]');
        if (aboutTab) {
          aboutTab.click();
        }
      }, 100);
    } else {
      console.error('Help dialog is not initialized');
    }
  });
  
  // Git関連メニュー（修正版）
  setupGitMenuHandlers();
  
  // 更新関連メニュー
  setupUpdateMenuHandlers();
  
  // ウィンドウを閉じる前の確認
  window.electronAPI.onMenuAction('before-close', async () => {
    if (isModified) {
      const result = confirm('変更が保存されていません。保存しますか？\n\n「OK」: 保存してから終了\n「キャンセル」: 保存せずに終了');
      
      if (result) {
        // 保存してから終了
        const saveResult = await fileOps.saveFile();
        
        if (saveResult.success) {
          window.electronAPI.confirmClose();
        }
        // 保存に失敗した場合は終了しない
      } else {
        // 保存せずに終了するか確認
        const reallyClose = confirm('本当に保存せずに終了しますか？');
        if (reallyClose) {
          window.electronAPI.confirmClose();
        }
      }
    } else {
      // 変更がない場合はそのまま終了
      window.electronAPI.confirmClose();
    }
  });
}

function setupModeSwitch() {
  const wysiwygBtn = document.getElementById('wysiwyg-btn');
  const sourceBtn = document.getElementById('source-btn');
  const wysiwygEditor = document.getElementById('wysiwyg-editor');
  const sourceEditor = document.getElementById('source-editor');
  
  wysiwygBtn.addEventListener('click', () => {
    if (currentMode === 'source') {
      // ソースからWYSIWYGへ
      const markdown = sourceEditor.value;
      setMarkdownContent(editor, markdown);
      
      wysiwygEditor.style.display = 'block';
      sourceEditor.style.display = 'none';
      wysiwygBtn.classList.add('active');
      sourceBtn.classList.remove('active');
      currentMode = 'wysiwyg';
      
      // モード切り替え時のみ即座に更新
      setTimeout(performStatsUpdate, 50);
    }
  });
  
  sourceBtn.addEventListener('click', () => {
    if (currentMode === 'wysiwyg') {
      // WYSIWYGからソースへ
      const markdown = getMarkdownContent(editor);
      sourceEditor.value = markdown;
      
      wysiwygEditor.style.display = 'none';
      sourceEditor.style.display = 'block';
      sourceBtn.classList.add('active');
      wysiwygBtn.classList.remove('active');
      currentMode = 'source';
      
      // モード切り替え時のみ即座に更新
      setTimeout(performStatsUpdate, 50);
    }
  });
  
  // ソースエディターの変更監視（デバウンス付き）
  sourceEditor.addEventListener('input', () => {
    setModified(true);
    updateStats(); // デバウンス機能付き
  });
}

function setModified(modified) {
  isModified = modified;
  updateFilenameDisplay();
  
  // グローバル変数も更新
  window.currentFile = currentFile;
  
  // ファイル操作の状態を更新
  if (fileOps) {
    fileOps.updateState(currentFile, isModified);
  }
}

function updateFilenameDisplay() {
  const fileNameElement = document.getElementById('file-name');
  const fileStatusElement = document.getElementById('file-status');
  
  fileNameElement.textContent = currentFile.name;
  
  if (isModified) {
    fileStatusElement.textContent = '未保存';
    fileStatusElement.classList.remove('saved');
    fileStatusElement.classList.add('unsaved');
  } else {
    fileStatusElement.textContent = '保存済み';
    fileStatusElement.classList.remove('unsaved');
    fileStatusElement.classList.add('saved');
  }
}

// デバウンス機能付き統計更新
function updateStats() {
  // 既存のタイマーをクリア（デバウンス）
  if (statsUpdateTimer) {
    clearTimeout(statsUpdateTimer);
  }
  
  // 300ms後に実行（連続入力時は最後の1回のみ実行）
  statsUpdateTimer = setTimeout(() => {
    performStatsUpdate();
  }, 300);
}

// 実際の統計更新処理
function performStatsUpdate() {
  let text = '';
  
  try {
    if (currentMode === 'wysiwyg') {
      if (editor && editor.getText) {
        text = editor.getText();
      }
    } else {
      const sourceEditor = document.getElementById('source-editor');
      if (sourceEditor) {
        text = sourceEditor.value;
      }
    }
    
    // シンプルな計算（パフォーマンス重視）
    const chars = text.length;
    
    // 単語数は簡易計算（英語：スペース区切り、日本語：文字数/2の概算）
    let words = 0;
    if (text.trim()) {
      const englishWords = (text.match(/[a-zA-Z0-9]+/g) || []).length;
      const nonEnglishChars = text.replace(/[a-zA-Z0-9\s\n\r\t]/g, '').length;
      words = englishWords + Math.ceil(nonEnglishChars / 2);
    }
    
    // UI更新
    const wordCountElement = document.getElementById('word-count');
    const charCountElement = document.getElementById('char-count');
    
    if (wordCountElement) {
      wordCountElement.textContent = `${words} words`;
    }
    if (charCountElement) {
      charCountElement.textContent = `${chars} chars`;
    }
  } catch (error) {
    console.error('Error updating stats:', error);
  }
}

function applyTheme(theme) {
  document.body.classList.remove('light-theme', 'dark-theme');
  document.body.classList.add(theme + '-theme');
}

// メッセージ表示
window.showMessage = function(message, type = 'info') {
  const container = document.getElementById('message-container');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;
  messageDiv.textContent = message;
  
  container.appendChild(messageDiv);
  
  setTimeout(() => {
    messageDiv.remove();
  }, 3000);
};

// 現在のファイル情報をグローバルに公開
window.getCurrentFile = function() {
  return currentFile;
};

// 現在のファイル情報をグローバル変数としても公開
window.currentFile = currentFile;

// コミットからファイルを読み込む機能
window.loadFileContent = function(fileData) {
  if (fileData && fileData.content) {
    if (currentMode === 'wysiwyg') {
      setMarkdownContent(editor, fileData.content);
    } else {
      const sourceEditor = document.getElementById('source-editor');
      if (sourceEditor) {
        sourceEditor.value = fileData.content;
      }
    }
    
    currentFile = {
      path: fileData.filePath,
      name: fileData.fileName,
      saved: true
    };
    window.currentFile = currentFile;
    setModified(false);
    performStatsUpdate();
  }
};

// キーボードショートカットの設定
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl+F または Cmd+F: 検索・置換
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      // 検索ダイアログが開いている場合は、ダイアログ内の処理を優先
      if (searchReplaceDialog && searchReplaceDialog.isVisible()) {
        return;
      }
      
      e.preventDefault();
      if (currentMode === 'source') {
        const sourceEditor = document.getElementById('source-editor');
        if (sourceEditor && searchReplaceDialog) {
          searchReplaceDialog.show(sourceEditor, false);
        }
      } else if (currentMode === 'wysiwyg') {
        if (editor && searchReplaceDialog) {
          searchReplaceDialog.show(editor, true);
        }
      }
    }
    
    // Ctrl+G または Cmd+G: Git パネル表示
    if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
      e.preventDefault();
      toggleGitPanel();
    }
    
    // Ctrl+Shift+T または Cmd+Shift+T: 目次生成
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
      e.preventDefault();
      generateTableOfContents(editor);
    }
    
    // Escape: 検索・置換ダイアログを閉じる
    if (e.key === 'Escape') {
      if (searchReplaceDialog && searchReplaceDialog.isVisible()) {
        searchReplaceDialog.hide();
      }
    }
  });
}

// 更新通知のスタイルを追加
const updateStyles = document.createElement('style');
updateStyles.textContent = `
  .update-notification {
    position: fixed;
    top: 80px;
    right: 20px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    min-width: 300px;
    max-width: 400px;
    transform: translateX(100%);
    transition: transform 0.3s ease;
  }

  .update-notification.show {
    transform: translateX(0);
  }

  .update-notification-content {
    display: flex;
    align-items: center;
    padding: 16px;
    gap: 12px;
  }

  .update-notification-icon {
    font-size: 24px;
    flex-shrink: 0;
  }

  .update-notification-text {
    flex: 1;
  }

  .update-notification-title {
    font-weight: 600;
    font-size: 14px;
    margin-bottom: 4px;
  }

  .update-notification-version {
    font-size: 12px;
    color: #666;
  }

  .update-notification-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }

  .update-btn {
    padding: 6px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
  }

  .update-btn:hover {
    background: #f8f9fa;
  }

  .update-btn-primary {
    background: #007bff !important;
    color: white !important;
    border-color: #007bff !important;
  }

  .update-btn-primary:hover {
    background: #0056b3 !important;
  }

  .progress-notification {
    background: #e3f2fd !important;
    border-color: #2196f3 !important;
  }

  .progress-bar {
    width: 100%;
    height: 4px;
    background: #e0e0e0;
    border-radius: 2px;
    margin: 8px 0 4px 0;
    overflow: hidden;
  }

  .progress-bar-fill {
    height: 100%;
    background: #2196f3;
    transition: width 0.3s ease;
  }

  .progress-text {
    font-size: 11px;
    color: #666;
    text-align: center;
  }

  .ready-notification {
    background: #e8f5e8 !important;
    border-color: #4caf50 !important;
  }

  /* ダークテーマ対応 */
  .dark-theme .update-notification {
    background: #2d2d2d;
    border-color: #404040;
    color: #fff;
  }

  .dark-theme .update-notification-version {
    color: #ccc;
  }

  .dark-theme .update-btn {
    background: #404040;
    border-color: #555;
    color: #fff;
  }

  .dark-theme .update-btn:hover {
    background: #555;
  }

  .dark-theme .progress-notification {
    background: #1a2b3d !important;
    border-color: #2196f3 !important;
  }

  .dark-theme .ready-notification {
    background: #1a2b1a !important;
    border-color: #4caf50 !important;
  }

  .dark-theme .progress-text {
    color: #ccc;
  }
`;
document.head.appendChild(updateStyles);