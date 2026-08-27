import {
  Download, Edit3, FileSpreadsheet, Image, Palette, Plus,
  RotateCcw, Save, Trash2, UserPlus, Users,
} from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { createUser, updateUserPassword } from '../auth'
import { defaultTheme } from '../data'
import {
  db, deleteExpenseCategory, deleteService, deleteServiceCategory,
  getTheme, saveTheme,
} from '../db'
import { downloadBackup, downloadExcel } from '../lib/export'
import { compressBackground, applyTheme } from '../lib/theme'
import { euroInput, parseEuro } from '../lib/format'
import type {
  ExpenseCategory, PriceMode, Service, ServiceCategory,
  ThemeSettings, User,
} from '../types'
import { Card, ConfirmModal, Modal, Money, PageHeader, Toast } from '../components/UI'

type Tab = 'services' | 'serviceCategories' | 'expenseCategories' | 'appearance' | 'users' | 'backup'

export function SettingsPage({
  currentUser, revision, onChanged,
}: { currentUser: User; revision: number; onChanged: () => void }) {
  const [tab, setTab] = useState<Tab>('services')
  const [services, setServices] = useState<Service[]>([])
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([])
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [theme, setTheme] = useState<ThemeSettings>(defaultTheme)
  const [serviceEditor, setServiceEditor] = useState<Service | null>(null)
  const [serviceNew, setServiceNew] = useState(false)
  const [categoryEditor, setCategoryEditor] = useState<ServiceCategory | null>(null)
  const [expenseEditor, setExpenseEditor] = useState<ExpenseCategory | null>(null)
  const [userEditor, setUserEditor] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'service' | 'category' | 'expense'; id: string; name: string } | null>(null)
  const [toast, setToast] = useState('')

  const load = async () => {
    const [serviceRows, categoryRows, expenseRows, userRows, themeValue] = await Promise.all([
      db.services.orderBy('updatedAt').reverse().toArray(),
      db.serviceCategories.orderBy('order').toArray(),
      db.expenseCategories.orderBy('order').toArray(),
      db.users.toArray(),
      getTheme(),
    ])
    setServices(serviceRows)
    setServiceCategories(categoryRows)
    setExpenseCategories(expenseRows)
    setUsers(userRows)
    setTheme(themeValue)
  }

  useEffect(() => { load() }, [revision])

  const createEmptyService = (): Service => ({
    id: crypto.randomUUID(),
    categoryId: serviceCategories[0]?.id ?? '',
    name: '',
    durationMinutes: 60,
    priceCents: 0,
    priceMode: 'fixed',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  const remove = async () => {
    if (!deleteTarget) return
    try {
      if (deleteTarget.type === 'service') await deleteService(deleteTarget.id)
      if (deleteTarget.type === 'category') await deleteServiceCategory(deleteTarget.id)
      if (deleteTarget.type === 'expense') await deleteExpenseCategory(deleteTarget.id)
      setToast('حذف شد.')
      setDeleteTarget(null)
      await load()
      onChanged()
    } catch {
      setToast('این کتگوری دارای خدمت است و فعلاً قابل حذف نیست.')
      setDeleteTarget(null)
    }
  }

  const updateTheme = <K extends keyof ThemeSettings>(key: K, value: ThemeSettings[K]) => {
    const next = { ...theme, [key]: value }
    setTheme(next)
    applyTheme(next)
  }

  const persistTheme = async () => {
    await saveTheme(theme)
    setToast('ظاهر برنامه ذخیره شد.')
    onChanged()
  }

  return (
    <>
      <PageHeader title="تنظیمات" subtitle="مدیریت خدمات، کتگوری‌ها، کاربران، ظاهر و خروجی اطلاعات" />

      <div className="settings-tab-scroll">
        <div className="settings-tabs">
          {[
            ['services', 'خدمات'],
            ['serviceCategories', 'کتگوری خدمات'],
            ['expenseCategories', 'کتگوری هزینه‌ها'],
            ['appearance', 'تغییر ظاهر'],
            ['users', 'کاربران'],
            ['backup', 'پشتیبان و خروجی'],
          ].map(([value, label]) => (
            <button className={tab === value ? 'active' : ''} key={value} onClick={() => setTab(value as Tab)} type="button">{label}</button>
          ))}
        </div>
      </div>

      {tab === 'services' && (
        <Card>
          <div className="section-heading">
            <div><h2>لیست خدمات</h2><p>قیمت ثابت، قیمت پایه و کتگوری هر خدمت</p></div>
            <button className="primary-button" type="button" onClick={() => { setServiceNew(true); setServiceEditor(createEmptyService()) }}><Plus size={18} />افزودن خدمت</button>
          </div>
          <div className="settings-list">
            {services.map((service) => (
              <div className="settings-row" key={service.id}>
                <div><strong>{service.name}</strong><span>{serviceCategories.find((item) => item.id === service.categoryId)?.name ?? 'بدون کتگوری'} — {service.priceMode === 'from' ? 'از قیمت پایه' : 'قیمت ثابت'}</span></div>
                <strong><Money cents={service.priceCents} /></strong>
                <span className={`status-chip ${service.active ? 'success' : ''}`}>{service.active ? 'فعال' : 'غیرفعال'}</span>
                <button className="icon-button" type="button" onClick={() => { setServiceNew(false); setServiceEditor(service) }}><Edit3 size={17} /></button>
                <button className="icon-button danger" type="button" onClick={() => setDeleteTarget({ type: 'service', id: service.id, name: service.name })}><Trash2 size={17} /></button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'serviceCategories' && (
        <Card>
          <div className="section-heading"><div><h2>کتگوری‌های خدمات</h2><p>تب‌های بالای صفحه خدمات از این قسمت ساخته می‌شوند.</p></div><button className="primary-button" type="button" onClick={() => setCategoryEditor({ id: crypto.randomUUID(), name: '', order: serviceCategories.length + 1, active: true })}><Plus size={18} />افزودن کتگوری</button></div>
          <div className="settings-list">
            {serviceCategories.map((item) => (
              <div className="settings-row compact-row" key={item.id}><div><strong>{item.name}</strong><span>{services.filter((service) => service.categoryId === item.id).length} خدمت</span></div><span className={`status-chip ${item.active ? 'success' : ''}`}>{item.active ? 'فعال' : 'غیرفعال'}</span><button className="icon-button" onClick={() => setCategoryEditor(item)} type="button"><Edit3 size={17} /></button><button className="icon-button danger" onClick={() => setDeleteTarget({ type: 'category', id: item.id, name: item.name })} type="button"><Trash2 size={17} /></button></div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'expenseCategories' && (
        <Card>
          <div className="section-heading"><div><h2>کتگوری‌های هزینه</h2><p>برای ثبت و تحلیل منظم هزینه‌ها</p></div><button className="primary-button" type="button" onClick={() => setExpenseEditor({ id: crypto.randomUUID(), name: '', order: expenseCategories.length + 1, active: true })}><Plus size={18} />افزودن کتگوری</button></div>
          <div className="settings-list">
            {expenseCategories.map((item) => (
              <div className="settings-row compact-row" key={item.id}><div><strong>{item.name}</strong><span>ترتیب {item.order}</span></div><span className={`status-chip ${item.active ? 'success' : ''}`}>{item.active ? 'فعال' : 'غیرفعال'}</span><button className="icon-button" onClick={() => setExpenseEditor(item)} type="button"><Edit3 size={17} /></button><button className="icon-button danger" onClick={() => setDeleteTarget({ type: 'expense', id: item.id, name: item.name })} type="button"><Trash2 size={17} /></button></div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'appearance' && (
        <div className="appearance-grid">
          <Card className="theme-card">
            <div className="section-heading"><div><h2>پالت رنگی</h2><p>تمام اجزای هم‌نوع به‌صورت یکپارچه تغییر می‌کنند.</p></div><Palette size={23} /></div>
            <div className="color-grid">
              {[
                ['primary', 'دکمه اصلی'], ['secondary', 'رنگ مکمل'],
                ['background', 'پس‌زمینه'], ['surface', 'کارت‌ها'],
                ['text', 'متن اصلی'], ['muted', 'متن کم‌رنگ'],
                ['sidebar', 'منوی کناری'], ['success', 'موفقیت'], ['danger', 'خطا'],
              ].map(([key, label]) => (
                <label className="color-field" key={key}><span>{label}</span><input type="color" value={String(theme[key as keyof ThemeSettings])} onChange={(event) => updateTheme(key as keyof ThemeSettings, event.target.value as never)} /></label>
              ))}
            </div>
          </Card>
          <Card className="theme-card">
            <div className="section-heading"><div><h2>شکل و شفافیت</h2><p>گردی، سایه و شیشه‌ای‌بودن رابط</p></div></div>
            {[
              ['radius', 'گردی کارت‌ها', 10, 40],
              ['shadow', 'قدرت سایه', 0, 40],
              ['blur', 'میزان شیشه‌ای', 0, 40],
              ['surfaceOpacity', 'شفافیت کارت‌ها', 35, 100],
              ['backgroundOpacity', 'شدت تصویر پس‌زمینه', 0, 100],
            ].map(([key, label, min, max]) => (
              <label className="range-field" key={String(key)}><span>{label}<b>{String(theme[key as keyof ThemeSettings])}</b></span><input type="range" min={Number(min)} max={Number(max)} value={Number(theme[key as keyof ThemeSettings])} onChange={(event) => updateTheme(key as keyof ThemeSettings, Number(event.target.value) as never)} /></label>
            ))}
            <label className="image-upload"><Image size={21} /><span>انتخاب تصویر پس‌زمینه داشبورد</span><input type="file" accept="image/*" onChange={async (event) => { const file = event.target.files?.[0]; if (file) updateTheme('backgroundImage', await compressBackground(file)) }} /></label>
            <div className="theme-actions"><button className="secondary-button" type="button" onClick={() => { setTheme(defaultTheme); applyTheme(defaultTheme) }}><RotateCcw size={18} />بازنشانی</button><button className="primary-button" type="button" onClick={persistTheme}><Save size={18} />ذخیره ظاهر</button></div>
          </Card>
        </div>
      )}

      {tab === 'users' && (
        <Card>
          <div className="section-heading"><div><h2>کاربران</h2><p>مدیر به همه بخش‌ها و کارمند فقط به خدمات و شیفت دسترسی دارد.</p></div><button className="primary-button" type="button" onClick={() => setUserEditor(true)}><UserPlus size={18} />افزودن کارمند</button></div>
          <div className="settings-list">
            {users.map((item) => (
              <div className="settings-row compact-row" key={item.id}><div><strong>{item.displayName}</strong><span>{item.username} — {item.role === 'manager' ? 'مدیر' : 'کارمند'}</span></div><span className={`status-chip ${item.active ? 'success' : ''}`}>{item.active ? 'فعال' : 'غیرفعال'}</span>{item.id !== currentUser.id && <button className="secondary-button small" type="button" onClick={async () => { await db.users.put({ ...item, active: !item.active }); await load(); onChanged() }}>{item.active ? 'تعلیق' : 'فعال‌سازی'}</button>}</div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'backup' && (
        <div className="backup-grid">
          <Card className="backup-card"><Download size={30} /><h2>پشتیبان JSON</h2><p>نسخه کامل داده‌های این مرورگر</p><button className="primary-button" onClick={downloadBackup} type="button"><Download size={18} />دانلود پشتیبان</button></Card>
          <Card className="backup-card"><FileSpreadsheet size={30} /><h2>گزارش Excel</h2><p>فعالیت‌ها و شیفت‌ها با ستون‌های منظم</p><button className="primary-button" onClick={downloadExcel} type="button"><FileSpreadsheet size={18} />دانلود Excel</button></Card>
        </div>
      )}

      <ServiceEditor open={Boolean(serviceEditor)} service={serviceEditor} categories={serviceCategories} isNew={serviceNew} onClose={() => setServiceEditor(null)} onSaved={async () => { await load(); onChanged(); setServiceEditor(null); setToast('خدمت ذخیره شد.') }} />
      <CategoryEditor open={Boolean(categoryEditor)} value={categoryEditor} type="service" onClose={() => setCategoryEditor(null)} onSaved={async () => { await load(); onChanged(); setCategoryEditor(null); setToast('کتگوری ذخیره شد.') }} />
      <CategoryEditor open={Boolean(expenseEditor)} value={expenseEditor} type="expense" onClose={() => setExpenseEditor(null)} onSaved={async () => { await load(); onChanged(); setExpenseEditor(null); setToast('کتگوری ذخیره شد.') }} />
      <UserEditor open={userEditor} onClose={() => setUserEditor(false)} onSaved={async () => { await load(); onChanged(); setUserEditor(false); setToast('کارمند ساخته شد.') }} />
      <ConfirmModal open={Boolean(deleteTarget)} title="تأیید حذف" message={`«${deleteTarget?.name ?? ''}» حذف شود؟ سوابق فعالیت‌های قبلی تغییر نمی‌کنند.`} confirmText="حذف" danger onClose={() => setDeleteTarget(null)} onConfirm={remove} />
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </>
  )
}

function ServiceEditor({ open, service, categories, isNew, onClose, onSaved }: { open: boolean; service: Service | null; categories: ServiceCategory[]; isNew: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Service | null>(service)
  const [price, setPrice] = useState(service ? euroInput(service.priceCents) : '')
  useEffect(() => { setForm(service); setPrice(service ? euroInput(service.priceCents) : '') }, [service])
  if (!form) return null
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    await db.services.put({ ...form, priceCents: parseEuro(price), updatedAt: new Date().toISOString() })
    onSaved()
  }
  return <Modal open={open} title={isNew ? 'افزودن خدمت' : 'ویرایش خدمت'} onClose={onClose}>
    <form className="modal-form" onSubmit={submit}>
      <label><span>نام خدمت</span><input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
      <label><span>کتگوری</span><select className="input" value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })} required>{categories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
      <div className="form-grid"><label><span>قیمت پایه</span><input className="input" type="number" min="0" step="0.01" dir="ltr" value={price} onChange={(event) => setPrice(event.target.value)} required /></label><label><span>مدت، دقیقه</span><input className="input" type="number" min="0" value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: Number(event.target.value) })} /></label></div>
      <label><span>نوع قیمت</span><select className="input" value={form.priceMode} onChange={(event) => setForm({ ...form, priceMode: event.target.value as PriceMode })}><option value="fixed">قیمت ثابت</option><option value="from">از قیمت پایه</option></select></label>
      <label className="check-field"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /><span>فعال باشد</span></label>
      <div className="modal-actions"><button className="secondary-button" type="button" onClick={onClose}>انصراف</button><button className="primary-button" type="submit">ذخیره</button></div>
    </form>
  </Modal>
}

function CategoryEditor({ open, value, type, onClose, onSaved }: { open: boolean; value: ServiceCategory | ExpenseCategory | null; type: 'service' | 'expense'; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(value)
  useEffect(() => setForm(value), [value])
  if (!form) return null
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (type === 'service') await db.serviceCategories.put(form as ServiceCategory)
    else await db.expenseCategories.put(form as ExpenseCategory)
    onSaved()
  }
  return <Modal open={open} title={type === 'service' ? 'کتگوری خدمات' : 'کتگوری هزینه'} onClose={onClose}>
    <form className="modal-form" onSubmit={submit}>
      <label><span>نام کتگوری</span><input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required autoFocus /></label>
      <div className="form-grid"><label><span>ترتیب نمایش</span><input className="input" type="number" min="1" value={form.order} onChange={(event) => setForm({ ...form, order: Number(event.target.value) })} /></label><label className="check-field"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /><span>فعال باشد</span></label></div>
      <div className="modal-actions"><button className="secondary-button" type="button" onClick={onClose}>انصراف</button><button className="primary-button" type="submit">ذخیره</button></div>
    </form>
  </Modal>
}

function UserEditor({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    try {
      await createUser({ displayName, username, password, role: 'staff' })
      setDisplayName(''); setUsername(''); setPassword(''); setError('')
      onSaved()
    } catch {
      setError('نام کاربری تکراری است یا رمز کمتر از ۶ کاراکتر است.')
    }
  }
  return <Modal open={open} title="افزودن کارمند" onClose={onClose}>
    <form className="modal-form" onSubmit={submit}>
      <label><span>نام نمایشی</span><input className="input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} required /></label>
      <label><span>نام کاربری</span><input className="input" dir="ltr" value={username} onChange={(event) => setUsername(event.target.value)} required /></label>
      <label><span>رمز عبور</span><input className="input" dir="ltr" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} /></label>
      {error && <p className="form-error">{error}</p>}
      <div className="modal-actions"><button className="secondary-button" type="button" onClick={onClose}>انصراف</button><button className="primary-button" type="submit"><Users size={18} />ساخت کارمند</button></div>
    </form>
  </Modal>
}
