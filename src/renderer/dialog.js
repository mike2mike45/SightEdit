import { addDialogStyles, createDialog, createTOCDialog } from './dialog-core.js';
export { addDialogStyles, createDialog, createTOCDialog };

// 互換API: 旧 'dialog' 名前空間を提供
export const dialog = {
  async show(title='Dialog', message='', defaultValue='', options={}) {
    addDialogStyles();
    return await new Promise((resolve) => {
      const body = document.createElement(options.multiline ? 'textarea' : 'input');
      if (!options.multiline) { body.type = 'text'; }
      body.value = String(defaultValue ?? '');
      if (options.isImageDialog) { body.placeholder = 'https://example.com/image.png'; }
      const container = document.createElement('div');
      const msg = document.createElement('p'); msg.textContent = String(message ?? '');
      container.append(msg, body);
      createDialog({
        id: 'custom-dialog',
        title,
        body: container,
        onConfirm: () => resolve(body.value),
        onCancel: () => resolve(null)
      });
      setTimeout(() => body.focus(), 0);
    });
  },
  async showTableDialog() {
    // 目次形式ダイアログ（後方互換）
    return await (typeof createTOCDialog === 'function' ? createTOCDialog() : Promise.resolve(null));
  }
};

try { window.DialogLegacy = { createDialog, createTOCDialog, addDialogStyles, dialog }; } catch {}
