/**
 * Change Impact Analyzer
 * コード変更前の影響分析と確認システム
 */

class ChangeImpactAnalyzer {
    constructor() {
        this.analysisTemplate = null;
        this.onConfirm = null;
        this.onCancel = null;
    }

    /**
     * 変更影響分析を実行
     * @param {Object} changeRequest - 変更要求
     * @param {Function} onConfirmCallback - 確認時のコールバック  
     * @param {Function} onCancelCallback - キャンセル時のコールバック
     */
    async analyzeChange(changeRequest, onConfirmCallback, onCancelCallback) {
        this.onConfirm = onConfirmCallback;
        this.onCancel = onCancelCallback;

        // 影響分析を実行
        const analysis = await this.performImpactAnalysis(changeRequest);
        
        // 確認ダイアログを表示
        this.showAnalysisDialog(analysis);
    }

    /**
     * 影響分析実行
     */
    async performImpactAnalysis(changeRequest) {
        const {
            title,
            description,
            targetFiles,
            changeType,
            newFeatures,
            modifiedFunctions,
            deletedFeatures,
            dependencies,
            estimatedLines
        } = changeRequest;

        return {
            title,
            description,
            changeDetails: {
                targetFiles: targetFiles || [],
                estimatedLines: estimatedLines || { added: 0, modified: 0, deleted: 0 },
                changeType: changeType || 'modification'
            },
            directImpacts: this.analyzeDirectImpacts(targetFiles, modifiedFunctions),
            potentialRisks: this.analyzePotentialRisks(changeType, targetFiles, dependencies),
            dependencies: this.analyzeDependencies(targetFiles, dependencies),
            testPlan: this.generateTestPlan(newFeatures, modifiedFunctions, changeType),
            rollbackPlan: this.generateRollbackPlan(targetFiles, changeType),
            riskLevel: this.calculateRiskLevel(changeType, targetFiles, dependencies)
        };
    }

    /**
     * 直接影響の分析
     */
    analyzeDirectImpacts(targetFiles, modifiedFunctions) {
        const impacts = [];
        
        if (targetFiles && targetFiles.length > 0) {
            impacts.push(`対象ファイル: ${targetFiles.join(', ')}`);
        }
        
        if (modifiedFunctions && modifiedFunctions.length > 0) {
            impacts.push(`変更される機能: ${modifiedFunctions.join(', ')}`);
        }

        // ファイル別影響分析
        if (targetFiles) {
            targetFiles.forEach(file => {
                if (file.includes('editor')) {
                    impacts.push('エディタ機能への直接影響');
                }
                if (file.includes('ui') || file.includes('view')) {
                    impacts.push('UI表示の変更');
                }
                if (file.includes('lib') || file.includes('service')) {
                    impacts.push('コア機能への影響');
                }
            });
        }

        return impacts.length > 0 ? impacts : ['既存機能への直接的な影響はありません'];
    }

    /**
     * 潜在的リスクの分析
     */
    analyzePotentialRisks(changeType, targetFiles, dependencies) {
        const risks = [];

        switch (changeType) {
            case 'new_feature':
                risks.push('新機能追加により既存機能の動作が変わる可能性');
                break;
            case 'modification':
                risks.push('既存機能の変更により互換性問題が発生する可能性');
                break;
            case 'deletion':
                risks.push('機能削除により依存する機能が動作しなくなる可能性');
                break;
            case 'refactoring':
                risks.push('リファクタリングにより意図しない動作変更が発生する可能性');
                break;
        }

        // ファイル固有のリスク
        if (targetFiles) {
            if (targetFiles.some(f => f.includes('core') || f.includes('main'))) {
                risks.push('コア機能変更によりアプリケーション全体への影響');
            }
            if (targetFiles.some(f => f.includes('css') || f.includes('style'))) {
                risks.push('スタイル変更によりUI全体のレイアウト崩れ');
            }
        }

        // 依存関係のリスク
        if (dependencies && dependencies.length > 0) {
            risks.push('依存関係の変更により連鎖的な影響が発生する可能性');
        }

        return risks;
    }

    /**
     * 依存関係の分析
     */
    analyzeDependencies(targetFiles, dependencies) {
        const deps = [];

        if (dependencies) {
            deps.push(...dependencies);
        }

        // ファイルベースの依存関係推定
        if (targetFiles) {
            targetFiles.forEach(file => {
                if (file.includes('editor')) {
                    deps.push('エディタ関連の他のファイル');
                }
                if (file.includes('lib')) {
                    deps.push('このライブラリを使用する全てのコンポーネント');
                }
            });
        }

        return deps.length > 0 ? deps : ['外部依存関係はありません'];
    }

    /**
     * テスト計画の生成
     */
    generateTestPlan(newFeatures, modifiedFunctions, changeType) {
        const testItems = [];

        if (newFeatures && newFeatures.length > 0) {
            newFeatures.forEach(feature => {
                testItems.push(`新機能「${feature}」の動作確認`);
                testItems.push(`新機能「${feature}」のエラーハンドリング確認`);
            });
        }

        if (modifiedFunctions && modifiedFunctions.length > 0) {
            modifiedFunctions.forEach(func => {
                testItems.push(`変更された「${func}」機能の動作確認`);
                testItems.push(`「${func}」に依存する機能の回帰テスト`);
            });
        }

        // 変更タイプ別テスト
        switch (changeType) {
            case 'new_feature':
                testItems.push('既存機能との干渉がないか確認');
                break;
            case 'deletion':
                testItems.push('削除機能に依存していた機能の代替動作確認');
                break;
        }

        // 基本テスト項目
        testItems.push('アプリケーション全体の起動・基本動作確認');
        testItems.push('エラーコンソールに新しいエラーが出ていないか確認');

        return testItems;
    }

    /**
     * ロールバック計画の生成
     */
    generateRollbackPlan(targetFiles, changeType) {
        const steps = [];

        steps.push('Git履歴から変更前の状態を確認');
        
        if (targetFiles && targetFiles.length > 0) {
            steps.push(`対象ファイル（${targetFiles.join(', ')}）を変更前の状態に復元`);
        }

        switch (changeType) {
            case 'new_feature':
                steps.push('追加したファイルを削除');
                steps.push('既存ファイルの変更を元に戻す');
                break;
            case 'deletion':
                steps.push('削除したコードを復元');
                steps.push('関連する設定を元に戻す');
                break;
            case 'modification':
                steps.push('変更したコードを元の実装に戻す');
                break;
        }

        steps.push('アプリケーションの動作確認');
        steps.push('必要に応じてキャッシュクリア・再起動');

        return steps;
    }

    /**
     * リスクレベルの計算
     */
    calculateRiskLevel(changeType, targetFiles, dependencies) {
        let score = 0;

        // 変更タイプ別スコア
        switch (changeType) {
            case 'new_feature': score += 2; break;
            case 'modification': score += 3; break;
            case 'deletion': score += 4; break;
            case 'refactoring': score += 2; break;
        }

        // ファイル数によるスコア
        if (targetFiles) {
            score += Math.min(targetFiles.length, 5);
            
            // 重要ファイルのスコア加算
            if (targetFiles.some(f => f.includes('core') || f.includes('main') || f.includes('index'))) {
                score += 3;
            }
        }

        // 依存関係によるスコア
        if (dependencies && dependencies.length > 0) {
            score += Math.min(dependencies.length, 3);
        }

        if (score <= 3) return 'LOW';
        if (score <= 6) return 'MEDIUM';
        return 'HIGH';
    }

    /**
     * 分析結果ダイアログを表示
     */
    showAnalysisDialog(analysis) {
        const modal = document.createElement('div');
        modal.className = 'change-impact-modal';
        modal.innerHTML = `
            <div class="impact-analysis-dialog">
                <div class="dialog-header">
                    <h2>🔍 変更影響分析</h2>
                    <div class="risk-badge risk-${analysis.riskLevel.toLowerCase()}">
                        リスク: ${analysis.riskLevel}
                    </div>
                </div>

                <div class="dialog-content">
                    <div class="analysis-section">
                        <h3>📋 変更内容</h3>
                        <div class="change-summary">
                            <h4>${analysis.title}</h4>
                            <p>${analysis.description}</p>
                            <div class="change-details">
                                <span><strong>対象ファイル:</strong> ${analysis.changeDetails.targetFiles.join(', ') || 'なし'}</span>
                                <span><strong>変更行数:</strong> +${analysis.changeDetails.estimatedLines.added} ~${analysis.changeDetails.estimatedLines.modified} -${analysis.changeDetails.estimatedLines.deleted}</span>
                                <span><strong>変更タイプ:</strong> ${this.getChangeTypeLabel(analysis.changeDetails.changeType)}</span>
                            </div>
                        </div>
                    </div>

                    <div class="analysis-section">
                        <h3>⚠️ 直接影響</h3>
                        <ul class="impact-list">
                            ${analysis.directImpacts.map(impact => `<li>${impact}</li>`).join('')}
                        </ul>
                    </div>

                    <div class="analysis-section">
                        <h3>🚨 潜在的リスク</h3>
                        <ul class="risk-list">
                            ${analysis.potentialRisks.map(risk => `<li>${risk}</li>`).join('')}
                        </ul>
                    </div>

                    <div class="analysis-section">
                        <h3>🔗 依存関係</h3>
                        <ul class="dependency-list">
                            ${analysis.dependencies.map(dep => `<li>${dep}</li>`).join('')}
                        </ul>
                    </div>

                    <div class="analysis-section">
                        <h3>🧪 テスト計画</h3>
                        <ul class="test-list">
                            ${analysis.testPlan.map(test => `<li>${test}</li>`).join('')}
                        </ul>
                    </div>

                    <div class="analysis-section">
                        <h3>🔄 ロールバック方法</h3>
                        <ol class="rollback-list">
                            ${analysis.rollbackPlan.map(step => `<li>${step}</li>`).join('')}
                        </ol>
                    </div>
                </div>

                <div class="dialog-footer">
                    <div class="decision-section">
                        <h4>この変更を実行しますか？</h4>
                        <div class="decision-buttons">
                            <button class="btn btn-success" id="confirmChange">
                                ✅ 実行する（リスクを理解済み）
                            </button>
                            <button class="btn btn-warning" id="partialChange">
                                ⚠️ 段階的に実行
                            </button>
                            <button class="btn btn-secondary" id="cancelChange">
                                ❌ キャンセル（代替案を検討）
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // イベントリスナー設定
        modal.querySelector('#confirmChange').addEventListener('click', () => {
            this.handleDecision('confirm', analysis);
            document.body.removeChild(modal);
        });

        modal.querySelector('#partialChange').addEventListener('click', () => {
            this.handleDecision('partial', analysis);
            document.body.removeChild(modal);
        });

        modal.querySelector('#cancelChange').addEventListener('click', () => {
            this.handleDecision('cancel', analysis);
            document.body.removeChild(modal);
        });

        // モーダル背景クリックで閉じる
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.handleDecision('cancel', analysis);
                document.body.removeChild(modal);
            }
        });
    }

    /**
     * 決定処理
     */
    handleDecision(decision, analysis) {
        switch (decision) {
            case 'confirm':
                if (this.onConfirm) {
                    this.onConfirm(analysis);
                }
                break;
            case 'partial':
                if (this.onConfirm) {
                    this.onConfirm({...analysis, stepByStep: true});
                }
                break;
            case 'cancel':
                if (this.onCancel) {
                    this.onCancel(analysis);
                }
                break;
        }
    }

    /**
     * 変更タイプラベルの取得
     */
    getChangeTypeLabel(type) {
        const labels = {
            'new_feature': '新機能追加',
            'modification': '機能変更',
            'deletion': '機能削除',
            'refactoring': 'リファクタリング',
            'bug_fix': 'バグ修正'
        };
        return labels[type] || type;
    }

    /**
     * 簡易分析（既存コード用）
     */
    static quickAnalysis(title, files, description = '') {
        return {
            title,
            description,
            targetFiles: Array.isArray(files) ? files : [files],
            changeType: 'modification',
            estimatedLines: { added: 50, modified: 20, deleted: 0 }
        };
    }
}

export default ChangeImpactAnalyzer;