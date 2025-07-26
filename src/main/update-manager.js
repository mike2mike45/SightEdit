const { autoUpdater } = require('electron-updater');
const { dialog, BrowserWindow } = require('electron');
const path = require('path');

class UpdateManager {
  constructor() {
    this.mainWindow = null;
    this.updateAvailable = false;
    this.updateDownloaded = false;
    this.isChecking = false;
    
    this.setupAutoUpdater();
    this.setupEventListeners();
  }

  setMainWindow(window) {
    this.mainWindow = window;
  }

  setupAutoUpdater() {
    // 開発モードかどうかチェック
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode - updater disabled');
      return;
    }

    // 自動更新の設定
    autoUpdater.autoDownload = false; // 手動でダウンロード開始
    autoUpdater.autoInstallOnAppQuit = true; // 終了時に自動インストール
    autoUpdater.checkForUpdatesAndNotify = false; // 自動通知を無効
    
    // ログを有効化（開発時のデバッグ用）
    autoUpdater.logger = {
      info: (message) => console.log('UpdateManager:', message),
      warn: (message) => console.warn('UpdateManager:', message),
      error: (message) => console.error('UpdateManager:', message)
    };
  }

  setupEventListeners() {
    // 更新チェック開始
    autoUpdater.on('checking-for-update', () => {
      console.log('Checking for update...');
      this.isChecking = true;
      this.sendStatusToRenderer('checking');
    });

    // 更新が利用可能
    autoUpdater.on('update-available', (info) => {
      console.log('Update available:', info.version);
      this.updateAvailable = true;
      this.isChecking = false;
      this.sendStatusToRenderer('available', info);
      this.showUpdateAvailableDialog(info);
    });

    // 更新が利用不可
    autoUpdater.on('update-not-available', (info) => {
      console.log('Update not available');
      this.isChecking = false;
      this.sendStatusToRenderer('not-available', info);
    });

    // 更新エラー
    autoUpdater.on('error', (err) => {
      console.error('Update error:', err);
      this.isChecking = false;
      this.sendStatusToRenderer('error', { message: err.message });
    });

    // ダウンロード進行状況
    autoUpdater.on('download-progress', (progressObj) => {
      const logMessage = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`;
      console.log(logMessage);
      this.sendStatusToRenderer('downloading', progressObj);
    });

    // ダウンロード完了
    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded:', info.version);
      this.updateDownloaded = true;
      this.sendStatusToRenderer('downloaded', info);
      this.showUpdateDownloadedDialog(info);
    });
  }

  // レンダラープロセスに状態を送信
  sendStatusToRenderer(status, data = null) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('update-status', { status, data });
    }
  }

  // 更新チェックを実行
  async checkForUpdates(manual = false) {
    if (process.env.NODE_ENV === 'development') {
      if (manual) {
        this.showDevModeDialog();
      }
      return { success: false, reason: 'development_mode' };
    }

    if (this.isChecking) {
      return { success: false, reason: 'already_checking' };
    }

    try {
      console.log('Starting update check...');
      const result = await autoUpdater.checkForUpdates();
      return { success: true, result };
    } catch (error) {
      console.error('Error checking for updates:', error);
      if (manual) {
        this.showUpdateErrorDialog(error);
      }
      return { success: false, error: error.message };
    }
  }

  // 自動更新チェック（起動時）
  async checkForUpdatesAutomatically() {
    // アプリ起動から3秒後に自動チェック
    setTimeout(() => {
      this.checkForUpdates(false);
    }, 3000);
  }

  // 手動更新チェック
  async checkForUpdatesManually() {
    const result = await this.checkForUpdates(true);
    
    if (result.success && !this.updateAvailable) {
      // 手動チェックで更新がない場合のみ通知
      setTimeout(() => {
        if (!this.updateAvailable) {
          this.showNoUpdateDialog();
        }
      }, 2000);
    }
    
    return result;
  }

  // 更新をダウンロード
  async downloadUpdate() {
    if (!this.updateAvailable || this.updateDownloaded) {
      return { success: false, reason: 'no_update_available' };
    }

    try {
      console.log('Starting update download...');
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error) {
      console.error('Error downloading update:', error);
      this.showUpdateErrorDialog(error);
      return { success: false, error: error.message };
    }
  }

  // 更新をインストール（再起動）
  installUpdate() {
    if (!this.updateDownloaded) {
      return { success: false, reason: 'no_update_downloaded' };
    }

    try {
      console.log('Installing update and restarting...');
      autoUpdater.quitAndInstall();
      return { success: true };
    } catch (error) {
      console.error('Error installing update:', error);
      return { success: false, error: error.message };
    }
  }

  // 更新利用可能ダイアログ
  showUpdateAvailableDialog(info) {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    const choice = dialog.showMessageBoxSync(this.mainWindow, {
      type: 'info',
      buttons: ['今すぐダウンロード', '後で', '詳細を見る'],
      defaultId: 0,
      cancelId: 1,
      title: '更新が利用可能です',
      message: `SightEdit v${info.version} が利用可能です`,
      detail: `現在のバージョン: v${process.env.npm_package_version || 'unknown'}\n新しいバージョン: v${info.version}\n\n今すぐダウンロードしますか？\n\n※ダウンロード後、アプリの再起動が必要です。`,
      icon: path.join(__dirname, '../../assets/icon.ico')
    });

    switch (choice) {
      case 0: // 今すぐダウンロード
        this.downloadUpdate();
        break;
      case 1: // 後で
        break;
      case 2: // 詳細を見る
        require('electron').shell.openExternal(`https://github.com/mike2mike45/SightEdit/releases/tag/v${info.version}`);
        break;
    }
  }

  // ダウンロード完了ダイアログ
  showUpdateDownloadedDialog(info) {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    const choice = dialog.showMessageBoxSync(this.mainWindow, {
      type: 'info',
      buttons: ['今すぐ再起動', '後で再起動'],
      defaultId: 0,
      cancelId: 1,
      title: '更新のダウンロードが完了しました',
      message: `SightEdit v${info.version} のダウンロードが完了しました`,
      detail: '更新を適用するには再起動が必要です。\n\n※開いているファイルは保存されます。',
      icon: path.join(__dirname, '../../assets/icon.ico')
    });

    if (choice === 0) {
      // 保存確認を経て再起動
      this.mainWindow.webContents.send('prepare-for-restart');
      setTimeout(() => {
        this.installUpdate();
      }, 1000);
    }
  }

  // 更新なしダイアログ（手動チェック時のみ）
  showNoUpdateDialog() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    dialog.showMessageBoxSync(this.mainWindow, {
      type: 'info',
      buttons: ['OK'],
      title: '更新チェック完了',
      message: '最新バージョンを使用中です',
      detail: `現在のバージョン: v${process.env.npm_package_version || 'unknown'}\n\n新しい更新はありません。`,
      icon: path.join(__dirname, '../../assets/icon.ico')
    });
  }

  // エラーダイアログ
  showUpdateErrorDialog(error) {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    dialog.showMessageBoxSync(this.mainWindow, {
      type: 'error',
      buttons: ['OK'],
      title: '更新エラー',
      message: '更新の確認に失敗しました',
      detail: `エラー詳細: ${error.message}\n\nネットワーク接続を確認してから、しばらく後に再試行してください。`,
      icon: path.join(__dirname, '../../assets/icon.ico')
    });
  }

  // 開発モードダイアログ
  showDevModeDialog() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    dialog.showMessageBoxSync(this.mainWindow, {
      type: 'info',
      buttons: ['OK'],
      title: '開発モード',
      message: '更新機能は無効です',
      detail: '開発モードでは自動更新機能は無効になっています。\n\nリリース版では正常に動作します。',
      icon: path.join(__dirname, '../../assets/icon.ico')
    });
  }

  // 状態取得
  getStatus() {
    return {
      updateAvailable: this.updateAvailable,
      updateDownloaded: this.updateDownloaded,
      isChecking: this.isChecking,
      version: process.env.npm_package_version || 'unknown'
    };
  }
}

module.exports = UpdateManager;