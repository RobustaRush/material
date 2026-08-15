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
 * Stencil's global script: runs once, before any component.
 *
 * Its whole job is the setup mistake that has no other symptom. Components read
 * --md-sys-color-* from the page; miss the stylesheet and they render with
 * those tokens unresolved — no outlines, no fills, black text on white — which
 * reads as "the CSS 404'd" rather than "the theme is missing", and nothing in
 * the console corrects that.
 *
 * Deliberately not behind `Build.isDev`: that is *this* library's build mode,
 * so a dev-gated message would only ever appear while developing the library
 * itself and never in the app that has the problem. The cost is one
 * getComputedStyle and one querySelector, once, after the first frame.
 */
const THEME_CLASSES = [
  'light',
  'dark',
  'light-medium-contrast',
  'dark-medium-contrast',
  'light-high-contrast',
  'dark-high-contrast',
];

export default () => {
  if (typeof document === 'undefined') return;

  // E2E cases deliberately mount bare components so they can exercise their
  // DOM in isolation. A browser driven by WebDriver is not a consumer page,
  // so the production setup diagnostic is only noise there.
  if (navigator.webdriver) return;

  const check = () => {
    const tokens = getComputedStyle(document.documentElement)
      .getPropertyValue('--md-sys-color-primary')
      .trim();

    if (!tokens) {
      console.warn(
        '[advanced-material-web] No Material tokens on the page: components ' +
          'will render without colors. Load the theme stylesheet — ' +
          '`@import "advanced-material-web/theme.css"`, or the <link> shown in ' +
          'the README quick start.',
      );
      return;
    }

    // The class may sit on any ancestor of the components, not only <html>.
    if (document.querySelector(THEME_CLASSES.map((c) => `.${c}`).join(','))) return;

    // Not a warning: running on the default is a valid choice, and this one
    // would otherwise nag every correctly-built page that never sets a class.
    console.info(
      '[advanced-material-web] No theme class found, so the light palette ' +
        'applies by default. Set one on <html> to choose: ' +
        `${THEME_CLASSES.join(', ')}.`,
    );
  };

  // After load, so a <link rel="stylesheet"> has been applied — checking at
  // import time would report a missing theme on every page. Not
  // requestAnimationFrame: a page opened in a background tab gets no frames,
  // and the check would sit there until someone looked at it.
  if (document.readyState === 'complete') setTimeout(check);
  else addEventListener('load', () => setTimeout(check), { once: true });
};
