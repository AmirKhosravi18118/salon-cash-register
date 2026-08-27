import { Lock, Plus, Search, ShoppingCart } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { db, getOpenSession } from '../db'
import { euroInput, parseEuro } from '../lib/format'
import type { CartItem, CashSession, Service, ServiceCategory } from '../types'
import { Card, Modal, Money, PageHeader, Toast } from '../components/UI'

export function ServicesPage({
  cart, setCart, onOpenCart,
}: {
  cart: CartItem[]
  setCart: (items: CartItem[]) => void
  onOpenCart: () => void
}) {
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [session, setSession] = useState<CashSession>()
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [variableTarget, setVariableTarget] = useState<Service | null>(null)
  const [variablePrice, setVariablePrice] = useState('')
  const [customOpen, setCustomOpen] = useState(false)
  const [customName, setCustomName] = useState('خدمات اضافه')
  const [customPrice, setCustomPrice] = useState('')
  const [toast, setToast] = useState('')

  const load = async () => {
    const [categoryRows, serviceRows, open] = await Promise.all([
      db.serviceCategories.orderBy('order').toArray(),
      db.services.toArray(),
      getOpenSession(),
    ])
    setCategories(categoryRows.filter((item) => item.active))
    setServices(serviceRows.filter((item) => item.active))
    setSession(open)
  }

  useEffect(() => { load() }, [])

  const visible = useMemo(() => services.filter((service) => {
    const categoryMatch = category === 'all' || service.categoryId === category
    const queryMatch = service.name.toLowerCase().includes(query.toLowerCase())
    return categoryMatch && queryMatch
  }), [category, query, services])

  const addItem = (service: Service, unitPriceCents = service.priceCents) => {
    const existing = cart.find((item) => item.serviceId === service.id && !item.custom)
    if (existing) {
      setCart(cart.map((item) => item.id === existing.id
        ? { ...item, quantity: item.quantity + 1 }
        : item))
    } else {
      setCart([...cart, {
        id: crypto.randomUUID(),
        serviceId: service.id,
        categoryId: service.categoryId,
        name: service.name,
        basePriceCents: service.priceCents,
        unitPriceCents,
        quantity: 1,
        custom: false,
      }])
    }
    setToast('به سبد اضافه شد.')
  }

  const chooseService = (service: Service) => {
    if (!session) return
    if (service.priceMode === 'from') {
      setVariableTarget(service)
      setVariablePrice(euroInput(service.priceCents))
    } else {
      addItem(service)
    }
  }

  const submitVariable = (event: FormEvent) => {
    event.preventDefault()
    if (!variableTarget) return
    addItem(variableTarget, parseEuro(variablePrice))
    setVariableTarget(null)
  }

  const submitCustom = (event: FormEvent) => {
    event.preventDefault()
    const price = parseEuro(customPrice)
    if (price <= 0) return
    setCart([...cart, {
      id: crypto.randomUUID(),
      name: customName.trim() || 'خدمات اضافه',
      basePriceCents: price,
      unitPriceCents: price,
      quantity: 1,
      custom: true,
    }])
    setCustomOpen(false)
    setCustomName('خدمات اضافه')
    setCustomPrice('')
    setToast('خدمت اضافه وارد سبد شد.')
  }

  return (
    <>
      <PageHeader
        title="خدمات"
        subtitle="خدمت موردنظر را انتخاب کن و در سبد قیمت نهایی را بررسی کن."
        action={
          <button className="cart-button" type="button" onClick={onOpenCart}>
            <ShoppingCart size={21} />
            <span>مشاهده سبد</span>
            {cart.length > 0 && <b>{cart.reduce((sum, item) => sum + item.quantity, 0)}</b>}
          </button>
        }
      />

      {!session && (
        <div className="notice warning">
          <Lock size={20} />
          <strong>برای ورود خدمات ابتدا باید شیفت را باز کنید.</strong>
        </div>
      )}

      <div className="services-toolbar">
        <div className="search-box"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جست‌وجوی خدمات" /></div>
        <div className="category-scroll">
          <button className={category === 'all' ? 'active' : ''} onClick={() => setCategory('all')} type="button">همه</button>
          {categories.map((item) => (
            <button key={item.id} className={category === item.id ? 'active' : ''} onClick={() => setCategory(item.id)} type="button">{item.name}</button>
          ))}
        </div>
      </div>

      <div className="service-grid">
        <button
          className="service-card custom-service-card"
          type="button"
          onClick={() => session && setCustomOpen(true)}
          disabled={!session}
        >
          <Plus size={27} />
          <strong>خدمات اضافه</strong>
          <span>ورود دستی مبلغ</span>
        </button>

        {visible.map((service) => (
          <button
            key={service.id}
            className="service-card"
            type="button"
            onClick={() => chooseService(service)}
            disabled={!session}
          >
            <strong>{service.name}</strong>
            <b>{service.priceMode === 'from' && <small>از </small>}<Money cents={service.priceCents} /></b>
          </button>
        ))}
      </div>

      <Modal open={Boolean(variableTarget)} title="تعیین قیمت این خدمت" onClose={() => setVariableTarget(null)}>
        <form className="modal-form" onSubmit={submitVariable}>
          <div className="selected-service-summary">
            <strong>{variableTarget?.name}</strong>
            <span>قیمت پایه: {variableTarget && <Money cents={variableTarget.priceCents} />}</span>
          </div>
          <label><span>قیمت نهایی این خدمت</span><input className="input input-large" type="number" min="0" step="0.01" dir="ltr" value={variablePrice} onChange={(event) => setVariablePrice(event.target.value)} autoFocus required /></label>
          <div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setVariableTarget(null)}>انصراف</button><button className="primary-button" type="submit">افزودن به سبد</button></div>
        </form>
      </Modal>

      <Modal open={customOpen} title="خدمات اضافه" onClose={() => setCustomOpen(false)}>
        <form className="modal-form" onSubmit={submitCustom}>
          <label><span>عنوان خدمت</span><input className="input" value={customName} onChange={(event) => setCustomName(event.target.value)} /></label>
          <label><span>قیمت</span><input className="input input-large" type="number" min="0" step="0.01" dir="ltr" value={customPrice} onChange={(event) => setCustomPrice(event.target.value)} autoFocus required /></label>
          <div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setCustomOpen(false)}>انصراف</button><button className="primary-button" type="submit">افزودن به سبد</button></div>
        </form>
      </Modal>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </>
  )
}
