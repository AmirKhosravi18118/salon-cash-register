const persianDigits = '۰۱۲۳۴۵۶۷۸۹'
const arabicDigits = '٠١٢٣٤٥٦٧٨٩'

export function toEnglishDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)))
}

export function sanitizeMoneyInput(value: string): string {
  const english = toEnglishDigits(value).replace(/\s/g, '')
  let result = ''
  let separatorUsed = false
  for (const character of english) {
    if (/\d/.test(character)) result += character
    if ((character === ',' || character === '.') && !separatorUsed) {
      result += character
      separatorUsed = true
    }
  }
  return result
}

export function parseMoney(value: string | number): number {
  if (typeof value === 'number') return Math.round(value * 100)
  const clean = toEnglishDigits(value).trim().replace(/\s/g, '')
  if (!clean) return 0

  const lastComma = clean.lastIndexOf(',')
  const lastDot = clean.lastIndexOf('.')
  const separatorIndex = Math.max(lastComma, lastDot)

  let normalized: string
  if (separatorIndex >= 0) {
    const integer = clean.slice(0, separatorIndex).replace(/[^\d-]/g, '')
    const decimal = clean.slice(separatorIndex + 1).replace(/\D/g, '').slice(0, 2)
    normalized = `${integer || '0'}.${decimal.padEnd(2, '0')}`
  } else {
    normalized = clean.replace(/[^\d-]/g, '')
  }

  const amount = Number(normalized)
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0
}

export function moneyInputValue(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}

export function normalizeMoneyOnBlur(value: string): string {
  if (!value.trim()) return ''
  return moneyInputValue(parseMoney(value))
}

export function formatMoney(cents: number, signed = false): string {
  const sign = cents < 0 ? '−' : signed && cents > 0 ? '+' : ''
  const absolute = Math.abs(cents)
  const euros = Math.floor(absolute / 100).toLocaleString('en-US')
  const decimals = String(absolute % 100).padStart(2, '0')
  return `${sign}${euros},${decimals} €`
}

export function formatInteger(value: number): string {
  return Math.round(value).toLocaleString('en-US')
}

export function formatDate(value: string | Date, includeTime = true): string {
  const date = typeof value === 'string' ? new Date(value) : value
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
  }
  return new Intl.DateTimeFormat('en-GB', options).format(date)
}

export function formatTime(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(value))
}

export function localMonthKey(value = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit',
  }).formatToParts(value)
  const year = parts.find((part) => part.type === 'year')?.value ?? '2026'
  const month = parts.find((part) => part.type === 'month')?.value ?? '01'
  return `${year}-${month}`
}

export function localDayKey(value = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(value)
  const year = parts.find((part) => part.type === 'year')?.value ?? '2026'
  const month = parts.find((part) => part.type === 'month')?.value ?? '01'
  const day = parts.find((part) => part.type === 'day')?.value ?? '01'
  return `${year}-${month}-${day}`
}

export const monthNames = [
  'ژانویه','فوریه','مارس','آوریل','مه','ژوئن',
  'ژوئیه','اوت','سپتامبر','اکتبر','نوامبر','دسامبر',
]

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function uid(prefix = 'id'): string {
  return `${prefix}-${crypto.randomUUID()}`
}

export function calculateIncludedTax(grossCents: number): number {
  return Math.round(grossCents - grossCents / 1.19)
}
