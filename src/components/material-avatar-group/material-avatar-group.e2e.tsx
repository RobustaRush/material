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

// Real browser, not newSpecPage: material-avatar-group's sync() unconditionally
// calls `this.el.querySelectorAll(':scope > material-avatar')` from
// componentWillLoad, and Stencil's mock-doc CSS engine doesn't implement the
// `:scope` pseudo-class ("unsupported pseudo: scope") — so *any* render of
// this component throws under newSpecPage, before the test body runs. Same
// category of mock-doc/jsdom platform gap as the AttachInternals rule in
// docs/agents/testing.md, just a different unimplemented API.

describe('material-avatar-group', () => {
  it('renders a group role and leaves avatars visible under the max', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-avatar-group max="4">
        <material-avatar name="Grace Hopper"></material-avatar>
        <material-avatar name="Ada Lovelace"></material-avatar>
      </material-avatar-group>
    `);
    const group = await page.find('material-avatar-group');
    expect(group.getAttribute('role')).toBe('group');
    const avatars = await page.findAll('material-avatar-group material-avatar');
    for (const a of avatars) expect(a.getAttribute('hidden')).toBeNull();
    expect(await page.find('material-avatar-group >>> material-avatar.overflow')).toBeNull();
  });

  it('hides avatars beyond max and shows a +N overflow chip', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-avatar-group max="2">
        <material-avatar name="Grace Hopper"></material-avatar>
        <material-avatar name="Ada Lovelace"></material-avatar>
        <material-avatar name="Margaret Hamilton"></material-avatar>
      </material-avatar-group>
    `);
    const avatars = await page.findAll('material-avatar-group material-avatar');
    expect(avatars[0].getAttribute('hidden')).toBeNull();
    expect(avatars[1].getAttribute('hidden')).toBeNull();
    expect(avatars[2].getAttribute('hidden')).not.toBeNull();

    const overflow = await page.find('material-avatar-group >>> material-avatar.overflow');
    expect(overflow).not.toBeNull();
    // `initials` isn't a reflected prop on material-avatar — it's set as a
    // JS property, not an HTML attribute, so read it with getProperty.
    expect(await overflow.getProperty('initials')).toBe('+1');
    expect(overflow.getAttribute('color')).toBe('surface');
    expect(overflow.getAttribute('title')).toBe('Margaret Hamilton');
    expect(overflow.getAttribute('aria-label')).toBe('Margaret Hamilton');
  });

  it('shows all avatars and no overflow chip when max is 0', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-avatar-group max="0">
        <material-avatar name="Grace Hopper"></material-avatar>
        <material-avatar name="Ada Lovelace"></material-avatar>
        <material-avatar name="Margaret Hamilton"></material-avatar>
      </material-avatar-group>
    `);
    const avatars = await page.findAll('material-avatar-group material-avatar');
    for (const a of avatars) expect(a.getAttribute('hidden')).toBeNull();
    expect(await page.find('material-avatar-group >>> material-avatar.overflow')).toBeNull();
  });

  it('falls back to a bare +N aria-label when the overflowed avatars have no name', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-avatar-group max="1">
        <material-avatar initials="AB"></material-avatar>
        <material-avatar initials="CD"></material-avatar>
      </material-avatar-group>
    `);
    const overflow = await page.find('material-avatar-group >>> material-avatar.overflow');
    expect(overflow.getAttribute('title')).toBeNull();
    expect(overflow.getAttribute('aria-label')).toBe('+1');
  });

  it('propagates the size prop onto every slotted avatar and the overflow chip', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-avatar-group max="1" size="s">
        <material-avatar name="Grace Hopper"></material-avatar>
        <material-avatar name="Ada Lovelace"></material-avatar>
      </material-avatar-group>
    `);
    const group = await page.find('material-avatar-group');
    expect(group.getAttribute('size')).toBe('s');
    const avatars = await page.findAll('material-avatar-group material-avatar');
    for (const a of avatars) expect(a.getAttribute('size')).toBe('s');
    const overflow = await page.find('material-avatar-group >>> material-avatar.overflow');
    expect(overflow.getAttribute('size')).toBe('s');
  });

  it('re-syncs on slotchange after the light DOM is swapped', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-avatar-group max="1">
        <material-avatar name="Grace Hopper"></material-avatar>
      </material-avatar-group>
    `);
    expect(await page.find('material-avatar-group >>> material-avatar.overflow')).toBeNull();

    await page.evaluate(() => {
      const group = document.querySelector('material-avatar-group')!;
      const extra = document.createElement('material-avatar');
      extra.setAttribute('name', 'Ada Lovelace');
      group.appendChild(extra);
    });
    const slot = await page.find('material-avatar-group >>> slot');
    slot.triggerEvent('slotchange');
    await page.waitForChanges();

    const avatars = await page.findAll('material-avatar-group material-avatar');
    expect(avatars[1].getAttribute('hidden')).not.toBeNull();
    expect(await page.find('material-avatar-group >>> material-avatar.overflow')).not.toBeNull();
  });
});
