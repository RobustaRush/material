import {
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Prop,
  State,
  h,
} from '@stencil/core';
import { adoptMaterialStyles } from '../../utils/adopted-styles';

export type MaterialFileFieldVariant = 'filled' | 'outlined';

// MD3-styled wrapper for Django's ClearableFileInput contract:
//   1. anchor to currently-uploaded file (leading download link)
//   2. native file picker for replacement (trailing "change" button +
//      click-on-field surface)
//   3. deferred clear via a ${name}-clear checkbox (trailing toggle button —
//      pressing it grays the filename and arms the checkbox; submit flushes)
//
// The hidden <input type="file"> and <input type="checkbox"> live in light
// DOM as direct children so they round-trip with the surrounding <form> using
// their native names — same shape Django expects, no JS bridge needed.
@Component({
  tag: 'material-file-field',
  styleUrl: 'material-file-field.css',
  shadow: false,
})
export class MaterialFileField {
  @Element() el!: HTMLElement;

  @Prop() variant: MaterialFileFieldVariant = 'outlined';
  @Prop() name!: string;
  @Prop() currentUrl?: string;
  @Prop() currentName?: string;
  @Prop() accept?: string;
  @Prop() multiple = false;
  @Prop({ reflect: true }) disabled = false;
  @Prop({ reflect: true }) required = false;
  @Prop() label?: string;
  @Prop() helpText?: string;
  @Prop() errorText?: string;
  @Prop({ reflect: true }) error = false;

  // aria-labels — caller supplies localized strings. Empty default keeps the
  // component free of hardcoded English; icon-button falls back to its icon
  // name when the label is empty.
  @Prop() changeLabel = '';
  @Prop() clearLabel = '';
  @Prop() undoLabel = '';
  @Prop() downloadLabel = '';

  @State() private pickedName: string | null = null;
  @State() private pendingClear = false;

  @Event() fileChange!: EventEmitter<{ file: File | null; cleared: boolean }>;

  private fileInput?: HTMLInputElement;

  connectedCallback() {
    if (this.el.shadowRoot) adoptMaterialStyles(this.el.shadowRoot);
  }

  private openPicker = () => {
    if (this.disabled) return;
    this.fileInput?.click();
  };

  // The textfield is readonly, so any click landing on it that's not on a
  // trailing button or the leading link should open the picker. Trailing
  // buttons stop propagation in their own handlers; the leading <a> handles
  // its own navigation and is excluded by tag check.
  private handleSurfaceClick = (e: MouseEvent) => {
    const path = e.composedPath();
    for (const node of path) {
      if (!(node instanceof HTMLElement)) continue;
      if (node === this.el) break;
      if (node.tagName === 'A') return;
      if (node.tagName === 'MATERIAL-ICON-BUTTON') return;
    }
    this.openPicker();
  };

  private handleFileChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.pickedName = file?.name ?? null;
    if (file) this.pendingClear = false;
    this.fileChange.emit({ file, cleared: false });
  };

  private handleClearToggle = (e: CustomEvent<{ selected: boolean }>) => {
    e.stopPropagation();
    const next = e.detail.selected;
    this.pendingClear = next;
    if (next) {
      // Drop any locally picked file — clear takes precedence.
      this.pickedName = null;
      if (this.fileInput) this.fileInput.value = '';
    }
    this.fileChange.emit({ file: null, cleared: next });
  };

  private handleChangeClick = (e: MouseEvent) => {
    e.stopPropagation();
    this.openPicker();
  };

  render() {
    const displayName = this.pickedName ?? this.currentName ?? '';
    const hasFile = !!(this.pickedName || this.currentName);
    const showDownload =
      !!this.currentUrl && !this.pickedName && !this.pendingClear;

    return (
      <Host class="block w-full" onClick={this.handleSurfaceClick}>
        <material-textfield
          variant={this.variant}
          label={this.label}
          value={displayName}
          readOnly
          disabled={this.disabled}
          required={this.required && !this.currentName}
          helpText={this.helpText}
          errorText={this.errorText}
          error={this.error}
          dimmed={this.pendingClear}
          wideTrailing={hasFile}
        >
          {showDownload && (
            <a
              slot="leading"
              href={this.currentUrl}
              target="_blank"
              rel="noopener"
              aria-label={this.downloadLabel || undefined}
              onClick={(e: MouseEvent) => e.stopPropagation()}
              class="material-symbols text-2xl text-on-surface-variant no-underline"
            >
              download
            </a>
          )}
          <span slot="trailing" class="inline-flex items-center">
            {hasFile && (
              <material-icon-button
                size="s"
                variant="standard"
                toggle
                selected={this.pendingClear}
                icon="close"
                selected-icon="undo"
                disabled={this.disabled}
                aria-label={
                  (this.pendingClear ? this.undoLabel : this.clearLabel) ||
                  undefined
                }
                onSelectedChange={this.handleClearToggle as any}
              />
            )}
            <material-icon-button
              size="s"
              variant="standard"
              icon={hasFile ? 'edit' : 'attach_file'}
              disabled={this.disabled}
              aria-label={this.changeLabel || undefined}
              onClick={this.handleChangeClick}
            />
          </span>
        </material-textfield>

        <input
          ref={el => (this.fileInput = el)}
          type="file"
          name={this.name}
          accept={this.accept}
          multiple={this.multiple}
          disabled={this.disabled}
          hidden
          onChange={this.handleFileChange}
        />
        <input
          type="checkbox"
          name={`${this.name}-clear`}
          checked={this.pendingClear}
          disabled={this.disabled}
          hidden
        />
      </Host>
    );
  }
}
