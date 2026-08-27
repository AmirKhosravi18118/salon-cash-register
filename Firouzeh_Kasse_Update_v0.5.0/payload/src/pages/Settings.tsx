import {
  Check,
  Download,
  FileSpreadsheet,
  History,
  MoreVertical,
  Package,
  Plus,
  Power,
  RotateCcw,
  Scissors,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from 'react'
import {
  EmptyState,
  GlassCard,
  Modal,
  Money,
  PageHeader,
  Toast,
} from '../components/ui'
import {
  createService,
  db,
  deleteService,
  exportBackup,
  importBackup,
  resetDemoData,
  saveService,
} from '../db'
import { createTranslator, serviceName } from '../i18n'
import { downloadExcelReport } from '../lib/excel'
import {
  downloadText,
  euroInput,
  formatDate,
  parseEuro,
} from '../lib/format'
import type {
  Locale,
  PriceHistory,
  SalonService,
  ServiceKind,
} from '../types'

const APP_VERSION = '0.5.0-test'

interface EditingState {
  service: SalonService
  isNew: boolean
}

function ServiceEditor({
  locale,
  value,
  onClose,
  onSaved,
}: {
  locale: Locale
  value: EditingState | null
  onClose: () => void
  onSaved: () => void
}) {
  const t = createTranslator(locale)
  const [form, setForm] = useState<SalonService | null>(value?.service ?? null)
  const [price, setPrice] = useState(
    value ? euroInput(value.service.priceCents) : '',
  )

  useEffect(() => {
    setForm(value?.service ?? null)
    setPrice(value ? euroInput(value.service.priceCents) : '')
  }, [value])

  if (!form || !value) return null

  const update = <K extends keyof SalonService>(
    key: K,
    next: SalonService[K],
  ) => {
    setForm((current) => current ? { ...current, [key]: next } : current)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()

    if (locale === 'de' && !form.nameDe.trim()) return
    if (locale === 'fa' && (!form.nameFa.trim() || !form.nameDe.trim())) return

    const normalized = locale === 'de'
      ? {
          ...form,
          nameFa: form.nameFa.trim() || form.nameDe.trim(),
          categoryFa: form.categoryFa.trim() || form.categoryDe.trim(),
        }
      : form

    await saveService({ ...normalized, priceCents: parseEuro(price) })
    onSaved()
    onClose()
  }

  const editorTitle = form.kind === 'package'
    ? t(value.isNew ? 'settings.addPackage' : 'settings.editPackage')
    : t(value.isNew ? 'settings.addService' : 'settings.editService')

  const germanFields = (
    <>
      <label>
        <span>{t('settings.nameDe')}</span>
        <input
          className="input"
          dir="ltr"
          value={form.nameDe}
          onChange={(event) => update('nameDe', event.target.value)}
          required
        />
      </label>
      <label>
        <span>{t('settings.categoryDe')}</span>
        <input
          className="input"
          dir="ltr"
          value={form.categoryDe}
          onChange={(event) => update('categoryDe', event.target.value)}
        />
      </label>
    </>
  )

  const persianFields = (
    <>
      <label>
        <span>{t('settings.nameFa')}</span>
        <input
          className="input"
          dir="rtl"
          value={form.nameFa}
          onChange={(event) => update('nameFa', event.target.value)}
          required
        />
      </label>
      <label>
        <span>{t('settings.categoryFa')}</span>
        <input
          className="input"
          dir="rtl"
          value={form.categoryFa}
          onChange={(event) => update('categoryFa', event.target.value)}
        />
      </label>
    </>
  )

  return (
    <Modal open={Boolean(value)} title={editorTitle} onClose={onClose}>
      <form className="editor-form" onSubmit={submit}>
        <div className="form-grid">
          {locale === 'de' ? germanFields : persianFields}
          {locale === 'fa' && germanFields}

          <label>
            <span>{t('settings.price')}</span>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              dir="ltr"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              required
            />
          </label>

          <label>
            <span>{t('settings.accent')}</span>
            <input
              className="color-input"
              type="color"
              value={form.accent}
              onChange={(event) => update('accent', event.target.value)}
            />
          </label>
        </div>

        <label className="check-row">
          <input
            type="checkbox"
            checked={form.allowCustomPrice}
            onChange={(event) => update('allowCustomPrice', event.target.checked)}
          />
          <span>{t('settings.customPrice')}</span>
        </label>

        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="primary-button" type="submit">
            <Check size={19} />
            {t('common.save')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function CatalogActions({
  locale,
  service,
  onEdit,
  onToggle,
  onDelete,
}: {
  locale: Locale
  service: SalonService
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  const t = createTranslator(locale)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  const run = (action: () => void) => {
    setOpen(false)
    action()
  }

  return (
    <div className="catalog-actions" ref={rootRef}>
      <button
        className="icon-button catalog-menu-trigger"
        type="button"
        aria-label={t('common.moreActions')}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <MoreVertical size={19} />
      </button>

      {open && (
        <div className="catalog-menu" role="menu">
          <button type="button" onClick={() => run(onEdit)}>
            <Scissors size={17} />
            <span>{t('common.edit')}</span>
          </button>

          <button type="button" onClick={() => run(onToggle)}>
            <Power size={17} />
            <span>{service.active ? t('settings.archive') : t('settings.restore')}</span>
          </button>

          <div className="catalog-menu-separator" />

          <button className="danger" type="button" onClick={() => run(onDelete)}>
            <Trash2 size={17} />
            <span>{t('common.delete')}</span>
          </button>
        </div>
      )}
    </div>
  )
}

export function SettingsPage({
  locale,
  revision,
  onChanged,
}: {
  locale: Locale
  revision: number
  onChanged: () => void
}) {
  const t = createTranslator(locale)
  const [tab, setTab] = useState<'service' | 'package' | 'history'>('service')
  const [services, setServices] = useState<SalonService[]>([])
  const [history, setHistory] = useState<PriceHistory[]>([])
  const [editing, setEditing] = useState<EditingState | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SalonService | null>(null)
  const [toast, setToast] = useState('')
  const importRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setServices(await db.services.orderBy('updatedAt').reverse().toArray())
    setHistory(await db.priceHistory.orderBy('changedAt').reverse().toArray())
  }, [])

  useEffect(() => {
    load()
  }, [load, revision])

  const addNew = async (kind: ServiceKind) => {
    setEditing({ service: await createService(kind), isNew: true })
  }

  const toggleActive = async (service: SalonService) => {
    await saveService({ ...service, active: !service.active })
    await load()
    onChanged()
  }

  const removeService = async () => {
    if (!deleteTarget) return

    await deleteService(deleteTarget.id)
    setDeleteTarget(null)
    await load()
    onChanged()
    setToast(t('settings.deleted'))
  }

  const doExportBackup = async () => {
    downloadText(
      `Firouzeh_backup_${new Date().toISOString().slice(0, 10)}.json`,
      await exportBackup(),
      'application/json;charset=utf-8',
    )
  }

  const doImport = async (file?: File) => {
    if (!file) return

    await importBackup(await file.text())
    await load()
    onChanged()
    setToast(t('common.success'))
    if (importRef.current) importRef.current.value = ''
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

      <GlassCard className="settings-catalog-card">
        <div className="settings-title-row">
          <div>
            <h2>{t('settings.priceList')}</h2>
            <p>{t('settings.priceRule')}</p>
          </div>

          {tab !== 'history' && (
            <button
              className="primary-button add-catalog-button"
              type="button"
              onClick={() => addNew(tab as ServiceKind)}
            >
              <Plus size={19} />
              <span>
                {tab === 'package'
                  ? t('settings.addPackage')
                  : t('settings.addService')}
              </span>
            </button>
          )}
        </div>

        <div className="tabs-scroller">
          <div className="segmented settings-tabs">
            <button
              className={tab === 'service' ? 'active' : ''}
              type="button"
              onClick={() => setTab('service')}
            >
              <Scissors size={17} />
              {t('settings.serviceTab')}
            </button>

            <button
              className={tab === 'package' ? 'active' : ''}
              type="button"
              onClick={() => setTab('package')}
            >
              <Package size={17} />
              {t('settings.packageTab')}
            </button>

            <button
              className={tab === 'history' ? 'active' : ''}
              type="button"
              onClick={() => setTab('history')}
            >
              <History size={17} />
              {t('settings.historyTab')}
            </button>
          </div>
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
          !filtered.length ? <EmptyState text={t('settings.catalogEmpty')} /> : (
            <div className="settings-service-list">
              {filtered.map((service, index) => (
                <div
                  className={`settings-service-row ${service.active ? '' : 'archived'}`}
                  style={{
                    '--row-delay': `${Math.min(index * 35, 280)}ms`,
                  } as CSSProperties}
                  key={service.id}
                >
                  <span className="service-color" style={{ background: service.accent }} />

                  <div className="service-info">
                    <strong>{serviceName(locale, service)}</strong>
                    <small>
                      {serviceName(locale, {
                        nameFa: service.categoryFa,
                        nameDe: service.categoryDe,
                      })}
                    </small>
                  </div>

                  <strong className="catalog-price">
                    <Money cents={service.priceCents} locale={locale} />
                  </strong>

                  <span className={`status-chip ${service.active ? 'success' : ''}`}>
                    {service.active ? t('common.active') : t('common.inactive')}
                  </span>

                  <CatalogActions
                    locale={locale}
                    service={service}
                    onEdit={() => setEditing({ service, isNew: false })}
                    onToggle={() => toggleActive(service)}
                    onDelete={() => setDeleteTarget(service)}
                  />
                </div>
              ))}
            </div>
          )
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
              <Download size={18} />
              {t('settings.exportJson')}
            </button>

            <button
              className="secondary-button"
              type="button"
              onClick={() => downloadExcelReport(locale)}
            >
              <FileSpreadsheet size={18} />
              {t('settings.exportExcel')}
            </button>

            <button
              className="secondary-button"
              type="button"
              onClick={() => importRef.current?.click()}
            >
              <Upload size={18} />
              {t('settings.importJson')}
            </button>

            <input
              ref={importRef}
              type="file"
              accept="application/json"
              hidden
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
            <RotateCcw size={18} />
            {t('settings.resetDemo')}
          </button>
        </GlassCard>
      </div>

      <ServiceEditor
        locale={locale}
        value={editing}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          await load()
          onChanged()
          setToast(t('settings.serviceSaved'))
        }}
      />

      <Modal
        open={Boolean(deleteTarget)}
        title={t('settings.deleteTitle')}
        onClose={() => setDeleteTarget(null)}
        className="delete-modal"
      >
        {deleteTarget && (
          <div className="delete-confirm">
            <div className="delete-confirm-icon"><Trash2 size={26} /></div>

            <div>
              <h3>
                {t('settings.deleteQuestion')
                  .replace('{name}', serviceName(locale, deleteTarget))}
              </h3>
              <p>{t('settings.deleteHint')}</p>
            </div>

            <div className="modal-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setDeleteTarget(null)}
              >
                {t('common.cancel')}
              </button>

              <button className="danger-button solid" type="button" onClick={removeService}>
                <Trash2 size={18} />
                {t('settings.deleteConfirm')}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </>
  )
}
