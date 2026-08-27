import * as XLSX from 'xlsx'
import { db, exportAllData } from '../db'
import { formatDate, money } from './format'

export async function downloadBackup(): Promise<void> {
  const blob = new Blob([await exportAllData()], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `Firouzeh_backup_${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function downloadExcel(): Promise<void> {
  const [transactions, sessions] = await Promise.all([
    db.transactions.orderBy('createdAt').toArray(),
    db.sessions.orderBy('openedAt').toArray(),
  ])

  const transactionRows = transactions.map((item) => ({
    'شماره': item.sequence,
    'تاریخ و ساعت': formatDate(item.createdAt),
    'نوع': item.kind,
    'عنوان': item.items.map((entry) => entry.name).join('، ') || item.categoryName,
    'کتگوری': item.categoryName,
    'مبلغ خدمات': item.kind === 'service' ? item.amountCents / 100 : 0,
    'انعام': item.tipCents / 100,
    'ورودی صندوق': Math.max(item.cashEffectCents, 0) / 100,
    'خروجی صندوق': Math.abs(Math.min(item.cashEffectCents, 0)) / 100,
    'ثبت‌کننده': item.userName,
    'توضیحات': item.note,
  }))

  const sessionRows = sessions.map((item) => ({
    'تاریخ': formatDate(item.openedAt, false),
    'شروع': formatDate(item.openedAt),
    'موجودی شروع': item.openingCountedCents / 100,
    'پایان': item.closedAt ? formatDate(item.closedAt) : '',
    'موجودی پایان': (item.closingCountedCents ?? 0) / 100,
    'تغییر شیفت': (item.shiftChangeCents ?? 0) / 100,
    'اختلاف': (item.differenceCents ?? 0) / 100,
    'بازکننده': item.openedByName,
    'بسته‌کننده': item.closedByName ?? '',
  }))

  const workbook = XLSX.utils.book_new()
  const txSheet = XLSX.utils.json_to_sheet(transactionRows)
  const shiftSheet = XLSX.utils.json_to_sheet(sessionRows)
  txSheet['!cols'] = [14, 22, 16, 42, 24, 16, 12, 16, 16, 18, 36].map((wch) => ({ wch }))
  shiftSheet['!cols'] = [14, 22, 16, 22, 16, 16, 14, 18, 18].map((wch) => ({ wch }))
  XLSX.utils.book_append_sheet(workbook, txSheet, 'فعالیت‌ها')
  XLSX.utils.book_append_sheet(workbook, shiftSheet, 'شیفت‌ها')
  XLSX.writeFile(workbook, `Firouzeh_report_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export function cashLabel(cents: number): string {
  return money(cents)
}
