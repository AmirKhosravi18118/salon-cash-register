import {
  useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction,
} from 'react'
import { Card, Icon, Modal, Money, PageHeader, Segmented, SmartMoneyInput, Toast } from '../components/ui'
import { PaymentPanel } from '../components/PaymentPanel'
import { db, getOpenShift } from '../db'
import { moneyInputValue, parseMoney, uid } from '../lib/format'
import type {
  CartItem, SalonService, ServiceCategory, UserAccount,
} from '../types'
import { go } from '../components/Layout'

export function ServicesPage({
  user, cart, setCart, revision, onChanged, onOpenCart, onOpenCheckout,
}: {
  user: UserAccount
  cart: CartItem[]
  setCart: Dispatch<SetStateAction<CartItem[]>>
  revision: number
  onChanged: () => void
  onOpenCart: () => void
  onOpenCheckout: () => void
}) {
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [services, setServices] = useState<SalonService[]>([])
  const [category, setCategory] = useState('all')
  const [shiftOpen, setShiftOpen] = useState(false)
  const [priceTarget, setPriceTarget] = useState<SalonService>()
  const [priceValue, setPriceValue] = useState('')
  const [extraOpen, setExtraOpen] = useState(false)
  const [extraName, setExtraName] = useState('خدمات اضافه')
  const [extraPrice, setExtraPrice] = useState('')
  const [toast, setToast] = useState('')

  const load = useCallback(async () => {
    const [categoryItems, serviceItems, shift] = await Promise.all([
      db.serviceCategories.orderBy('sortOrder').toArray(),
      db.services.orderBy('sortOrder').toArray(),
      getOpenShift(),
    ])
    setCategories(categoryItems.filter((item) => item.active))
    setServices(serviceItems.filter((item) => item.active))
    setShiftOpen(Boolean(shift))
  }, [])

  useEffect(() => { load() }, [load, revision])

  const visible = useMemo(() => services.filter((item) =>
    category === 'all' || item.categoryId === category), [category, services])

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const cartTotal = cart.reduce(
    (sum, item) => sum + item.quantity * item.unitPriceCents, 0)

  const append = (service: SalonService, priceCents = service.priceCents) => {
    setCart((current) => {
      const existing = current.find((item) =>
        item.serviceId === service.id && item.unitPriceCents === priceCents)
      if (existing) {
        return current.map((item) => item.cartId === existing.cartId
          ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return [...current, {
        cartId: uid('cart'),
        serviceId: service.id,
        categoryId: service.categoryId,
        name: service.name,
        quantity: 1,
        unitPriceCents: priceCents,
        defaultPriceCents: service.priceCents,
        pricingMode: service.pricingMode,
      }]
    })
    setToast('به سبد خدمات اضافه شد.')
  }

  const chooseService = (service: SalonService) => {
    if (!shiftOpen) {
      setToast('برای ورود خدمات ابتدا شیفت را باز کنید.')
      return
    }
    if (service.pricingMode === 'from') {
      setPriceTarget(service)
      setPriceValue(moneyInputValue(service.priceCents))
      return
    }
    append(service)
  }

  const addVariable = () => {
    if (!priceTarget) return
    const price = parseMoney(priceValue)
    if (price <= 0) return
    append(priceTarget, price)
    setPriceTarget(undefined)
  }

  const addExtra = () => {
    const price = parseMoney(extraPrice)
    if (price <= 0) return
    setCart((current) => [...current, {
      cartId: uid('cart'),
      name: extraName.trim() || 'خدمات اضافه',
      quantity: 1,
      unitPriceCents: price,
      defaultPriceCents: price,
      pricingMode: 'manual',
    }])
    setExtraName('خدمات اضافه')
    setExtraPrice('')
    setExtraOpen(false)
    setToast('خدمات اضافه به سبد اضافه شد.')
  }

  return (
    <>
      <PageHeader title="خدمات" subtitle="خدمت موردنظر را انتخاب و عملیات را ثبت کنید."
        action={
          <button className="button primary cart-header-button" type="button" onClick={onOpenCart}>
            <Icon name="cart"/>سبد
            {cartCount > 0 && <b className="inline-count numeric">{cartCount}</b>}
          </button>
        }/>

      {!shiftOpen && (
        <div className="notice warning">
          <Icon name="wallet"/>
          <div><strong>شیفت بسته است.</strong><span>برای ورود خدمات ابتدا شیفت را باز کنید.</span></div>
          {user.role === 'manager' && (
            <button type="button" onClick={() => go('cashbox')}>باز کردن شیفت</button>
          )}
        </div>
      )}

      <div className="services-layout">
        <div className="services-main">
          <div className="service-toolbar">
            <button className="extra-service-fixed" type="button"
              disabled={!shiftOpen} onClick={() => setExtraOpen(true)}>
              <Icon name="plus"/><span>خدمات اضافه</span>
            </button>
            <Segmented
              value={category}
              onChange={setCategory}
              items={[
                { value: 'all', label: 'همه' },
                ...categories.map((item) => ({ value: item.id, label: item.name })),
              ]}
            />
          </div>

          <div className="services-grid">
            {visible.map((service) => (
              <button className="service-card" type="button" key={service.id}
                disabled={!shiftOpen} onClick={() => chooseService(service)}>
                <strong>{service.name}</strong>
                <span>
                  {service.pricingMode === 'from' && 'از '}
                  <Money cents={service.priceCents}/>
                </span>
              </button>
            ))}
          </div>
        </div>

        <aside className="desktop-payment">
          <PaymentPanel cart={cart} user={user} revision={revision}
            onSuccess={() => {
              setCart([])
              onChanged()
            }}/>
        </aside>
      </div>

      <div className="mobile-payment-dock">
        <button type="button" className="dock-cart" onClick={onOpenCart}>
          <Icon name="cart"/><span className="numeric">{cartCount}</span>
        </button>
        <div><small>مجموع</small><strong><Money cents={cartTotal}/></strong></div>
        <button type="button" className="button primary" disabled={!cart.length}
          onClick={onOpenCheckout}>پرداخت</button>
      </div>

      <Modal open={Boolean(priceTarget)} title="تعیین قیمت این خدمت"
        onClose={() => setPriceTarget(undefined)} className="small-modal">
        {priceTarget && (
          <div className="simple-form">
            <div className="selected-service-summary">
              <strong>{priceTarget.name}</strong>
              <span>قیمت پایه: <Money cents={priceTarget.priceCents}/></span>
            </div>
            <label className="field"><span>قیمت نهایی این خدمت</span>
              <SmartMoneyInput value={priceValue} onChange={setPriceValue}/></label>
            <div className="modal-actions">
              <button className="button secondary" type="button"
                onClick={() => setPriceTarget(undefined)}>انصراف</button>
              <button className="button primary" type="button" onClick={addVariable}>
                <Icon name="plus"/>افزودن به سبد
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={extraOpen} title="خدمات اضافه" onClose={() => setExtraOpen(false)}
        className="small-modal">
        <div className="simple-form">
          <label className="field"><span>عنوان خدمت</span>
            <input className="input" value={extraName}
              onChange={(event) => setExtraName(event.target.value)}/></label>
          <label className="field"><span>قیمت خدمت</span>
            <SmartMoneyInput value={extraPrice} onChange={setExtraPrice}/></label>
          <div className="modal-actions">
            <button className="button secondary" type="button"
              onClick={() => setExtraOpen(false)}>انصراف</button>
            <button className="button primary" type="button" onClick={addExtra}>
              <Icon name="plus"/>افزودن به سبد
            </button>
          </div>
        </div>
      </Modal>

      {toast && <Toast message={toast} onDone={() => setToast('')}/>}
    </>
  )
}
