/**
 * Phase 3 統合テスト
 *
 * スタイル制御、構造化生成、エクスポート/インポート、パフォーマンス最適化機能のテスト
 */

import { StyleController } from '../../src/lib/style-controller.js';
import { StructuredGenerator } from '../../src/lib/structured-generator.js';
import { ExportImportManager } from '../../src/lib/export-import-manager.js';
import { PerformanceOptimizer } from '../../src/lib/performance-optimizer.js';
import { ChatStorage } from '../../src/lib/chat-storage.js';

describe('Phase 3 Integration Tests', () => {
    describe('StyleController', () => {
        let styleController;

        beforeEach(() => {
            styleController = new StyleController();
        });

        test('デフォルトスタイル設定が正しく取得できる', () => {
            const defaultStyle = styleController.getDefaultStyle();
            expect(defaultStyle).toHaveProperty('tone', 'casual');
            expect(defaultStyle).toHaveProperty('length', 'standard');
            expect(defaultStyle).toHaveProperty('audience', 'general');
            expect(defaultStyle).toHaveProperty('language', 'ja');
            expect(defaultStyle).toHaveProperty('enabled', false);
        });

        test('スタイルが無効の場合、プロンプトが変更されない', () => {
            const prompt = 'テストプロンプト';
            const result = styleController.applyStyleToPrompt(prompt);
            expect(result).toBe(prompt);
        });

        test('スタイルが有効の場合、プロンプトにスタイル指示が追加される', async () => {
            await styleController.setEnabled(true);
            const prompt = 'テストプロンプト';
            const result = styleController.applyStyleToPrompt(prompt);
            expect(result).toContain(prompt);
            expect(result).toContain('【応答スタイル指定】');
        });

        test('プリセットを適用できる', async () => {
            await styleController.applyPreset('technical-doc');
            const style = styleController.getStyle();
            expect(style.tone).toBe('technical');
            expect(style.length).toBe('long');
            expect(style.audience).toBe('expert');
            expect(style.enabled).toBe(true);
        });

        test('スタイルサマリーが正しく生成される', async () => {
            await styleController.setEnabled(true);
            const summary = styleController.getStyleSummary();
            expect(summary).toContain('スタイル:');
        });

        test('すべてのプリセットが有効なスタイルを持つ', () => {
            const presets = styleController.getPresets();
            expect(presets.length).toBeGreaterThan(0);

            presets.forEach(preset => {
                expect(preset).toHaveProperty('id');
                expect(preset).toHaveProperty('name');
                expect(preset).toHaveProperty('description');
                expect(preset.style).toHaveProperty('tone');
                expect(preset.style).toHaveProperty('length');
                expect(preset.style).toHaveProperty('audience');
                expect(preset.style).toHaveProperty('language');
            });
        });
    });

    describe('StructuredGenerator', () => {
        let structuredGenerator;

        beforeEach(() => {
            structuredGenerator = new StructuredGenerator();
        });

        test('利用可能なテンプレート一覧を取得できる', () => {
            const templates = structuredGenerator.getAvailableTemplates();
            expect(templates.length).toBeGreaterThan(0);
            expect(templates[0]).toHaveProperty('id');
            expect(templates[0]).toHaveProperty('name');
            expect(templates[0]).toHaveProperty('description');
        });

        test('テンプレートを取得できる', () => {
            const template = structuredGenerator.getTemplate('blog-post');
            expect(template).toBeDefined();
            expect(template).toHaveProperty('id', 'blog-post');
            expect(template).toHaveProperty('name');
            expect(template).toHaveProperty('sections');
            expect(Array.isArray(template.sections)).toBe(true);
        });

        test('セクションプロンプトが変数置換される', () => {
            const variables = {
                topic: 'AI技術',
                audience: '初心者',
                keywords: 'AI, 機械学習'
            };

            const prompt = structuredGenerator.generateSectionPrompt('blog-post', 'title', variables);
            expect(prompt).toContain('AI技術');
            expect(prompt).toContain('初心者');
            expect(prompt).toContain('AI, 機械学習');
        });

        test('セクションの依存関係が正しくチェックされる', () => {
            const result1 = structuredGenerator.checkSectionDependencies('blog-post', 'title', []);
            expect(result1.satisfied).toBe(true);

            const result2 = structuredGenerator.checkSectionDependencies('blog-post', 'intro', []);
            expect(result2.satisfied).toBe(false);
            expect(result2.missing).toContain('title');

            const result3 = structuredGenerator.checkSectionDependencies('blog-post', 'intro', ['title']);
            expect(result3.satisfied).toBe(true);
        });

        test('次に利用可能なセクションが正しく取得される', () => {
            const sections1 = structuredGenerator.getNextAvailableSections('blog-post', []);
            expect(sections1.length).toBeGreaterThan(0);
            expect(sections1[0].id).toBe('title');

            const sections2 = structuredGenerator.getNextAvailableSections('blog-post', ['title']);
            expect(sections2.some(s => s.id === 'intro')).toBe(true);
        });

        test('すべてのテンプレートが有効なセクション構造を持つ', () => {
            const templates = structuredGenerator.getAvailableTemplates();

            templates.forEach(template => {
                const fullTemplate = structuredGenerator.getTemplate(template.id);
                expect(fullTemplate.sections.length).toBeGreaterThan(0);

                fullTemplate.sections.forEach(section => {
                    expect(section).toHaveProperty('id');
                    expect(section).toHaveProperty('name');
                    expect(section).toHaveProperty('prompt');
                    expect(section).toHaveProperty('dependsOn');
                    expect(Array.isArray(section.dependsOn)).toBe(true);
                });
            });
        });
    });

    describe('ExportImportManager', () => {
        let exportImportManager;
        let testSession;

        beforeEach(() => {
            exportImportManager = new ExportImportManager();
            testSession = {
                id: 'test-session-1',
                title: 'テストセッション',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                messages: [
                    { role: 'user', content: 'こんにちは', timestamp: Date.now() },
                    { role: 'assistant', content: 'こんにちは！', timestamp: Date.now() }
                ]
            };
        });

        test('セッションをJSON形式でエクスポートできる', () => {
            const exported = exportImportManager.exportSessionToJSON(testSession);
            expect(exported).toHaveProperty('version');
            expect(exported).toHaveProperty('exportedAt');
            expect(exported).toHaveProperty('type', 'chat-session');
            expect(exported.session).toHaveProperty('id', testSession.id);
            expect(exported.session).toHaveProperty('title', testSession.title);
            expect(exported.session.messages.length).toBe(2);
        });

        test('セッションをMarkdown形式でエクスポートできる', () => {
            const markdown = exportImportManager.exportSessionToMarkdown(testSession);
            expect(markdown).toContain(testSession.title);
            expect(markdown).toContain('こんにちは');
            expect(markdown).toContain('こんにちは！');
            expect(markdown).toContain('👤 ユーザー');
            expect(markdown).toContain('🤖 AI');
        });

        test('複数セッションのバッチエクスポートができる', () => {
            const sessions = [testSession, { ...testSession, id: 'test-session-2' }];
            const exported = exportImportManager.exportBatchSessions(sessions);
            expect(exported).toHaveProperty('type', 'batch-export');
            expect(exported.sessions.length).toBe(2);
            expect(exported).toHaveProperty('count', 2);
        });

        test('暗号化されたデータを復号化できる', async () => {
            const password = 'test-password';
            const testData = 'テストデータ';

            const encrypted = await exportImportManager.encryptData(testData, password);
            expect(encrypted).toHaveProperty('encrypted', true);
            expect(encrypted).toHaveProperty('algorithm', 'AES-GCM');
            expect(encrypted).toHaveProperty('salt');
            expect(encrypted).toHaveProperty('iv');
            expect(encrypted).toHaveProperty('data');

            const decrypted = await exportImportManager.decryptData(encrypted, password);
            expect(decrypted).toBe(testData);
        });

        test('JSONインポートが正しく動作する', async () => {
            const exported = exportImportManager.exportSessionToJSON(testSession);
            const jsonString = JSON.stringify(exported);
            const imported = await exportImportManager.importFromJSON(jsonString);

            expect(imported.type).toBe('chat-session');
            expect(imported.session.id).toBe(testSession.id);
            expect(imported.session.title).toBe(testSession.title);
            expect(imported.session.messages.length).toBe(2);
        });

        test('暗号化されたJSONのインポートが正しく動作する', async () => {
            const password = 'test-password';
            const exported = exportImportManager.exportSessionToJSON(testSession, { encrypt: true });
            const encrypted = await exportImportManager.encryptData(JSON.stringify(exported.session), password);

            const encryptedExport = {
                ...exported,
                encrypted: true,
                session: encrypted
            };

            const imported = await exportImportManager.importFromJSON(
                JSON.stringify(encryptedExport),
                password
            );

            expect(imported.session.id).toBe(testSession.id);
        });
    });

    describe('PerformanceOptimizer', () => {
        let performanceOptimizer;

        beforeEach(() => {
            performanceOptimizer = new PerformanceOptimizer();
        });

        test('ストリーミングバッファが初期化される', () => {
            const messageId = 'test-message-1';
            const buffer = performanceOptimizer.initStreamingBuffer(messageId);

            expect(buffer).toHaveProperty('id', messageId);
            expect(buffer).toHaveProperty('content', '');
            expect(buffer).toHaveProperty('lastFlushTime');
        });

        test('ストリーミングバッファにチャンクを追加できる', (done) => {
            const messageId = 'test-message-2';
            performanceOptimizer.initStreamingBuffer(messageId);

            let flushedContent = '';
            const onFlush = (content) => {
                flushedContent = content;
            };

            // 大きなチャンクを追加してフラッシュをトリガー
            const largeChunk = 'a'.repeat(150);
            performanceOptimizer.addToStreamingBuffer(messageId, largeChunk, onFlush);

            setTimeout(() => {
                expect(flushedContent).toBe(largeChunk);
                done();
            }, 50);
        });

        test('メモリ使用量を推定できる', () => {
            const messages = [
                { content: 'テスト1', id: '1', role: 'user', timestamp: Date.now() },
                { content: 'テスト2', id: '2', role: 'assistant', timestamp: Date.now() }
            ];

            const memoryUsage = performanceOptimizer.estimateMemoryUsage(messages);
            expect(memoryUsage).toBeGreaterThan(0);
        });

        test('バッチ操作が正しく実行される', async () => {
            const items = [1, 2, 3, 4, 5];
            const operation = async (item) => item * 2;

            const results = await performanceOptimizer.batchOperation(items, operation, 2);
            expect(results).toEqual([2, 4, 6, 8, 10]);
        });

        test('設定を更新できる', () => {
            const newConfig = {
                streaming: {
                    bufferSize: 200,
                    flushInterval: 32
                }
            };

            performanceOptimizer.updateConfig(newConfig);
            const stats = performanceOptimizer.getStats();
            expect(stats).toBeDefined();
        });

        test('パフォーマンス統計を取得できる', () => {
            const stats = performanceOptimizer.getStats();
            expect(stats).toHaveProperty('streamingBuffers');
            expect(stats).toHaveProperty('virtualScrollEnabled');
            expect(stats).toHaveProperty('memoryConfig');
        });

        test('クリーンアップが正しく動作する', () => {
            const messageId = 'test-message-3';
            performanceOptimizer.initStreamingBuffer(messageId);

            performanceOptimizer.cleanup();

            const stats = performanceOptimizer.getStats();
            expect(stats.streamingBuffers).toBe(0);
        });
    });

    describe('ChatStorage バッチ操作', () => {
        let chatStorage;

        beforeEach(async () => {
            chatStorage = new ChatStorage();
            await chatStorage.initDB();
        });

        afterEach(async () => {
            await chatStorage.deleteDatabase();
        });

        test('複数セッションを一括保存できる', async () => {
            const sessions = [
                {
                    id: 'batch-1',
                    title: 'バッチテスト1',
                    messages: [],
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                },
                {
                    id: 'batch-2',
                    title: 'バッチテスト2',
                    messages: [],
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                }
            ];

            const results = await chatStorage.batchSaveSessions(sessions);
            expect(results.length).toBe(2);

            const saved1 = await chatStorage.getSession('batch-1');
            const saved2 = await chatStorage.getSession('batch-2');

            expect(saved1).toBeDefined();
            expect(saved2).toBeDefined();
        });

        test('古いセッションをアーカイブできる', async () => {
            // 複数のセッションを作成
            const sessions = Array.from({ length: 10 }, (_, i) => ({
                id: `archive-test-${i}`,
                title: `アーカイブテスト${i}`,
                messages: [],
                createdAt: Date.now() - (10 - i) * 1000,
                updatedAt: Date.now() - (10 - i) * 1000,
                isFavorite: i === 0 // 最初のセッションはお気に入り
            }));

            await chatStorage.batchSaveSessions(sessions);

            const result = await chatStorage.archiveOldSessions(5);
            expect(result.archived).toBeLessThanOrEqual(5);
            expect(result.remaining).toBeGreaterThanOrEqual(5);

            // お気に入りは削除されないことを確認
            const favoriteSession = await chatStorage.getSession('archive-test-0');
            expect(favoriteSession).toBeDefined();
        });

        test('メモリ最適化が実行される', async () => {
            // テストセッションを作成
            const sessions = Array.from({ length: 5 }, (_, i) => ({
                id: `memory-test-${i}`,
                title: `メモリテスト${i}`,
                messages: [],
                createdAt: Date.now(),
                updatedAt: Date.now()
            }));

            await chatStorage.batchSaveSessions(sessions);

            const result = await chatStorage.optimizeMemory();
            expect(result).toHaveProperty('archived');
            expect(result).toHaveProperty('remaining');
        });
    });

    describe('Phase 3 統合シナリオ', () => {
        test('スタイル制御と構造化生成の組み合わせ', async () => {
            const styleController = new StyleController();
            const structuredGenerator = new StructuredGenerator();

            // スタイルプリセットを適用
            await styleController.applyPreset('blog-post');

            // 構造化生成のプロンプトを生成
            const variables = { topic: 'AI', audience: '一般', keywords: '機械学習' };
            const basePrompt = structuredGenerator.generateSectionPrompt('blog-post', 'title', variables);

            // スタイルを適用
            const styledPrompt = styleController.applyStyleToPrompt(basePrompt);

            expect(styledPrompt).toContain(basePrompt);
            expect(styledPrompt).toContain('カジュアル');
        });

        test('エクスポートとパフォーマンス最適化の組み合わせ', async () => {
            const exportImportManager = new ExportImportManager();
            const performanceOptimizer = new PerformanceOptimizer();

            // 大量のセッションを生成
            const sessions = Array.from({ length: 100 }, (_, i) => ({
                id: `perf-test-${i}`,
                title: `パフォーマンステスト${i}`,
                messages: Array.from({ length: 10 }, (_, j) => ({
                    role: j % 2 === 0 ? 'user' : 'assistant',
                    content: `メッセージ${j}`,
                    timestamp: Date.now()
                })),
                createdAt: Date.now(),
                updatedAt: Date.now()
            }));

            // バッチエクスポート
            const exported = exportImportManager.exportBatchSessions(sessions);
            expect(exported.sessions.length).toBe(100);

            // メモリ使用量を推定
            const allMessages = sessions.flatMap(s => s.messages);
            const memoryUsage = performanceOptimizer.estimateMemoryUsage(allMessages);
            expect(memoryUsage).toBeGreaterThan(0);
        });

        test('全Phase 3機能の総合テスト', async () => {
            // 1. スタイル制御
            const styleController = new StyleController();
            await styleController.applyPreset('technical-doc');
            expect(styleController.isEnabled()).toBe(true);

            // 2. 構造化生成
            const structuredGenerator = new StructuredGenerator();
            const template = structuredGenerator.getTemplate('technical-doc');
            expect(template).toBeDefined();

            // 3. エクスポート/インポート
            const exportImportManager = new ExportImportManager();
            const testSession = {
                id: 'integration-test',
                title: '統合テスト',
                messages: [{ role: 'user', content: 'テスト', timestamp: Date.now() }],
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            const exported = exportImportManager.exportSessionToJSON(testSession);
            const imported = await exportImportManager.importFromJSON(JSON.stringify(exported));
            expect(imported.session.id).toBe(testSession.id);

            // 4. パフォーマンス最適化
            const performanceOptimizer = new PerformanceOptimizer();
            const stats = performanceOptimizer.getStats();
            expect(stats).toBeDefined();

            console.log('✓ 全Phase 3機能が正常に動作しています');
        });
    });
});
