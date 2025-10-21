using System;
using System.IO;
using Newtonsoft.Json;

namespace SightEditRelay
{
    /// <summary>
    /// 設定管理クラス
    /// </summary>
    public class Settings
    {
        [JsonProperty("version_history")]
        public VersionHistorySettings VersionHistory { get; set; }

        [JsonProperty("google_api")]
        public GoogleApiSettings GoogleApi { get; set; }

        [JsonProperty("ui")]
        public UiSettings Ui { get; set; }

        public static Settings LoadFromFile(string settingsPath)
        {
            try
            {
                if (File.Exists(settingsPath))
                {
                    var json = File.ReadAllText(settingsPath);
                    return JsonConvert.DeserializeObject<Settings>(json);
                }
                else
                {
                    // デフォルト設定を作成
                    var defaultSettings = CreateDefault();
                    defaultSettings.SaveToFile(settingsPath);
                    return defaultSettings;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"設定ファイル読み込みエラー: {ex.Message}");
                return CreateDefault();
            }
        }

        public void SaveToFile(string settingsPath)
        {
            try
            {
                var directory = Path.GetDirectoryName(settingsPath);
                if (!Directory.Exists(directory))
                {
                    Directory.CreateDirectory(directory);
                }

                var json = JsonConvert.SerializeObject(this, Formatting.Indented);
                File.WriteAllText(settingsPath, json);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"設定ファイル保存エラー: {ex.Message}");
            }
        }

        private static Settings CreateDefault()
        {
            return new Settings
            {
                VersionHistory = new VersionHistorySettings
                {
                    Enabled = true,
                    AutoSaveEnabled = true,
                    AutoSaveIntervalSeconds = 300,
                    MaxLocalVersions = 10,
                    DriveFolderName = "SightEdit Version History"
                },
                GoogleApi = new GoogleApiSettings
                {
                    RetryAttempts = 3,
                    RequestTimeoutSeconds = 30,
                    RateLimitPerHour = 1000
                },
                Ui = new UiSettings
                {
                    ShowVersionPanel = true,
                    ConfirmRestore = true,
                    ShowDiffOnRestore = true
                }
            };
        }
    }

    public class VersionHistorySettings
    {
        [JsonProperty("enabled")]
        public bool Enabled { get; set; }

        [JsonProperty("auto_save_enabled")]
        public bool AutoSaveEnabled { get; set; }

        [JsonProperty("auto_save_interval_seconds")]
        public int AutoSaveIntervalSeconds { get; set; }

        [JsonProperty("max_local_versions")]
        public int MaxLocalVersions { get; set; }

        [JsonProperty("drive_folder_name")]
        public string DriveFolderName { get; set; }
    }

    public class GoogleApiSettings
    {
        [JsonProperty("retry_attempts")]
        public int RetryAttempts { get; set; }

        [JsonProperty("request_timeout_seconds")]
        public int RequestTimeoutSeconds { get; set; }

        [JsonProperty("rate_limit_per_hour")]
        public int RateLimitPerHour { get; set; }
    }

    public class UiSettings
    {
        [JsonProperty("show_version_panel")]
        public bool ShowVersionPanel { get; set; }

        [JsonProperty("confirm_restore")]
        public bool ConfirmRestore { get; set; }

        [JsonProperty("show_diff_on_restore")]
        public bool ShowDiffOnRestore { get; set; }
    }
}
