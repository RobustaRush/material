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
}

interface MaterialMenuLike extends HTMLElement {
  show(anchorEl?: Element): Promise<void> | void;
  hide(): Promise<void> | void;
  open: boolean;
}

// MD3 single-select. Textfield + trailing chevron icon-button trigger;
// clicking (or pressing ↓/Enter/Space on the trigger) opens a popover-anchored
// `material-menu` containing slotted `material-option` / `material-optgroup`
// children. Form-associated via `attachInternals()` — the canonical option
// `value` is what gets posted.

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

  @State() displayLabel = '';
  @State() open = false;

  @Event() valueChange!: EventEmitter<{ value: string }>;
  @Event() openChange!: EventEmitter<{ open: boolean }>;

  private defaultValue = '';
  private menuEl?: MaterialMenuLike;
  private textfieldEl?: HTMLElement;
  private typeahead = '';
  private typeaheadTimer = 0;

  componentWillLoad() {
    this.defaultValue = this.value;
    return this.el.shadowRoot ? adoptMaterialStyles(this.el.shadowRoot) : undefined;
  }

  connectedCallback() {
    this.refreshDisplay();
    this.applySelection();
    this.syncFormValue();
  }

  componentDidLoad() {
    this.refreshDisplay();
    this.applySelection();
  }

  @Watch('value')
  onValueChange() {
    this.refreshDisplay();
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
    this.value = this.defaultValue;
  }

  formStateRestoreCallback(state: string | null) {
    if (state != null) this.value = state;
  }

  private syncFormValue() {
    this.internals.setFormValue(this.disabled ? null : this.value);
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

  private refreshDisplay() {
    const opts = this.getOptions(true);
    const match = opts.find(o => o.value === this.value);
    this.displayLabel = match ? this.optionLabel(match) : '';
  }

  private applySelection() {
    for (const o of this.getOptions(true)) {
      o.selected = (o.value === this.value && this.value !== '');
    }
  }

  private commit(value: string, closeMenu = true) {
    if (this.disabled || this.readOnly) return;
    this.value = value;
    this.valueChange.emit({ value });
    if (closeMenu && this.open) this.menuEl?.hide();
  }

  private clear = (e?: Event) => {
    e?.stopPropagation();
    this.commit('', false);
    this.focusTrigger();
  };

  private fieldRowEl(): HTMLElement | undefined {
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
    const ce = e as CustomEvent<{ value: string }>;
    e.stopPropagation();
    this.commit(ce.detail?.value ?? '');
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
      const sel = opts.find(o => o.value === this.value);
      // Only move focus into the menu when there's an existing selection to
      // land on. Without this, opening an empty select would float the label
      // up (focus on input) then drop it back down (focus on first option).
      // Arrow keys from the trigger still focus options on demand.
      if (sel) sel.focus();
    });
  };

  private handleMenuClose = () => {
    this.open = false;
    this.openChange.emit({ open: false });
    this.focusTrigger();
  };

  private focusTrigger() {
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

    // Native <select> parity — type-ahead jumps to & selects inline when closed.
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      this.typeahead += e.key.toLowerCase();
      window.clearTimeout(this.typeaheadTimer);
      this.typeaheadTimer = window.setTimeout(() => (this.typeahead = ''), 500);
      const opts = this.getOptions();
      const match = opts.find(o => this.optionLabel(o).toLowerCase().startsWith(this.typeahead));
      if (match) this.commit(match.value, false);
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

  render() {
    const openLabel = this.openLabel || gettext('Open list');
    const clearLabel = this.clearLabel || gettext('Clear selection');
    const showClear = this.clearable && !!this.value && !this.disabled && !this.readOnly;

    return (
      <Host
        class="block w-full"
        onKeyDown={this.handleHostKeyDown}
        onMaterialOptionSelect={this.handleOptionSelect}
      >
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
              disabled={this.disabled}
              onClick={this.toggleMenu}
            />
          </span>
        </material-textfield>

        <material-menu
          ref={this.setMenuRef}
          onMaterialMenuOpen={this.handleMenuOpen}
          onMaterialMenuClose={this.handleMenuClose}
        >
          <slot onSlotchange={this.handleSlotChange} />
        </material-menu>
      </Host>
    );
  }
}
