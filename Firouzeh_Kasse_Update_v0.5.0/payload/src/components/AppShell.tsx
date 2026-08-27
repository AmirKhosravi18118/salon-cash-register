import {
  ArrowDownLeft,
  BarChart3,
  Languages,
  LayoutDashboard,
  Plus,
  ReceiptText,
  Scissors,
  Settings,
  Sparkles,
  UserRound,
  WalletCards,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { createTranslator } from '../i18n'
import type { Locale, RouteName } from '../types'

const APP_VERSION = '0.5.0-test'

const navIcons: Record<RouteName, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  sale: Scissors,
  movement: ArrowDownLeft,
  cashbox: WalletCards,
  transactions: ReceiptText,
  reports: BarChart3,
  settings: Settings,
}

export function navigate(route: RouteName): void {
  window.location.hash = `/${route}`
}

export function AppShell({
  locale,
  setLocale,
  route,
  children,
}: {
  locale: Locale
  setLocale: (locale: Locale) => void
  route: RouteName
  children: ReactNode
}) {
  const t = createTranslator(locale)
  const desktopItems: RouteName[] = [
    'dashboard',
    'sale',
    'movement',
    'cashbox',
    'transactions',
    'reports',
    'settings',
  ]
  const mobileItems: RouteName[] = [
    'dashboard',
    'transactions',
    'cashbox',
    'settings',
  ]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">FH</div>
          <div className="brand-copy">
            <strong>{t('appName')}</strong>
            <small>{t('appSubtitle')}</small>
          </div>
        </div>

        <nav className="side-nav" aria-label={t('appSubtitle')}>
          {desktopItems.map((item) => {
            const Icon = navIcons[item]
            return (
              <button
                key={item}
                className={route === item ? 'active' : ''}
                onClick={() => navigate(item)}
                type="button"
              >
                <Icon size={20} />
                <span>{t(`nav.${item}`)}</span>
              </button>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="offline-pill">
            <span className="online-dot" />
            {t('offlineReady')}
          </div>
          <small>{t('common.version')} {APP_VERSION}</small>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="test-badge"><Sparkles size={16} />{t('testVersion')}</div>
          <div className="topbar-actions">
            <button
              className="language-switch"
              type="button"
              onClick={() => setLocale(locale === 'fa' ? 'de' : 'fa')}
              aria-label={locale === 'fa' ? 'Deutsch' : 'فارسی'}
            >
              <Languages size={18} />
              <span>{locale === 'fa' ? 'DE' : 'FA'}</span>
            </button>
            <div className="owner-chip">
              <div className="owner-avatar"><UserRound size={18} /></div>
              <span>{t('ownerName')}</span>
            </div>
          </div>
        </header>

        <main className="page-content">
          <div className="page-stage" key={`${route}-${locale}`}>
            {children}
          </div>
        </main>
      </div>

      <nav className="mobile-nav" aria-label={t('appSubtitle')}>
        {mobileItems.slice(0, 2).map((item) => {
          const Icon = navIcons[item]
          return (
            <button
              key={item}
              className={route === item ? 'active' : ''}
              onClick={() => navigate(item)}
              type="button"
            >
              <Icon size={21} />
              <span>{t(`nav.${item}`)}</span>
            </button>
          )
        })}

        <button
          className="mobile-fab"
          type="button"
          onClick={() => navigate('sale')}
          aria-label={t('nav.sale')}
        >
          <Plus size={28} />
        </button>

        {mobileItems.slice(2).map((item) => {
          const Icon = navIcons[item]
          return (
            <button
              key={item}
              className={route === item ? 'active' : ''}
              onClick={() => navigate(item)}
              type="button"
            >
              <Icon size={21} />
              <span>{t(`nav.${item}`)}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
