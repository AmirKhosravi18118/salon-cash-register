import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppShell, navigate } from './components/AppShell'
import { ensureSeedData } from './db'
import { CashboxPage } from './pages/Cashbox'
import { DashboardPage } from './pages/Dashboard'
import { MovementPage } from './pages/Movement'
import { ReportsPage } from './pages/Reports'
import { SalePage } from './pages/Sale'
import { SettingsPage } from './pages/Settings'
import { TransactionsPage } from './pages/Transactions'
import type { Locale, RouteName } from './types'

const routeNames: RouteName[] = [
  'dashboard', 'sale', 'movement', 'cashbox',
  'transactions', 'reports', 'settings',
]

function routeFromHash(): RouteName {
  const route = window.location.hash.replace('#/', '') as RouteName
  return routeNames.includes(route) ? route : 'dashboard'
}

function useRoute(): RouteName {
  const [route, setRoute] = useState<RouteName>(routeFromHash)
  useEffect(() => {
    const listener = () => setRoute(routeFromHash())
    window.addEventListener('hashchange', listener)
    if (!window.location.hash) navigate('dashboard')
    return () => window.removeEventListener('hashchange', listener)
  }, [])
  return route
}

export default function App() {
  const route = useRoute()
  const [locale, setLocaleState] = useState<Locale>(() =>
    localStorage.getItem('salon-locale') === 'de' ? 'de' : 'fa')
  const [ready, setReady] = useState(false)
  const [revision, setRevision] = useState(0)

  const setLocale = useCallback((next: Locale) => {
    localStorage.setItem('salon-locale', next)
    setLocaleState(next)
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = locale === 'fa' ? 'rtl' : 'ltr'
    document.title = locale === 'fa'
      ? 'Salon Kasse — صندوق نقدی' : 'Salon Kasse — Bargeldkasse'
  }, [locale])

  useEffect(() => {
    ensureSeedData()
      .then(() => setReady(true))
      .catch((error) => {
        console.error(error)
        setReady(true)
      })
  }, [])

  const onChanged = useCallback(() => {
    setRevision((value) => value + 1)
  }, [])

  const page = useMemo(() => {
    if (!ready) return <div className="loading-screen">Salon Kasse…</div>
    switch (route) {
      case 'dashboard':
        return <DashboardPage locale={locale} revision={revision} />
      case 'sale':
        return <SalePage locale={locale} revision={revision} onChanged={onChanged} />
      case 'movement':
        return <MovementPage locale={locale} revision={revision} onChanged={onChanged} />
      case 'cashbox':
        return <CashboxPage locale={locale} revision={revision} onChanged={onChanged} />
      case 'transactions':
        return <TransactionsPage locale={locale} revision={revision} />
      case 'reports':
        return <ReportsPage locale={locale} revision={revision} />
      case 'settings':
        return <SettingsPage locale={locale} revision={revision} onChanged={onChanged} />
    }
  }, [locale, onChanged, ready, revision, route])

  return (
    <AppShell locale={locale} setLocale={setLocale} route={route}>
      {page}
    </AppShell>
  )
}
