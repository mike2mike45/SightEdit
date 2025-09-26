// エクスポート機能管理クラス
// バンドル版ライブラリ使用（Chrome拡張機能対応）
import { marked } from 'marked';
import TurndownService from 'turndown';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export class ExportManager {
    constructor() {
        this.libraries = {
            marked: marked,
            turndown: new TurndownService(),
            jsPDF: jsPDF,
            html2canvas: html2canvas
        };
        console.log('エクスポートライブラリの初期化完了');
    }


    /**
     * MarkdownをHTMLに変換
     */
    async exportToHTML(markdown) {
        if (!this.libraries.marked) {
            throw new Error('Marked.jsライブラリが読み込まれていません');
        }
        
        const html = this.libraries.marked.parse(markdown);
        return this.wrapHTML(html);
    }

    /**
     * MarkdownをPDFに変換
     */
    async exportToPDF(markdown, options = {}) {
        if (!this.libraries.jsPDF || !this.libraries.marked) {
            throw new Error('PDF生成ライブラリが読み込まれていません');
        }

        // HTMLに変換
        const html = this.libraries.marked.parse(markdown);
        
        // 一時的なHTMLコンテナを作成
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = this.wrapHTMLForPDF(html);
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.width = '794px'; // A4サイズ幅（72dpi）
        tempContainer.style.fontFamily = 'Arial, sans-serif';
        tempContainer.style.fontSize = '14px';
        tempContainer.style.lineHeight = '1.6';
        tempContainer.style.color = '#000';
        tempContainer.style.background = '#fff';
        tempContainer.style.padding = '40px';
        
        document.body.appendChild(tempContainer);

        try {
            // html2canvasでキャンバスに変換
            const canvas = await this.libraries.html2canvas(tempContainer, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff'
            });

            // PDF作成
            const imgWidth = 210; // A4幅 (mm)
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            const doc = new this.libraries.jsPDF();
            const imgData = canvas.toDataURL('image/png');
            
            // 複数ページに分割
            let heightLeft = imgHeight;
            let position = 0;
            
            doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= 297; // A4高さ (mm)
            
            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                doc.addPage();
                doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= 297;
            }

            return doc;
        } finally {
            // 一時コンテナを削除
            document.body.removeChild(tempContainer);
        }
    }

    /**
     * テキストをクリップボードにコピー
     */
    async copyToClipboard(content, format = 'text') {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(content);
                return true;
            } else {
                // フォールバック: textareaを使用
                const textarea = document.createElement('textarea');
                textarea.value = content;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                return true;
            }
        } catch (error) {
            console.error('クリップボードへのコピーに失敗:', error);
            return false;
        }
    }

    /**
     * HTMLをプレーンテキストに変換
     */
    htmlToPlainText(html) {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        return temp.textContent || temp.innerText || '';
    }


    /**
     * HTMLを完全なHTMLドキュメントとしてラップ
     */
    wrapHTML(htmlContent) {
        return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SightEdit Export</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        h1, h2, h3, h4, h5, h6 {
            margin-top: 2em;
            margin-bottom: 0.5em;
            font-weight: 600;
        }
        h1 { font-size: 2em; }
        h2 { font-size: 1.5em; }
        h3 { font-size: 1.3em; }
        p { margin: 1em 0; }
        code {
            background: #f1f3f4;
            padding: 0.2em 0.4em;
            border-radius: 3px;
            font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
        }
        pre {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 1em;
            overflow-x: auto;
        }
        blockquote {
            border-left: 4px solid #007bff;
            background: #f8f9fa;
            padding: 1em 1.5em;
            margin: 1.5em 0;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 1.5em 0;
        }
        table th, table td {
            border: 1px solid #dee2e6;
            padding: 8px 12px;
            text-align: left;
        }
        table th {
            background: #f8f9fa;
            font-weight: 600;
        }
    </style>
</head>
<body>
${htmlContent}
</body>
</html>`;
    }

    /**
     * PDF用のHTMLラッパー（よりシンプル）
     */
    wrapHTMLForPDF(htmlContent) {
        return htmlContent;
    }

    /**
     * ファイルダウンロード
     */
    downloadFile(content, filename, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * PDFファイルとしてダウンロード
     */
    async downloadPDF(markdown, filename = 'document.pdf', options = {}) {
        const doc = await this.exportToPDF(markdown, options);
        doc.save(filename);
    }

    /**
     * HTMLファイルとしてダウンロード
     */
    async downloadHTML(markdown, filename = 'document.html') {
        const html = await this.exportToHTML(markdown);
        this.downloadFile(html, filename, 'text/html');
    }

    /**
     * Markdownファイルとしてダウンロード
     */
    downloadMarkdown(markdown, filename = 'document.md') {
        this.downloadFile(markdown, filename, 'text/markdown');
    }

    /**
     * テキストファイルとしてダウンロード
     */
    downloadText(content, filename = 'document.txt') {
        // HTMLタグを除去してプレーンテキストに変換
        const plainText = this.htmlToPlainText(content);
        this.downloadFile(plainText, filename, 'text/plain');
    }

    /**
     * サービス別最適化フォーマット一覧を取得
     */
    getServiceOptimizedFormats() {
        return {
            // 日本語圏サービス
            japanese: {
                name: '🇯🇵 日本語圏サービス',
                services: [
                    {
                        id: 'narou',
                        name: '小説家になろう',
                        description: 'リッチテキスト + ルビ記法対応',
                        type: 'clipboard',
                        format: 'html',
                        icon: '📚',
                        action: (content) => this.copyForNarou(content)
                    },
                    {
                        id: 'kakuyomu',
                        name: 'カクヨム',
                        description: 'リッチテキスト + ルビ記法対応',
                        type: 'clipboard',
                        format: 'html',
                        icon: '📖',
                        action: (content) => this.copyForKakuyomu(content)
                    },
                    {
                        id: 'qiita',
                        name: 'Qiita',
                        description: 'Markdown直接貼り付け',
                        type: 'clipboard',
                        format: 'markdown',
                        icon: '💻',
                        action: (content) => this.copyForQiita(content)
                    },
                    {
                        id: 'zenn',
                        name: 'Zenn',
                        description: 'リッチテキスト + 独自記法',
                        type: 'clipboard',
                        format: 'html',
                        icon: '⚡',
                        action: (content) => this.copyForZenn(content)
                    },
                    {
                        id: 'note',
                        name: 'note',
                        description: 'リッチエディタ最適化',
                        type: 'clipboard',
                        format: 'html',
                        icon: '📝',
                        action: (content) => this.copyForNote(content)
                    },
                    {
                        id: 'hatena',
                        name: 'はてなブログ',
                        description: '見たまま編集モード',
                        type: 'clipboard',
                        format: 'html',
                        icon: '🎯',
                        action: (content) => this.copyForHatena(content)
                    }
                ]
            },
            // 英語圏サービス
            international: {
                name: '🌍 英語圏サービス',
                services: [
                    {
                        id: 'medium',
                        name: 'Medium',
                        description: 'エディタペースト最適化',
                        type: 'clipboard',
                        format: 'html',
                        icon: '📄',
                        action: (content) => this.copyForMedium(content)
                    },
                    {
                        id: 'devto',
                        name: 'Dev.to',
                        description: 'Markdown + Liquid Tags',
                        type: 'clipboard',
                        format: 'markdown',
                        icon: '💡',
                        action: (content) => this.copyForDevTo(content)
                    },
                    {
                        id: 'github',
                        name: 'GitHub',
                        description: 'GitHub Flavored Markdown',
                        type: 'clipboard',
                        format: 'markdown',
                        icon: '🐙',
                        action: (content) => this.copyForGitHub(content)
                    },
                    {
                        id: 'stackoverflow',
                        name: 'Stack Overflow',
                        description: 'Markdown質問投稿',
                        type: 'clipboard',
                        format: 'markdown',
                        icon: '❓',
                        action: (content) => this.copyForStackOverflow(content)
                    }
                ]
            },
            // ビジネスツール
            business: {
                name: '💼 ビジネスツール',
                services: [
                    {
                        id: 'notion',
                        name: 'Notion',
                        description: 'ブロックエディタ最適化',
                        type: 'clipboard',
                        format: 'html',
                        icon: '🧠',
                        action: (content) => this.copyForNotion(content)
                    },
                    {
                        id: 'confluence',
                        name: 'Confluence',
                        description: 'リッチテキストエディタ',
                        type: 'clipboard',
                        format: 'html',
                        icon: '🏢',
                        action: (content) => this.copyForConfluence(content)
                    },
                    {
                        id: 'obsidian',
                        name: 'Obsidian',
                        description: 'Markdown + 内部リンク',
                        type: 'clipboard',
                        format: 'markdown',
                        icon: '💎',
                        action: (content) => this.copyForObsidian(content)
                    }
                ]
            },
            // ファイル保存
            download: {
                name: '💾 ファイル保存',
                services: [
                    {
                        id: 'docx',
                        name: 'Microsoft Word',
                        description: 'Office文書(.docx)',
                        type: 'download',
                        format: 'docx',
                        icon: '📄',
                        action: (content, filename) => this.downloadPDF(content, filename)
                    },
                    {
                        id: 'pdf',
                        name: 'PDF文書',
                        description: '印刷・配布用(.pdf)',
                        type: 'download',
                        format: 'pdf',
                        icon: '📕',
                        action: (content, filename) => this.downloadPDF(content, filename)
                    },
                    {
                        id: 'html-file',
                        name: 'HTMLファイル',
                        description: 'ウェブページ(.html)',
                        type: 'download',
                        format: 'html',
                        icon: '🌐',
                        action: (content, filename) => this.downloadHTML(content, filename)
                    },
                    {
                        id: 'markdown-file',
                        name: 'Markdownファイル',
                        description: 'Markdown(.md)',
                        type: 'download',
                        format: 'markdown',
                        icon: '📝',
                        action: (content, filename) => this.downloadMarkdown(content, filename)
                    }
                ]
            }
        };
    }

    // サービス別最適化関数
    
    // 小説投稿サイト用（ルビ記法対応）
    async copyForNarou(content) {
        const html = this.libraries.marked.parse(content);
        const optimized = this.processRubyNotation(html, 'narou');
        return this.copyToClipboard(optimized, 'text/html');
    }

    async copyForKakuyomu(content) {
        const html = this.libraries.marked.parse(content);
        const optimized = this.processRubyNotation(html, 'kakuyomu');
        return this.copyToClipboard(optimized, 'text/html');
    }

    // 技術記事サイト用
    async copyForQiita(content) {
        const optimized = this.processCodeBlocks(content, 'qiita');
        return this.copyToClipboard(optimized, 'text/plain');
    }

    async copyForZenn(content) {
        const html = this.libraries.marked.parse(content);
        const optimized = this.processZennFormat(html);
        return this.copyToClipboard(optimized, 'text/html');
    }

    // ブログサービス用
    async copyForNote(content) {
        const html = this.libraries.marked.parse(content);
        const optimized = this.cleanForRichEditor(html);
        return this.copyToClipboard(optimized, 'text/html');
    }

    async copyForHatena(content) {
        const html = this.libraries.marked.parse(content);
        const optimized = this.processHatenaFormat(html);
        return this.copyToClipboard(optimized, 'text/html');
    }

    // 海外サービス用
    async copyForMedium(content) {
        const html = this.libraries.marked.parse(content);
        const optimized = this.cleanForRichEditor(html);
        return this.copyToClipboard(optimized, 'text/html');
    }

    async copyForDevTo(content) {
        const optimized = this.processDevToFormat(content);
        return this.copyToClipboard(optimized, 'text/plain');
    }

    async copyForGitHub(content) {
        const optimized = this.processGitHubMarkdown(content);
        return this.copyToClipboard(optimized, 'text/plain');
    }

    async copyForStackOverflow(content) {
        const optimized = this.processStackOverflowFormat(content);
        return this.copyToClipboard(optimized, 'text/plain');
    }

    // ビジネスツール用
    async copyForNotion(content) {
        const html = this.libraries.marked.parse(content);
        const optimized = this.processNotionFormat(html);
        return this.copyToClipboard(optimized, 'text/html');
    }

    async copyForConfluence(content) {
        const html = this.libraries.marked.parse(content);
        const optimized = this.cleanForRichEditor(html);
        return this.copyToClipboard(optimized, 'text/html');
    }

    async copyForObsidian(content) {
        const optimized = this.processObsidianFormat(content);
        return this.copyToClipboard(optimized, 'text/plain');
    }

    // 最適化処理関数
    processRubyNotation(html, platform) {
        // ルビ記法の処理（プラットフォーム別）
        if (platform === 'narou' || platform === 'kakuyomu') {
            return html.replace(/\|([^《]+)《([^》]+)》/g, '|$1《$2》');
        }
        return html;
    }

    processCodeBlocks(content, platform) {
        // GitHub Flavored Markdownの最適化
        return content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            return '```' + (lang || '') + '\n' + code.trim() + '\n```';
        });
    }

    processZennFormat(html) {
        // Zenn独自記法の対応
        return this.cleanForRichEditor(html);
    }

    processHatenaFormat(html) {
        // はてなブログ最適化
        return this.cleanForRichEditor(html);
    }

    processDevToFormat(content) {
        // Dev.to用Markdown最適化
        return this.processCodeBlocks(content, 'devto');
    }

    processGitHubMarkdown(content) {
        // GitHub Flavored Markdown最適化
        return this.processCodeBlocks(content, 'github');
    }

    processStackOverflowFormat(content) {
        // Stack Overflow用最適化
        return this.processCodeBlocks(content, 'stackoverflow');
    }

    processNotionFormat(html) {
        // Notion用最適化（ブロック要素重視）
        return this.cleanForRichEditor(html);
    }

    processObsidianFormat(content) {
        // Obsidian用Markdown最適化（内部リンク対応）
        return content;
    }

    cleanForRichEditor(html) {
        // リッチエディタ用のHTMLクリーニング
        return html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/style="[^"]*"/gi, '')
            .replace(/class="[^"]*"/gi, '');
    }
}

// シングルトンインスタンス
let exportManager = null;

export function getExportManager() {
    if (!exportManager) {
        exportManager = new ExportManager();
    }
    return exportManager;
}