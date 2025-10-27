/**
 * AIManager ストリーミング機能のユニットテスト
 */

import { AIManager } from '../../src/lib/ai-manager.js';

describe('AIManager - Streaming Functions', () => {
    let aiManager;

    beforeEach(() => {
        aiManager = new AIManager();
        aiManager.settings = {
            geminiApiKey: 'test-gemini-key',
            claudeApiKey: 'test-claude-key',
            aiProvider: 'gemini',
            selectedModel: 'gemini-2.5-pro'
        };
    });

    describe('buildGeminiRequestBody', () => {
        test('should build Gemini request body correctly', () => {
            const messages = [
                { role: 'user', content: 'Hello' },
                { role: 'assistant', content: 'Hi there!' },
                { role: 'user', content: 'How are you?' }
            ];

            const requestBody = aiManager.buildGeminiRequestBody(messages);

            expect(requestBody.contents).toBeDefined();
            expect(requestBody.contents.length).toBe(3);

            // ユーザーメッセージは 'user' のまま
            expect(requestBody.contents[0].role).toBe('user');
            expect(requestBody.contents[0].parts[0].text).toBe('Hello');

            // assistant は 'model' に変換
            expect(requestBody.contents[1].role).toBe('model');
            expect(requestBody.contents[1].parts[0].text).toBe('Hi there!');

            // generationConfig が含まれる
            expect(requestBody.generationConfig).toBeDefined();
            expect(requestBody.generationConfig.temperature).toBe(0.7);
        });

        test('should include model maxTokens', () => {
            const messages = [{ role: 'user', content: 'Test' }];
            const requestBody = aiManager.buildGeminiRequestBody(messages);

            expect(requestBody.generationConfig.maxOutputTokens).toBe(8192);
        });
    });

    describe('buildClaudeRequestBody', () => {
        test('should build Claude request body correctly', () => {
            aiManager.settings.aiProvider = 'claude';
            aiManager.settings.selectedModel = 'claude-3-5-sonnet-20241022';

            const messages = [
                { role: 'user', content: 'Hello' },
                { role: 'assistant', content: 'Hi there!' }
            ];

            const requestBody = aiManager.buildClaudeRequestBody(messages);

            expect(requestBody.model).toBe('claude-3-5-sonnet-20241022');
            expect(requestBody.max_tokens).toBe(8192);
            expect(requestBody.messages).toBeDefined();
            expect(requestBody.messages.length).toBe(2);

            // role はそのまま
            expect(requestBody.messages[0].role).toBe('user');
            expect(requestBody.messages[0].content).toBe('Hello');
            expect(requestBody.messages[1].role).toBe('assistant');
            expect(requestBody.messages[1].content).toBe('Hi there!');
        });
    });

    describe('manageTokenLimit', () => {
        test('should keep all messages when under limit', () => {
            const messages = [
                { role: 'user', content: 'Hello' },
                { role: 'assistant', content: 'Hi' },
                { role: 'user', content: 'Bye' }
            ];

            const managed = aiManager.manageTokenLimit(messages, 1000);

            expect(managed.length).toBe(3);
        });

        test('should trim old messages when over limit', () => {
            const messages = [
                { role: 'user', content: 'A'.repeat(1000) },  // ~250 tokens
                { role: 'assistant', content: 'B'.repeat(1000) },  // ~250 tokens
                { role: 'user', content: 'C'.repeat(1000) },  // ~250 tokens
                { role: 'assistant', content: 'D'.repeat(1000) },  // ~250 tokens
                { role: 'user', content: 'E'.repeat(1000) }   // ~250 tokens
            ];

            // maxTokens = 400 (80% = 320) なので、最新2-3件のみ
            const managed = aiManager.manageTokenLimit(messages, 400);

            // 古いメッセージは削除される
            expect(managed.length).toBeLessThan(5);

            // 最新のメッセージは残る
            expect(managed[managed.length - 1].content).toContain('E');
        });

        test('should keep at least one message', () => {
            const messages = [
                { role: 'user', content: 'A'.repeat(10000) }  // 非常に長いメッセージ
            ];

            const managed = aiManager.manageTokenLimit(messages, 100);

            // 制限を超えても最低1つは残す
            expect(managed.length).toBe(1);
        });

        test('should handle empty messages array', () => {
            const managed = aiManager.manageTokenLimit([], 1000);

            expect(managed.length).toBe(0);
        });
    });

    describe('createMessage', () => {
        test('should create message with correct structure', () => {
            const message = aiManager.createMessage('user', 'Hello');

            expect(message.role).toBe('user');
            expect(message.content).toBe('Hello');
            expect(message.timestamp).toBeDefined();
            expect(message.metadata).toBeDefined();
            expect(message.metadata.model).toBe('gemini-2.5-pro');
            expect(message.metadata.provider).toBe('gemini');
        });

        test('should include custom metadata', () => {
            const message = aiManager.createMessage('assistant', 'Hi', {
                custom: 'data',
                tokens: 10
            });

            expect(message.metadata.custom).toBe('data');
            expect(message.metadata.tokens).toBe(10);
            expect(message.metadata.model).toBe('gemini-2.5-pro');
        });

        test('should set timestamp automatically', () => {
            const beforeTimestamp = Date.now();
            const message = aiManager.createMessage('user', 'Test');
            const afterTimestamp = Date.now();

            expect(message.timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
            expect(message.timestamp).toBeLessThanOrEqual(afterTimestamp);
        });
    });

    describe('callAIWithStreaming', () => {
        test('should throw error when API key is missing', async () => {
            aiManager.settings.geminiApiKey = '';

            const onChunk = jest.fn();
            const onComplete = jest.fn();
            const onError = jest.fn();

            await aiManager.callAIWithStreaming(
                [{ role: 'user', content: 'Test' }],
                onChunk,
                onComplete,
                onError
            );

            expect(onError).toHaveBeenCalled();
            expect(onError.mock.calls[0][0].message).toContain('APIキー');
        });

        // 注: 実際のストリーミング呼び出しのテストは
        // モックを使用するか、統合テストで実施する必要があります
    });
});
