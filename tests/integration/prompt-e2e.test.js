/**
 * Prompt Management Feature - Integration Test
 *
 * このテストはブラウザのコンソールで実行可能です。
 * Chrome拡張機能のエディターページを開いて、コンソールでテスト関数を実行してください。
 */

/**
 * Phase 2 統合テスト
 * すべてのプロンプト管理機能が正常に動作することを確認
 */
async function runPhase2IntegrationTest() {
    console.log('=== Phase 2 統合テスト開始 ===\n');

    const results = {
        passed: [],
        failed: []
    };

    // テスト1: PromptManager 初期化確認
    console.log('テスト1: PromptManager 初期化確認');
    try {
        if (!window.promptManager) throw new Error('promptManager が初期化されていません');
        if (!window.promptLibrary) throw new Error('promptLibrary が初期化されていません');

        console.log('✅ PromptManager と PromptLibrary が初期化されています');
        results.passed.push('初期化確認');
    } catch (error) {
        console.error('❌ 初期化エラー:', error.message);
        results.failed.push('初期化確認: ' + error.message);
    }

    // テスト2: デフォルトテンプレート読み込み確認
    console.log('\nテスト2: デフォルトテンプレート読み込み確認');
    try {
        const templates = await window.promptManager.getAllTemplates();
        if (templates.length === 0) throw new Error('デフォルトテンプレートが読み込まれていません');

        console.log(`✅ ${templates.length} 件のテンプレートが読み込まれています`);

        // カテゴリー別の確認
        const categories = window.promptManager.getCategories();
        console.log(`   カテゴリー: ${categories.join(', ')}`);
        results.passed.push('デフォルトテンプレート読み込み');
    } catch (error) {
        console.error('❌ デフォルトテンプレート読み込みエラー:', error.message);
        results.failed.push('デフォルトテンプレート読み込み: ' + error.message);
    }

    // テスト3: テンプレート作成・読み込み・更新・削除 (CRUD)
    console.log('\nテスト3: テンプレート CRUD 操作');
    try {
        // Create
        const newTemplate = await window.promptManager.createTemplate({
            name: '統合テスト用テンプレート',
            description: 'これはテスト用のテンプレートです',
            category: 'その他',
            prompt: 'これはテストです: {{test_variable}}',
            variables: [
                { name: 'test_variable', type: 'text', description: 'テスト変数', required: true }
            ]
        });

        if (!newTemplate.id) throw new Error('テンプレートIDが生成されていません');
        console.log(`✅ テンプレート作成成功 (ID: ${newTemplate.id})`);

        // Read
        const retrieved = await window.promptManager.getTemplate(newTemplate.id);
        if (!retrieved) throw new Error('テンプレートの読み込みに失敗しました');
        if (retrieved.name !== newTemplate.name) throw new Error('テンプレート名が一致しません');
        console.log('✅ テンプレート読み込み成功');

        // Update
        await window.promptManager.updateTemplate(newTemplate.id, {
            name: '更新されたテンプレート',
            description: '更新後の説明'
        });
        const updated = await window.promptManager.getTemplate(newTemplate.id);
        if (updated.name !== '更新されたテンプレート') throw new Error('テンプレートの更新に失敗しました');
        console.log('✅ テンプレート更新成功');

        // Delete
        await window.promptManager.deleteTemplate(newTemplate.id);
        const deleted = await window.promptManager.getTemplate(newTemplate.id);
        if (deleted !== null) throw new Error('テンプレートの削除に失敗しました');
        console.log('✅ テンプレート削除成功');

        results.passed.push('CRUD操作');
    } catch (error) {
        console.error('❌ CRUD操作エラー:', error.message);
        results.failed.push('CRUD操作: ' + error.message);
    }

    // テスト4: 変数パース機能
    console.log('\nテスト4: 変数パース機能');
    try {
        const promptText = 'こんにちは{{name}}さん、今日は{{weather}}ですね。{{greeting}}';
        const variables = window.promptManager.parseVariables(promptText);

        if (variables.length !== 3) throw new Error(`変数数が不正です: ${variables.length}`);
        if (!variables.includes('name')) throw new Error('変数 "name" が見つかりません');
        if (!variables.includes('weather')) throw new Error('変数 "weather" が見つかりません');
        if (!variables.includes('greeting')) throw new Error('変数 "greeting" が見つかりません');

        console.log('✅ 変数パース成功:', variables);
        results.passed.push('変数パース');
    } catch (error) {
        console.error('❌ 変数パースエラー:', error.message);
        results.failed.push('変数パース: ' + error.message);
    }

    // テスト5: テンプレート適用と変数置換
    console.log('\nテスト5: テンプレート適用と変数置換');
    try {
        // テスト用テンプレート作成
        const template = await window.promptManager.createTemplate({
            name: '変数置換テスト',
            category: 'その他',
            prompt: '名前: {{name}}\n年齢: {{age}}\n職業: {{job}}',
            variables: [
                { name: 'name', type: 'text', required: true },
                { name: 'age', type: 'number', required: true },
                { name: 'job', type: 'text', required: false }
            ]
        });

        const result = window.promptManager.applyTemplate(template.id, {
            name: 'テスト太郎',
            age: '25',
            job: 'エンジニア'
        });

        if (!result.includes('テスト太郎')) throw new Error('名前の置換に失敗しました');
        if (!result.includes('25')) throw new Error('年齢の置換に失敗しました');
        if (!result.includes('エンジニア')) throw new Error('職業の置換に失敗しました');

        console.log('✅ テンプレート適用成功');
        console.log('   結果:\n' + result.split('\n').map(l => '   ' + l).join('\n'));

        // 使用統計の確認
        const updatedTemplate = await window.promptManager.getTemplate(template.id);
        if (updatedTemplate.usageCount !== 1) throw new Error('使用回数が更新されていません');
        console.log('✅ 使用統計の更新成功');

        // クリーンアップ
        await window.promptManager.deleteTemplate(template.id);

        results.passed.push('テンプレート適用');
    } catch (error) {
        console.error('❌ テンプレート適用エラー:', error.message);
        results.failed.push('テンプレート適用: ' + error.message);
    }

    // テスト6: カテゴリーフィルタリング
    console.log('\nテスト6: カテゴリーフィルタリング');
    try {
        const allTemplates = await window.promptManager.getAllTemplates();
        const categories = window.promptManager.getCategories();

        for (const category of categories) {
            const filtered = window.promptManager.getTemplatesByCategory(category);
            console.log(`   ${category}: ${filtered.length} 件`);

            // すべてのフィルタされたテンプレートが正しいカテゴリーか確認
            for (const template of filtered) {
                if (template.category !== category) {
                    throw new Error(`カテゴリーフィルタが不正: ${template.name} は ${template.category} なのに ${category} でフィルタされました`);
                }
            }
        }

        console.log('✅ カテゴリーフィルタリング成功');
        results.passed.push('カテゴリーフィルタリング');
    } catch (error) {
        console.error('❌ カテゴリーフィルタリングエラー:', error.message);
        results.failed.push('カテゴリーフィルタリング: ' + error.message);
    }

    // テスト7: 検索機能
    console.log('\nテスト7: 検索機能');
    try {
        const searchResults = window.promptManager.searchTemplates('ブログ');
        console.log(`   "ブログ" で ${searchResults.length} 件ヒット`);

        if (searchResults.length === 0) {
            console.warn('⚠️ "ブログ" で検索結果が0件です（警告のみ）');
        } else {
            // 検索結果にキーワードが含まれているか確認
            const hasKeyword = searchResults.some(t =>
                t.name.includes('ブログ') ||
                t.description.includes('ブログ') ||
                t.prompt.includes('ブログ')
            );
            if (!hasKeyword) throw new Error('検索結果にキーワードが含まれていません');
            console.log('✅ 検索機能成功');
        }

        results.passed.push('検索機能');
    } catch (error) {
        console.error('❌ 検索機能エラー:', error.message);
        results.failed.push('検索機能: ' + error.message);
    }

    // テスト8: お気に入り機能
    console.log('\nテスト8: お気に入り機能');
    try {
        const template = await window.promptManager.createTemplate({
            name: 'お気に入りテスト',
            category: 'その他',
            prompt: 'テストプロンプト',
            isFavorite: false
        });

        // お気に入りに追加
        await window.promptManager.toggleFavorite(template.id);
        const favorited = await window.promptManager.getTemplate(template.id);
        if (!favorited.isFavorite) throw new Error('お気に入りの追加に失敗しました');
        console.log('✅ お気に入り追加成功');

        // お気に入り一覧取得
        const favorites = window.promptManager.getFavorites();
        if (!favorites.some(t => t.id === template.id)) {
            throw new Error('お気に入り一覧に表示されません');
        }
        console.log('✅ お気に入り一覧取得成功');

        // お気に入り解除
        await window.promptManager.toggleFavorite(template.id);
        const unfavorited = await window.promptManager.getTemplate(template.id);
        if (unfavorited.isFavorite) throw new Error('お気に入りの解除に失敗しました');
        console.log('✅ お気に入り解除成功');

        // クリーンアップ
        await window.promptManager.deleteTemplate(template.id);

        results.passed.push('お気に入り機能');
    } catch (error) {
        console.error('❌ お気に入り機能エラー:', error.message);
        results.failed.push('お気に入り機能: ' + error.message);
    }

    // テスト9: エクスポート/インポート機能
    console.log('\nテスト9: エクスポート/インポート機能');
    try {
        // テスト用テンプレート作成
        const template1 = await window.promptManager.createTemplate({
            name: 'エクスポートテスト1',
            category: 'その他',
            prompt: 'テストプロンプト1',
            variables: [{ name: 'var1', type: 'text' }]
        });

        const template2 = await window.promptManager.createTemplate({
            name: 'エクスポートテスト2',
            category: 'その他',
            prompt: 'テストプロンプト2',
            variables: [{ name: 'var2', type: 'textarea' }]
        });

        // エクスポート
        const exported = window.promptManager.exportTemplates([template1.id, template2.id]);
        if (exported.templates.length !== 2) throw new Error('エクスポート件数が不正です');
        if (!exported.version) throw new Error('バージョン情報がありません');
        console.log('✅ エクスポート成功 (2件)');

        // 削除してからインポート
        await window.promptManager.deleteTemplate(template1.id);
        await window.promptManager.deleteTemplate(template2.id);

        // インポート
        const imported = await window.promptManager.importTemplates(exported);
        if (imported.imported !== 2) throw new Error(`インポート件数が不正です: ${imported.imported}`);
        console.log('✅ インポート成功 (2件)');

        // インポートされたテンプレートを確認
        const allTemplates = await window.promptManager.getAllTemplates();
        const importedTemplate1 = allTemplates.find(t => t.name === 'エクスポートテスト1');
        const importedTemplate2 = allTemplates.find(t => t.name === 'エクスポートテスト2');

        if (!importedTemplate1 || !importedTemplate2) {
            throw new Error('インポートされたテンプレートが見つかりません');
        }

        // クリーンアップ
        await window.promptManager.deleteTemplate(importedTemplate1.id);
        await window.promptManager.deleteTemplate(importedTemplate2.id);

        results.passed.push('エクスポート/インポート');
    } catch (error) {
        console.error('❌ エクスポート/インポートエラー:', error.message);
        results.failed.push('エクスポート/インポート: ' + error.message);
    }

    // テスト10: 最近使用したテンプレート
    console.log('\nテスト10: 最近使用したテンプレート');
    try {
        // テスト用テンプレートを複数作成
        const templates = [];
        for (let i = 0; i < 5; i++) {
            const t = await window.promptManager.createTemplate({
                name: `最近使用テスト${i}`,
                category: 'その他',
                prompt: `テスト${i}`,
            });
            templates.push(t);
            // 少し待機して異なるタイムスタンプを確保
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        // 逆順で使用
        for (let i = templates.length - 1; i >= 0; i--) {
            window.promptManager.applyTemplate(templates[i].id, {});
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        // 最近使用したテンプレートを取得
        const recent = window.promptManager.getRecentlyUsed(3);
        if (recent.length !== 3) throw new Error(`最近使用した件数が不正です: ${recent.length}`);

        // 最も新しいものが最初に来るか確認
        if (recent[0].name !== '最近使用テスト0') {
            throw new Error(`最近使用の順序が不正です: ${recent[0].name}`);
        }

        console.log('✅ 最近使用したテンプレート取得成功');
        console.log(`   最近の3件: ${recent.map(t => t.name).join(', ')}`);

        // クリーンアップ
        for (const t of templates) {
            await window.promptManager.deleteTemplate(t.id);
        }

        results.passed.push('最近使用したテンプレート');
    } catch (error) {
        console.error('❌ 最近使用したテンプレートエラー:', error.message);
        results.failed.push('最近使用したテンプレート: ' + error.message);
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

    console.log('\n=== Phase 2 統合テスト完了 ===');

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
async function runPromptPerformanceTest() {
    console.log('\n=== プロンプト管理パフォーマンステスト開始 ===\n');

    // テスト1: 大量テンプレートの作成
    console.log('テスト1: 大量テンプレートの作成 (100件)');
    const startCreate = performance.now();

    const templateIds = [];
    for (let i = 0; i < 100; i++) {
        const template = await window.promptManager.createTemplate({
            name: `パフォーマンステスト${i}`,
            category: i % 4 === 0 ? '執筆支援' : i % 4 === 1 ? 'コーディング' : i % 4 === 2 ? '翻訳' : 'その他',
            prompt: `これはパフォーマンステスト用のプロンプトです。番号: ${i}`,
            variables: [
                { name: 'var1', type: 'text' },
                { name: 'var2', type: 'textarea' }
            ]
        });
        templateIds.push(template.id);
    }

    const createTime = performance.now() - startCreate;
    console.log(`✅ 100件のテンプレート作成: ${createTime.toFixed(2)}ms (平均 ${(createTime / 100).toFixed(2)}ms/template)`);

    // テスト2: 全テンプレート読み込み
    console.log('\nテスト2: 全テンプレート読み込み');
    const startRead = performance.now();

    const allTemplates = await window.promptManager.getAllTemplates();
    const readTime = performance.now() - startRead;
    console.log(`✅ ${allTemplates.length}件のテンプレート読み込み: ${readTime.toFixed(2)}ms`);

    // テスト3: カテゴリーフィルタリング速度
    console.log('\nテスト3: カテゴリーフィルタリング速度');
    const startFilter = performance.now();

    const categories = window.promptManager.getCategories();
    for (const category of categories) {
        window.promptManager.getTemplatesByCategory(category);
    }

    const filterTime = performance.now() - startFilter;
    console.log(`✅ ${categories.length}カテゴリーのフィルタリング: ${filterTime.toFixed(2)}ms`);

    // テスト4: 検索速度
    console.log('\nテスト4: 検索速度');
    const searchQueries = ['テスト', 'パフォーマンス', '0', '50', '99'];
    const startSearch = performance.now();

    for (const query of searchQueries) {
        window.promptManager.searchTemplates(query);
    }

    const searchTime = performance.now() - startSearch;
    console.log(`✅ ${searchQueries.length}回の検索: ${searchTime.toFixed(2)}ms (平均 ${(searchTime / searchQueries.length).toFixed(2)}ms/search)`);

    // テスト5: テンプレート適用速度
    console.log('\nテスト5: テンプレート適用速度 (50回)');
    const startApply = performance.now();

    for (let i = 0; i < 50; i++) {
        const templateId = templateIds[i];
        window.promptManager.applyTemplate(templateId, {
            var1: 'テスト値1',
            var2: 'テスト値2'
        });
    }

    const applyTime = performance.now() - startApply;
    console.log(`✅ 50回のテンプレート適用: ${applyTime.toFixed(2)}ms (平均 ${(applyTime / 50).toFixed(2)}ms/apply)`);

    // テスト6: エクスポート速度
    console.log('\nテスト6: エクスポート速度 (100件)');
    const startExport = performance.now();

    const exported = window.promptManager.exportTemplates(templateIds);
    const exportTime = performance.now() - startExport;
    console.log(`✅ 100件のエクスポート: ${exportTime.toFixed(2)}ms`);

    // テスト7: インポート速度
    console.log('\nテスト7: インポート速度 (100件)');

    // 既存のテストテンプレートを削除
    for (const id of templateIds) {
        await window.promptManager.deleteTemplate(id);
    }

    const startImport = performance.now();
    const imported = await window.promptManager.importTemplates(exported);
    const importTime = performance.now() - startImport;
    console.log(`✅ ${imported.imported}件のインポート: ${importTime.toFixed(2)}ms`);

    // クリーンアップ
    console.log('\nクリーンアップ中...');
    const allAfterImport = await window.promptManager.getAllTemplates();
    const testTemplates = allAfterImport.filter(t => t.name.startsWith('パフォーマンステスト'));
    for (const template of testTemplates) {
        await window.promptManager.deleteTemplate(template.id);
    }
    console.log('✅ クリーンアップ完了');

    console.log('\n=== パフォーマンステスト完了 ===');

    // パフォーマンス評価基準
    const performance_ok =
        createTime < 5000 &&    // 100件作成: 5秒以内
        readTime < 100 &&       // 全件読み込み: 100ms以内
        filterTime < 50 &&      // フィルタリング: 50ms以内
        searchTime < 100 &&     // 検索: 100ms以内
        applyTime < 500 &&      // 50回適用: 500ms以内
        exportTime < 100 &&     // エクスポート: 100ms以内
        importTime < 3000;      // インポート: 3秒以内

    console.log(`\n総合評価: ${performance_ok ? '✅ 合格' : '⚠️ 要改善'}`);

    return {
        createTime,
        readTime,
        filterTime,
        searchTime,
        applyTime,
        exportTime,
        importTime,
        passed: performance_ok
    };
}

/**
 * UI統合テスト
 */
async function runPromptUITest() {
    console.log('\n=== プロンプトライブラリ UI テスト開始 ===\n');

    const results = {
        passed: [],
        failed: []
    };

    // テスト1: PromptLibrary初期化確認
    console.log('テスト1: PromptLibrary初期化確認');
    try {
        if (!window.promptLibrary) throw new Error('PromptLibrary が初期化されていません');
        console.log('✅ PromptLibrary が初期化されています');
        results.passed.push('初期化確認');
    } catch (error) {
        console.error('❌ 初期化エラー:', error.message);
        results.failed.push('初期化確認: ' + error.message);
    }

    // テスト2: ChatPanelとの統合確認
    console.log('\nテスト2: ChatPanelとの統合確認');
    try {
        if (!window.chatPanel) throw new Error('chatPanel が初期化されていません');

        // ChatPanelにPromptLibraryが設定されているか確認
        const promptsBtn = document.querySelector('#chat-prompts');
        if (!promptsBtn) throw new Error('プロンプトボタンが見つかりません');

        console.log('✅ ChatPanelとの統合が確認できました');
        results.passed.push('ChatPanel統合');
    } catch (error) {
        console.error('❌ ChatPanel統合エラー:', error.message);
        results.failed.push('ChatPanel統合: ' + error.message);
    }

    // テスト3: モーダル表示テスト
    console.log('\nテスト3: モーダル表示テスト');
    try {
        // プロンプトライブラリを表示
        await new Promise((resolve) => {
            window.promptLibrary.show(() => {});
            setTimeout(resolve, 500); // UIの描画を待つ
        });

        const modal = document.querySelector('.prompt-library-modal');
        if (!modal) throw new Error('モーダルが表示されていません');

        const container = document.querySelector('.prompt-library-container');
        if (!container) throw new Error('コンテナが見つかりません');

        console.log('✅ モーダル表示成功');

        // モーダルを閉じる
        window.promptLibrary.hide();
        await new Promise(resolve => setTimeout(resolve, 300));

        const modalAfterClose = document.querySelector('.prompt-library-modal');
        if (modalAfterClose) throw new Error('モーダルが閉じられていません');

        console.log('✅ モーダルを正常に閉じました');
        results.passed.push('モーダル表示');
    } catch (error) {
        console.error('❌ モーダル表示エラー:', error.message);
        results.failed.push('モーダル表示: ' + error.message);
        // クリーンアップ
        try { window.promptLibrary.hide(); } catch (e) {}
    }

    // テスト4: カテゴリー表示テスト
    console.log('\nテスト4: カテゴリー表示テスト');
    try {
        window.promptLibrary.show(() => {});
        await new Promise(resolve => setTimeout(resolve, 500));

        const categoryList = document.querySelector('#category-list');
        if (!categoryList) throw new Error('カテゴリーリストが見つかりません');

        const categoryItems = categoryList.querySelectorAll('li');
        if (categoryItems.length === 0) throw new Error('カテゴリーアイテムが表示されていません');

        console.log(`✅ カテゴリー表示成功 (${categoryItems.length}件)`);

        window.promptLibrary.hide();
        await new Promise(resolve => setTimeout(resolve, 300));

        results.passed.push('カテゴリー表示');
    } catch (error) {
        console.error('❌ カテゴリー表示エラー:', error.message);
        results.failed.push('カテゴリー表示: ' + error.message);
        try { window.promptLibrary.hide(); } catch (e) {}
    }

    // テスト5: プロンプトカード表示テスト
    console.log('\nテスト5: プロンプトカード表示テスト');
    try {
        window.promptLibrary.show(() => {});
        await new Promise(resolve => setTimeout(resolve, 500));

        const promptGrid = document.querySelector('#prompt-grid');
        if (!promptGrid) throw new Error('プロンプトグリッドが見つかりません');

        const promptCards = promptGrid.querySelectorAll('.prompt-card');
        if (promptCards.length === 0) throw new Error('プロンプトカードが表示されていません');

        console.log(`✅ プロンプトカード表示成功 (${promptCards.length}件)`);

        // カードの構造確認
        const firstCard = promptCards[0];
        const cardTitle = firstCard.querySelector('.prompt-card-title');
        const cardDescription = firstCard.querySelector('.prompt-card-description');

        if (!cardTitle) throw new Error('カードタイトルが見つかりません');
        if (!cardDescription) throw new Error('カード説明が見つかりません');

        console.log('✅ カード構造確認成功');

        window.promptLibrary.hide();
        await new Promise(resolve => setTimeout(resolve, 300));

        results.passed.push('プロンプトカード表示');
    } catch (error) {
        console.error('❌ プロンプトカード表示エラー:', error.message);
        results.failed.push('プロンプトカード表示: ' + error.message);
        try { window.promptLibrary.hide(); } catch (e) {}
    }

    // テスト6: 検索機能テスト
    console.log('\nテスト6: 検索機能テスト');
    try {
        window.promptLibrary.show(() => {});
        await new Promise(resolve => setTimeout(resolve, 500));

        const searchInput = document.querySelector('#prompt-search');
        if (!searchInput) throw new Error('検索入力が見つかりません');

        // 検索実行
        searchInput.value = 'ブログ';
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 300));

        const promptGrid = document.querySelector('#prompt-grid');
        const visibleCards = Array.from(promptGrid.querySelectorAll('.prompt-card'))
            .filter(card => card.style.display !== 'none');

        console.log(`✅ 検索実行成功 ("ブログ": ${visibleCards.length}件)`);

        // 検索をクリア
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 300));

        window.promptLibrary.hide();
        await new Promise(resolve => setTimeout(resolve, 300));

        results.passed.push('検索機能');
    } catch (error) {
        console.error('❌ 検索機能エラー:', error.message);
        results.failed.push('検索機能: ' + error.message);
        try { window.promptLibrary.hide(); } catch (e) {}
    }

    // テスト結果サマリー
    console.log('\n=== UI テスト結果サマリー ===');
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

    console.log('\n=== プロンプトライブラリ UI テスト完了 ===');

    return {
        total: results.passed.length + results.failed.length,
        passed: results.passed.length,
        failed: results.failed.length,
        success: results.failed.length === 0
    };
}

/**
 * すべてのPhase 2テストを実行
 */
async function runAllPhase2Tests() {
    console.log('╔════════════════════════════════════════════╗');
    console.log('║   SightEdit Phase 2 - 統合テストスイート   ║');
    console.log('╚════════════════════════════════════════════╝\n');

    const integrationResult = await runPhase2IntegrationTest();
    const performanceResult = await runPromptPerformanceTest();
    const uiResult = await runPromptUITest();

    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║          Phase 2 最終テスト結果            ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log(`\n統合テスト: ${integrationResult.passed}/${integrationResult.total} 成功`);
    console.log(`パフォーマンス: ${performanceResult.passed ? '✅ 合格' : '⚠️ 要改善'}`);
    console.log(`UI テスト: ${uiResult.passed}/${uiResult.total} 成功`);
    console.log(`\n総合結果: ${integrationResult.success && performanceResult.passed && uiResult.success ? '✅ すべて合格' : '⚠️ 一部失敗'}`);

    return {
        integration: integrationResult,
        performance: performanceResult,
        ui: uiResult,
        allPassed: integrationResult.success && performanceResult.passed && uiResult.success
    };
}

// テスト関数をグローバルに公開
if (typeof window !== 'undefined') {
    window.runPhase2IntegrationTest = runPhase2IntegrationTest;
    window.runPromptPerformanceTest = runPromptPerformanceTest;
    window.runPromptUITest = runPromptUITest;
    window.runAllPhase2Tests = runAllPhase2Tests;

    console.log('Phase 2 統合テストスクリプトが読み込まれました。');
    console.log('使用方法:');
    console.log('  - runPhase2IntegrationTest() : 統合テスト実行');
    console.log('  - runPromptPerformanceTest() : パフォーマンステスト実行');
    console.log('  - runPromptUITest()          : UI テスト実行');
    console.log('  - runAllPhase2Tests()        : すべてのテスト実行');
}

// Node.js環境（Jest）用のエクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        runPhase2IntegrationTest,
        runPromptPerformanceTest,
        runPromptUITest,
        runAllPhase2Tests
    };
}
