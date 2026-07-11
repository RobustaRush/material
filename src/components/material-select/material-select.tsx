import {
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Prop,
  State,
  Watch,
  AttachInternals,
  h,
} from '@stencil/core';
import { adoptMaterialStyles } from '../../utils/adopted-styles';
import { gettext } from '../../utils/i18n';

export type MaterialSelectVariant = 'filled' | 'outlined';

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

  @Event() valueChange!: EventEmitter<{ value: string; values: string[] }>;
  @Event() openChange!: EventEmitter<{ open: boolean }>;

  private defaultValue = '';
  private defaultValues: string[] = [];
  private menuEl?: MaterialMenuLike;
  private textfieldEl?: HTMLElement;
  private shellEl?: HTMLElement;
  private typeahead = '';
  private typeaheadTimer = 0;

  componentWillLoad() {
    this.defaultValue = this.value;
    // If `values` was supplied directly, capture it; otherwise derive from CSV.
    if (this.multiple) {
      if (!this.values?.length && this.value) {
        this.values = this.value.split(',').filter(Boolean);
      }
      this.defaultValues = [...(this.values ?? [])];
      this.value = this.values.join(',');
    }
    return this.el.shadowRoot ? adoptMaterialStyles(this.el.shadowRoot) : undefined;
  }

  connectedCallback() {
    this.refreshDisplay();
    this.applySelection();
    this.syncFormValue();
    this.mirrorValuesAttr();
  }

  componentDidLoad() {
    this.refreshDisplay();
    this.applySelection();
  }

  @Watch('value')
  onValueChange() {
    if (this.multiple) {
      const parsed = this.value ? this.value.split(',').filter(Boolean) : [];
      if (parsed.join(',') !== this.values.join(',')) {
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
    const csv = this.values.join(',');
    if (this.value !== csv) this.value = csv;
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
  }

  formStateRestoreCallback(state: string | null) {
    if (state == null) return;
    if (this.multiple) {
      this.values = state ? state.split(',').filter(Boolean) : [];
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

  private syncFormValue() {
    if (this.disabled) {
      this.internals.setFormValue(null);
      this.internals.setValidity({});
      return;
    }
    if (this.multiple) {
      const fd = new FormData();
      if (this.name) for (const v of this.values) fd.append(this.name, v);
      this.internals.setFormValue(fd, this.values.join(','));
      const missing = this.required && this.values.length === 0;
      if (missing) {
        this.internals.setValidity(
          { valueMissing: true },
          gettext('Please select at least one option'),
          (this.shellEl as HTMLElement | undefined) ?? this.el,
        );
      } else {
        this.internals.setValidity({});
      }
      return;
    }
    this.internals.setFormValue(this.value);
    if (this.required && !this.value) {
      this.internals.setValidity(
        { valueMissing: true },
        gettext('Please select an option'),
        (this.textfieldEl as HTMLElement | undefined) ?? this.el,
      );
    } else {
      this.internals.setValidity({});
    }
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
    if (closeMenu && this.open) this.menuEl?.hide();
  }

  private toggleValue(v: string) {
    if (this.disabled || this.readOnly) return;
    const set = new Set(this.values);
    set.has(v) ? set.delete(v) : set.add(v);
    this.values = [...set];
    this.valueChange.emit({ value: this.value, values: this.values });
    // menu intentionally stays open
  }

  private removeValue = (v: string) => (e?: Event) => {
    e?.stopPropagation();
    if (this.disabled || this.readOnly) return;
    if (!this.values.includes(v)) return;
    this.values = this.values.filter(x => x !== v);
    this.valueChange.emit({ value: this.value, values: this.values });
  };

  private clear = (e?: Event) => {
    e?.stopPropagation();
    if (this.multiple) {
      if (!this.values.length) return;
      this.values = [];
      this.valueChange.emit({ value: this.value, values: this.values });
    } else {
      this.commit('', false);
    }
    this.focusTrigger();
  };

  private fieldRowEl(): HTMLElement | undefined {
    if (this.multiple) return this.shellEl;
    // Anchor against the input row, not the whole textfield (which includes
    // supporting text below). Both filled & outlined variants render the
    // input inside a `.relative` wrapper.
    const input = (this.textfieldEl as HTMLElement | undefined)
      ?.shadowRoot?.querySelector('input');
    return (input?.closest('.relative') as HTMLElement | null) ?? this.textfieldEl;
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

  private handleMenuOpen = () => {
    this.open = true;
    this.openChange.emit({ open: true });
    requestAnimationFrame(() => {
      if (!this.menuEl) return;
      const anchor = this.fieldRowEl();
      const w = (anchor ?? this.el).getBoundingClientRect().width;
      const style = this.menuEl.style;
      style.minWidth = `${Math.round(w)}px`;
      style.maxWidth = 'none';

      const opts = this.getOptions();
      // Single mode: focus selected to skip past it. Multi mode: leave
      // focus on shell so removing chips / continued typing stays natural.
      if (!this.multiple) {
        const sel = opts.find(o => o.value === this.value);
        if (sel) sel.focus();
      }
    });
  };

  private handleMenuClose = () => {
    this.open = false;
    this.openChange.emit({ open: false });
    this.focusTrigger();
  };

  private focusTrigger() {
    if (this.multiple) {
      this.shellEl?.focus();
      return;
    }
    const input = (this.textfieldEl as HTMLElement | undefined)
      ?.shadowRoot?.querySelector('input') as HTMLInputElement | null;
    input?.focus();
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

    // Type-ahead within open menu — focus matching option without committing.
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      this.typeahead += e.key.toLowerCase();
      window.clearTimeout(this.typeaheadTimer);
      this.typeaheadTimer = window.setTimeout(() => (this.typeahead = ''), 500);
      const match = opts.find(o => this.optionLabel(o).toLowerCase().startsWith(this.typeahead));
      if (match) {
        match.focus();
        match.scrollIntoView({ block: 'nearest' });
      }
    }
  };

  private triggerKeyHandler = (e: KeyboardEvent) => {
    if (this.disabled || this.readOnly) return;
    if (this.open) return;

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.openMenu();
      return;
    }

    // Multi: backspace removes last chip when shell is focused.
    if (this.multiple && e.key === 'Backspace' && this.values.length) {
      e.preventDefault();
      this.removeValue(this.values[this.values.length - 1])();
      return;
    }

    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      this.typeahead += e.key.toLowerCase();
      window.clearTimeout(this.typeaheadTimer);
      this.typeaheadTimer = window.setTimeout(() => (this.typeahead = ''), 500);
      const opts = this.getOptions();
      const match = opts.find(o => this.optionLabel(o).toLowerCase().startsWith(this.typeahead));
      if (!match) return;
      if (this.multiple) {
        // Multi: open menu and focus the match — don't toggle on stray keystrokes.
        this.openMenu();
        requestAnimationFrame(() => {
          match.focus();
          match.scrollIntoView({ block: 'nearest' });
        });
      } else {
        // Single: native <select> parity — commits inline without opening.
        this.commit(match.value, false);
      }
    }
  };

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

  private renderMultiShell() {
    const openLabel = this.openLabel || gettext('Open list');
    const clearLabel = this.clearLabel || gettext('Clear selection');
    const showClear = this.clearable && this.values.length > 0 && !this.disabled && !this.readOnly;
    const wide = showClear ? 'pr-24' : 'pr-12';
    const filled = this.variant === 'filled';
    const hasLeading = !!this.leadingIcon;
    const labelLeft = hasLeading ? 'left-12' : 'left-4';
    const isFilled = this.values.length > 0 || this.shellFocused;
    const labelTone = this.error
      ? 'text-error'
      : (this.shellFocused ? 'text-primary' : 'text-on-surface-variant');
    const subText = this.error ? this.errorText : this.helpText;

    const labelBaseCls =
      `absolute ${labelLeft} pointer-events-none origin-left transition-all duration-150 ` +
      `text-base ${labelTone}`;

    const stopBlur = (e: Event) => e.preventDefault();
    const removeAria = (lbl: string) => `${gettext('Remove')} ${lbl}`;

    const chip = (v: string) => {
      const o = this.findOption(v);
      const lbl = o ? this.optionLabel(o) : v;
      return (
        <span
          class="inline-flex items-center gap-1 h-7 pl-2.5 pr-1 rounded-lg bg-secondary-container text-on-secondary-container text-sm max-w-full"
          role="listitem"
        >
          <span class="truncate">{lbl}</span>
          <button
            type="button"
            class="inline-flex items-center justify-center w-5 h-5 rounded-full text-on-secondary-container hover:bg-on-secondary-container/15 active:bg-on-secondary-container/25 focus-visible:outline-2 focus-visible:outline-secondary disabled:pointer-events-none"
            aria-label={removeAria(lbl)}
            disabled={this.disabled || this.readOnly}
            onClick={this.removeValue(v)}
            onMouseDown={stopBlur as any}
          >
            <span class="material-symbols text-[16px]" aria-hidden="true">close</span>
          </button>
        </span>
      );
    };

    const trailing = (
      <span class="absolute right-1 top-1 inline-flex items-center z-10">
        {showClear && (
          <material-icon-button
            size="xs"
            variant="standard"
            icon="close"
            aria-label={clearLabel}
            class="-mr-5"
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
        class={`absolute left-3 top-3 z-10 inline-flex items-center material-symbols text-2xl pointer-events-none ${this.error ? 'text-error' : 'text-on-surface-variant'}`}
        aria-hidden="true"
      >
        {this.leadingIcon}
      </span>
    );

    const sharedShellAttrs = {
      ref: this.setShellRef,
      role: 'combobox',
      tabindex: this.disabled ? -1 : 0,
      'aria-haspopup': 'listbox',
      'aria-expanded': this.open ? 'true' : 'false',
      // aria-multiselectable belongs on the listbox popup, not the combobox.
      'aria-controls': 'listbox',
      'aria-disabled': this.disabled ? 'true' : null,
      'aria-invalid': this.error ? 'true' : null,
      'aria-describedby': subText ? 'description' : null,
      onClick: this.handleShellClick,
      onFocus: () => (this.shellFocused = true),
      onBlur: () => (this.shellFocused = false),
    } as const;

    const supportingRow = (subText) && (
      <div class="flex justify-between gap-4 mt-1 px-4 text-xs leading-4">
        <span
          id="description"
          class={this.error ? 'text-error' : 'text-on-surface-variant'}
          role={this.error ? 'alert' : undefined}
        >
          {subText}
        </span>
      </div>
    );

    const innerL = hasLeading ? 'pl-12' : 'pl-3';

    if (filled) {
      const labelShrunkCls = isFilled
        ? 'top-2 translate-y-0 text-xs'
        : 'top-1/2 -translate-y-1/2';
      const indicatorCls = this.error
        ? 'h-0.5 bg-error'
        : (this.shellFocused
          ? 'h-0.5 bg-primary'
          : 'h-px bg-on-surface-variant');

      return (
        <div class="block w-full">
          <div class={`relative w-full min-h-14 rounded-t bg-surface-container-highest hover:bg-surface-container-high transition-colors ${this.disabled ? 'opacity-40 pointer-events-none' : ''}`}>
            {leading}
            {trailing}
            <div
              {...sharedShellAttrs}
              class={`relative min-h-14 w-full flex flex-wrap items-center gap-1.5 ${innerL} ${wide} pt-6 pb-2 outline-none cursor-pointer`}
            >
              {this.values.map(chip)}
              {!this.values.length && this.placeholder && this.shellFocused && (
                <span class="text-on-surface-variant text-base">{this.placeholder}</span>
              )}
            </div>
            {this.label && (
              <label class={`${labelBaseCls} ${labelShrunkCls}`}>
                {this.label}{this.required ? ' *' : ''}
              </label>
            )}
            <span
              class={`absolute left-0 right-0 bottom-0 pointer-events-none ${indicatorCls}`}
              aria-hidden="true"
            ></span>
          </div>
          {supportingRow}
        </div>
      );
    }

    // Outlined.
    const labelShrunkCls = isFilled
      ? `top-0 -translate-y-1/2 text-xs ${hasLeading ? 'left-4' : ''}`
      : 'top-7 -translate-y-1/2';
    const fieldsetTone = this.error
      ? 'border-2 border-error'
      : (this.shellFocused
        ? 'border-2 border-primary'
        : 'border border-outline hover:border-on-surface');
    const legendOffset = this.error || this.shellFocused ? '-ml-[2px]' : '-ml-px';

    return (
      <div class="block w-full">
        <div class={`relative w-full min-h-14 ${this.disabled ? 'opacity-40 pointer-events-none' : ''}`}>
          {leading}
          {trailing}
          <div
            {...sharedShellAttrs}
            class={`relative min-h-14 w-full flex flex-wrap items-center gap-1.5 ${innerL} ${wide} py-2 outline-none cursor-pointer`}
          >
            {this.values.map(chip)}
            {!this.values.length && this.placeholder && this.shellFocused && (
              <span class="text-on-surface-variant text-base">{this.placeholder}</span>
            )}
          </div>
          {this.label && (
            <label class={`${labelBaseCls} ${labelShrunkCls}`}>
              {this.label}{this.required ? ' *' : ''}
            </label>
          )}
          <fieldset
            aria-hidden="true"
            class={`absolute inset-0 m-0 px-3 pt-0 pointer-events-none rounded text-left ${fieldsetTone}`}
          >
            {this.label && (
              <legend class={`invisible block h-0 overflow-visible p-0 text-xs leading-none ${legendOffset}`}>
                <span class={`inline-block overflow-hidden whitespace-nowrap transition-[max-width,padding] duration-150 ${isFilled ? 'max-w-full px-1' : 'max-w-[0.01px]'}`}>
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
        helpText={!this.error ? this.helpText : undefined}
        errorText={this.errorText}
        error={this.error}
        leadingIcon={this.leadingIcon}
        wideTrailing={showClear}
        onClick={this.handleTextfieldClick as unknown as (e: MouseEvent) => void}
      >
        <span slot="trailing" class="inline-flex items-center">
          {showClear && (
            <material-icon-button
              size="xs"
              variant="standard"
              icon="close"
              aria-label={clearLabel}
              class="-mr-5"
              onClick={this.clear}
            />
          )}
          <material-icon-button
            size="s"
            variant="standard"
            icon="arrow_drop_down"
            aria-label={openLabel}
            aria-haspopup="listbox"
            aria-expanded={this.open ? 'true' : 'false'}
            aria-controls="listbox"
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
        class="block w-full"
        onKeyDown={this.handleHostKeyDown}
        onMaterialOptionSelect={this.handleOptionSelect}
        onMaterialOptionToggle={this.handleOptionToggle}
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
