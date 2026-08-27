import Dexie, { type EntityTable } from 'dexie'
import { starterExpenseCategories, starterServiceCategories, starterServices } from './data'
import { calculateIncludedTax, localMonthKey, uid } from './lib/format'
import type {
  AppSetting, CartItem, CashTransaction, DashboardData, ExpenseCategory,
  SalonService, ServiceCategory, TransactionDirection, TransactionItem,
  TransactionKind, UserAccount, WorkShift,
} from './types'

class FirouzehDatabase extends Dexie {
  users!: EntityTable<UserAccount, 'id'>
  serviceCategories!: EntityTable<ServiceCategory, 'id'>
  services!: EntityTable<SalonService, 'id'>
  expenseCategories!: EntityTable<ExpenseCategory, 'id'>
  transactions!: EntityTable<CashTransaction, 'id'>
  shifts!: EntityTable<WorkShift, 'id'>
  settings!: EntityTable<AppSetting, 'key'>

  constructor() {
    super('firouzeh-salon-v090')
    this.version(1).stores({
      users: '&id, &username, role, active, createdAt',
      serviceCategories: '&id, name, active, sortOrder',
      services: '&id, categoryId, active, sortOrder, updatedAt',
      expenseCategories: '&id, name, active, sortOrder',
      transactions: '&id, sequence, kind, direction, createdAt, shiftId, userId, categoryId',
      shifts: '&id, status, openedAt',
      settings: '&key',
    })
  }
}

export const db = new FirouzehDatabase()

const nowIso = () => new Date().toISOString()

export async function ensureDatabase(): Promise<void> {
  if (!await db.serviceCategories.count()) {
    await db.serviceCategories.bulkAdd(starterServiceCategories)
  }
  if (!await db.services.count()) {
    await db.services.bulkAdd(starterServices)
  }
  if (!await db.expenseCategories.count()) {
    await db.expenseCategories.bulkAdd(starterExpenseCategories)
  }
  if (!await db.settings.get('cashBalanceCents')) {
    await db.settings.put({ key: 'cashBalanceCents', value: '0' })
  }
  if (!await db.settings.get('sequence')) {
    await db.settings.put({ key: 'sequence', value: '0' })
  }
  await db.settings.put({ key: 'appVersion', value: '0.9.0-test' })
}

export async function getCashBalance(): Promise<number> {
  return Number((await db.settings.get('cashBalanceCents'))?.value ?? 0)
}

async function setCashBalance(value: number): Promise<void> {
  await db.settings.put({ key: 'cashBalanceCents', value: String(Math.round(value)) })
}

export async function getOpenShift(): Promise<WorkShift | undefined> {
  return db.shifts.where('status').equals('open').first()
}

export async function openShift(user: UserAccount, initialBalance?: number): Promise<WorkShift> {
  const existing = await getOpenShift()
  if (existing) return existing

  const shiftCount = await db.shifts.count()
  let cashBalance = await getCashBalance()
  if (shiftCount === 0 && await db.transactions.count() === 0 && initialBalance !== undefined) {
    cashBalance = Math.max(0, Math.round(initialBalance))
    await setCashBalance(cashBalance)
  }

  const shift: WorkShift = {
    id: uid('shift'),
    status: 'open',
    openedAt: nowIso(),
    openedByUserId: user.id,
    openedByName: user.name,
    openingBalanceCents: cashBalance,
  }
  await db.shifts.add(shift)
  return shift
}

export async function closeShift(
  user: UserAccount,
  countedBalanceCents: number,
): Promise<WorkShift> {
  const shift = await getOpenShift()
  if (!shift) throw new Error('NO_OPEN_SHIFT')

  const expected = await getCashBalance()
  const counted = Math.max(0, Math.round(countedBalanceCents))
  const difference = counted - expected
  const closedAt = nowIso()

  const closed: WorkShift = {
    ...shift,
    status: 'closed',
    closedAt,
    closedByUserId: user.id,
    closedByName: user.name,
    expectedClosingCents: expected,
    countedClosingCents: counted,
    differenceCents: difference,
    shiftChangeCents: counted - shift.openingBalanceCents,
  }

  await db.transaction('rw', db.shifts, db.settings, db.transactions, async () => {
    await db.shifts.put(closed)
    if (difference !== 0) {
      await addTransactionInside({
        kind: 'adjustment',
        direction: difference >= 0 ? 'in' : 'out',
        amountCents: Math.abs(difference),
        serviceSubtotalCents: 0,
        taxIncludedCents: 0,
        tipCents: 0,
        note: 'اصلاح اختلاف پایان شیفت',
        items: [],
        categoryName: 'اصلاح موجودی',
        user,
        shiftId: shift.id,
        updateBalance: false,
      })
    }
    await setCashBalance(counted)
  })

  return closed
}

interface TransactionInput {
  kind: TransactionKind
  direction: TransactionDirection
  amountCents: number
  serviceSubtotalCents?: number
  taxIncludedCents?: number
  tipCents?: number
  note?: string
  categoryId?: string
  categoryName?: string
  items?: TransactionItem[]
  user: UserAccount
  shiftId?: string
  updateBalance?: boolean
}

async function nextSequence(): Promise<string> {
  const current = Number((await db.settings.get('sequence'))?.value ?? 0)
  const next = current + 1
  await db.settings.put({ key: 'sequence', value: String(next) })
  return `${new Date().getFullYear()}-${String(next).padStart(6, '0')}`
}

async function addTransactionInside(input: TransactionInput): Promise<CashTransaction> {
  const amount = Math.max(0, Math.round(input.amountCents))
  const transaction: CashTransaction = {
    id: uid('transaction'),
    sequence: await nextSequence(),
    kind: input.kind,
    direction: input.direction,
    amountCents: amount,
    serviceSubtotalCents: input.serviceSubtotalCents ?? 0,
    taxIncludedCents: input.taxIncludedCents ?? 0,
    tipCents: input.tipCents ?? 0,
    note: input.note?.trim() ?? '',
    categoryId: input.categoryId,
    categoryName: input.categoryName,
    items: input.items ?? [],
    shiftId: input.shiftId,
    userId: input.user.id,
    userName: input.user.name,
    createdAt: nowIso(),
  }
  await db.transactions.add(transaction)

  if (input.updateBalance !== false) {
    const current = await getCashBalance()
    await setCashBalance(
      input.direction === 'in' ? current + amount : Math.max(0, current - amount),
    )
  }
  return transaction
}

export async function addTransaction(input: TransactionInput): Promise<CashTransaction> {
  let saved!: CashTransaction
  await db.transaction('rw', db.transactions, db.settings, async () => {
    saved = await addTransactionInside(input)
  })
  return saved
}

export async function recordServicePayment(input: {
  cart: CartItem[]
  tipCents: number
  user: UserAccount
  receivedCents: number
}): Promise<CashTransaction> {
  const shift = await getOpenShift()
  if (!shift) throw new Error('SHIFT_CLOSED')

  const items: TransactionItem[] = input.cart.map((item) => ({
    serviceId: item.serviceId,
    categoryId: item.categoryId,
    name: item.name,
    quantity: item.quantity,
    unitPriceCents: item.unitPriceCents,
    totalCents: item.unitPriceCents * item.quantity,
  }))
  const subtotal = items.reduce((sum, item) => sum + item.totalCents, 0)
  const tip = Math.max(0, input.tipCents)
  const total = subtotal + tip
  if (!items.length || input.receivedCents < total) throw new Error('INVALID_PAYMENT')

  return addTransaction({
    kind: items.every((item) => !item.serviceId) ? 'extra-service' : 'service',
    direction: 'in',
    amountCents: total,
    serviceSubtotalCents: subtotal,
    taxIncludedCents: calculateIncludedTax(subtotal),
    tipCents: tip,
    items,
    user: input.user,
    shiftId: shift.id,
  })
}

export async function recordActivity(input: {
  direction: TransactionDirection
  kind: TransactionKind
  amountCents: number
  categoryId?: string
  categoryName?: string
  note: string
  user: UserAccount
}): Promise<CashTransaction> {
  const shift = await getOpenShift()
  return addTransaction({
    ...input,
    serviceSubtotalCents: 0,
    taxIncludedCents: 0,
    tipCents: 0,
    items: [],
    shiftId: shift?.id,
  })
}

export async function dashboardData(): Promise<DashboardData> {
  const [cashBalanceCents, openShiftValue, transactions] = await Promise.all([
    getCashBalance(),
    getOpenShift(),
    db.transactions.orderBy('createdAt').reverse().toArray(),
  ])
  const month = localMonthKey()
  const monthItems = transactions.filter((item) =>
    localMonthKey(new Date(item.createdAt)) === month)

  const monthServiceCents = monthItems
    .filter((item) => item.kind === 'service' || item.kind === 'extra-service')
    .reduce((sum, item) => sum + item.serviceSubtotalCents, 0)
  const monthTipCents = monthItems.reduce((sum, item) => sum + item.tipCents, 0)
  const monthExpenseCents = monthItems
    .filter((item) => item.direction === 'out')
    .reduce((sum, item) => sum + item.amountCents, 0)
  const monthNetCents = monthItems.reduce(
    (sum, item) => sum + (item.direction === 'in' ? item.amountCents : -item.amountCents), 0)

  return {
    cashBalanceCents,
    openShift: openShiftValue,
    monthServiceCents,
    monthTipCents,
    monthExpenseCents,
    monthNetCents,
    recentTransactions: transactions.slice(0, 6),
  }
}

export async function saveService(value: SalonService): Promise<void> {
  await db.services.put({ ...value, updatedAt: nowIso() })
}

export async function saveServiceCategory(value: ServiceCategory): Promise<void> {
  await db.serviceCategories.put(value)
}

export async function saveExpenseCategory(value: ExpenseCategory): Promise<void> {
  await db.expenseCategories.put(value)
}

export async function deleteService(id: string): Promise<void> {
  await db.services.delete(id)
}

export async function deleteServiceCategory(id: string): Promise<void> {
  const used = await db.services.where('categoryId').equals(id).count()
  if (used) throw new Error('CATEGORY_IN_USE')
  await db.serviceCategories.delete(id)
}

export async function deleteExpenseCategory(id: string): Promise<void> {
  await db.expenseCategories.delete(id)
}

export async function exportDatabase(): Promise<string> {
  return JSON.stringify({
    version: '0.9.0-test',
    exportedAt: nowIso(),
    users: await db.users.toArray(),
    serviceCategories: await db.serviceCategories.toArray(),
    services: await db.services.toArray(),
    expenseCategories: await db.expenseCategories.toArray(),
    transactions: await db.transactions.toArray(),
    shifts: await db.shifts.toArray(),
    settings: await db.settings.toArray(),
  }, null, 2)
}
