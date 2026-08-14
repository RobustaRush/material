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

// Real browser, not newSpecPage: material-file-field is formAssociated and
// calls this.internals.setValidity() unconditionally from componentDidRender.
// Neither Stencil's mock-doc nor jsdom implement ElementInternals'
// form-association methods, so any render of a formAssociated component
// throws outside a real browser — see docs/agents/testing.md.

// material-file-field is `shadow: false`: its rendered <material-textfield>
// and <material-icon-button> children are ordinary light-DOM descendants of
// the host, so plain descendant selectors reach them without `>>>`. Only the
// textfield's own internal <input> (rendered inside material-textfield's own
// shadow root) needs a `>>>` to pierce that boundary.

// Push a fake File into the hidden <input type="file"> the way a real pick
// would, then fire the same 'change' event the component listens for. Real
// DataTransfer + FileList assignment only exists in a real browser.
async function pickFile(
  page: import('@stencil/core/testing').E2EPage,
  files: { name: string; type: string }[],
) {
  await page.evaluate((filesArg: { name: string; type: string }[]) => {
    const host = document.querySelector('material-file-field') as HTMLElement;
    const input = host.querySelector('input[type="file"]') as HTMLInputElement;
    const dt = new DataTransfer();
    for (const f of filesArg) dt.items.add(new File(['x'], f.name, { type: f.type }));
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, files);
}

describe('material-file-field', () => {
  it('renders outlined by default with a readonly textfield and an attach action', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-file-field name="doc" label="Document"></material-file-field>`);
    const tf = await page.find('material-file-field material-textfield');
    expect(await tf.getProperty('variant')).toBe('outlined');
    expect(tf).toHaveAttribute('readonly');

    const buttons = await page.findAll('material-file-field material-icon-button');
    expect(buttons).toHaveLength(1); // no file yet: only the attach action
    expect(await buttons[0].getProperty('icon')).toBe('attach_file');
  });

  it('variant="filled" passes through to the inner textfield', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-file-field name="doc" variant="filled"></material-file-field>`);
    const tf = await page.find('material-file-field material-textfield');
    expect(await tf.getProperty('variant')).toBe('filled');
  });

  it('current-name/current-url: shows the download link and displays the existing filename', async () => {
    const page = await newE2EPage();
    await page.setContent(
      `<material-file-field name="doc" current-name="report.pdf" current-url="/files/report.pdf" download-label="Download"></material-file-field>`,
    );
    const link = await page.find('material-file-field a.download');
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toBe('/files/report.pdf');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('aria-label')).toBe('Download');

    const tf = await page.find('material-file-field material-textfield');
    expect(await tf.getProperty('value')).toBe('report.pdf');

    // A currently-uploaded file swaps the attach icon for "edit" and adds the
    // clear/undo toggle.
    const buttons = await page.findAll('material-file-field material-icon-button');
    expect(buttons).toHaveLength(2);
    const icons = await Promise.all(buttons.map((b) => b.getProperty('icon')));
    expect(icons).toContain('edit');
    expect(icons).toContain('close');
  });

  it('help-text / error-text: the textfield shows error text only when error is set', async () => {
    const page = await newE2EPage();
    await page.setContent(
      `<material-file-field name="doc" help-text="PDF only" error-text="Bad file" error></material-file-field>`,
    );
    const tf = await page.find('material-file-field material-textfield');
    expect(await tf.getProperty('errorText')).toBe('Bad file');
    expect(await tf.getProperty('error')).toBe(true);
  });

  it('clicking the field surface opens the native picker (not on a button or link)', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-file-field name="doc"></material-file-field>`);
    await page.evaluate(() => {
      const host = document.querySelector('material-file-field') as HTMLElement;
      const input = host.querySelector('input[type="file"]') as HTMLInputElement;
      (window as any).__pickerOpened = false;
      input.click = () => { (window as any).__pickerOpened = true; };
    });
    const host = await page.find('material-file-field');
    await host.click();
    await page.waitForChanges();
    const opened = await page.evaluate(() => (window as any).__pickerOpened);
    expect(opened).toBe(true);
  });

  it('picking a file fires fileChange with file/files detail and updates the textfield value', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-file-field name="doc"></material-file-field>`);
    const fileChange = await page.spyOnEvent('fileChange');

    await pickFile(page, [{ name: 'a.pdf', type: 'application/pdf' }]);
    await page.waitForChanges();

    expect(fileChange).toHaveReceivedEventTimes(1);
    const detail = fileChange.events[0].detail;
    expect(detail.cleared).toBe(false);
    expect(detail.files).toHaveLength(1);

    const tf = await page.find('material-file-field material-textfield');
    expect(await tf.getProperty('value')).toBe('a.pdf');
  });

  it('multiple: picking several files joins their names in the display value', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-file-field name="doc" multiple></material-file-field>`);
    await pickFile(page, [
      { name: 'a.pdf', type: 'application/pdf' },
      { name: 'b.pdf', type: 'application/pdf' },
    ]);
    await page.waitForChanges();
    const tf = await page.find('material-file-field material-textfield');
    expect(await tf.getProperty('value')).toBe('a.pdf, b.pdf');
  });

  it('clear toggle: arms the ${name}-clear checkbox, dims the value, and emits fileChange(cleared: true)', async () => {
    const page = await newE2EPage();
    await page.setContent(
      `<material-file-field name="doc" current-name="report.pdf" current-url="/files/report.pdf" clear-label="Clear"></material-file-field>`,
    );
    const fileChange = await page.spyOnEvent('fileChange');
    const clearBtn = await page.find('material-file-field .trailing material-icon-button:first-child >>> button');
    await clearBtn.click();
    await page.waitForChanges();

    expect(fileChange).toHaveReceivedEventTimes(1);
    expect(fileChange.events[0].detail).toEqual({ file: null, files: [], cleared: true });

    const tf = await page.find('material-file-field material-textfield');
    expect(await tf.getProperty('dimmed')).toBe(true);
    const checkbox = await page.find('material-file-field input[type="checkbox"]');
    expect(await checkbox.getProperty('checked')).toBe(true);

    // Undo restores it.
    const undoBtn = await page.find('material-file-field .trailing material-icon-button:first-child >>> button');
    await undoBtn.click();
    await page.waitForChanges();
    expect(fileChange).toHaveReceivedEventTimes(2);
    expect(fileChange.events[1].detail).toEqual({ file: null, files: [], cleared: false });
    const checkboxAfter = await page.find('material-file-field input[type="checkbox"]');
    expect(await checkboxAfter.getProperty('checked')).toBe(false);
  });

  it('form participation: the native file input and clear checkbox post under name/${name}-clear', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f"><material-file-field name="doc"></material-file-field></form>
    `);
    await pickFile(page, [{ name: 'a.pdf', type: 'application/pdf' }]);
    await page.waitForChanges();

    const names = await page.evaluate(() => {
      const fd = new FormData(document.getElementById('f') as HTMLFormElement);
      return fd.getAll('doc').map((f) => (f as File).name);
    });
    expect(names).toEqual(['a.pdf']);

    const clearBtn = await page.find('material-file-field .trailing material-icon-button:first-child >>> button');
    await clearBtn.click();
    await page.waitForChanges();

    const cleared = await page.evaluate(() => {
      const fd = new FormData(document.getElementById('f') as HTMLFormElement);
      return fd.get('doc-clear');
    });
    expect(cleared).toBe('on');
  });

  it('formResetCallback: a native form reset clears picked files and the pending-clear flag', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f"><material-file-field name="doc" current-name="report.pdf"></material-file-field></form>
    `);
    const clearBtn = await page.find('material-file-field .trailing material-icon-button:first-child >>> button');
    await clearBtn.click();
    await page.waitForChanges();
    let checkbox = await page.find('material-file-field input[type="checkbox"]');
    expect(await checkbox.getProperty('checked')).toBe(true);

    await page.evaluate(() => (document.getElementById('f') as HTMLFormElement).reset());
    await page.waitForChanges();

    checkbox = await page.find('material-file-field input[type="checkbox"]');
    expect(await checkbox.getProperty('checked')).toBe(false);
    const tf = await page.find('material-file-field material-textfield');
    expect(await tf.getProperty('value')).toBe('report.pdf');
  });

  it('formDisabledCallback: a disabling fieldset disables the textfield, buttons and hidden inputs', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form><fieldset id="fs"><material-file-field name="doc"></material-file-field></fieldset></form>
    `);
    let tf = await page.find('material-file-field material-textfield');
    expect(await tf.getProperty('disabled')).toBe(false);

    await page.evaluate(() => ((document.getElementById('fs') as HTMLFieldSetElement).disabled = true));
    await page.waitForChanges();

    tf = await page.find('material-file-field material-textfield');
    expect(await tf.getProperty('disabled')).toBe(true);
    const btn = await page.find('material-file-field material-icon-button');
    expect(await btn.getProperty('disabled')).toBe(true);
    const input = await page.find('material-file-field input[type="file"]');
    expect(input.getAttribute('disabled')).not.toBeNull();
  });

  it('required: blocks the form until a file is selected or an existing one is kept', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f"><material-file-field name="doc" required></material-file-field></form>
    `);
    await page.waitForChanges();
    const validBefore = await page.evaluate(() =>
      (document.getElementById('f') as HTMLFormElement).checkValidity(),
    );
    expect(validBefore).toBe(false);

    await pickFile(page, [{ name: 'a.pdf', type: 'application/pdf' }]);
    await page.waitForChanges();
    const validAfter = await page.evaluate(() =>
      (document.getElementById('f') as HTMLFormElement).checkValidity(),
    );
    expect(validAfter).toBe(true);
  });

  it('required + an existing file: satisfied without picking, invalid once cleared', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f"><material-file-field name="doc" required current-name="report.pdf"></material-file-field></form>
    `);
    await page.waitForChanges();
    const validWithExisting = await page.evaluate(() =>
      (document.getElementById('f') as HTMLFormElement).checkValidity(),
    );
    expect(validWithExisting).toBe(true);

    const clearBtn = await page.find('material-file-field .trailing material-icon-button:first-child >>> button');
    await clearBtn.click();
    await page.waitForChanges();

    const validAfterClear = await page.evaluate(() =>
      (document.getElementById('f') as HTMLFormElement).checkValidity(),
    );
    expect(validAfterClear).toBe(false);
  });

  it('a11y: change/clear icon-buttons carry the caller-supplied aria-labels', async () => {
    const page = await newE2EPage();
    await page.setContent(
      `<material-file-field name="doc" current-name="report.pdf" change-label="Replace" clear-label="Remove"></material-file-field>`,
    );
    const buttons = await page.findAll('material-file-field .trailing material-icon-button');
    expect(await buttons[0].getProperty('ariaLabel')).toBe('Remove');
    expect(await buttons[1].getProperty('ariaLabel')).toBe('Replace');
  });
});
