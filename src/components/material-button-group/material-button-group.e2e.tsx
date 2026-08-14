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

// Real browser coverage for selection behavior: the component intentionally
// queries direct children with :scope, which Stencil's mock-doc cannot parse.

describe('material-button-group', () => {
  it('selection-mode="single" keeps only the newly selected direct toggle and emits its value', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-button-group selection-mode="single">
        <material-button toggle value="bold" label="Bold"></material-button>
        <material-icon-button toggle value="italic" icon="format_italic"></material-icon-button>
      </material-button-group>
    `);
    const selection = await page.spyOnEvent('materialSelectionChange');

    await page.evaluate(() => {
      const [bold, italic] = Array.from(
        document.querySelectorAll('material-button, material-icon-button'),
      ) as Array<HTMLElement & { selected: boolean }>;
      bold.selected = false;
      italic.selected = true;
      bold.selected = true;
      bold.dispatchEvent(new CustomEvent('selectedChange', {
        detail: { selected: true },
        bubbles: true,
        composed: true,
      }));
    });
    await page.waitForChanges();

    expect(await page.$eval('material-button', (el) => (el as any).selected)).toBe(true);
    expect(await page.$eval('material-icon-button', (el) => (el as any).selected)).toBe(false);
    expect(selection).toHaveReceivedEventDetail({ values: ['bold'] });
  });

  it('required single selection restores the last selected toggle when it is deselected', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-button-group selection-mode="single" required>
        <material-button toggle value="bold" label="Bold" selected></material-button>
      </material-button-group>
    `);

    await page.evaluate(() => {
      const button = document.querySelector('material-button') as HTMLElement & { selected: boolean };
      button.selected = false;
      button.dispatchEvent(new CustomEvent('selectedChange', {
        detail: { selected: false },
        bubbles: true,
        composed: true,
      }));
    });
    await page.waitForChanges();

    expect(await page.$eval('material-button', (el) => (el as any).selected)).toBe(true);
  });
});
