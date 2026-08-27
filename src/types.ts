export type Role = 'manager' | 'employee'
export type RouteName =
  | 'dashboard' | 'services' | 'activities'
  | 'analytics' | 'cashbox' | 'settings'

export type PricingMode = 'fixed' | 'from'
export type TransactionDirection = 'in' | 'out'
export type TransactionKind =
  | 'service' | 'extra-service' | 'expense'
  | 'deposit' | 'bank-deposit' | 'withdrawal'
  | 'refund' | 'adjustment'

export interface UserAccount {
  id: string
  name: string
  username: string
  passwordHash: string
  passwordSalt: string
  role: Role
  active: boolean
  createdAt: string
  lastLoginAt?: string
}

export interface ServiceCategory {
  id: string
  name: string
  active: boolean
  sortOrder: number
}

export interface ExpenseCategory {
  id: string
  name: string
  active: boolean
  sortOrder: number
}

export interface SalonService {
  id: string
  categoryId: string
  name: string
  duration: string
  priceCents: number
  pricingMode: PricingMode
  active: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface CartItem {
  cartId: string
  serviceId?: string
  categoryId?: string
  name: string
  quantity: number
  unitPriceCents: number
  defaultPriceCents: number
  pricingMode: PricingMode | 'manual'
}

export interface TransactionItem {
  serviceId?: string
  categoryId?: string
  name: string
  quantity: number
  unitPriceCents: number
  totalCents: number
}

export interface CashTransaction {
  id: string
  sequence: string
  kind: TransactionKind
  direction: TransactionDirection
  amountCents: number
  serviceSubtotalCents: number
  taxIncludedCents: number
  tipCents: number
  note: string
  categoryId?: string
  categoryName?: string
  items: TransactionItem[]
  shiftId?: string
  userId: string
  userName: string
  createdAt: string
}

export interface WorkShift {
  id: string
  status: 'open' | 'closed'
  openedAt: string
  openedByUserId: string
  openedByName: string
  openingBalanceCents: number
  closedAt?: string
  closedByUserId?: string
  closedByName?: string
  expectedClosingCents?: number
  countedClosingCents?: number
  differenceCents?: number
  shiftChangeCents?: number
}

export interface AppSetting {
  key: string
  value: string
}

export interface ThemeSettings {
  primary: string
  secondary: string
  background: string
  surface: string
  text: string
  muted: string
  success: string
  danger: string
  sidebar: string
  radius: number
  shadow: number
  blur: number
  surfaceOpacity: number
  backgroundImage: string
  backgroundImageOpacity: number
}

export interface DashboardData {
  cashBalanceCents: number
  openShift?: WorkShift
  monthServiceCents: number
  monthTipCents: number
  monthExpenseCents: number
  monthNetCents: number
  recentTransactions: CashTransaction[]
}

export interface AuthSession {
  userId: string
  createdAt: string
}
