// アプリケーションメニューテンプレート（多言語対応版）
export function createMenuTemplate(t, currentTheme, mainWindow, changeLanguageDirectly) {
  return [
    {
      label: t('menu.file'),
      submenu: [
        {
          label: t('menu.new'),
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu-new-file')
        },
        {
          label: t('menu.open'),
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('menu-open-file')
        },
        { type: 'separator' },
        {
          label: t('menu.save'),
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('menu-save-file')
        },
        {
          label: t('menu.saveAs'),
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow?.webContents.send('menu-save-as-file')
        },
        { type: 'separator' },
        {
          label: t('menu.export'),
          submenu: [
            {
              label: t('menu.exportPdf'),
              accelerator: 'CmdOrCtrl+P',
              click: () => mainWindow?.webContents.send('menu-export-pdf')
            },
            { type: 'separator' },
            {
              label: t('menu.exportOther'),
              accelerator: 'CmdOrCtrl+E',
              click: () => mainWindow?.webContents.send('menu-export-formats')
            }
          ]
        },
        { type: 'separator' },
        {
          label: t('menu.quit'),
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('before-close');
            }
          }
        }
      ]
    },
    {
      label: t('menu.edit'),
      submenu: [
        {
          label: t('menu.undo'),
          accelerator: 'CmdOrCtrl+Z',
          role: 'undo'
        },
        {
          label: t('menu.redo'),
          accelerator: 'CmdOrCtrl+Y',
          role: 'redo'
        },
        { type: 'separator' },
        {
          label: t('menu.cut'),
          accelerator: 'CmdOrCtrl+X',
          role: 'cut'
        },
        {
          label: t('menu.copy'),
          accelerator: 'CmdOrCtrl+C',
          role: 'copy'
        },
        {
          label: t('menu.paste'),
          accelerator: 'CmdOrCtrl+V',
          role: 'paste'
        },
        {
          label: t('menu.selectAll'),
          accelerator: 'CmdOrCtrl+A',
          role: 'selectall'
        },
        { type: 'separator' },
        {
          label: t('menu.searchReplace'),
          accelerator: 'CmdOrCtrl+F',
          click: () => mainWindow?.webContents.send('menu-search-replace')
        }
      ]
    },
    {
      label: t('menu.format'),
      submenu: [
        {
          label: t('menu.bold'),
          accelerator: 'CmdOrCtrl+B',
          click: () => mainWindow?.webContents.send('menu-format-bold')
        },
        {
          label: t('menu.italic'),
          accelerator: 'CmdOrCtrl+I',
          click: () => mainWindow?.webContents.send('menu-format-italic')
        },
        {
          label: t('menu.strikethrough'),
          accelerator: 'CmdOrCtrl+Shift+X',
          click: () => mainWindow?.webContents.send('menu-format-strikethrough')
        },
        { type: 'separator' },
        {
          label: t('menu.clearFormat'),
          accelerator: 'CmdOrCtrl+\\',
          click: () => mainWindow?.webContents.send('menu-format-clear')
        },
        { type: 'separator' },
        {
          label: t('menu.heading'),
          submenu: [
            {
              label: t('menu.heading1'),
              accelerator: 'CmdOrCtrl+1',
              click: () => mainWindow?.webContents.send('menu-insert-heading', 1)
            },
            {
              label: t('menu.heading2'),
              accelerator: 'CmdOrCtrl+2',
              click: () => mainWindow?.webContents.send('menu-insert-heading', 2)
            },
            {
              label: t('menu.heading3'),
              accelerator: 'CmdOrCtrl+3',
              click: () => mainWindow?.webContents.send('menu-insert-heading', 3)
            },
            {
              label: t('menu.heading4'),
              accelerator: 'CmdOrCtrl+4',
              click: () => mainWindow?.webContents.send('menu-insert-heading', 4)
            },
            {
              label: t('menu.heading5'),
              accelerator: 'CmdOrCtrl+5',
              click: () => mainWindow?.webContents.send('menu-insert-heading', 5)
            },
            {
              label: t('menu.heading6'),
              accelerator: 'CmdOrCtrl+6',
              click: () => mainWindow?.webContents.send('menu-insert-heading', 6)
            }
          ]
        }
      ]
    },
    {
      label: t('menu.insert'),
      submenu: [
        {
          label: t('menu.link'),
          accelerator: 'CmdOrCtrl+K',
          click: () => mainWindow?.webContents.send('menu-insert-link')
        },
        {
          label: t('menu.image'),
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => mainWindow?.webContents.send('menu-insert-image')
        },
        { type: 'separator' },
        {
          label: t('menu.table'),
          accelerator: 'CmdOrCtrl+T',
          click: () => mainWindow?.webContents.send('menu-insert-table')
        },
        {
          label: t('menu.horizontalRule'),
          click: () => mainWindow?.webContents.send('menu-insert-horizontal-rule')
        },
        {
          label: t('menu.codeBlock'),
          click: () => mainWindow?.webContents.send('menu-insert-code-block')
        },
        { type: 'separator' },
        {
          label: t('menu.toc'),
          accelerator: 'CmdOrCtrl+Shift+T',
          click: () => mainWindow?.webContents.send('menu-insert-toc')
        }
      ]
    },
    {
      label: t('menu.view'),
      submenu: [
        {
          label: t('menu.mode'),
          submenu: [
            {
              label: t('menu.wysiwyg'),
              type: 'radio',
              checked: true,
              click: () => mainWindow?.webContents.send('menu-switch-mode', 'wysiwyg')
            },
            {
              label: t('menu.source'),
              type: 'radio',
              click: () => mainWindow?.webContents.send('menu-switch-mode', 'source')
            }
          ]
        },
        { type: 'separator' },
        {
          label: t('menu.theme'),
          submenu: [
            {
              label: t('menu.light'),
              type: 'radio',
              checked: currentTheme === 'light',
              click: () => mainWindow?.webContents.send('menu-set-theme', 'light')
            },
            {
              label: t('menu.dark'),
              type: 'radio',
              checked: currentTheme === 'dark',
              click: () => mainWindow?.webContents.send('menu-set-theme', 'dark')
            }
          ]
        },
        { type: 'separator' },
        {
          label: t('menu.language'),
          submenu: [
            {
              label: t('menu.japanese'),
              type: 'radio',
              checked: true, // 動的に設定される
              click: () => {
                if (changeLanguageDirectly) {
                  changeLanguageDirectly('ja');
                }
              }
            },
            {
              label: t('menu.english'),
              type: 'radio',
              checked: false, // 動的に設定される
              click: () => {
                if (changeLanguageDirectly) {
                  changeLanguageDirectly('en');
                }
              }
            }
          ]
        },
        { type: 'separator' },
        {
          label: t('menu.devTools'),
          accelerator: 'F12',
          click: () => mainWindow?.webContents.toggleDevTools()
        }
      ]
    },
    {
      label: t('menu.git'),
      submenu: [
        {
          label: t('menu.gitPanel'),
          accelerator: 'CmdOrCtrl+G',
          click: () => mainWindow?.webContents.send('menu-show-git')
        },
        { type: 'separator' },
        {
          label: t('menu.gitInit'),
          click: () => mainWindow?.webContents.send('menu-git-init')
        },
        {
          label: t('menu.gitOpen'),
          click: () => mainWindow?.webContents.send('menu-git-open-repo')
        },
        { type: 'separator' },
        {
          label: t('menu.gitStageAll'),
          accelerator: 'CmdOrCtrl+Shift+A',
          click: () => mainWindow?.webContents.send('menu-git-stage-all')
        },
        {
          label: t('menu.gitCommit'),
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => mainWindow?.webContents.send('menu-git-commit')
        },
        { type: 'separator' },
        {
          label: t('menu.gitPush'),
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => mainWindow?.webContents.send('menu-git-push')
        },
        {
          label: t('menu.gitPull'),
          accelerator: 'CmdOrCtrl+Shift+L',
          click: () => mainWindow?.webContents.send('menu-git-pull')
        },
        { type: 'separator' },
        {
          label: t('menu.gitBranch'),
          submenu: [
            {
              label: t('menu.gitNewBranch'),
              click: () => mainWindow?.webContents.send('menu-git-create-branch')
            },
            {
              label: t('menu.gitSwitchBranch'),
              click: () => mainWindow?.webContents.send('menu-git-switch-branch')
            }
          ]
        },
        { type: 'separator' },
        {
          label: t('menu.gitRemoteSettings'),
          click: () => mainWindow?.webContents.send('menu-git-setup-remote')
        },
        {
          label: t('menu.gitUserSettings'),
          click: () => mainWindow?.webContents.send('menu-git-config')
        },
        { type: 'separator' },
        {
          label: t('menu.gitHistory'),
          click: () => mainWindow?.webContents.send('menu-git-show-history')
        }
      ]
    },
    {
      label: t('menu.help'),
      submenu: [
        {
          label: t('menu.showHelp'),
          accelerator: 'F1',
          click: () => mainWindow?.webContents.send('menu-show-help')
        },
        {
          label: t('menu.about'),
          click: () => mainWindow?.webContents.send('menu-show-about')
        },
        { type: 'separator' },
        {
          label: t('menu.checkUpdates'),
          click: () => mainWindow?.webContents.send('menu-check-updates')
        }
      ]
    }
  ];
}