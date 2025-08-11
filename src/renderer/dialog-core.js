// Unified dialog core (avoids cyclic deps; single source of truth)
export function addDialogStyles() {
  if (document.getElementById('dialog-core-styles')) return;
  const style = document.createElement('style');
  style.id = 'dialog-core-styles';
  style.textContent = `
    .dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .dialog { background: #fff; border-radius: 8px; padding: 16px; min-width: 320px; max-width: 640px; box-shadow: 0 10px 30px rgba(0,0,0,.2); }
    .dialog-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .dialog-actions { display:flex; gap:8px; justify-content: flex-end; margin-top:12px; }
    button.dialog-close { background: none; border: none; font-size: 20px; cursor: pointer; }
  `;
  document.head.appendChild(style);
}

export function createDialog({ id='custom-dialog', title='Dialog', body=null, onConfirm=null, onCancel=null } = {}) {
  addDialogStyles();
  if (document.getElementById(id)) return document.getElementById(id);

  const overlay = document.createElement('div');
  overlay.className = 'dialog-overlay';
  overlay.id = id + '-overlay';

  const dlg = document.createElement('div');
  dlg.className = 'dialog';
  dlg.id = id;

  const header = document.createElement('div');
  header.className = 'dialog-header';
  const h = document.createElement('h3'); h.textContent = title;
  const close = document.createElement('button'); close.className='dialog-close'; close.type='button'; close.textContent='×';
  header.append(h, close);

  const content = document.createElement('div');
  if (body instanceof Node) content.appendChild(body);
  else content.textContent = String(body ?? '');

  const actions = document.createElement('div');
  actions.className = 'dialog-actions';
  const cancelBtn = document.createElement('button'); cancelBtn.textContent='キャンセル'; cancelBtn.type='button';
  const okBtn = document.createElement('button'); okBtn.textContent='OK'; okBtn.type='button';
  actions.append(cancelBtn, okBtn);

  dlg.append(header, content, actions);
  overlay.appendChild(dlg);
  document.body.appendChild(overlay);

  const cleanup = () => { overlay.remove(); };
  const confirm = () => { try { onConfirm && onConfirm(); } finally { cleanup(); } };
  const cancel = () => { try { onCancel && onCancel(); } finally { cleanup(); } };

  close.addEventListener('click', cancel);
  cancelBtn.addEventListener('click', cancel);
  okBtn.addEventListener('click', confirm);
  overlay.addEventListener('click', (e)=>{ if(e.target===overlay) cancel(); });

  return dlg;
}

export async function createTOCDialog() {
  addDialogStyles();
  return new Promise((resolve) => {
    const body = document.createElement('div');
    const label = document.createElement('label'); label.textContent = '目次形式:';
    const select = document.createElement('select');
    ['markdown','html','plaintext'].forEach(v=>{ const o=document.createElement('option'); o.value=v; o.textContent=v; select.appendChild(o); });
    body.append(label, select);

    const dlg = createDialog({ id:'table-dialog', title:'目次の挿入', body, onConfirm: () => resolve(select.value), onCancel: () => resolve(null) });
    dlg.querySelector('select')?.focus();
  });
}

export const DialogCore = { addDialogStyles, createDialog, createTOCDialog };
try { window.DialogCore = DialogCore; } catch {}