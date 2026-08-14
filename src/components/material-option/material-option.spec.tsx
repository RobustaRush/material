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

import { newSpecPage } from '@stencil/core/testing';
import { MaterialOption } from './material-option';

describe('material-option', () => {
  it('renders the label and default a11y attributes', async () => {
    const page = await newSpecPage({
      components: [MaterialOption],
      html: `<material-option value="a" label="Apple" leading-icon="eco"></material-option>`,
    });
    expect(page.root!.getAttribute('role')).toBe('option');
    expect(page.root!.getAttribute('tabindex')).toBe('0');
    expect(page.root!.getAttribute('aria-selected')).toBe('false');
    expect(page.root!.getAttribute('aria-disabled')).toBeNull();
    expect(page.root!.getAttribute('aria-checked')).toBeNull();
    const label = page.root!.shadowRoot!.querySelector('.label')!;
    expect(label.textContent).toBe('Apple');
    const icon = page.root!.shadowRoot!.querySelector('.leading .icon')!;
    expect(icon.textContent).toBe('eco');
  });

  it('disabled: reflects the attribute and sets aria-disabled/tabindex, blocking activation', async () => {
    const page = await newSpecPage({
      components: [MaterialOption],
      html: `<material-option value="a" disabled></material-option>`,
    });
    expect(page.root!.getAttribute('aria-disabled')).toBe('true');
    expect(page.root!.getAttribute('tabindex')).toBe('-1');

    const selectSpy = jest.fn();
    page.root!.addEventListener('materialOptionSelect', selectSpy);
    page.root!.click();
    await page.waitForChanges();
    expect(selectSpy).not.toHaveBeenCalled();
  });

  it('selected: reflects the attribute and sets aria-selected', async () => {
    const page = await newSpecPage({
      components: [MaterialOption],
      html: `<material-option value="a" selected></material-option>`,
    });
    expect(page.root!.getAttribute('selected')).toBe('');
    expect(page.root!.getAttribute('aria-selected')).toBe('true');
  });

  it('click emits materialOptionSelect with the value in single-select mode', async () => {
    const page = await newSpecPage({
      components: [MaterialOption],
      html: `<material-option value="a" label="Apple"></material-option>`,
    });
    const selectSpy = jest.fn();
    const toggleSpy = jest.fn();
    page.root!.addEventListener('materialOptionSelect', selectSpy);
    page.root!.addEventListener('materialOptionToggle', toggleSpy);

    page.root!.click();
    await page.waitForChanges();

    expect(selectSpy).toHaveBeenCalledTimes(1);
    expect(selectSpy.mock.calls[0][0].detail).toEqual({ value: 'a' });
    expect(toggleSpy).not.toHaveBeenCalled();
  });

  it('multi: renders a checkbox glyph and emits materialOptionToggle instead of materialOptionSelect', async () => {
    const page = await newSpecPage({
      components: [MaterialOption],
      html: `<material-option value="a" label="Apple" multi></material-option>`,
    });
    expect(page.root!.getAttribute('aria-checked')).toBe('false');
    const glyph = page.root!.shadowRoot!.querySelector('.check-icon')!;
    expect(glyph.textContent).toBe('check_box_outline_blank');

    const selectSpy = jest.fn();
    const toggleSpy = jest.fn();
    page.root!.addEventListener('materialOptionSelect', selectSpy);
    page.root!.addEventListener('materialOptionToggle', toggleSpy);

    page.root!.click();
    await page.waitForChanges();

    expect(selectSpy).not.toHaveBeenCalled();
    expect(toggleSpy).toHaveBeenCalledTimes(1);
    expect(toggleSpy.mock.calls[0][0].detail).toEqual({ value: 'a', selected: true });
  });

  it('multi + selected: the checkbox glyph shows checked, toggle flips it off', async () => {
    const page = await newSpecPage({
      components: [MaterialOption],
      html: `<material-option value="a" multi selected></material-option>`,
    });
    const glyph = page.root!.shadowRoot!.querySelector('.check-icon')!;
    expect(glyph.textContent).toBe('check_box');

    const toggleSpy = jest.fn();
    page.root!.addEventListener('materialOptionToggle', toggleSpy);
    page.root!.click();
    await page.waitForChanges();
    expect(toggleSpy.mock.calls[0][0].detail).toEqual({ value: 'a', selected: false });
  });

  it('Enter and Space activate the option, other keys do not', async () => {
    const page = await newSpecPage({
      components: [MaterialOption],
      html: `<material-option value="a"></material-option>`,
    });
    const selectSpy = jest.fn();
    page.root!.addEventListener('materialOptionSelect', selectSpy);

    page.root!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await page.waitForChanges();
    expect(selectSpy).toHaveBeenCalledTimes(1);

    page.root!.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    await page.waitForChanges();
    expect(selectSpy).toHaveBeenCalledTimes(2);

    page.root!.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    await page.waitForChanges();
    expect(selectSpy).toHaveBeenCalledTimes(2);
  });

  it('setting `selected` programmatically after load emits a request-selection event', async () => {
    const page = await newSpecPage({
      components: [MaterialOption],
      html: `<material-option value="a"></material-option>`,
    });
    const requestSpy = jest.fn();
    page.root!.addEventListener('materialOptionRequestSelection', requestSpy);

    page.rootInstance.selected = true;
    await page.waitForChanges();

    expect(requestSpy).toHaveBeenCalledTimes(1);
    expect(requestSpy.mock.calls[0][0].detail).toEqual({ value: 'a' });
  });

  it('setting `selected` back to false programmatically emits a request-deselection event', async () => {
    const page = await newSpecPage({
      components: [MaterialOption],
      html: `<material-option value="a" selected></material-option>`,
    });
    const deselectSpy = jest.fn();
    page.root!.addEventListener('materialOptionRequestDeselection', deselectSpy);

    page.rootInstance.selected = false;
    await page.waitForChanges();

    expect(deselectSpy).toHaveBeenCalledTimes(1);
    expect(deselectSpy.mock.calls[0][0].detail).toEqual({ value: 'a' });
  });

  it('two-line: supporting-text renders a second line only when the prop is set', async () => {
    const page = await newSpecPage({
      components: [MaterialOption],
      html: `<material-option value="a" label="Apple" supporting-text="A crisp fruit"></material-option>`,
    });
    const supporting = page.root!.shadowRoot!.querySelector('.supporting-text');
    expect(supporting).not.toBeNull();
    expect(page.root!.shadowRoot!.querySelector('.row')!.classList.contains('two-line')).toBe(true);
  });
});
