import { BarChart3, Euro } from 'lucide-react'
import { useEffect, useState } from 'react'
import { EmptyState, GlassCard, Money, PageHeader } from '../components/ui'
import { db } from '../db'
import { createTranslator, serviceName } from '../i18n'
import { localMonthKey } from '../lib/format'
import type { CashTransaction, Locale } from '../types'

export function ReportsPage({
  locale,
  revision,
}: {
  locale: Locale
  revision: number
}) {
  const t = createTranslator(locale)
  const [month, setMonth] = useState(localMonthKey())
  const [transactions, setTransactions] = useState<CashTransaction[]>([])

  useEffect(() => {
    db.transactions.orderBy('createdAt').toArray().then(setTransactions)
  }, [revision])

  const monthTransactions = transactions.filter(
    (transaction) => localMonthKey(new Date(transaction.createdAt)) === month,
  )
  const sales = monthTransactions.filter((item) => item.kind === 'sale')
  const totalSales = sales.reduce(
    (sum, item) => sum + item.amountCents - item.tipCents,
    0,
  )
  const totalTips = sales.reduce((sum, item) => sum + item.tipCents, 0)
  const totalExpenses = monthTransactions
    .filter((item) => item.kind === 'expense')
    .reduce((sum, item) => sum + item.amountCents, 0)
  const net = monthTransactions.reduce(
    (sum, item) => sum + item.cashEffectCents,
    0,
  )

  const topMap = new Map<string, {
    nameFa: string
    nameDe: string
    count: number
    revenue: number
  }>()

  sales.flatMap((sale) => sale.items).forEach((item) => {
    const current = topMap.get(item.serviceId) ?? {
      nameFa: item.nameFa,
      nameDe: item.nameDe,
      count: 0,
      revenue: 0,
    }
    current.count += item.quantity
    current.revenue += item.totalCents
    topMap.set(item.serviceId, current)
  })

  const topItems = [...topMap.values()].sort((a, b) => b.revenue - a.revenue)

  return (
    <>
      <PageHeader
        title={t('reports.title')}
        subtitle={t('reports.subtitle')}
        action={
          <label className="month-picker">
            <span>{t('reports.selectMonth')}</span>
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
            />
          </label>
        }
      />

      <div className="notice info">
        <Euro size={20} />
        <strong>{t('reports.cashOnlyNotice')}</strong>
      </div>

      <div className="metric-grid report-metrics">
        <GlassCard className="metric-card">
          <span>{t('reports.totalSales')}</span>
          <strong><Money cents={totalSales} locale={locale} /></strong>
        </GlassCard>

        <GlassCard className="metric-card">
          <span>{t('reports.totalTips')}</span>
          <strong><Money cents={totalTips} locale={locale} /></strong>
        </GlassCard>

        <GlassCard className="metric-card">
          <span>{t('reports.totalExpenses')}</span>
          <strong><Money cents={totalExpenses} locale={locale} /></strong>
        </GlassCard>

        <GlassCard className="metric-card">
          <span>{t('reports.netCash')}</span>
          <strong><Money cents={net} locale={locale} signed /></strong>
        </GlassCard>
      </div>

      <GlassCard className="report-card">
        <div className="section-heading">
          <div>
            <h2>{t('reports.topServices')}</h2>
            <p>{sales.length} {t('reports.saleCount')}</p>
          </div>
          <BarChart3 size={22} />
        </div>

        {!topItems.length ? <EmptyState text={t('common.noData')} /> : (
          <div className="report-table">
            <div className="report-row header">
              <span>{t('reports.item')}</span>
              <span>{t('reports.count')}</span>
              <span>{t('reports.revenue')}</span>
            </div>

            {topItems.map((item) => (
              <div className="report-row" key={`${item.nameDe}-${item.nameFa}`}>
                <strong>{serviceName(locale, item)}</strong>
                <span>{item.count}</span>
                <strong><Money cents={item.revenue} locale={locale} /></strong>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </>
  )
}
