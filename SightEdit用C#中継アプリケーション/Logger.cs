using System;
using System.IO;

namespace SightEditRelay
{
    /// <summary>
    /// ログ管理クラス
    /// </summary>
    public class Logger
    {
        private readonly string _logFilePath;
        private readonly object _lockObject = new object();

        public Logger(string logFilePath)
        {
            _logFilePath = logFilePath;

            // ログディレクトリが存在しない場合は作成
            var logDirectory = Path.GetDirectoryName(_logFilePath);
            if (!Directory.Exists(logDirectory))
            {
                Directory.CreateDirectory(logDirectory);
            }
        }

        /// <summary>
        /// 情報ログを出力
        /// </summary>
        public void LogInfo(string message)
        {
            WriteLog("INFO", message);
        }

        /// <summary>
        /// エラーログを出力
        /// </summary>
        public void LogError(string message)
        {
            WriteLog("ERROR", message);
        }

        /// <summary>
        /// 警告ログを出力
        /// </summary>
        public void LogWarning(string message)
        {
            WriteLog("WARNING", message);
        }

        /// <summary>
        /// デバッグログを出力
        /// </summary>
        public void LogDebug(string message)
        {
#if DEBUG
            WriteLog("DEBUG", message);
#endif
        }

        /// <summary>
        /// ログをファイルに書き込み
        /// </summary>
        private void WriteLog(string level, string message)
        {
            try
            {
                lock (_lockObject)
                {
                    var logEntry = $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] [{level}] {message}";
                    File.AppendAllText(_logFilePath, logEntry + Environment.NewLine);
                    Console.WriteLine(logEntry);
                }
            }
            catch
            {
                // ログ出力エラーは無視
            }
        }

        /// <summary>
        /// ログファイルをクリア
        /// </summary>
        public void ClearLog()
        {
            try
            {
                lock (_lockObject)
                {
                    if (File.Exists(_logFilePath))
                    {
                        File.Delete(_logFilePath);
                    }
                }
            }
            catch
            {
                // エラーは無視
            }
        }
    }
}
