import {
  useCallback, useEffect, useMemo, useState, type FormEvent,
} from 'react'
import { createUser, deleteUser, resetPassword, updateUser } from '../auth'
import {
  deleteExpenseCategory, deleteService, deleteServiceCategory,
  db, saveExpenseCategory, saveService, saveServiceCategory,
} from '../db'
import {
  downloadExcel, downloadIncomeExcel, downloadJsonBackup, downloadOutcomeExcel,
} from '../lib/export'
import { moneyInputValue, parseMoney, uid } from '../lib/format'
import {
  applyTheme, loadTheme, resetTheme, saveTheme,
} from '../lib/theme'
import type {
  ExpenseCategory, PricingMode, SalonService, ServiceCategory,
  ThemeSettings, UserAccount,
} from '../types'
import {
  Card, ConfirmModal, Icon, Modal, Money, PageHeader,
  Segmented, SmartMoneyInput, Toast,
} from '../components/ui'

type SettingsTab =
  | 'services' | 'categories' | 'expenses'
  | 'users' | 'appearance' | 'backup'

const tabs = [
  { value: 'services', label: 'خدمات' },
  { value: 'categories', label: 'کتگوری خدمات' },
  { value: 'expenses', label: 'کتگوری هزینه‌ها' },
  { value: 'users', label: 'کاربران' },
  { value: 'appearance', label: 'تغییر ظاهر' },
  { value: 'backup', label: 'پشتیبان و خروجی' },
]

function ServiceForm({
  service, categories, onClose, onSaved,
}: {
  service?: SalonService
  categories: ServiceCategory[]
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(service?.name ?? '')
  const [categoryId, setCategoryId] = useState(service?.categoryId ?? categories[0]?.id ?? '')
  const [duration, setDuration] = useState(service?.duration ?? '')
  const [price, setPrice] = useState(service ? moneyInputValue(service.priceCents) : '')
  const [pricingMode, setPricingMode] = useState<PricingMode>(service?.pricingMode ?? 'fixed')
  const [active, setActive] = useState(service?.active ?? true)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim() || !categoryId || parseMoney(price) <= 0) return
    const now = new Date().toISOString()
    await saveService({
      id: service?.id ?? uid('service'),
      name: name.trim(),
      categoryId,
      duration: duration.trim(),
      priceCents: parseMoney(price),
      pricingMode,
      active,
      sortOrder: service?.sortOrder ?? Date.now(),
      createdAt: service?.createdAt ?? now,
      updatedAt: now,
    })
    onSaved()
    onClose()
  }

  return (
    <form className="simple-form" onSubmit={submit}>
      <label className="field"><span>نام خدمت</span>
        <input className="input" value={name}
          onChange={(event) => setName(event.target.value)} required/></label>
      <div className="form-grid">
        <label className="field"><span>کتگوری</span>
          <select className="input" value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)} required>
            {categories.map((item) =>
              <option key={item.id} value={item.id}>{item.name}</option>)}
          </select></label>
        <label className="field"><span>مدت</span>
          <input className="input" value={duration}
            onChange={(event) => setDuration(event.target.value)}
            placeholder="مثلاً 1 Stunde"/></label>
      </div>
      <div className="form-grid">
        <label className="field"><span>قیمت</span>
          <SmartMoneyInput value={price} onChange={setPrice}/></label>
        <label className="field"><span>نوع قیمت</span>
          <select className="input" value={pricingMode}
            onChange={(event) => setPricingMode(event.target.value as PricingMode)}>
            <option value="fixed">قیمت ثابت</option>
            <option value="from">از قیمت پایه</option>
          </select></label>
      </div>
      <label className="switch-row">
        <input type="checkbox" checked={active}
          onChange={(event) => setActive(event.target.checked)}/>
        <span>فعال باشد</span>
      </label>
      <div className="modal-actions">
        <button className="button secondary" type="button" onClick={onClose}>انصراف</button>
        <button className="button primary" type="submit"><Icon name="save"/>ذخیره</button>
      </div>
    </form>
  )
}

function CategoryForm({
  value, type, onClose, onSaved,
}: {
  value?: ServiceCategory | ExpenseCategory
  type: 'service' | 'expense'
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(value?.name ?? '')
  const [active, setActive] = useState(value?.active ?? true)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    const next = {
      id: value?.id ?? uid(type === 'service' ? 'category' : 'expense-category'),
      name: name.trim(), active,
      sortOrder: value?.sortOrder ?? Date.now(),
    }
    if (type === 'service') await saveServiceCategory(next)
    else await saveExpenseCategory(next)
    onSaved()
    onClose()
  }
  return (
    <form className="simple-form" onSubmit={submit}>
      <label className="field"><span>نام کتگوری</span>
        <input className="input" value={name}
          onChange={(event) => setName(event.target.value)} required/></label>
      <label className="switch-row">
        <input type="checkbox" checked={active}
          onChange={(event) => setActive(event.target.checked)}/>
        <span>فعال باشد</span>
      </label>
      <div className="modal-actions">
        <button className="button secondary" type="button" onClick={onClose}>انصراف</button>
        <button className="button primary" type="submit"><Icon name="save"/>ذخیره</button>
      </div>
    </form>
  )
}

function EmployeeForm({
  employee, onClose, onSaved, onDelete,
}: {
  employee?: UserAccount
  onClose: () => void
  onSaved: (temporaryPassword?: string) => void
  onDelete?: () => void
}) {
  const [name, setName] = useState(employee?.name ?? '')
  const [username, setUsername] = useState(employee?.username ?? '')
  const [active, setActive] = useState(employee?.active ?? true)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    try {
      if (employee) {
        await updateUser({ id: employee.id, name, username, active })
        if (password) await resetPassword(employee.id, password)
        onSaved(password || undefined)
      } else {
        if (password.length < 6) {
          setError('رمز عبور باید حداقل 6 کاراکتر باشد.')
          return
        }
        await createUser({ name, username, password, role: 'employee' })
        onSaved(password)
      }
      onClose()
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : ''
      setError(message === 'USERNAME_EXISTS'
        ? 'این نام کاربری قبلاً استفاده شده است.'
        : 'اطلاعات حساب قابل ذخیره نیست.')
    }
  }

  return (
    <form className="simple-form" onSubmit={submit}>
      <label className="field"><span>نام کارمند</span>
        <input className="input" value={name}
          onChange={(event) => setName(event.target.value)} required/></label>
      <label className="field"><span>نام کاربری</span>
        <input className="input numeric" dir="ltr" value={username}
          onChange={(event) => setUsername(event.target.value)} required/></label>
      <label className="field"><span>{employee ? 'رمز جدید؛ در صورت نیاز' : 'رمز عبور'}</span>
        <div className="password-field">
          <input className="input numeric" dir="ltr"
            type={showPassword ? 'text' : 'password'} value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={employee ? undefined : 6}
            required={!employee}/>
          <button type="button" onClick={() => setShowPassword((value) => !value)}
            aria-label="نمایش رمز"><Icon name="eye"/></button>
        </div>
      </label>
      {employee && <p className="security-note">
        رمز قبلی قابل نمایش نیست. برای تغییر دسترسی، رمز جدید تعیین کنید.
      </p>}
      <label className="switch-row">
        <input type="checkbox" checked={active}
          onChange={(event) => setActive(event.target.checked)}/>
        <span>حساب فعال باشد</span>
      </label>
      {error && <p className="form-error">{error}</p>}
      <div className="modal-actions employee-actions">
        {employee && onDelete && (
          <button className="button danger" type="button" onClick={onDelete}>
            <Icon name="trash"/>حذف کارمند
          </button>
        )}
        <button className="button secondary" type="button" onClick={onClose}>انصراف</button>
        <button className="button primary" type="submit"><Icon name="save"/>ذخیره حساب</button>
      </div>
    </form>
  )
}

function AppearancePanel() {
  const [theme, setTheme] = useState<ThemeSettings>(loadTheme)
  const [status, setStatus] = useState('')
  const [processingImage, setProcessingImage] = useState(false)

  useEffect(() => {
    return () => applyTheme(loadTheme())
  }, [])

  const patch = <K extends keyof ThemeSettings>(
    key: K,
    value: ThemeSettings[K],
  ) => {
    const next = { ...theme, [key]: value }
    setTheme(next)
    applyTheme(next)
    setStatus('')
  }

  const imageSelected = (file?: File) => {
    if (!file) return
    setProcessingImage(true)
    setStatus('')

    const reader = new FileReader()
    reader.onerror = () => {
      setProcessingImage(false)
      setStatus('تصویر قابل خواندن نیست.')
    }

    reader.onload = () => {
      const image = new Image()

      image.onerror = () => {
        setProcessingImage(false)
        setStatus('فرمت تصویر پشتیبانی نمی‌شود.')
      }

      image.onload = () => {
        const maximum = 1600
        const ratio = Math.min(1, maximum / Math.max(image.width, image.height))
        const width = Math.max(1, Math.round(image.width * ratio))
        const height = Math.max(1, Math.round(image.height * ratio))
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const context = canvas.getContext('2d')
        if (!context) {
          setProcessingImage(false)
          setStatus('پردازش تصویر انجام نشد.')
          return
        }

        context.drawImage(image, 0, 0, width, height)
        const optimized = canvas.toDataURL('image/webp', 0.82)
        patch('backgroundImage', optimized)
        setProcessingImage(false)
        setStatus('تصویر آماده است. برای ذخیره، دکمه ثبت تغییرات را بزنید.')
      }

      image.src = String(reader.result ?? '')
    }

    reader.readAsDataURL(file)
  }

  const saveAppearance = () => {
    try {
      saveTheme(theme)
      setStatus('تغییرات ظاهر ذخیره و روی کل برنامه اعمال شد.')
    } catch {
      setStatus('حجم تصویر زیاد است. یک تصویر کوچک‌تر انتخاب کنید.')
    }
  }

  const colors: Array<{ key: keyof ThemeSettings; label: string }> = [
    { key: 'primary', label: 'رنگ اصلی دکمه‌ها' },
    { key: 'secondary', label: 'رنگ مکمل' },
    { key: 'background', label: 'پس‌زمینه اصلی' },
    { key: 'surface', label: 'رنگ کارت‌ها' },
    { key: 'text', label: 'رنگ متن' },
    { key: 'muted', label: 'رنگ متن کم‌رنگ' },
    { key: 'success', label: 'رنگ موفقیت' },
    { key: 'danger', label: 'رنگ خطا و حذف' },
    { key: 'sidebar', label: 'رنگ منوی کناری' },
  ]

  return (
    <div className="appearance-panel">
      <div className="appearance-preview">
        <span>پیش‌نمایش زنده</span>
        <button className="button primary" type="button">دکمه اصلی</button>
        <button className="button secondary" type="button">دکمه دوم</button>
      </div>

      {theme.backgroundImage && (
        <div className="background-image-preview"
          style={{ backgroundImage: `url("${theme.backgroundImage}")` }}>
          <span>پیش‌نمایش تصویر پس‌زمینه</span>
        </div>
      )}

      <div className="color-grid">
        {colors.map((item) => (
          <label className="color-field" key={item.key}>
            <span>{item.label}</span>
            <input type="color" value={String(theme[item.key])}
              onChange={(event) =>
                patch(item.key, event.target.value as never)}/>
          </label>
        ))}
      </div>

      <div className="range-grid">
        <label className="field">
          <span>
            گردی کارت‌ها:
            {' '}
            <b className="numeric">{theme.radius}px</b>
          </span>
          <input type="range" min="8" max="36" value={theme.radius}
            onChange={(event) => patch('radius', Number(event.target.value))}/>
        </label>

        <label className="field">
          <span>
            قدرت سایه:
            {' '}
            <b className="numeric">{theme.shadow}%</b>
          </span>
          <input type="range" min="0" max="40" value={theme.shadow}
            onChange={(event) => patch('shadow', Number(event.target.value))}/>
        </label>

        <label className="field">
          <span>
            تاری شیشه:
            {' '}
            <b className="numeric">{theme.blur}px</b>
          </span>
          <input type="range" min="0" max="36" value={theme.blur}
            onChange={(event) => patch('blur', Number(event.target.value))}/>
        </label>

        <label className="field">
          <span>
            شفافیت کارت‌ها:
            {' '}
            <b className="numeric">{theme.surfaceOpacity}%</b>
          </span>
          <input type="range" min="35" max="100" value={theme.surfaceOpacity}
            onChange={(event) =>
              patch('surfaceOpacity', Number(event.target.value))}/>
        </label>

        <label className="field">
          <span>
            شدت تصویر پس‌زمینه:
            {' '}
            <b className="numeric">{theme.backgroundImageOpacity}%</b>
          </span>
          <input type="range" min="0" max="100"
            value={theme.backgroundImageOpacity}
            onChange={(event) =>
              patch('backgroundImageOpacity', Number(event.target.value))}/>
        </label>
      </div>

      <div className="background-actions">
        <label className="button secondary file-button">
          <Icon name="upload"/>
          {processingImage ? 'در حال آماده‌سازی تصویر…' : 'انتخاب تصویر'}
          <input type="file" accept="image/*" disabled={processingImage}
            onChange={(event) => imageSelected(event.target.files?.[0])}/>
        </label>

        <button className="button secondary" type="button"
          onClick={() => patch('backgroundImage', '')}>
          حذف تصویر
        </button>

        <button className="button danger" type="button" onClick={() => {
          const next = resetTheme()
          setTheme(next)
          setStatus('تم اصلی بازیابی شد.')
        }}>
          <Icon name="power"/>بازگشت به تم اصلی
        </button>
      </div>

      <div className="theme-save-bar">
        <div>
          <strong>ثبت ظاهر برنامه</strong>
          <small>
            رنگ‌ها، شفافیت و تصویر پس‌زمینه پس از ثبت برای ورودهای بعدی حفظ می‌شوند.
          </small>
          {status && <p className="theme-save-status">{status}</p>}
        </div>

        <button className="button primary" type="button"
          onClick={saveAppearance} disabled={processingImage}>
          <Icon name="save"/>ذخیره و اعمال تغییرات
        </button>
      </div>
    </div>
  )
}
export function SettingsPage({
  user, revision, onChanged, initialTab,
}: {
  user: UserAccount
  revision: number
  onChanged: () => void
  initialTab?: string
}) {
  const [tab, setTab] = useState<SettingsTab>(
    tabs.some((item) => item.value === initialTab)
      ? initialTab as SettingsTab : 'services')
  const [services, setServices] = useState<SalonService[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])
  const [users, setUsers] = useState<UserAccount[]>([])
  const [serviceEditor, setServiceEditor] = useState<SalonService | 'new'>()
  const [categoryEditor, setCategoryEditor] = useState<ServiceCategory | 'new'>()
  const [expenseEditor, setExpenseEditor] = useState<ExpenseCategory | 'new'>()
  const [employeeEditor, setEmployeeEditor] = useState<UserAccount | 'new'>()
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'service' | 'category' | 'expense' | 'user'
    id: string
    name: string
  }>()
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (initialTab && tabs.some((item) => item.value === initialTab)) {
      setTab(initialTab as SettingsTab)
    }
  }, [initialTab])

  const load = useCallback(async () => {
    const [serviceItems, categoryItems, expenseItems, userItems] = await Promise.all([
      db.services.orderBy('sortOrder').toArray(),
      db.serviceCategories.orderBy('sortOrder').toArray(),
      db.expenseCategories.orderBy('sortOrder').toArray(),
      db.users.orderBy('createdAt').toArray(),
    ])
    setServices(serviceItems)
    setCategories(categoryItems)
    setExpenseCategories(expenseItems)
    setUsers(userItems)
  }, [])

  useEffect(() => { load() }, [load, revision])

  const refreshed = async (message = 'تغییرات ذخیره شد.') => {
    await load()
    onChanged()
    setToast(message)
  }

  const remove = async () => {
    if (!deleteTarget) return
    try {
      if (deleteTarget.type === 'service') await deleteService(deleteTarget.id)
      if (deleteTarget.type === 'category') await deleteServiceCategory(deleteTarget.id)
      if (deleteTarget.type === 'expense') await deleteExpenseCategory(deleteTarget.id)
      if (deleteTarget.type === 'user') await deleteUser(deleteTarget.id)
      setDeleteTarget(undefined)
      await refreshed('مورد انتخاب‌شده حذف شد.')
    } catch (cause) {
      setDeleteTarget(undefined)
      setToast(cause instanceof Error && cause.message === 'CATEGORY_IN_USE'
        ? 'این کتگوری دارای خدمت است و قابل حذف نیست.'
        : 'این مورد قابل حذف نیست.')
    }
  }

  if (user.role !== 'manager') return null

  return (
    <>
      <PageHeader title="تنظیمات" subtitle="مدیریت خدمات، کتگوری‌ها، کاربران و ظاهر برنامه"/>
      <Segmented items={tabs} value={tab} onChange={(value) => setTab(value as SettingsTab)}/>

      <Card className="settings-card">
        {tab === 'services' && (
          <>
            <div className="panel-heading"><div><h2>خدمات</h2><p>قیمت و نوع قیمت هر خدمت</p></div>
              <button className="button primary" type="button" onClick={() => setServiceEditor('new')}>
                <Icon name="plus"/>افزودن خدمت
              </button></div>
            <div className="settings-list">
              {services.map((item) => (
                <div className="settings-row clickable" role="button" tabIndex={0} key={item.id}
                  onClick={() => setServiceEditor(item)}>
                  <div><strong>{item.name}</strong><small>
                    {categories.find((category) => category.id === item.categoryId)?.name ?? 'بدون کتگوری'}
                    {' — '}{item.pricingMode === 'from' ? 'از قیمت پایه' : 'قیمت ثابت'}
                  </small></div>
                  <Money cents={item.priceCents}/>
                  <span className={item.active ? 'status success' : 'status'}>
                    {item.active ? 'فعال' : 'غیرفعال'}</span>
                  <span className="row-actions">
                    <Icon name="edit"/>
                    <button className="icon-button danger-soft" type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        setDeleteTarget({ type: 'service', id: item.id, name: item.name })
                      }}><Icon name="trash" size={17}/></button>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'categories' && (
          <>
            <div className="panel-heading"><div><h2>کتگوری خدمات</h2><p>گروه‌بندی خدمات در صفحه اصلی</p></div>
              <button className="button primary" type="button" onClick={() => setCategoryEditor('new')}>
                <Icon name="plus"/>افزودن کتگوری
              </button></div>
            <div className="settings-list">
              {categories.map((item) => (
                <div className="settings-row" key={item.id}>
                  <div><strong>{item.name}</strong><small>
                    <span className="numeric">{services.filter((service) => service.categoryId === item.id).length}</span> خدمت
                  </small></div>
                  <span className={item.active ? 'status success' : 'status'}>
                    {item.active ? 'فعال' : 'غیرفعال'}</span>
                  <span className="row-actions">
                    <button className="icon-button" type="button"
                      onClick={() => setCategoryEditor(item)}><Icon name="edit" size={17}/></button>
                    <button className="icon-button danger-soft" type="button"
                      onClick={() => setDeleteTarget({ type: 'category', id: item.id, name: item.name })}>
                      <Icon name="trash" size={17}/></button>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'expenses' && (
          <>
            <div className="panel-heading"><div><h2>کتگوری هزینه‌ها</h2><p>گروه‌بندی خروجی‌های صندوق</p></div>
              <button className="button primary" type="button" onClick={() => setExpenseEditor('new')}>
                <Icon name="plus"/>افزودن کتگوری
              </button></div>
            <div className="settings-list">
              {expenseCategories.map((item) => (
                <div className="settings-row" key={item.id}>
                  <div><strong>{item.name}</strong><small>کتگوری هزینه</small></div>
                  <span className={item.active ? 'status success' : 'status'}>
                    {item.active ? 'فعال' : 'غیرفعال'}</span>
                  <span className="row-actions">
                    <button className="icon-button" type="button"
                      onClick={() => setExpenseEditor(item)}><Icon name="edit" size={17}/></button>
                    <button className="icon-button danger-soft" type="button"
                      onClick={() => setDeleteTarget({ type: 'expense', id: item.id, name: item.name })}>
                      <Icon name="trash" size={17}/></button>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'users' && (
          <>
            <div className="panel-heading"><div><h2>کاربران</h2><p>برای مدیریت حساب روی ردیف کارمند کلیک کنید.</p></div>
              <button className="button primary" type="button" onClick={() => setEmployeeEditor('new')}>
                <Icon name="users"/>افزودن کارمند
              </button></div>
            <div className="settings-list">
              {users.map((item) => (
                <button className="settings-row clickable" type="button" key={item.id}
                  onClick={() => item.role === 'employee' && setEmployeeEditor(item)}>
                  <div><strong>{item.name}</strong><small>
                    <span className="numeric" dir="ltr">{item.username}</span>
                    {' — '}{item.role === 'manager' ? 'مدیر' : 'کارمند'}
                  </small></div>
                  <span>{item.lastLoginAt
                    ? <>آخرین ورود: <b className="numeric">{new Date(item.lastLoginAt).toLocaleString('en-GB')}</b></>
                    : 'هنوز وارد نشده'}</span>
                  <span className={item.active ? 'status success' : 'status'}>
                    {item.active ? 'فعال' : 'تعلیق‌شده'}</span>
                  {item.role === 'employee' && <Icon name="edit"/>}
                </button>
              ))}
            </div>
          </>
        )}

        {tab === 'appearance' && <AppearancePanel/>}

        {tab === 'backup' && (
          <div className="backup-panel">
            <div className="panel-heading">
              <div>
                <h2>پشتیبان و خروجی</h2>
                <p>پشتیبان کامل و فایل‌های جداگانه ورودی و هزینه‌ها</p>
              </div>
              <Icon name="download"/>
            </div>

            <div className="backup-buttons">
              <button className="button primary" type="button"
                onClick={downloadJsonBackup}>
                <Icon name="download"/>دانلود پشتیبان JSON
              </button>

              <button className="button secondary" type="button"
                onClick={downloadIncomeExcel}>
                <Icon name="download"/>Excel ورودی‌ها
              </button>

              <button className="button secondary" type="button"
                onClick={downloadOutcomeExcel}>
                <Icon name="download"/>Excel هزینه‌ها و خروجی‌ها
              </button>

              <button className="button secondary" type="button"
                onClick={downloadExcel}>
                <Icon name="download"/>Excel گزارش کامل
              </button>
            </div>
          </div>
        )}
      </Card>

      <Modal open={Boolean(serviceEditor)} title={serviceEditor === 'new'
        ? 'افزودن خدمت' : 'ویرایش خدمت'} onClose={() => setServiceEditor(undefined)}>
        {serviceEditor && <ServiceForm
          service={serviceEditor === 'new' ? undefined : serviceEditor}
          categories={categories.filter((item) => item.active)}
          onClose={() => setServiceEditor(undefined)}
          onSaved={() => refreshed()}/>}
      </Modal>

      <Modal open={Boolean(categoryEditor)} title={categoryEditor === 'new'
        ? 'افزودن کتگوری خدمات' : 'ویرایش کتگوری خدمات'}
        onClose={() => setCategoryEditor(undefined)} className="small-modal">
        {categoryEditor && <CategoryForm type="service"
          value={categoryEditor === 'new' ? undefined : categoryEditor}
          onClose={() => setCategoryEditor(undefined)}
          onSaved={() => refreshed()}/>}
      </Modal>

      <Modal open={Boolean(expenseEditor)} title={expenseEditor === 'new'
        ? 'افزودن کتگوری هزینه' : 'ویرایش کتگوری هزینه'}
        onClose={() => setExpenseEditor(undefined)} className="small-modal">
        {expenseEditor && <CategoryForm type="expense"
          value={expenseEditor === 'new' ? undefined : expenseEditor}
          onClose={() => setExpenseEditor(undefined)}
          onSaved={() => refreshed()}/>}
      </Modal>

      <Modal open={Boolean(employeeEditor)} title={employeeEditor === 'new'
        ? 'افزودن کارمند' : 'مدیریت کارمند'}
        onClose={() => setEmployeeEditor(undefined)} className="small-modal">
        {employeeEditor && <EmployeeForm
          employee={employeeEditor === 'new' ? undefined : employeeEditor}
          onClose={() => setEmployeeEditor(undefined)}
          onSaved={(password) => {
            if (password) setTemporaryPassword(password)
            refreshed('حساب کارمند ذخیره شد.')
          }}
          onDelete={employeeEditor === 'new' ? undefined : () => {
            setEmployeeEditor(undefined)
            setDeleteTarget({
              type: 'user',
              id: employeeEditor.id,
              name: employeeEditor.name,
            })
          }}/>}
      </Modal>

      <Modal open={Boolean(temporaryPassword)} title="رمز موقت کارمند"
        onClose={() => setTemporaryPassword('')} className="small-modal">
        <div className="temporary-password">
          <p>این رمز را اکنون کپی کنید. بعداً قابل نمایش نیست.</p>
          <strong className="numeric" dir="ltr">{temporaryPassword}</strong>
          <button className="button primary full" type="button" onClick={() => {
            navigator.clipboard.writeText(temporaryPassword)
            setToast('رمز کپی شد.')
          }}>کپی رمز</button>
        </div>
      </Modal>

      <ConfirmModal open={Boolean(deleteTarget)} title="تأیید حذف"
        text={`آیا از حذف «${deleteTarget?.name ?? ''}» مطمئن هستید؟`}
        confirmText="حذف" danger onClose={() => setDeleteTarget(undefined)}
        onConfirm={remove}/>

      {toast && <Toast message={toast} onDone={() => setToast('')}/>}
    </>
  )
}
