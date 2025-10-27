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
        return new Promise((resolve, reject) => {
            chrome.identity.getAuthToken({ interactive }, (token) => {
                if (chrome.runtime.lastError) {
                    console.error('Auth error:', chrome.runtime.lastError);
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }

                if (!token) {
                    reject(new Error('No token received'));
                    return;
                }

                this.token = token;
                console.log('[ChromeIdentityAuth] Token obtained');
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
