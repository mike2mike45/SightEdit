/**
 * ExportService - Document Export Service
 * ES2024対応のドキュメントエクスポートサービス
 */
import { BaseComponent } from '../core/ComponentFactory.js';

export class ExportService extends BaseComponent {
  #exporters = new Map();
  #templates = new Map();
  #converters = new Map();
  #exportHistory = [];
  #maxHistorySize = 50;

  constructor() {
    super();
    
    this.#setupExporters();
    this.#setupConverters();
    this.#loadDefaultTemplates();
  }

  /**
   * 初期化
   */
  async init() {
    await this.#validateExporters();
    console.log('[ExportService] Initialized with exporters:', Array.from(this.#exporters.keys()));
  }

  /**
   * エクスポーターをセットアップ
   * @private
   */
  #setupExporters() {
    // HTML exporter
    this.#exporters.set('html', new HTMLExporter());
    
    // PDF exporter
    this.#exporters.set('pdf', new PDFExporter());
    
    // Word exporter
    this.#exporters.set('docx', new WordExporter());
    
    // Markdown exporter
    this.#exporters.set('markdown', new MarkdownExporter());
    
    // Plain text exporter
    this.#exporters.set('txt', new TextExporter());
    
    // JSON exporter
    this.#exporters.set('json', new JSONExporter());
    
    // XML exporter
    this.#exporters.set('xml', new XMLExporter());
    
    // LaTeX exporter
    this.#exporters.set('latex', new LaTeXExporter());
    
    // EPUB exporter
    this.#exporters.set('epub', new EPUBExporter());
  }

  /**
   * コンバーターをセットアップ
   * @private
   */
  #setupConverters() {
    // Markdown to HTML converter
    this.#converters.set('markdown-to-html', new MarkdownToHTMLConverter());
    
    // HTML to Plain Text converter
    this.#converters.set('html-to-text', new HTMLToTextConverter());
    
    // Markdown to LaTeX converter
    this.#converters.set('markdown-to-latex', new MarkdownToLaTeXConverter());
  }

  /**
   * デフォルトテンプレートを読み込み
   * @private
   */
  #loadDefaultTemplates() {
    // HTML テンプレート
    this.#templates.set('html-default', {
      name: 'Default HTML',
      format: 'html',
      template: this.#getDefaultHTMLTemplate()
    });

    this.#templates.set('html-minimal', {
      name: 'Minimal HTML',
      format: 'html', 
      template: this.#getMinimalHTMLTemplate()
    });

    // PDF テンプレート
    this.#templates.set('pdf-article', {
      name: 'Article PDF',
      format: 'pdf',
      template: this.#getArticlePDFTemplate()
    });

    // Word テンプレート
    this.#templates.set('docx-standard', {
      name: 'Standard Word',
      format: 'docx',
      template: this.#getStandardWordTemplate()
    });
  }

  /**
   * ドキュメントをエクスポート
   * @param {string} content - ドキュメント内容
   * @param {string} format - 出力形式
   * @param {Object} options - エクスポートオプション
   * @returns {Promise<Object>} エクスポート結果
   */
  async exportDocument(content, format, options = {}) {
    const exportId = this.#generateExportId();
    
    try {
      console.log(`[ExportService] Starting export to ${format}...`);
      
      // エクスポーターを取得
      const exporter = this.#exporters.get(format);
      if (!exporter) {
        throw new Error(`Unsupported export format: ${format}`);
      }

      // エクスポートオプションを準備
      const exportOptions = this.#prepareExportOptions(format, options);
      
      // 前処理
      const processedContent = await this.#preprocessContent(content, format, exportOptions);
      
      // エクスポート実行
      const startTime = Date.now();
      const result = await exporter.export(processedContent, exportOptions);
      const processingTime = Date.now() - startTime;

      // 結果を整形
      const exportResult = {
        id: exportId,
        format,
        content: result.content,
        blob: result.blob,
        filename: result.filename || this.#generateFilename(format, exportOptions),
        metadata: {
          originalSize: content.length,
          exportedSize: result.size || 0,
          processingTime,
          template: exportOptions.template,
          ...result.metadata
        },
        timestamp: Date.now()
      };

      // 履歴に追加
      this.#addToHistory({
        id: exportId,
        format,
        filename: exportResult.filename,
        size: exportResult.metadata.exportedSize,
        processingTime,
        timestamp: exportResult.timestamp,
        success: true
      });

      // イベント発火
      this.emit('exportCompleted', {
        id: exportId,
        format,
        filename: exportResult.filename,
        size: exportResult.metadata.exportedSize
      });

      console.log(`[ExportService] Export completed: ${exportResult.filename}`);
      return exportResult;

    } catch (error) {
      console.error('[ExportService] Export error:', error);
      
      // エラー履歴に追加
      this.#addToHistory({
        id: exportId,
        format,
        error: error.message,
        timestamp: Date.now(),
        success: false
      });

      // イベント発火
      this.emit('exportFailed', {
        id: exportId,
        format,
        error: error.message
      });

      throw new Error(`Export failed: ${error.message}`);
    }
  }

  /**
   * 複数形式で一括エクスポート
   * @param {string} content - ドキュメント内容
   * @param {string[]} formats - 出力形式配列
   * @param {Object} options - エクスポートオプション
   * @returns {Promise<Object[]>} エクスポート結果配列
   */
  async exportMultipleFormats(content, formats, options = {}) {
    const results = [];
    const errors = [];

    for (const format of formats) {
      try {
        const result = await this.exportDocument(content, format, options);
        results.push(result);
      } catch (error) {
        errors.push({ format, error: error.message });
      }
    }

    return {
      results,
      errors,
      successCount: results.length,
      totalCount: formats.length
    };
  }

  /**
   * ファイルとしてダウンロード
   * @param {Object} exportResult - エクスポート結果
   */
  downloadFile(exportResult) {
    try {
      const { blob, filename } = exportResult;
      
      if (!blob) {
        throw new Error('No blob data available for download');
      }

      // ダウンロード用のリンクを作成
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      
      // ダウンロードを実行
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // リソースをクリーンアップ
      setTimeout(() => URL.revokeObjectURL(url), 100);

      this.emit('fileDownloaded', {
        filename,
        size: blob.size
      });

    } catch (error) {
      console.error('[ExportService] Download error:', error);
      throw new Error(`Download failed: ${error.message}`);
    }
  }

  /**
   * テンプレートを追加
   * @param {string} id - テンプレートID
   * @param {Object} template - テンプレート情報
   */
  addTemplate(id, template) {
    this.#templates.set(id, {
      name: template.name,
      format: template.format,
      template: template.template,
      description: template.description,
      custom: true
    });

    console.log(`[ExportService] Template added: ${id}`);
  }

  /**
   * テンプレート一覧を取得
   * @param {string} format - 形式でフィルタ（オプション）
   * @returns {Object} テンプレート一覧
   */
  getTemplates(format = null) {
    const templates = {};
    
    for (const [id, template] of this.#templates) {
      if (!format || template.format === format) {
        templates[id] = {
          id,
          name: template.name,
          format: template.format,
          description: template.description,
          custom: template.custom || false
        };
      }
    }

    return templates;
  }

  /**
   * 対応形式一覧を取得
   * @returns {Object} 対応形式一覧
   */
  getSupportedFormats() {
    const formats = {};
    
    for (const [format, exporter] of this.#exporters) {
      formats[format] = {
        name: exporter.getDisplayName(),
        description: exporter.getDescription(),
        mimeType: exporter.getMimeType(),
        extension: exporter.getFileExtension(),
        supported: exporter.isSupported()
      };
    }

    return formats;
  }

  /**
   * エクスポート履歴を取得
   * @param {number} limit - 取得件数上限
   * @returns {Array} 履歴一覧
   */
  getExportHistory(limit = 20) {
    return this.#exportHistory.slice(0, limit);
  }

  /**
   * プレビューを生成
   * @param {string} content - ドキュメント内容
   * @param {string} format - 出力形式
   * @param {Object} options - プレビューオプション
   * @returns {Promise<Object>} プレビューデータ
   */
  async generatePreview(content, format, options = {}) {
    try {
      const exporter = this.#exporters.get(format);
      if (!exporter || !exporter.supportsPreview) {
        throw new Error(`Preview not supported for format: ${format}`);
      }

      const previewOptions = { ...options, preview: true };
      const processedContent = await this.#preprocessContent(content, format, previewOptions);
      
      return await exporter.generatePreview(processedContent, previewOptions);

    } catch (error) {
      console.error('[ExportService] Preview generation error:', error);
      throw new Error(`Preview failed: ${error.message}`);
    }
  }

  /**
   * エクスポートオプションを準備
   * @private
   */
  #prepareExportOptions(format, options) {
    const defaults = {
      template: `${format}-default`,
      includeMeta: true,
      includeStyles: true,
      compression: false,
      quality: 'high'
    };

    const prepared = { ...defaults, ...options };

    // テンプレートが存在するかチェック
    if (prepared.template && !this.#templates.has(prepared.template)) {
      console.warn(`[ExportService] Template not found: ${prepared.template}, using default`);
      prepared.template = `${format}-default`;
    }

    return prepared;
  }

  /**
   * コンテンツを前処理
   * @private
   */
  async #preprocessContent(content, format, options) {
    let processed = content;

    // フォーマット特有の前処理
    switch (format) {
      case 'html':
        if (options.convertMarkdown !== false) {
          const converter = this.#converters.get('markdown-to-html');
          processed = await converter.convert(processed);
        }
        break;
        
      case 'txt':
        if (options.stripHTML !== false) {
          const converter = this.#converters.get('html-to-text');
          processed = await converter.convert(processed);
        }
        break;
        
      case 'latex':
        if (options.convertMarkdown !== false) {
          const converter = this.#converters.get('markdown-to-latex');
          processed = await converter.convert(processed);
        }
        break;
    }

    // 共通前処理
    if (options.trimWhitespace !== false) {
      processed = processed.trim();
    }

    if (options.normalizeLineEndings !== false) {
      processed = processed.replace(/\r\n/g, '\n');
    }

    return processed;
  }

  /**
   * ファイル名を生成
   * @private
   */
  #generateFilename(format, options) {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const basename = options.filename || `document_${timestamp}`;
    const extension = this.#exporters.get(format)?.getFileExtension() || format;
    
    return `${basename}.${extension}`;
  }

  /**
   * エクスポーターを検証
   * @private
   */
  async #validateExporters() {
    for (const [format, exporter] of this.#exporters) {
      try {
        const isSupported = await exporter.isSupported();
        if (!isSupported) {
          console.warn(`[ExportService] Format ${format} not supported in this environment`);
        }
      } catch (error) {
        console.error(`[ExportService] Error validating exporter ${format}:`, error);
      }
    }
  }

  /**
   * エクスポートIDを生成
   * @private
   */
  #generateExportId() {
    return `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 履歴に追加
   * @private
   */
  #addToHistory(entry) {
    this.#exportHistory.unshift(entry);
    
    if (this.#exportHistory.length > this.#maxHistorySize) {
      this.#exportHistory = this.#exportHistory.slice(0, this.#maxHistorySize);
    }
  }

  /**
   * デフォルトHTMLテンプレートを取得
   * @private
   */
  #getDefaultHTMLTemplate() {
    return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1, h2, h3, h4, h5, h6 { margin-top: 2em; margin-bottom: 0.5em; }
        p { margin-bottom: 1em; }
        code { background: #f5f5f5; padding: 2px 4px; border-radius: 3px; }
        pre { background: #f5f5f5; padding: 1em; border-radius: 5px; overflow-x: auto; }
        blockquote { margin: 1em 0; padding-left: 1em; border-left: 4px solid #ddd; color: #666; }
    </style>
</head>
<body>
    {{content}}
</body>
</html>
    `.trim();
  }

  /**
   * ミニマルHTMLテンプレートを取得
   * @private
   */
  #getMinimalHTMLTemplate() {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>{{title}}</title></head>
<body>{{content}}</body>
</html>
    `.trim();
  }

  /**
   * 記事PDFテンプレートを取得
   * @private
   */
  #getArticlePDFTemplate() {
    return {
      pageSize: 'A4',
      margins: { top: 72, bottom: 72, left: 72, right: 72 },
      headerFooter: true,
      displayHeaderFooter: true,
      headerTemplate: '<div style="font-size:10px; text-align:center; width:100%;">{{title}}</div>',
      footerTemplate: '<div style="font-size:10px; text-align:center; width:100%;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>'
    };
  }

  /**
   * 標準Wordテンプレートを取得
   * @private
   */
  #getStandardWordTemplate() {
    return {
      styles: {
        default: {
          paragraph: {
            spacing: { after: 120 }
          }
        }
      },
      numbering: {
        config: [
          {
            reference: "my-numbering",
            levels: [
              { level: 0, format: "decimal", text: "%1.", alignment: "left" }
            ]
          }
        ]
      }
    };
  }

  /**
   * 統計情報を取得
   * @returns {Object} 統計情報
   */
  getStatistics() {
    const history = this.#exportHistory;
    const totalExports = history.length;
    const successfulExports = history.filter(h => h.success).length;
    
    const formatStats = Object.groupBy(history, h => h.format);
    const formatCounts = Object.fromEntries(
      Object.entries(formatStats).map(([format, exports]) => [format, exports.length])
    );

    return {
      totalExports,
      successfulExports,
      successRate: totalExports > 0 ? successfulExports / totalExports : 0,
      formatCounts,
      supportedFormats: Object.keys(this.getSupportedFormats()).length,
      availableTemplates: this.#templates.size
    };
  }

  /**
   * 破棄処理
   */
  destroy() {
    this.#exporters.clear();
    this.#templates.clear();
    this.#converters.clear();
    this.#exportHistory = [];
    
    super.destroy();
  }
}

/**
 * ベースエクスポータークラス
 */
class BaseExporter {
  #name = '';
  #displayName = '';
  #description = '';
  #mimeType = '';
  #fileExtension = '';

  constructor(name, displayName, description, mimeType, fileExtension) {
    this.#name = name;
    this.#displayName = displayName;
    this.#description = description;
    this.#mimeType = mimeType;
    this.#fileExtension = fileExtension;
  }

  getName() { return this.#name; }
  getDisplayName() { return this.#displayName; }
  getDescription() { return this.#description; }
  getMimeType() { return this.#mimeType; }
  getFileExtension() { return this.#fileExtension; }

  async isSupported() {
    return true; // オーバーライドで実装
  }

  async export(content, options) {
    throw new Error('export method must be implemented by subclass');
  }

  get supportsPreview() {
    return false;
  }

  async generatePreview(content, options) {
    throw new Error('Preview not supported');
  }
}

/**
 * HTMLエクスポーター
 */
class HTMLExporter extends BaseExporter {
  constructor() {
    super('html', 'HTML', 'Web page format', 'text/html', 'html');
  }

  async export(content, options) {
    const template = options.template || 'html-default';
    // テンプレート適用ロジック（簡略化）
    const html = content; // 実際の実装では適切なテンプレート処理
    
    const blob = new Blob([html], { type: this.getMimeType() });
    
    return {
      content: html,
      blob,
      size: blob.size,
      metadata: { template, encoding: 'UTF-8' }
    };
  }

  get supportsPreview() {
    return true;
  }

  async generatePreview(content, options) {
    const result = await this.export(content, options);
    return {
      type: 'html',
      content: result.content
    };
  }
}

/**
 * Markdownエクスポーター
 */
class MarkdownExporter extends BaseExporter {
  constructor() {
    super('markdown', 'Markdown', 'Markdown format', 'text/markdown', 'md');
  }

  async export(content, options) {
    const blob = new Blob([content], { type: this.getMimeType() });
    
    return {
      content,
      blob,
      size: blob.size,
      metadata: { format: 'markdown', encoding: 'UTF-8' }
    };
  }
}

/**
 * テキストエクスポーター
 */
class TextExporter extends BaseExporter {
  constructor() {
    super('txt', 'Plain Text', 'Plain text format', 'text/plain', 'txt');
  }

  async export(content, options) {
    // HTMLタグを除去してプレーンテキストに変換
    const textContent = content.replace(/<[^>]*>/g, '');
    const blob = new Blob([textContent], { type: this.getMimeType() });
    
    return {
      content: textContent,
      blob,
      size: blob.size,
      metadata: { format: 'plain-text', encoding: 'UTF-8' }
    };
  }
}

/**
 * JSONエクスポーター
 */
class JSONExporter extends BaseExporter {
  constructor() {
    super('json', 'JSON', 'JSON format', 'application/json', 'json');
  }

  async export(content, options) {
    const data = {
      content,
      exportedAt: new Date().toISOString(),
      metadata: options.metadata || {}
    };
    
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: this.getMimeType() });
    
    return {
      content: jsonContent,
      blob,
      size: blob.size,
      metadata: { format: 'json', encoding: 'UTF-8' }
    };
  }
}

/**
 * PDFエクスポーター（Puppeteer依存）
 */
class PDFExporter extends BaseExporter {
  constructor() {
    super('pdf', 'PDF', 'PDF document format', 'application/pdf', 'pdf');
  }

  async isSupported() {
    // ブラウザ環境での制限により、実際の実装では外部ライブラリが必要
    return false; // 簡略化のため無効
  }

  async export(content, options) {
    throw new Error('PDF export requires server-side implementation');
  }
}

/**
 * Wordエクスポーター（docx-js依存）
 */
class WordExporter extends BaseExporter {
  constructor() {
    super('docx', 'Word Document', 'Microsoft Word format', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx');
  }

  async isSupported() {
    return false; // 簡略化のため無効
  }

  async export(content, options) {
    throw new Error('Word export requires external library');
  }
}

/**
 * XMLエクスポーター
 */
class XMLExporter extends BaseExporter {
  constructor() {
    super('xml', 'XML', 'XML format', 'application/xml', 'xml');
  }

  async export(content, options) {
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<document>
  <content><![CDATA[${content}]]></content>
  <exported>${new Date().toISOString()}</exported>
</document>`;
    
    const blob = new Blob([xmlContent], { type: this.getMimeType() });
    
    return {
      content: xmlContent,
      blob,
      size: blob.size,
      metadata: { format: 'xml', encoding: 'UTF-8' }
    };
  }
}

/**
 * LaTeXエクスポーター
 */
class LaTeXExporter extends BaseExporter {
  constructor() {
    super('latex', 'LaTeX', 'LaTeX document format', 'application/x-latex', 'tex');
  }

  async export(content, options) {
    const latexContent = `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage[japanese]{babel}

\\begin{document}

${content}

\\end{document}`;
    
    const blob = new Blob([latexContent], { type: this.getMimeType() });
    
    return {
      content: latexContent,
      blob,
      size: blob.size,
      metadata: { format: 'latex', encoding: 'UTF-8' }
    };
  }
}

/**
 * EPUBエクスポーター
 */
class EPUBExporter extends BaseExporter {
  constructor() {
    super('epub', 'EPUB', 'EPUB e-book format', 'application/epub+zip', 'epub');
  }

  async isSupported() {
    return false; // 簡略化のため無効
  }

  async export(content, options) {
    throw new Error('EPUB export requires external library');
  }
}

/**
 * Markdown→HTMLコンバーター
 */
class MarkdownToHTMLConverter {
  async convert(markdown) {
    // 基本的なMarkdown→HTML変換（簡略化）
    return markdown
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }
}

/**
 * HTML→テキストコンバーター
 */
class HTMLToTextConverter {
  async convert(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
}

/**
 * Markdown→LaTeXコンバーター
 */
class MarkdownToLaTeXConverter {
  async convert(markdown) {
    // 基本的なMarkdown→LaTeX変換（簡略化）
    return markdown
      .replace(/^# (.+)$/gm, '\\section{$1}')
      .replace(/^## (.+)$/gm, '\\subsection{$1}')
      .replace(/^### (.+)$/gm, '\\subsubsection{$1}')
      .replace(/\*\*(.+?)\*\*/g, '\\textbf{$1}')
      .replace(/\*(.+?)\*/g, '\\textit{$1}')
      .replace(/`(.+?)`/g, '\\texttt{$1}');
  }
}