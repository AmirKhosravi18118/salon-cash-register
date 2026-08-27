import { useState } from 'react'
import type { CartItem } from '../types'
import { formatMoney, moneyInputValue, parseMoney } from '../lib/format'
import { Icon, Modal, Money, SmartMoneyInput } from './ui'


function CartPriceEditor({
  item, onCommit,
}: {
  item: CartItem
  onCommit: (cents: number) => void
}) {
  const [value, setValue] = useState(moneyInputValue(item.unitPriceCents))
  return (
    <SmartMoneyInput
      value={value}
      onChange={(next) => {
        setValue(next)
        onCommit(parseMoney(next))
      }}
      ariaLabel={`قیمت ${item.name}`}
    />
  )
}

export function CartModal({
  open, cart, onClose, onUpdate, onCheckout,
}: {
  open: boolean
  cart: CartItem[]
  onClose: () => void
  onUpdate: (cart: CartItem[]) => void
  onCheckout: () => void
}) {
  const subtotal = cart.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity, 0)

  const patch = (cartId: string, changes: Partial<CartItem>) => {
    onUpdate(cart.map((item) => item.cartId === cartId ? { ...item, ...changes } : item))
  }

  const remove = (cartId: string) => onUpdate(cart.filter((item) => item.cartId !== cartId))

  return (
    <Modal open={open} title="سبد خدمات" onClose={onClose} className="cart-modal">
      {!cart.length ? (
        <div className="empty-cart"><Icon name="cart" size={34}/><p>هنوز خدمتی انتخاب نشده است.</p></div>
      ) : (
        <>
          <div className="cart-list">
            {cart.map((item) => (
              <article className="cart-item" key={item.cartId}>
                <div className="cart-item-name">
                  <strong>{item.name}</strong>
                  <small>قیمت پیش‌فرض: <span className="numeric">{formatMoney(item.defaultPriceCents)}</span></small>
                </div>

                <label className="cart-price">
                  <span>قیمت واحد</span>
                  <CartPriceEditor item={item} onCommit={(cents) =>
                    patch(item.cartId, { unitPriceCents: cents })} />
                </label>

                <div className="quantity-control" aria-label="تعداد">
                  <button type="button" onClick={() => patch(item.cartId, {
                    quantity: Math.max(1, item.quantity - 1),
                  })}><Icon name="minus" size={17}/></button>
                  <b className="numeric">{item.quantity}</b>
                  <button type="button" onClick={() => patch(item.cartId, {
                    quantity: item.quantity + 1,
                  })}><Icon name="plus" size={17}/></button>
                </div>

                <strong className="cart-line-total"><Money cents={item.unitPriceCents * item.quantity}/></strong>

                <button className="icon-button danger-soft" type="button"
                  onClick={() => remove(item.cartId)} aria-label="حذف">
                  <Icon name="trash" size={18}/>
                </button>
              </article>
            ))}
          </div>

          <footer className="cart-footer">
            <div><span>مجموع خدمات</span><strong><Money cents={subtotal}/></strong></div>
            <button className="button primary full" type="button" onClick={onCheckout}>
              ادامه و پرداخت — <span className="numeric">{formatMoney(subtotal)}</span>
              <Icon name="back"/>
            </button>
          </footer>
        </>
      )}
    </Modal>
  )
}
