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
  AttachInternals,
  h,
} from '@stencil/core';
import { gettext } from '../../utils/i18n';

// Rich text editor — contenteditable with an MD3 toolbar. Scoped to CRM
// note/description fields: inline marks, lists, links, undo. It is NOT a
// page builder; for heavy documents integrate a dedicated editor instead.
//
// Form-associated: posts the HTML string under `name`. The HTML comes from
// the browser's editing engine — the SERVER MUST SANITIZE it before storing
// or re-rendering (Django: nh3/bleach), same as for any user HTML.
//
// Built on execCommand: deprecated on paper, but every engine keeps it for
// exactly this use case, it handles selection/undo integration for free,
// and swapping to a Selection-API engine later stays an internal change.

interface ToolbarAction {
  icon: string;
  label: string;
  command: string;
  state?: string; // queryCommandState key for the pressed indicator
}

const MARKS: ToolbarAction[] = [
  { icon: 'format_bold', label: 'Bold', command: 'bold', state: 'bold' },
  { icon: 'format_italic', label: 'Italic', command: 'italic', state: 'italic' },
  { icon: 'format_underlined', label: 'Underline', command: 'underline', state: 'underline' },
  { icon: 'strikethrough_s', label: 'Strikethrough', command: 'strikeThrough', state: 'strikeThrough' },
];

const LISTS: ToolbarAction[] = [
  { icon: 'format_list_bulleted', label: 'Bulleted list', command: 'insertUnorderedList', state: 'insertUnorderedList' },
  { icon: 'format_list_numbered', label: 'Numbered list', command: 'insertOrderedList', state: 'insertOrderedList' },
];

@Component({
  tag: 'material-rich-text',
  styleUrl: 'material-rich-text.css',
  shadow: true,
  formAssociated: true,
})
export class MaterialRichText {
  @Element() el!: HTMLElement;
  @AttachInternals() internals!: ElementInternals;

  @Prop() name?: string;
  @Prop() label?: string;
  @Prop() placeholder?: string;

  /** HTML string. Server-rendered initial content goes here. */
  @Prop({ mutable: true }) value = '';

  @Prop({ mutable: true, reflect: true }) disabled = false;
  @Prop({ reflect: true }) required = false;
  @Prop({ reflect: true, attribute: 'readonly' }) readOnly = false;
  @Prop() helpText?: string;
  @Prop() errorText?: string;
  @Prop({ mutable: true, reflect: true }) error = false;

  @State() focused = false;
  @State() activeStates: Record<string, boolean> = {};
  @State() linkBarOpen = false;
  @State() linkUrl = '';
  @State() empty = true;

  @Event() valueChange!: EventEmitter<{ value: string }>;
  @Event() valueInput!: EventEmitter<{ value: string }>;

  private editor?: HTMLElement;
  private defaultValue = '';

  componentWillLoad() {
    this.defaultValue = this.value;
  }

  componentDidLoad() {
    if (this.editor) {
      this.editor.innerHTML = this.value ?? '';
      this.refreshEmpty();
    }
    this.syncFormValue();
    document.addEventListener('selectionchange', this.handleSelectionChange);
  }

  disconnectedCallback() {
    document.removeEventListener('selectionchange', this.handleSelectionChange);
  }

  @Watch('value')
  onValueChange() {
    // External writes only — while the user types, editor DOM is the truth.
    if (this.editor && this.editor.innerHTML !== this.value) {
      this.editor.innerHTML = this.value ?? '';
      this.refreshEmpty();
    }
    this.syncFormValue();
  }

  @Watch('disabled')
  @Watch('required')
  onFlagsChange() {
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

  /** Treat markup with no text and no media as empty ("<p><br></p>" & co). */
  private isEmptyHtml(html: string): boolean {
    if (!html) return true;
    const probe = document.createElement('div');
    probe.innerHTML = html;
    if (probe.querySelector('img, hr, table')) return false;
    return (probe.textContent ?? '').trim() === '';
  }

  private refreshEmpty() {
    this.empty = this.isEmptyHtml(this.editor?.innerHTML ?? '');
  }

  private syncFormValue() {
    if (this.disabled) {
      this.internals.setFormValue(null);
      this.internals.setValidity({});
      return;
    }
    const html = this.isEmptyHtml(this.value) ? '' : this.value;
    this.internals.setFormValue(html);
    if (this.required && !html) {
      this.internals.setValidity(
        { valueMissing: true },
        gettext('Please fill in this field'),
        this.editor ?? this.el,
      );
    } else {
      this.internals.setValidity({});
    }
  }

  // --- editing ------------------------------------------------------------

  private exec(command: string, arg?: string) {
    if (this.disabled || this.readOnly) return;
    this.editor?.focus();
    document.execCommand(command, false, arg);
    this.pullFromEditor(false);
    this.refreshStates();
  }

  private pullFromEditor(change: boolean) {
    const html = this.editor?.innerHTML ?? '';
    this.value = html;
    this.refreshEmpty();
    this.syncFormValue();
    (change ? this.valueChange : this.valueInput).emit({ value: html });
  }

  private handleInput = () => this.pullFromEditor(false);

  private handleFocus = () => {
    this.focused = true;
  };

  private handleBlur = (e: FocusEvent) => {
    const next = e.relatedTarget as Node | null;
    if (next && this.el.shadowRoot?.contains(next)) return; // toolbar click
    this.focused = false;
    this.linkBarOpen = false;
    this.pullFromEditor(true);
  };

  private handleSelectionChange = () => {
    if (this.focused) this.refreshStates();
  };

  private refreshStates() {
    const states: Record<string, boolean> = {};
    for (const a of [...MARKS, ...LISTS]) {
      if (!a.state) continue;
      try {
        states[a.state] = document.queryCommandState(a.command);
      } catch {
        states[a.state] = false;
      }
    }
    this.activeStates = states;
  }

  // --- links ----------------------------------------------------------------

  private toggleLinkBar = () => {
    if (this.disabled || this.readOnly) return;
    this.linkBarOpen = !this.linkBarOpen;
    this.linkUrl = '';
  };

  private applyLink = (e?: Event) => {
    e?.preventDefault();
    const url = this.linkUrl.trim();
    if (url) this.exec('createLink', url);
    this.linkBarOpen = false;
    this.linkUrl = '';
  };

  // Toolbar presses keep the editor selection alive.
  private keepSelection = (e: MouseEvent) => e.preventDefault();

  private toolbarButton(a: ToolbarAction) {
    const pressed = !!(a.state && this.activeStates[a.state]);
    return (
      <button
        type="button"
        class={pressed ? 'tb-btn pressed' : 'tb-btn'}
        aria-label={gettext(a.label)}
        aria-pressed={a.state ? String(pressed) : undefined}
        title={gettext(a.label)}
        disabled={this.disabled || this.readOnly}
        onMouseDown={this.keepSelection}
        onClick={() => this.exec(a.command)}
      >
        <span class="tb-icon" aria-hidden="true">{a.icon}</span>
      </button>
    );
  }

  render() {
    const subText = this.error ? this.errorText : this.helpText;
    const boxCls = [
      'box',
      this.focused ? 'focused' : '',
      this.error ? 'error' : '',
      this.disabled ? 'disabled' : '',
    ].filter(Boolean).join(' ');

    return (
      <Host>
        <div class={boxCls}>
          {this.label && (
            <span class="label" id="label">
              {this.label}{this.required ? ' *' : ''}
            </span>
          )}

          <div class="toolbar" role="toolbar" aria-label={gettext('Formatting')}>
            {MARKS.map((a) => this.toolbarButton(a))}
            <span class="tb-divider" aria-hidden="true"></span>
            {LISTS.map((a) => this.toolbarButton(a))}
            <span class="tb-divider" aria-hidden="true"></span>
            <button
              type="button"
              class={this.linkBarOpen ? 'tb-btn pressed' : 'tb-btn'}
              aria-label={gettext('Insert link')}
              title={gettext('Insert link')}
              aria-expanded={this.linkBarOpen ? 'true' : 'false'}
              disabled={this.disabled || this.readOnly}
              onMouseDown={this.keepSelection}
              onClick={this.toggleLinkBar}
            >
              <span class="tb-icon" aria-hidden="true">link</span>
            </button>
            <button
              type="button"
              class="tb-btn"
              aria-label={gettext('Remove link')}
              title={gettext('Remove link')}
              disabled={this.disabled || this.readOnly}
              onMouseDown={this.keepSelection}
              onClick={() => this.exec('unlink')}
            >
              <span class="tb-icon" aria-hidden="true">link_off</span>
            </button>
            <span class="tb-divider" aria-hidden="true"></span>
            <button
              type="button"
              class="tb-btn"
              aria-label={gettext('Clear formatting')}
              title={gettext('Clear formatting')}
              disabled={this.disabled || this.readOnly}
              onMouseDown={this.keepSelection}
              onClick={() => this.exec('removeFormat')}
            >
              <span class="tb-icon" aria-hidden="true">format_clear</span>
            </button>
            <span class="tb-spacer"></span>
            <button
              type="button"
              class="tb-btn"
              aria-label={gettext('Undo')}
              title={gettext('Undo')}
              disabled={this.disabled || this.readOnly}
              onMouseDown={this.keepSelection}
              onClick={() => this.exec('undo')}
            >
              <span class="tb-icon" aria-hidden="true">undo</span>
            </button>
            <button
              type="button"
              class="tb-btn"
              aria-label={gettext('Redo')}
              title={gettext('Redo')}
              disabled={this.disabled || this.readOnly}
              onMouseDown={this.keepSelection}
              onClick={() => this.exec('redo')}
            >
              <span class="tb-icon" aria-hidden="true">redo</span>
            </button>
          </div>

          {this.linkBarOpen && (
            <form class="link-bar" onSubmit={this.applyLink}>
              <input
                class="link-input"
                type="url"
                placeholder="https://…"
                aria-label={gettext('Link URL')}
                value={this.linkUrl}
                onInput={(e: InputEvent) => (this.linkUrl = (e.target as HTMLInputElement).value)}
              />
              <button type="submit" class="tb-btn" aria-label={gettext('Apply link')}>
                <span class="tb-icon" aria-hidden="true">check</span>
              </button>
            </form>
          )}

          <div class="editor-wrap">
            <div
              class="editor"
              ref={(el) => (this.editor = el)}
              contentEditable={!this.disabled && !this.readOnly}
              role="textbox"
              aria-multiline="true"
              aria-labelledby={this.label ? 'label' : undefined}
              aria-required={this.required ? 'true' : undefined}
              aria-invalid={this.error ? 'true' : undefined}
              onInput={this.handleInput}
              onFocus={this.handleFocus}
              onBlur={this.handleBlur}
            ></div>
            {this.empty && this.placeholder && !this.focused && (
              <span class="placeholder" aria-hidden="true">{this.placeholder}</span>
            )}
          </div>
        </div>

        {subText && (
          <div class="supporting-row">
            <span class={this.error ? 'error' : 'idle'} role={this.error ? 'alert' : undefined}>
              {subText}
            </span>
          </div>
        )}
      </Host>
    );
  }
}
