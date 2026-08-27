import { Check, ReceiptText, X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { formatMoney } from '../lib/format'
import type { Locale } from '../types'

export function GlassCard({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <section className={`glass-card ${className}`}>{children}</section>
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle: string
  action?: ReactNode
}) {
  return (
    <div className="page-header">
      <div className="page-header-copy">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action && <div className="page-header-action">{action}</div>}
    </div>
  )
}

export function Money({
  cents,
  locale,
  signed = false,
}: {
  cents: number
  locale: Locale
  signed?: boolean
}) {
  return (
    <span className="money" dir="ltr">
      {signed && cents > 0 ? '+' : ''}{formatMoney(cents, locale)}
    </span>
  )
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <ReceiptText size={28} />
      <span>{text}</span>
    </div>
  )
}

export function InlineLoader() {
  return (
    <div className="inline-loader" role="status" aria-label="Loading">
      <i /><i /><i />
    </div>
  )
}

export function Modal({
  open,
  title,
  onClose,
  children,
  className = '',
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  className?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    document.body.classList.add('modal-open')
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.classList.remove('modal-open')
    }
  }, [onClose, open])

  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className={`modal-card ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Toast({
  message,
  onDone,
}: {
  message: string
  onDone: () => void
}) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 2600)
    return () => window.clearTimeout(timer)
  }, [onDone])

  return (
    <div className="toast" role="status">
      <Check size={18} />
      <span>{message}</span>
    </div>
  )
}
