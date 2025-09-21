/**
 * 統一エラーハンドリングシステム
 */

export class AppError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

// エラーコード定義
export const ErrorCodes = {
  // ファイル関連
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_READ_ERROR: 'FILE_READ_ERROR',
  FILE_WRITE_ERROR: 'FILE_WRITE_ERROR',
  FILE_INVALID_FORMAT: 'FILE_INVALID_FORMAT',
  FILE_ACCESS_DENIED: 'FILE_ACCESS_DENIED',
  FILE_INVALID_PATH: 'FILE_INVALID_PATH',
  
  // Git関連
  GIT_NOT_AVAILABLE: 'GIT_NOT_AVAILABLE',
  GIT_REPO_NOT_FOUND: 'GIT_REPO_NOT_FOUND',
  GIT_COMMIT_FAILED: 'GIT_COMMIT_FAILED',
  GIT_PUSH_FAILED: 'GIT_PUSH_FAILED',
  GIT_PULL_FAILED: 'GIT_PULL_FAILED',
  
  // AI関連
  AI_API_KEY_MISSING: 'AI_API_KEY_MISSING',
  AI_API_ERROR: 'AI_API_ERROR',
  AI_RATE_LIMIT: 'AI_RATE_LIMIT',
  AI_INVALID_RESPONSE: 'AI_INVALID_RESPONSE',
  
  // ネットワーク関連
  NETWORK_ERROR: 'NETWORK_ERROR',
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  
  // アップデート関連
  UPDATE_CHECK_FAILED: 'UPDATE_CHECK_FAILED',
  UPDATE_DOWNLOAD_FAILED: 'UPDATE_DOWNLOAD_FAILED',
  UPDATE_SIGNATURE_INVALID: 'UPDATE_SIGNATURE_INVALID',
  
  // その他
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED'
};

// エラーメッセージ国際化
export const ErrorMessages = {
  ja: {
    [ErrorCodes.FILE_NOT_FOUND]: 'ファイルが見つかりません',
    [ErrorCodes.FILE_READ_ERROR]: 'ファイルの読み込みに失敗しました',
    [ErrorCodes.FILE_WRITE_ERROR]: 'ファイルの書き込みに失敗しました',
    [ErrorCodes.FILE_INVALID_FORMAT]: 'サポートされていないファイル形式です',
    [ErrorCodes.FILE_ACCESS_DENIED]: 'ファイルへのアクセスが拒否されました',
    [ErrorCodes.FILE_INVALID_PATH]: '無効なファイルパスです',
    [ErrorCodes.GIT_NOT_AVAILABLE]: 'Gitが利用できません',
    [ErrorCodes.GIT_REPO_NOT_FOUND]: 'Gitリポジトリが見つかりません',
    [ErrorCodes.GIT_COMMIT_FAILED]: 'コミットに失敗しました',
    [ErrorCodes.GIT_PUSH_FAILED]: 'プッシュに失敗しました',
    [ErrorCodes.GIT_PULL_FAILED]: 'プルに失敗しました',
    [ErrorCodes.AI_API_KEY_MISSING]: 'APIキーが設定されていません',
    [ErrorCodes.AI_API_ERROR]: 'AI APIエラーが発生しました',
    [ErrorCodes.AI_RATE_LIMIT]: 'APIレート制限に達しました',
    [ErrorCodes.AI_INVALID_RESPONSE]: 'AIからの応答が無効です',
    [ErrorCodes.NETWORK_ERROR]: 'ネットワークエラーが発生しました',
    [ErrorCodes.NETWORK_TIMEOUT]: 'ネットワークタイムアウトが発生しました',
    [ErrorCodes.UPDATE_CHECK_FAILED]: 'アップデートの確認に失敗しました',
    [ErrorCodes.UPDATE_DOWNLOAD_FAILED]: 'アップデートのダウンロードに失敗しました',
    [ErrorCodes.UPDATE_SIGNATURE_INVALID]: 'アップデートの署名が無効です',
    [ErrorCodes.UNKNOWN_ERROR]: '予期しないエラーが発生しました',
    [ErrorCodes.VALIDATION_ERROR]: '入力値が無効です',
    [ErrorCodes.PERMISSION_DENIED]: 'アクセス権限がありません'
  },
  en: {
    [ErrorCodes.FILE_NOT_FOUND]: 'File not found',
    [ErrorCodes.FILE_READ_ERROR]: 'Failed to read file',
    [ErrorCodes.FILE_WRITE_ERROR]: 'Failed to write file',
    [ErrorCodes.FILE_INVALID_FORMAT]: 'Unsupported file format',
    [ErrorCodes.FILE_ACCESS_DENIED]: 'File access denied',
    [ErrorCodes.FILE_INVALID_PATH]: 'Invalid file path',
    [ErrorCodes.GIT_NOT_AVAILABLE]: 'Git is not available',
    [ErrorCodes.GIT_REPO_NOT_FOUND]: 'Git repository not found',
    [ErrorCodes.GIT_COMMIT_FAILED]: 'Commit failed',
    [ErrorCodes.GIT_PUSH_FAILED]: 'Push failed',
    [ErrorCodes.GIT_PULL_FAILED]: 'Pull failed',
    [ErrorCodes.AI_API_KEY_MISSING]: 'API key is not configured',
    [ErrorCodes.AI_API_ERROR]: 'AI API error occurred',
    [ErrorCodes.AI_RATE_LIMIT]: 'API rate limit reached',
    [ErrorCodes.AI_INVALID_RESPONSE]: 'Invalid response from AI',
    [ErrorCodes.NETWORK_ERROR]: 'Network error occurred',
    [ErrorCodes.NETWORK_TIMEOUT]: 'Network timeout occurred',
    [ErrorCodes.UPDATE_CHECK_FAILED]: 'Failed to check for updates',
    [ErrorCodes.UPDATE_DOWNLOAD_FAILED]: 'Failed to download update',
    [ErrorCodes.UPDATE_SIGNATURE_INVALID]: 'Update signature is invalid',
    [ErrorCodes.UNKNOWN_ERROR]: 'An unexpected error occurred',
    [ErrorCodes.VALIDATION_ERROR]: 'Invalid input value',
    [ErrorCodes.PERMISSION_DENIED]: 'Permission denied'
  }
};

/**
 * エラーハンドラークラス
 */
export class ErrorHandler {
  constructor(language = 'ja') {
    this.language = language;
    this.errorLog = [];
    this.maxLogSize = 100;
  }

  /**
   * エラーを処理
   */
  handle(error, context = {}) {
    // エラーログに記録
    this.logError(error, context);

    // AppErrorでない場合は変換
    if (!(error instanceof AppError)) {
      error = this.convertToAppError(error);
    }

    // エラーメッセージを取得
    const message = this.getMessage(error.code) || error.message;

    return {
      success: false,
      error: {
        code: error.code,
        message,
        details: error.details,
        timestamp: error.timestamp
      }
    };
  }

  /**
   * 標準エラーをAppErrorに変換
   */
  convertToAppError(error) {
    // ファイルシステムエラー
    if (error.code === 'ENOENT') {
      return new AppError(error.message, ErrorCodes.FILE_NOT_FOUND, { originalError: error });
    }
    if (error.code === 'EACCES' || error.code === 'EPERM') {
      return new AppError(error.message, ErrorCodes.FILE_ACCESS_DENIED, { originalError: error });
    }
    
    // ネットワークエラー
    if (error.code === 'ETIMEDOUT') {
      return new AppError(error.message, ErrorCodes.NETWORK_TIMEOUT, { originalError: error });
    }
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return new AppError(error.message, ErrorCodes.NETWORK_ERROR, { originalError: error });
    }

    // デフォルト
    return new AppError(error.message || 'Unknown error', ErrorCodes.UNKNOWN_ERROR, { originalError: error });
  }

  /**
   * エラーメッセージを取得
   */
  getMessage(code) {
    const messages = ErrorMessages[this.language] || ErrorMessages.ja;
    return messages[code];
  }

  /**
   * エラーをログに記録
   */
  logError(error, context) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        code: error.code,
        stack: error.stack
      },
      context
    };

    this.errorLog.push(logEntry);

    // ログサイズ制限
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    // コンソールに出力（開発環境のみ）
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', logEntry);
    }
  }

  /**
   * エラーログを取得
   */
  getErrorLog() {
    return [...this.errorLog];
  }

  /**
   * エラーログをクリア
   */
  clearErrorLog() {
    this.errorLog = [];
  }

  /**
   * 言語を設定
   */
  setLanguage(language) {
    this.language = language;
  }
}

// シングルトンインスタンス
let errorHandler = null;

export function getErrorHandler(language = 'ja') {
  if (!errorHandler) {
    errorHandler = new ErrorHandler(language);
  }
  return errorHandler;
}

// 便利な関数
export function handleError(error, context = {}) {
  return getErrorHandler().handle(error, context);
}

export function createError(code, message, details = {}) {
  return new AppError(message, code, details);
}