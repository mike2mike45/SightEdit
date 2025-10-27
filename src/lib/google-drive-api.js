/**
 * Google Drive API直接呼び出しモジュール
 * chrome.identityで取得したトークンを使用
 */

import { getChromeIdentityAuth } from './chrome-identity-auth.js';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';

export class GoogleDriveAPI {
    constructor() {
        this.auth = getChromeIdentityAuth();
    }

    /**
     * 画像ファイル一覧を取得
     * @param {number} maxResults - 最大取得件数
     * @returns {Promise<Array>} 画像ファイル情報の配列
     */
    async getImages(maxResults = 50) {
        try {
            // トークンを取得
            const token = await this.auth.getToken(true);

            // 画像ファイルを検索
            const query = "(mimeType='image/png' or mimeType='image/jpeg' or mimeType='image/jpg' or mimeType='image/gif' or mimeType='image/webp') and trashed=false";
            const params = new URLSearchParams({
                q: query,
                fields: 'files(id, name, mimeType, thumbnailLink, webContentLink, size, createdTime, modifiedTime)',
                orderBy: 'modifiedTime desc',
                pageSize: maxResults.toString()
            });

            const response = await fetch(`${DRIVE_API_BASE}/files?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // レスポンスを整形
            const images = data.files.map(file => ({
                file_id: file.id,
                file_name: file.name,
                mime_type: file.mimeType,
                thumbnail_link: file.thumbnailLink,
                download_link: file.webContentLink,
                file_size: parseInt(file.size) || 0,
                created_time: file.createdTime,
                modified_time: file.modifiedTime
            }));

            console.log(`[GoogleDriveAPI] Retrieved ${images.length} images`);
            return images;

        } catch (error) {
            console.error('[GoogleDriveAPI] Failed to get images:', error);
            throw error;
        }
    }

    /**
     * 画像の公開URLを取得
     * @param {string} fileId - ファイルID
     * @returns {Promise<string>} 画像URL
     */
    async getImageUrl(fileId) {
        try {
            const token = await this.auth.getToken(false);

            const params = new URLSearchParams({
                fields: 'webContentLink, webViewLink'
            });

            const response = await fetch(`${DRIVE_API_BASE}/files/${fileId}?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`[GoogleDriveAPI] Got URL for file: ${fileId}`);

            return data.webContentLink;

        } catch (error) {
            console.error('[GoogleDriveAPI] Failed to get image URL:', error);
            throw error;
        }
    }

    /**
     * ファイルの内容を取得（ダイレクトダウンロード）
     * @param {string} fileId - ファイルID
     * @returns {Promise<Blob>} ファイルデータ
     */
    async getFileContent(fileId) {
        try {
            const token = await this.auth.getToken(false);

            const response = await fetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }

            const blob = await response.blob();
            console.log(`[GoogleDriveAPI] Downloaded file: ${fileId}`);

            return blob;

        } catch (error) {
            console.error('[GoogleDriveAPI] Failed to get file content:', error);
            throw error;
        }
    }

    /**
     * ログアウト
     */
    async logout() {
        await this.auth.removeToken();
    }
}

// シングルトンインスタンス
let apiInstance = null;

export function getGoogleDriveAPI() {
    if (!apiInstance) {
        apiInstance = new GoogleDriveAPI();
    }
    return apiInstance;
}
