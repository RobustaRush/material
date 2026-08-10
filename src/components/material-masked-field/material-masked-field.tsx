/*
 * @viewflow/material — Material 3 web components
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
  Prop,
  State,
  Watch,
  h,
} from '@stencil/core';
import { gettext } from '../../utils/i18n';

export type MaterialMaskedFieldVariant = 'filled' | 'outlined';

// Masked input — pattern-formatted text entry (phones, tax IDs, plates).
// Mask tokens: `#` digit, `A` letter, `*` letter-or-digit; everything else
// is a literal that types itself.
//
//   <material-masked-field name="phone" label="Phone"
//                          mask="+7 (###) ###-##-##"></material-masked-field>
//
// Light DOM with a hidden form input (material-date-field pattern). By
// default the FORMATTED value posts; `unmask` posts only the user-typed
// token characters ("9161234567") for storage-friendly backends.
//
// Typing anywhere re-derives the format: user characters are extracted from
// the field text and re-run through the mask, so paste and mid-string edits
// stay consistent. The caret lands after the last filled position — fine
// for append-style entry, the dominant case; a full caret-preserving mask
// engine is out of scope for v1.

const TOKEN_RE: Record<string, RegExp> = {
  '#': /[0-9]/,
  'A': /\p{L}/u,
  '*': /[\p{L}0-9]/u,
};

@Component({
  tag: 'material-masked-field',
  styleUrl: 'material-masked-field.css',
  shadow: false,
})
export class MaterialMaskedField {
  @Element() el!: HTMLElement;

  @Prop() variant: MaterialMaskedFieldVariant = 'outlined';
  @Prop() name?: string;
  @Prop() label?: string;

  /** The pattern: `#` digit, `A` letter, `*` alnum, others literal. */
  @Prop() mask!: string;

  /** Formatted value (mirrors what the field shows). */
  @Prop({ mutable: true, reflect: true }) value = '';

  /** Post only the raw token characters instead of the formatted string. */
  @Prop({ reflect: true }) unmask = false;

  /** Placeholder; defaults to the mask with tokens as underscores. */
  @Prop() placeholder?: string;

  @Prop({ mutable: true, reflect: true }) disabled = false;
  @Prop({ reflect: true }) required = false;
  @Prop({ reflect: true, attribute: 'readonly' }) readOnly = false;
  @Prop() helpText?: string;
  @Prop() errorText?: string;
  @Prop({ mutable: true, reflect: true }) error = false;
  @Prop() incompleteLabel = '';

  @State() liveError = '';

  @Event() valueChange!: EventEmitter<{ value: string; raw: string; complete: boolean }>;

  private hiddenInput?: HTMLInputElement;
  private textfield?: HTMLElement;

  componentWillLoad() {
    // Normalize a server-provided initial value through the mask.
    if (this.value) this.value = this.applyMask(this.extractRaw(this.value)).text;
  }

  @Watch('value')
  onValueChange() {
    if (this.hiddenInput) this.hiddenInput.value = this.formValue();
  }

  /** User-typed token characters in `text`, extracted by walking the mask
   *  in parallel: characters that match a LITERAL at their mask position are
   *  the mask's own (the "7" in "+7 (…") and must not become data —
   *  otherwise every re-format re-ingests them and the value compounds. */
  private extractRaw(text: string): string {
    const chars = [...(text ?? '')];
    let raw = '';
    let j = 0;
    for (const m of this.mask) {
      if (j >= chars.length) break;
      const re = TOKEN_RE[m];
      if (!re) {
        if (chars[j] === m) j++; // consume the literal if present
        continue;
      }
      while (j < chars.length && !re.test(chars[j])) j++; // skip garbage
      if (j < chars.length) raw += chars[j++];
    }
    return raw;
  }

  /** Feed raw characters through the mask. Characters that don't fit the
   *  next token are dropped (typing a letter into a digit slot is a no-op). */
  private applyMask(raw: string): { text: string; complete: boolean; used: number } {
    let text = '';
    let i = 0;
    let filledTokens = 0;
    let totalTokens = 0;
    let pendingLiterals = '';
    for (const m of this.mask) {
      const re = TOKEN_RE[m];
      if (!re) {
        pendingLiterals += m;
        continue;
      }
      totalTokens++;
      while (i < raw.length && !re.test(raw[i])) i++;
      if (i >= raw.length) continue;
      // Literals between the previous token and this one attach only when
      // the token actually fills, so an empty field stays empty.
      text += pendingLiterals;
      pendingLiterals = '';
      text += raw[i++];
      filledTokens++;
    }
    return { text, complete: totalTokens > 0 && filledTokens === totalTokens, used: i };
  }

  private formValue(): string {
    return this.unmask ? this.extractRaw(this.value) : this.value;
  }

  private defaultPlaceholder(): string {
    return this.mask.replace(/[#A*]/g, '_');
  }

  private setCaretToEnd() {
    const input = this.textfield?.shadowRoot?.querySelector('input');
    if (input && document.activeElement && this.el.contains(document.activeElement)) {
      const end = input.value.length;
      input.setSelectionRange(end, end);
    }
  }

  private prevText = '';
  private prevRaw = '';

  private handleTextInput = (e: Event) => {
    e.stopPropagation();
    const detail = (e as CustomEvent<{ value: string }>).detail;
    const typed = detail?.value ?? '';
    let raw = this.extractRaw(typed);
    // Backspace over a trailing literal would otherwise re-format it right
    // back (raw unchanged) — treat it as deleting the preceding character.
    if (typed.length < this.prevText.length && raw === this.prevRaw && raw) {
      raw = raw.slice(0, -1);
    }
    const { text, complete } = this.applyMask(raw);
    this.prevText = text;
    this.prevRaw = raw;
    this.value = text;
    // Write the formatted text back into the field (the textfield mirrors
    // its `value` prop into the input on render).
    const tf = this.textfield as (HTMLElement & { value: string }) | undefined;
    if (tf) tf.value = text;
    requestAnimationFrame(() => this.setCaretToEnd());
    this.error = false;
    this.liveError = '';
    this.valueChange.emit({ value: text, raw: this.extractRaw(text), complete });
  };

  private handleTextChange = (e: Event) => {
    e.stopPropagation();
    // Blur with a partially filled mask → flag it (empty is fine unless
    // `required`, which the form layer handles).
    const { complete } = this.applyMask(this.extractRaw(this.value));
    if (this.value && !complete) {
      this.error = true;
      this.liveError = this.incompleteLabel || gettext('Incomplete value');
    }
  };

  render() {
    const subText = this.error ? (this.errorText || this.liveError) : this.helpText;
    return (
      <Host class="block w-full">
        <material-textfield
          ref={(el) => {
            this.textfield = el as HTMLElement;
          }}
          variant={this.variant}
          label={this.label}
          value={this.value}
          placeholder={this.placeholder ?? this.defaultPlaceholder()}
          disabled={this.disabled}
          required={this.required}
          readOnly={this.readOnly}
          helpText={!this.error ? this.helpText : undefined}
          errorText={subText}
          error={this.error}
          onValueInput={this.handleTextInput as unknown as (e: Event) => void}
          onValueChange={this.handleTextChange as unknown as (e: Event) => void}
        />

        <input
          ref={(el) => {
            this.hiddenInput = el;
          }}
          type="hidden"
          name={this.name}
          value={this.formValue()}
        />
      </Host>
    );
  }
}
