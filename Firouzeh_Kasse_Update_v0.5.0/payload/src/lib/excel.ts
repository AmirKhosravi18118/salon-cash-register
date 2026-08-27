import { db } from '../db'
import {
  createTranslator,
  localizedCategory,
  serviceName,
  transactionLabel,
} from '../i18n'
import type { CashSession, CashTransaction, Locale } from '../types'

type CellValue = string | number

interface Cell {
  value: CellValue
  style?: number
}

interface Sheet {
  name: string
  rows: Cell[][]
  widths: number[]
  rightToLeft?: boolean
}

const textEncoder = new TextEncoder()

const cell = (value: CellValue, style = 0): Cell => ({ value, style })
const text = (value: CellValue) => cell(String(value))
const money = (cents: number, total = false) => cell(cents / 100, total ? 6 : 2)
const integer = (value: number) => cell(value, 3)
const header = (value: string) => cell(value, 1)
const title = (value: string) => cell(value, 4)
const totalLabel = (value: string) => cell(value, 5)

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function columnName(index: number): string {
  let result = ''
  let current = index + 1

  while (current > 0) {
    const remainder = (current - 1) % 26
    result = String.fromCharCode(65 + remainder) + result
    current = Math.floor((current - 1) / 26)
  }

  return result
}

function worksheetXml(sheet: Sheet): string {
  const rowXml = sheet.rows.map((row, rowIndex) => {
    const cells = row.map((item, columnIndex) => {
      const reference = `${columnName(columnIndex)}${rowIndex + 1}`
      const style = item.style ? ` s="${item.style}"` : ''

      if (typeof item.value === 'number') {
        return `<c r="${reference}"${style} t="n"><v>${item.value}</v></c>`
      }

      return `<c r="${reference}"${style} t="inlineStr"><is><t xml:space="preserve">${escapeXml(item.value)}</t></is></c>`
    }).join('')

    return `<row r="${rowIndex + 1}">${cells}</row>`
  }).join('')

  const widths = sheet.widths
    .map((width, index) =>
      `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`)
    .join('')

  const lastColumn = columnName(Math.max(sheet.widths.length - 1, 0))
  const lastRow = Math.max(sheet.rows.length, 1)
  const direction = sheet.rightToLeft ? ' rightToLeft="1"' : ''

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews>
    <sheetView workbookViewId="0"${direction}>
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="20"/>
  <cols>${widths}</cols>
  <sheetData>${rowXml}</sheetData>
  <autoFilter ref="A1:${lastColumn}${lastRow}"/>
  <pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>
</worksheet>`
}

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1">
    <numFmt numFmtId="164" formatCode="€ #,##0.00;[Red]-€ #,##0.00"/>
  </numFmts>
  <fonts count="3">
    <font><sz val="11"/><name val="Aptos"/></font>
    <font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Aptos"/></font>
    <font><b/><color rgb="FF3B2723"/><sz val="11"/><name val="Aptos"/></font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF3B2723"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF4DFE4"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFE4D7D0"/></left>
      <right style="thin"><color rgb="FFE4D7D0"/></right>
      <top style="thin"><color rgb="FFE4D7D0"/></top>
      <bottom style="thin"><color rgb="FFE4D7D0"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="7">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1">
      <alignment vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFill="1" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFill="1" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment vertical="center"/>
    </xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFill="1" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment vertical="center"/>
    </xf>
    <xf numFmtId="164" fontId="2" fillId="3" borderId="1" xfId="0" applyFill="1" applyFont="1" applyBorder="1" applyNumberFormat="1" applyAlignment="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
</styleSheet>`

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff

  for (const value of data) {
    crc ^= value
    for (let index = 0; index < 8; index += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
    }
  }

  return (crc ^ 0xffffffff) >>> 0
}

function dosDateTime(date = new Date()): { time: number; day: number } {
  const year = Math.max(date.getFullYear(), 1980)
  const time = (date.getHours() << 11)
    | (date.getMinutes() << 5)
    | Math.floor(date.getSeconds() / 2)
  const day = ((year - 1980) << 9)
    | ((date.getMonth() + 1) << 5)
    | date.getDate()

  return { time, day }
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const size = parts.reduce((sum, part) => sum + part.length, 0)
  const result = new Uint8Array(size)
  let offset = 0

  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }

  return result
}

function zipStore(files: Array<{ name: string; content: string }>): Uint8Array {
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  const { time, day } = dosDateTime()
  let offset = 0

  for (const file of files) {
    const name = textEncoder.encode(file.name)
    const data = textEncoder.encode(file.content)
    const checksum = crc32(data)

    const local = new Uint8Array(30 + name.length)
    const localView = new DataView(local.buffer)
    localView.setUint32(0, 0x04034b50, true)
    localView.setUint16(4, 20, true)
    localView.setUint16(6, 0x0800, true)
    localView.setUint16(8, 0, true)
    localView.setUint16(10, time, true)
    localView.setUint16(12, day, true)
    localView.setUint32(14, checksum, true)
    localView.setUint32(18, data.length, true)
    localView.setUint32(22, data.length, true)
    localView.setUint16(26, name.length, true)
    localView.setUint16(28, 0, true)
    local.set(name, 30)

    localParts.push(local, data)

    const central = new Uint8Array(46 + name.length)
    const centralView = new DataView(central.buffer)
    centralView.setUint32(0, 0x02014b50, true)
    centralView.setUint16(4, 20, true)
    centralView.setUint16(6, 20, true)
    centralView.setUint16(8, 0x0800, true)
    centralView.setUint16(10, 0, true)
    centralView.setUint16(12, time, true)
    centralView.setUint16(14, day, true)
    centralView.setUint32(16, checksum, true)
    centralView.setUint32(20, data.length, true)
    centralView.setUint32(24, data.length, true)
    centralView.setUint16(28, name.length, true)
    centralView.setUint16(30, 0, true)
    centralView.setUint16(32, 0, true)
    centralView.setUint16(34, 0, true)
    centralView.setUint16(36, 0, true)
    centralView.setUint32(38, 0, true)
    centralView.setUint32(42, offset, true)
    central.set(name, 46)
    centralParts.push(central)

    offset += local.length + data.length
  }

  const centralDirectory = concatBytes(centralParts)
  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  endView.setUint32(0, 0x06054b50, true)
  endView.setUint16(4, 0, true)
  endView.setUint16(6, 0, true)
  endView.setUint16(8, files.length, true)
  endView.setUint16(10, files.length, true)
  endView.setUint32(12, centralDirectory.length, true)
  endView.setUint32(16, offset, true)
  endView.setUint16(20, 0, true)

  return concatBytes([...localParts, centralDirectory, end])
}

function formatDateParts(value: string, locale: Locale): { date: string; time: string } {
  const date = new Date(value)
  const localeName = locale === 'fa' ? 'fa-IR-u-ca-gregory' : 'de-DE'

  return {
    date: new Intl.DateTimeFormat(localeName, {
      timeZone: 'Europe/Berlin',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date),
    time: new Intl.DateTimeFormat(localeName, {
      timeZone: 'Europe/Berlin',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date),
  }
}

function transactionRows(
  transactions: CashTransaction[],
  locale: Locale,
): Cell[][] {
  const t = createTranslator(locale)
  const labels = locale === 'fa'
    ? [
        'شماره تراکنش',
        'تاریخ',
        'ساعت',
        'نوع تراکنش',
        'خدمت یا پکیج',
        'دسته‌بندی',
        'مبلغ خدمات',
        'انعام',
        'ورودی صندوق',
        'خروجی صندوق',
        'توضیحات',
        'وضعیت',
      ]
    : [
        'Transaktionsnummer',
        'Datum',
        'Uhrzeit',
        'Transaktionsart',
        'Leistung oder Paket',
        'Kategorie',
        'Leistungsbetrag',
        'Trinkgeld',
        'Kasseneingang',
        'Kassenausgang',
        'Notiz',
        'Status',
      ]

  const rows: Cell[][] = [labels.map(header)]

  for (const transaction of transactions) {
    const parts = formatDateParts(transaction.createdAt, locale)
    const items = transaction.items
      .map((item) => `${serviceName(locale, item)} × ${item.quantity}`)
      .join(locale === 'fa' ? '، ' : ', ')

    rows.push([
      text(transaction.sequence),
      text(parts.date),
      text(parts.time),
      text(transactionLabel(locale, transaction.kind)),
      text(items),
      text(localizedCategory(locale, transaction.category)),
      money(transaction.kind === 'sale'
        ? transaction.amountCents - transaction.tipCents
        : 0),
      money(transaction.tipCents),
      money(Math.max(transaction.cashEffectCents, 0)),
      money(Math.abs(Math.min(transaction.cashEffectCents, 0))),
      text(transaction.note),
      text(t('common.recorded')),
    ])
  }

  const serviceTotal = transactions
    .filter((item) => item.kind === 'sale')
    .reduce((sum, item) => sum + item.amountCents - item.tipCents, 0)
  const tipTotal = transactions.reduce((sum, item) => sum + item.tipCents, 0)
  const inTotal = transactions.reduce(
    (sum, item) => sum + Math.max(item.cashEffectCents, 0),
    0,
  )
  const outTotal = transactions.reduce(
    (sum, item) => sum + Math.abs(Math.min(item.cashEffectCents, 0)),
    0,
  )

  rows.push([
    totalLabel(locale === 'fa' ? 'جمع کل' : 'Gesamtsumme'),
    text(''),
    text(''),
    text(''),
    text(''),
    text(''),
    money(serviceTotal, true),
    money(tipTotal, true),
    money(inTotal, true),
    money(outTotal, true),
    text(''),
    text(''),
  ])

  return rows
}

function sessionRows(sessions: CashSession[], locale: Locale): Cell[][] {
  const labels = locale === 'fa'
    ? [
        'تاریخ',
        'زمان شروع',
        'زمان پایان',
        'وضعیت',
        'موجودی اولیه',
        'موجودی مورد انتظار',
        'موجودی شمارش‌شده',
        'اختلاف صندوق',
      ]
    : [
        'Datum',
        'Startzeit',
        'Endzeit',
        'Status',
        'Anfangsbestand',
        'Sollbestand',
        'Gezählter Bestand',
        'Kassendifferenz',
      ]

  const rows: Cell[][] = [labels.map(header)]

  for (const session of sessions) {
    const opened = formatDateParts(session.openedAt, locale)
    const closed = session.closedAt
      ? formatDateParts(session.closedAt, locale)
      : undefined

    rows.push([
      text(opened.date),
      text(opened.time),
      text(closed?.time ?? ''),
      text(session.status === 'open'
        ? (locale === 'fa' ? 'باز' : 'Offen')
        : (locale === 'fa' ? 'بسته' : 'Abgeschlossen')),
      money(session.openingBalanceCents),
      money(session.expectedBalanceCents ?? 0),
      money(session.countedBalanceCents ?? 0),
      money(session.differenceCents ?? 0),
    ])
  }

  return rows
}

function serviceSummaryRows(
  transactions: CashTransaction[],
  locale: Locale,
): Cell[][] {
  const labels = locale === 'fa'
    ? ['خدمت یا پکیج', 'تعداد فروش', 'مجموع فروش', 'میانگین قیمت']
    : ['Leistung oder Paket', 'Anzahl', 'Gesamtumsatz', 'Durchschnittspreis']

  const summary = new Map<string, {
    nameFa: string
    nameDe: string
    count: number
    revenue: number
  }>()

  for (const transaction of transactions.filter((item) => item.kind === 'sale')) {
    for (const item of transaction.items) {
      const current = summary.get(item.serviceId) ?? {
        nameFa: item.nameFa,
        nameDe: item.nameDe,
        count: 0,
        revenue: 0,
      }
      current.count += item.quantity
      current.revenue += item.totalCents
      summary.set(item.serviceId, current)
    }
  }

  const values = [...summary.values()].sort((a, b) => b.revenue - a.revenue)
  const rows: Cell[][] = [labels.map(header)]

  for (const item of values) {
    rows.push([
      text(serviceName(locale, item)),
      integer(item.count),
      money(item.revenue),
      money(item.count ? Math.round(item.revenue / item.count) : 0),
    ])
  }

  rows.push([
    totalLabel(locale === 'fa' ? 'جمع کل' : 'Gesamtsumme'),
    cell(values.reduce((sum, item) => sum + item.count, 0), 5),
    money(values.reduce((sum, item) => sum + item.revenue, 0), true),
    text(''),
  ])

  return rows
}

function expenseSummaryRows(
  transactions: CashTransaction[],
  locale: Locale,
): Cell[][] {
  const labels = locale === 'fa'
    ? ['دسته‌بندی هزینه', 'تعداد', 'مجموع هزینه']
    : ['Ausgabenkategorie', 'Anzahl', 'Gesamtausgaben']

  const summary = new Map<string, { count: number; total: number }>()

  for (const transaction of transactions.filter((item) => item.kind === 'expense')) {
    const name = localizedCategory(locale, transaction.category)
      || (locale === 'fa' ? 'بدون دسته‌بندی' : 'Ohne Kategorie')
    const current = summary.get(name) ?? { count: 0, total: 0 }
    current.count += 1
    current.total += transaction.amountCents
    summary.set(name, current)
  }

  const values = [...summary.entries()].sort((a, b) => b[1].total - a[1].total)
  const rows: Cell[][] = [labels.map(header)]

  for (const [name, item] of values) {
    rows.push([text(name), integer(item.count), money(item.total)])
  }

  rows.push([
    totalLabel(locale === 'fa' ? 'جمع کل' : 'Gesamtsumme'),
    cell(values.reduce((sum, [, item]) => sum + item.count, 0), 5),
    money(values.reduce((sum, [, item]) => sum + item.total, 0), true),
  ])

  return rows
}

function movementRows(
  transactions: CashTransaction[],
  locale: Locale,
): Cell[][] {
  const labels = locale === 'fa'
    ? [
        'شماره',
        'تاریخ',
        'ساعت',
        'نوع',
        'دسته‌بندی',
        'ورودی صندوق',
        'خروجی صندوق',
        'توضیحات',
      ]
    : [
        'Nummer',
        'Datum',
        'Uhrzeit',
        'Art',
        'Kategorie',
        'Kasseneingang',
        'Kassenausgang',
        'Notiz',
      ]

  const rows: Cell[][] = [labels.map(header)]

  for (const transaction of transactions.filter((item) => item.kind !== 'sale')) {
    const parts = formatDateParts(transaction.createdAt, locale)
    rows.push([
      text(transaction.sequence),
      text(parts.date),
      text(parts.time),
      text(transactionLabel(locale, transaction.kind)),
      text(localizedCategory(locale, transaction.category)),
      money(Math.max(transaction.cashEffectCents, 0)),
      money(Math.abs(Math.min(transaction.cashEffectCents, 0))),
      text(transaction.note),
    ])
  }

  return rows
}

function informationRows(locale: Locale, transactionCount: number): Cell[][] {
  const generated = formatDateParts(new Date().toISOString(), locale)
  const rows: CellValue[][] = locale === 'fa'
    ? [
        ['عنوان', 'مقدار'],
        ['نام آرایشگاه', 'Firouzeh_hair_beauty'],
        ['نوع گزارش', 'گزارش تراکنش‌های نقدی'],
        ['نسخه برنامه', '0.5.0-test'],
        ['تاریخ ایجاد', generated.date],
        ['ساعت ایجاد', generated.time],
        ['تعداد تراکنش‌ها', transactionCount],
        ['توضیح', 'فروش‌های کارتی در این فایل وجود ندارند.'],
      ]
    : [
        ['Feld', 'Wert'],
        ['Salon', 'Firouzeh_hair_beauty'],
        ['Berichtsart', 'Bericht der Bargeldtransaktionen'],
        ['Programmversion', '0.5.0-test'],
        ['Erstellt am', generated.date],
        ['Erstellt um', generated.time],
        ['Anzahl Transaktionen', transactionCount],
        ['Hinweis', 'Kartenzahlungen sind in dieser Datei nicht enthalten.'],
      ]

  return rows.map((row, rowIndex) =>
    row.map((value) => rowIndex === 0
      ? header(String(value))
      : rowIndex === 1
        ? title(String(value))
        : text(value)))
}

export async function downloadExcelReport(locale: Locale): Promise<void> {
  const t = createTranslator(locale)
  const [transactions, sessions] = await Promise.all([
    db.transactions.orderBy('createdAt').toArray(),
    db.sessions.orderBy('openedAt').toArray(),
  ])

  const sheets: Sheet[] = [
    {
      name: t('export.transactions'),
      rows: transactionRows(transactions, locale),
      widths: [19, 14, 11, 22, 42, 24, 17, 14, 17, 17, 34, 14],
      rightToLeft: locale === 'fa',
    },
    {
      name: t('export.closings'),
      rows: sessionRows(sessions, locale),
      widths: [14, 12, 12, 16, 18, 20, 20, 18],
      rightToLeft: locale === 'fa',
    },
    {
      name: t('export.services'),
      rows: serviceSummaryRows(transactions, locale),
      widths: [42, 15, 20, 20],
      rightToLeft: locale === 'fa',
    },
    {
      name: t('export.expenses'),
      rows: expenseSummaryRows(transactions, locale),
      widths: [35, 14, 20],
      rightToLeft: locale === 'fa',
    },
    {
      name: t('export.movements'),
      rows: movementRows(transactions, locale),
      widths: [18, 14, 11, 22, 26, 18, 18, 38],
      rightToLeft: locale === 'fa',
    },
    {
      name: t('export.information'),
      rows: informationRows(locale, transactions.length),
      widths: [27, 52],
      rightToLeft: locale === 'fa',
    },
  ]

  const workbookSheets = sheets.map((sheet, index) =>
    `<sheet name="${escapeXml(sheet.name.slice(0, 31))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`)
    .join('')

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <bookViews><workbookView/></bookViews>
  <sheets>${workbookSheets}</sheets>
</workbook>`

  const relationships = [
    ...sheets.map((_, index) =>
      `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`),
    `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`,
  ].join('')

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${relationships}
</Relationships>`

  const sheetOverrides = sheets.map((_, index) =>
    `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
    .join('')

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${sheetOverrides}
</Types>`

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`

  const files = [
    { name: '[Content_Types].xml', content: contentTypes },
    { name: '_rels/.rels', content: rootRels },
    { name: 'xl/workbook.xml', content: workbookXml },
    { name: 'xl/_rels/workbook.xml.rels', content: workbookRels },
    { name: 'xl/styles.xml', content: stylesXml },
    ...sheets.map((sheet, index) => ({
      name: `xl/worksheets/sheet${index + 1}.xml`,
      content: worksheetXml(sheet),
    })),
  ]

  const archive = zipStore(files)
  const buffer = archive.buffer.slice(
    archive.byteOffset,
    archive.byteOffset + archive.byteLength,
  ) as ArrayBuffer
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `Firouzeh_cash_report_${new Date().toISOString().slice(0, 10)}.xlsx`
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
