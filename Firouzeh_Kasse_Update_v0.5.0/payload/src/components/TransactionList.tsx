import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Landmark,
  RotateCcw,
} from 'lucide-react'
import { createTranslator, localizedCategory, transactionLabel } from '../i18n'
import { formatDate } from '../lib/format'
import type { CashTransaction, Locale, TransactionKind } from '../types'
import { EmptyState, Money } from './ui'

function TransactionIcon({ kind }: { kind: TransactionKind }) {
  if (kind === 'sale') return <Banknote size={18} />
  if (kind === 'owner_deposit') return <ArrowDownLeft size={18} />
  if (kind === 'bank_deposit') return <Landmark size={18} />
  if (kind === 'refund') return <RotateCcw size={18} />
  return <ArrowUpRight size={18} />
}

export function TransactionList({
  transactions,
  locale,
  compact = false,
}: {
  transactions: CashTransaction[]
  locale: Locale
  compact?: boolean
}) {
  const t = createTranslator(locale)
  if (!transactions.length) return <EmptyState text={t('common.noData')} />

  return (
    <div className={`transaction-list ${compact ? 'compact' : ''}`}>
      {transactions.map((transaction) => {
        const detail = transaction.items.length
          ? transaction.items
              .map((item) => locale === 'fa' ? item.nameFa : item.nameDe)
              .join(locale === 'fa' ? '، ' : ', ')
          : localizedCategory(locale, transaction.category)
            || transaction.note
            || transaction.sequence

        return (
          <article className="transaction-row" key={transaction.id}>
            <div className={`transaction-icon ${
              transaction.cashEffectCents >= 0 ? 'income' : 'outcome'
            }`}>
              <TransactionIcon kind={transaction.kind} />
            </div>
            <div className="transaction-main">
              <strong>{transactionLabel(locale, transaction.kind)}</strong>
              <small>{detail}</small>
            </div>
            <div className="transaction-value">
              <strong className={transaction.cashEffectCents >= 0 ? 'positive' : 'negative'}>
                <Money cents={transaction.cashEffectCents} locale={locale} signed />
              </strong>
              <small>{formatDate(transaction.createdAt, locale)}</small>
            </div>
          </article>
        )
      })}
    </div>
  )
}
