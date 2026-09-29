// Runs before first paint so a saved light/dark choice never flashes the wrong theme.
try {
  var t = localStorage.getItem('circl_theme')
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t)
} catch { /* storage unavailable */ }
