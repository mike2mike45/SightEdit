/**
 * Feature Inventory Manager
 * 機能カタログ管理サービス
 */

import FeatureMetadataModel from '../models/feature-metadata.js';
import { DocumentationError, ErrorCode, Result } from '../utils/error-codes.js';
import { Logger } from '../utils/logger.js';

class FeatureInventoryManager {
  constructor(storageAdapter) {
    this.storage = storageAdapter;
    this.logger = new Logger('FeatureInventoryManager');
    this.STORAGE_KEY = 'featureInventory';
  }

  /**
   * 機能を登録
   * @param {Object} featureData - 機能データ
   * @returns {Promise<Result>}
   */
  async registerFeature(featureData) {
    try {
      // メタデータを作成
      const metadata = FeatureMetadataModel.create(featureData);

      // 検証
      const validation = FeatureMetadataModel.validate(metadata);
      if (!validation.valid) {
        this.logger.warn('Feature validation failed', { errors: validation.errors });
        return Result.failure(
          new DocumentationError(ErrorCode.INVALID_INPUT, validation.errors.join(', '))
        );
      }

      // インベントリを取得
      const inventory = await this.getInventory();

      // 重複チェック
      if (inventory.features[metadata.id]) {
        this.logger.warn('Duplicate feature detected', { id: metadata.id });
        return Result.failure(
          new DocumentationError(ErrorCode.DUPLICATE_FEATURE, `Feature ${metadata.id} already exists`)
        );
      }

      // 循環依存チェック
      if (metadata.dependencies.length > 0) {
        const hasCycle = await this.checkCircularDependency(metadata.id, metadata.dependencies, inventory);
        if (hasCycle) {
          this.logger.error(ErrorCode.CIRCULAR_DEPENDENCY, new Error('Circular dependency detected'), {
            featureId: metadata.id,
            dependencies: metadata.dependencies
          });
          return Result.failure(
            new DocumentationError(ErrorCode.CIRCULAR_DEPENDENCY, 'Circular dependency detected')
          );
        }
      }

      // 機能を追加
      inventory.features[metadata.id] = metadata;

      // カテゴリに追加
      if (!inventory.categories[metadata.category]) {
        inventory.categories[metadata.category] = [];
      }
      if (!inventory.categories[metadata.category].includes(metadata.id)) {
        inventory.categories[metadata.category].push(metadata.id);
      }

      // 保存
      inventory.lastSync = new Date().toISOString();
      await this.storage.set(this.STORAGE_KEY, inventory);

      this.logger.info('Feature registered successfully', { id: metadata.id, name: metadata.name });
      return Result.success(metadata);

    } catch (error) {
      this.logger.error(ErrorCode.DATABASE_ERROR, error);
      return Result.failure(error);
    }
  }

  /**
   * 機能を更新
   * @param {string} featureId - 機能ID
   * @param {Object} updates - 更新データ
   * @returns {Promise<Result>}
   */
  async updateFeature(featureId, updates) {
    try {
      const inventory = await this.getInventory();

      if (!inventory.features[featureId]) {
        return Result.failure(
          new DocumentationError(ErrorCode.FEATURE_NOT_FOUND, `Feature ${featureId} not found`)
        );
      }

      const existingFeature = inventory.features[featureId];
      const updatedFeature = {
        ...existingFeature,
        ...updates,
        id: featureId, // IDは変更不可
        lastUpdated: new Date().toISOString()
      };

      // 検証
      const validation = FeatureMetadataModel.validate(updatedFeature);
      if (!validation.valid) {
        return Result.failure(
          new DocumentationError(ErrorCode.INVALID_INPUT, validation.errors.join(', '))
        );
      }

      // カテゴリが変更された場合
      if (existingFeature.category !== updatedFeature.category) {
        // 古いカテゴリから削除
        inventory.categories[existingFeature.category] =
          inventory.categories[existingFeature.category].filter(id => id !== featureId);

        // 新しいカテゴリに追加
        if (!inventory.categories[updatedFeature.category]) {
          inventory.categories[updatedFeature.category] = [];
        }
        inventory.categories[updatedFeature.category].push(featureId);
      }

      inventory.features[featureId] = updatedFeature;
      inventory.lastSync = new Date().toISOString();
      await this.storage.set(this.STORAGE_KEY, inventory);

      this.logger.info('Feature updated successfully', { id: featureId });
      return Result.success(updatedFeature);

    } catch (error) {
      this.logger.error(ErrorCode.DATABASE_ERROR, error);
      return Result.failure(error);
    }
  }

  /**
   * 機能を取得
   * @param {string} featureId - 機能ID
   * @returns {Promise<Result>}
   */
  async getFeature(featureId) {
    try {
      const inventory = await this.getInventory();
      const feature = inventory.features[featureId];

      if (!feature) {
        return Result.failure(
          new DocumentationError(ErrorCode.FEATURE_NOT_FOUND, `Feature ${featureId} not found`)
        );
      }

      return Result.success(feature);

    } catch (error) {
      this.logger.error(ErrorCode.DATABASE_ERROR, error);
      return Result.failure(error);
    }
  }

  /**
   * すべての機能を取得
   * @returns {Promise<Result>}
   */
  async getAllFeatures() {
    try {
      const inventory = await this.getInventory();
      const features = Object.values(inventory.features);
      return Result.success(features);

    } catch (error) {
      this.logger.error(ErrorCode.DATABASE_ERROR, error);
      return Result.failure(error);
    }
  }

  /**
   * カテゴリ別に機能を取得
   * @param {string} category - カテゴリ名
   * @returns {Promise<Result>}
   */
  async getFeaturesByCategory(category) {
    try {
      const inventory = await this.getInventory();
      const featureIds = inventory.categories[category] || [];
      const features = featureIds.map(id => inventory.features[id]).filter(Boolean);

      return Result.success(features);

    } catch (error) {
      this.logger.error(ErrorCode.DATABASE_ERROR, error);
      return Result.failure(error);
    }
  }

  /**
   * 機能を削除
   * @param {string} featureId - 機能ID
   * @returns {Promise<Result>}
   */
  async deleteFeature(featureId) {
    try {
      const inventory = await this.getInventory();

      if (!inventory.features[featureId]) {
        return Result.failure(
          new DocumentationError(ErrorCode.FEATURE_NOT_FOUND, `Feature ${featureId} not found`)
        );
      }

      const feature = inventory.features[featureId];

      // カテゴリから削除
      inventory.categories[feature.category] =
        inventory.categories[feature.category].filter(id => id !== featureId);

      // 機能を削除
      delete inventory.features[featureId];

      inventory.lastSync = new Date().toISOString();
      await this.storage.set(this.STORAGE_KEY, inventory);

      this.logger.info('Feature deleted successfully', { id: featureId });
      return Result.success(null);

    } catch (error) {
      this.logger.error(ErrorCode.DATABASE_ERROR, error);
      return Result.failure(error);
    }
  }

  /**
   * 依存関係グラフを生成
   * @returns {Promise<Result>}
   */
  async generateDependencyGraph() {
    try {
      const inventory = await this.getInventory();
      const graph = {};

      Object.entries(inventory.features).forEach(([id, feature]) => {
        graph[id] = {
          name: feature.name,
          dependencies: feature.dependencies,
          dependents: []
        };
      });

      // 逆依存関係を追加
      Object.entries(graph).forEach(([id, node]) => {
        node.dependencies.forEach(depId => {
          if (graph[depId]) {
            graph[depId].dependents.push(id);
          }
        });
      });

      return Result.success(graph);

    } catch (error) {
      this.logger.error(ErrorCode.DATABASE_ERROR, error);
      return Result.failure(error);
    }
  }

  /**
   * 循環依存をチェック
   * @private
   */
  async checkCircularDependency(featureId, dependencies, inventory) {
    const visited = new Set();
    const stack = new Set();

    const dfs = (id) => {
      if (stack.has(id)) return true; // 循環検出
      if (visited.has(id)) return false;

      visited.add(id);
      stack.add(id);

      const feature = inventory.features[id];
      if (feature && feature.dependencies) {
        for (const depId of feature.dependencies) {
          if (dfs(depId)) return true;
        }
      }

      stack.delete(id);
      return false;
    };

    for (const depId of dependencies) {
      if (dfs(depId)) return true;
    }

    return false;
  }

  /**
   * インベントリを取得
   * @private
   */
  async getInventory() {
    const inventory = await this.storage.get(this.STORAGE_KEY);
    return inventory || FeatureMetadataModel.createEmptyInventory();
  }
}

export default FeatureInventoryManager;
