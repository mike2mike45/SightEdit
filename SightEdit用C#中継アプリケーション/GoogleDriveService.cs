using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Drive.v3;
using Google.Apis.Drive.v3.Data;
using Google.Apis.Services;
using Google.Apis.Util.Store;
using Newtonsoft.Json;

namespace SightEditRelay
{
    /// <summary>
    /// Google Drive API連携サービス
    /// バージョン履歴の保存・取得を管理
    /// </summary>
    public class GoogleDriveService
    {
        private static readonly string[] Scopes = { DriveService.Scope.Drive };
        private const string ApplicationName = "SightEdit Version Manager";
        private const string VersionFolderName = "SightEdit Version History";

        private DriveService _driveService;
        private readonly string _credentialPath;
        private readonly string _tokenPath;
        private readonly Logger _logger;

        public GoogleDriveService(string credentialPath, string tokenPath, Logger logger)
        {
            _credentialPath = credentialPath;
            _tokenPath = tokenPath;
            _logger = logger;
        }

        /// <summary>
        /// Google Drive APIを初期化
        /// </summary>
        public async Task<bool> InitializeAsync()
        {
            try
            {
                UserCredential credential;

                // client_secret.jsonの存在確認
                if (!System.IO.File.Exists(_credentialPath))
                {
                    _logger.LogError($"client_secret.jsonが見つかりません: {_credentialPath}");
                    return false;
                }

                using (var stream = new FileStream(_credentialPath, FileMode.Open, FileAccess.Read))
                {
                    string credPath = Path.GetDirectoryName(_tokenPath);

                    credential = await GoogleWebAuthorizationBroker.AuthorizeAsync(
                        GoogleClientSecrets.FromStream(stream).Secrets,
                        Scopes,
                        "user",
                        CancellationToken.None,
                        new FileDataStore(credPath, true));

                    _logger.LogInfo("OAuth認証成功");
                }

                // Drive APIサービスを作成
                _driveService = new DriveService(new BaseClientService.Initializer()
                {
                    HttpClientInitializer = credential,
                    ApplicationName = ApplicationName,
                });

                _logger.LogInfo("Google Drive API初期化完了");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError($"Google Drive API初期化エラー: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// バージョン履歴フォルダを取得または作成
        /// </summary>
        private async Task<string> GetOrCreateVersionFolderAsync(string originalFileName)
        {
            try
            {
                // ルートの"SightEdit Version History"フォルダを検索
                var rootFolderQuery = $"name='{VersionFolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false";
                var rootFolderRequest = _driveService.Files.List();
                rootFolderRequest.Q = rootFolderQuery;
                rootFolderRequest.Fields = "files(id, name)";

                var rootFolderList = await rootFolderRequest.ExecuteAsync();
                string rootFolderId;

                if (rootFolderList.Files.Count == 0)
                {
                    // ルートフォルダを作成
                    var rootFolderMetadata = new Google.Apis.Drive.v3.Data.File()
                    {
                        Name = VersionFolderName,
                        MimeType = "application/vnd.google-apps.folder"
                    };

                    var rootFolder = await _driveService.Files.Create(rootFolderMetadata).ExecuteAsync();
                    rootFolderId = rootFolder.Id;
                    _logger.LogInfo($"ルートフォルダ作成: {VersionFolderName}");
                }
                else
                {
                    rootFolderId = rootFolderList.Files[0].Id;
                }

                // ファイル名専用のサブフォルダを検索
                var subFolderQuery = $"name='{originalFileName}' and '{rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false";
                var subFolderRequest = _driveService.Files.List();
                subFolderRequest.Q = subFolderQuery;
                subFolderRequest.Fields = "files(id, name)";

                var subFolderList = await subFolderRequest.ExecuteAsync();

                if (subFolderList.Files.Count == 0)
                {
                    // サブフォルダを作成
                    var subFolderMetadata = new Google.Apis.Drive.v3.Data.File()
                    {
                        Name = originalFileName,
                        MimeType = "application/vnd.google-apps.folder",
                        Parents = new List<string> { rootFolderId }
                    };

                    var subFolder = await _driveService.Files.Create(subFolderMetadata).ExecuteAsync();
                    _logger.LogInfo($"サブフォルダ作成: {originalFileName}");
                    return subFolder.Id;
                }
                else
                {
                    return subFolderList.Files[0].Id;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"フォルダ取得/作成エラー: {ex.Message}");
                throw;
            }
        }

        /// <summary>
        /// バージョンを保存
        /// </summary>
        public async Task<VersionInfo> SaveVersionAsync(string filePath, string content, string message)
        {
            try
            {
                var fileName = Path.GetFileName(filePath);
                var folderId = await GetOrCreateVersionFolderAsync(fileName);

                // バージョンID生成: v_YYYYMMDD_HHMM
                var timestamp = DateTime.Now;
                var versionId = $"v_{timestamp:yyyyMMdd_HHmm}";
                var versionFileName = $"{versionId}.md";

                // ファイルメタデータ
                var fileMetadata = new Google.Apis.Drive.v3.Data.File()
                {
                    Name = versionFileName,
                    Parents = new List<string> { folderId },
                    Description = message ?? "バージョン保存",
                    Properties = new Dictionary<string, string>
                    {
                        { "version_id", versionId },
                        { "timestamp", timestamp.ToString("o") },
                        { "message", message ?? "" },
                        { "original_file", fileName }
                    }
                };

                // ファイル内容をアップロード
                using (var stream = new MemoryStream(System.Text.Encoding.UTF8.GetBytes(content)))
                {
                    var request = _driveService.Files.Create(fileMetadata, stream, "text/markdown");
                    request.Fields = "id, name, createdTime, size, webViewLink";

                    var file = await request.UploadAsync();

                    if (file.Status == Google.Apis.Upload.UploadStatus.Completed)
                    {
                        var uploadedFile = request.ResponseBody;

                        _logger.LogInfo($"バージョン保存成功: {versionId}");

                        return new VersionInfo
                        {
                            VersionId = versionId,
                            Timestamp = timestamp,
                            Message = message ?? "",
                            FileSize = uploadedFile.Size ?? 0,
                            CreatedBy = "user",
                            GoogleDriveUrl = uploadedFile.WebViewLink
                        };
                    }
                    else
                    {
                        throw new Exception($"アップロード失敗: {file.Exception?.Message}");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"バージョン保存エラー: {ex.Message}");
                throw;
            }
        }

        /// <summary>
        /// バージョン一覧を取得
        /// </summary>
        public async Task<List<VersionInfo>> GetVersionsAsync(string filePath)
        {
            try
            {
                var fileName = Path.GetFileName(filePath);
                var folderId = await GetOrCreateVersionFolderAsync(fileName);

                // フォルダ内のファイル一覧を取得
                var request = _driveService.Files.List();
                request.Q = $"'{folderId}' in parents and trashed=false";
                request.Fields = "files(id, name, createdTime, size, properties, webViewLink)";
                request.OrderBy = "createdTime desc";

                var fileList = await request.ExecuteAsync();
                var versions = new List<VersionInfo>();

                foreach (var file in fileList.Files)
                {
                    if (file.Properties != null)
                    {
                        // .NET Framework 4.8互換: GetValueOrDefaultの代わりにContainsKeyを使用
                        string versionId = file.Properties.ContainsKey("version_id") ? file.Properties["version_id"] : "";
                        // CreatedTimeDateTimeOffsetを使用（CreatedTimeは旧形式）
                        string timestampStr = file.Properties.ContainsKey("timestamp") ? file.Properties["timestamp"] : (file.CreatedTimeDateTimeOffset?.ToString("o") ?? DateTime.Now.ToString("o"));
                        string message = file.Properties.ContainsKey("message") ? file.Properties["message"] : "";

                        versions.Add(new VersionInfo
                        {
                            VersionId = versionId,
                            Timestamp = DateTime.Parse(timestampStr),
                            Message = message,
                            FileSize = file.Size ?? 0,
                            CreatedBy = "user",
                            GoogleDriveFileId = file.Id,
                            GoogleDriveUrl = file.WebViewLink
                        });
                    }
                }

                _logger.LogInfo($"バージョン一覧取得: {versions.Count}件");
                return versions;
            }
            catch (Exception ex)
            {
                _logger.LogError($"バージョン一覧取得エラー: {ex.Message}");
                throw;
            }
        }

        /// <summary>
        /// 特定バージョンの内容を取得
        /// </summary>
        public async Task<string> GetVersionContentAsync(string filePath, string versionId)
        {
            try
            {
                var fileName = Path.GetFileName(filePath);
                var folderId = await GetOrCreateVersionFolderAsync(fileName);

                // バージョンIDに対応するファイルを検索
                var versionFileName = $"{versionId}.md";
                var request = _driveService.Files.List();
                request.Q = $"name='{versionFileName}' and '{folderId}' in parents and trashed=false";
                request.Fields = "files(id)";

                var fileList = await request.ExecuteAsync();

                if (fileList.Files.Count == 0)
                {
                    throw new Exception($"バージョンが見つかりません: {versionId}");
                }

                var fileId = fileList.Files[0].Id;

                // ファイル内容をダウンロード
                var downloadRequest = _driveService.Files.Get(fileId);
                using (var stream = new MemoryStream())
                {
                    await downloadRequest.DownloadAsync(stream);
                    stream.Position = 0;

                    using (var reader = new StreamReader(stream))
                    {
                        var content = await reader.ReadToEndAsync();
                        _logger.LogInfo($"バージョン内容取得: {versionId}");
                        return content;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"バージョン内容取得エラー: {ex.Message}");
                throw;
            }
        }

        /// <summary>
        /// バージョンを復元（ローカルファイルに書き込み）
        /// </summary>
        public async Task<bool> RestoreVersionAsync(string filePath, string versionId)
        {
            try
            {
                var content = await GetVersionContentAsync(filePath, versionId);

                // ローカルファイルに書き込み (.NET Framework 4.8互換)
                System.IO.File.WriteAllText(filePath, content, System.Text.Encoding.UTF8);

                _logger.LogInfo($"バージョン復元成功: {versionId} -> {filePath}");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError($"バージョン復元エラー: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Google Driveから画像ファイル一覧を取得
        /// </summary>
        public async Task<List<DriveImageInfo>> GetImagesAsync(int maxResults = 50)
        {
            try
            {
                var images = new List<DriveImageInfo>();

                // 画像ファイルを検索（MIMEタイプで絞り込み）
                var request = _driveService.Files.List();
                request.Q = "(mimeType='image/png' or mimeType='image/jpeg' or mimeType='image/jpg' or mimeType='image/gif' or mimeType='image/webp') and trashed=false";
                request.Fields = "files(id, name, mimeType, thumbnailLink, webContentLink, size, createdTime, modifiedTime)";
                request.OrderBy = "modifiedTime desc";
                request.PageSize = maxResults;

                var fileList = await request.ExecuteAsync();

                foreach (var file in fileList.Files)
                {
                    images.Add(new DriveImageInfo
                    {
                        FileId = file.Id,
                        FileName = file.Name,
                        MimeType = file.MimeType,
                        ThumbnailLink = file.ThumbnailLink,
                        DownloadLink = file.WebContentLink,
                        FileSize = file.Size ?? 0,
                        CreatedTime = file.CreatedTimeDateTimeOffset?.DateTime ?? DateTime.Now,
                        ModifiedTime = file.ModifiedTimeDateTimeOffset?.DateTime ?? DateTime.Now
                    });
                }

                _logger.LogInfo($"画像ファイル一覧取得: {images.Count}件");
                return images;
            }
            catch (Exception ex)
            {
                _logger.LogError($"画像ファイル一覧取得エラー: {ex.Message}");
                throw;
            }
        }

        /// <summary>
        /// Google Drive画像の公開URLを取得
        /// </summary>
        public async Task<string> GetImagePublicUrlAsync(string fileId)
        {
            try
            {
                // ファイルの詳細情報を取得
                var request = _driveService.Files.Get(fileId);
                request.Fields = "webContentLink, webViewLink";
                var file = await request.ExecuteAsync();

                // WebContentLinkを返す（直接画像URLとして使える）
                _logger.LogInfo($"画像URL取得: {fileId}");
                return file.WebContentLink;
            }
            catch (Exception ex)
            {
                _logger.LogError($"画像URL取得エラー: {ex.Message}");
                throw;
            }
        }
    }

    /// <summary>
    /// バージョン情報
    /// </summary>
    public class VersionInfo
    {
        [JsonProperty("version_id")]
        public string VersionId { get; set; }

        [JsonProperty("timestamp")]
        public DateTime Timestamp { get; set; }

        [JsonProperty("message")]
        public string Message { get; set; }

        [JsonProperty("file_size")]
        public long FileSize { get; set; }

        [JsonProperty("created_by")]
        public string CreatedBy { get; set; }

        [JsonProperty("google_drive_file_id")]
        public string GoogleDriveFileId { get; set; }

        [JsonProperty("google_drive_url")]
        public string GoogleDriveUrl { get; set; }
    }

    /// <summary>
    /// Google Drive画像ファイル情報
    /// </summary>
    public class DriveImageInfo
    {
        [JsonProperty("file_id")]
        public string FileId { get; set; }

        [JsonProperty("file_name")]
        public string FileName { get; set; }

        [JsonProperty("mime_type")]
        public string MimeType { get; set; }

        [JsonProperty("thumbnail_link")]
        public string ThumbnailLink { get; set; }

        [JsonProperty("download_link")]
        public string DownloadLink { get; set; }

        [JsonProperty("file_size")]
        public long FileSize { get; set; }

        [JsonProperty("created_time")]
        public DateTime CreatedTime { get; set; }

        [JsonProperty("modified_time")]
        public DateTime ModifiedTime { get; set; }
    }
}
