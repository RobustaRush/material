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
