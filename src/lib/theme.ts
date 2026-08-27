import type { ThemeSettings } from '../types'

const STORAGE_KEY = 'firouzeh-theme-v090'

export const defaultTheme: ThemeSettings = {
  primary: '#2d0b83',
  secondary: '#eeb0c3',
  background: '#f4ece7',
  surface: '#fffaf6',
  text: '#3c2a26',
  muted: '#82706a',
  success: '#3f805f',
  danger: '#b44755',
  sidebar: '#4a332e',
  radius: 22,
  shadow: 18,
  blur: 18,
  surfaceOpacity: 88,
  backgroundImage: '',
  backgroundImageOpacity: 24,
}

export function loadTheme(): ThemeSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? { ...defaultTheme, ...JSON.parse(stored) } as ThemeSettings : defaultTheme
  } catch {
    return defaultTheme
  }
}

export function saveTheme(theme: ThemeSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(theme))
  applyTheme(theme)
}

export function resetTheme(): ThemeSettings {
  localStorage.removeItem(STORAGE_KEY)
  applyTheme(defaultTheme)
  return defaultTheme
}

export function applyTheme(theme: ThemeSettings): void {
  const style = document.documentElement.style
  style.setProperty('--primary', theme.primary)
  style.setProperty('--secondary', theme.secondary)
  style.setProperty('--page-bg', theme.background)
  style.setProperty('--surface-color', theme.surface)
  style.setProperty('--text', theme.text)
  style.setProperty('--muted', theme.muted)
  style.setProperty('--success', theme.success)
  style.setProperty('--danger', theme.danger)
  style.setProperty('--sidebar-color', theme.sidebar)
  style.setProperty('--radius-card', `${theme.radius}px`)
  style.setProperty('--shadow-strength', `${Math.max(0, theme.shadow) / 100}`)
  style.setProperty('--glass-blur', `${theme.blur}px`)
  style.setProperty('--surface-opacity', `${Math.min(100, Math.max(20, theme.surfaceOpacity))}%`)
  style.setProperty('--background-image-opacity',
    `${Math.min(100, Math.max(0, theme.backgroundImageOpacity)) / 100}`)
  style.setProperty('--custom-background-image',
    theme.backgroundImage ? `url("${theme.backgroundImage}")` : 'none')
}
