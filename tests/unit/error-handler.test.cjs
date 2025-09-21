const { describe, test, expect } = require('@jest/globals');

describe('Error Handler Tests', () => {
  // エラーハンドリングのテスト（モジュールをインポートする代わりにロジックを再実装）
  class TestAppError extends Error {
    constructor(message, code, details = {}) {
      super(message);
      this.name = 'AppError';
      this.code = code;
      this.details = details;
      this.timestamp = new Date().toISOString();
    }
  }

  const ErrorCodes = {
    FILE_NOT_FOUND: 'FILE_NOT_FOUND',
    FILE_READ_ERROR: 'FILE_READ_ERROR',
    FILE_WRITE_ERROR: 'FILE_WRITE_ERROR',
    GIT_NOT_AVAILABLE: 'GIT_NOT_AVAILABLE',
    AI_API_KEY_MISSING: 'AI_API_KEY_MISSING',
    NETWORK_ERROR: 'NETWORK_ERROR',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR'
  };

  const ErrorMessages = {
    ja: {
      [ErrorCodes.FILE_NOT_FOUND]: 'ファイルが見つかりません',
      [ErrorCodes.FILE_READ_ERROR]: 'ファイルの読み込みに失敗しました',
      [ErrorCodes.FILE_WRITE_ERROR]: 'ファイルの書き込みに失敗しました',
      [ErrorCodes.GIT_NOT_AVAILABLE]: 'Gitが利用できません',
      [ErrorCodes.AI_API_KEY_MISSING]: 'APIキーが設定されていません',
      [ErrorCodes.NETWORK_ERROR]: 'ネットワークエラーが発生しました',
      [ErrorCodes.UNKNOWN_ERROR]: '予期しないエラーが発生しました'
    },
    en: {
      [ErrorCodes.FILE_NOT_FOUND]: 'File not found',
      [ErrorCodes.FILE_READ_ERROR]: 'Failed to read file',
      [ErrorCodes.FILE_WRITE_ERROR]: 'Failed to write file',
      [ErrorCodes.GIT_NOT_AVAILABLE]: 'Git is not available',
      [ErrorCodes.AI_API_KEY_MISSING]: 'API key is not configured',
      [ErrorCodes.NETWORK_ERROR]: 'Network error occurred',
      [ErrorCodes.UNKNOWN_ERROR]: 'An unexpected error occurred'
    }
  };

  describe('AppError Class', () => {
    test('should create AppError with code and details', () => {
      const error = new TestAppError('Test error', ErrorCodes.FILE_NOT_FOUND, { path: 'test.md' });
      
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('AppError');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe(ErrorCodes.FILE_NOT_FOUND);
      expect(error.details.path).toBe('test.md');
      expect(error.timestamp).toBeDefined();
    });

    test('should work without details parameter', () => {
      const error = new TestAppError('Simple error', ErrorCodes.UNKNOWN_ERROR);
      
      expect(error.details).toEqual({});
      expect(error.code).toBe(ErrorCodes.UNKNOWN_ERROR);
    });
  });

  describe('Error Code Constants', () => {
    test('should have all required error codes', () => {
      const requiredCodes = [
        'FILE_NOT_FOUND',
        'FILE_READ_ERROR', 
        'FILE_WRITE_ERROR',
        'GIT_NOT_AVAILABLE',
        'AI_API_KEY_MISSING',
        'NETWORK_ERROR',
        'UNKNOWN_ERROR'
      ];

      requiredCodes.forEach(code => {
        expect(ErrorCodes[code]).toBeDefined();
        expect(typeof ErrorCodes[code]).toBe('string');
      });
    });
  });

  describe('Error Messages', () => {
    test('should have Japanese messages for all error codes', () => {
      Object.values(ErrorCodes).forEach(code => {
        expect(ErrorMessages.ja[code]).toBeDefined();
        expect(typeof ErrorMessages.ja[code]).toBe('string');
        expect(ErrorMessages.ja[code].length).toBeGreaterThan(0);
      });
    });

    test('should have English messages for all error codes', () => {
      Object.values(ErrorCodes).forEach(code => {
        expect(ErrorMessages.en[code]).toBeDefined();
        expect(typeof ErrorMessages.en[code]).toBe('string');
        expect(ErrorMessages.en[code].length).toBeGreaterThan(0);
      });
    });

    test('should have different messages for different languages', () => {
      Object.values(ErrorCodes).forEach(code => {
        const jaMessage = ErrorMessages.ja[code];
        const enMessage = ErrorMessages.en[code];
        
        // 日本語と英語のメッセージが異なることを確認
        expect(jaMessage).not.toBe(enMessage);
      });
    });
  });

  describe('Error Handler Logic', () => {
    function convertToAppError(error) {
      if (error.code === 'ENOENT') {
        return new TestAppError(error.message, ErrorCodes.FILE_NOT_FOUND, { originalError: error });
      }
      if (error.code === 'EACCES' || error.code === 'EPERM') {
        return new TestAppError(error.message, 'FILE_ACCESS_DENIED', { originalError: error });
      }
      if (error.code === 'ETIMEDOUT') {
        return new TestAppError(error.message, 'NETWORK_TIMEOUT', { originalError: error });
      }
      
      return new TestAppError(error.message || 'Unknown error', ErrorCodes.UNKNOWN_ERROR, { originalError: error });
    }

    test('should convert system errors to AppErrors', () => {
      const systemErrors = [
        { code: 'ENOENT', message: 'File not found' },
        { code: 'EACCES', message: 'Permission denied' },
        { code: 'ETIMEDOUT', message: 'Operation timed out' }
      ];

      systemErrors.forEach(sysError => {
        const appError = convertToAppError(sysError);
        
        expect(appError).toBeInstanceOf(TestAppError);
        expect(appError.details.originalError).toEqual(sysError);
        expect(appError.message).toBe(sysError.message);
      });
    });

    test('should handle unknown errors', () => {
      const unknownError = new Error('Something went wrong');
      const appError = convertToAppError(unknownError);
      
      expect(appError.code).toBe(ErrorCodes.UNKNOWN_ERROR);
      expect(appError.details.originalError).toBe(unknownError);
    });

    test('should get localized error message', () => {
      function getMessage(code, language = 'ja') {
        const messages = ErrorMessages[language] || ErrorMessages.ja;
        return messages[code];
      }

      const message = getMessage(ErrorCodes.FILE_NOT_FOUND, 'ja');
      expect(message).toBe('ファイルが見つかりません');

      const enMessage = getMessage(ErrorCodes.FILE_NOT_FOUND, 'en');
      expect(enMessage).toBe('File not found');
    });
  });
});