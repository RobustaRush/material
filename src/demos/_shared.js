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
