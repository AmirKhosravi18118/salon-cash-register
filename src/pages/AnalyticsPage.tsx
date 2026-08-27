import { BarChart3, CalendarRange, TrendingDown, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Card, Money, PageHeader } from '../components/UI'
import { db } from '../db'
import { dateRangeFromPreset, dayKey, formatDate } from '../lib/format'
import type { CashSession, CashTransaction, ExpenseCategory, ServiceCategory, User } from '../types'

export function AnalyticsPage({ revision }: { revision: number }) {
  const initial = dateRangeFromPreset('month')
  const [preset, setPreset] = useState('month')
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [serviceCategory, setServiceCategory] = useState('all')
  const [expenseCategory, setExpenseCategory] = useState('all')
  const [userId, setUserId] = useState('all')
  const [transactions, setTransactions] = useState<CashTransaction[]>([])
  const [sessions, setSessions] = useState<CashSession[]>([])
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([])
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    Promise.all([
      db.transactions.orderBy('createdAt').toArray(),
      db.sessions.orderBy('openedAt').toArray(),
      db.serviceCategories.orderBy('order').toArray(),
      db.expenseCategories.orderBy('order').toArray(),
      db.users.toArray(),
    ]).then(([tx, shifts, serviceCats, expenseCats, userRows]) => {
      setTransactions(tx)
      setSessions(shifts)
      setServiceCategories(serviceCats)
      setExpenseCategories(expenseCats)
      setUsers(userRows)
    })
  }, [revision])

  const setRange = (value: string) => {
    setPreset(value)
    const range = dateRangeFromPreset(value)
    setFrom(range.from)
    setTo(range.to)
  }

  const filtered = useMemo(() => transactions.filter((item) => {
    const date = dayKey(item.createdAt)
    const dateMatch = (!from || date >= from) && (!to || date <= to)
    const userMatch = userId === 'all' || item.userId === userId
    const serviceMatch = serviceCategory === 'all'
      || item.items.some((entry) => entry.categoryId === serviceCategory)
    const expenseMatch = expenseCategory === 'all'
      || item.kind !== 'expense'
      || item.categoryId === expenseCategory
    return dateMatch && userMatch && serviceMatch && expenseMatch
  }), [expenseCategory, from, serviceCategory, to, transactions, userId])

  const filteredSessions = sessions.filter((item) => {
    const date = dayKey(item.openedAt)
    return (!from || date >= from) && (!to || date <= to)
  })

  const incoming = filtered.reduce((sum, item) => sum + Math.max(item.cashEffectCents, 0), 0)
  const outgoing = filtered.reduce((sum, item) => sum + Math.abs(Math.min(item.cashEffectCents, 0)), 0)
  const serviceTotal = filtered.filter((item) => item.kind === 'service').reduce((sum, item) => sum + item.amountCents - item.tipCents, 0)
  const tips = filtered.reduce((sum, item) => sum + item.tipCents, 0)

  const daily = new Map<string, { incoming: number; outgoing: number }>()
  for (const item of filtered) {
    const key = dayKey(item.createdAt)
    const current = daily.get(key) ?? { incoming: 0, outgoing: 0 }
    if (item.cashEffectCents >= 0) current.incoming += item.cashEffectCents
    else current.outgoing += Math.abs(item.cashEffectCents)
    daily.set(key, current)
  }
  const dailyRows = [...daily.entries()].sort(([a], [b]) => a.localeCompare(b))
  const maxDaily = Math.max(...dailyRows.flatMap(([, value]) => [value.incoming, value.outgoing]), 1)

  const expenseSummary = new Map<string, number>()
  filtered.filter((item) => item.kind === 'expense').forEach((item) => {
    expenseSummary.set(item.categoryName, (expenseSummary.get(item.categoryName) ?? 0) + item.amountCents)
  })

  return (
    <>
      <PageHeader title="تحلیل داده‌ها" subtitle="فیلتر و مقایسه ورودی، خروجی، خدمات و شیفت‌ها" />

      <Card className="analytics-filters">
        <div className="preset-scroll">
          {[
            ['today', 'امروز'], ['week', 'هفته'], ['month', 'ماه'],
            ['year', 'سال'], ['custom', 'دلخواه'],
          ].map(([value, label]) => (
            <button key={value} className={preset === value ? 'active' : ''} onClick={() => setRange(value)} type="button">{label}</button>
          ))}
        </div>
        <div className="filter-grid">
          <label><span>از تاریخ</span><input type="date" value={from} onChange={(event) => { setPreset('custom'); setFrom(event.target.value) }} /></label>
          <label><span>تا تاریخ</span><input type="date" value={to} onChange={(event) => { setPreset('custom'); setTo(event.target.value) }} /></label>
          <label><span>کتگوری خدمات</span><select value={serviceCategory} onChange={(event) => setServiceCategory(event.target.value)}><option value="all">همه</option>{serviceCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label><span>کتگوری هزینه</span><select value={expenseCategory} onChange={(event) => setExpenseCategory(event.target.value)}><option value="all">همه</option>{expenseCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label><span>کاربر</span><select value={userId} onChange={(event) => setUserId(event.target.value)}><option value="all">همه</option>{users.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select></label>
        </div>
      </Card>

      <div className="metric-grid">
        <Card className="metric-card"><div className="metric-icon green"><TrendingUp size={20} /></div><span>ورودی</span><strong><Money cents={incoming} /></strong></Card>
        <Card className="metric-card"><div className="metric-icon red"><TrendingDown size={20} /></div><span>خروجی</span><strong><Money cents={outgoing} /></strong></Card>
        <Card className="metric-card"><div className="metric-icon rose"><BarChart3 size={20} /></div><span>خدمات</span><strong><Money cents={serviceTotal} /></strong></Card>
        <Card className="metric-card"><div className="metric-icon beige"><CalendarRange size={20} /></div><span>انعام</span><strong><Money cents={tips} /></strong></Card>
      </div>

      <div className="analytics-grid">
        <Card className="chart-card">
          <div className="section-heading"><div><h2>ورودی و خروجی روزانه</h2><p>مقایسه براساس بازه انتخاب‌شده</p></div></div>
          {!dailyRows.length ? <div className="empty-state">داده‌ای در این بازه وجود ندارد.</div> : (
            <div className="bar-chart-scroll">
              <div className="bar-chart" style={{ minWidth: `${Math.max(520, dailyRows.length * 72)}px` }}>
                {dailyRows.map(([date, value]) => (
                  <div className="daily-bar" key={date}>
                    <div className="bar-pair">
                      <i className="income" style={{ height: `${Math.max(3, value.incoming / maxDaily * 150)}px` }} title={`ورودی ${value.incoming / 100}`} />
                      <i className="outcome" style={{ height: `${Math.max(3, value.outgoing / maxDaily * 150)}px` }} title={`خروجی ${value.outgoing / 100}`} />
                    </div>
                    <span>{date.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="chart-legend"><span><i className="income" />ورودی</span><span><i className="outcome" />خروجی</span></div>
        </Card>

        <Card>
          <div className="section-heading"><div><h2>تحلیل هزینه‌ها</h2><p>جمع براساس کتگوری</p></div></div>
          <div className="summary-list">
            {[...expenseSummary.entries()].sort((a, b) => b[1] - a[1]).map(([name, value]) => (
              <div key={name}><span>{name}</span><strong><Money cents={value} /></strong></div>
            ))}
            {!expenseSummary.size && <div className="empty-state">هزینه‌ای ثبت نشده است.</div>}
          </div>
        </Card>
      </div>

      <Card className="shift-analysis">
        <div className="section-heading"><div><h2>تحلیل شیفت‌ها</h2><p>زمان و موجودی باز و بسته‌شدن صندوق</p></div></div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>تاریخ</th><th>شروع</th><th>مبلغ شروع</th><th>پایان</th><th>مبلغ پایان</th><th>تغییر شیفت</th><th>کاربر</th></tr></thead>
            <tbody>
              {filteredSessions.map((item) => (
                <tr key={item.id}>
                  <td>{formatDate(item.openedAt, false)}</td>
                  <td>{formatDate(item.openedAt)}</td>
                  <td><Money cents={item.openingCountedCents} /></td>
                  <td>{item.closedAt ? formatDate(item.closedAt) : 'باز'}</td>
                  <td>{item.closingCountedCents === undefined ? '—' : <Money cents={item.closingCountedCents} />}</td>
                  <td className={(item.shiftChangeCents ?? 0) >= 0 ? 'positive' : 'negative'}>{item.shiftChangeCents === undefined ? '—' : <Money cents={item.shiftChangeCents} signed />}</td>
                  <td>{item.closedByName ?? item.openedByName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
