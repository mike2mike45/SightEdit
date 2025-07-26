import { getMarkdownContent, setMarkdownContent } from './editor';

let currentEditor = null;
let currentFile = null;
let isModified = false;

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
    }
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
  
  currentEditor.commands.clearContent();
  currentEditor.commands.focus();
  
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
      setMarkdownContent(currentEditor, result.content);
      
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
        file: fileState
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
    
    // 内容が空の場合の警告
    if (!markdown || markdown.trim() === '') {
      const confirmEmpty = window.confirm('ドキュメントが空です。空のファイルとして保存しますか？');
      if (!confirmEmpty) {
        return { success: false, canceled: true };
      }
    }
    
    let result;
    if (currentFile.path) {
      // 既存ファイルの上書き保存
      result = await window.electronAPI.saveFile({
        filePath: currentFile.path,
        content: markdown || ''  // 空の場合は空文字列を送る
      });
    } else {
      // 新規ファイルの場合は名前を付けて保存
      result = await window.electronAPI.saveAsFile({
        content: markdown || '',  // 空の場合は空文字列を送る
        suggestedName: currentFile.name
      });
    }
    
    console.log('Save result:', result);
    
    if (result.success && !result.canceled) {
      const fileState = {
        path: result.filePath,
        name: result.fileName,
        saved: true
      };
      
      // currentFileを更新
      currentFile = fileState;
      
      window.showMessage('ファイルを保存しました', 'success');
      
      return {
        success: true,
        file: fileState
      };
    }
    
    return { success: false, canceled: result.canceled };
  } catch (error) {
    console.error('Save error:', error);
    window.showMessage('ファイルを保存できませんでした: ' + error.message, 'error');
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
      console.log('Getting content from source editor for saveAs');
    } else {
      // WYSIWYGモードの場合は変換
      markdown = getMarkdownContent(currentEditor);
      console.log('Getting content from WYSIWYG editor for saveAs');
    }
    
    console.log('SaveAs - Markdown content:', markdown);
    console.log('SaveAs - Content length:', markdown ? markdown.length : 0);
    
    const result = await window.electronAPI.saveAsFile({
      content: markdown || '',
      suggestedName: currentFile.name
    });
    
    if (result.success && !result.canceled) {
      const fileState = {
        path: result.filePath,
        name: result.fileName,
        saved: true
      };
      
      // currentFileを更新
      currentFile = fileState;
      
      window.showMessage('ファイルを保存しました', 'success');
      
      return {
        success: true,
        file: fileState
      };
    }
    
    return { success: false, canceled: result.canceled };
  } catch (error) {
    console.error('SaveAs error:', error);
    window.showMessage('ファイルを保存できませんでした: ' + error.message, 'error');
    return { success: false, error: error.message };
  }
}

async function exportPDF() {
  if (!window.electronAPI) {
    window.showMessage('この機能はElectronアプリでのみ利用できます', 'error');
    return { success: false };
  }
  
  try {
    // 現在のモードを保存
    const wasInSourceMode = document.getElementById('source-editor').style.display !== 'none';
    
    // ソースモードの場合は一時的にWYSIWYGモードに切り替え
    if (wasInSourceMode) {
      document.getElementById('wysiwyg-btn').click();
      // レンダリング待機
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const result = await window.electronAPI.exportPDF({
      title: currentFile.name || 'Untitled'
    });
    
    // 元のモードに戻す
    if (wasInSourceMode) {
      document.getElementById('source-btn').click();
    }
    
    if (result.success) {
      window.showMessage('PDFとして出力しました', 'success');
      return { success: true };
    }
    
    return { success: false };
  } catch (error) {
    window.showMessage('PDF出力に失敗しました: ' + error.message, 'error');
    return { success: false };
  }
}