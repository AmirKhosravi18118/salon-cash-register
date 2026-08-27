import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Euro,
  Landmark,
  RotateCcw,
  UserRound,
  WalletCards,
} from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { navigate } from '../components/AppShell'
import { GlassCard, PageHeader, Toast } from '../components/ui'
import { getOpenSession, saveCashMovement } from '../db'
import { createTranslator } from '../i18n'
import { parseEuro } from '../lib/format'
import type { CashSession, Locale, TransactionKind } from '../types'

type MovementKind = Exclude<TransactionKind, 'sale'>

export function MovementPage({
  locale,
  revision,
  onChanged,
}: {
  locale: Locale
  revision: number
  onChanged: () => void
}) {
  const t = createTranslator(locale)
  const [session, setSession] = useState<CashSession>()
  const [kind, setKind] = useState<MovementKind>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    getOpenSession().then(setSession)
  }, [revision])

  const movementKinds: Array<{
    kind: MovementKind
    icon: typeof ArrowDownLeft
    positive: boolean
  }> = [
    { kind: 'expense', icon: ArrowUpRight, positive: false },
    { kind: 'owner_deposit', icon: ArrowDownLeft, positive: true },
    { kind: 'owner_withdrawal', icon: UserRound, positive: false },
    { kind: 'bank_deposit', icon: Landmark, positive: false },
    { kind: 'refund', icon: RotateCcw, positive: false },
    { kind: 'adjustment', icon: Euro, positive: true },
  ]

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const amountCents = parseEuro(amount)
    if (!session || amountCents <= 0) return

    await saveCashMovement({
      kind,
      amountCents,
      category,
      note,
      sessionId: session.id,
    })

    setAmount('')
    setCategory('')
    setNote('')
    setToast(t('common.success'))
    onChanged()
  }

  return (
    <>
      <PageHeader title={t('movement.title')} subtitle={t('movement.subtitle')} />

      {!session && (
        <div className="notice warning">
          <WalletCards size={20} />
          <strong>{t('movement.openCashboxFirst')}</strong>
          <button type="button" onClick={() => navigate('cashbox')}>
            {t('cashbox.startDay')}
          </button>
        </div>
      )}

      <GlassCard className="form-card">
        <form onSubmit={submit}>
          <div className="movement-grid">
            {movementKinds.map((item, index) => {
              const Icon = item.icon

              return (
                <button
                  key={item.kind}
                  type="button"
                  className={`movement-option ${kind === item.kind ? 'active' : ''}`}
                  style={{ animationDelay: `${index * 35}ms` }}
                  onClick={() => setKind(item.kind)}
                >
                  <div className={`metric-icon ${item.positive ? 'rose' : 'brown'}`}>
                    <Icon size={21} />
                  </div>
                  <strong>{t(`movement.kinds.${item.kind}`)}</strong>
                  <small>
                    {item.positive ? t('movement.effectIn') : t('movement.effectOut')}
                  </small>
                </button>
              )
            })}
          </div>

          <div className="form-grid">
            <label>
              <span>{t('common.amount')}</span>
              <input
                className="input input-large"
                type="number"
                min="0"
                step="0.01"
                dir="ltr"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                required
              />
            </label>

            <label>
              <span>{t('common.category')}</span>
              <input
                className="input"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder={kind === 'expense'
                  ? t('movement.expenseExample')
                  : t('common.optional')}
              />
            </label>
          </div>

          <label>
            <span>{t('common.note')}</span>
            <textarea
              className="input textarea"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t('common.optional')}
            />
          </label>

          <button
            className="primary-button"
            disabled={!session || parseEuro(amount) <= 0}
            type="submit"
          >
            <Check size={20} />
            {t('movement.save')}
          </button>
        </form>
      </GlassCard>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </>
  )
}
