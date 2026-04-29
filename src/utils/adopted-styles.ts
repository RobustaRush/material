/**
 * Shared Tailwind stylesheet adoption for shadow-DOM components.
 *
 * The compiled stylesheet is fetched once, parsed into a single
 * CSSStyleSheet, and adopted into every shadow root that asks for it.
 *
 * URL resolution order:
 *   1. <meta name="material-stylesheet" content="..."> on the host page
 *   2. /static/material/material.css   (default, matches Django staticfiles)
 */

const META_NAME = 'material-stylesheet';
const DEFAULT_HREF = '/static/material/material.css';

let sheet: CSSStyleSheet | null = null;
let inflight: Promise<CSSStyleSheet> | null = null;
const pending: ShadowRoot[] = [];

function resolveHref(): string {
  const meta = document.querySelector<HTMLMetaElement>(`meta[name="${META_NAME}"]`);
  return meta?.content?.trim() || DEFAULT_HREF;
}

function attach(root: ShadowRoot, s: CSSStyleSheet): void {
  if (!root.adoptedStyleSheets.includes(s)) {
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, s];
  }
}

export function adoptMaterialStyles(root: ShadowRoot): void {
  if (sheet) {
    attach(root, sheet);
    return;
  }
  pending.push(root);
  inflight ??= fetch(resolveHref())
    .then(r => {
      if (!r.ok) throw new Error(`material: failed to load stylesheet (${r.status})`);
      return r.text();
    })
    .then(css => {
      const s = new CSSStyleSheet();
      s.replaceSync(css);
      sheet = s;
      for (const r of pending.splice(0)) attach(r, s);
      return s;
    });
}
