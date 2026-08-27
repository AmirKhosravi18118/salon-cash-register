export function money(cents: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

export function euroInput(cents: number): string {
  return (cents / 100).toFixed(2)
}

export function parseEuro(value: string): number {
  const parsed = Number(value.trim().replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0
}

export function formatDate(value: string, withTime = true): string {
  return new Intl.DateTimeFormat('fa-IR-u-ca-gregory', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(new Date(value))
}

export function dayKey(value: Date | string = new Date()): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function downloadFile(filename: string, content: BlobPart, type: string): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function dateRangeFromPreset(preset: string): { from: string; to: string } {
  const now = new Date()
  const end = dayKey(now)
  const start = new Date(now)
  if (preset === 'today') return { from: end, to: end }
  if (preset === 'week') start.setDate(now.getDate() - 6)
  else if (preset === 'month') start.setMonth(now.getMonth(), 1)
  else if (preset === 'year') start.setMonth(0, 1)
  else start.setFullYear(now.getFullYear() - 5)
  return { from: dayKey(start), to: end }
}
