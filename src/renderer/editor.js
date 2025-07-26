import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Placeholder from '@tiptap/extension-placeholder';
import { createLowlight, common } from 'lowlight';
import { markdownToHtml, htmlToMarkdown } from './markdown';
import { createDialog, addDialogStyles } from './dialog-helper';

// lowlightインスタンスを作成
const lowlight = createLowlight(common);

// ダイアログの初期化
let dialog = null;
let tocDialog = null;
if (typeof document !== 'undefined') {
  addDialogStyles();
  dialog = createDialog();
  tocDialog = createTOCDialog();
}

export function createEditor(element) {
  const editor = new Editor({
    element: element,
    extensions: [
      StarterKit.configure({
        codeBlock: false, // CodeBlockLowlightで置き換え
        heading: {
          levels: [1, 2, 3, 4, 5, 6]
        },
        paragraph: {
          HTMLAttributes: {
            class: 'editor-paragraph'
          }
        },
        // Strike拡張の設定を明示的に有効化
        strike: {
          HTMLAttributes: {
            class: 'strike'
          }
        }
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer'
        }
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'editor-image'
        }
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'editor-table'
        }
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList.configure({
        HTMLAttributes: {
          class: 'task-list'
        }
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'task-list-item'
        }
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'code-block'
        }
      }),
      Placeholder.configure({
        placeholder: 'ここに文字を入力してください...'
      })
    ],
    content: '<h1>SightEditへようこそ！</h1><p>TipTapベースの新しいエディタです。</p>',
    autofocus: true,
    editable: true,
    parseOptions: {
      preserveWhitespace: 'full'
    },
    // ネストしたマークの処理を有効化
    enableInputRules: true,
    enablePasteRules: true,
    onUpdate: ({ editor }) => {
      // 更新はイベントリスナーで処理
    }
  });

  // リンククリックの処理
  editor.view.dom.addEventListener('click', (e) => {
    if (e.target.tagName === 'A' && e.target.href) {
      e.preventDefault();
      if (window.electronAPI) {
        window.electronAPI.openExternalLink(e.target.href);
      } else {
        window.open(e.target.href, '_blank');
      }
    }
  });

  return editor;
}

export function setupToolbar(editor) {
  const commands = {
    // テキスト書式
    bold: () => editor.chain().focus().toggleBold().run(),
    italic: () => editor.chain().focus().toggleItalic().run(),
    strike: () => editor.chain().focus().toggleStrike().run(),
    clearFormat: () => editor.chain().focus().clearNodes().unsetAllMarks().run(),
    
    // 見出し
    h1: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    h2: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    h3: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    h4: () => editor.chain().focus().toggleHeading({ level: 4 }).run(),
    h5: () => editor.chain().focus().toggleHeading({ level: 5 }).run(),
    h6: () => editor.chain().focus().toggleHeading({ level: 6 }).run(),
    
    // リスト
    bulletList: () => editor.chain().focus().toggleBulletList().run(),
    orderedList: () => editor.chain().focus().toggleOrderedList().run(),
    taskList: () => editor.chain().focus().toggleTaskList().run(),
    
    // その他
    blockquote: () => editor.chain().focus().toggleBlockquote().run(),
    horizontalRule: () => editor.chain().focus().setHorizontalRule().run(),
    codeBlock: () => editor.chain().focus().toggleCodeBlock().run(),
    
    // アンドゥ・リドゥ
    undo: () => editor.chain().focus().undo().run(),
    redo: () => editor.chain().focus().redo().run(),
    
    // テーブル
    insertTable: () => editor.chain().focus().insertTable({ rows: 3, cols: 3 }).run(),
    
    // リンク
    addLink: async () => {
      const url = await dialog.show('リンクを挿入', 'URLを入力してください:');
      if (url) {
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
      }
    },
    
    // 画像
    addImage: async () => {
      const url = await dialog.show('画像を挿入', '画像のURLを入力してください:', '', { isImageDialog: true });
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    },
    
    // 目次生成
    generateTOC: () => generateTableOfContents(editor)
  };

  return commands;
}

// 目次生成ダイアログを作成
function createTOCDialog() {
  const dialogHTML = `
    <div id="toc-dialog" class="dialog-overlay" style="display: none;">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>📑 目次を生成</h3>
          <button class="dialog-close">&times;</button>
        </div>
        <div class="dialog-body">
          <div class="toc-dialog-content">
            <p>生成する目次の形式を選択してください：</p>
            <div class="toc-options">
              <label class="toc-radio-option">
                <input type="radio" name="toc-type" value="linked" checked>
                <div class="toc-option-content">
                  <strong>リンク付き目次</strong>
                  <div class="toc-option-description">
                    見出しへのジャンプリンク付き<br>
                    <small>GitHub、GitLab、SightEdit等で動作</small>
                  </div>
                  <div class="toc-example">
                    例: <code>- [見出し1](#見出し1)</code>
                  </div>
                </div>
              </label>
              <label class="toc-radio-option">
                <input type="radio" name="toc-type" value="simple">
                <div class="toc-option-content">
                  <strong>シンプル目次</strong>
                  <div class="toc-option-description">
                    テキストのみ、リンクなし<br>
                    <small>すべてのMarkdown環境で動作</small>
                  </div>
                  <div class="toc-example">
                    例: <code>- 見出し1</code>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="dialog-cancel">キャンセル</button>
          <button class="dialog-ok">目次を生成</button>
        </div>
      </div>
    </div>
  `;

  const dialogDiv = document.createElement('div');
  dialogDiv.innerHTML = dialogHTML;
  document.body.appendChild(dialogDiv.firstElementChild);

  const dialog = document.getElementById('toc-dialog');
  const closeBtn = dialog.querySelector('.dialog-close');
  const cancelBtn = dialog.querySelector('.dialog-cancel');
  const okBtn = dialog.querySelector('.dialog-ok');

  let resolvePromise = null;

  // ダイアログを表示
  function show() {
    dialog.style.display = 'flex';
    
    // デフォルト選択を復元
    const linkedRadio = dialog.querySelector('input[value="linked"]');
    if (linkedRadio) {
      linkedRadio.checked = true;
    }

    return new Promise((resolve) => {
      resolvePromise = resolve;
    });
  }

  // ダイアログを閉じる
  function close(result = null) {
    dialog.style.display = 'none';
    if (resolvePromise) {
      resolvePromise(result);
      resolvePromise = null;
    }
  }

  // イベントリスナー
  closeBtn.addEventListener('click', () => close(null));
  cancelBtn.addEventListener('click', () => close(null));
  okBtn.addEventListener('click', () => {
    const selectedType = dialog.querySelector('input[name="toc-type"]:checked')?.value;
    close(selectedType);
  });

  // 背景クリックで閉じる
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      close(null);
    }
  });

  return { show };
}

// Markdown変換
export function getMarkdownContent(editor) {
  if (!editor) {
    console.error('Editor is null');
    return '';
  }
  
  const html = editor.getHTML();
  console.log('HTML content:', html);
  
  const markdown = htmlToMarkdown(html);
  console.log('Converted markdown:', markdown);
  
  return markdown;
}

export function setMarkdownContent(editor, markdown) {
  const html = markdownToHtml(markdown);
  editor.commands.setContent(html, false); // 履歴を作らないように変更
}

// テキスト取得（統計用）
export function getText(editor) {
  return editor.getText();
}

// 目次生成機能
export async function generateTableOfContents(editor) {
  if (!editor) {
    console.error('Editor is null');
    return;
  }

  try {
    // 目次形式を選択するダイアログを表示
    const tocType = await tocDialog.show();
    
    if (!tocType) {
      // キャンセルされた場合
      return;
    }

    // 現在のモードを確認
    const sourceEditor = document.getElementById('source-editor');
    const isSourceMode = sourceEditor && sourceEditor.style.display !== 'none';

    if (isSourceMode) {
      // ソースモードでの目次生成
      generateTOCInSourceMode(sourceEditor, tocType);
    } else {
      // WYSIWYGモードでの目次生成
      generateTOCInWYSIWYGMode(editor, tocType);
    }

    const typeLabel = tocType === 'linked' ? 'リンク付き目次' : 'シンプル目次';
    window.showMessage(`${typeLabel}を生成しました`, 'success');
  } catch (error) {
    console.error('TOC generation error:', error);
    window.showMessage('目次の生成に失敗しました', 'error');
  }
}

// WYSIWYGモードでの目次生成
function generateTOCInWYSIWYGMode(editor, tocType) {
  const doc = editor.state.doc;
  const headings = [];

  // 見出しを抽出
  doc.descendants((node, pos) => {
    if (node.type.name === 'heading') {
      const level = node.attrs.level;
      const text = node.textContent;
      const id = generateHeadingId(text);
      
      headings.push({
        level,
        text,
        id,
        pos
      });
    }
  });

  if (headings.length === 0) {
    window.showMessage('見出しが見つかりません', 'warning');
    return;
  }

  // 目次のMarkdownを生成
  const tocMarkdown = generateTOCMarkdown(headings, tocType);
  
  // 既存の目次を削除
  removeExistingTOC(editor);
  
  // HTMLに変換して挿入
  const tocHTML = markdownToHtml(tocMarkdown);
  
  // 文書の先頭に挿入
  editor.chain()
    .focus()
    .setTextSelection(0)
    .insertContent(tocHTML)
    .insertContent('<p></p>') // 目次の後に改行を追加
    .run();
}

// ソースモードでの目次生成
function generateTOCInSourceMode(sourceEditor, tocType) {
  const content = sourceEditor.value;
  const lines = content.split('\n');
  const headings = [];

  // 見出しを抽出
  lines.forEach((line, index) => {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      const id = generateHeadingId(text);
      
      headings.push({
        level,
        text,
        id,
        lineIndex: index
      });
    }
  });

  if (headings.length === 0) {
    window.showMessage('見出しが見つかりません', 'warning');
    return;
  }

  // 目次のMarkdownを生成
  const tocMarkdown = generateTOCMarkdown(headings, tocType);
  
  // 既存の目次を削除
  const cleanedContent = removeExistingTOCFromMarkdown(content);
  
  // 文書の先頭に目次を挿入
  const newContent = tocMarkdown + '\n\n' + cleanedContent;
  
  sourceEditor.value = newContent;
  
  // inputイベントを発火
  const event = new Event('input', { bubbles: true });
  sourceEditor.dispatchEvent(event);
}

// 目次のMarkdownを生成（タイプ別）
function generateTOCMarkdown(headings, tocType) {
  let toc = '## 目次\n\n';
  
  headings.forEach(heading => {
    const indent = '  '.repeat(Math.max(0, heading.level - 1)); // レベル1から開始
    
    let item;
    if (tocType === 'linked') {
      // リンク付き目次
      const link = `[${heading.text}](#${heading.id})`;
      item = `${indent}- ${link}\n`;
    } else {
      // シンプル目次
      item = `${indent}- ${heading.text}\n`;
    }
    
    toc += item;
  });
  
  return toc;
}

// 見出しからIDを生成
function generateHeadingId(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '') // 英数字、ひらがな、カタカナ、漢字のみ
    .replace(/\s+/g, '-') // スペースをハイフンに
    .replace(/^-+|-+$/g, '') // 先頭末尾のハイフンを削除
    .slice(0, 50); // 長さ制限
}

// 既存の目次を削除（WYSIWYGモード）
function removeExistingTOC(editor) {
  const doc = editor.state.doc;
  let tocStartPos = null;
  let tocEndPos = null;

  // 目次セクションを検索
  doc.descendants((node, pos) => {
    if (node.type.name === 'heading' && 
        node.attrs.level === 2 && 
        node.textContent.includes('目次')) {
      tocStartPos = pos;
      return false; // 最初の目次見出しで停止
    }
  });

  if (tocStartPos !== null) {
    // 目次の終わりを見つける（次の見出しまたは文書の終わり）
    doc.descendants((node, pos) => {
      if (pos > tocStartPos && 
          node.type.name === 'heading' && 
          !node.textContent.includes('目次')) {
        tocEndPos = pos;
        return false; // 次の見出しで停止
      }
    });

    if (tocEndPos === null) {
      // 次の見出しが見つからない場合、次の段落まで
      doc.descendants((node, pos) => {
        if (pos > tocStartPos + 100) { // 目次から十分離れた位置
          tocEndPos = pos;
          return false;
        }
      });
    }

    if (tocEndPos === null) {
      tocEndPos = doc.content.size - 2; // 文書の終わり
    }

    // 既存の目次を削除
    editor.chain()
      .focus()
      .setTextSelection(tocStartPos, tocEndPos)
      .deleteSelection()
      .run();
  }
}

// 既存の目次を削除（ソースモード）
function removeExistingTOCFromMarkdown(content) {
  const lines = content.split('\n');
  const cleanedLines = [];
  let inTOC = false;
  let tocStartIndex = -1;

  lines.forEach((line, index) => {
    // 目次の開始を検出
    if (line.match(/^##\s+目次\s*$/)) {
      inTOC = true;
      tocStartIndex = index;
      return;
    }

    // 目次の終了を検出（次の見出しまたは空行の後の通常テキスト）
    if (inTOC) {
      if (line.match(/^#{1,6}\s+/) && !line.includes('目次')) {
        // 次の見出しが見つかった
        inTOC = false;
        cleanedLines.push(line);
      } else if (line.trim() === '' || line.match(/^\s*-\s+(\[.*\]\(#.*\)|.*)/)) {
        // 空行または目次項目はスキップ
        return;
      } else if (!line.match(/^\s*-/)) {
        // 目次以外のコンテンツが始まった
        inTOC = false;
        cleanedLines.push(line);
      }
    } else {
      cleanedLines.push(line);
    }
  });

  return cleanedLines.join('\n');
}

// WYSIWYGエディタの検索機能（完全書き直し）
export function searchInEditor(editor, searchText, options = {}) {
  if (!editor || !searchText) return [];
  
  const matches = [];
  const doc = editor.state.doc;
  
  // 正規表現を構築
  let regex;
  try {
    if (options.useRegex) {
      regex = new RegExp(searchText, options.caseSensitive ? 'g' : 'gi');
    } else {
      let pattern = escapeRegExp(searchText);
      if (options.wholeWord) {
        pattern = `\\b${pattern}\\b`;
      }
      regex = new RegExp(pattern, options.caseSensitive ? 'g' : 'gi');
    }
  } catch (e) {
    console.error('Invalid regex:', e);
    return [];
  }

  // ドキュメントを走査してテキストを検索
  let globalOffset = 0;
  
  doc.descendants((node, pos) => {
    if (node.isText) {
      const text = node.text;
      let match;
      
      // この段落内でのマッチを検索
      regex.lastIndex = 0; // regexの状態をリセット
      while ((match = regex.exec(text)) !== null) {
        const from = pos + match.index;
        const to = from + match[0].length;
        
        matches.push({
          from: from,
          to: to,
          text: match[0]
        });
        
        console.log('Found match:', {
          text: match[0],
          from: from,
          to: to,
          nodeText: text,
          nodePos: pos
        });
      }
    }
    return true; // 全ノードを走査
  });

  console.log('Total matches found:', matches.length);
  return matches;
}

// 正規表現エスケープ
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 検索結果をハイライト（修正版）
export function highlightSearchResult(editor, from, to) {
  console.log('Highlighting from', from, 'to', to);
  
  // ProseMirrorの有効な範囲内かチェック
  const docSize = editor.state.doc.nodeSize - 2; // ドキュメントの実際のサイズ（開始/終了トークンを除く）
  
  // 範囲を有効な値に修正
  const validFrom = Math.max(0, Math.min(from, docSize));
  const validTo = Math.max(validFrom, Math.min(to, docSize));
  
  console.log('Document size:', docSize, 'Valid range:', validFrom, 'to', validTo);
  
  try {
    editor.chain()
      .focus()
      .setTextSelection({ from: validFrom, to: validTo })
      .scrollIntoView()
      .run();
  } catch (error) {
    console.error('Error highlighting text:', error);
  }
}

// テキストを置換（修正版）
export function replaceText(editor, from, to, replaceWith) {
  console.log('Replacing from', from, 'to', to, 'with', replaceWith);
  
  // ProseMirrorの有効な範囲内かチェック
  const docSize = editor.state.doc.nodeSize - 2;
  
  // 範囲を有効な値に修正
  const validFrom = Math.max(0, Math.min(from, docSize));
  const validTo = Math.max(validFrom, Math.min(to, docSize));
  
  try {
    editor.chain()
      .focus()
      .setTextSelection({ from: validFrom, to: validTo })
      .deleteSelection()
      .insertContent(replaceWith)
      .run();
  } catch (error) {
    console.error('Error replacing text:', error);
  }
}

// 全て置換（修正版）
export function replaceAll(editor, searchText, replaceWith, options = {}) {
  const matches = searchInEditor(editor, searchText, options);
  
  // 後ろから置換していく（インデックスがずれないように）
  for (let i = matches.length - 1; i >= 0; i--) {
    const match = matches[i];
    replaceText(editor, match.from, match.to, replaceWith);
  }
  
  return matches.length;
}