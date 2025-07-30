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
            <button class="help-tab" data-tab="export">エクスポート</button>
            <button class="help-tab" data-tab="git">Git機能</button>
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
                  <li>Electron 31.0.0</li>
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
                  <td>エクスポート</td>
                  <td><kbd>Ctrl</kbd> + <kbd>E</kbd></td>
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
                <pre>> 引用文</pre>
                
                <h4>コード</h4>
                <pre>\`インラインコード\`

\`\`\`javascript
// コードブロック
function hello() {
  console.log("Hello");
}
\`\`\`</pre>
                
                <h4>テーブル</h4>
                <pre>| 列1 | 列2 |
|------|------|
| データ1 | データ2 |</pre>
                
                <h4>水平線</h4>
                <pre>---</pre>
              </div>
            </div>
            
            <div id="features-content" class="help-tab-content">
              <h3>主な機能</h3>
              <div class="features-list">
                <h4>エディター機能</h4>
                <ul>
                  <li><strong>WYSIWYG編集:</strong> リアルタイムプレビューで直感的な編集</li>
                  <li><strong>ソースモード:</strong> Markdownソースを直接編集</li>
                  <li><strong>自動保存:</strong> 編集内容を定期的に保存</li>
                  <li><strong>ドラッグ&ドロップ:</strong> 画像やファイルを簡単に挿入</li>
                </ul>
                
                <h4>エクスポート機能</h4>
                <ul>
                  <li><strong>多様な形式:</strong> WordPress、note、Qiita、小説投稿サイトなど</li>
                  <li><strong>PDF出力:</strong> 印刷用のPDFファイルを生成</li>
                  <li><strong>HTML出力:</strong> Webページとして公開可能</li>
                </ul>
                
                <h4>Git統合</h4>
                <ul>
                  <li><strong>バージョン管理:</strong> 文書の変更履歴を管理</li>
                  <li><strong>コミット:</strong> 変更を保存して履歴に記録</li>
                  <li><strong>ブランチ:</strong> 複数のバージョンを並行して管理</li>
                </ul>
                
                <h4>その他の機能</h4>
                <ul>
                  <li><strong>目次自動生成:</strong> 見出しから目次を自動作成</li>
                  <li><strong>検索・置換:</strong> 高度な検索と一括置換</li>
                  <li><strong>テーマ切替:</strong> ライト/ダークテーマ対応</li>
                  <li><strong>自動更新:</strong> 最新版への自動アップデート</li>
                </ul>
              </div>
            </div>
            
            <div id="export-content" class="help-tab-content">
              <h3>エクスポート機能の使い方</h3>
              
              <h4>📋 クリップボードにコピー</h4>
              <p>各プラットフォームに最適化された形式でクリップボードにコピーします。</p>
              
              <h5>ブログ用</h5>
              <ul>
                <li>
                  <strong>WordPress (Gutenberg):</strong>
                  <ol>
                    <li>エクスポート → WordPress (Gutenberg) を選択</li>
                    <li>WordPressの編集画面でコードエディタモードに切り替え</li>
                    <li>Ctrl+V (Mac: Cmd+V) で貼り付け</li>
                    <li>ビジュアルエディタに戻ると正しく表示されます</li>
                  </ol>
                </li>
                <li>
                  <strong>note:</strong>
                  <ol>
                    <li>エクスポート → note を選択</li>
                    <li>noteの編集画面で貼り付け</li>
                    <li>画像は【ここに画像：filename を入れてください】と表示されるので、別途アップロード</li>
                  </ol>
                </li>
                <li>
                  <strong>Qiita:</strong>
                  <ol>
                    <li>エクスポート → Qiita を選択</li>
                    <li>QiitaのMarkdownエディタに貼り付け</li>
                    <li>画像は別途アップロードまたはURLで指定</li>
                  </ol>
                </li>
              </ul>
              
              <h5>小説用</h5>
              <ul>
                <li>
                  <strong>なろう:</strong>
                  <p>ルビ記法: <code>|漢字《かんじ》</code></p>
                  <p>傍点: <code>《《強調》》</code></p>
                  <ol>
                    <li>通常のMarkdownで執筆（ルビは[漢字](かんじ)形式で記述）</li>
                    <li>エクスポート → なろう を選択</li>
                    <li>小説家になろうの投稿画面に貼り付け</li>
                  </ol>
                </li>
                <li>
                  <strong>カクヨム:</strong>
                  <p>ルビ記法: <code>｜漢字《かんじ》</code>（全角縦棒）</p>
                  <p>傍点: <code>《《強調》》</code></p>
                  <p>改ページ: <code>====</code></p>
                  <ol>
                    <li>通常のMarkdownで執筆</li>
                    <li>エクスポート → カクヨム を選択</li>
                    <li>カクヨムの投稿画面に貼り付け</li>
                  </ol>
                </li>
              </ul>
              
              <h4>💾 ファイルに出力</h4>
              <ul>
                <li><strong>HTML:</strong> スタイル付きのWebページとして出力</li>
                <li><strong>PDF:</strong> 印刷用のPDFファイルとして出力（Ctrl+P）</li>
                <li><strong>Markdown:</strong> 標準のMarkdown形式で保存</li>
              </ul>
              
              <h4>画像の扱い</h4>
              <p>エクスポート時、画像は以下のように処理されます：</p>
              <ul>
                <li>クリップボードコピー時：<code>【ここに画像：filename を入れてください】</code>というプレースホルダーに変換</li>
                <li>各プラットフォームで画像をアップロードした後、プレースホルダーを置き換えてください</li>
                <li>HTML出力時：画像プレースホルダーが視覚的に表示されます</li>
              </ul>
              
              <h4>ヒント</h4>
              <ul>
                <li>エクスポート前に必ず内容を保存してください</li>
                <li>複数の形式でエクスポートして、最適なものを選択できます</li>
                <li>エクスポート後も元のMarkdownファイルは変更されません</li>
              </ul>
            </div>
            
            <div id="git-content" class="help-tab-content">
              <h3>Git機能の使い方</h3>
              
              <h4>基本概念</h4>
              <p>Gitは文書のバージョン管理システムです。変更履歴を記録し、必要に応じて過去のバージョンに戻すことができます。</p>
              
              <h4>基本操作</h4>
              <ul>
                <li>
                  <strong>リポジトリの初期化:</strong>
                  <p>新しいプロジェクトでGitを使い始める場合、まずリポジトリを初期化します。</p>
                </li>
                <li>
                  <strong>コミット:</strong>
                  <ol>
                    <li>サイドバーのGitボタンをクリック</li>
                    <li>変更内容を確認</li>
                    <li>コミットメッセージを入力（例：「序章を追加」）</li>
                    <li>コミットボタンをクリック</li>
                  </ol>
                </li>
                <li>
                  <strong>ブランチ:</strong>
                  <p>異なるバージョンを並行して管理できます。</p>
                  <ul>
                    <li>新機能や実験的な変更は新しいブランチで</li>
                    <li>安定版はmainブランチで管理</li>
                    <li>完成したらメインブランチにマージ</li>
                  </ul>
                </li>
              </ul>
              
              <h4>推奨ワークフロー</h4>
              <ol>
                <li><strong>作業開始時:</strong> 現在の状態をコミット</li>
                <li><strong>大きな変更前:</strong> 新しいブランチを作成</li>
                <li><strong>定期的に:</strong> 進捗をコミット（1時間ごとなど）</li>
                <li><strong>完成時:</strong> 最終版をコミットしてマージ</li>
              </ol>
              
              <h4>コミットメッセージの書き方</h4>
              <ul>
                <li>簡潔で分かりやすく（50文字以内推奨）</li>
                <li>何を変更したかを明確に</li>
                <li>例：
                  <ul>
                    <li>「第1章の誤字を修正」</li>
                    <li>「キャラクター設定を追加」</li>
                    <li>「目次のレイアウトを調整」</li>
                  </ul>
                </li>
              </ul>
              
              <h4>注意事項</h4>
              <ul>
                <li>Gitはローカルでのバージョン管理です（GitHub等とは別）</li>
                <li>定期的にコミットすることで、誤って削除した内容も復元可能</li>
                <li>ブランチを使えば、複数のアイデアを同時に試せます</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // ダイアログをDOMに追加
  const dialogContainer = document.createElement('div');
  dialogContainer.innerHTML = helpHTML;
  document.body.appendChild(dialogContainer.firstElementChild);
  
  const dialog = document.getElementById('help-dialog');
  const closeBtn = dialog.querySelector('.help-close');
  const tabs = dialog.querySelectorAll('.help-tab');
  const contents = dialog.querySelectorAll('.help-tab-content');
  
  // タブ切り替え
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      
      // アクティブクラスを更新
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      
      tab.classList.add('active');
      document.getElementById(`${targetTab}-content`).classList.add('active');
    });
  });
  
  // 外部リンクのクリック処理
  dialog.querySelectorAll('.external-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const url = link.dataset.url;
      if (window.electronAPI && window.electronAPI.openExternalLink) {
        window.electronAPI.openExternalLink(url);
      } else {
        window.open(url, '_blank');
      }
    });
  });
  
  // 閉じるボタン
  closeBtn.addEventListener('click', () => {
    dialog.style.display = 'none';
  });
  
  // Escキーで閉じる
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dialog.style.display !== 'none') {
      dialog.style.display = 'none';
    }
  });
  
  // ダイアログの外側をクリックで閉じる
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      dialog.style.display = 'none';
    }
  });
  
  // 表示関数を返す
  return {
    show: () => {
      dialog.style.display = 'flex';
      // バージョン情報タブをデフォルトで表示
      tabs[0].click();
    },
    hide: () => {
      dialog.style.display = 'none';
    }
  };
}

// ヘルプダイアログ用のスタイルを追加
export function addHelpStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .help-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    }
    
    .help-content {
      background: white;
      border-radius: 8px;
      width: 90%;
      max-width: 800px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    }
    
    .help-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #e0e0e0;
      background: #f8f9fa;
      border-radius: 8px 8px 0 0;
    }
    
    .help-header h2 {
      margin: 0;
      font-size: 20px;
      color: #333;
    }
    
    .help-close {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
      padding: 0;
      width: 30px;
      height: 30px;
      border-radius: 4px;
      transition: all 0.2s;
    }
    
    .help-close:hover {
      background: #e0e0e0;
      color: #333;
    }
    
    .help-body {
      display: flex;
      flex: 1;
      overflow: hidden;
    }
    
    .help-tabs {
      width: 200px;
      background: #f8f9fa;
      padding: 10px;
      border-right: 1px solid #e0e0e0;
      overflow-y: auto;
    }
    
    .help-tab {
      display: block;
      width: 100%;
      padding: 10px 15px;
      margin-bottom: 5px;
      background: none;
      border: none;
      text-align: left;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s;
      font-size: 14px;
    }
    
    .help-tab:hover {
      background: #e0e0e0;
    }
    
    .help-tab.active {
      background: #007bff;
      color: white;
    }
    
    .help-content-area {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
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
      margin-bottom: 10px;
      color: #555;
    }
    
    .help-tab-content h5 {
      margin-top: 15px;
      margin-bottom: 10px;
      color: #666;
      font-size: 14px;
    }
    
    .about-info p {
      margin-bottom: 10px;
      line-height: 1.6;
    }
    
    .about-info ul {
      list-style: none;
      padding-left: 20px;
    }
    
    .about-info li {
      margin-bottom: 5px;
    }
    
    .shortcuts-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    
    .shortcuts-table th,
    .shortcuts-table td {
      padding: 8px 12px;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .shortcuts-table th {
      background: #f8f9fa;
      font-weight: 600;
    }
    
    .shortcuts-table tr.separator td {
      border-bottom: 2px solid #dee2e6;
      padding: 0;
    }
    
    .shortcuts-table kbd {
      display: inline-block;
      padding: 3px 6px;
      font-size: 12px;
      line-height: 1;
      color: #333;
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 3px;
      box-shadow: 0 1px 0 #dee2e6;
      font-family: monospace;
    }
    
    .markdown-examples pre {
      background: #f8f9fa;
      padding: 10px;
      border-radius: 4px;
      overflow-x: auto;
      margin-bottom: 15px;
      font-size: 13px;
      line-height: 1.5;
    }
    
    .features-list ul {
      list-style: disc;
      padding-left: 25px;
      margin-bottom: 20px;
    }
    
    .features-list li {
      margin-bottom: 8px;
      line-height: 1.6;
    }
    
    .help-tab-content code {
      background: #f8f9fa;
      padding: 2px 4px;
      border-radius: 3px;
      font-family: monospace;
      font-size: 13px;
    }
    
    .help-tab-content ol {
      padding-left: 25px;
      margin-bottom: 15px;
    }
    
    .help-tab-content ol li {
      margin-bottom: 5px;
    }
    
    .external-link {
      color: #007bff;
      text-decoration: none;
      cursor: pointer;
    }
    
    .external-link:hover {
      text-decoration: underline;
    }
    
    /* スクロールバーのスタイル */
    .help-tabs::-webkit-scrollbar,
    .help-content-area::-webkit-scrollbar {
      width: 8px;
    }
    
    .help-tabs::-webkit-scrollbar-track,
    .help-content-area::-webkit-scrollbar-track {
      background: #f1f1f1;
    }
    
    .help-tabs::-webkit-scrollbar-thumb,
    .help-content-area::-webkit-scrollbar-thumb {
      background: #888;
      border-radius: 4px;
    }
    
    .help-tabs::-webkit-scrollbar-thumb:hover,
    .help-content-area::-webkit-scrollbar-thumb:hover {
      background: #555;
    }
  `;
  document.head.appendChild(style);
}