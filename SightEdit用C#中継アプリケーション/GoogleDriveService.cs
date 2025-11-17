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
        /// フォルダ一覧を取得
        /// </summary>
        public async Task<List<DriveFileInfo>> GetFoldersAsync(string parentFolderId = "root")
        {
            try
            {
                var request = _driveService.Files.List();
                request.Q = $"'{parentFolderId}' in parents and trashed=false and mimeType='application/vnd.google-apps.folder'";
                request.Fields = "files(id, name, mimeType, modifiedTime, parents)";
                request.OrderBy = "name";

                var fileList = await request.ExecuteAsync();
                var folders = new List<DriveFileInfo>();

                foreach (var file in fileList.Files)
                {
                    folders.Add(new DriveFileInfo
                    {
                        Id = file.Id,
                        Name = file.Name,
                        MimeType = file.MimeType,
                        ModifiedTime = file.ModifiedTimeDateTimeOffset?.DateTime,
                        Parents = file.Parents?.ToList(),
                        IsFolder = true
                    });
                }

                _logger.LogInfo($"フォルダ一覧取得: {folders.Count}件 (親: {parentFolderId})");
                return folders;
            }
            catch (Exception ex)
            {
                _logger.LogError($"フォルダ一覧取得エラー: {ex.Message}");
                throw;
            }
        }

        /// <summary>
        /// 画像ファイル一覧を取得
        /// </summary>
        public async Task<List<DriveFileInfo>> GetImagesAsync(string parentFolderId = "root")
        {
            try
            {
                var request = _driveService.Files.List();
                request.Q = $"'{parentFolderId}' in parents and trashed=false and (mimeType contains 'image/')";
                request.Fields = "files(id, name, mimeType, size, modifiedTime, thumbnailLink, webContentLink, parents)";
                request.OrderBy = "name";

                var fileList = await request.ExecuteAsync();
                var images = new List<DriveFileInfo>();

                foreach (var file in fileList.Files)
                {
                    images.Add(new DriveFileInfo
                    {
                        Id = file.Id,
                        Name = file.Name,
                        MimeType = file.MimeType,
                        Size = file.Size ?? 0,
                        ModifiedTime = file.ModifiedTimeDateTimeOffset?.DateTime,
                        ThumbnailLink = file.ThumbnailLink,
                        WebContentLink = file.WebContentLink,
                        Parents = file.Parents?.ToList(),
                        IsFolder = false
                    });
                }

                _logger.LogInfo($"画像一覧取得: {images.Count}件 (親: {parentFolderId})");
                return images;
            }
            catch (Exception ex)
            {
                _logger.LogError($"画像一覧取得エラー: {ex.Message}");
                throw;
            }
        }

        /// <summary>
        /// ファイルまたはフォルダの詳細情報を取得
        /// </summary>
        public async Task<List<DriveFileInfo>> GetFilesAndFoldersAsync(string parentFolderId = "root")
        {
            try
            {
                var request = _driveService.Files.List();
                request.Q = $"'{parentFolderId}' in parents and trashed=false";
                request.Fields = "files(id, name, mimeType, size, modifiedTime, thumbnailLink, webContentLink, parents)";
                request.OrderBy = "folder,name";

                var fileList = await request.ExecuteAsync();
                var items = new List<DriveFileInfo>();

                foreach (var file in fileList.Files)
                {
                    var isFolder = file.MimeType == "application/vnd.google-apps.folder";
                    var isImage = file.MimeType?.StartsWith("image/") == true;

                    items.Add(new DriveFileInfo
                    {
                        Id = file.Id,
                        Name = file.Name,
                        MimeType = file.MimeType,
                        Size = file.Size ?? 0,
                        ModifiedTime = file.ModifiedTimeDateTimeOffset?.DateTime,
                        ThumbnailLink = file.ThumbnailLink,
                        WebContentLink = file.WebContentLink,
                        Parents = file.Parents?.ToList(),
                        IsFolder = isFolder,
                        IsImage = isImage
                    });
                }

                _logger.LogInfo($"ファイル・フォルダ一覧取得: {items.Count}件 (親: {parentFolderId})");
                return items;
            }
            catch (Exception ex)
            {
                _logger.LogError($"ファイル・フォルダ一覧取得エラー: {ex.Message}");
                throw;
            }
        }

        /// <summary>
        /// ファイルの共有リンクを取得
        /// </summary>
        public async Task<string> GetSharableLinkAsync(string fileId)
        {
            try
            {
                // ファイルを一般公開に設定
                var permission = new Permission()
                {
                    Role = "reader",
                    Type = "anyone"
                };

                await _driveService.Permissions.Create(permission, fileId).ExecuteAsync();

                // ファイル情報を取得（webViewLink、webContentLinkを含む）
                var fileRequest = _driveService.Files.Get(fileId);
                fileRequest.Fields = "webViewLink,webContentLink";
                var file = await fileRequest.ExecuteAsync();

                _logger.LogInfo($"共有リンク取得: {fileId}");
                
                // 直接アクセス可能なリンクを返す（画像の場合）
                return file.WebContentLink ?? file.WebViewLink;
            }
            catch (Exception ex)
            {
                _logger.LogError($"共有リンク取得エラー: {ex.Message}");
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
    /// Google Driveファイル情報
    /// </summary>
    public class DriveFileInfo
    {
        [JsonProperty("id")]
        public string Id { get; set; }

        [JsonProperty("name")]
        public string Name { get; set; }

        [JsonProperty("mimeType")]
        public string MimeType { get; set; }

        [JsonProperty("size")]
        public long Size { get; set; }

        [JsonProperty("modifiedTime")]
        public DateTime? ModifiedTime { get; set; }

        [JsonProperty("thumbnailLink")]
        public string ThumbnailLink { get; set; }

        [JsonProperty("webContentLink")]
        public string WebContentLink { get; set; }

        [JsonProperty("parents")]
        public List<string> Parents { get; set; }

        [JsonProperty("isFolder")]
        public bool IsFolder { get; set; }

        [JsonProperty("isImage")]
        public bool IsImage { get; set; }

        [JsonProperty("sizeFormatted")]
        public string SizeFormatted => FormatFileSize(Size);

        [JsonProperty("modifiedTimeFormatted")]
        public string ModifiedTimeFormatted => ModifiedTime?.ToString("yyyy/MM/dd HH:mm") ?? "";

        private static string FormatFileSize(long bytes)
        {
            string[] sizes = { "B", "KB", "MB", "GB" };
            int order = 0;
            double size = bytes;
            while (size >= 1024 && order < sizes.Length - 1)
            {
                order++;
                size /= 1024;
            }
            return $"{size:0.#} {sizes[order]}";
        }
    }
}
