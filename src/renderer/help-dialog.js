// ヘルプダイアログモジュール
export function createHelpDialog() {
  const dialogHTML = `
    <div id="help-dialog" class="dialog-overlay" style="display: none;">
      <div class="dialog-content help-dialog-content">
        <div class="dialog-header">
          <h2>ヘルプ</h2>
          <button id="help-close" class="dialog-close">&times;</button>
        </div>
        <div class="help-tabs">
          <button class="help-tab active" data-tab="shortcuts">ショートカット</button>
          <button class="help-tab" data-tab="markdown">Markdown記法</button>
          <button class="help-tab" data-tab="about">このアプリについて</button>
        </div>
        <div class="help-content">
          <div id="shortcuts-content" class="help-tab-content active">
            <h3>キーボードショートカット</h3>
            <table class="shortcuts-table">
              <tr>
                <td>新規作成</td>
                <td><kbd>Ctrl</kbd> + <kbd>N</kbd></td>
              </tr>
              <tr>
                <td>開く</td>
                <td><kbd>Ctrl</kbd> + <kbd>O</kbd></td>
              </tr>
              <tr>
                <td>保存</td>
                <td><kbd>Ctrl</kbd> + <kbd>S</kbd></td>
              </tr>
              <tr>
                <td>名前を付けて保存</td>
                <td><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd></td>
              </tr>
              <tr class="separator">
                <td colspan="2"></td>
              </tr>
              <tr>
                <td>元に戻す</td>
                <td><kbd>Ctrl</kbd> + <kbd>Z</kbd></td>
              </tr>
              <tr>
                <td>やり直し</td>
                <td><kbd>Ctrl</kbd> + <kbd>Y</kbd></td>
              </tr>
              <tr>
                <td>検索・置換</td>
                <td><kbd>Ctrl</kbd> + <kbd>F</kbd></td>
              </tr>
              <tr class="separator">
                <td colspan="2"></td>
              </tr>
              <tr>
                <td>太字</td>
                <td><kbd>Ctrl</kbd> + <kbd>B</kbd></td>
              </tr>
              <tr>
                <td>斜体</td>
                <td><kbd>Ctrl</kbd> + <kbd>I</kbd></td>
              </tr>
              <tr>
                <td>リンク</td>
                <td><kbd>Ctrl</kbd> + <kbd>K</kbd></td>
              </tr>
              <tr>
                <td>目次生成</td>
                <td><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>T</kbd></td>
              </tr>
            </table>
          </div>
          
          <div id="markdown-content" class="help-tab-content">
            <h3>Markdown記法</h3>
            <div class="markdown-examples">
              <h4>見出し</h4>
              <pre># 見出し1
## 見出し2
### 見出し3</pre>
              
              <h4>強調</h4>
              <pre>**太字**
*斜体*
~~取り消し線~~</pre>
              
              <h4>リスト</h4>
              <pre>- 項目1
- 項目2
  - サブ項目

1. 番号付き
2. リスト</pre>
              
              <h4>リンクと画像</h4>
              <pre>[リンクテキスト](https://example.com)
![代替テキスト](image.jpg)</pre>
              
              <h4>引用</h4>
              <pre>&gt; 引用文</pre>
              
              <h4>コードブロック</h4>
              <pre>\`\`\`言語名
コード
\`\`\`</pre>
              
              <h4>水平線</h4>
              <pre>---</pre>
              
              <h4>HTML埋め込み</h4>
              <pre>&lt;details&gt;
&lt;summary&gt;クリックして展開&lt;/summary&gt;
内容
&lt;/details&gt;</pre>
              
              <div class="help-note">
                <strong>📌 HTML埋め込みに関する注意事項：</strong><br>
                • TipTapエディタ内では、セキュリティとエディタの制御のため、クリック動作が制限される場合があります<br>
                • &lt;details&gt;タグなどのインタラクティブな要素は、エディタ内では表示のみとなります<br>
                • エクスポートしたHTMLファイルでは正常にクリックして展開できます<br>
                • これはWYSIWYGエディタの一般的な仕様です（編集モードと表示モードの区別）
              </div>
              
              <h4>脚注</h4>
              <pre>本文[^1]
[^1]: 脚注の内容</pre>
              
              <h4>エスケープ文字</h4>
              <pre>\\*アスタリスク\\*
\\[角括弧\\]</pre>
              
              <h4>改行</h4>
              <pre>行末に2つのスペースを追加すると  
改行できます。

または、HTMLの&lt;br&gt;タグを使用することもできます。
&lt;br&gt;
このように改行されます。</pre>
            </div>
          </div>
          
          <div id="about-content" class="help-tab-content">
            <div class="about-section">
              <div class="app-info">
                <h2>SightEdit</h2>
                <p><strong>バージョン:</strong> <span id="app-version">3.0.0</span></p>
                <p><strong>開発者:</strong> DuckEngine LLC</p>
                <p>
                  <strong>公式サイト:</strong> 
                  <a href="#" class="external-link" data-url="https://duckengine.com">duckengine.com</a>
                </p>
                <p>
                  <strong>GitHubリポジトリ:</strong> 
                  <a href="#" class="external-link" data-url="https://github.com/mike2mike45/sightedit">sightedit</a>
                </p>
                <p>
                  <strong>開発ブログ:</strong> 
                  <a href="#" class="external-link" data-url="https://mike2mike.xyz/2025/03/24/markdown%e3%82%a8%e3%83%87%e3%82%a3%e3%82%bf-noteninja%e3%82%92%e4%bd%9c%e3%82%8a%e3%81%be%e3%81%97%e3%81%9f/">記事を読む</a>
                </p>
                <p><strong>ライセンス:</strong> MIT License</p>
                <p><strong>ビルド:</strong> Electron + TipTap Editor</p>
              </div>
              
              <div class="features-section">
                <h3>主な機能</h3>
                <ul>
                  <li>📝 リアルタイムMarkdownプレビュー</li>
                  <li>🎨 WYSIWYGエディタ</li>
                  <li>💾 自動保存機能</li>
                  <li>📤 多形式エクスポート</li>
                  <li>🔍 検索・置換機能</li>
                  <li>📋 目次自動生成</li>
                  <li>🌓 ダーク/ライトモード</li>
                </ul>
              </div>
              
              <div class="credits-section">
                <h3>使用ライブラリ</h3>
                <ul>
                  <li>TipTap Editor - WYSIWYGエディタ</li>
                  <li>Marked.js - Markdownパーサー</li>
                  <li>Turndown - HTMLからMarkdown変換</li>
                  <li>Highlight.js - シンタックスハイライト</li>
                  <li>CodeMirror - ソースエディタ</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // DOMに追加
  document.body.insertAdjacentHTML('beforeend', dialogHTML);
  
  // イベントリスナーの設定
  setupHelpDialogEvents();
  
  return {
    show: () => {
      const dialog = document.getElementById('help-dialog');
      if (dialog) {
        dialog.style.display = 'flex';
      }
    },
    hide: () => {
      const dialog = document.getElementById('help-dialog');
      if (dialog) {
        dialog.style.display = 'none';
      }
    }
  };
}

// ヘルプダイアログのイベント設定
function setupHelpDialogEvents() {
  // 閉じるボタン
  const closeBtn = document.getElementById('help-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      const dialog = document.getElementById('help-dialog');
      if (dialog) {
        dialog.style.display = 'none';
      }
    });
  }
  
  // タブ切り替え
  const tabs = document.querySelectorAll('.help-tab');
  const contents = document.querySelectorAll('.help-tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      
      // タブのアクティブ状態を更新
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // コンテンツの表示を更新
      contents.forEach(content => {
        if (content.id === `${targetTab}-content`) {
          content.classList.add('active');
        } else {
          content.classList.remove('active');
        }
      });
    });
  });
  
  // 外部リンクのハンドリング
  const externalLinks = document.querySelectorAll('.external-link');
  externalLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const url = link.dataset.url;
      if (url && window.electron && window.electron.openExternal) {
        window.electron.openExternal(url);
      } else if (url) {
        window.open(url, '_blank');
      }
    });
  });
  
  // ESCキーで閉じる
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const dialog = document.getElementById('help-dialog');
      if (dialog && dialog.style.display !== 'none') {
        dialog.style.display = 'none';
      }
    }
  });
  
  // オーバーレイクリックで閉じる
  const dialog = document.getElementById('help-dialog');
  if (dialog) {
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        dialog.style.display = 'none';
      }
    });
  }
}

// スタイルの追加
export function addHelpStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    }
    
    .help-dialog-content {
      width: 90%;
      max-width: 800px;
      max-height: 80vh;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    
    .dialog-header {
      padding: 20px;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .dialog-header h2 {
      margin: 0;
      font-size: 24px;
    }
    
    .dialog-close {
      background: none;
      border: none;
      font-size: 28px;
      cursor: pointer;
      color: #666;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .dialog-close:hover {
      color: #000;
    }
    
    .help-tabs {
      display: flex;
      border-bottom: 1px solid #e0e0e0;
      background: #f5f5f5;
    }
    
    .help-tab {
      flex: 1;
      padding: 12px;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 14px;
      color: #666;
      transition: all 0.2s;
    }
    
    .help-tab:hover {
      background: #e9e9e9;
    }
    
    .help-tab.active {
      background: white;
      color: #1a73e8;
      font-weight: 500;
    }
    
    .help-content {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }
    
    .help-tab-content {
      display: none;
    }
    
    .help-tab-content.active {
      display: block;
    }
    
    .shortcuts-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .shortcuts-table td {
      padding: 8px;
      border-bottom: 1px solid #f0f0f0;
    }
    
    .shortcuts-table td:first-child {
      width: 60%;
    }
    
    .shortcuts-table tr.separator td {
      border-bottom: 2px solid #e0e0e0;
      padding: 4px;
    }
    
    kbd {
      background: #f4f4f4;
      border: 1px solid #ccc;
      border-radius: 3px;
      padding: 2px 6px;
      font-family: monospace;
      font-size: 12px;
      box-shadow: 0 1px 0 rgba(0,0,0,0.1);
    }
    
    .markdown-examples h4 {
      margin-top: 20px;
      margin-bottom: 10px;
      color: #333;
    }
    
    .markdown-examples pre {
      background: #f8f8f8;
      padding: 10px;
      border-radius: 4px;
      overflow-x: auto;
      font-family: monospace;
      font-size: 13px;
    }
    
    .help-note {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 4px;
      padding: 12px;
      margin-top: 15px;
      font-size: 13px;
      line-height: 1.5;
    }
    
    .about-section {
      line-height: 1.6;
    }
    
    .app-info h2 {
      color: #1a73e8;
      margin-bottom: 15px;
    }
    
    .features-section,
    .credits-section {
      margin-top: 30px;
    }
    
    .features-section h3,
    .credits-section h3 {
      color: #333;
      margin-bottom: 10px;
    }
    
    .features-section ul,
    .credits-section ul {
      list-style: none;
      padding-left: 0;
    }
    
    .features-section li {
      padding: 5px 0;
    }
    
    .credits-section li {
      padding: 3px 0;
      color: #666;
    }
    
    .external-link {
      color: #1a73e8;
      text-decoration: none;
      cursor: pointer;
    }
    
    .external-link:hover {
      text-decoration: underline;
    }
    
    /* ダークモード対応 */
    body.dark-mode .help-dialog-content {
      background: #2b2b2b;
      color: #e0e0e0;
    }
    
    body.dark-mode .dialog-header {
      border-bottom-color: #404040;
    }
    
    body.dark-mode .dialog-close {
      color: #999;
    }
    
    body.dark-mode .dialog-close:hover {
      color: #fff;
    }
    
    body.dark-mode .help-tabs {
      background: #1e1e1e;
      border-bottom-color: #404040;
    }
    
    body.dark-mode .help-tab {
      color: #999;
    }
    
    body.dark-mode .help-tab:hover {
      background: #333;
    }
    
    body.dark-mode .help-tab.active {
      background: #2b2b2b;
      color: #4dabf7;
    }
    
    body.dark-mode .shortcuts-table td {
      border-bottom-color: #404040;
    }
    
    body.dark-mode .shortcuts-table tr.separator td {
      border-bottom-color: #505050;
    }
    
    body.dark-mode kbd {
      background: #333;
      border-color: #555;
      color: #e0e0e0;
    }
    
    body.dark-mode .markdown-examples h4 {
      color: #e0e0e0;
    }
    
    body.dark-mode .markdown-examples pre {
      background: #1e1e1e;
      color: #e0e0e0;
    }
    
    body.dark-mode .help-note {
      background: #3d3200;
      border-color: #998100;
      color: #e0e0e0;
    }
    
    body.dark-mode .credits-section li {
      color: #999;
    }
  `;
  document.head.appendChild(style);
}