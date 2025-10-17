/**
 * 機能メタデータモデル
 * Feature Metadata Schema
 */

/**
 * 機能カテゴリ
 * @typedef {'Editor' | 'AI' | 'Extension' | 'Storage' | 'UI'} FeatureCategory
 */

/**
 * 実装ステータス
 * @typedef {'Implemented' | 'Partial' | 'Planned'} ImplementationStatus
 */

/**
 * 使用頻度
 * @typedef {'High' | 'Medium' | 'Low'} UsageFrequency
 */

/**
 * 機能メタデータ
 * @typedef {Object} FeatureMetadata
 * @property {string} id - ユニークな機能ID（UUID v4）
 * @property {string} name - 機能名
 * @property {FeatureCategory} category - 機能カテゴリ
 * @property {string} description - 機能の説明
 * @property {ImplementationStatus} implementationStatus - 実装状況
 * @property {number} qualityScore - 品質スコア（1-10）
 * @property {UsageFrequency} usageFrequency - 使用頻度
 * @property {string} lastUpdated - 最終更新日時（ISO 8601）
 * @property {string[]} dependencies - 依存する機能IDの配列
 */

/**
 * 機能インベントリデータ
 * @typedef {Object} FeatureInventoryData
 * @property {Object.<string, FeatureMetadata>} features - 機能マップ
 * @property {Object.<string, string[]>} categories - カテゴリ別機能ID配列
 * @property {string} lastSync - 最終同期日時（ISO 8601）
 */

class FeatureMetadataModel {
  /**
   * 新しい機能メタデータを作成
   * @param {Object} data - 機能データ
   * @returns {FeatureMetadata}
   */
  static create(data) {
    const now = new Date().toISOString();

    return {
      id: data.id || this.generateId(),
      name: data.name || '',
      category: data.category || 'Extension',
      description: data.description || '',
      implementationStatus: data.implementationStatus || 'Planned',
      qualityScore: data.qualityScore || 5,
      usageFrequency: data.usageFrequency || 'Medium',
      lastUpdated: now,
      dependencies: data.dependencies || []
    };
  }

  /**
   * UUID v4を生成
   * @returns {string}
   */
  static generateId() {
    return 'feat-' + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * 機能メタデータを検証
   * @param {FeatureMetadata} metadata
   * @returns {{valid: boolean, errors: string[]}}
   */
  static validate(metadata) {
    const errors = [];

    if (!metadata.id || typeof metadata.id !== 'string') {
      errors.push('ID is required and must be a string');
    }

    if (!metadata.name || typeof metadata.name !== 'string') {
      errors.push('Name is required and must be a string');
    }

    const validCategories = ['Editor', 'AI', 'Extension', 'Storage', 'UI'];
    if (!validCategories.includes(metadata.category)) {
      errors.push(`Category must be one of: ${validCategories.join(', ')}`);
    }

    const validStatuses = ['Implemented', 'Partial', 'Planned'];
    if (!validStatuses.includes(metadata.implementationStatus)) {
      errors.push(`Implementation status must be one of: ${validStatuses.join(', ')}`);
    }

    if (typeof metadata.qualityScore !== 'number' || metadata.qualityScore < 1 || metadata.qualityScore > 10) {
      errors.push('Quality score must be a number between 1 and 10');
    }

    const validFrequencies = ['High', 'Medium', 'Low'];
    if (!validFrequencies.includes(metadata.usageFrequency)) {
      errors.push(`Usage frequency must be one of: ${validFrequencies.join(', ')}`);
    }

    if (!Array.isArray(metadata.dependencies)) {
      errors.push('Dependencies must be an array');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 空のインベントリデータを作成
   * @returns {FeatureInventoryData}
   */
  static createEmptyInventory() {
    return {
      features: {},
      categories: {
        'Editor': [],
        'AI': [],
        'Extension': [],
        'Storage': [],
        'UI': []
      },
      lastSync: new Date().toISOString()
    };
  }
}

export default FeatureMetadataModel;
