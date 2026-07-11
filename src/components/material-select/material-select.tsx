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
import { gettext } from '../../utils/i18n';

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

  componentDidLoad() {
    this.refreshDisplay();
    this.applySelection();
  }

  disconnectedCallback() {
    // Typeahead reset timer would otherwise fire on a detached component.
    window.clearTimeout(this.typeaheadTimer);
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

  private syncFormValue() {
    if (this.disabled) {
      this.internals.setFormValue(null);
      this.internals.setValidity({});
      return;
    }
    if (this.multiple) {
      const fd = new FormData();
      if (this.name) for (const v of this.values) fd.append(this.name, v);
      this.internals.setFormValue(fd, this.values.join(VALUE_SEP));
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
    const filled = this.variant === 'filled';
    const hasLeading = !!this.leadingIcon;
    const isFilled = this.values.length > 0 || this.shellFocused;
    const labelTone = this.error ? 'error' : (this.shellFocused ? 'focused' : 'idle');
    const subText = this.error ? this.errorText : this.helpText;

    const stopBlur = (e: Event) => e.preventDefault();
    const removeAria = (lbl: string) => `${gettext('Remove')} ${lbl}`;

    const chip = (v: string) => {
      const o = this.findOption(v);
      const lbl = o ? this.optionLabel(o) : v;
      return (
        <span class="chip" role="listitem">
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
        class={this.error ? 'leading-icon error' : 'leading-icon'}
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
      <div class="supporting-row">
        <span
          id="description"
          class={this.error ? 'error' : 'idle'}
          role={this.error ? 'alert' : undefined}
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
        this.error ? 'error' : (this.shellFocused ? 'focused' : ''),
        this.error || this.shellFocused ? 'active' : '',
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
              <label class={labelCls}>
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
      this.error ? 'error' : (this.shellFocused ? 'focused' : ''),
    ].filter(Boolean).join(' ');
    const legendCls = this.error || this.shellFocused ? 'legend active' : 'legend';

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
            <label class={labelCls}>
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
        helpText={!this.error ? this.helpText : undefined}
        errorText={this.errorText}
        error={this.error}
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
