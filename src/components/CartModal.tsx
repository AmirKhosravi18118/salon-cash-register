import { ArrowLeft, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import type { CartItem } from '../types'
import { euroInput, parseEuro } from '../lib/format'
import { Modal, Money } from './UI'
import { navigate } from './Layout'

export function CartModal({
  open, cart, setCart, onClose,
}: {
  open: boolean
  cart: CartItem[]
  setCart: (cart: CartItem[]) => void
  onClose: () => void
}) {
  const total = cart.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0)

  const update = (id: string, patch: Partial<CartItem>) => {
    setCart(cart.map((item) => item.id === id ? { ...item, ...patch } : item))
  }

  const quantity = (id: string, delta: number) => {
    setCart(cart
      .map((item) => item.id === id ? { ...item, quantity: item.quantity + delta } : item)
      .filter((item) => item.quantity > 0))
  }

  return (
    <Modal open={open} title="سبد خدمات" onClose={onClose} wide>
      {!cart.length ? (
        <div className="empty-cart"><ShoppingCart size={34} /><p>هنوز خدمتی انتخاب نشده است.</p></div>
      ) : (
        <div className="cart-modal-content">
          <div className="cart-item-list">
            {cart.map((item) => (
              <article className="cart-item" key={item.id}>
                <div className="cart-item-title">
                  <strong>{item.name}</strong>
                  <span>قیمت پیش‌فرض: <Money cents={item.basePriceCents} /></span>
                </div>
                <label className="cart-price-field">
                  <span>قیمت واحد</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    dir="ltr"
                    value={euroInput(item.unitPriceCents)}
                    onChange={(event) => update(item.id, { unitPriceCents: parseEuro(event.target.value) })}
                  />
                </label>
                <div className="quantity-box">
                  <button type="button" onClick={() => quantity(item.id, -1)}><Minus size={16} /></button>
                  <span>{item.quantity}</span>
                  <button type="button" onClick={() => quantity(item.id, 1)}><Plus size={16} /></button>
                </div>
                <strong className="cart-line-total"><Money cents={item.unitPriceCents * item.quantity} /></strong>
                <button className="icon-button danger" type="button" onClick={() => setCart(cart.filter((entry) => entry.id !== item.id))}><Trash2 size={18} /></button>
              </article>
            ))}
          </div>
          <div className="cart-footer">
            <div><span>مجموع خدمات</span><strong><Money cents={total} /></strong></div>
            <button
              className="primary-button checkout-button"
              type="button"
              onClick={() => { onClose(); navigate('checkout') }}
            >
              ادامه و پرداخت — <Money cents={total} /><ArrowLeft size={19} />
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
