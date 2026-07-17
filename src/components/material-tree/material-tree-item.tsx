import {
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Prop,
  h,
} from '@stencil/core';

// One node of material-tree. Renders its own row (chevron / checkbox / icon /
// label / trailing cells); children are light-DOM material-tree-items — either
// nested inside this element or flat siblings with explicit `level` (the
// django-mptt shape). The parent material-tree resolves depth, visibility,
// tri-state rollup and keyboard focus; this component only draws the row and
// reports interactions.
//
// Trailing data columns: elements with slot="trailing" render at the end of
// the row, after the indented label. Give cells a fixed width and they line
// up as columns across all rows regardless of depth:
//
//   <material-tree-item value="42" label="Bearing set" level="2">
//     <span slot="trailing" class="w-20 text-right">4 pcs</span>
//     <span slot="trailing" class="w-24 text-right">$168.00</span>
//   </material-tree-item>

@Component({
  tag: 'material-tree-item',
  styleUrl: 'material-tree-item.css',
  shadow: true,
})
export class MaterialTreeItem {
  @Element() el!: HTMLElement;

  @Prop({ mutable: true }) value = '';
  @Prop() label?: string;

  /** Explicit depth for flat (mptt-style) markup; nested markup derives it. */
  @Prop({ mutable: true }) level?: number;

  /** Chevron for lazy nodes whose children are not in the DOM yet
   *  (mptt: {% if not node.is_leaf_node %}has-children{% endif %}). */
  @Prop({ mutable: true, reflect: true, attribute: 'has-children' }) hasChildren = false;

  @Prop({ mutable: true, reflect: true }) expanded = false;
  @Prop({ mutable: true, reflect: true }) checked = false;
  @Prop({ mutable: true }) indeterminate = false;
  @Prop({ reflect: true }) disabled = false;
  @Prop({ mutable: true, reflect: true }) loading = false;

  /** Material Symbols ligature before the label. */
  @Prop() icon?: string;
  @Prop({ attribute: 'supporting-text' }) supportingText?: string;

  // Pushed down by material-tree — not for consumers.
  @Prop({ mutable: true }) selectable = false;
  @Prop({ mutable: true }) depth = 0;
  @Prop({ mutable: true }) dense = false;

  @Event() materialTreeToggle!: EventEmitter<{ value: string; expanded: boolean }>;
  @Event() materialTreeChecked!: EventEmitter<{ value: string; checked: boolean }>;
  @Event() materialTreeActivate!: EventEmitter<{ value: string }>;

  private hasLoadedChildren(): boolean {
    // Nested children in this element, or (flat mode) the tree resolved a
    // chevron via has-children — loaded flat children still get the chevron
    // through hasChildren staying true.
    return !!this.el.querySelector('material-tree-item');
  }

  private toggle = (e: Event) => {
    e.stopPropagation();
    if (this.disabled) return;
    this.expanded = !this.expanded;
    this.materialTreeToggle.emit({ value: this.value, expanded: this.expanded });
  };

  private onCheckboxChange = (e: Event) => {
    e.stopPropagation();
    const detail = (e as CustomEvent<{ checked: boolean }>).detail;
    this.checked = detail.checked;
    this.indeterminate = false;
    this.materialTreeChecked.emit({ value: this.value, checked: this.checked });
  };

  private onRowClick = (e: MouseEvent) => {
    if (this.disabled) return;
    const path = e.composedPath();
    if (path.some((n) => n instanceof HTMLElement
        && (n.classList?.contains('chevron') || n.tagName === 'MATERIAL-CHECKBOX'))) {
      return;
    }
    if (this.selectable) {
      this.checked = !this.checked;
      this.indeterminate = false;
      this.materialTreeChecked.emit({ value: this.value, checked: this.checked });
    } else {
      this.materialTreeActivate.emit({ value: this.value });
    }
  };

  private onKeyDown = (e: KeyboardEvent) => {
    // Enter activates, Space toggles selection; arrows are the tree's job.
    if (e.key === 'Enter') {
      e.preventDefault();
      this.materialTreeActivate.emit({ value: this.value });
    } else if (e.key === ' ' && this.selectable && !this.disabled) {
      e.preventDefault();
      this.checked = !this.checked;
      this.indeterminate = false;
      this.materialTreeChecked.emit({ value: this.value, checked: this.checked });
    }
  };

  render() {
    const expandable = this.hasChildren || this.hasLoadedChildren();

    return (
      <Host
        role="treeitem"
        aria-expanded={expandable ? String(this.expanded) : null}
        aria-checked={this.selectable
          ? (this.indeterminate ? 'mixed' : String(this.checked))
          : null}
        aria-disabled={this.disabled ? 'true' : null}
        style={{ '--tree-depth': String(this.depth) }}
        onKeyDown={this.onKeyDown}
      >
        <div
          class={{ row: true, disabled: this.disabled, dense: this.dense }}
          part="row"
          onClick={this.onRowClick}
        >
          {this.loading ? (
            <span class="spinner" aria-hidden="true">progress_activity</span>
          ) : expandable ? (
            <button
              type="button"
              class="chevron"
              tabIndex={-1}
              aria-hidden="true"
              onClick={this.toggle}
            >
              <span class={{ 'chevron-icon': true, open: this.expanded }}>chevron_right</span>
            </button>
          ) : (
            <span class="chevron-spacer" aria-hidden="true"></span>
          )}

          {this.selectable && (
            <material-checkbox
              class="check"
              checked={this.checked}
              indeterminate={this.indeterminate}
              disabled={this.disabled}
              aria-label={this.label ?? this.value}
              onCheckedChange={this.onCheckboxChange}
              onClick={(e: Event) => e.stopPropagation()}
              // material-checkbox now dispatches native input/change on user
              // toggle — its composed 'input' would escape this shadow root
              // retargeted to the tree-item, looking like a form-field edit
              // (mirrors material-textfield's password-toggle fix).
              onInput={(e: Event) => e.stopPropagation()}
              onChange={(e: Event) => e.stopPropagation()}
            />
          )}

          {this.icon && (
            <span class="icon" aria-hidden="true">{this.icon}</span>
          )}

          <span class="text">
            <span class="label">{this.label ?? <slot name="label" />}</span>
            {this.supportingText && <span class="supporting">{this.supportingText}</span>}
          </span>

          {/* Fixed-width cells line up as columns across rows — only the
              label area above indents with depth. */}
          <span class="trailing">
            <slot name="trailing" />
          </span>
        </div>

        {/* Nested children (light DOM) — visibility is driven per-item by the
            tree via the hidden attribute, so no wrapper styling is needed. */}
        <div role="group" class="children">
          <slot />
        </div>
      </Host>
    );
  }
}
