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
import { MaterialChipSet } from './material-chip-set';

describe('material-chip-set', () => {
  it('renders a toolbar and reflects the selection mode', async () => {
    const page = await newSpecPage({
      components: [MaterialChipSet],
      html: `<material-chip-set selection="multi"></material-chip-set>`,
    });
    expect(page.root!.getAttribute('role')).toBe('toolbar');
    expect(page.root!.getAttribute('selection')).toBe('multi');
  });

  it('roving tabindex makes the first enabled chip tabbable', async () => {
    const page = await newSpecPage({
      components: [MaterialChipSet],
      html: `
        <material-chip-set>
          <material-chip value="a"></material-chip>
          <material-chip value="b" disabled></material-chip>
          <material-chip value="c"></material-chip>
        </material-chip-set>
      `,
    });
    const [a, b, c] = Array.from(page.root!.querySelectorAll('material-chip')) as Array<
      HTMLElement & { tabbable: boolean }
    >;

    expect(a.tabbable).toBe(true);
    expect(b.tabbable).toBe(false);
    expect(c.tabbable).toBe(false);
  });

  it('selection="single" deselects sibling chips when one becomes selected', async () => {
    const page = await newSpecPage({
      components: [MaterialChipSet],
      html: `
        <material-chip-set selection="single">
          <material-chip value="a"></material-chip>
          <material-chip value="b"></material-chip>
        </material-chip-set>
      `,
    });
    const [a, b] = Array.from(page.root!.querySelectorAll('material-chip')) as Array<
      HTMLElement & { selected: boolean }
    >;
    a.selected = false;
    b.selected = true;

    a.selected = true;
    a.dispatchEvent(new CustomEvent('selectedChange', {
      detail: { selected: true },
      bubbles: true,
      composed: true,
    }));
    await page.waitForChanges();

    expect(a.selected).toBe(true);
    expect(b.selected).toBe(false);
  });

  it('selection="single" prevents clearing the selected chip by clicking it again', async () => {
    const page = await newSpecPage({
      components: [MaterialChipSet],
      html: `
        <material-chip-set selection="single">
          <material-chip value="a"></material-chip>
        </material-chip-set>
      `,
    });
    const chip = page.root!.querySelector('material-chip') as HTMLElement & { selected: boolean };
    chip.selected = false;

    chip.dispatchEvent(new CustomEvent('selectedChange', {
      detail: { selected: false },
      bubbles: true,
      composed: true,
    }));
    await page.waitForChanges();

    expect(chip.selected).toBe(true);
  });

  it('ArrowRight focuses the next enabled chip and skips disabled chips', async () => {
    const page = await newSpecPage({
      components: [MaterialChipSet],
      html: `
        <material-chip-set>
          <material-chip value="a"></material-chip>
          <material-chip value="b" disabled></material-chip>
          <material-chip value="c"></material-chip>
        </material-chip-set>
      `,
    });
    const [a, , c] = Array.from(page.root!.querySelectorAll('material-chip')) as unknown as Array<
      HTMLElement & { setFocus: jest.Mock; tabbable: boolean }
    >;
    a.setFocus = jest.fn();
    c.setFocus = jest.fn();

    page.root!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await page.waitForChanges();

    expect(a.setFocus).toHaveBeenCalledTimes(1);
    expect(c.setFocus).not.toHaveBeenCalled();
  });
});
