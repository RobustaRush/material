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
import { MockElement } from '@stencil/core/mock-doc';
import { MaterialStepper } from './material-stepper';
import { MaterialStep } from './material-step';

// mock-doc doesn't expose a global MutationObserver — material-stepper
// unconditionally constructs a real one in connectedCallback to detect
// light-DOM state changes on its <material-step> children.
class StubMutationObserver {
  observe() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
(globalThis as any).MutationObserver = StubMutationObserver;

// mock-doc's selector engine doesn't implement `:scope` ("At present jQuery
// does not support the :scope selector") — material-stepper's every render
// calls `this.el.querySelectorAll(':scope > material-step')` from
// componentWillRender, so this isn't an edge case, it's every single test.
// Teach mock-doc's querySelectorAll the one :scope shape this component uses.
const originalQuerySelectorAll = MockElement.prototype.querySelectorAll;
(MockElement.prototype as any).querySelectorAll = function (selector: string) {
  const scoped = /^:scope\s*>\s*([\w-]+)$/.exec(selector);
  if (scoped) {
    const tag = scoped[1].toLowerCase();
    return Array.from(this.children ?? []).filter(
      (el: any) => el.tagName?.toLowerCase() === tag,
    );
  }
  return originalQuerySelectorAll.call(this, selector);
};

describe('material-stepper', () => {
  it('defaults to horizontal orientation and linear mode, rendering a header per step', async () => {
    const page = await newSpecPage({
      components: [MaterialStepper, MaterialStep],
      html: `
        <material-stepper>
          <material-step label="One" active></material-step>
          <material-step label="Two"></material-step>
          <material-step label="Three"></material-step>
        </material-stepper>
      `,
    });
    expect(page.root!.getAttribute('orientation')).toBe('horizontal');
    const buttons = page.root!.shadowRoot!.querySelectorAll('.header .item');
    expect(buttons.length).toBe(3);
    expect(buttons[0].getAttribute('aria-current')).toBe('step');
    expect(buttons[1].getAttribute('aria-current')).toBeNull();
  });

  it('vertical orientation routes each step into its own named slot', async () => {
    const page = await newSpecPage({
      components: [MaterialStepper, MaterialStep],
      html: `
        <material-stepper orientation="vertical">
          <material-step label="One" active></material-step>
          <material-step label="Two"></material-step>
        </material-stepper>
      `,
    });
    const steps = page.root!.querySelectorAll('material-step');
    expect(steps[0].getAttribute('slot')).toBe('s0');
    expect(steps[1].getAttribute('slot')).toBe('s1');
    expect(page.root!.shadowRoot!.querySelector('.body')).toBeNull();
    expect(page.root!.shadowRoot!.querySelectorAll('.well').length).toBe(2);
  });

  it('goTo(): moves the active step and emits materialStepChange with from/to values', async () => {
    const page = await newSpecPage({
      components: [MaterialStepper, MaterialStep],
      html: `
        <material-stepper>
          <material-step label="One" value="one" active></material-step>
          <material-step label="Two" value="two"></material-step>
        </material-stepper>
      `,
    });
    const changeSpy = jest.fn();
    page.root!.addEventListener('materialStepChange', changeSpy);

    const ok = await page.rootInstance.goTo(1);
    await page.waitForChanges();

    expect(ok).toBe(true);
    expect(changeSpy).toHaveBeenCalledTimes(1);
    expect(changeSpy.mock.calls[0][0].detail).toEqual({
      from: 0,
      to: 1,
      fromValue: 'one',
      toValue: 'two',
    });
    const steps = page.root!.querySelectorAll('material-step');
    expect((steps[0] as any).active).toBe(false);
    expect((steps[1] as any).active).toBe(true);
  });

  it('goTo(): a no-op index (out of range or same step) returns false and emits nothing', async () => {
    const page = await newSpecPage({
      components: [MaterialStepper, MaterialStep],
      html: `
        <material-stepper>
          <material-step label="One" active></material-step>
          <material-step label="Two"></material-step>
        </material-stepper>
      `,
    });
    const changeSpy = jest.fn();
    page.root!.addEventListener('materialStepChange', changeSpy);

    expect(await page.rootInstance.goTo(0)).toBe(false);
    expect(await page.rootInstance.goTo(5)).toBe(false);
    expect(await page.rootInstance.goTo(-1)).toBe(false);
    expect(changeSpy).not.toHaveBeenCalled();
  });

  it('next(): validates the active step and blocks advancing when a control is invalid', async () => {
    const page = await newSpecPage({
      components: [MaterialStepper, MaterialStep],
      html: `
        <material-stepper>
          <material-step label="One" active>
            <input required />
          </material-step>
          <material-step label="Two"></material-step>
        </material-stepper>
      `,
    });
    const input = page.root!.querySelector('input')!;
    // mock-doc's HTMLInputElement.checkValidity() always returns true (no
    // constraint-validation engine), so drive it explicitly.
    (input as any).checkValidity = () => false;
    (input as any).reportValidity = jest.fn();

    const changeSpy = jest.fn();
    page.root!.addEventListener('materialStepChange', changeSpy);

    const ok = await page.rootInstance.next();
    await page.waitForChanges();

    expect(ok).toBe(false);
    expect(changeSpy).not.toHaveBeenCalled();
    const steps = page.root!.querySelectorAll('material-step');
    expect((steps[0] as any).error).toBe(true);
    expect((steps[0] as any).active).toBe(true);
  });

  it('next(): advances and marks the previous step completed when validation passes', async () => {
    const page = await newSpecPage({
      components: [MaterialStepper, MaterialStep],
      html: `
        <material-stepper>
          <material-step label="One" active></material-step>
          <material-step label="Two"></material-step>
        </material-stepper>
      `,
    });
    const ok = await page.rootInstance.next();
    await page.waitForChanges();

    expect(ok).toBe(true);
    const steps = page.root!.querySelectorAll('material-step');
    expect((steps[0] as any).completed).toBe(true);
    expect((steps[0] as any).error).toBe(false);
    expect((steps[1] as any).active).toBe(true);
  });

  it('back(): moves to the previous step without validating', async () => {
    const page = await newSpecPage({
      components: [MaterialStepper, MaterialStep],
      html: `
        <material-stepper>
          <material-step label="One"></material-step>
          <material-step label="Two" active></material-step>
        </material-stepper>
      `,
    });
    const ok = await page.rootInstance.back();
    await page.waitForChanges();

    expect(ok).toBe(true);
    const steps = page.root!.querySelectorAll('material-step');
    expect((steps[0] as any).active).toBe(true);
    expect((steps[1] as any).active).toBe(false);
  });

  it('header click on a visited step emits materialStepClick then navigates', async () => {
    const page = await newSpecPage({
      components: [MaterialStepper, MaterialStep],
      html: `
        <material-stepper>
          <material-step label="One" value="one" completed></material-step>
          <material-step label="Two" value="two" active></material-step>
        </material-stepper>
      `,
    });
    const clickSpy = jest.fn();
    const changeSpy = jest.fn();
    page.root!.addEventListener('materialStepClick', clickSpy);
    page.root!.addEventListener('materialStepChange', changeSpy);

    const firstButton = page.root!.shadowRoot!.querySelectorAll('.header .item')[0] as HTMLButtonElement;
    firstButton.click();
    await page.waitForChanges();

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy.mock.calls[0][0].detail).toEqual({ index: 0, value: 'one' });
    expect(changeSpy).toHaveBeenCalledTimes(1);
    const steps = page.root!.querySelectorAll('material-step');
    expect((steps[0] as any).active).toBe(true);
  });

  it('materialStepClick is cancelable: preventDefault() blocks the navigation', async () => {
    const page = await newSpecPage({
      components: [MaterialStepper, MaterialStep],
      html: `
        <material-stepper>
          <material-step label="One" value="one" completed></material-step>
          <material-step label="Two" value="two" active></material-step>
        </material-stepper>
      `,
    });
    page.root!.addEventListener('materialStepClick', (e) => e.preventDefault());
    const changeSpy = jest.fn();
    page.root!.addEventListener('materialStepChange', changeSpy);

    const firstButton = page.root!.shadowRoot!.querySelectorAll('.header .item')[0] as HTMLButtonElement;
    firstButton.click();
    await page.waitForChanges();

    expect(changeSpy).not.toHaveBeenCalled();
    const steps = page.root!.querySelectorAll('material-step');
    expect((steps[1] as any).active).toBe(true);
  });

  it('linear mode: a header for an unvisited step ahead is disabled and not clickable', async () => {
    const page = await newSpecPage({
      components: [MaterialStepper, MaterialStep],
      html: `
        <material-stepper>
          <material-step label="One" active></material-step>
          <material-step label="Two"></material-step>
          <material-step label="Three"></material-step>
        </material-stepper>
      `,
    });
    const buttons = page.root!.shadowRoot!.querySelectorAll('.header .item');
    // Step "Three" (index 2) hasn't been reached and step "Two" isn't
    // completed yet, so it's blocked in linear mode.
    expect(buttons[2].hasAttribute('disabled')).toBe(true);

    const changeSpy = jest.fn();
    page.root!.addEventListener('materialStepChange', changeSpy);
    (buttons[2] as HTMLButtonElement).click();
    await page.waitForChanges();
    expect(changeSpy).not.toHaveBeenCalled();
  });

  it('non-linear mode allows jumping straight to any step header', async () => {
    const page = await newSpecPage({
      components: [MaterialStepper, MaterialStep],
      html: `
        <material-stepper linear="false">
          <material-step label="One" active></material-step>
          <material-step label="Two"></material-step>
          <material-step label="Three"></material-step>
        </material-stepper>
      `,
    });
    const buttons = page.root!.shadowRoot!.querySelectorAll('.header .item');
    expect(buttons[2].hasAttribute('disabled')).toBe(false);

    (buttons[2] as HTMLButtonElement).click();
    await page.waitForChanges();
    const steps = page.root!.querySelectorAll('material-step');
    expect((steps[2] as any).active).toBe(true);
  });

  it('a disabled step header is never clickable, even in non-linear mode', async () => {
    const page = await newSpecPage({
      components: [MaterialStepper, MaterialStep],
      html: `
        <material-stepper linear="false">
          <material-step label="One" active></material-step>
          <material-step label="Two" disabled></material-step>
        </material-stepper>
      `,
    });
    const buttons = page.root!.shadowRoot!.querySelectorAll('.header .item');
    expect(buttons[1].hasAttribute('disabled')).toBe(true);
  });
});
