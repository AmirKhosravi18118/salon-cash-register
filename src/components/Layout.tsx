import type { ReactNode } from 'react'
import type { RouteName, UserAccount } from '../types'
import { Icon } from './ui'

export function go(route: RouteName, query?: Record<string, string>): void {
  const params = query ? `?${new URLSearchParams(query).toString()}` : ''
  window.location.hash = `/${route}${params}`
}

const managerNav: Array<{
  route: RouteName
  label: string
  icon: Parameters<typeof Icon>[0]['name']
}> = [
  { route: 'dashboard', label: 'داشبورد', icon: 'dashboard' },
  { route: 'services', label: 'خدمات', icon: 'scissors' },
  { route: 'activities', label: 'فعالیت‌ها', icon: 'activity' },
  { route: 'analytics', label: 'تحلیل داده‌ها', icon: 'chart' },
  { route: 'cashbox', label: 'شیفت', icon: 'wallet' },
  { route: 'settings', label: 'تنظیمات', icon: 'settings' },
]

const employeeNav = managerNav.filter((item) =>
  item.route === 'services' || item.route === 'cashbox')

export function Layout({
  route, user, cartCount, children, onCart, onLogout,
}: {
  route: RouteName
  user: UserAccount
  cartCount: number
  children: ReactNode
  onCart: () => void
  onLogout: () => void
}) {
  const navigation = user.role === 'manager' ? managerNav : employeeNav

  const renderNavButton = (item: typeof managerNav[number]) => (
    <button key={item.route} type="button"
      className={route === item.route ? 'active' : ''}
      onClick={() => go(item.route)}>
      <Icon name={item.icon}/><span>{item.label}</span>
    </button>
  )

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">FH</div>
          <div><strong>Firouzeh</strong><small>پنل داخلی سالن</small></div>
        </div>

        <nav className="sidebar-nav">
          {navigation.map(renderNavButton)}
        </nav>

        <div className="sidebar-user">
          <div className="avatar">{user.name.slice(0, 1)}</div>
          <div>
            <strong>{user.name}</strong>
            <small>{user.role === 'manager' ? 'مدیر' : 'کارمند'}</small>
          </div>
          <button className="icon-button dark" type="button" onClick={onLogout}
            aria-label="خروج"><Icon name="logout"/></button>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="topbar-actions">
            {user.role === 'manager' && (
              <button className="top-action" type="button"
                onClick={() => go('settings', { tab: 'appearance' })}>
                <Icon name="palette"/><span>تغییر ظاهر</span>
              </button>
            )}

            <button className="top-action cart-button" type="button" onClick={onCart}>
              <Icon name="cart"/><span>سبد</span>
              {cartCount > 0 && <b className="cart-badge numeric">{cartCount}</b>}
            </button>
          </div>

          <span className="version-badge">
            نسخه آزمایشی <b className="numeric">0.9.1</b>
          </span>
        </header>

        <main className="page-content">{children}</main>
      </div>

      <nav className={`mobile-nav ${user.role}`}>
        {user.role === 'manager' ? (
          <>
            {managerNav.filter((item) =>
              item.route === 'dashboard' || item.route === 'services')
              .map(renderNavButton)}

            <button className="mobile-cart" type="button" onClick={onCart}>
              <Icon name="cart" size={25}/>
              {cartCount > 0 && <b className="cart-badge numeric">{cartCount}</b>}
            </button>

            {managerNav.filter((item) =>
              item.route === 'analytics' || item.route === 'settings')
              .map(renderNavButton)}
          </>
        ) : (
          <>
            {employeeNav.filter((item) => item.route === 'services').map(renderNavButton)}

            <button className="mobile-cart" type="button" onClick={onCart}>
              <Icon name="cart" size={25}/>
              {cartCount > 0 && <b className="cart-badge numeric">{cartCount}</b>}
            </button>

            {employeeNav.filter((item) => item.route === 'cashbox').map(renderNavButton)}

            <button type="button" onClick={onLogout}>
              <Icon name="logout"/><span>خروج</span>
            </button>
          </>
        )}
      </nav>
    </div>
  )
}
