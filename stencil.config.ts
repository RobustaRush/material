import { Config } from '@stencil/core';

export const config: Config = {
  namespace: 'material',
  taskQueue: 'async',
  sourceMap: false,
  outputTargets: [
    { type: 'dist', esmLoaderPath: '../loader' },
    // auto-define-custom-elements: importing dist/components/index.js registers
    // every element by side effect — the entry point the single-file CDN bundle
    // (scripts/cdn-entry.mjs → esbuild) is built from.
    // externalRuntime: false inlines the Stencil runtime so dist/components (and
    // thus the CDN bundle and the ./components export) carry no bare
    // `@stencil/core` import — it's a devDependency, absent from consumers.
    {
      type: 'dist-custom-elements',
      customElementsExportBehavior: 'auto-define-custom-elements',
      externalRuntime: false,
    },
    { type: 'docs-readme' },
    {
      type: 'www',
      serviceWorker: null,
      empty: false,
      copy: [
        { src: 'demos', dest: 'demos', warn: true },
        { src: 'showcases', dest: 'showcases', warn: true },
      ],
    },
  ],
  testing: {
    browserHeadless: 'new',
  },
};
