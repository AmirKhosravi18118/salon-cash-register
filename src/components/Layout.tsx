import {
  Activity, BarChart3, LayoutDashboard, LogOut, Palette,
  Scissors, Settings, ShoppingCart, WalletCards,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type { RouteName, User } from '../types'

export function navigate(route: RouteName): void {
  window.location.hash = `/${route}`
}

const nav = [
  { route: 'dashboard' as const, label: 'داشبورد', icon: LayoutDashboard, manager: true },
  { route: 'services' as const, label: 'خدمات', icon: Scissors, manager: false },
  { route: 'activities' as const, label: 'فعالیت‌ها', icon: Activity, manager: true },
  { route: 'analytics' as const, label: 'تحلیل داده‌ها', icon: BarChart3, manager: true },
  { route: 'cashbox' as const, label: 'شیفت', icon: WalletCards, manager: false },
  { route: 'settings' as const, label: 'تنظیمات', icon: Settings, manager: true },
]

export function Layout({
  user, route, cartCount, children, onLogout, onOpenCart,
}: {
  user: User
  route: RouteName
  cartCount: number
  children: ReactNode
  onLogout: () => void
  onOpenCart: () => void
}) {
  const allowed = nav.filter((item) => user.role === 'manager' || !item.manager)
  const mobileLeft = user.role === 'manager'
    ? allowed.filter((item) => item.route === 'dashboard' || item.route === 'services')
    : allowed.filter((item) => item.route === 'services')
  const mobileRight = user.role === 'manager'
    ? allowed.filter((item) => item.route === 'analytics' || item.route === 'settings')
    : allowed.filter((item) => item.route === 'cashbox')
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">FH</div>
          <div><strong>Firouzeh</strong><small>پنل داخلی سالن</small></div>
        </div>

        <nav className="side-nav">
          {allowed.map(({ route: itemRoute, label, icon: Icon }) => (
            <button
              key={itemRoute}
              type="button"
              className={route === itemRoute ? 'active' : ''}
              onClick={() => navigate(itemRoute)}
            >
              <Icon size={20} /><span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="user-avatar">{user.displayName.slice(0, 1)}</div>
          <div><strong>{user.displayName}</strong><small>{user.role === 'manager' ? 'مدیر' : 'کارمند'}</small></div>
          <button className="icon-button dark" type="button" onClick={onLogout} aria-label="خروج">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="version-pill">نسخه آزمایشی ۰.۸</div>
          <div className="top-actions">
            <button className="cart-button compact" type="button" onClick={onOpenCart}>
              <ShoppingCart size={20} />
              <span>سبد</span>
              {cartCount > 0 && <b>{cartCount}</b>}
            </button>
            {user.role === 'manager' && (
              <button className="icon-button" type="button" onClick={() => navigate('settings')}>
                <Palette size={19} />
              </button>
            )}
            <button className="icon-button" type="button" onClick={onLogout} aria-label="خروج">
              <LogOut size={18} />
            </button>
            <div className="top-user">{user.displayName}</div>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>

      <nav
        className="mobile-nav"
        style={{ gridTemplateColumns: `repeat(${mobileLeft.length + mobileRight.length + 1}, 1fr)` }}
      >
        {mobileLeft.map(({ route: itemRoute, label, icon: Icon }) => (
          <button
            key={itemRoute}
            className={route === itemRoute ? 'active' : ''}
            onClick={() => navigate(itemRoute)}
            type="button"
          >
            <Icon size={20} /><span>{label}</span>
          </button>
        ))}
        <button className="mobile-cart" type="button" onClick={onOpenCart}>
          <ShoppingCart size={25} />
          {cartCount > 0 && <b>{cartCount}</b>}
        </button>
        {mobileRight.map(({ route: itemRoute, label, icon: Icon }) => (
          <button
            key={itemRoute}
            className={route === itemRoute ? 'active' : ''}
            onClick={() => navigate(itemRoute)}
            type="button"
          >
            <Icon size={20} /><span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
