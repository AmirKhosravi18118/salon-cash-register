import { useCallback, useEffect, useState } from 'react'
import { Card, ConfirmModal, Icon, Money, PageHeader, SmartMoneyInput, Toast } from '../components/ui'
import { closeShift, db, getCashBalance, getOpenShift, openShift } from '../db'
import { formatDate, formatTime, moneyInputValue, parseMoney } from '../lib/format'
import type { UserAccount, WorkShift } from '../types'

export function CashboxPage({
  user, revision, onChanged,
}: { user: UserAccount; revision: number; onChanged: () => void }) {
  const [shift, setShift] = useState<WorkShift>()
  const [shifts, setShifts] = useState<WorkShift[]>([])
  const [cashBalance, setCashBalance] = useState(0)
  const [initial, setInitial] = useState('0,00')
  const [counted, setCounted] = useState('')
  const [openConfirm, setOpenConfirm] = useState(false)
  const [closeReview, setCloseReview] = useState(false)
  const [toast, setToast] = useState('')

  const load = useCallback(async () => {
    const [open, balance, items] = await Promise.all([
      getOpenShift(), getCashBalance(),
      db.shifts.orderBy('openedAt').reverse().limit(12).toArray(),
    ])
    setShift(open)
    setCashBalance(balance)
    setInitial(moneyInputValue(balance))
    setShifts(items)
  }, [])

  useEffect(() => { load() }, [load, revision])

  const firstShift = shifts.length === 0

  const start = async () => {
    await openShift(user, firstShift ? parseMoney(initial) : undefined)
    setOpenConfirm(false)
    setToast('شیفت باز شد.')
    await load()
    onChanged()
  }

  const close = async () => {
    await closeShift(user, parseMoney(counted))
    setCloseReview(false)
    setCounted('')
    setToast('شیفت بسته شد. موجودی صندوق حفظ شده است.')
    await load()
    onChanged()
  }

  return (
    <>
      <PageHeader title="شیفت" subtitle="باز و بسته‌شدن شیفت فقط برای کنترل و ثبت زمان است."/>

      <div className="cashbox-grid">
        <Card className="cashbox-status">
          <div className="panel-heading">
            <div><h2>موجودی فعلی صندوق</h2>
              <p>{shift ? 'شیفت باز است' : 'شیفت بسته است'}</p></div>
            <Icon name="wallet"/>
          </div>
          <strong className="cashbox-balance"><Money cents={cashBalance}/></strong>
          {shift && (
            <div className="shift-open-info">
              <span>شروع: <b className="numeric">{formatDate(shift.openedAt)}</b></span>
              <span>کاربر: <b>{shift.openedByName}</b></span>
              <span>موجودی شروع: <Money cents={shift.openingBalanceCents}/></span>
            </div>
          )}
        </Card>

        {!shift ? (
          <Card className="shift-action-card">
            <h2>باز کردن شیفت</h2>
            <p>{firstShift
              ? 'برای اولین شیفت، موجودی واقعی فعلی صندوق را وارد کنید.'
              : 'شیفت با موجودی فعلی صندوق باز می‌شود و موجودی صفر نخواهد شد.'}</p>
            {firstShift && (
              <label className="field"><span>موجودی اولیه</span>
                <SmartMoneyInput value={initial} onChange={setInitial}/></label>
            )}
            <button className="button primary full" type="button"
              onClick={() => setOpenConfirm(true)}>
              <Icon name="power"/>باز کردن شیفت
            </button>
          </Card>
        ) : (
          <Card className="shift-action-card">
            <h2>بستن شیفت</h2>
            <p>پول صندوق را بشمارید. پس از بررسی، یک تأیید نهایی نمایش داده می‌شود.</p>
            <label className="field"><span>موجودی شمارش‌شده</span>
              <SmartMoneyInput value={counted} onChange={setCounted}/></label>
            {counted && (
              <div className="difference-preview">
                <span>اختلاف با سیستم</span>
                <strong className={parseMoney(counted) - cashBalance >= 0
                  ? 'positive' : 'negative'}>
                  <Money cents={parseMoney(counted) - cashBalance} signed/>
                </strong>
              </div>
            )}
            <button className="button primary full" type="button"
              disabled={!counted} onClick={() => setCloseReview(true)}>
              <Icon name="check"/>بررسی و ادامه
            </button>
          </Card>
        )}
      </div>

      <Card className="shift-history">
        <div className="panel-heading"><div><h2>تاریخچه شیفت‌ها</h2><p>موجودی و زمان هر شیفت</p></div><Icon name="calendar"/></div>
        {!shifts.length ? <div className="empty-state"><p>شیفتی ثبت نشده است.</p></div> : (
          <div className="responsive-table">
            <div className="table-row header">
              <span>تاریخ</span><span>شروع</span><span>موجودی شروع</span>
              <span>پایان</span><span>موجودی پایان</span><span>تغییر</span>
            </div>
            {shifts.map((item) => (
              <div className="table-row" key={item.id}>
                <span className="numeric">{formatDate(item.openedAt, false)}</span>
                <span className="numeric">{formatTime(item.openedAt)}</span>
                <Money cents={item.openingBalanceCents}/>
                <span className="numeric">{item.closedAt ? formatTime(item.closedAt) : 'باز'}</span>
                <span>{item.countedClosingCents === undefined ? '—' :
                  <Money cents={item.countedClosingCents}/>}</span>
                <strong className={(item.shiftChangeCents ?? 0) >= 0 ? 'positive' : 'negative'}>
                  {item.status === 'open' ? '—' : <Money cents={item.shiftChangeCents ?? 0} signed/>}
                </strong>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ConfirmModal open={openConfirm} title="تأیید بازکردن شیفت"
        text={`شیفت با موجودی ${moneyInputValue(firstShift ? parseMoney(initial) : cashBalance)} یورو باز شود؟`}
        confirmText="بله، شیفت باز شود" onClose={() => setOpenConfirm(false)}
        onConfirm={start}/>

      <ConfirmModal open={closeReview} title="تأیید نهایی بستن شیفت"
        text={`موجودی شمارش‌شده ${moneyInputValue(parseMoney(counted))} یورو است. پس از بستن، موجودی صندوق صفر نمی‌شود و همین مبلغ حفظ خواهد شد.`}
        confirmText="بله، شیفت بسته شود" onClose={() => setCloseReview(false)}
        onConfirm={close}/>

      {toast && <Toast message={toast} onDone={() => setToast('')}/>}
    </>
  )
}
