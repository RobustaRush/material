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
 * Keeps the framework packages in lockstep with the core package: their own
 * version and their `@viewflow/material` peer range both follow the root
 * package.json, so `@viewflow/material-react@26.28.1` always pairs with
 * `@viewflow/material@26.28.1`.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const packagesDir = join(root, 'packages');

for (const name of readdirSync(packagesDir)) {
  const manifestPath = join(packagesDir, name, 'package.json');
  if (!existsSync(manifestPath)) continue;

  const source = readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(source);
  manifest.version = version;
  if (manifest.peerDependencies?.['@viewflow/material']) {
    manifest.peerDependencies['@viewflow/material'] = `^${version}`;
  }

  const updated = `${JSON.stringify(manifest, null, 2)}\n`;
  if (updated !== source) {
    writeFileSync(manifestPath, updated);
    console.log(`packages/${name} — ${version}`);
  }
}
