import {
  useEffect, useId, useState, type CSSProperties, type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import {
  formatMoney, normalizeMoneyOnBlur, sanitizeMoneyInput,
} from '../lib/format'

type IconName =
  | 'dashboard' | 'scissors' | 'activity' | 'chart' | 'wallet'
  | 'settings' | 'logout' | 'palette' | 'cart' | 'plus' | 'close'
  | 'trash' | 'minus' | 'check' | 'users' | 'edit' | 'power'
  | 'download' | 'upload' | 'calendar' | 'key' | 'eye' | 'back'
  | 'save' | 'filter' | 'arrow-up' | 'arrow-down'

const paths: Record<IconName, ReactNode> = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  scissors: <><circle cx="6" cy="7" r="3"/><circle cx="6" cy="17" r="3"/><path d="m8.7 8.4 12.3 8.1M8.7 15.6 21 7.5"/></>,
  activity: <path d="M3 12h4l2-7 4 14 2-7h6"/>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
  wallet: <><path d="M3 6h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z"/><path d="M3 6V5a2 2 0 0 1 2-2h12"/><path d="M16 13h5"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
  logout: <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/></>,
  palette: <><path d="M12 3a9 9 0 0 0 0 18h1.5a2 2 0 0 0 0-4H12a1.5 1.5 0 0 1 0-3h3a6 6 0 0 0 0-12h-3Z"/><circle cx="7.5" cy="10" r=".7"/><circle cx="10" cy="6.5" r=".7"/><circle cx="15" cy="6.5" r=".7"/></>,
  cart: <><circle cx="9" cy="20" r="1"/><circle cx="19" cy="20" r="1"/><path d="M3 4h2l2.3 10.2a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 2-1.6L22 8H6"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/></>,
  minus: <path d="M5 12h14"/>,
  check: <path d="m5 12 4 4L19 6"/>,
  users: <><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M17 11a4 4 0 0 1 0-7M18 14a6 6 0 0 1 4 6"/></>,
  edit: <><path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13 7 4 4"/></>,
  power: <><path d="M12 2v10"/><path d="M6.3 5.3a8 8 0 1 0 11.4 0"/></>,
  download: <><path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 21h16"/></>,
  upload: <><path d="M12 21V9M7 14l5-5 5 5"/><path d="M4 3h16"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></>,
  key: <><circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l2 2M14 9l2 2"/></>,
  eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></>,
  back: <path d="m15 18-6-6 6-6"/>,
  save: <><path d="M5 3h12l3 3v15H4V3h1Z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/></>,
  filter: <path d="M3 4h18l-7 8v6l-4 2v-8L3 4Z"/>,
  'arrow-up': <path d="m6 15 6-6 6 6"/>,
  'arrow-down': <path d="m6 9 6 6 6-6"/>,
}

export function Icon({
  name, size = 20, className = '',
}: { name: IconName; size?: number; className?: string }) {
  return (
    <svg className={`icon ${className}`} width={size} height={size}
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

export function Money({ cents, signed = false }: { cents: number; signed?: boolean }) {
  return <span className="numeric money" dir="ltr">{formatMoney(cents, signed)}</span>
}

export function SmartMoneyInput({
  value, onChange, placeholder = '0,00', disabled = false,
  className = '', ariaLabel,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  ariaLabel?: string
}) {
  const inputId = useId()
  return (
    <input
      id={inputId}
      className={`input money-input numeric ${className}`}
      type="text"
      inputMode="decimal"
      dir="ltr"
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      aria-label={ariaLabel}
      autoComplete="off"
      onChange={(event) => onChange(sanitizeMoneyInput(event.target.value))}
      onBlur={() => onChange(normalizeMoneyOnBlur(value))}
      onFocus={(event) => event.currentTarget.select()}
    />
  )
}

export function Card({
  children, className = '', style,
}: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return <section className={`card ${className}`} style={style}>{children}</section>
}

export function PageHeader({
  title, subtitle, action,
}: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action && <div className="page-header-action">{action}</div>}
    </header>
  )
}

export function Modal({
  open, title, onClose, children, className = '',
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  className?: string
}) {
  useEffect(() => {
    if (!open) return
    const listener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.body.classList.add('modal-open')
    window.addEventListener('keydown', listener)
    return () => {
      document.body.classList.remove('modal-open')
      window.removeEventListener('keydown', listener)
    }
  }, [onClose, open])

  if (!open) return null

  return createPortal(
    <div className="modal-layer" role="presentation" onMouseDown={onClose}>
      <section
        className={`modal ${className}`}
        role="dialog" aria-modal="true" aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2>{title}</h2>
          <button className="icon-button" type="button" onClick={onClose}
            aria-label="بستن"><Icon name="close" /></button>
        </header>
        <div className="modal-body">{children}</div>
      </section>
    </div>,
    document.body,
  )
}

export function ConfirmModal({
  open, title, text, confirmText = 'تأیید',
  danger = false, onConfirm, onClose,
}: {
  open: boolean
  title: string
  text: string
  confirmText?: string
  danger?: boolean
  onConfirm: () => void | Promise<void>
  onClose: () => void
}) {
  return (
    <Modal open={open} title={title} onClose={onClose} className="confirm-modal">
      <p className="confirm-text">{text}</p>
      <div className="modal-actions">
        <button className="button secondary" type="button" onClick={onClose}>انصراف</button>
        <button className={`button ${danger ? 'danger' : 'primary'}`} type="button"
          onClick={onConfirm}>{confirmText}</button>
      </div>
    </Modal>
  )
}

export function Toast({
  message, onDone,
}: { message: string; onDone: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 2600)
    return () => window.clearTimeout(timer)
  }, [onDone])
  return <div className="toast"><Icon name="check" size={18}/><span>{message}</span></div>
}

export function EmptyState({ text }: { text: string }) {
  return <div className="empty-state"><span>—</span><p>{text}</p></div>
}

export function Segmented({
  items, value, onChange,
}: {
  items: Array<{ value: string; label: string }>
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="segmented-scroll">
      <div className="segmented">
        {items.map((item) => (
          <button key={item.value} type="button"
            className={value === item.value ? 'active' : ''}
            onClick={() => onChange(item.value)}>{item.label}</button>
        ))}
      </div>
    </div>
  )
}
