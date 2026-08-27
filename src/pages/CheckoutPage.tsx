import { ArrowRight, Check, ReceiptText } from 'lucide-react'
import { useEffect, useState } from 'react'
import { navigate } from '../components/Layout'
import { Card, Money, PageHeader, Toast } from '../components/UI'
import { getOpenSession, saveServiceOperation } from '../db'
import { parseEuro } from '../lib/format'
import type { CartItem, User } from '../types'

export function CheckoutPage({
  cart, setCart, user,
}: { cart: CartItem[]; setCart: (items: CartItem[]) => void; user: User }) {
  const [tip, setTip] = useState('0')
  const [received, setReceived] = useState('')
  const [allowed, setAllowed] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => { getOpenSession().then((session) => setAllowed(Boolean(session))) }, [])

  const servicesTotal = cart.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0)
  const vat = Math.round(servicesTotal - servicesTotal / 1.19)
  const tipCents = parseEuro(tip)
  const finalTotal = servicesTotal + tipCents
  const receivedCents = parseEuro(received)
  const change = Math.max(0, receivedCents - finalTotal)

  const complete = async () => {
    if (!allowed || !cart.length || receivedCents < finalTotal) return
    await saveServiceOperation({
      items: cart.map((item) => ({
        serviceId: item.serviceId,
        categoryId: item.categoryId,
        name: item.name,
        basePriceCents: item.basePriceCents,
        unitPriceCents: item.unitPriceCents,
        quantity: item.quantity,
        totalCents: item.unitPriceCents * item.quantity,
        custom: item.custom,
      })),
      tipCents,
      user,
    })
    setCart([])
    setToast('عملیات با موفقیت ثبت شد.')
    window.setTimeout(() => navigate(user.role === 'manager' ? 'dashboard' : 'services'), 700)
  }

  if (!cart.length) {
    return (
      <>
        <PageHeader title="پرداخت" />
        <Card className="empty-checkout">
          <ReceiptText size={38} />
          <p>سبد خدمات خالی است.</p>
          <button className="primary-button" onClick={() => navigate('services')}>بازگشت به خدمات</button>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="پرداخت"
        subtitle="مبلغ‌ها را بررسی و عملیات را نهایی کن."
        action={<button className="secondary-button" type="button" onClick={() => navigate('services')}><ArrowRight size={18} />بازگشت به خدمات</button>}
      />

      {!allowed && <div className="notice warning">برای ثبت خدمات ابتدا باید شیفت را باز کنید.</div>}

      <div className="checkout-layout">
        <Card className="checkout-items">
          <h2>خدمات انتخاب‌شده</h2>
          {cart.map((item) => (
            <div className="checkout-line" key={item.id}>
              <div><strong>{item.name}</strong><span>{item.quantity} × <Money cents={item.unitPriceCents} /></span></div>
              <strong><Money cents={item.unitPriceCents * item.quantity} /></strong>
            </div>
          ))}
        </Card>

        <Card className="payment-card">
          <div className="payment-row"><span>مجموع خدمات</span><strong><Money cents={servicesTotal} /></strong></div>
          <div className="payment-row vat"><span>مالیات ۱۹٪ موجود در مبلغ</span><strong><Money cents={vat} /></strong></div>
          <label><span>انعام</span><input className="input" type="number" min="0" step="0.01" dir="ltr" value={tip} onChange={(event) => setTip(event.target.value)} /></label>
          <div className="payment-row final"><span>مبلغ نهایی</span><strong><Money cents={finalTotal} /></strong></div>
          <label><span>مبلغ دریافتی</span><input className="input input-large" type="number" min="0" step="0.01" dir="ltr" value={received} onChange={(event) => setReceived(event.target.value)} /></label>
          <div className="payment-row"><span>باقی‌مانده</span><strong><Money cents={change} /></strong></div>
          {received && receivedCents < finalTotal && <p className="form-error">مبلغ دریافتی کمتر از مبلغ نهایی است.</p>}
          <button className="primary-button full" type="button" disabled={!allowed || receivedCents < finalTotal} onClick={complete}><Check size={20} />ثبت نهایی</button>
        </Card>
      </div>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </>
  )
}
