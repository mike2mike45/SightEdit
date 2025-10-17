/**
 * エラーコード定義
 * Documentation System Error Codes
 */

const ErrorCode = {
  // User Errors (001-099)
  INVALID_INPUT: 'DOC_ERR_001',
  FEATURE_NOT_FOUND: 'DOC_ERR_002',
  DUPLICATE_FEATURE: 'DOC_ERR_003',
  INVALID_CATEGORY: 'DOC_ERR_004',
  INVALID_STATUS: 'DOC_ERR_005',

  // System Errors (101-199)
  STORAGE_QUOTA_EXCEEDED: 'DOC_ERR_101',
  ANALYSIS_TIMEOUT: 'DOC_ERR_102',
  EXTERNAL_API_FAILURE: 'DOC_ERR_103',
  DATABASE_ERROR: 'DOC_ERR_104',
  INITIALIZATION_FAILED: 'DOC_ERR_105',

  // Business Logic Errors (201-299)
  CIRCULAR_DEPENDENCY: 'DOC_ERR_201',
  INSUFFICIENT_DATA: 'DOC_ERR_202',
  CONFLICTING_PRIORITIES: 'DOC_ERR_203',
  VALIDATION_FAILED: 'DOC_ERR_204',
  MIGRATION_FAILED: 'DOC_ERR_205'
};

/**
 * エラーメッセージテンプレート
 */
const ErrorMessages = {
  [ErrorCode.INVALID_INPUT]: '入力データが不正です',
  [ErrorCode.FEATURE_NOT_FOUND]: '機能が見つかりません',
  [ErrorCode.DUPLICATE_FEATURE]: 'この機能は既に登録されています',
  [ErrorCode.INVALID_CATEGORY]: '無効なカテゴリです',
  [ErrorCode.INVALID_STATUS]: '無効なステータスです',

  [ErrorCode.STORAGE_QUOTA_EXCEEDED]: 'ストレージ容量を超過しました',
  [ErrorCode.ANALYSIS_TIMEOUT]: '分析処理がタイムアウトしました',
  [ErrorCode.EXTERNAL_API_FAILURE]: '外部API呼び出しに失敗しました',
  [ErrorCode.DATABASE_ERROR]: 'データベースエラーが発生しました',
  [ErrorCode.INITIALIZATION_FAILED]: 'システムの初期化に失敗しました',

  [ErrorCode.CIRCULAR_DEPENDENCY]: '循環依存が検出されました',
  [ErrorCode.INSUFFICIENT_DATA]: '分析に必要なデータが不足しています',
  [ErrorCode.CONFLICTING_PRIORITIES]: '優先順位の競合が発生しています',
  [ErrorCode.VALIDATION_FAILED]: 'データ検証に失敗しました',
  [ErrorCode.MIGRATION_FAILED]: 'データマイグレーションに失敗しました'
};

/**
 * カスタムエラークラス
 */
class DocumentationError extends Error {
  constructor(code, message, context = {}) {
    super(message || ErrorMessages[code] || 'Unknown error');
    this.name = 'DocumentationError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp
    };
  }
}

/**
 * Result型（型安全なエラー処理）
 * @template T
 * @template E
 */
class Result {
  constructor(ok, value, error) {
    this.ok = ok;
    this.value = value;
    this.error = error;
  }

  static success(value) {
    return new Result(true, value, null);
  }

  static failure(error) {
    return new Result(false, null, error);
  }

  isSuccess() {
    return this.ok;
  }

  isFailure() {
    return !this.ok;
  }

  getValue() {
    if (!this.ok) {
      throw new Error('Cannot get value from a failure result');
    }
    return this.value;
  }

  getError() {
    if (this.ok) {
      throw new Error('Cannot get error from a success result');
    }
    return this.error;
  }
}

export { ErrorCode, ErrorMessages, DocumentationError, Result };
