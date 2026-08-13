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

// The package's light-DOM stylesheet — everything the library styles outside a
// shadow root, in one file:
//
//   • component styles (material-data-table, material-breadcrumbs, and
//     whatever else follows the same server-first design later). These enhance
//     server-rendered markup that never enters a shadow root, so their CSS
//     can't ship as a Stencil styleUrl — it has to live in the host document's
//     own stylesheet.
//   • the class-based half of the design system: the MD3 type scale and the
//     form/page grid, for pages with no Tailwind build of their own. (Tailwind
//     users get the same thing from tailwind.css and can skip this file, unless
//     they use one of the components above.)
//
// Both kinds are declared as @import lines in src/global/material.css, which is
// the demo build's Tailwind entry — this script re-reads that same file and
// concatenates what it points at, so css/material.css can never drift from
// what the demo site actually ships. Add to either set by adding an import
// there; the two are told apart by where they live, src/components/ vs
// src/global/.
//
// Cascade layers. Sources under src/global/ declare their own
// `@layer material.<name>` and are copied verbatim; component styles are
// wrapped in `@layer material.components` here, because in the demo build they
// get Tailwind's `components` layer from the @import instead and the published
// file has to reproduce that precedence on its own. The order statement at the
// top of the output makes the intent explicit: everything the library ships is
// layered, so any unlayered CSS in the consuming page overrides it without
// !important and without counting selectors.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';
import { readdirSync } from 'node:fs';
import { BUNDLE_BANNER, strip } from './license-header.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const globalDir = join(root, 'src/global');
const entry = readFileSync(join(globalDir, 'material.css'), 'utf8');

const importRe = /@import\s+"([^"]+)"\s+layer\(components\)\s*;/g;
const sources = [...entry.matchAll(importRe)].map((m) => m[1]);

if (sources.length === 0) {
  throw new Error('no `layer(components)` imports found in src/global/material.css');
}

const read = (relPath) => {
  const path = join(globalDir, relPath);
  // Each source carries the licence notice; the banner below states it once for
  // the whole file, so the per-source copies come back out.
  return { path, css: strip(readFileSync(path, 'utf8'), path).trimEnd() };
};

const inGlobal = (path) => !relative(globalDir, path).startsWith('..' + sep);

const components = [];
const selfLayered = [];
for (const relPath of sources) {
  const source = read(relPath);
  (inGlobal(source.path) ? selfLayered : components).push(source);
}

if (components.length === 0) {
  throw new Error('no component stylesheets among the `layer(components)` imports');
}

/* ---- every token the bundle reads has to exist --------------------------- */

// Nothing compiles this stylesheet, so a token renamed in src/theme/ would
// surface as a property that silently computes to nothing. A `var(--md-x)` with
// no fallback is a token the theme owes us and is checked; a
// `var(--md-x, default)` is an author input by construction (--md-span,
// --md-grid-columns) and is not.
const defined = new Set();
const themeDir = join(root, 'src/theme');
for (const file of readdirSync(themeDir)) {
  if (!file.endsWith('.css')) continue;
  const css = readFileSync(join(themeDir, file), 'utf8');
  for (const [, name] of css.matchAll(/^\s*(--md-[\w-]+)\s*:/gm)) defined.add(name);
}

const unresolved = [];
for (const { path, css } of [...components, ...selfLayered]) {
  for (const [, name] of css.matchAll(/var\((--md-[\w-]+)\s*\)/g)) {
    if (!defined.has(name)) unresolved.push(`${relative(root, path)}: ${name}`);
  }
}

if (unresolved.length) {
  console.error('css/material.css NOT written — tokens referenced with no definition in src/theme/:\n');
  for (const line of [...new Set(unresolved)]) console.error(`  • ${line}`);
  process.exit(1);
}

/* ---- write --------------------------------------------------------------- */

const layerNames = [
  'material.components',
  ...selfLayered.flatMap(({ css }) => [...css.matchAll(/@layer\s+([\w.-]+)\s*\{/g)].map((m) => m[1])),
];

const banner = `${BUNDLE_BANNER}

/* material.css — the library's light-DOM stylesheet.
 *
 * Generated by scripts/build-material-css.mjs from the same imports
 * src/global/material.css uses for the demo build, so this file can't drift
 * from what the demo site ships. It carries two things:
 *
 *   • styling for the components that read server-rendered markup instead of a
 *     shadow root — material-data-table, material-breadcrumbs, and any later
 *     addition with the same server-first design
 *   • the MD3 type scale (\`md-typescale-body-large\`, …) and the form/page grid
 *     (\`md-grid\`, \`--md-span\`) as plain classes, for pages without Tailwind
 *
 * Load it alongside theme.css wherever you need either:
 *
 *   <link rel="stylesheet" href="theme.css">
 *   <link rel="stylesheet" href="material.css">
 *
 * Everything here sits in a cascade layer, so your own unlayered CSS overrides
 * any of it without !important.
 *
 * Do not edit this file — edit the sources under src/components/ and src/global/.
 */

@layer ${layerNames.join(', ')};
`;

const body = [
  `@layer material.components {\n${components.map(({ css }) => css).join('\n\n')}\n}`,
  ...selfLayered.map(({ css }) => css),
].join('\n\n');

writeFileSync(join(root, 'css/material.css'), `${banner}\n${body}\n`);

console.log(
  `css/material.css — ${components.length} component stylesheet(s) + ${selfLayered.length} class stylesheet(s), layers: ${layerNames.join(' < ')}`,
);
