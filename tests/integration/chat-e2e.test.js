/**
 * AI Chat Feature - Integration Test
 *
 * このテストはブラウザのコンソールで実行可能です。
 * Chrome拡張機能のエディターページを開いて、コンソールでテスト関数を実行してください。
 */

/**
 * Phase 1 統合テスト
 * すべてのチャット機能が正常に動作することを確認
 */
async function runPhase1IntegrationTest() {
    console.log('=== Phase 1 統合テスト開始 ===\n');

    const results = {
        passed: [],
        failed: []
    };

    // テスト1: 初期化確認
    console.log('テスト1: 初期化確認');
    try {
        if (!window.chatPanel) throw new Error('chatPanel が初期化されていません');
        if (!window.chatManager) throw new Error('chatManager が初期化されていません');
        if (!window.chatStorage) throw new Error('chatStorage が初期化されていません');
        if (!window.aiManager) throw new Error('aiManager が初期化されていません');

        console.log('✅ すべてのグローバルオブジェクトが初期化されています');
        results.passed.push('初期化確認');
    } catch (error) {
        console.error('❌ 初期化エラー:', error.message);
        results.failed.push('初期化確認: ' + error.message);
    }

    // テスト2: IndexedDB接続確認
    console.log('\nテスト2: IndexedDB接続確認');
    try {
        const db = await window.chatStorage.initDB();
        if (!db) throw new Error('IndexedDB の初期化に失敗しました');

        console.log('✅ IndexedDB が正常に接続されています');
        results.passed.push('IndexedDB接続');
    } catch (error) {
        console.error('❌ IndexedDB エラー:', error.message);
        results.failed.push('IndexedDB接続: ' + error.message);
    }

    // テスト3: セッション作成
    console.log('\nテスト3: セッション作成');
    try {
        const session = await window.chatManager.createNewSession('統合テスト');
        if (!session) throw new Error('セッションの作成に失敗しました');
        if (!session.id) throw new Error('セッションIDがありません');

        console.log('✅ セッションが正常に作成されました:', session.id);
        results.passed.push('セッション作成');
    } catch (error) {
        console.error('❌ セッション作成エラー:', error.message);
        results.failed.push('セッション作成: ' + error.message);
    }

    // テスト4: セッション保存・読み込み
    console.log('\nテスト4: セッション保存・読み込み');
    try {
        const testSession = {
            id: 'test-' + Date.now(),
            title: 'テストセッション',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messages: [
                { role: 'user', content: 'テストメッセージ1', timestamp: Date.now() },
                { role: 'assistant', content: 'テスト応答1', timestamp: Date.now() }
            ],
            model: 'gemini-pro',
            provider: 'gemini',
            tags: ['test'],
            isFavorite: false
        };

        await window.chatStorage.saveSession(testSession);
        const loaded = await window.chatStorage.getSession(testSession.id);

        if (!loaded) throw new Error('セッションの読み込みに失敗しました');
        if (loaded.messages.length !== 2) throw new Error('メッセージ数が一致しません');

        console.log('✅ セッションの保存・読み込みが正常に動作しています');
        results.passed.push('セッション保存・読み込み');

        // クリーンアップ
        await window.chatStorage.deleteSession(testSession.id);
    } catch (error) {
        console.error('❌ セッション保存・読み込みエラー:', error.message);
        results.failed.push('セッション保存・読み込み: ' + error.message);
    }

    // テスト5: セッション検索
    console.log('\nテスト5: セッション検索');
    try {
        const sessions = await window.chatManager.getSessions();
        console.log(`✅ ${sessions.length} 件のセッションを取得しました`);
        results.passed.push('セッション検索');
    } catch (error) {
        console.error('❌ セッション検索エラー:', error.message);
        results.failed.push('セッション検索: ' + error.message);
    }

    // テスト6: UI コンポーネント確認
    console.log('\nテスト6: UI コンポーネント確認');
    try {
        if (!window.chatPanel.element) throw new Error('チャットパネル要素が存在しません');

        // パネルを表示
        window.chatPanel.show();
        if (!window.chatPanel.isVisible) throw new Error('パネルが表示されません');

        // パネルを非表示
        window.chatPanel.hide();
        if (window.chatPanel.isVisible) throw new Error('パネルが非表示になりません');

        console.log('✅ UI コンポーネントが正常に動作しています');
        results.passed.push('UI コンポーネント');
    } catch (error) {
        console.error('❌ UI コンポーネントエラー:', error.message);
        results.failed.push('UI コンポーネント: ' + error.message);
    }

    // テスト7: Markdown レンダリング
    console.log('\nテスト7: Markdown レンダリング');
    try {
        const testMarkdown = '# テスト見出し\n\n**太字** と *斜体* と `コード`';
        const container = document.createElement('div');

        window.chatPanel.renderMessageContent(testMarkdown, container);

        if (!container.innerHTML.includes('<h1>')) throw new Error('見出しがレンダリングされていません');
        if (!container.innerHTML.includes('<strong>')) throw new Error('太字がレンダリングされていません');
        if (!container.innerHTML.includes('<code>')) throw new Error('コードがレンダリングされていません');

        console.log('✅ Markdown レンダリングが正常に動作しています');
        results.passed.push('Markdown レンダリング');
    } catch (error) {
        console.error('❌ Markdown レンダリングエラー:', error.message);
        results.failed.push('Markdown レンダリング: ' + error.message);
    }

    // テスト8: XSS保護
    console.log('\nテスト8: XSS保護（DOMPurify）');
    try {
        const maliciousMarkdown = '<script>alert("XSS")</script><img src=x onerror=alert("XSS")>';
        const container = document.createElement('div');

        window.chatPanel.renderMessageContent(maliciousMarkdown, container);

        if (container.innerHTML.includes('<script>')) throw new Error('スクリプトタグが除去されていません');
        if (container.innerHTML.includes('onerror=')) throw new Error('イベントハンドラーが除去されていません');

        console.log('✅ XSS保護が正常に動作しています');
        results.passed.push('XSS保護');
    } catch (error) {
        console.error('❌ XSS保護エラー:', error.message);
        results.failed.push('XSS保護: ' + error.message);
    }

    // テスト結果サマリー
    console.log('\n=== テスト結果サマリー ===');
    console.log(`✅ 成功: ${results.passed.length} 件`);
    console.log(`❌ 失敗: ${results.failed.length} 件`);

    if (results.passed.length > 0) {
        console.log('\n成功したテスト:');
        results.passed.forEach(test => console.log(`  ✅ ${test}`));
    }

    if (results.failed.length > 0) {
        console.log('\n失敗したテスト:');
        results.failed.forEach(test => console.log(`  ❌ ${test}`));
    }

    console.log('\n=== Phase 1 統合テスト完了 ===');

    return {
        total: results.passed.length + results.failed.length,
        passed: results.passed.length,
        failed: results.failed.length,
        success: results.failed.length === 0
    };
}

/**
 * パフォーマンステスト
 */
async function runPerformanceTest() {
    console.log('\n=== パフォーマンステスト開始 ===\n');

    // テスト1: 大量メッセージの表示
    console.log('テスト1: 大量メッセージの表示（100件）');
    const startRender = performance.now();

    for (let i = 0; i < 100; i++) {
        window.chatPanel.addMessage(
            i % 2 === 0 ? 'user' : 'assistant',
            `テストメッセージ ${i + 1}`
        );
    }

    const renderTime = performance.now() - startRender;
    console.log(`✅ 100件のメッセージ表示: ${renderTime.toFixed(2)}ms`);

    // クリア
    window.chatPanel.clearMessages();

    // テスト2: IndexedDB 書き込み速度
    console.log('\nテスト2: IndexedDB 書き込み速度（50セッション）');
    const startWrite = performance.now();

    const promises = [];
    for (let i = 0; i < 50; i++) {
        const session = {
            id: 'perf-test-' + i,
            title: `パフォーマンステストセッション ${i}`,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messages: [
                { role: 'user', content: 'テスト', timestamp: Date.now() },
                { role: 'assistant', content: 'テスト応答', timestamp: Date.now() }
            ],
            model: 'gemini-pro',
            provider: 'gemini',
            tags: ['perf-test'],
            isFavorite: false
        };
        promises.push(window.chatStorage.saveSession(session));
    }

    await Promise.all(promises);
    const writeTime = performance.now() - startWrite;
    console.log(`✅ 50セッション書き込み: ${writeTime.toFixed(2)}ms (平均 ${(writeTime / 50).toFixed(2)}ms/session)`);

    // テスト3: IndexedDB 読み込み速度
    console.log('\nテスト3: IndexedDB 読み込み速度');
    const startRead = performance.now();

    const sessions = await window.chatStorage.getAllSessions();
    const readTime = performance.now() - startRead;
    console.log(`✅ ${sessions.length}セッション読み込み: ${readTime.toFixed(2)}ms`);

    // クリーンアップ
    console.log('\nクリーンアップ中...');
    for (let i = 0; i < 50; i++) {
        await window.chatStorage.deleteSession('perf-test-' + i);
    }
    console.log('✅ クリーンアップ完了');

    console.log('\n=== パフォーマンステスト完了 ===');

    // パフォーマンス評価
    const performance_ok = renderTime < 1000 && writeTime < 3000 && readTime < 500;
    console.log(`\n総合評価: ${performance_ok ? '✅ 合格' : '⚠️ 要改善'}`);

    return {
        renderTime,
        writeTime,
        readTime,
        passed: performance_ok
    };
}

/**
 * すべてのテストを実行
 */
async function runAllTests() {
    console.log('╔════════════════════════════════════════════╗');
    console.log('║  SightEdit AI Chat - 統合テストスイート  ║');
    console.log('╚════════════════════════════════════════════╝\n');

    const integrationResult = await runPhase1IntegrationTest();
    const performanceResult = await runPerformanceTest();

    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║            最終テスト結果                  ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log(`\n統合テスト: ${integrationResult.passed}/${integrationResult.total} 成功`);
    console.log(`パフォーマンス: ${performanceResult.passed ? '✅ 合格' : '⚠️ 要改善'}`);
    console.log(`\n総合結果: ${integrationResult.success && performanceResult.passed ? '✅ すべて合格' : '⚠️ 一部失敗'}`);

    return {
        integration: integrationResult,
        performance: performanceResult,
        allPassed: integrationResult.success && performanceResult.passed
    };
}

// テスト関数をグローバルに公開
if (typeof window !== 'undefined') {
    window.runPhase1IntegrationTest = runPhase1IntegrationTest;
    window.runPerformanceTest = runPerformanceTest;
    window.runAllTests = runAllTests;

    console.log('統合テストスクリプトが読み込まれました。');
    console.log('使用方法:');
    console.log('  - runPhase1IntegrationTest() : 統合テスト実行');
    console.log('  - runPerformanceTest()       : パフォーマンステスト実行');
    console.log('  - runAllTests()              : すべてのテスト実行');
}

// Node.js環境（Jest）用のエクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        runPhase1IntegrationTest,
        runPerformanceTest,
        runAllTests
    };
}
