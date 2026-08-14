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

// Real browser, not newSpecPage: material-rich-text is formAssociated and
// relies on a real contenteditable editing surface.

describe('material-rich-text', () => {
  it('renders label/toolbar/editor and posts the HTML value with the form', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f"><material-rich-text name="body" label="Body"></material-rich-text></form>
    `);
    const el = await page.find('material-rich-text');
    await el.setProperty('value', '<p>Hello</p>');
    await page.waitForChanges();

    expect(await page.find('material-rich-text >>> #label')).toEqualText('Body');
    expect(await page.find('material-rich-text >>> .toolbar')).not.toBeNull();
    expect(await page.evaluate(() =>
      (document.querySelector('material-rich-text')!.shadowRoot!.querySelector('.editor') as HTMLElement).innerHTML,
    )).toBe('<p>Hello</p>');
    expect(await page.evaluate(() =>
      new FormData(document.getElementById('f') as HTMLFormElement).get('body'),
    )).toBe('<p>Hello</p>');
  });

  it('input emits valueInput and blur emits valueChange with the editor HTML', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-rich-text></material-rich-text>`);
    const input = await page.spyOnEvent('valueInput');
    const change = await page.spyOnEvent('valueChange');

    await page.evaluate(() => {
      const editor = document.querySelector('material-rich-text')!.shadowRoot!.querySelector('.editor') as HTMLElement;
      editor.innerHTML = '<p>Draft</p>';
      editor.dispatchEvent(new InputEvent('input', { bubbles: true }));
      editor.dispatchEvent(new FocusEvent('blur', { bubbles: true, relatedTarget: null }));
    });
    await page.waitForChanges();

    expect(input).toHaveReceivedEventDetail({ value: '<p>Draft</p>' });
    expect(change).toHaveReceivedEventDetail({ value: '<p>Draft</p>' });
  });

  it('required empty editor is invalid, but non-empty HTML satisfies the constraint', async () => {
    const page = await newE2EPage();
    await page.setContent(`<form id="f"><material-rich-text name="body" required></material-rich-text></form>`);
    const validBefore = await page.evaluate(() =>
      (document.getElementById('f') as HTMLFormElement).checkValidity(),
    );
    expect(validBefore).toBe(false);

    const el = await page.find('material-rich-text');
    await el.setProperty('value', '<p>Filled</p>');
    await page.waitForChanges();

    const validAfter = await page.evaluate(() =>
      (document.getElementById('f') as HTMLFormElement).checkValidity(),
    );
    expect(validAfter).toBe(true);
  });

  it('disabled and readonly prevent editing through the toolbar/editor controls', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-rich-text disabled readonly></material-rich-text>`);

    expect(await page.$eval(
      'material-rich-text',
      (el) => (el.shadowRoot!.querySelector('.editor') as HTMLElement).isContentEditable,
    )).toBe(false);
    const disabledButtons = await page.$$eval(
      'material-rich-text >>> .tb-btn',
      (buttons) => buttons.every((button) => (button as HTMLButtonElement).disabled),
    );
    expect(disabledButtons).toBe(true);
  });

  it('form reset restores the initial value', async () => {
    const page = await newE2EPage();
    await page.setContent(`<form id="f"><material-rich-text name="body"></material-rich-text></form>`);
    const el = await page.find('material-rich-text');
    await el.setProperty('value', '<p>Initial</p>');
    await page.waitForChanges();
    await page.evaluate(() => {
      const editor = document.querySelector('material-rich-text')!.shadowRoot!.querySelector('.editor') as HTMLElement;
      editor.innerHTML = '<p>Changed</p>';
      editor.dispatchEvent(new InputEvent('input', { bubbles: true }));
      (document.getElementById('f') as HTMLFormElement).reset();
    });
    await page.waitForChanges();

    expect(await el.getProperty('value')).toBe('');
  });
});
