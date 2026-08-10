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
 * Patches the `dist-custom-elements` typings so element interfaces actually
 * satisfy `HTMLElement`.
 *
 * Stencil emits one declaration per component:
 *
 *   interface MaterialTextfield extends Components.MaterialTextfield, HTMLElement {}
 *
 * When a `@Prop()` shadows a member HTMLElement already has — `ariaLabel` is
 * the big one, since ARIA reflection makes it a real DOM property typed
 * `string | null`, while a Stencil prop is `string | undefined` — the two
 * bases conflict. `skipLibCheck` hides that inside the .d.ts, but the moment
 * the interface is used where an `HTMLElement` is required (every generated
 * React wrapper does exactly that) it fails with TS2344.
 *
 * Stencil already solves the same problem for methods in dist/types by
 * emitting `Omit<Components.X, "focus">`; it just doesn't do it for props in
 * the custom-elements output. So we apply the same Omit here, computed from
 * the real `HTMLElement` members rather than a hand-kept list. The native
 * member survives, which is the one you want: setting `el.ariaLabel` reflects
 * to the `aria-label` attribute the component observes anyway.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const typesEntry = join(root, 'dist/types/components.d.ts');
const componentsDir = join(root, 'dist/components');

const program = ts.createProgram([typesEntry], {
  target: ts.ScriptTarget.ES2022,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  skipLibCheck: true,
  strict: true,
});
const checker = program.getTypeChecker();

const htmlElementSymbol = checker.resolveName('HTMLElement', undefined, ts.SymbolFlags.Type, false);
if (!htmlElementSymbol) throw new Error('could not resolve HTMLElement from the default lib');
const htmlElementMembers = new Set(
  checker.getPropertiesOfType(checker.getDeclaredTypeOfSymbol(htmlElementSymbol)).map((s) => s.name),
);

/** Prop names declared on each `Components.*` interface, straight from the source of truth. */
const componentProps = new Map();
{
  const sourceFile = program.getSourceFile(typesEntry);
  const visit = (node) => {
    if (ts.isModuleDeclaration(node) && node.name.text === 'Components' && node.body) {
      for (const statement of node.body.statements) {
        if (!ts.isInterfaceDeclaration(statement)) continue;
        componentProps.set(
          statement.name.text,
          statement.members.filter(ts.isPropertySignature).map((member) => member.name.text ?? member.name.getText()),
        );
      }
      return;
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);
}

/**
 * `auto-define-custom-elements` leaves dist/components/index.d.ts with only the
 * asset/nonce helpers — no `Components` or `JSX`. Every generated framework
 * wrapper imports those from `<pkg>/dist/components`, so re-export them. Types
 * only; the runtime index.js is untouched.
 */
{
  const indexPath = join(componentsDir, 'index.d.ts');
  const source = readFileSync(indexPath, 'utf8');
  const reExport = `export * from '../types/components';`;
  if (!source.includes(reExport)) {
    writeFileSync(indexPath, `${source.trimEnd()}\n\n${reExport}\n`);
  }
}

let patched = 0;
const omittedByComponent = new Map();

for (const file of readdirSync(componentsDir)) {
  if (!file.endsWith('.d.ts') || file === 'index.d.ts') continue;

  const path = join(componentsDir, file);
  const source = readFileSync(path, 'utf8');

  const updated = source.replace(
    /interface (\w+) extends Components\.(\w+), HTMLElement \{\}/g,
    (match, localName, componentName) => {
      const props = componentProps.get(componentName) ?? [];
      const clashes = props.filter((name) => htmlElementMembers.has(name));
      if (clashes.length === 0) return match;
      omittedByComponent.set(componentName, clashes);
      const omitted = clashes.map((name) => `"${name}"`).join(' | ');
      return `interface ${localName} extends Omit<Components.${componentName}, ${omitted}>, HTMLElement {}`;
    },
  );

  if (updated !== source) {
    writeFileSync(path, updated);
    patched++;
  }
}

const allOmitted = new Set([...omittedByComponent.values()].flat());
console.log(
  `dist/components — patched ${patched} declaration${patched === 1 ? '' : 's'}` +
    (allOmitted.size ? ` (omitted HTMLElement clashes: ${[...allOmitted].sort().join(', ')})` : ''),
);
