// Chrome拡張のコンテンツスクリプト

// SightEditボタンをページに追加
function addSightEditButton() {
  // 既存のボタンがあるかチェック
  if (document.getElementById('sightedit-floating-btn')) {
    return;
  }

  const button = document.createElement('button');
  button.id = 'sightedit-floating-btn';
  button.innerHTML = '📝';
  button.title = 'SightEditで編集';
  button.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    width: 50px;
    height: 50px;
    border-radius: 25px;
    background: #007bff;
    color: white;
    border: none;
    font-size: 20px;
    cursor: pointer;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    transition: all 0.3s ease;
  `;

  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.1)';
    button.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
  });

  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
    button.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
  });

  button.addEventListener('click', () => {
    // 選択されたテキストを取得
    const selectedText = window.getSelection().toString();

    // エディターページを開く
    chrome.runtime.sendMessage({
      action: 'openEditor',
      text: selectedText
    });
  });

  document.body.appendChild(button);
}

// ページが読み込まれたらボタンを追加
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addSightEditButton);
} else {
  addSightEditButton();
}

// 動的にコンテンツが変更される場合に対応
const observer = new MutationObserver(() => {
  if (!document.getElementById('sightedit-floating-btn')) {
    addSightEditButton();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});