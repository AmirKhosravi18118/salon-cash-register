import Dexie, { type EntityTable } from 'dexie'
import type {
  AppSetting, AppTransaction, AppUser, CatalogItem, DashboardData,
  ItemKind, PriceHistory, PriceMode, ServiceLine, SessionUser, WorkSession,
} from './types'

class FirouzehDatabase extends Dexie {
  services!: EntityTable<CatalogItem, 'id'>
  transactions!: EntityTable<AppTransaction, 'id'>
  sessions!: EntityTable<WorkSession, 'id'>
  priceHistory!: EntityTable<PriceHistory, 'id'>
  settings!: EntityTable<AppSetting, 'key'>
  users!: EntityTable<AppUser, 'id'>

  constructor() {
    super('salon-kasse-db')

    // Original project schema.
    this.version(1).stores({
      services: '&id, kind, updatedAt',
      transactions: '&id, sequence, kind, createdAt, sessionId',
      sessions: '&id, status, openedAt',
      priceHistory: '&id, serviceId, changedAt',
      settings: '&key',
    })

    // Persian-only internal system with staff accounts and flexible pricing.
    this.version(2).stores({
      services: '&id, kind, category, priceMode, active, updatedAt',
      transactions: '&id, sequence, kind, createdAt, sessionId, userId',
      sessions: '&id, status, openedAt, openedByUserId',
      priceHistory: '&id, serviceId, changedAt',
      settings: '&key',
      users: '&id, &username, role, active, createdAt, updatedAt',
    })
  }
}

export const db = new FirouzehDatabase()

const APP_VERSION = '0.6.0-test'
const CATALOG_VERSION = 'firouzeh-public-cut-styling-2026-08-23'
const TAX_RATE = 19

const id = () => crypto.randomUUID()
const nowIso = () => new Date().toISOString()

const cutAndStyling: Array<{
  name: string
  minutes: number
  euros: number
  mode?: PriceMode
}> = [
  { name: 'Waschen & Schneiden Kurz', minutes: 60, euros: 29 },
  { name: 'Waschen & Schneiden Mittel', minutes: 60, euros: 35 },
  { name: 'Waschen & Schneiden Lang', minutes: 60, euros: 39 },
  { name: 'Föhnen Kurz', minutes: 60, euros: 25 },
  { name: 'Föhnen Mittel', minutes: 60, euros: 35 },
  { name: 'Föhnen Lang', minutes: 60, euros: 55 },
  { name: 'Waschen, Schneiden & Föhnen Kurz', minutes: 60, euros: 35 },
  { name: 'Waschen, Schneiden & Föhnen Mittel', minutes: 75, euros: 38 },
  { name: 'Waschen, Schneiden & Föhnen Lang', minutes: 90, euros: 44 },
  { name: 'Locken & Styling (Finish-Look) Kurz', minutes: 60, euros: 35 },
  { name: 'Locken & Styling (Finish-Look) Mittel', minutes: 60, euros: 45 },
  { name: 'Locken & Styling (Finish-Look) Lang', minutes: 60, euros: 59 },
]

function seedCatalogItems(): CatalogItem[] {
  const now = nowIso()
  return cutAndStyling.map((item) => ({
    id: id(),
    kind: 'service' as ItemKind,
    name: item.name,
    category: 'CUT & STYLING',
    durationMinutes: item.minutes,
    basePriceCents: item.euros * 100,
    priceMode: item.mode ?? 'fixed',
    active: true,
    createdAt: now,
    updatedAt: now,
  }))
}

export async function ensureAppData(): Promise<void> {
  await db.open()

  const catalogVersion = (await db.settings.get('catalogVersion'))?.value
  if (catalogVersion !== CATALOG_VERSION) {
    // Transactions keep their own item snapshots. Replacing the price list does
    // not alter previous records.
    await db.services.clear()
    await db.services.bulkAdd(seedCatalogItems())
    await db.settings.put({ key: 'catalogVersion', value: CATALOG_VERSION })
  }

  await db.settings.bulkPut([
    { key: 'appVersion', value: APP_VERSION },
    { key: 'salonName', value: 'Firouzeh_hair_beauty' },
    { key: 'taxRate', value: String(TAX_RATE) },
  ])

  if (!(await db.settings.get('sequence'))) {
    await db.settings.put({ key: 'sequence', value: '0' })
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let value = ''
  for (const byte of bytes) value += String.fromCharCode(byte)
  return btoa(value)
}

function base64ToBytes(value: string): Uint8Array {
  const decoded = atob(value)
  const bytes = new Uint8Array(decoded.length)
  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index)
  }
  return bytes
}

async function derivePassword(password: string, salt: Uint8Array): Promise<string> {
  const source = new TextEncoder().encode(password)
  const key = await crypto.subtle.importKey(
    'raw',
    source,
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 120_000,
      hash: 'SHA-256',
    },
    key,
    256,
  )
  return bytesToBase64(new Uint8Array(bits))
}

function sessionUser(user: AppUser): SessionUser {
  return {
    id: user.id,
    displayName: user.displayName,
    username: user.username,
    role: user.role,
  }
}

export async function hasManager(): Promise<boolean> {
  return Boolean(await db.users.where('role').equals('manager').first())
}

export async function createFirstManager(input: {
  displayName: string
  username: string
  password: string
}): Promise<SessionUser> {
  if (await hasManager()) throw new Error('MANAGER_EXISTS')

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const now = nowIso()
  const manager: AppUser = {
    id: id(),
    displayName: input.displayName.trim(),
    username: input.username.trim().toLowerCase(),
    role: 'manager',
    passwordHash: await derivePassword(input.password, salt),
    passwordSalt: bytesToBase64(salt),
    active: true,
    createdAt: now,
    updatedAt: now,
  }
  await db.users.add(manager)
  return sessionUser(manager)
}

export async function authenticate(
  username: string,
  password: string,
): Promise<SessionUser | undefined> {
  const normalized = username.trim().toLowerCase()
  const user = await db.users.where('username').equals(normalized).first()
  if (!user || !user.active) return undefined

  const candidate = await derivePassword(password, base64ToBytes(user.passwordSalt))
  if (candidate !== user.passwordHash) return undefined
  return sessionUser(user)
}


export async function getUserById(userId: string): Promise<SessionUser | undefined> {
  const user = await db.users.get(userId)
  if (!user || !user.active) return undefined
  return sessionUser(user)
}

export async function getUsers(): Promise<AppUser[]> {
  return db.users.orderBy('createdAt').toArray()
}

export async function saveEmployee(input: {
  id?: string
  displayName: string
  username: string
  password?: string
}): Promise<AppUser> {
  const normalized = input.username.trim().toLowerCase()
  const duplicate = await db.users.where('username').equals(normalized).first()
  if (duplicate && duplicate.id !== input.id) throw new Error('USERNAME_EXISTS')

  const existing = input.id ? await db.users.get(input.id) : undefined
  const now = nowIso()
  let passwordHash = existing?.passwordHash ?? ''
  let passwordSalt = existing?.passwordSalt ?? ''

  if (!existing || input.password) {
    if (!input.password || input.password.length < 6) throw new Error('WEAK_PASSWORD')
    const salt = crypto.getRandomValues(new Uint8Array(16))
    passwordSalt = bytesToBase64(salt)
    passwordHash = await derivePassword(input.password, salt)
  }

  const employee: AppUser = {
    id: existing?.id ?? id(),
    displayName: input.displayName.trim(),
    username: normalized,
    role: 'employee',
    passwordHash,
    passwordSalt,
    active: existing?.active ?? true,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  await db.users.put(employee)
  return employee
}

export async function toggleEmployee(userId: string): Promise<void> {
  const user = await db.users.get(userId)
  if (!user || user.role !== 'employee') return
  await db.users.put({ ...user, active: !user.active, updatedAt: nowIso() })
}

export async function deleteEmployee(userId: string): Promise<void> {
  const user = await db.users.get(userId)
  if (!user || user.role !== 'employee') return
  await db.users.delete(userId)
}

function normalizeCatalogItem(value: CatalogItem): CatalogItem {
  return {
    ...value,
    name: value.name || value.nameDe || value.nameFa || 'بدون نام',
    category: value.category || value.categoryDe || value.categoryFa || 'سایر',
    basePriceCents: value.basePriceCents ?? value.priceCents ?? 0,
    priceMode: value.priceMode
      ?? (value.allowCustomPrice ? 'from' : 'fixed'),
    active: value.active !== false,
  }
}

export async function getCatalogItems(): Promise<CatalogItem[]> {
  return (await db.services.toArray())
    .map(normalizeCatalogItem)
    .sort((a, b) =>
      a.category.localeCompare(b.category, 'de')
      || a.name.localeCompare(b.name, 'de'))
}

export async function createCatalogItem(kind: ItemKind = 'service'): Promise<CatalogItem> {
  const now = nowIso()
  return {
    id: id(),
    kind,
    name: '',
    category: '',
    durationMinutes: 60,
    basePriceCents: 0,
    priceMode: 'fixed',
    active: true,
    createdAt: now,
    updatedAt: now,
  }
}

export async function saveCatalogItem(
  input: CatalogItem,
  changedBy: string,
): Promise<void> {
  const existing = await db.services.get(input.id)
  const normalized = normalizeCatalogItem({
    ...input,
    name: input.name.trim(),
    category: input.category.trim(),
    updatedAt: nowIso(),
    createdAt: existing?.createdAt ?? input.createdAt ?? nowIso(),
  })

  await db.transaction('rw', db.services, db.priceHistory, async () => {
    const previous = existing ? normalizeCatalogItem(existing) : undefined
    if (previous && previous.basePriceCents !== normalized.basePriceCents) {
      await db.priceHistory.add({
        id: id(),
        serviceId: normalized.id,
        serviceName: normalized.name,
        previousPriceCents: previous.basePriceCents,
        newPriceCents: normalized.basePriceCents,
        changedAt: nowIso(),
        changedBy,
      })
    }
    await db.services.put(normalized)
  })
}

export async function deleteCatalogItem(itemId: string): Promise<void> {
  // Previous transactions store an immutable name/price snapshot and remain intact.
  await db.services.delete(itemId)
}

export async function getOpenSession(): Promise<WorkSession | undefined> {
  return db.sessions.where('status').equals('open').first()
}

export async function startWorkday(
  openingBalanceCents: number,
  user: SessionUser,
): Promise<WorkSession> {
  const existing = await getOpenSession()
  if (existing) return existing

  const session: WorkSession = {
    id: id(),
    status: 'open',
    openingBalanceCents,
    openedAt: nowIso(),
    openedByUserId: user.id,
    openedByName: user.displayName,
  }
  await db.sessions.add(session)
  return session
}

function transactionEffect(transaction: AppTransaction): number {
  return Number(transaction.cashEffectCents ?? 0)
}

export async function expectedBalance(session: WorkSession): Promise<number> {
  const transactions = await db.transactions
    .where('sessionId')
    .equals(session.id)
    .toArray()
  return session.openingBalanceCents
    + transactions.reduce((sum, transaction) =>
      sum + transactionEffect(transaction), 0)
}

export async function closeWorkday(
  countedBalanceCents: number,
  user: SessionUser,
): Promise<WorkSession> {
  const session = await getOpenSession()
  if (!session) throw new Error('NO_OPEN_SESSION')
  const expected = await expectedBalance(session)
  const closed: WorkSession = {
    ...session,
    status: 'closed',
    closedAt: nowIso(),
    closedByUserId: user.id,
    closedByName: user.displayName,
    expectedBalanceCents: expected,
    countedBalanceCents,
    differenceCents: countedBalanceCents - expected,
  }
  await db.sessions.put(closed)
  return closed
}

async function nextSequence(): Promise<string> {
  const current = Number((await db.settings.get('sequence'))?.value ?? 0)
  const next = current + 1
  await db.settings.put({ key: 'sequence', value: String(next) })
  return `${new Date().getFullYear()}-${String(next).padStart(6, '0')}`
}

export function includedTax(grossCents: number, rate = TAX_RATE): number {
  if (grossCents <= 0 || rate <= 0) return 0
  return Math.round(grossCents - (grossCents * 100) / (100 + rate))
}

export async function saveServiceTransaction(input: {
  items: ServiceLine[]
  discountCents: number
  tipCents: number
  sessionId: string
  user: SessionUser
}): Promise<AppTransaction> {
  const itemTotal = input.items.reduce((sum, item) => sum + item.totalCents, 0)
  const discount = Math.min(Math.max(input.discountCents, 0), itemTotal)
  const serviceGross = itemTotal - discount
  const total = serviceGross + Math.max(input.tipCents, 0)

  const transaction: AppTransaction = {
    id: id(),
    sequence: await nextSequence(),
    kind: 'service',
    amountCents: total,
    serviceGrossCents: serviceGross,
    discountCents: discount,
    taxRate: TAX_RATE,
    taxIncludedCents: includedTax(serviceGross, TAX_RATE),
    tipCents: Math.max(input.tipCents, 0),
    cashEffectCents: total,
    category: 'خدمات',
    note: '',
    items: input.items,
    sessionId: input.sessionId,
    userId: input.user.id,
    userName: input.user.displayName,
    createdAt: nowIso(),
  }
  await db.transactions.add(transaction)
  return transaction
}

export async function saveExpense(input: {
  amountCents: number
  category: string
  note: string
  sessionId: string
  user: SessionUser
}): Promise<AppTransaction> {
  const amount = Math.max(input.amountCents, 0)
  const transaction: AppTransaction = {
    id: id(),
    sequence: await nextSequence(),
    kind: 'expense',
    amountCents: amount,
    serviceGrossCents: 0,
    discountCents: 0,
    taxRate: TAX_RATE,
    taxIncludedCents: 0,
    tipCents: 0,
    cashEffectCents: -amount,
    category: input.category.trim() || 'هزینه',
    note: input.note.trim(),
    items: [],
    sessionId: input.sessionId,
    userId: input.user.id,
    userName: input.user.displayName,
    createdAt: nowIso(),
  }
  await db.transactions.add(transaction)
  return transaction
}

function berlinDay(value = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value)
}

function berlinMonth(value = new Date()): string {
  return berlinDay(value).slice(0, 7)
}

function isServiceTransaction(item: AppTransaction): boolean {
  return item.kind === 'service' || String(item.kind) === 'sale'
}

function serviceGross(item: AppTransaction): number {
  if (typeof item.serviceGrossCents === 'number') return item.serviceGrossCents
  return Math.max(0, Number(item.amountCents ?? 0) - Number(item.tipCents ?? 0))
}

export async function getDashboardData(): Promise<DashboardData> {
  const all = await db.transactions.orderBy('createdAt').reverse().toArray()
  const openSession = await getOpenSession()
  const day = berlinDay()
  const month = berlinMonth()
  const today = all.filter((item) => berlinDay(new Date(item.createdAt)) === day)
  const monthly = all.filter((item) => berlinMonth(new Date(item.createdAt)) === month)

  const services = (list: AppTransaction[]) =>
    list.filter(isServiceTransaction)
      .reduce((sum, item) => sum + serviceGross(item), 0)
  const tips = (list: AppTransaction[]) =>
    list.reduce((sum, item) => sum + Number(item.tipCents ?? 0), 0)
  const expenses = (list: AppTransaction[]) =>
    list.filter((item) => item.kind === 'expense')
      .reduce((sum, item) => sum + Number(item.amountCents ?? 0), 0)
  const net = (list: AppTransaction[]) =>
    list.reduce((sum, item) => sum + transactionEffect(item), 0)

  return {
    openSession,
    expectedBalanceCents: openSession ? await expectedBalance(openSession) : 0,
    todayServicesCents: services(today),
    todayTipsCents: tips(today),
    todayExpensesCents: expenses(today),
    todayNetCents: net(today),
    monthServicesCents: services(monthly),
    todayCount: today.length,
    recent: all.slice(0, 10),
  }
}

export async function getTransactions(): Promise<AppTransaction[]> {
  return db.transactions.orderBy('createdAt').reverse().toArray()
}

export async function exportBackup(): Promise<string> {
  return JSON.stringify({
    exportedAt: nowIso(),
    appVersion: APP_VERSION,
    salon: 'Firouzeh_hair_beauty',
    services: await db.services.toArray(),
    transactions: await db.transactions.toArray(),
    sessions: await db.sessions.toArray(),
    priceHistory: await db.priceHistory.toArray(),
    users: await db.users.toArray(),
    settings: await db.settings.toArray(),
  }, null, 2)
}
