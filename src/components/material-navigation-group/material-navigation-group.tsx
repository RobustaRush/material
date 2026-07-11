import {
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Method,
  Prop,
  Watch,
  h,
} from '@stencil/core';
import { adoptMaterialStyles } from '../../utils/adopted-styles';

// Expandable group for the navigation rail — an accordion of nested
// <material-navigation-item>s, patterned after the m3.material.io sidebar
// (docs/wiki/specs/google-material/navigation-rail/idea-expandable-tree-nav.md).
// Not an MD3-spec component; MD3 stops at static section headers.
//
// A11y follows the APG "disclosure navigation" pattern — button[aria-expanded]
// controlling a contained list — rather than a full ARIA tree: tree/treeitem
// roles would have to span three shadow boundaries (rail → group → item) and
// the flat-tree role composition is unreliable across browsers.
//
// In a collapsed rail the group renders like a collapsed item; activating it
// expands the parent rail and opens the group (sub-items have nowhere to go
// in a 96dp rail). With `storage-key` the open state survives reloads.

export type MaterialNavigationGroupVariant = 'rail-collapsed' | 'rail-expanded';

@Component({
  tag: 'material-navigation-group',
  styleUrl: 'material-navigation-group.css',
  shadow: true,
})
export class MaterialNavigationGroup {
  @Element() el!: HTMLElement;

  @Prop() icon?: string;
  @Prop() label!: string;

  /** Open (children visible) vs closed. */
  @Prop({ reflect: true, mutable: true }) open = false;

  /** Persist the open state in localStorage under
   *  `material-nav-group:<storage-key>`. */
  @Prop({ attribute: 'storage-key' }) storageKey?: string;

  /** Set by the parent rail, like material-navigation-item's variant. */
  @Prop({ reflect: true }) variant: MaterialNavigationGroupVariant = 'rail-expanded';

  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  @Event() materialGroupToggle!: EventEmitter<{ open: boolean }>;

  private variantChanged = false;

  componentWillLoad() {
    if (this.storageKey && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(`material-nav-group:${this.storageKey}`);
      if (stored !== null) this.open = stored === '1';
    }
    return this.el.shadowRoot ? adoptMaterialStyles(this.el.shadowRoot) : undefined;
  }

  @Watch('open')
  onOpenChange() {
    if (this.storageKey && typeof localStorage !== 'undefined') {
      localStorage.setItem(
        `material-nav-group:${this.storageKey}`,
        this.open ? '1' : '0',
      );
    }
    this.materialGroupToggle.emit({ open: this.open });
  }

  @Watch('variant')
  onVariantChange(newValue: string, oldValue: string) {
    if (oldValue !== undefined && newValue !== oldValue) this.variantChanged = true;
  }

  /** Focus the header button — used by the rail's arrow-key navigation. */
  @Method()
  async setFocus(): Promise<void> {
    this.el.shadowRoot?.querySelector<HTMLElement>('button')?.focus();
  }

  private handleClick = () => {
    // A 96dp rail can't show sub-items: opening a group from the collapsed
    // state expands the parent rail alongside.
    if (this.variant === 'rail-collapsed') {
      this.el.closest('material-navigation-rail')?.expand();
      this.open = true;
      return;
    }
    this.open = !this.open;
  };

  private morphClass() {
    return this.variantChanged ? ' morph-in' : '';
  }

  private rootButtonClass() {
    return (
      'group/g block w-full bg-transparent border-0 p-0 m-0 text-start cursor-pointer ' +
      'focus:outline-none focus-visible:outline-2 focus-visible:outline-secondary focus-visible:outline-offset-[-2px]'
    );
  }

  private stateLayer() {
    return (
      <span
        class={
          'absolute inset-0 rounded-full pointer-events-none bg-current opacity-0 transition-opacity ' +
          'group-hover/g:opacity-[0.08] group-focus-visible/g:opacity-[0.10] group-active/g:opacity-[0.10]'
        }
        aria-hidden="true"
      />
    );
  }

  // Same anatomy as a collapsed navigation item; the chevron is omitted —
  // activation always expands, so aria-expanded stays false until then.
  private renderCollapsed() {
    return (
      <button
        type="button"
        key="collapsed"
        class={this.rootButtonClass()}
        aria-expanded="false"
        aria-label={this.ariaLabel ?? this.label}
        onClick={this.handleClick}
      >
        <span class={'flex flex-col items-center justify-center w-full py-2 gap-1' + this.morphClass()}>
          <span class="relative inline-flex items-center justify-center w-14 h-8 rounded-full text-on-surface-variant">
            {this.stateLayer()}
            {this.icon && (
              <span class="material-symbols leading-none text-[1.5rem] relative" aria-hidden="true">
                {this.icon}
              </span>
            )}
          </span>
          <span class="text-xs leading-tight text-center px-1 text-on-surface-variant">
            {this.label}
          </span>
        </span>
      </button>
    );
  }

  private renderExpanded() {
    return [
      <button
        type="button"
        key="expanded"
        class={this.rootButtonClass()}
        aria-expanded={this.open ? 'true' : 'false'}
        aria-controls="group-items"
        aria-label={this.ariaLabel ?? this.label}
        onClick={this.handleClick}
      >
        <span
          class={
            'relative flex items-center w-full h-14 ps-4 pe-3 rounded-full transition-colors text-on-surface-variant' +
            this.morphClass()
          }
        >
          {this.stateLayer()}
          {this.icon && (
            <span class="material-symbols leading-none text-[1.5rem] relative" aria-hidden="true">
              {this.icon}
            </span>
          )}
          <span class={'relative flex-1 min-w-0 text-sm truncate ' + (this.icon ? 'ms-3' : '')}>
            {this.label}
          </span>
          <span
            class={
              'material-symbols leading-none text-[1.5rem] relative transition-transform motion-reduce:transition-none ' +
              (this.open ? 'rotate-180' : '')
            }
            aria-hidden="true"
          >
            arrow_drop_down
          </span>
        </span>
      </button>,
      // Height animates via grid-template-rows 0fr→1fr; `inert` (not
      // visibility) keeps closed content unfocusable without hiding it
      // mid-animation.
      <div
        id="group-items"
        class="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none"
        style={{ gridTemplateRows: this.open ? '1fr' : '0fr' }}
        inert={!this.open}
        aria-hidden={this.open ? undefined : 'true'}
      >
        <div class="overflow-hidden min-h-0">
          <div class="flex flex-col gap-1 ps-6 pt-1">
            <slot />
          </div>
        </div>
      </div>,
    ];
  }

  render() {
    return (
      <Host>
        {this.variant === 'rail-expanded' ? this.renderExpanded() : this.renderCollapsed()}
      </Host>
    );
  }
}
