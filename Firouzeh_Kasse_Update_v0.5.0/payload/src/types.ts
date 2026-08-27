export type Locale = 'fa' | 'de'
export type RouteName =
  | 'dashboard' | 'sale' | 'movement' | 'cashbox'
  | 'transactions' | 'reports' | 'settings'

export type ServiceKind = 'service' | 'package'
export type TransactionKind =
  | 'sale' | 'expense' | 'owner_deposit' | 'owner_withdrawal'
  | 'bank_deposit' | 'refund' | 'adjustment'

export interface SalonService {
  id: string
  kind: ServiceKind
  nameFa: string
  nameDe: string
  categoryFa: string
  categoryDe: string
  priceCents: number
  active: boolean
  allowCustomPrice: boolean
  accent: string
  createdAt: string
  updatedAt: string
}

export interface SaleItem {
  serviceId: string
  nameFa: string
  nameDe: string
  quantity: number
  unitPriceCents: number
  totalCents: number
}

export interface CashTransaction {
  id: string
  sequence: string
  kind: TransactionKind
  amountCents: number
  tipCents: number
  cashEffectCents: number
  category: string
  note: string
  items: SaleItem[]
  sessionId: string
  createdAt: string
  isDemo?: boolean
}

export interface CashSession {
  id: string
  status: 'open' | 'closed'
  openingBalanceCents: number
  openedAt: string
  closedAt?: string
  expectedBalanceCents?: number
  countedBalanceCents?: number
  differenceCents?: number
}

export interface PriceHistory {
  id: string
  serviceId: string
  serviceNameFa: string
  serviceNameDe: string
  previousPriceCents: number
  newPriceCents: number
  changedAt: string
}

export interface AppSetting {
  key: string
  value: string
}

export interface DashboardSnapshot {
  openSession?: CashSession
  expectedBalanceCents: number
  todaySalesCents: number
  todayTipsCents: number
  todayExpensesCents: number
  todayNetCashCents: number
  monthSalesCents: number
  monthNetCashCents: number
  todayTransactionCount: number
  recentTransactions: CashTransaction[]
  dailySales: Array<{ date: string; value: number }>
}
