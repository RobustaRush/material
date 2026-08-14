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
import { MaterialOptgroup } from './material-optgroup';

describe('material-optgroup', () => {
  it('renders a group role with an aria-label from the label prop', async () => {
    const page = await newSpecPage({
      components: [MaterialOptgroup],
      html: `<material-optgroup label="Recents"></material-optgroup>`,
    });
    expect(page.root!.getAttribute('role')).toBe('group');
    expect(page.root!.getAttribute('aria-label')).toBe('Recents');
    const heading = page.root!.shadowRoot!.querySelector('.label')!;
    expect(heading.textContent).toBe('Recents');
    expect(heading.getAttribute('aria-hidden')).toBe('true');
  });

  it('omits the visible heading when no label is set', async () => {
    const page = await newSpecPage({
      components: [MaterialOptgroup],
      html: `<material-optgroup></material-optgroup>`,
    });
    expect(page.root!.shadowRoot!.querySelector('.label')).toBeNull();
  });

  it('slots its children into the shadow root', async () => {
    const page = await newSpecPage({
      components: [MaterialOptgroup],
      html: `<material-optgroup label="Group"><material-option value="a">A</material-option></material-optgroup>`,
    });
    expect(page.root!.shadowRoot!.querySelector('slot')).not.toBeNull();
    expect(page.root!.querySelector('material-option')).not.toBeNull();
  });
});
