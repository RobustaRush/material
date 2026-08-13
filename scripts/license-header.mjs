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

/**
 * License notices — the single source for the header text, and the tool that
 * stamps it.
 *
 * This is not decoration. LICENSE_EXCEPTION grants its additional permission
 * only to a library that "bears a notice placed by the copyright holder"
 * stating the library is governed by AGPLv3 along with the Exception — so the
 * per-file header is what switches the Exception on. Without it the Exception
 * is attached to nothing.
 *
 *   node scripts/license-header.mjs              stamp the tracked sources
 *   node scripts/license-header.mjs --check      verify only; exit 1 if stale
 *   node scripts/license-header.mjs --generated  stamp the framework wrappers
 *
 * Stamping is idempotent: an existing notice is recognised by its SPDX line
 * and rewritten in place, so editing the text below and re-running is enough.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, relative } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * The notice, as bare lines. The LLM sentence states the copyright holder's
 * position rather than a conclusion of law: whether a model's output is a
 * derived work is unsettled everywhere, but feeding the file to a model is
 * plainly copying the file, and that copy is governed by AGPLv3. It is worded
 * as a position for that reason, and deliberately not as a licence condition —
 * AGPLv3 section 7 lets a recipient strip any added condition outside its own
 * enumerated list, and an added condition would also make the licence read as
 * something other than AGPL to distributions and licence scanners.
 */
export const NOTICE = [
  'advanced-material-web — Material 3 web components',
  'Copyright (c) 2017-2026 Mikhail Podgurskiy',
  '',
  'SPDX-License-Identifier: AGPL-3.0-or-later',
  'AGPLv3 with the Viewflow Library Exception — see LICENSE_EXCEPTION.',
  '',
  "The copyright holder regards code produced from this file with an LLM's",
  "help as a derived work: placing it in a model's context is copying it.",
  'A commercial licence without copyleft: https://viewflow.io/pro.html',
];

/** `/* ... *\/` — TypeScript, JavaScript and CSS all take this. */
export const BLOCK_HEADER = `/*\n${NOTICE.map((line) => (line ? ` * ${line}` : ' *')).join('\n')}\n */\n`;

/** `<!-- ... -->` — Svelte components, which are markup at the top level. */
export const HTML_HEADER = `<!--\n${NOTICE.map((line) => (line ? `  ${line}` : '')).join('\n')}\n-->\n`;

/**
 * The bundle banner. Minifiers drop the per-file headers (that is the point —
 * 170 copies of the notice is bloat, not notice), so a redistributed artifact
 * carries the notice once, at the top, instead.
 */
export const BUNDLE_BANNER = `/*!\n${NOTICE.map((line) => (line ? ` * ${line}` : ' *')).join('\n')}\n */`;

const STYLES = {
  block: { header: BLOCK_HEADER, open: /^\s*\/\*[\s\S]*?\*\/\n?/ },
  html: { header: HTML_HEADER, open: /^\s*<!--[\s\S]*?-->\n?/ },
};

const styleFor = (file) => (file.endsWith('.svelte') ? STYLES.html : STYLES.block);

/** Returns the source with the current notice at the top, or the source unchanged. */
export const stamp = (source, file) => {
  const { header, open } = styleFor(file);
  const leading = source.match(open);

  // Only a leading comment that already carries the SPDX line is ours to
  // rewrite — a file may perfectly well open with an ordinary block comment.
  const body = leading && leading[0].includes('SPDX-License-Identifier') ? source.slice(leading[0].length) : source;

  // Both branches have to agree on the blank line after the header, or a
  // rewrite would differ from a fresh stamp and every run would report changes.
  return `${header}\n${body.replace(/^\n+/, '')}`;
};

/**
 * The inverse: drop our notice from a source. For concatenated artifacts,
 * where the bundle carries the notice once and the per-source copies would
 * just repeat it.
 */
export const strip = (source, file) => {
  const leading = source.match(styleFor(file).open);
  if (leading && leading[0].includes('SPDX-License-Identifier')) {
    return source.slice(leading[0].length).replace(/^\n+/, '');
  }
  return source;
};

const walk = (dir, exts, out = []) => {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, exts, out);
    else if (exts.some((ext) => entry.endsWith(ext))) out.push(path);
  }
  return out;
};

const SOURCE_EXTS = ['.ts', '.tsx', '.css'];
const WRAPPER_EXTS = ['.ts', '.tsx', '.js', '.svelte'];

/** Committed sources. Kept in sync by `--check` in CI. */
const trackedFiles = () => [
  ...walk(join(root, 'src'), SOURCE_EXTS),
  ...walk(join(root, 'scripts'), ['.mjs']),
  join(root, 'stencil.config.ts'),
  join(root, 'adapters/angular/src/public-api.ts'),
].filter(existsSync);

/**
 * The framework adapters. Generated into gitignored directories on every
 * build, and shipped to npm — the React, Vue and Angular output targets have
 * no banner option, so they get stamped after the fact.
 */
const generatedFiles = () => [
  ...walk(join(root, 'adapters/react/src'), WRAPPER_EXTS),
  ...walk(join(root, 'adapters/vue/src'), WRAPPER_EXTS),
  ...walk(join(root, 'adapters/svelte/src'), WRAPPER_EXTS),
  ...walk(join(root, 'adapters/angular/src/lib'), WRAPPER_EXTS),
  // Tailwind's CLI writes these two and has no banner option, so they are
  // stamped after the fact. (css/material.css and css/tailwind.css are written
  // by our own scripts and carry their banners already.)
  join(root, 'css/theme.css'),
  join(root, 'css/tokens.css'),
].filter(existsSync);

const main = () => {
  const check = process.argv.includes('--check');
  const generated = process.argv.includes('--generated');
  const files = generated ? generatedFiles() : trackedFiles();
  const label = generated ? 'generated wrappers' : 'sources';

  if (generated && files.length === 0) {
    console.log('license headers — no generated wrappers present, skipping');
    return;
  }

  const stale = [];
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const stamped = stamp(source, file);
    if (stamped === source) continue;
    stale.push(relative(root, file));
    if (!check) writeFileSync(file, stamped);
  }

  if (check && stale.length) {
    console.error(`license headers — ${stale.length} file(s) missing or stale:`);
    for (const file of stale.slice(0, 20)) console.error(`  ${file}`);
    if (stale.length > 20) console.error(`  … and ${stale.length - 20} more`);
    console.error('Run `npm run license` to fix.');
    process.exit(1);
  }

  const verb = check ? 'up to date' : `stamped ${stale.length}`;
  console.log(`license headers — ${files.length} ${label}, ${verb}`);
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
