export type UserRole = 'manager' | 'employee'
export type AppView = 'dashboard' | 'services' | 'activity' | 'settings'
export type ItemKind = 'service' | 'package'
export type PriceMode = 'fixed' | 'from'
export type TransactionKind =
  | 'service'
  | 'expense'
  | 'owner_deposit'
  | 'owner_withdrawal'
  | 'bank_deposit'
  | 'refund'
  | 'adjustment'

export interface CatalogItem {
  id: string
  kind: ItemKind
  name: string
  category: string
  durationMinutes?: number
  basePriceCents: number
  priceMode: PriceMode
  active: boolean
  createdAt: string
  updatedAt: string

  // Legacy fields are kept optional so an old IndexedDB can be migrated safely.
  nameFa?: string
  nameDe?: string
  categoryFa?: string
  categoryDe?: string
  priceCents?: number
  allowCustomPrice?: boolean
  accent?: string
}

export interface AppUser {
  id: string
  displayName: string
  username: string
  role: UserRole
  passwordHash: string
  passwordSalt: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface SessionUser {
  id: string
  displayName: string
  username: string
  role: UserRole
}

export interface ServiceLine {
  serviceId: string
  name: string
  category: string
  quantity: number
  unitPriceCents: number
  basePriceCents: number
  priceMode: PriceMode
  totalCents: number

  // Legacy snapshots
  nameFa?: string
  nameDe?: string
}

export interface AppTransaction {
  id: string
  sequence: string
  kind: TransactionKind
  amountCents: number
  serviceGrossCents: number
  discountCents: number
  taxRate: number
  taxIncludedCents: number
  tipCents: number
  cashEffectCents: number
  category: string
  note: string
  items: ServiceLine[]
  sessionId: string
  userId?: string
  userName?: string
  createdAt: string
  isDemo?: boolean
}

export interface WorkSession {
  id: string
  status: 'open' | 'closed'
  openingBalanceCents: number
  openedAt: string
  openedByUserId?: string
  openedByName?: string
  closedAt?: string
  closedByUserId?: string
  closedByName?: string
  expectedBalanceCents?: number
  countedBalanceCents?: number
  differenceCents?: number
}

export interface PriceHistory {
  id: string
  serviceId: string
  serviceName: string
  previousPriceCents: number
  newPriceCents: number
  changedAt: string
  changedBy?: string

  // Legacy fields
  serviceNameFa?: string
  serviceNameDe?: string
}

export interface AppSetting {
  key: string
  value: string
}

export interface DashboardData {
  openSession?: WorkSession
  expectedBalanceCents: number
  todayServicesCents: number
  todayTipsCents: number
  todayExpensesCents: number
  todayNetCents: number
  monthServicesCents: number
  todayCount: number
  recent: AppTransaction[]
}
