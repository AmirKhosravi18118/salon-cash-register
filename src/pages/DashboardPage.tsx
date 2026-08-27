import { Activity, ArrowDown, ArrowUp, Clock, WalletCards } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Card, Money, PageHeader, Spinner } from '../components/UI'
import { cashBalance, db, getOpenSession } from '../db'
import { dayKey, formatDate } from '../lib/format'
import type { CashSession, CashTransaction } from '../types'

export function DashboardPage({ revision }: { revision: number }) {
  const [balance, setBalance] = useState(0)
  const [session, setSession] = useState<CashSession>()
  const [today, setToday] = useState<CashTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      cashBalance(),
      getOpenSession(),
      db.transactions.orderBy('createdAt').reverse().toArray(),
    ]).then(([currentBalance, open, transactions]) => {
      setBalance(currentBalance)
      setSession(open)
      setToday(transactions.filter((item) => dayKey(item.createdAt) === dayKey()))
    }).finally(() => setLoading(false))
  }, [revision])

  if (loading) return <Spinner />

  const incoming = today.reduce((sum, item) => sum + Math.max(item.cashEffectCents, 0), 0)
  const outgoing = today.reduce((sum, item) => sum + Math.abs(Math.min(item.cashEffectCents, 0)), 0)
  const services = today.filter((item) => item.kind === 'service').reduce((sum, item) => sum + item.amountCents - item.tipCents, 0)

  return (
    <>
      <PageHeader title="داشبورد" subtitle="خلاصه وضعیت جاری و فعالیت‌های امروز" />

      <Card className="balance-hero">
        <div className="balance-hero-head">
          <span>موجودی فعلی صندوق</span>
          <span className={`status-chip ${session ? 'success' : 'warning'}`}>{session ? 'شیفت باز است' : 'شیفت بسته است'}</span>
        </div>
        <div className="balance-number"><Money cents={balance} /></div>
        <div className="balance-caption">
          <WalletCards size={18} />
          <span>این موجودی با بستن روز صفر نمی‌شود و فقط با ورودی یا خروجی تغییر می‌کند.</span>
        </div>
      </Card>

      <div className="metric-grid">
        <Card className="metric-card"><div className="metric-icon rose"><Activity size={20} /></div><span>خدمات امروز</span><strong><Money cents={services} /></strong></Card>
        <Card className="metric-card"><div className="metric-icon green"><ArrowDown size={20} /></div><span>ورودی امروز</span><strong><Money cents={incoming} /></strong></Card>
        <Card className="metric-card"><div className="metric-icon red"><ArrowUp size={20} /></div><span>خروجی امروز</span><strong><Money cents={outgoing} /></strong></Card>
        <Card className="metric-card"><div className="metric-icon beige"><Clock size={20} /></div><span>شروع شیفت</span><strong className="small-value">{session ? formatDate(session.openedAt) : '—'}</strong></Card>
      </div>

      <Card className="recent-card">
        <div className="section-heading"><div><h2>آخرین فعالیت‌ها</h2><p>آخرین ورودی‌ها و خروجی‌های ثبت‌شده</p></div></div>
        {!today.length ? <div className="empty-state">امروز هنوز فعالیتی ثبت نشده است.</div> : (
          <div className="activity-list">
            {today.slice(0, 8).map((item) => (
              <div className="activity-row" key={item.id}>
                <div><strong>{item.items.map((entry) => entry.name).join('، ') || item.categoryName}</strong><span>{item.userName} — {formatDate(item.createdAt)}</span></div>
                <strong className={item.cashEffectCents >= 0 ? 'positive' : 'negative'}><Money cents={item.cashEffectCents} signed /></strong>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  )
}
