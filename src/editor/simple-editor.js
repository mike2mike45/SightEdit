// SightEdit Simple Editor - Chrome Extension版
// contentEditableベースのWYSIWYGエディター

// HTML⇄Markdown変換ライブラリ
import TurndownService from 'turndown';

// CSSファイルをインポート
import './ai-command-panel.css';
import './export-menu.css';
import './ai-settings.css';
import './settings.css';
import './chat-panel.css';
import './prompt-library.css';
import './structured-generation.css';

// バージョン管理機能をインポート
import { VersionIntegration } from './version-integration.js';
// ローカル履歴機能をインポート
import { LocalHistoryIntegration } from './local-history-integration.js';

// AI チャット機能をインポート
import { ChatStorage } from '../lib/chat-storage.js';
import { AIChatManager } from '../lib/ai-chat-manager.js';
import { ChatPanel } from './chat-panel.js';

// プロンプト管理機能をインポート
import { getPromptManager } from '../lib/prompt-manager.js';
import { PromptLibrary } from './prompt-library.js';

// スタイル制御機能をインポート
import { getStyleController } from '../lib/style-controller.js';

// 構造化生成機能をインポート
import { getStructuredGenerator } from '../lib/structured-generator.js';
import { StructuredGenerationModal } from './structured-generation-modal.js';

// Export/Import機能をインポート
import { ExportImportManager } from '../lib/export-import-manager.js';

class SimpleMarkdownEditor {
  constructor() {
    this.currentFileName = null;
    this.isSourceMode = false;
    this.versionIntegration = null;
    this.localHistoryIntegration = null;
    this.isModified = false;
    this.originalContent = '';
    
    // バージョン情報をログに出力
    const buildTimestamp = new Date().toISOString();
    console.log('🚀 SightEdit Editor 初期化開始');
    console.log('📅 ビルド時刻:', buildTimestamp);
    console.log('🔧 機能バージョン: WYSIWYG書式修正版 v2.1');
    console.log('📝 変更内容: TurndownService強化、HTML正規化、書式変換修正');
    
    // HTML⇄Markdown変換サービスの初期化
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      fence: '```',
      emDelimiter: '*',
      strongDelimiter: '**',
      linkStyle: 'inlined',
      linkReferenceStyle: 'full'
    });
    
    console.log('📚 TurndownService設定:', {
      strongDelimiter: this.turndownService.options.strongDelimiter,
      emDelimiter: this.turndownService.options.emDelimiter,
      headingStyle: this.turndownService.options.headingStyle
    });
    
    // カスタムルールを追加
    this.setupTurndownRules();
    
    this.init();
  }

  // TurndownServiceのカスタムルールを設定
  setupTurndownRules() {
    // 基本的な書式設定のルールを最適化
    this.turndownService.addRule('bold', {
      filter: ['strong', 'b'],
      replacement: function(content) {
        return content.trim() ? `**${content}**` : '';
      }
    });

    this.turndownService.addRule('italic', {
      filter: ['em', 'i'],
      replacement: function(content) {
        return content.trim() ? `*${content}*` : '';
      }
    });

    this.turndownService.addRule('underline', {
      filter: 'u',
      replacement: function(content) {
        // Markdownに下線はないので、強調として扱う
        return content.trim() ? `**${content}**` : '';
      }
    });

    this.turndownService.addRule('strikethrough', {
      filter: ['strike', 'del', 's'],
      replacement: function(content) {
        return content.trim() ? `~~${content}~~` : '';
      }
    });

    // タスクリスト（チェックボックス）のルール
    this.turndownService.addRule('taskList', {
      filter: function(node) {
        return node.classList && node.classList.contains('task-item');
      },
      replacement: function(content, node) {
        const checkbox = node.querySelector('input[type="checkbox"]');
        const isChecked = checkbox && checkbox.checked;
        const text = node.textContent.replace(/^\s*/, '').trim();
        return `- [${isChecked ? 'x' : ' '}] ${text}`;
      }
    });

    // テーブルのルール
    this.turndownService.addRule('table', {
      filter: 'table',
      replacement: function(content, node) {
        const rows = Array.from(node.querySelectorAll('tr'));
        if (rows.length === 0) return content;

        let tableMarkdown = '';
        
        rows.forEach((row, rowIndex) => {
          const cells = Array.from(row.querySelectorAll('td, th'));
          const cellTexts = cells.map(cell => cell.textContent.trim());
          tableMarkdown += '| ' + cellTexts.join(' | ') + ' |\n';
          
          // ヘッダー行の後に区切り線を追加
          if (rowIndex === 0) {
            const separator = cells.map(() => '---').join(' | ');
            tableMarkdown += '| ' + separator + ' |\n';
          }
        });
        
        return '\n' + tableMarkdown + '\n';
      }
    });

    // コードブロックのルール
    this.turndownService.addRule('codeBlock', {
      filter: function(node) {
        return node.nodeName === 'PRE' && node.querySelector('code');
      },
      replacement: function(content, node) {
        const codeNode = node.querySelector('code');
        const language = codeNode.className.replace('language-', '') || '';
        const code = codeNode.textContent;
        return '\n```' + language + '\n' + code + '\n```\n';
      }
    });

    // divやspanのスタイル属性を処理
    this.turndownService.addRule('styledElements', {
      filter: function(node) {
        const style = node.style;
        return style && (
          style.fontWeight === 'bold' || 
          style.fontWeight === '700' ||
          style.fontStyle === 'italic' ||
          style.textDecoration === 'underline' ||
          style.textDecoration === 'line-through'
        );
      },
      replacement: function(content, node) {
        const style = node.style;
        let result = content;
        
        if (style.fontWeight === 'bold' || style.fontWeight === '700') {
          result = `**${result}**`;
        }
        if (style.fontStyle === 'italic') {
          result = `*${result}*`;
        }
        if (style.textDecoration === 'line-through') {
          result = `~~${result}~~`;
        }
        if (style.textDecoration === 'underline') {
          result = `**${result}**`; // Markdownに下線はないので強調
        }
        
        return result;
      }
    });
  }

  // HTMLからMarkdownに変換
  htmlToMarkdown(html) {
    if (!html) return '';
    
    console.log('🔄 HTML→Markdown変換開始');
    console.log('📥 元HTML:', html);
    
    // ブラウザのcontentEditableで生成されたHTMLを正規化
    let cleanHtml = html
      .replace(/&nbsp;/g, ' ') // &nbsp;を通常の空白に
      .replace(/\s+/g, ' ') // 複数の空白を1つに
      .replace(/<br\s*\/?>/gi, '\n') // <br>を改行に
      .replace(/<div><br><\/div>/gi, '\n') // 空のdivを改行に
      .replace(/<div>/gi, '\n') // <div>を改行に  
      .replace(/<\/div>/gi, '') // </div>を削除
      .replace(/<p><br><\/p>/gi, '\n') // 空のpを改行に
      .replace(/<p>/gi, '\n') // <p>を改行に
      .replace(/<\/p>/gi, '') // </p>を削除
      .trim();

    console.log('🧹 第1段階クリーンアップ後:', cleanHtml);

    // document.execCommandで生成される可能性のあるタグを正規化
    cleanHtml = cleanHtml
      .replace(/<font[^>]*>/gi, '') // fontタグを除去
      .replace(/<\/font>/gi, '') // /fontタグを除去
      .replace(/<span style="font-weight:\s*bold;?"[^>]*>/gi, '<strong>') // インラインstyleの太字をstrongに
      .replace(/<span style="font-weight:\s*700;?"[^>]*>/gi, '<strong>')
      .replace(/<span style="font-style:\s*italic;?"[^>]*>/gi, '<em>') // インラインstyleの斜体をemに
      .replace(/<span style="text-decoration:\s*underline;?"[^>]*>/gi, '<u>')
      .replace(/<span style="text-decoration:\s*line-through;?"[^>]*>/gi, '<strike>')
      .replace(/<\/span>/gi, function(match, offset, str) {
        // 対応するspanタグを適切に閉じる
        const beforeSpan = str.substring(0, offset);
        if (beforeSpan.includes('<strong>') && !beforeSpan.includes('</strong>')) return '</strong>';
        if (beforeSpan.includes('<em>') && !beforeSpan.includes('</em>')) return '</em>';
        if (beforeSpan.includes('<u>') && !beforeSpan.includes('</u>')) return '</u>';
        if (beforeSpan.includes('<strike>') && !beforeSpan.includes('</strike>')) return '</strike>';
        return '';
      });
    
    console.log('🔧 第2段階正規化後:', cleanHtml);
    
    try {
      const markdown = this.turndownService.turndown(cleanHtml);
      console.log('📚 TurndownService変換結果:', markdown);
      
      // 追加のクリーンアップ
      const finalMarkdown = markdown
        .replace(/\*\*\s*\*\*/g, '') // 空の太字マークを削除
        .replace(/\*\s*\*/g, '') // 空の斜体マークを削除
        .replace(/~~\s*~~/g, '') // 空の取り消し線を削除
        .replace(/\n{3,}/g, '\n\n') // 3つ以上の改行を2つに
        .trim();
      
      console.log('✨ 最終Markdown結果:', finalMarkdown);
      console.log('🎯 変換成功: HTML→Markdown');
      
      return finalMarkdown;
    } catch (error) {
      console.error('❌ HTML→Markdown変換エラー:', error);
      // フォールバック: 基本的なHTMLタグを削除
      const fallback = cleanHtml.replace(/<[^>]*>/g, '').trim();
      console.log('🔄 フォールバック結果:', fallback);
      return fallback;
    }
  }

  // WYSIWYGエディターのコンテンツ変更ハンドラー
  handleContentChange(e) {
    // ソースモードの場合は何もしない
    if (this.isSourceMode) return;
    
    // 変更状態をチェック
    this.checkIfModified();
    
    // リアルタイムMarkdown変換は重いので、一定時間後に実行
    clearTimeout(this.contentChangeTimer);
    this.contentChangeTimer = setTimeout(() => {
      this.syncToSourceMode();
    }, 500);
  }
  
  // コンテンツの変更をチェック
  checkIfModified() {
    const currentContent = this.getCurrentContent();
    const wasModified = this.isModified;
    this.isModified = currentContent !== this.originalContent;
    
    // 状態が変わったら表示を更新
    if (wasModified !== this.isModified) {
      this.updateFileNameDisplay();
    }
  }

  // キーボードショートカットハンドラー
  handleKeyboardShortcuts(e) {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          this.applyRichFormat('bold');
          break;
        case 'i':
          e.preventDefault();
          this.applyRichFormat('italic');
          break;
        case 'u':
          e.preventDefault();
          this.applyRichFormat('underline');
          break;
        case 'k':
          e.preventDefault();
          this.insertLink();
          break;
      }
    }
  }

  // ペーストイベントハンドラー
  handlePaste(e) {
    e.preventDefault();
    
    const clipboardData = e.clipboardData || window.clipboardData;
    const htmlData = clipboardData.getData('text/html');
    const textData = clipboardData.getData('text/plain');
    
    if (htmlData) {
      // HTMLをMarkdownに変換してから挿入
      const markdown = this.htmlToMarkdown(htmlData);
      const html = this.markdownToHtml(markdown);
      this.insertHtmlAtCursor(html);
    } else if (textData) {
      this.insertTextAtCursor(textData);
    }
  }

  // リッチテキスト書式を適用（DOM操作ベース）
  applyRichFormat(command) {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const selectedText = selection.toString();
    
    console.log('🎨 書式適用開始');
    console.log('📝 選択テキスト:', selectedText);
    console.log('🔧 適用コマンド:', command);
    
    // 選択されたテキストがない場合は処理しない
    if (!selectedText) {
      console.log('⚠️ 選択されたテキストがありません');
      return;
    }
    
    let wrapperElement;
    
    // コマンドに応じて適切な要素を作成
    switch(command) {
      case 'bold':
        wrapperElement = document.createElement('strong');
        break;
      case 'italic':
        wrapperElement = document.createElement('em');
        break;
      case 'strikeThrough':
        wrapperElement = document.createElement('s');
        break;
      case 'underline':
        wrapperElement = document.createElement('u');
        break;
      default:
        console.error('❌ 未対応のコマンド:', command);
        return;
    }
    
    // 既に同じタグで囲まれているかチェック
    const parentElement = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
      ? range.commonAncestorContainer.parentElement
      : range.commonAncestorContainer;
    
    const tagName = wrapperElement.tagName;
    let existingWrapper = null;
    let currentElement = parentElement;
    
    // 親要素を辿って同じタグを探す
    while (currentElement && currentElement.id !== 'wysiwyg-content') {
      if (currentElement.tagName === tagName) {
        existingWrapper = currentElement;
        break;
      }
      currentElement = currentElement.parentElement;
    }
    
    if (existingWrapper) {
      // 既に同じ書式が適用されている場合は解除
      console.log(`🔄 ${tagName}タグを解除します`);
      
      // 要素の内容を親要素に移動
      const parent = existingWrapper.parentNode;
      while (existingWrapper.firstChild) {
        parent.insertBefore(existingWrapper.firstChild, existingWrapper);
      }
      parent.removeChild(existingWrapper);
      
      console.log('✅ 書式を解除しました');
    } else {
      // 新しく書式を適用
      console.log(`🔧 ${tagName}タグを適用します`);
      
      try {
        // 選択範囲の内容を取得
        const contents = range.extractContents();
        
        // ラッパー要素に内容を追加
        wrapperElement.appendChild(contents);
        
        // ラッパー要素を挿入
        range.insertNode(wrapperElement);
        
        // カーソルを適用した要素の後に移動
        range.setStartAfter(wrapperElement);
        range.setEndAfter(wrapperElement);
        selection.removeAllRanges();
        selection.addRange(range);
        
        console.log('✅ 書式を適用しました');
      } catch (error) {
        console.error('❌ 書式適用エラー:', error);
      }
    }
    
    // 変更通知
    setTimeout(() => this.handleContentChange({}), 100);
  }

  // WYSIWYGからソースモードへ同期
  syncToSourceMode() {
    const content = document.getElementById('wysiwyg-content');
    const sourceEditor = document.getElementById('source-editor');
    
    if (content && sourceEditor && !this.isSourceMode) {
      console.log('🔄 WYSIWYG→ソース同期開始');
      const html = content.innerHTML;
      const markdown = this.htmlToMarkdown(html);
      sourceEditor.value = markdown;
      console.log('✅ ソースエディターに設定:', markdown);
    }
  }

  // モード別書式設定メソッド
  toggleFormatting(execCommand, markdownStart, markdownEnd) {
    console.log(`🎨 書式設定: ${execCommand}, isSourceMode: ${this.isSourceMode}`);
    
    if (this.isSourceMode) {
      // ソースモード：Markdown記法を挿入
      this.wrapText(markdownStart, markdownEnd);
    } else {
      // WYSIWYGモード：リッチテキスト書式を適用
      this.applyRichFormat(execCommand);
    }
  }

  // インラインコードの処理
  toggleInlineCode() {
    console.log(`💻 インラインコード設定: isSourceMode: ${this.isSourceMode}`);
    
    if (this.isSourceMode) {
      this.wrapText('`', '`');
    } else {
      // WYSIWYGではcode要素として処理（insertHTMLを使用）
      this.applyInlineCode();
    }
  }

  // WYSIWYGモードでインラインコードを適用する専用メソッド
  applyInlineCode() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const selectedText = selection.toString();
      
      console.log('🎨 インラインコード適用開始');
      console.log('📝 選択テキスト:', selectedText);
      
      if (selectedText) {
        // 選択されたテキストがある場合
        const codeElement = document.createElement('code');
        codeElement.textContent = selectedText;
        
        // 既にcodeタグで囲まれている場合は解除
        const parentElement = range.commonAncestorContainer.parentElement;
        if (parentElement && parentElement.tagName === 'CODE') {
          // codeタグを解除して中身のテキストだけを残す
          const textNode = document.createTextNode(parentElement.textContent);
          parentElement.parentNode.replaceChild(textNode, parentElement);
          console.log('✅ コードタグを解除しました');
        } else {
          // 新しくcodeタグで囲む
          range.deleteContents();
          range.insertNode(codeElement);
          console.log('✅ コードタグを適用しました');
        }
        
        // 選択を解除
        selection.removeAllRanges();
        
        // コンテンツ変更を通知
        setTimeout(() => this.handleContentChange({}), 100);
      } else {
        // 選択されたテキストがない場合はカーソル位置にコードスタイルを挿入
        const codeElement = document.createElement('code');
        codeElement.textContent = 'code';
        
        range.insertNode(codeElement);
        
        // code要素内にカーソルを移動
        const newRange = document.createRange();
        newRange.selectNodeContents(codeElement);
        selection.removeAllRanges();
        selection.addRange(newRange);
        
        console.log('✅ 空のコードタグを挿入しました');
      }
    }
  }

  // リストの処理
  toggleList(listType, markdownPrefix) {
    console.log(`📋 リスト設定: ${listType}, isSourceMode: ${this.isSourceMode}`);
    
    if (this.isSourceMode) {
      // ソースモードではカーソル位置にマークダウンを挿入
      this.insertTextAtCursor(markdownPrefix);
    } else {
      // WYSIWYGではDOM操作でリストを作成
      this.applyListFormat(listType);
    }
  }
  
  // リスト書式を適用
  applyListFormat(listType) {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const tagName = listType === 'insertUnorderedList' ? 'ul' : 'ol';
    
    console.log(`📋 リスト書式適用: ${tagName}`);
    
    // 現在の選択範囲を含む要素を取得
    let currentElement = range.commonAncestorContainer;
    if (currentElement.nodeType === Node.TEXT_NODE) {
      currentElement = currentElement.parentElement;
    }
    
    // 既存のリスト要素を探す
    let listElement = currentElement;
    while (listElement && listElement.id !== 'wysiwyg-content' && 
           listElement.tagName !== 'UL' && listElement.tagName !== 'OL') {
      listElement = listElement.parentElement;
    }
    
    if (listElement && (listElement.tagName === 'UL' || listElement.tagName === 'OL')) {
      // リスト内にいる場合
      if (listElement.tagName.toLowerCase() === tagName) {
        // 同じタイプのリストの場合は解除
        const parent = listElement.parentNode;
        while (listElement.firstChild) {
          if (listElement.firstChild.tagName === 'LI') {
            const p = document.createElement('p');
            p.innerHTML = listElement.firstChild.innerHTML;
            parent.insertBefore(p, listElement);
            listElement.removeChild(listElement.firstChild);
          } else {
            parent.insertBefore(listElement.firstChild, listElement);
          }
        }
        parent.removeChild(listElement);
        console.log('✅ リストを解除しました');
      } else {
        // 違うタイプのリストに変換
        const newList = document.createElement(tagName);
        newList.innerHTML = listElement.innerHTML;
        listElement.parentNode.replaceChild(newList, listElement);
        console.log('✅ リストタイプを変更しました');
      }
    } else {
      // 新しくリストを作成
      const list = document.createElement(tagName);
      const li = document.createElement('li');
      
      // 選択範囲の内容を取得
      const contents = range.extractContents();
      li.appendChild(contents);
      list.appendChild(li);
      
      // リストを挿入
      range.insertNode(list);
      
      // カーソルをli内に移動
      range.selectNodeContents(li);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      
      console.log('✅ 新規リストを作成しました');
    }
    
    setTimeout(() => this.handleContentChange({}), 100);
  }

  // 引用の処理
  toggleBlockquote() {
    console.log(`💬 引用設定: isSourceMode: ${this.isSourceMode}`);
    
    if (this.isSourceMode) {
      // ソースモードではカーソル位置にマークダウンを挿入
      this.insertTextAtCursor('> ');
    } else {
      // WYSIWYGではblockquote要素として処理（DOM操作）
      this.applyBlockFormat('blockquote');
    }
  }
  
  // ブロック要素の書式を適用
  applyBlockFormat(tagName) {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    console.log(`📦 ブロック書式適用: ${tagName}`);
    
    // 現在の選択範囲を含むブロック要素を取得
    let blockElement = range.commonAncestorContainer;
    if (blockElement.nodeType === Node.TEXT_NODE) {
      blockElement = blockElement.parentElement;
    }
    
    // wysiwyg-contentまで辿る
    while (blockElement && blockElement.id !== 'wysiwyg-content' && 
           !['P', 'DIV', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(blockElement.tagName)) {
      blockElement = blockElement.parentElement;
    }
    
    if (blockElement && blockElement.id !== 'wysiwyg-content') {
      if (blockElement.tagName === tagName.toUpperCase()) {
        // 既に同じタグの場合は解除（通常のpタグに戻す）
        const p = document.createElement('p');
        p.innerHTML = blockElement.innerHTML;
        blockElement.parentNode.replaceChild(p, blockElement);
        console.log('✅ ブロック書式を解除しました');
      } else {
        // 別のタグに変換
        const newElement = document.createElement(tagName);
        newElement.innerHTML = blockElement.innerHTML;
        blockElement.parentNode.replaceChild(newElement, blockElement);
        console.log('✅ ブロック書式を適用しました');
      }
    } else {
      // 新規にブロック要素を作成
      const newElement = document.createElement(tagName);
      const contents = range.extractContents();
      newElement.appendChild(contents);
      range.insertNode(newElement);
      console.log('✅ 新規ブロック要素を作成しました');
    }
    
    setTimeout(() => this.handleContentChange({}), 100);
  }

  // コードブロックの処理
  toggleCodeBlock() {
    console.log(`💻 コードブロック設定: isSourceMode: ${this.isSourceMode}`);
    
    if (this.isSourceMode) {
      this.wrapText('```\n', '\n```');
    } else {
      // WYSIWYGではpre/code要素として処理（DOM操作）
      this.applyCodeBlock();
    }
  }
  
  // コードブロックを適用
  applyCodeBlock() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const selectedText = selection.toString() || 'コード';
    
    console.log('📦 コードブロック適用');
    
    // pre/code要素を作成
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = selectedText;
    pre.appendChild(code);
    
    // 選択範囲を削除してpre要素を挿入
    range.deleteContents();
    range.insertNode(pre);
    
    // カーソルをpre要素の後に移動
    range.setStartAfter(pre);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    
    console.log('✅ コードブロックを作成しました');
    setTimeout(() => this.handleContentChange({}), 100);
  }

  // 水平線の処理
  insertHorizontalRule() {
    console.log(`➖ 水平線設定: isSourceMode: ${this.isSourceMode}`);
    
    if (this.isSourceMode) {
      this.insertText('\n---\n');
    } else {
      // WYSIWYGではhr要素として処理（DOM操作）
      this.insertHtmlAtCursor('<hr>');
    }
  }
  
  // HTMLをカーソル位置に挿入する汎用メソッド
  insertHtmlAtCursor(html) {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    range.deleteContents();
    
    // HTML文字列からDOM要素を作成
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // 作成された要素を挿入
    const frag = document.createDocumentFragment();
    while (temp.firstChild) {
      frag.appendChild(temp.firstChild);
    }
    
    range.insertNode(frag);
    
    // カーソルを挿入した要素の後に移動
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    
    console.log('✅ HTMLを挿入しました:', html);
    setTimeout(() => this.handleContentChange({}), 100);
  }
  
  // テキストをカーソル位置に挿入するメソッド
  insertTextAtCursor(text) {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    range.deleteContents();
    
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    
    // カーソルをテキストの後に移動
    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    
    console.log('✅ テキストを挿入しました:', text);
    setTimeout(() => this.handleContentChange({}), 100);
  }

  // MarkdownテキストをHTMLに変換
  markdownToHtml(markdown) {
    if (!markdown) return '';

    let html = markdown;

    // HTMLタグを一時的に保護
    const htmlTags = {};
    let htmlIndex = 0;
    html = html.replace(/<[^>]+>/g, (match) => {
      const placeholder = `__HTML_${htmlIndex++}__`;
      htmlTags[placeholder] = match;
      return placeholder;
    });

    // エスケープ文字を一時的に保護
    const escapes = {};
    let escapeIndex = 0;
    html = html.replace(/\\(.)/g, (match, char) => {
      const placeholder = `__ESCAPE_${escapeIndex++}__`;
      escapes[placeholder] = char;
      return placeholder;
    });

    // 1. コードブロック（最優先で処理）
    html = html.replace(/```([a-zA-Z0-9]*)\n?([\s\S]*?)```/g, (match, lang, code) => {
      let processedCode = code.trim()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      if (lang === 'javascript' || lang === 'js' || lang === 'typescript' || lang === 'ts') {
        processedCode = this.addBasicSyntaxHighlight(processedCode);
      }

      const language = lang ? ` class="language-${lang}" data-lang="${lang}"` : '';
      return `<pre><code${language}>${processedCode}</code></pre>`;
    });

    // 2. インラインコード（コードブロック後に処理）
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 3. タスクリスト（チェックボックス）
    html = html.replace(/^\s*-\s+\[x\]\s+(.+)$/gm, '<div class="task-item"><input type="checkbox" checked class="task-checkbox"> <span class="task-text" style="text-decoration: line-through">$1</span></div>');
    html = html.replace(/^\s*-\s+\[\s\]\s+(.+)$/gm, '<div class="task-item"><input type="checkbox" class="task-checkbox"> <span class="task-text">$1</span></div>');

    // 4. 表（テーブル）処理
    html = this.processTable(html);

    // 5. 見出し（h1-h6）
    html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

    // 6. 水平線
    html = html.replace(/^---+$/gm, '<hr>');

    // 7. 引用
    html = html.replace(/^>\s*(.+)$/gm, '<blockquote>$1</blockquote>');

    // 8. リスト処理
    html = html.replace(/^[\*\-\+]\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*?<\/li>(\s*<li>.*?<\/li>)*)/gm, '<ul>$1</ul>');
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li class="ordered">$1</li>');
    html = html.replace(/(<li class="ordered">.*?<\/li>(\s*<li class="ordered">.*?<\/li>)*)/gm, '<ol>$1</ol>');
    html = html.replace(/class="ordered"/g, '');

    // 9. 太字・斜体（エスケープされたアスタリスクを除外）
    html = html.replace(/(?<!\\)\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/(?<!\\)\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/(?<!\\)\*([^*\s][^*]*[^*\s]|\w)\*/g, '<em>$1</em>');

    // 10. 取り消し線
    html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');

    // 11. 画像（クリック可能・編集可能）- リンクより先に処理
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="editable-image" data-alt="$1" data-src="$2" style="max-width: 100%; height: auto; cursor: pointer; display: inline-block; border-radius: 4px;">');

    // 12. リンク（クリック可能・編集可能）
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="editable-link" data-text="$1" data-url="$2">$1</a>');

    // 13. 段落処理
    const lines = html.split('\n');
    const processed = [];
    let currentParagraph = [];

    for (const line of lines) {
      if (line.trim() === '') {
        if (currentParagraph.length > 0) {
          const paragraphContent = currentParagraph.join('\n').trim();
          if (paragraphContent && !this.isBlockElement(paragraphContent)) {
            processed.push(`<p>${paragraphContent}</p>`);
          } else {
            processed.push(paragraphContent);
          }
          currentParagraph = [];
        }
      } else {
        if (this.isBlockElement(line)) {
          if (currentParagraph.length > 0) {
            const paragraphContent = currentParagraph.join('\n').trim();
            if (paragraphContent) {
              processed.push(`<p>${paragraphContent}</p>`);
            }
            currentParagraph = [];
          }
          processed.push(line);
        } else {
          currentParagraph.push(line);
        }
      }
    }

    if (currentParagraph.length > 0) {
      const paragraphContent = currentParagraph.join('\n').trim();
      if (paragraphContent && !this.isBlockElement(paragraphContent)) {
        processed.push(`<p>${paragraphContent}</p>`);
      } else if (paragraphContent) {
        processed.push(paragraphContent);
      }
    }

    html = processed.join('\n');

    // 改行処理（HTMLタグ復元前に実行）
    html = html.replace(/  \n/g, '<br>\n');

    // HTMLタグを復元
    for (const [placeholder, tag] of Object.entries(htmlTags)) {
      html = html.replace(new RegExp(placeholder, 'g'), tag);
    }

    // エスケープ文字を復元
    for (const [placeholder, char] of Object.entries(escapes)) {
      html = html.replace(new RegExp(placeholder, 'g'), char);
    }

    // エスケープされたBRタグを復元
    html = html.replace(/&lt;br&gt;/gi, '<br>');

    return html;
  }

  // テーブル処理
  processTable(html) {
    const lines = html.split('\n');
    const processed = [];
    let inTable = false;
    let tableRows = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.includes('|') && line.length > 2) {
        if (!inTable) {
          // テーブル開始をチェック
          const nextLine = lines[i + 1];
          if (nextLine && nextLine.includes('|') && (nextLine.includes('-') || nextLine.includes(':'))) {
            inTable = true;
            tableRows = [];
          }
        }

        if (inTable) {
          tableRows.push(line);

          // 区切り行の次がテーブル行でない場合、テーブル終了
          const nextLine = lines[i + 1];
          if (!nextLine || (!nextLine.trim().includes('|') && nextLine.trim().length > 0)) {
            processed.push(this.convertToTable(tableRows));
            inTable = false;
            tableRows = [];
          }
        } else {
          processed.push(line);
        }
      } else {
        if (inTable) {
          processed.push(this.convertToTable(tableRows));
          inTable = false;
          tableRows = [];
        }
        processed.push(line);
      }
    }

    if (inTable && tableRows.length > 0) {
      processed.push(this.convertToTable(tableRows));
    }

    return processed.join('\n');
  }

  // テーブル変換
  convertToTable(rows) {
    if (rows.length < 2) return rows.join('\n');

    const headerRow = rows[0];
    const separatorRow = rows[1];
    const dataRows = rows.slice(2);

    // 配置情報を取得
    const alignments = separatorRow.split('|').map(cell => {
      const trimmed = cell.trim();
      if (trimmed.startsWith(':') && trimmed.endsWith(':')) return 'center';
      if (trimmed.endsWith(':')) return 'right';
      return 'left';
    }).filter(align => align);

    // ヘッダー行を処理
    const headers = headerRow.split('|').map(cell => cell.trim()).filter(cell => cell);
    const headerHtml = headers.map((header, i) => {
      const align = alignments[i] || 'left';
      return `<th style="text-align: ${align}">${header}</th>`;
    }).join('');

    // データ行を処理
    const dataHtml = dataRows.map(row => {
      const cells = row.split('|').map(cell => cell.trim()).filter(cell => cell);
      return `<tr>${cells.map((cell, i) => {
        const align = alignments[i] || 'left';
        return `<td style="text-align: ${align}">${cell}</td>`;
      }).join('')}</tr>`;
    }).join('');

    return `<table class="markdown-table"><thead><tr>${headerHtml}</tr></thead><tbody>${dataHtml}</tbody></table>`;
  }

  // ブロック要素かどうかを判定
  isBlockElement(line) {
    return /^<(h[1-6]|pre|code|blockquote|ul|ol|li|hr|div|table|thead|tbody|tr|th|td|img)/.test(line.trim()) ||
           /^<\/(h[1-6]|pre|code|blockquote|ul|ol|li|hr|div|table|thead|tbody|tr|th|td)>/.test(line.trim()) ||
           /<table|<\/table>|<thead|<\/thead>|<tbody|<\/tbody>|class="task-item"|class="editable-/.test(line);
  }

  // 基本的なシンタックスハイライト
  addBasicSyntaxHighlight(code) {
    return code
      // JavaScript キーワード
      .replace(/\b(function|const|let|var|if|else|for|while|return|class|import|export|from|default|async|await|try|catch|finally|throw|new|this|super|extends|static|public|private|protected)\b/g, '<span class="keyword">$1</span>')

      // 文字列
      .replace(/(["'])((?:\\.|(?!\1)[^\\])*?)\1/g, '<span class="string">$1$2$1</span>')
      .replace(/(`)((?:\\.|[^\\`])*?)(`)/g, '<span class="string">$1$2$3</span>')

      // 数値
      .replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>')

      // 関数名
      .replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g, '<span class="function">$1</span>')

      // コメント
      .replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>')
      .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>');
  }

  // HTMLをMarkdownに変換
  htmlToMarkdown(html) {
    if (!html) return '';

    let markdown = html;

    // 1. コードブロック（先に処理）
    markdown = markdown.replace(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/g, (match, code) => {
      return '```\n' + code.trim() + '\n```';
    });

    // 2. インラインコード
    markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/g, '`$1`');

    // 3. 見出し
    markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/g, '# $1');
    markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/g, '## $1');
    markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/g, '### $1');
    markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/g, '#### $1');
    markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/g, '##### $1');
    markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/g, '###### $1');

    // 4. 太字・斜体
    markdown = markdown.replace(/<strong[^>]*><em[^>]*>(.*?)<\/em><\/strong>/g, '***$1***');
    markdown = markdown.replace(/<em[^>]*><strong[^>]*>(.*?)<\/strong><\/em>/g, '***$1***');
    markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/g, '**$1**');
    markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/g, '**$1**');
    markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/g, '*$1*');
    markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/g, '*$1*');

    // 5. 取り消し線
    markdown = markdown.replace(/<del[^>]*>(.*?)<\/del>/g, '~~$1~~');
    markdown = markdown.replace(/<s[^>]*>(.*?)<\/s>/g, '~~$1~~');

    // 6. リンク
    markdown = markdown.replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/g, '[$2]($1)');

    // 7. 画像
    markdown = markdown.replace(/<img[^>]*src=["']([^"']*)["'][^>]*alt=["']([^"']*)["'][^>]*>/g, '![$2]($1)');
    markdown = markdown.replace(/<img[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']*)["'][^>]*>/g, '![$1]($2)');
    markdown = markdown.replace(/<img[^>]*src=["']([^"']*)["'][^>]*>/g, '![]($1)');

    // 8. リスト
    markdown = markdown.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/g, (match, content) => {
      return content.replace(/<li[^>]*>(.*?)<\/li>/g, '* $1\n').trim();
    });
    markdown = markdown.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/g, (match, content) => {
      let counter = 1;
      return content.replace(/<li[^>]*>(.*?)<\/li>/g, (match, captured) => `${counter++}. ${captured}\n`).trim();
    });

    // 9. 引用
    markdown = markdown.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/g, '> $1');

    // 10. 水平線
    markdown = markdown.replace(/<hr[^>]*>/g, '---');

    // 11. 段落
    markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/g, '$1\n\n');

    // 12. 改行
    markdown = markdown.replace(/<br[^>]*>/g, '\n');

    // 13. 残りのHTMLタグを除去
    markdown = markdown.replace(/<[^>]*>/g, '');

    // 14. 重複する改行を整理
    markdown = markdown.replace(/\n{3,}/g, '\n\n');

    // 15. HTML entities をデコード
    markdown = markdown
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    return markdown.trim();
  }

  init() {
    console.log('エディターの初期化を開始...');
    
    // DOM読み込みを確実に待つ
    if (document.readyState === 'loading') {
      console.log('DOCUMENTがまだ読み込み中です。DOMContentLoadedを待機...');
      document.addEventListener('DOMContentLoaded', () => {
        console.log('DOMContentLoaded後に初期化を実行');
        this.performInit();
      });
    } else {
      console.log('DOMは既に読み込み済み。即座に初期化を実行');
      this.performInit();
    }
  }

  async performInit() {
    console.log('実際の初期化処理を開始...');
    this.setupEditor();
    this.setupToolbar();
    this.setupEventListeners();
    this.setupFileNameEditor();
    this.updateFileNameDisplay();
    
    // 初期コンテンツを記録
    this.originalContent = this.getCurrentContent();

    // 初期ファイルデータを処理（サーバーから埋め込まれたデータ）
    this.handleInitialFileData();

    // URLパラメータによるファイル読み込みを追加
    this.handleURLFileParameter();

    // バージョン管理機能を初期化
    try {
      this.versionIntegration = new VersionIntegration(this);
      await this.versionIntegration.init();
      console.log('バージョン管理機能の初期化完了');
    } catch (error) {
      console.error('バージョン管理機能の初期化に失敗:', error);
      // エラーがあってもエディター自体は動作させる
    }

    // ローカル履歴機能を初期化
    try {
      this.localHistoryIntegration = new LocalHistoryIntegration(this);
      await this.localHistoryIntegration.init();
      console.log('ローカル履歴機能の初期化完了');
    } catch (error) {
      console.error('ローカル履歴機能の初期化に失敗:', error);
      // エラーがあってもエディター自体は動作させる
    }

    // DOM要素が確実に存在することを確認してからボタンをセットアップ
    setTimeout(() => {
      console.log('DOM要素の存在確認:');
      console.log('- settings-btn:', !!document.getElementById('settings-btn'));
      console.log('- settings-overlay:', !!document.getElementById('settings-overlay'));
      console.log('- settings-save:', !!document.getElementById('settings-save'));
      console.log('- gemini-test-btn:', !!document.getElementById('gemini-test-btn'));
      console.log('- claude-test-btn:', !!document.getElementById('claude-test-btn'));

      this.setupHeaderButtons();
      this.updateWordCount();
      console.log('エディターの初期化が完了しました');
    }, 200);
  }

  setupEditor() {
    const editorElement = document.getElementById('editor');
    if (editorElement) {
      // WYSIWYGエディターの代わりにcontentEditableを使用
      editorElement.innerHTML = '<div contenteditable="true" class="wysiwyg-editor-content" id="wysiwyg-content"></div>';

      const content = document.getElementById('wysiwyg-content');
      
      // 入力イベント（リアルタイム変換とワードカウント更新）
      content.addEventListener('input', (e) => {
        this.updateWordCount();
        this.handleContentChange(e);
      });

      // キーボードショートカット（書式設定）
      content.addEventListener('keydown', (e) => {
        this.handleKeyboardShortcuts(e);
      });

      // ペーストイベント（書式を保持）
      content.addEventListener('paste', (e) => {
        this.handlePaste(e);
      });

      // リンク・画像編集機能
      content.addEventListener('click', (e) => {
        if (e.target.classList.contains('editable-link')) {
          e.preventDefault();
          this.editLink(e.target);
        } else if (e.target.classList.contains('editable-image')) {
          e.preventDefault();
          this.editImage(e.target);
        }
      });

      // フォーカスを設定
      content.focus();
    }
  }

  setupToolbar() {
    // 基本的なMarkdown記法ボタンの設定
    const toolbarButtons = {
      bold: () => this.toggleFormatting('bold', '**', '**'),
      italic: () => this.toggleFormatting('italic', '*', '*'),
      strike: () => this.toggleFormatting('strikeThrough', '~~', '~~'),
      underline: () => this.toggleFormatting('underline', '__', '__'),
      code: () => this.toggleInlineCode(),
      bulletList: () => this.toggleList('insertUnorderedList', '- '),
      orderedList: () => this.toggleList('insertOrderedList', '1. '),
      blockquote: () => this.toggleBlockquote(),
      codeBlock: () => this.toggleCodeBlock(),
      horizontalRule: () => this.insertHorizontalRule(),
      link: () => this.insertLink(),
      image: () => this.insertImage(),
      table: () => this.insertTable(),
      undo: () => this.performUndo(),
      redo: () => this.performRedo()
    };

    // ツールバーボタンのイベントリスナーを設定
    Object.keys(toolbarButtons).forEach(buttonName => {
      const button = document.querySelector(`[data-action="${buttonName}"]`);
      if (button) {
        button.addEventListener('click', (e) => {
          e.preventDefault();
          console.log(`🎯 ツールバーボタンクリック: ${buttonName}`);
          toolbarButtons[buttonName]();
        });
      }
    });

    // 見出しセレクトボックスの設定
    const headingSelect = document.getElementById('heading-select');
    if (headingSelect) {
      headingSelect.addEventListener('change', (e) => {
        const value = e.target.value;
        if (value === 'p') {
          // 段落に変換
          this.applyBlockFormat('p');
        } else if (value) {
          const level = parseInt(value);
          if (this.isSourceMode) {
            // ソースモードではMarkdown記法を使用
            const prefix = '#'.repeat(level) + ' ';
            this.insertAtLineStart(prefix);
          } else {
            // WYSIWYGモードではDOM操作
            this.applyBlockFormat('h' + level);
          }
        }
        e.target.value = ''; // 選択後にリセット
      });
    }

    // モード切り替えボタン
    const toggleModeBtn = document.getElementById('toggle-mode-btn');
    if (toggleModeBtn) {
      toggleModeBtn.addEventListener('click', () => this.toggleEditMode());
    }

    // 目次生成ボタン
    const tocBtn = document.getElementById('toc-btn');
    if (tocBtn) {
      tocBtn.addEventListener('click', () => this.generateTOC());
    }

    // ヘルプボタン
    const helpBtn = document.getElementById('help-btn');
    if (helpBtn) {
      helpBtn.addEventListener('click', () => this.showHelp());
    }

    // Subagents機能は削除済み

    // ファイル操作ボタン
    const newFileBtn = document.getElementById('new-file-btn');
    if (newFileBtn) {
      newFileBtn.addEventListener('click', () => this.newFile());
    }

    const openFileBtn = document.getElementById('open-file-btn');
    if (openFileBtn) {
      openFileBtn.addEventListener('click', () => this.openFile());
    }

    const saveFileBtn = document.getElementById('save-file-btn');
    if (saveFileBtn) {
      saveFileBtn.addEventListener('click', () => this.saveFile());
    }

    const saveAsBtn = document.getElementById('save-as-btn');
    if (saveAsBtn) {
      saveAsBtn.addEventListener('click', () => this.saveAsFile());
    }
  }

  // Undo/Redoの実装（execCommandが非推奨でも、Undo/Redoは例外的に使用）
  performUndo() {
    console.log('⏪ Undo実行');
    document.execCommand('undo');
  }
  
  performRedo() {
    console.log('⏩ Redo実行');
    document.execCommand('redo');
  }

  setupHeaderButtons() {
    console.log('ヘッダーボタンのセットアップを開始...');
    
    // 設定ボタン（全般設定ダイアログを表示）
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
      console.log('settings-btn要素が見つかりました');
      settingsBtn.addEventListener('click', () => {
        console.log('設定ボタンがクリックされました');
        this.showSettings();
      });
      console.log('設定ボタンのイベントリスナーを設定しました');
    } else {
      console.error('settings-btn要素が見つかりません');
    }

    // 設定ダイアログのイベントリスナー
    this.setupSettingsEventListeners();
  }

  setupSettingsEventListeners() {
    console.log('設定イベントリスナーをセットアップ中...');
    
    // APIキーフィールドのリアルタイム保存
    const geminiApiKeyField = document.getElementById('gemini-api-key');
    const claudeApiKeyField = document.getElementById('claude-api-key');
    
    if (geminiApiKeyField) {
      // 複数のイベントで確実にキャプチャ
      ['input', 'change', 'keyup', 'paste'].forEach(eventType => {
        geminiApiKeyField.addEventListener(eventType, () => {
          console.log(`Gemini APIキー${eventType}イベント発生、保存中...`);
          console.log('フィールド値:', geminiApiKeyField.value);
          if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.sync.set({
              geminiApiKey: geminiApiKeyField.value
            }, () => {
              console.log('Gemini APIキーをChrome Storageに保存しました');
            });
          }
        });
      });
      console.log('Gemini APIキーフィールドのリアルタイム保存を設定しました');
    }
    
    if (claudeApiKeyField) {
      // 複数のイベントで確実にキャプチャ
      ['input', 'change', 'keyup', 'paste'].forEach(eventType => {
        claudeApiKeyField.addEventListener(eventType, () => {
          console.log(`Claude APIキー${eventType}イベント発生、保存中...`);
          console.log('フィールド値:', claudeApiKeyField.value);
          if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.sync.set({
              claudeApiKey: claudeApiKeyField.value
            }, () => {
              console.log('Claude APIキーをChrome Storageに保存しました');
            });
          }
        });
      });
      console.log('Claude APIキーフィールドのリアルタイム保存を設定しました');
    }
    
    // 閉じるボタン
    const closeBtn = document.getElementById('settings-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        console.log('設定閉じるボタンがクリックされました');
        this.hideSettings();
      });
      console.log('設定閉じるボタンのイベントリスナーを設定しました');
    } else {
      console.error('settings-close要素が見つかりません');
    }

    // オーバーレイクリックで閉じる
    const overlay = document.getElementById('settings-overlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          console.log('設定オーバーレイがクリックされました');
          this.hideSettings();
        }
      });
      console.log('設定オーバーレイのイベントリスナーを設定しました');
    } else {
      console.error('settings-overlay要素が見つかりません');
    }

    // 設定タブの切り替え
    const settingsTabs = document.querySelectorAll('.settings-tab');
    settingsTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        this.switchSettingsTab(tabName);
      });
    });

    // プロバイダータブの切り替え
    const providerTabs = document.querySelectorAll('.ai-provider-tab');
    providerTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const provider = tab.dataset.provider;
        this.switchAIProvider(provider);
      });
    });

    // パスワード表示切り替え
    const geminiToggle = document.getElementById('gemini-password-toggle');
    const claudeToggle = document.getElementById('claude-password-toggle');
    
    if (geminiToggle) {
      geminiToggle.addEventListener('click', () => {
        this.togglePassword('gemini-api-key', 'gemini-password-toggle');
      });
    }
    
    if (claudeToggle) {
      claudeToggle.addEventListener('click', () => {
        this.togglePassword('claude-api-key', 'claude-password-toggle');
      });
    }

    // 保存ボタン
    const saveBtn = document.getElementById('settings-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        console.log('設定保存ボタンがクリックされました');
        this.saveAllSettings();
      });
      console.log('設定保存ボタンのイベントリスナーを設定しました');
    } else {
      console.error('settings-save要素が見つかりません');
    }

    // 接続テストボタン
    const geminiTestBtn = document.getElementById('gemini-test-btn');
    const claudeTestBtn = document.getElementById('claude-test-btn');
    
    if (geminiTestBtn) {
      geminiTestBtn.addEventListener('click', () => {
        console.log('Gemini接続テストボタンがクリックされました');
        this.testConnection('gemini');
      });
      console.log('Gemini接続テストボタンのイベントリスナーを設定しました');
    } else {
      console.error('gemini-test-btn要素が見つかりません');
    }
    
    if (claudeTestBtn) {
      claudeTestBtn.addEventListener('click', () => {
        console.log('Claude接続テストボタンがクリックされました');
        this.testConnection('claude');
      });
      console.log('Claude接続テストボタンのイベントリスナーを設定しました');
    } else {
      console.error('claude-test-btn要素が見つかりません');
    }
  }

  showSettings() {
    console.log('設定ダイアログの表示を開始...');
    
    // 設定ダイアログを表示
    const overlay = document.getElementById('settings-overlay');
    if (overlay) {
      console.log('settings-overlay要素が見つかりました');
      overlay.style.display = 'flex';
      console.log('設定ダイアログを表示しました');
      this.loadAllSettings();
    } else {
      console.error('settings-overlay要素が見つかりません');
    }
  }

  showAISettings() {
    // AI設定ダイアログを表示（旧関数、互換性のため残す）
    this.showSettings();
    // AI設定タブをアクティブにする
    this.switchSettingsTab('ai');
  }


  // AI設定機能
  loadAISettings() {
    // Chrome Storage APIから設定を読み込み
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.get(['geminiApiKey', 'geminiModel', 'claudeApiKey', 'claudeModel'], (result) => {
        // Gemini設定を復元
        const geminiKey = document.getElementById('gemini-api-key');
        const geminiModel = document.getElementById('gemini-model');
        if (geminiKey) geminiKey.value = result.geminiApiKey || '';
        if (geminiModel) geminiModel.value = result.geminiModel || 'gemini-2.5-pro';

        // Claude設定を復元
        const claudeKey = document.getElementById('claude-api-key');
        const claudeModel = document.getElementById('claude-model');
        if (claudeKey) claudeKey.value = result.claudeApiKey || '';
        if (claudeModel) claudeModel.value = result.claudeModel || 'claude-3-5-sonnet-20241022';
      });
    }
  }

  async saveAISettings() {
    // フォームから設定を取得
    const geminiKey = document.getElementById('gemini-api-key')?.value || '';
    const geminiModel = document.getElementById('gemini-model')?.value || 'gemini-2.5-pro';
    const claudeKey = document.getElementById('claude-api-key')?.value || '';
    const claudeModel = document.getElementById('claude-model')?.value || 'claude-3-5-sonnet-20241022';

    // Chrome Storage APIに保存
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.set({
        geminiApiKey: geminiKey,
        geminiModel: geminiModel,
        claudeApiKey: claudeKey,
        claudeModel: claudeModel
      }, async () => {
        this.showAIMessage('設定を保存しました', 'success');
        
        // AICommandManagerの設定を再読み込み
        if (window.aiCommandUI && window.aiCommandUI.commandManager) {
          await window.aiCommandUI.commandManager.loadSettings();
        }
      });
    } else {
      this.showAIMessage('Chrome拡張機能でのみ設定を保存できます', 'error');
    }
  }

  hideSettings() {
    const overlay = document.getElementById('settings-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  }

  hideAISettings() {
    // 互換性のため残す
    this.hideSettings();
  }

  switchSettingsTab(tabName) {
    // タブの切り替え
    const tabs = document.querySelectorAll('.settings-tab');
    const contents = document.querySelectorAll('.settings-tab-content');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    contents.forEach(content => content.classList.remove('active'));
    
    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    const activeContent = document.getElementById(`${tabName}-tab`);
    
    if (activeTab) activeTab.classList.add('active');
    if (activeContent) activeContent.classList.add('active');
  }

  loadAllSettings() {
    // すべての設定を読み込み
    this.loadAISettings();
    this.loadEditorSettings();
    this.loadExportSettings();
  }

  loadEditorSettings() {
    // エディター設定を読み込み（将来実装）
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.get(['autoSave', 'wordWrap'], (result) => {
        const autoSave = document.getElementById('auto-save');
        const wordWrap = document.getElementById('word-wrap');
        
        if (autoSave) autoSave.checked = result.autoSave !== false; // デフォルトtrue
        if (wordWrap) wordWrap.checked = result.wordWrap !== false; // デフォルトtrue
      });
    }
  }

  loadExportSettings() {
    // エクスポート設定を読み込み（将来実装）
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.get(['defaultExportFormat'], (result) => {
        const defaultFormat = document.getElementById('default-export-format');
        if (defaultFormat) defaultFormat.value = result.defaultExportFormat || 'markdown';
      });
    }
  }

  async saveAllSettings() {
    console.log('すべての設定を保存開始...');
    
    try {
      // すべての設定を保存
      await this.saveAISettings();
      console.log('AI設定の保存完了');
      
      this.saveEditorSettings();
      console.log('エディター設定の保存完了');
      
      this.saveExportSettings();
      console.log('エクスポート設定の保存完了');
      
      this.showSettingsMessage('すべての設定を保存しました', 'success');
      console.log('設定保存完了、メッセージを表示');
    } catch (error) {
      console.error('設定保存中にエラーが発生:', error);
      this.showSettingsMessage('設定保存中にエラーが発生しました: ' + error.message, 'error');
    }
  }

  saveEditorSettings() {
    // エディター設定を保存
    const autoSave = document.getElementById('auto-save')?.checked || false;
    const wordWrap = document.getElementById('word-wrap')?.checked || false;

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.set({
        autoSave: autoSave,
        wordWrap: wordWrap
      });
    }
  }

  saveExportSettings() {
    // エクスポート設定を保存
    const defaultFormat = document.getElementById('default-export-format')?.value || 'markdown';

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.set({
        defaultExportFormat: defaultFormat
      });
    }
  }

  showSettingsMessage(text, type = 'info') {
    console.log(`設定メッセージを表示: "${text}" (${type})`);
    
    // 既存のメッセージを削除
    const existing = document.querySelector('.settings-message');
    if (existing) {
      existing.remove();
      console.log('既存のメッセージを削除しました');
    }

    const messageContainer = document.querySelector('.settings-body');
    if (!messageContainer) {
      console.error('.settings-body要素が見つかりません');
      return;
    }

    const message = document.createElement('div');
    message.className = `settings-message ${type}`;
    message.innerHTML = `
      <span>${this.getMessageIcon(type)}</span>
      <span>${text}</span>
    `;

    messageContainer.insertBefore(message, messageContainer.firstChild);
    console.log('メッセージを挿入しました:', message);

    // 3秒後に自動削除
    setTimeout(() => {
      if (message.parentNode) {
        message.remove();
        console.log('メッセージを自動削除しました');
      }
    }, 3000);
  }

  switchAIProvider(provider) {
    // タブの切り替え
    const tabs = document.querySelectorAll('.ai-provider-tab');
    const contents = document.querySelectorAll('.ai-provider-content');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    contents.forEach(content => content.classList.remove('active'));
    
    const activeTab = document.querySelector(`[data-provider="${provider}"]`);
    const activeContent = document.getElementById(`${provider}-settings`);
    
    if (activeTab) activeTab.classList.add('active');
    if (activeContent) activeContent.classList.add('active');
  }

  togglePassword(inputId, buttonId) {
    const input = document.getElementById(inputId);
    const button = document.getElementById(buttonId);
    
    if (input && button) {
      if (input.type === 'password') {
        input.type = 'text';
        button.textContent = '🙈';
      } else {
        input.type = 'password';
        button.textContent = '👁️';
      }
    }
  }

  async testConnection(provider) {
    console.log(`${provider}の接続テストを開始...`);
    
    const button = document.getElementById(`${provider}-test-btn`);
    if (!button) {
      console.error(`${provider}-test-btn要素が見つかりません`);
      return;
    }

    console.log('ローディング状態に変更...');
    // ローディング状態に変更
    button.classList.add('loading');
    button.disabled = true;

    try {
      // APIキーフィールドの詳細な検証
      const apiKeyField = document.getElementById(`${provider}-api-key`);
      const modelField = document.getElementById(`${provider}-model`);
      
      console.log(`${provider}-api-key要素:`, !!apiKeyField);
      console.log(`${provider}-model要素:`, !!modelField);
      console.log(`要素の値:`, apiKeyField?.value);
      console.log(`要素のtypeプロパティ:`, apiKeyField?.type);
      console.log(`要素の表示状態:`, apiKeyField?.style.display);
      console.log(`親要素の表示状態:`, apiKeyField?.parentElement?.style.display);
      
      // パスワードフィールドの値取得を強制する
      if (apiKeyField?.type === 'password') {
        console.log('パスワードフィールドを一時的にtextタイプに変更して値を取得します');
        const originalType = apiKeyField.type;
        apiKeyField.type = 'text';
        const valueAfterTypeChange = apiKeyField.value;
        apiKeyField.type = originalType;
        console.log('タイプ変更後の値:', valueAfterTypeChange);
      }
      
      if (!apiKeyField) {
        console.error(`${provider}-api-key要素が見つかりません`);
        this.showSettingsMessage('入力フィールドが見つかりません', 'error');
        return;
      }
      
      // APIキーの値を複数の方法で取得を試行
      let apiKey = apiKeyField.value?.trim();
      
      // パスワードフィールドで値が空の場合の対処
      if (!apiKey && apiKeyField?.type === 'password') {
        console.log('パスワードフィールドから直接値を取得できません。代替方法を試行...');
        // フィールドのvalueプロパティを直接読み取り
        apiKey = apiKeyField.getAttribute('value') || '';
        console.log('getAttribute()で取得した値:', apiKey);
        
        if (!apiKey) {
          // ChromeのStorage APIから取得を試行
          if (typeof chrome !== 'undefined' && chrome.storage) {
            try {
              const result = await new Promise((resolve) => {
                chrome.storage.sync.get([`${provider}ApiKey`], resolve);
              });
              apiKey = result[`${provider}ApiKey`] || '';
              console.log('Chrome Storageから取得した値:', apiKey);
            } catch (error) {
              console.error('Chrome Storageからの取得エラー:', error);
            }
          }
        }
      } else {
        // パスワードフィールドでない場合でも、Chrome Storageから取得を試行
        if (!apiKey && typeof chrome !== 'undefined' && chrome.storage) {
          try {
            const result = await new Promise((resolve) => {
              chrome.storage.sync.get([`${provider}ApiKey`], resolve);
            });
            const storedKey = result[`${provider}ApiKey`] || '';
            if (storedKey) {
              apiKey = storedKey;
              console.log('Chrome Storageから補完取得した値:', apiKey);
            }
          } catch (error) {
            console.error('Chrome Storage補完取得エラー:', error);
          }
        }
      }
      
      const model = modelField?.value || '';
      
      console.log(`最終的に取得したAPIキー長さ: ${apiKey?.length || 0}, 値の先頭: ${apiKey?.substring(0, 10)}...`);
      console.log(`モデル: ${model}`);
      
      if (!apiKey || apiKey.length < 10) {
        console.log('APIキーが空または短すぎます');
        this.showSettingsMessage('有効なAPIキーを入力してください', 'error');
        return;
      }

      console.log('実際の接続テストを実行中...');
      
      // 実際のAPI接続テストを実行
      let testResult = false;
      
      if (provider === 'gemini') {
        testResult = await this.testGeminiConnection(apiKey, model);
      } else if (provider === 'claude') {
        testResult = await this.testClaudeConnection(apiKey, model);
      }
      
      if (testResult) {
        this.showSettingsMessage(`${provider.toUpperCase()}への接続テストに成功しました`, 'success');
        console.log('接続テスト成功');
      } else {
        this.showSettingsMessage(`${provider.toUpperCase()}への接続テストに失敗しました`, 'error');
        console.log('接続テスト失敗');
      }

    } catch (error) {
      console.error('接続テストエラー:', error);
      this.showSettingsMessage(`接続テストに失敗しました: ${error.message}`, 'error');
    } finally {
      console.log('ローディング状態を解除...');
      // ローディング状態を解除
      button.classList.remove('loading');
      button.disabled = false;
    }
  }

  showAIMessage(text, type = 'info') {
    // 既存のメッセージを削除
    const existing = document.querySelector('.ai-message');
    if (existing) {
      existing.remove();
    }

    const messageContainer = document.querySelector('.ai-settings-body');
    if (!messageContainer) return;

    const message = document.createElement('div');
    message.className = `ai-message ${type}`;
    message.innerHTML = `
      <span>${this.getMessageIcon(type)}</span>
      <span>${text}</span>
    `;

    messageContainer.insertBefore(message, messageContainer.firstChild);

    // 3秒後に自動削除
    setTimeout(() => {
      if (message.parentNode) {
        message.remove();
      }
    }, 3000);
  }

  getMessageIcon(type) {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'info': return 'ℹ️';
      default: return 'ℹ️';
    }
  }

  wrapText(before, after) {
    const content = document.getElementById('wysiwyg-content');
    const selection = window.getSelection();

    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const selectedText = range.toString();
      const wrappedText = before + selectedText + after;

      range.deleteContents();
      range.insertNode(document.createTextNode(wrappedText));

      // カーソル位置を調整
      range.setStart(range.endContainer, range.endOffset);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    content.focus();
    this.updateWordCount();
  }

  insertAtLineStart(prefix) {
    const content = document.getElementById('wysiwyg-content');
    const selection = window.getSelection();

    if (selection.rangeCount > 0) {
      const text = content.textContent;
      const cursorPos = this.getCaretPosition(content);
      const lineStart = text.lastIndexOf('\n', cursorPos - 1) + 1;

      // プレフィックスを挿入
      const beforeText = text.substring(0, lineStart);
      const afterText = text.substring(lineStart);
      content.textContent = beforeText + prefix + afterText;

      // カーソル位置を調整
      this.setCaretPosition(content, lineStart + prefix.length);
    }

    content.focus();
    this.updateWordCount();
  }

  insertNumberedList() {
    const content = document.getElementById('wysiwyg-content');
    const text = content.textContent;
    const cursorPos = this.getCaretPosition(content);

    // 前の行の番号を確認
    const lines = text.substring(0, cursorPos).split('\n');
    let nextNumber = 1;

    if (lines.length > 1) {
      const prevLine = lines[lines.length - 2];
      const match = prevLine.match(/^(\d+)\./);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    this.insertAtLineStart(`${nextNumber}. `);
  }

  insertText(text) {
    const content = document.getElementById('wysiwyg-content');
    const selection = window.getSelection();

    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
    }

    content.focus();
    this.updateWordCount();
  }

  insertLink() {
    const url = prompt('リンクURLを入力してください:');
    const text = prompt('リンクテキストを入力してください:', 'リンク');

    if (url && text) {
      this.insertText(`[${text}](${url})`);
    }
  }

  async insertImage() {
    // 画像挿入ダイアログを表示
    const dialog = this.createImageInsertDialog();
    document.body.appendChild(dialog);
  }

  createImageInsertDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'image-insert-modal';
    dialog.innerHTML = `
      <div class="image-insert-dialog">
        <div class="dialog-header">
          <h3>🖼️ 画像を挿入</h3>
          <button class="close-btn" id="closeImageDialog">✕</button>
        </div>
        
        <div class="dialog-content">
          <div class="insert-method-tabs">
            <button class="method-tab active" data-method="url">📎 URLから挿入</button>
            <button class="method-tab" data-method="drive">📁 Google Driveから選択</button>
          </div>
          
          <div class="insert-method-content">
            <!-- URL入力方式 -->
            <div class="method-panel active" id="url-panel">
              <div class="form-group">
                <label for="imageUrl">画像URL:</label>
                <input type="url" id="imageUrl" class="form-input" placeholder="https://example.com/image.jpg">
              </div>
              <div class="form-group">
                <label for="imageAlt">説明テキスト:</label>
                <input type="text" id="imageAlt" class="form-input" placeholder="画像の説明">
              </div>
            </div>
            
            <!-- Google Drive方式 -->
            <div class="method-panel" id="drive-panel">
              <div class="drive-selection-area">
                <div class="drive-status" id="driveStatus">
                  <div class="status-checking">🔄 Google Drive接続を確認中...</div>
                </div>
                <button class="btn btn-primary" id="selectFromDrive" style="display: none;">
                  📁 Google Driveから画像を選択
                </button>
                <div class="selected-drive-file" id="selectedDriveFile" style="display: none;">
                  <div class="file-preview-small">
                    <img id="driveFilePreview" src="" alt="">
                  </div>
                  <div class="file-info-small">
                    <div class="file-name" id="driveFileName">-</div>
                    <div class="file-meta" id="driveFileMeta">-</div>
                  </div>
                  <button class="btn btn-secondary btn-small" id="changeDriveFile">変更</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="dialog-footer">
          <button class="btn btn-secondary" id="cancelImageInsert">キャンセル</button>
          <button class="btn btn-primary" id="confirmImageInsert" disabled>挿入</button>
        </div>
      </div>
    `;

    this.setupImageDialogEvents(dialog);
    return dialog;
  }

  setupImageDialogEvents(dialog) {
    let selectedImageData = null;
    let currentMethod = 'url';

    // タブ切り替え
    dialog.querySelectorAll('.method-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const method = tab.dataset.method;
        this.switchImageInsertMethod(dialog, method);
        currentMethod = method;
        this.updateImageInsertButton(dialog, currentMethod, selectedImageData);
      });
    });

    // 閉じるボタン
    dialog.querySelector('#closeImageDialog').addEventListener('click', () => {
      this.closeImageDialog(dialog);
    });

    // キャンセルボタン
    dialog.querySelector('#cancelImageInsert').addEventListener('click', () => {
      this.closeImageDialog(dialog);
    });

    // 挿入ボタン
    dialog.querySelector('#confirmImageInsert').addEventListener('click', () => {
      this.handleImageInsert(dialog, currentMethod, selectedImageData);
    });

    // URL入力の監視
    const urlInput = dialog.querySelector('#imageUrl');
    const altInput = dialog.querySelector('#imageAlt');
    
    [urlInput, altInput].forEach(input => {
      input.addEventListener('input', () => {
        this.updateImageInsertButton(dialog, currentMethod, selectedImageData);
      });
    });

    // Google Drive関連
    const selectFromDriveBtn = dialog.querySelector('#selectFromDrive');
    const changeDriveFileBtn = dialog.querySelector('#changeDriveFile');

    selectFromDriveBtn.addEventListener('click', async () => {
      await this.openGoogleDriveExplorer((fileData) => {
        selectedImageData = fileData;
        this.showSelectedDriveFile(dialog, fileData);
        this.updateImageInsertButton(dialog, currentMethod, selectedImageData);
      });
    });

    changeDriveFileBtn.addEventListener('click', async () => {
      await this.openGoogleDriveExplorer((fileData) => {
        selectedImageData = fileData;
        this.showSelectedDriveFile(dialog, fileData);
        this.updateImageInsertButton(dialog, currentMethod, selectedImageData);
      });
    });

    // モーダル背景クリックで閉じる
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        this.closeImageDialog(dialog);
      }
    });

    // Google Drive接続確認
    this.checkGoogleDriveConnection(dialog);
  }

  switchImageInsertMethod(dialog, method) {
    // タブの切り替え
    dialog.querySelectorAll('.method-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.method === method);
    });

    // パネルの切り替え  
    dialog.querySelectorAll('.method-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `${method}-panel`);
    });
  }

  async checkGoogleDriveConnection(dialog) {
    const statusEl = dialog.querySelector('#driveStatus');
    const selectBtn = dialog.querySelector('#selectFromDrive');

    try {
      const response = await fetch('http://127.0.0.1:8080/api/status');
      const data = await response.json();

      if (data.status === 'running' && data.driveServiceAvailable) {
        statusEl.innerHTML = '<div class="status-success">✅ Google Drive接続済み</div>';
        selectBtn.style.display = 'block';
      } else {
        statusEl.innerHTML = '<div class="status-warning">⚠️ Google Drive未接続</div>';
      }
    } catch (error) {
      statusEl.innerHTML = `
        <div class="status-error">
          ❌ Google Driveサービスに接続できません<br>
          <small>SightEditRelay.exeを起動してください</small>
        </div>
      `;
    }
  }

  async openGoogleDriveExplorer(onFileSelected) {
    // Google Drive Explorer の動的インポート
    if (!window.GoogleDriveExplorer) {
      try {
        const module = await import('../components/google-drive-explorer.js');
        window.GoogleDriveExplorer = module.default;
        
        // CSSの動的ロード
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '../components/google-drive-explorer.css';
        document.head.appendChild(link);
      } catch (error) {
        console.error('Google Drive Explorer のロードに失敗:', error);
        alert('Google Drive Explorerを読み込めませんでした。');
        return;
      }
    }

    const explorer = new window.GoogleDriveExplorer();
    await explorer.show(onFileSelected);
  }

  showSelectedDriveFile(dialog, fileData) {
    const selectedFileEl = dialog.querySelector('#selectedDriveFile');
    const selectBtnEl = dialog.querySelector('#selectFromDrive');
    
    selectedFileEl.style.display = 'flex';
    selectBtnEl.style.display = 'none';

    // プレビュー画像
    const previewImg = dialog.querySelector('#driveFilePreview');
    previewImg.src = fileData.url;
    previewImg.alt = fileData.alt || fileData.name;

    // ファイル情報
    dialog.querySelector('#driveFileName').textContent = fileData.name;
    dialog.querySelector('#driveFileMeta').textContent = 'Google Drive';

    // Alt textも自動設定
    const altInput = dialog.querySelector('#imageAlt');
    if (!altInput.value) {
      altInput.value = fileData.alt || fileData.name.replace(/\.[^/.]+$/, '');
    }
  }

  updateImageInsertButton(dialog, method, selectedImageData) {
    const insertBtn = dialog.querySelector('#confirmImageInsert');
    let isValid = false;

    if (method === 'url') {
      const url = dialog.querySelector('#imageUrl').value.trim();
      const alt = dialog.querySelector('#imageAlt').value.trim();
      isValid = url && alt;
    } else if (method === 'drive') {
      isValid = selectedImageData && selectedImageData.url;
    }

    insertBtn.disabled = !isValid;
  }

  handleImageInsert(dialog, method, selectedImageData) {
    let imageUrl, imageAlt;

    if (method === 'url') {
      imageUrl = dialog.querySelector('#imageUrl').value.trim();
      imageAlt = dialog.querySelector('#imageAlt').value.trim();
    } else if (method === 'drive') {
      imageUrl = selectedImageData.url;
      imageAlt = dialog.querySelector('#imageAlt').value.trim() || selectedImageData.alt;
    }

    if (imageUrl && imageAlt) {
      this.insertText(`![${imageAlt}](${imageUrl})`);
      this.closeImageDialog(dialog);
    }
  }

  closeImageDialog(dialog) {
    if (dialog && dialog.parentNode) {
      document.body.removeChild(dialog);
    }
  }

  insertTable() {
    const tableMarkdown = `\n| ヘッダー1 | ヘッダー2 | ヘッダー3 |\n|-----------|-----------|-----------|\n| セル1     | セル2     | セル3     |\n| セル4     | セル5     | セル6     |\n`;
    this.insertText(tableMarkdown);
  }

  toggleEditMode() {
    const editorContent = document.getElementById('editor');
    const sourceEditor = document.getElementById('source-editor');
    const modeLabel = document.getElementById('editor-mode');

    if (!this.isSourceMode) {
      // WYSIWYG → ソースモード
      const wysiwygContent = document.getElementById('wysiwyg-content');
      const markdown = wysiwygContent ? this.htmlToMarkdown(wysiwygContent.innerHTML) : '';

      sourceEditor.value = markdown;
      editorContent.style.display = 'none';
      sourceEditor.style.display = 'block';
      if (modeLabel) modeLabel.textContent = 'ソースモード';
      this.isSourceMode = true;
      sourceEditor.focus();
    } else {
      // ソース → WYSIWYGモード
      const markdown = sourceEditor.value;
      const wysiwygContent = document.getElementById('wysiwyg-content');

      if (wysiwygContent) {
        wysiwygContent.innerHTML = this.markdownToHtml(markdown);
        // タスクリストのイベントリスナーを設定
        setupTaskListEvents();
      }

      sourceEditor.style.display = 'none';
      editorContent.style.display = 'block';
      if (modeLabel) modeLabel.textContent = 'WYSIWYGモード';
      this.isSourceMode = false;

      if (wysiwygContent) {
        wysiwygContent.focus();
      }
    }

    this.updateWordCount();
  }

  generateTOC() {
    const content = this.getCurrentContent();
    const lines = content.split('\n');
    const headings = [];

    lines.forEach(line => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2];
        headings.push({ level, text });
      }
    });

    if (headings.length === 0) {
      alert('見出しが見つかりません。見出しを追加してから目次を生成してください。');
      return;
    }

    let toc = '## 目次\n\n';
    headings.forEach(heading => {
      const indent = '  '.repeat(heading.level - 1);
      const anchor = heading.text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      toc += `${indent}- [${heading.text}](#${anchor})\n`;
    });

    // 先頭に目次を挿入
    this.insertAtBeginning(toc + '\n');
  }

  insertAtBeginning(text) {
    if (this.isSourceMode) {
      const sourceEditor = document.getElementById('source-editor');
      sourceEditor.value = text + sourceEditor.value;
    } else {
      const wysiwygContent = document.getElementById('wysiwyg-content');
      if (wysiwygContent) {
        const currentHtml = wysiwygContent.innerHTML;
        const newMarkdown = text + this.htmlToMarkdown(currentHtml);
        wysiwygContent.innerHTML = this.markdownToHtml(newMarkdown);
        // タスクリストのイベントリスナーを設定
        setupTaskListEvents();
      }
    }
    this.updateWordCount();
  }

  getCurrentContent() {
    if (this.isSourceMode) {
      const sourceEditor = document.getElementById('source-editor');
      return sourceEditor.value;
    } else {
      const wysiwygContent = document.getElementById('wysiwyg-content');
      return wysiwygContent ? this.htmlToMarkdown(wysiwygContent.innerHTML) : '';
    }
  }

  // バージョン管理機能のためのエイリアス
  getMarkdownContent() {
    return this.getCurrentContent();
  }

  showHelp() {
    const helpContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <h2>📝 SightEdit ヘルプ</h2>

        <h3>🎯 基本操作</h3>
        <ul>
          <li><strong>📄 新規</strong>: 新しいドキュメントを作成</li>
          <li><strong>📂 開く</strong>: Markdownファイルを読み込み</li>
          <li><strong>💾 保存</strong>: Markdownファイルとして保存</li>
          <li><strong>🔄 モード</strong>: WYSIWYG/ソース表示を切り替え</li>
        </ul>

        <h3>📝 Markdown記法</h3>
        <ul>
          <li><strong># 見出し</strong>: 見出しレベル1-6</li>
          <li><strong>**太字**</strong>: 太字テキスト</li>
          <li><strong>*斜体*</strong>: 斜体テキスト</li>
          <li><strong>~~取り消し~~</strong>: 取り消し線</li>
          <li><strong>\`コード\`</strong>: インラインコード</li>
          <li><strong>[Link](url)</strong>: リンク</li>
          <li><strong>![Alt](url)</strong>: 画像</li>
          <li><strong>- 項目</strong>: 箇条書き</li>
          <li><strong>1. 項目</strong>: 番号付きリスト</li>
          <li><strong>> 引用</strong>: 引用文</li>
        </ul>

        <h3>🛠️ 高度な機能</h3>
        <ul>
          <li><strong>📊 表</strong>: テーブルの挿入と編集</li>
          <li><strong>📋 目次</strong>: 見出しから自動生成</li>
        </ul>
      </div>
    `;

    this.showModal('ヘルプ', helpContent);
  }

  // Subagents機能は削除済み

  showModal(title, content) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal-content';

    modal.innerHTML = `
      <div class="modal-header">
        <h2 class="modal-title">${title}</h2>
        <button id="modal-close" class="modal-close">&times;</button>
      </div>
      <div>${content}</div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // 閉じるボタンのイベント
    modal.querySelector('#modal-close').onclick = () => {
      document.body.removeChild(overlay);
    };

    // オーバーレイクリックで閉じる
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    };
  }

  newFile() {
    const currentContent = this.getCurrentContent();
    if (this.isModified && confirm('現在の変更は失われます。新規ファイルを作成しますか？')) {
      this.clearContent();
      this.currentFileName = null;
      this.originalContent = '';
      this.setModified(false);
    } else if (!this.isModified) {
      this.clearContent();
      this.currentFileName = null;
      this.originalContent = '';
      this.setModified(false);
    }
  }

  clearContent() {
    if (this.isSourceMode) {
      const sourceEditor = document.getElementById('source-editor');
      sourceEditor.value = '';
    } else {
      const wysiwygContent = document.getElementById('wysiwyg-content');
      if (wysiwygContent) {
        wysiwygContent.innerHTML = '';
      }
    }
    this.updateWordCount();
  }

  // リンク編集
  editLink(linkElement) {
    const currentText = linkElement.dataset.text || linkElement.textContent;
    const currentUrl = linkElement.dataset.url || linkElement.href;

    // カスタムダイアログを作成
    const dialog = document.createElement('div');
    dialog.className = 'edit-dialog-overlay';
    dialog.innerHTML = `
      <div class="edit-dialog-content">
        <h3 class="edit-dialog-title">リンクを編集</h3>
        <div class="edit-dialog-field">
          <label class="edit-dialog-label">リンクテキスト:</label>
          <input type="text" id="linkText" value="${currentText}" class="edit-dialog-input">
        </div>
        <div class="edit-dialog-field">
          <label class="edit-dialog-label">URL:</label>
          <input type="text" id="linkUrl" value="${currentUrl}" class="edit-dialog-input">
        </div>
        <div class="edit-dialog-buttons">
          <button id="openInNewTabBtn" class="edit-dialog-btn edit-dialog-btn-primary" style="margin-right: auto;">新しいタブで開く</button>
          <button id="cancelBtn" class="edit-dialog-btn edit-dialog-btn-cancel">キャンセル</button>
          <button id="okBtn" class="edit-dialog-btn edit-dialog-btn-ok">OK</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    // フォーカスをテキストフィールドに設定
    const textInput = dialog.querySelector('#linkText');
    const urlInput = dialog.querySelector('#linkUrl');
    textInput.focus();
    textInput.select();

    // イベントリスナー
    dialog.querySelector('#okBtn').onclick = () => {
      const newText = textInput.value.trim();
      const newUrl = urlInput.value.trim();

      if (newText && newUrl) {
        linkElement.textContent = newText;
        linkElement.href = newUrl;
        linkElement.dataset.text = newText;
        linkElement.dataset.url = newUrl;
      }
      document.body.removeChild(dialog);
    };

    dialog.querySelector('#cancelBtn').onclick = () => {
      document.body.removeChild(dialog);
    };

    // 新しいタブで開くボタン
    dialog.querySelector('#openInNewTabBtn').onclick = () => {
      const url = urlInput.value.trim();
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    };

    // Escapeキーでキャンセル
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.body.removeChild(dialog);
      }
    });
  }

  // 画像編集
  editImage(imgElement) {
    const currentAlt = imgElement.dataset.alt || imgElement.alt || '';
    const currentSrc = imgElement.dataset.src || imgElement.src || '';

    // カスタムダイアログを作成
    const dialog = document.createElement('div');
    dialog.className = 'edit-dialog-overlay';
    dialog.innerHTML = `
      <div class="edit-dialog-content">
        <h3 class="edit-dialog-title">画像を編集</h3>
        <div class="edit-dialog-field">
          <label class="edit-dialog-label">代替テキスト:</label>
          <input type="text" id="imageAlt" value="${currentAlt}" class="edit-dialog-input">
        </div>
        <div class="edit-dialog-field">
          <label class="edit-dialog-label">画像URL:</label>
          <input type="text" id="imageSrc" value="${currentSrc}" class="edit-dialog-input">
        </div>
        <div class="edit-dialog-buttons">
          <button id="cancelBtn" class="edit-dialog-btn edit-dialog-btn-cancel">キャンセル</button>
          <button id="okBtn" class="edit-dialog-btn edit-dialog-btn-ok">OK</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    // フォーカスを代替テキストフィールドに設定
    const altInput = dialog.querySelector('#imageAlt');
    const srcInput = dialog.querySelector('#imageSrc');
    altInput.focus();
    altInput.select();

    // イベントリスナー
    dialog.querySelector('#okBtn').onclick = () => {
      const newAlt = altInput.value.trim();
      const newSrc = srcInput.value.trim();

      if (newSrc) {
        imgElement.alt = newAlt;
        imgElement.src = newSrc;
        imgElement.dataset.alt = newAlt;
        imgElement.dataset.src = newSrc;
      }
      document.body.removeChild(dialog);
    };

    dialog.querySelector('#cancelBtn').onclick = () => {
      document.body.removeChild(dialog);
    };

    // Escapeキーでキャンセル
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.body.removeChild(dialog);
      }
    });
  }

  openFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.markdown,.txt';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target.result;

          if (this.isSourceMode) {
            const sourceEditor = document.getElementById('source-editor');
            sourceEditor.value = content;
          } else {
            const wysiwygContent = document.getElementById('wysiwyg-content');
            if (wysiwygContent) {
              wysiwygContent.innerHTML = this.markdownToHtml(content);
              // タスクリストのイベントリスナーを設定
              setupTaskListEvents();
            }
          }

          this.currentFileName = file.name;
          this.originalContent = content;
          this.setModified(false);
          this.updateWordCount();
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }

  async saveFile() {
    // バージョン履歴に保存
    if (this.versionIntegration) {
      try {
        await this.versionIntegration.showSaveDialog();
      } catch (error) {
        console.error('バージョン保存エラー:', error);
      }
    }

    if (this.currentFileName) {
      // 既存のファイル名で保存（上書き保存）
      const content = this.getCurrentContent();
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.currentFileName;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // ファイル名がない場合は名前を付けて保存
      this.saveAsFile();
    }
  }

  async saveAsFile() {
    // File System Access API を使用（ファイルを開くと同じネイティブダイアログ）
    if ('showSaveFilePicker' in window) {
      await this.saveWithFileSystemAPI();
    } else {
      // フォールバック: 古いブラウザ用
      this.saveWithLegacyDownload();
    }
  }
  
  async saveWithFileSystemAPI() {
    try {
      const content = this.getCurrentContent();
      const defaultFileName = this.currentFileName || 'document.md';
      
      // File System Access API を使用してネイティブな保存ダイアログを表示
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: defaultFileName,
        types: [
          {
            description: 'Markdown files',
            accept: {
              'text/markdown': ['.md', '.markdown'],
            },
          },
          {
            description: 'Text files',
            accept: {
              'text/plain': ['.txt'],
            },
          },
          {
            description: 'HTML files',
            accept: {
              'text/html': ['.html', '.htm'],
            },
          },
        ],
        excludeAcceptAllOption: false,
      });
      
      // ファイル名を更新
      this.currentFileName = fileHandle.name;
      this.originalContent = content;
      this.setModified(false);
      
      // ファイルに書き込み
      const writable = await fileHandle.createWritable();
      
      let contentToSave = content;
      
      // 拡張子に応じて内容を変換
      if (fileHandle.name.endsWith('.html') || fileHandle.name.endsWith('.htm')) {
        contentToSave = this.convertToHTML(content);
      }
      
      await writable.write(contentToSave);
      await writable.close();
      
      // 成功メッセージ（オプション）
      console.log(`ファイルを保存しました: ${fileHandle.name}`);
      
    } catch (error) {
      if (error.name === 'AbortError') {
        // ユーザーがキャンセルした場合は何もしない
        console.log('保存がキャンセルされました');
      } else {
        console.error('ファイル保存エラー:', error);
        
        // File System Access API が失敗した場合のフォールバック
        this.saveWithLegacyDownload();
      }
    }
  }
  
  saveWithLegacyDownload() {
    // 従来のダウンロード方式（フォールバック）
    const content = this.getCurrentContent();
    const defaultFileName = this.currentFileName || 'document.md';
    
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultFileName;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('レガシーダウンロードで保存しました');
  }
  
  convertToHTML(markdown) {
    // 簡単なHTML変換（既存のmarkdownToHtmlメソッドを使用）
    const html = this.markdownToHtml(markdown);
    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.currentFileName || 'Document'}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; padding: 20px; max-width: 800px; margin: 0 auto; }
    pre { background: #f4f4f4; padding: 10px; overflow-x: auto; }
    code { background: #f4f4f4; padding: 2px 4px; }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
  }

  updateWordCount() {
    const wordCountElement = document.getElementById('word-count');
    if (wordCountElement) {
      const content = this.getCurrentContent();
      const charCount = content.length;
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
      wordCountElement.textContent = `文字数: ${charCount} | 単語数: ${wordCount}`;
    }
  }

  updateFileNameDisplay() {
    const fileNameEl = document.getElementById('current-file-name');
    const modifiedIndicator = document.getElementById('file-modified-indicator');
    if (!fileNameEl) return;
    
    const fileName = this.currentFileName || '無題';
    fileNameEl.textContent = fileName;
    
    // 変更インジケーターを更新
    if (modifiedIndicator) {
      modifiedIndicator.style.display = this.isModified ? 'inline' : 'none';
    }
    
    // ページタイトルを更新
    document.title = `${fileName}${this.isModified ? ' *' : ''} - SightEdit`;
  }
  
  // ファイルの変更状態を設定
  setModified(modified) {
    this.isModified = modified;
    this.updateFileNameDisplay();
  }
  
  // ファイル名編集機能をセットアップ
  setupFileNameEditor() {
    const fileNameEl = document.getElementById('current-file-name');
    if (!fileNameEl) return;
    
    fileNameEl.addEventListener('click', () => {
      if (fileNameEl.classList.contains('editing')) return;
      
      const currentName = this.currentFileName || '無題';
      const input = document.createElement('input');
      input.type = 'text';
      input.value = currentName === '無題' ? '' : currentName;
      input.className = 'file-name editing';
      input.style.width = Math.max(100, currentName.length * 8 + 20) + 'px';
      
      const saveEdit = () => {
        const newName = input.value.trim();
        if (newName && newName !== '無題') {
          // .md 拡張子を自動追加
          this.currentFileName = newName.endsWith('.md') ? newName : newName + '.md';
        } else {
          this.currentFileName = null;
        }
        this.updateFileNameDisplay();
        fileNameEl.style.display = 'inline';
        input.remove();
      };
      
      const cancelEdit = () => {
        fileNameEl.style.display = 'inline';
        input.remove();
      };
      
      input.addEventListener('blur', saveEdit);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveEdit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancelEdit();
        }
      });
      
      fileNameEl.style.display = 'none';
      fileNameEl.parentNode.insertBefore(input, fileNameEl);
      input.focus();
      input.select();
    });
  }

  setupEventListeners() {
    // キーボードショートカット
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey)) {
        switch(e.key) {
          case 's':
            e.preventDefault();
            this.saveFile();
            break;
          case 'n':
            e.preventDefault();
            this.newFile();
            break;
          case 'o':
            e.preventDefault();
            this.openFile();
            break;
        }
      }
    });
    
    // ソースエディターの変更監視
    const sourceEditor = document.getElementById('source-editor');
    if (sourceEditor) {
      sourceEditor.addEventListener('input', () => {
        if (this.isSourceMode) {
          this.checkIfModified();
        }
      });
    }
    
    // ドラッグアンドドロップ機能を設定
    this.setupDragAndDrop();
    
    // ウィンドウタイトルからファイル名を取得する試み
    this.extractFileNameFromWindowTitle();
    
    // WYSIWYGエディターの変更監視は既存のhandleContentChangeで対応済み
  }

  getCaretPosition(element) {
    let caretOffset = 0;
    const selection = window.getSelection();

    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(element);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      caretOffset = preCaretRange.toString().length;
    }

    return caretOffset;
  }

  setCaretPosition(element, pos) {
    const selection = window.getSelection();
    const range = document.createRange();

    let charIndex = 0;
    let nodeStack = [element];
    let node;
    let foundStart = false;

    while (!foundStart && (node = nodeStack.pop())) {
      if (node.nodeType === Node.TEXT_NODE) {
        const nextCharIndex = charIndex + node.length;
        if (pos >= charIndex && pos <= nextCharIndex) {
          range.setStart(node, pos - charIndex);
          range.collapse(true);
          foundStart = true;
        }
        charIndex = nextCharIndex;
      } else {
        for (let i = node.childNodes.length - 1; i >= 0; i--) {
          nodeStack.push(node.childNodes[i]);
        }
      }
    }

    selection.removeAllRanges();
    selection.addRange(range);
  }

  // 初期ファイルデータを処理（サーバーから埋め込まれたデータ）
  handleInitialFileData() {
    console.log('🎯 初期ファイルデータチェック開始');
    
    // サーバーから埋め込まれたファイルデータをチェック
    if (window.INITIAL_FILE_DATA) {
      console.log('📁 初期ファイルデータ発見:', window.INITIAL_FILE_DATA);
      
      const { fileName, content, originalPath } = window.INITIAL_FILE_DATA;
      
      try {
        // コンテンツを設定
        this.setContent(content);
        
        // ファイル名と状態を更新
        this.currentFileName = fileName;
        this.originalContent = content;
        this.setModified(false);
        this.updateWordCount();
        
        console.log(`✅ 初期ファイルデータを正常に読み込みました: ${fileName}`);
        console.log(`📊 コンテンツサイズ: ${content.length}文字`);
        
        // 初期データを削除（メモリ節約）
        delete window.INITIAL_FILE_DATA;
        
        return true; // 初期データが処理されたことを示す
        
      } catch (error) {
        console.error('❌ 初期ファイルデータ処理エラー:', error);
        this.showModal('初期ファイル読み込みエラー', 
          `初期ファイルデータの処理に失敗しました。<br>
           エラー: ${error.message}`);
      }
    }
    
    // エラー情報をチェック
    if (window.INITIAL_FILE_ERROR) {
      console.error('❌ 初期ファイル読み込みエラー:', window.INITIAL_FILE_ERROR);
      
      const { message, path } = window.INITIAL_FILE_ERROR;
      this.showModal('ファイル読み込みエラー', 
        `ファイルの読み込みに失敗しました。<br>
         ファイル: ${path}<br>
         エラー: ${message}`);
      
      // エラー情報を削除
      delete window.INITIAL_FILE_ERROR;
    }
    
    return false; // 初期データが処理されなかったことを示す
  }

  // URLパラメータ処理
  handleURLFileParameter() {
    // 初期ファイルデータが既に処理されている場合はスキップ
    if (this.currentFileName && this.currentFileName !== '無題') {
      console.log('⏭️ 初期ファイルデータが既に処理されているためURLパラメータ処理をスキップ');
      return;
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const fileUrl = urlParams.get('file');
    
    console.log('🌐 URLパラメータ処理開始');
    console.log('📋 全URLパラメータ:', window.location.search);
    console.log('📄 fileパラメータ:', fileUrl);
    
    if (fileUrl) {
      console.log('📁 ファイルURL検出:', fileUrl);
      
      // file:// プロトコルの場合はセキュリティチェックをスキップ
      if (fileUrl.startsWith('file:///')) {
        console.log('🔓 ローカルファイルプロトコルを検出、セキュリティチェックをスキップ');
      } else if (!fileUrl.startsWith('http://localhost:') && !fileUrl.startsWith('https://localhost:')) {
        console.warn('⚠️ セキュリティ警告: localhost以外のURLは許可されていません:', fileUrl);
        this.showModal('セキュリティエラー', 
          'セキュリティ上の理由により、localhost以外のURLからのファイル読み込みは許可されていません。');
        return;
      }
      
      // URLの妥当性検証
      try {
        new URL(fileUrl);
      } catch (error) {
        console.error('無効なURL形式:', fileUrl);
        this.showModal('URLエラー', 
          '無効なURL形式です。正しいURLを指定してください。');
        return;
      }
      
      console.log('外部ファイルURLが指定されました:', fileUrl);
      this.loadFileFromURL(fileUrl);
    }
  }

  // HTTP経由でのファイル取得
  async loadFileFromURL(fileUrl) {
    try {
      console.log('ファイルを取得中:', fileUrl);
      
      // タイムアウト設定付きfetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒タイムアウト
      
      // CORS対応のfetchオプション
      const response = await fetch(fileUrl, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        signal: controller.signal,
        headers: {
          'Accept': 'text/plain,text/markdown,text/*,*/*'
        }
      });
      
      clearTimeout(timeoutId);
      
      // HTTPステータスチェック
      if (!response.ok) {
        let statusMessage = '';
        switch (response.status) {
          case 404:
            statusMessage = 'ファイルが見つかりません（404）';
            break;
          case 403:
            statusMessage = 'ファイルへのアクセスが拒否されました（403）';
            break;
          case 500:
            statusMessage = 'サーバー内部エラーが発生しました（500）';
            break;
          case 502:
          case 503:
            statusMessage = 'サーバーが一時的に利用できません';
            break;
          default:
            statusMessage = `サーバーエラー: ${response.status} ${response.statusText}`;
        }
        throw new Error(statusMessage);
      }
      
      // Content-Typeチェック
      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.includes('text/') && !contentType.includes('application/')) {
        console.warn('警告: テキストファイル以外の可能性があります:', contentType);
      }
      
      const content = await response.text();
      console.log('ファイル取得成功、コンテンツ長:', content.length);
      
      // コンテンツサイズの検証
      const maxSize = await this.getMaxFileSize();
      if (content.length > maxSize) {
        const sizeMB = Math.round(content.length / 1024 / 1024 * 10) / 10;
        const limitMB = Math.round(maxSize / 1024 / 1024);
        throw new Error(`ファイルサイズが大きすぎます（${sizeMB}MB > ${limitMB}MB制限）`);
      }
      
      // 空ファイルチェック
      if (content.length === 0) {
        console.warn('警告: 空のファイルです');
        this.showModal('ファイル読み込み警告', 
          'ファイルは空です。内容がないファイルが読み込まれました。');
      }
      
      // エディターにコンテンツを設定
      if (this.isSourceMode) {
        const sourceEditor = document.getElementById('source-editor');
        sourceEditor.value = content;
      } else {
        const wysiwygContent = document.getElementById('wysiwyg-content');
        if (wysiwygContent) {
          wysiwygContent.innerHTML = this.markdownToHtml(content);
          setupTaskListEvents();
        }
      }
      
      // ファイル名を推定して設定
      const filename = this.extractFilenameFromURL(fileUrl);
      console.log('📂 抽出されたファイル名:', filename);
      
      this.currentFileName = filename;
      this.originalContent = content;
      this.setModified(false);
      this.updateFileNameDisplay(); // ファイル名表示を更新
      this.updateWordCount();
      
      console.log('✅ 外部ファイルの読み込み完了:', filename);
      
      // 成功メッセージを表示（オプション）
      const statusElement = document.getElementById('word-count');
      if (statusElement) {
        const originalText = statusElement.textContent;
        statusElement.textContent = `✅ ${filename} を読み込み完了`;
        setTimeout(() => {
          this.updateWordCount(); // 元の表示に戻す
        }, 3000);
      }
      
    } catch (error) {
      // 詳細なエラーメッセージとユーザー向けガイダンス
      let errorMessage = '';
      let userGuidance = '';
      
      if (error.name === 'AbortError') {
        errorMessage = 'ファイル読み込みがタイムアウトしました（30秒）';
        userGuidance = '• 中継アプリが起動しているか確認してください<br>• ネットワーク接続を確認してください';
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'ネットワークエラー: 中継アプリが起動していない可能性があります';
        userGuidance = '• SightEditRelay.exeが起動しているか確認してください<br>• ポート8080が使用可能か確認してください';
      } else if (error.message.includes('CORS')) {
        errorMessage = 'CORS エラー: 中継アプリのCORS設定を確認してください';
        userGuidance = '• 中継アプリの設定でCORSが有効になっているか確認してください';
      } else if (error.message.includes('ファイルが見つかりません')) {
        errorMessage = error.message;
        userGuidance = '• ファイルパスが正しいか確認してください<br>• ファイルが存在するか確認してください';
      } else {
        errorMessage = error.message;
        userGuidance = '• 中継アプリとの接続を確認してください<br>• ファイルパスとファイル形式を確認してください';
      }
      
      console.error('外部ファイル読み込みエラー:', error);
      this.showModal('ファイル読み込みエラー', 
        `<div style="margin-bottom: 15px;"><strong>${errorMessage}</strong></div>
         <div style="color: #666; font-size: 14px;">
           <strong>解決方法:</strong><br>
           ${userGuidance}
         </div>`);
    }
  }

  // URLからファイル名を抽出
  extractFilenameFromURL(url) {
    console.log('🔍 ファイル名抽出開始 - 元URL:', url);
    
    try {
      // Windows file:// プロトコルの特別処理
      if (url.startsWith('file:///')) {
        console.log('📁 file://プロトコル検出');
        
        // file:///C:/path/to/file.md の形式を処理
        let filePath = decodeURIComponent(url.replace('file:///', ''));
        console.log('📂 デコード後のパス:', filePath);
        
        // Windows パス区切り文字で分割
        const pathParts = filePath.split(/[\\\/]/);
        const filename = pathParts[pathParts.length - 1];
        console.log('📄 抽出されたファイル名:', filename);
        
        return filename || 'local-file.md';
      }
      
      // 通常のHTTP URLの処理
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      console.log('🌐 URLパス名:', pathname);
      
      const filename = pathname.split('/').pop();
      console.log('📄 抽出されたファイル名:', filename);
      
      return filename || 'external-file.md';
      
    } catch (error) {
      console.error('❌ ファイル名抽出エラー:', error);
      console.log('🔧 フォールバック処理を実行');
      
      // フォールバック: 手動でファイル名を抽出
      const fallbackName = this.extractFilenameManually(url);
      console.log('🆘 フォールバック結果:', fallbackName);
      
      return fallbackName || 'unknown-file.md';
    }
  }
  
  // 手動でファイル名を抽出（フォールバック用）
  extractFilenameManually(url) {
    console.log('🛠️ 手動ファイル名抽出:', url);
    
    // 最後のスラッシュまたはバックスラッシュより後を取得
    const lastSlash = Math.max(url.lastIndexOf('/'), url.lastIndexOf('\\'));
    if (lastSlash !== -1) {
      const filename = url.substring(lastSlash + 1);
      console.log('✂️ 切り出し結果:', filename);
      
      // URLエンコードをデコード
      try {
        const decoded = decodeURIComponent(filename);
        console.log('🔓 デコード結果:', decoded);
        return decoded;
      } catch {
        return filename;
      }
    }
    
    return null;
  }

  // ドラッグアンドドロップ機能を設定
  setupDragAndDrop() {
    const dropZone = document.body;
    
    // ドラッグオーバーイベント
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('drag-over');
    });
    
    // ドラッグリーブイベント
    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // 子要素の場合は除外
      if (!dropZone.contains(e.relatedTarget)) {
        dropZone.classList.remove('drag-over');
      }
    });
    
    // ドロップイベント
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-over');
      
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        // 最初のファイルを処理
        this.handleDroppedFile(files[0]);
      }
    });
  }
  
  // ドロップされたファイルを処理
  async handleDroppedFile(file) {
    console.log('📋 ファイルドロップ:', file.name, file.type);
    
    // ファイルタイプをチェック
    if (!this.isSupportedFileType(file)) {
      this.showModal('ファイルタイプエラー', 
        `サポートされていないファイル形式です。<br>
         サポート形式: .md, .txt, .html`);
      return;
    }
    
    try {
      // ファイルを読み込み
      const content = await this.readFileAsText(file);
      
      // 現在の内容が変更されている場合は確認
      if (this.isModified) {
        const confirmed = confirm(`現在の変更は失われます。\n"${file.name}"を開きますか？`);
        if (!confirmed) return;
      }
      
      // コンテンツを設定
      this.setContent(content);
      
      // ファイル名と状態を更新
      this.currentFileName = file.name;
      this.originalContent = content;
      this.setModified(false);
      this.updateWordCount();
      
      console.log(`✅ ファイルを正常に読み込みました: ${file.name}`);
      
    } catch (error) {
      console.error('ファイル読み込みエラー:', error);
      this.showModal('ファイル読み込みエラー', 
        `ファイルの読み込みに失敗しました。<br>
         エラー: ${error.message}`);
    }
  }
  
  // サポートされたファイルタイプかチェック
  isSupportedFileType(file) {
    const supportedTypes = [
      'text/markdown',
      'text/plain', 
      'text/html',
      'application/octet-stream' // 拡張子で判定する必要がある場合
    ];
    
    const supportedExtensions = ['.md', '.txt', '.html', '.htm'];
    const fileExtension = this.getFileExtension(file.name).toLowerCase();
    
    return supportedTypes.includes(file.type) || 
           supportedExtensions.includes(fileExtension);
  }
  
  // ファイルの拡張子を取得
  getFileExtension(fileName) {
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex !== -1 ? fileName.slice(lastDotIndex) : '';
  }
  
  // ファイルをテキストとして読み込み
  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        resolve(e.target.result);
      };
      
      reader.onerror = (e) => {
        reject(new Error('ファイル読み込みエラー'));
      };
      
      reader.readAsText(file, 'utf-8');
    });
  }
  
  // ウィンドウタイトルからファイル名を抽出しようとする
  extractFileNameFromWindowTitle() {
    // ウィンドウタイトルをチェック
    const originalTitle = document.title;
    console.log('📝 ウィンドウタイトル:', originalTitle);
    
    // タイトルからファイル名を抽出するパターンを試す
    const patterns = [
      // パターン1: "filename.md - SightEdit"
      /^(.+\.(?:md|txt|html?))(?: - .+)?$/i,
      // パターン2: "フルパス\\filename.md"
      /[\\\/]([^\\\/]+\.(?:md|txt|html?))$/i,
      // パターン3: ただのファイル名
      /^([^\\\/\:*?"<>|]+\.(?:md|txt|html?))$/i
    ];
    
    for (const pattern of patterns) {
      const match = originalTitle.match(pattern);
      if (match && match[1]) {
        const extractedFileName = match[1];
        console.log('✅ ウィンドウタイトルからファイル名を抽出:', extractedFileName);
        
        // 既にファイル名が設定されていない場合のみ設定
        if (!this.currentFileName || this.currentFileName === '無題') {
          this.currentFileName = extractedFileName;
          this.updateFileNameDisplay();
        }
        
        break;
      }
    }
  }
  
  // コンテンツを設定する共通メソッド
  setContent(content) {
    if (this.isSourceMode) {
      const sourceEditor = document.getElementById('source-editor');
      if (sourceEditor) {
        sourceEditor.value = content;
      }
    } else {
      const wysiwygContent = document.getElementById('wysiwyg-content');
      if (wysiwygContent) {
        wysiwygContent.innerHTML = this.markdownToHtml(content);
      }
    }
  }

  // ファイルサイズ制限を取得
  async getMaxFileSize() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      try {
        const result = await new Promise((resolve) => {
          chrome.storage.sync.get(['maxFileSize'], resolve);
        });
        
        const maxSize = result.maxFileSize;
        if (maxSize && typeof maxSize === 'number' && maxSize > 0) {
          // 最小1MB、最大100MBに制限
          return Math.max(1024 * 1024, Math.min(maxSize, 100 * 1024 * 1024));
        }
      } catch (error) {
        console.warn('ファイルサイズ制限の設定取得に失敗:', error);
      }
    }
    
    // デフォルト10MB
    return 10 * 1024 * 1024;
  }

  // ファイルサイズ制限を設定
  async setMaxFileSize(sizeInMB) {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const sizeInBytes = Math.max(1, Math.min(sizeInMB, 100)) * 1024 * 1024;
      try {
        await new Promise((resolve) => {
          chrome.storage.sync.set({ maxFileSize: sizeInBytes }, resolve);
        });
        console.log(`ファイルサイズ制限を${sizeInMB}MBに設定しました`);
        return true;
      } catch (error) {
        console.error('ファイルサイズ制限の設定に失敗:', error);
        return false;
      }
    }
    return false;
  }

  // クリーンアップメソッド
  cleanup() {
    console.log('エディターのクリーンアップを開始...');

    // バージョン管理機能のクリーンアップ
    if (this.versionIntegration) {
      try {
        this.versionIntegration.cleanup();
        console.log('バージョン管理機能のクリーンアップ完了');
      } catch (error) {
        console.error('バージョン管理機能のクリーンアップエラー:', error);
      }
    }

    // ローカル履歴機能のクリーンアップ
    if (this.localHistoryIntegration) {
      try {
        this.localHistoryIntegration.cleanup();
        console.log('ローカル履歴機能のクリーンアップ完了');
      } catch (error) {
        console.error('ローカル履歴機能のクリーンアップエラー:', error);
      }
    }

    console.log('エディターのクリーンアップが完了しました');
  }
}

// タスクリストのチェックボックス切り替え関数
window.toggleTaskStrike = function(checkbox) {
  const taskText = checkbox.parentNode.querySelector('.task-text');
  if (taskText) {
    if (checkbox.checked) {
      taskText.style.textDecoration = 'line-through';
      taskText.style.color = '#6c757d';
    } else {
      taskText.style.textDecoration = 'none';
      taskText.style.color = '';
    }
  }
};

// タスクリストのイベントリスナーを設定する関数
function setupTaskListEvents() {
  const wysiwygContent = document.getElementById('wysiwyg-content');
  if (wysiwygContent) {
    // 既存のリスナーを削除（重複防止）
    const checkboxes = wysiwygContent.querySelectorAll('.task-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.removeEventListener('change', window.toggleTaskStrike);
      checkbox.addEventListener('change', function() {
        window.toggleTaskStrike(this);
      });
    });
  }
}

// AIコマンド機能の追加
class AICommandUI {
  constructor(editor) {
    this.editor = editor;
    this.commandManager = null;
    this.currentSelectedText = '';
    this.init();
  }

  async init() {
    // AICommandManagerを動的にインポート
    try {
      const { getAICommandManager } = await import('../lib/ai-command-manager.js');
      this.commandManager = getAICommandManager();
      this.setupEventListeners();
      this.renderCommandPanel();
    } catch (error) {
      console.error('AIコマンドマネージャーの読み込みに失敗しました:', error);
    }
  }

  setupEventListeners() {
    // AIコマンドボタンのクリックイベント
    const aiCommandBtn = document.getElementById('ai-command-btn');
    const modal = document.getElementById('ai-command-modal');
    const closeBtn = document.getElementById('ai-command-close');

    if (aiCommandBtn) {
      aiCommandBtn.addEventListener('click', () => {
        this.showCommandPanel();
      });
    }

    // モーダルを閉じる
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hideCommandPanel();
      });
    }

    // モーダル背景クリックで閉じる
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.hideCommandPanel();
        }
      });
    }

    // 入力ダイアログのイベント
    const inputCancel = document.getElementById('command-input-cancel');
    const inputConfirm = document.getElementById('command-input-confirm');

    if (inputCancel) {
      inputCancel.addEventListener('click', () => {
        this.hideInputDialog();
      });
    }

    if (inputConfirm) {
      inputConfirm.addEventListener('click', () => {
        this.confirmInput();
      });
    }
  }

  showCommandPanel() {
    // 選択されたテキストを取得
    this.currentSelectedText = this.getSelectedText();
    
    const modal = document.getElementById('ai-command-modal');
    const preview = document.getElementById('selected-text-preview');
    const content = document.getElementById('selected-text-content');

    if (this.currentSelectedText) {
      preview.style.display = 'block';
      content.textContent = this.currentSelectedText;
    } else {
      preview.style.display = 'none';
      this.currentSelectedText = this.editor.getCurrentContent();
    }

    modal.style.display = 'flex';
  }

  hideCommandPanel() {
    const modal = document.getElementById('ai-command-modal');
    modal.style.display = 'none';
  }

  renderCommandPanel() {
    if (!this.commandManager) return;

    const container = document.getElementById('ai-command-panel-content');
    if (container) {
      container.innerHTML = this.commandManager.generateCommandPanelHTML();
      this.attachCommandListeners();
    }
  }

  attachCommandListeners() {
    const commandButtons = document.querySelectorAll('.command-button');
    commandButtons.forEach(button => {
      button.addEventListener('click', () => {
        const commandId = button.dataset.commandId;
        this.executeCommand(commandId);
      });
    });
  }

  async executeCommand(commandId) {
    if (!this.commandManager) return;

    const command = this.commandManager.commands[commandId];
    if (!command) return;

    try {
      let params = {};

      // 入力が必要な場合
      if (command.requiresInput) {
        const inputValue = await this.showInputDialog(command.inputField);
        if (inputValue === null) return; // キャンセルされた
        params[command.inputField.name] = inputValue;
      }

      // ローディング表示
      this.showLoading(true);

      // コマンド実行
      const result = await this.commandManager.executeCommand(
        commandId, 
        this.currentSelectedText, 
        params
      );

      this.showLoading(false);

      if (result.success) {
        // 結果をエディターに反映
        this.applyResult(result.result);
        this.hideCommandPanel();
      } else {
        alert('エラーが発生しました: ' + result.error);
      }

    } catch (error) {
      this.showLoading(false);
      console.error('コマンド実行エラー:', error);
      alert('コマンドの実行に失敗しました: ' + error.message);
    }
  }

  showInputDialog(inputField) {
    return new Promise((resolve) => {
      const dialog = document.getElementById('command-input-dialog');
      const title = document.getElementById('command-input-title');
      const field = document.getElementById('command-input-field');

      title.textContent = inputField.label;
      field.value = inputField.default || '';
      field.type = inputField.type || 'text';
      field.placeholder = inputField.placeholder || '値を入力してください';

      dialog.style.display = 'block';
      field.focus();

      this.inputResolve = resolve;
    });
  }

  hideInputDialog() {
    const dialog = document.getElementById('command-input-dialog');
    dialog.style.display = 'none';
    if (this.inputResolve) {
      this.inputResolve(null);
    }
  }

  confirmInput() {
    const field = document.getElementById('command-input-field');
    const value = field.value.trim();
    
    this.hideInputDialog();
    if (this.inputResolve) {
      this.inputResolve(value || null);
    }
  }

  showLoading(show) {
    const loading = document.getElementById('ai-command-loading');
    if (loading) {
      loading.style.display = show ? 'flex' : 'none';
    }
  }

  getSelectedText() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      return selection.toString().trim();
    }
    return '';
  }

  applyResult(result) {
    if (this.editor.isSourceMode) {
      // ソースモードの場合
      const sourceEditor = document.getElementById('source-editor');
      if (this.currentSelectedText && sourceEditor.value.includes(this.currentSelectedText)) {
        sourceEditor.value = sourceEditor.value.replace(this.currentSelectedText, result);
      } else {
        sourceEditor.value = result;
      }
    } else {
      // WYSIWYGモードの場合
      const wysiwygContent = document.getElementById('wysiwyg-content');
      if (this.currentSelectedText) {
        // 選択されたテキストを置換
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          const textNode = document.createTextNode(result);
          range.insertNode(textNode);
          range.collapse(false);
        }
      } else {
        // 全体を置換
        wysiwygContent.innerHTML = this.editor.markdownToHtml(result);
      }
    }
    
    this.editor.updateWordCount();
  }
}

// エクスポート機能の追加
class ExportUI {
  constructor(editor) {
    this.editor = editor;
    this.exportManager = null;
    this.init();
  }

  async init() {
    try {
      const { getExportManager } = await import('../lib/export-manager.js');
      this.exportManager = getExportManager();
      this.setupEventListeners();
      this.renderExportMenu();
    } catch (error) {
      console.error('エクスポートマネージャーの読み込みに失敗しました:', error);
    }
  }

  setupEventListeners() {
    const exportBtn = document.getElementById('export-btn');
    const menu = document.getElementById('export-menu');
    const closeBtn = document.getElementById('export-menu-close');

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.showExportMenu();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hideExportMenu();
      });
    }

    if (menu) {
      menu.addEventListener('click', (e) => {
        if (e.target === menu) {
          this.hideExportMenu();
        }
      });
    }
  }

  showExportMenu() {
    const menu = document.getElementById('export-menu');
    menu.style.display = 'flex';
  }

  hideExportMenu() {
    const menu = document.getElementById('export-menu');
    menu.style.display = 'none';
  }

  renderExportMenu() {
    if (!this.exportManager) return;

    this.renderServiceCategories();
  }

  renderServiceCategories() {
    const clipboardContainer = document.getElementById('clipboard-buttons');
    const downloadContainer = document.getElementById('download-buttons');
    
    if (!clipboardContainer || !downloadContainer) return;

    const serviceFormats = this.exportManager.getServiceOptimizedFormats();
    
    // クリップボード用（コピー&ペースト）
    const clipboardServices = [];
    const downloadServices = [];
    
    Object.values(serviceFormats).forEach(category => {
      category.services.forEach(service => {
        if (service.type === 'clipboard') {
          clipboardServices.push({ ...service, categoryName: category.name });
        } else if (service.type === 'download') {
          downloadServices.push({ ...service, categoryName: category.name });
        }
      });
    });

    // クリップボード用サービス表示
    clipboardContainer.innerHTML = this.generateServiceButtons(clipboardServices, 'clipboard');
    
    // ダウンロード用サービス表示
    downloadContainer.innerHTML = this.generateServiceButtons(downloadServices, 'download');
    
    // イベントリスナーを追加
    this.attachServiceEventListeners();
  }

  generateServiceButtons(services, type) {
    return services.map(service => `
      <button class="export-button" data-service-id="${service.id}" data-type="${type}" title="${service.description}">
        <span class="export-button-icon">${service.icon}</span>
        <div class="export-button-content">
          <div class="export-button-name">${service.name}</div>
          <div class="export-button-description">${service.description}</div>
        </div>
      </button>
    `).join('');
  }

  attachServiceEventListeners() {
    const allButtons = document.querySelectorAll('.export-button[data-service-id]');
    allButtons.forEach(button => {
      button.addEventListener('click', () => {
        const serviceId = button.dataset.serviceId;
        const type = button.dataset.type;
        if (type === 'clipboard') {
          this.executeServiceExport(serviceId);
        } else if (type === 'download') {
          this.executeServiceDownload(serviceId);
        }
      });
    });
  }

  async executeServiceExport(serviceId) {
    if (!this.exportManager) return;

    const content = this.editor.getCurrentContent();
    const serviceFormats = this.exportManager.getServiceOptimizedFormats();
    
    // サービスを検索
    let targetService = null;
    Object.values(serviceFormats).forEach(category => {
      const found = category.services.find(s => s.id === serviceId);
      if (found) targetService = found;
    });

    if (!targetService) return;

    try {
      const success = await targetService.action(content);
      if (success) {
        this.showMessage(`${targetService.name}向けにクリップボードにコピーしました`, 'success');
        this.hideExportMenu();
      } else {
        this.showMessage('クリップボードへのコピーに失敗しました', 'error');
      }
    } catch (error) {
      console.error('サービスエクスポートエラー:', error);
      this.showMessage('エクスポートに失敗しました: ' + error.message, 'error');
    }
  }

  async executeServiceDownload(serviceId) {
    if (!this.exportManager) return;

    const content = this.editor.getCurrentContent();
    const serviceFormats = this.exportManager.getServiceOptimizedFormats();
    
    // サービスを検索
    let targetService = null;
    Object.values(serviceFormats).forEach(category => {
      const found = category.services.find(s => s.id === serviceId);
      if (found) targetService = found;
    });

    if (!targetService) return;

    try {
      const filename = this.generateFilename(targetService.format);
      await targetService.action(content, filename);
      this.showMessage(`${targetService.name}をダウンロードしました`, 'success');
      this.hideExportMenu();
    } catch (error) {
      console.error('ダウンロードエクスポートエラー:', error);
      this.showMessage('ダウンロードに失敗しました: ' + error.message, 'error');
    }
  }

  generateFilename(format) {
    const baseName = this.editor.currentFileName || 'document';
    const nameWithoutExt = baseName.replace(/\.[^/.]+$/, '');
    
    const extensions = {
      'markdown': '.md',
      'html': '.html',
      'pdf': '.pdf',
      'docx': '.docx',
      'text': '.txt'
    };

    return nameWithoutExt + (extensions[format] || '.txt');
  }

  showMessage(text, type = 'success') {
    const existing = document.querySelector('.export-message');
    if (existing) {
      existing.remove();
    }

    const message = document.createElement('div');
    message.className = `export-message ${type}`;
    message.textContent = text;
    document.body.appendChild(message);

    setTimeout(() => {
      message.remove();
    }, 3000);
  }
}

// 検索・置換機能クラス
class SearchReplaceManager {
  constructor(editor) {
    this.editor = editor;
    this.isVisible = false;
    this.currentMatches = [];
    this.currentMatchIndex = -1;
    this.lastSearchTerm = '';
    this.highlightClass = 'search-highlight';
    this.currentHighlightClass = 'search-highlight current';
    
    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.overlay = document.getElementById('search-replace-overlay');
    this.dialog = this.overlay.querySelector('.search-replace-dialog');
    this.searchInput = document.getElementById('search-input');
    this.replaceInput = document.getElementById('replace-input');
    this.searchCount = document.getElementById('search-count');
    this.matchCaseCheckbox = document.getElementById('match-case');
    this.wholeWordCheckbox = document.getElementById('whole-word');
    this.regexCheckbox = document.getElementById('use-regex');
    this.searchPrevBtn = document.getElementById('search-prev');
    this.searchNextBtn = document.getElementById('search-next');
    this.replaceCurrentBtn = document.getElementById('replace-current');
    this.replaceAllBtn = document.getElementById('replace-all');
    this.searchCloseBtn = document.getElementById('search-close');
    this.searchReplaceCloseBtn = document.getElementById('search-replace-close');
    this.searchReplaceBtn = document.getElementById('search-replace-btn');
  }

  bindEvents() {
    // 検索ボタン
    this.searchReplaceBtn.addEventListener('click', () => this.show());
    
    // 閉じるボタン
    this.searchCloseBtn.addEventListener('click', () => this.hide());
    this.searchReplaceCloseBtn.addEventListener('click', () => this.hide());
    
    // オーバーレイクリック
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.hide();
    });
    
    // 検索入力
    this.searchInput.addEventListener('input', () => this.performSearch());
    this.searchInput.addEventListener('keydown', (e) => this.handleSearchInputKeydown(e));
    
    // 置換入力
    this.replaceInput.addEventListener('keydown', (e) => this.handleReplaceInputKeydown(e));
    
    // オプション変更
    this.matchCaseCheckbox.addEventListener('change', () => this.performSearch());
    this.wholeWordCheckbox.addEventListener('change', () => this.performSearch());
    this.regexCheckbox.addEventListener('change', () => this.performSearch());
    
    // ナビゲーションボタン
    this.searchPrevBtn.addEventListener('click', () => this.goToPreviousMatch());
    this.searchNextBtn.addEventListener('click', () => this.goToNextMatch());
    
    // 置換ボタン
    this.replaceCurrentBtn.addEventListener('click', () => this.replaceCurrent());
    this.replaceAllBtn.addEventListener('click', () => this.replaceAll());

    // フォーム送信防止
    this.dialog.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.goToNextMatch();
    });
  }

  show() {
    this.isVisible = true;
    this.overlay.style.display = 'flex';
    
    // 選択テキストがある場合、検索欄にセット
    const selectedText = this.getSelectedText();
    if (selectedText) {
      this.searchInput.value = selectedText;
    }
    
    this.searchInput.focus();
    this.searchInput.select();
    
    // 検索を実行
    if (this.searchInput.value) {
      this.performSearch();
    }
  }

  hide() {
    this.isVisible = false;
    this.overlay.style.display = 'none';
    this.clearHighlights();
    this.currentMatches = [];
    this.currentMatchIndex = -1;
    this.updateUI();
    
    // エディターにフォーカスを戻す
    this.editor.focus();
  }

  getSelectedText() {
    const selection = window.getSelection();
    return selection.toString().trim();
  }

  performSearch() {
    const searchTerm = this.searchInput.value;
    
    if (!searchTerm) {
      this.clearHighlights();
      this.currentMatches = [];
      this.currentMatchIndex = -1;
      this.updateUI();
      return;
    }

    this.lastSearchTerm = searchTerm;
    this.findMatches(searchTerm);
    this.highlightMatches();
    this.updateUI();
    
    if (this.currentMatches.length > 0) {
      this.currentMatchIndex = 0;
      this.scrollToCurrentMatch();
    }
  }

  findMatches(searchTerm) {
    this.clearHighlights();
    this.currentMatches = [];
    
    const content = this.getEditorContent();
    if (!content) return;
    
    try {
      const regex = this.createSearchRegex(searchTerm);
      const matches = [...content.matchAll(regex)];
      
      this.currentMatches = matches.map(match => ({
        index: match.index,
        length: match[0].length,
        text: match[0]
      }));
    } catch (error) {
      console.error('検索エラー:', error);
      this.showError('検索パターンにエラーがあります');
    }
  }

  createSearchRegex(searchTerm) {
    let pattern = searchTerm;
    let flags = 'g';
    
    if (!this.regexCheckbox.checked) {
      // 正規表現でない場合はエスケープ
      pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    if (this.wholeWordCheckbox.checked) {
      pattern = `\\b${pattern}\\b`;
    }
    
    if (!this.matchCaseCheckbox.checked) {
      flags += 'i';
    }
    
    return new RegExp(pattern, flags);
  }

  getEditorContent() {
    // WYSIWYGモードとソースモードの両方に対応
    if (this.editor.isSourceMode && this.editor.isSourceMode()) {
      const sourceEditor = document.getElementById('source-editor');
      return sourceEditor ? sourceEditor.value : '';
    } else {
      const editorElement = document.getElementById('editor') || document.querySelector('.editor-content');
      return editorElement ? editorElement.textContent || editorElement.innerText : '';
    }
  }

  highlightMatches() {
    if (this.currentMatches.length === 0) return;
    
    // WYSIWYGモードの場合のハイライト処理
    if (!this.editor.isSourceMode || !this.editor.isSourceMode()) {
      this.highlightInWysiwyg();
    }
  }

  highlightInWysiwyg() {
    const editorElement = document.getElementById('editor') || document.querySelector('.editor-content');
    if (!editorElement) return;
    
    const walker = document.createTreeWalker(
      editorElement,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }
    
    // テキストノードを後ろから処理（インデックスの変更を避けるため）
    for (let i = textNodes.length - 1; i >= 0; i--) {
      const textNode = textNodes[i];
      this.highlightTextNode(textNode);
    }
  }

  highlightTextNode(textNode) {
    const text = textNode.textContent;
    const regex = this.createSearchRegex(this.lastSearchTerm);
    const matches = [...text.matchAll(regex)];
    
    if (matches.length === 0) return;
    
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    
    matches.forEach(match => {
      // マッチ前のテキスト
      if (match.index > lastIndex) {
        fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
      }
      
      // ハイライト要素
      const highlight = document.createElement('span');
      highlight.className = this.highlightClass;
      highlight.textContent = match[0];
      highlight.dataset.searchMatch = 'true';
      fragment.appendChild(highlight);
      
      lastIndex = match.index + match[0].length;
    });
    
    // 残りのテキスト
    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
    }
    
    textNode.parentNode.replaceChild(fragment, textNode);
  }

  clearHighlights() {
    const highlights = document.querySelectorAll(`.${this.highlightClass.replace(' ', '.')}`);
    highlights.forEach(highlight => {
      const parent = highlight.parentNode;
      parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
      parent.normalize(); // 隣接するテキストノードを結合
    });
  }

  goToNextMatch() {
    if (this.currentMatches.length === 0) return;
    
    this.currentMatchIndex = (this.currentMatchIndex + 1) % this.currentMatches.length;
    this.scrollToCurrentMatch();
    this.updateCurrentHighlight();
  }

  goToPreviousMatch() {
    if (this.currentMatches.length === 0) return;
    
    this.currentMatchIndex = this.currentMatchIndex <= 0 
      ? this.currentMatches.length - 1 
      : this.currentMatchIndex - 1;
    this.scrollToCurrentMatch();
    this.updateCurrentHighlight();
  }

  updateCurrentHighlight() {
    // 全てのハイライトから current クラスを削除
    document.querySelectorAll('.search-highlight.current').forEach(el => {
      el.classList.remove('current');
    });
    
    // 現在のマッチをハイライト
    const highlights = document.querySelectorAll('.search-highlight');
    if (highlights[this.currentMatchIndex]) {
      highlights[this.currentMatchIndex].classList.add('current');
    }
  }

  scrollToCurrentMatch() {
    const highlights = document.querySelectorAll('.search-highlight');
    if (highlights[this.currentMatchIndex]) {
      highlights[this.currentMatchIndex].scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  }

  replaceCurrent() {
    const replaceText = this.replaceInput.value;
    const highlights = document.querySelectorAll('.search-highlight');
    
    if (!highlights[this.currentMatchIndex]) return;
    
    const currentHighlight = highlights[this.currentMatchIndex];
    currentHighlight.textContent = replaceText;
    currentHighlight.classList.remove('search-highlight', 'current');
    
    // マッチリストから削除
    this.currentMatches.splice(this.currentMatchIndex, 1);
    
    if (this.currentMatchIndex >= this.currentMatches.length) {
      this.currentMatchIndex = 0;
    }
    
    this.updateUI();
    
    if (this.currentMatches.length > 0) {
      this.updateCurrentHighlight();
    }
  }

  replaceAll() {
    const replaceText = this.replaceInput.value;
    const highlights = document.querySelectorAll('.search-highlight');
    
    let count = 0;
    highlights.forEach(highlight => {
      highlight.textContent = replaceText;
      highlight.classList.remove('search-highlight', 'current');
      count++;
    });
    
    this.currentMatches = [];
    this.currentMatchIndex = -1;
    this.updateUI();
    
    this.showMessage(`${count}件を置換しました`);
  }

  updateUI() {
    const matchCount = this.currentMatches.length;
    const currentIndex = this.currentMatchIndex + 1;
    
    // カウント表示
    if (matchCount > 0) {
      this.searchCount.textContent = `${currentIndex}/${matchCount}`;
      this.searchCount.style.display = 'inline';
    } else if (this.searchInput.value) {
      this.searchCount.textContent = '0/0';
      this.searchCount.style.display = 'inline';
    } else {
      this.searchCount.style.display = 'none';
    }
    
    // ボタンの有効/無効
    const hasMatches = matchCount > 0;
    const hasSearch = this.searchInput.value.length > 0;
    
    this.searchPrevBtn.disabled = !hasMatches;
    this.searchNextBtn.disabled = !hasMatches;
    this.replaceCurrentBtn.disabled = !hasMatches;
    this.replaceAllBtn.disabled = !hasMatches || !hasSearch;
  }

  handleSearchInputKeydown(e) {
    switch(e.key) {
      case 'Enter':
        e.preventDefault();
        if (e.shiftKey) {
          this.goToPreviousMatch();
        } else {
          this.goToNextMatch();
        }
        break;
      case 'Escape':
        this.hide();
        break;
    }
  }

  handleReplaceInputKeydown(e) {
    switch(e.key) {
      case 'Enter':
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) {
          this.replaceAll();
        } else {
          this.replaceCurrent();
        }
        break;
      case 'Escape':
        this.hide();
        break;
    }
  }

  showMessage(message) {
    // 既存のメッセージがある場合は削除
    const existing = document.querySelector('.search-message');
    if (existing) existing.remove();
    
    const messageEl = document.createElement('div');
    messageEl.className = 'search-message';
    messageEl.textContent = message;
    messageEl.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #28a745;
      color: white;
      padding: 10px 15px;
      border-radius: 4px;
      z-index: 10006;
      font-size: 14px;
    `;
    
    document.body.appendChild(messageEl);
    
    setTimeout(() => {
      messageEl.remove();
    }, 3000);
  }

  showError(message) {
    // 既存のメッセージがある場合は削除
    const existing = document.querySelector('.search-message');
    if (existing) existing.remove();
    
    const messageEl = document.createElement('div');
    messageEl.className = 'search-message';
    messageEl.textContent = message;
    messageEl.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #dc3545;
      color: white;
      padding: 10px 15px;
      border-radius: 4px;
      z-index: 10006;
      font-size: 14px;
    `;
    
    document.body.appendChild(messageEl);
    
    setTimeout(() => {
      messageEl.remove();
    }, 5000);
  }
}

// グローバルにUI機能を初期化
let aiCommandUI = null;
let exportUI = null;
let chatPanel = null;
let chatManager = null;
let searchReplaceManager = null;

// エディター初期化後に機能を追加
document.addEventListener('DOMContentLoaded', () => {
  const editor = new SimpleMarkdownEditor();

  // グローバルアクセス用
  window.editorManager = editor;

  // 機能の初期化
  setTimeout(async () => {
    aiCommandUI = new AICommandUI(editor);
    exportUI = new ExportUI(editor);
    searchReplaceManager = new SearchReplaceManager(editor);
    // 図表生成機能を初期化（同期実行）
    setTimeout(() => {
      initializeDiagramFeature();
    }, 100);

    // グローバルアクセス用
    window.aiCommandUI = aiCommandUI;
    window.exportUI = exportUI;
    window.searchReplaceManager = searchReplaceManager;

    // AICommandManager を aiManager として公開（AICommandManager は AIManager を拡張）
    if (aiCommandUI.commandManager) {
      window.aiManager = aiCommandUI.commandManager;
    }

    // AI チャット機能の初期化
    await initChatFeature(editor);

    // キーボードショートカットの設定
    setupKeyboardShortcuts();
  }, 100);
});

// AI チャット機能の初期化
async function initChatFeature(editor) {
  try {
    // ChatStorage の初期化
    const chatStorage = new ChatStorage();
    await chatStorage.initDB();
    console.log('ChatStorage initialized');

    // PromptManager の初期化
    const promptManager = getPromptManager();
    await promptManager.init();
    console.log('PromptManager initialized');

    // PromptLibrary の初期化
    const promptLibrary = new PromptLibrary(promptManager);

    // StyleController の初期化
    const styleController = getStyleController();
    await styleController.init();
    console.log('StyleController initialized');

    // StructuredGenerator の初期化
    const structuredGenerator = getStructuredGenerator();
    console.log('StructuredGenerator initialized');

    // AIChatManager の初期化（aiManagerが設定されるまで待つ）
    const waitForAIManager = setInterval(() => {
      if (window.aiManager) {
        clearInterval(waitForAIManager);

        chatManager = new AIChatManager(window.aiManager, promptManager, chatStorage);

        // StructuredGenerationModal の初期化
        const structuredGenerationModal = new StructuredGenerationModal(structuredGenerator, chatManager);

        // ExportImportManager の初期化
        const exportImportManager = new ExportImportManager();

        // ChatPanel の初期化（structuredGenerator, structuredGenerationModal, exportImportManagerを追加）
        chatPanel = new ChatPanel(chatManager, promptManager, promptLibrary, styleController, structuredGenerator, structuredGenerationModal, exportImportManager);
        chatPanel.render();

        // グローバルアクセス用
        window.chatPanel = chatPanel;
        window.chatManager = chatManager;
        window.chatStorage = chatStorage;
        window.promptManager = promptManager;
        window.promptLibrary = promptLibrary;
        window.styleController = styleController;
        window.structuredGenerator = structuredGenerator;
        window.structuredGenerationModal = structuredGenerationModal;
        window.exportImportManager = exportImportManager;

        // チャットトグルボタンのイベントリスナー
        const chatToggleBtn = document.getElementById('chat-toggle-btn');
        if (chatToggleBtn) {
          chatToggleBtn.addEventListener('click', () => {
            chatPanel.toggle();
          });
        }

        console.log('Chat feature initialized');
      }
    }, 50);

    // タイムアウト（5秒後）
    setTimeout(() => {
      clearInterval(waitForAIManager);
      if (!window.aiManager) {
        console.error('AIManager not available after timeout');
      }
    }, 5000);

  } catch (error) {
    console.error('Failed to initialize chat feature:', error);
  }
}

// キーボードショートカットの設定
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl+F: 検索・置換ダイアログを開く
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      if (searchReplaceManager) {
        searchReplaceManager.show();
      }
    }

    // Ctrl+H: 検索・置換ダイアログを開く（置換フィールドにフォーカス）
    if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
      e.preventDefault();
      if (searchReplaceManager) {
        searchReplaceManager.show();
        // 少し遅延させて置換フィールドにフォーカス
        setTimeout(() => {
          if (searchReplaceManager.replaceInput) {
            searchReplaceManager.replaceInput.focus();
          }
        }, 100);
      }
    }

    // F3: 次を検索
    if (e.key === 'F3' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      if (searchReplaceManager && searchReplaceManager.currentMatches.length > 0) {
        searchReplaceManager.goToNextMatch();
      }
    }

    // Shift+F3: 前を検索
    if (e.key === 'F3' && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      if (searchReplaceManager && searchReplaceManager.currentMatches.length > 0) {
        searchReplaceManager.goToPreviousMatch();
      }
    }

    // Escape: 検索ダイアログを閉じる（検索ダイアログが開いている場合のみ）
    if (e.key === 'Escape' && searchReplaceManager && searchReplaceManager.isVisible) {
      e.preventDefault();
      searchReplaceManager.hide();
      return;
    }

    // Ctrl+K: チャットパネルのトグル
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (chatPanel) {
        chatPanel.toggle();
      }
    }

    // Ctrl+L: 会話クリア
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
      e.preventDefault();
      if (chatPanel && chatPanel.isVisible) {
        if (confirm('会話をクリアしますか？')) {
          chatPanel.clearMessages();
          if (chatManager) {
            chatManager.currentSession = null;
          }
        }
      }
    }

    // Ctrl+P: プロンプトライブラリ
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
      if (chatPanel && chatPanel.isVisible) {
        chatPanel.showPromptLibrary();
      }
    }
  });
}

// API接続テスト関数をSimpleMarkdownEditorクラスに追加
SimpleMarkdownEditor.prototype.testGeminiConnection = async function(apiKey, model) {
  try {
    console.log('Gemini API接続テスト開始...');
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: "こんにちは"
          }]
        }]
      })
    });

    console.log('Gemini APIレスポンス状態:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Gemini API接続成功:', data);
      return true;
    } else {
      console.error('Gemini API接続失敗:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('Gemini API接続エラー:', error);
    return false;
  }
};

SimpleMarkdownEditor.prototype.testClaudeConnection = async function(apiKey, model) {
  try {
    console.log('Claude API接続テスト開始...');
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 10,
        messages: [{
          role: 'user',
          content: 'こんにちは'
        }]
      })
    });

    console.log('Claude APIレスポンス状態:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Claude API接続成功:', data);
      return true;
    } else {
      console.error('Claude API接続失敗:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('Claude API接続エラー:', error);
    return false;
  }
};

// 図表生成機能の初期化
function initializeDiagramFeature() {
  try {
    // ログ出力を最小化
    
    // DiagramGeneratorクラスを動的に定義
    if (!window.DiagramGenerator) {
      // 動的読み込み実行
      loadDiagramGeneratorScript();
      return;
    }
    
    // DiagramGeneratorをグローバルスコープで初期化
    window.diagramGenerator = new DiagramGenerator();
    
    // 図表モーダルのイベントリスナー設定
    const diagramBtn = document.getElementById('diagram-btn');
    const diagramModal = document.getElementById('diagram-modal');
    const diagramClose = document.getElementById('diagram-close');
    const diagramGenerate = document.getElementById('diagram-generate');
    const diagramInsert = document.getElementById('diagram-insert');
    const diagramCopy = document.getElementById('diagram-copy');
    const diagramExport = document.getElementById('diagram-export');
    
    // 図表タイプボタンを生成
    const typeGrid = document.getElementById('diagram-type-grid');
    if (typeGrid) {
      Object.entries(window.diagramGenerator.diagramTypes).forEach(([key, type]) => {
        const btn = document.createElement('button');
        btn.className = 'diagram-type-btn';
        btn.dataset.type = key;
        btn.innerHTML = `
          <span class="diagram-type-icon">${type.icon}</span>
          <div>${type.name}</div>
        `;
        btn.addEventListener('click', () => {
          // 他のボタンの選択状態を解除
          typeGrid.querySelectorAll('.diagram-type-btn').forEach(b => b.classList.remove('selected'));
          // このボタンを選択状態に
          btn.classList.add('selected');
          
          // プレースホルダーを更新
          const textarea = document.getElementById('diagram-description');
          if (textarea) {
            textarea.placeholder = type.prompt + '（例：ユーザー登録の流れを表すフローチャート）';
          }
        });
        typeGrid.appendChild(btn);
      });
      
      // デフォルトでフローチャートを選択
      const firstBtn = typeGrid.querySelector('[data-type="flowchart"]');
      if (firstBtn) {
        firstBtn.click();
      }
    }
    
    // モーダル表示/非表示
    if (diagramBtn) {
      diagramBtn.addEventListener('click', async () => {
        // ライブラリを初期化
        await window.diagramGenerator.init();
        diagramModal.style.display = 'flex';
      });
    }
    
    if (diagramClose) {
      diagramClose.addEventListener('click', () => {
        diagramModal.style.display = 'none';
        resetDiagramModal();
      });
    }
    
    // モーダル外クリックで閉じる
    if (diagramModal) {
      diagramModal.addEventListener('click', (e) => {
        if (e.target === diagramModal) {
          diagramModal.style.display = 'none';
          resetDiagramModal();
        }
      });
    }
    
    // 図表生成
    if (diagramGenerate) {
      diagramGenerate.addEventListener('click', async () => {
        const selectedType = typeGrid.querySelector('.diagram-type-btn.selected');
        const description = document.getElementById('diagram-description').value;
        const width = parseInt(document.getElementById('diagram-width').value);
        const height = parseInt(document.getElementById('diagram-height').value);
        
        if (!selectedType) {
          alert('図表タイプを選択してください。');
          return;
        }
        
        if (!description.trim()) {
          alert('図表の説明を入力してください。');
          return;
        }
        
        const type = selectedType.dataset.type;
        
        try {
          showLoading(true);
          
          // AI生成
          const code = await window.diagramGenerator.generateDiagramCode(type, description, { width, height });
          
          // プレビュー表示
          const previewContainer = document.getElementById('diagram-preview');
          const previewSection = document.querySelector('.diagram-preview-section');
          
          await window.diagramGenerator.renderDiagram(type, code, previewContainer, { width, height });
          
          // プレビューセクションを表示
          previewSection.style.display = 'block';
          
          // ボタンを有効化
          diagramInsert.style.display = 'inline-block';
          diagramCopy.style.display = 'inline-block';
          diagramExport.style.display = 'inline-block';
          
          // コードを保存（挿入・コピー用）
          diagramInsert.dataset.code = code;
          diagramInsert.dataset.type = type;
          diagramCopy.dataset.code = code;
          diagramCopy.dataset.type = type;
          diagramExport.dataset.code = code;
          diagramExport.dataset.type = type;
          
        } catch (error) {
          console.error('図表生成エラー:', error);
          alert('図表の生成に失敗しました: ' + error.message);
        } finally {
          showLoading(false);
        }
      });
    }
    
    // エディタに挿入
    if (diagramInsert) {
      diagramInsert.addEventListener('click', () => {
        const code = diagramInsert.dataset.code;
        const type = diagramInsert.dataset.type;
        
        if (code && window.editorManager) {
          const markdownCode = window.diagramGenerator.convertToMarkdown(type, code);
          
          // エディタに挿入
          const editor = window.editorManager.editor;
          if (editor && editor.focus) {
            editor.focus();
            
            // カーソル位置に挿入
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              range.deleteContents();
              range.insertNode(document.createTextNode('\n\n' + markdownCode + '\n\n'));
              
              // カーソルを挿入位置の後に移動
              range.collapse(false);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          }
          
          // モーダルを閉じる
          diagramModal.style.display = 'none';
          resetDiagramModal();
        }
      });
    }
    
    // クリップボードにコピー
    if (diagramCopy) {
      diagramCopy.addEventListener('click', async () => {
        const code = diagramCopy.dataset.code;
        const type = diagramCopy.dataset.type;
        
        if (code) {
          const markdownCode = window.diagramGenerator.convertToMarkdown(type, code);
          
          try {
            await navigator.clipboard.writeText(markdownCode);
            alert('クリップボードにコピーしました。');
          } catch (error) {
            console.error('コピーエラー:', error);
            alert('コピーに失敗しました。');
          }
        }
      });
    }
    
    // 画像としてエクスポート
    if (diagramExport) {
      diagramExport.addEventListener('click', async () => {
        const code = diagramExport.dataset.code;
        const type = diagramExport.dataset.type;
        const width = parseInt(document.getElementById('diagram-width').value);
        const height = parseInt(document.getElementById('diagram-height').value);
        
        if (code) {
          try {
            const dataUrl = await window.diagramGenerator.exportAsImage(type, code, 'png', { width, height });
            
            // ダウンロードリンクを作成
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `diagram_${Date.now()}.png`;
            link.click();
            
          } catch (error) {
            console.error('エクスポートエラー:', error);
            alert('エクスポートに失敗しました: ' + error.message);
          }
        }
      });
    }
    
    // 初期化完了
    
  } catch (error) {
    console.error('図表生成機能の初期化エラー:', error);
  }
}

// ローディング表示の制御
function showLoading(show) {
  const loading = document.getElementById('diagram-loading');
  if (loading) {
    loading.style.display = show ? 'flex' : 'none';
  }
}

// モーダルをリセット
function resetDiagramModal() {
  // フィールドをクリア
  document.getElementById('diagram-description').value = '';
  
  // プレビューを非表示
  const previewSection = document.querySelector('.diagram-preview-section');
  if (previewSection) {
    previewSection.style.display = 'none';
  }
  
  // ボタンを非表示
  document.getElementById('diagram-insert').style.display = 'none';
  document.getElementById('diagram-copy').style.display = 'none';
  document.getElementById('diagram-export').style.display = 'none';
  
  // データ属性をクリア
  ['diagram-insert', 'diagram-copy', 'diagram-export'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      delete btn.dataset.code;
      delete btn.dataset.type;
    }
  });
}

// DiagramGeneratorスクリプトを動的に読み込む
function loadDiagramGeneratorScript() {
  // Chrome拡張機能では動的インポートを使用
  import('../lib/diagram-generator.js').then(module => {
    window.diagramGenerator = module.default || module;
    console.log('図表生成機能を初期化しました');
  }).catch(error => {
    console.warn('図表生成機能の読み込みをスキップ:', error);
  });
  return; // scriptタグの処理をスキップ
  
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = './src/lib/diagram-generator.js';
  
  script.onload = () => {
    console.log('DiagramGeneratorスクリプトが正常に読み込まれました');
    initializeDiagramFeature(); // 再実行
  };
  
  script.onerror = (error) => {
    console.error('DiagramGeneratorスクリプトの読み込みに失敗:', error);
    // フォールバック: クラスを直接定義
    defineDiagramGeneratorFallback();
    initializeDiagramFeature(); // 再実行
  };
  
  document.head.appendChild(script);
}

// DiagramGeneratorのフォールバック実装
function defineDiagramGeneratorFallback() {
  // フォールバック実装
  
  window.DiagramGenerator = class {
    constructor() {
      this.initialized = false;
      this.mermaidLoaded = false;
      this.chartJsLoaded = false;
      
      // 20種類の図表タイプ定義
      this.diagramTypes = {
        // フローチャート系
        flowchart: { name: 'フローチャート', icon: '🔄', engine: 'mermaid', template: 'graph TD\n  A[開始] --> B{条件}\n  B -->|Yes| C[処理1]\n  B -->|No| D[処理2]\n  C --> E[終了]\n  D --> E' },
        sequence: { name: 'シーケンス図', icon: '📊', engine: 'mermaid', template: 'sequenceDiagram\n  participant A as ユーザー\n  participant B as システム\n  A->>B: リクエスト\n  B-->>A: レスポンス' },
        gantt: { name: 'ガントチャート', icon: '📅', engine: 'mermaid', template: 'gantt\n  title プロジェクト計画\n  dateFormat YYYY-MM-DD\n  section タスク\n  タスク1: 2024-01-01, 30d\n  タスク2: 2024-02-01, 20d' },
        swimlane: { name: 'スイムレーン図', icon: '🏊', engine: 'mermaid', template: 'graph TD\n  subgraph 部署A\n    A1[タスク1]\n    A2[タスク2]\n  end\n  subgraph 部署B\n    B1[承認]\n    B2[実行]\n  end\n  A1 --> B1\n  B1 --> A2\n  A2 --> B2' },
        
        // チャート系（Chart.js）
        barChart: { name: '棒グラフ', icon: '📊', engine: 'chartjs', template: { type: 'bar', data: { labels: ['1月', '2月', '3月', '4月', '5月'], datasets: [{ label: '売上', data: [12, 19, 3, 5, 2], backgroundColor: 'rgba(75, 192, 192, 0.6)' }] } } },
        lineChart: { name: '折れ線グラフ', icon: '📈', engine: 'chartjs', template: { type: 'line', data: { labels: ['1月', '2月', '3月', '4月', '5月'], datasets: [{ label: '推移', data: [65, 59, 80, 81, 56], borderColor: 'rgba(255, 99, 132, 1)', tension: 0.1 }] } } },
        pieChart: { name: '円グラフ', icon: '🥧', engine: 'mermaid', template: 'pie title 売上構成\n  "製品A" : 45\n  "製品B" : 30\n  "製品C" : 25' },
        doughnutChart: { name: 'ドーナツグラフ', icon: '🍩', engine: 'chartjs', template: { type: 'doughnut', data: { labels: ['A', 'B', 'C', 'D'], datasets: [{ data: [30, 25, 20, 25], backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'] }] } } },
        scatterChart: { name: '散布図', icon: '📈', engine: 'chartjs', template: { type: 'scatter', data: { datasets: [{ label: 'データポイント', data: [{x: 10, y: 20}, {x: 15, y: 25}, {x: 20, y: 30}, {x: 25, y: 28}], backgroundColor: 'rgba(255, 99, 132, 0.6)' }] } } },
        
        // ビジネス・組織系
        orgChart: { name: '組織図', icon: '🏢', engine: 'mermaid', template: 'graph TB\n  CEO[CEO]\n  CTO[CTO]\n  CFO[CFO]\n  CEO --> CTO\n  CEO --> CFO' },
        mindmap: { name: 'マインドマップ', icon: '🧠', engine: 'mermaid', template: 'mindmap\n  root((中心))\n    分岐1\n      子1\n      子2\n    分岐2\n      子3' },
        kanban: { name: 'かんばんボード', icon: '📋', engine: 'svg', template: '<svg viewBox="0 0 400 300"><rect x="10" y="10" width="120" height="280" fill="#f8f9fa" stroke="#ccc"/><text x="70" y="35" text-anchor="middle" font-weight="bold">TODO</text><rect x="20" y="50" width="100" height="60" fill="white" stroke="#ddd"/><text x="70" y="85" text-anchor="middle">タスク1</text><rect x="140" y="10" width="120" height="280" fill="#fff3cd" stroke="#ccc"/><text x="200" y="35" text-anchor="middle" font-weight="bold">進行中</text><rect x="270" y="10" width="120" height="280" fill="#d4edda" stroke="#ccc"/><text x="330" y="35" text-anchor="middle" font-weight="bold">完了</text></svg>' },
        
        // UI/デザイン系（SVG）
        wireframe: { name: 'ワイヤーフレーム', icon: '📱', engine: 'svg', template: '<svg viewBox="0 0 300 400"><rect x="10" y="10" width="280" height="60" fill="#f0f0f0" stroke="#ccc"/><text x="150" y="45" text-anchor="middle">ヘッダー</text><rect x="10" y="80" width="280" height="250" fill="white" stroke="#ccc"/><text x="150" y="210" text-anchor="middle">メインコンテンツ</text><rect x="10" y="340" width="280" height="50" fill="#f0f0f0" stroke="#ccc"/><text x="150" y="370" text-anchor="middle">フッター</text></svg>' },
        mockup: { name: 'モックアップ', icon: '🎨', engine: 'svg', template: '<svg viewBox="0 0 300 200"><rect width="300" height="200" fill="#f8f9fa" stroke="#dee2e6"/><rect x="20" y="20" width="260" height="40" fill="#007bff"/><text x="150" y="45" text-anchor="middle" fill="white">タイトル</text></svg>' },
        icon: { name: 'アイコン', icon: '🎨', engine: 'svg', template: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#667eea"/><text x="50" y="60" text-anchor="middle" fill="white" font-size="20">★</text></svg>' },
        
        // テクニカル系
        network: { name: 'ネットワーク図', icon: '🌐', engine: 'mermaid', template: 'graph LR\n  A[PC] --> B[Router]\n  B --> C[Internet]\n  B --> D[Server]' },
        database: { name: 'データベース設計', icon: '🗄️', engine: 'mermaid', template: 'graph LR\n  A[アプリ] --> B[API]\n  B --> C[データベース]\n  C --> D[テーブル1]\n  C --> E[テーブル2]' },
        architecture: { name: 'アーキテクチャ図', icon: '🏗️', engine: 'mermaid', template: 'graph TB\n  A[Web] --> B[API]\n  B --> C[DB]' },
        
        // その他
        userPersona: { name: 'ユーザーペルソナ', icon: '👤', engine: 'svg', template: '<svg viewBox="0 0 300 400"><circle cx="150" cy="80" r="50" fill="#ddd"/><text x="150" y="150" text-anchor="middle" font-size="18" font-weight="bold">田中太郎</text><text x="150" y="170" text-anchor="middle">30歳 会社員</text></svg>' },
        infographic: { name: 'インフォグラフィック', icon: '📊', engine: 'svg', template: '<svg viewBox="0 0 300 400"><text x="150" y="40" text-anchor="middle" font-size="24" font-weight="bold">統計データ</text><circle cx="150" cy="120" r="40" fill="#007bff"/><text x="150" y="125" text-anchor="middle" fill="white" font-size="18">75%</text></svg>' }
      };
    }
    
    async init() {
      // フォールバック初期化
      this.initialized = true;
    }
    
    async generateDiagramCode(type, description, options = {}) {
      const diagramType = this.diagramTypes[type];
      if (!diagramType) {
        throw new Error(`Unknown diagram type: ${type}`);
      }
      
      // シンプルなテンプレート返却
      if (diagramType.engine === 'chartjs') {
        return JSON.stringify(diagramType.template, null, 2);
      }
      return diagramType.template;
    }
    
    async renderDiagram(type, code, container, options = {}) {
      const diagramType = this.diagramTypes[type];
      if (!diagramType) {
        throw new Error(`Unknown diagram type: ${type}`);
      }
      
      // 基本的なプレビュー表示
      container.innerHTML = `
        <div style="padding: 20px; background: #f8f9fa; border-radius: 8px;">
          <h4>${diagramType.icon} ${diagramType.name}</h4>
          <pre style="background: white; padding: 15px; border-radius: 4px; overflow: auto; font-size: 12px;">${code}</pre>
          <p style="color: #666; font-size: 12px; margin-top: 10px;">
            ※ フォールバックモード: 基本プレビューを表示中
          </p>
        </div>
      `;
    }
    
    convertToMarkdown(type, code) {
      const diagramType = this.diagramTypes[type];
      
      if (diagramType.engine === 'mermaid') {
        return `\`\`\`mermaid\n${code}\n\`\`\``;
      } else if (diagramType.engine === 'chartjs') {
        return `\`\`\`json\n${code}\n\`\`\``;
      }
      
      return code;
    }
    
    async exportAsImage() {
      throw new Error('画像エクスポートはフォールバックモードでは利用できません');
    }
  };
}

export default SimpleMarkdownEditor;