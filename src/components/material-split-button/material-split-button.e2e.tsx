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

// Real browser, not newSpecPage: material-split-button is formAssociated and
// its primary action follows native submitter behavior.

describe('material-split-button', () => {
  it('renders reflected variant/size and primary/trailing buttons', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-split-button label="Save" icon="save" variant="tonal" size="m"></material-split-button>`);
    const el = await page.find('material-split-button');
    const trailing = await page.find('material-split-button >>> [part="trailing"]');
    expect(el.getAttribute('variant')).toBe('tonal');
    expect(el.getAttribute('size')).toBe('m');
    expect(await page.find('material-split-button >>> .icon')).toEqualText('save');
    expect(await page.find('material-split-button >>> .label')).toEqualText('Save');
    expect(trailing.getAttribute('aria-haspopup')).toBe('menu');
    expect(trailing.getAttribute('aria-expanded')).toBe('false');
  });

  it('clicking the primary button emits splitAction', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-split-button label="Save" type="button"></material-split-button>`);
    const action = await page.spyOnEvent('splitAction');

    await page.evaluate(() => {
      (document.querySelector('material-split-button')!.shadowRoot!.querySelector('button[part="leading"]') as HTMLButtonElement).click();
    });
    await page.waitForChanges();

    expect(action).toHaveReceivedEventTimes(1);
  });

  it('primary button submits the associated form with name/value', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <form id="f">
        <material-split-button label="Save" name="intent" value="save"></material-split-button>
      </form>
      <script>
        window.submitted = null;
        document.getElementById('f').addEventListener('submit', (event) => {
          event.preventDefault();
          window.submitted = new FormData(event.target).get('intent');
        });
      </script>
    `);

    await page.evaluate(() => {
      (document.querySelector('material-split-button')!.shadowRoot!.querySelector('button[part="leading"]') as HTMLButtonElement).click();
    });
    await page.waitForChanges();

    expect(await page.evaluate(() => (window as any).submitted)).toBe('save');
  });

  it('href variant renders an anchor with target/rel/download parity', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-split-button label="Export" href="/export.csv" target="_blank" download="report.csv"></material-split-button>
    `);
    const leading = await page.find('material-split-button >>> a[part="leading"]');
    expect(leading.getAttribute('href')).toBe('/export.csv');
    expect(leading.getAttribute('target')).toBe('_blank');
    expect(leading.getAttribute('rel')).toBe('noopener noreferrer');
    expect(leading.getAttribute('download')).toBe('report.csv');
  });

  it('disabled blocks primary action and disables both buttons', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-split-button label="Save" disabled></material-split-button>`);
    const action = await page.spyOnEvent('splitAction');

    const leading = await page.find('material-split-button >>> button[part="leading"]');
    const trailing = await page.find('material-split-button >>> button[part="trailing"]');
    expect(leading.getAttribute('disabled')).not.toBeNull();
    expect(trailing.getAttribute('disabled')).not.toBeNull();
    await leading.click();
    await page.waitForChanges();

    expect(action).toHaveReceivedEventTimes(0);
  });

  it('menu toggle events mirror expanded state and emit open/close events', async () => {
    const page = await newE2EPage();
    await page.setContent(`<material-split-button label="Save"><material-menu-item label="Save as"></material-menu-item></material-split-button>`);
    const open = await page.spyOnEvent('splitMenuOpen');
    const close = await page.spyOnEvent('splitMenuClose');

    await page.evaluate(() => {
      (document.querySelector('material-split-button')!.shadowRoot!.querySelector('button[part="trailing"]') as HTMLButtonElement).click();
    });
    await page.waitForChanges();
    expect((await page.find('material-split-button >>> button[part="trailing"]')).getAttribute('aria-expanded')).toBe('true');
    expect(open).toHaveReceivedEventTimes(1);

    await page.evaluate(() => {
      void (document.querySelector('material-split-button')!.shadowRoot!.querySelector('material-menu') as unknown as { hide: () => Promise<void> }).hide();
    });
    await page.waitForChanges();
    expect((await page.find('material-split-button >>> button[part="trailing"]')).getAttribute('aria-expanded')).toBe('false');
    expect(close).toHaveReceivedEventTimes(1);
  });
});
