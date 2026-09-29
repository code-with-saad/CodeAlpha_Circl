const KEY = 'circl_theme'

export const getTheme = () => {
  try { return localStorage.getItem(KEY) || 'system' } catch { return 'system' }
}

// 'system' removes the override so the OS preference (prefers-color-scheme) decides.
export function setTheme(theme) {
  const root = document.documentElement
  if (theme === 'light' || theme === 'dark') root.setAttribute('data-theme', theme)
  else root.removeAttribute('data-theme')
  try {
    if (theme === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, theme)
  } catch { /* storage unavailable */ }
}
