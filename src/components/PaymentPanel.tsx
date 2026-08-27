import { useEffect, useMemo, useState } from 'react'
import { getOpenShift, recordServicePayment } from '../db'
import { calculateIncludedTax, formatMoney, parseMoney } from '../lib/format'
import type { CartItem, UserAccount } from '../types'
import { Card, Icon, Money, SmartMoneyInput, Toast } from './ui'

export function PaymentPanel({
  cart, user, revision, compact = false, onSuccess,
}: {
  cart: CartItem[]
  user: UserAccount
  revision: number
  compact?: boolean
  onSuccess: () => void
}) {
  const [tip, setTip] = useState('0,00')
  const [received, setReceived] = useState('')
  const [shiftOpen, setShiftOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getOpenShift().then((shift) => setShiftOpen(Boolean(shift)))
  }, [revision])

  const subtotal = useMemo(() =>
    cart.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0), [cart])
  const tipCents = parseMoney(tip)
  const total = subtotal + tipCents
  const receivedCents = parseMoney(received)
  const change = Math.max(0, receivedCents - total)

  const pay = async () => {
    if (!shiftOpen) {
      setToast('برای ثبت خدمات ابتدا شیفت را باز کنید.')
      return
    }
    if (!cart.length || receivedCents < total) return
    setBusy(true)
    try {
      await recordServicePayment({ cart, tipCents, receivedCents, user })
      setTip('0,00')
      setReceived('')
      setToast('عملیات با موفقیت ثبت شد.')
      onSuccess()
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Card className={`payment-panel ${compact ? 'compact' : ''}`}>
        <div className="panel-heading">
          <div><h2>پرداخت</h2><p><span className="numeric">{cart.length}</span> مورد انتخاب‌شده</p></div>
          <Icon name="wallet"/>
        </div>

        {!shiftOpen && (
          <div className="inline-warning">برای ثبت خدمات ابتدا شیفت را باز کنید.</div>
        )}

        <div className="payment-summary">
          <div><span>مجموع خدمات</span><Money cents={subtotal}/></div>
          <div><span>مالیات <span className="numeric">19%</span> موجود در مبلغ</span>
            <Money cents={calculateIncludedTax(subtotal)}/></div>
        </div>

        <label className="field">
          <span>انعام</span>
          <SmartMoneyInput value={tip} onChange={setTip} ariaLabel="انعام"/>
        </label>

        <div className="payment-total">
          <span>مبلغ نهایی</span><Money cents={total}/>
        </div>

        <label className="field">
          <span>مبلغ دریافتی</span>
          <SmartMoneyInput value={received} onChange={setReceived}
            ariaLabel="مبلغ دریافتی"/>
        </label>

        <div className="change-line">
          <span>باقی‌مانده</span><Money cents={change}/>
        </div>

        {received && receivedCents < total && (
          <p className="field-error">مبلغ دریافتی کمتر از مبلغ نهایی است.</p>
        )}

        <button className="button primary full" type="button" disabled={
          busy || !shiftOpen || !cart.length || receivedCents < total
        } onClick={pay}>
          <Icon name="check"/>{busy ? 'در حال ثبت…' : `ثبت پرداخت — ${formatMoney(total)}`}
        </button>
      </Card>
      {toast && <Toast message={toast} onDone={() => setToast('')}/>}
    </>
  )
}
