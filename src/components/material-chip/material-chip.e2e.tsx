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

// Real browser, not newSpecPage: material-chip is formAssociated and calls
// this.internals.setFormValue() unconditionally from connectedCallback.
// Neither Stencil's mock-doc nor jsdom implement ElementInternals'
// form-association methods, so any render of a formAssociated component
// throws outside a real browser — see docs/agents/testing.md.

describe('material-chip', () => {
  it('renders an assist chip by default: plain button, label slotted, no selection role', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-chip label="Spicy"></material-chip>`);
    const button = await page.find('material-chip >>> button');
    expect(button.getAttribute('part')).toBe('chip');
    expect(button.getAttribute('role')).toBeNull();
    expect(button.getAttribute('aria-checked')).toBeNull();
    expect(button).toEqualText('Spicy');
  });

  it('assist and suggestion chips are not selectable: clicking never toggles selected or emits selectedChange', async () => {
    for (const variant of ['assist', 'suggestion']) {
      const page = await newE2EPage();
      await page.setContent(`<material-chip variant="${variant}" label="Tag"></material-chip>`);
      const selectedChange = await page.spyOnEvent('selectedChange');
      const el = await page.find('material-chip');
      const button = await page.find('material-chip >>> button');
      expect(button.getAttribute('role')).toBeNull();

      await button.click();
      await page.waitForChanges();

      expect(await el.getProperty('selected')).toBe(false);
      expect(selectedChange).toHaveReceivedEventTimes(0);
    }
  });

  it('filter chip: role=checkbox, click toggles selected, updates aria-checked, and emits selectedChange', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-chip variant="filter" label="Spicy"></material-chip>`);
    const selectedChange = await page.spyOnEvent('selectedChange');
    const el = await page.find('material-chip');
    const button = await page.find('material-chip >>> button');
    expect(button.getAttribute('role')).toBe('checkbox');
    expect(button.getAttribute('aria-checked')).toBe('false');

    await button.click();
    await page.waitForChanges();
    expect(await el.getProperty('selected')).toBe(true);
    expect(button.getAttribute('aria-checked')).toBe('true');
    expect(selectedChange).toHaveReceivedEventDetail({ selected: true });

    await button.click();
    await page.waitForChanges();
    expect(await el.getProperty('selected')).toBe(false);
    expect(button.getAttribute('aria-checked')).toBe('false');
    expect(selectedChange).toHaveReceivedEventTimes(2);
  });

  it('filter chip: toggling also dispatches native input and change events (legacy form-library compat)', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-chip variant="filter" label="Spicy"></material-chip>`);
    const inputSpy = await page.spyOnEvent('input');
    const changeSpy = await page.spyOnEvent('change');
    const button = await page.find('material-chip >>> button');

    await button.click();
    await page.waitForChanges();

    expect(inputSpy).toHaveReceivedEventTimes(1);
    expect(changeSpy).toHaveReceivedEventTimes(1);
  });

  it('input chip: renders primary body + trailing remove action; clicking the body toggles selected without dispatching native input/change', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-chip variant="input" label="Tag"></material-chip>`);
    const selectedChange = await page.spyOnEvent('selectedChange');
    const inputSpy = await page.spyOnEvent('input');
    const el = await page.find('material-chip');
    const body = await page.find('material-chip >>> button.body');
    const trailing = await page.find('material-chip >>> .trailing-btn');
    expect(body.getAttribute('role')).toBe('checkbox');
    expect(trailing.getAttribute('aria-label')).toBe('Remove Tag');

    await body.click();
    await page.waitForChanges();

    expect(await el.getProperty('selected')).toBe(true);
    expect(selectedChange).toHaveReceivedEventDetail({ selected: true });
    expect(inputSpy).toHaveReceivedEventTimes(0);
  });

  it('input chip: clicking the trailing action emits a cancelable remove event and removes the chip from the DOM', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-chip variant="input" label="Tag"></material-chip>`);
    const removeSpy = await page.spyOnEvent('remove');
    const trailing = await page.find('material-chip >>> .trailing-btn');

    await trailing.click();
    await page.waitForChanges();

    expect(removeSpy).toHaveReceivedEventTimes(1);
    expect(await page.find('material-chip')).toBeNull();
  });

  it('input chip: remove is cancelable — preventDefault on the remove event keeps the chip', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-chip variant="input" label="Tag"></material-chip>`);
    await page.$eval('material-chip', (host) => host.addEventListener('remove', (e: Event) => e.preventDefault()));
    const removeSpy = await page.spyOnEvent('remove');
    const trailing = await page.find('material-chip >>> .trailing-btn');

    await trailing.click();
    await page.waitForChanges();

    expect(removeSpy).toHaveReceivedEventTimes(1);
    expect(await page.find('material-chip')).not.toBeNull();
  });

  it('input chip: Backspace on the focused primary action removes the chip', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-chip variant="input" label="Tag"></material-chip>`);
    const removeSpy = await page.spyOnEvent('remove');
    const body = await page.find('material-chip >>> button.body');

    await body.focus();
    await body.press('Backspace');
    await page.waitForChanges();

    expect(removeSpy).toHaveReceivedEventTimes(1);
    expect(await page.find('material-chip')).toBeNull();
  });

  it('input chip: ArrowRight/ArrowLeft move focus between the primary and trailing actions', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-chip variant="input" label="Tag"></material-chip>`);
    const body = await page.find('material-chip >>> button.body');
    const trailing = await page.find('material-chip >>> .trailing-btn');
    const activeClass = () =>
      page.evaluate(() => (document.querySelector('material-chip') as any).shadowRoot.activeElement.className);

    await body.press('ArrowRight');
    await page.waitForChanges();
    expect(await activeClass()).toContain('trailing-btn');

    await trailing.press('ArrowLeft');
    await page.waitForChanges();
    expect(await activeClass()).toContain('body');
  });

  it('keyboard: Enter and Space on a filter chip toggle selection exactly once each', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-chip variant="filter" label="Spicy"></material-chip>`);
    const selectedChange = await page.spyOnEvent('selectedChange');
    const el = await page.find('material-chip');
    const button = await page.find('material-chip >>> button');

    await button.press('Enter');
    await page.waitForChanges();
    expect(await el.getProperty('selected')).toBe(true);
    expect(selectedChange).toHaveReceivedEventTimes(1);

    await button.press(' ');
    await page.waitForChanges();
    expect(await el.getProperty('selected')).toBe(false);
    expect(selectedChange).toHaveReceivedEventTimes(2);
  });

  it('disabled: blocks click activation on a filter chip', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-chip variant="filter" disabled label="Spicy"></material-chip>`);
    const selectedChange = await page.spyOnEvent('selectedChange');
    const el = await page.find('material-chip');
    const button = await page.find('material-chip >>> button');
    expect(button.getAttribute('disabled')).not.toBeNull();

    await button.click();
    await page.waitForChanges();
    expect(await el.getProperty('selected')).toBe(false);
    expect(selectedChange).toHaveReceivedEventTimes(0);
  });

  it('disabled href chip: removes href, sets role=link and tabindex=-1', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-chip href="/docs" disabled label="Docs"></material-chip>`);
    const a = await page.find('material-chip >>> a');
    expect(a.getAttribute('href')).toBeNull();
    expect(a.getAttribute('role')).toBe('link');
    expect(a.getAttribute('tabindex')).toBe('-1');
  });

  it('href chip: renders an anchor with target/rel/download passthrough', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-chip href="/docs" target="_blank" download="file.pdf" label="Docs"></material-chip>`);
    const a = await page.find('material-chip >>> a');
    expect(a.getAttribute('href')).toBe('/docs');
    expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    expect(a.getAttribute('download')).toBe('file.pdf');
  });

  it('soft-disabled: stays natively enabled but the click handler blocks activation', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-chip variant="filter" soft-disabled label="Spicy"></material-chip>`);
    const el = await page.find('material-chip');
    const button = await page.find('material-chip >>> button');
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.getAttribute('disabled')).toBeNull();

    await button.click();
    await page.waitForChanges();
    expect(await el.getProperty('selected')).toBe(false);
  });

  it('soft-disabled href chip: keeps href (stays focusable) but reports aria-disabled', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-chip href="/docs" soft-disabled label="Docs"></material-chip>`);
    const a = await page.find('material-chip >>> a');
    expect(a.getAttribute('aria-disabled')).toBe('true');
    expect(a.getAttribute('href')).toBe('/docs');
  });

  it('icon, trailingIcon, and label render in the shadow DOM as documented', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-chip icon="star" trailing-icon="close" label="Favorite"></material-chip>`);
    const leading = await page.find('material-chip >>> .icon.leading');
    const trailing = await page.find('material-chip >>> .icon.trailing');
    const label = await page.find('material-chip >>> .label');
    expect(leading.textContent).toBe('star');
    expect(trailing.textContent).toBe('close');
    expect(label.textContent).toBe('Favorite');
  });

  it('ariaLabel overrides the label fallback for the accessible name, while the label text still renders', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-chip label="Spicy" aria-label="Spicy filter chip"></material-chip>`);
    const button = await page.find('material-chip >>> button');
    expect(button.getAttribute('aria-label')).toBe('Spicy filter chip');
    expect(button).toEqualText('Spicy');
  });

  it('elevated reflects as a boolean attribute on the host', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-chip elevated label="Spicy"></material-chip>`);
    const el = await page.find('material-chip');
    expect(el.getAttribute('elevated')).not.toBeNull();
  });

  it('a slotted avatar renders inside a dedicated wrapper', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-chip label="Ada"><img slot="avatar" src="a.png" /></material-chip>`);
    const avatarWrapper = await page.find('material-chip >>> .avatar');
    expect(avatarWrapper).not.toBeNull();
  });

  it('inside a chip-set with selection="single", a filter chip reports role=radio instead of checkbox', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-chip-set selection="single">
        <material-chip variant="filter" label="A"></material-chip>
      </material-chip-set>
    `);
    const button = await page.find('material-chip >>> button');
    expect(button.getAttribute('role')).toBe('radio');
  });

  it('tabbable=false removes the primary action from the tab order', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-chip tabbable="false" label="Spicy"></material-chip>`);
    const button = await page.find('material-chip >>> button');
    expect(button.getAttribute('tabindex')).toBe('-1');
  });

  it('@Method setFocus focuses the primary action by default, and the trailing action with {trailing: true}', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-chip variant="input" label="Tag"></material-chip>`);
    const el = await page.find('material-chip');
    const activeClass = () =>
      page.evaluate(() => (document.querySelector('material-chip') as any).shadowRoot.activeElement.className);

    await el.callMethod('setFocus');
    await page.waitForChanges();
    expect(await activeClass()).toContain('body');

    await el.callMethod('setFocus', { trailing: true });
    await page.waitForChanges();
    expect(await activeClass()).toContain('trailing-btn');
  });

  it('@Method setFocus is a no-op on a disabled chip', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-chip disabled label="Tag"></material-chip>`);
    const el = await page.find('material-chip');

    await el.callMethod('setFocus');
    await page.waitForChanges();
    const bodyHasFocus = await page.evaluate(() => document.activeElement === document.body);
    expect(bodyHasFocus).toBe(true);
  });

  it('form participation: filter/input chips contribute name/value only while selected', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f"><material-chip variant="filter" name="opt" value="yes"></material-chip></form>
    `);
    const button = await page.find('material-chip >>> button');
    const formValue = () =>
      page.evaluate(() => new FormData(document.getElementById('f') as HTMLFormElement).get('opt'));

    expect(await formValue()).toBeNull();

    await button.click();
    await page.waitForChanges();
    expect(await formValue()).toBe('yes');

    await button.click();
    await page.waitForChanges();
    expect(await formValue()).toBeNull();
  });

  it('form participation: an assist chip never contributes a value, even with selected set true', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f"><material-chip variant="assist" selected name="opt" value="yes"></material-chip></form>
    `);
    const formValue = await page.evaluate(
      () => new FormData(document.getElementById('f') as HTMLFormElement).get('opt'),
    );
    expect(formValue).toBeNull();
  });

  it('a native form reset restores the default selected state of a filter chip', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f"><material-chip variant="filter" selected name="opt" value="yes"></material-chip></form>
    `);
    const el = await page.find('material-chip');
    const button = await page.find('material-chip >>> button');

    await button.click();
    await page.waitForChanges();
    expect(await el.getProperty('selected')).toBe(false);

    await page.evaluate(() => (document.getElementById('f') as HTMLFormElement).reset());
    await page.waitForChanges();
    expect(await el.getProperty('selected')).toBe(true);
  });

  it('a fieldset disabling the form disables the chip', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form><fieldset id="fs"><material-chip label="Spicy"></material-chip></fieldset></form>
    `);
    const button = await page.find('material-chip >>> button');
    expect(button.getAttribute('disabled')).toBeNull();

    await page.evaluate(() => ((document.getElementById('fs') as HTMLFieldSetElement).disabled = true));
    await page.waitForChanges();
    const buttonAfter = await page.find('material-chip >>> button');
    expect(buttonAfter.getAttribute('disabled')).not.toBeNull();
  });
});
