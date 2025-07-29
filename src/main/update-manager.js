import electronUpdater from 'electron-updater';
import { dialog, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const { autoUpdater } = electronUpdater;

// ESMでの__dirname代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class UpdateManager {
  constructor() {
    this.mainWindow = null;
    this.updateAvailable = false;
    this.updateDownloaded = false;
    this.isChecking = false;
    this.setupAutoUpdater();
  }

  // メインウィンドウを設定
  setMainWindow(window) {
    this.mainWindow = window;
  }

  // 自動更新の設定
  setupAutoUpdater() {
    // 開発モードでは無効化
    if (process.env.NODE_ENV === 'development' || !process.env.npm_package_version) {
      console.log('Auto-updater is disabled in development mode');
      return;
    }

    // 更新サーバーの設定
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    // イベントリスナーの設定
    autoUpdater.on('checking-for-update', () => {
      console.log('Checking for update...');
      this.isChecking = true;
      this.sendStatusToWindow('checking');
    });

    autoUpdater.on('update-available', (info) => {
      console.log('Update available:', info);
      this.updateAvailable = true;
      this.isChecking = false;
      this.sendStatusToWindow('available', info);
      this.showUpdateAvailableDialog(info);
    });

    autoUpdater.on('update-not-available', (info) => {
      console.log('Update not available:', info);
      this.updateAvailable = false;
      this.isChecking = false;
      this.sendStatusToWindow('not-available', info);
    });

    autoUpdater.on('error', (error) => {
      console.error('Update error:', error);
      this.isChecking = false;
      this.sendStatusToWindow('error', error);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      const logMessage = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}%`;
      console.log(logMessage);
      this.sendStatusToWindow('downloading', progressObj);
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded:', info);
      this.updateDownloaded = true;
      this.sendStatusToWindow('downloaded', info);
      this.showUpdateDownloadedDialog(info);
    });
  }

  // ウィンドウに状態を送信
  sendStatusToWindow(status, data = null) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('update-status', { status, data });
    }
  }

  // 更新をチェック（手動）
  async checkForUpdates() {
    if (process.env.NODE_ENV === 'development') {
      console.log('Update check skipped in development mode');
      this.showDevModeDialog();
      return { success: false, reason: 'development_mode' };
    }

    if (this.isChecking) {
      return { success: false, reason: 'already_checking' };
    }

    try {
      console.log('Manually checking for updates...');
      const result = await autoUpdater.checkForUpdates();
      
      // 更新がない場合の処理
      if (!this.updateAvailable) {
        this.showNoUpdateDialog();
      }
      
      return { success: true, result };
    } catch (error) {
      console.error('Error checking for updates:', error);
      this.showUpdateErrorDialog(error);
      return { success: false, error: error.message };
    }
  }

  // 自動で更新をチェック（起動時）
  async checkForUpdatesAutomatically() {
    if (process.env.NODE_ENV === 'development') {
      console.log('Auto update check skipped in development mode');
      return;
    }

    // 起動から30秒後にチェック
    setTimeout(async () => {
      try {
        console.log('Automatically checking for updates...');
        await autoUpdater.checkForUpdates();
      } catch (error) {
        console.error('Auto update check error:', error);
      }
    }, 30000);
  }

  // 更新状態を取得
  getUpdateStatus() {
    const result = {
      updateAvailable: this.updateAvailable,
      updateDownloaded: this.updateDownloaded,
      isChecking: this.isChecking,
      version: process.env.npm_package_version || 'unknown'
    };
    
    console.log('Update status:', result);
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
        shell.openExternal(`https://github.com/mike2mike45/SightEdit/releases/tag/v${info.version}`);
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

export default UpdateManager;