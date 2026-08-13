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
 * The package's entry: what `import { … } from 'advanced-material-web'` gets.
 *
 * Element prop and event types keep coming from the generated components.d.ts,
 * re-exported here so one entry covers both — `export type *`, so nothing of it
 * survives into the emitted JS. The rest of this file is for the handful of
 * things that are functions rather than elements.
 */
export type * from './components';

export { snackbar } from './utils/snackbar';
