import { useState, type FormEvent } from 'react'
import { createManager, login, managerExists } from '../auth'
import { Card, Icon } from '../components/ui'
import type { UserAccount } from '../types'

export function AuthPage({ onAuthenticated }: {
  onAuthenticated: (user: UserAccount) => void
}) {
  const [mode, setMode] = useState<'checking' | 'setup' | 'login'>('checking')
  const [name, setName] = useState('فیروزه')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (mode === 'checking') {
    managerExists().then((exists) => setMode(exists ? 'login' : 'setup'))
    return <div className="auth-loading">در حال آماده‌سازی…</div>
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const user = mode === 'setup'
        ? await createManager({ name, username, password })
        : await login(username, password)
      onAuthenticated(user)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : ''
      setError(message === 'ACCOUNT_DISABLED'
        ? 'این حساب غیرفعال شده است.'
        : message === 'USERNAME_EXISTS'
          ? 'این نام کاربری قبلاً ثبت شده است.'
          : 'نام کاربری یا رمز عبور صحیح نیست.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-glow one"/>
      <div className="auth-glow two"/>
      <Card className="auth-card">
        <div className="auth-logo">FH</div>
        <div className="auth-title">
          <h1>{mode === 'setup' ? 'ایجاد حساب مدیر' : 'ورود به پنل'}</h1>
          <p>{mode === 'setup'
            ? 'حساب اصلی مدیریت را ایجاد کنید.'
            : 'نام کاربری و رمز عبور خود را وارد کنید.'}</p>
        </div>
        <form onSubmit={submit}>
          {mode === 'setup' && (
            <label className="field"><span>نام نمایشی</span>
              <input className="input" value={name}
                onChange={(event) => setName(event.target.value)} required/></label>
          )}
          <label className="field"><span>نام کاربری</span>
            <input className="input numeric" dir="ltr" value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username" required/></label>
          <label className="field"><span>رمز عبور</span>
            <div className="password-field">
              <input className="input numeric" dir="ltr"
                type={show ? 'text' : 'password'} value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === 'setup' ? 'new-password' : 'current-password'}
                minLength={6} required/>
              <button type="button" onClick={() => setShow((value) => !value)}
                aria-label="نمایش رمز"><Icon name="eye"/></button>
            </div>
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="button primary full" type="submit" disabled={busy}>
            <Icon name={mode === 'setup' ? 'users' : 'key'}/>
            {busy ? 'لطفاً صبر کنید…' : mode === 'setup' ? 'ساخت حساب مدیر' : 'ورود'}
          </button>
        </form>
        <small className="auth-version">نسخه آزمایشی <span className="numeric">0.9.0</span></small>
      </Card>
    </div>
  )
}
