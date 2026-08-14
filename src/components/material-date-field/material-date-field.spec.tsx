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
import { MaterialDateField } from './material-date-field';

// mock-doc, not newE2EPage: material-date-field itself has no
// @AttachInternals()/formAssociated — it renders shadow: false into light
// DOM and rides a plain <input type="hidden"> alongside a consumer's <form>.
// Its child <material-textfield> IS formAssociated, but since it's not
// registered in `components: []` here it never upgrades/connects, so its
// own AttachInternals code path never runs — these tests only exercise
// material-date-field's own logic (formatting, hidden-input sync, typed-
// entry validation) by talking to the un-upgraded child through its
// attributes and by dispatching the CustomEvents it would emit. Picker
// popover/dialog behavior (docked open, modal OK/Cancel, keyboard) needs a
// real browser and lives in material-date-field.e2e.tsx.

describe('material-date-field', () => {
  it('renders the textfield and a hidden form input, ISO value reflected', async () => {
    const page = await newSpecPage({
      components: [MaterialDateField],
      html: `<material-date-field name="due" label="Due date" value="2024-03-15" format="%Y-%m-%d"></material-date-field>`,
    });
    const textfield = page.root!.querySelector('material-textfield')!;
    expect(textfield.getAttribute('label')).toBe('Due date');
    expect(textfield.getAttribute('value')).toBe('2024-03-15');

    const hidden = page.root!.querySelector('input[type="hidden"]')! as HTMLInputElement;
    expect(hidden.getAttribute('name')).toBe('due');
    expect(hidden.value).toBe('2024-03-15');
  });

  it('defaults value to an empty string and renders an empty display', async () => {
    const page = await newSpecPage({
      components: [MaterialDateField],
      html: `<material-date-field></material-date-field>`,
    });
    const textfield = page.root!.querySelector('material-textfield')!;
    expect(textfield.getAttribute('value')).toBe('');
    expect(page.rootInstance.value).toBe('');
  });

  it('updating the value prop reformats the display and the hidden input', async () => {
    const page = await newSpecPage({
      components: [MaterialDateField],
      html: `<material-date-field value="2024-01-01" format="%Y-%m-%d"></material-date-field>`,
    });
    page.rootInstance.value = '2024-12-25';
    await page.waitForChanges();

    const textfield = page.root!.querySelector('material-textfield')!;
    expect(textfield.getAttribute('value')).toBe('2024-12-25');
    const hidden = page.root!.querySelector('input[type="hidden"]')! as HTMLInputElement;
    expect(hidden.value).toBe('2024-12-25');
  });

  it('forwards disabled/required/readOnly/variant/helpText/errorText to the inner textfield', async () => {
    const page = await newSpecPage({
      components: [MaterialDateField],
      html: `<material-date-field disabled required readonly variant="filled" help-text="Pick one"></material-date-field>`,
    });
    const textfield = page.root!.querySelector('material-textfield')!;
    expect(textfield.getAttribute('disabled')).not.toBeNull();
    expect(textfield.getAttribute('required')).not.toBeNull();
    expect(textfield.getAttribute('readonly')).not.toBeNull();
    expect(textfield.getAttribute('variant')).toBe('filled');
    // helpText/errorText are camelCase complex-string props: Stencil's
    // runtime sets them on an un-upgraded custom element as a lowercased,
    // dash-less attribute ("helptext", not "help-text").
    expect(textfield.getAttribute('helptext')).toBe('Pick one');
  });

  it('typing a valid date in the textfield commits an ISO value and emits valueChange', async () => {
    const page = await newSpecPage({
      components: [MaterialDateField],
      html: `<material-date-field format="%m/%d/%Y"></material-date-field>`,
    });
    const changeSpy = jest.fn();
    page.root!.addEventListener('valueChange', changeSpy);

    const textfield = page.root!.querySelector('material-textfield')!;
    textfield.dispatchEvent(new CustomEvent('valueChange', {
      detail: { value: '03/15/2024' },
      bubbles: true,
      composed: true,
    }));
    await page.waitForChanges();

    expect(page.rootInstance.value).toBe('2024-03-15');
    expect(page.rootInstance.error).toBe(false);
    expect(changeSpy).toHaveBeenCalledTimes(1);
    expect(changeSpy.mock.calls[0][0].detail).toEqual({ value: '2024-03-15' });
  });

  it('clearing the textfield to empty text emits valueChange with an empty value', async () => {
    const page = await newSpecPage({
      components: [MaterialDateField],
      html: `<material-date-field value="2024-03-15" format="%Y-%m-%d"></material-date-field>`,
    });
    const changeSpy = jest.fn();
    page.root!.addEventListener('valueChange', changeSpy);

    const textfield = page.root!.querySelector('material-textfield')!;
    textfield.dispatchEvent(new CustomEvent('valueChange', {
      detail: { value: '' },
      bubbles: true,
      composed: true,
    }));
    await page.waitForChanges();

    expect(page.rootInstance.value).toBe('');
    expect(changeSpy.mock.calls[0][0].detail).toEqual({ value: '' });
  });

  it('a date outside min/max flags an error and does not emit valueChange', async () => {
    const page = await newSpecPage({
      components: [MaterialDateField],
      html: `<material-date-field min="2024-01-01" max="2024-01-31" format="%Y-%m-%d"></material-date-field>`,
    });
    const changeSpy = jest.fn();
    page.root!.addEventListener('valueChange', changeSpy);

    const textfield = page.root!.querySelector('material-textfield')!;
    textfield.dispatchEvent(new CustomEvent('valueChange', {
      detail: { value: '2024-02-15' },
      bubbles: true,
      composed: true,
    }));
    await page.waitForChanges();

    expect(page.rootInstance.error).toBe(true);
    expect(changeSpy).not.toHaveBeenCalled();
    const textfieldAfter = page.root!.querySelector('material-textfield')!;
    expect(textfieldAfter.getAttribute('error')).not.toBeNull();
    expect(textfieldAfter.getAttribute('errortext')).toBe('Date outside allowed range');
  });

  it('unparseable typed text flags an error with the default invalid-date message', async () => {
    const page = await newSpecPage({
      components: [MaterialDateField],
      html: `<material-date-field format="%Y-%m-%d"></material-date-field>`,
    });
    const textfield = page.root!.querySelector('material-textfield')!;
    textfield.dispatchEvent(new CustomEvent('valueChange', {
      detail: { value: 'not a date' },
      bubbles: true,
      composed: true,
    }));
    await page.waitForChanges();

    expect(page.rootInstance.error).toBe(true);
    const textfieldAfter = page.root!.querySelector('material-textfield')!;
    expect(textfieldAfter.getAttribute('errortext')).toBe('Invalid date');
  });

  it('a custom invalidLabel overrides the default parse-error message', async () => {
    const page = await newSpecPage({
      components: [MaterialDateField],
      html: `<material-date-field format="%Y-%m-%d" invalid-label="Nope"></material-date-field>`,
    });
    const textfield = page.root!.querySelector('material-textfield')!;
    textfield.dispatchEvent(new CustomEvent('valueChange', {
      detail: { value: 'nonsense' },
      bubbles: true,
      composed: true,
    }));
    await page.waitForChanges();

    const textfieldAfter = page.root!.querySelector('material-textfield')!;
    expect(textfieldAfter.getAttribute('errortext')).toBe('Nope');
  });

  it('selecting in the modal-dialog calendar only stages a pending value, confirm() commits it', async () => {
    const page = await newSpecPage({
      components: [MaterialDateField],
      html: `<material-date-field format="%Y-%m-%d"></material-date-field>`,
    });

    const modalCalendar = page.root!.querySelector('material-dialog material-calendar')!;
    modalCalendar.dispatchEvent(new CustomEvent('dateSelect', {
      detail: { value: '2024-07-04' },
      bubbles: true,
      composed: true,
    }));
    await page.waitForChanges();

    // Selecting in the modal calendar only stages `pending` — the field's
    // own `value`/valueChange only fire once `confirm()` (the OK button) runs.
    expect(page.rootInstance.value).toBe('');
    expect(page.rootInstance.pending).toBe('2024-07-04');

    const changeSpy = jest.fn();
    page.root!.addEventListener('valueChange', changeSpy);
    (page.rootInstance as any).confirm();
    await page.waitForChanges();

    expect(page.rootInstance.value).toBe('2024-07-04');
    expect(changeSpy.mock.calls[0][0].detail).toEqual({ value: '2024-07-04' });
  });

  it('sets the trailing calendar trigger aria-label, defaulting to "Open calendar"', async () => {
    const page = await newSpecPage({
      components: [MaterialDateField],
      html: `<material-date-field></material-date-field>`,
    });
    const trigger = page.root!.querySelector('material-icon-button[icon="calendar_month"]')!;
    expect(trigger.getAttribute('aria-label')).toBe('Open calendar');
  });

  it('a custom openLabel overrides the trigger aria-label', async () => {
    const page = await newSpecPage({
      components: [MaterialDateField],
      html: `<material-date-field open-label="Choose a date"></material-date-field>`,
    });
    const trigger = page.root!.querySelector('material-icon-button[icon="calendar_month"]')!;
    expect(trigger.getAttribute('aria-label')).toBe('Choose a date');
  });
});
