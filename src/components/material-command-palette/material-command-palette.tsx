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
  h,
} from '@stencil/core';
import { gettext } from '../../utils/i18n';

// Command palette (⌘K / Ctrl+K) — modal quick-action search over the app's
// commands and navigation targets. Native <dialog> for top-layer + focus
// trap; the list renders inside this shadow root (same rationale as
// material-autocomplete: focus stays in the input, aria-activedescendant
// can't cross shadow boundaries).
//
// Commands come from slotted material-options (server-rendered)
//
//   <material-command-palette>
//     <material-option value="po-new" label="New purchase order"
//                      leading-icon="add" data-section="Actions"
//                      data-keywords="create po"></material-option>
//     <material-option value="nav-vendors" label="Vendors"
//                      leading-icon="storefront" data-section="Go to"
//                      data-href="/vendors/"></material-option>
//   </material-command-palette>
//
// or from the `commands` property (JS array). Executing an item with `href`
// clicks a REAL light-DOM anchor (created on document.body), so Unpoly's
// document-level link handling sees the navigation; otherwise the
// `materialCommand` event fires (cancelable — preventDefault to own the
// side effect).

export interface CommandItem {
  id: string;
  label: string;
  section?: string;
  icon?: string;
  /** Extra match terms, space-separated. */
  keywords?: string;
  /** Right-aligned hint, e.g. a shortcut ("G V") or a category. */
  hint?: string;
  href?: string;
}

interface MaterialOptionLike extends HTMLElement {
  value: string;
  label?: string;
  leadingIcon?: string;
  supportingText?: string;
  disabled: boolean;
}

@Component({
  tag: 'material-command-palette',
  styleUrl: 'material-command-palette.css',
  shadow: true,
})
export class MaterialCommandPalette {
  @Element() el!: HTMLElement;

  /** Commands from JS; slotted material-options are merged in after these. */
  @Prop() commands?: CommandItem[];

  /** Global shortcut: 'mod+k' (⌘K on macOS, Ctrl+K elsewhere) or '' to
   *  disable and open only via `show()`. */
  @Prop() hotkey = 'mod+k';

  /** `up-target` copied to the navigation anchor for href commands. */
  @Prop({ attribute: 'up-target' }) upTarget?: string;

  @Prop() placeholder?: string;
  @Prop() emptyLabel = '';

  @State() open = false;
  @State() query = '';
  @State() highlightedIndex = 0;
  @State() slotRevision = 0;

  /** Cancelable: preventDefault() to suppress href navigation. */
  @Event({ cancelable: true }) materialCommand!: EventEmitter<{ id: string; item: CommandItem }>;
  @Event() openChange!: EventEmitter<{ open: boolean }>;

  private dialogEl?: HTMLDialogElement;
  private inputEl?: HTMLInputElement;

  connectedCallback() {
    document.addEventListener('keydown', this.handleGlobalKey);
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this.handleGlobalKey);
  }

  @Method()
  async show(): Promise<void> {
    this.setOpen(true);
  }

  @Method()
  async hide(): Promise<void> {
    this.setOpen(false);
  }

  private setOpen(open: boolean) {
    if (this.open === open) return;
    this.open = open;
    if (open) {
      this.query = '';
      this.highlightedIndex = 0;
    }
    this.openChange.emit({ open });
  }

  componentDidRender() {
    const dlg = this.dialogEl;
    if (!dlg) return;
    if (this.open && !dlg.open) {
      dlg.showModal();
      this.inputEl?.focus();
    } else if (!this.open && dlg.open) {
      dlg.close();
    }
  }

  private handleGlobalKey = (e: KeyboardEvent) => {
    if (this.hotkey !== 'mod+k') return;
    if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      this.setOpen(!this.open);
    }
  };

  // Native dialog close (Esc, form method=dialog) → mirror into state.
  private handleDialogClose = () => {
    if (this.open) this.setOpen(false);
  };

  // Click on the ::backdrop area = click landing on the <dialog> itself.
  private handleDialogClick = (e: MouseEvent) => {
    if (e.target === this.dialogEl) this.setOpen(false);
  };

  @Listen('keydown')
  handleKeyDown(e: KeyboardEvent) {
    if (!this.open) return;
    const items = this.filtered();
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        e.preventDefault();
        if (!items.length) return;
        const delta = e.key === 'ArrowDown' ? 1 : -1;
        this.highlightedIndex = (this.highlightedIndex + delta + items.length) % items.length;
        this.scrollHighlightedIntoView();
        return;
      }
      case 'Enter': {
        e.preventDefault();
        const item = items[this.highlightedIndex];
        if (item) this.execute(item);
        return;
      }
    }
  }

  private scrollHighlightedIntoView() {
    requestAnimationFrame(() => {
      this.el.shadowRoot
        ?.querySelector(`#cmd-${this.highlightedIndex}`)
        ?.scrollIntoView({ block: 'nearest' });
    });
  }

  // --- items ------------------------------------------------------------

  private slottedItems(): CommandItem[] {
    const nodes = Array.from(
      this.el.querySelectorAll<HTMLElement>('material-option'),
    ) as MaterialOptionLike[];
    return nodes
      .filter((o) => !o.disabled)
      .map((o) => ({
        id: o.value,
        label: (o.label ?? o.textContent ?? '').trim(),
        icon: o.leadingIcon,
        hint: o.supportingText,
        section: o.dataset.section,
        keywords: o.dataset.keywords,
        href: o.dataset.href,
      }));
  }

  private allItems(): CommandItem[] {
    return [...(this.commands ?? []), ...this.slottedItems()];
  }

  /** Rank: exact substring (by position) beats word-start beats fuzzy
   *  subsequence; non-matches drop out. Empty query keeps source order. */
  private score(item: CommandItem, q: string): number {
    const hay = `${item.label} ${item.keywords ?? ''}`.toLowerCase();
    const idx = hay.indexOf(q);
    if (idx === 0) return 1000;
    if (idx > 0) return 800 - Math.min(idx, 100);
    if (hay.split(/\s+/).some((w) => w.startsWith(q))) return 700;
    // Subsequence match.
    let i = 0;
    for (const ch of hay) {
      if (ch === q[i]) i++;
      if (i === q.length) return 400;
    }
    return -1;
  }

  private filtered(): CommandItem[] {
    const q = this.query.trim().toLowerCase();
    const all = this.allItems();
    if (!q) return all;
    return all
      .map((item, order) => ({ item, order, score: this.score(item, q) }))
      .filter((x) => x.score >= 0)
      .sort((a, b) => b.score - a.score || a.order - b.order)
      .map((x) => x.item);
  }

  private execute(item: CommandItem) {
    const ev = this.materialCommand.emit({ id: item.id, item });
    this.setOpen(false);
    if (ev.defaultPrevented || !item.href) return;
    // Real light-DOM anchor so Unpoly's document-level delegation sees it.
    const a = document.createElement('a');
    a.href = item.href;
    if (this.upTarget) a.setAttribute('up-target', this.upTarget);
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  private handleInput = (e: InputEvent) => {
    this.query = (e.target as HTMLInputElement).value;
    this.highlightedIndex = 0;
  };

  render() {
    const items = this.filtered();
    let lastSection: string | undefined;

    return (
      <Host>
        <dialog
          class="palette"
          ref={(el) => (this.dialogEl = el as HTMLDialogElement)}
          onClose={this.handleDialogClose}
          onClick={this.handleDialogClick}
          aria-label={gettext('Command palette')}
        >
          <div class="panel">
            <div class="search-row">
              <span class="search-icon" aria-hidden="true">search</span>
              <input
                class="search"
                ref={(el) => (this.inputEl = el)}
                type="text"
                role="combobox"
                autocomplete="off"
                spellcheck={false}
                placeholder={this.placeholder ?? gettext('Type a command or search…')}
                value={this.query}
                aria-expanded="true"
                aria-haspopup="listbox"
                aria-controls="commands"
                aria-activedescendant={items.length ? `cmd-${this.highlightedIndex}` : undefined}
                onInput={this.handleInput}
              />
              <kbd class="esc-hint" aria-hidden="true">esc</kbd>
            </div>

            <div class="list" role="listbox" id="commands">
              {items.map((item, i) => {
                const header = item.section !== lastSection ? item.section : undefined;
                lastSection = item.section;
                return [
                  header && <div class="section" role="presentation">{header}</div>,
                  <div
                    class={i === this.highlightedIndex ? 'row highlighted' : 'row'}
                    role="option"
                    id={`cmd-${i}`}
                    aria-selected={i === this.highlightedIndex ? 'true' : 'false'}
                    onMouseDown={(e: MouseEvent) => e.preventDefault()}
                    onClick={() => this.execute(item)}
                    onMouseEnter={() => (this.highlightedIndex = i)}
                  >
                    <span class="row-icon" aria-hidden="true">{item.icon ?? 'keyboard_command_key'}</span>
                    <span class="row-label">{item.label}</span>
                    {item.hint && <span class="row-hint">{item.hint}</span>}
                    {item.href && !item.hint && (
                      <span class="row-icon go" aria-hidden="true">arrow_forward</span>
                    )}
                  </div>,
                ];
              })}
              {!items.length && (
                <div class="empty">{this.emptyLabel || gettext('No matching commands')}</div>
              )}
            </div>
          </div>
        </dialog>

        <div class="option-source" hidden>
          <slot onSlotchange={() => this.slotRevision++} />
        </div>
      </Host>
    );
  }
}
