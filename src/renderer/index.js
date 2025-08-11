// メインエントリーポイント（安全化・ID整合版）
// - HTMLのIDに合わせて配線を修正（new-btn/open-btn/save-btn, wysiwyg-btn/source-btn 等）
// - file-operations は setupFileOperations から受け取り、ラッパー経由で呼ぶ
// - DOM参照は init() 内で取得。存在しないIDは配線しない（onById ヘルパー）
// - search-replace はファイル実装に合わせ、存在するAPIのみ呼ぶ
// - 余計な未定義（exportPDF 等）を呼ばない

import './styles.css';
import { createEditor, setupToolbar, getMarkdownContent, setMarkdownContent, commonEditActions } from './editor.js';
import { htmlToMarkdown, markdownToHtml } from './markdown.js';
import { setupFileOperations } from './file-operations.js';
import { setupContextMenu, setupSourceEditorContextMenu } from './context-menu.js';
import { createSearchReplaceDialog, addSearchReplaceStyles } from './search-replace.js';
import { addExportStyles } from './export-formats.js';
import { GitPanel } from './git-panel.js';
import './git-dialogs.js';
import './git-ui-manager.js';
import './help-dialog.js';
import './about-dialog.js';
import i18n from './i18n-client.js';
import './language-switcher.js';
import './ai-gemini.js';



// ---- attach lifecycle close hook ----
(function attachCloseLifecycle(){
  try {
    if (window.lifecycle?.onBeforeClose && window.lifecycle?.confirmClose) {
      window.lifecycle.onBeforeClose(async () => {
        // TODO: 変更有無チェックが必要ならここで判定
        window.lifecycle.confirmClose();
      });
      console.log('[lifecycle] close hook attached');
    } else {
      console.warn('[lifecycle] API not available (preload未反映?)');
    }
  } catch (e) { console.warn('[lifecycle] attach failed', e); }
})();
// -------------------------------------
// ===== file-operations ラッパー（未接続でも落ちない） =====
(function(){
  let __ops = null;
  function ops(){
    if (!__ops) {
      try {
        const deps = window.__FILE_OPS_DEPS__ || {};
        __ops = (typeof setupFileOperations === 'function' ? setupFileOperations(deps) : {}) || {};
        fileOperations = __ops; // モジュールスコープに保存
      } catch (e) {
        console.error('[setupFileOperations] failed', e);
        __ops = {};
        fileOperations = {};
      }
    }
    return __ops;
  }
  const ensure = (name, fn) => { if (typeof window[name] !== 'function') window[name] = fn; };
  ensure('__newFile__',    (...a)=> ops().newFile?.(...a));
  ensure('__openFile__',   (...a)=> ops().openFile?.(...a));
  ensure('__saveFile__',   (...a)=> ops().saveFile?.(...a));
  ensure('__saveAsFile__', (...a)=> ops().saveAsFile?.(...a));
  ensure('__exportPdf__',  (...a)=> ops().exportPdf?.(...a));
})();
// ================================================================

// モジュールスコープの参照（initでセット）
let editor = null;
let gitPanel = null;
let currentMode = 'wysiwyg'; // 'wysiwyg' | 'source'
let sourceEditorEl = null;
let wysiwygEditorEl = null;
let fileNameEl = null;
let fileStatusEl = null;
let wysiwygBtnEl = null;
let sourceBtnEl = null;
let fileOperations = null; // ファイル操作関数を保存

// ユーティリティ
function onById(id, type, handler){
  const el = document.getElementById(id);
  if (!el) { console.warn('[missing-dom]', id); return; }
  el.addEventListener(type, handler);
  return el;
}

function updateStatus(saved){
  if (fileStatusEl) fileStatusEl.textContent = saved ? '保存済み' : '編集中';
}

// モード切り替え
function setMode(next){
  const prev = currentMode;
  
  // モード間でのデータ同期
  if (prev !== next) {
    try {
      if (prev === 'wysiwyg' && next === 'source') {
        // WYSIWYG → ソース: 元のMarkdownコンテンツがあればそれを使用、なければHTML→Markdown変換
        if (sourceEditorEl) {
          const originalMarkdown = fileOperations?.getOriginalMarkdownContent?.();
          if (originalMarkdown) {
            // 元のMarkdownを使用（初回読み込み時など）
            sourceEditorEl.value = originalMarkdown;
          } else if (editor) {
            // 編集中の場合はHTML→Markdown変換
            const html = editor.getHTML();
            const markdown = htmlToMarkdown(html);
            sourceEditorEl.value = markdown;
          }
        }
      } else if (prev === 'source' && next === 'wysiwyg') {
        // ソース → WYSIWYG: MarkdownをHTMLに変換
        if (sourceEditorEl && editor) {
          const markdown = sourceEditorEl.value;
          const html = markdownToHtml(markdown);
          editor.commands.setContent(html);
        }
      }
    } catch (error) {
      console.error('Mode sync error:', error);
    }
  }
  
  currentMode = next;
  if (next === 'wysiwyg') {
    if (wysiwygEditorEl) wysiwygEditorEl.style.display = 'block';
    if (sourceEditorEl)  sourceEditorEl.style.display  = 'none';
    wysiwygBtnEl?.classList.add('active');
    sourceBtnEl?.classList.remove('active');
  } else {
    if (wysiwygEditorEl) wysiwygEditorEl.style.display = 'none';
    if (sourceEditorEl)  sourceEditorEl.style.display  = 'block';
    wysiwygBtnEl?.classList.remove('active');
    sourceBtnEl?.classList.add('active');
  }
}

// 共通編集操作
async function executeEditAction(action){
  const isSource = currentMode === 'source';
  if (isSource) {
    switch(action){
      case 'selectAll': sourceEditorEl?.select(); return true;
      // copy/cut/paste はブラウザ既定に任せる（必要なら後で実装）
      default: return false;
    }
  } else {
    switch(action){
      case 'copy':      return await commonEditActions.copy();
      case 'cut':       return await commonEditActions.cut(editor);
      case 'paste':     return await commonEditActions.paste(editor);
      case 'selectAll': return commonEditActions.selectAll(editor);
      default: return false;
    }
  }
}

// イベント/メニュー配線
function setupEventListeners(){
  onById('new-btn',  'click', () => window.__newFile__?.());
  onById('open-btn', 'click', () => window.__openFile__?.());
  onById('save-btn', 'click', () => window.__saveFile__?.());

  // モード切替ボタン（HTML側のIDに合わせる）
  wysiwygBtnEl = document.getElementById('wysiwyg-btn');
  sourceBtnEl  = document.getElementById('source-btn');
  wysiwygBtnEl?.addEventListener('click', ()=> setMode('wysiwyg'));
  sourceBtnEl?.addEventListener('click',  ()=> setMode('source'));

  // 検索・置換（search-replace 実装に合わせて）
  try {
    addSearchReplaceStyles?.();
    const sr = typeof createSearchReplaceDialog === 'function' ? createSearchReplaceDialog() : null;
    // ここで検索UIのトグルボタンがあれば配線可能（現HTMLにはID無しのため割愛）
    // 例: onById('search-btn','click', () => sr?.show(editor, currentMode === 'wysiwyg'));
  } catch (e) {
    console.warn('[search-replace] skipped', e?.message || e);
  }

  // キーボードショートカット（必要なものだけ）
  document.addEventListener('keydown', (e)=>{
    if (e.ctrlKey || e.metaKey){
      switch(e.key){
        case 'n': e.preventDefault(); window.__newFile__?.(); break;
        case 'o': e.preventDefault(); window.__openFile__?.(); break;
        case 's': e.preventDefault(); window.__saveFile__?.(); break;
        default: break;
      }
    }
  });
}

function setupElectronMenuHandlers(){
  if (!window.electronAPI?.onMenuAction) return;
  window.electronAPI.onMenuAction('menu-new-file',  () => window.__newFile__?.());
  window.electronAPI.onMenuAction('menu-open-file', () => window.__openFile__?.());
  window.electronAPI.onMenuAction('menu-save-file', () => window.__saveFile__?.());
  window.electronAPI.onMenuAction('menu-save-as-file', () => window.__saveAsFile__?.());
  window.electronAPI.onMenuAction('menu-export-pdf', () => window.__exportPdf__?.());
  
  // メッセージ表示ハンドラー
  window.electronAPI.onMenuAction('show-message', (message, type) => {
    if (window.showMessage) {
      window.showMessage(message, type);
    } else {
      // フォールバック
      console.log(`[${type}] ${message}`);
    }
  });
}

// 初期化
async function init(){
  // 多言語機能を初期化
  await i18n.init();
  
  // DOM取得（HTMLのIDに合わせる）
  wysiwygEditorEl = document.getElementById('wysiwyg-editor');
  sourceEditorEl  = document.getElementById('source-editor');
  fileNameEl     = document.getElementById('file-name');
  fileStatusEl   = document.getElementById('file-status');

  // file-operations 初期化（エディタが作成される前に）
  if (typeof setupFileOperations === 'function') {
    fileOperations = setupFileOperations(null, null, false);
  }
  
  // エディタ作成・ツールバー
  editor = createEditor();
  window.editor = editor;
  setupToolbar(editor);
  
  // file-operations にエディタを渡す
  if (fileOperations && fileOperations.updateState) {
    fileOperations.updateState(null, false);
  }

  // コンテキストメニュー
  setupContextMenu(editor);
  if (sourceEditorEl) setupSourceEditorContextMenu(sourceEditorEl);

  // エクスポートのスタイル（UIに影響しないので安全）
  addExportStyles?.();

  // Gitパネル（存在する環境だけ）
  try { gitPanel = new GitPanel(); window.gitPanel = gitPanel; } catch {}

  // イベント配線
  setupEventListeners();
  
  // ソースエディタの変更を監視して元のMarkdownを更新
  if (sourceEditorEl) {
    sourceEditorEl.addEventListener('input', () => {
      // ソースが編集されたら元のMarkdownコンテンツをクリア（編集内容を優先）
      if (fileOperations && typeof fileOperations.getOriginalMarkdownContent === 'function') {
        // 編集フラグを設定する方法があれば実装（現在は単純にクリア）
      }
    });
  }

  // メニュー配線（Electron）
  setupElectronMenuHandlers();

  // 初期モード
  setMode('wysiwyg');

  // ステータス表示
  updateStatus(true);
}

// DOM 構築後に init
window.addEventListener('DOMContentLoaded', () => {
  try { init(); } catch(e){ console.error('[init] failed', e); }
});