/**
 * Document-level click delegation for declarative dialog triggers.
 *
 *   <button data-dialog-target="my-dlg">Open</button>
 *   <button command="show-modal" commandfor="my-dlg">Open</button>
 *   <material-dialog id="my-dlg">…
 *     <button data-dialog-close="ok">OK</button>
 *   </material-dialog>
 *
 * Works in any framework (Alpine, Unpoly, HTMX, plain HTML) and in any
 * browser. Note: the native HTML invoker (command/commandfor) is also
 * handled here because Chromium silently ignores `show-modal` when the
 * target isn't a real <dialog> — so we delegate it ourselves.
 *
 * The first material-dialog instance to mount installs the listener;
 * subsequent mounts are no-ops.
 */

interface DialogControl extends HTMLElement {
  show(): Promise<void> | void;
  close(returnValue?: string): Promise<void> | void;
}

function looksLikeDialog(el: Element | null): el is DialogControl {
  return !!el && typeof (el as DialogControl).show === 'function';
}

let installed = false;

export function ensureDialogTriggersInstalled(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;

  document.addEventListener('click', (e) => {
    const target = e.target as Element | null;
    if (!target || typeof target.closest !== 'function') return;

    // [data-dialog-target] — open via id reference.
    const opener = target.closest<HTMLElement>('[data-dialog-target]');
    if (opener) {
      const id = opener.getAttribute('data-dialog-target');
      const dlg = id ? document.getElementById(id) : null;
      if (looksLikeDialog(dlg)) {
        e.preventDefault();
        dlg.show();
      }
      return;
    }

    // Native HTML invoker. The browser fires CommandEvent on built-in targets
    // only; for custom-element targets it's a no-op, so we read the attrs
    // and route show-modal/close ourselves.
    const invoker = target.closest<HTMLElement>('[commandfor]');
    if (invoker) {
      const id = invoker.getAttribute('commandfor');
      const cmd = (invoker.getAttribute('command') || '').toLowerCase();
      const dlg = id ? document.getElementById(id) : null;
      if (looksLikeDialog(dlg) && (cmd === 'show-modal' || cmd === 'show')) {
        e.preventDefault();
        dlg.show();
        return;
      }
      if (looksLikeDialog(dlg) && (cmd === 'close' || cmd === 'hide')) {
        e.preventDefault();
        dlg.close();
        return;
      }
    }

    // [data-dialog-close] — close the enclosing material-dialog.
    const closer = target.closest<HTMLElement>('[data-dialog-close]');
    if (closer) {
      const dlg = closer.closest('material-dialog') as DialogControl | null;
      if (looksLikeDialog(dlg)) {
        const value = closer.getAttribute('data-dialog-close') || '';
        dlg.close(value);
      }
    }
  });
}
