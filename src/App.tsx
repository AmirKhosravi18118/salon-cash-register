import { useCallback, useEffect, useMemo, useState } from 'react'
import { currentUser, logout } from './auth'
import { CartModal } from './components/CartModal'
import { Layout, go } from './components/Layout'
import { Modal } from './components/ui'
import { ensureDatabase } from './db'
import { applyTheme, loadTheme } from './lib/theme'
import { ActivitiesPage } from './pages/ActivitiesPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { AuthPage } from './pages/AuthPage'
import { CashboxPage } from './pages/CashboxPage'
import { DashboardPage } from './pages/DashboardPage'
import { ServicesPage } from './pages/ServicesPage'
import { SettingsPage } from './pages/SettingsPage'
import { PaymentPanel } from './components/PaymentPanel'
import type { CartItem, RouteName, UserAccount } from './types'

const routes: RouteName[] = [
  'dashboard','services','activities','analytics','cashbox','settings',
]

function readLocation(): { route: RouteName; query: URLSearchParams } {
  const raw = window.location.hash.replace(/^#\/?/, '')
  const [routePart = '', queryPart = ''] = raw.split('?')
  const route = routes.includes(routePart as RouteName)
    ? routePart as RouteName : 'dashboard'
  return { route, query: new URLSearchParams(queryPart) }
}

export default function App() {
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<UserAccount>()
  const [location, setLocation] = useState(readLocation)
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    applyTheme(loadTheme())
    ensureDatabase()
      .then(currentUser)
      .then((value) => {
        setUser(value)
        setReady(true)
        if (value) go(value.role === 'manager' ? 'dashboard' : 'services')
      })
  }, [])

  useEffect(() => {
    const listener = () => setLocation(readLocation())
    window.addEventListener('hashchange', listener)
    return () => window.removeEventListener('hashchange', listener)
  }, [])

  const changed = useCallback(() => setRevision((value) => value + 1), [])

  const handleAuthenticated = (value: UserAccount) => {
    setUser(value)
    go(value.role === 'manager' ? 'dashboard' : 'services')
  }

  const handleLogout = () => {
    logout()
    setUser(undefined)
    setCart([])
    window.location.hash = ''
  }

  const route = user?.role === 'employee' && location.route !== 'services'
    ? 'services' : location.route

  const page = useMemo(() => {
    if (!user) return null
    switch (route) {
      case 'dashboard':
        return <DashboardPage revision={revision}/>
      case 'services':
        return <ServicesPage user={user} cart={cart} setCart={setCart}
          revision={revision} onChanged={changed} onOpenCart={() => setCartOpen(true)}
          onOpenCheckout={() => setCheckoutOpen(true)}/>
      case 'activities':
        return <ActivitiesPage user={user} revision={revision} onChanged={changed}/>
      case 'analytics':
        return <AnalyticsPage revision={revision}/>
      case 'cashbox':
        return <CashboxPage user={user} revision={revision} onChanged={changed}/>
      case 'settings':
        return <SettingsPage user={user} revision={revision} onChanged={changed}
          initialTab={location.query.get('tab') ?? undefined}/>
    }
  }, [cart, changed, location.query, revision, route, user])

  if (!ready) {
    return <div className="splash"><div className="splash-logo">FH</div>
      <h1>فیروزه، خوش آمدید</h1><p>پنل در حال آماده‌سازی است…</p><i/></div>
  }
  if (!user) return <AuthPage onAuthenticated={handleAuthenticated}/>

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <>
      <Layout route={route} user={user} cartCount={cartCount}
        onCart={() => setCartOpen(true)} onLogout={handleLogout}>
        {page}
      </Layout>
      <CartModal open={cartOpen} cart={cart} onClose={() => setCartOpen(false)}
        onUpdate={setCart} onCheckout={() => {
          setCartOpen(false)
          setCheckoutOpen(true)
        }}/>
      <Modal open={checkoutOpen} title="پرداخت" onClose={() => setCheckoutOpen(false)}
        className="checkout-modal">
        <PaymentPanel cart={cart} user={user} revision={revision} compact
          onSuccess={() => {
            setCart([])
            setCheckoutOpen(false)
            changed()
          }}/>
      </Modal>
    </>
  )
}
