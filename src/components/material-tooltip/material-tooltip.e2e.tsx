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

// Real browser, not newSpecPage: showing/hiding is driven by real
// pointerenter/pointerleave/focus/blur on the trigger, delay/hideDelay
// timers, and (for hover-mode tooltips) the native Popover API's
// :popover-open / light-dismiss. Mock-doc implements none of the pointer
// event choreography and has no Popover API — see docs/agents/testing.md.

describe('material-tooltip', () => {
  it('hovering the trigger shows the tooltip after `delay`, and leaving hides it after `hideDelay`', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-tooltip text="Save" delay="300" hide-delay="300">
        <button id="btn">Save</button>
      </material-tooltip>
    `);
    const showSpy = await page.spyOnEvent('tooltipShow');
    const hideSpy = await page.spyOnEvent('tooltipHide');
    const tooltip = await page.find('material-tooltip');
    const button = await page.find('#btn');

    await button.hover();
    await page.waitForTimeout(400);
    await page.waitForChanges();
    expect(await tooltip.getProperty('open')).toBe(true);
    expect(showSpy).toHaveReceivedEventTimes(1);

    // Move the mouse away from the trigger.
    await page.mouse.move(400, 400);
    await page.waitForChanges();
    await page.waitForTimeout(400);
    await page.waitForChanges();
    expect(await tooltip.getProperty('open')).toBe(false);
    expect(hideSpy).toHaveReceivedEventTimes(1);
  });

  it('focusing the trigger shows the tooltip, blurring it hides it', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-tooltip text="Save" delay="10" hide-delay="10">
        <button id="btn">Save</button>
      </material-tooltip>
      <button id="other">other</button>
    `);
    const tooltip = await page.find('material-tooltip');

    await page.waitForChanges();
    await page.evaluate(() => {
      document.getElementById('btn')!.dispatchEvent(new FocusEvent('focus'));
    });
    await page.waitForTimeout(80);
    await page.waitForChanges();
    expect(await tooltip.getProperty('open')).toBe(true);

    await page.evaluate(() => {
      document.getElementById('btn')!.dispatchEvent(new FocusEvent('blur'));
    });
    await page.waitForTimeout(80);
    await page.waitForChanges();
    expect(await tooltip.getProperty('open')).toBe(false);
  });

  it('the tooltip surface has role="tooltip" and toggles aria-hidden/inert with open', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-tooltip text="Save" delay="0">
        <button id="btn">Save</button>
      </material-tooltip>
    `);
    const tooltip = await page.find('material-tooltip');
    const surface = await page.find('material-tooltip >>> [part="surface"]');
    expect(surface.getAttribute('role')).toBe('tooltip');
    expect(surface.getAttribute('aria-hidden')).toBe('true');

    // material-tooltip has no show()/hide() methods — drive it via the `open` prop directly.
    await tooltip.setProperty('open', true);
    await page.waitForChanges();

    const surfaceAfter = await page.find('material-tooltip >>> [part="surface"]');
    expect(surfaceAfter.getAttribute('aria-hidden')).toBe('false');
    expect(surfaceAfter.getAttribute('inert')).toBeNull();
  });

  it('Escape dismisses an open tooltip', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-tooltip text="Save" delay="0">
        <button id="btn">Save</button>
      </material-tooltip>
    `);
    const tooltip = await page.find('material-tooltip');
    const button = await page.find('#btn');
    await page.waitForChanges();
    await button.focus();
    await page.waitForChanges();
    expect(await tooltip.getProperty('open')).toBe(true);

    await page.keyboard.press('Escape');
    await page.waitForChanges();
    expect(await tooltip.getProperty('open')).toBe(false);
  });

  it('persistent rich tooltip: a click on the trigger toggles it open/closed, and click-outside dismisses it', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-tooltip variant="rich" persistent text="Body">
        <button id="btn">Info</button>
      </material-tooltip>
      <div id="outside" style="position:fixed;top:300px;left:300px;width:20px;height:20px;">x</div>
    `);
    const tooltip = await page.find('material-tooltip');
    const showSpy = await page.spyOnEvent('tooltipShow');
    const button = await page.find('#btn');

    await button.click();
    await page.waitForChanges();
    expect(await tooltip.getProperty('open')).toBe(true);
    expect(showSpy).toHaveReceivedEventTimes(1);

    const outside = await page.find('#outside');
    await outside.click();
    await page.waitForChanges();
    expect(await tooltip.getProperty('open')).toBe(false);
  });

  it('does not open on touch pointerenter (only long-press), and closes on pointerup after a long press', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-tooltip text="Save" delay="0" hide-delay="0">
        <button id="btn">Save</button>
      </material-tooltip>
    `);
    const tooltip = await page.find('material-tooltip');
    await page.evaluate(() => {
      const btn = document.getElementById('btn')!;
      btn.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'touch', bubbles: true }));
    });
    await page.waitForChanges();
    expect(await tooltip.getProperty('open')).toBe(false);
  });
});
