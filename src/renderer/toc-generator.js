// 目次生成機能

// 目次生成
export async function generateTableOfContents(editor) {
  if (!editor) return false;
  const format = await showTOCFormatDialog();
  if (!format) return false;
  const toc = generateTOC(editor, format);
  if (!toc) return false;
  // 現在のカーソル位置に目次を挿入
  editor.chain().focus().insertContent(toc).run();
  return true;
}

// 目次形式選択ダイアログを表示
async function showTOCFormatDialog() {
  // 既存のダイアログがあればそれを使用
  if (window.tocDialog) {
    return await window.tocDialog.show();
  }
  
  // なければ簡易的なダイアログを表示
  return new Promise((resolve) => {
    const dialogHTML = `
      <div id="toc-format-dialog" class="dialog-overlay" style="display: flex;">
        <div class="dialog-content">
          <div class="dialog-header">
            <h3>目次の形式を選択</h3>
            <button class="dialog-close">&times;</button>
          </div>
          <div class="dialog-body">
            <p>生成する目次の形式を選択してください：</p>
            <div class="toc-options">
              <label>
                <input type="radio" name="toc-format" value="linked" checked>
                <strong>リンク付き目次</strong> - 見出しへのジャンプリンク付き
              </label>
              <br><br>
              <label>
                <input type="radio" name="toc-format" value="simple">
                <strong>シンプル目次</strong> - テキストのみ、リンクなし
              </label>
            </div>
          </div>
          <div class="dialog-footer">
            <button class="dialog-cancel">キャンセル</button>
            <button class="dialog-ok">生成</button>
          </div>
        </div>
      </div>
    `;
    
    const dialogDiv = document.createElement('div');
    dialogDiv.innerHTML = dialogHTML;
    document.body.appendChild(dialogDiv.firstElementChild);
    
    const dialog = document.getElementById('toc-format-dialog');
    const closeBtn = dialog.querySelector('.dialog-close');
    const cancelBtn = dialog.querySelector('.dialog-cancel');
    const okBtn = dialog.querySelector('.dialog-ok');
    
    function close(result) {
      dialog.remove();
      resolve(result);
    }
    
    closeBtn.addEventListener('click', () => close(null));
    cancelBtn.addEventListener('click', () => close(null));
    okBtn.addEventListener('click', () => {
      const selected = dialog.querySelector('input[name="toc-format"]:checked');
      close(selected ? selected.value : null);
    });
    
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        close(null);
      }
    });
  });
}

// 目次を生成
function generateTOC(editor, format = 'linked') {
  const headings = [];
  
  // エディタ内の見出しを収集
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'heading') {
      const level = node.attrs.level;
      const text = node.textContent;
      if (text.trim()) {
        headings.push({ level, text: text.trim(), pos });
      }
    }
  });
  
  if (headings.length === 0) {
    window.showMessage('見出しが見つかりません', 'warning');
    return null;
  }
  
  // 目次を生成
  let toc = '<div class="table-of-contents">\n<h2>目次</h2>\n';
  
  headings.forEach(heading => {
    const indent = '  '.repeat(heading.level - 1);
    
    if (format === 'linked') {
      // リンク付き目次
      const anchor = createAnchor(heading.text);
      toc += `${indent}- <a href="#${anchor}">${escapeHtml(heading.text)}</a>\n`;
    } else {
      // シンプルな目次
      toc += `${indent}- ${escapeHtml(heading.text)}\n`;
    }
  });
  
  toc += '</div>\n\n';
  
  return toc;
}

// アンカー用のIDを生成
function createAnchor(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\s-]/g, '') // 英数字、日本語、スペース、ハイフンのみ
    .replace(/\s+/g, '-') // スペースをハイフンに
    .replace(/-+/g, '-') // 連続するハイフンを1つに
    .replace(/^-|-$/g, ''); // 先頭と末尾のハイフンを削除
}

// HTMLエスケープ
function escapeHtml(text) {
  text = String(text ?? '');
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// 目次スタイルを追加
function addTOCStyles() {
  if (document.getElementById('toc-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'toc-styles';
  style.textContent = `
    .table-of-contents {
      margin: 20px 0;
      padding: 20px;
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 8px;
    }

    .table-of-contents h2 {
      margin-top: 0;
      margin-bottom: 16px;
      font-size: 1.2em;
      color: #495057;
    }

    .table-of-contents ul {
      list-style: none;
      padding-left: 0;
    }

    .table-of-contents li {
      margin-bottom: 8px;
      padding-left: 20px;
      position: relative;
    }

    .table-of-contents li:before {
      content: "•";
      position: absolute;
      left: 8px;
      color: #6c757d;
    }

    .table-of-contents a {
      color: #007bff;
      text-decoration: none;
    }

    .table-of-contents a:hover {
      text-decoration: underline;
    }

    /* ダイアログスタイル */
    .toc-options {
      margin: 16px 0;
    }

    .toc-options label {
      display: block;
      cursor: pointer;
      padding: 8px;
      border-radius: 4px;
    }

    .toc-options label:hover {
      background: #f0f0f0;
    }

    .toc-options input[type="radio"] {
      margin-right: 8px;
    }

    .toc-options strong {
      color: #333;
    }
  `;
  document.head.appendChild(style);
}

// 初期化時にスタイルを追加
addTOCStyles();