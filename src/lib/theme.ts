import { defaultTheme } from '../data'
import type { ThemeSettings } from '../types'

function hexToRgb(hex: string): string {
  const normalized = hex.replace('#', '')
  const value = Number.parseInt(normalized.length === 3
    ? normalized.split('').map((part) => part + part).join('')
    : normalized, 16)
  return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`
}

export function applyTheme(theme: ThemeSettings): void {
  const root = document.documentElement
  root.style.setProperty('--primary', theme.primary)
  root.style.setProperty('--primary-rgb', hexToRgb(theme.primary))
  root.style.setProperty('--secondary', theme.secondary)
  root.style.setProperty('--secondary-rgb', hexToRgb(theme.secondary))
  root.style.setProperty('--background', theme.background)
  root.style.setProperty('--surface-rgb', hexToRgb(theme.surface))
  root.style.setProperty('--text', theme.text)
  root.style.setProperty('--muted', theme.muted)
  root.style.setProperty('--sidebar', theme.sidebar)
  root.style.setProperty('--success', theme.success)
  root.style.setProperty('--danger', theme.danger)
  root.style.setProperty('--radius', `${theme.radius}px`)
  root.style.setProperty('--shadow-strength', String(theme.shadow / 100))
  root.style.setProperty('--glass-blur', `${theme.blur}px`)
  root.style.setProperty('--surface-opacity', String(theme.surfaceOpacity / 100))
  root.style.setProperty('--background-opacity', String(theme.backgroundOpacity / 100))
  root.style.setProperty(
    '--background-image',
    theme.backgroundImage ? `url("${theme.backgroundImage}")` : 'none',
  )
}

export function resetTheme(): ThemeSettings {
  return { ...defaultTheme }
}

export async function compressBackground(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const value = new Image()
    value.onload = () => resolve(value)
    value.onerror = reject
    value.src = dataUrl
  })
  const maxWidth = 1800
  const scale = Math.min(1, maxWidth / image.width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.width * scale)
  canvas.height = Math.round(image.height * scale)
  canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.78)
}
