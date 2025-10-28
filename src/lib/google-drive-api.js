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
     * ユーザー情報を取得
     * @returns {Promise<Object>} ユーザー情報
     */
    async getUserInfo() {
        try {
            const token = await this.auth.getToken(false);

            const response = await fetch(`${DRIVE_API_BASE}/about?fields=user`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('[GoogleDriveAPI] Retrieved user info:', data.user.emailAddress);

            return data.user;

        } catch (error) {
            console.error('[GoogleDriveAPI] Failed to get user info:', error);
            throw error;
        }
    }

    /**
     * フォルダ一覧を取得（非推奨：getFolderContentsを使用）
     * @returns {Promise<Array>} フォルダ情報の配列
     */
    async getFolders() {
        try {
            const token = await this.auth.getToken(false);

            const query = "mimeType='application/vnd.google-apps.folder' and trashed=false";
            const params = new URLSearchParams({
                q: query,
                fields: 'files(id, name)',
                orderBy: 'name',
                pageSize: '100'
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

            const folders = data.files.map(file => ({
                id: file.id,
                name: file.name
            }));

            console.log(`[GoogleDriveAPI] Retrieved ${folders.length} folders`);
            return folders;

        } catch (error) {
            console.error('[GoogleDriveAPI] Failed to get folders:', error);
            throw error;
        }
    }

    /**
     * フォルダの内容を取得（フォルダと画像の両方）
     * @param {string|null} folderId - フォルダID（null=ルート）
     * @returns {Promise<Array>} フォルダと画像のアイテム配列
     */
    async getFolderContents(folderId = null) {
        try {
            const token = await this.auth.getToken(false);

            // フォルダと画像の両方を検索
            let query = "trashed=false and (mimeType='application/vnd.google-apps.folder' or mimeType='image/png' or mimeType='image/jpeg' or mimeType='image/jpg' or mimeType='image/gif' or mimeType='image/webp')";

            // フォルダIDが指定されている場合、フィルタを追加
            if (folderId) {
                query += ` and '${folderId}' in parents`;
            } else {
                // ルートフォルダの場合（親がマイドライブ）
                query += " and 'root' in parents";
            }

            const params = new URLSearchParams({
                q: query,
                fields: 'files(id, name, mimeType, thumbnailLink, webContentLink, size, createdTime, modifiedTime)',
                orderBy: 'folder,name',
                pageSize: '1000'
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
            const items = data.files.map(file => {
                if (file.mimeType === 'application/vnd.google-apps.folder') {
                    // フォルダ
                    return {
                        type: 'folder',
                        id: file.id,
                        name: file.name
                    };
                } else {
                    // 画像
                    return {
                        type: 'image',
                        file_id: file.id,
                        file_name: file.name,
                        mime_type: file.mimeType,
                        thumbnail_link: file.thumbnailLink,
                        download_link: file.webContentLink,
                        file_size: parseInt(file.size) || 0,
                        created_time: file.createdTime,
                        modified_time: file.modifiedTime
                    };
                }
            });

            console.log(`[GoogleDriveAPI] Retrieved ${items.length} items from folder ${folderId || 'root'}`);
            return items;

        } catch (error) {
            console.error('[GoogleDriveAPI] Failed to get folder contents:', error);
            throw error;
        }
    }

    /**
     * 画像ファイル一覧を取得
     * @param {number} maxResults - 最大取得件数
     * @param {string|null} folderId - フォルダID（null=すべて）
     * @returns {Promise<Array>} 画像ファイル情報の配列
     */
    async getImages(maxResults = 50, folderId = null) {
        try {
            // トークンを取得
            const token = await this.auth.getToken(true);

            // 画像ファイルを検索
            let query = "(mimeType='image/png' or mimeType='image/jpeg' or mimeType='image/jpg' or mimeType='image/gif' or mimeType='image/webp') and trashed=false";

            // フォルダIDが指定されている場合、フィルタを追加
            if (folderId) {
                query += ` and '${folderId}' in parents`;
            }

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

            console.log(`[GoogleDriveAPI] Retrieved ${images.length} images${folderId ? ' from folder ' + folderId : ''}`);
            return images;

        } catch (error) {
            console.error('[GoogleDriveAPI] Failed to get images:', error);
            throw error;
        }
    }

    /**
     * 画像の公開URLを取得（非推奨：公開ファイルのみ）
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
     * 画像をBlobとして取得（推奨：非公開ファイルでも動作）
     * @param {string} fileId - ファイルID
     * @returns {Promise<Blob>} 画像データ
     */
    async getImageBlob(fileId) {
        try {
            const token = await this.auth.getToken(false);

            // alt=mediaで画像データを直接取得
            const response = await fetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }

            const blob = await response.blob();
            console.log(`[GoogleDriveAPI] Downloaded image blob: ${fileId}, size: ${blob.size} bytes`);

            return blob;

        } catch (error) {
            console.error('[GoogleDriveAPI] Failed to get image blob:', error);
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
     * ファイルのメタデータを取得（webContentLink付き）
     * @param {string} fileId - ファイルID
     * @returns {Promise<Object>} ファイルメタデータ
     */
    async getFileMetadata(fileId) {
        try {
            const token = await this.auth.getToken(false);

            const params = new URLSearchParams({
                fields: 'id, name, mimeType, webContentLink'
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
            console.log(`[GoogleDriveAPI] Got metadata for file: ${fileId}`);

            return data;

        } catch (error) {
            console.error('[GoogleDriveAPI] Failed to get file metadata:', error);
            throw error;
        }
    }

    /**
     * ファイルの共有権限を更新（公開設定）
     * @param {string} fileId - ファイルID
     * @returns {Promise<boolean>} 成功/失敗
     */
    async updateFilePermissions(fileId) {
        try {
            const token = await this.auth.getToken(false);

            const response = await fetch(`${DRIVE_API_BASE}/files/${fileId}/permissions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    role: 'reader',
                    type: 'anyone'
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }

            console.log(`[GoogleDriveAPI] Updated permissions for file: ${fileId}`);
            return true;

        } catch (error) {
            console.error('[GoogleDriveAPI] Failed to update permissions:', error);
            return false;
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
