import { useEffect, useState } from 'react'
import { Card, Icon, Money, PageHeader } from '../components/ui'
import { dashboardData } from '../db'
import { formatDate } from '../lib/format'
import type { DashboardData } from '../types'
import { go } from '../components/Layout'

export function DashboardPage({ revision }: { revision: number }) {
  const [data, setData] = useState<DashboardData>()

  useEffect(() => { dashboardData().then(setData) }, [revision])

  if (!data) return <div className="page-loader">در حال بارگذاری…</div>

  return (
    <>
      <PageHeader title="داشبورد" subtitle="خلاصه وضعیت فعلی و عملکرد این ماه"/>

      <div className="dashboard-hero-grid">
        <Card className="cash-hero">
          <div className="cash-hero-head">
            <span>موجودی فعلی صندوق</span>
            <b className={data.openShift ? 'status success' : 'status'}>
              {data.openShift ? 'شیفت باز است' : 'شیفت بسته است'}
            </b>
          </div>
          <strong><Money cents={data.cashBalanceCents}/></strong>
          <div className="hero-buttons">
            <button type="button" onClick={() => go('services')}><Icon name="scissors"/>خدمات</button>
            <button type="button" onClick={() => go('activities')}><Icon name="activity"/>ثبت فعالیت</button>
            <button type="button" onClick={() => go('cashbox')}><Icon name="wallet"/>شیفت</button>
            <button type="button" onClick={() => go('analytics')}><Icon name="chart"/>تحلیل</button>
          </div>
        </Card>

        <Card className="month-card">
          <span>خالص عملکرد این ماه</span>
          <strong className={data.monthNetCents >= 0 ? 'positive' : 'negative'}>
            <Money cents={data.monthNetCents} signed/>
          </strong>
          <div><small>خدمات</small><Money cents={data.monthServiceCents}/></div>
          <div><small>انعام</small><Money cents={data.monthTipCents}/></div>
          <div><small>خروجی‌ها</small><Money cents={data.monthExpenseCents}/></div>
        </Card>
      </div>

      <div className="metric-grid">
        <Card className="metric"><span>خدمات این ماه</span><strong><Money cents={data.monthServiceCents}/></strong></Card>
        <Card className="metric"><span>انعام این ماه</span><strong><Money cents={data.monthTipCents}/></strong></Card>
        <Card className="metric"><span>خروجی این ماه</span><strong><Money cents={data.monthExpenseCents}/></strong></Card>
        <Card className="metric"><span>وضعیت شیفت</span><strong>{data.openShift ? 'باز' : 'بسته'}</strong></Card>
      </div>

      <Card className="recent-card">
        <div className="panel-heading"><div><h2>آخرین فعالیت‌ها</h2><p>آخرین تغییرات ثبت‌شده</p></div><Icon name="activity"/></div>
        {!data.recentTransactions.length ? <div className="empty-state"><p>فعالیتی ثبت نشده است.</p></div> : (
          <div className="activity-list">
            {data.recentTransactions.map((item) => (
              <div className="activity-row" key={item.id}>
                <div className={`activity-direction ${item.direction}`}>
                  <Icon name={item.direction === 'in' ? 'arrow-down' : 'arrow-up'}/>
                </div>
                <div className="activity-copy">
                  <strong>{item.items.length
                    ? item.items.map((entry) => entry.name).join('، ')
                    : item.categoryName || item.note || 'فعالیت'}</strong>
                  <small><span className="numeric">{formatDate(item.createdAt)}</span> — {item.userName}</small>
                </div>
                <strong className={item.direction === 'in' ? 'positive' : 'negative'}>
                  <Money cents={item.direction === 'in' ? item.amountCents : -item.amountCents} signed/>
                </strong>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  )
}
