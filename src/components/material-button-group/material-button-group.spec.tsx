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
import { MaterialButtonGroup } from './material-button-group';

describe('material-button-group', () => {
  it('renders a named group and reflects visual/selection props', async () => {
    const page = await newSpecPage({
      components: [MaterialButtonGroup],
      html: `<material-button-group aria-label="Text tools" variant="connected" size="m" shape="square" selection-mode="single" required></material-button-group>`,
    });

    const root = page.root!;
    expect(root.getAttribute('variant')).toBe('connected');
    expect(root.getAttribute('size')).toBe('m');
    expect(root.getAttribute('shape')).toBe('square');
    expect(root.getAttribute('selection-mode')).toBe('single');
    expect(root.getAttribute('required')).toBe('');

    const group = root.shadowRoot!.querySelector('[role="group"]')!;
    expect(group.getAttribute('aria-label')).toBe('Text tools');
  });

  it('selection-mode="none" ignores child selectedChange events', async () => {
    const page = await newSpecPage({
      components: [MaterialButtonGroup],
      html: `
        <material-button-group>
          <material-button toggle value="bold"></material-button>
        </material-button-group>
      `,
    });
    const spy = jest.fn();
    page.root!.addEventListener('materialSelectionChange', spy);

    const child = page.root!.querySelector('material-button') as HTMLElement & {
      selected: boolean;
      value: string;
    };
    child.selected = true;
    child.dispatchEvent(new CustomEvent('selectedChange', {
      detail: { selected: true },
      bubbles: true,
      composed: true,
    }));
    await page.waitForChanges();

    expect(spy).not.toHaveBeenCalled();
  });

  it('ignores matching toggle events from nested groups', async () => {
    const page = await newSpecPage({
      components: [MaterialButtonGroup],
      html: `
        <material-button-group selection-mode="multi">
          <div>
            <material-button toggle value="nested"></material-button>
          </div>
        </material-button-group>
      `,
    });
    const spy = jest.fn();
    page.root!.addEventListener('materialSelectionChange', spy);
    const nested = page.root!.querySelector('material-button') as HTMLElement & {
      selected: boolean;
      value: string;
    };
    nested.selected = true;

    nested.dispatchEvent(new CustomEvent('selectedChange', {
      detail: { selected: true },
      bubbles: true,
      composed: true,
    }));
    await page.waitForChanges();

    expect(spy).not.toHaveBeenCalled();
  });
});
