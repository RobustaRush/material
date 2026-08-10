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

/**
 * Shared MD3 menu/select typeahead, ported from material-web's
 * TypeaheadController (menu/internal/controllers/typeaheadController.ts)
 * without the Lit-specific plumbing.
 *
 * Behavior:
 *  - printable keydowns accumulate in a buffer that resets after `bufferMs`
 *    (200ms, matching the reference — most existing implementations used
 *    500ms) of silence between keystrokes;
 *  - matches are rebased around the currently active item so searching
 *    proceeds from the item _after_ it and wraps around the list;
 *  - typing the same leading letter again with a fresh buffer (e.g. "o", "o")
 *    cycles to the _next_ match instead of sticking on the first one;
 *  - Space never *starts* a buffer (so it still opens/activates normally),
 *    but once a buffer is live, Space is a valid character and is
 *    preventDefault'ed so it can't activate/select/scroll the page.
 *
 * Consumers own their own gating (e.g. only calling `onKeydown` while a menu
 * is open) and their own item shape — `getItems`/`getText`/`isActive` are
 * plain callbacks so this has no DOM assumptions beyond `KeyboardEvent`.
 */

export interface TypeaheadOptions<T> {
  /** Items to search, in display order. Callers should exclude disabled items. */
  getItems: () => T[];
  /** Text to match against, per item. Compared case-insensitively, trimmed. */
  getText: (item: T) => string;
  /** Identifies the currently active/focused item, used to rebase matching. */
  isActive: (item: T) => boolean;
  /** Called with the next matching item on every keystroke that matches. */
  onMatch: (item: T) => void;
  /** Buffer reset delay in ms. Defaults to 200 (reference value). */
  bufferMs?: number;
}

export interface TypeaheadHandle {
  /** Whether a typeahead buffer is currently live. */
  readonly isTypingAhead: boolean;
  /** Feed a keydown event to the typeahead. Safe to call unconditionally. */
  onKeydown(event: KeyboardEvent): void;
  /** Clears any pending buffer timer and resets the typing-ahead state.
   *  Call from disconnectedCallback. */
  destroy(): void;
}

interface Record_<T> {
  index: number;
  item: T;
  text: string;
}

function isPrintable(event: KeyboardEvent): boolean {
  return event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
}

export function createTypeahead<T>(options: TypeaheadOptions<T>): TypeaheadHandle {
  const bufferMs = options.bufferMs ?? 200;

  let buffer = '';
  let timer = 0;
  let typingAhead = false;
  let records: Record_<T>[] = [];
  let lastActiveRecord: Record_<T> | null = null;

  const endTypeahead = () => {
    window.clearTimeout(timer);
    timer = 0;
    typingAhead = false;
    buffer = '';
    records = [];
  };

  const beginTypeahead = (event: KeyboardEvent) => {
    // Space never starts a buffer — it should still open/select/scroll as
    // usual. Anything non-printable (Arrow keys, Enter, Escape, Tab, ...)
    // doesn't start one either.
    if (!isPrintable(event) || event.key === ' ') return;

    typingAhead = true;
    records = options.getItems().map((item, index) => ({
      index,
      item,
      text: options.getText(item).trim().toLowerCase(),
    }));
    lastActiveRecord = records.find(r => options.isActive(r.item)) ?? null;
    typeahead(event);
  };

  const typeahead = (event: KeyboardEvent) => {
    if (event.defaultPrevented) return;
    window.clearTimeout(timer);

    // Any non-printable key (Arrow/Enter/Escape/Tab/...) ends the buffer
    // instead of joining it, and is left alone so it keeps its own meaning.
    if (!isPrintable(event)) {
      endTypeahead();
      return;
    }

    // Mid-buffer Space is a valid character, but must not fall through to
    // whatever Space normally does (activate/select/scroll).
    if (event.key === ' ') {
      event.preventDefault();
    }

    timer = window.setTimeout(endTypeahead, bufferMs);
    buffer += event.key.toLowerCase();

    const lastActiveIndex = lastActiveRecord ? lastActiveRecord.index : -1;
    const numRecords = records.length;
    if (!numRecords) {
      endTypeahead();
      return;
    }

    // Rebase so the search proceeds from the item after the active one,
    // wrapping around the end of the list.
    const rebase = (r: Record_<T>) => (r.index + numRecords - lastActiveIndex) % numRecords;

    const matching = records
      .filter(r => r.text.startsWith(buffer))
      .sort((a, b) => rebase(a) - rebase(b));

    if (!matching.length) {
      endTypeahead();
      return;
    }

    // A fresh buffer (first keystroke) that still matches the active item
    // means the user is "tabbing" through entries sharing a letter —
    // advance to the next match rather than sticking on the active one.
    const isNewQuery = buffer.length === 1;
    let next = matching[0];
    if (lastActiveRecord === matching[0] && isNewQuery) {
      next = matching[1] ?? matching[0];
    }

    lastActiveRecord = next;
    options.onMatch(next.item);
  };

  return {
    get isTypingAhead() {
      return typingAhead;
    },
    onKeydown(event: KeyboardEvent) {
      if (typingAhead) typeahead(event);
      else beginTypeahead(event);
    },
    destroy() {
      // Full reset, not just the timer: with the timer cleared and
      // `typingAhead` left true, a consumer that gates keys on
      // `isTypingAhead` (e.g. material-select's closed trigger) would stay
      // stuck in typing-ahead mode after a disconnect/reconnect.
      endTypeahead();
    },
  };
}
