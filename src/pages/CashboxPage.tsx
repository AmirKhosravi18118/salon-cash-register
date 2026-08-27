import { Check, Clock, LockKeyhole, UnlockKeyhole, WalletCards } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Card, ConfirmModal, Money, PageHeader, Toast } from '../components/UI'
import { cashBalance, closeShift, db, getOpenSession, openShift } from '../db'
import { euroInput, formatDate, parseEuro } from '../lib/format'
import type { CashSession, User } from '../types'

export function CashboxPage({
  user, revision, onChanged,
}: { user: User; revision: number; onChanged: () => void }) {
  const [balance, setBalance] = useState(0)
  const [session, setSession] = useState<CashSession>()
  const [sessions, setSessions] = useState<CashSession[]>([])
  const [counted, setCounted] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toast, setToast] = useState('')

  const load = async () => {
    const [currentBalance, open, history] = await Promise.all([
      cashBalance(),
      getOpenSession(),
      db.sessions.orderBy('openedAt').reverse().limit(12).toArray(),
    ])
    setBalance(currentBalance)
    setSession(open)
    setSessions(history)
    if (!counted) setCounted(euroInput(currentBalance))
  }

  useEffect(() => { load() }, [revision])

  const start = async () => {
    await openShift(parseEuro(counted), user)
    setToast('شیفت باز شد.')
    onChanged()
    await load()
  }

  const close = async () => {
    await closeShift(parseEuro(counted), user)
    setConfirmOpen(false)
    setToast('شیفت بسته شد؛ موجودی صندوق حفظ شد.')
    onChanged()
    await load()
  }

  return (
    <>
      <PageHeader title="شروع و پایان شیفت" subtitle="باز و بسته‌کردن شیفت فقط برای کنترل و ثبت زمان است؛ موجودی صندوق حفظ می‌شود." />

      <div className="shift-grid">
        <Card className="shift-status">
          <div className={`large-status-icon ${session ? 'open' : ''}`}>{session ? <UnlockKeyhole size={31} /> : <LockKeyhole size={31} />}</div>
          <div><span>وضعیت فعلی</span><h2>{session ? 'شیفت باز است' : 'شیفت بسته است'}</h2>{session && <p>شروع: {formatDate(session.openedAt)} توسط {session.openedByName}</p>}</div>
          <div className="current-cash"><span>موجودی سیستم</span><strong><Money cents={balance} /></strong></div>
        </Card>

        <Card className="shift-action">
          <h2>{session ? 'بستن شیفت' : 'بازکردن شیفت'}</h2>
          <p>موجودی واقعی صندوق را بشمار و برای دبل‌چک وارد کن.</p>
          <label><span>موجودی شمارش‌شده</span><input className="input input-large" type="number" min="0" step="0.01" dir="ltr" value={counted} onChange={(event) => setCounted(event.target.value)} /></label>
          <div className="compare-row"><span>اختلاف با سیستم</span><strong className={parseEuro(counted) - balance >= 0 ? 'positive' : 'negative'}><Money cents={parseEuro(counted) - balance} signed /></strong></div>
          {session ? (
            <button className="primary-button full" type="button" onClick={() => setConfirmOpen(true)}><Check size={19} />بررسی و بستن شیفت</button>
          ) : (
            <button className="primary-button full" type="button" onClick={start}><UnlockKeyhole size={19} />تأیید و بازکردن شیفت</button>
          )}
        </Card>
      </div>

      <Card className="shift-history-card">
        <div className="section-heading"><div><h2>تاریخچه شیفت‌ها</h2><p>شروع، پایان و تغییر موجودی هر شیفت</p></div><Clock size={22} /></div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>تاریخ</th><th>زمان شروع</th><th>موجودی شروع</th><th>زمان پایان</th><th>موجودی پایان</th><th>تغییر</th></tr></thead>
            <tbody>
              {sessions.map((item) => (
                <tr key={item.id}>
                  <td>{formatDate(item.openedAt, false)}</td>
                  <td>{formatDate(item.openedAt)}</td>
                  <td><Money cents={item.openingCountedCents} /></td>
                  <td>{item.closedAt ? formatDate(item.closedAt) : 'باز'}</td>
                  <td>{item.closingCountedCents === undefined ? '—' : <Money cents={item.closingCountedCents} />}</td>
                  <td className={(item.shiftChangeCents ?? 0) >= 0 ? 'positive' : 'negative'}>{item.shiftChangeCents === undefined ? '—' : <Money cents={item.shiftChangeCents} signed />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <ConfirmModal
        open={confirmOpen}
        title="تأیید پایان شیفت"
        message={`موجودی شمارش‌شده ${euroInput(parseEuro(counted))} یورو ثبت می‌شود. این کار موجودی صندوق را صفر نمی‌کند. مطمئنی؟`}
        confirmText="بستن شیفت"
        onClose={() => setConfirmOpen(false)}
        onConfirm={close}
      />

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </>
  )
}
