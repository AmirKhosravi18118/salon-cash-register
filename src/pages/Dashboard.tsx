import {
  ArrowDownLeft, ArrowUpRight, Banknote, BarChart3, ChevronLeft,
  ChevronRight, Euro, History, Plus, Sparkles, WalletCards,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { TransactionList } from '../components/TransactionList'
import { navigate } from '../components/AppShell'
import { GlassCard, Money, PageHeader } from '../components/ui'
import { dashboardSnapshot } from '../db'
import { createTranslator } from '../i18n'
import { formatMoney } from '../lib/format'
import type { DashboardSnapshot, Locale } from '../types'

export function DashboardPage({
  locale, revision,
}: { locale: Locale; revision: number }) {
  const t = createTranslator(locale)
  const [data, setData] = useState<DashboardSnapshot | null>(null)

  useEffect(() => { dashboardSnapshot().then(setData) }, [revision])
  if (!data) return <div className="loading-screen">Salon Kasse…</div>
  const maxBar = Math.max(...data.dailySales.map((day) => day.value), 1)

  return (
    <>
      <PageHeader title={t('dashboard.welcome')} subtitle={t('dashboard.overview')} />

      <div className="dashboard-grid">
        <GlassCard className="balance-card">
          <div className="balance-topline">
            <span>{t('dashboard.cashBalance')}</span>
            <span className={`status-chip ${data.openSession ? 'success' : 'warning'}`}>
              {data.openSession ? t('cashbox.openStatus') : t('cashbox.closedStatus')}
            </span>
          </div>
          <div className="hero-money">
            <Money cents={data.expectedBalanceCents} locale={locale} />
          </div>
          <div className="hero-actions">
            <button type="button" onClick={() => navigate(data.openSession ? 'sale' : 'cashbox')}>
              <Plus size={21} />
              <span>{data.openSession ? t('dashboard.recordSale') : t('dashboard.openDay')}</span>
            </button>
            <button type="button" onClick={() => navigate('movement')}>
              <ArrowDownLeft size={21} /><span>{t('dashboard.recordExpense')}</span>
            </button>
            <button type="button" onClick={() => navigate('cashbox')}>
              <WalletCards size={21} /><span>{t('dashboard.cashbox')}</span>
            </button>
            <button type="button" onClick={() => navigate('transactions')}>
              <History size={21} /><span>{t('nav.transactions')}</span>
            </button>
          </div>
        </GlassCard>

        <GlassCard className="month-summary">
          <div className="card-heading">
            <div>
              <small>{t('dashboard.monthlyPerformance')}</small>
              <h2><Money cents={data.monthSalesCents} locale={locale} /></h2>
            </div>
            <div className="round-icon pink"><BarChart3 size={22} /></div>
          </div>
          <div className="month-net">
            <span>{t('dashboard.netCash')}</span>
            <strong className={data.monthNetCashCents >= 0 ? 'positive' : 'negative'}>
              <Money cents={data.monthNetCashCents} locale={locale} signed />
            </strong>
          </div>
        </GlassCard>
      </div>

      {!data.openSession && (
        <div className="notice warning">
          <WalletCards size={20} />
          <div>
            <strong>{t('dashboard.drawerClosed')}</strong>
            <span>{t('dashboard.startHint')}</span>
          </div>
          <button type="button" onClick={() => navigate('cashbox')}>
            {t('dashboard.openDay')}
          </button>
        </div>
      )}

      <div className="metric-grid">
        <GlassCard className="metric-card">
          <div className="metric-icon rose"><Banknote size={20} /></div>
          <span>{t('dashboard.cashSales')}</span>
          <strong><Money cents={data.todaySalesCents} locale={locale} /></strong>
          <small>{t('common.today')}</small>
        </GlassCard>
        <GlassCard className="metric-card">
          <div className="metric-icon peach"><Sparkles size={20} /></div>
          <span>{t('dashboard.tips')}</span>
          <strong><Money cents={data.todayTipsCents} locale={locale} /></strong>
          <small>{t('common.today')}</small>
        </GlassCard>
        <GlassCard className="metric-card">
          <div className="metric-icon brown"><ArrowUpRight size={20} /></div>
          <span>{t('dashboard.expenses')}</span>
          <strong><Money cents={data.todayExpensesCents} locale={locale} /></strong>
          <small>{t('common.today')}</small>
        </GlassCard>
        <GlassCard className="metric-card">
          <div className="metric-icon cream"><Euro size={20} /></div>
          <span>{t('dashboard.netCash')}</span>
          <strong><Money cents={data.todayNetCashCents} locale={locale} signed /></strong>
          <small>{data.todayTransactionCount} {t('nav.transactions')}</small>
        </GlassCard>
      </div>

      <div className="two-column">
        <GlassCard>
          <div className="section-heading">
            <div><h2>{t('dashboard.lastSevenDays')}</h2><p>{t('dashboard.cashSales')}</p></div>
          </div>
          <div className="bar-chart">
            {data.dailySales.map((day) => (
              <div className="bar-item" key={day.date}>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ height: `${Math.max((day.value / maxBar) * 100, day.value ? 10 : 2)}%` }}
                    title={formatMoney(day.value, locale)}
                  />
                </div>
                <span>{day.date.slice(8, 10)}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <div className="section-heading">
            <div><h2>{t('dashboard.recentTransactions')}</h2><p>{t('common.today')}</p></div>
            <button className="text-button" type="button" onClick={() => navigate('transactions')}>
              {t('dashboard.viewAll')}
              {locale === 'fa' ? <ChevronLeft size={17} /> : <ChevronRight size={17} />}
            </button>
          </div>
          <TransactionList transactions={data.recentTransactions} locale={locale} compact />
        </GlassCard>
      </div>
    </>
  )
}
