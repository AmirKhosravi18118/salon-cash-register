import * as XLSX from 'xlsx'
import { db, exportDatabase } from '../db'
import { downloadBlob, formatDate } from './format'

export async function downloadJsonBackup(): Promise<void> {
  downloadBlob(
    `Firouzeh_backup_${new Date().toISOString().slice(0, 10)}.json`,
    new Blob([await exportDatabase()], { type: 'application/json;charset=utf-8' }),
  )
}

export async function downloadExcel(): Promise<void> {
  const [transactions, shifts] = await Promise.all([
    db.transactions.orderBy('createdAt').toArray(),
    db.shifts.orderBy('openedAt').toArray(),
  ])

  const transactionRows = transactions.map((item) => ({
    'شماره': item.sequence,
    'تاریخ و ساعت': formatDate(item.createdAt),
    'نوع': item.kind,
    'جهت': item.direction === 'in' ? 'ورودی' : 'خروجی',
    'خدمات': item.items.map((entry) => entry.name).join('، '),
    'کتگوری': item.categoryName ?? '',
    'مبلغ خدمات': item.serviceSubtotalCents / 100,
    'مالیات موجود در مبلغ': item.taxIncludedCents / 100,
    'انعام': item.tipCents / 100,
    'مبلغ کل': item.amountCents / 100,
    'کاربر': item.userName,
    'توضیحات': item.note,
  }))

  const shiftRows = shifts.map((item) => ({
    'تاریخ': formatDate(item.openedAt, false),
    'ساعت شروع': formatDate(item.openedAt),
    'موجودی شروع': item.openingBalanceCents / 100,
    'ساعت پایان': item.closedAt ? formatDate(item.closedAt) : '',
    'موجودی سیستم هنگام بستن': (item.expectedClosingCents ?? 0) / 100,
    'موجودی شمارش‌شده': (item.countedClosingCents ?? 0) / 100,
    'اختلاف': (item.differenceCents ?? 0) / 100,
    'تغییر شیفت': (item.shiftChangeCents ?? 0) / 100,
    'بازکننده': item.openedByName,
    'بسته‌کننده': item.closedByName ?? '',
  }))

  const workbook = XLSX.utils.book_new()
  const txSheet = XLSX.utils.json_to_sheet(transactionRows)
  const shiftSheet = XLSX.utils.json_to_sheet(shiftRows)
  txSheet['!cols'] = [
    { wch: 17 },{ wch: 20 },{ wch: 16 },{ wch: 12 },{ wch: 48 },
    { wch: 24 },{ wch: 16 },{ wch: 20 },{ wch: 12 },{ wch: 14 },
    { wch: 18 },{ wch: 35 },
  ]
  shiftSheet['!cols'] = [
    { wch: 13 },{ wch: 20 },{ wch: 16 },{ wch: 20 },{ wch: 24 },
    { wch: 20 },{ wch: 14 },{ wch: 16 },{ wch: 18 },{ wch: 18 },
  ]
  XLSX.utils.book_append_sheet(workbook, txSheet, 'فعالیت‌ها')
  XLSX.utils.book_append_sheet(workbook, shiftSheet, 'شیفت‌ها')
  XLSX.writeFile(workbook, `Firouzeh_report_${new Date().toISOString().slice(0, 10)}.xlsx`)
}
