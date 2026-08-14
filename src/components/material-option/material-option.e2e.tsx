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

// Real browser, not newSpecPage: these tests exercise document.activeElement
// across a mousedown/click sequence (handleMouseDown's preventDefault, meant
// to keep focus wherever the host — e.g. material-select's textfield — put
// it). Mock-doc doesn't model real focus transfer on pointer interaction, so
// this can only be verified against a real browser — see docs/agents/testing.md.

describe('material-option', () => {
  it('mousedown does not steal focus from whatever currently has it, but the click still selects', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <input id="anchor" />
      <material-option value="a" label="Apple"></material-option>
    `);
    const selectSpy = await page.spyOnEvent('materialOptionSelect');
    const input = await page.find('#anchor');
    await input.focus();
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('anchor');

    const option = await page.find('material-option');
    await option.click();
    await page.waitForChanges();

    expect(selectSpy).toHaveReceivedEventDetail({ value: 'a' });
    // Focus was never moved onto the option by the click.
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('anchor');
  });

  it('disabled option blocks click activation in a real browser', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-option value="a" disabled></material-option>`);
    const selectSpy = await page.spyOnEvent('materialOptionSelect');
    const option = await page.find('material-option');

    await option.click();
    await page.waitForChanges();
    expect(selectSpy).toHaveReceivedEventTimes(0);
  });

  it('Tab moves focus off a focusable option into the next document tab stop', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-option value="a" label="Apple"></material-option>
      <button id="after">after</button>
    `);
    const option = await page.find('material-option');
    await option.focus();
    expect(await page.evaluate(() => (document.activeElement as HTMLElement)?.tagName)).toBe(
      'MATERIAL-OPTION',
    );

    await page.keyboard.press('Tab');
    await page.waitForChanges();
    expect(await page.evaluate(() => (document.activeElement as HTMLElement)?.id)).toBe('after');
  });
});
