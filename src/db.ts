import Dexie, { type EntityTable } from 'dexie'
import { defaultTheme, initialExpenseCategories, initialServiceCategories, initialServices } from './data'
import type {
  AppSetting, CashSession, CashTransaction, ExpenseCategory,
  MovementKind, Service, ServiceCategory, ThemeSettings, TransactionItem, User,
} from './types'

class FirouzehDB extends Dexie {
  users!: EntityTable<User, 'id'>
  serviceCategories!: EntityTable<ServiceCategory, 'id'>
  services!: EntityTable<Service, 'id'>
  expenseCategories!: EntityTable<ExpenseCategory, 'id'>
  transactions!: EntityTable<CashTransaction, 'id'>
  sessions!: EntityTable<CashSession, 'id'>
  settings!: EntityTable<AppSetting, 'key'>

  constructor() {
    super('firouzeh-salon-v080')
    this.version(1).stores({
      users: '&id, &username, role, active, createdAt',
      serviceCategories: '&id, name, order, active',
      services: '&id, categoryId, name, active, updatedAt',
      expenseCategories: '&id, name, order, active',
      transactions: '&id, sequence, kind, createdAt, sessionId, userId, categoryId',
      sessions: '&id, status, openedAt, closedAt',
      settings: '&key',
    })
  }
}

export const db = new FirouzehDB()
const uid = () => crypto.randomUUID()
const nowIso = () => new Date().toISOString()

export async function ensureSeedData(): Promise<void> {
  if (!(await db.serviceCategories.count())) {
    await db.serviceCategories.bulkPut(initialServiceCategories)
  }
  if (!(await db.services.count())) {
    await db.services.bulkPut(initialServices)
  }
  if (!(await db.expenseCategories.count())) {
    await db.expenseCategories.bulkPut(initialExpenseCategories)
  }
  await db.settings.bulkPut([
    { key: 'appVersion', value: '0.8.0-test' },
    { key: 'salonName', value: 'Firouzeh_hair_beauty' },
  ])
  if (!(await db.settings.get('theme'))) {
    await db.settings.put({ key: 'theme', value: JSON.stringify(defaultTheme) })
  }
  if (!(await db.settings.get('sequence'))) {
    await db.settings.put({ key: 'sequence', value: '0' })
  }
}

export async function getTheme(): Promise<ThemeSettings> {
  const setting = await db.settings.get('theme')
  if (!setting) return defaultTheme
  try {
    return { ...defaultTheme, ...JSON.parse(setting.value) as Partial<ThemeSettings> }
  } catch {
    return defaultTheme
  }
}

export async function saveTheme(theme: ThemeSettings): Promise<void> {
  await db.settings.put({ key: 'theme', value: JSON.stringify(theme) })
}

export async function hasUsers(): Promise<boolean> {
  return (await db.users.count()) > 0
}

export async function getOpenSession(): Promise<CashSession | undefined> {
  return db.sessions.where('status').equals('open').first()
}

export async function cashBalance(): Promise<number> {
  const transactions = await db.transactions.toArray()
  return transactions.reduce((sum, transaction) => sum + transaction.cashEffectCents, 0)
}

async function nextSequence(): Promise<string> {
  let sequence = ''
  await db.transaction('rw', db.settings, async () => {
    const current = Number((await db.settings.get('sequence'))?.value ?? 0)
    const next = current + 1
    await db.settings.put({ key: 'sequence', value: String(next) })
    sequence = `${new Date().getFullYear()}-${String(next).padStart(6, '0')}`
  })
  return sequence
}

interface AddTransactionInput {
  kind: MovementKind
  amountCents: number
  cashEffectCents: number
  tipCents?: number
  categoryId?: string
  categoryName?: string
  note?: string
  items?: TransactionItem[]
  sessionId?: string
  user: User
}

export async function addTransaction(input: AddTransactionInput): Promise<CashTransaction> {
  const transaction: CashTransaction = {
    id: uid(),
    sequence: await nextSequence(),
    kind: input.kind,
    amountCents: Math.abs(input.amountCents),
    cashEffectCents: input.cashEffectCents,
    tipCents: input.tipCents ?? 0,
    categoryId: input.categoryId,
    categoryName: input.categoryName ?? '',
    note: input.note ?? '',
    items: input.items ?? [],
    sessionId: input.sessionId,
    userId: input.user.id,
    userName: input.user.displayName,
    createdAt: nowIso(),
  }
  await db.transactions.add(transaction)
  return transaction
}

export async function openShift(countedBalanceCents: number, user: User): Promise<CashSession> {
  const existing = await getOpenSession()
  if (existing) return existing

  const systemBalance = await cashBalance()
  const difference = countedBalanceCents - systemBalance
  const session: CashSession = {
    id: uid(),
    status: 'open',
    openedAt: nowIso(),
    openedByUserId: user.id,
    openedByName: user.displayName,
    openingSystemCents: systemBalance,
    openingCountedCents: countedBalanceCents,
  }

  await db.sessions.add(session)
  if (difference !== 0) {
    await addTransaction({
      kind: 'adjustment',
      amountCents: Math.abs(difference),
      cashEffectCents: difference,
      categoryName: 'اصلاح موجودی ابتدای شیفت',
      note: 'تطبیق موجودی شمارش‌شده با موجودی سیستم',
      sessionId: session.id,
      user,
    })
  }
  return session
}

export async function closeShift(countedBalanceCents: number, user: User): Promise<CashSession> {
  const session = await getOpenSession()
  if (!session) throw new Error('NO_OPEN_SESSION')

  const expectedBeforeAdjustment = await cashBalance()
  const difference = countedBalanceCents - expectedBeforeAdjustment

  if (difference !== 0) {
    await addTransaction({
      kind: 'adjustment',
      amountCents: Math.abs(difference),
      cashEffectCents: difference,
      categoryName: 'اصلاح موجودی پایان شیفت',
      note: 'تطبیق موجودی شمارش‌شده پایان شیفت',
      sessionId: session.id,
      user,
    })
  }

  const closed: CashSession = {
    ...session,
    status: 'closed',
    closedAt: nowIso(),
    closedByUserId: user.id,
    closedByName: user.displayName,
    closingExpectedCents: expectedBeforeAdjustment,
    closingCountedCents: countedBalanceCents,
    differenceCents: difference,
    shiftChangeCents: countedBalanceCents - session.openingCountedCents,
  }
  await db.sessions.put(closed)
  return closed
}

export async function saveServiceOperation(input: {
  items: TransactionItem[]
  tipCents: number
  user: User
}): Promise<CashTransaction> {
  const session = await getOpenSession()
  if (!session) throw new Error('NO_OPEN_SESSION')
  const servicesTotal = input.items.reduce((sum, item) => sum + item.totalCents, 0)
  return addTransaction({
    kind: 'service',
    amountCents: servicesTotal + input.tipCents,
    cashEffectCents: servicesTotal + input.tipCents,
    tipCents: input.tipCents,
    categoryName: 'خدمات',
    items: input.items,
    sessionId: session.id,
    user: input.user,
  })
}

export async function saveMovement(input: {
  kind: Exclude<MovementKind, 'service'>
  amountCents: number
  categoryId?: string
  categoryName: string
  note: string
  user: User
}): Promise<CashTransaction> {
  const session = await getOpenSession()
  if (!session) throw new Error('NO_OPEN_SESSION')
  const incoming = input.kind === 'deposit' || input.kind === 'adjustment'
  return addTransaction({
    ...input,
    cashEffectCents: incoming ? input.amountCents : -input.amountCents,
    sessionId: session.id,
  })
}

export async function deleteService(serviceId: string): Promise<void> {
  await db.services.delete(serviceId)
}

export async function deleteServiceCategory(categoryId: string): Promise<void> {
  const used = await db.services.where('categoryId').equals(categoryId).count()
  if (used) throw new Error('CATEGORY_NOT_EMPTY')
  await db.serviceCategories.delete(categoryId)
}

export async function deleteExpenseCategory(categoryId: string): Promise<void> {
  await db.expenseCategories.delete(categoryId)
}

export async function exportAllData(): Promise<string> {
  const data = {
    version: '0.8.0-test',
    exportedAt: nowIso(),
    users: await db.users.toArray(),
    serviceCategories: await db.serviceCategories.toArray(),
    services: await db.services.toArray(),
    expenseCategories: await db.expenseCategories.toArray(),
    transactions: await db.transactions.toArray(),
    sessions: await db.sessions.toArray(),
    settings: await db.settings.toArray(),
  }
  return JSON.stringify(data, null, 2)
}
