/*
 * advanced-material-web — Material 3 web components
 * Copyright (c) 2017-2026 Mikhail Podgurskiy
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * AGPLv3 with the Viewflow Library Exception — see LICENSE_EXCEPTION.
 *
 * The copyright holder regards code produced from this file with an LLM's
 * help as a derived work: placing it in a model's context is copying it.
 * A commercial licence without copyleft: https://viewflow.io/pro.html
 */

import { newE2EPage } from '@stencil/core/testing';

// Real browser, not newSpecPage: material-dropzone is formAssociated and
// calls this.internals.setValidity() unconditionally from componentDidRender.
// Neither Stencil's mock-doc nor jsdom implement ElementInternals'
// form-association methods, so any render of a formAssociated component
// throws outside a real browser — see docs/agents/testing.md.

// Helper: push a fake File into the hidden <input type="file"> the way a real
// pick/drop would, then dispatch the same event the component listens for.
// DataTransferItemList.add() plus assigning input.files is the standard way
// to synthesize a FileList in a real browser (no such API exists in jsdom).
async function pickFiles(
  page: import('@stencil/core/testing').E2EPage,
  files: { name: string; type: string; content?: string }[],
) {
  await page.evaluate((filesArg: { name: string; type: string; content?: string }[]) => {
    const host = document.querySelector('material-dropzone') as HTMLElement;
    const input = host.querySelector('input[type="file"]') as HTMLInputElement;
    const dt = new DataTransfer();
    for (const f of filesArg) {
      dt.items.add(new File([f.content || 'x'], f.name, { type: f.type }));
    }
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, files);
}

async function dropFiles(
  page: import('@stencil/core/testing').E2EPage,
  selector: string,
  files: { name: string; type: string; content?: string }[],
) {
  await page.evaluate((sel: string, filesArg: { name: string; type: string; content?: string }[]) => {
    const host = document.querySelector(sel) as HTMLElement;
    const area = host.querySelector('.dz-area') as HTMLElement;
    const dt = new DataTransfer();
    for (const f of filesArg) {
      dt.items.add(new File([f.content || 'x'], f.name, { type: f.type }));
    }
    const evt = new DragEvent('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(evt, 'dataTransfer', { value: dt });
    area.dispatchEvent(evt);
  }, selector, files);
}

describe('material-dropzone', () => {
  it('renders the drop area with default and custom labels', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-dropzone name="attachments"></material-dropzone>`);
    const area = await page.find('material-dropzone .dz-area');
    expect(area).not.toBeNull();
    expect(area.getAttribute('role')).toBe('button');
    expect(area.getAttribute('tabindex')).toBe('0');

    const page2 = await newE2EPage();
    await page2.setContent(
      `<material-dropzone name="attachments" drop-label="Drop it" browse-label="pick"></material-dropzone>`,
    );
    const text = await page2.find('material-dropzone .dz-text');
    expect(text.textContent).toContain('Drop it');
    expect(text.textContent).toContain('pick');
  });

  it('help-text / error-text: shows help by default, error text when error is set', async () => {
    const page = await newE2EPage();
    await page.setContent(
      `<material-dropzone name="a" help-text="Up to 10 files" error-text="Bad file" error></material-dropzone>`,
    );
    const help = await page.find('material-dropzone .dz-help');
    expect(help.textContent).toBe('Bad file');
    expect(help.className).toContain('is-error');
  });

  it('adding a file via the native input fires fileChange with added/removed detail', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-dropzone name="attachments"></material-dropzone>`);
    const fileChange = await page.spyOnEvent('fileChange');

    await pickFiles(page, [{ name: 'a.txt', type: 'text/plain' }]);
    await page.waitForChanges();

    // File objects don't survive the CDP serialization boundary spyOnEvent
    // reads events through (they come back as plain `{}`), so assert shape
    // (lengths) here and the actual file identity through the rendered DOM.
    expect(fileChange).toHaveReceivedEventTimes(1);
    const detail = fileChange.events[0].detail;
    expect(detail.added).toHaveLength(1);
    expect(detail.files).toHaveLength(1);
    expect(detail.removed).toHaveLength(0);

    const row = await page.find('material-dropzone .dz-name');
    expect(row.textContent).toBe('a.txt');
  });

  it('dropping a file over the drop area adds it (drag-and-drop path)', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-dropzone name="attachments"></material-dropzone>`);
    const fileChange = await page.spyOnEvent('fileChange');

    await dropFiles(page, 'material-dropzone', [{ name: 'photo.png', type: 'image/png' }]);
    await page.waitForChanges();

    expect(fileChange).toHaveReceivedEventTimes(1);
    expect(fileChange.events[0].detail.added).toHaveLength(1);
    const row = await page.find('material-dropzone .dz-name');
    expect(row.textContent).toBe('photo.png');
  });

  it('removing a row emits fileChange with the removed file and clears the row', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-dropzone name="attachments"></material-dropzone>`);
    await pickFiles(page, [{ name: 'a.txt', type: 'text/plain' }]);
    await page.waitForChanges();

    const fileChange = await page.spyOnEvent('fileChange');
    const removeBtn = await page.find('material-dropzone .dz-row material-icon-button');
    await removeBtn.click();
    await page.waitForChanges();

    expect(fileChange).toHaveReceivedEventTimes(1);
    const detail = fileChange.events[0].detail;
    expect(detail.removed).toHaveLength(1);
    expect(detail.files).toHaveLength(0);

    const rows = await page.findAll('material-dropzone .dz-row');
    expect(rows).toHaveLength(0);
  });

  it('accept: rejects a file of the wrong type with materialFileReject reason "type"', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-dropzone name="a" accept="image/*"></material-dropzone>`);
    const reject = await page.spyOnEvent('materialFileReject');
    const change = await page.spyOnEvent('fileChange');

    await pickFiles(page, [{ name: 'doc.txt', type: 'text/plain' }]);
    await page.waitForChanges();

    expect(reject).toHaveReceivedEventTimes(1);
    expect(reject.events[0].detail.reason).toBe('type');
    expect(change).toHaveReceivedEventTimes(0);
  });

  it('max-size: rejects an over-sized file with reason "size"', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-dropzone name="a" max-size="2"></material-dropzone>`);
    const reject = await page.spyOnEvent('materialFileReject');

    await pickFiles(page, [{ name: 'big.txt', type: 'text/plain', content: 'much more than 2 bytes' }]);
    await page.waitForChanges();

    expect(reject).toHaveReceivedEventTimes(1);
    expect(reject.events[0].detail.reason).toBe('size');
  });

  it('max-files: rejects files beyond the cap with reason "count"', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-dropzone name="a" max-files="1"></material-dropzone>`);
    const reject = await page.spyOnEvent('materialFileReject');

    await pickFiles(page, [
      { name: 'one.txt', type: 'text/plain' },
      { name: 'two.txt', type: 'text/plain' },
    ]);
    await page.waitForChanges();

    expect(reject).toHaveReceivedEventTimes(1);
    expect(reject.events[0].detail.reason).toBe('count');
    const rows = await page.findAll('material-dropzone .dz-row');
    expect(rows).toHaveLength(1);
    const name = await page.find('material-dropzone .dz-name');
    expect(name.textContent).toBe('one.txt');
  });

  it('materialFileAdd is cancelable: preventDefault rejects with reason "custom"', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-dropzone name="a"></material-dropzone>`);
    await page.evaluate(() => {
      document.querySelector('material-dropzone')!.addEventListener('materialFileAdd', (e: Event) => e.preventDefault());
    });
    const reject = await page.spyOnEvent('materialFileReject');
    const change = await page.spyOnEvent('fileChange');

    await pickFiles(page, [{ name: 'blocked.txt', type: 'text/plain' }]);
    await page.waitForChanges();

    expect(reject).toHaveReceivedEventTimes(1);
    expect(reject.events[0].detail.reason).toBe('custom');
    expect(change).toHaveReceivedEventTimes(0);
  });

  it('@Method getFiles returns the current files; clear() empties the list and emits fileChange', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-dropzone name="a"></material-dropzone>`);
    const el = await page.find('material-dropzone');
    await pickFiles(page, [{ name: 'a.txt', type: 'text/plain' }]);
    await page.waitForChanges();

    // Read the name back inside the page itself: File instances returned
    // through Puppeteer's evaluate() lose their own properties, so resolve
    // `.name` in-browser and only cross the boundary with a plain string.
    const names = await page.evaluate(async () => {
      const dz = document.querySelector('material-dropzone') as HTMLElement & { getFiles(): Promise<File[]> };
      const files = await dz.getFiles();
      return files.map((f) => f.name);
    });
    expect(names).toEqual(['a.txt']);

    const fileChange = await page.spyOnEvent('fileChange');
    await el.callMethod('clear');
    await page.waitForChanges();

    expect(fileChange).toHaveReceivedEventTimes(1);
    const detail = fileChange.events[0].detail;
    expect(detail.files).toHaveLength(0);
    expect(detail.added).toHaveLength(0);
    expect(detail.removed).toHaveLength(1);
    const rows = await page.findAll('material-dropzone .dz-row');
    expect(rows).toHaveLength(0);
  });

  it('@Method setProgress drives the per-row progress UI (number, done, error)', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-dropzone name="a"></material-dropzone>`);
    await pickFiles(page, [{ name: 'a.txt', type: 'text/plain' }]);
    await page.waitForChanges();

    // getFiles() + setProgress() are chained inside one evaluate() call so the
    // File instance keeps its identity — the component matches rows via
    // `===`, which a value round-tripped through Node would never satisfy.
    await page.evaluate(async () => {
      const dz = document.querySelector('material-dropzone') as HTMLElement & {
        getFiles(): Promise<File[]>;
        setProgress(f: File, p: number | 'done' | 'error', m?: string): Promise<void>;
      };
      const files = await dz.getFiles();
      await dz.setProgress(files[0], 42);
    });
    await page.waitForChanges();
    let sub = await page.find('material-dropzone .dz-sub');
    expect(sub.textContent).toBe('42%');

    await page.evaluate(async () => {
      const dz = document.querySelector('material-dropzone') as HTMLElement & {
        getFiles(): Promise<File[]>;
        setProgress(f: File, p: number | 'done' | 'error', m?: string): Promise<void>;
      };
      const files = await dz.getFiles();
      await dz.setProgress(files[0], 'error', 'Network error');
    });
    await page.waitForChanges();
    sub = await page.find('material-dropzone .dz-sub');
    expect(sub.textContent).toBe('Network error');
    const row = await page.find('material-dropzone .dz-row');
    expect(row.className).toContain('is-error');
  });

  it('form participation: posts the accumulated files under `name` via a real form', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f"><material-dropzone name="attachments"></material-dropzone></form>
    `);
    await pickFiles(page, [{ name: 'a.txt', type: 'text/plain' }, { name: 'b.txt', type: 'text/plain' }]);
    await page.waitForChanges();

    const names = await page.evaluate(() => {
      const fd = new FormData(document.getElementById('f') as HTMLFormElement);
      return fd.getAll('attachments').map((f) => (f as File).name);
    });
    expect(names).toEqual(['a.txt', 'b.txt']);
  });

  it('formResetCallback: a native form reset clears all picked files', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f"><material-dropzone name="attachments"></material-dropzone></form>
    `);
    await pickFiles(page, [{ name: 'a.txt', type: 'text/plain' }]);
    await page.waitForChanges();
    let rows = await page.findAll('material-dropzone .dz-row');
    expect(rows).toHaveLength(1);

    await page.evaluate(() => (document.getElementById('f') as HTMLFormElement).reset());
    await page.waitForChanges();

    rows = await page.findAll('material-dropzone .dz-row');
    expect(rows).toHaveLength(0);
  });

  it('formDisabledCallback: a disabling fieldset disables the drop area and its input', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form><fieldset id="fs"><material-dropzone name="attachments"></material-dropzone></fieldset></form>
    `);
    let area = await page.find('material-dropzone .dz-area');
    expect(area.getAttribute('aria-disabled')).toBeNull();

    await page.evaluate(() => ((document.getElementById('fs') as HTMLFieldSetElement).disabled = true));
    await page.waitForChanges();

    area = await page.find('material-dropzone .dz-area');
    expect(area.className).toContain('disabled');
    expect(area.getAttribute('aria-disabled')).toBe('true');
    expect(area.getAttribute('tabindex')).toBe('-1');
    const input = await page.find('material-dropzone input[type="file"]');
    expect(input.getAttribute('disabled')).not.toBeNull();
  });

  it('required: constraint validation blocks submission until a file is added', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f"><material-dropzone name="attachments" required></material-dropzone></form>
    `);
    await page.waitForChanges();

    // material-dropzone doesn't expose checkValidity() itself (only
    // ElementInternals does) — a form-associated participant's validity
    // state is instead reflected onto the owning <form>'s own validity.
    const validBefore = await page.evaluate(() =>
      (document.getElementById('f') as HTMLFormElement).checkValidity(),
    );
    expect(validBefore).toBe(false);

    await pickFiles(page, [{ name: 'a.txt', type: 'text/plain' }]);
    await page.waitForChanges();

    const validAfter = await page.evaluate(() =>
      (document.getElementById('f') as HTMLFormElement).checkValidity(),
    );
    expect(validAfter).toBe(true);
  });

  it('a11y: the drop area exposes role=button and a keyboard-operable tabindex', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-dropzone name="a"></material-dropzone>`);
    const area = await page.find('material-dropzone .dz-area');
    expect(area.getAttribute('role')).toBe('button');
    expect(area.getAttribute('tabindex')).toBe('0');
  });
});
