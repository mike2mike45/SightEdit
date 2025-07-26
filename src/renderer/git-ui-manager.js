// Git UI管理クラス - パネルの表示とレイアウト管理
export class GitUIManager {
  constructor(gitPanel) {
    this.gitPanel = gitPanel;
  }

  createMainPanelHTML() {
    return `
      <div id="git-panel" class="git-panel" style="display: none;">
        <div class="git-panel-header">
          <div class="git-header-nav">
            <button id="git-nav-back" class="git-nav-btn" style="display: none;">← 戻る</button>
            <h3 id="git-panel-title">Git バージョン管理</h3>
          </div>
          <button class="git-panel-close">&times;</button>
        </div>
        
        <div class="git-panel-content">
          <!-- メイン画面 -->
          <div id="git-main-view" class="git-view">
            <!-- Git利用不可メッセージ -->
            <div id="git-not-available" class="git-message git-error" style="display: none;">
              <h4>⚠️ Gitが利用できません</h4>
              <p>Gitがインストールされていないか、パスが通っていません。</p>
              <p><a href="#" class="external-link" data-url="https://git-scm.com/downloads">Gitをダウンロード</a></p>
            </div>

            <!-- リポジトリ未初期化状態 -->
            <div id="git-no-repo" class="git-section" style="display: none;">
              <h4>📁 リポジトリの初期化</h4>
              <p>現在のファイルはGitリポジトリ管理下にありません。</p>
              <div class="git-actions">
                <button id="git-init-here" class="git-btn git-btn-primary">
                  この場所にリポジトリを作成
                </button>
                <button id="git-select-folder" class="git-btn">
                  別のフォルダーを選択
                </button>
              </div>
            </div>

            <!-- リポジトリ情報 -->
            <div id="git-repo-info" class="git-section" style="display: none;">
              <div class="git-repo-header">
                <h4>📂 <span id="git-repo-name">リポジトリ名</span></h4>
                <span id="git-current-branch" class="git-branch">main</span>
              </div>
              <div class="git-repo-details">
                <div class="git-detail-item">
                  <span class="git-label">リモート:</span>
                  <span id="git-remote-url">未設定</span>
                </div>
              </div>
            </div>

            <!-- クイック設定ボタン -->
            <div id="git-quick-settings" class="git-section" style="display: none;">
              <h4>⚙️ 設定</h4>
              <div class="git-actions">
                <button id="git-open-getting-started" class="git-btn git-btn-primary">📖 最初にすべきこと</button>
                <button id="git-open-user-config" class="git-btn">👤 Gitユーザー設定</button>
              </div>
            </div>

            <!-- 変更ファイル一覧（スクロール対応強化） -->
            <div id="git-changes" class="git-section-collapsible" style="display: none;">
              <div class="git-section-header" data-section="changes">
                <h4>📝 変更されたファイル (<span id="git-changes-count">0</span>)</h4>
                <span class="git-section-toggle">▼</span>
              </div>
              <div class="git-section-body">
                <div id="git-changes-list" class="git-changes-list git-scrollable-content">
                  <!-- ファイル一覧がここに表示される -->
                </div>
                <div class="git-actions">
                  <button id="git-stage-all" class="git-btn">全てステージング</button>
                  <button id="git-refresh-status" class="git-btn-small">🔄</button>
                </div>
              </div>
            </div>

            <!-- リモート操作（簡略版） -->
            <div id="git-remote-section" class="git-section-collapsible" style="display: none;">
              <div class="git-section-header" data-section="remote">
                <h4>🌐 リモート操作</h4>
                <span class="git-section-toggle">▼</span>
              </div>
              <div class="git-section-body">
                <div class="git-actions">
                  <button id="git-push" class="git-btn git-btn-success">📤 プッシュ</button>
                  <button id="git-pull" class="git-btn">📥 プル</button>
                </div>
              </div>
            </div>


          </div>

          <!-- ユーザー設定画面 -->
          <div id="git-user-config-view" class="git-view git-scrollable-view" style="display: none;">
            <div class="git-section">
              <div id="git-existing-accounts" class="git-existing-accounts" style="display: none;">
                <h4>既存のGitユーザー設定</h4>
                <div id="git-accounts-list" class="git-accounts-list">
                  <!-- 既存アカウントがここに表示される -->
                </div>
              </div>
              
              <div id="git-account-buttons" class="git-account-buttons">
                <button id="git-add-new-account" class="git-btn git-btn-primary">新しいGitユーザー設定を追加</button>
              </div>
              
              <div id="git-account-form" class="git-account-form" style="display: none;">
                <h4>新しいGitユーザー設定の追加</h4>
                <div class="git-important-notice">
                  <p><strong>⚠️ 注意：</strong> GitHubアカウントは別途GitHub.comで作成してください。ここではローカルのGit設定のみを行います。</p>
                </div>
                <div class="git-form">
                  <div class="git-form-group">
                    <label for="git-user-name">名前:</label>
                    <input type="text" id="git-user-name" placeholder="あなたの名前" autocomplete="off">
                  </div>
                  <div class="git-form-group">
                    <label for="git-user-email">メールアドレス:</label>
                    <input type="email" id="git-user-email" placeholder="your@example.com" autocomplete="off">
                    <div class="git-help-text">
                      <small>💡 GitHubアカウントと同じメールアドレスを使用してください</small>
                    </div>
                  </div>
                  <div class="git-form-group">
                    <label class="git-config-scope-label">設定範囲:</label>
                    <div class="git-radio-group">
                      <label class="git-radio-option">
                        <input type="radio" name="git-config-scope" id="git-global-config" value="global" checked>
                        <span class="git-radio-text">
                          <strong>グローバル設定（推奨）</strong>
                          <br><small>このコンピューター全体で使用</small>
                        </span>
                      </label>
                      <label class="git-radio-option">
                        <input type="radio" name="git-config-scope" id="git-local-config" value="local">
                        <span class="git-radio-text">
                          <strong>ローカル設定</strong>
                          <br><small>このプロジェクトのみで使用</small>
                        </span>
                      </label>
                    </div>
                  </div>
                  <div class="git-actions">
                    <button id="git-save-user-config" class="git-btn git-btn-primary">設定を保存</button>
                    <button id="git-cancel-user-config" class="git-btn">キャンセル</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 最初にすべきこと画面 -->
          <div id="git-getting-started-view" class="git-view git-scrollable-view" style="display: none;">
            <div class="git-section">
              <h4>📖 Gitを始める前に</h4>
              <div class="git-getting-started-content">
                <div class="git-step">
                  <h5>ステップ1: GitHubアカウントの作成</h5>
                  <p>SightEditはGitHubと連携してファイルを管理します。まずGitHubアカウントが必要です。</p>
                  <div class="git-actions">
                    <a href="#" class="external-link git-btn git-btn-primary" data-url="https://github.com/signup">
                      🌐 GitHubアカウントを作成
                    </a>
                  </div>
                </div>

                <div class="git-step">
                  <h5>ステップ2: Gitユーザー設定</h5>
                  <p>GitHubアカウントと同じ名前・メールアドレスをSightEditに設定します。</p>
                  <div class="git-actions">
                    <button id="git-goto-user-config" class="git-btn git-btn-primary">
                      ⚙️ Gitユーザー設定を行う
                    </button>
                  </div>
                </div>

                <div class="git-step">
                  <h5>ステップ3: リポジトリの初期化</h5>
                  <p>プロジェクトフォルダーをGitで管理できるようにします。</p>
                </div>

                <div class="git-step">
                  <h5>ステップ4: GitHubとの接続</h5>
                  <p>ローカルのプロジェクトをGitHubのリモートリポジトリと接続します。</p>
                </div>
              </div>
            </div>
          </div>

          <!-- リモート設定画面 -->
          <div id="git-remote-setup-view" class="git-view git-scrollable-view" style="display: none;">
            <div class="git-section">
              <h4>🌐 リモートリポジトリの設定</h4>
              <div class="git-form">
                <div class="git-form-group">
                  <label for="remote-url-input">リモートリポジトリURL:</label>
                  <input type="text" id="remote-url-input" placeholder="https://github.com/username/repository.git" class="git-input-wide" autocomplete="off">
                </div>
                <div class="git-actions">
                  <button id="remote-setup-ok" class="git-btn git-btn-primary">設定</button>
                  <button id="remote-setup-cancel" class="git-btn">キャンセル</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ビュー管理
  showMainView() {
    document.getElementById('git-main-view').style.display = 'block';
    document.getElementById('git-user-config-view').style.display = 'none';
    document.getElementById('git-getting-started-view').style.display = 'none';
    document.getElementById('git-remote-setup-view').style.display = 'none';
    document.getElementById('git-nav-back').style.display = 'none';
    document.getElementById('git-panel-title').textContent = 'Git バージョン管理';
    this.gitPanel.currentView = 'main';
  }

  showUserConfigView() {
    document.getElementById('git-main-view').style.display = 'none';
    document.getElementById('git-user-config-view').style.display = 'block';
    document.getElementById('git-getting-started-view').style.display = 'none';
    document.getElementById('git-remote-setup-view').style.display = 'none';
    document.getElementById('git-nav-back').style.display = 'inline-block';
    document.getElementById('git-panel-title').textContent = 'Gitユーザー設定';
    this.gitPanel.currentView = 'user-config';
  }

  showGettingStartedView() {
    document.getElementById('git-main-view').style.display = 'none';
    document.getElementById('git-user-config-view').style.display = 'none';
    document.getElementById('git-getting-started-view').style.display = 'block';
    document.getElementById('git-remote-setup-view').style.display = 'none';
    document.getElementById('git-nav-back').style.display = 'inline-block';
    document.getElementById('git-panel-title').textContent = '最初にすべきこと';
    this.gitPanel.currentView = 'getting-started';
  }

  showRemoteSetupView() {
    document.getElementById('git-main-view').style.display = 'none';
    document.getElementById('git-user-config-view').style.display = 'none';
    document.getElementById('git-getting-started-view').style.display = 'none';
    document.getElementById('git-remote-setup-view').style.display = 'block';
    document.getElementById('git-nav-back').style.display = 'inline-block';
    document.getElementById('git-panel-title').textContent = 'リモートリポジトリ設定';
    this.gitPanel.currentView = 'remote-setup';
    
    // URL入力欄をクリア
    document.getElementById('remote-url-input').value = '';
    setTimeout(() => {
      document.getElementById('remote-url-input').focus();
    }, 100);
  }

  hideAllSections() {
    const sections = document.querySelectorAll('#git-main-view .git-section, #git-main-view .git-section-collapsible, #git-main-view .git-message');
    sections.forEach(section => section.style.display = 'none');
  }

  // パネルサイズの調整
  adjustPanelSize() {
    const panel = document.getElementById('git-panel');
    if (!panel) return;

    // 画面サイズに応じてパネルサイズを調整
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    if (screenWidth <= 800) {
      panel.style.width = 'calc(100vw - 20px)';
      panel.style.right = '10px';
      panel.style.left = '10px';
      panel.style.maxHeight = 'calc(100vh - 80px)';
    } else {
      panel.style.width = '450px';
      panel.style.right = '20px';
      panel.style.left = 'auto';
      panel.style.maxHeight = 'calc(100vh - 120px)';
    }
  }
}