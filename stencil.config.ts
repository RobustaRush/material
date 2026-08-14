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

import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Config } from '@stencil/core';
import { angularOutputTarget } from '@stencil/angular-output-target';
import { Browser, Cache, computeExecutablePath } from '@puppeteer/browsers';
import { reactOutputTarget } from '@stencil/react-output-target';
import { vueOutputTarget } from '@stencil/vue-output-target';
import puppeteer from 'puppeteer';
// Local: @stencil/svelte-output-target is 0.0.3 and targets the Svelte 3/4
// compiler API, which Svelte 5 rejects. See the file header.
import { svelteOutputTarget } from './scripts/svelte-output-target.mjs';

const PKG = 'advanced-material-web';
const CUSTOM_ELEMENTS_DIR = 'dist/components';
const HYDRATE_MODULE = `${PKG}/hydrate`;
const CHROME_TEST_PROFILE_DIR = join(tmpdir(), `material-stencil-chrome-${process.pid}`);

const compareBuildIds = (left: string, right: string) =>
  left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });

const getChromeHeadlessShellPath = () => {
  const runtime = puppeteer as typeof puppeteer & {
    browserRevision?: string;
    defaultDownloadPath?: string;
  };
  const { browserRevision, defaultDownloadPath } = runtime;

  if (defaultDownloadPath) {
    const installedShell = new Cache(defaultDownloadPath)
      .getInstalledBrowsers()
      .filter((browser) => browser.browser === Browser.CHROMEHEADLESSSHELL && existsSync(browser.executablePath))
      .sort((left, right) => compareBuildIds(right.buildId, left.buildId))[0];

    if (installedShell) {
      return installedShell.executablePath;
    }
  }

  if (browserRevision && defaultDownloadPath) {
    const executablePath = computeExecutablePath({
      browser: Browser.CHROMEHEADLESSSHELL,
      buildId: browserRevision,
      cacheDir: defaultDownloadPath,
    });

    if (existsSync(executablePath)) {
      return executablePath;
    }
  }

  return puppeteer.executablePath();
};

// Stencil 4's e2e runner falls back to `puppeteer.executablePath('chrome')`
// when `headless: 'shell'` is active, which launches the system Chrome on macOS.
// Puppeteer 21 also resolves its full `.app` browser for Stencil's string
// `shell` mode; point it at Puppeteer's headless-shell binary unless the caller
// opts into a different browser explicitly.
if (!process.env.PUPPETEER_EXECUTABLE_PATH && !process.env.CHROME_PATH) {
  process.env.PUPPETEER_EXECUTABLE_PATH = getChromeHeadlessShellPath();
}

/**
 * Components whose `valueChange` detail carries a single `value` — the set that
 * can back a `v-model`, a Svelte `bind:`, or an Angular ControlValueAccessor.
 * `material-date-range-field` (`{start, end}`) and `material-transfer`
 * (`{values}`) are deliberately absent: neither has one value to bind.
 */
const VALUE_ELEMENTS = [
  'material-autocomplete',
  'material-date-field',
  'material-datetime-field',
  'material-json-field',
  'material-masked-field',
  'material-number-field',
  'material-rich-text',
  'material-select',
  'material-textarea',
  'material-textfield',
  'material-time-field',
];

/** Boolean controls: `checked` + `checkedChange`. */
const CHECKED_ELEMENTS = ['material-checkbox', 'material-switch'];

/**
 * Adapter codegen writes into adapters/*, which watch rebuilds don't need.
 * `npm start` sets MATERIAL_WRAPPERS=0 to skip it.
 */
const wrappers = process.env.MATERIAL_WRAPPERS !== '0';

const frameworkTargets = [
  reactOutputTarget({
    outDir: './adapters/react/src',
    stencilPackageName: PKG,
    customElementsDir: CUSTOM_ELEMENTS_DIR,
    // SSR: emits components.server.ts alongside components.ts, so Next.js /
    // Remix render the elements to declarative shadow DOM on the server.
    // clientModule points at the client build's own subpath, now that React
    // bindings are a subpath export rather than a sibling `-react` package.
    hydrateModule: HYDRATE_MODULE,
    clientModule: `${PKG}/react`,
  }),
  vueOutputTarget({
    componentCorePackage: PKG,
    proxiesFile: './adapters/vue/src/components.ts',
    includeImportCustomElements: true,
    customElementsDir: CUSTOM_ELEMENTS_DIR,
    hydrateModule: HYDRATE_MODULE,
    componentModels: [
      { elements: VALUE_ELEMENTS, event: 'valueChange', targetAttr: 'value', eventAttr: 'detail.value' },
      { elements: CHECKED_ELEMENTS, event: 'checkedChange', targetAttr: 'checked', eventAttr: 'detail.checked' },
      { elements: ['material-radio-group'], event: 'valueChange', targetAttr: 'value', eventAttr: 'detail.value' },
      { elements: ['material-slider'], event: 'valueChange', targetAttr: 'value', eventAttr: 'detail.value' },
    ],
  }),
  angularOutputTarget({
    componentCorePackage: PKG,
    directivesProxyFile: './adapters/angular/src/lib/components.ts',
    directivesArrayFile: './adapters/angular/src/lib/index.ts',
    customElementsDir: CUSTOM_ELEMENTS_DIR,
    // standalone components — no NgModule to import, and the only outputType
    // that pairs with dist-custom-elements.
    outputType: 'standalone',
    valueAccessorConfigs: [
      { elementSelectors: VALUE_ELEMENTS, event: 'valueChange', targetAttr: 'value', type: 'text' },
      { elementSelectors: CHECKED_ELEMENTS, event: 'checkedChange', targetAttr: 'checked', type: 'boolean' },
      { elementSelectors: ['material-radio-group'], event: 'valueChange', targetAttr: 'value', type: 'radio' },
      { elementSelectors: ['material-slider'], event: 'valueChange', targetAttr: 'value', type: 'number' },
    ],
  }),
  svelteOutputTarget({
    componentCorePackage: PKG,
    outDir: './adapters/svelte/src',
    customElementsDir: CUSTOM_ELEMENTS_DIR,
    componentBindings: [
      { elements: VALUE_ELEMENTS, event: 'valueChange', targetProp: 'value' },
      { elements: CHECKED_ELEMENTS, event: 'checkedChange', targetProp: 'checked' },
      { elements: ['material-radio-group'], event: 'valueChange', targetProp: 'value' },
      { elements: ['material-slider'], event: 'valueChange', targetProp: 'value' },
    ],
  }),
];

export const config: Config = {
  namespace: 'material',
  taskQueue: 'async',
  sourceMap: false,
  // Setup check for the mistake with no other symptom — see the file. Reaches
  // the loader, the CDN bundle and dist/components/index.js; the framework
  // wrappers import per-component modules, which Stencil does not wire the
  // global script into.
  globalScript: 'src/global/app.ts',
  outputTargets: [
    { type: 'dist', esmLoaderPath: '../loader' },
    // auto-define-custom-elements: importing dist/components/index.js registers
    // every element by side effect — the entry point the single-file CDN bundle
    // (scripts/cdn-entry.mjs → esbuild) is built from. Per-component modules
    // still export `defineCustomElement` without calling it, which is what the
    // framework wrappers import.
    // externalRuntime: false inlines the Stencil runtime so dist/components (and
    // thus the CDN bundle and the ./components export) carry no bare
    // `@stencil/core` import — it's a devDependency, absent from consumers.
    {
      type: 'dist-custom-elements',
      customElementsExportBehavior: 'auto-define-custom-elements',
      externalRuntime: false,
    },
    // Renders components to HTML off the DOM. Published as `advanced-material-web/hydrate`
    // and consumed by the React and Vue wrappers for SSR.
    { type: 'dist-hydrate-script', dir: 'hydrate', generatePackageJson: false },
    { type: 'docs-readme' },
    // Editor/tooling metadata, published with the package. See docs/integrations.md.
    { type: 'docs-json', file: 'dist/docs.json', typesFile: null },
    { type: 'docs-custom-elements-manifest', file: 'dist/custom-elements.json' },
    {
      // Unlike the other docs targets, Stencil does not resolve this one
      // against rootDir — it needs an absolute path.
      type: 'docs-vscode',
      file: join(__dirname, 'dist/html-data.json'),
      sourceCodeBaseUrl: 'https://github.com/viewflow/material/blob/main/',
    },
    {
      type: 'www',
      serviceWorker: null,
      empty: false,
      copy: [
        { src: 'demos', dest: 'demos', warn: true },
        { src: 'showcases', dest: 'showcases', warn: true },
      ],
    },
    ...(wrappers ? frameworkTargets : []),
  ],
  testing: {
    browserHeadless: 'shell',
    browserArgs: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-crash-reporter',
      '--disable-crashpad',
      `--user-data-dir=${CHROME_TEST_PROFILE_DIR}`,
      `--disk-cache-dir=${join(CHROME_TEST_PROFILE_DIR, 'cache')}`,
    ],
    // @angular/* ships ESM-only (`fesm2022/*.mjs`, no CJS build). Jest's
    // default transformIgnorePatterns skips all of node_modules, so without
    // this carve-out any spec that imports the real `@angular/core`/`forms`
    // (adapters/angular/src/lib/value-accessors.spec.ts) fails with
    // "Cannot use import statement outside a module" — Stencil's own jest
    // transform (keyed off file extension, including .mjs) never gets a
    // chance to run. Everything else under node_modules stays untransformed.
    transformIgnorePatterns: ['/node_modules/(?!@angular/)', '\\.pnp\\.[^\\/]+$'],
  },
};
