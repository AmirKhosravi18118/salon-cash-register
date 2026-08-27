import { ArrowDown, ArrowUp, Plus } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Card, Modal, Money, PageHeader, Toast } from '../components/UI'
import { db, getOpenSession, saveMovement } from '../db'
import { dayKey, formatDate, parseEuro } from '../lib/format'
import type { CashTransaction, ExpenseCategory, MovementKind, User } from '../types'

export function ActivitiesPage({
  user, revision, onChanged,
}: { user: User; revision: number; onChanged: () => void }) {
  const [tab, setTab] = useState<'in' | 'out'>('in')
  const [transactions, setTransactions] = useState<CashTransaction[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [modal, setModal] = useState(false)
  const [kind, setKind] = useState<Exclude<MovementKind, 'service'>>('expense')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [note, setNote] = useState('')
  const [toast, setToast] = useState('')

  const load = async () => {
    const [tx, expenseRows] = await Promise.all([
      db.transactions.orderBy('createdAt').reverse().toArray(),
      db.expenseCategories.orderBy('order').toArray(),
    ])
    setTransactions(tx)
    setCategories(expenseRows.filter((item) => item.active))
  }

  useEffect(() => { load() }, [revision])

  const filtered = transactions.filter((item) => {
    const direction = tab === 'in' ? item.cashEffectCents > 0 : item.cashEffectCents < 0
    const key = dayKey(item.createdAt)
    return direction && (!from || key >= from) && (!to || key <= to)
  })

  const openAdd = () => {
    setKind(tab === 'in' ? 'deposit' : 'expense')
    setCategoryId('')
    setAmount('')
    setNote('')
    setModal(true)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!(await getOpenSession())) {
      setToast('برای ثبت فعالیت ابتدا باید شیفت را باز کنید.')
      return
    }
    const category = categories.find((item) => item.id === categoryId)
    await saveMovement({
      kind,
      amountCents: parseEuro(amount),
      categoryId: category?.id,
      categoryName: kind === 'expense' ? category?.name ?? 'سایر هزینه‌ها' : kind === 'bank' ? 'واریز به بانک' : 'ورودی صندوق',
      note,
      user,
    })
    setModal(false)
    setToast('فعالیت ثبت شد.')
    onChanged()
    await load()
  }

  return (
    <>
      <PageHeader
        title="فعالیت‌ها"
        subtitle="ورودی‌ها و خروجی‌ها به‌صورت جداگانه نمایش داده می‌شوند."
        action={<button className="primary-button" type="button" onClick={openAdd}><Plus size={18} />ثبت فعالیت</button>}
      />

      <Card>
        <div className="activity-toolbar">
          <div className="segmented">
            <button className={tab === 'in' ? 'active' : ''} onClick={() => setTab('in')} type="button"><ArrowDown size={18} />ورودی‌ها</button>
            <button className={tab === 'out' ? 'active' : ''} onClick={() => setTab('out')} type="button"><ArrowUp size={18} />خروجی‌ها و هزینه‌ها</button>
          </div>
          <div className="date-filters"><label>از<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>تا<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label></div>
        </div>

        {!filtered.length ? <div className="empty-state">در این بازه موردی ثبت نشده است.</div> : (
          <div className="activity-list">
            {filtered.map((item) => (
              <div className="activity-row" key={item.id}>
                <div><strong>{item.items.map((entry) => entry.name).join('، ') || item.categoryName}</strong><span>{formatDate(item.createdAt)} — {item.userName}</span>{item.note && <small>{item.note}</small>}</div>
                <strong className={item.cashEffectCents > 0 ? 'positive' : 'negative'}><Money cents={item.cashEffectCents} signed /></strong>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={modal} title={tab === 'in' ? 'ثبت ورودی' : 'ثبت خروجی یا هزینه'} onClose={() => setModal(false)}>
        <form className="modal-form" onSubmit={submit}>
          <label><span>نوع فعالیت</span><select className="input" value={kind} onChange={(event) => setKind(event.target.value as Exclude<MovementKind, 'service'>)}>
            {tab === 'in' ? <><option value="deposit">واریز به صندوق</option><option value="adjustment">اصلاح افزایشی</option></> : <><option value="expense">هزینه</option><option value="withdrawal">برداشت</option><option value="bank">واریز به بانک</option><option value="refund">بازپرداخت</option></>}
          </select></label>
          {kind === 'expense' && <label><span>کتگوری هزینه</span><select className="input" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required><option value="">انتخاب کن</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
          <label><span>مبلغ</span><input className="input input-large" type="number" min="0.01" step="0.01" dir="ltr" value={amount} onChange={(event) => setAmount(event.target.value)} required /></label>
          <label><span>توضیحات</span><textarea className="input" value={note} onChange={(event) => setNote(event.target.value)} /></label>
          <div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setModal(false)}>انصراف</button><button className="primary-button" type="submit">ثبت</button></div>
        </form>
      </Modal>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </>
  )
}
