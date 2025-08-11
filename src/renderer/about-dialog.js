// src/renderer/about-dialog.js

/**
 * AboutダイアログをDOMに挿入
 */

export function createAboutDialog(appVersion = 'unknown') {
  if (document.getElementById('about-dialog') || document.getElementById('about-overlay')) return; // 二重生成防止

  // overlay
  const overlay = document.createElement('div');
  overlay.id = 'about-overlay';
  overlay.className = 'dialog-overlay';
  overlay.style.display = 'none';

  // content
  const content = document.createElement('div');
  content.className = 'dialog-content';

  // header
  const header = document.createElement('div');
  header.className = 'dialog-header';

  const h3 = document.createElement('h3');
  h3.textContent = 'About SightEdit';

  const closeBtn = document.createElement('button');
  closeBtn.id = 'about-close';
  closeBtn.className = 'dialog-close';
  closeBtn.setAttribute('aria-label', 'close');
  closeBtn.type = 'button';
  closeBtn.textContent = '×';

  header.appendChild(h3);
  header.appendChild(closeBtn);

  // body
  const body = document.createElement('div');
  body.className = 'dialog-body';

  const pVersion = document.createElement('p');
  // appVersion may come from untrusted source -> use textContent
  pVersion.textContent = `Version: ${String(appVersion)}`;

  const pDesc = document.createElement('p');
  pDesc.textContent = 'Electron ベースのシンプルなエディタです。';

  const copyright = document.createElement('div');
  copyright.style.marginTop = '12px';
  copyright.style.fontSize = '12px';
  copyright.style.color = '#666';
  copyright.textContent = `© ${new Date().getFullYear()} SightEdit`;

  body.appendChild(pVersion);
  body.appendChild(pDesc);
  body.appendChild(copyright);

  content.appendChild(header);
  content.appendChild(body);
  overlay.appendChild(content);
  document.body.appendChild(overlay);

  const closeHandler = () => hideAboutDialog();
  closeBtn.addEventListener('click', closeHandler);

  // クリックで外側を閉じる
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) hideAboutDialog();
  });
}


export function showAboutDialog() {
  const overlay = document.getElementById('about-overlay');
  if (overlay) overlay.style.display = 'flex';
}

export function hideAboutDialog() {
  const overlay = document.getElementById('about-overlay');
  if (overlay) overlay.style.display = 'none';
}

/**
 * メニューからのトリガーを束ねたい場合のユーティリティ
 * 例: preload経由の ipc/menu-action: 'menu-about' で発火
 */
export function bindAboutMenu(electronAPI, appVersion) {
  if (!electronAPI || !electronAPI.onMenuAction) return;
  createAboutDialog(appVersion);
  electronAPI.onMenuAction('menu-about', () => showAboutDialog());
}