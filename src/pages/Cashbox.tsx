import { Check, History, WalletCards } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { EmptyState, GlassCard, Money, PageHeader, Toast } from '../components/ui'
import {
  closeCashSession, db, expectedBalance,
  getOpenSession, openCashSession,
} from '../db'
import { createTranslator } from '../i18n'
import { euroInput, formatDate, parseEuro } from '../lib/format'
import type { CashSession, Locale } from '../types'

export function CashboxPage({
  locale, revision, onChanged,
}: { locale: Locale; revision: number; onChanged: () => void }) {
  const t = createTranslator(locale)
  const [session, setSession] = useState<CashSession>()
  const [sessions, setSessions] = useState<CashSession[]>([])
  const [expected, setExpected] = useState(0)
  const [opening, setOpening] = useState('100.00')
  const [counted, setCounted] = useState('')
  const [toast, setToast] = useState('')

  const load = useCallback(async () => {
    const open = await getOpenSession()
    setSession(open)
    setExpected(open ? await expectedBalance(open) : 0)
    setSessions(await db.sessions.orderBy('openedAt').reverse().limit(8).toArray())
  }, [])

  useEffect(() => { load() }, [load, revision])

  const startDay = async () => {
    await openCashSession(parseEuro(opening))
    setToast(t('cashbox.dayStarted'))
    onChanged()
    await load()
  }

  const closeDay = async () => {
    if (!session || counted === '') return
    await closeCashSession(parseEuro(counted))
    setCounted('')
    setToast(t('cashbox.dayClosed'))
    onChanged()
    await load()
  }

  return (
    <>
      <PageHeader title={t('cashbox.title')} subtitle={t('cashbox.subtitle')} />

      {session ? (
        <div className="cashbox-grid">
          <GlassCard className="cash-status-card">
            <div className="status-line">
              <div className="round-icon pink"><WalletCards size={23} /></div>
              <div>
                <span className="status-chip success">{t('cashbox.openStatus')}</span>
                <small>{t('cashbox.openedAt')}: {formatDate(session.openedAt, locale)}</small>
              </div>
            </div>
            <div className="cashbox-values">
              <div>
                <span>{t('cashbox.openingBalance')}</span>
                <strong><Money cents={session.openingBalanceCents} locale={locale} /></strong>
              </div>
              <div className="main">
                <span>{t('cashbox.expectedBalance')}</span>
                <strong><Money cents={expected} locale={locale} /></strong>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="close-day-card">
            <h2>{t('cashbox.closeDay')}</h2>
            <p>{t('cashbox.enterCounted')}</p>
            <label>
              <span>{t('cashbox.countedBalance')}</span>
              <input
                className="input input-large" type="number" min="0" step="0.01"
                dir="ltr" value={counted}
                onChange={(event) => setCounted(event.target.value)}
                placeholder={euroInput(expected)}
              />
            </label>
            {counted !== '' && (
              <div className="difference-preview">
                <span>{t('cashbox.difference')}</span>
                <strong className={parseEuro(counted) - expected >= 0 ? 'positive' : 'negative'}>
                  <Money cents={parseEuro(counted) - expected} locale={locale} signed />
                </strong>
              </div>
            )}
            <button
              className="primary-button full" type="button"
              disabled={counted === ''} onClick={closeDay}
            >
              <Check size={20} />{t('cashbox.closeDay')}
            </button>
          </GlassCard>
        </div>
      ) : (
        <GlassCard className="start-day-card">
          <div className="round-icon pink large"><WalletCards size={30} /></div>
          <h2>{t('cashbox.startDay')}</h2>
          <p>{t('cashbox.enterOpening')}</p>
          <label>
            <span>{t('cashbox.openingBalance')}</span>
            <input
              className="input input-large" type="number" min="0" step="0.01"
              dir="ltr" value={opening}
              onChange={(event) => setOpening(event.target.value)}
            />
          </label>
          <button className="primary-button" type="button" onClick={startDay}>
            <Check size={20} />{t('cashbox.startDay')}
          </button>
        </GlassCard>
      )}

      <GlassCard className="session-history">
        <div className="section-heading">
          <h2>{t('cashbox.history')}</h2><History size={22} />
        </div>
        {!sessions.length ? <EmptyState text={t('common.noData')} /> : (
          <div className="session-list">
            {sessions.map((item) => (
              <div className="session-row" key={item.id}>
                <div>
                  <strong>{formatDate(item.openedAt, locale, false)}</strong>
                  <small>{item.status === 'open'
                    ? t('cashbox.openStatus') : t('cashbox.closedStatus')}</small>
                </div>
                <div>
                  <span>{t('cashbox.expectedBalance')}</span>
                  <strong>
                    <Money
                      cents={item.status === 'open'
                        ? expected : (item.expectedBalanceCents ?? 0)}
                      locale={locale}
                    />
                  </strong>
                </div>
                <div>
                  <span>{t('cashbox.difference')}</span>
                  <strong className={(item.differenceCents ?? 0) >= 0
                    ? 'positive' : 'negative'}>
                    {item.status === 'open' ? '—' : (
                      <Money cents={item.differenceCents ?? 0} locale={locale} signed />
                    )}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </>
  )
}
