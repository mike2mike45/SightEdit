using System;
using System.Configuration;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;
using System.Drawing;
using System.Windows.Forms;

namespace SightEditRelay
{
    class Program
    {
        private static HttpListener _listener;
        private static string _filePath;
        private static System.Threading.Timer _shutdownTimer;
        private static NotifyIcon _trayIcon;
        private static readonly string LogPath = Path.Combine(Path.GetTempPath(), "SightEditRelay.log");

        static void Main(string[] args)
        {
            try
            {
                // 引数チェック - ファイルパス指定は省略可能
                if (args.Length > 0)
                {
                    _filePath = args[0];
                    
                    // ファイル存在チェック
                    if (!File.Exists(_filePath))
                    {
                        ShowError($"ファイルが見つかりません: {_filePath}");
                        return;
                    }
                    LogMessage($"SightEdit Relay 起動: {_filePath}");
                }
                else
                {
                    // ファイルパス指定がない場合は空のエディタを開く
                    _filePath = null;
                    LogMessage("SightEdit Relay 起動: 新規ファイル作成モード");
                }

                // システムトレイアイコン作成
                CreateTrayIcon();

                // HTTPサーバー起動
                StartHttpServer();

                // ブラウザでSightEdit拡張機能を開く
                OpenBrowser();

                // 自動終了タイマー（60秒）
                _shutdownTimer = new System.Threading.Timer(ShutdownCallback, null, 60000, Timeout.Infinite);

                LogMessage("HTTPサーバー開始、60秒後に自動終了");

                // アプリケーション継続
                Application.Run();
            }
            catch (Exception ex)
            {
                LogMessage($"エラー: {ex.Message}");
                ShowError($"エラーが発生しました: {ex.Message}");
            }
        }

        private static void CreateTrayIcon()
        {
            try
            {
                _trayIcon = new NotifyIcon();
                _trayIcon.Icon = SystemIcons.Application;
                _trayIcon.Text = "SightEdit Relay - 動作中";
                _trayIcon.Visible = true;

                // コンテキストメニュー
                var contextMenu = new ContextMenuStrip();
                contextMenu.Items.Add("終了", null, (s, e) => {
                    Cleanup();
                    Application.Exit();
                });
                _trayIcon.ContextMenuStrip = contextMenu;

                LogMessage("システムトレイアイコンを作成");
            }
            catch (Exception ex)
            {
                LogMessage($"トレイアイコン作成エラー: {ex.Message}");
            }
        }

        private static void StartHttpServer()
        {
            int port = 8080;
            
            // ポート8080から8090まで試行
            for (int i = 0; i < 10; i++)
            {
                try
                {
                    _listener = new HttpListener();
                    _listener.Prefixes.Add($"http://127.0.0.1:{port}/");
                    _listener.Start();
                    
                    LogMessage($"HTTPサーバー開始: ポート {port}");
                    break;
                }
                catch (HttpListenerException)
                {
                    port++;
                    if (i == 9)
                    {
                        throw new Exception("利用可能なポートが見つかりません");
                    }
                }
            }

            // 非同期でリクエスト処理
            _listener.BeginGetContext(HandleRequest, null);
        }

        private static void HandleRequest(IAsyncResult result)
        {
            try
            {
                if (_listener == null || !_listener.IsListening)
                    return;

                var context = _listener.EndGetContext(result);
                var request = context.Request;
                var response = context.Response;

                LogMessage($"リクエスト受信: {request.Url}");

                // CORSヘッダーを追加（SightEdit拡張機能からのアクセス許可）
                response.Headers.Add("Access-Control-Allow-Origin", "*");
                response.Headers.Add("Access-Control-Allow-Methods", "GET");
                response.Headers.Add("Access-Control-Allow-Headers", "Content-Type");

                if (request.Url.AbsolutePath == "/file")
                {
                    string fileContent;
                    if (_filePath != null && File.Exists(_filePath))
                    {
                        // ファイル内容を読み込み
                        fileContent = File.ReadAllText(_filePath, Encoding.UTF8);
                        LogMessage("ファイル内容を送信");
                    }
                    else
                    {
                        // 新規ファイルの場合は空の内容を返す
                        fileContent = "# 新規Markdownファイル\n\nここにMarkdownを記述してください...";
                        LogMessage("新規ファイル用の初期内容を送信");
                    }
                    
                    // レスポンス設定
                    byte[] buffer = Encoding.UTF8.GetBytes(fileContent);
                    response.ContentLength64 = buffer.Length;
                    response.ContentType = "text/markdown; charset=utf-8";
                    response.StatusCode = 200;
                    
                    // ファイル内容をレスポンスとして返す
                    response.OutputStream.Write(buffer, 0, buffer.Length);
                }
                else
                {
                    // 404エラー
                    response.StatusCode = 404;
                    byte[] errorBuffer = Encoding.UTF8.GetBytes("File not found");
                    response.OutputStream.Write(errorBuffer, 0, errorBuffer.Length);
                }

                response.OutputStream.Close();

                // 次のリクエストを待機
                _listener.BeginGetContext(HandleRequest, null);
            }
            catch (Exception ex)
            {
                LogMessage($"リクエスト処理エラー: {ex.Message}");
            }
        }

        private static void OpenBrowser()
        {
            try
            {
                // Chromeブラウザのパスを検索
                string chromePath = FindChromePath();
                
                // App.configから拡張機能IDとパスを読み込み
                string extensionId = ConfigurationManager.AppSettings["ExtensionId"] ?? "chibfgpnajlchhljdojcpmamhplnogcp";
                string extensionPath = ConfigurationManager.AppSettings["ExtensionPath"] ?? "/editor.html";
                
                string extensionUrl;
                if (_filePath != null)
                {
                    // ファイル指定がある場合は外部ファイル読み込みモード
                    extensionUrl = $"chrome-extension://{extensionId}{extensionPath}?file=http://localhost:8080/file";
                }
                else
                {
                    // ファイル指定がない場合は新規作成モード
                    extensionUrl = $"chrome-extension://{extensionId}{extensionPath}";
                }
                
                LogMessage($"使用する拡張機能ID: {extensionId}");
                
                if (!string.IsNullOrEmpty(chromePath))
                {
                    // Chromeブラウザで拡張機能URLを開く
                    ProcessStartInfo startInfo = new ProcessStartInfo
                    {
                        FileName = chromePath,
                        Arguments = $"\"{extensionUrl}\"",
                        UseShellExecute = false
                    };
                    
                    Process.Start(startInfo);
                    LogMessage($"Chrome経由でSightEdit拡張機能を開きました: {extensionUrl}");
                }
                else
                {
                    throw new Exception("Chromeブラウザが見つかりません");
                }
            }
            catch (Exception ex)
            {
                LogMessage($"SightEdit拡張機能の起動に失敗: {ex.Message}");
                
                // フォールバック1: デフォルトブラウザでHTMLページを開く
                try
                {
                    var redirectUrl = $"http://127.0.0.1:8080/redirect";
                    Process.Start(new ProcessStartInfo(redirectUrl) { UseShellExecute = true });
                    LogMessage($"フォールバック: リダイレクトページを開きました: {redirectUrl}");
                }
                catch (Exception fallbackEx)
                {
                    LogMessage($"フォールバックも失敗: {fallbackEx.Message}");
                    
                    // フォールバック2: 直接ファイル内容を表示
                    try
                    {
                        var directUrl = "http://127.0.0.1:8080/file";
                        Process.Start(new ProcessStartInfo(directUrl) { UseShellExecute = true });
                        LogMessage($"最終フォールバック: {directUrl} を開きました");
                    }
                    catch (Exception finalEx)
                    {
                        LogMessage($"すべてのフォールバックが失敗: {finalEx.Message}");
                    }
                }
            }
        }

        private static string FindChromePath()
        {
            // Chrome.exeの一般的なパスを検索
            string[] chromePaths = {
                @"C:\Program Files\Google\Chrome\Application\chrome.exe",
                @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), 
                    @"Google\Chrome\Application\chrome.exe"),
                @"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
                @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
            };

            foreach (var path in chromePaths)
            {
                if (File.Exists(path))
                {
                    LogMessage($"ブラウザが見つかりました: {path}");
                    return path;
                }
            }

            return null;
        }

        private static void ShutdownCallback(object state)
        {
            LogMessage("自動終了タイマー作動");
            Cleanup();
            Environment.Exit(0);
        }

        private static void Cleanup()
        {
            try
            {
                _shutdownTimer?.Dispose();
                
                if (_listener != null && _listener.IsListening)
                {
                    _listener.Stop();
                    _listener.Close();
                }

                if (_trayIcon != null)
                {
                    _trayIcon.Visible = false;
                    _trayIcon.Dispose();
                }

                LogMessage("クリーンアップ完了");
            }
            catch (Exception ex)
            {
                LogMessage($"クリーンアップエラー: {ex.Message}");
            }
        }

        private static void ShowError(string message)
        {
            MessageBox.Show(message, "SightEdit Relay エラー", MessageBoxButtons.OK, MessageBoxIcon.Error);
            LogMessage($"エラー表示: {message}");
        }

        private static void LogMessage(string message)
        {
            try
            {
                var logEntry = $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] {message}";
                File.AppendAllText(LogPath, logEntry + Environment.NewLine);
                Console.WriteLine(logEntry);
            }
            catch
            {
                // ログ出力エラーは無視
            }
        }
    }
}
