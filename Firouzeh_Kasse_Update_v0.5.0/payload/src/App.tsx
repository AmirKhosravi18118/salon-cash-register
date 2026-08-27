import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppShell, navigate } from './components/AppShell'
import { ensureSeedData } from './db'
import { createTranslator } from './i18n'
import { CashboxPage } from './pages/Cashbox'
import { DashboardPage } from './pages/Dashboard'
import { MovementPage } from './pages/Movement'
import { ReportsPage } from './pages/Reports'
import { SalePage } from './pages/Sale'
import { SettingsPage } from './pages/Settings'
import { TransactionsPage } from './pages/Transactions'
import type { Locale, RouteName } from './types'

const routeNames: RouteName[] = [
  'dashboard',
  'sale',
  'movement',
  'cashbox',
  'transactions',
  'reports',
  'settings',
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

function SplashScreen({ locale }: { locale: Locale }) {
  const t = createTranslator(locale)
  return (
    <div className="splash-screen" role="status" aria-live="polite" aria-busy="true">
      <div className="splash-orb splash-orb-one" />
      <div className="splash-orb splash-orb-two" />
      <div className="splash-card">
        <div className="splash-logo" aria-hidden="true">
          <span>FH</span>
          <i />
        </div>
        <div className="splash-copy">
          <p>{t('salonSlug')}</p>
          <h1>{t('loading.welcome')}</h1>
          <span>{t('loading.preparing')}</span>
        </div>
        <div className="splash-progress" aria-hidden="true"><i /></div>
      </div>
    </div>
  )
}

export default function App() {
  const route = useRoute()
  const [locale, setLocaleState] = useState<Locale>(() =>
    localStorage.getItem('salon-locale') === 'de' ? 'de' : 'fa')
  const [databaseReady, setDatabaseReady] = useState(false)
  const [minimumSplashDone, setMinimumSplashDone] = useState(false)
  const [revision, setRevision] = useState(0)

  const setLocale = useCallback((next: Locale) => {
    localStorage.setItem('salon-locale', next)
    setLocaleState(next)
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = locale === 'fa' ? 'rtl' : 'ltr'
    document.title = locale === 'fa'
      ? 'Firouzeh Hair & Beauty — صندوق نقدی'
      : 'Firouzeh Hair & Beauty — Bargeldkasse'
  }, [locale])

  useEffect(() => {
    const timer = window.setTimeout(() => setMinimumSplashDone(true), 1250)
    ensureSeedData()
      .catch(console.error)
      .finally(() => setDatabaseReady(true))
    return () => window.clearTimeout(timer)
  }, [])

  const onChanged = useCallback(() => {
    setRevision((value) => value + 1)
  }, [])

  const page = useMemo(() => {
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
  }, [locale, onChanged, revision, route])

  if (!databaseReady || !minimumSplashDone) {
    return <SplashScreen locale={locale} />
  }

  return (
    <AppShell locale={locale} setLocale={setLocale} route={route}>
      {page}
    </AppShell>
  )
}
