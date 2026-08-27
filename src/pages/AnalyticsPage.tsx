import {
  useCallback, useEffect, useMemo, useState, type CSSProperties,
} from 'react'
import { Card, Icon, Money, PageHeader, Segmented } from '../components/ui'
import { db } from '../db'
import {
  formatDate, formatInteger, formatTime, localMonthKey, monthNames,
} from '../lib/format'
import type {
  CashTransaction, ExpenseCategory, ServiceCategory, UserAccount, WorkShift,
} from '../types'

export function AnalyticsPage({ revision }: { revision: number }) {
  const current = localMonthKey()
  const [scope, setScope] = useState('month')
  const [year, setYear] = useState(Number(current.slice(0, 4)))
  const [month, setMonth] = useState(Number(current.slice(5, 7)))
  const [serviceCategory, setServiceCategory] = useState('all')
  const [expenseCategory, setExpenseCategory] = useState('all')
  const [userId, setUserId] = useState('all')
  const [transactions, setTransactions] = useState<CashTransaction[]>([])
  const [shifts, setShifts] = useState<WorkShift[]>([])
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([])
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])
  const [users, setUsers] = useState<UserAccount[]>([])

  const load = useCallback(async () => {
    const [tx, shiftItems, serviceCats, expenseCats, accountItems] = await Promise.all([
      db.transactions.orderBy('createdAt').toArray(),
      db.shifts.orderBy('openedAt').reverse().toArray(),
      db.serviceCategories.orderBy('sortOrder').toArray(),
      db.expenseCategories.orderBy('sortOrder').toArray(),
      db.users.toArray(),
    ])
    setTransactions(tx)
    setShifts(shiftItems)
    setServiceCategories(serviceCats)
    setExpenseCategories(expenseCats)
    setUsers(accountItems)
  }, [])

  useEffect(() => { load() }, [load, revision])

  const inPeriod = (value: string) => {
    const date = new Date(value)
    return date.getFullYear() === year
      && (scope === 'year' || date.getMonth() + 1 === month)
  }

  const filtered = transactions.filter((item) => {
    if (!inPeriod(item.createdAt)) return false
    if (userId !== 'all' && item.userId !== userId) return false

    if (
      serviceCategory !== 'all'
      && item.items.length
      && !item.items.some((entry) => entry.categoryId === serviceCategory)
    ) return false

    if (
      expenseCategory !== 'all'
      && item.direction === 'out'
      && item.categoryId !== expenseCategory
    ) return false

    return true
  })

  const income = filtered
    .filter((item) => item.direction === 'in')
    .reduce((sum, item) => sum + item.amountCents, 0)

  const outcome = filtered
    .filter((item) => item.direction === 'out')
    .reduce((sum, item) => sum + item.amountCents, 0)

  const serviceValue = filtered.reduce(
    (sum, item) => sum + item.serviceSubtotalCents, 0)

  const tipValue = filtered.reduce(
    (sum, item) => sum + item.tipCents, 0)

  const daily = useMemo(() => {
    const map = new Map<string, { incoming: number; outgoing: number }>()

    filtered.forEach((item) => {
      const date = new Date(item.createdAt)
      const key = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      const value = map.get(key) ?? { incoming: 0, outgoing: 0 }

      if (item.direction === 'in') value.incoming += item.amountCents
      else value.outgoing += item.amountCents

      map.set(key, value)
    })

    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [filtered])

  const maxDaily = Math.max(
    1,
    ...daily.flatMap(([, item]) => [item.incoming, item.outgoing]),
  )

  const expenseSummary = useMemo(() => {
    const map = new Map<string, number>()

    filtered
      .filter((item) => item.direction === 'out')
      .forEach((item) => {
        const name = item.categoryName || 'بدون کتگوری'
        map.set(name, (map.get(name) ?? 0) + item.amountCents)
      })

    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [filtered])

  const maxExpense = Math.max(
    1,
    ...expenseSummary.map(([, value]) => value),
  )

  const selectedShifts = shifts.filter((shift) => inPeriod(shift.openedAt))

  return (
    <>
      <PageHeader
        title="تحلیل داده‌ها"
        subtitle="بررسی ورودی، خروجی، خدمات، هزینه‌ها و شیفت‌ها"
      />

      <Card className="analytics-filters">
        <div className="filter-top">
          <Segmented
            value={scope}
            onChange={setScope}
            items={[
              { value: 'month', label: 'ماهانه' },
              { value: 'year', label: 'سالانه' },
            ]}
          />

          <div className="month-filters">
            <label>
              <span>سال</span>
              <select className="input numeric" dir="ltr" value={year}
                onChange={(event) => setYear(Number(event.target.value))}>
                {[year - 2, year - 1, year, year + 1].map((value) =>
                  <option key={value} value={value}>{value}</option>)}
              </select>
            </label>

            {scope === 'month' && (
              <label>
                <span>ماه</span>
                <select className="input" value={month}
                  onChange={(event) => setMonth(Number(event.target.value))}>
                  {monthNames.map((name, index) =>
                    <option key={name} value={index + 1}>{name}</option>)}
                </select>
              </label>
            )}
          </div>
        </div>

        <div className="filter-grid">
          <label>
            <span>کتگوری خدمات</span>
            <select className="input" value={serviceCategory}
              onChange={(event) => setServiceCategory(event.target.value)}>
              <option value="all">همه خدمات</option>
              {serviceCategories.map((item) =>
                <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>

          <label>
            <span>کتگوری هزینه</span>
            <select className="input" value={expenseCategory}
              onChange={(event) => setExpenseCategory(event.target.value)}>
              <option value="all">همه هزینه‌ها</option>
              {expenseCategories.map((item) =>
                <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>

          <label>
            <span>کاربر</span>
            <select className="input" value={userId}
              onChange={(event) => setUserId(event.target.value)}>
              <option value="all">همه کاربران</option>
              {users.map((item) =>
                <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
        </div>
      </Card>

      <div className="metric-grid analytics-metrics">
        <Card className="metric">
          <span>ورودی</span>
          <strong className="positive"><Money cents={income}/></strong>
        </Card>
        <Card className="metric">
          <span>خروجی</span>
          <strong className="negative"><Money cents={outcome}/></strong>
        </Card>
        <Card className="metric">
          <span>خدمات</span>
          <strong><Money cents={serviceValue}/></strong>
        </Card>
        <Card className="metric">
          <span>انعام</span>
          <strong><Money cents={tipValue}/></strong>
        </Card>
      </div>

      <div className="analytics-grid">
        <Card className="chart-card flow-chart-card">
          <div className="panel-heading">
            <div>
              <h2>ورودی و خروجی روزانه</h2>
              <p>مقایسه در بازه انتخاب‌شده</p>
            </div>
            <Icon name="chart"/>
          </div>

          {!daily.length ? (
            <div className="chart-empty">
              داده‌ای در بازه انتخاب‌شده وجود ندارد.
            </div>
          ) : (
            <div className="flow-chart-scroll">
              <div className="flow-chart">
                {daily.map(([date, value]) => (
                  <div className="flow-column" key={date}>
                    <div className="flow-bars">
                      <i className="bar out" style={{
                        '--bar-height': `${value.outgoing / maxDaily * 100}%`,
                      } as CSSProperties}/>
                      <i className="bar in" style={{
                        '--bar-height': `${value.incoming / maxDaily * 100}%`,
                      } as CSSProperties}/>
                    </div>
                    <span className="numeric">{date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="chart-legend">
            <span><i className="legend in"/>ورودی</span>
            <span><i className="legend out"/>خروجی</span>
          </div>
        </Card>

        <Card className="chart-card expense-chart-card">
          <div className="panel-heading">
            <div>
              <h2>تحلیل هزینه‌ها</h2>
              <p>جمع براساس کتگوری</p>
            </div>
            <Icon name="filter"/>
          </div>

          {!expenseSummary.length ? (
            <div className="chart-empty expense-empty">
              هزینه‌ای ثبت نشده است.
            </div>
          ) : (
            <div className="expense-bars">
              {expenseSummary.map(([name, value]) => (
                <div className="expense-bar-row" key={name}>
                  <div>
                    <span>{name}</span>
                    <Money cents={value}/>
                  </div>
                  <i><b style={{ width: `${value / maxExpense * 100}%` }}/></i>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="shift-analysis-card">
        <div className="panel-heading">
          <div>
            <h2>تحلیل شیفت‌ها</h2>
            <p>زمان و موجودی باز و بسته‌شدن صندوق</p>
          </div>
          <Icon name="wallet"/>
        </div>

        {!selectedShifts.length ? (
          <div className="chart-empty">
            شیفتی در بازه انتخاب‌شده وجود ندارد.
          </div>
        ) : (
          <div className="shift-table-scroll">
            <table className="shift-data-table">
              <thead>
                <tr>
                  <th>تاریخ</th>
                  <th>شروع</th>
                  <th>موجودی شروع</th>
                  <th>پایان</th>
                  <th>موجودی پایان</th>
                  <th>تغییر شیفت</th>
                  <th>کاربر</th>
                </tr>
              </thead>
              <tbody>
                {selectedShifts.map((shift) => (
                  <tr key={shift.id}>
                    <td><span className="numeric">{formatDate(shift.openedAt, false)}</span></td>
                    <td><span className="numeric">{formatTime(shift.openedAt)}</span></td>
                    <td><Money cents={shift.openingBalanceCents}/></td>
                    <td>
                      <span className="numeric">
                        {shift.closedAt ? formatTime(shift.closedAt) : '—'}
                      </span>
                    </td>
                    <td>
                      {shift.countedClosingCents === undefined
                        ? '—'
                        : <Money cents={shift.countedClosingCents}/>}
                    </td>
                    <td>
                      <strong className={
                        (shift.shiftChangeCents ?? 0) >= 0 ? 'positive' : 'negative'
                      }>
                        {shift.status === 'open'
                          ? 'در حال انجام'
                          : <Money cents={shift.shiftChangeCents ?? 0} signed/>}
                      </strong>
                    </td>
                    <td>{shift.closedByName ?? shift.openedByName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="shift-count">
          تعداد شیفت‌ها:
          {' '}
          <b className="numeric">{formatInteger(selectedShifts.length)}</b>
        </p>
      </Card>
    </>
  )
}
