import {
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Prop,
  State,
  AttachInternals,
  h,
} from '@stencil/core';
import { gettext } from '../../utils/i18n';

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
  // Form-associated so `required` can actually block submission via
  // ElementInternals validity. The native <input type="file"> still carries
  // the file payload; the host contributes no form value of its own (never
  // calls setFormValue) — it only owns the validity state.
  formAssociated: true,
})
export class MaterialFileField {
  @Element() el!: HTMLElement;
  @AttachInternals() internals!: ElementInternals;

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

  // Locally-picked files (empty until the user chooses via the picker).
  @State() private pickedFiles: File[] = [];
  @State() private pendingClear = false;

  // `file` is the first picked file (back-compat / single-file consumers);
  // `files` is the full list when `multiple` is set.
  @Event() fileChange!: EventEmitter<{ file: File | null; files: File[]; cleared: boolean }>;

  private fileInput?: HTMLInputElement;

  componentDidRender() {
    // Keep validity in sync with the current picked/cleared/required state on
    // every render (covers prop changes as well as user interaction).
    this.updateValidity();
  }

  formDisabledCallback(disabled: boolean) {
    this.disabled = disabled;
  }

  formResetCallback() {
    this.pickedFiles = [];
    this.pendingClear = false;
    if (this.fileInput) this.fileInput.value = '';
  }

  private hasSelection(): boolean {
    // A satisfied field either has freshly-picked files, or keeps the existing
    // server-side file (currentName) without a pending clear.
    return this.pickedFiles.length > 0
      || (!!this.currentName && !this.pendingClear);
  }

  private updateValidity() {
    if (!this.internals?.setValidity) return;
    if (!this.required || this.hasSelection() || this.disabled) {
      this.internals.setValidity({});
      return;
    }
    const anchor = this.el.querySelector('material-textfield') as HTMLElement | null;
    this.internals.setValidity(
      { valueMissing: true },
      this.errorText || gettext('Please select a file'),
      anchor ?? undefined,
    );
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
    const files = input.files ? Array.from(input.files) : [];
    this.pickedFiles = files;
    if (files.length) this.pendingClear = false;
    this.fileChange.emit({ file: files[0] ?? null, files, cleared: false });
  };

  private handleClearToggle = (e: CustomEvent<{ selected: boolean }>) => {
    e.stopPropagation();
    const next = e.detail.selected;
    this.pendingClear = next;
    if (next) {
      // Drop any locally picked files — clear takes precedence.
      this.pickedFiles = [];
      if (this.fileInput) this.fileInput.value = '';
    }
    this.fileChange.emit({ file: null, files: [], cleared: next });
  };

  private handleChangeClick = (e: MouseEvent) => {
    e.stopPropagation();
    this.openPicker();
  };

  render() {
    // Show every picked file name (joined) so `multiple` selections are all
    // visible, not just the first.
    const pickedDisplay = this.pickedFiles.map(f => f.name).join(', ');
    const displayName = pickedDisplay || this.currentName || '';
    const hasPicked = this.pickedFiles.length > 0;
    const hasFile = hasPicked || !!this.currentName;
    const showDownload =
      !!this.currentUrl && !hasPicked && !this.pendingClear;

    return (
      <Host onClick={this.handleSurfaceClick}>
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
              class="download"
            >
              download
            </a>
          )}
          <span slot="trailing" class="trailing">
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
