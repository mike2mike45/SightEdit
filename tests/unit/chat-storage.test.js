/**
 * ChatStorage のユニットテスト
 */

import { ChatStorage } from '../../src/lib/chat-storage.js';

describe('ChatStorage', () => {
    let storage;

    beforeEach(async () => {
        storage = new ChatStorage();
        await storage.initDB();
    });

    afterEach(async () => {
        await storage.deleteDatabase();
    });

    describe('initDB', () => {
        test('should initialize IndexedDB successfully', async () => {
            expect(storage.db).toBeDefined();
            expect(storage.db.name).toBe('SightEditChatDB');
            expect(storage.db.version).toBe(1);
        });

        test('should create required object stores', async () => {
            const objectStoreNames = Array.from(storage.db.objectStoreNames);
            expect(objectStoreNames).toContain('sessions');
            expect(objectStoreNames).toContain('messages');
            expect(objectStoreNames).toContain('promptTemplates');
        });
    });

    describe('Session Management', () => {
        test('should save and retrieve a session', async () => {
            const session = {
                title: 'Test Session',
                messages: [],
                model: 'gemini-2.5-pro',
                provider: 'gemini'
            };

            const sessionId = await storage.saveSession(session);
            expect(sessionId).toBeDefined();

            const retrieved = await storage.getSession(sessionId);
            expect(retrieved).toBeDefined();
            expect(retrieved.title).toBe('Test Session');
            expect(retrieved.model).toBe('gemini-2.5-pro');
        });

        test('should update a session', async () => {
            const session = {
                title: 'Original Title',
                messages: []
            };

            const sessionId = await storage.saveSession(session);
            await storage.updateSession(sessionId, { title: 'Updated Title' });

            const updated = await storage.getSession(sessionId);
            expect(updated.title).toBe('Updated Title');
        });

        test('should delete a session', async () => {
            const session = { title: 'To Delete', messages: [] };
            const sessionId = await storage.saveSession(session);

            await storage.deleteSession(sessionId);

            const retrieved = await storage.getSession(sessionId);
            expect(retrieved).toBeNull();
        });

        test('should get all sessions', async () => {
            await storage.saveSession({ title: 'Session 1', messages: [] });
            await storage.saveSession({ title: 'Session 2', messages: [] });
            await storage.saveSession({ title: 'Session 3', messages: [] });

            const sessions = await storage.getAllSessions();
            expect(sessions.length).toBe(3);
        });

        test('should get all sessions with limit', async () => {
            await storage.saveSession({ title: 'Session 1', messages: [] });
            await storage.saveSession({ title: 'Session 2', messages: [] });
            await storage.saveSession({ title: 'Session 3', messages: [] });

            const sessions = await storage.getAllSessions({ limit: 2 });
            expect(sessions.length).toBe(2);
        });
    });

    describe('Message Management', () => {
        test('should add messages to a session', async () => {
            const sessionId = await storage.saveSession({ title: 'Chat', messages: [] });

            const message1 = {
                role: 'user',
                content: 'Hello',
                timestamp: Date.now()
            };

            const message2 = {
                role: 'assistant',
                content: 'Hi there!',
                timestamp: Date.now() + 1000
            };

            await storage.addMessage(sessionId, message1);
            await storage.addMessage(sessionId, message2);

            const messages = await storage.getMessages(sessionId);
            expect(messages.length).toBe(2);
            expect(messages[0].content).toBe('Hello');
            expect(messages[1].content).toBe('Hi there!');
        });

        test('should get messages sorted by timestamp', async () => {
            const sessionId = await storage.saveSession({ title: 'Chat', messages: [] });

            await storage.addMessage(sessionId, {
                role: 'user',
                content: 'Third',
                timestamp: Date.now() + 2000
            });

            await storage.addMessage(sessionId, {
                role: 'user',
                content: 'First',
                timestamp: Date.now()
            });

            await storage.addMessage(sessionId, {
                role: 'user',
                content: 'Second',
                timestamp: Date.now() + 1000
            });

            const messages = await storage.getMessages(sessionId);
            expect(messages[0].content).toBe('First');
            expect(messages[1].content).toBe('Second');
            expect(messages[2].content).toBe('Third');
        });

        test('should delete messages when session is deleted', async () => {
            const sessionId = await storage.saveSession({ title: 'Chat', messages: [] });

            await storage.addMessage(sessionId, {
                role: 'user',
                content: 'Test message'
            });

            await storage.deleteSession(sessionId);

            const messages = await storage.getMessages(sessionId);
            expect(messages.length).toBe(0);
        });
    });

    describe('Search', () => {
        test('should search sessions by title', async () => {
            await storage.saveSession({ title: 'JavaScript Tutorial', messages: [] });
            await storage.saveSession({ title: 'Python Guide', messages: [] });
            await storage.saveSession({ title: 'JavaScript Advanced', messages: [] });

            const results = await storage.searchSessions('JavaScript');
            expect(results.length).toBe(2);
        });

        test('should search sessions by tags', async () => {
            await storage.saveSession({
                title: 'Session 1',
                messages: [],
                tags: ['programming', 'javascript']
            });
            await storage.saveSession({
                title: 'Session 2',
                messages: [],
                tags: ['design', 'ui']
            });

            const results = await storage.searchSessions('programming');
            expect(results.length).toBe(1);
            expect(results[0].title).toBe('Session 1');
        });

        test('should get favorite sessions', async () => {
            await storage.saveSession({
                title: 'Favorite 1',
                messages: [],
                isFavorite: true
            });
            await storage.saveSession({
                title: 'Regular',
                messages: [],
                isFavorite: false
            });
            await storage.saveSession({
                title: 'Favorite 2',
                messages: [],
                isFavorite: true
            });

            const favorites = await storage.getFavoriteSessions();
            expect(favorites.length).toBe(2);
        });
    });

    describe('Storage Management', () => {
        test('should get storage size', async () => {
            await storage.saveSession({ title: 'Session 1', messages: [] });
            await storage.saveSession({ title: 'Session 2', messages: [] });

            const size = await storage.getStorageSize();
            expect(size).toBeGreaterThan(0);
        });

        test('should cleanup old sessions', async () => {
            // 5つのセッションを作成
            for (let i = 1; i <= 5; i++) {
                await storage.saveSession({
                    title: `Session ${i}`,
                    messages: [],
                    updatedAt: Date.now() - (i * 1000)
                });
            }

            // 最大3つまで保持
            const deleted = await storage.cleanup(3);

            const sessions = await storage.getAllSessions();
            expect(sessions.length).toBe(3);
            expect(deleted).toBe(2);
        });

        test('should not delete favorite sessions during cleanup', async () => {
            // 5つのセッションを作成（1つはお気に入り）
            await storage.saveSession({
                title: 'Old Favorite',
                messages: [],
                isFavorite: true,
                updatedAt: Date.now() - 10000
            });

            for (let i = 1; i <= 4; i++) {
                await storage.saveSession({
                    title: `Session ${i}`,
                    messages: [],
                    isFavorite: false,
                    updatedAt: Date.now() - (i * 1000)
                });
            }

            // 最大2つまで保持
            await storage.cleanup(2);

            const sessions = await storage.getAllSessions();
            const favorite = sessions.find(s => s.title === 'Old Favorite');

            expect(favorite).toBeDefined();
            expect(favorite.isFavorite).toBe(true);
        });
    });

    describe('Export', () => {
        test('should export session as JSON', async () => {
            const sessionId = await storage.saveSession({
                title: 'Export Test',
                messages: []
            });

            await storage.addMessage(sessionId, {
                role: 'user',
                content: 'Test message'
            });

            const exported = await storage.exportSession(sessionId, 'json');
            const parsed = JSON.parse(exported);

            expect(parsed.title).toBe('Export Test');
            expect(parsed.messages.length).toBe(1);
        });

        test('should export session as Markdown', async () => {
            const sessionId = await storage.saveSession({
                title: 'Markdown Export Test',
                model: 'gemini-2.5-pro',
                provider: 'gemini',
                messages: []
            });

            await storage.addMessage(sessionId, {
                role: 'user',
                content: 'Hello'
            });

            await storage.addMessage(sessionId, {
                role: 'assistant',
                content: 'Hi there!'
            });

            const exported = await storage.exportSession(sessionId, 'markdown');

            expect(exported).toContain('# Markdown Export Test');
            expect(exported).toContain('👤 ユーザー');
            expect(exported).toContain('🤖 AI');
            expect(exported).toContain('Hello');
            expect(exported).toContain('Hi there!');
        });
    });

    describe('Utility', () => {
        test('should generate unique IDs', () => {
            const id1 = storage.generateId();
            const id2 = storage.generateId();

            expect(id1).not.toBe(id2);
            expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
        });
    });
});
