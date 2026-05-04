import {
  Component,
  Element,
  Event,
  EventEmitter,
  Listen,
  Prop,
  h,
} from '@stencil/core';

export type MaterialButtonGroupVariant = 'standard' | 'connected';
export type MaterialButtonGroupSize = 'xs' | 's' | 'm' | 'l' | 'xl';
export type MaterialButtonGroupShape = 'round' | 'square';
export type MaterialButtonGroupSelection = 'none' | 'single' | 'multi';

@Component({
  tag: 'material-button-group',
  styleUrl: 'material-button-group.css',
  shadow: true,
})
export class MaterialButtonGroup {
  @Element() el!: HTMLElement;

  @Prop({ reflect: true }) variant: MaterialButtonGroupVariant = 'standard';
  @Prop({ reflect: true }) size: MaterialButtonGroupSize = 's';
  @Prop({ reflect: true }) shape: MaterialButtonGroupShape = 'round';
  @Prop({ reflect: true }) selectionMode: MaterialButtonGroupSelection = 'none';
  @Prop({ reflect: true }) required = false;
  @Prop({ attribute: 'aria-label' }) ariaLabel?: string;

  @Event() materialSelectionChange!: EventEmitter<{ values: string[] }>;

  private getToggles(): HTMLElement[] {
    return Array.from(
      this.el.querySelectorAll<HTMLElement>(':scope > material-icon-button[toggle]'),
    );
  }

  @Listen('selectedChange')
  onChildSelectedChange(ev: CustomEvent<{ selected: boolean }>) {
    if (this.selectionMode === 'none') return;
    const target = ev.target as HTMLElement & { selected: boolean; value: string };
    if (!target.matches('material-icon-button[toggle]')) return;

    if (this.selectionMode === 'single') {
      if (ev.detail.selected) {
        for (const t of this.getToggles()) {
          const item = t as HTMLElement & { selected: boolean };
          if (item !== target && item.selected) item.selected = false;
        }
      } else if (this.required) {
        // Block deselection of the last selected item.
        const stillSelected = this.getToggles().some(
          (t) => (t as HTMLElement & { selected: boolean }).selected,
        );
        if (!stillSelected) target.selected = true;
      }
    }

    this.materialSelectionChange.emit({
      values: this.getToggles()
        .filter((t) => (t as HTMLElement & { selected: boolean }).selected)
        .map((t) => (t as HTMLElement & { value: string }).value),
    });
  }

  render() {
    const role =
      this.selectionMode === 'single' ? 'radiogroup' :
      this.selectionMode === 'multi'  ? 'group' :
      'group';
    return (
      <div class="root" role={role} aria-label={this.ariaLabel}>
        <slot />
      </div>
    );
  }
}
