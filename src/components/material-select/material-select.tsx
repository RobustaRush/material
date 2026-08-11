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

import {
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Listen,
  Method,
  Prop,
  State,
  Watch,
  AttachInternals,
  h,
} from '@stencil/core';
import { gettext } from '../../utils/i18n';
import { dispatchNativeEvents, activateOnLabelClick } from '../../utils/form-events';
import { createTypeahead, TypeaheadHandle } from '../../utils/typeahead';
import { handleInvalidEvent } from '../../utils/native-validation';

export type MaterialSelectVariant = 'filled' | 'outlined';

// Internal delimiter for the multi-select `value` string mirror and the
// form-state string. ASCII Unit Separator (0x1F) — a control char that can't
// appear in real option values, so joining/splitting the `values` array
// round-trips losslessly even when a value itself contains a comma. Multi
// consumers should read `el.values` / `el.dataset.values` (JSON) rather than
// parsing `value`.
const VALUE_SEP = '\x1f';

interface MaterialOptionLike extends HTMLElement {
  value: string;
  label?: string;
  disabled: boolean;
  selected: boolean;
  multi?: boolean;
}

interface MaterialMenuLike extends HTMLElement {
  show(anchorEl?: Element): Promise<void> | void;
  hide(): Promise<void> | void;
  open: boolean;
}

// MD3 select. Single mode: textfield + chevron icon-button trigger that opens
// a popover-anchored `material-menu`. Multi mode (`multiple` prop): a
// custom textfield-styled shell hosts inline chips for each selection and
// grows vertically as chips wrap; menu items render a checkbox glyph and
// stay open on toggle. Form-associated via `attachInternals()` —
// single mode posts the canonical option `value`, multi mode posts a
// FormData with one entry per selection (compatible with Django's
// `request.POST.getlist()`).

@Component({
  tag: 'material-select',
  styleUrl: 'material-select.css',
  shadow: true,
  formAssociated: true,
})
export class MaterialSelect {
  @Element() el!: HTMLElement;
  @AttachInternals() internals!: ElementInternals;

  @Prop() variant: MaterialSelectVariant = 'outlined';
  @Prop() name?: string;
  @Prop() label?: string;
  @Prop({ mutable: true, reflect: true }) value = '';
  @Prop() placeholder?: string;
  @Prop({ mutable: true, reflect: true }) disabled = false;
  @Prop({ reflect: true }) required = false;
  @Prop({ reflect: true, attribute: 'readonly' }) readOnly = false;
  @Prop() helpText?: string;
  @Prop() errorText?: string;
  @Prop({ reflect: true }) error = false;
  @Prop() leadingIcon?: string;
  @Prop() clearable = false;
  @Prop() openLabel = '';
  @Prop() clearLabel = '';
  // Multi-select. Branches the trigger to a chip shell, keeps the menu open
  // on option toggle, posts FormData multi-entries (Django getlist parity).
  @Prop({ reflect: true }) multiple = false;
  // Source of truth in multi mode. Mirrored to `value` (CSV) and
  // `data-values` (JSON) on every change. NOT reflected as an attribute —
  // arrays don't reflect cleanly; consumers read `el.values` or `el.dataset.values`.
  @Prop({ mutable: true }) values: string[] = [];

  @State() displayLabel = '';
  @State() open = false;
  @State() shellFocused = false;
  // Inline-validation state — see material-textfield for the rationale.
  // `refreshErrorAlert` only drives the multi-shell's own `role="alert"`
  // markup; the single-shell delegates errorText/error into a nested
  // material-textfield, which owns its own role="alert" span but has no way
  // to be told "the same message repeated, re-announce" from here without a
  // larger cross-component API — skipped for that path (item 6, noted).
  @State() private nativeError = false;
  @State() private nativeErrorText = '';
  @State() private customValidityMessage = '';
  @State() private refreshErrorAlert = false;

  @Event() valueChange!: EventEmitter<{ value: string; values: string[] }>;
  @Event() openChange!: EventEmitter<{ open: boolean }>;

  private defaultValue = '';
  private defaultValues: string[] = [];
  private menuEl?: MaterialMenuLike;
  private textfieldEl?: HTMLElement;
  private shellEl?: HTMLElement;
  private chevronEl?: HTMLElement;
  // Which option to focus once the menu finishes opening. Set by Home/End/
  // ArrowUp on the closed trigger; cleared back to "focus the selection"
  // otherwise. 'selected-or-last' (ArrowUp) falls back to the last option
  // when nothing is selected yet, unlike ArrowDown/Enter/Space which land on
  // nothing rather than guess a direction.
  private pendingOpenFocus: 'first' | 'last' | 'selected-or-last' | null = null;

  // Closed-select typeahead: commits inline (single) or opens + focuses the
  // match (multi), rebased around the currently-selected option.
  private readonly closedTypeahead: TypeaheadHandle = createTypeahead<MaterialOptionLike>({
    getItems: () => this.getOptions(),
    getText: o => this.optionLabel(o),
    isActive: o => !this.multiple && o.value === this.value,
    onMatch: o => {
      if (this.multiple) {
        this.openMenu();
        requestAnimationFrame(() => {
          o.focus();
          o.scrollIntoView({ block: 'nearest' });
        });
      } else {
        this.commit(o.value, false);
        this.announceValue();
      }
    },
  });

  // Open-menu typeahead: focuses the match without committing/closing.
  private readonly openTypeahead: TypeaheadHandle = createTypeahead<MaterialOptionLike>({
    getItems: () => this.getOptions(),
    getText: o => this.optionLabel(o),
    isActive: o => o === document.activeElement,
    onMatch: o => {
      o.focus();
      o.scrollIntoView({ block: 'nearest' });
    },
  });

  componentWillLoad() {
    this.defaultValue = this.value;
    // If `values` was supplied directly, capture it; otherwise derive from CSV.
    if (this.multiple) {
      if (!this.values?.length && this.value) {
        this.values = this.value.split(VALUE_SEP).filter(Boolean);
      }
      this.defaultValues = [...(this.values ?? [])];
      this.value = this.values.join(VALUE_SEP);
    }
  }

  connectedCallback() {
    this.refreshDisplay();
    this.applySelection();
    this.syncFormValue();
    this.mirrorValuesAttr();
  }

  private teardownLabelActivation?: () => void;

  componentDidLoad() {
    this.refreshDisplay();
    this.applySelection();
    // External <label for="…"> / internals.labels click activation: focus
    // the trigger (input or chip shell) without opening the menu.
    this.teardownLabelActivation = activateOnLabelClick(this.el, () => {
      this.focusTrigger();
    });
    // material-textfield's inner <input> may not exist in its shadow root
    // yet on this same tick (it renders on its own schedule) — one rAF
    // later it always does, matching the anchor-measuring rAF in
    // handleMenuOpen below. componentDidRender covers every render after.
    requestAnimationFrame(() => this.syncTriggerAria());
  }

  componentDidRender() {
    this.syncTriggerAria();
  }

  disconnectedCallback() {
    // Typeahead reset timers would otherwise fire on a detached component.
    this.closedTypeahead.destroy();
    this.openTypeahead.destroy();
    this.teardownLabelActivation?.();
    this.teardownLabelActivation = undefined;
  }

  @Watch('value')
  onValueChange() {
    if (this.multiple) {
      const parsed = this.value ? this.value.split(VALUE_SEP).filter(Boolean) : [];
      if (parsed.join(VALUE_SEP) !== this.values.join(VALUE_SEP)) {
        this.values = parsed;
        return; // values watcher will run the rest
      }
    }
    this.refreshDisplay();
    this.applySelection();
    this.syncFormValue();
  }

  @Watch('values')
  onValuesChange() {
    if (!this.multiple) return;
    const joined = this.values.join(VALUE_SEP);
    if (this.value !== joined) this.value = joined;
    this.refreshDisplay();
    this.applySelection();
    this.syncFormValue();
    this.mirrorValuesAttr();
  }

  @Watch('multiple')
  onMultipleChange() {
    this.applySelection();
    this.syncFormValue();
  }

  @Watch('disabled')
  @Watch('error')
  @Watch('required')
  @Watch('customValidityMessage')
  onAttrChange() {
    this.syncFormValue();
  }

  formDisabledCallback(d: boolean) {
    this.disabled = d;
  }

  formResetCallback() {
    if (this.multiple) {
      this.values = [...this.defaultValues];
    } else {
      this.value = this.defaultValue;
    }
    // A native reported-invalid state doesn't survive a form reset either
    // (see material-textfield's formResetCallback).
    this.nativeError = false;
    this.nativeErrorText = '';
  }

  formStateRestoreCallback(state: string | null) {
    if (state == null) return;
    if (this.multiple) {
      this.values = state ? state.split(VALUE_SEP).filter(Boolean) : [];
    } else {
      this.value = state;
    }
  }

  private mirrorValuesAttr() {
    if (this.multiple) {
      this.el.setAttribute('data-values', JSON.stringify(this.values));
    } else if (this.el.hasAttribute('data-values')) {
      this.el.removeAttribute('data-values');
    }
  }

  // customValidityMessage (setCustomValidity()) wins over everything else,
  // same as a native input; `nativeError` clears here once the control is
  // valid again (item 3 — this is select's existing validity mirror step).
  private syncFormValue() {
    if (this.disabled) {
      this.internals.setFormValue(null);
      this.internals.setValidity({});
      this.nativeError = false;
      return;
    }
    if (this.multiple) {
      const fd = new FormData();
      if (this.name) for (const v of this.values) fd.append(this.name, v);
      this.internals.setFormValue(fd, this.values.join(VALUE_SEP));
      if (this.customValidityMessage) {
        this.internals.setValidity(
          { customError: true },
          this.customValidityMessage,
          (this.shellEl as HTMLElement | undefined) ?? this.el,
        );
        return;
      }
      const missing = this.required && this.values.length === 0;
      if (missing) {
        this.internals.setValidity(
          { valueMissing: true },
          gettext('Please select at least one option'),
          (this.shellEl as HTMLElement | undefined) ?? this.el,
        );
      } else {
        this.internals.setValidity({});
        this.nativeError = false;
      }
      return;
    }
    this.internals.setFormValue(this.value);
    if (this.customValidityMessage) {
      this.internals.setValidity(
        { customError: true },
        this.customValidityMessage,
        (this.textfieldEl as HTMLElement | undefined) ?? this.el,
      );
      return;
    }
    if (this.required && !this.value) {
      this.internals.setValidity(
        { valueMissing: true },
        gettext('Please select an option'),
        (this.textfieldEl as HTMLElement | undefined) ?? this.el,
      );
    } else {
      this.internals.setValidity({});
      this.nativeError = false;
    }
  }

  // Guards checkValidity()'s internals.checkValidity() probe from painting
  // the inline error UI (item 2).
  private suppressInvalid = false;

  /** Constraint validation, like a native select. */
  @Method()
  async checkValidity(): Promise<boolean> {
    this.suppressInvalid = true;
    const valid = this.internals.checkValidity();
    this.suppressInvalid = false;
    return valid;
  }

  /** Constraint validation. An invalid result renders the MD3 inline error
   *  instead of the native bubble — see the `invalid` listener below. */
  @Method()
  async reportValidity(): Promise<boolean> {
    return this.internals.reportValidity();
  }

  /** Sets a custom validity message, like a native select's
   *  `setCustomValidity()`. See material-textfield for the contract. */
  @Method()
  async setCustomValidity(message: string): Promise<void> {
    this.customValidityMessage = message ?? '';
    // Fold into internals synchronously — the @Watch-driven sync would
    // otherwise only catch up a render cycle later, after this method's own
    // Promise has resolved, so a caller's immediately-following
    // reportValidity() would still see the previous validity.
    this.syncFormValue();
  }

  @Listen('invalid')
  handleInvalid(e: Event) {
    const report = handleInvalidEvent(e, this.el, this.internals, this.suppressInvalid);
    if (!report) return;
    const prevText = this.errorText || this.nativeErrorText;
    this.nativeError = true;
    this.nativeErrorText = report.message;
    if (this.multiple && prevText && prevText === (this.errorText || this.nativeErrorText)) {
      this.refreshErrorAlert = true;
      requestAnimationFrame(() => { this.refreshErrorAlert = false; });
    }
    if (report.shouldFocus) this.focusTrigger();
  }

  private getOptions(includeDisabled = false): MaterialOptionLike[] {
    const sel = includeDisabled ? 'material-option' : 'material-option:not([disabled])';
    return Array.from(this.el.querySelectorAll<HTMLElement>(sel)) as MaterialOptionLike[];
  }

  private optionLabel(o: MaterialOptionLike): string {
    return (o.label ?? o.textContent ?? '').trim();
  }

  private findOption(v: string): MaterialOptionLike | undefined {
    return this.getOptions(true).find(o => o.value === v);
  }

  private refreshDisplay() {
    const opts = this.getOptions(true);
    if (this.multiple) {
      // Field display in multi mode is driven by the chip row, not the
      // input — leave displayLabel empty so the placeholder logic in the
      // shell is solely controlled by `values.length`.
      this.displayLabel = '';
      return;
    }
    const match = opts.find(o => o.value === this.value);
    this.displayLabel = match ? this.optionLabel(match) : '';
  }

  private applySelection() {
    const set = new Set(
      this.multiple
        ? this.values
        : (this.value ? [this.value] : []),
    );
    for (const o of this.getOptions(true)) {
      o.selected = set.has(o.value);
      o.multi = this.multiple;
    }
  }

  private commit(value: string, closeMenu = true) {
    if (this.disabled || this.readOnly) return;
    this.value = value;
    this.valueChange.emit({ value, values: value ? [value] : [] });
    dispatchNativeEvents(this.el, { input: true, change: true });
    if (closeMenu && this.open) this.menuEl?.hide();
  }

  private toggleValue(v: string) {
    if (this.disabled || this.readOnly) return;
    const set = new Set(this.values);
    set.has(v) ? set.delete(v) : set.add(v);
    this.values = [...set];
    this.valueChange.emit({ value: this.value, values: this.values });
    dispatchNativeEvents(this.el, { input: true, change: true });
    // menu intentionally stays open
  }

  private removeValue = (v: string) => (e?: Event) => {
    e?.stopPropagation();
    if (this.disabled || this.readOnly) return;
    if (!this.values.includes(v)) return;
    this.values = this.values.filter(x => x !== v);
    this.valueChange.emit({ value: this.value, values: this.values });
    dispatchNativeEvents(this.el, { input: true, change: true });
  };

  private clear = (e?: Event) => {
    e?.stopPropagation();
    if (this.multiple) {
      if (!this.values.length) return;
      this.values = [];
      this.valueChange.emit({ value: this.value, values: this.values });
      dispatchNativeEvents(this.el, { input: true, change: true });
    } else {
      this.commit('', false);
    }
    this.focusTrigger();
  };

  // Single mode's actual focus/tab stop: the readonly <input> inside
  // material-textfield's shadow root. material-textfield has no prop to
  // plumb combobox ARIA through, so select reaches in directly here — same
  // shadow-piercing already used by fieldRowEl()/focusTrigger() below.
  private triggerInputEl(): HTMLInputElement | null {
    return ((this.textfieldEl as HTMLElement | undefined)
      ?.shadowRoot?.querySelector('input') as HTMLInputElement | null) ?? null;
  }

  private fieldRowEl(): HTMLElement | undefined {
    if (this.multiple) return this.shellEl;
    // Anchor against the input row, not the whole textfield (which includes
    // supporting text below). Both filled & outlined variants render the
    // input inside a `.relative` wrapper.
    const input = this.triggerInputEl();
    return (input?.closest('.relative') as HTMLElement | null) ?? this.textfieldEl;
  }

  // Single mode: role=combobox + aria-haspopup/expanded/controls belong on
  // the input, the element the user actually tabs to — not the trailing
  // chevron icon-button, a separate tab stop (per m3 comparison notes /
  // reference select.ts:398-410). Re-applied on every render since
  // material-textfield's own vdom diffing doesn't know about these
  // attributes and won't strip them, but a full input-node replacement
  // would. The chevron stays mouse-clickable but is pulled out of the tab
  // order and hidden from assistive tech, so there's exactly one combobox
  // focus stop.
  private syncTriggerAria() {
    if (this.multiple) return;
    const input = this.triggerInputEl();
    if (input) {
      input.setAttribute('role', 'combobox');
      input.setAttribute('aria-haspopup', 'listbox');
      input.setAttribute('aria-expanded', this.open ? 'true' : 'false');
      input.setAttribute('aria-controls', 'listbox');
    }
    const chevronBtn = this.chevronEl?.shadowRoot?.querySelector('button');
    if (chevronBtn) chevronBtn.setAttribute('tabindex', '-1');
  }

  private openMenu = () => {
    if (this.disabled || this.readOnly) return;
    if (!this.menuEl) return;
    const anchor = this.fieldRowEl();
    if (!anchor) return;
    this.menuEl.show(anchor);
  };

  private toggleMenu = (e?: Event) => {
    e?.stopPropagation();
    if (this.open) this.menuEl?.hide();
    else this.openMenu();
  };

  private handleOptionSelect = (e: Event) => {
    if (this.multiple) return; // ignored — multi mode uses materialOptionToggle
    const ce = e as CustomEvent<{ value: string }>;
    e.stopPropagation();
    this.commit(ce.detail?.value ?? '');
  };

  private handleOptionToggle = (e: Event) => {
    if (!this.multiple) return;
    const ce = e as CustomEvent<{ value: string; selected: boolean }>;
    e.stopPropagation();
    if (ce.detail?.value) this.toggleValue(ce.detail.value);
  };

  // Request-selection channel: an option's `selected` prop was set
  // programmatically from outside (reference selectOptionController.ts:
  // 105-127). No-op when value/values already agree — the same guard the
  // reference uses, and what keeps this from looping back against
  // applySelection() (which always updates `value`/`values` before it
  // writes the options, so by the time an option's own resulting
  // request-(de)selection round-trips back here, the check below is
  // already satisfied).
  private handleOptionRequestSelection = (e: Event) => {
    const ce = e as CustomEvent<{ value: string }>;
    e.stopPropagation();
    const v = ce.detail?.value;
    if (!v) return;
    if (this.multiple) {
      if (!this.values.includes(v)) this.toggleValue(v);
    } else if (this.value !== v) {
      this.commit(v);
    }
  };

  private handleOptionRequestDeselection = (e: Event) => {
    const ce = e as CustomEvent<{ value: string }>;
    e.stopPropagation();
    const v = ce.detail?.value;
    if (!v) return;
    if (this.multiple) {
      if (this.values.includes(v)) this.toggleValue(v);
    } else if (this.value === v) {
      this.commit('', false);
    }
  };

  private handleMenuOpen = () => {
    this.open = true;
    this.openChange.emit({ open: true });
    // A closed-select typeahead commit may have left an announcement live;
    // the menu opening supersedes it.
    (this.textfieldEl as HTMLElement | undefined)?.removeAttribute('aria-live');
    requestAnimationFrame(() => {
      if (!this.menuEl) return;
      const anchor = this.fieldRowEl();
      const w = (anchor ?? this.el).getBoundingClientRect().width;
      const style = this.menuEl.style;
      style.minWidth = `${Math.round(w)}px`;
      style.maxWidth = 'none';

      const opts = this.getOptions();
      // Single mode: focus selected to skip past it (or first/last, if the
      // menu was opened via Home/End). Multi mode: leave focus on shell so
      // removing chips / continued typing stays natural.
      if (!this.multiple) {
        let target: MaterialOptionLike | undefined;
        if (this.pendingOpenFocus === 'first') target = opts[0];
        else if (this.pendingOpenFocus === 'last') target = opts[opts.length - 1];
        else {
          target = opts.find(o => o.value === this.value);
          if (!target && this.pendingOpenFocus === 'selected-or-last') target = opts[opts.length - 1];
        }
        if (target) {
          target.focus();
          target.scrollIntoView({ block: 'nearest' });
        }
      }
      this.pendingOpenFocus = null;
    });
  };

  private handleMenuClose = () => {
    this.open = false;
    this.openChange.emit({ open: false });
    this.focusTrigger();
  };

  // Announces a closed-select typeahead commit (no visible focus change to
  // signal it otherwise) — cleared again as soon as the menu opens.
  private announceValue() {
    (this.textfieldEl as HTMLElement | undefined)?.setAttribute('aria-live', 'polite');
  }

  private focusTrigger() {
    if (this.multiple) {
      this.shellEl?.focus();
      return;
    }
    this.triggerInputEl()?.focus();
  }

  private menuKeyHandler = (e: KeyboardEvent) => {
    if (!this.open) return;
    const opts = this.getOptions();
    if (!opts.length) return;
    const active = (e.composedPath().find(
      n => n instanceof HTMLElement && (n as HTMLElement).tagName === 'MATERIAL-OPTION',
    ) as HTMLElement | undefined);
    const idx = active ? opts.indexOf(active as MaterialOptionLike) : -1;
    const focusAt = (i: number) => {
      const n = (i + opts.length) % opts.length;
      opts[n].focus();
      opts[n].scrollIntoView({ block: 'nearest' });
    };

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        e.stopPropagation();
        focusAt(idx + 1);
        return;
      case 'ArrowUp':
        e.preventDefault();
        e.stopPropagation();
        focusAt(idx - 1);
        return;
      case 'Home':
        e.preventDefault();
        e.stopPropagation();
        focusAt(0);
        return;
      case 'End':
        e.preventDefault();
        e.stopPropagation();
        focusAt(opts.length - 1);
        return;
    }
    // Type-ahead within the open menu runs from the capture-phase listener
    // below (needs to run before the focused option's own keydown handler).
  };

  private triggerKeyHandler = (e: KeyboardEvent) => {
    if (this.disabled || this.readOnly) return;
    if (this.open) return;

    const isOpenKey =
      e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' ||
      e.key === ' ' || e.key === 'Home' || e.key === 'End';

    // While a closed-select typeahead buffer is live, none of these keys
    // open the menu — Space in particular may just be a search-string
    // character (e.g. "New York"), not a request to open.
    if (!this.closedTypeahead.isTypingAhead && isOpenKey) {
      e.preventDefault();
      this.pendingOpenFocus =
        e.key === 'Home' ? 'first' :
        e.key === 'End' ? 'last' :
        e.key === 'ArrowUp' ? 'selected-or-last' :
        null;
      this.openMenu();
      return;
    }

    // Multi: backspace removes last chip when shell is focused.
    if (this.multiple && e.key === 'Backspace' && this.values.length) {
      e.preventDefault();
      this.removeValue(this.values[this.values.length - 1])();
      return;
    }

    // Closed-select type-ahead: printable keys only (this also catches a
    // mid-buffer Space that isOpenKey above intentionally let fall through).
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      this.closedTypeahead.onKeydown(e);
      e.preventDefault();
    }
  };

  // Capture-phase, open-menu only: runs before the event reaches the
  // focused option's own keydown handler, so a mid-buffer Space (consumed
  // by the typeahead below) can be stopped before it activates/closes the
  // option — bubble phase would be too late for that.
  @Listen('keydown', { capture: true })
  handleOpenTypeaheadCapture(e: KeyboardEvent) {
    if (this.disabled || this.readOnly || !this.open) return;
    this.openTypeahead.onKeydown(e);
    if (e.defaultPrevented) e.stopPropagation();
  }

  private handleHostKeyDown = (e: KeyboardEvent) => {
    if (this.open) this.menuKeyHandler(e);
    else this.triggerKeyHandler(e);
  };

  private handleTextfieldClick = (e: MouseEvent) => {
    // Click on the readonly textfield surface toggles the menu.
    // Skip when the click was on a trailing icon-button (it has its own handler).
    const path = e.composedPath();
    if (path.some(n => n instanceof HTMLElement && (n as HTMLElement).tagName === 'MATERIAL-ICON-BUTTON')) {
      return;
    }
    e.stopPropagation();
    this.toggleMenu();
  };

  private handleShellClick = (e: MouseEvent) => {
    const path = e.composedPath();
    if (path.some(n => n instanceof HTMLElement && (n as HTMLElement).tagName === 'MATERIAL-ICON-BUTTON')) {
      return;
    }
    e.stopPropagation();
    this.toggleMenu();
  };

  private handleSlotChange = () => {
    this.refreshDisplay();
    this.applySelection();
  };

  private setMenuRef = (el?: HTMLElement) => {
    this.menuEl = el as MaterialMenuLike | undefined;
  };

  private setTextfieldRef = (el?: unknown) => {
    this.textfieldEl = el as HTMLElement | undefined;
  };

  private setShellRef = (el?: HTMLElement) => {
    this.shellEl = el;
  };

  private setChevronRef = (el?: HTMLMaterialIconButtonElement) => {
    this.chevronEl = el as HTMLElement | undefined;
  };

  private renderMultiShell() {
    const openLabel = this.openLabel || gettext('Open list');
    const clearLabel = this.clearLabel || gettext('Clear selection');
    const showClear = this.clearable && this.values.length > 0 && !this.disabled && !this.readOnly;
    const filled = this.variant === 'filled';
    const hasLeading = !!this.leadingIcon;
    const isFilled = this.values.length > 0 || this.shellFocused;
    // See material-textfield's render() for the error/errorText fold-in and
    // empty-errorText-falls-back-to-helpText rationale.
    const inError = this.error || this.nativeError;
    const errorText = this.errorText || this.nativeErrorText;
    const labelTone = inError ? 'error' : (this.shellFocused ? 'focused' : 'idle');
    const subText = (inError && errorText) ? errorText : this.helpText;

    const stopBlur = (e: Event) => e.preventDefault();
    const removeAria = (lbl: string) => `${gettext('Remove')} ${lbl}`;

    const chip = (v: string) => {
      const o = this.findOption(v);
      const lbl = o ? this.optionLabel(o) : v;
      return (
        <span class="chip">
          <span class="chip-label">{lbl}</span>
          <button
            type="button"
            class="chip-remove"
            aria-label={removeAria(lbl)}
            disabled={this.disabled || this.readOnly}
            onClick={this.removeValue(v)}
            onMouseDown={stopBlur as any}
          >
            <span class="chip-remove-icon" aria-hidden="true">close</span>
          </button>
        </span>
      );
    };

    const trailing = (
      <span class="trailing">
        {showClear && (
          <material-icon-button
            size="xs"
            variant="standard"
            icon="close"
            aria-label={clearLabel}
            class="clear-btn"
            onClick={this.clear}
            onMouseDown={stopBlur as any}
          />
        )}
        <material-icon-button
          size="s"
          variant="standard"
          icon="arrow_drop_down"
          aria-label={openLabel}
          disabled={this.disabled}
          onClick={this.toggleMenu}
          onMouseDown={stopBlur as any}
        />
      </span>
    );

    const leading = hasLeading && (
      <span
        class={inError ? 'leading-icon error' : 'leading-icon'}
        aria-hidden="true"
      >
        {this.leadingIcon}
      </span>
    );

    const sharedShellAttrs = {
      ref: this.setShellRef,
      role: 'combobox',
      'aria-labelledby': this.label ? 'label' : null,
      'aria-label': !this.label ? (this.el.getAttribute('aria-label') ?? null) : null,
      tabindex: this.disabled ? -1 : 0,
      'aria-haspopup': 'listbox',
      'aria-expanded': this.open ? 'true' : 'false',
      // aria-multiselectable belongs on the listbox popup, not the combobox.
      'aria-controls': 'listbox',
      'aria-disabled': this.disabled ? 'true' : null,
      'aria-invalid': inError ? 'true' : null,
      'aria-describedby': subText ? 'description' : null,
      onClick: this.handleShellClick,
      onFocus: () => (this.shellFocused = true),
      onBlur: () => (this.shellFocused = false),
    } as const;

    const supportingRow = (subText) && (
      <div class="supporting-row">
        <span
          id="description"
          class={inError ? 'error' : 'idle'}
          role={inError && !this.refreshErrorAlert ? 'alert' : undefined}
        >
          {subText}
        </span>
      </div>
    );

    const shellCls = [
      'shell',
      filled ? 'filled' : 'outlined',
      hasLeading ? 'leading' : 'no-leading',
      showClear ? 'wide' : 'narrow',
    ].join(' ');

    if (filled) {
      const labelCls = [
        'field-label',
        'filled',
        hasLeading ? 'leading' : '',
        isFilled ? 'shrunk' : 'rest',
        labelTone,
      ].filter(Boolean).join(' ');
      const indicatorCls = [
        'indicator',
        inError ? 'error' : (this.shellFocused ? 'focused' : ''),
        inError || this.shellFocused ? 'active' : '',
      ].filter(Boolean).join(' ');

      return (
        <div class="wrapper">
          <div class={this.disabled ? 'surface filled disabled' : 'surface filled'}>
            {leading}
            {trailing}
            <div {...sharedShellAttrs} class={shellCls}>
              {this.values.map(chip)}
              {!this.values.length && this.placeholder && this.shellFocused && (
                <span class="placeholder">{this.placeholder}</span>
              )}
            </div>
            {this.label && (
              <label class={labelCls} id="label">
                {this.label}{this.required ? ' *' : ''}
              </label>
            )}
            <span class={indicatorCls} aria-hidden="true"></span>
          </div>
          {supportingRow}
        </div>
      );
    }

    // Outlined.
    const labelCls = [
      'field-label',
      'outlined',
      hasLeading ? 'leading' : '',
      isFilled ? 'shrunk' : 'rest',
      labelTone,
    ].filter(Boolean).join(' ');
    const fieldsetCls = [
      'fieldset',
      inError ? 'error' : (this.shellFocused ? 'focused' : ''),
    ].filter(Boolean).join(' ');
    const legendCls = inError || this.shellFocused ? 'legend active' : 'legend';

    return (
      <div class="wrapper">
        <div class={this.disabled ? 'surface disabled' : 'surface'}>
          {leading}
          {trailing}
          <div {...sharedShellAttrs} class={shellCls}>
            {this.values.map(chip)}
            {!this.values.length && this.placeholder && this.shellFocused && (
              <span class="placeholder">{this.placeholder}</span>
            )}
          </div>
          {this.label && (
            <label class={labelCls} id="label">
              {this.label}{this.required ? ' *' : ''}
            </label>
          )}
          <fieldset aria-hidden="true" class={fieldsetCls}>
            {this.label && (
              <legend class={legendCls}>
                <span class={isFilled ? 'legend-text expanded' : 'legend-text'}>
                  {this.label}{this.required ? ' *' : ''}
                </span>
              </legend>
            )}
          </fieldset>
        </div>
        {supportingRow}
      </div>
    );
  }

  private renderSingleShell() {
    const openLabel = this.openLabel || gettext('Open list');
    const clearLabel = this.clearLabel || gettext('Clear selection');
    const showClear = this.clearable && !!this.value && !this.disabled && !this.readOnly;
    return (
      <material-textfield
        ref={this.setTextfieldRef}
        variant={this.variant}
        label={this.label}
        value={this.displayLabel}
        placeholder={this.placeholder}
        disabled={this.disabled}
        required={this.required}
        readOnly={true}
        // Delegates to the inner textfield's own error/errorText handling
        // (including its empty-errorText-falls-back-to-helpText behavior) —
        // so pass helpText unconditionally rather than suppressing it here.
        helpText={this.helpText}
        errorText={this.errorText || this.nativeErrorText}
        error={this.error || this.nativeError}
        leadingIcon={this.leadingIcon}
        wideTrailing={showClear}
        onClick={this.handleTextfieldClick as unknown as (e: MouseEvent) => void}
      >
        <span slot="trailing" class="single-trailing">
          {showClear && (
            <material-icon-button
              size="xs"
              variant="standard"
              icon="close"
              aria-label={clearLabel}
              class="clear-btn"
              onClick={this.clear}
            />
          )}
          <material-icon-button
            ref={this.setChevronRef}
            size="s"
            variant="standard"
            icon="arrow_drop_down"
            aria-label={openLabel}
            aria-hidden="true"
            disabled={this.disabled}
            onClick={this.toggleMenu}
          />
        </span>
      </material-textfield>
    );
  }

  render() {
    return (
      <Host
        onKeyDown={this.handleHostKeyDown}
        onMaterialOptionSelect={this.handleOptionSelect}
        onMaterialOptionToggle={this.handleOptionToggle}
        onMaterialOptionRequestSelection={this.handleOptionRequestSelection}
        onMaterialOptionRequestDeselection={this.handleOptionRequestDeselection}
      >
        {this.multiple ? this.renderMultiShell() : this.renderSingleShell()}

        <material-menu
          ref={this.setMenuRef}
          id="listbox"
          menu-role="listbox"
          aria-multiselectable={this.multiple ? 'true' : null}
          onMaterialMenuOpen={this.handleMenuOpen}
          onMaterialMenuClose={this.handleMenuClose}
        >
          <slot onSlotchange={this.handleSlotChange} />
        </material-menu>
      </Host>
    );
  }
}
