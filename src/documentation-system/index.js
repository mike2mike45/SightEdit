/**
 * Documentation System Entry Point
 * ドキュメントシステムのメインエクスポート
 */

import ChromeStorageAdapter from './storage/chrome-storage-adapter.js';
import IndexedDBAdapter from './storage/indexeddb-adapter.js';
import FeatureMetadataModel from './models/feature-metadata.js';
import QualityMetricsModel from './models/quality-metrics.js';
import { ErrorCode, ErrorMessages, DocumentationError, Result } from './utils/error-codes.js';
import { Logger, LogLevel } from './utils/logger.js';

// Storage層
export { ChromeStorageAdapter, IndexedDBAdapter };

// モデル層
export { FeatureMetadataModel, QualityMetricsModel };

// ユーティリティ
export { ErrorCode, ErrorMessages, DocumentationError, Result };
export { Logger, LogLevel };

/**
 * ドキュメントシステムの初期化
 * @returns {Promise<Object>} 初期化されたシステムインスタンス
 */
export async function initializeDocumentationSystem() {
  const logger = new Logger('DocumentationSystem');

  try {
    logger.info('Initializing Documentation System...');

    // ストレージアダプターの初期化
    const chromeStorage = new ChromeStorageAdapter();
    const indexedDB = new IndexedDBAdapter();
    await indexedDB.init();

    // 初期データ構造のセットアップ
    const existingInventory = await chromeStorage.get('featureInventory');
    if (!existingInventory) {
      const emptyInventory = FeatureMetadataModel.createEmptyInventory();
      await chromeStorage.set('featureInventory', emptyInventory);
      logger.info('Created empty feature inventory');
    }

    const existingMetrics = await chromeStorage.get('qualityMetrics');
    if (!existingMetrics) {
      const emptyMetrics = QualityMetricsModel.createEmptyMetrics();
      await chromeStorage.set('qualityMetrics', emptyMetrics);
      logger.info('Created empty quality metrics');
    }

    logger.info('Documentation System initialized successfully');

    return {
      storage: {
        chrome: chromeStorage,
        indexedDB: indexedDB
      },
      logger
    };
  } catch (error) {
    logger.error(ErrorCode.INITIALIZATION_FAILED, error);
    throw new DocumentationError(ErrorCode.INITIALIZATION_FAILED, error.message);
  }
}

// デフォルトエクスポート
export default {
  initializeDocumentationSystem,
  ChromeStorageAdapter,
  IndexedDBAdapter,
  FeatureMetadataModel,
  QualityMetricsModel,
  ErrorCode,
  DocumentationError,
  Result,
  Logger,
  LogLevel
};
