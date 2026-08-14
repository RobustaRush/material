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

// Real browser: material-stepper's document-level click delegation
// (data-stepper-next/back), and its native constraint-validation gate
// (checkValidity/reportValidity against real <input>s), need real DOM/CSSOM
// semantics that mock-doc doesn't implement.

describe('material-stepper', () => {
  it('clicking a header on a completed step navigates there via a real click', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-stepper>
        <material-step label="One" value="one" completed></material-step>
        <material-step label="Two" value="two" active></material-step>
      </material-stepper>
    `);
    const clickSpy = await page.spyOnEvent('materialStepClick');
    const changeSpy = await page.spyOnEvent('materialStepChange');

    const firstHeader = await page.find('material-stepper >>> .header button.item:nth-of-type(1)');
    await firstHeader.click();
    await page.waitForChanges();

    expect(clickSpy).toHaveReceivedEventDetail({ index: 0, value: 'one' });
    expect(changeSpy).toHaveReceivedEventDetail({ from: 1, to: 0, fromValue: 'two', toValue: 'one' });
    expect(firstHeader.getAttribute('aria-current')).toBe('step');
  });

  it('data-stepper-next outside the stepper advances to the next step', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-stepper id="wiz">
        <material-step label="One" active></material-step>
        <material-step label="Two"></material-step>
      </material-stepper>
      <button data-stepper-next="wiz">Next</button>
    `);
    const changeSpy = await page.spyOnEvent('materialStepChange');
    const nextBtn = await page.find('button');
    await nextBtn.click();
    await page.waitForChanges();

    expect(changeSpy).toHaveReceivedEventDetail({ from: 0, to: 1, fromValue: '0', toValue: '1' });
    const secondHeader = await page.find('material-stepper >>> .header button.item:nth-of-type(2)');
    expect(secondHeader.getAttribute('aria-current')).toBe('step');
  });

  it('data-stepper-back navigates to the previous step without validating', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-stepper id="wiz">
        <material-step label="One"></material-step>
        <material-step label="Two" active>
          <input required />
        </material-step>
      </material-stepper>
      <button data-stepper-back="wiz">Back</button>
    `);
    const backBtn = await page.find('button');
    await backBtn.click();
    await page.waitForChanges();

    const firstHeader = await page.find('material-stepper >>> .header button.item:nth-of-type(1)');
    expect(firstHeader.getAttribute('aria-current')).toBe('step');
  });

  it('next() blocks on a real invalid required input and reports validity', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-stepper id="wiz">
        <material-step label="One" active>
          <input required />
        </material-step>
        <material-step label="Two"></material-step>
      </material-stepper>
      <button data-stepper-next="wiz">Next</button>
    `);
    const changeSpy = await page.spyOnEvent('materialStepChange');
    const nextBtn = await page.find('button');
    await nextBtn.click();
    await page.waitForChanges();

    expect(changeSpy).toHaveReceivedEventTimes(0);
    const firstHeader = await page.find('material-stepper >>> .header button.item:nth-of-type(1)');
    // Still on the first, now error-toned, step.
    expect(firstHeader.getAttribute('aria-current')).toBe('step');
    expect(firstHeader.getAttribute('class')).toContain('error');
  });

  it('next() advances once the required input is filled in', async () => {
    const page = await newE2EPage();
    await page.setContent(`
      <material-stepper id="wiz">
        <material-step label="One" active>
          <input required />
        </material-step>
        <material-step label="Two"></material-step>
      </material-stepper>
      <button data-stepper-next="wiz">Next</button>
    `);
    const input = await page.find('input');
    await input.type('hello');

    const nextBtn = await page.find('button');
    await nextBtn.click();
    await page.waitForChanges();

    const secondHeader = await page.find('material-stepper >>> .header button.item:nth-of-type(2)');
    expect(secondHeader.getAttribute('aria-current')).toBe('step');
  });
});
