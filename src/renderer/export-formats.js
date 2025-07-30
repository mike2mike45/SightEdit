// 各種プラットフォーム向けエクスポート機能
import TurndownService from 'turndown';

// WordPress Gutenberg形式への変換（標準Markdown形式として出力）
export function convertToGutenberg(markdown) {
  // WordPressのGutenbergエディタは標準的なMarkdownをサポートしているため、
  // Markdownをそのまま返す
  return markdown;
}

// note形式への変換（書式を保持しつつnoteエディタ互換）
export function convertToNote(markdown) {
  // noteのエディタは非常にシンプルなHTMLのみ受け付ける
  // 基本的なタグのみを使用し、入れ子を最小限にする
  
  let noteContent = '';
  const lines = markdown.split('\n');
  let inList = false;
  let inCodeBlock = false;
  let codeBlockContent = '';
  let inTable = false;
  let tableContent = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // コードブロックの処理
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockContent = '';
      } else {
        // noteはpreタグに制限があるので、divとcodeで代替
        noteContent += `<div style="background:#f5f5f5;padding:10px;overflow-x:auto;font-family:monospace">[非対応書式:コードブロック]<br><code>${escapeHtml(codeBlockContent.trim()).replace(/\n/g, '<br>')}</code></div>`;
        inCodeBlock = false;
      }
      continue;
    }
    
    if (inCodeBlock) {
      codeBlockContent += line + '\n';
      continue;
    }
    
    // テーブルの処理（noteはテーブルをサポートしないので、リストで代替）
    if (line.includes('|') && line.trim().startsWith('|') && line.trim().endsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableContent = [];
      }
      // セパレータ行はスキップ
      if (!line.match(/^\|[-:\s|]+\|$/)) {
        const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
        tableContent.push(cells);
      }
      continue;
    } else if (inTable) {
      // テーブルをリストとして出力
      noteContent += '<p>[非対応書式:テーブル]</p><ul>';
      tableContent.forEach(row => {
        noteContent += '<li>' + row.join(' / ') + '</li>';
      });
      noteContent += '</ul>';
      inTable = false;
      tableContent = [];
    }
    
    // 見出しの処理（h1-h3のみ、noteは大きい見出しをサポート）
    if (line.match(/^### (.+)$/)) {
      noteContent += `<h3>${processInlineElements(RegExp.$1)}</h3>`;
    } else if (line.match(/^## (.+)$/)) {
      noteContent += `<h2>${processInlineElements(RegExp.$1)}</h2>`;
    } else if (line.match(/^# (.+)$/)) {
      noteContent += `<h1>${processInlineElements(RegExp.$1)}</h1>`;
    } else if (line.match(/^#{4,6} (.+)$/)) {
      // h4-h6はnoteでサポートされていないので、h3として扱う
      noteContent += `<h3>[非対応書式:小見出し]${processInlineElements(RegExp.$1)}</h3>`;
    }
    // リストの処理
    else if (line.match(/^- (.+)$/)) {
      if (!inList) {
        noteContent += '<ul>';
        inList = true;
      }
      let listContent = RegExp.$1;
      // タスクリストの処理
      if (listContent.match(/^\[[ x]\] (.+)$/)) {
        const isChecked = listContent.charAt(1) === 'x';
        listContent = '[非対応書式:タスク]' + (isChecked ? '✓ ' : '□ ') + RegExp.$1;
      }
      noteContent += `<li>${processInlineElements(listContent)}</li>`;
    }
    // 引用の処理
    else if (line.match(/^> (.+)$/)) {
      noteContent += `<blockquote>${processInlineElements(RegExp.$1)}</blockquote>`;
    }
    // 番号付きリストの処理
    else if (line.match(/^\d+\. (.+)$/)) {
      if (!inList) {
        noteContent += '<ol>';
        inList = true;
      }
      noteContent += `<li>${processInlineElements(RegExp.$1)}</li>`;
    }
    // 水平線
    else if (line.match(/^---+$/)) {
      noteContent += '<hr>';
    }
    // 通常のテキスト
    else {
      if (inList) {
        noteContent += inList === 'ul' ? '</ul>' : '</ol>';
        inList = false;
      }
      if (line.trim()) {
        noteContent += `<p>${processInlineElements(line)}</p>`;
      }
    }
  }
  
  // 最後のリストを閉じる
  if (inList) {
    noteContent += inList === 'ul' ? '</ul>' : '</ol>';
  }
  
  // インライン要素の処理
  function processInlineElements(text) {
    // インラインコード
    text = text.replace(/`([^`]+)`/g, '<code style="background:#f5f5f5;padding:2px 4px;">$1</code>');
    
    // 太字
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // 斜体（noteはemタグをサポート）
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // リンク
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    
    // 画像（noteは画像の直接埋め込みに制限があるため）
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '[非対応書式:画像]($1)');
    
    // 取り消し線（noteはサポートしない）
    text = text.replace(/~~([^~]+)~~/g, '[非対応書式:取り消し線]$1');
    
    return text;
  }
  
  return noteContent;
}

// 小説家になろう形式への変換（ルビ記法や装飾の変換）
export function convertToNarou(markdown) {
  let narouText = markdown;
  
  // 1. 見出しを章タイトル形式に変換
  narouText = narouText.replace(/^#{4,6} (.+)$/gm, '\n\n　　◇　$1　◇\n\n');
  narouText = narouText.replace(/^### (.+)$/gm, '\n\n　　◇◇◇　$1　◇◇◇\n\n');
  narouText = narouText.replace(/^## (.+)$/gm, '\n\n　　◆◆◆　$1　◆◆◆\n\n');
  narouText = narouText.replace(/^# (.+)$/gm, '\n\n　　■■■　$1　■■■\n\n');
  
  // 2. 強調を傍点に変換（10文字制限あり）
  narouText = narouText.replace(/\*\*([^*]+)\*\*/g, function(match, text) {
    if (text.length <= 10) {
      const dots = '・'.repeat(text.length);
      return `｜${text}《${dots}》`;
    } else {
      // 10文字を超える場合は1文字ずつ分割
      return text.split('').map(char => `｜${char}《・》`).join('');
    }
  });
  
  // 3. 斜体は削除（書式非対応）
  narouText = narouText.replace(/\*([^*]+)\*/g, '[非対応書式:斜体]$1');
  
  // 4. リンクと画像を適切に処理
  narouText = narouText.replace(/\[([^\]]+)\]\([^)]+\)/g, '[非対応書式:リンク]$1');
  narouText = narouText.replace(/!\[([^\]]*)\]\([^)]+\)/g, '[非対応書式:画像]');
  
  // 5. コードブロックとインラインコードを削除
  narouText = narouText.replace(/```[^`]*```/gs, '[非対応書式:コードブロック]');
  narouText = narouText.replace(/`([^`]+)`/g, '[非対応書式:コード]$1');
  
  // 6. 引用を会話文として扱う
  narouText = narouText.replace(/^> (.+)$/gm, '「$1」');
  
  // 7. 水平線を場面転換に
  narouText = narouText.replace(/^---+$/gm, '\n\n　　＊　＊　＊\n\n');
  
  // 8. リストを通常の文章に
  narouText = narouText.replace(/^- (.+)$/gm, '・$1');
  narouText = narouText.replace(/^\d+\. (.+)$/gm, '　$1');
  
  // 9. テーブルを削除
  const tableLines = narouText.split('\n');
  let inTable = false;
  let processedLines = [];
  
  for (const line of tableLines) {
    if (line.includes('|') && line.trim().startsWith('|') && line.trim().endsWith('|')) {
      if (!inTable) {
        inTable = true;
        processedLines.push('[非対応書式:テーブル]');
      }
      // セパレータ行も含めてスキップ
    } else {
      if (inTable) {
        inTable = false;
      }
      processedLines.push(line);
    }
  }
  
  narouText = processedLines.join('\n');
  
  // 10. タスクリストを通常のリストに
  narouText = narouText.replace(/- \[ \] (.+)$/gm, '・[非対応書式:タスク]$1');
  narouText = narouText.replace(/- \[x\] (.+)$/gm, '・[非対応書式:タスク]$1（済）');
  
  // 11. 取り消し線は削除
  narouText = narouText.replace(/~~([^~]+)~~/g, '[非対応書式:取り消し線]$1');
  
  // 12. 改行の調整
  narouText = narouText.replace(/\n\n+/g, '\n\n');
  
  // 13. 段落の先頭に全角スペースを追加
  narouText = narouText.split('\n').map((line, index, array) => {
    // 空行はそのまま
    if (!line.trim()) return line;
    
    // 特定の文字で始まる行はそのまま
    if (line.match(/^[　「『（［｛【〈《〔〖〘〚＊◆◇■・]/)) {
      return line;
    }
    
    // それ以外の行は全角スペースを追加
    return '　' + line;
  }).join('\n');
  
  // 14. 連続する空行を2つまでに制限
  narouText = narouText.replace(/\n\n\n+/g, '\n\n');
  
  return narouText;
}

// プレーンテキスト形式への変換（カクヨムなど向け）
export function convertToPlainText(markdown) {
  let plainText = markdown;
  
  // 1. 見出しはそのまま残す（マークダウン記号を削除）
  plainText = plainText.replace(/^#{1,6} (.+)$/gm, '$1');
  
  // 2. 強調・斜体を削除（書式を完全に削除）
  plainText = plainText.replace(/\*\*([^*]+)\*\*/g, '$1');
  plainText = plainText.replace(/\*([^*]+)\*/g, '$1');
  
  // 3. リンクはテキストのみ残す
  plainText = plainText.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  // 4. 画像を削除（プレーンテキストなので完全に削除）
  plainText = plainText.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');
  
  // 5. コードブロックとインラインコードを通常テキストに
  plainText = plainText.replace(/```[^`]*```/gs, function(match) {
    const code = match.replace(/```[^`\n]*\n?/g, '').replace(/```$/g, '');
    return code.trim();
  });
  plainText = plainText.replace(/`([^`]+)`/g, '$1');
  
  // 6. 引用記号を削除
  plainText = plainText.replace(/^> (.+)$/gm, '$1');
  
  // 7. 水平線をテキスト表現に
  plainText = plainText.replace(/^---+$/gm, '──────────');
  
  // 8. リストマーカーを調整
  plainText = plainText.replace(/^- (.+)$/gm, '・$1');
  plainText = plainText.replace(/^\d+\. (.+)$/gm, '$1');
  
  // 9. テーブルを簡易表現に（書式なしで内容のみ）
  const tableLines = plainText.split('\n');
  let inTable = false;
  let tableData = [];
  let processedLines = [];
  
  for (const line of tableLines) {
    if (line.includes('|') && line.trim().startsWith('|') && line.trim().endsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableData = [];
      }
      // セパレータ行はスキップ
      if (!line.match(/^\|[-:\s|]+\|$/)) {
        const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
        tableData.push(cells);
      }
    } else {
      if (inTable) {
        // テーブルを簡易形式で出力
        tableData.forEach(row => {
          processedLines.push(row.join(' / '));
        });
        inTable = false;
        tableData = [];
      }
      processedLines.push(line);
    }
  }
  
  // 最後のテーブルを処理
  if (inTable) {
    tableData.forEach(row => {
      processedLines.push(row.join(' / '));
    });
  }
  
  plainText = processedLines.join('\n');
  
  // 10. タスクリストを通常のテキストに（書式を完全に削除）
  plainText = plainText.replace(/- \[ \] (.+)$/gm, '・$1');
  plainText = plainText.replace(/- \[x\] (.+)$/gm, '・$1（完了）');
  
  // 11. 取り消し線を削除
  plainText = plainText.replace(/~~([^~]+)~~/g, '$1');
  
  // 12. 連続する空行を削除して整形
  plainText = plainText.replace(/\n\n\n+/g, '\n\n');
  
  // 13. 先頭と末尾の空白を削除
  plainText = plainText.trim();
  
  return plainText;
}

// Qiita形式への変換（Markdown拡張）
export function convertToQiita(markdown) {
  let qiitaMarkdown = markdown;
  
  // Qiita独自の記法に変換
  // 1. コードブロックのファイル名指定
  qiitaMarkdown = qiitaMarkdown.replace(/```(\w+)\n/g, function(match, lang) {
    // ファイル名の提案を追加（オプション）
    if (lang === 'javascript' || lang === 'js') {
      return `\`\`\`javascript:example.js\n`;
    } else if (lang === 'python' || lang === 'py') {
      return `\`\`\`python:example.py\n`;
    } else if (lang === 'html') {
      return `\`\`\`html:index.html\n`;
    } else if (lang === 'css') {
      return `\`\`\`css:style.css\n`;
    }
    return match;
  });
  
  // 2. 数式記法の変換（もしLaTeXを使用している場合）
  // インライン数式 $...$ を ```math に変換
  qiitaMarkdown = qiitaMarkdown.replace(/\$([^\$]+)\$/g, '```math\n$1\n```');
  
  // 3. 注釈の追加（Qiitaでよく使われる形式）
  // 見出しの前に目次用のアンカーを追加することも可能
  
  // 4. タスクリストを通常のリストに変換（Qiitaは非対応）
  qiitaMarkdown = qiitaMarkdown.replace(/- \[ \] (.+)$/gm, '- [非対応書式:タスク] $1');
  qiitaMarkdown = qiitaMarkdown.replace(/- \[x\] (.+)$/gm, '- [非対応書式:タスク] $1（完了）');
  
  return qiitaMarkdown;
}

// HTMLエスケープ
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 完全なHTMLドキュメントを作成
function createFullHTML(bodyContent) {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Exported Document</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    pre {
      background: #f4f4f4;
      padding: 1em;
      overflow-x: auto;
    }
    code {
      background: #f4f4f4;
      padding: 0.2em 0.4em;
      border-radius: 3px;
    }
    blockquote {
      border-left: 4px solid #ddd;
      margin: 0;
      padding-left: 1em;
      color: #666;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f4f4f4;
    }
  </style>
</head>
<body>
${bodyContent}
</body>
</html>`;
}

// フォーマット名を取得
function getFormatName(format) {
  const names = {
    gutenberg: 'WordPress Gutenberg',
    note: 'note',
    narou: '小説家になろう',
    plaintext: 'プレーンテキスト（カクヨムなど）',
    qiita: 'Qiita',
    html: 'HTML'
  };
  return names[format] || format;
}

// スタイルを追加
export function addExportStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .export-dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    }
    
    .export-dialog-content {
      background: white;
      border-radius: 12px;
      width: 90%;
      max-width: 600px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      overflow: hidden;
    }
    
    .export-dialog-header {
      background: #f8f9fa;
      padding: 20px;
      border-bottom: 1px solid #e9ecef;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .export-dialog-header h3 {
      margin: 0;
      font-size: 20px;
      color: #333;
    }
    
    .export-dialog-close {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background-color 0.2s;
    }
    
    .export-dialog-close:hover {
      background-color: #e9ecef;
    }
    
    .export-dialog-body {
      padding: 20px;
    }
    
    .export-options-wrapper {
      max-height: 400px;
      overflow-y: auto;
    }
    
    .export-options {
      display: grid;
      gap: 12px;
    }
    
    .export-option {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      background: white;
      cursor: pointer;
      transition: all 0.2s;
      text-align: left;
    }
    
    .export-option:hover {
      border-color: #1a73e8;
      background: #f8f9fa;
    }
    
    .export-option-icon {
      font-size: 32px;
      flex-shrink: 0;
    }
    
    .export-option-text strong {
      display: block;
      font-size: 16px;
      margin-bottom: 4px;
      color: #333;
    }
    
    .export-option-text small {
      display: block;
      font-size: 14px;
      color: #666;
    }
    
    .export-success-content {
      background: white;
      border-radius: 12px;
      width: 90%;
      max-width: 500px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      overflow: hidden;
    }
    
    .export-success-header {
      background: #e8f5e9;
      padding: 20px;
      border-bottom: 1px solid #c8e6c9;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .export-success-header h3 {
      margin: 0;
      font-size: 20px;
      color: #2e7d32;
    }
    
    .export-success-body {
      padding: 20px;
    }
    
    .export-success-body p {
      margin: 0 0 16px 0;
      font-size: 16px;
      color: #333;
    }
    
    .export-success-preview {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }
    
    .export-success-preview h4 {
      margin: 0 0 8px 0;
      font-size: 14px;
      color: #666;
    }
    
    .export-success-preview pre {
      margin: 0;
      font-size: 14px;
      white-space: pre-wrap;
      word-wrap: break-word;
      color: #333;
      background: none;
      padding: 0;
    }
    
    .export-success-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }
    
    .export-success-actions button {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .export-success-download {
      background: #1a73e8;
      color: white;
    }
    
    .export-success-download:hover {
      background: #1557b0;
    }
    
    .export-success-close {
      background: #e9ecef;
      color: #333;
    }
    
    .export-success-close:hover {
      background: #dadce0;
    }
  `;
  document.head.appendChild(style);
}

// エクスポート成功ダイアログ
function showExportSuccessDialog(content, filename, format) {
  let additionalInfo = '';
  if (format === 'note') {
    additionalInfo = '<p style="color: #1a73e8; font-size: 12px; margin-top: 10px;">✨ 太字、斜体、見出し、リンクなどの書式が保持されています。<br>非対応書式には[非対応書式:種類]のマークが付いています。<br>通常通り「Ctrl+V」（Mac: Cmd+V）で貼り付けてください。</p>';
  } else if (format === 'narou') {
    additionalInfo = '<p style="color: #1a73e8; font-size: 12px; margin-top: 10px;">📖 小説家になろう形式に変換しました。<br>非対応書式には[非対応書式:種類]のマークが付いています。<br>強調は傍点（ルビ）に変換されています。</p>';
  } else if (format === 'qiita') {
    additionalInfo = '<p style="color: #1a73e8; font-size: 12px; margin-top: 10px;">💚 Qiita形式に変換しました。<br>非対応書式には[非対応書式:種類]のマークが付いています。<br>コードブロックにファイル名が自動付与されています。</p>';
  } else if (format === 'plaintext') {
    additionalInfo = '<p style="color: #1a73e8; font-size: 12px; margin-top: 10px;">📄 プレーンテキスト形式に変換しました。<br>すべての書式が削除されています。</p>';
  }
  
  const dialogHTML = `
    <div id="export-success-dialog" class="export-dialog-overlay">
      <div class="export-success-content">
        <div class="export-success-header">
          <h3>✅ エクスポート完了</h3>
          <button class="export-dialog-close">&times;</button>
        </div>
        <div class="export-success-body">
          <p>${getFormatName(format)}形式でクリップボードにコピーしました。</p>
          ${additionalInfo}
          <div class="export-success-preview">
            <h4>プレビュー:</h4>
            <pre>${escapeHtml(content.substring(0, 300))}${content.length > 300 ? '...' : ''}</pre>
          </div>
          <div class="export-success-actions">
            <button class="export-success-download" onclick="downloadFile('${escapeHtml(content)}', '${filename}', '${format}')">ファイルとしてダウンロード</button>
            <button class="export-success-close">閉じる</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  const dialogDiv = document.createElement('div');
  dialogDiv.innerHTML = dialogHTML;
  document.body.appendChild(dialogDiv.firstElementChild);
  
  const dialog = document.getElementById('export-success-dialog');
  const closeBtn = dialog.querySelector('.export-dialog-close');
  const closeBtn2 = dialog.querySelector('.export-success-close');
  const downloadBtn = dialog.querySelector('.export-success-download');
  
  // 閉じるボタン
  closeBtn.addEventListener('click', () => {
    dialog.remove();
  });
  
  closeBtn2.addEventListener('click', () => {
    dialog.remove();
  });
  
  // ダウンロードボタン
  downloadBtn.addEventListener('click', () => {
    downloadFile(content, filename, format);
  });
  
  // 背景クリックで閉じる
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      dialog.remove();
    }
  });
}

// ファイルのダウンロード
function downloadFile(content, filename, format) {
  const mimeType = format === 'html' ? 'text/html;charset=utf-8' : 'text/plain;charset=utf-8';
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// エクスポートダイアログを表示
export function showExportDialog(editor, currentMode) {
  // 既存のダイアログがあれば削除
  const existingDialog = document.getElementById('export-dialog');
  if (existingDialog) {
    existingDialog.remove();
  }
  
  const dialogHTML = `
    <div id="export-dialog" class="export-dialog-overlay">
      <div class="export-dialog-content">
        <div class="export-dialog-header">
          <h3>📤 エクスポート形式を選択</h3>
          <button class="export-dialog-close">&times;</button>
        </div>
        <div class="export-dialog-body">
          <div class="export-options-wrapper">
            <div class="export-options">
              <button class="export-option" data-format="gutenberg">
                <div class="export-option-icon">📝</div>
                <div class="export-option-text">
                  <strong>WordPress (Gutenberg：標準MarkDown形式)</strong>
                  <small>Markdownエディター対応</small>
                </div>
              </button>
              <button class="export-option" data-format="note">
                <div class="export-option-icon">📔</div>
                <div class="export-option-text">
                  <strong>note</strong>
                  <small>書式付きHTML形式</small>
                </div>
              </button>
              <button class="export-option" data-format="narou">
                <div class="export-option-icon">📖</div>
                <div class="export-option-text">
                  <strong>小説家になろう</strong>
                  <small>小説投稿サイト形式</small>
                </div>
              </button>
              <button class="export-option" data-format="plaintext">
                <div class="export-option-icon">📄</div>
                <div class="export-option-text">
                  <strong>プレーンテキスト（カクヨムなど）</strong>
                  <small>書式なしテキスト形式</small>
                </div>
              </button>
              <button class="export-option" data-format="qiita">
                <div class="export-option-icon">🟢</div>
                <div class="export-option-text">
                  <strong>Qiita</strong>
                  <small>技術記事投稿形式</small>
                </div>
              </button>
              <button class="export-option" data-format="html">
                <div class="export-option-icon">🌐</div>
                <div class="export-option-text">
                  <strong>HTML</strong>
                  <small>Webページ形式</small>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  const dialogDiv = document.createElement('div');
  dialogDiv.innerHTML = dialogHTML;
  document.body.appendChild(dialogDiv.firstElementChild);
  
  const dialog = document.getElementById('export-dialog');
  const closeBtn = dialog.querySelector('.export-dialog-close');
  const options = dialog.querySelectorAll('.export-option');
  
  // 閉じるボタン
  closeBtn.addEventListener('click', () => {
    dialog.remove();
  });
  
  // 背景クリックで閉じる
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      dialog.remove();
    }
  });
  
  // 各オプションのクリック処理
  options.forEach(option => {
    option.addEventListener('click', () => {
      const format = option.dataset.format;
      handleExport(format, editor, currentMode);
      dialog.remove();
    });
  });
}

// エクスポート処理
function handleExport(format, editor, currentMode) {
  let content = '';
  
  // 現在のコンテンツを取得
  if (currentMode === 'source') {
    const sourceEditor = document.getElementById('source-editor');
    content = sourceEditor.value;
  } else {
    const { getMarkdownContent } = window.getMarkdownContent || {};
    if (getMarkdownContent) {
      content = getMarkdownContent(editor);
    }
  }
  
  if (!content) {
    window.showMessage('エクスポートする内容がありません', 'warning');
    return;
  }
  
  let exportedContent = '';
  let filename = 'export';
  
  switch (format) {
    case 'gutenberg':
      exportedContent = convertToGutenberg(content);
      filename = 'wordpress-gutenberg.md';
      break;
      
    case 'note':
      exportedContent = convertToNote(content);
      filename = 'note-content.html';
      break;
      
    case 'narou':
      exportedContent = convertToNarou(content);
      filename = 'narou-novel.txt';
      break;
      
    case 'plaintext':
      exportedContent = convertToPlainText(content);
      filename = 'plaintext.txt';
      break;
      
    case 'qiita':
      exportedContent = convertToQiita(content);
      filename = 'qiita-article.md';
      break;
      
    case 'html':
      const { markdownToHtml } = window.markdownToHtml || {};
      if (markdownToHtml) {
        exportedContent = createFullHTML(markdownToHtml(content));
        filename = 'document.html';
      }
      break;
  }
  
  // クリップボードにコピー
  copyToClipboard(exportedContent, format);
  
  // ファイルとしてダウンロードするオプションも提供
  showExportSuccessDialog(exportedContent, filename, format);
}

// クリップボードにコピー（リッチテキスト対応版）
async function copyToClipboard(content, format) {
  try {
    if (format === 'note') {
      // noteの場合は書式付きHTMLとして提供
      const blob = new Blob([content], { type: 'text/html' });
      const clipboardItem = new ClipboardItem({
        'text/html': blob
      });
      
      await navigator.clipboard.write([clipboardItem]);
      window.showMessage('note形式（書式付き）でクリップボードにコピーしました', 'success');
    } else if (format === 'html') {
      // HTMLフォーマットでクリップボードに書き込む
      const clipboardItem = new ClipboardItem({
        'text/html': new Blob([content], { type: 'text/html' }),
        'text/plain': new Blob([content], { type: 'text/plain' })
      });
      await navigator.clipboard.write([clipboardItem]);
      window.showMessage(`${getFormatName(format)}形式でクリップボードにコピーしました（リッチテキスト）`, 'success');
    } else {
      // プレーンテキストとして書き込む（plaintext, narou, qiita, gutenberg）
      await navigator.clipboard.writeText(content);
      window.showMessage(`${getFormatName(format)}形式でクリップボードにコピーしました`, 'success');
    }
  } catch (error) {
    console.error('Copy to clipboard failed:', error);
    window.showMessage('クリップボードへのコピーに失敗しました', 'error');
  }
}

// noteのHTMLをプレーンテキストに変換
function convertNoteHtmlToPlainText(html) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // 改行を保持しながらテキストを抽出
  let text = '';
  
  function extractText(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();
      
      // ブロック要素の前後に改行を追加
      const blockElements = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'pre'];
      if (blockElements.includes(tagName)) {
        if (text && !text.endsWith('\n')) {
          text += '\n';
        }
      }
      
      // 子要素を処理
      for (const child of node.childNodes) {
        extractText(child);
      }
      
      // ブロック要素の後に改行を追加
      if (blockElements.includes(tagName)) {
        if (!text.endsWith('\n')) {
          text += '\n';
        }
      }
      
      // リスト項目の前にマーカーを追加
      if (tagName === 'li') {
        const parent = node.parentElement;
        if (parent && parent.tagName.toLowerCase() === 'ul') {
          text = text.replace(/\n([^\n]+)$/, '\n• $1');
        }
      }
    }
  }
  
  extractText(tempDiv);
  
  // 連続する改行を2つまでに制限
  text = text.replace(/\n\n+/g, '\n\n');
  
  return text.trim();
}

// グローバルに関数を公開
window.downloadFile = downloadFile;
window.showExportDialog = showExportDialog;
window.addExportStyles = addExportStyles;