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

// Real browser, not newSpecPage: material-fab is formAssociated and
// AttachInternals()-based. Neither Stencil's mock-doc nor jsdom implement
// ElementInternals' form-association methods, so any render of a
// formAssociated component throws outside a real browser — see
// docs/agents/testing.md.
//
// Unlike material-button/material-icon-button, material-fab has no
// toggle/selected mode and emits no custom @Event — it's a plain trigger
// (icon-only or extended icon+label) that's formAssociated only so it can
// resolve the ancestor form (internals.form) and honour
// formDisabledCallback, the same submit/reset/href/popovertarget contract as
// material-button minus the toggle behavior. It never sets a persistent
// form value; name/value are only contributed transiently while an actual
// type="submit" submission is in flight (see utils/form-submitter.ts).

describe('material-fab', () => {
  it('renders an icon-only button by default: type=button, no toggle/aria-pressed, not extended', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-fab icon="add"></material-fab>`);
    const el = await page.find('material-fab');
    const button = await page.find('material-fab >>> button');
    expect(button.getAttribute('type')).toBe('button');
    expect(button.getAttribute('aria-pressed')).toBeNull();
    expect(el.getAttribute('extended')).toBeNull();
    const icon = await page.find('material-fab >>> .icon');
    expect(icon).toEqualText('add');
  });

  it('reflects size and variant props as host attributes, with documented defaults', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-fab icon="add"></material-fab>`);
    const defaultEl = await page.find('material-fab');
    expect(defaultEl.getAttribute('size')).toBe('medium');
    expect(defaultEl.getAttribute('variant')).toBe('primary-container');

    const page2 = await newE2EPage();
    await page2.setContent(
      `<material-fab icon="edit" size="large" variant="secondary"></material-fab>`,
    );
    const el = await page2.find('material-fab');
    expect(el.getAttribute('size')).toBe('large');
    expect(el.getAttribute('variant')).toBe('secondary');
  });

  it('label makes the fab extended, rendering icon and label side by side, and toggles live', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-fab icon="add" label="Create"></material-fab>`);
    const el = await page.find('material-fab');
    expect(el.getAttribute('extended')).toBe('');
    const label = await page.find('material-fab >>> .label');
    expect(label).toEqualText('Create');

    await el.setProperty('label', undefined);
    await page.waitForChanges();
    expect(el.getAttribute('extended')).toBeNull();

    await el.setProperty('label', 'Compose');
    await page.waitForChanges();
    expect(el.getAttribute('extended')).toBe('');
    const labelAfter = await page.find('material-fab >>> .label');
    expect(labelAfter).toEqualText('Compose');
  });

  it('aria-label prop reflects onto the rendered button', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-fab icon="add" aria-label="Create item"></material-fab>`);
    const button = await page.find('material-fab >>> button');
    expect(button.getAttribute('aria-label')).toBe('Create item');
  });

  it('renders an anchor when href is set, with target=_blank rel parity and download', async () => {
    const page = await newE2EPage();
    await page.setContent(
      `<material-fab icon="open_in_new" href="/docs" target="_blank" download="doc.pdf"></material-fab>`,
    );
    const a = await page.find('material-fab >>> a');
    expect(a.getAttribute('href')).toBe('/docs');
    expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    expect(a.getAttribute('download')).toBe('doc.pdf');
  });

  it('disabled anchor: drops href, sets aria-disabled and tabindex=-1', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-fab icon="open_in_new" href="/docs" disabled></material-fab>`);
    const a = await page.find('material-fab >>> a');
    expect(a.getAttribute('href')).toBeNull();
    expect(a.getAttribute('aria-disabled')).toBe('true');
    expect(a.getAttribute('tabindex')).toBe('-1');
  });

  it('disabled button: carries the disabled attribute and native activation is blocked', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f"><material-fab icon="add" type="submit" disabled></material-fab></form>
    `);
    const button = await page.find('material-fab >>> button');
    expect(button.getAttribute('disabled')).not.toBeNull();

    await page.evaluate(() => {
      (window as unknown as { __submitted: boolean }).__submitted = false;
      document.getElementById('f')!.addEventListener('submit', (e) => {
        e.preventDefault();
        (window as unknown as { __submitted: boolean }).__submitted = true;
      });
    });
    // A native <button disabled> never dispatches click at all, so this
    // exercises the same platform guarantee the component relies on.
    await button.click();
    await page.waitForChanges();
    const submitted = await page.evaluate(
      () => (window as unknown as { __submitted: boolean }).__submitted,
    );
    expect(submitted).toBe(false);
  });

  it('type=submit contributes name/value to FormData only transiently, during the submission itself', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f"><material-fab icon="check" type="submit" name="action" value="save"></material-fab></form>
    `);
    await page.evaluate(() => {
      document.getElementById('f')!.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = new FormData(e.target as HTMLFormElement);
        (window as unknown as { __captured: FormDataEntryValue | null }).__captured =
          data.get('action');
      });
    });
    const button = await page.find('material-fab >>> button');

    // Never present outside of an in-flight submission.
    const before = await page.evaluate(
      () => new FormData(document.getElementById('f') as HTMLFormElement).get('action'),
    );
    expect(before).toBeNull();

    await button.click();
    await page.waitForChanges();
    const captured = await page.evaluate(
      () => (window as unknown as { __captured: FormDataEntryValue | null }).__captured,
    );
    expect(captured).toBe('save');

    // The transient hidden input is removed right after submitting, so it's
    // gone again once the submission has run.
    const after = await page.evaluate(
      () => new FormData(document.getElementById('f') as HTMLFormElement).get('action'),
    );
    expect(after).toBeNull();
  });

  it('form="id" targets a form by id instead of the ancestor form (dialog actions layout)', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="target"></form>
      <material-fab icon="check" type="submit" form="target" name="ok" value="yes"></material-fab>
    `);
    await page.evaluate(() => {
      document.getElementById('target')!.addEventListener('submit', (e) => {
        e.preventDefault();
        (window as unknown as { __submittedId: string }).__submittedId = (
          e.target as HTMLFormElement
        ).id;
      });
    });
    const button = await page.find('material-fab >>> button');
    await button.click();
    await page.waitForChanges();
    const submittedId = await page.evaluate(
      () => (window as unknown as { __submittedId: string }).__submittedId,
    );
    expect(submittedId).toBe('target');
  });

  it('type=reset resets the enclosing form', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f">
        <input id="txt" name="txt" value="original" />
        <material-fab icon="refresh" type="reset"></material-fab>
      </form>
    `);
    await page.evaluate(() => {
      (document.getElementById('txt') as HTMLInputElement).value = 'changed';
    });
    const button = await page.find('material-fab >>> button');
    await button.click();
    await page.waitForChanges();
    const value = await page.evaluate(() => (document.getElementById('txt') as HTMLInputElement).value);
    expect(value).toBe('original');
  });

  it('popovertarget (default toggle action) opens the referenced popover on click', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-fab icon="add" popovertarget="pop"></material-fab>
      <div id="pop" popover>content</div>
    `);
    const isOpen = () => page.evaluate(() => document.getElementById('pop')!.matches(':popover-open'));
    const button = await page.find('material-fab >>> button');

    expect(await isOpen()).toBe(false);
    await button.click();
    await page.waitForChanges();
    expect(await isOpen()).toBe(true);
  });

  it('popovertargetaction=hide explicitly closes the referenced popover on click', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-fab icon="add" popovertarget="pop" popovertargetaction="hide"></material-fab>
      <div id="pop" popover>content</div>
    `);
    await page.evaluate(() => document.getElementById('pop')!.showPopover());
    const isOpen = () => page.evaluate(() => document.getElementById('pop')!.matches(':popover-open'));
    expect(await isOpen()).toBe(true);

    const button = await page.find('material-fab >>> button');
    await button.click();
    await page.waitForChanges();
    expect(await isOpen()).toBe(false);
  });

  it('Space and Enter keyboard activation trigger the same behavior as a click', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-fab icon="add" popovertarget="pop"></material-fab>
      <div id="pop" popover>content</div>
    `);
    const isOpen = () => page.evaluate(() => document.getElementById('pop')!.matches(':popover-open'));
    const button = await page.find('material-fab >>> button');

    await button.focus();
    await button.press('Space');
    await page.waitForChanges();
    expect(await isOpen()).toBe(true);

    await button.press('Enter');
    await page.waitForChanges();
    expect(await isOpen()).toBe(false);
  });

  it('a fieldset disabling the form disables the fab (formDisabledCallback)', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form><fieldset id="fs"><material-fab icon="add"></material-fab></fieldset></form>
    `);
    const button = await page.find('material-fab >>> button');
    expect(button.getAttribute('disabled')).toBeNull();

    await page.evaluate(
      () => ((document.getElementById('fs') as HTMLFieldSetElement).disabled = true),
    );
    await page.waitForChanges();
    const buttonAfter = await page.find('material-fab >>> button');
    expect(buttonAfter.getAttribute('disabled')).not.toBeNull();
  });

  it('hide-near-end: gains the near-end attribute once the page is scrolled near the bottom', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <div style="height: 3000px;"></div>
      <material-fab icon="add" hide-near-end hide-offset="80"></material-fab>
    `);
    const el = await page.find('material-fab');
    // Set on connectedCallback via the initial onScroll() call.
    expect(el.getAttribute('near-end')).toBeNull();

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForChanges();
    const elAfterScroll = await page.find('material-fab');
    expect(elAfterScroll.getAttribute('near-end')).toBe('');

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForChanges();
    const elAfterScrollBack = await page.find('material-fab');
    expect(elAfterScrollBack.getAttribute('near-end')).toBeNull();
  });
});
