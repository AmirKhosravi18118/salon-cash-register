import {
  useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode,
} from 'react'
import {
  authenticate, closeWorkday, createCatalogItem, createFirstManager,
  db, deleteCatalogItem, deleteEmployee, ensureAppData, exportBackup,
  getCatalogItems, getDashboardData, getOpenSession, getTransactions,
  getUserById, getUsers, includedTax, saveCatalogItem, saveEmployee,
  saveExpense, saveServiceTransaction, startWorkday, toggleEmployee,
} from './db'
import type {
  AppTransaction, AppUser, AppView, CatalogItem, DashboardData,
  ItemKind, PriceMode, ServiceLine, SessionUser,
} from './types'

const VERSION = '0.6.0-test'
const SESSION_KEY = 'firouzeh-session-user'
const TAX_RATE = 19

function formatMoney(cents: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format((Number(cents) || 0) / 100)
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('fa-IR-u-ca-gregory', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function parseEuro(value: string): number {
  const parsed = Number(value.trim().replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 100)) : 0
}

function euroInput(cents: number): string {
  return ((Number(cents) || 0) / 100).toFixed(2)
}

function downloadText(filename: string, value: string, type: string): void {
  const blob = new Blob([value], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function Modal({
  open, title, children, onClose, compact = false,
}: {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  compact?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', key)
    document.body.classList.add('modal-open')
    return () => {
      document.removeEventListener('keydown', key)
      document.body.classList.remove('modal-open')
    }
  }, [onClose, open])

  if (!open) return null
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className={`modal-card ${compact ? 'compact' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="icon-button" onClick={onClose}>×</button>
        </header>
        {children}
      </section>
    </div>
  )
}

function Splash() {
  return (
    <div className="splash">
      <div className="splash-orb one" />
      <div className="splash-orb two" />
      <section className="splash-card">
        <div className="brand-logo large">FH</div>
        <p>Firouzeh_hair_beauty</p>
        <h1>فیروزه، خوش آمدید</h1>
        <span>سامانه داخلی در حال آماده‌سازی است…</span>
        <div className="loading-line"><i /></div>
      </section>
    </div>
  )
}

function FirstManagerSetup({ onReady }: { onReady: (user: SessionUser) => void }) {
  const [displayName, setDisplayName] = useState('فیروزه')
  const [username, setUsername] = useState('manager')
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('رمز عبور باید حداقل ۶ کاراکتر باشد.')
      return
    }
    if (password !== repeat) {
      setError('تکرار رمز عبور یکسان نیست.')
      return
    }
    setBusy(true)
    try {
      const user = await createFirstManager({ displayName, username, password })
      sessionStorage.setItem(SESSION_KEY, user.id)
      onReady(user)
    } catch {
      setError('ساخت حساب مدیر انجام نشد.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-screen">
      <section className="auth-card glass">
        <div className="brand-logo">FH</div>
        <div className="auth-copy">
          <span>راه‌اندازی اولیه</span>
          <h1>ایجاد حساب مدیر</h1>
          <p>این حساب به گزارش‌ها، تنظیمات، کاربران و سوابق دسترسی دارد.</p>
        </div>
        <form onSubmit={submit}>
          <label>
            <span>نام نمایشی مدیر</span>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          </label>
          <label>
            <span>نام کاربری</span>
            <input dir="ltr" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </label>
          <label>
            <span>رمز عبور</span>
            <input dir="ltr" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <label>
            <span>تکرار رمز عبور</span>
            <input dir="ltr" type="password" value={repeat} onChange={(e) => setRepeat(e.target.value)} required />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button full" disabled={busy}>
            {busy ? 'در حال ساخت…' : 'ساخت حساب مدیر'}
          </button>
        </form>
      </section>
    </div>
  )
}

function Login({ onLogin }: { onLogin: (user: SessionUser) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const user = await authenticate(username, password)
      if (!user) {
        setError('نام کاربری یا رمز عبور صحیح نیست، یا حساب غیرفعال شده است.')
        return
      }
      sessionStorage.setItem(SESSION_KEY, user.id)
      onLogin(user)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-screen">
      <section className="auth-card glass">
        <div className="brand-logo">FH</div>
        <div className="auth-copy">
          <span>Firouzeh_hair_beauty</span>
          <h1>ورود به پنل</h1>
          <p>با حساب اختصاصی خود وارد شوید.</p>
        </div>
        <form onSubmit={submit}>
          <label>
            <span>نام کاربری</span>
            <input dir="ltr" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </label>
          <label>
            <span>رمز عبور</span>
            <input dir="ltr" autoComplete="current-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button full" disabled={busy}>
            {busy ? 'در حال بررسی…' : 'ورود'}
          </button>
        </form>
        <small className="version">نسخه {VERSION}</small>
      </section>
    </div>
  )
}

const managerViews: Array<{ id: AppView; label: string; icon: string }> = [
  { id: 'dashboard', label: 'داشبورد', icon: '⌂' },
  { id: 'services', label: 'خدمات', icon: '✂' },
  { id: 'activity', label: 'فعالیت‌ها', icon: '≡' },
  { id: 'settings', label: 'تنظیمات', icon: '⚙' },
]

function Shell({
  user, view, setView, logout, children,
}: {
  user: SessionUser
  view: AppView
  setView: (view: AppView) => void
  logout: () => void
  children: ReactNode
}) {
  const views = user.role === 'manager'
    ? managerViews
    : managerViews.filter((item) => item.id === 'services')

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">FH</div>
          <div><strong>Firouzeh</strong><small>پنل داخلی سالن</small></div>
        </div>
        <nav>
          {views.map((item) => (
            <button
              type="button"
              key={item.id}
              className={view === item.id ? 'active' : ''}
              onClick={() => setView(item.id)}
            >
              <i>{item.icon}</i><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="avatar">{user.displayName.slice(0, 1)}</div>
          <div><strong>{user.displayName}</strong><small>{user.role === 'manager' ? 'مدیر' : 'کارمند'}</small></div>
          <button type="button" onClick={logout}>خروج</button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="mobile-brand"><div className="brand-logo small">FH</div><strong>Firouzeh</strong></div>
          <span className="test-badge">نسخه آزمایشی</span>
          <div className="top-user">
            <span>{user.displayName}</span>
            <div className="avatar small">{user.displayName.slice(0, 1)}</div>
            <button type="button" onClick={logout}>خروج</button>
          </div>
        </header>
        <main>{children}</main>
      </div>

      <nav className="mobile-nav">
        {views.map((item) => (
          <button
            type="button"
            key={item.id}
            className={view === item.id ? 'active' : ''}
            onClick={() => setView(item.id)}
          >
            <i>{item.icon}</i><span>{item.label}</span>
          </button>
        ))}
        <button type="button" onClick={logout}><i>↪</i><span>خروج</span></button>
      </nav>
    </div>
  )
}

function PageHeader({
  title, subtitle, action,
}: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <header className="page-header">
      <div><h1>{title}</h1><p>{subtitle}</p></div>
      {action && <div className="page-action">{action}</div>}
    </header>
  )
}

function Dashboard({
  user, revision, onChanged,
}: {
  user: SessionUser
  revision: number
  onChanged: () => void
}) {
  const [data, setData] = useState<DashboardData>()
  const [opening, setOpening] = useState('100.00')
  const [counted, setCounted] = useState('')
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [expense, setExpense] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('')
  const [expenseNote, setExpenseNote] = useState('')

  const load = useCallback(() => getDashboardData().then(setData), [])
  useEffect(() => { load() }, [load, revision])

  if (!data) return <div className="content-loader">در حال آماده‌سازی…</div>

  const start = async () => {
    await startWorkday(parseEuro(opening), user)
    onChanged()
    load()
  }

  const close = async () => {
    if (!counted) return
    await closeWorkday(parseEuro(counted), user)
    setCounted('')
    onChanged()
    load()
  }

  const saveCost = async (event: FormEvent) => {
    event.preventDefault()
    if (!data.openSession) return
    await saveExpense({
      amountCents: parseEuro(expense),
      category: expenseCategory,
      note: expenseNote,
      sessionId: data.openSession.id,
      user,
    })
    setExpense('')
    setExpenseCategory('')
    setExpenseNote('')
    setExpenseOpen(false)
    onChanged()
    load()
  }

  return (
    <>
      <PageHeader
        title={`سلام ${user.displayName}`}
        subtitle="خلاصه فعالیت‌ها و وضعیت امروز"
        action={
          data.openSession
            ? <button className="secondary-button" type="button" onClick={() => setExpenseOpen(true)}>ثبت هزینه</button>
            : undefined
        }
      />

      {!data.openSession ? (
        <section className="glass start-day">
          <div className="large-symbol">◷</div>
          <h2>شروع روز کاری</h2>
          <p>مبلغ اولیه داخل صندوق را وارد کنید.</p>
          <label><span>موجودی اولیه</span><input dir="ltr" type="number" min="0" step="0.01" value={opening} onChange={(e) => setOpening(e.target.value)} /></label>
          <button className="primary-button" type="button" onClick={start}>شروع روز</button>
        </section>
      ) : (
        <>
          <section className="balance-panel">
            <div>
              <span>موجودی مورد انتظار</span>
              <strong>{formatMoney(data.expectedBalanceCents)}</strong>
              <small>روز کاری فعال است</small>
            </div>
            <div className="close-day-inline">
              <label><span>موجودی شمارش‌شده</span><input dir="ltr" type="number" min="0" step="0.01" value={counted} onChange={(e) => setCounted(e.target.value)} placeholder={euroInput(data.expectedBalanceCents)} /></label>
              <button type="button" onClick={close} disabled={!counted}>بستن روز</button>
            </div>
          </section>

          <div className="metrics">
            <article className="glass metric"><span>مجموع خدمات امروز</span><strong>{formatMoney(data.todayServicesCents)}</strong><small>{data.todayCount} فعالیت</small></article>
            <article className="glass metric"><span>انعام امروز</span><strong>{formatMoney(data.todayTipsCents)}</strong><small>ثبت‌شده</small></article>
            <article className="glass metric"><span>هزینه‌های امروز</span><strong>{formatMoney(data.todayExpensesCents)}</strong><small>ثبت‌شده</small></article>
            <article className="glass metric"><span>خالص امروز</span><strong>{formatMoney(data.todayNetCents)}</strong><small>تا این لحظه</small></article>
          </div>
        </>
      )}

      <section className="glass activity-card">
        <div className="section-title"><div><h2>آخرین فعالیت‌ها</h2><p>نام ثبت‌کننده برای هر مورد نگهداری می‌شود.</p></div></div>
        <TransactionRows transactions={data.recent} />
      </section>

      <Modal open={expenseOpen} title="ثبت هزینه" onClose={() => setExpenseOpen(false)} compact>
        <form className="modal-form" onSubmit={saveCost}>
          <label><span>مبلغ</span><input dir="ltr" type="number" min="0.01" step="0.01" value={expense} onChange={(e) => setExpense(e.target.value)} required /></label>
          <label><span>دسته‌بندی</span><input value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)} placeholder="مثلاً خرید مواد" required /></label>
          <label><span>توضیحات</span><textarea value={expenseNote} onChange={(e) => setExpenseNote(e.target.value)} /></label>
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setExpenseOpen(false)}>انصراف</button><button className="primary-button">ثبت</button></div>
        </form>
      </Modal>
    </>
  )
}

interface CartEntry extends ServiceLine {
  key: string
}

function Services({
  user, revision, onChanged,
}: {
  user: SessionUser
  revision: number
  onChanged: () => void
}) {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [sessionId, setSessionId] = useState('')
  const [category, setCategory] = useState('همه')
  const [cart, setCart] = useState<CartEntry[]>([])
  const [customTarget, setCustomTarget] = useState<CatalogItem>()
  const [customPrice, setCustomPrice] = useState('')
  const [discount, setDiscount] = useState('0')
  const [tip, setTip] = useState('0')
  const [received, setReceived] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    Promise.all([getCatalogItems(), getOpenSession()]).then(([catalog, session]) => {
      setItems(catalog.filter((item) => item.active))
      setSessionId(session?.id ?? '')
    })
  }, [revision])

  const categories = useMemo(
    () => ['همه', ...Array.from(new Set(items.map((item) => item.category)))],
    [items],
  )
  const visible = category === 'همه'
    ? items
    : items.filter((item) => item.category === category)

  const itemTotal = cart.reduce((sum, line) => sum + line.totalCents, 0)
  const discountCents = Math.min(parseEuro(discount), itemTotal)
  const serviceGross = itemTotal - discountCents
  const tax = includedTax(serviceGross, TAX_RATE)
  const total = serviceGross + parseEuro(tip)
  const receivedCents = parseEuro(received)
  const change = Math.max(0, receivedCents - total)

  const addLine = (item: CatalogItem, priceCents: number) => {
    if (item.priceMode === 'fixed') {
      setCart((current) => {
        const existing = current.find((line) =>
          line.serviceId === item.id && line.unitPriceCents === priceCents)
        if (existing) {
          return current.map((line) => line.key === existing.key
            ? {
                ...line,
                quantity: line.quantity + 1,
                totalCents: line.unitPriceCents * (line.quantity + 1),
              }
            : line)
        }
        return [...current, {
          key: crypto.randomUUID(),
          serviceId: item.id,
          name: item.name,
          category: item.category,
          quantity: 1,
          unitPriceCents: priceCents,
          basePriceCents: item.basePriceCents,
          priceMode: item.priceMode,
          totalCents: priceCents,
        }]
      })
      return
    }

    setCart((current) => [...current, {
      key: crypto.randomUUID(),
      serviceId: item.id,
      name: item.name,
      category: item.category,
      quantity: 1,
      unitPriceCents: priceCents,
      basePriceCents: item.basePriceCents,
      priceMode: item.priceMode,
      totalCents: priceCents,
    }])
  }

  const selectItem = (item: CatalogItem) => {
    if (item.priceMode === 'from') {
      setCustomTarget(item)
      setCustomPrice(euroInput(item.basePriceCents))
    } else {
      addLine(item, item.basePriceCents)
    }
  }

  const updateQty = (key: string, delta: number) => {
    setCart((current) => current
      .map((line) => {
        if (line.key !== key) return line
        const quantity = Math.max(0, line.quantity + delta)
        return { ...line, quantity, totalCents: line.unitPriceCents * quantity }
      })
      .filter((line) => line.quantity > 0))
  }

  const updateVariablePrice = (key: string, value: string) => {
    const price = parseEuro(value)
    setCart((current) => current.map((line) =>
      line.key === key
        ? { ...line, unitPriceCents: price, totalCents: price * line.quantity }
        : line))
  }

  const complete = async () => {
    setMessage('')
    if (!sessionId) {
      setMessage(user.role === 'manager'
        ? 'ابتدا روز کاری را از داشبورد شروع کنید.'
        : 'روز کاری هنوز توسط مدیر شروع نشده است.')
      return
    }
    if (!cart.length || receivedCents < total) return

    await saveServiceTransaction({
      items: cart.map(({ key: _key, ...line }) => line),
      discountCents,
      tipCents: parseEuro(tip),
      sessionId,
      user,
    })
    setCart([])
    setDiscount('0')
    setTip('0')
    setReceived('')
    setMessage('ثبت نهایی با موفقیت انجام شد.')
    onChanged()
  }

  return (
    <>
      <PageHeader title="خدمات" subtitle="خدمت موردنظر را انتخاب و مبلغ نهایی را ثبت کنید." />
      {message && <div className={`notice ${message.includes('موفقیت') ? 'success' : 'warning'}`}>{message}</div>}

      <div className="service-layout">
        <section className="catalog-side">
          <div className="tabs-scroll">
            <div className="category-tabs">
              {categories.map((value) => (
                <button type="button" key={value} className={category === value ? 'active' : ''} onClick={() => setCategory(value)}>{value}</button>
              ))}
            </div>
          </div>

          <div className="service-grid">
            {visible.map((item) => (
              <button className="simple-service-card" type="button" key={item.id} onClick={() => selectItem(item)}>
                <strong>{item.name}</strong>
                <span>{item.priceMode === 'from' ? 'از ' : ''}{formatMoney(item.basePriceCents)}</span>
              </button>
            ))}
          </div>
        </section>

        <aside className="glass checkout-card">
          <div className="section-title"><div><h2>لیست انتخاب‌شده</h2><p>{cart.reduce((sum, line) => sum + line.quantity, 0)} مورد</p></div></div>

          {!cart.length ? (
            <div className="empty">هنوز خدمتی انتخاب نشده است.</div>
          ) : (
            <div className="cart-list">
              {cart.map((line) => (
                <article className="cart-row" key={line.key}>
                  <div className="cart-name">
                    <strong>{line.name}</strong>
                    {line.priceMode === 'from' ? (
                      <label className="manual-price">
                        <span>مبلغ این مورد</span>
                        <input dir="ltr" type="number" min="0" step="0.01" value={euroInput(line.unitPriceCents)} onChange={(e) => updateVariablePrice(line.key, e.target.value)} />
                      </label>
                    ) : <small>{formatMoney(line.unitPriceCents)}</small>}
                  </div>
                  <div className="qty"><button type="button" onClick={() => updateQty(line.key, -1)}>−</button><span>{line.quantity}</span><button type="button" onClick={() => updateQty(line.key, 1)}>+</button></div>
                </article>
              ))}
            </div>
          )}

          <div className="checkout-fields">
            <div className="summary-line"><span>جمع خدمات</span><strong>{formatMoney(itemTotal)}</strong></div>
            <label><span>تخفیف</span><input dir="ltr" type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} /></label>
            <div className="summary-line emphasized"><span>جمع پس از تخفیف</span><strong>{formatMoney(serviceGross)}</strong></div>
            <div className="tax-line"><span>مالیات ۱۹٪ موجود در مبلغ</span><strong>{formatMoney(tax)}</strong></div>
            <label><span>انعام</span><input dir="ltr" type="number" min="0" step="0.01" value={tip} onChange={(e) => setTip(e.target.value)} /></label>
            <div className="final-total"><span>مبلغ نهایی</span><strong>{formatMoney(total)}</strong></div>
            <label><span>مبلغ دریافتی</span><input className="large-input" dir="ltr" type="number" min="0" step="0.01" value={received} onChange={(e) => setReceived(e.target.value)} /></label>
            <div className="summary-line"><span>باقی‌مانده</span><strong>{formatMoney(change)}</strong></div>
            {received && receivedCents < total && <p className="form-error">مبلغ دریافتی کمتر از مبلغ نهایی است.</p>}
            <button className="primary-button full" type="button" onClick={complete} disabled={!cart.length || receivedCents < total}>ثبت نهایی</button>
          </div>
        </aside>
      </div>

      <Modal open={Boolean(customTarget)} title="تعیین مبلغ خدمت" onClose={() => setCustomTarget(undefined)} compact>
        {customTarget && (
          <form className="modal-form" onSubmit={(event) => {
            event.preventDefault()
            addLine(customTarget, parseEuro(customPrice))
            setCustomTarget(undefined)
          }}>
            <div className="variable-service-name"><strong>{customTarget.name}</strong><small>قیمت پایه: {formatMoney(customTarget.basePriceCents)}</small></div>
            <label><span>مبلغ نهایی این خدمت</span><input className="large-input" autoFocus dir="ltr" type="number" min="0" step="0.01" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} required /></label>
            <p className="helper">برای هزینه بیشتر یا تخفیف می‌توانید مبلغی بالاتر یا پایین‌تر از قیمت پایه وارد کنید.</p>
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setCustomTarget(undefined)}>انصراف</button><button className="primary-button">افزودن</button></div>
          </form>
        )}
      </Modal>
    </>
  )
}

function transactionTitle(item: AppTransaction): string {
  if (item.kind === 'service' || String(item.kind) === 'sale') return 'ثبت خدمات'
  if (item.kind === 'expense') return 'هزینه'
  if (item.kind === 'owner_deposit') return 'واریز مالک'
  if (item.kind === 'owner_withdrawal') return 'برداشت مالک'
  if (item.kind === 'bank_deposit') return 'انتقال به بانک'
  if (item.kind === 'refund') return 'بازپرداخت'
  return 'اصلاح'
}

function transactionItemNames(item: AppTransaction): string {
  return (item.items ?? []).map((line) =>
    line.name || line.nameDe || line.nameFa || '').filter(Boolean).join('، ')
}

function TransactionRows({ transactions }: { transactions: AppTransaction[] }) {
  if (!transactions.length) return <div className="empty">اطلاعاتی وجود ندارد.</div>
  return (
    <div className="transaction-list">
      {transactions.map((item) => (
        <article className="transaction-row" key={item.id}>
          <div className={`transaction-mark ${item.cashEffectCents >= 0 ? 'in' : 'out'}`}>{item.cashEffectCents >= 0 ? '↓' : '↑'}</div>
          <div className="transaction-copy">
            <strong>{transactionTitle(item)}</strong>
            <small>{transactionItemNames(item) || item.category || item.note || item.sequence}</small>
          </div>
          <div className="transaction-user"><span>{item.userName || 'ثبت قدیمی'}</span><small>{formatDate(item.createdAt)}</small></div>
          <strong className={item.cashEffectCents >= 0 ? 'positive' : 'negative'}>{item.cashEffectCents >= 0 ? '+' : ''}{formatMoney(item.cashEffectCents)}</strong>
        </article>
      ))}
    </div>
  )
}

function Activity({ revision }: { revision: number }) {
  const [items, setItems] = useState<AppTransaction[]>([])
  const [query, setQuery] = useState('')
  useEffect(() => { getTransactions().then(setItems) }, [revision])
  const filtered = items.filter((item) => [
    item.sequence, item.category, item.note, item.userName,
    ...item.items.flatMap((line) => [line.name, line.nameDe, line.nameFa]),
  ].join(' ').toLowerCase().includes(query.toLowerCase()))

  return (
    <>
      <PageHeader title="فعالیت‌ها" subtitle="تمام موارد همراه با نام کاربری ثبت‌کننده نگهداری می‌شوند." />
      <section className="glass activity-card">
        <div className="activity-filter"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جست‌وجو در فعالیت‌ها" /></div>
        <TransactionRows transactions={filtered} />
      </section>
    </>
  )
}

interface CatalogEditorState {
  item: CatalogItem
  isNew: boolean
}

function Settings({
  user, revision, onChanged,
}: {
  user: SessionUser
  revision: number
  onChanged: () => void
}) {
  const [tab, setTab] = useState<'catalog' | 'employees' | 'general'>('catalog')
  const [items, setItems] = useState<CatalogItem[]>([])
  const [users, setUsers] = useState<AppUser[]>([])
  const [editor, setEditor] = useState<CatalogEditorState>()
  const [deleteTarget, setDeleteTarget] = useState<CatalogItem>()
  const [employeeEditor, setEmployeeEditor] = useState<AppUser | 'new'>()
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setItems(await getCatalogItems())
    setUsers(await getUsers())
  }, [])
  useEffect(() => { load() }, [load, revision])

  const addItem = async () => {
    setEditor({ item: await createCatalogItem('service'), isNew: true })
  }

  return (
    <>
      <PageHeader title="تنظیمات" subtitle="مدیریت خدمات، قیمت‌ها، پکیج‌ها و کاربران" />
      {message && <div className="notice success">{message}</div>}
      <div className="tabs-scroll settings-tab-wrap">
        <div className="category-tabs">
          <button className={tab === 'catalog' ? 'active' : ''} onClick={() => setTab('catalog')}>لیست قیمت‌ها</button>
          <button className={tab === 'employees' ? 'active' : ''} onClick={() => setTab('employees')}>کارمندان</button>
          <button className={tab === 'general' ? 'active' : ''} onClick={() => setTab('general')}>عمومی</button>
        </div>
      </div>

      {tab === 'catalog' && (
        <section className="glass settings-card">
          <div className="settings-heading">
            <div><h2>خدمات و پکیج‌ها</h2><p>برای هر مورد قیمت ثابت یا «از قیمت پایه» مشخص کنید.</p></div>
            <button className="primary-button" type="button" onClick={addItem}>افزودن مورد</button>
          </div>
          <div className="catalog-table">
            {items.map((item) => (
              <article className={!item.active ? 'disabled-row' : ''} key={item.id}>
                <div><strong>{item.name}</strong><small>{item.category} · {item.kind === 'package' ? 'پکیج' : 'خدمت'}</small></div>
                <span className={`mode-badge ${item.priceMode}`}>{item.priceMode === 'from' ? 'از قیمت پایه' : 'قیمت ثابت'}</span>
                <strong>{item.priceMode === 'from' ? 'از ' : ''}{formatMoney(item.basePriceCents)}</strong>
                <span className={`status ${item.active ? 'active' : ''}`}>{item.active ? 'فعال' : 'غیرفعال'}</span>
                <div className="row-actions">
                  <button type="button" onClick={() => setEditor({ item, isNew: false })}>ویرایش</button>
                  <button type="button" onClick={async () => { await saveCatalogItem({ ...item, active: !item.active }, user.displayName); load(); onChanged() }}>{item.active ? 'غیرفعال' : 'فعال'}</button>
                  <button className="danger-link" type="button" onClick={() => setDeleteTarget(item)}>حذف</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === 'employees' && (
        <section className="glass settings-card">
          <div className="settings-heading">
            <div><h2>کارمندان</h2><p>هر فرد با حساب خودش وارد می‌شود و فعالیت‌ها به نام او ثبت می‌شوند.</p></div>
            <button className="primary-button" type="button" onClick={() => setEmployeeEditor('new')}>افزودن کارمند</button>
          </div>
          <div className="employee-list">
            {users.map((item) => (
              <article key={item.id}>
                <div className="avatar">{item.displayName.slice(0, 1)}</div>
                <div><strong>{item.displayName}</strong><small dir="ltr">@{item.username}</small></div>
                <span className="role-badge">{item.role === 'manager' ? 'مدیر' : 'کارمند'}</span>
                <span className={`status ${item.active ? 'active' : ''}`}>{item.active ? 'فعال' : 'غیرفعال'}</span>
                {item.role === 'employee' ? (
                  <div className="row-actions">
                    <button type="button" onClick={() => setEmployeeEditor(item)}>ویرایش / رمز</button>
                    <button type="button" onClick={async () => { await toggleEmployee(item.id); load() }}>{item.active ? 'تعلیق حساب' : 'فعال‌سازی'}</button>
                    <button className="danger-link" type="button" onClick={async () => { if (confirm(`حساب ${item.displayName} حذف شود؟`)) { await deleteEmployee(item.id); load() } }}>حذف</button>
                  </div>
                ) : <small>حساب اصلی</small>}
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === 'general' && (
        <div className="general-grid">
          <section className="glass settings-card compact-card">
            <h2>تنظیمات مالیات</h2>
            <p>قیمت خدمات به‌صورت مبلغ نهایی نمایش داده می‌شود و سهم مالیات موجود در مبلغ محاسبه می‌شود.</p>
            <div className="info-row"><span>نرخ فعلی</span><strong>۱۹٪</strong></div>
          </section>
          <section className="glass settings-card compact-card">
            <h2>پشتیبان‌گیری</h2>
            <p>یک نسخه JSON از اطلاعات این مرورگر دریافت کنید.</p>
            <button className="secondary-button" type="button" onClick={async () => downloadText(`Firouzeh_backup_${new Date().toISOString().slice(0, 10)}.json`, await exportBackup(), 'application/json;charset=utf-8')}>دانلود فایل پشتیبان</button>
          </section>
          <section className="glass settings-card compact-card">
            <h2>درباره نسخه</h2>
            <div className="info-row"><span>نام سالن</span><strong>Firouzeh_hair_beauty</strong></div>
            <div className="info-row"><span>نسخه</span><strong>{VERSION}</strong></div>
          </section>
        </div>
      )}

      <CatalogEditor
        state={editor}
        onClose={() => setEditor(undefined)}
        onSave={async (item) => {
          await saveCatalogItem(item, user.displayName)
          setEditor(undefined)
          setMessage('اطلاعات خدمت ذخیره شد.')
          load()
          onChanged()
        }}
      />

      <Modal open={Boolean(deleteTarget)} title="حذف از لیست قیمت‌ها" onClose={() => setDeleteTarget(undefined)} compact>
        {deleteTarget && (
          <div className="delete-box">
            <div className="danger-symbol">!</div>
            <h3>«{deleteTarget.name}» حذف شود؟</h3>
            <p>این مورد از لیست خدمات حذف می‌شود؛ سوابق قبلی که نام و مبلغ را داخل خودشان ذخیره کرده‌اند باقی می‌مانند.</p>
            <div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setDeleteTarget(undefined)}>انصراف</button><button className="danger-button" type="button" onClick={async () => { await deleteCatalogItem(deleteTarget.id); setDeleteTarget(undefined); setMessage('مورد انتخاب‌شده حذف شد.'); load(); onChanged() }}>حذف</button></div>
          </div>
        )}
      </Modal>

      <EmployeeEditor
        value={employeeEditor}
        onClose={() => setEmployeeEditor(undefined)}
        onSave={async (input) => {
          await saveEmployee(input)
          setEmployeeEditor(undefined)
          setMessage('حساب کارمند ذخیره شد.')
          load()
        }}
      />
    </>
  )
}

function CatalogEditor({
  state, onClose, onSave,
}: {
  state?: CatalogEditorState
  onClose: () => void
  onSave: (item: CatalogItem) => Promise<void>
}) {
  const [form, setForm] = useState<CatalogItem>()
  const [price, setPrice] = useState('')

  useEffect(() => {
    setForm(state?.item)
    setPrice(state ? euroInput(state.item.basePriceCents) : '')
  }, [state])

  if (!state || !form) return null
  const update = <K extends keyof CatalogItem>(key: K, value: CatalogItem[K]) =>
    setForm((current) => current ? { ...current, [key]: value } : current)

  return (
    <Modal open title={state.isNew ? 'افزودن مورد' : 'ویرایش مورد'} onClose={onClose}>
      <form className="modal-form" onSubmit={async (event) => {
        event.preventDefault()
        await onSave({ ...form, basePriceCents: parseEuro(price) })
      }}>
        <div className="form-grid">
          <label><span>نام خدمت یا پکیج</span><input dir="ltr" value={form.name} onChange={(e) => update('name', e.target.value)} required /></label>
          <label><span>کتگوری</span><input dir="ltr" list="categories" value={form.category} onChange={(e) => update('category', e.target.value)} required /><datalist id="categories"><option value="CUT & STYLING" /><option value="COLORATION" /><option value="HIGHLIGHTS" /><option value="CARE & TREATMENT" /></datalist></label>
          <label><span>نوع مورد</span><select value={form.kind} onChange={(e) => update('kind', e.target.value as ItemKind)}><option value="service">خدمت</option><option value="package">پکیج</option></select></label>
          <label><span>نوع قیمت</span><select value={form.priceMode} onChange={(e) => update('priceMode', e.target.value as PriceMode)}><option value="fixed">قیمت ثابت</option><option value="from">از قیمت پایه</option></select></label>
          <label><span>{form.priceMode === 'from' ? 'قیمت پایه' : 'قیمت'}</span><input dir="ltr" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required /></label>
          <label><span>مدت تقریبی، دقیقه</span><input dir="ltr" type="number" min="0" step="5" value={form.durationMinutes ?? 0} onChange={(e) => update('durationMinutes', Number(e.target.value))} /></label>
        </div>
        <label className="check-line"><input type="checkbox" checked={form.active} onChange={(e) => update('active', e.target.checked)} /><span>در لیست خدمات فعال باشد</span></label>
        <div className="modal-actions"><button className="secondary-button" type="button" onClick={onClose}>انصراف</button><button className="primary-button">ذخیره</button></div>
      </form>
    </Modal>
  )
}

function EmployeeEditor({
  value, onClose, onSave,
}: {
  value?: AppUser | 'new'
  onClose: () => void
  onSave: (input: { id?: string; displayName: string; username: string; password?: string }) => Promise<void>
}) {
  const existing = value && value !== 'new' ? value : undefined
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setDisplayName(existing?.displayName ?? '')
    setUsername(existing?.username ?? '')
    setPassword('')
    setError('')
  }, [existing, value])

  if (!value) return null
  return (
    <Modal open title={existing ? 'ویرایش کارمند' : 'افزودن کارمند'} onClose={onClose} compact>
      <form className="modal-form" onSubmit={async (event) => {
        event.preventDefault()
        setError('')
        try {
          await onSave({ id: existing?.id, displayName, username, password: password || undefined })
        } catch (cause) {
          const code = cause instanceof Error ? cause.message : ''
          setError(code === 'USERNAME_EXISTS'
            ? 'این نام کاربری قبلاً استفاده شده است.'
            : 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد.')
        }
      }}>
        <label><span>نام نمایشی</span><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required /></label>
        <label><span>نام کاربری</span><input dir="ltr" value={username} onChange={(e) => setUsername(e.target.value)} required /></label>
        <label><span>{existing ? 'رمز جدید، در صورت نیاز' : 'رمز عبور'}</span><input dir="ltr" type="password" minLength={existing ? undefined : 6} value={password} onChange={(e) => setPassword(e.target.value)} required={!existing} /></label>
        {error && <p className="form-error">{error}</p>}
        <div className="modal-actions"><button className="secondary-button" type="button" onClick={onClose}>انصراف</button><button className="primary-button">ذخیره</button></div>
      </form>
    </Modal>
  )
}

export default function App() {
  const [ready, setReady] = useState(false)
  const [minimumSplash, setMinimumSplash] = useState(false)
  const [needsManager, setNeedsManager] = useState(false)
  const [user, setUser] = useState<SessionUser>()
  const [view, setView] = useState<AppView>('dashboard')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    document.documentElement.lang = 'fa'
    document.documentElement.dir = 'rtl'
    document.title = 'Firouzeh — پنل داخلی'
    const timer = window.setTimeout(() => setMinimumSplash(true), 1050)

    ensureAppData()
      .then(async () => {
        const managerExists = Boolean(await db.users.where('role').equals('manager').first())
        setNeedsManager(!managerExists)
        const savedId = sessionStorage.getItem(SESSION_KEY)
        if (savedId) {
          const saved = await getUserById(savedId)
          if (saved) {
            setUser(saved)
            setView(saved.role === 'manager' ? 'dashboard' : 'services')
          } else {
            sessionStorage.removeItem(SESSION_KEY)
          }
        }
      })
      .finally(() => setReady(true))

    return () => window.clearTimeout(timer)
  }, [])

  const login = (next: SessionUser) => {
    setUser(next)
    setNeedsManager(false)
    setView(next.role === 'manager' ? 'dashboard' : 'services')
  }

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY)
    setUser(undefined)
  }

  const setProtectedView = (next: AppView) => {
    if (user?.role === 'employee' && next !== 'services') return
    setView(next)
  }

  if (!ready || !minimumSplash) return <Splash />
  if (needsManager) return <FirstManagerSetup onReady={login} />
  if (!user) return <Login onLogin={login} />

  return (
    <Shell user={user} view={view} setView={setProtectedView} logout={logout}>
      {view === 'dashboard' && user.role === 'manager' && <Dashboard user={user} revision={revision} onChanged={() => setRevision((value) => value + 1)} />}
      {view === 'services' && <Services user={user} revision={revision} onChanged={() => setRevision((value) => value + 1)} />}
      {view === 'activity' && user.role === 'manager' && <Activity revision={revision} />}
      {view === 'settings' && user.role === 'manager' && <Settings user={user} revision={revision} onChanged={() => setRevision((value) => value + 1)} />}
    </Shell>
  )
}
