import {
  Component,
  Element,
  Event,
  EventEmitter,
  Host,
  Method,
  Prop,
  State,
  AttachInternals,
  h,
} from '@stencil/core';
import { gettext } from '../../utils/i18n';

// Drag-and-drop upload area — the multi-file sibling of material-file-field
// (which stays the compact Django ClearableFileInput wrapper).
//
//   <material-dropzone name="attachments" accept="image/*,.pdf"
//                      max-size="10485760" max-files="8"></material-dropzone>
//
// A real <input type="file" multiple> lives in light DOM under the field's
// `name`, and dropped files are written into it through DataTransfer — so a
// plain Django multipart form receives request.FILES.getlist(name) with ZERO
// JavaScript on the consumer side. Files accumulate across picks/drops;
// removing a row rebuilds the input's FileList.
//
// Upload stays the consumer's job. For JS-driven uploads (fetch/XHR with
// progress), listen to `fileChange`, upload, and drive the per-file UI:
//
//   zone.addEventListener('fileChange', async (e) => {
//     for (const f of e.detail.added) {
//       upload(f, (pct) => zone.setProgress(f, pct))
//         .then(() => zone.setProgress(f, 'done'))
//         .catch((err) => zone.setProgress(f, 'error', err.message));
//     }
//   });
//
// Validation: `accept` / `max-size` / `max-files` reject files with a
// `materialFileReject` event (reason: type|size|count). The cancelable
// `materialFileAdd` fires per accepted file BEFORE it is added —
// preventDefault() rejects it with reason "custom" (your own rules:
// duplicate names, image dimensions, …).

interface DropItem {
  id: number;
  file: File;
  previewUrl?: string;
  /** undefined = idle, 0..100 = uploading, 'done' | 'error' = terminal. */
  progress?: number | 'done' | 'error';
  message?: string;
}

export type DropRejectReason = 'type' | 'size' | 'count' | 'custom';

@Component({
  tag: 'material-dropzone',
  styleUrl: 'material-dropzone.css',
  shadow: false,
  formAssociated: true,
})
export class MaterialDropzone {
  @Element() el!: HTMLElement;
  @AttachInternals() internals!: ElementInternals;

  @Prop() name!: string;
  /** Same syntax as the native attribute: "image/*,.pdf,application/zip". */
  @Prop() accept?: string;
  @Prop() multiple = true;
  /** Per-file size cap, bytes. */
  @Prop({ attribute: 'max-size' }) maxSize?: number;
  /** Total file count cap. */
  @Prop({ attribute: 'max-files' }) maxFiles?: number;
  @Prop({ mutable: true, reflect: true }) disabled = false;
  @Prop({ reflect: true }) required = false;
  @Prop() helpText?: string;
  @Prop() errorText?: string;
  @Prop({ mutable: true, reflect: true }) error = false;

  /** Localized copy (defaults resolve through gettext / Django jsi18n). */
  @Prop() dropLabel = '';
  @Prop() browseLabel = '';
  @Prop() removeLabel = '';

  @State() items: DropItem[] = [];
  @State() dragOver = false;

  @Event() fileChange!: EventEmitter<{ files: File[]; added: File[]; removed: File[] }>;
  @Event({ cancelable: true }) materialFileAdd!: EventEmitter<{ file: File }>;
  @Event() materialFileReject!: EventEmitter<{ file: File; reason: DropRejectReason }>;

  private fileInput?: HTMLInputElement;
  private nextId = 1;
  private dragDepth = 0;

  // --- lifecycle -------------------------------------------------------------

  disconnectedCallback() {
    for (const it of this.items) if (it.previewUrl) URL.revokeObjectURL(it.previewUrl);
  }

  componentDidRender() {
    this.updateValidity();
  }

  formDisabledCallback(d: boolean) {
    this.disabled = d;
  }

  formResetCallback() {
    this.replaceItems([]);
  }

  private updateValidity() {
    if (!this.internals?.setValidity) return;
    if (!this.required || this.items.length > 0 || this.disabled) {
      this.internals.setValidity({});
      return;
    }
    this.internals.setValidity(
      { valueMissing: true },
      this.errorText || gettext('Please add a file'),
      this.el.querySelector('.dz-area') as HTMLElement ?? undefined,
    );
  }

  // --- public API -------------------------------------------------------------

  @Method()
  async getFiles(): Promise<File[]> {
    return this.items.map((i) => i.file);
  }

  @Method()
  async clear(): Promise<void> {
    const removed = this.items.map((i) => i.file);
    this.replaceItems([]);
    if (removed.length) this.fileChange.emit({ files: [], added: [], removed });
  }

  /** Drive the per-file progress UI: 0..100, 'done', or 'error' (+ message). */
  @Method()
  async setProgress(
    file: File,
    progress: number | 'done' | 'error',
    message?: string,
  ): Promise<void> {
    this.items = this.items.map((i) =>
      i.file === file ? { ...i, progress, message } : i);
  }

  // --- adding / removing --------------------------------------------------------

  private acceptMatches(file: File): boolean {
    const spec = this.accept?.trim();
    if (!spec) return true;
    const parts = spec.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    const name = file.name.toLowerCase();
    const type = (file.type || '').toLowerCase();
    return parts.some((p) => {
      if (p.startsWith('.')) return name.endsWith(p);
      if (p.endsWith('/*')) return type.startsWith(p.slice(0, -1));
      return type === p;
    });
  }

  private addFiles(list: FileList | File[]) {
    if (this.disabled) return;
    const incoming = Array.from(list);
    const added: File[] = [];
    let count = this.items.length;

    for (const file of incoming) {
      if (!this.multiple && (count > 0 || added.length > 0)) {
        this.materialFileReject.emit({ file, reason: 'count' });
        continue;
      }
      if (this.maxFiles != null && count + added.length >= this.maxFiles) {
        this.materialFileReject.emit({ file, reason: 'count' });
        continue;
      }
      if (!this.acceptMatches(file)) {
        this.materialFileReject.emit({ file, reason: 'type' });
        continue;
      }
      if (this.maxSize != null && file.size > this.maxSize) {
        this.materialFileReject.emit({ file, reason: 'size' });
        continue;
      }
      const hook = this.materialFileAdd.emit({ file });
      if (hook.defaultPrevented) {
        this.materialFileReject.emit({ file, reason: 'custom' });
        continue;
      }
      added.push(file);
    }

    if (!added.length) return;
    const newItems = added.map((file) => ({
      id: this.nextId++,
      file,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }));
    this.replaceItems(
      this.multiple ? [...this.items, ...newItems] : newItems,
    );
    this.fileChange.emit({ files: this.items.map((i) => i.file), added, removed: [] });
  }

  private removeItem(item: DropItem) {
    if (this.disabled) return;
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    this.replaceItems(this.items.filter((i) => i !== item));
    this.fileChange.emit({
      files: this.items.map((i) => i.file),
      added: [],
      removed: [item.file],
    });
  }

  /** Set state AND mirror the list into the native input so the surrounding
   *  form posts exactly what the rows show. */
  private replaceItems(items: DropItem[]) {
    this.items = items;
    if (!this.fileInput) return;
    const dt = new DataTransfer();
    for (const i of items) dt.items.add(i.file);
    this.fileInput.files = dt.files;
  }

  // --- interaction ------------------------------------------------------------------

  private openPicker = () => {
    if (this.disabled) return;
    this.fileInput?.click();
  };

  private handleInputChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    // The picker REPLACES input.files with just-picked ones; addFiles rebuilds
    // the accumulated list (existing + accepted new) back into the input.
    this.addFiles(files);
    if (!this.items.length && this.fileInput) this.fileInput.value = '';
  };

  private handleDrop = (e: DragEvent) => {
    e.preventDefault();
    this.dragDepth = 0;
    this.dragOver = false;
    if (e.dataTransfer?.files?.length) this.addFiles(e.dataTransfer.files);
  };

  private handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    if (this.disabled) return;
    this.dragDepth++;
    this.dragOver = true;
  };

  private handleDragLeave = () => {
    this.dragDepth = Math.max(0, this.dragDepth - 1);
    if (this.dragDepth === 0) this.dragOver = false;
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.openPicker();
    }
  };

  // --- render ---------------------------------------------------------------------------

  private static formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  private static fileIcon(file: File): string {
    const t = file.type;
    if (t.startsWith('image/')) return 'image';
    if (t.startsWith('video/')) return 'movie';
    if (t.startsWith('audio/')) return 'music_note';
    if (t.includes('pdf')) return 'picture_as_pdf';
    if (t.includes('zip') || t.includes('compressed')) return 'folder_zip';
    if (t.includes('sheet') || t.includes('excel') || t.includes('csv')) return 'table';
    if (t.includes('word') || t.startsWith('text/')) return 'description';
    return 'draft';
  }

  private renderRow(item: DropItem) {
    const uploading = typeof item.progress === 'number';
    return (
      <div class={{ 'dz-row': true, 'is-error': item.progress === 'error' }} key={String(item.id)}>
        {item.previewUrl ? (
          <img class="dz-thumb" src={item.previewUrl} alt="" />
        ) : (
          <span class="dz-file-icon" aria-hidden="true">
            {MaterialDropzone.fileIcon(item.file)}
          </span>
        )}
        <div class="dz-meta">
          <span class="dz-name">{item.file.name}</span>
          <span class="dz-sub">
            {item.progress === 'error'
              ? (item.message || gettext('Upload failed'))
              : uploading
                ? `${Math.round(item.progress as number)}%`
                : MaterialDropzone.formatSize(item.file.size)}
          </span>
          {uploading && (
            <material-linear-progress
              class="dz-progress"
              value={item.progress as number}
            />
          )}
        </div>
        {item.progress === 'done' && (
          <span class="dz-status done" aria-hidden="true">check_circle</span>
        )}
        {item.progress === 'error' && (
          <span class="dz-status error" aria-hidden="true">error</span>
        )}
        <material-icon-button
          size="xs"
          variant="standard"
          icon="close"
          aria-label={this.removeLabel || gettext('Remove file')}
          disabled={this.disabled}
          onClick={() => this.removeItem(item)}
        />
      </div>
    );
  }

  render() {
    const drop = this.dropLabel || gettext('Drag files here');
    const browse = this.browseLabel || gettext('browse');
    const subText = this.error ? this.errorText : this.helpText;

    return (
      <Host class="block w-full">
        <div
          class={{
            'dz-area': true,
            'drag-over': this.dragOver,
            'disabled': this.disabled,
            'has-error': this.error,
          }}
          role="button"
          tabIndex={this.disabled ? -1 : 0}
          aria-disabled={this.disabled ? 'true' : null}
          onClick={this.openPicker}
          onKeyDown={this.handleKeyDown}
          onDragOver={(e: DragEvent) => e.preventDefault()}
          onDragEnter={this.handleDragEnter}
          onDragLeave={this.handleDragLeave}
          onDrop={this.handleDrop}
        >
          <span class="dz-icon" aria-hidden="true">upload_file</span>
          <span class="dz-text">
            {drop} <span class="dz-browse">{browse}</span>
          </span>
        </div>

        {subText && (
          <div class={{ 'dz-help': true, 'is-error': this.error }}>{subText}</div>
        )}

        {this.items.length > 0 && (
          <div class="dz-list">{this.items.map((i) => this.renderRow(i))}</div>
        )}

        <input
          ref={(el) => (this.fileInput = el)}
          type="file"
          name={this.name}
          accept={this.accept}
          multiple={this.multiple}
          disabled={this.disabled}
          hidden
          onChange={this.handleInputChange}
        />
      </Host>
    );
  }
}
