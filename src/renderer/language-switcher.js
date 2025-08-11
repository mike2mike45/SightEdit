// 言語切り替えボタンのコンポーネント
class LanguageSwitcher {
  constructor() {
    this.currentLanguage = 'ja';
    this.availableLanguages = [
      { code: 'ja', name: '日本語', flag: '🇯🇵' },
      { code: 'en', name: 'English', flag: '🇺🇸' }
    ];
    this.init();
  }

  async init() {
    // 現在の言語を取得
    if (window.i18n) {
      this.currentLanguage = window.i18n.getCurrentLanguage();
    }

    // 言語切り替えボタンを作成
    this.createLanguageSwitcher();

    // 言語変更イベントを監視
    if (window.electronAPI) {
      window.electronAPI.onMenuAction('language-changed', (language) => {
        this.currentLanguage = language;
        this.updateButton();
      });
    }
  }

  createLanguageSwitcher() {
    // 既存のボタンがあれば削除
    const existingButton = document.getElementById('language-switcher');
    if (existingButton) {
      existingButton.remove();
    }

    // ツールバーに言語切り替えボタンを追加
    const toolbar = document.querySelector('.toolbar');
    if (!toolbar) return;

    const languageGroup = document.createElement('div');
    languageGroup.className = 'toolbar-group language-group';

    const button = document.createElement('button');
    button.id = 'language-switcher';
    button.className = 'language-switcher-btn';
    button.title = 'Change Language / 言語を変更';
    
    this.updateButton(button);

    // クリックイベント
    button.addEventListener('click', (e) => {
      e.preventDefault();
      this.showLanguageMenu(e);
    });

    languageGroup.appendChild(button);
    toolbar.appendChild(languageGroup);
  }

  updateButton(button = null) {
    if (!button) {
      button = document.getElementById('language-switcher');
    }
    if (!button) return;

    const currentLang = this.availableLanguages.find(lang => lang.code === this.currentLanguage);
    if (currentLang) {
      button.innerHTML = `${currentLang.flag} ${currentLang.code.toUpperCase()}`;
    }
  }

  showLanguageMenu(event) {
    // 既存のメニューを削除
    const existingMenu = document.querySelector('.language-menu');
    if (existingMenu) {
      existingMenu.remove();
      return; // トグル動作
    }

    const menu = document.createElement('div');
    menu.className = 'language-menu';
    
    // 初期位置を画面外の見えない場所に設定（サイズ計算のため）
    menu.style.position = 'fixed';
    menu.style.top = '-9999px';
    menu.style.left = '-9999px';
    menu.style.visibility = 'hidden';

    // メニューアイテムを作成
    this.availableLanguages.forEach(lang => {
      const item = document.createElement('div');
      item.className = 'language-menu-item';
      if (lang.code === this.currentLanguage) {
        item.classList.add('active');
      }

      item.innerHTML = `
        <span class="language-flag">${lang.flag}</span>
        <span class="language-name">${lang.name}</span>
      `;

      item.addEventListener('click', async () => {
        if (lang.code !== this.currentLanguage) {
          await this.changeLanguage(lang.code);
        }
        menu.remove();
      });

      menu.appendChild(item);
    });

    document.body.appendChild(menu);

    // 少し待ってから位置を計算（メニューの実際のサイズが確定してから）
    requestAnimationFrame(() => {
      const buttonRect = event.target.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      
      // デフォルトの位置（ボタンの下）
      let top = buttonRect.bottom + 5;
      let left = buttonRect.left;
      
      // 右端チェック（10pxのマージン）
      if (left + menuRect.width > windowWidth - 10) {
        left = windowWidth - menuRect.width - 10;
      }
      
      // 左端チェック
      if (left < 10) {
        left = 10;
      }
      
      // 下端チェック（10pxのマージン）
      if (top + menuRect.height > windowHeight - 10) {
        top = buttonRect.top - menuRect.height - 5;
      }
      
      // 上端チェック
      if (top < 10) {
        top = Math.max(10, buttonRect.bottom + 5);
      }
      
      // さらに調整が必要な場合は、ボタンの右側に表示
      if (top + menuRect.height > windowHeight - 10 && buttonRect.right + menuRect.width < windowWidth - 10) {
        top = buttonRect.top;
        left = buttonRect.right + 5;
      }
      
      menu.style.position = 'fixed';
      menu.style.top = top + 'px';
      menu.style.left = left + 'px';
      menu.style.zIndex = '1000';
      menu.style.visibility = 'visible';
    });

    // 外側クリックで閉じる
    setTimeout(() => {
      document.addEventListener('click', function closeMenu(e) {
        if (!menu.contains(e.target) && e.target !== event.target) {
          menu.remove();
          document.removeEventListener('click', closeMenu);
        }
      });
    }, 100);
  }

  async changeLanguage(languageCode) {
    try {
      if (window.i18n) {
        const success = await window.i18n.setLanguage(languageCode);
        if (success) {
          this.currentLanguage = languageCode;
          this.updateButton();
          
          // 成功メッセージを表示
          const langName = this.availableLanguages.find(l => l.code === languageCode)?.name || languageCode;
          if (window.showMessage) {
            window.showMessage(
              languageCode === 'ja' 
                ? `言語を${langName}に変更しました`
                : `Language changed to ${langName}`,
              'success'
            );
          }
        }
      }
    } catch (error) {
      console.error('Failed to change language:', error);
      if (window.showMessage) {
        window.showMessage('Failed to change language', 'error');
      }
    }
  }
}

// スタイルを追加
const style = document.createElement('style');
style.textContent = `
  .language-group {
    margin-left: auto;
  }

  .language-switcher-btn {
    background: var(--bg-secondary, #f5f5f5);
    border: 1px solid var(--border, #ddd);
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .language-switcher-btn:hover {
    background: var(--bg-hover, #e0e0e0);
    border-color: var(--border-hover, #bbb);
  }

  .language-menu {
    background: var(--bg-primary, white);
    border: 1px solid var(--border, #ddd);
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    min-width: 120px;
    max-width: 180px;
    z-index: 1000;
    position: fixed;
    white-space: nowrap;
  }

  .language-menu-item {
    padding: 8px 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: background-color 0.2s ease;
  }

  .language-menu-item:hover {
    background: var(--bg-hover, #f0f0f0);
  }

  .language-menu-item.active {
    background: var(--primary-light, #e3f2fd);
    font-weight: bold;
  }

  .language-flag {
    font-size: 16px;
  }

  .language-name {
    font-size: 14px;
  }

  .language-menu-item:first-child {
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
  }

  .language-menu-item:last-child {
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
  }
`;
document.head.appendChild(style);

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  new LanguageSwitcher();
});

export default LanguageSwitcher;