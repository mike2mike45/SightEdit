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
     * アカウント選択画面を強制的に表示してトークンを取得
     * launchWebAuthFlowを使用してprompt=select_accountを指定
     * @returns {Promise<string>} アクセストークン
     */
    async getTokenWithAccountSelection() {
        console.log('[ChromeIdentityAuth] Launching account selection flow...');

        const manifest = chrome.runtime.getManifest();
        const clientId = manifest.oauth2.client_id;
        const redirectUri = `https://${chrome.runtime.id}.chromiumapp.org/`;
        const scopes = manifest.oauth2.scopes.join(' ');

        // OAuth2認証URLを構築（prompt=select_accountでアカウント選択を強制）
        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.searchParams.set('client_id', clientId);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('response_type', 'token');
        authUrl.searchParams.set('scope', scopes);
        authUrl.searchParams.set('prompt', 'select_account');  // アカウント選択を強制

        console.log('[DEBUG] Auth URL:', authUrl.toString());

        return new Promise((resolve, reject) => {
            chrome.identity.launchWebAuthFlow({
                url: authUrl.toString(),
                interactive: true
            }, (redirectUrl) => {
                if (chrome.runtime.lastError) {
                    console.error('[ChromeIdentityAuth] Auth flow error:', chrome.runtime.lastError);
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }

                if (!redirectUrl) {
                    reject(new Error('No redirect URL received'));
                    return;
                }

                console.log('[DEBUG] Redirect URL:', redirectUrl);

                // リダイレクトURLからアクセストークンを抽出
                const url = new URL(redirectUrl);
                const params = new URLSearchParams(url.hash.substring(1));
                const token = params.get('access_token');

                if (!token) {
                    reject(new Error('No access token in redirect URL'));
                    return;
                }

                this.token = token;
                console.log('[ChromeIdentityAuth] Token obtained via account selection');
                console.log('[DEBUG] Token length:', token.length);
                resolve(token);
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
