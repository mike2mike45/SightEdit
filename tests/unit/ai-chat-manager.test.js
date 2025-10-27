/**
 * AIChatManager のユニットテスト
 */

import { AIChatManager } from '../../src/lib/ai-chat-manager.js';

// モックオブジェクト
const createMockAIManager = () => ({
    settings: {
        selectedModel: 'gemini-2.5-pro',
        aiProvider: 'gemini',
        geminiApiKey: 'test-key'
    },
    createMessage: (role, content, metadata = {}) => ({
        role,
        content,
        timestamp: Date.now(),
        metadata: {
            model: 'gemini-2.5-pro',
            provider: 'gemini',
            ...metadata
        }
    }),
    manageTokenLimit: (messages) => messages,
    callAIWithStreaming: jest.fn()
});

const createMockChatStorage = () => ({
    saveSession: jest.fn((session) => Promise.resolve(session.id)),
    getSession: jest.fn(),
    updateSession: jest.fn(),
    deleteSession: jest.fn(),
    getAllSessions: jest.fn(() => Promise.resolve([])),
    getMessages: jest.fn(() => Promise.resolve([])),
    addMessage: jest.fn((sessionId, message) => Promise.resolve(message.id)),
    searchSessions: jest.fn(() => Promise.resolve([])),
    getFavoriteSessions: jest.fn(() => Promise.resolve([])),
    getStorageSize: jest.fn(() => Promise.resolve(1024)),
    cleanup: jest.fn(() => Promise.resolve(0)),
    exportSession: jest.fn()
});

describe('AIChatManager', () => {
    let manager;
    let mockAIManager;
    let mockChatStorage;

    beforeEach(() => {
        mockAIManager = createMockAIManager();
        mockChatStorage = createMockChatStorage();
        manager = new AIChatManager(mockAIManager, null, mockChatStorage);
    });

    describe('Session Management', () => {
        test('should create a new session', async () => {
            const session = await manager.createNewSession('Test Session');

            expect(session).toBeDefined();
            expect(session.title).toBe('Test Session');
            expect(session.messages).toEqual([]);
            expect(mockChatStorage.saveSession).toHaveBeenCalled();
            expect(manager.currentSession).toBe(session);
        });

        test('should create session with auto-generated title', async () => {
            const session = await manager.createNewSession();

            expect(session.title).toBe('新しい会話');
        });

        test('should load an existing session', async () => {
            const mockSession = {
                id: 'session-1',
                title: 'Existing Session',
                messages: []
            };

            mockChatStorage.getSession.mockResolvedValue(mockSession);
            mockChatStorage.getMessages.mockResolvedValue([
                { id: 'msg-1', role: 'user', content: 'Hello' }
            ]);

            const session = await manager.loadSession('session-1');

            expect(session.id).toBe('session-1');
            expect(session.messages.length).toBe(1);
            expect(manager.currentSession).toBe(session);
        });

        test('should throw error when loading non-existent session', async () => {
            mockChatStorage.getSession.mockResolvedValue(null);

            await expect(manager.loadSession('non-existent'))
                .rejects.toThrow('セッションが見つかりません');
        });

        test('should save current session', async () => {
            await manager.createNewSession('Test');
            await manager.saveSession();

            expect(mockChatStorage.saveSession).toHaveBeenCalledTimes(2); // create + save
        });

        test('should delete a session', async () => {
            await manager.createNewSession('To Delete');
            const sessionId = manager.currentSession.id;

            await manager.deleteSession(sessionId);

            expect(mockChatStorage.deleteSession).toHaveBeenCalledWith(sessionId);
            expect(manager.currentSession).toBeNull();
        });

        test('should update session title', async () => {
            await manager.createNewSession('Old Title');
            const sessionId = manager.currentSession.id;

            await manager.updateSessionTitle(sessionId, 'New Title');

            expect(mockChatStorage.updateSession).toHaveBeenCalledWith(
                sessionId,
                { title: 'New Title' }
            );
            expect(manager.currentSession.title).toBe('New Title');
        });

        test('should toggle favorite', async () => {
            await manager.createNewSession('Test');
            const sessionId = manager.currentSession.id;

            await manager.toggleFavorite(sessionId, true);

            expect(mockChatStorage.updateSession).toHaveBeenCalledWith(
                sessionId,
                { isFavorite: true }
            );
            expect(manager.currentSession.isFavorite).toBe(true);
        });
    });

    describe('Message Sending', () => {
        test('should create session if not exists when sending message', async () => {
            mockAIManager.callAIWithStreaming.mockImplementation(
                (messages, onChunk, onComplete) => {
                    onComplete('AI response');
                    return Promise.resolve();
                }
            );

            await manager.sendMessageWithStreaming(
                'Hello',
                { includeContext: false },
                jest.fn(),
                jest.fn(),
                jest.fn()
            );

            expect(manager.currentSession).toBeDefined();
        });

        test('should add user message to session', async () => {
            mockAIManager.callAIWithStreaming.mockImplementation(
                (messages, onChunk, onComplete) => {
                    onComplete('AI response');
                    return Promise.resolve();
                }
            );

            await manager.createNewSession();
            const initialMessageCount = manager.currentSession.messages.length;

            await manager.sendMessageWithStreaming(
                'Test message',
                { includeContext: false },
                jest.fn(),
                jest.fn(),
                jest.fn()
            );

            expect(manager.currentSession.messages.length).toBe(initialMessageCount + 2); // user + assistant
            expect(mockChatStorage.addMessage).toHaveBeenCalled();
        });

        test('should auto-generate title from first message', async () => {
            mockAIManager.callAIWithStreaming.mockImplementation(
                (messages, onChunk, onComplete) => {
                    onComplete('AI response');
                    return Promise.resolve();
                }
            );

            await manager.createNewSession();

            await manager.sendMessageWithStreaming(
                'This is a very long message that should be truncated for the title',
                { includeContext: false },
                jest.fn(),
                jest.fn(),
                jest.fn()
            );

            expect(manager.currentSession.title).not.toBe('新しい会話');
            expect(manager.currentSession.title.length).toBeLessThanOrEqual(33); // 30 chars + "..."
        });

        test('should call onChunk during streaming', async () => {
            const onChunk = jest.fn();
            const onComplete = jest.fn();
            const onError = jest.fn();

            mockAIManager.callAIWithStreaming.mockImplementation(
                (messages, chunkCallback, completeCallback) => {
                    chunkCallback('Hello');
                    chunkCallback(' ');
                    chunkCallback('World');
                    completeCallback('Hello World');
                    return Promise.resolve();
                }
            );

            await manager.sendMessageWithStreaming(
                'Test',
                { includeContext: false },
                onChunk,
                onComplete,
                onError
            );

            expect(onChunk).toHaveBeenCalledTimes(3);
            expect(onChunk).toHaveBeenCalledWith('Hello');
            expect(onChunk).toHaveBeenCalledWith(' ');
            expect(onChunk).toHaveBeenCalledWith('World');
            expect(onComplete).toHaveBeenCalledWith('Hello World');
        });

        test('should handle errors', async () => {
            const onError = jest.fn();
            const testError = new Error('API Error');

            mockAIManager.callAIWithStreaming.mockImplementation(
                (messages, onChunk, onComplete, errorCallback) => {
                    errorCallback(testError);
                    return Promise.resolve();
                }
            );

            await manager.sendMessageWithStreaming(
                'Test',
                { includeContext: false },
                jest.fn(),
                jest.fn(),
                onError
            );

            expect(onError).toHaveBeenCalledWith(testError);
            expect(manager.isStreaming).toBe(false);
        });
    });

    describe('Context Management', () => {
        test('should return empty string when context type is none', () => {
            const context = manager.getEditorContext('none');
            expect(context).toBe('');
        });

        test('should return empty string when editor is not available', () => {
            const context = manager.getEditorContext('full');
            expect(context).toBe('');
        });

        test('should generate title from message', () => {
            const shortMessage = 'Short message';
            const title1 = manager.generateTitleFromMessage(shortMessage);
            expect(title1).toBe('Short message');

            const longMessage = 'This is a very long message that exceeds thirty characters';
            const title2 = manager.generateTitleFromMessage(longMessage);
            expect(title2).toBe('This is a very long message th...');

            const multilineMessage = 'First line\nSecond line\nThird line';
            const title3 = manager.generateTitleFromMessage(multilineMessage);
            expect(title3).toBe('First line');
        });
    });

    describe('History Management', () => {
        test('should get all sessions', async () => {
            const mockSessions = [
                { id: '1', title: 'Session 1' },
                { id: '2', title: 'Session 2' }
            ];

            mockChatStorage.getAllSessions.mockResolvedValue(mockSessions);

            const sessions = await manager.getSessions();

            expect(sessions).toEqual(mockSessions);
        });

        test('should search sessions', async () => {
            const results = [{ id: '1', title: 'Test Session' }];
            mockChatStorage.searchSessions.mockResolvedValue(results);

            const sessions = await manager.searchSessions('Test');

            expect(sessions).toEqual(results);
            expect(mockChatStorage.searchSessions).toHaveBeenCalledWith('Test');
        });

        test('should get favorite sessions', async () => {
            const favorites = [{ id: '1', title: 'Favorite', isFavorite: true }];
            mockChatStorage.getFavoriteSessions.mockResolvedValue(favorites);

            const sessions = await manager.getFavoriteSessions();

            expect(sessions).toEqual(favorites);
        });

        test('should get today sessions', async () => {
            const now = Date.now();
            const yesterday = now - (24 * 60 * 60 * 1000);

            const mockSessions = [
                { id: '1', title: 'Today', createdAt: now },
                { id: '2', title: 'Yesterday', createdAt: yesterday }
            ];

            mockChatStorage.getAllSessions.mockResolvedValue(mockSessions);

            const todaySessions = await manager.getTodaySessions();

            expect(todaySessions.length).toBe(1);
            expect(todaySessions[0].title).toBe('Today');
        });

        test('should get this week sessions', async () => {
            const now = Date.now();
            const lastWeek = now - (8 * 24 * 60 * 60 * 1000);

            const mockSessions = [
                { id: '1', title: 'This Week', createdAt: now },
                { id: '2', title: 'Last Week', createdAt: lastWeek }
            ];

            mockChatStorage.getAllSessions.mockResolvedValue(mockSessions);

            const weekSessions = await manager.getThisWeekSessions();

            expect(weekSessions.length).toBe(1);
            expect(weekSessions[0].title).toBe('This Week');
        });
    });

    describe('Utility Functions', () => {
        test('should get current session', () => {
            expect(manager.getCurrentSession()).toBeNull();
        });

        test('should check if streaming', () => {
            expect(manager.getIsStreaming()).toBe(false);

            manager.isStreaming = true;
            expect(manager.getIsStreaming()).toBe(true);
        });

        test('should clear current session', async () => {
            await manager.createNewSession('Test');
            expect(manager.currentSession).not.toBeNull();

            manager.clearCurrentSession();
            expect(manager.currentSession).toBeNull();
        });

        test('should get statistics', async () => {
            const mockSessions = [
                { id: '1', provider: 'gemini', messages: [1, 2], isFavorite: true },
                { id: '2', provider: 'claude', messages: [1], isFavorite: false },
                { id: '3', provider: 'gemini', messages: [1, 2, 3], isFavorite: false }
            ];

            mockChatStorage.getAllSessions.mockResolvedValue(mockSessions);
            mockChatStorage.getStorageSize.mockResolvedValue(2048);

            const stats = await manager.getStatistics();

            expect(stats.totalSessions).toBe(3);
            expect(stats.totalMessages).toBe(6);
            expect(stats.favoriteSessions).toBe(1);
            expect(stats.byProvider.gemini).toBe(2);
            expect(stats.byProvider.claude).toBe(1);
            expect(stats.storageSize).toBe(2048);
        });

        test('should generate unique IDs', () => {
            const id1 = manager.generateId();
            const id2 = manager.generateId();

            expect(id1).not.toBe(id2);
            expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
        });

        test('should cleanup storage', async () => {
            mockChatStorage.cleanup.mockResolvedValue(5);

            const deleted = await manager.cleanup(100);

            expect(deleted).toBe(5);
            expect(mockChatStorage.cleanup).toHaveBeenCalledWith(100);
        });
    });
});
