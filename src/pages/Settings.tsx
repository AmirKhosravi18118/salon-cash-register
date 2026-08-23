import {
  Check, Download, History, Package, Plus,
  RotateCcw, Scissors, Sparkles, Upload,
} from 'lucide-react'
import {
  useCallback, useEffect, useRef, useState, type FormEvent,
} from 'react'
import {
  EmptyState, GlassCard, Modal, Money, PageHeader, Toast,
} from '../components/ui'
import {
  createService, db, exportBackup, exportTransactionsCsv,
  importBackup, resetDemoData, saveService,
} from '../db'
import { createTranslator, serviceName } from '../i18n'
import {
  downloadText, euroInput, formatDate, parseEuro,
} from '../lib/format'
import type {
  Locale, PriceHistory, SalonService, ServiceKind,
} from '../types'

const APP_VERSION = '0.4.0-test'

function ServiceEditor({
  locale, value, onClose, onSaved,
}: {
  locale: Locale
  value: SalonService | null
  onClose: () => void
  onSaved: () => void
}) {
  const t = createTranslator(locale)
  const [form, setForm] = useState<SalonService | null>(value)
  const [price, setPrice] = useState(value ? euroInput(value.priceCents) : '')

  useEffect(() => {
    setForm(value)
    setPrice(value ? euroInput(value.priceCents) : '')
  }, [value])

  if (!form) return null

  const update = <K extends keyof SalonService>(
    key: K, next: SalonService[K],
  ) => {
    setForm((current) => current ? { ...current, [key]: next } : current)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!form.nameFa.trim() || !form.nameDe.trim()) return
    await saveService({ ...form, priceCents: parseEuro(price) })
    onSaved()
    onClose()
  }

  return (
    <Modal
      open={Boolean(value)}
      title={form.kind === 'package'
        ? t('settings.addPackage') : t('settings.addService')}
      onClose={onClose}
    >
      <form className="editor-form" onSubmit={submit}>
        <div className="form-grid">
          <label>
            <span>{t('settings.nameFa')}</span>
            <input
              className="input" value={form.nameFa}
              onChange={(event) => update('nameFa', event.target.value)} required
            />
          </label>
          <label>
            <span>{t('settings.nameDe')}</span>
            <input
              className="input" dir="ltr" value={form.nameDe}
              onChange={(event) => update('nameDe', event.target.value)} required
            />
          </label>
          <label>
            <span>{t('settings.categoryFa')}</span>
            <input
              className="input" value={form.categoryFa}
              onChange={(event) => update('categoryFa', event.target.value)}
            />
          </label>
          <label>
            <span>{t('settings.categoryDe')}</span>
            <input
              className="input" dir="ltr" value={form.categoryDe}
              onChange={(event) => update('categoryDe', event.target.value)}
            />
          </label>
          <label>
            <span>{t('settings.price')}</span>
            <input
              className="input" type="number" min="0" step="0.01" dir="ltr"
              value={price} onChange={(event) => setPrice(event.target.value)}
              required
            />
          </label>
          <label>
            <span>{t('settings.accent')}</span>
            <input
              className="color-input" type="color" value={form.accent}
              onChange={(event) => update('accent', event.target.value)}
            />
          </label>
        </div>

        <label className="check-row">
          <input
            type="checkbox" checked={form.allowCustomPrice}
            onChange={(event) => update('allowCustomPrice', event.target.checked)}
          />
          <span>{t('settings.customPrice')}</span>
        </label>

        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="primary-button" type="submit">
            <Check size={19} />{t('common.save')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function SettingsPage({
  locale, revision, onChanged,
}: { locale: Locale; revision: number; onChanged: () => void }) {
  const t = createTranslator(locale)
  const [tab, setTab] = useState<'service' | 'package' | 'history'>('service')
  const [services, setServices] = useState<SalonService[]>([])
  const [history, setHistory] = useState<PriceHistory[]>([])
  const [editing, setEditing] = useState<SalonService | null>(null)
  const [toast, setToast] = useState('')
  const importRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setServices(await db.services.orderBy('updatedAt').reverse().toArray())
    setHistory(await db.priceHistory.orderBy('changedAt').reverse().toArray())
  }, [])

  useEffect(() => { load() }, [load, revision])

  const addNew = async (kind: ServiceKind) => {
    setEditing(await createService(kind))
  }

  const toggleActive = async (service: SalonService) => {
    await saveService({ ...service, active: !service.active })
    await load()
    onChanged()
  }

  const doExportBackup = async () => {
    downloadText(
      `salon-kasse-backup-${new Date().toISOString().slice(0, 10)}.json`,
      await exportBackup(), 'application/json;charset=utf-8',
    )
  }

  const doExportCsv = async () => {
    downloadText(
      `salon-kasse-transactions-${new Date().toISOString().slice(0, 10)}.csv`,
      await exportTransactionsCsv(), 'text/csv;charset=utf-8',
    )
  }

  const doImport = async (file?: File) => {
    if (!file) return
    await importBackup(await file.text())
    await load()
    onChanged()
    setToast(t('common.success'))
  }

  const reset = async () => {
    if (!window.confirm(t('settings.confirmReset'))) return
    await resetDemoData()
    await load()
    onChanged()
    setToast(t('common.success'))
  }

  const filtered = services.filter((service) => service.kind === tab)

  return (
    <>
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      <GlassCard>
        <div className="settings-title-row">
          <div>
            <h2>{t('settings.priceList')}</h2>
            <p>{t('settings.priceRule')}</p>
          </div>
          {tab !== 'history' && (
            <button
              className="primary-button" type="button"
              onClick={() => addNew(tab as ServiceKind)}
            >
              <Plus size={19} />
              {tab === 'package'
                ? t('settings.addPackage') : t('settings.addService')}
            </button>
          )}
        </div>

        <div className="segmented">
          <button
            className={tab === 'service' ? 'active' : ''}
            type="button" onClick={() => setTab('service')}
          >
            <Scissors size={17} />{t('settings.serviceTab')}
          </button>
          <button
            className={tab === 'package' ? 'active' : ''}
            type="button" onClick={() => setTab('package')}
          >
            <Package size={17} />{t('settings.packageTab')}
          </button>
          <button
            className={tab === 'history' ? 'active' : ''}
            type="button" onClick={() => setTab('history')}
          >
            <History size={17} />{t('settings.historyTab')}
          </button>
        </div>

        {tab === 'history' ? (
          !history.length ? <EmptyState text={t('common.noData')} /> : (
            <div className="price-history">
              {history.map((item) => (
                <div className="price-history-row" key={item.id}>
                  <div>
                    <strong>
                      {locale === 'fa' ? item.serviceNameFa : item.serviceNameDe}
                    </strong>
                    <small>{formatDate(item.changedAt, locale)}</small>
                  </div>
                  <span><Money cents={item.previousPriceCents} locale={locale} /></span>
                  <span className="arrow-separator">→</span>
                  <strong><Money cents={item.newPriceCents} locale={locale} /></strong>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="settings-service-list">
            {filtered.map((service) => (
              <div
                className={`settings-service-row ${service.active ? '' : 'archived'}`}
                key={service.id}
              >
                <span className="service-color" style={{ background: service.accent }} />
                <div className="service-info">
                  <strong>{serviceName(locale, service)}</strong>
                  <small>
                    {serviceName(locale, {
                      nameFa: service.categoryFa, nameDe: service.categoryDe,
                    })}
                  </small>
                </div>
                <strong><Money cents={service.priceCents} locale={locale} /></strong>
                <span className={`status-chip ${service.active ? 'success' : ''}`}>
                  {service.active ? t('common.active') : t('common.inactive')}
                </span>
                <div className="row-actions">
                  <button
                    className="secondary-button small" type="button"
                    onClick={() => setEditing(service)}
                  >{t('common.edit')}</button>
                  <button
                    className="text-button" type="button"
                    onClick={() => toggleActive(service)}
                  >
                    {service.active
                      ? t('settings.archive') : t('settings.restore')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <div className="settings-bottom-grid">
        <GlassCard>
          <div className="section-heading">
            <div>
              <h2>{t('settings.backup')}</h2>
              <p>{t('settings.localData')}</p>
            </div>
            <Download size={22} />
          </div>
          <div className="backup-actions">
            <button className="secondary-button" type="button" onClick={doExportBackup}>
              <Download size={18} />{t('settings.exportJson')}
            </button>
            <button className="secondary-button" type="button" onClick={doExportCsv}>
              <Download size={18} />{t('settings.exportCsv')}
            </button>
            <button
              className="secondary-button" type="button"
              onClick={() => importRef.current?.click()}
            >
              <Upload size={18} />{t('settings.importJson')}
            </button>
            <input
              ref={importRef} type="file" accept="application/json" hidden
              onChange={(event) => doImport(event.target.files?.[0])}
            />
          </div>
        </GlassCard>

        <GlassCard>
          <div className="section-heading">
            <div>
              <h2>{t('settings.about')}</h2>
              <p>{t('common.version')} {APP_VERSION}</p>
            </div>
            <Sparkles size={22} />
          </div>
          <p className="muted">{t('settings.resetWarning')}</p>
          <button className="danger-button" type="button" onClick={reset}>
            <RotateCcw size={18} />{t('settings.resetDemo')}
          </button>
        </GlassCard>
      </div>

      <ServiceEditor
        locale={locale} value={editing} onClose={() => setEditing(null)}
        onSaved={async () => {
          await load()
          onChanged()
          setToast(t('settings.serviceSaved'))
        }}
      />
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </>
  )
}
