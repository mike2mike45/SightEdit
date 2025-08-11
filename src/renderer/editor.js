// TipTapエディタのインポート
import { Editor, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { createLowlight } from 'lowlight';

// カスタム拡張機能
import { Footnote } from './footnote-extension.js';
import { HtmlContent } from './html-content-extension.js';
import { SearchHighlight } from './search-highlight-extension.js';

// Markdownの変換
import { htmlToMarkdown, markdownToHtml } from './markdown.js';

// ユーティリティ
import { dialog } from './dialog.js';
import { generateTableOfContents } from './toc-generator.js';

// 再エクスポート（index.jsから使用するため）
export { generateTableOfContents };

// lowlightインスタンスを作成
const lowlight = createLowlight();

// グローバル変数
let editor = null;

// カスタムタスクリスト拡張機能
const CustomTaskList = TaskList.extend({
  renderHTML({ HTMLAttributes }) {
    const newAttributes = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      style: 'list-style: none; padding-left: 0;',
    });
    return ['ul', newAttributes, 0];
  },
});

// TaskItemも最適化 - TipTap 3.0のデフォルト構造に対応
const CustomTaskItem = TaskItem.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      checked: {
        default: false,
        keepOnSplit: false,
        parseHTML: element => {
          const dataChecked = element.getAttribute('data-checked');
          return dataChecked === '' || dataChecked === 'true';
        },
        renderHTML: attributes => ({
          'data-checked': attributes.checked,
        }),
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    // TipTap 3.0のデフォルト構造をそのまま使用
    // li > label > (input + span) + div の構造
    return [
      'li',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': this.name,
        'data-checked': node.attrs.checked,
      }),
      [
        'label',
        [
          'input',
          {
            type: 'checkbox',
            checked: node.attrs.checked ? 'checked' : null,
          },
        ],
        ['span'],
      ],
      ['div', 0],
    ];
  },

  addKeyboardShortcuts() {
    const shortcuts = {
      Enter: () => this.editor.commands.splitListItem(this.name),
      'Shift-Tab': () => this.editor.commands.liftListItem(this.name),
    };

    if (!this.options.nested) {
      return shortcuts;
    }

    return {
      ...shortcuts,
      Tab: () => this.editor.commands.sinkListItem(this.name),
    };
  },

  addInputRules() {
    const inputRegex = /^\s*(\[([( |x])?\])\s$/;

    return [
      {
        find: inputRegex,
        handler: ({ state, range, match }) => {
          const [fullMatch, , checked] = match;
          const { from, to } = range;
          const isChecked = checked && (checked.toLowerCase() === 'x' || checked === ' ');

          if (fullMatch) {
            const tr = state.tr.delete(from, to);
            
            tr.setBlockType(
              from,
              from,
              this.type,
              { checked: isChecked }
            );

            return tr;
          }

          return null;
        },
      },
    ];
  },

  addPasteRules() {
    const pasteRegex = /^\s*(\[([( |x])?\])\s(.*)$/gm;

    return [
      {
        find: pasteRegex,
        handler: ({ state, range, match }) => {
          const [, , checked, text] = match;
          const isChecked = checked && (checked.toLowerCase() === 'x' || checked === ' ');

          const tr = state.tr.replaceWith(
            range.from,
            range.to,
            this.type.create(
              { checked: isChecked },
              text.trim() ? state.schema.text(text.trim()) : null
            )
          );

          return tr;
        },
      },
    ];
  },
});

// エディタの作成
export function createEditor() {
  const hostEl = document.getElementById('wysiwyg-editor');
  if (!hostEl) {
    console.warn('wysiwyg-editor element not found');
    editor = null;
    return editor;
  }
  editor = new Editor({
    element: hostEl,
    extensions: [
      StarterKit.configure({
        // 取り消し線を明示的に有効化
        strike: {
          HTMLAttributes: {
            class: 'strike-through'
          }
        },
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
        // デフォルトのタスクリストを無効化
        taskList: false,
        taskItem: false,
        // 重複を避けるため、個別にインポートする拡張機能を無効化
        link: false,
        codeBlock: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer'
        }
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          loading: 'lazy'
        }
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'table-wrapper'
        }
      }),
      TableRow,
      TableCell,
      TableHeader,
      CustomTaskList.configure({
        HTMLAttributes: {
          class: 'task-list'
        }
      }),
      CustomTaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'task-list-item'
        }
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph', 'tableCell', 'tableHeader'],
        alignments: ['left', 'center', 'right', 'justify']
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'code-block'
        }
      }),
      Placeholder.configure({
        placeholder: 'ここに文字を入力してください...'
      }),
      Footnote,
      HtmlContent,
      SearchHighlight
    ],
    content: '<h1>SightEditへようこそ！</h1><p>TipTapベースの新しいエディタです。</p>',
    autofocus: true,
    editable: true,
    parseOptions: {
      preserveWhitespace: 'full'
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
      },
      // HTMLコンテンツの貼り付け処理
      handlePaste: (view, event, slice) => {
        const { clipboardData } = event;
        
        if (clipboardData) {
          const html = clipboardData.getData('text/html');
          const text = clipboardData.getData('text/plain');
          
          if (html) {
            // HTMLをクリーンアップ（タグ間の改行を削除）
            const cleanedHtml = html
              .replace(/>\s*\n\s*</g, '><')    // タグ間の改行と空白を削除
              .replace(/\n\s*\n/g, '\n')       // 連続する改行を1つに
              .trim();                         // 前後の空白を削除
            
            // HTMLをMarkdownに変換してから挿入
            const markdown = htmlToMarkdown(cleanedHtml);
            const processedHtml = markdownToHtml(markdown);
            
            // インラインかブロックかを判定
            const hasBlockElements = /<(p|div|h[1-6]|ul|ol|li|blockquote|table|pre)[\s>]/i.test(processedHtml);
            
            editor.chain()
              .focus()
              .insertContent(processedHtml, {
                parseOptions: {
                  preserveWhitespace: hasBlockElements ? false : 'full'
                }
              })
              .run();
            
            return true;
          } else if (text) {
            // プレーンテキストの場合
            const hasLineBreaks = text.includes('\n');
            
            if (!hasLineBreaks) {
              // 単一行の場合はそのままテキストとして挿入
              const { state } = view;
              const { tr } = state;
              const { from, to } = state.selection;
              
              tr.deleteRange(from, to);
              tr.insertText(text, from);
              
              view.dispatch(tr);
              return true;
            }
            // 複数行の場合はデフォルト処理に任せる
          }
        }
        
        return false;
      },
      // ドロップ処理
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files.length > 0) {
          const files = Array.from(event.dataTransfer.files);
          const imageFiles = files.filter(file => file.type.startsWith('image/'));
          
          if (imageFiles.length > 0) {
            event.preventDefault();
            
            imageFiles.forEach(file => {
              const reader = new FileReader();
              reader.onload = (e) => {
                editor.chain()
                  .focus()
                  .setImage({ src: e.target.result })
                  .run();
              };
              reader.readAsDataURL(file);
            });
            
            return true;
          }
        }
        
        return false;
      }
    }
  });

  return editor;
}

// ツールバーのセットアップ
export function setupToolbar(editor) {
  if (!editor || !editor.chain) { console.warn('Editor instance is not ready'); return; }
  // ツールバーボタンのイベントリスナーを設定
  const buttons = {
    'bold-btn': () => editor.chain().focus().toggleBold().run(),
    'italic-btn': () => editor.chain().focus().toggleItalic().run(),
    'strike-btn': () => editor.chain().focus().toggleStrike().run(),
    'code-inline-btn': () => editor.chain().focus().toggleCode().run(),
    'h1-btn': () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    'h2-btn': () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    'h3-btn': () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    'h4-btn': () => editor.chain().focus().toggleHeading({ level: 4 }).run(),
    'h5-btn': () => editor.chain().focus().toggleHeading({ level: 5 }).run(),
    'h6-btn': () => editor.chain().focus().toggleHeading({ level: 6 }).run(),
    'ul-btn': () => editor.chain().focus().toggleBulletList().run(),
    'ol-btn': () => editor.chain().focus().toggleOrderedList().run(),
    'task-btn': () => editor.chain().focus().toggleTaskList().run(),
    'quote-btn': () => editor.chain().focus().toggleBlockquote().run(),
    'hr-btn': () => editor.chain().focus().setHorizontalRule().run(),
    'code-btn': () => editor.chain().focus().toggleCodeBlock().run(),
    'footnote-btn': () => insertFootnote(editor),
    'html-btn': () => insertHtml(editor),
    'toc-btn': () => generateTableOfContents(editor),
    'clear-format-btn': () => editor.chain().focus().clearNodes().unsetAllMarks().run()
  };
  
  // ボタンにイベントリスナーを追加
  Object.entries(buttons).forEach(([id, handler]) => {
    const button = document.getElementById(id);
    if (button) {
      button.addEventListener('click', handler);
    }
  });
  
  // テーブルボタンの処理
  const tableBtn = document.getElementById('table-btn');
  if (tableBtn) {
    tableBtn.addEventListener('click', async () => {
      const result = await dialog.showTableDialog();
      if (result) {
        editor.chain().focus().insertTable({ 
          rows: result.rows, 
          cols: result.cols,
          withHeaderRow: result.withHeader 
        }).run();
      }
    });
  }
  
  // リンクボタンの処理
  const linkBtn = document.getElementById('link-btn');
  if (linkBtn) {
    linkBtn.addEventListener('click', async () => {
      const url = await dialog.show('リンクを挿入', 'URLを入力してください:');
      if (url) {
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
      }
    });
  }
  
  // 画像ボタンの処理
  const imageBtn = document.getElementById('image-btn');
  if (imageBtn) {
    imageBtn.addEventListener('click', async () => {
      const url = await dialog.show('画像を挿入', '画像のURLを入力してください:', '', { isImageDialog: true });
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    });
  }
  
  // エディタの状態に応じてボタンの有効/無効を更新
  editor.on('update', updateToolbarState);
  editor.on('selectionUpdate', updateToolbarState);
  
  function updateToolbarState() {
    const activeButtons = {
      'bold-btn': editor.isActive('bold'),
      'italic-btn': editor.isActive('italic'),
      'strike-btn': editor.isActive('strike'),
      'code-inline-btn': editor.isActive('code'),
      'h1-btn': editor.isActive('heading', { level: 1 }),
      'h2-btn': editor.isActive('heading', { level: 2 }),
      'h3-btn': editor.isActive('heading', { level: 3 }),
      'h4-btn': editor.isActive('heading', { level: 4 }),
      'h5-btn': editor.isActive('heading', { level: 5 }),
      'h6-btn': editor.isActive('heading', { level: 6 }),
      'ul-btn': editor.isActive('bulletList'),
      'ol-btn': editor.isActive('orderedList'),
      'task-btn': editor.isActive('taskList'),
      'quote-btn': editor.isActive('blockquote'),
      'code-btn': editor.isActive('codeBlock')
    };
    
    Object.entries(activeButtons).forEach(([id, isActive]) => {
      const button = document.getElementById(id);
      if (button) {
        button.classList.toggle('active', isActive);
      }
    });
  }
}

// Markdownコンテンツを取得
export function getMarkdownContent(instance) {
  const ed = instance || (typeof editor !== 'undefined' && editor) || (typeof window !== 'undefined' && window.editor);
  if (!ed) {
    const prose = document.querySelector('#wysiwyg-editor .ProseMirror');
    const src = document.getElementById('source-editor');
    const html = prose?.innerHTML ?? src?.value ?? '';
    return (typeof htmlToMarkdown === 'function') ? htmlToMarkdown(html) : html;
  }
  if (typeof ed.getHTML === 'function') {
    const html = ed.getHTML();
    return (typeof htmlToMarkdown === 'function') ? htmlToMarkdown(html) : html;
  }
  if (typeof ed.getText === 'function') {
    return ed.getText();
  }
  try {
    const prose = document.querySelector('#wysiwyg-editor .ProseMirror');
    const src = document.getElementById('source-editor');
    const html = prose?.innerHTML ?? src?.value ?? '';
    return (typeof htmlToMarkdown === 'function') ? htmlToMarkdown(html) : html;
  } catch { return ''; }
}
// Markdownコンテンツを設定
export function setMarkdownContent(instance, markdown) {
  const ed = instance || (typeof editor !== 'undefined' && editor) || (typeof window !== 'undefined' && window.editor);
  const html = (typeof markdownToHtml === 'function') ? markdownToHtml(markdown ?? '') : (markdown ?? '');
  if (ed && ed.commands && typeof ed.commands.setContent === 'function') {
    ed.commands.setContent(html);
    return;
  }
  if (ed && typeof ed.setContent === 'function') {
    ed.setContent(html);
    return;
  }
  // Fallback to DOM
  try {
    const prose = document.querySelector('#wysiwyg-editor .ProseMirror');
    if (prose) prose.innerHTML = html;
    const src = document.getElementById('source-editor');
    if (src) src.value = markdown ?? '';
  } catch {}
}
// 脚注の挿入
async function insertFootnote(editor) {
  const number = await dialog.show('脚注を挿入', '脚注番号を入力してください:');
  if (number) {
    editor.chain().focus().setFootnote(number).run();
  }
}

// HTML埋め込み
async function insertHtml(editor) {
  const htmlDialog = await createHtmlDialog();
  const html = await htmlDialog.show();
  if (html) {
    const sanitized = sanitizeHtml(html);
    editor.chain().focus().insertContent(sanitized).run();
  }
}

// HTMLダイアログの作成
async function createHtmlDialog() {
  return {
    show: async () => {
      return await dialog.show('HTML埋め込み', 'HTMLコードを入力してください:', '', { multiline: true });
    }
  };
}

// 検索機能のエクスポート
export function searchInEditor(editor, searchTerm, options = {}) {
  if (!editor || !searchTerm) return [];
  
  const results = [];
  const { caseSensitive = false, wholeWord = false, useRegex = false } = options;
  
  let regex;
  if (useRegex) {
    try {
      regex = new RegExp(searchTerm, caseSensitive ? 'g' : 'gi');
    } catch (e) {
      return [];
    }
  } else {
    let pattern = escapeRegExp(searchTerm);
    if (wholeWord) {
      pattern = `\\b${pattern}\\b`;
    }
    regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
  }
  
  editor.state.doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      let match;
      while ((match = regex.exec(node.text)) !== null) {
        results.push({
          from: pos + match.index,
          to: pos + match.index + match[0].length
        });
      }
    }
  });
  
  return results;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 検索結果のハイライト
export function highlightSearchResult(editor, from, to) {
  editor.chain()
    .focus()
    .setTextSelection({ from, to })
    .run();
}

// テキストの置換
export function replaceText(editor, from, to, replacement) {
  editor.chain()
    .focus()
    .setTextSelection({ from, to })
    .deleteSelection()
    .insertContent(replacement)
    .run();
}

// すべて置換
export function replaceAll(editor, searchTerm, replacement, options = {}) {
  const results = searchInEditor(editor, searchTerm, options);
  
  // 後ろから置換していく（位置がずれないように）
  for (let i = results.length - 1; i >= 0; i--) {
    const { from, to } = results[i];
    replaceText(editor, from, to, replacement);
  }
  
  return results.length;
}

// HTMLのサニタイズ
function sanitizeHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  
  // scriptタグを削除
  const scripts = div.querySelectorAll('script');
  scripts.forEach(script => script.remove());
  
  // onイベントハンドラを削除
  const allElements = div.querySelectorAll('*');
  allElements.forEach(element => {
    Array.from(element.attributes).forEach(attr => {
      if (attr.name.startsWith('on')) {
        element.removeAttribute(attr.name);
      }
    });
  });
  
  return div.innerHTML;
}

// 共通編集操作関数（context-menu.jsから呼び出し可能）
// Markdownテキストかどうかを検出する関数
function detectMarkdown(text) {
  // Markdownの典型的なパターンをチェック
  const markdownPatterns = [
    /^#{1,6}\s+/m,           // 見出し: # ## ### など
    /^\*{1,2}[^*]+\*{1,2}/m, // 太字・斜体: *text* **text**
    /^_{1,2}[^_]+_{1,2}/m,   // 太字・斜体: _text_ __text**
    /^~~[^~]+~~/m,           // 取り消し線: ~~text~~
    /^\*\s+/m,               // リスト: * item
    /^-\s+/m,                // リスト: - item
    /^\+\s+/m,               // リスト: + item
    /^\d+\.\s+/m,            // 番号付きリスト: 1. item
    /^\[.*\]\(.*\)/m,        // リンク: [text](url)
    /^!\[.*\]\(.*\)/m,       // 画像: ![alt](url)
    /^```/m,                 // コードブロック: ```
    /^`[^`]+`/m,             // インラインコード: `code`
    /^>/m,                   // 引用: > text
    /^\|.*\|/m,              // テーブル: |col1|col2|
    /^---+/m,                // 水平線: ---
  ];
  
  return markdownPatterns.some(pattern => pattern.test(text));
}

// プレーンテキストを挿入する関数
function insertPlainText(text, state, from, to) {
  const $from = state.selection.$from;
  const parentType = $from.parent.type.name;
  const isInlineContext = parentType === 'paragraph' || parentType === 'heading';
  
  // 改行を含むかチェック
  const hasLineBreaks = text.includes('\n');
  
  if (isInlineContext && !hasLineBreaks) {
    // 単一行のテキストで段落内の場合
    // insertTextを使用して同じ段落内に挿入
    const { view } = editor;
    const tr = state.tr;
    
    if (from !== to) {
      tr.delete(from, to);
    }
    
    tr.insertText(text, tr.mapping.map(from));
    
    const newPos = tr.mapping.map(from) + text.length;
    const newSelection = state.selection.constructor.create(
      tr.doc,
      newPos,
      newPos
    );
    tr.setSelection(newSelection);
    tr.scrollIntoView();
    
    view.dispatch(tr);
  } else {
    // 複数行のテキストの場合は段落として処理
    const paragraphs = text.split('\n').filter(line => line.trim());
    
    if (paragraphs.length === 1) {
      // 単一段落の場合
      editor.chain()
        .focus()
        .deleteRange({ from, to })
        .insertContent(paragraphs[0])
        .run();
    } else {
      // 複数段落の場合
      const content = paragraphs.map(p => ({
        type: 'paragraph',
        content: [{
          type: 'text',
          text: p
        }]
      }));
      
      editor.chain()
        .focus()
        .deleteRange({ from, to })
        .insertContent(content)
        .run();
    }
  }
}

export const commonEditActions = {
  // コピー処理（修正版：選択範囲のテキストを確実にクリップボードに書き込む）
  copy: async () => {
    // editorがグローバル変数として定義されているか確認
    const currentEditor = editor || window.editor;
    if (!currentEditor) return false;
    
    const { from, to } = currentEditor.state.selection;
    const selectedText = currentEditor.state.doc.textBetween(from, to, '\n');
    
    if (selectedText) {
      try {
        // クリップボードAPIを使用して確実にコピー
        await navigator.clipboard.writeText(selectedText);
        window.showMessage('コピーしました', 'success');
        return true;
      } catch (err) {
        // フォールバック：選択範囲を作成してコピーコマンドを実行
        const selection = window.getSelection();
        const range = document.createRange();
        
        // エディターの選択範囲をDOMの選択範囲に変換
        const { view } = currentEditor;
        const domRange = view.domAtPos(from);
        const domRangeEnd = view.domAtPos(to);
        
        range.setStart(domRange.node, domRange.offset);
        range.setEnd(domRangeEnd.node, domRangeEnd.offset);
        
        selection.removeAllRanges();
        selection.addRange(range);
        
        const success = document.execCommand('copy');
        if (success) {
          window.showMessage('コピーしました', 'success');
        } else {
          window.showMessage('コピーに失敗しました', 'error');
        }
        return success;
      }
    }
    
    return false;
  },
  
  // 切り取り処理
  cut: async (editor) => {
    if (!editor) return false;
    
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, '\n');
    
    if (selectedText) {
      try {
        // クリップボードにコピー
        await navigator.clipboard.writeText(selectedText);
        // 選択範囲を削除
        editor.chain().focus().deleteSelection().run();
        window.showMessage('切り取りました', 'success');
        return true;
      } catch (err) {
        // フォールバック
        const success = document.execCommand('cut');
        if (success) {
          window.showMessage('切り取りました', 'success');
        } else {
          window.showMessage('切り取りに失敗しました', 'error');
        }
        return success;
      }
    }
    return false;
  },
  
  // 貼り付け処理（書式を保持しつつ、余分な改行を追加しない）
  paste: async (editor) => {
    if (!editor) return false;
    
    try {
      // クリップボードの内容を取得
      let html = null;
      let text = null;
      
      // まずHTML形式を試す
      try {
        const clipboardItems = await navigator.clipboard.read();
        for (const clipboardItem of clipboardItems) {
          for (const type of clipboardItem.types) {
            if (type === 'text/html') {
              const blob = await clipboardItem.getType(type);
              html = await blob.text();
              break;
            }
          }
          if (html) break;
        }
      } catch (err) {
        // Clipboard APIがHTMLを読めない場合はテキストのみ
        console.log('HTML reading not supported, falling back to text');
      }
      
      // HTMLが取得できない場合はテキストを取得
      if (!html) {
        text = await navigator.clipboard.readText();
      }
      
      if (html || text) {
        const { state } = editor;
        const { from, to } = state.selection;
        
        if (html) {
          // HTMLがある場合は書式を保持
          // タグ間の不要な改行を削除（これが余分な段落を生成する原因）
          const cleanedHtml = html
            .replace(/>\s*\n\s*</g, '><')    // タグ間の改行と空白を削除
            .replace(/\n\s*\n/g, '\n')       // 連続する改行を1つに
            .trim();                         // 前後の空白を削除
          
          // 現在のカーソル位置の文脈を確認
          const $from = state.selection.$from;
          const parentType = $from.parent.type.name;
          const isInlineContext = parentType === 'paragraph' || parentType === 'heading';
          
          // インラインHTML（<span>, <strong>, <em>など）かブロックHTML（<p>, <div>, <h1>など）かを判定
          const hasBlockElements = /<(p|div|h[1-6]|ul|ol|li|blockquote|table|pre)[\s>]/i.test(cleanedHtml);
          
          if (isInlineContext && !hasBlockElements) {
            // インラインコンテキストでインラインHTMLの場合
            // 段落内に直接挿入（新しい段落を作らない）
            editor.chain()
              .focus()
              .deleteRange({ from, to })
              .insertContent(cleanedHtml, {
                parseOptions: {
                  preserveWhitespace: 'full'  // インライン要素では空白を保持
                }
              })
              .run();
          } else {
            // ブロックレベルのHTMLまたは新しい段落が必要な場合
            editor.chain()
              .focus()
              .deleteRange({ from, to })
              .insertContent(cleanedHtml, {
                parseOptions: {
                  preserveWhitespace: false  // ブロック要素では余分な空白を削除
                }
              })
              .run();
          }
        } else if (text) {
          // プレーンテキストの場合 - Markdownかどうかを検出
          const isMarkdown = detectMarkdown(text);
          
          if (isMarkdown) {
            // Markdownテキストの場合はHTMLに変換してから挿入
            try {
              const html = markdownToHtml(text);
              editor.chain()
                .focus()
                .deleteRange({ from, to })
                .insertContent(html, {
                  parseOptions: {
                    preserveWhitespace: false
                  }
                })
                .run();
            } catch (error) {
              console.error('Markdown conversion error:', error);
              // 変換失敗時はプレーンテキストとして処理
              insertPlainText(text, state, from, to);
            }
          } else {
            // 通常のプレーンテキスト処理
            insertPlainText(text, state, from, to);
          }
        }
        
        window.showMessage('貼り付けました', 'success');
        return true;
      }
    } catch (error) {
      console.error('Paste error:', error);
      window.showMessage('貼り付けに失敗しました', 'error');
    }
    return false;
  },
  
  // すべて選択
  selectAll: (editor) => {
    if (!editor) return false;
    editor.chain().focus().selectAll().run();
    return true;
  }
};

// エディターのエクスポート
export default editor;