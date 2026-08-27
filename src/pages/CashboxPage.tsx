import { useCallback, useEffect, useState } from 'react'
import {
  Card, ConfirmModal, Icon, Money, PageHeader, SmartMoneyInput, Toast,
} from '../components/ui'
import { closeShift, db, getCashBalance, getOpenShift, openShift } from '../db'
import { formatDate, formatTime, moneyInputValue, parseMoney } from '../lib/format'
import type { UserAccount, WorkShift } from '../types'

export function CashboxPage({
  user, revision, onChanged,
}: {
  user: UserAccount
  revision: number
  onChanged: () => void
}) {
  const [shift, setShift] = useState<WorkShift>()
  const [shifts, setShifts] = useState<WorkShift[]>([])
  const [cashBalance, setCashBalance] = useState(0)
  const [openingCounted, setOpeningCounted] = useState('0,00')
  const [counted, setCounted] = useState('')
  const [openConfirm, setOpenConfirm] = useState(false)
  const [closeReview, setCloseReview] = useState(false)
  const [toast, setToast] = useState('')

  const load = useCallback(async () => {
    const [open, balance, items] = await Promise.all([
      getOpenShift(),
      getCashBalance(),
      db.shifts.orderBy('openedAt').reverse().limit(30).toArray(),
    ])
    setShift(open)
    setCashBalance(balance)
    setOpeningCounted(moneyInputValue(balance))
    setShifts(items)
  }, [])

  useEffect(() => { load() }, [load, revision])

  const openingDifference = parseMoney(openingCounted) - cashBalance

  const start = async () => {
    await openShift(user, parseMoney(openingCounted))
    setOpenConfirm(false)
    setToast('شیفت باز شد و موجودی شروع ثبت شد.')
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
      <PageHeader
        title="شیفت"
        subtitle="مدیر و کارمند می‌توانند موجودی شروع و پایان شیفت را کنترل و ثبت کنند."
      />

      <div className="cashbox-grid">
        <Card className="cashbox-status">
          <div className="panel-heading">
            <div>
              <h2>موجودی فعلی صندوق</h2>
              <p>{shift ? 'شیفت باز است' : 'شیفت بسته است'}</p>
            </div>
            <Icon name="wallet"/>
          </div>

          <strong className="cashbox-balance">
            <Money cents={cashBalance}/>
          </strong>

          {shift && (
            <div className="shift-open-info">
              <span>
                شروع:
                {' '}
                <b className="numeric">{formatDate(shift.openedAt)}</b>
              </span>
              <span>کاربر: <b>{shift.openedByName}</b></span>
              <span>
                موجودی شروع:
                {' '}
                <Money cents={shift.openingBalanceCents}/>
              </span>
            </div>
          )}
        </Card>

        {!shift ? (
          <Card className="shift-action-card">
            <h2>باز کردن شیفت</h2>
            <p>
              موجودی واقعی صندوق را بشمارید. مبلغ واردشده با موجودی سیستم
              تطبیق داده می‌شود و به‌عنوان موجودی شروع شیفت ثبت خواهد شد.
            </p>

            <div className="system-balance-line">
              <span>موجودی ثبت‌شده سیستم</span>
              <strong><Money cents={cashBalance}/></strong>
            </div>

            <label className="field">
              <span>موجودی شمارش‌شده شروع</span>
              <SmartMoneyInput
                value={openingCounted}
                onChange={setOpeningCounted}
                ariaLabel="موجودی شمارش‌شده شروع شیفت"
              />
            </label>

            <div className="difference-preview">
              <span>اختلاف شروع شیفت</span>
              <strong className={openingDifference >= 0 ? 'positive' : 'negative'}>
                <Money cents={openingDifference} signed/>
              </strong>
            </div>

            <button className="button primary full" type="button"
              disabled={!openingCounted}
              onClick={() => setOpenConfirm(true)}>
              <Icon name="power"/>باز کردن شیفت
            </button>
          </Card>
        ) : (
          <Card className="shift-action-card">
            <h2>بستن شیفت</h2>
            <p>
              پول صندوق را بشمارید. پس از بررسی، یک تأیید نهایی نمایش داده می‌شود.
            </p>

            <label className="field">
              <span>موجودی شمارش‌شده پایان</span>
              <SmartMoneyInput
                value={counted}
                onChange={setCounted}
                ariaLabel="موجودی شمارش‌شده پایان شیفت"
              />
            </label>

            {counted && (
              <div className="difference-preview">
                <span>اختلاف با سیستم</span>
                <strong className={
                  parseMoney(counted) - cashBalance >= 0 ? 'positive' : 'negative'
                }>
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
        <div className="panel-heading">
          <div>
            <h2>تاریخچه شیفت‌ها</h2>
            <p>موجودی و زمان هر شیفت</p>
          </div>
          <Icon name="calendar"/>
        </div>

        {!shifts.length ? (
          <div className="empty-state"><p>شیفتی ثبت نشده است.</p></div>
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
                  <th>تغییر</th>
                  <th>کاربر</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((item) => (
                  <tr key={item.id}>
                    <td><span className="numeric">{formatDate(item.openedAt, false)}</span></td>
                    <td><span className="numeric">{formatTime(item.openedAt)}</span></td>
                    <td><Money cents={item.openingBalanceCents}/></td>
                    <td>
                      <span className="numeric">
                        {item.closedAt ? formatTime(item.closedAt) : '—'}
                      </span>
                    </td>
                    <td>
                      {item.countedClosingCents === undefined
                        ? '—'
                        : <Money cents={item.countedClosingCents}/>}
                    </td>
                    <td>
                      <strong className={
                        (item.shiftChangeCents ?? 0) >= 0 ? 'positive' : 'negative'
                      }>
                        {item.status === 'open'
                          ? 'در حال انجام'
                          : <Money cents={item.shiftChangeCents ?? 0} signed/>}
                      </strong>
                    </td>
                    <td>{item.closedByName ?? item.openedByName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ConfirmModal
        open={openConfirm}
        title="تأیید بازکردن شیفت"
        text={
          `موجودی شمارش‌شده ${moneyInputValue(parseMoney(openingCounted))} یورو است. `
          + `اختلاف با سیستم ${moneyInputValue(openingDifference)} یورو ثبت شود؟`
        }
        confirmText="بله، شیفت باز شود"
        onClose={() => setOpenConfirm(false)}
        onConfirm={start}
      />

      <ConfirmModal
        open={closeReview}
        title="تأیید نهایی بستن شیفت"
        text={
          `موجودی شمارش‌شده ${moneyInputValue(parseMoney(counted))} یورو است. `
          + 'پس از بستن، موجودی صندوق صفر نمی‌شود و همین مبلغ حفظ خواهد شد.'
        }
        confirmText="بله، شیفت بسته شود"
        onClose={() => setCloseReview(false)}
        onConfirm={close}
      />

      {toast && <Toast message={toast} onDone={() => setToast('')}/>}
    </>
  )
}
