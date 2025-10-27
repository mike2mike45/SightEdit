/**
 * PerformanceOptimizer - パフォーマンス最適化マネージャー
 *
 * 仮想スクロール、ストリーミング最適化、メモリ管理を提供します。
 */

export class PerformanceOptimizer {
    constructor() {
        this.config = {
            // 仮想スクロール設定
            virtualScroll: {
                enabled: true,
                itemHeight: 100, // 推定メッセージ高さ
                bufferSize: 5,   // 表示外に保持する要素数
                viewportHeight: 600 // デフォルトビューポート高さ
            },
            // ストリーミングバッファ設定
            streaming: {
                bufferSize: 100,        // バッファサイズ（文字数）
                flushInterval: 16,      // フラッシュ間隔（ms）- 60fps
                minFlushSize: 10        // 最小フラッシュサイズ
            },
            // メモリ管理設定
            memory: {
                maxMessagesInMemory: 100,  // メモリ内最大メッセージ数
                archiveThreshold: 200,      // アーカイブ閾値
                autoArchive: true           // 自動アーカイブ有効
            }
        };

        this.streamingBuffers = new Map(); // メッセージIDごとのバッファ
        this.virtualScrollState = null;
    }

    /**
     * 仮想スクロールの初期化
     * @param {HTMLElement} container - スクロールコンテナ
     * @param {Array} items - アイテム配列
     * @param {Function} renderItem - アイテム描画関数
     * @returns {Object} 仮想スクロール状態
     */
    initVirtualScroll(container, items, renderItem) {
        const state = {
            container,
            items,
            renderItem,
            scrollTop: 0,
            visibleRange: { start: 0, end: 0 },
            renderedItems: new Map(),
            itemHeights: new Map(),
            totalHeight: 0
        };

        this.virtualScrollState = state;

        // スクロールイベントリスナー
        container.addEventListener('scroll', () => {
            this.updateVirtualScroll(state);
        });

        // 初期描画
        this.updateVirtualScroll(state);

        return state;
    }

    /**
     * 仮想スクロールの更新
     * @param {Object} state - 仮想スクロール状態
     */
    updateVirtualScroll(state) {
        if (!this.config.virtualScroll.enabled || state.items.length === 0) {
            return;
        }

        const { container, items } = state;
        const { itemHeight, bufferSize } = this.config.virtualScroll;

        // ビューポートの範囲を計算
        const scrollTop = container.scrollTop;
        const viewportHeight = container.clientHeight;

        const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize);
        const endIndex = Math.min(
            items.length,
            Math.ceil((scrollTop + viewportHeight) / itemHeight) + bufferSize
        );

        state.visibleRange = { start: startIndex, end: endIndex };

        // 表示範囲外の要素を削除
        for (const [index, element] of state.renderedItems.entries()) {
            if (index < startIndex || index >= endIndex) {
                element.remove();
                state.renderedItems.delete(index);
            }
        }

        // 表示範囲内の要素を描画
        for (let i = startIndex; i < endIndex; i++) {
            if (!state.renderedItems.has(i)) {
                const item = items[i];
                const element = state.renderItem(item, i);

                // 位置を設定
                element.style.position = 'absolute';
                element.style.top = `${i * itemHeight}px`;
                element.style.width = '100%';

                container.appendChild(element);
                state.renderedItems.set(i, element);

                // 実際の高さを測定して保存
                const actualHeight = element.offsetHeight;
                if (actualHeight > 0) {
                    state.itemHeights.set(i, actualHeight);
                }
            }
        }

        // 総高さを更新（スクロールバー用）
        state.totalHeight = items.length * itemHeight;
        container.style.height = `${state.totalHeight}px`;
    }

    /**
     * 仮想スクロールにアイテムを追加
     * @param {Object} state - 仮想スクロール状態
     * @param {*} item - 追加するアイテム
     */
    addItemToVirtualScroll(state, item) {
        if (!state) return;

        state.items.push(item);
        this.updateVirtualScroll(state);
    }

    /**
     * ストリーミングバッファの初期化
     * @param {string} messageId - メッセージID
     * @returns {Object} バッファ状態
     */
    initStreamingBuffer(messageId) {
        const buffer = {
            id: messageId,
            content: '',
            lastFlushTime: Date.now(),
            flushTimer: null
        };

        this.streamingBuffers.set(messageId, buffer);
        return buffer;
    }

    /**
     * ストリーミングバッファにチャンクを追加
     * @param {string} messageId - メッセージID
     * @param {string} chunk - テキストチャンク
     * @param {Function} onFlush - フラッシュコールバック
     */
    addToStreamingBuffer(messageId, chunk, onFlush) {
        let buffer = this.streamingBuffers.get(messageId);

        if (!buffer) {
            buffer = this.initStreamingBuffer(messageId);
        }

        buffer.content += chunk;

        // フラッシュ条件チェック
        const shouldFlush =
            buffer.content.length >= this.config.streaming.bufferSize ||
            (Date.now() - buffer.lastFlushTime) >= this.config.streaming.flushInterval;

        if (shouldFlush) {
            this.flushStreamingBuffer(messageId, onFlush);
        } else {
            // タイマーでフラッシュ
            if (buffer.flushTimer) {
                clearTimeout(buffer.flushTimer);
            }

            buffer.flushTimer = setTimeout(() => {
                this.flushStreamingBuffer(messageId, onFlush);
            }, this.config.streaming.flushInterval);
        }
    }

    /**
     * ストリーミングバッファをフラッシュ
     * @param {string} messageId - メッセージID
     * @param {Function} onFlush - フラッシュコールバック
     */
    flushStreamingBuffer(messageId, onFlush) {
        const buffer = this.streamingBuffers.get(messageId);

        if (!buffer || buffer.content.length === 0) {
            return;
        }

        // コールバックを呼び出し
        if (onFlush) {
            onFlush(buffer.content);
        }

        // バッファをクリア
        buffer.content = '';
        buffer.lastFlushTime = Date.now();

        if (buffer.flushTimer) {
            clearTimeout(buffer.flushTimer);
            buffer.flushTimer = null;
        }
    }

    /**
     * ストリーミングバッファを完了
     * @param {string} messageId - メッセージID
     * @param {Function} onComplete - 完了コールバック
     */
    completeStreamingBuffer(messageId, onComplete) {
        const buffer = this.streamingBuffers.get(messageId);

        if (buffer) {
            // 残りのバッファをフラッシュ
            if (buffer.content.length > 0 && onComplete) {
                onComplete(buffer.content);
            }

            // タイマーをクリア
            if (buffer.flushTimer) {
                clearTimeout(buffer.flushTimer);
            }

            // バッファを削除
            this.streamingBuffers.delete(messageId);
        }
    }

    /**
     * メモリ使用量をチェックしてアーカイブ
     * @param {Array} messages - メッセージ配列
     * @param {Function} archiveCallback - アーカイブコールバック
     * @returns {Object} アーカイブ結果
     */
    async checkMemoryAndArchive(messages, archiveCallback) {
        if (!this.config.memory.autoArchive) {
            return { archived: 0, remaining: messages.length };
        }

        const { maxMessagesInMemory, archiveThreshold } = this.config.memory;

        if (messages.length <= archiveThreshold) {
            return { archived: 0, remaining: messages.length };
        }

        // アーカイブ対象を選択（古いメッセージから）
        const archiveCount = messages.length - maxMessagesInMemory;
        const toArchive = messages.slice(0, archiveCount);

        // アーカイブコールバックを実行
        if (archiveCallback) {
            await archiveCallback(toArchive);
        }

        return {
            archived: archiveCount,
            remaining: messages.length - archiveCount
        };
    }

    /**
     * メッセージのメモリ使用量を推定
     * @param {Array} messages - メッセージ配列
     * @returns {number} 推定メモリサイズ（バイト）
     */
    estimateMemoryUsage(messages) {
        let totalSize = 0;

        for (const message of messages) {
            // メッセージコンテンツのサイズ
            totalSize += message.content ? message.content.length * 2 : 0; // UTF-16

            // メタデータのサイズ（概算）
            totalSize += 100; // id, role, timestamp など
        }

        return totalSize;
    }

    /**
     * バッチ操作のヘルパー
     * @param {Array} items - アイテム配列
     * @param {Function} operation - 各アイテムへの操作
     * @param {number} batchSize - バッチサイズ
     * @returns {Promise<Array>} 結果配列
     */
    async batchOperation(items, operation, batchSize = 10) {
        const results = [];

        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map(item => operation(item))
            );
            results.push(...batchResults);

            // 次のバッチの前に少し待機（UIブロッキング防止）
            if (i + batchSize < items.length) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        return results;
    }

    /**
     * IndexedDB バッチ書き込み
     * @param {IDBObjectStore} store - オブジェクトストア
     * @param {Array} items - 書き込むアイテム
     * @param {number} batchSize - バッチサイズ
     * @returns {Promise<void>}
     */
    async batchWriteIndexedDB(store, items, batchSize = 50) {
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);

            await new Promise((resolve, reject) => {
                const requests = batch.map(item => store.put(item));
                let completed = 0;

                requests.forEach(request => {
                    request.onsuccess = () => {
                        completed++;
                        if (completed === batch.length) {
                            resolve();
                        }
                    };
                    request.onerror = () => reject(request.error);
                });
            });

            // UIブロッキング防止
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    /**
     * 設定を更新
     * @param {Object} config - 新しい設定
     */
    updateConfig(config) {
        this.config = {
            ...this.config,
            ...config
        };
    }

    /**
     * パフォーマンス統計を取得
     * @returns {Object} 統計情報
     */
    getStats() {
        return {
            streamingBuffers: this.streamingBuffers.size,
            virtualScrollEnabled: this.config.virtualScroll.enabled,
            virtualScrollItems: this.virtualScrollState?.items.length || 0,
            memoryConfig: this.config.memory
        };
    }

    /**
     * クリーンアップ
     */
    cleanup() {
        // すべてのストリーミングバッファをクリア
        for (const [messageId, buffer] of this.streamingBuffers.entries()) {
            if (buffer.flushTimer) {
                clearTimeout(buffer.flushTimer);
            }
        }
        this.streamingBuffers.clear();

        // 仮想スクロール状態をクリア
        if (this.virtualScrollState) {
            this.virtualScrollState.renderedItems.clear();
            this.virtualScrollState = null;
        }
    }
}

// シングルトンインスタンス
let performanceOptimizerInstance = null;

/**
 * PerformanceOptimizer のシングルトンインスタンスを取得
 * @returns {PerformanceOptimizer}
 */
export function getPerformanceOptimizer() {
    if (!performanceOptimizerInstance) {
        performanceOptimizerInstance = new PerformanceOptimizer();
    }
    return performanceOptimizerInstance;
}
