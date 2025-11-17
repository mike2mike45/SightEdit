using System;
using System.Configuration;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading;
using System.Drawing;
using System.Windows.Forms;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace SightEditRelay
{
    class Program
    {
        private static HttpListener _listener;
        private static string _filePath;
        private static System.Threading.Timer _shutdownTimer;
        private static NotifyIcon _trayIcon;
        private static Logger _logger;
        private static Settings _settings;
        private static GoogleDriveService _driveService;

        // パス設定
        private static readonly string AppDataPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
            "SightEditRelay"
        );
        private static readonly string ConfigPath = Path.Combine(AppDataPath, "config");
        private static readonly string LogPath = Path.Combine(AppDataPath, "logs", "sightedit_relay.log");
        private static readonly string SettingsPath = Path.Combine(ConfigPath, "settings.json");
        private static readonly string CredentialPath = Path.Combine(ConfigPath, "client_secret.json");
        private static readonly string TokenPath = Path.Combine(ConfigPath, "token.json");

        static async Task Main(string[] args)
        {
            try
            {
                // ディレクトリ作成
                Directory.CreateDirectory(ConfigPath);
                Directory.CreateDirectory(Path.GetDirectoryName(LogPath));

                // Logger初期化
                _logger = new Logger(LogPath);
                _logger.LogInfo("=== SightEdit Relay 起動 ===");

                // 設定ファイル読み込み
                _settings = Settings.LoadFromFile(SettingsPath);
                _logger.LogInfo("設定ファイル読み込み完了");

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
                    _logger.LogInfo($"対象ファイル: {_filePath}");
                }
                else
                {
                    // ファイルパス指定がない場合は空のエディタを開く
                    _filePath = null;
                    _logger.LogInfo("新規ファイル作成モード");
                }

                // Google Drive API初期化（バージョン履歴が有効な場合）
                if (_settings.VersionHistory.Enabled)
                {
                    if (File.Exists(CredentialPath))
                    {
                        _driveService = new GoogleDriveService(CredentialPath, TokenPath, _logger);
                        var initialized = await _driveService.InitializeAsync();

                        if (initialized)
                        {
                            _logger.LogInfo("Google Drive API初期化成功");
                        }
                        else
                        {
                            _logger.LogWarning("Google Drive API初期化失敗 - バージョン履歴機能は無効");
                        }
                    }
                    else
                    {
                        _logger.LogWarning($"client_secret.jsonが見つかりません: {CredentialPath}");
                        _logger.LogWarning("バージョン履歴機能は無効です");
                    }
                }

                // システムトレイアイコン作成
                CreateTrayIcon();

                // HTTPサーバー起動
                StartHttpServer();

                // ブラウザでSightEdit拡張機能を開く
                OpenBrowser();

                // 自動終了タイマー（60秒）
                _shutdownTimer = new System.Threading.Timer(ShutdownCallback, null, 60000, Timeout.Infinite);

                _logger.LogInfo("HTTPサーバー開始、60秒後に自動終了");

                // アプリケーション継続
                Application.Run();
            }
            catch (Exception ex)
            {
                _logger?.LogError($"致命的エラー: {ex.Message}");
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

                _logger.LogInfo("システムトレイアイコンを作成");
            }
            catch (Exception ex)
            {
                _logger.LogError($"トレイアイコン作成エラー: {ex.Message}");
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

                    _logger.LogInfo($"HTTPサーバー開始: ポート {port}");
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

                _logger.LogInfo($"リクエスト受信: {request.HttpMethod} {request.Url.AbsolutePath}");

                // CORSヘッダーを追加
                response.Headers.Add("Access-Control-Allow-Origin", "*");
                response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
                response.Headers.Add("Access-Control-Allow-Headers", "Content-Type");

                // OPTIONSリクエスト処理（CORS preflight）
                if (request.HttpMethod == "OPTIONS")
                {
                    response.StatusCode = 200;
                    response.OutputStream.Close();
                    _listener.BeginGetContext(HandleRequest, null);
                    return;
                }

                // ルーティング
                var path = request.Url.AbsolutePath;

                if (path == "/file")
                {
                    HandleFileRequest(request, response);
                }
                else if (path.StartsWith("/") && !path.StartsWith("/api/"))
                {
                    // 静的ファイル配信
                    HandleStaticFileRequest(request, response, path);
                }
                else if (path == "/api/versions")
                {
                    HandleVersionsRequest(request, response).Wait();
                }
                else if (path.StartsWith("/api/versions/") && path.EndsWith("/content"))
                {
                    HandleVersionContentRequest(request, response).Wait();
                }
                else if (path.StartsWith("/api/versions/") && path.EndsWith("/restore"))
                {
                    HandleRestoreRequest(request, response).Wait();
                }
                else if (path == "/api/drive/folders")
                {
                    HandleDriveFoldersRequest(request, response).Wait();
                }
                else if (path == "/api/drive/images")
                {
                    HandleDriveImagesRequest(request, response).Wait();
                }
                else if (path == "/api/drive/files")
                {
                    HandleDriveFilesRequest(request, response).Wait();
                }
                else if (path.StartsWith("/api/drive/share/"))
                {
                    HandleDriveShareRequest(request, response).Wait();
                }
                else if (path == "/api/status")
                {
                    HandleStatusRequest(request, response);
                }
                else
                {
                    // 404エラー
                    response.StatusCode = 404;
                    byte[] errorBuffer = Encoding.UTF8.GetBytes("Not found");
                    response.OutputStream.Write(errorBuffer, 0, errorBuffer.Length);
                }

                response.OutputStream.Close();

                // 次のリクエストを待機
                _listener.BeginGetContext(HandleRequest, null);
            }
            catch (Exception ex)
            {
                _logger.LogError($"リクエスト処理エラー: {ex.Message}");
            }
        }

        private static void HandleFileRequest(HttpListenerRequest request, HttpListenerResponse response)
        {
            try
            {
                if (request.HttpMethod == "GET")
                {
                    // エディターHTMLファイルのパス
                    string editorHtmlPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "dist", "editor.html");
                    
                    if (!File.Exists(editorHtmlPath))
                    {
                        // dist/editor.htmlが見つからない場合は相対パスでも試す
                        editorHtmlPath = Path.Combine(Directory.GetCurrentDirectory(), "dist", "editor.html");
                    }
                    
                    if (File.Exists(editorHtmlPath))
                    {
                        // HTMLファイルを読み込み
                        string editorHtml = File.ReadAllText(editorHtmlPath, Encoding.UTF8);
                        
                        if (_filePath != null && File.Exists(_filePath))
                        {
                            // ファイル内容を読み込み
                            string fileContent = File.ReadAllText(_filePath, Encoding.UTF8);
                            string fileName = Path.GetFileName(_filePath);
                            
                            // ファイル内容をJavaScriptとして埋め込み
                            string fileDataScript = $@"
        <script>
          window.INITIAL_FILE_DATA = {{
            fileName: {JsonConvert.SerializeObject(fileName)},
            content: {JsonConvert.SerializeObject(fileContent)},
            originalPath: {JsonConvert.SerializeObject(_filePath)}
          }};
          console.log('🎯 初期ファイルデータ設定完了:', window.INITIAL_FILE_DATA.fileName);
        </script>
      ";
                            
                            // </head>タグの直前にスクリプトを挿入
                            editorHtml = editorHtml.Replace("</head>", fileDataScript + "</head>");
                            _logger.LogInfo($"ファイル内容をHTML埋め込み: {fileName}");
                        }
                        else
                        {
                            _logger.LogInfo("新規ファイルモードでHTML送信");
                        }
                        
                        // HTMLレスポンスとして送信
                        response.ContentType = "text/html; charset=utf-8";
                        byte[] buffer = Encoding.UTF8.GetBytes(editorHtml);
                        response.ContentLength64 = buffer.Length;
                        response.StatusCode = 200;
                        response.OutputStream.Write(buffer, 0, buffer.Length);
                    }
                    else
                    {
                        // editor.htmlが見つからない場合はエラーレスポンス
                        _logger.LogError($"editor.htmlが見つかりません: {editorHtmlPath}");
                        response.StatusCode = 404;
                        string errorHtml = "<html><body><h1>エラー</h1><p>エディターファイルが見つかりません</p></body></html>";
                        byte[] buffer = Encoding.UTF8.GetBytes(errorHtml);
                        response.ContentType = "text/html; charset=utf-8";
                        response.ContentLength64 = buffer.Length;
                        response.OutputStream.Write(buffer, 0, buffer.Length);
                    }
                }
                else if (request.HttpMethod == "POST")
                {
                    // POSTリクエスト：ファイル保存処理
                    using (var reader = new StreamReader(request.InputStream, request.ContentEncoding))
                    {
                        var requestBody = reader.ReadToEnd();
                        var data = JsonConvert.DeserializeObject<dynamic>(requestBody);
                        
                        string content = data.content;
                        string filePath = data.filePath ?? _filePath;
                        
                        if (!string.IsNullOrEmpty(filePath))
                        {
                            File.WriteAllText(filePath, content, Encoding.UTF8);
                            _logger.LogInfo($"ファイルを保存しました: {filePath}");
                            
                            response.StatusCode = 200;
                            var responseData = JsonConvert.SerializeObject(new { success = true, message = "保存しました" });
                            byte[] buffer = Encoding.UTF8.GetBytes(responseData);
                            response.ContentType = "application/json; charset=utf-8";
                            response.ContentLength64 = buffer.Length;
                            response.OutputStream.Write(buffer, 0, buffer.Length);
                        }
                        else
                        {
                            response.StatusCode = 400;
                            var responseData = JsonConvert.SerializeObject(new { success = false, message = "ファイルパスが指定されていません" });
                            byte[] buffer = Encoding.UTF8.GetBytes(responseData);
                            response.ContentType = "application/json; charset=utf-8";
                            response.ContentLength64 = buffer.Length;
                            response.OutputStream.Write(buffer, 0, buffer.Length);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"ファイルリクエスト処理エラー: {ex.Message}");
                response.StatusCode = 500;
            }
        }

        private static void HandleStaticFileRequest(HttpListenerRequest request, HttpListenerResponse response, string path)
        {
            try
            {
                // パスからファイル名を取得（先頭の'/'を除去）
                string fileName = path.TrimStart('/');
                
                // セキュリティチェック：パストラバーサル攻撃を防ぐ
                if (fileName.Contains("..") || fileName.Contains("\\"))
                {
                    response.StatusCode = 403;
                    return;
                }
                
                // ファイルパスを構築
                string staticFilePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "dist", fileName);
                
                if (!File.Exists(staticFilePath))
                {
                    // 現在のディレクトリからも探してみる
                    staticFilePath = Path.Combine(Directory.GetCurrentDirectory(), "dist", fileName);
                }
                
                if (File.Exists(staticFilePath))
                {
                    // ファイルの内容を読み込み
                    byte[] fileContent = File.ReadAllBytes(staticFilePath);
                    
                    // Content-Typeを設定
                    string contentType = GetContentType(fileName);
                    response.ContentType = contentType;
                    
                    // ファイル内容を送信
                    response.StatusCode = 200;
                    response.ContentLength64 = fileContent.Length;
                    response.OutputStream.Write(fileContent, 0, fileContent.Length);
                    
                    _logger.LogInfo($"静的ファイル配信: {fileName} ({fileContent.Length} bytes)");
                }
                else
                {
                    // ファイルが見つからない
                    response.StatusCode = 404;
                    _logger.LogWarning($"静的ファイルが見つかりません: {fileName}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"静的ファイル配信エラー: {ex.Message}");
                response.StatusCode = 500;
            }
        }

        private static string GetContentType(string fileName)
        {
            string extension = Path.GetExtension(fileName).ToLowerInvariant();
            
            switch (extension)
            {
                case ".html":
                    return "text/html; charset=utf-8";
                case ".css":
                    return "text/css; charset=utf-8";
                case ".js":
                    return "application/javascript; charset=utf-8";
                case ".json":
                    return "application/json; charset=utf-8";
                case ".png":
                    return "image/png";
                case ".jpg":
                case ".jpeg":
                    return "image/jpeg";
                case ".gif":
                    return "image/gif";
                case ".svg":
                    return "image/svg+xml";
                case ".ico":
                    return "image/x-icon";
                case ".woff":
                    return "font/woff";
                case ".woff2":
                    return "font/woff2";
                case ".ttf":
                    return "font/ttf";
                default:
                    return "application/octet-stream";
            }
        }

        private static async Task HandleVersionsRequest(HttpListenerRequest request, HttpListenerResponse response)
        {
            try
            {
                if (_driveService == null || _filePath == null)
                {
                    SendJsonResponse(response, 400, new { success = false, error = "バージョン履歴機能が無効です" });
                    return;
                }

                if (request.HttpMethod == "GET")
                {
                    // バージョン一覧を取得
                    var versions = await _driveService.GetVersionsAsync(_filePath);
                    SendJsonResponse(response, 200, new { success = true, versions });
                }
                else if (request.HttpMethod == "POST")
                {
                    // 新しいバージョンを保存
                    using (var reader = new StreamReader(request.InputStream, request.ContentEncoding))
                    {
                        var requestBody = await reader.ReadToEndAsync();
                        var data = JsonConvert.DeserializeObject<SaveVersionRequest>(requestBody);

                        var versionInfo = await _driveService.SaveVersionAsync(
                            data.FilePath ?? _filePath,
                            data.Content,
                            data.Message
                        );

                        SendJsonResponse(response, 200, new
                        {
                            success = true,
                            version_id = versionInfo.VersionId,
                            message = "バージョンを保存しました",
                            google_drive_url = versionInfo.GoogleDriveUrl
                        });
                    }
                }
                else
                {
                    response.StatusCode = 405; // Method Not Allowed
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"バージョンリクエスト処理エラー: {ex.Message}");
                SendJsonResponse(response, 500, new { success = false, error = ex.Message });
            }
        }

        private static async Task HandleVersionContentRequest(HttpListenerRequest request, HttpListenerResponse response)
        {
            try
            {
                if (_driveService == null || _filePath == null)
                {
                    SendJsonResponse(response, 400, new { success = false, error = "バージョン履歴機能が無効です" });
                    return;
                }

                // URLからバージョンIDを抽出: /api/versions/{version_id}/content
                var pathSegments = request.Url.AbsolutePath.Split('/');
                var versionId = pathSegments[3];

                var content = await _driveService.GetVersionContentAsync(_filePath, versionId);

                SendJsonResponse(response, 200, new
                {
                    success = true,
                    content,
                    version_id = versionId,
                    timestamp = DateTime.Now
                });
            }
            catch (Exception ex)
            {
                _logger.LogError($"バージョン内容リクエスト処理エラー: {ex.Message}");
                SendJsonResponse(response, 500, new { success = false, error = ex.Message });
            }
        }

        private static async Task HandleRestoreRequest(HttpListenerRequest request, HttpListenerResponse response)
        {
            try
            {
                if (_driveService == null || _filePath == null)
                {
                    SendJsonResponse(response, 400, new { success = false, error = "バージョン履歴機能が無効です" });
                    return;
                }

                // URLからバージョンIDを抽出: /api/versions/{version_id}/restore
                var pathSegments = request.Url.AbsolutePath.Split('/');
                var versionId = pathSegments[3];

                var success = await _driveService.RestoreVersionAsync(_filePath, versionId);

                if (success)
                {
                    SendJsonResponse(response, 200, new
                    {
                        success = true,
                        message = "バージョンを復元しました"
                    });
                }
                else
                {
                    SendJsonResponse(response, 500, new
                    {
                        success = false,
                        error = "バージョンの復元に失敗しました"
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"バージョン復元リクエスト処理エラー: {ex.Message}");
                SendJsonResponse(response, 500, new { success = false, error = ex.Message });
            }
        }

        private static void SendJsonResponse(HttpListenerResponse response, int statusCode, object data)
        {
            var json = JsonConvert.SerializeObject(data);
            var buffer = Encoding.UTF8.GetBytes(json);

            response.StatusCode = statusCode;
            response.ContentType = "application/json; charset=utf-8";
            response.ContentLength64 = buffer.Length;
            response.OutputStream.Write(buffer, 0, buffer.Length);
        }

        /// <summary>
        /// Google Driveフォルダ一覧API
        /// </summary>
        private static async Task HandleDriveFoldersRequest(HttpListenerRequest request, HttpListenerResponse response)
        {
            try
            {
                if (_driveService == null)
                {
                    SendJsonResponse(response, 503, new { error = "Google Drive service not available" });
                    return;
                }

                if (request.HttpMethod == "GET")
                {
                    var parentId = request.QueryString["parentId"] ?? "root";
                    var folders = await _driveService.GetFoldersAsync(parentId);
                    SendJsonResponse(response, 200, new { folders = folders });
                }
                else
                {
                    SendJsonResponse(response, 405, new { error = "Method not allowed" });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Drive folders request error: {ex.Message}");
                SendJsonResponse(response, 500, new { error = ex.Message });
            }
        }

        /// <summary>
        /// Google Drive画像一覧API
        /// </summary>
        private static async Task HandleDriveImagesRequest(HttpListenerRequest request, HttpListenerResponse response)
        {
            try
            {
                if (_driveService == null)
                {
                    SendJsonResponse(response, 503, new { error = "Google Drive service not available" });
                    return;
                }

                if (request.HttpMethod == "GET")
                {
                    var parentId = request.QueryString["parentId"] ?? "root";
                    var images = await _driveService.GetImagesAsync(parentId);
                    SendJsonResponse(response, 200, new { images = images });
                }
                else
                {
                    SendJsonResponse(response, 405, new { error = "Method not allowed" });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Drive images request error: {ex.Message}");
                SendJsonResponse(response, 500, new { error = ex.Message });
            }
        }

        /// <summary>
        /// Google Driveファイル・フォルダ一覧API
        /// </summary>
        private static async Task HandleDriveFilesRequest(HttpListenerRequest request, HttpListenerResponse response)
        {
            try
            {
                if (_driveService == null)
                {
                    SendJsonResponse(response, 503, new { error = "Google Drive service not available" });
                    return;
                }

                if (request.HttpMethod == "GET")
                {
                    var parentId = request.QueryString["parentId"] ?? "root";
                    var items = await _driveService.GetFilesAndFoldersAsync(parentId);
                    SendJsonResponse(response, 200, new { items = items });
                }
                else
                {
                    SendJsonResponse(response, 405, new { error = "Method not allowed" });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Drive files request error: {ex.Message}");
                SendJsonResponse(response, 500, new { error = ex.Message });
            }
        }

        /// <summary>
        /// Google Drive共有リンク取得API
        /// </summary>
        private static async Task HandleDriveShareRequest(HttpListenerRequest request, HttpListenerResponse response)
        {
            try
            {
                if (_driveService == null)
                {
                    SendJsonResponse(response, 503, new { error = "Google Drive service not available" });
                    return;
                }

                if (request.HttpMethod == "GET")
                {
                    // URLから ファイルIDを抽出: /api/drive/share/{fileId}
                    var urlParts = request.Url.AbsolutePath.Split('/');
                    if (urlParts.Length >= 4 && urlParts[3] != "")
                    {
                        var fileId = urlParts[4];
                        var shareLink = await _driveService.GetSharableLinkAsync(fileId);
                        SendJsonResponse(response, 200, new { shareLink = shareLink });
                    }
                    else
                    {
                        SendJsonResponse(response, 400, new { error = "File ID required" });
                    }
                }
                else
                {
                    SendJsonResponse(response, 405, new { error = "Method not allowed" });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Drive share request error: {ex.Message}");
                SendJsonResponse(response, 500, new { error = ex.Message });
            }
        }

        /// <summary>
        /// ステータス確認API
        /// </summary>
        private static void HandleStatusRequest(HttpListenerRequest request, HttpListenerResponse response)
        {
            try
            {
                if (request.HttpMethod == "GET")
                {
                    var status = new
                    {
                        status = "running",
                        driveServiceAvailable = _driveService != null,
                        timestamp = DateTime.Now.ToString("o")
                    };
                    SendJsonResponse(response, 200, status);
                }
                else
                {
                    SendJsonResponse(response, 405, new { error = "Method not allowed" });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Status request error: {ex.Message}");
                SendJsonResponse(response, 500, new { error = ex.Message });
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
                    // ポート番号を動的に取得
                    string portUrl = "";
                    foreach (string prefix in _listener.Prefixes)
                    {
                        portUrl = prefix;
                        break;
                    }
                    string port = portUrl.Split(':')[2].TrimEnd('/');
                    // ファイルパスとファイル名をURLエンコード
                    string encodedPath = Uri.EscapeDataString(_filePath);
                    string fileName = Path.GetFileName(_filePath);
                    string encodedFileName = Uri.EscapeDataString(fileName);
                    
                    extensionUrl = $"http://localhost:{port}/file?path={encodedPath}&name={encodedFileName}";
                    _logger.LogInfo($"ファイルモードで起動: {_filePath}");
                    _logger.LogInfo($"生成URL: {extensionUrl}");
                }
                else
                {
                    // ファイル指定がない場合は新規作成モード
                    string portUrl = "";
                    foreach (string prefix in _listener.Prefixes)
                    {
                        portUrl = prefix;
                        break;
                    }
                    string port = portUrl.Split(':')[2].TrimEnd('/');
                    extensionUrl = $"http://localhost:{port}/";
                    _logger.LogInfo("新規ファイルモードで起動");
                }

                _logger.LogInfo($"対象URL: {extensionUrl}");

                if (!string.IsNullOrEmpty(chromePath))
                {
                    // Chromeブラウザでlocalhostサーバーを開く
                    ProcessStartInfo startInfo = new ProcessStartInfo
                    {
                        FileName = chromePath,
                        Arguments = $"\"{extensionUrl}\"",
                        UseShellExecute = false
                    };

                    Process.Start(startInfo);
                    _logger.LogInfo($"Chrome経由でSightEdit拡張機能を開きました: {extensionUrl}");
                }
                else
                {
                    throw new Exception("Chromeブラウザが見つかりません");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"SightEdit拡張機能の起動に失敗: {ex.Message}");
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
                    _logger.LogInfo($"ブラウザが見つかりました: {path}");
                    return path;
                }
            }

            return null;
        }

        private static void ShutdownCallback(object state)
        {
            _logger.LogInfo("自動終了タイマー作動");
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

                _logger?.LogInfo("クリーンアップ完了");
            }
            catch (Exception ex)
            {
                _logger?.LogError($"クリーンアップエラー: {ex.Message}");
            }
        }

        private static void ShowError(string message)
        {
            MessageBox.Show(message, "SightEdit Relay エラー", MessageBoxButtons.OK, MessageBoxIcon.Error);
            _logger?.LogError($"エラー表示: {message}");
        }
    }

    // リクエストボディ用クラス
    public class SaveVersionRequest
    {
        [JsonProperty("file_path")]
        public string FilePath { get; set; }

        [JsonProperty("content")]
        public string Content { get; set; }

        [JsonProperty("message")]
        public string Message { get; set; }
    }
}
