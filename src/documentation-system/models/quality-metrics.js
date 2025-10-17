/**
 * 品質メトリクスモデル
 * Quality Metrics Schema
 */

/**
 * 技術債務レベル
 * @typedef {'Critical' | 'High' | 'Medium' | 'Low'} TechnicalDebtLevel
 */

/**
 * 品質メトリクス
 * @typedef {Object} QualityMetrics
 * @property {string} featureId - 対象機能ID
 * @property {number} codeQuality - コード品質スコア（1-10）
 * @property {number} testCoverage - テストカバレッジ（0-100%）
 * @property {number} securityScore - セキュリティスコア（1-10）
 * @property {number} performanceScore - パフォーマンススコア（1-10）
 * @property {number} userSatisfaction - ユーザー満足度スコア（1-10）
 * @property {TechnicalDebtLevel} technicalDebtLevel - 技術債務レベル
 * @property {string} measuredAt - 測定日時（ISO 8601）
 */

/**
 * 品質メトリクスデータ
 * @typedef {Object} QualityMetricsData
 * @property {Object.<string, QualityMetrics>} metrics - メトリクスマップ
 */

class QualityMetricsModel {
  /**
   * 新しい品質メトリクスを作成
   * @param {Object} data - メトリクスデータ
   * @returns {QualityMetrics}
   */
  static create(data) {
    const now = new Date().toISOString();

    return {
      featureId: data.featureId || '',
      codeQuality: data.codeQuality || 5,
      testCoverage: data.testCoverage || 0,
      securityScore: data.securityScore || 5,
      performanceScore: data.performanceScore || 5,
      userSatisfaction: data.userSatisfaction || 5,
      technicalDebtLevel: data.technicalDebtLevel || 'Medium',
      measuredAt: now
    };
  }

  /**
   * 総合品質スコアを計算
   * @param {QualityMetrics} metrics
   * @returns {number} 総合スコア（1-10）
   */
  static calculateOverallScore(metrics) {
    const weights = {
      codeQuality: 0.25,
      testCoverage: 0.20,
      securityScore: 0.25,
      performanceScore: 0.20,
      userSatisfaction: 0.10
    };

    // テストカバレッジを1-10スケールに変換
    const normalizedCoverage = (metrics.testCoverage / 100) * 10;

    const weightedScore =
      (metrics.codeQuality * weights.codeQuality) +
      (normalizedCoverage * weights.testCoverage) +
      (metrics.securityScore * weights.securityScore) +
      (metrics.performanceScore * weights.performanceScore) +
      (metrics.userSatisfaction * weights.userSatisfaction);

    return Math.round(weightedScore * 10) / 10;
  }

  /**
   * 技術債務レベルを決定
   * @param {QualityMetrics} metrics
   * @returns {TechnicalDebtLevel}
   */
  static determineTechnicalDebtLevel(metrics) {
    const overallScore = this.calculateOverallScore(metrics);

    if (overallScore >= 8) return 'Low';
    if (overallScore >= 6) return 'Medium';
    if (overallScore >= 4) return 'High';
    return 'Critical';
  }

  /**
   * 品質メトリクスを検証
   * @param {QualityMetrics} metrics
   * @returns {{valid: boolean, errors: string[]}}
   */
  static validate(metrics) {
    const errors = [];

    if (!metrics.featureId || typeof metrics.featureId !== 'string') {
      errors.push('Feature ID is required and must be a string');
    }

    const scoreFields = ['codeQuality', 'securityScore', 'performanceScore', 'userSatisfaction'];
    scoreFields.forEach(field => {
      if (typeof metrics[field] !== 'number' || metrics[field] < 1 || metrics[field] > 10) {
        errors.push(`${field} must be a number between 1 and 10`);
      }
    });

    if (typeof metrics.testCoverage !== 'number' || metrics.testCoverage < 0 || metrics.testCoverage > 100) {
      errors.push('Test coverage must be a number between 0 and 100');
    }

    const validDebtLevels = ['Critical', 'High', 'Medium', 'Low'];
    if (!validDebtLevels.includes(metrics.technicalDebtLevel)) {
      errors.push(`Technical debt level must be one of: ${validDebtLevels.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 空のメトリクスデータを作成
   * @returns {QualityMetricsData}
   */
  static createEmptyMetrics() {
    return {
      metrics: {}
    };
  }
}

export default QualityMetricsModel;
