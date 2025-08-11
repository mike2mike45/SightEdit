import { getMarkdownContent, setMarkdownContent } from './editor.js';

let currentEditor = null;
let currentFile = null;
let isModified = false;
let originalMarkdownContent = null; // 元のMarkdownコンテンツを保存

export function setupFileOperations(editor, file, modified) {
  currentEditor = editor;
  currentFile = file;
  isModified = modified;
  
  return {
    newFile,
    openFile,
    saveFile,
    saveAsFile,
    exportPDF,
    updateState: (file, modified) => {
      currentFile = file;
      isModified = modified;
    },
    getOriginalMarkdownContent: () => originalMarkdownContent
  };
}

async function newFile() {
  if (isModified) {
    const confirm = window.confirm('現在の変更を保存しますか？');
    if (confirm) {
      const saveResult = await saveFile();
      // キャンセルされた場合は新規ファイル作成を中止
      if (!saveResult.success && !saveResult.canceled) {
        return { success: false };
      }
    }
  }
  
  // 元のMarkdownコンテンツをクリア
  originalMarkdownContent = null;
  
  // WYSIWYGエディターをクリア
  currentEditor.commands.clearContent();
  currentEditor.commands.focus();
  
  // ソースエディターもクリア（ソースモードの場合）
  const sourceEditor = document.getElementById('source-editor');
  if (sourceEditor) {
    sourceEditor.value = '';
    
    // ソースエディターの変更イベントを発火
    const event = new Event('input', { bubbles: true });
    sourceEditor.dispatchEvent(event);
  }
  
  const newFileState = {
    path: null,
    name: '無題のドキュメント',
    saved: true
  };
  
  // currentFileを更新
  currentFile = newFileState;
  
  window.showMessage('新規ファイルを作成しました', 'success');
  
  return {
    success: true,
    file: newFileState
  };
}

async function openFile() {
  if (!window.electronAPI) {
    window.showMessage('この機能はElectronアプリでのみ利用できます', 'error');
    return { success: false };
  }
  
  if (isModified) {
    const confirm = window.confirm('現在の変更を保存しますか？');
    if (confirm) {
      const saveResult = await saveFile();
      // 保存に失敗した場合はファイルを開かない
      if (!saveResult.success) {
        return { success: false };
      }
    }
  }
  
  try {
    const result = await window.electronAPI.openFile();
    
    if (result.success && !result.canceled) {
      // 元のMarkdownコンテンツを保存
      originalMarkdownContent = result.content;
      
      // WYSIWYGエディターに設定
      setMarkdownContent(currentEditor, result.content);
      
      // ソースエディターにも設定
      const sourceEditor = document.getElementById('source-editor');
      if (sourceEditor) {
        sourceEditor.value = originalMarkdownContent;
        
        // ソースエディターの変更イベントを発火
        const event = new Event('input', { bubbles: true });
        sourceEditor.dispatchEvent(event);
      }
      
      const fileState = {
        path: result.filePath,
        name: result.fileName,
        saved: true
      };
      
      // currentFileを更新
      currentFile = fileState;
      
      window.showMessage('ファイルを開きました: ' + result.fileName, 'success');
      
      return {
        success: true,
        file: fileState,
        originalContent: originalMarkdownContent
      };
    }
    
    return { success: false, canceled: result.canceled };
  } catch (error) {
    window.showMessage('ファイルを開けませんでした: ' + error.message, 'error');
    return { success: false, error: error.message };
  }
}

async function saveFile() {
  if (!window.electronAPI) {
    window.showMessage('この機能はElectronアプリでのみ利用できます', 'error');
    return { success: false };
  }
  
  try {
    let markdown;
    
    // 現在のモードを確認
    const sourceEditor = document.getElementById('source-editor');
    const isSourceMode = sourceEditor && sourceEditor.style.display !== 'none';
    
    if (isSourceMode) {
      // ソースモードの場合は直接テキストを取得
      markdown = sourceEditor.value;
      console.log('Getting content from source editor');
    } else {
      // WYSIWYGモードの場合は変換
      markdown = getMarkdownContent(currentEditor);
      console.log('Getting content from WYSIWYG editor');
    }
    
    // デバッグ: 取得したMarkdownを確認
    console.log('Markdown content to save:', markdown);
    console.log('Content length:', markdown ? markdown.length : 0);
    
    if (!markdown) {
      window.showMessage('保存する内容がありません', 'warning');
      return { success: false };
    }
    
    if (!currentFile.path) {
      // 新規ファイルの場合は「名前を付けて保存」
      return await saveAsFile();
    }
    
    const result = await window.electronAPI.saveFile({
      filePath: currentFile.path,
      content: markdown
    });
    
    if (result.success) {
      window.showMessage('ファイルを保存しました', 'success');
      return {
        success: true,
        file: currentFile
      };
    } else {
      window.showMessage('ファイルの保存に失敗しました', 'error');
      return { success: false };
    }
  } catch (error) {
    console.error('Save error:', error);
    window.showMessage('保存エラー: ' + error.message, 'error');
    return { success: false, error: error.message };
  }
}

async function saveAsFile() {
  if (!window.electronAPI) {
    window.showMessage('この機能はElectronアプリでのみ利用できます', 'error');
    return { success: false };
  }
  
  try {
    let markdown;
    
    // 現在のモードを確認
    const sourceEditor = document.getElementById('source-editor');
    const isSourceMode = sourceEditor && sourceEditor.style.display !== 'none';
    
    if (isSourceMode) {
      // ソースモードの場合は直接テキストを取得
      markdown = sourceEditor.value;
    } else {
      // WYSIWYGモードの場合は変換
      markdown = getMarkdownContent(currentEditor);
    }
    
    if (!markdown) {
      window.showMessage('保存する内容がありません', 'warning');
      return { success: false };
    }
    
    const result = await window.electronAPI.saveAsFile({
      content: markdown
    });
    
    if (result.success && !result.canceled) {
      const newFileState = {
        path: result.filePath,
        name: result.fileName,
        saved: true
      };
      
      // currentFileを更新
      currentFile = newFileState;
      
      window.showMessage('ファイルを保存しました: ' + result.fileName, 'success');
      
      return {
        success: true,
        file: newFileState
      };
    }
    
    return { success: false, canceled: result.canceled };
  } catch (error) {
    window.showMessage('ファイルの保存に失敗しました: ' + error.message, 'error');
    return { success: false, error: error.message };
  }
}

async function exportPDF() {
  if (!window.electronAPI) {
    // ブラウザ環境では印刷ダイアログを表示
    window.print();
    return { success: true };
  }
  
  try {
    // Electronアプリでは専用のPDFエクスポート機能を使用
    const result = await window.electronAPI.exportPDF();
    
    if (result.success) {
      window.showMessage('PDFをエクスポートしました', 'success');
    } else if (!result.canceled) {
      window.showMessage('PDFのエクスポートに失敗しました', 'error');
    }
    
    return result;
  } catch (error) {
    window.showMessage('PDFエクスポートエラー: ' + error.message, 'error');
    return { success: false, error: error.message };
  }
}