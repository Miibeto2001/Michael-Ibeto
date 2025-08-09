(function () {
  // YEAR
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // THEME
  const root = document.documentElement;
  const btn = document.getElementById('themeToggle');

  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  const startTheme = saved || (prefersDark ? 'dark' : 'light');

  setTheme(startTheme);

  if (btn) {
    btn.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      setTheme(next);
    });
  }

  function setTheme(theme) {
    root.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    updateToggleIcon(theme);
  }

  function updateToggleIcon(theme) {
    if (!btn) return;
    btn.textContent = theme === 'dark' ? '🌞' : '🌙';
    const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    btn.setAttribute('aria-label', label);
    btn.title = label;
  }
})();
