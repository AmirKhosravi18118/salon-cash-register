import { useEffect, useState } from 'react'
import { TransactionList } from '../components/TransactionList'
import { GlassCard, PageHeader } from '../components/ui'
import { db } from '../db'
import { createTranslator, transactionLabel } from '../i18n'
import type { CashTransaction, Locale, TransactionKind } from '../types'

export function TransactionsPage({
  locale,
  revision,
}: {
  locale: Locale
  revision: number
}) {
  const t = createTranslator(locale)
  const [transactions, setTransactions] = useState<CashTransaction[]>([])
  const [filter, setFilter] = useState<'all' | TransactionKind>('all')
  const [query, setQuery] = useState('')

  useEffect(() => {
    db.transactions.orderBy('createdAt').reverse().toArray().then(setTransactions)
  }, [revision])

  const visible = transactions.filter((transaction) => {
    const kindMatch = filter === 'all' || transaction.kind === filter
    const haystack = [
      transaction.sequence,
      transaction.category,
      transaction.note,
      ...transaction.items.flatMap((item) => [item.nameFa, item.nameDe]),
    ].join(' ').toLowerCase()

    return kindMatch && haystack.includes(query.toLowerCase())
  })

  return (
    <>
      <PageHeader title={t('transactions.title')} subtitle={t('transactions.subtitle')} />

      <GlassCard className="transactions-card">
        <div className="filters-row">
          <input
            className="input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('common.search')}
          />

          <select
            className="input"
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value as 'all' | TransactionKind)}
          >
            <option value="all">{t('common.all')}</option>
            {([
              'sale',
              'expense',
              'owner_deposit',
              'owner_withdrawal',
              'bank_deposit',
              'refund',
              'adjustment',
            ] as TransactionKind[]).map((kind) => (
              <option key={kind} value={kind}>
                {transactionLabel(locale, kind)}
              </option>
            ))}
          </select>
        </div>

        <TransactionList transactions={visible} locale={locale} />
      </GlassCard>
    </>
  )
}
