import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, Icon, Modal, Money, PageHeader, Segmented, SmartMoneyInput, Toast } from '../components/ui'
import { db, recordActivity } from '../db'
import { formatDate, localMonthKey, monthNames, parseMoney } from '../lib/format'
import type {
  CashTransaction, ExpenseCategory, TransactionDirection,
  TransactionKind, UserAccount,
} from '../types'

export function ActivitiesPage({
  user, revision, onChanged,
}: { user: UserAccount; revision: number; onChanged: () => void }) {
  const currentMonth = localMonthKey()
  const [direction, setDirection] = useState<TransactionDirection>('in')
  const [year, setYear] = useState(Number(currentMonth.slice(0, 4)))
  const [month, setMonth] = useState(Number(currentMonth.slice(5, 7)))
  const [transactions, setTransactions] = useState<CashTransaction[]>([])
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [note, setNote] = useState('')
  const [toast, setToast] = useState('')

  const load = useCallback(async () => {
    const [items, categories] = await Promise.all([
      db.transactions.orderBy('createdAt').reverse().toArray(),
      db.expenseCategories.orderBy('sortOrder').toArray(),
    ])
    setTransactions(items)
    setExpenseCategories(categories.filter((item) => item.active))
  }, [])

  useEffect(() => { load() }, [load, revision])

  const years = useMemo(() => {
    const values = new Set<number>([new Date().getFullYear()])
    transactions.forEach((item) => values.add(new Date(item.createdAt).getFullYear()))
    return [...values].sort((a, b) => b - a)
  }, [transactions])

  const visible = transactions.filter((item) => {
    const date = new Date(item.createdAt)
    return item.direction === direction
      && date.getFullYear() === year
      && date.getMonth() + 1 === month
  })

  const save = async () => {
    const amountCents = parseMoney(amount)
    if (amountCents <= 0) return
    const expenseCategory = expenseCategories.find((item) => item.id === categoryId)
    const kind: TransactionKind = direction === 'in' ? 'deposit' : 'expense'
    await recordActivity({
      direction, kind, amountCents,
      categoryId: direction === 'out' ? expenseCategory?.id : undefined,
      categoryName: direction === 'out'
        ? expenseCategory?.name ?? 'سایر هزینه‌ها'
        : 'ورودی',
      note, user,
    })
    setAmount('')
    setNote('')
    setCategoryId('')
    setAddOpen(false)
    setToast('فعالیت ثبت شد.')
    await load()
    onChanged()
  }

  return (
    <>
      <PageHeader title="فعالیت‌ها" subtitle="ورودی‌ها و خروجی‌ها به‌صورت جداگانه نمایش داده می‌شوند."
        action={<button className="button primary" type="button" onClick={() => setAddOpen(true)}>
          <Icon name="plus"/>ثبت فعالیت
        </button>}/>

      <Card className="activities-card">
        <div className="activities-toolbar">
          <Segmented value={direction} onChange={(value) =>
            setDirection(value as TransactionDirection)}
            items={[
              { value: 'in', label: 'ورودی‌ها' },
              { value: 'out', label: 'خروجی‌ها و هزینه‌ها' },
            ]}/>
          <div className="month-filters">
            <label><span>سال</span>
              <select className="input numeric" dir="ltr" value={year}
                onChange={(event) => setYear(Number(event.target.value))}>
                {years.map((value) => <option value={value} key={value}>{value}</option>)}
              </select>
            </label>
            <label><span>ماه</span>
              <select className="input" value={month}
                onChange={(event) => setMonth(Number(event.target.value))}>
                {monthNames.map((name, index) =>
                  <option value={index + 1} key={name}>{name}</option>)}
              </select>
            </label>
          </div>
        </div>

        {!visible.length ? (
          <div className="empty-state"><p>در ماه انتخاب‌شده فعالیتی وجود ندارد.</p></div>
        ) : (
          <div className="activity-list">
            {visible.map((item) => (
              <article className="activity-row detailed" key={item.id}>
                <div className={`activity-direction ${item.direction}`}>
                  <Icon name={item.direction === 'in' ? 'arrow-down' : 'arrow-up'}/>
                </div>
                <div className="activity-copy">
                  <strong>{item.items.length
                    ? item.items.map((entry) => entry.name).join('، ')
                    : item.categoryName || 'فعالیت'}</strong>
                  <small>
                    <span className="numeric">{formatDate(item.createdAt)}</span>
                    {' — '}{item.userName}
                  </small>
                  {item.note && <p>{item.note}</p>}
                </div>
                <div className="activity-meta">
                  <strong className={item.direction === 'in' ? 'positive' : 'negative'}>
                    <Money cents={item.direction === 'in' ? item.amountCents : -item.amountCents} signed/>
                  </strong>
                  <small className="numeric">{item.sequence}</small>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>

      <Modal open={addOpen} title="ثبت فعالیت" onClose={() => setAddOpen(false)}
        className="small-modal">
        <div className="simple-form">
          <Segmented value={direction} onChange={(value) =>
            setDirection(value as TransactionDirection)}
            items={[
              { value: 'in', label: 'ورودی' },
              { value: 'out', label: 'خروجی' },
            ]}/>
          {direction === 'out' && (
            <label className="field"><span>کتگوری هزینه</span>
              <select className="input" value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}>
                <option value="">انتخاب کنید</option>
                {expenseCategories.map((item) =>
                  <option value={item.id} key={item.id}>{item.name}</option>)}
              </select>
            </label>
          )}
          <label className="field"><span>مبلغ</span>
            <SmartMoneyInput value={amount} onChange={setAmount}/></label>
          <label className="field"><span>توضیحات</span>
            <textarea className="input textarea" value={note}
              onChange={(event) => setNote(event.target.value)}/></label>
          <div className="modal-actions">
            <button className="button secondary" type="button"
              onClick={() => setAddOpen(false)}>انصراف</button>
            <button className="button primary" type="button" onClick={save}>
              <Icon name="check"/>ثبت
            </button>
          </div>
        </div>
      </Modal>
      {toast && <Toast message={toast} onDone={() => setToast('')}/>}
    </>
  )
}
