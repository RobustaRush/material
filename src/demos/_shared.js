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
