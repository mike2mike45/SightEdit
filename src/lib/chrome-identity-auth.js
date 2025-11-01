/**
 * Chrome Identity API認証ヘルパー
 * Google Drive APIへのアクセストークンを管理
 */

export class ChromeIdentityAuth {
    constructor() {
        this.token = null;
    }

    /**
     * アクセストークンを取得
     * @param {boolean} interactive - ユーザーにログインを促すか
     * @returns {Promise<string>} アクセストークン
     */
    async getToken(interactive = true) {
        // デバッグ: manifest.jsonの内容を確認
        const manifest = chrome.runtime.getManifest();
        console.log('[DEBUG] Manifest oauth2 config:', manifest.oauth2);
        console.log('[DEBUG] Client ID being used:', manifest.oauth2?.client_id);
        console.log('[DEBUG] Interactive mode:', interactive);

        return new Promise((resolve, reject) => {
            chrome.identity.getAuthToken({ interactive }, (token) => {
                if (chrome.runtime.lastError) {
                    console.error('[DEBUG] Auth error details:', chrome.runtime.lastError);
                    console.error('Auth error:', chrome.runtime.lastError);
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }

                if (!token) {
                    console.error('[DEBUG] No token received from chrome.identity.getAuthToken');
                    reject(new Error('No token received'));
                    return;
                }

                this.token = token;
                console.log('[ChromeIdentityAuth] Token obtained');
                console.log('[DEBUG] Token length:', token.length);
                resolve(token);
            });
        });
    }

    /**
     * トークンを削除（ログアウト）
     */
    async removeToken() {
        if (!this.token) return;

        return new Promise((resolve, reject) => {
            chrome.identity.removeCachedAuthToken({ token: this.token }, () => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }

                this.token = null;
                console.log('[ChromeIdentityAuth] Token removed');
                resolve();
            });
        });
    }

    /**
     * すべてのキャッシュされた認証トークンをクリア
     * 古いクライアントIDのトークンも含めてすべて削除
     */
    async clearAllCachedTokens() {
        console.log('[ChromeIdentityAuth] Clearing all cached tokens...');

        return new Promise((resolve, reject) => {
            chrome.identity.clearAllCachedAuthTokens(() => {
                if (chrome.runtime.lastError) {
                    console.error('[ChromeIdentityAuth] Failed to clear tokens:', chrome.runtime.lastError);
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }

                this.token = null;
                console.log('[ChromeIdentityAuth] All cached tokens cleared successfully');
                resolve();
            });
        });
    }

    /**
     * 認証済みかチェック
     */
    isAuthenticated() {
        return this.token !== null;
    }
}

// シングルトンインスタンス
let authInstance = null;

export function getChromeIdentityAuth() {
    if (!authInstance) {
        authInstance = new ChromeIdentityAuth();
    }
    return authInstance;
}
