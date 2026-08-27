import { Check, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useEffect, type ReactNode } from 'react'
import { money } from '../lib/format'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`glass-card ${className}`}>{children}</section>
}

export function PageHeader({
  title, subtitle, action,
}: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action && <div className="page-header-action">{action}</div>}
    </div>
  )
}

export function Money({ cents, signed = false }: { cents: number; signed?: boolean }) {
  return (
    <span className="money" dir="ltr">
      {signed && cents > 0 ? '+' : ''}{money(cents)}
    </span>
  )
}

export function Modal({
  open, title, children, onClose, wide = false,
}: {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const key = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', key)
    document.body.classList.add('modal-open')
    return () => {
      window.removeEventListener('keydown', key)
      document.body.classList.remove('modal-open')
    }
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className={`modal-card ${wide ? 'wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="بستن">
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmModal({
  open, title, message, confirmText = 'تأیید', danger = false, onClose, onConfirm,
}: {
  open: boolean
  title: string
  message: string
  confirmText?: string
  danger?: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="confirm-content">
        <p>{message}</p>
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>انصراف</button>
          <button
            className={danger ? 'danger-button solid' : 'primary-button'}
            type="button"
            onClick={onConfirm}
          >
            <Check size={18} />{confirmText}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export function Empty({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>
}

export function Spinner({ full = false }: { full?: boolean }) {
  return (
    <div className={full ? 'full-loader' : 'inline-loader'} role="status">
      <i /><i /><i />
    </div>
  )
}

export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 2400)
    return () => window.clearTimeout(timer)
  }, [onDone])
  return createPortal(
    <div className="toast"><Check size={18} /><span>{message}</span></div>,
    document.body,
  )
}
