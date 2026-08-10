/*
 * @viewflow/material — Material 3 web components
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
 * Compiles every generated Svelte wrapper, client and server.
 *
 * The Svelte package ships source rather than a build, so nothing else would
 * catch a codegen mistake — a stray comma in the `$props()` destructuring is a
 * syntax error no consumer sees until they import the component.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { compile } = require('svelte/compiler');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const libDir = join(root, 'packages/svelte/src/lib');

if (!existsSync(libDir)) {
  console.log('packages/svelte/src/lib — not generated, skipping');
  process.exit(0);
}

const failures = [];
let checked = 0;
let warnings = 0;

for (const file of readdirSync(libDir).filter((f) => f.endsWith('.svelte'))) {
  const source = readFileSync(join(libDir, file), 'utf8');
  const name = file.replace('.svelte', '');

  for (const generate of ['client', 'server']) {
    try {
      const result = compile(source, { name, filename: file, generate });
      warnings += result.warnings.length;
      for (const warning of result.warnings) {
        console.warn(`  ${file} (${generate}): ${warning.code} — ${warning.message}`);
      }
    } catch (error) {
      failures.push(`${file} (${generate}): ${error.message}`);
    }
  }
  checked++;
}

if (failures.length) {
  console.error(`packages/svelte — ${failures.length} wrapper(s) failed to compile:`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log(`packages/svelte — ${checked} wrappers compile (client + server), ${warnings} warnings`);
