// 共通アクション処理
// メニューバーとツールバーから呼び出される共通の処理を管理

// ファイル操作
export const fileActions = {
  newFile: () => window.__newFile__?.(),
  openFile: () => window.__openFile__?.(),
  saveFile: () => window.__saveFile__?.(),
  saveAsFile: () => window.__saveAsFile__?.(),
  exportPdf: () => window.__exportPdf__?.(),
  exportFormats: () => window.__exportFormats__?.()
};

// 編集操作
export const editActions = {
  undo: () => {
    if (window.currentMode === 'source' && window.applySourceFormatting) {
      window.applySourceFormatting('undo');
    } else if (window.editor) {
      window.editor.chain().focus().undo().run();
    }
  },
  redo: () => {
    if (window.currentMode === 'source' && window.applySourceFormatting) {
      window.applySourceFormatting('redo');
    } else if (window.editor) {
      window.editor.chain().focus().redo().run();
    }
  },
  cut: () => document.execCommand('cut'),
  copy: () => document.execCommand('copy'),
  paste: () => document.execCommand('paste'),
  pastePlainText: async () => {
    // プレーンテキストでの貼り付け
    if (window.currentMode === 'source') {
      // ソースモードの場合は通常の貼り付けと同じ（既にプレーンテキスト）
      document.execCommand('paste');
    } else if (window.editor && window.commonEditActions?.pastePlainText) {
      // WYSIWYGモードでプレーンテキスト貼り付け関数を使用
      await window.commonEditActions.pastePlainText(window.editor);
    } else {
      // フォールバック：通常の貼り付け
      document.execCommand('paste');
    }
  },
  selectAll: () => document.execCommand('selectAll'),
  searchReplace: () => {
    if (window.searchReplaceDialog) {
      window.searchReplaceDialog.show();
    }
  }
};

// 書式設定操作
export const formatActions = {
  bold: () => {
    if (window.currentMode === 'source' && window.applySourceFormatting) {
      window.applySourceFormatting('bold', {});
    } else if (window.editor) {
      window.editor.chain().focus().toggleBold().run();
    }
  },
  italic: () => {
    if (window.currentMode === 'source' && window.applySourceFormatting) {
      window.applySourceFormatting('italic', {});
    } else if (window.editor) {
      window.editor.chain().focus().toggleItalic().run();
    }
  },
  strikethrough: () => {
    if (window.currentMode === 'source' && window.applySourceFormatting) {
      window.applySourceFormatting('strike', {});
    } else if (window.editor) {
      window.editor.chain().focus().toggleStrike().run();
    }
  },
  inlineCode: () => {
    if (window.currentMode === 'source' && window.applySourceFormatting) {
      window.applySourceFormatting('inline-code', {});
    } else if (window.editor) {
      window.editor.chain().focus().toggleCode().run();
    }
  },
  clearFormat: () => {
    if (window.currentMode === 'source' && window.applySourceFormatting) {
      window.applySourceFormatting('clear-format', {});
    } else if (window.editor) {
      window.editor.chain().focus().clearNodes().unsetAllMarks().run();
    }
  },
  heading: (level) => {
    if (window.currentMode === 'source' && window.applySourceFormatting) {
      window.applySourceFormatting('heading', { level });
    } else if (window.editor) {
      window.editor.chain().focus().toggleHeading({ level }).run();
    }
  }
};

// リスト操作
export const listActions = {
  bulletList: () => {
    if (window.currentMode === 'source' && window.applySourceFormatting) {
      window.applySourceFormatting('bullet-list', {});
    } else if (window.editor) {
      window.editor.chain().focus().toggleBulletList().run();
    }
  },
  orderedList: () => {
    if (window.currentMode === 'source' && window.applySourceFormatting) {
      window.applySourceFormatting('ordered-list', {});
    } else if (window.editor) {
      window.editor.chain().focus().toggleOrderedList().run();
    }
  },
  taskList: () => {
    if (window.currentMode === 'source' && window.applySourceFormatting) {
      window.applySourceFormatting('task-list', {});
    } else if (window.editor) {
      window.editor.chain().focus().toggleTaskList().run();
    }
  }
};

// 挿入操作
export const insertActions = {
  link: async () => {
    if (window.currentMode === 'source' && window.applySourceFormatting) {
      window.applySourceFormatting('link', {});
    } else if (window.editor && window.dialog) {
      const url = await window.dialog.show('リンクを挿入', 'URLを入力してください:');
      if (url) {
        window.editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
      }
    }
  },
  image: async () => {
    if (window.currentMode === 'source' && window.applySourceFormatting) {
      window.applySourceFormatting('image', {});
    } else if (window.editor && window.dialog) {
      const url = await window.dialog.show('画像を挿入', '画像のURLを入力してください:', '', { isImageDialog: true });
      if (url) {
        window.editor.chain().focus().setImage({ src: url }).run();
      }
    }
  },
  table: async () => {
    if (window.currentMode === 'source' && window.applySourceFormatting) {
      window.applySourceFormatting('table', {});
    } else if (window.editor && window.dialog) {
      const result = await window.dialog.showTableDialog();
      if (result) {
        window.editor.chain().focus().insertTable({ 
          rows: result.rows, 
          cols: result.cols,
          withHeaderRow: result.withHeader 
        }).run();
      }
    }
  },
  horizontalRule: () => {
    if (window.currentMode === 'source' && window.applySourceFormatting) {
      window.applySourceFormatting('horizontal-rule', {});
    } else if (window.editor) {
      window.editor.chain().focus().setHorizontalRule().run();
    }
  },
  codeBlock: () => {
    if (window.currentMode === 'source' && window.applySourceFormatting) {
      window.applySourceFormatting('code-block', {});
    } else if (window.editor) {
      window.editor.chain().focus().toggleCodeBlock().run();
    }
  },
  blockquote: () => {
    if (window.currentMode === 'source' && window.applySourceFormatting) {
      window.applySourceFormatting('blockquote', {});
    } else if (window.editor) {
      window.editor.chain().focus().toggleBlockquote().run();
    }
  },
  toc: () => {
    if (window.currentMode === 'source' && window.applySourceFormatting) {
      window.applySourceFormatting('toc', {});
    } else if (window.editor && window.generateTableOfContents) {
      const toc = window.generateTableOfContents(window.editor);
      window.editor.commands.insertContent(toc);
    }
  }
};

// ビュー操作
export const viewActions = {
  switchMode: (mode) => {
    if (window.setMode) {
      window.setMode(mode);
    }
  },
  setTheme: (theme) => {
    if (window.setTheme) {
      window.setTheme(theme);
    }
  },
  toggleDevTools: () => {
    // Electronの開発者ツールをメインプロセス経由で開く
    if (window.electronAPI?.invoke) {
      window.electronAPI.invoke('toggle-dev-tools');
    }
  }
};

// Git操作
export const gitActions = {
  showGitPanel: () => {
    // Gitパネルは別ウィンドウで開くため、ここでは何もしない
    // メインプロセス側で処理される
    console.log('Git panel will be opened in a separate window');
  },
  gitInit: () => {
    if (window.gitPanel) {
      window.gitPanel.initRepository();
    }
  },
  gitOpen: () => {
    if (window.gitPanel) {
      window.gitPanel.openRepository();
    }
  },
  gitStageAll: () => {
    if (window.gitPanel) {
      window.gitPanel.stageAll();
    }
  },
  gitCommit: () => {
    if (window.gitPanel) {
      window.gitPanel.commit();
    }
  },
  gitPush: () => {
    if (window.gitPanel) {
      window.gitPanel.push();
    }
  },
  gitPull: () => {
    if (window.gitPanel) {
      window.gitPanel.pull();
    }
  },
  gitCreateBranch: () => {
    if (window.gitPanel) {
      window.gitPanel.createBranch();
    }
  },
  gitSwitchBranch: () => {
    if (window.gitPanel) {
      window.gitPanel.switchBranch();
    }
  },
  gitSetupRemote: () => {
    if (window.gitPanel) {
      window.gitPanel.setupRemote();
    }
  },
  gitConfig: () => {
    if (window.gitPanel) {
      window.gitPanel.configureUser();
    }
  },
  gitShowHistory: () => {
    if (window.gitPanel) {
      window.gitPanel.showHistory();
    }
  }
};

// AI操作
export const aiActions = {
  summarize: (option) => {
    if (window.executeAIFunction) {
      window.executeAIFunction('summarize', option);
    }
  },
  proofread: () => {
    if (window.executeAIFunction) {
      window.executeAIFunction('proofread');
    }
  },
  translate: (option) => {
    if (window.executeAIFunction) {
      window.executeAIFunction('translate', option);
    }
  },
  generateTitle: () => {
    if (window.executeAIFunction) {
      window.executeAIFunction('generate-title');
    }
  },
  generateHeading: () => {
    if (window.executeAIFunction) {
      window.executeAIFunction('generate-heading');
    }
  },
  generateIntroConclusion: (option) => {
    if (window.executeAIFunction) {
      window.executeAIFunction('generate-intro-conclusion', option);
    }
  },
  extractKeywords: (option) => {
    if (window.executeAIFunction) {
      window.executeAIFunction('extract-keywords', option);
    }
  },
  convertStyle: (option) => {
    if (window.executeAIFunction) {
      window.executeAIFunction('convert-style', option);
    }
  },
  customCommand: () => {
    if (window.aiCustomDialog) {
      window.aiCustomDialog.show();
    }
  },
  showSettings: () => {
    if (window.showSetupDialog) {
      window.showSetupDialog();
    }
  }
};

// ヘルプ操作
export const helpActions = {
  showHelp: () => {
    if (window.helpDialog) {
      window.helpDialog.show();
    }
  },
  showAbout: () => {
    if (window.showAboutDialog) {
      window.showAboutDialog();
    }
  },
  checkUpdates: async () => {
    try {
      if (window.showMessage) {
        window.showMessage('更新を確認しています...', 'info');
      }
      
      if (window.electronAPI?.update?.checkForUpdates) {
        const result = await window.electronAPI.update.checkForUpdates();
        
        if (result.success) {
          console.log('Update check completed successfully');
        } else {
          if (result.reason === 'already_checking') {
            if (window.showMessage) {
              window.showMessage('更新チェックは既に実行中です', 'info');
            }
          } else if (result.reason !== 'development_mode') {
            if (window.showMessage) {
              window.showMessage('更新チェックに失敗しました', 'error');
            }
          }
        }
      }
    } catch (error) {
      console.error('Update check failed:', error);
      if (window.showMessage) {
        window.showMessage('更新チェックに失敗しました', 'error');
      }
    }
  }
};

// すべてのアクションを統合
export const commonActions = {
  file: fileActions,
  edit: editActions,
  format: formatActions,
  list: listActions,
  insert: insertActions,
  view: viewActions,
  git: gitActions,
  ai: aiActions,
  help: helpActions
};

// アクション実行の統一インターフェース
export function executeAction(category, action, ...params) {
  const categoryActions = commonActions[category];
  if (categoryActions && categoryActions[action]) {
    return categoryActions[action](...params);
  } else {
    console.warn(`Action not found: ${category}.${action}`);
  }
}