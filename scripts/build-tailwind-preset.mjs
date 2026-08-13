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

// Publishes src/theme/tailwind.css as css/tailwind.css — a copy, deliberately
// NOT run through the Tailwind CLI: the consumer's own build has to see the
// `@theme` and `@custom-variant` directives as source, and compiling them here
// would leave a stylesheet with no directives and no utilities.
//
// Since nothing compiles the file, nothing would catch a typo in it either —
// the failure would surface as a utility that silently resolves to nothing in
// someone else's app. So the copy is gated on the four invariants the bridge
// relies on:
//
//   1. no `@source`      — it would point Tailwind at OUR node_modules paths
//                          and make the consumer scan this package's sources
//   2. no `@theme inline`— inline substitutes values at build time, freezing
//                          the palette and defeating the whole design
//   3. values are var()  — same reason: a literal can't follow a theme swap
//   4. references resolve— every --md-* the bridge reads is defined under
//                          src/theme/, and every --md-sys-color-* defined
//                          there has a --color-* utility, so a consumer's own
//                          Theme Builder export never lands a token that has
//                          no utility behind it
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { BUNDLE_BANNER, strip } from './license-header.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const themeDir = join(root, 'src/theme');
const entry = join(themeDir, 'tailwind.css');
const source = readFileSync(entry, 'utf8');

// Checks read the declarations, not the prose. The file's own comments name
// `@theme inline` (to warn against it) and sketch a --md-extended-color-*
// example for Theme Builder custom colors — both would trip the rules below.
const code = source.replace(/\/\*[\s\S]*?\*\//g, '');

const errors = [];

/* ---- 1 & 2: the two directives that must not appear ---------------------- */

if (/@source\b/.test(code)) {
  errors.push('`@source` must not appear — it would make consumers scan this package.');
}
if (/@theme\s+[^{]*\binline\b/.test(code)) {
  errors.push('`@theme inline` freezes token values at build time — use plain `@theme`.');
}

/* ---- 3: every bridged value is a var() reference ------------------------- */

// Keys whose value is a literal on purpose. MD3's corner scale stops at xl, so
// these three continue its ramp rather than leaving Tailwind's stock values
// below xl — see the shape section of tailwind.css.
const LITERAL_KEYS = new Set(['--radius-2xl', '--radius-3xl', '--radius-4xl']);

const themeBlock = code.match(/@theme\s*\{([\s\S]*)\n\}/);
if (!themeBlock) {
  errors.push('no `@theme { … }` block found.');
}
const body = themeBlock ? themeBlock[1] : '';

for (const [, key, value] of body.matchAll(/^\s*(--[\w-]+)\s*:\s*([^;]+);/gm)) {
  const literal = !value.trim().startsWith('var(--md-');
  if (literal && !LITERAL_KEYS.has(key)) {
    errors.push(`${key}: expected a var(--md-…) reference, got \`${value.trim()}\`.`);
  }
}

/* ---- 4: references resolve, and colors are fully covered ----------------- */

// Every --md-* token defined by the theme sources (tailwind.css itself excluded
// — it only reads them).
const defined = new Set();
for (const file of readdirSync(themeDir)) {
  if (!file.endsWith('.css') || file === 'tailwind.css') continue;
  const css = readFileSync(join(themeDir, file), 'utf8');
  for (const [, name] of css.matchAll(/^\s*(--md-[\w-]+)\s*:/gm)) defined.add(name);
}

const referenced = new Set([...code.matchAll(/var\((--md-[\w-]+)/g)].map((m) => m[1]));
for (const name of [...referenced].sort()) {
  if (!defined.has(name)) errors.push(`${name} is referenced but defined nowhere in src/theme/.`);
}

// The other direction, colors only: --md-sys-color-X must have --color-X.
const bridged = new Set([...body.matchAll(/^\s*--color-([\w-]+)\s*:/gm)].map((m) => m[1]));
for (const name of [...defined].sort()) {
  const color = name.match(/^--md-sys-color-(.+)$/);
  if (color && !bridged.has(color[1])) {
    errors.push(`${name} has no --color-${color[1]} bridge — add it or a utility will be missing.`);
  }
}

if (errors.length) {
  console.error('css/tailwind.css NOT written — src/theme/tailwind.css failed its checks:\n');
  for (const error of errors) console.error(`  • ${error}`);
  process.exit(1);
}

/* ---- write --------------------------------------------------------------- */

const banner = `${BUNDLE_BANNER}

/* tailwind.css — Material 3 tokens in Tailwind v4's theme namespaces.
 *
 * Copied verbatim from src/theme/tailwind.css by
 * scripts/build-tailwind-preset.mjs, which also verifies the invariants the
 * bridge depends on. Unlike theme.css this file is NOT compiled: your own
 * Tailwind build consumes its \`@theme\` and \`@custom-variant\` directives.
 *
 *   @import "tailwindcss";
 *   @import "advanced-material-web/tailwind.css";
 *
 * Load css/tokens.css (or css/theme.css) in the page as well — the utilities
 * here are var() references to those tokens, which is what lets them follow a
 * theme swap with no rebuild.
 *
 * Do not edit this file — edit src/theme/tailwind.css.
 */
`;

writeFileSync(join(root, 'css/tailwind.css'), `${banner}\n${strip(source, entry).trimStart()}`);

console.log(
  `css/tailwind.css — bridge published, ${bridged.size} colors and ${referenced.size} tokens checked`,
);
