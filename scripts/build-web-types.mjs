/**
 * Generates dist/web-types.json from the docs-json output.
 *
 * web-types is JetBrains' format (WebStorm, PyCharm, IntelliJ) for describing
 * custom HTML elements — the JetBrains counterpart to the docs-vscode target.
 * Stencil has no built-in target for it, but everything it needs is already in
 * dist/docs.json.
 *
 * Spec: https://github.com/JetBrains/web-types
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const docs = JSON.parse(readFileSync(join(root, 'dist/docs.json'), 'utf8'));

/** web-types wants a plain string; docs entries carry markdown-ish text. */
const description = (entry) => (entry.docs || '').trim() || undefined;

/** Optional props arrive as `string | undefined`; the interesting part is the rest. */
const typeMembers = (prop) =>
  String(prop.type ?? '')
    .split('|')
    .map((part) => part.trim())
    .filter((part) => part && part !== 'undefined' && part !== 'null');

/** Map a Stencil prop type onto a web-types value type. */
const valueType = (prop) => {
  const members = typeMembers(prop);
  if (members.length === 0) return 'any';
  if (members.every((m) => m === 'boolean' || m === 'true' || m === 'false')) return 'boolean';
  if (members.every((m) => m === 'number' || /^-?\d+(\.\d+)?$/.test(m))) return 'number';
  if (members.every((m) => m === 'string' || /^(["']).*\1$/.test(m))) return 'string';
  return 'any';
};

/** Union members of a literal type become an enumerated attribute value. */
const enumValues = (prop) => {
  const members = typeMembers(prop)
    .filter((part) => /^(["']).*\1$/.test(part))
    .map((part) => part.slice(1, -1));
  return members.length > 1 ? members : undefined;
};

/** docs.json keeps defaults as source text — `"'outlined'"`, `'false'`. */
const defaultValue = (prop) => {
  if (prop.default == null) return undefined;
  const raw = String(prop.default).trim();
  return /^(["']).*\1$/.test(raw) ? raw.slice(1, -1) : raw;
};

const elements = docs.components.map((component) => ({
  name: component.tag,
  description: description(component),
  'doc-url': `https://github.com/viewflow/material/blob/main/src/components/${component.tag}/readme.md`,
  attributes: component.props
    .filter((prop) => prop.attr)
    .map((prop) => {
      const values = enumValues(prop);
      return {
        name: prop.attr,
        description: description(prop),
        required: prop.required || undefined,
        default: defaultValue(prop),
        value: {
          kind: 'plain',
          type: valueType(prop),
          ...(values ? { values } : {}),
        },
      };
    }),
  // Props without an attribute are JS-only — e.g. `inputFormats`, `valueFormatter`.
  properties: component.props.map((prop) => ({
    name: prop.name,
    description: description(prop),
    value: { kind: 'plain', type: prop.complexType?.resolved ?? valueType(prop) },
  })),
  events: component.events.map((event) => ({
    name: event.event,
    description: description(event),
  })),
  slots: component.slots.map((slot) => ({
    name: slot.name,
    description: slot.docs?.trim() || undefined,
  })),
  js: {
    events: component.events.map((event) => ({
      name: event.event,
      description: description(event),
    })),
  },
}));

const webTypes = {
  $schema: 'https://raw.githubusercontent.com/JetBrains/web-types/master/schema/web-types.json',
  name: pkg.name,
  version: pkg.version,
  'description-markup': 'markdown',
  'default-icon': undefined,
  contributions: {
    html: {
      elements,
    },
  },
};

const out = join(root, 'dist/web-types.json');
writeFileSync(out, JSON.stringify(webTypes, null, 2));
console.log(`dist/web-types.json — ${elements.length} elements`);
