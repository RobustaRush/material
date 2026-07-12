// Mobile fixes for the demo-page header (duplicated across ~60 pages, so
// patched centrally): below 720px the header wraps — title block takes the
// full first row with the description clamped to 2 lines, the theme /
// density / direction controls flow onto their own row instead of
// squeezing the title or overlapping.
(function () {
  const style = document.createElement('style');
  style.textContent = `
    /* WCAG 2.5.8 target size for the density / direction toggles */
    [data-density-picker] button,
    [data-dir-picker] button {
      min-width: 1.75rem;
      min-height: 1.75rem;
    }
    @media (max-width: 719px) {
      body > header.bg-surface-container-low {
        flex-wrap: wrap;
        padding: 0.75rem 1rem;
        row-gap: 0.5rem;
        column-gap: 0.75rem;
      }
      body > header.bg-surface-container-low > div.min-w-0 {
        flex-basis: 100%;
      }
      body > header.bg-surface-container-low > div.min-w-0 p {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      body > header.bg-surface-container-low h1 {
        font-size: 1.125rem;
      }
    }`;
  document.head.appendChild(style);
})();

// Theme switcher for demo pages — swaps one of six MD3 contrast classes on
// <html>. CSS custom properties cascade into shadow DOM, so every component
// follows. Persists the choice in localStorage so it carries across pages.
(function () {
  const THEMES = [
    'light', 'dark',
    'light-medium-contrast', 'dark-medium-contrast',
    'light-high-contrast', 'dark-high-contrast',
  ];
  const root = document.documentElement;
  const picker = document.getElementById('theme-picker');
  if (!picker) return;

  function applyTheme(name) {
    root.classList.remove(...THEMES);
    root.classList.add(name);
  }

  const saved = localStorage.getItem('material-theme');
  const initial = (saved && THEMES.includes(saved))
    ? saved
    : (THEMES.find(t => root.classList.contains(t)) || 'light');
  applyTheme(initial);
  picker.value = initial;

  picker.addEventListener('change', e => {
    applyTheme(e.target.value);
    localStorage.setItem('material-theme', e.target.value);
  });
})();

// Density (A− / A / A+) — scales root font-size to 0.8× / 0.9× / 1.0× of 16px.
// Component CSS uses rem for sizes, so changing root font-size rescales every
// component, every Tailwind utility, and every M3 type token in lockstep.
// Defaults to A (0.9×) — the comfortable desktop density.
(function () {
  const SCALES = ['0.8', '0.9', '1'];
  const DEFAULT = '0.9';
  const root = document.documentElement;

  function applyDensity(scale) {
    const num = parseFloat(scale);
    root.style.fontSize = (num * 16) + 'px';
    root.dataset.density = scale;
  }

  const saved = localStorage.getItem('material-density');
  const initial = SCALES.includes(saved) ? saved : DEFAULT;
  applyDensity(initial);

  // Wire any [data-density-picker] container with [data-density="0.8|0.9|1"]
  // children. Reflect pressed state via aria-pressed.
  const groups = document.querySelectorAll('[data-density-picker]');
  groups.forEach(group => {
    const buttons = group.querySelectorAll('[data-density]');
    function syncPressed(scale) {
      buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.density === scale)));
    }
    syncPressed(initial);
    group.addEventListener('click', e => {
      const btn = e.target.closest('[data-density]');
      if (!btn) return;
      const scale = btn.dataset.density;
      if (!SCALES.includes(scale)) return;
      applyDensity(scale);
      localStorage.setItem('material-density', scale);
      syncPressed(scale);
    });
  });
})();

// Direction toggle (LTR / RTL) — injected next to the density picker so no
// demo page needs its own markup. Sets dir on <html>; demo sections that
// hard-code their own dir="rtl" keep it (they demo the opposite direction).
// Persists like theme/density so a full-library RTL sweep survives page hops.
(function () {
  const root = document.documentElement;
  const anchor = document.querySelector('[data-density-picker]');
  if (!anchor) return;

  const label = document.createElement('label');
  label.className = 'flex items-center gap-2 text-sm shrink-0';
  label.innerHTML =
    '<span class="text-on-surface-variant">Direction</span>' +
    '<div data-dir-picker role="group" aria-label="Text direction" ' +
    'class="inline-flex bg-surface-container border border-outline-variant rounded overflow-hidden">' +
    '<button type="button" data-dir="ltr" class="px-2 py-1 text-sm aria-pressed:bg-secondary-container aria-pressed:text-on-secondary-container">LTR</button>' +
    '<button type="button" data-dir="rtl" class="px-2 py-1 text-sm aria-pressed:bg-secondary-container aria-pressed:text-on-secondary-container">RTL</button>' +
    '</div>';
  // Demo pages wrap the picker in a <label>; showcases place it bare inside
  // an app-bar slot. Insert after whichever wrapper exists and inherit the
  // slot assignment so shadow-DOM app bars actually render the toggle.
  const slot = anchor.getAttribute('slot');
  if (slot) label.setAttribute('slot', slot);
  (anchor.closest('label') || anchor).after(label);

  const buttons = label.querySelectorAll('[data-dir]');
  function applyDir(dir) {
    root.dir = dir;
    buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.dir === dir)));
  }

  const saved = localStorage.getItem('material-dir');
  applyDir(saved === 'rtl' ? 'rtl' : 'ltr');

  label.addEventListener('click', e => {
    const btn = e.target.closest('[data-dir]');
    if (!btn) return;
    applyDir(btn.dataset.dir);
    localStorage.setItem('material-dir', btn.dataset.dir);
  });
})();

// Helper for form-demo blocks: serialize the form's FormData on submit into
// a target output element. Used by checkbox / textfield demos.
window.serializeFormToOutput = function (formId, outputId) {
  const form = document.getElementById(formId);
  const out = document.getElementById(outputId);
  if (!form || !out) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const data = new FormData(form);
    const pairs = [...data.entries()].map(([k, v]) => `${k}=${v}`);
    out.textContent = pairs.length ? pairs.join(' & ') : '(empty)';
  });
  form.addEventListener('reset', () => { out.textContent = ''; });
};
