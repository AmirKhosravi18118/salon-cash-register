import { useCallback, useEffect, useMemo, useState } from 'react'
import { clearAuthSession, restoreAuthSession } from './auth'
import { CartModal } from './components/CartModal'
import { Layout, navigate } from './components/Layout'
import { Spinner } from './components/UI'
import { ensureSeedData, getTheme, hasUsers } from './db'
import { applyTheme } from './lib/theme'
import { ActivitiesPage } from './pages/ActivitiesPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { AuthPage } from './pages/AuthPage'
import { CashboxPage } from './pages/CashboxPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { DashboardPage } from './pages/DashboardPage'
import { ServicesPage } from './pages/ServicesPage'
import { SettingsPage } from './pages/SettingsPage'
import type { CartItem, RouteName, User } from './types'

const validRoutes: RouteName[] = [
  'dashboard', 'services', 'checkout', 'activities',
  'analytics', 'cashbox', 'settings',
]

function getRoute(): RouteName {
  const value = window.location.hash.replace('#/', '') as RouteName
  return validRoutes.includes(value) ? value : 'dashboard'
}

function Splash() {
  return (
    <div className="splash-screen">
      <div className="splash-orb one" /><div className="splash-orb two" />
      <div className="splash-card">
        <div className="splash-logo">FH</div>
        <h1>فیروزه، خوش آمدید</h1>
        <p>سامانه داخلی در حال آماده‌سازی است…</p>
        <div className="splash-progress"><i /></div>
      </div>
    </div>
  )
}

export default function App() {
  const [ready, setReady] = useState(false)
  const [minimumSplash, setMinimumSplash] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [user, setUser] = useState<User>()
  const [route, setRoute] = useState<RouteName>(getRoute)
  const [revision, setRevision] = useState(0)
  const [cartOpen, setCartOpen] = useState(false)
  const [cart, setCartState] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('firouzeh-cart-v080') ?? '[]') as CartItem[] }
    catch { return [] }
  })

  const setCart = useCallback((items: CartItem[]) => {
    setCartState(items)
    localStorage.setItem('firouzeh-cart-v080', JSON.stringify(items))
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => setMinimumSplash(true), 1100)
    ensureSeedData().then(async () => {
      applyTheme(await getTheme())
      setNeedsSetup(!(await hasUsers()))
      setUser(await restoreAuthSession())
      setReady(true)
    })
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const listener = () => setRoute(getRoute())
    window.addEventListener('hashchange', listener)
    return () => window.removeEventListener('hashchange', listener)
  }, [])

  useEffect(() => {
    if (!user) return
    const managerRoutes: RouteName[] = ['dashboard', 'services', 'checkout', 'activities', 'analytics', 'cashbox', 'settings']
    const staffRoutes: RouteName[] = ['services', 'checkout', 'cashbox']
    const allowed = user.role === 'manager' ? managerRoutes : staffRoutes
    if (!allowed.includes(route)) navigate(user.role === 'manager' ? 'dashboard' : 'services')
  }, [route, user])

  const onChanged = useCallback(() => setRevision((value) => value + 1), [])

  const page = useMemo(() => {
    if (!user) return null
    if (route === 'services') return <ServicesPage cart={cart} setCart={setCart} onOpenCart={() => setCartOpen(true)} />
    if (route === 'checkout') return <CheckoutPage cart={cart} setCart={setCart} user={user} />
    if (route === 'cashbox') return <CashboxPage user={user} revision={revision} onChanged={onChanged} />
    if (route === 'dashboard' && user.role === 'manager') return <DashboardPage revision={revision} />
    if (route === 'activities' && user.role === 'manager') return <ActivitiesPage user={user} revision={revision} onChanged={onChanged} />
    if (route === 'analytics' && user.role === 'manager') return <AnalyticsPage revision={revision} />
    if (route === 'settings' && user.role === 'manager') return <SettingsPage currentUser={user} revision={revision} onChanged={onChanged} />
    return null
  }, [cart, onChanged, revision, route, setCart, user])

  if (!ready || !minimumSplash) return <Splash />
  if (!user) return <AuthPage needsSetup={needsSetup} onAuthenticated={(next) => {
    setUser(next)
    setNeedsSetup(false)
    navigate(next.role === 'manager' ? 'dashboard' : 'services')
  }} />

  return (
    <>
      <Layout
        user={user}
        route={route}
        cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        onOpenCart={() => setCartOpen(true)}
        onLogout={() => { clearAuthSession(); setUser(undefined); setCartOpen(false) }}
      >
        {page}
      </Layout>
      <CartModal open={cartOpen} cart={cart} setCart={setCart} onClose={() => setCartOpen(false)} />
    </>
  )
}
