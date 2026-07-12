import {
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Method,
  Prop,
  State,
  Watch,
  AttachInternals,
  h,
} from '@stencil/core';
import { gettext } from '../../utils/i18n';

// A compact, dependency-free JSON editor rendered as a Material-styled tree.
//
// Deliberately NOT a code editor: no syntax-highlighting engine, no tokenizer.
// Objects/arrays render as collapsible rows (same chevron/indent language as
// material-tree); every leaf is edited with a plain borderless <input>/<select>
// (the .cell-edit pattern from material-data-table), never a nested <material-*>
// widget — so both the bundle and the per-node hydration cost stay flat.
//
// Form-associated: `name` posts the serialized JSON string as ONE field; the
// output is always valid JSON because edits mutate a live model, not text.
//
// Container nodes (objects/arrays) keep stable identity via a WeakMap, so
// collapse state and focus survive re-renders and structural edits.

type Json = null | boolean | number | string | JsonObject | JsonArray;
interface JsonObject { [k: string]: Json }
type JsonArray = Json[];
type JsonType = 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array';

const TYPES: JsonType[] = ['string', 'number', 'boolean', 'null', 'object', 'array'];

function typeOf(v: Json): JsonType {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  const t = typeof v;
  if (t === 'object') return 'object';
  return t as JsonType;
}

// Coerce a value to a new type, preserving what makes sense.
function convert(v: Json, to: JsonType): Json {
  switch (to) {
    case 'string': return v == null ? '' : typeof v === 'object' ? '' : String(v);
    case 'number': { const n = Number(v as any); return Number.isFinite(n) ? n : 0; }
    case 'boolean': return Boolean(v);
    case 'null': return null;
    case 'array': return Array.isArray(v) ? v : [];
    default: return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  }
}

@Component({
  tag: 'material-json-field',
  styleUrl: 'material-json-field.css',
  shadow: true,
  formAssociated: true,
})
export class MaterialJsonField {
  @Element() el!: HTMLElement;
  @AttachInternals() internals!: ElementInternals;

  /** Serialized JSON. Source of truth in/out; posts with the form under `name`. */
  @Prop({ mutable: true }) value = '{}';
  @Prop() name?: string;
  @Prop() label?: string;
  @Prop({ reflect: true }) disabled = false;
  @Prop({ reflect: true }) readonly = false;
  @Prop({ reflect: true }) required = false;
  @Prop({ reflect: true }) error = false;
  @Prop() errorText?: string;
  @Prop() helpText?: string;
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  @State() rev = 0;

  @Event() valueChange!: EventEmitter<{ value: string }>;

  private model: Json = {};
  private parseError = false;
  private writing = false;

  // Stable ids for container nodes → durable collapse state.
  private ids = new WeakMap<object, number>();
  private idSeq = 0;
  private collapsed = new Set<number>();
  private focusAfter: string | null = null;

  private idOf(obj: object): number {
    let id = this.ids.get(obj);
    if (id === undefined) { id = ++this.idSeq; this.ids.set(obj, id); }
    return id;
  }

  componentWillLoad() {
    this.parse(this.value);
    this.syncForm();
  }

  @Watch('value')
  onValueAttr(next: string) {
    if (this.writing) return; // our own write — model already current
    this.parse(next);
    this.syncForm();
    this.rev++;
  }

  @Watch('required')
  @Watch('error')
  @Watch('errorText')
  syncValidity() {
    if (this.error) {
      this.internals.setValidity({ customError: true }, this.errorText || gettext('Invalid'));
    } else if (this.parseError) {
      this.internals.setValidity({ badInput: true }, gettext('Invalid JSON'));
    } else if (this.required && this.isEmpty()) {
      this.internals.setValidity({ valueMissing: true }, gettext('Please fill out this field.'));
    } else {
      this.internals.setValidity({});
    }
  }

  private isEmpty(): boolean {
    const m = this.model;
    if (m == null) return true;
    if (typeof m === 'string') return m === '';
    if (Array.isArray(m)) return m.length === 0;
    if (typeof m === 'object') return Object.keys(m).length === 0;
    return false;
  }

  private parse(text: string) {
    try {
      this.model = text?.trim() ? JSON.parse(text) : {};
      this.parseError = false;
    } catch {
      this.parseError = true;
      if (this.model == null) this.model = {};
    }
  }

  private syncForm() {
    this.internals.setFormValue(this.parseError ? this.value : JSON.stringify(this.model));
    this.syncValidity();
  }

  // Commit a model mutation: re-serialize, update prop, post, emit, re-render.
  private commit() {
    const next = JSON.stringify(this.model);
    this.writing = true;
    this.value = next;
    this.writing = false;
    this.internals.setFormValue(next);
    this.syncValidity();
    this.valueChange.emit({ value: next });
    this.rev++;
  }

  formResetCallback() {
    this.parse(this.el.getAttribute('value') || '{}');
    this.collapsed.clear();
    this.syncForm();
    this.rev++;
  }

  formDisabledCallback(disabled: boolean) { this.disabled = disabled; }

  /** Current value as a parsed object (convenience over parsing `value`). */
  @Method()
  async getJson(): Promise<Json> { return this.model; }

  private editable() { return !this.disabled && !this.readonly; }

  // ---- structural operations -------------------------------------------------

  private setChild(container: Json, key: string | number, v: Json) {
    (container as any)[key] = v;
  }

  private addChild = (container: JsonObject | JsonArray) => {
    if (Array.isArray(container)) {
      container.push('');
      this.focusAfter = `${this.idOf(container)}:${container.length - 1}`;
    } else {
      let base = 'key', k = base, i = 1;
      while (k in container) k = base + ++i;
      container[k] = '';
      this.focusAfter = `${this.idOf(container)}:key:${k}`;
    }
    if (container && typeof container === 'object') this.collapsed.delete(this.idOf(container));
    this.commit();
  };

  private removeChild = (container: JsonObject | JsonArray, key: string | number) => {
    if (Array.isArray(container)) container.splice(key as number, 1);
    else delete container[key as string];
    this.commit();
  };

  private move = (container: JsonObject | JsonArray, key: string | number, dir: -1 | 1) => {
    if (Array.isArray(container)) {
      const i = key as number, j = i + dir;
      if (j < 0 || j >= container.length) return;
      [container[i], container[j]] = [container[j], container[i]];
    } else {
      const keys = Object.keys(container);
      const i = keys.indexOf(key as string), j = i + dir;
      if (j < 0 || j >= keys.length) return;
      [keys[i], keys[j]] = [keys[j], keys[i]];
      const rebuilt: JsonObject = {};
      for (const k of keys) rebuilt[k] = container[k];
      // mutate in place so the WeakMap id (collapse state) is preserved
      for (const k of Object.keys(container)) delete container[k];
      for (const k of keys) container[k] = rebuilt[k];
    }
    this.commit();
  };

  private renameKey = (obj: JsonObject, oldKey: string, newKey: string) => {
    if (newKey === oldKey || newKey === '' || newKey in obj) { this.rev++; return; }
    const keys = Object.keys(obj);
    const rebuilt: JsonObject = {};
    for (const k of keys) rebuilt[k === oldKey ? newKey : k] = obj[k];
    for (const k of keys) delete obj[k];
    for (const k of Object.keys(rebuilt)) obj[k] = rebuilt[k];
    this.commit();
  };

  private changeType = (container: Json, key: string | number, to: JsonType) => {
    const cur = (container as any)[key] as Json;
    this.setChild(container, key, convert(cur, to));
    this.commit();
  };

  private changeRootType = (to: JsonType) => {
    this.model = convert(this.model, to);
    this.commit();
  };

  private setLeaf = (container: Json | null, key: string | number, raw: string, t: JsonType) => {
    let v: Json = raw;
    if (t === 'number') {
      const n = Number(raw);
      if (raw.trim() === '' || !Number.isFinite(n)) { this.rev++; return; } // revert display
      v = n;
    }
    if (container == null) this.model = v; else this.setChild(container, key, v);
    this.commit();
  };

  componentDidRender() {
    if (this.focusAfter) {
      const target = this.el.shadowRoot?.querySelector(`[data-focus="${this.focusAfter}"]`) as HTMLElement | null;
      target?.focus();
      if (target instanceof HTMLInputElement) target.select();
      this.focusAfter = null;
    }
  }

  // ---- rendering -------------------------------------------------------------

  private toggle(id: number) {
    if (this.collapsed.has(id)) this.collapsed.delete(id); else this.collapsed.add(id);
    this.rev++;
  }

  // Renders the row for `val` plus its descendants (unless collapsed).
  private rows(
    val: Json,
    depth: number,
    container: Json | null,
    key: string | number | null,
    keys?: string[],
    index?: number,
  ): any[] {
    const t = typeOf(val);
    const isContainer = t === 'object' || t === 'array';
    const isRoot = container === null;
    const inObject = container != null && !Array.isArray(container);
    const id = isContainer ? this.idOf(val as object) : 0;
    const open = isContainer && !this.collapsed.has(id);
    const rowKey = `${isContainer ? id : `${container ? this.idOf(container as object) : 'r'}:${key}`}`;
    const focusId = inObject ? `${this.idOf(container as object)}:key:${key}` : `${container ? this.idOf(container as object) : 'r'}:${key}`;
    const ed = this.editable();

    const canUp = keys ? (index as number) > 0 : false;
    const canDown = keys ? (index as number) < keys.length - 1 : false;

    const row = (
      <div class={{ row: true, container: isContainer }} key={rowKey}
           style={{ '--depth': String(depth) }}>
        {isContainer ? (
          <button type="button" class="chevron" aria-expanded={String(open)}
                  aria-label={open ? gettext('Collapse') : gettext('Expand')}
                  onClick={() => this.toggle(id)}>
            <span class={{ 'chevron-icon': true, open }} aria-hidden="true">chevron_right</span>
          </button>
        ) : (
          <span class="chevron-spacer" aria-hidden="true"></span>
        )}

        {/* key / index */}
        {isRoot ? (
          <span class="rootkey">{gettext('root')}</span>
        ) : inObject ? (
          ed ? (
            <input class="k" value={key as string} data-focus={focusId}
                   aria-label={gettext('Key')}
                   onChange={(e) => this.renameKey(container as JsonObject, key as string,
                     (e.target as HTMLInputElement).value)} />
          ) : (
            <span class="k static">{key}</span>
          )
        ) : (
          <span class="idx">{key}</span>
        )}
        <span class="colon" aria-hidden="true">:</span>

        {/* type selector */}
        {ed ? (
          <select class="type" aria-label={gettext('Type')}
                  onChange={(e) => {
                    const to = (e.target as HTMLSelectElement).value as JsonType;
                    if (isRoot) this.changeRootType(to);
                    else this.changeType(container as Json, key as string | number, to);
                  }}>
            {TYPES.map((tt) => <option value={tt} selected={tt === t}>{tt}</option>)}
          </select>
        ) : (
          <span class="type static">{t}</span>
        )}

        {/* value editor for primitives */}
        {t === 'string' && (ed
          ? <input class="v cell-edit" value={val as string} aria-label={gettext('Value')}
              onChange={(e) => this.setLeaf(container, key as any, (e.target as HTMLInputElement).value, 'string')} />
          : <span class="v static str">"{val as string}"</span>)}
        {t === 'number' && (ed
          ? <input class="v cell-edit num" inputMode="decimal" value={String(val)} aria-label={gettext('Value')}
              onChange={(e) => this.setLeaf(container, key as any, (e.target as HTMLInputElement).value, 'number')} />
          : <span class="v static num">{String(val)}</span>)}
        {t === 'boolean' && (ed
          ? <select class="v bool" aria-label={gettext('Value')}
              onChange={(e) => this.setLeaf(container, key as any, (e.target as HTMLSelectElement).value, 'boolean')}>
              <option value="true" selected={val === true}>true</option>
              <option value="false" selected={val === false}>false</option>
            </select>
          : <span class="v static bool">{String(val)}</span>)}
        {t === 'null' && <span class="v static null">null</span>}
        {isContainer && (
          <span class="summary" aria-hidden="true">
            {t === 'array' ? `[${(val as JsonArray).length}]` : `{${Object.keys(val as JsonObject).length}}`}
          </span>
        )}

        {/* actions */}
        {ed && (
          <span class="actions">
            {isContainer && (
              <button type="button" class="act" aria-label={gettext('Add item')}
                      onClick={() => this.addChild(val as JsonObject | JsonArray)}>add</button>
            )}
            {!isRoot && (
              <button type="button" class="act" aria-label={gettext('Move up')} disabled={!canUp}
                      onClick={() => this.move(container as any, key as any, -1)}>arrow_upward</button>
            )}
            {!isRoot && (
              <button type="button" class="act" aria-label={gettext('Move down')} disabled={!canDown}
                      onClick={() => this.move(container as any, key as any, 1)}>arrow_downward</button>
            )}
            {!isRoot && (
              <button type="button" class="act del" aria-label={gettext('Remove')}
                      onClick={() => this.removeChild(container as any, key as any)}>close</button>
            )}
          </span>
        )}
      </div>
    );

    const out = [row];
    if (isContainer && open) {
      if (t === 'array') {
        const arr = val as JsonArray;
        arr.forEach((child, i) =>
          out.push(...this.rows(child, depth + 1, arr, i, arr.map((_, k) => String(k)), i)));
      } else {
        const obj = val as JsonObject;
        const ks = Object.keys(obj);
        ks.forEach((k, i) => out.push(...this.rows(obj[k], depth + 1, obj, k, ks, i)));
      }
    }
    return out;
  }

  render() {
    const subText = this.error ? this.errorText : (this.parseError ? gettext('Invalid JSON') : this.helpText);
    return (
      <Host>
        {this.label && <span class="field-label" id="label">{this.label}</span>}
        <div class={{ tree: true, error: this.error || this.parseError, disabled: this.disabled }}
             role="group"
             aria-labelledby={this.label ? 'label' : null}
             aria-label={!this.label ? (this.ariaLabel || gettext('JSON editor')) : null}>
          {this.parseError
            ? <div class="parse-error">{gettext('Invalid JSON')}</div>
            : this.rows(this.model, 0, null, null)}
        </div>
        {subText && (
          <span class={{ 'supporting': true, 'is-error': !!(this.error || this.parseError) }} id="description">
            {subText}
          </span>
        )}
      </Host>
    );
  }
}
