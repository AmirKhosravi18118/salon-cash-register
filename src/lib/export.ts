import * as XLSX from 'xlsx'
import { db, exportDatabase } from '../db'
import { downloadBlob, formatDate, formatTime } from './format'
import type { CashTransaction, TransactionDirection, WorkShift } from '../types'

export async function downloadJsonBackup(): Promise<void> {
  downloadBlob(
    `Firouzeh_backup_${new Date().toISOString().slice(0, 10)}.json`,
    new Blob([await exportDatabase()], {
      type: 'application/json;charset=utf-8',
    }),
  )
}

const transactionHeaders = [
  'شماره',
  'تاریخ',
  'ساعت',
  'نوع',
  'جهت',
  'خدمات',
  'کتگوری',
  'مبلغ خدمات',
  'مالیات موجود در مبلغ',
  'انعام',
  'مبلغ کل',
  'کاربر',
  'توضیحات',
]

function transactionLabel(kind: CashTransaction['kind']): string {
  const labels: Record<CashTransaction['kind'], string> = {
    service: 'خدمات',
    'extra-service': 'خدمات اضافه',
    expense: 'هزینه',
    deposit: 'ورودی',
    'bank-deposit': 'واریز به بانک',
    withdrawal: 'برداشت',
    refund: 'بازپرداخت',
    adjustment: 'اصلاح موجودی',
  }
  return labels[kind]
}

function transactionRows(transactions: CashTransaction[]) {
  return transactions.map((item) => ({
    'شماره': item.sequence,
    'تاریخ': formatDate(item.createdAt, false),
    'ساعت': formatTime(item.createdAt),
    'نوع': transactionLabel(item.kind),
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
}

function shiftRows(shifts: WorkShift[]) {
  return shifts.map((item) => ({
    'تاریخ': formatDate(item.openedAt, false),
    'ساعت شروع': formatTime(item.openedAt),
    'موجودی شروع': item.openingBalanceCents / 100,
    'ساعت پایان': item.closedAt ? formatTime(item.closedAt) : '',
    'موجودی سیستم هنگام بستن': (item.expectedClosingCents ?? 0) / 100,
    'موجودی شمارش‌شده': (item.countedClosingCents ?? 0) / 100,
    'اختلاف': (item.differenceCents ?? 0) / 100,
    'تغییر شیفت': (item.shiftChangeCents ?? 0) / 100,
    'بازکننده': item.openedByName,
    'بسته‌کننده': item.closedByName ?? '',
  }))
}

function prepareTransactionSheet(transactions: CashTransaction[]) {
  const sheet = XLSX.utils.json_to_sheet(transactionRows(transactions), {
    header: transactionHeaders,
  })

  sheet['!cols'] = [
    { wch: 17 }, { wch: 13 }, { wch: 10 }, { wch: 18 },
    { wch: 11 }, { wch: 46 }, { wch: 25 }, { wch: 16 },
    { wch: 22 }, { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 36 },
  ]

  if (sheet['!ref']) sheet['!autofilter'] = { ref: sheet['!ref'] }
  return sheet
}

function prepareShiftSheet(shifts: WorkShift[]) {
  const sheet = XLSX.utils.json_to_sheet(shiftRows(shifts))

  sheet['!cols'] = [
    { wch: 13 }, { wch: 11 }, { wch: 17 }, { wch: 11 },
    { wch: 25 }, { wch: 20 }, { wch: 14 }, { wch: 16 },
    { wch: 18 }, { wch: 18 },
  ]

  if (sheet['!ref']) sheet['!autofilter'] = { ref: sheet['!ref'] }
  return sheet
}

async function readReportData() {
  return Promise.all([
    db.transactions.orderBy('createdAt').toArray(),
    db.shifts.orderBy('openedAt').toArray(),
  ])
}

function writeWorkbook(
  sheets: Array<{ name: string; sheet: XLSX.WorkSheet }>,
  filename: string,
) {
  const workbook = XLSX.utils.book_new()
  sheets.forEach(({ name, sheet }) =>
    XLSX.utils.book_append_sheet(workbook, sheet, name))
  XLSX.writeFile(workbook, filename)
}

export async function downloadIncomeExcel(): Promise<void> {
  const [transactions] = await readReportData()
  const rows = transactions.filter((item) => item.direction === 'in')

  writeWorkbook(
    [{ name: 'ورودی‌ها', sheet: prepareTransactionSheet(rows) }],
    `Firouzeh_income_${new Date().toISOString().slice(0, 10)}.xlsx`,
  )
}

export async function downloadOutcomeExcel(): Promise<void> {
  const [transactions] = await readReportData()
  const rows = transactions.filter((item) => item.direction === 'out')

  writeWorkbook(
    [{ name: 'هزینه‌ها و خروجی‌ها', sheet: prepareTransactionSheet(rows) }],
    `Firouzeh_expenses_${new Date().toISOString().slice(0, 10)}.xlsx`,
  )
}

export async function downloadExcel(): Promise<void> {
  const [transactions, shifts] = await readReportData()

  const income = transactions.filter((item) => item.direction === 'in')
  const outcome = transactions.filter((item) => item.direction === 'out')

  writeWorkbook([
    { name: 'همه فعالیت‌ها', sheet: prepareTransactionSheet(transactions) },
    { name: 'ورودی‌ها', sheet: prepareTransactionSheet(income) },
    { name: 'هزینه‌ها و خروجی‌ها', sheet: prepareTransactionSheet(outcome) },
    { name: 'شیفت‌ها', sheet: prepareShiftSheet(shifts) },
  ], `Firouzeh_full_report_${new Date().toISOString().slice(0, 10)}.xlsx`)
}
