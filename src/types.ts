export type Role = 'manager' | 'staff'
export type RouteName =
  | 'dashboard' | 'services' | 'checkout' | 'activities'
  | 'analytics' | 'cashbox' | 'settings'

export type PriceMode = 'fixed' | 'from'
export type MovementKind =
  | 'service' | 'expense' | 'deposit' | 'withdrawal'
  | 'bank' | 'refund' | 'adjustment'

export interface User {
  id: string
  displayName: string
  username: string
  passwordHash: string
  salt: string
  role: Role
  active: boolean
  createdAt: string
}

export interface ServiceCategory {
  id: string
  name: string
  order: number
  active: boolean
}

export interface Service {
  id: string
  categoryId: string
  name: string
  durationMinutes: number
  priceCents: number
  priceMode: PriceMode
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface ExpenseCategory {
  id: string
  name: string
  order: number
  active: boolean
}

export interface CartItem {
  id: string
  serviceId?: string
  categoryId?: string
  name: string
  basePriceCents: number
  unitPriceCents: number
  quantity: number
  custom: boolean
}

export interface TransactionItem {
  serviceId?: string
  categoryId?: string
  name: string
  basePriceCents: number
  unitPriceCents: number
  quantity: number
  totalCents: number
  custom: boolean
}

export interface CashTransaction {
  id: string
  sequence: string
  kind: MovementKind
  amountCents: number
  cashEffectCents: number
  tipCents: number
  categoryId?: string
  categoryName: string
  note: string
  items: TransactionItem[]
  sessionId?: string
  userId: string
  userName: string
  createdAt: string
}

export interface CashSession {
  id: string
  status: 'open' | 'closed'
  openedAt: string
  closedAt?: string
  openedByUserId: string
  openedByName: string
  closedByUserId?: string
  closedByName?: string
  openingSystemCents: number
  openingCountedCents: number
  closingExpectedCents?: number
  closingCountedCents?: number
  differenceCents?: number
  shiftChangeCents?: number
}

export interface ThemeSettings {
  primary: string
  secondary: string
  background: string
  surface: string
  text: string
  muted: string
  sidebar: string
  success: string
  danger: string
  radius: number
  shadow: number
  blur: number
  surfaceOpacity: number
  backgroundImage: string
  backgroundOpacity: number
}

export interface AppSetting {
  key: string
  value: string
}
