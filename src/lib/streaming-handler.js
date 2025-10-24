/**
 * StreamingHandler - AI API のストリーミング応答処理
 *
 * Gemini と Claude のストリーミングAPIに対応し、
 * リアルタイムでチャンクを受信・処理します。
 */

export class StreamingHandler {
    constructor() {
        this.abortController = null;
    }

    /**
     * Gemini API のストリーミング呼び出し
     * @param {string} endpoint - API エンドポイント
     * @param {string} apiKey - API キー
     * @param {Object} requestBody - リクエストボディ
     * @param {Function} onChunk - チャンク受信コールバック
     * @param {Function} onComplete - 完了コールバック
     * @param {Function} onError - エラーコールバック
     */
    async streamGemini(endpoint, apiKey, requestBody, onChunk, onComplete, onError) {
        this.abortController = new AbortController();

        try {
            // Gemini は ?alt=sse パラメータでストリーミング対応
            const streamingEndpoint = endpoint.includes('?')
                ? `${endpoint}&alt=sse`
                : `${endpoint}?key=${apiKey}&alt=sse`;

            const response = await fetch(streamingEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
                signal: this.abortController.signal
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
            }

            // ReadableStream を取得
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            let buffer = '';
            let fullResponse = '';

            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    break;
                }

                // デコードして buffer に追加
                buffer += decoder.decode(value, { stream: true });

                // SSE 形式をパース（data: で始まる行）
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // 最後の不完全な行は buffer に残す

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.substring(6).trim();

                        // [DONE] で終了
                        if (data === '[DONE]') {
                            continue;
                        }

                        try {
                            const parsed = JSON.parse(data);

                            // Gemini の応答形式から text を抽出
                            if (parsed.candidates && parsed.candidates[0]) {
                                const candidate = parsed.candidates[0];
                                if (candidate.content && candidate.content.parts) {
                                    for (const part of candidate.content.parts) {
                                        if (part.text) {
                                            fullResponse += part.text;
                                            onChunk(part.text);
                                        }
                                    }
                                }
                            }
                        } catch (parseError) {
                            console.warn('Gemini SSE パースエラー:', parseError, data);
                        }
                    }
                }
            }

            onComplete(fullResponse);

        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Gemini ストリーミング中断');
                onError(new Error('ストリーミングが中断されました'));
            } else {
                console.error('Gemini ストリーミングエラー:', error);
                onError(error);
            }
        } finally {
            this.abortController = null;
        }
    }

    /**
     * Claude API のストリーミング呼び出し
     * @param {string} endpoint - API エンドポイント
     * @param {string} apiKey - API キー
     * @param {Object} requestBody - リクエストボディ
     * @param {Function} onChunk - チャンク受信コールバック
     * @param {Function} onComplete - 完了コールバック
     * @param {Function} onError - エラーコールバック
     */
    async streamClaude(endpoint, apiKey, requestBody, onChunk, onComplete, onError) {
        this.abortController = new AbortController();

        try {
            // Claude は stream: true パラメータでストリーミング対応
            const streamingBody = {
                ...requestBody,
                stream: true
            };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify(streamingBody),
                signal: this.abortController.signal
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Claude API Error: ${response.status} - ${errorText}`);
            }

            // ReadableStream を取得
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            let buffer = '';
            let fullResponse = '';

            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    break;
                }

                // デコードして buffer に追加
                buffer += decoder.decode(value, { stream: true });

                // SSE 形式をパース
                const events = this.parseClaudeSSE(buffer);

                // パースできたイベントを処理
                for (const event of events.parsed) {
                    if (event.type === 'content_block_delta') {
                        const text = event.data?.delta?.text;
                        if (text) {
                            fullResponse += text;
                            onChunk(text);
                        }
                    } else if (event.type === 'message_stop') {
                        // ストリーミング終了
                        console.log('Claude ストリーミング完了');
                    } else if (event.type === 'error') {
                        throw new Error(`Claude Error: ${event.data?.error?.message || 'Unknown error'}`);
                    }
                }

                // 残りの buffer を更新
                buffer = events.remaining;
            }

            onComplete(fullResponse);

        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Claude ストリーミング中断');
                onError(new Error('ストリーミングが中断されました'));
            } else {
                console.error('Claude ストリーミングエラー:', error);
                onError(error);
            }
        } finally {
            this.abortController = null;
        }
    }

    /**
     * Claude の SSE 形式をパース
     * @private
     * @param {string} buffer - 受信データ
     * @returns {Object} { parsed: Array, remaining: string }
     */
    parseClaudeSSE(buffer) {
        const lines = buffer.split('\n');
        const events = [];
        let currentEvent = { type: null, data: null };
        let remaining = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // 空行はイベント区切り
            if (line === '') {
                if (currentEvent.type) {
                    events.push(currentEvent);
                    currentEvent = { type: null, data: null };
                }
                continue;
            }

            // event: の行
            if (line.startsWith('event: ')) {
                currentEvent.type = line.substring(7).trim();
                continue;
            }

            // data: の行
            if (line.startsWith('data: ')) {
                const data = line.substring(6).trim();
                try {
                    currentEvent.data = JSON.parse(data);
                } catch (parseError) {
                    console.warn('Claude SSE data パースエラー:', parseError, data);
                }
                continue;
            }

            // 最後の行が不完全な場合は remaining に保存
            if (i === lines.length - 1 && !line.startsWith('event:') && !line.startsWith('data:')) {
                remaining = line;
            }
        }

        return { parsed: events, remaining };
    }

    /**
     * ストリーミングを中断
     */
    abort() {
        if (this.abortController) {
            console.log('ストリーミング中断リクエスト');
            this.abortController.abort();
        }
    }

    /**
     * 現在ストリーミング中かどうか
     * @returns {boolean}
     */
    isStreaming() {
        return this.abortController !== null;
    }

    /**
     * 汎用 SSE パーサー（シンプル版）
     * @param {string} chunk - SSE チャンク
     * @returns {Array} パースされたイベント配列
     */
    static parseSSE(chunk) {
        const events = [];
        const lines = chunk.split('\n');

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = line.substring(6);
                if (data === '[DONE]') {
                    events.push({ type: 'done', data: null });
                } else {
                    try {
                        events.push({ type: 'data', data: JSON.parse(data) });
                    } catch (error) {
                        console.warn('SSE パースエラー:', error);
                    }
                }
            }
        }

        return events;
    }

    /**
     * リトライ付きストリーミング呼び出し
     * @param {Function} streamFn - ストリーミング関数
     * @param {number} maxRetries - 最大リトライ回数
     * @param {number} retryDelay - リトライ間隔（ミリ秒）
     */
    async streamWithRetry(streamFn, maxRetries = 3, retryDelay = 1000) {
        let lastError = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                await streamFn();
                return; // 成功したら終了
            } catch (error) {
                lastError = error;

                // AbortError はリトライしない
                if (error.name === 'AbortError') {
                    throw error;
                }

                // 最後の試行でなければリトライ
                if (attempt < maxRetries - 1) {
                    console.log(`ストリーミングリトライ ${attempt + 1}/${maxRetries} (${retryDelay}ms 後)`);
                    await this.sleep(retryDelay);
                    retryDelay *= 2; // エクスポネンシャルバックオフ
                }
            }
        }

        throw lastError;
    }

    /**
     * スリープ
     * @private
     * @param {number} ms - ミリ秒
     * @returns {Promise}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * ストリーミングバッファ - バッチ更新用
 *
 * チャンクをバッファリングして、一定間隔でまとめて UI 更新することで
 * パフォーマンスを向上させます。
 */
export class StreamBuffer {
    constructor(onFlush, flushInterval = 50) {
        this.buffer = '';
        this.onFlush = onFlush;
        this.flushInterval = flushInterval;
        this.timer = null;
    }

    /**
     * チャンクを追加
     * @param {string} chunk - テキストチャンク
     */
    add(chunk) {
        this.buffer += chunk;

        // タイマーがなければ設定
        if (!this.timer) {
            this.timer = setTimeout(() => {
                this.flush();
            }, this.flushInterval);
        }
    }

    /**
     * バッファをフラッシュ
     */
    flush() {
        if (this.buffer) {
            this.onFlush(this.buffer);
            this.buffer = '';
        }
        this.timer = null;
    }

    /**
     * 最終フラッシュ（ストリーミング完了時）
     */
    final() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.flush();
    }
}
