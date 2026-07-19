// Single-file CDN bundle: reads the auto-defining custom-element modules from
// dist/components (produced by `stencil build`), synthesizes a side-effect
// import list, and esbuild-bundles them + the inlined Stencil runtime into one
// self-contained minified ESM file (cdn/material.min.js). Runs after stencil
// build; the component list is discovered fresh each time so it never drifts.
import { build } from 'esbuild';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const componentsDir = join(root, 'dist/components');
const modules = readdirSync(componentsDir)
  .filter((f) => f.startsWith('material-') && f.endsWith('.js'))
  .sort();

const entry = modules.map((f) => `import './${f}';`).join('\n') + '\n';

await build({
  stdin: { contents: entry, resolveDir: componentsDir, loader: 'js' },
  bundle: true,
  format: 'esm',
  minify: true,
  outfile: join(root, 'cdn/material.min.js'),
  legalComments: 'none',
});

console.log(`cdn/material.min.js — bundled ${modules.length} components`);
