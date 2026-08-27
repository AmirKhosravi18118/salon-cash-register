import type { Locale } from '../types'

export function formatMoney(cents: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

export function formatDate(value: string, locale: Locale, withTime = true): string {
  return new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR-u-ca-gregory' : 'de-DE', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(new Date(value))
}

export function parseEuro(value: string): number {
  const parsed = Number(value.trim().replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0
}

export const euroInput = (cents: number) => (cents / 100).toFixed(2)

export function localDayKey(value = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value)
}

export const localMonthKey = (value = new Date()) => localDayKey(value).slice(0, 7)

export function downloadText(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
