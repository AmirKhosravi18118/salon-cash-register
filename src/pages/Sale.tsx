import { Check, Package, Plus, ReceiptText, Scissors, WalletCards } from 'lucide-react'
import { useEffect, useState, type CSSProperties } from 'react'
import { navigate } from '../components/AppShell'
import { EmptyState, GlassCard, Money, PageHeader, Toast } from '../components/ui'
import { db, getOpenSession, saveSale } from '../db'
import { createTranslator, serviceName } from '../i18n'
import { euroInput, parseEuro } from '../lib/format'
import type {
  CashSession, Locale, SaleItem, SalonService, ServiceKind,
} from '../types'

interface CartLine {
  service: SalonService
  quantity: number
  unitPriceCents: number
}

export function SalePage({
  locale, revision, onChanged,
}: { locale: Locale; revision: number; onChanged: () => void }) {
  const t = createTranslator(locale)
  const [services, setServices] = useState<SalonService[]>([])
  const [session, setSession] = useState<CashSession>()
  const [cart, setCart] = useState<CartLine[]>([])
  const [filter, setFilter] = useState<'all' | ServiceKind>('all')
  const [tip, setTip] = useState('0')
  const [received, setReceived] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    Promise.all([
      db.services.toArray(),
      getOpenSession(),
    ]).then(([items, open]) => {
      setServices(items.filter((item) => item.active).sort(
        (a, b) => Number(b.kind === 'package') - Number(a.kind === 'package'),
      ))
      setSession(open)
    })
  }, [revision])

  const visible = services.filter((service) => filter === 'all' || service.kind === filter)
  const subtotal = cart.reduce(
    (sum, line) => sum + line.unitPriceCents * line.quantity, 0,
  )
  const tipCents = parseEuro(tip)
  const total = subtotal + tipCents
  const receivedCents = parseEuro(received)
  const change = Math.max(receivedCents - total, 0)

  const addToCart = (service: SalonService) => {
    setCart((current) => {
      const existing = current.find((line) => line.service.id === service.id)
      if (existing) {
        return current.map((line) =>
          line.service.id === service.id
            ? { ...line, quantity: line.quantity + 1 } : line)
      }
      return [...current, { service, quantity: 1, unitPriceCents: service.priceCents }]
    })
  }

  const updateQuantity = (id: string, delta: number) => {
    setCart((current) => current
      .map((line) => line.service.id === id
        ? { ...line, quantity: Math.max(0, line.quantity + delta) } : line)
      .filter((line) => line.quantity > 0))
  }

  const updateLinePrice = (id: string, value: string) => {
    setCart((current) => current.map((line) =>
      line.service.id === id
        ? { ...line, unitPriceCents: parseEuro(value) } : line))
  }

  const completeSale = async () => {
    if (!session || !cart.length || receivedCents < total) return
    const items: SaleItem[] = cart.map((line) => ({
      serviceId: line.service.id,
      nameFa: line.service.nameFa,
      nameDe: line.service.nameDe,
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      totalCents: line.unitPriceCents * line.quantity,
    }))
    await saveSale({ items, tipCents, sessionId: session.id })
    setCart([])
    setTip('0')
    setReceived('')
    setToast(t('sale.saleSaved'))
    onChanged()
  }

  return (
    <>
      <PageHeader title={t('sale.title')} subtitle={t('sale.subtitle')} />

      {!session && (
        <div className="notice warning">
          <WalletCards size={20} /><strong>{t('sale.openCashboxFirst')}</strong>
          <button type="button" onClick={() => navigate('cashbox')}>
            {t('cashbox.startDay')}
          </button>
        </div>
      )}

      <div className="sale-layout">
        <div>
          <div className="segmented">
            <button className={filter === 'all' ? 'active' : ''} type="button" onClick={() => setFilter('all')}>
              {t('common.all')}
            </button>
            <button className={filter === 'package' ? 'active' : ''} type="button" onClick={() => setFilter('package')}>
              <Package size={17} />{t('sale.packages')}
            </button>
            <button className={filter === 'service' ? 'active' : ''} type="button" onClick={() => setFilter('service')}>
              <Scissors size={17} />{t('sale.services')}
            </button>
          </div>

          <div className="service-grid">
            {visible.map((service) => (
              <button
                className={`service-card ${service.kind}`}
                key={service.id} type="button" onClick={() => addToCart(service)}
                style={{ '--accent': service.accent } as CSSProperties}
              >
                <div className="service-card-top">
                  <span className="service-kind">
                    {service.kind === 'package'
                      ? t('sale.packages')
                      : serviceName(locale, {
                          nameFa: service.categoryFa, nameDe: service.categoryDe,
                        })}
                  </span>
                  <span className="add-circle"><Plus size={17} /></span>
                </div>
                <div>
                  <strong>{serviceName(locale, service)}</strong>
                  <small>{locale === 'fa' ? service.nameDe : service.nameFa}</small>
                </div>
                <b><Money cents={service.priceCents} locale={locale} /></b>
              </button>
            ))}
          </div>
        </div>

        <GlassCard className="cart-card">
          <div className="section-heading">
            <div>
              <h2>{t('sale.cart')}</h2>
              <p>{cart.reduce((sum, line) => sum + line.quantity, 0)} {t('sale.services')}</p>
            </div>
            <ReceiptText size={22} />
          </div>

          {!cart.length ? <EmptyState text={t('sale.emptyCart')} /> : (
            <div className="cart-lines">
              {cart.map((line) => (
                <div className="cart-line" key={line.service.id}>
                  <div className="cart-line-name">
                    <strong>{serviceName(locale, line.service)}</strong>
                    {line.service.allowCustomPrice ? (
                      <label className="inline-price">
                        {t('sale.customPrice')}
                        <input
                          type="number" min="0" step="0.01" dir="ltr"
                          value={euroInput(line.unitPriceCents)}
                          onChange={(event) =>
                            updateLinePrice(line.service.id, event.target.value)}
                        />
                      </label>
                    ) : <small><Money cents={line.unitPriceCents} locale={locale} /></small>}
                  </div>
                  <div className="quantity-control">
                    <button type="button" onClick={() => updateQuantity(line.service.id, -1)}>−</button>
                    <span>{line.quantity}</span>
                    <button type="button" onClick={() => updateQuantity(line.service.id, 1)}>+</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="checkout-section">
            <div className="summary-row">
              <span>{t('sale.subtotal')}</span>
              <strong><Money cents={subtotal} locale={locale} /></strong>
            </div>

            <label className="field-label">{t('sale.tip')}</label>
            <div className="tip-options">
              {['0', '2', '5', '10'].map((value) => (
                <button
                  key={value} type="button"
                  className={tip === value ? 'active' : ''}
                  onClick={() => setTip(value)}
                >{value === '0' ? '—' : `${value} €`}</button>
              ))}
            </div>
            <input
              className="input" type="number" min="0" step="0.01" dir="ltr"
              value={tip} onChange={(event) => setTip(event.target.value)}
              placeholder={t('sale.customTip')}
            />

            <div className="total-row">
              <span>{t('sale.total')}</span>
              <strong><Money cents={total} locale={locale} /></strong>
            </div>

            <label className="field-label">{t('sale.received')}</label>
            <input
              className="input input-large" type="number" min="0" step="0.01"
              dir="ltr" value={received}
              onChange={(event) => setReceived(event.target.value)}
              placeholder="0.00"
            />
            <div className="change-row">
              <span>{t('sale.change')}</span>
              <strong><Money cents={change} locale={locale} /></strong>
            </div>

            {received && receivedCents < total && (
              <p className="field-error">{t('sale.insufficient')}</p>
            )}
            <button
              className="primary-button full" type="button" onClick={completeSale}
              disabled={!session || !cart.length || receivedCents < total}
            >
              <Check size={20} />{t('sale.complete')}
            </button>
          </div>
        </GlassCard>
      </div>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </>
  )
}
