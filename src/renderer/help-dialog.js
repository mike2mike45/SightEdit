// ヘルプダイアログの実装
export function createHelpDialog() {
  // 初期値を設定
  let appVersion = '1.0.0';
  
  // アプリケーション情報を非同期で取得
  if (window.electronAPI) {
    window.electronAPI.getAppInfo().then(appInfo => {
      appVersion = appInfo.version;
      // バージョン表示を更新
      const versionElement = document.querySelector('#app-version');
      if (versionElement) {
        versionElement.textContent = appVersion;
      }
    }).catch(error => {
      console.error('Failed to get app info:', error);
    });
  }
  
  // ヘルプダイアログのHTML
  const helpHTML = `
    <div id="help-dialog" class="help-overlay" style="display: none;">
      <div class="help-content">
        <div class="help-header">
          <h2>SightEdit ヘルプ</h2>
          <button class="help-close">&times;</button>
        </div>
        <div class="help-body">
          <div class="help-tabs">
            <button class="help-tab active" data-tab="about">バージョン情報</button>
            <button class="help-tab" data-tab="shortcuts">ショートカット</button>
            <button class="help-tab" data-tab="markdown">Markdown記法</button>
            <button class="help-tab" data-tab="features">機能紹介</button>
          </div>
          
          <div class="help-content-area">
            <div id="about-content" class="help-tab-content active">
              <h3>SightEdit について</h3>
              <div class="about-info">
                <p><strong>バージョン:</strong> <span id="app-version">${appVersion}</span></p>
                <p><strong>開発:</strong> 合同会社ダックエンジン<br>
                  HP: <a href="#" class="external-link" data-url="https://duckengine.com">https://duckengine.com</a><br>
                  開発ブログ: <a href="#" class="external-link" data-url="https://mike2mike.xyz/2025/03/24/markdown%e3%82%a8%e3%83%87%e3%82%a3%e3%82%bf-noteninja%e3%82%92%e4%bd%9c%e3%82%8a%e3%81%be%e3%81%97%e3%81%9f/">記事を読む</a>
                </p>
                <p><strong>ライセンス:</strong> MIT License</p>
                <p><strong>ビルド:</strong> Electron + TipTap</p>
                <br>
                <p>SightEditは、WindowsユーザーのためのWYSIWYGマークダウンエディターです。</p>
                <p>直感的な操作でマークダウンドキュメントを作成・編集できます。</p>
                <br>
                <h4>使用技術</h4>
                <ul>
                  <li>Electron 28.0.0</li>
                  <li>TipTap 2.1.13</li>
                  <li>Marked 11.1.0</li>
                  <li>Turndown 7.1.2</li>
                  <li>Webpack 5.89.0</li>
                </ul>
              </div>
            </div>
            
            <div id="shortcuts-content" class="help-tab-content">
              <h3>キーボードショートカット</h3>
              <table class="shortcuts-table">
                <tr>
                  <th>操作</th>
                  <th>ショートカット</th>
                </tr>
                <tr>
                  <td>新規ファイル</td>
                  <td><kbd>Ctrl</kbd> + <kbd>N</kbd></td>
                </tr>
                <tr>
                  <td>ファイルを開く</td>
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
                <tr>
                  <td>PDFとして出力</td>
                  <td><kbd>Ctrl</kbd> + <kbd>P</kbd></td>
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
                  <td>取り消し線</td>
                  <td><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>X</kbd></td>
                </tr>
                <tr>
                  <td>書式解除</td>
                  <td><kbd>Ctrl</kbd> + <kbd>\\</kbd></td>
                </tr>
                <tr class="separator">
                  <td colspan="2"></td>
                </tr>
                <tr>
                  <td>見出し1-6</td>
                  <td><kbd>Ctrl</kbd> + <kbd>1-6</kbd></td>
                </tr>
                <tr>
                  <td>リンク挿入</td>
                  <td><kbd>Ctrl</kbd> + <kbd>K</kbd></td>
                </tr>
                <tr>
                  <td>画像挿入</td>
                  <td><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>I</kbd></td>
                </tr>
                <tr>
                  <td>テーブル挿入</td>
                  <td><kbd>Ctrl</kbd> + <kbd>T</kbd></td>
                </tr>
              </table>
            </div>
            
            <div id="markdown-content" class="help-tab-content">
              <h3>Markdown記法ガイド</h3>
              <div class="markdown-guide">
                <h4>見出し</h4>
                <pre># 見出し1
## 見出し2
### 見出し3
#### 見出し4
##### 見出し5
###### 見出し6</pre>

                <h4>強調</h4>
                <pre>**太字**
*斜体*
~~取り消し線~~</pre>

                <h4>リスト</h4>
                <pre>- 箇条書き1
- 箇条書き2
  - ネストした項目

1. 番号付きリスト1
2. 番号付きリスト2</pre>

                <h4>チェックリスト</h4>
                <pre>- [ ] 未完了のタスク
- [x] 完了したタスク</pre>

                <h4>リンクと画像</h4>
                <pre>[リンクテキスト](https://example.com)
![画像の説明](image.jpg)</pre>

                <h4>引用</h4>
                <pre>> 引用文
> 複数行の
> 引用も可能</pre>

                <h4>コード</h4>
                <pre>\`インラインコード\`

\`\`\`javascript
// コードブロック
function hello() {
  console.log("Hello, World!");
}
\`\`\`</pre>

                <h4>テーブル</h4>
                <pre>| 列1 | 列2 | 列3 |
|-----|-----|-----|
| A1  | B1  | C1  |
| A2  | B2  | C2  |</pre>

                <h4>水平線</h4>
                <pre>---</pre>
              </div>
            </div>
            
            <div id="features-content" class="help-tab-content">
              <h3>機能紹介</h3>
              <div class="features-list">
                <h4>エディター機能</h4>
                <ul>
                  <li><strong>WYSIWYGモード:</strong> 見たままの状態で編集可能</li>
                  <li><strong>ソースモード:</strong> Markdownソースを直接編集</li>
                  <li><strong>リアルタイムプレビュー:</strong> 編集内容が即座に反映</li>
                  <li><strong>シンタックスハイライト:</strong> コードブロックの構文強調表示</li>
                </ul>

                <h4>ファイル操作</h4>
                <ul>
                  <li>Markdownファイル（.md）の読み書き</li>
                  <li>テキストファイル（.txt）のサポート</li>
                  <li>PDF形式でのエクスポート</li>
                  <li>自動保存状態の表示</li>
                </ul>

                <h4>編集支援機能</h4>
                <ul>
                  <li>右クリックコンテキストメニュー</li>
                  <li>Google検索・翻訳連携</li>
                  <li>画像のURL挿入とローカルファイル選択</li>
                  <li>テーブルの行・列操作</li>
                  <li>タスクリストのチェックボックス</li>
                </ul>

                <h4>カスタマイズ</h4>
                <ul>
                  <li>ライト/ダークテーマの切り替え</li>
                  <li>ウィンドウサイズと位置の記憶</li>
                  <li>設定の永続化</li>
                </ul>

                <h4>統計情報</h4>
                <ul>
                  <li>単語数カウント</li>
                  <li>文字数カウント</li>
                  <li>リアルタイム更新</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div class="help-footer">
          <button class="help-ok">閉じる</button>
        </div>
      </div>
    </div>
  `;

  // ダイアログをbodyに追加
  const helpDiv = document.createElement('div');
  helpDiv.innerHTML = helpHTML;
  document.body.appendChild(helpDiv.firstElementChild);

  const dialog = document.getElementById('help-dialog');
  const closeBtn = dialog.querySelector('.help-close');
  const okBtn = dialog.querySelector('.help-ok');
  const tabs = dialog.querySelectorAll('.help-tab');
  const contents = dialog.querySelectorAll('.help-tab-content');

  // タブ切り替え
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      
      // アクティブクラスの切り替え
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      
      tab.classList.add('active');
      document.getElementById(`${targetTab}-content`).classList.add('active');
    });
  });

  // ダイアログを表示
  function show() {
    dialog.style.display = 'flex';
  }

  // ダイアログを閉じる
  function close() {
    dialog.style.display = 'none';
  }

  // イベントリスナー
  closeBtn.addEventListener('click', close);
  okBtn.addEventListener('click', close);

  // ESCキーで閉じる
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      close();
    }
  });

  // 背景クリックで閉じる
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      close();
    }
  });

  // 外部リンクのクリック処理
  dialog.addEventListener('click', (e) => {
    if (e.target.classList.contains('external-link')) {
      e.preventDefault();
      const url = e.target.dataset.url;
      if (url && window.electronAPI) {
        window.electronAPI.openExternalLink(url);
      }
    }
  });

  return { show };
}

// ヘルプダイアログのスタイルを追加
export function addHelpStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .help-overlay {
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

    .help-content {
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      width: 700px;
      max-width: 90%;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
    }

    .help-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid #e0e0e0;
    }

    .help-header h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }

    .help-close {
      background: none;
      border: none;
      font-size: 28px;
      cursor: pointer;
      color: #666;
      padding: 0;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
    }

    .help-close:hover {
      background: #f0f0f0;
    }

    .help-body {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .help-tabs {
      display: flex;
      padding: 0 24px;
      background: #f8f9fa;
      border-bottom: 1px solid #e0e0e0;
    }

    .help-tab {
      background: none;
      border: none;
      padding: 12px 20px;
      cursor: pointer;
      font-size: 14px;
      color: #666;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
    }

    .help-tab:hover {
      color: #333;
    }

    .help-tab.active {
      color: #007bff;
      border-bottom-color: #007bff;
    }

    .help-content-area {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    .help-tab-content {
      display: none;
    }

    .help-tab-content.active {
      display: block;
    }

    .help-tab-content h3 {
      margin-top: 0;
      margin-bottom: 20px;
      color: #333;
    }

    .help-tab-content h4 {
      margin-top: 20px;
      margin-bottom: 12px;
      color: #555;
    }

    .about-info p {
      margin: 8px 0;
      line-height: 1.6;
    }

    .about-info ul {
      margin: 12px 0;
      padding-left: 24px;
    }

    .about-info li {
      margin: 6px 0;
    }

    .external-link {
      color: #007bff;
      text-decoration: none;
      cursor: pointer;
    }

    .external-link:hover {
      text-decoration: underline;
    }

    .shortcuts-table {
      width: 100%;
      border-collapse: collapse;
    }

    .shortcuts-table th {
      text-align: left;
      padding: 8px 12px;
      background: #f8f9fa;
      border-bottom: 2px solid #dee2e6;
      font-weight: 600;
    }

    .shortcuts-table td {
      padding: 8px 12px;
      border-bottom: 1px solid #dee2e6;
    }

    .shortcuts-table tr.separator td {
      padding: 4px;
      border: none;
    }

    .shortcuts-table kbd {
      display: inline-block;
      padding: 2px 6px;
      font-size: 12px;
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 3px;
      box-shadow: 0 1px 0 rgba(0,0,0,0.1);
      font-family: monospace;
    }

    .markdown-guide pre {
      background: #f6f8fa;
      border: 1px solid #e1e4e8;
      border-radius: 6px;
      padding: 12px 16px;
      margin: 8px 0 16px;
      overflow-x: auto;
      font-size: 13px;
      line-height: 1.45;
    }

    .features-list ul {
      margin: 12px 0 20px;
      padding-left: 24px;
    }

    .features-list li {
      margin: 8px 0;
      line-height: 1.6;
    }

    .help-footer {
      display: flex;
      justify-content: flex-end;
      padding: 16px 24px;
      border-top: 1px solid #e0e0e0;
    }

    .help-ok {
      padding: 8px 24px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
    }

    .help-ok:hover {
      background: #0056b3;
    }

    /* ダークテーマ対応 */
    .dark-theme .help-content {
      background: #2d2d2d;
      color: #fff;
    }

    .dark-theme .help-header {
      border-bottom-color: #404040;
    }

    .dark-theme .help-close {
      color: #ccc;
    }

    .dark-theme .help-close:hover {
      background: #404040;
    }

    .dark-theme .help-tabs {
      background: #1a1a1a;
      border-bottom-color: #404040;
    }

    .dark-theme .help-tab {
      color: #aaa;
    }

    .dark-theme .help-tab:hover {
      color: #fff;
    }

    .dark-theme .help-tab.active {
      color: #007bff;
    }

    .dark-theme .help-tab-content h3 {
      color: #fff;
    }

    .dark-theme .help-tab-content h4 {
      color: #ccc;
    }

    .dark-theme .shortcuts-table th {
      background: #1a1a1a;
      border-bottom-color: #404040;
    }

    .dark-theme .shortcuts-table td {
      border-bottom-color: #404040;
    }

    .dark-theme .shortcuts-table kbd {
      background: #404040;
      border-color: #555;
      color: #fff;
    }

    .dark-theme .markdown-guide pre {
      background: #1a1a1a;
      border-color: #404040;
      color: #fff;
    }

    .dark-theme .help-footer {
      border-top-color: #404040;
    }

    .dark-theme .external-link {
      color: #4db8ff;
    }

    .dark-theme .external-link:hover {
      color: #80ccff;
    }
  `;
  document.head.appendChild(style);
}