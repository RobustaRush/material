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

// Single-file CDN bundle: reads the auto-defining custom-element modules from
// dist/components (produced by `stencil build`), synthesizes a side-effect
// import list, and esbuild-bundles them + the inlined Stencil runtime into one
// self-contained minified ESM file (cdn/material.min.js). Runs after stencil
// build; the component list is discovered fresh each time so it never drifts.
import { build } from 'esbuild';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { BUNDLE_BANNER } from './license-header.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const componentsDir = join(root, 'dist/components');
const modules = readdirSync(componentsDir)
  .filter((f) => f.startsWith('material-') && f.endsWith('.js'))
  .sort();

// index.js first: it is what carries the global script (the theme setup check),
// which the per-component modules don't pull in. The CDN is the no-build path,
// so it is the likeliest place for a page to be missing theme.css entirely.
const entry =
  `import './index.js';\n` + modules.map((f) => `import './${f}';`).join('\n') + '\n';

await build({
  stdin: { contents: entry, resolveDir: componentsDir, loader: 'js' },
  bundle: true,
  format: 'esm',
  minify: true,
  outfile: join(root, 'cdn/material.min.js'),
  // The per-file headers are dropped and the notice is re-added once, at the
  // top: 70-odd copies of it inside a CDN bundle is bloat, not notice.
  legalComments: 'none',
  banner: { js: BUNDLE_BANNER },
});

console.log(`cdn/material.min.js — bundled ${modules.length} components`);
