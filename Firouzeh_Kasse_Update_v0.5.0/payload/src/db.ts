import Dexie, { type EntityTable } from 'dexie'
import type {
  AppSetting,
  CashSession,
  CashTransaction,
  DashboardSnapshot,
  PriceHistory,
  SaleItem,
  SalonService,
  ServiceKind,
  TransactionKind,
} from './types'
import { localDayKey, localMonthKey } from './lib/format'

class SalonDatabase extends Dexie {
  services!: EntityTable<SalonService, 'id'>
  transactions!: EntityTable<CashTransaction, 'id'>
  sessions!: EntityTable<CashSession, 'id'>
  priceHistory!: EntityTable<PriceHistory, 'id'>
  settings!: EntityTable<AppSetting, 'key'>

  constructor() {
    super('salon-kasse-db')
    this.version(1).stores({
      services: '&id, kind, updatedAt',
      transactions: '&id, sequence, kind, createdAt, sessionId',
      sessions: '&id, status, openedAt',
      priceHistory: '&id, serviceId, changedAt',
      settings: '&key',
    })
  }
}

export const db = new SalonDatabase()

const colors = ['#d98ea0', '#d9a06f', '#a8847a', '#cda6aa', '#b68e72', '#d6b7a1']

const starterServices: Array<Omit<SalonService, 'id' | 'createdAt' | 'updatedAt'>> = [
  {
    kind: 'package',
    nameFa: 'شست‌وشو + کوتاهی + براشینگ',
    nameDe: 'Waschen + Schneiden + Föhnen',
    categoryFa: 'پکیج محبوب',
    categoryDe: 'Beliebtes Paket',
    priceCents: 5500,
    active: true,
    allowCustomPrice: false,
    accent: colors[0],
  },
  {
    kind: 'package',
    nameFa: 'رنگ ریشه + براشینگ',
    nameDe: 'Ansatzfarbe + Föhnen',
    categoryFa: 'پکیج رنگ',
    categoryDe: 'Farbpaket',
    priceCents: 6900,
    active: true,
    allowCustomPrice: true,
    accent: colors[1],
  },
  {
    kind: 'service',
    nameFa: 'کوتاهی زنانه',
    nameDe: 'Damenhaarschnitt',
    categoryFa: 'کوتاهی',
    categoryDe: 'Schnitt',
    priceCents: 3500,
    active: true,
    allowCustomPrice: false,
    accent: colors[2],
  },
  {
    kind: 'service',
    nameFa: 'براشینگ',
    nameDe: 'Föhnen',
    categoryFa: 'حالت‌دهی',
    categoryDe: 'Styling',
    priceCents: 2800,
    active: true,
    allowCustomPrice: true,
    accent: colors[3],
  },
  {
    kind: 'service',
    nameFa: 'رنگ ریشه',
    nameDe: 'Ansatzfarbe',
    categoryFa: 'رنگ مو',
    categoryDe: 'Farbe',
    priceCents: 4900,
    active: true,
    allowCustomPrice: true,
    accent: colors[4],
  },
  {
    kind: 'service',
    nameFa: 'رنگ کامل — موی کوتاه',
    nameDe: 'Komplettfarbe — Kurz',
    categoryFa: 'رنگ مو',
    categoryDe: 'Farbe',
    priceCents: 6000,
    active: true,
    allowCustomPrice: true,
    accent: colors[5],
  },
  {
    kind: 'service',
    nameFa: 'رنگ کامل — موی متوسط',
    nameDe: 'Komplettfarbe — Mittel',
    categoryFa: 'رنگ مو',
    categoryDe: 'Farbe',
    priceCents: 8000,
    active: true,
    allowCustomPrice: true,
    accent: colors[0],
  },
  {
    kind: 'service',
    nameFa: 'رنگ کامل — موی بلند',
    nameDe: 'Komplettfarbe — Lang',
    categoryFa: 'رنگ مو',
    categoryDe: 'Farbe',
    priceCents: 11000,
    active: true,
    allowCustomPrice: true,
    accent: colors[1],
  },
  {
    kind: 'service',
    nameFa: 'اصلاح و طراحی ابرو',
    nameDe: 'Augenbrauen formen',
    categoryFa: 'ابرو',
    categoryDe: 'Augenbrauen',
    priceCents: 1500,
    active: true,
    allowCustomPrice: false,
    accent: colors[2],
  },
  {
    kind: 'service',
    nameFa: 'کراتین موی بلند',
    nameDe: 'Keratinbehandlung — Lang',
    categoryFa: 'احیا و کراتین',
    categoryDe: 'Keratin',
    priceCents: 18000,
    active: true,
    allowCustomPrice: true,
    accent: colors[3],
  },
]

const id = () => crypto.randomUUID()
const nowIso = () => new Date().toISOString()

export async function ensureSeedData(): Promise<void> {
  if (await db.services.count()) {
    await db.settings.bulkPut([
      { key: 'appVersion', value: '0.5.0-test' },
      { key: 'salonName', value: 'Firouzeh_hair_beauty' },
    ])
    return
  }

  const now = nowIso()
  await db.services.bulkAdd(starterServices.map((service) => ({
    ...service,
    id: id(),
    createdAt: now,
    updatedAt: now,
  })))

  await db.settings.bulkPut([
    { key: 'sequence', value: '0' },
    { key: 'locale', value: 'fa' },
    { key: 'appVersion', value: '0.5.0-test' },
    { key: 'salonName', value: 'Firouzeh_hair_beauty' },
  ])

  const session = await openCashSession(10000)
  const services = await db.services.toArray()
  const haircut = services.find((service) => service.nameDe === 'Damenhaarschnitt')
  const packageItem = services.find((service) => service.kind === 'package')
  const brow = services.find((service) => service.nameDe === 'Augenbrauen formen')

  if (haircut && packageItem && brow) {
    await addTransaction({
      kind: 'sale',
      amountCents: 4000,
      tipCents: 500,
      cashEffectCents: 4000,
      category: 'Services',
      note: '',
      sessionId: session.id,
      isDemo: true,
      items: [{
        serviceId: haircut.id,
        nameFa: haircut.nameFa,
        nameDe: haircut.nameDe,
        quantity: 1,
        unitPriceCents: 3500,
        totalCents: 3500,
      }],
    })
    await addTransaction({
      kind: 'sale',
      amountCents: 5800,
      tipCents: 300,
      cashEffectCents: 5800,
      category: 'Packages',
      note: '',
      sessionId: session.id,
      isDemo: true,
      items: [{
        serviceId: packageItem.id,
        nameFa: packageItem.nameFa,
        nameDe: packageItem.nameDe,
        quantity: 1,
        unitPriceCents: 5500,
        totalCents: 5500,
      }],
    })
    await addTransaction({
      kind: 'sale',
      amountCents: 1500,
      tipCents: 0,
      cashEffectCents: 1500,
      category: 'Services',
      note: '',
      sessionId: session.id,
      isDemo: true,
      items: [{
        serviceId: brow.id,
        nameFa: brow.nameFa,
        nameDe: brow.nameDe,
        quantity: 1,
        unitPriceCents: 1500,
        totalCents: 1500,
      }],
    })
    await addTransaction({
      kind: 'expense',
      amountCents: 2450,
      tipCents: 0,
      cashEffectCents: -2450,
      category: 'Material',
      note: 'Test / Demo',
      sessionId: session.id,
      isDemo: true,
      items: [],
    })
  }
}

export async function getOpenSession(): Promise<CashSession | undefined> {
  return db.sessions.where('status').equals('open').first()
}

export async function openCashSession(openingBalanceCents: number): Promise<CashSession> {
  const existing = await getOpenSession()
  if (existing) return existing

  const session: CashSession = {
    id: id(),
    status: 'open',
    openingBalanceCents,
    openedAt: nowIso(),
  }
  await db.sessions.add(session)
  return session
}

export async function expectedBalance(session: CashSession): Promise<number> {
  const transactions = await db.transactions.where('sessionId').equals(session.id).toArray()
  return session.openingBalanceCents
    + transactions.reduce((sum, transaction) => sum + transaction.cashEffectCents, 0)
}

export async function closeCashSession(countedBalanceCents: number): Promise<CashSession> {
  const session = await getOpenSession()
  if (!session) throw new Error('NO_OPEN_SESSION')

  const expected = await expectedBalance(session)
  const closed: CashSession = {
    ...session,
    status: 'closed',
    closedAt: nowIso(),
    expectedBalanceCents: expected,
    countedBalanceCents,
    differenceCents: countedBalanceCents - expected,
  }
  await db.sessions.put(closed)
  return closed
}

interface TransactionInput {
  kind: TransactionKind
  amountCents: number
  tipCents?: number
  cashEffectCents: number
  category?: string
  note?: string
  items?: SaleItem[]
  sessionId: string
  isDemo?: boolean
}

export async function addTransaction(input: TransactionInput): Promise<CashTransaction> {
  let saved!: CashTransaction

  await db.transaction('rw', db.transactions, db.settings, async () => {
    const current = Number((await db.settings.get('sequence'))?.value ?? 0)
    const next = current + 1
    await db.settings.put({ key: 'sequence', value: String(next) })

    saved = {
      id: id(),
      sequence: `${new Date().getFullYear()}-${String(next).padStart(6, '0')}`,
      kind: input.kind,
      amountCents: Math.abs(input.amountCents),
      tipCents: input.tipCents ?? 0,
      cashEffectCents: input.cashEffectCents,
      category: input.category ?? '',
      note: input.note ?? '',
      items: input.items ?? [],
      sessionId: input.sessionId,
      createdAt: nowIso(),
      isDemo: input.isDemo,
    }
    await db.transactions.add(saved)
  })

  return saved
}

export async function saveSale(input: {
  items: SaleItem[]
  tipCents: number
  sessionId: string
}): Promise<CashTransaction> {
  const subtotal = input.items.reduce((sum, item) => sum + item.totalCents, 0)
  const total = subtotal + input.tipCents

  return addTransaction({
    kind: 'sale',
    amountCents: total,
    tipCents: input.tipCents,
    cashEffectCents: total,
    category: 'Services',
    items: input.items,
    sessionId: input.sessionId,
  })
}

export async function saveCashMovement(input: {
  kind: Exclude<TransactionKind, 'sale'>
  amountCents: number
  category: string
  note: string
  sessionId: string
}): Promise<CashTransaction> {
  const effect = input.kind === 'owner_deposit' || input.kind === 'adjustment'
    ? input.amountCents
    : -input.amountCents

  return addTransaction({ ...input, cashEffectCents: effect })
}

export async function dashboardSnapshot(): Promise<DashboardSnapshot> {
  const openSession = await getOpenSession()
  const all = await db.transactions.orderBy('createdAt').reverse().toArray()
  const today = localDayKey()
  const month = localMonthKey()

  const todayTransactions = all.filter(
    (transaction) => localDayKey(new Date(transaction.createdAt)) === today,
  )
  const monthTransactions = all.filter(
    (transaction) => localMonthKey(new Date(transaction.createdAt)) === month,
  )

  const sales = (list: CashTransaction[]) => list
    .filter((item) => item.kind === 'sale')
    .reduce((sum, item) => sum + item.amountCents - item.tipCents, 0)
  const tips = (list: CashTransaction[]) => list
    .filter((item) => item.kind === 'sale')
    .reduce((sum, item) => sum + item.tipCents, 0)
  const expenses = (list: CashTransaction[]) => list
    .filter((item) => item.kind === 'expense')
    .reduce((sum, item) => sum + item.amountCents, 0)
  const net = (list: CashTransaction[]) =>
    list.reduce((sum, item) => sum + item.cashEffectCents, 0)

  const dailySales = Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - index))
    const key = localDayKey(date)
    const value = all
      .filter((transaction) =>
        transaction.kind === 'sale'
        && localDayKey(new Date(transaction.createdAt)) === key)
      .reduce((sum, transaction) =>
        sum + transaction.amountCents - transaction.tipCents, 0)
    return { date: key, value }
  })

  return {
    openSession,
    expectedBalanceCents: openSession ? await expectedBalance(openSession) : 0,
    todaySalesCents: sales(todayTransactions),
    todayTipsCents: tips(todayTransactions),
    todayExpensesCents: expenses(todayTransactions),
    todayNetCashCents: net(todayTransactions),
    monthSalesCents: sales(monthTransactions),
    monthNetCashCents: net(monthTransactions),
    todayTransactionCount: todayTransactions.length,
    recentTransactions: all.slice(0, 6),
    dailySales,
  }
}

export async function saveService(
  input: Omit<SalonService, 'createdAt' | 'updatedAt'>
    & Partial<Pick<SalonService, 'createdAt'>>,
): Promise<SalonService> {
  const existing = await db.services.get(input.id)
  const now = nowIso()
  const saved: SalonService = {
    ...input,
    createdAt: existing?.createdAt ?? input.createdAt ?? now,
    updatedAt: now,
  }

  await db.transaction('rw', db.services, db.priceHistory, async () => {
    if (existing && existing.priceCents !== saved.priceCents) {
      await db.priceHistory.add({
        id: id(),
        serviceId: saved.id,
        serviceNameFa: saved.nameFa,
        serviceNameDe: saved.nameDe,
        previousPriceCents: existing.priceCents,
        newPriceCents: saved.priceCents,
        changedAt: now,
      })
    }
    await db.services.put(saved)
  })

  return saved
}

export async function deleteService(serviceId: string): Promise<void> {
  // Sale items keep their own name and price snapshots. Removing a catalog
  // entry therefore does not alter previous sales or financial reports.
  await db.services.delete(serviceId)
}

export async function createService(kind: ServiceKind): Promise<SalonService> {
  const now = nowIso()
  return {
    id: id(),
    kind,
    nameFa: '',
    nameDe: '',
    categoryFa: '',
    categoryDe: '',
    priceCents: 0,
    active: true,
    allowCustomPrice: false,
    accent: kind === 'package' ? '#d98ea0' : '#b68e72',
    createdAt: now,
    updatedAt: now,
  }
}

export async function exportBackup(): Promise<string> {
  return JSON.stringify({
    exportedAt: nowIso(),
    version: '0.5.0-test',
    salon: 'Firouzeh_hair_beauty',
    services: await db.services.toArray(),
    transactions: await db.transactions.toArray(),
    sessions: await db.sessions.toArray(),
    priceHistory: await db.priceHistory.toArray(),
    settings: await db.settings.toArray(),
  }, null, 2)
}

export async function importBackup(content: string): Promise<void> {
  const imported = JSON.parse(content) as {
    services?: SalonService[]
    transactions?: CashTransaction[]
    sessions?: CashSession[]
    priceHistory?: PriceHistory[]
    settings?: AppSetting[]
  }

  if (!Array.isArray(imported.services) || !Array.isArray(imported.transactions)) {
    throw new Error('INVALID_BACKUP')
  }

  await db.transaction(
    'rw',
    [db.services, db.transactions, db.sessions, db.priceHistory, db.settings],
    async () => {
      await Promise.all([
        db.services.clear(),
        db.transactions.clear(),
        db.sessions.clear(),
        db.priceHistory.clear(),
        db.settings.clear(),
      ])
      await db.services.bulkPut(imported.services ?? [])
      await db.transactions.bulkPut(imported.transactions ?? [])
      await db.sessions.bulkPut(imported.sessions ?? [])
      await db.priceHistory.bulkPut(imported.priceHistory ?? [])
      await db.settings.bulkPut(imported.settings ?? [])
    },
  )
}

export async function resetDemoData(): Promise<void> {
  await db.delete()
  await db.open()
  await ensureSeedData()
}
