/**
 * StreamingHandler のユニットテスト
 */

import { StreamingHandler, StreamBuffer } from '../../src/lib/streaming-handler.js';

describe('StreamingHandler', () => {
    let handler;

    beforeEach(() => {
        handler = new StreamingHandler();
    });

    afterEach(() => {
        handler.abort();
    });

    describe('parseClaudeSSE', () => {
        test('should parse Claude SSE format correctly', () => {
            const sseData = `event: content_block_delta
data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}

event: content_block_delta
data: {"type":"content_block_delta","delta":{"type":"text_delta","text":" World"}}

`;

            const result = handler.parseClaudeSSE(sseData);

            expect(result.parsed.length).toBe(2);
            expect(result.parsed[0].type).toBe('content_block_delta');
            expect(result.parsed[0].data.delta.text).toBe('Hello');
            expect(result.parsed[1].data.delta.text).toBe(' World');
        });

        test('should handle incomplete SSE data', () => {
            const incompleteData = `event: content_block_delta
data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}

event: content_block_delta`;

            const result = handler.parseClaudeSSE(incompleteData);

            expect(result.parsed.length).toBe(1);
            expect(result.remaining).toBeTruthy();
        });

        test('should parse message_stop event', () => {
            const sseData = `event: message_stop
data: {"type":"message_stop"}

`;

            const result = handler.parseClaudeSSE(sseData);

            expect(result.parsed.length).toBe(1);
            expect(result.parsed[0].type).toBe('message_stop');
        });
    });

    describe('parseSSE', () => {
        test('should parse simple SSE format', () => {
            const sseChunk = `data: {"text":"Hello"}
data: {"text":"World"}
data: [DONE]
`;

            const events = StreamingHandler.parseSSE(sseChunk);

            expect(events.length).toBe(3);
            expect(events[0].type).toBe('data');
            expect(events[0].data.text).toBe('Hello');
            expect(events[1].data.text).toBe('World');
            expect(events[2].type).toBe('done');
        });

        test('should handle malformed JSON gracefully', () => {
            const sseChunk = `data: {invalid json}
data: {"text":"Valid"}
`;

            const events = StreamingHandler.parseSSE(sseChunk);

            // 無効なJSONは無視され、有効なものだけパースされる
            expect(events.length).toBe(1);
            expect(events[0].data.text).toBe('Valid');
        });
    });

    describe('abort', () => {
        test('should abort streaming', () => {
            handler.abortController = new AbortController();

            expect(handler.isStreaming()).toBe(true);

            handler.abort();

            // abort後は null になる
            expect(handler.abortController).toBeNull();
        });

        test('should not throw error when aborting non-streaming', () => {
            expect(() => handler.abort()).not.toThrow();
        });
    });

    describe('isStreaming', () => {
        test('should return false when not streaming', () => {
            expect(handler.isStreaming()).toBe(false);
        });

        test('should return true when streaming', () => {
            handler.abortController = new AbortController();
            expect(handler.isStreaming()).toBe(true);
        });
    });

    describe('sleep', () => {
        test('should sleep for specified duration', async () => {
            const start = Date.now();
            await handler.sleep(100);
            const duration = Date.now() - start;

            expect(duration).toBeGreaterThanOrEqual(90);
            expect(duration).toBeLessThan(200);
        });
    });

    // 注: Gemini と Claude の実際のストリーミングテストは
    // モックを使用するか、統合テストで実施する必要があります
});

describe('StreamBuffer', () => {
    jest.useFakeTimers();

    test('should buffer and flush chunks', () => {
        const flushed = [];
        const buffer = new StreamBuffer((text) => {
            flushed.push(text);
        }, 50);

        buffer.add('Hello');
        buffer.add(' ');
        buffer.add('World');

        // まだフラッシュされていない
        expect(flushed.length).toBe(0);

        // タイマーを進める
        jest.advanceTimersByTime(50);

        // フラッシュされる
        expect(flushed.length).toBe(1);
        expect(flushed[0]).toBe('Hello World');
    });

    test('should flush immediately on final()', () => {
        const flushed = [];
        const buffer = new StreamBuffer((text) => {
            flushed.push(text);
        }, 100);

        buffer.add('Test');
        buffer.final();

        // タイマーを待たずにフラッシュされる
        expect(flushed.length).toBe(1);
        expect(flushed[0]).toBe('Test');
    });

    test('should not flush empty buffer', () => {
        const flushed = [];
        const buffer = new StreamBuffer((text) => {
            flushed.push(text);
        });

        buffer.flush();

        expect(flushed.length).toBe(0);
    });

    test('should handle multiple flush cycles', () => {
        const flushed = [];
        const buffer = new StreamBuffer((text) => {
            flushed.push(text);
        }, 50);

        // 第1サイクル
        buffer.add('First');
        jest.advanceTimersByTime(50);

        // 第2サイクル
        buffer.add('Second');
        jest.advanceTimersByTime(50);

        expect(flushed.length).toBe(2);
        expect(flushed[0]).toBe('First');
        expect(flushed[1]).toBe('Second');
    });

    afterEach(() => {
        jest.useRealTimers();
    });
});
